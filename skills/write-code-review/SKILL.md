---
name: write-code-review
origin: ohmyclaude
description: Write and append to the Code Review document (CODE-REVIEW-<id>.md) in .claude/pipeline/. Used by @stan-standards (writes "## Standards Review" section) and @stan-standards (performance section) (appends "## Performance Review" section). Sequential append-only convention — never overwrite the other agent's section. Triggers on "write code review", "save CODE-REVIEW", "standards review", "performance review".
---

# Write Code Review

Produce or append to the Code Review document for the current pipeline request.

## Sequential Write Convention

This skill is shared between two agents:

1. **@stan-standards** writes first → creates the file with `## Standards Review`
2. **@stan-standards (performance section)** writes second → appends `## Performance Review`

**Never overwrite the other agent's section.** If the file already contains your section, append a `### Round N` subsection instead (for multi-round reviews).

## Output

Write or append to `.claude/pipeline/CODE-REVIEW-<id>.md`.

## CODE-REVIEW Schema

```markdown
---
id: CODE-REVIEW-001
prd_ref: PRD-001
created: YYYY-MM-DD
stan_verdict: REQUEST_CHANGES | APPROVE
percy_verdict: REQUEST_CHANGES | APPROVE
---

## Standards Review
*Author: @stan-standards*

### Summary
[1–2 sentence overall assessment]

### Findings

| # | File:Line | Category | Severity | Issue | Suggestion |
|---|---|---|---|---|---|
| 1 | src/auth.ts:42 | Logic | medium | [Issue] | [Fix] |

**Categories:** Logic, Readability, Maintainability, Security, Conventions, Tests

### Verdict
**REQUEST_CHANGES** | **APPROVE**

---

## Performance Review
*Author: @stan-standards (performance section)*

### Summary
[1–2 sentence overall assessment]

### Findings

| # | File:Line | Category | Severity | Issue | Suggestion |
|---|---|---|---|---|---|
| 1 | src/query.ts:88 | N+1 Query | high | [Issue] | [Fix] |

**Categories:** N+1 Queries, Memory Leaks, Core Web Vitals, Latency, Algorithmic Complexity

### Verdict
**REQUEST_CHANGES** | **APPROVE**
```

## Severity Guide

| Severity | Meaning | Blocks merge? |
|---|---|---|
| critical | Data loss, broken functionality | Yes |
| high | Major performance regression or logic error | Yes |
| medium | Code smell, maintainability risk | No — tracked |
| low | Nitpick, style preference | No |

## Gotchas

- **@stan-standards (performance section) does NOT flag security issues** — those belong to @sam-sec's REVIEW document
- **@stan-standards does NOT flag performance metrics** — that's @stan-standards (performance section)'s domain
- **Circuit breaker watches this file** — after 3 REQUEST_CHANGES rounds, `circuit-breaker` skill writes a DEADLOCK file
- **Append, never overwrite** — read the current file before writing; use `## Round 2` subsections on re-review
