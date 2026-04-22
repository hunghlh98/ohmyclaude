---
name: save
description: Capture the current Claude Code session state to ~/.claude/ohmyclaude/sessions/ so it can be resumed later with /load. Snapshots pipeline artifacts, meta (cwd, model, lead agent), and updates the cwd→session index. Idempotent — re-running overwrites the current session's snapshot, never creates duplicates per cwd.
origin: ohmyclaude
---

# save — Snapshot the Current Session

Writes a structured, resumable snapshot of the current Claude Code session. Pairs with the `load` skill; together they support "picked up where I left off" workflows without relying on Claude Code's native `--resume` alone.

Storage is under `~/.claude/ohmyclaude/sessions/` (outside the repo — session state is per-machine, never committed).

## Triggers

- User types `/save`.
- Agents explicitly invoke `@paige-product save the session` at a safe checkpoint.
- The lead agent proactively saves before a risky operation (debug bisect, heavy refactor).

## Invariants

- **Idempotent per session_id**: re-running `/save` overwrites `meta.json` / `stages.json` / `_index.json` for the same session, never appends duplicates. Historical traces (`traces.jsonl`) remain append-only.
- **No secrets**: do not capture environment variables, tokens, or anything not already under `.claude/pipeline/`. The snapshot is pointers, not payloads.
- **Host-local only**: writes to `~/.claude/ohmyclaude/sessions/` — never into the repo. This is user machine state, never committed.

## Session Directory Layout

```
~/.claude/ohmyclaude/sessions/
  _index.json                      # { "<cwd_hash>": "<session_id>" } — fast lookup by cwd
  <session_id>/
    meta.json                      # session_id, timestamps, cwd, cwd_hash, model, lead_agent, version
    stages.json                    # pipeline cursor — list of .claude/pipeline/*.md with mtime + size
    agents/                        # per-agent PreCompact snapshots (written by state-snapshot.js hook)
      <agent-name>.json
    traces.jsonl                   # append-only SubagentStart telemetry (subagent-trace.js hook)
```

## Behavioral Flow

When `/save` is invoked, follow these steps using your available tools:

1. **Resolve session_id**. Read the `$CLAUDE_SESSION_ID` env var via `Bash echo "$CLAUDE_SESSION_ID"`. If unset, generate a timestamp-based ID: `s-YYYY-MM-DD-HHMMSS` in UTC.
2. **Resolve cwd and cwd_hash**. `pwd` for cwd. For `cwd_hash`, use `printf '%s' "$cwd" | shasum -a 256 | cut -c1-16`.
3. **Ensure session directory** exists: `~/.claude/ohmyclaude/sessions/<session_id>/agents/`. Use `mkdir -p`.
4. **Write meta.json** at `~/.claude/ohmyclaude/sessions/<session_id>/meta.json`:
   ```json
   {
     "session_id": "<session_id>",
     "start_ts": "<ISO 8601 — use existing meta.start_ts if file already exists; else current time>",
     "last_touch_ts": "<ISO 8601 — current time>",
     "cwd": "<absolute cwd>",
     "cwd_hash": "<hex>",
     "model": "<value of $CLAUDE_MODEL or 'unknown'>",
     "lead_agent": "paige-product",
     "ohmyclaude_version": "<read from VERSION at repo root or 'unknown'>",
     "last_event": "save"
   }
   ```
5. **Write stages.json** at `~/.claude/ohmyclaude/sessions/<session_id>/stages.json`. Scan `<cwd>/.claude/pipeline/*.md` and record each artifact:
   ```json
   {
     "snapshot_ts": "<ISO 8601>",
     "artifacts": [
       { "artifact": "PRD-001", "path": ".claude/pipeline/PRD-001.md", "mtime": 1714..., "size": 1234 }
     ]
   }
   ```
   Skip `README.md` and any file beginning with `.`.
6. **Update `_index.json`** atomically: read existing (if any), set `_index["<cwd_hash>"] = "<session_id>"`, write to a temp file, then rename. Use `mktemp` and `mv` for atomicity.
7. **Report** what was saved — one short line: the session_id, cwd, and number of pipeline artifacts captured.

## Edge Cases

- **No `.claude/pipeline/` directory**: `stages.json` still writes with an empty `artifacts: []`. This is a valid "fresh project" snapshot.
- **`$CLAUDE_SESSION_ID` unset**: use a synthetic timestamp ID. `/load` will still find it via the cwd index.
- **Index corruption**: if `_index.json` is malformed JSON, treat it as empty and rewrite cleanly.
- **Concurrent `/save`**: the atomic rename on `_index.json` is the only shared write. Per-session files under `<session_id>/` are owned by that ID alone.

## Example

```
User: /save
Claude: [runs the flow above]
Saved session s-2026-04-22-143015 for /Users/foo/myproject (3 pipeline artifacts).
```

## Non-Goals

- Does NOT capture the full transcript — that is what Claude Code's own `transcript.jsonl` already does.
- Does NOT save agent working memory beyond what `state-snapshot.js` (PreCompact hook) writes to `agents/<name>.json`.
- Does NOT push to any remote. This is purely local, per-user state.

## Related

- `skills/load/SKILL.md` — reads what this skill writes.
- `hooks/scripts/session-load.js` — SessionStart hook that advertises saved sessions to the user.
- `hooks/scripts/state-snapshot.js` — PreCompact hook that keeps `stages.json` + `agents/` fresh between explicit saves.
- `hooks/scripts/subagent-trace.js` — SubagentStart hook that populates `traces.jsonl`.
