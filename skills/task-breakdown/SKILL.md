---
name: task-breakdown
description: Break requirements into agent-assignable tasks with dependency graph. Identifies parallel vs sequential work, estimates SP, detects tasks too large to plan.
origin: ohmyclaude
---

# Task Breakdown

Decompose requirements into structured tasks with a dependency graph. Each task has an agent owner, SP estimate, and explicit dependencies — enabling parallel execution where possible.

## When to Activate

- Breaking down a feature request into pipeline tasks
- Planning which agents can work in parallel
- Estimating effort for sprint planning
- Any request that touches 3+ files or needs multiple agents

## Workflow

1. **Explore** — Use source graph / tree / grep to understand scope
2. **Decompose** — Break into tasks, one agent owner per task
3. **Build dependency graph** — Mark which tasks block which
4. **Check for Trigger break** — If Uncertainty x Complexity x Effort is too high, ask user to split
5. **Output** — Task table + dependency graph + task details

## Task Table Format

```markdown
| # | Task | Agent | SP | Depends On | Notes |
|---|------|-------|----|------------|-------|
| 1 | Design system architecture | @artie-arch | 3 | — | **Output:** SDD |
| 2 | Write UX spec for dashboard | @una-ux | 2 | — | **Output:** UX-SPEC |
| 3 | Security review of auth flow | @sam-sec | 3 | 1 | **Output:** REVIEW |
| 4 | Implement API endpoints | @beck-backend | 5 | 1, 3 | **Output:** IMPL-BE |
| 5 | Implement dashboard UI | @effie-frontend | 5 | 2 | **Output:** IMPL-FE |
| 6 | Write tests for API + UI | @quinn-qa | 3 | 4, 5 | **Output:** TEST |
| 7 | Code review | @stan-standards | 2 | 4, 5 | **Output:** CODE-REVIEW |
| 8 | Documentation + release | @devon-ops | 2 | 6, 7 | **Output:** DOC, RELEASE |
```

## Dependency Graph (ASCII)

```
    1 (arch)     2 (ux)
    │  ╲          │
    │   3 (sec)   │
    │   │         │
    4 (BE) ◄──┘  5 (FE)
    │             │
    ├─────┬───────┘
    6 (QA)  7 (review)
    │       │
    └───┬───┘
        8 (ship)
```

Tasks 1 and 2 run in **parallel** (no dependencies). Tasks 4 and 5 run in **parallel** after their blockers clear. Tasks 6 and 7 run in **parallel** after implementation.

## Parallelism Rules

- Tasks with no `Depends On` entries: **run immediately in parallel**
- Tasks whose dependencies are all complete: **unblocked, run in parallel**
- Tasks form **waves** — a wave is a set of tasks that can run simultaneously

```
Wave 1: [1, 2]          ← parallel (no deps)
Wave 2: [3]             ← needs 1
Wave 3: [4, 5]          ← parallel (4 needs 1+3, 5 needs 2)
Wave 4: [6, 7]          ← parallel (both need 4+5)
Wave 5: [8]             ← needs 6+7
```

## SP via Decision Matrix

Assess each task on 3 dimensions, look up SP in the matrix:

| Uncertainty | Complexity | Effort | SP |
|---|---|---|---|
| Low | Low | Low | 0.5 |
| Low | Low | Medium | 1 |
| Low | Medium | Medium | 3 |
| Low | Medium | High | 5 |
| Medium | Low | Medium | 3 |
| Medium | Medium | Medium | 5 |
| Medium | Medium | High | 8 |
| Medium | High | High | 13 |
| High | Medium | High | **Trigger break** |
| High | High | Medium | **Trigger break** |
| High | High | High | **Trigger break** |

**Trigger break**: Task is too large/risky. Ask user to split before proceeding.

Full matrix in `references/task-rules.md`.

## Agent Assignment Guide

| Need | Agent | Scope |
|------|-------|-------|
| Architecture / C4 design | @artie-arch | Read-only, opus |
| UX spec / accessibility | @una-ux | Read-only |
| Security audit | @sam-sec | Read-only + Bash |
| Backend code | @beck-backend | BE files only |
| Frontend code | @effie-frontend | FE files only |
| Tests / fuzz data | @quinn-qa | Test files |
| Code review | @stan-standards | Read-only |
| Docs / release | @devon-ops | Docs + config |
| Debugging | @heracles | On-demand |
| Route + orchestrate | @paige-product | Team lead |

## Task Detail Template

```markdown
### Task N: {Name} → @{agent}

**SP Assessment:** U: {L/M/H} | C: {L/M/H} | E: {L/M/H} → {N} SP
**Depends On:** Task {X}, Task {Y}
**Blocks:** Task {Z}

**Goal:** {One sentence}

**Acceptance Criteria:**
- [ ] {Verifiable condition}

**Files:** {Specific files to read/write}
```

## Key Rules

- One agent owner per task — never split a task across agents
- Tasks that touch independent files/modules → parallel
- Data migrations / schema changes → always first, always HIGH risk
- Auth / security changes → always before features that depend on them
- Tests → same wave as the code they test, or immediately after
- Do NOT split mechanically — only split when agents differ or Trigger break applies
