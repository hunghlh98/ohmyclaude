#!/usr/bin/env python3
"""
ohmyclaude metrics dashboard — zero-dep Python stdlib server.

Run from the ohmyclaude repo root:
    python3 scripts/dashboard/server.py [--port 7788] [--host 127.0.0.1]

Open http://127.0.0.1:7788 and paste the absolute path of any
<project>/.claude folder. The server reads:

    <path>/usage/events.jsonl       → usage events
    <path>/usage/insights.jsonl     → captured ★ Insight blocks
    <path>/metrics/runs/_index.jsonl → /forge run summaries
    <path>/metrics/runs/<id>/snap-*.json → per-subagent snapshots
    <path>/metrics/baseline.json    → rolling cost baselines

Security: binds to 127.0.0.1 only; validates the requested path is a
real .claude-style directory; never serves files outside this repo.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
PLUGIN_ROOT = HERE.parent.parent
STATIC_DIR = HERE / "static"
INDEX_HTML = HERE / "index.html"
LOG_DIR = HERE / "logs"
LOG_FILE = LOG_DIR / "dashboard.log"
MAX_LOG_BYTES = 1_048_576  # 1 MiB; rotate to .1 past that
MAX_LOG_POST_BYTES = 16_384  # reject bodies larger than 16 KB

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "should", "can",
    "could", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as",
    "into", "about", "this", "that", "these", "those", "it", "its", "you", "your",
    "we", "our", "they", "than", "then", "so", "if", "not", "no", "yes", "only",
    "just", "more", "most", "less", "because", "since", "when", "while", "where",
    "which", "who", "what", "how", "why", "per", "via", "also", "even", "still",
    "already", "yet", "etc", "i",
}


def list_agent_names() -> list[str]:
    d = PLUGIN_ROOT / "agents"
    if not d.is_dir():
        return []
    return sorted(
        p.stem
        for p in d.glob("*.md")
        if p.is_file() and p.name != "AGENTS.md"
    )


def list_skill_names() -> list[str]:
    d = PLUGIN_ROOT / "skills"
    if not d.is_dir():
        return []
    return sorted(p.name for p in d.iterdir() if p.is_dir())


ALL_AGENTS = list_agent_names()
ALL_SKILLS = list_skill_names()


# ── .claude folder loader ────────────────────────────────────────────────────


def resolve_claude_dir(raw: str) -> Path:
    """Resolve + validate a user-provided path. Must point at a .claude
    folder (or a project root containing one). Raises ValueError on bad input."""
    if not raw:
        raise ValueError("path is required")
    p = Path(raw).expanduser().resolve()
    if not p.exists():
        raise ValueError(f"path does not exist: {p}")
    if p.is_file():
        raise ValueError(f"path is a file, not a directory: {p}")
    candidates = [p]
    if p.name != ".claude":
        candidates.append(p / ".claude")
    for c in candidates:
        if (c / "usage").is_dir() or (c / "metrics").is_dir() or (c / "pipeline").is_dir():
            return c
    raise ValueError(
        f"not a recognizable .claude folder (needs usage/, metrics/, or pipeline/ subdir): {p}"
    )


def read_jsonl(p: Path) -> list[dict]:
    if not p.is_file():
        return []
    out = []
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def read_json(p: Path) -> Any:
    if not p.is_file():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


# ── aggregate computation (mirrors scripts/usage-report.js) ─────────────────


def _top_keywords(texts: list[str], n: int = 12) -> list[dict]:
    counts: Counter[str] = Counter()
    for txt in texts:
        words = re.findall(r"[a-z0-9_\-]{4,}", (txt or "").lower())
        seen = set()
        for w in words:
            if w in STOP_WORDS or w in seen:
                continue
            seen.add(w)
            counts[w] += 1
    return [{"keyword": k, "count": c} for k, c in counts.most_common(n)]


def _percentile(sorted_vals: list[int], p: float) -> int | None:
    if not sorted_vals:
        return None
    idx = min(len(sorted_vals) - 1, int(len(sorted_vals) * p))
    return sorted_vals[idx]


def compute_summary(events: list[dict]) -> dict:
    by_type: Counter[str] = Counter(e.get("event", "") for e in events)

    prompts    = [e for e in events if e.get("event") == "user_prompt"]
    spawns     = [e for e in events if e.get("event") == "agent_spawn"]
    skills     = [e for e in events if e.get("event") == "skill_invoke"]
    responses  = [e for e in events if e.get("event") == "response_end"]
    sessions   = [e for e in events if e.get("event") == "session_start"]
    insights   = [e for e in events if e.get("event") == "insight_captured"]

    # forge_run_end dedup: the hook previously emitted one event per Stop,
    # so a single /forge run that spans N turns produced N events with
    # monotonically growing totals. Keep only the latest (highest total_usd)
    # row per runId so each real run counts once. Events emitted by the
    # updated hook are already deduped, but this protects legacy events.jsonl
    # files and guarantees the invariant regardless of emitter version.
    _by_run: dict[str, dict] = {}
    for e in events:
        if e.get("event") != "forge_run_end":
            continue
        rid = e.get("runId") or e.get("session_id") or ""
        if not rid:
            continue
        prev = _by_run.get(rid)
        if prev is None or float(e.get("total_usd") or 0) >= float(prev.get("total_usd") or 0):
            _by_run[rid] = e
    # Preserve chronological order by keeping the event's original ts.
    forge_runs = sorted(_by_run.values(), key=lambda e: e.get("ts") or "")

    agent_counts = Counter(e.get("agent_type", "unknown") for e in spawns)
    skill_counts = Counter(e.get("skill_name", "unknown") for e in skills)
    command_counts = Counter(
        e.get("command", "") for e in prompts if e.get("is_slash_command")
    )
    scenario_counts = Counter(e.get("scenario", "unknown") for e in forge_runs)

    corrections  = sum(1 for p in prompts if p.get("correction_signal"))
    affirmations = sum(1 for p in prompts if p.get("affirmation_signal"))
    neutrals     = max(0, len(prompts) - corrections - affirmations)

    # Skill trigger provenance (v2.4+). Events without `trigger` fall into
    # the "unknown" bucket rather than being silently recoded as model_auto.
    trigger_totals: Counter[str] = Counter()
    trigger_by_skill: dict[str, Counter[str]] = defaultdict(Counter)
    for s in skills:
        t = s.get("trigger") or "unknown"
        trigger_totals[t] += 1
        trigger_by_skill[s.get("skill_name", "unknown")][t] += 1

    # Plugin aggregation across skills + agents + slash commands. Unprefixed
    # names collapse into "core" = ohmyclaude itself.
    plugin_counts: dict[str, dict[str, int]] = defaultdict(
        lambda: {"skills": 0, "agents": 0, "commands": 0, "total": 0}
    )
    def _bump_plugin(key: str | None, kind: str) -> None:
        k = key or "core"
        plugin_counts[k][kind] += 1
        plugin_counts[k]["total"] += 1
    for s in skills:
        _bump_plugin(s.get("skill_plugin"), "skills")
    for sp in spawns:
        _bump_plugin(sp.get("agent_plugin"), "agents")
    for p in prompts:
        if p.get("is_slash_command"):
            _bump_plugin(p.get("command_plugin"), "commands")

    # corrections by preceding agent (session-bounded 20-event lookback)
    corr_by_agent: Counter[str] = Counter()
    for i, e in enumerate(events):
        if e.get("event") != "user_prompt" or not e.get("correction_signal"):
            continue
        sid = e.get("session_id")
        for j in range(i - 1, max(-1, i - 21), -1):
            prev = events[j]
            if prev.get("session_id") != sid:
                break
            if prev.get("event") == "agent_spawn":
                corr_by_agent[prev.get("agent_type", "unknown")] += 1
                break

    tool_mix: Counter[str] = Counter()
    bash_cmd_mix: Counter[str] = Counter()
    mcp_mix: Counter[str] = Counter()
    # Union-across-runs of the deferred-tools + skill menus the model saw.
    # Empty for forge_run_end events emitted before the enhancement; those
    # get retroactive values in api_summary via the transcript backfill.
    offered_tools: set[str]  = set()
    offered_skills: set[str] = set()
    for r in forge_runs:
        for k, v in (r.get("tool_mix") or {}).items():
            tool_mix[k] += v
            # Any tool name starting with "mcp__" is an MCP-provided tool;
            # answers the "is my graph backend getting invoked?" question.
            if isinstance(k, str) and k.startswith("mcp__"):
                mcp_mix[k] += v
        for k, v in (r.get("bash_cmd_mix") or {}).items():
            bash_cmd_mix[k] += v
        offered_tools.update(r.get("offered_tools")  or [])
        offered_skills.update(r.get("offered_skills") or [])

    # Called sets come straight from the already-computed counters.
    called_tools  = set(tool_mix.keys())
    called_skills = set(skill_counts.keys())
    # "Unused offered" = was in the menu, never got chosen. That's the
    # surface area you're paying for in token cost but getting no value
    # from. Excludes trivially-native items (Read/Bash/etc.) by construction,
    # since those aren't in the deferred list.
    unused_tools  = sorted(offered_tools  - called_tools)
    unused_skills = sorted(offered_skills - called_skills)

    total_usd  = sum(float(r.get("total_usd") or 0) for r in forge_runs)
    total_turns = sum(int(r.get("total_turns") or 0) for r in forge_runs)
    total_wall  = sum(int(r.get("wall_ms") or 0) for r in forge_runs)

    # session durations — the last response_end per session_id has the max duration_ms
    by_sid: dict[str, int] = {}
    for r in responses:
        sid = r.get("session_id", "")
        by_sid[sid] = max(by_sid.get(sid, 0), int(r.get("duration_ms") or 0))
    sorted_durs = sorted(by_sid.values())

    dead_agents = [a for a in ALL_AGENTS if a not in agent_counts]
    dead_skills = [s for s in ALL_SKILLS if s not in skill_counts]

    uniq = {i.get("hash"): i for i in insights}
    insight_keywords = _top_keywords([i.get("text", "") for i in uniq.values()], 12)

    # cost timeline — sorted by ts
    cost_timeline = sorted(
        [
            {
                "ts":       r.get("ts"),
                "runId":    r.get("runId"),
                "scenario": r.get("scenario"),
                "total_usd": float(r.get("total_usd") or 0),
                "total_turns": int(r.get("total_turns") or 0),
                "wall_ms":  int(r.get("wall_ms") or 0),
            }
            for r in forge_runs
        ],
        key=lambda x: x.get("ts") or "",
    )

    return {
        "window": {
            "first_event":      events[0].get("ts") if events else None,
            "last_event":       events[-1].get("ts") if events else None,
            "total_events":     len(events),
            "sessions_started": len(sessions),
        },
        "totals": {
            "user_prompts":       len(prompts),
            "corrections":        corrections,
            "affirmations":       affirmations,
            "correction_rate":    (corrections / len(prompts)) if prompts else 0,
            "affirmation_rate":   (affirmations / len(prompts)) if prompts else 0,
            "agent_spawns":       len(spawns),
            "skill_invokes":      len(skills),
            "forge_runs":         len(forge_runs),
            "total_usd":          round(total_usd, 6),
            "avg_usd_per_run":    round(total_usd / len(forge_runs), 6) if forge_runs else 0,
            "total_turns":        total_turns,
            "total_wall_ms":      total_wall,
            "insights_captured":  len(insights),
            "insights_unique":    len(uniq),
        },
        "sentiment": {
            "correction":  corrections,
            "affirmation": affirmations,
            "neutral":     neutrals,
            "total":       len(prompts),
        },
        "skill_triggers": {
            "totals": {
                "user_slash": trigger_totals.get("user_slash", 0),
                "model_auto": trigger_totals.get("model_auto", 0),
                "unknown":    trigger_totals.get("unknown", 0),
            },
            "by_skill": sorted(
                [
                    {
                        "name":       name,
                        "user_slash": counts.get("user_slash", 0),
                        "model_auto": counts.get("model_auto", 0),
                        "unknown":    counts.get("unknown", 0),
                        "total":      sum(counts.values()),
                    }
                    for name, counts in trigger_by_skill.items()
                ],
                key=lambda r: r["user_slash"] + r["model_auto"],
                reverse=True,
            ),
        },
        "plugins": sorted(
            [{"name": n, **c} for n, c in plugin_counts.items()],
            key=lambda r: r["total"],
            reverse=True,
        ),
        "agents": {
            "fired": [{"name": n, "count": c} for n, c in agent_counts.most_common()],
            "dead":  dead_agents,
            "known_total": len(ALL_AGENTS),
        },
        "skills": {
            "fired": [{"name": n, "count": c} for n, c in skill_counts.most_common()],
            "dead":  dead_skills,
            "known_total": len(ALL_SKILLS),
        },
        "commands":  [{"name": n, "count": c} for n, c in command_counts.most_common()],
        "scenarios": [{"name": n, "count": c} for n, c in scenario_counts.most_common()],
        "corrections": {
            "total": corrections,
            "by_preceding_agent": [
                {"name": n, "count": c} for n, c in corr_by_agent.most_common()
            ],
        },
        "tool_mix": [{"name": n, "count": c} for n, c in tool_mix.most_common()],
        "bash_cmd_mix": [{"name": n, "count": c} for n, c in bash_cmd_mix.most_common()],
        "mcp_mix": [{"name": n, "count": c} for n, c in mcp_mix.most_common()],
        "offered": {
            "tools_count":   len(offered_tools),
            "skills_count":  len(offered_skills),
            "tools_called":  len(offered_tools  & called_tools),
            "skills_called": len(offered_skills & called_skills),
            "unused_tools":  unused_tools,
            "unused_skills": unused_skills,
        },
        "session_latency": {
            "count":  len(sorted_durs),
            "p50_ms": _percentile(sorted_durs, 0.5),
            "p95_ms": _percentile(sorted_durs, 0.95),
            "max_ms": sorted_durs[-1] if sorted_durs else None,
        },
        "insights": {
            "total":  len(insights),
            "unique": len(uniq),
            "per_session": round(len(insights) / len(sessions), 1) if sessions else 0,
            "keywords": insight_keywords,
            "recent": [
                {"ts": i.get("ts"), "session_id": i.get("session_id"),
                 "hash": i.get("hash"), "text": i.get("text", "")}
                for i in insights[-50:][::-1]
            ],
        },
        "cost_timeline": cost_timeline,
        "event_counts": dict(by_type),
    }


# ── api endpoints ───────────────────────────────────────────────────────────


def _ms_to_iso(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        from datetime import datetime, timezone
        return datetime.fromtimestamp(v / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    return str(v)


def api_summary(claude_dir: Path) -> dict:
    """Usage events are authoritative; when they're missing (legacy repos
    that only have cost-profiler data), backfill forge_run_end events
    from the runs table so totals / cost-timeline / scenarios still render."""
    events = read_jsonl(claude_dir / "usage" / "events.jsonl")
    runs   = api_runs(claude_dir)

    seen_run_ids = {
        e.get("runId") for e in events
        if e.get("event") == "forge_run_end" and e.get("runId")
    }
    for r in runs:
        rid = r.get("runId")
        if not rid or rid in seen_run_ids:
            continue
        events.append({
            "ts":             _ms_to_iso(r.get("ended_at") or r.get("started_at")),
            "event":          "forge_run_end",
            "session_id":     rid,
            "runId":          rid,
            "scenario":       r.get("scenario") or "unknown",
            "agents":         r.get("agents") or [],
            "agents_count":   r.get("agents_count"),
            "total_usd":      r.get("total_usd"),
            "total_turns":    r.get("total_turns"),
            "wall_ms":        r.get("wall_ms"),
            "cache_hit_rate": r.get("cache_hit_rate"),
            "tool_mix":       r.get("tool_mix"),
            "_synthesized":   bool(r.get("_synthesized")),
        })

    events.sort(key=lambda e: e.get("ts") or "")

    # Backfill bash_cmd_mix (and enrich tool_mix with mcp__* calls) onto
    # forge_run_end events that predate cost-profiler's bash-head capture.
    # Reads the parent CC transcript once per unique runId; cheap because
    # each project has <20 runs and each transcript is <2 MB in practice.
    tally_cache: dict[str, tuple[dict, dict, list, list]] = {}
    for e in events:
        if e.get("event") != "forge_run_end":
            continue
        needs_backfill = (
            not e.get("bash_cmd_mix")
            or not e.get("offered_tools")
            or not e.get("offered_skills")
        )
        if not needs_backfill:
            continue
        rid = e.get("runId") or e.get("session_id")
        if not rid:
            continue
        if rid not in tally_cache:
            tally_cache[rid] = _parent_transcript_tool_tally(
                _cc_transcript_path(claude_dir, rid)
            )
        bash_tally, mcp_tally, off_tools, off_skills = tally_cache[rid]
        if bash_tally and not e.get("bash_cmd_mix"):
            e["bash_cmd_mix"] = bash_tally
        # Merge mcp calls seen in the transcript into tool_mix if missing;
        # catches any old rows where cost-profiler didn't persist them.
        if mcp_tally:
            tm = dict(e.get("tool_mix") or {})
            for k, v in mcp_tally.items():
                tm[k] = max(tm.get(k, 0), v)
            e["tool_mix"] = tm
        if off_tools and not e.get("offered_tools"):
            e["offered_tools"] = off_tools
        if off_skills and not e.get("offered_skills"):
            e["offered_skills"] = off_skills

    return compute_summary(events)


def _synthesize_runs_from_snaps(runs_dir: Path) -> list[dict]:
    """Fallback when runs/_index.jsonl is missing — reconstruct one
    summary per run dir from its newest snap-*.json."""
    out = []
    if not runs_dir.is_dir():
        return out
    for run_dir in sorted(runs_dir.iterdir()):
        if not run_dir.is_dir() or run_dir.name.startswith("."):
            continue
        snap_paths = sorted(run_dir.glob("snap-*.json"))
        if not snap_paths:
            continue
        snaps = [s for s in (read_json(p) for p in snap_paths) if s]
        if not snaps:
            continue
        first, last = snaps[0], snaps[-1]
        cum = last.get("cumulative", {})
        first_ts = first.get("ts") or 0
        last_ts  = last.get("ts")  or 0
        out.append({
            "runId":          run_dir.name,
            "started_at":     first_ts,
            "ended_at":       last_ts,
            "wall_ms":        max(0, last_ts - first_ts),
            "scenario":       None,
            "agents":         [s.get("agent") for s in snaps],
            "agents_count":   len(snaps),
            "total_usd":      round(float(cum.get("usd", 0)), 4),
            "total_turns":    int(cum.get("turns", 0)),
            "cache_hit_rate": None,
            "tool_mix":       cum.get("tool_calls", {}),
            "_synthesized":   True,
        })
    return out


def api_runs(claude_dir: Path) -> list[dict]:
    idx = read_jsonl(claude_dir / "metrics" / "runs" / "_index.jsonl")
    if idx:
        return idx
    return _synthesize_runs_from_snaps(claude_dir / "metrics" / "runs")


def _cc_transcript_path(claude_dir: Path, run_id: str) -> Path:
    """Claude Code stores per-session transcripts under
    ~/.claude/projects/<abs-cwd-with-slashes-to-dashes>/<session_id>.jsonl.
    The orchestrator's transcript is the only place top-level subagent
    identities (paige, artie, …) appear — subagent transcripts can't see
    the Agent tool_use that spawned them."""
    project_root = claude_dir.parent.resolve()
    hashed = str(project_root).replace("/", "-")
    return Path.home() / ".claude" / "projects" / hashed / f"{run_id}.jsonl"


_BASH_HEAD_SKIP = {"sudo", "time", "nohup"}
_BASH_ENV_RE = re.compile(r"^[A-Z_][A-Z0-9_]*=")


def _bash_head(cmd: str) -> str:
    """Mirror of cost-profiler.js bashHead(): first real token after
    skipping sudo/time/nohup wrappers and leading VAR=val env assignments."""
    if not isinstance(cmd, str):
        return "unknown"
    tokens = cmd.strip().split()
    i = 0
    while i < len(tokens) - 1:
        t = tokens[i]
        if t in _BASH_HEAD_SKIP or _BASH_ENV_RE.match(t):
            i += 1
            continue
        break
    return (tokens[i] if i < len(tokens) else "unknown")[:32] or "unknown"


_SKILL_LISTING_RE = re.compile(r"^-\s+([a-z][\w:-]*):", re.MULTILINE)


def _parent_transcript_tool_tally(
    transcript: Path,
) -> tuple[dict[str, int], dict[str, int], list[str], list[str]]:
    """Walk a CC transcript once and return:
      (bash_cmd_mix, mcp_mix, offered_tools, offered_skills)

    Reads two signal kinds:
      - assistant-message tool_use blocks → Bash heads + mcp__ calls
      - attachment messages → deferred_tools_delta (offered tools) and
        skill_listing (offered skills)
    Used to backfill forge_run_end events that predate cost-profiler's
    new fields, so the dashboard answers "was X ever in the menu?" even
    for older runs."""
    if not transcript.is_file():
        return {}, {}, [], []
    bash: Counter[str] = Counter()
    mcp:  Counter[str] = Counter()
    offered_tools: set[str]  = set()
    offered_skills: set[str] = set()
    with transcript.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                m = json.loads(line)
            except json.JSONDecodeError:
                continue
            # attachment lane: deferred_tools + skill_listing
            if m.get("type") == "attachment":
                att = m.get("attachment") or {}
                at = att.get("type")
                if at == "deferred_tools_delta":
                    for n in (att.get("addedNames")   or []):
                        offered_tools.add(n)
                    for n in (att.get("removedNames") or []):
                        offered_tools.discard(n)
                elif at == "skill_listing":
                    content = att.get("content") or ""
                    if isinstance(content, str):
                        for name in _SKILL_LISTING_RE.findall(content):
                            offered_skills.add(name)
                continue
            # assistant tool_use lane: bash heads + mcp call counts
            msg = m.get("message") or {}
            blocks = msg.get("content")
            if not isinstance(blocks, list):
                continue
            for b in blocks:
                if not isinstance(b, dict) or b.get("type") != "tool_use":
                    continue
                name = b.get("name") or ""
                if name == "Bash":
                    cmd = (b.get("input") or {}).get("command") or ""
                    bash[_bash_head(cmd)] += 1
                if isinstance(name, str) and name.startswith("mcp__"):
                    mcp[name] += 1
    return dict(bash), dict(mcp), sorted(offered_tools), sorted(offered_skills)


def _parent_agent_calls(transcript: Path) -> list[tuple[int, str]]:
    """Extract (ts_ms, subagent_type) pairs from every Agent/Task tool_use
    in a session transcript, sorted by timestamp. Empty list if the file
    is missing or unreadable — caller falls back to whatever `agent` the
    snap already had."""
    if not transcript.is_file():
        return []
    calls: list[tuple[int, str]] = []
    with transcript.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                m = json.loads(line)
            except json.JSONDecodeError:
                continue
            msg = m.get("message") or {}
            blocks = msg.get("content")
            if not isinstance(blocks, list):
                continue
            for b in blocks:
                if not isinstance(b, dict):
                    continue
                if b.get("type") != "tool_use" or b.get("name") not in ("Agent", "Task"):
                    continue
                sat = (b.get("input") or {}).get("subagent_type")
                if not sat:
                    continue
                ts_iso = m.get("timestamp") or ""
                try:
                    ts_ms = int(
                        datetime.fromisoformat(ts_iso.replace("Z", "+00:00")).timestamp() * 1000
                    )
                except ValueError:
                    continue
                calls.append((ts_ms, str(sat)))
    calls.sort(key=lambda x: x[0])
    return calls


def _resolve_unknown_agents(claude_dir: Path, run_id: str, snaps: list[dict]) -> list[dict]:
    """If any snap has agent='unknown', pair each unknown snap with the
    most recent preceding Agent tool_use in the parent session's
    transcript. Top-level subagents (paige/artie) resolve here;
    nested subagents stay 'unknown' if their parent transcript doesn't
    have an Agent call — cost-profiler's inferAgentName on the subagent
    transcript handles those at write time."""
    if not any((s.get("agent") or "unknown") == "unknown" for s in snaps):
        return snaps
    calls = _parent_agent_calls(_cc_transcript_path(claude_dir, run_id))
    if not calls:
        return snaps
    for s in snaps:
        if (s.get("agent") or "unknown") != "unknown":
            continue
        snap_ts = int(s.get("ts") or 0)
        pick: str | None = None
        for ts_ms, sat in calls:
            if ts_ms <= snap_ts:
                pick = sat
            else:
                break
        if pick:
            s["agent"] = pick
            s["agent_source"] = "parent_transcript"
    return snaps


def api_run_detail(claude_dir: Path, run_id: str) -> dict:
    run_dir = claude_dir / "metrics" / "runs" / run_id
    if not run_dir.is_dir():
        return {"runId": run_id, "snaps": [], "error": "run not found"}
    snaps = []
    for f in sorted(run_dir.glob("snap-*.json")):
        try:
            snaps.append(json.loads(f.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue
    snaps.sort(key=lambda s: s.get("ts", 0))
    snaps = _resolve_unknown_agents(claude_dir, run_id, snaps)
    return {"runId": run_id, "snaps": snaps}


def api_insights(claude_dir: Path) -> list[dict]:
    return read_jsonl(claude_dir / "usage" / "insights.jsonl")


def api_baseline(claude_dir: Path) -> Any:
    return read_json(claude_dir / "metrics" / "baseline.json")


def api_health() -> dict:
    return {
        "ok": True,
        "plugin_root": str(PLUGIN_ROOT),
        "agents_known": len(ALL_AGENTS),
        "skills_known": len(ALL_SKILLS),
        "log_file": str(LOG_FILE),
    }


def append_dashboard_log(entry: dict) -> None:
    """Append a JSON log line to dashboard.log; rotate at MAX_LOG_BYTES."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    try:
        if LOG_FILE.is_file() and LOG_FILE.stat().st_size > MAX_LOG_BYTES:
            rotated = LOG_DIR / "dashboard.log.1"
            if rotated.exists():
                rotated.unlink()
            LOG_FILE.rename(rotated)
    except OSError:
        pass  # non-fatal
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, default=str) + "\n")


def read_dashboard_log(tail: int = 200) -> list[dict]:
    if not LOG_FILE.is_file():
        return []
    out: list[dict] = []
    with LOG_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out[-tail:]


# ── http server ─────────────────────────────────────────────────────────────


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        # one-line concise logs
        sys.stderr.write(f"[{self.log_date_time_string()}] {fmt % args}\n")

    def _send_json(self, code: int, payload: Any) -> None:
        body = json.dumps(payload, default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, p: Path, content_type: str) -> None:
        try:
            body = p.read_bytes()
        except OSError:
            self.send_error(404, "file not found")
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _resolve_path_param(self, qs: dict[str, list[str]]) -> Path | None:
        raw = (qs.get("path") or [""])[0]
        try:
            return resolve_claude_dir(raw)
        except ValueError as e:
            self._send_json(400, {"error": str(e)})
            return None

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        route  = parsed.path
        qs     = parse_qs(parsed.query)

        if route == "/" or route == "/index.html":
            return self._send_file(INDEX_HTML, "text/html; charset=utf-8")

        if route.startswith("/static/"):
            name = route[len("/static/"):]
            if "/" in name or ".." in name:
                return self.send_error(400, "bad static path")
            candidates = {
                "app.js": ("application/javascript; charset=utf-8",),
                "style.css": ("text/css; charset=utf-8",),
            }
            if name not in candidates:
                return self.send_error(404, "not found")
            return self._send_file(STATIC_DIR / name, candidates[name][0])

        if route == "/api/health":
            return self._send_json(200, api_health())

        if route == "/api/summary":
            p = self._resolve_path_param(qs)
            if p is None:
                return
            return self._send_json(200, api_summary(p))

        if route == "/api/runs":
            p = self._resolve_path_param(qs)
            if p is None:
                return
            return self._send_json(200, api_runs(p))

        m = re.match(r"^/api/run/([\w\-]+)$", route)
        if m:
            p = self._resolve_path_param(qs)
            if p is None:
                return
            return self._send_json(200, api_run_detail(p, m.group(1)))

        if route == "/api/insights":
            p = self._resolve_path_param(qs)
            if p is None:
                return
            return self._send_json(200, api_insights(p))

        if route == "/api/baseline":
            p = self._resolve_path_param(qs)
            if p is None:
                return
            return self._send_json(200, api_baseline(p))

        if route == "/api/logs":
            tail = 200
            try:
                tail = min(1000, max(1, int((qs.get("tail") or ["200"])[0])))
            except ValueError:
                pass
            return self._send_json(200, read_dashboard_log(tail))

        self.send_error(404, "not found")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        route  = parsed.path

        if route == "/api/log":
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > MAX_LOG_POST_BYTES:
                return self._send_json(413, {"error": "payload too large or empty"})
            try:
                body = self.rfile.read(length).decode("utf-8", errors="replace")
                payload = json.loads(body)
            except (UnicodeError, json.JSONDecodeError):
                return self._send_json(400, {"error": "invalid json"})
            if not isinstance(payload, dict):
                return self._send_json(400, {"error": "expected object"})

            entry = {
                "server_ts":  __import__("datetime").datetime.utcnow().isoformat() + "Z",
                "client_ts":  str(payload.get("ts") or ""),
                "level":      str(payload.get("level") or "info")[:16],
                "message":    str(payload.get("message") or "")[:2000],
                "stack":      str(payload.get("stack") or "")[:4000],
                "url":        str(payload.get("url") or "")[:500],
                "user_agent": (self.headers.get("User-Agent") or "")[:300],
                "context":    payload.get("context") if isinstance(payload.get("context"), (dict, list, str)) else None,
            }
            append_dashboard_log(entry)
            return self._send_json(200, {"ok": True})

        self.send_error(404, "not found")


def main() -> int:
    ap = argparse.ArgumentParser(description="ohmyclaude metrics dashboard")
    ap.add_argument("--host", default="127.0.0.1", help="bind host (default: 127.0.0.1)")
    ap.add_argument("--port", type=int, default=7788, help="bind port (default: 7788)")
    args = ap.parse_args()

    if args.host not in ("127.0.0.1", "localhost", "::1"):
        sys.stderr.write(
            f"refusing to bind non-loopback host {args.host!r}; dashboard exposes "
            "local file paths via HTTP and must stay on loopback.\n"
        )
        return 2

    if not INDEX_HTML.is_file():
        sys.stderr.write(f"missing {INDEX_HTML} — is scripts/dashboard/ intact?\n")
        return 2

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    sys.stderr.write(
        f"ohmyclaude dashboard listening on http://{args.host}:{args.port}\n"
        f"  plugin_root: {PLUGIN_ROOT}\n"
        f"  agents known: {len(ALL_AGENTS)}  ·  skills known: {len(ALL_SKILLS)}\n"
        f"  paste a path to any <project>/.claude folder to begin.\n"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\nshutting down\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
