---
name: load
description: Restore a previously-saved Claude Code session from ~/.claude/ohmyclaude/sessions/. Reads meta, stages, and agent snapshots written by /save and the session hooks. Usage — /load (current cwd), /load <session_id>, or /load --list.
origin: ohmyclaude
---

# load — Resume a Saved Session

Reads session state written by `/save` and the companion hooks (`session-load.js`, `state-snapshot.js`, `subagent-trace.js`) and presents it so Claude can resume from the first pending pipeline stage.

This skill is **read-only**. It never modifies session files; it only reads them and prints a structured summary you and Claude can act on.

## Triggers

- User types `/load` — auto-resolves the session for the current cwd via `_index.json`.
- User types `/load <session_id>` — loads a specific session by id.
- User types `/load --list` — lists all saved sessions (id, cwd, last_touch, artifact count).

## Behavioral Flow

### `/load --list`

1. List everything under `~/.claude/ohmyclaude/sessions/` that is a directory (skip `_index.json`).
2. For each, read `meta.json` and print:
   ```
   <session_id>  <age>  <cwd>  [N artifacts]
   ```
   sorted by `meta.last_touch_ts` descending.
3. Exit — no state changes.

### `/load` (no args — resolve current cwd)

1. Run `pwd` to get cwd.
2. Compute `cwd_hash = printf '%s' "$cwd" | shasum -a 256 | cut -c1-16`.
3. Read `~/.claude/ohmyclaude/sessions/_index.json`. If missing or `cwd_hash` not present, report "No saved session for this directory. Use /save to create one." and exit.
4. Treat the mapped id as `session_id` and fall through to the `/load <session_id>` flow below.

### `/load <session_id>`

1. Verify `~/.claude/ohmyclaude/sessions/<session_id>/meta.json` exists. If not, report "No session with id <session_id>" and exit.
2. Read and parse:
   - `meta.json` — session metadata.
   - `stages.json` — pipeline artifact inventory.
   - `agents/*.json` — per-agent PreCompact snapshots (may be empty if compaction never happened).
   - Tail the last ~20 lines of `traces.jsonl` to show recent subagent activity.
3. Cross-reference `stages.json.artifacts` with the current `<cwd>/.claude/pipeline/`:
   - **Present + unchanged mtime** → artifact is still intact.
   - **Present + newer mtime** → artifact has been modified since the snapshot (user work after save).
   - **Missing** → artifact was deleted between save and load; flag it.
4. Print a structured summary:
   ```
   Session <session_id>
   cwd:           <cwd>
   last touched:  <age>
   model:         <model>
   lead agent:    <lead_agent>

   Pipeline artifacts (N):
     ✓ PRD-001.md          (intact)
     ⟳ SDD-002.md          (modified since save)
     ✗ PLAN-003.md         (missing)

   Agent PreCompact snapshots: paige-product, beck-backend
   Recent subagents:          beck-backend (2×), quinn-qa (1×)

   Next suggested action: SDD-002 was modified after save — consider reviewing
   the diff before resuming the implementation waves that depend on it.
   ```
5. Exit with that summary in context so Claude's next response can orient from it.

## Edge Cases

- **Malformed meta.json / stages.json**: report the specific file, skip the section, do not crash.
- **`agents/` directory missing**: that is normal — PreCompact may never have fired. Print "no compaction snapshots" and continue.
- **`traces.jsonl` missing**: normal if no subagents have run since save. Print "no subagent traces yet" and continue.
- **Session points at a cwd different from the current one**: print a warning — this is a cross-directory load and artifact cross-referencing won't work.

## What `/load` Does NOT Do

- Does NOT modify any session file. For updates, let the PreCompact hook or an explicit `/save` do it.
- Does NOT replay the transcript. Claude Code's own `--resume` + `--continue` handle transcript restoration.
- Does NOT fetch external state (no network, no git operations).

## Example

```
User: /load
Claude: [runs the current-cwd flow]
Session s-2026-04-22-143015
cwd:           /Users/foo/myproject
last touched:  3h ago
model:         claude-sonnet-4-6
lead agent:    paige-product

Pipeline artifacts (3):
  ✓ PRD-001.md     (intact)
  ✓ SDD-001.md     (intact)
  ✗ PLAN-001.md    (missing — check git log if this was intentional)

Agent PreCompact snapshots: paige-product
Recent subagents:          beck-backend (2×)

Next suggested action: PLAN-001.md is missing. Rebuild it from SDD-001 or
confirm it was intentionally deleted.
```

## Related

- `skills/save/SKILL.md` — writes what this skill reads.
- `hooks/scripts/session-load.js` — SessionStart hook that hints "saved session available" on startup.
- `hooks/scripts/state-snapshot.js` — PreCompact hook that keeps `stages.json` + `agents/` current.
- `hooks/scripts/subagent-trace.js` — SubagentStart hook that populates `traces.jsonl`.
