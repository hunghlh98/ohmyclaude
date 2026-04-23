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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
PLUGIN_ROOT = HERE.parent.parent
STATIC_DIR = HERE / "static"
INDEX_HTML = HERE / "index.html"

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
    forge_runs = [e for e in events if e.get("event") == "forge_run_end"]
    sessions   = [e for e in events if e.get("event") == "session_start"]
    insights   = [e for e in events if e.get("event") == "insight_captured"]

    agent_counts = Counter(e.get("agent_type", "unknown") for e in spawns)
    skill_counts = Counter(e.get("skill_name", "unknown") for e in skills)
    command_counts = Counter(
        e.get("command", "") for e in prompts if e.get("is_slash_command")
    )
    scenario_counts = Counter(e.get("scenario", "unknown") for e in forge_runs)

    corrections = sum(1 for p in prompts if p.get("correction_signal"))

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
    for r in forge_runs:
        for k, v in (r.get("tool_mix") or {}).items():
            tool_mix[k] += v

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
            "correction_rate":    (corrections / len(prompts)) if prompts else 0,
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
                for i in insights[-10:][::-1]
            ],
        },
        "cost_timeline": cost_timeline,
        "event_counts": dict(by_type),
    }


# ── api endpoints ───────────────────────────────────────────────────────────


def api_summary(claude_dir: Path) -> dict:
    events = read_jsonl(claude_dir / "usage" / "events.jsonl")
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
    }


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
