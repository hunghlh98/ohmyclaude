---
description: Resume a previously-saved Claude Code session. Usage — /load (current cwd), /load <session_id>, /load --list.
---

# /load — Resume a Saved Session

Read-only — prints a structured summary of a saved session so the conversation can continue from the right stage.

## Usage

| Form | Behavior |
|------|----------|
| `/load` | Look up the session for the current cwd via `_index.json`. Fail with a hint if none exists. |
| `/load <session_id>` | Load the specific session. Works across directories. |
| `/load --list` | List every saved session with id, age, cwd, and artifact count. |

## What it prints

- Session id, cwd, model, lead agent, last-touched age.
- Pipeline artifact table: which are intact, which were modified after save, which are missing.
- Per-agent PreCompact snapshots (if compaction fired).
- Recent subagent activity from `traces.jsonl`.
- A "next suggested action" line that flags the most load-bearing mismatch (e.g., missing artifact, modified dependency).

## What it does NOT do

- Does not modify any session file.
- Does not replay the transcript — Claude Code's `--resume` / `--continue` already do that.
- Does not fetch remote state.

## Typical use

- First thing after opening a new Claude Code session in a project where `/save` was run previously.
- When `session-load.js` (SessionStart hook) emitted "Saved session available for this directory" — that is the signal to run `/load`.

## How it works

Follow the flow in `skills/load/SKILL.md`. The skill defines the exact file layout and cross-reference logic.

## Related

- `/save` — create a session snapshot.
- `skills/load/SKILL.md` — full implementation reference.
