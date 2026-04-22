---
description: Snapshot the current Claude Code session state for later resume via /load. Writes to ~/.claude/ohmyclaude/sessions/ — never the repo.
---

# /save — Snapshot the Current Session

Capture the current session's pipeline state so you can `/load` it later.

## What it does

1. Writes `meta.json` (session id, cwd, model, lead agent, timestamps) to `~/.claude/ohmyclaude/sessions/<session_id>/`.
2. Scans `.claude/pipeline/*.md` and records each artifact's path + mtime + size in `stages.json`.
3. Updates `~/.claude/ohmyclaude/sessions/_index.json` mapping the current cwd (by hash) to this `session_id` so `/load` can find it later.

## What it does NOT do

- Does not store the Claude transcript (Claude Code already writes `transcript.jsonl`).
- Does not push anywhere — everything is local, under your home directory.
- Does not capture environment variables, tokens, or secrets.

## How it works

Follow the flow in `skills/save/SKILL.md`. The skill defines the exact JSON shapes and the idempotency rules. Storage layout:

```
~/.claude/ohmyclaude/sessions/
  _index.json
  <session_id>/
    meta.json
    stages.json
    agents/<agent>.json          (written by state-snapshot.js on PreCompact)
    traces.jsonl                 (written by subagent-trace.js on SubagentStart)
```

## Typical use

- **End of day**: `/save` at a clean checkpoint so tomorrow's session picks up from the last artifact.
- **Before a risky refactor**: `/save` to mark the "known good" state before running a large edit.
- **After planning phase**: `/save` once the PRD/SDD are written; resume implementation later.

## Related

- `/load` — resume a saved session.
- `skills/save/SKILL.md` — full implementation reference.
