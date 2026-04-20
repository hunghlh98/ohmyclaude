# sc-pm — Session Lifecycle + Memory Schema

Session start / during-work / end protocols, plus standardized memory key schema. Cited by `SKILL.md`.

Inlined from SuperClaude_Plugin v4.3.0 (MIT).

---

## Session Start Protocol

Runs automatically at the start of every ohmyclaude session where prior state exists.

```yaml
1. Context restoration:
   - list_memories() → check for existing PM state
   - read_memory("session/context") → restore overall context
   - read_memory("plan/current") → what we're working on
   - read_memory("session/last") → previous session summary
   - read_memory("next_actions") → planned next steps

2. Report to user:
   "Previous: <last session summary>
    Progress: <current progress>
    Next: <planned next actions>
    Blockers: <issues>"

3. Ready for work:
   User can immediately continue from last checkpoint
   without re-explaining context or goals.
```

If no prior memory exists, skip silently — this is a fresh start.

---

## During-Work Protocol (continuous PDCA)

```yaml
1. Plan (hypothesis):
   - write_memory("plan/<feature>/hypothesis", goal_statement)
   - Create .claude/pipeline/pdca/<feature>/plan.md
   - Define what to implement and why

2. Do (experiment):
   - TaskCreate for tracking
   - write_memory("session/checkpoint", progress) every 30 min
   - Update .claude/pipeline/pdca/<feature>/do.md
   - Record trial-and-error, errors, solutions

3. Check (evaluate):
   - think_about_task_adherence() → self-evaluation
   - "What went well? What failed?"
   - Update .claude/pipeline/pdca/<feature>/check.md
   - Assess against goals

4. Act (improve):
   - Success → docs/patterns/<pattern-name>.md (formalized)
   - Failure → .claude/pipeline/mistakes/<date>.md (prevention)
   - Update CLAUDE.md if global pattern
   - write_memory("learning/patterns/<name>", reusable_pattern)
```

---

## Session End Protocol

```yaml
1. Final checkpoint:
   - think_about_whether_you_are_done()
   - write_memory("session/last", summary)
   - write_memory("next_actions", todo_list)

2. Documentation cleanup:
   - Move docs/temp/ → docs/patterns/ or docs/mistakes/
   - Update formal documentation
   - Remove outdated temporary files

3. State preservation:
   - write_memory("session/context", complete_state)
   - Ensure next session can resume seamlessly
```

---

## Memory Key Schema (standardized)

Pattern: `<category>/<subcategory>/<identifier>`

Inspired by Kubernetes namespaces and Git refs — hierarchical, searchable, predictable.

```yaml
session/:
  session/context        # complete PM state snapshot
  session/last           # previous session summary
  session/checkpoint     # progress snapshots (30-min intervals)

plan/:
  plan/<feature>/hypothesis     # Plan phase: hypothesis and design
  plan/<feature>/architecture   # architecture decisions
  plan/<feature>/rationale      # why this approach chosen

execution/:
  execution/<feature>/do        # Do phase: experimentation log
  execution/<feature>/errors    # error log with timestamps
  execution/<feature>/solutions # solution attempts log

evaluation/:
  evaluation/<feature>/check    # Check phase: evaluation and analysis
  evaluation/<feature>/metrics  # quality metrics (coverage, performance)
  evaluation/<feature>/lessons  # what worked, what failed

learning/:
  learning/patterns/<name>      # reusable success patterns
  learning/solutions/<error>    # error solution database
  learning/mistakes/<timestamp> # failure analysis with prevention

project/:
  project/context               # project understanding
  project/architecture          # system architecture
  project/conventions           # code style, naming patterns
```

### Example usage

```
write_memory("session/checkpoint", current_state)
write_memory("plan/auth/hypothesis", hypothesis_doc)
write_memory("execution/auth/do", experiment_log)
write_memory("evaluation/auth/check", analysis)
write_memory("learning/patterns/supabase-auth", success_pattern)
write_memory("learning/solutions/jwt-config-error", solution)
```

---

## Scope Note

Memory tool availability depends on the Claude Code environment. If memory tools are not available in a given session, ohmyclaude falls back to **file-based state** in `.claude/pipeline/` artifacts — the PDCA lifecycle still works, just without cross-session persistence.
