---
name: circuit-breaker
description: Stateful deadlock detection for the governance phase. Tracks review cycles per issue ID in .claude/pipeline/review-cycles.json. On 3rd REQUEST_CHANGES round from either @stan-standards or @percy-perf, halts the pipeline and writes DEADLOCK-<id>.md for @paige-product to resolve. Used by @stan-standards and @percy-perf. Triggers on "REQUEST_CHANGES" verdict, "trip circuit breaker", "deadlock", "review cycle count".
---

# Circuit Breaker

Prevent infinite review loops by counting REQUEST_CHANGES rounds per issue and halting after 3.

## State File

All state lives in `.claude/pipeline/review-cycles.json`. Create it if it doesn't exist.

```json
{
  "CODE-REVIEW-001": {
    "stan_rounds": 1,
    "percy_rounds": 0,
    "total_rounds": 1,
    "last_updated": "YYYY-MM-DD",
    "status": "active"
  }
}
```

## Workflow

### On each REQUEST_CHANGES verdict:

1. Read `.claude/pipeline/review-cycles.json`
2. Find or create the entry for the current `CODE-REVIEW-<id>`
3. Increment the relevant counter (`stan_rounds` or `percy_rounds`) and `total_rounds`
4. Write back to the file
5. Check: **if `total_rounds >= 3`** → trip the breaker (see below)
6. If `total_rounds < 3` → continue normally, report current count to the implementation agent

### On APPROVE verdict:

1. Set `status: "resolved"` for the CODE-REVIEW entry
2. Write back to the file
3. Do NOT trip the breaker

### Tripping the Breaker (total_rounds >= 3):

1. Set `status: "deadlocked"` in review-cycles.json
2. Write `DEADLOCK-<id>.md` to `.claude/pipeline/` using `assets/deadlock-template.md`
3. Stop the pipeline — no further agent handoffs
4. Notify @paige-product via the DEADLOCK file (she is the Oracle)

## DEADLOCK File Schema

```markdown
---
id: DEADLOCK-001
code_review_ref: CODE-REVIEW-001
prd_ref: PRD-001
created: YYYY-MM-DD
stan_rounds: 2
percy_rounds: 1
total_rounds: 3
---

## Deadlock Summary
[1 paragraph: what disagreement has been cycling for 3 rounds]

## Option A
[One resolution path — what implementing agent would need to change]
**Consequence:** [Trade-off]

## Option B
[Alternative resolution path]
**Consequence:** [Trade-off]

## Pipeline Status
**HALTED** — awaiting human Oracle (@paige-product) decision.

To resume: human selects Option A or B, informs @paige-product,
who resumes the pipeline from the halted review stage.
```

## Gotchas

- **The breaker is per CODE-REVIEW document, not per agent** — if stan approves but percy issues 3 REQUEST_CHANGES, the breaker still trips
- **APPROVE resets nothing** — once resolved, the entry stays as "resolved" for audit purposes
- **Do not delete review-cycles.json** — it is the audit trail for the entire pipeline run
- **Human is the Oracle** — never auto-resolve a deadlock; always produce the DEADLOCK file and wait
