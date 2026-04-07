# Task Breakdown Rules & Conventions

## Agent Role Prefixes

Tasks are prefixed with the owning agent's role:

| Prefix | Agent | Scope |
|--------|-------|-------|
| `[ARCH]` | @artie-arch | System design, C4 diagrams |
| `[UX]` | @una-ux | UX spec, WCAG review |
| `[SEC]` | @sam-sec | Security audit, adversarial testing |
| `[BE]` | @beck-backend | Backend implementation |
| `[FE]` | @effie-frontend | Frontend implementation |
| `[QA]` | @quinn-qa | Testing, fuzz data |
| `[REV]` | @stan-standards | Code review (logic + perf) |
| `[SHIP]` | @devon-ops | Documentation, release, announcement |
| `[DEBUG]` | @heracles | Root cause analysis |

## Complete Decision Matrix

SP is derived from 3 dimensions: **Uncertainty x Complexity x Effort**

### Dimension Definitions

| Dimension | Low | Medium | High |
|-----------|-----|--------|------|
| **Uncertainty** | Solution is well-known, solved before | Some unknowns, needs investigation | Exploratory / R&D, outcome unclear |
| **Complexity** | Isolated change, single module | Cross-module, multiple integrations | System-wide, legacy code, cross-team deps |
| **Effort** | A few hours of actual work | ~1 full working day | Multi-day effort |

### Full Matrix

| Uncertainty | Complexity | Effort | SP |
|---|---|---|---|
| Low | Low | Low | 0.5 |
| Low | Low | Medium | 1 |
| Low | Low | High | 2 |
| Low | Medium | Low | 2 |
| Low | Medium | Medium | 3 |
| Low | Medium | High | 5 |
| Low | High | Medium | 5 |
| Low | High | High | 5 |
| Medium | Low | Low | 3 |
| Medium | Low | Medium | 3 |
| Medium | Low | High | 5 |
| Medium | Medium | Low | 5 |
| Medium | Medium | Medium | 5 |
| Medium | Medium | High | 8 |
| Medium | High | Medium | 8 |
| Medium | High | High | 13 |
| High | Low | Low | 8 |
| High | Low | Medium | 8 |
| High | Low | High | 13 |
| High | Medium | Medium | 13 |
| High | Medium | High | **Trigger break** |
| High | High | Medium | **Trigger break** |
| High | High | High | **Trigger break** |

### Trigger Break Rule

When a task evaluates to **Trigger break**, it is too risky/large to plan as-is.
- Ask the user to break it into smaller sub-tasks
- Re-evaluate each sub-task using the matrix
- Only proceed once no task scores Trigger break

## Dependency Graph Rules

### Building the Graph

For each task, identify:
- **Depends On**: Which tasks must complete before this one starts
- **Blocks**: Which tasks cannot start until this one finishes

### Determining Parallelism

Tasks form execution **waves** — each wave runs all unblocked tasks simultaneously:

```
Wave 1: Tasks with no dependencies → run in parallel
Wave 2: Tasks whose Wave 1 deps are done → run in parallel
Wave N: Tasks whose Wave N-1 deps are done → run in parallel
```

### Common Dependency Patterns

| Pattern | Dependency Rule |
|---------|----------------|
| Architecture → Implementation | @artie-arch SDD must complete before @beck-backend/@effie-frontend start |
| Security → Implementation | @sam-sec review must clear before implementation on security-sensitive code |
| Implementation → Testing | @quinn-qa tests run after implementation completes |
| Implementation → Code Review | @stan-standards reviews after implementation |
| Code Review → Release | @devon-ops ships after review approves |
| UX Spec → Frontend | @una-ux spec must exist before @effie-frontend implements |
| BE + FE → QA | Both implementations must complete before @quinn-qa writes integration tests |

### Independence Heuristics

Tasks are likely **parallel** when they:
- Touch different files/modules with no shared dependencies
- Are owned by different agents with no data flow between them
- Operate on independent parts of the system (e.g., API + UI that don't share state yet)

Tasks are likely **sequential** when they:
- Share files or database tables
- One produces an artifact the other reads
- One validates what the other produces (review, security audit, test)

## Meaningful Task Granularity

Tasks should be cohesive units of work — not mechanical sub-steps.

**Do NOT split unless:**
- Different agents are doing the work
- The task scores Trigger break in the matrix
- There's a natural gate (e.g., design must be approved before implementation)

**A single task is valid** if the entire requirement is performed by one agent as one continuous piece of work.

## Output Document Types

| Type | Purpose | Typical Agent |
|------|---------|---------------|
| SDD | System Design Document (C4) | @artie-arch |
| UX-SPEC | UX flows, wireframes, WCAG | @una-ux |
| REVIEW | Security findings | @sam-sec |
| IMPL-BE | Backend implementation notes | @beck-backend |
| IMPL-FE | Frontend implementation notes | @effie-frontend |
| TEST | Test results, coverage | @quinn-qa |
| CODE-REVIEW | Logic + performance findings | @stan-standards |
| DOC | Documentation updates | @devon-ops |
| RELEASE | Release notes, SemVer | @devon-ops |
| PRD | Product requirements | @paige-product |
