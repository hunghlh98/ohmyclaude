---
name: write-contract
description: Write and co-sign sprint CONTRACT-<id>.md artifacts in .claude/pipeline/. Encodes weighted criteria with runnable probe specs that @val-evaluator grades against. Loaded by @paige-product (drafts) and @val-evaluator (validates + signs). Triggers on "write contract", "sprint contract", "negotiate DOD", "sign criteria".
origin: ohmyclaude
---

# Write Contract

Produce and co-sign the sprint CONTRACT for a /forge request before any code is written.

## Why this exists

Anthropic Labs' [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (Rajasekaran 2026) identifies the practice of negotiating "definition of done" between generator and evaluator before any code as the single largest defect-prevention lever in multi-agent pipelines:

> Before each sprint, generator and evaluator negotiate agreement on what "done" means — implementation detail + testable behaviors — before any code is written.

The CONTRACT is the artifact that captures that agreement. Without it, /forge Step 5 cannot start.

---

## Prerequisites

- `PRD-<id>.md` exists with acceptance criteria (from @paige-product)
- `SDD-<id>.md` exists if route includes architecture (from @artie-arch)
- `UX-SPEC-<id>.md` exists if `Has_FE_Component=true` (from @una-ux)
- @val-evaluator agent is available in the team

If any prerequisite is missing, do not draft. Send back to @paige-product with the missing dependency.

---

## Output

Write to `.claude/pipeline/CONTRACT-<id>.md` using the same `<id>` as the PRD.

Two-phase write:

1. **@paige-product drafts** with `signed: false`
2. **@val-evaluator validates** and either:
   - Sets `signed: true`, appends signature block (CONTRACT advances to /forge Step 5), or
   - Returns `signed: false` with `## Revision Requests` (one revision allowed before circuit breaker)

---

## CONTRACT Schema

```markdown
---
id: CONTRACT-001
prd_ref: PRD-001
sdd_ref: SDD-001                      # omit if no architecture stage
ux_spec_ref: UX-SPEC-001              # omit if Has_FE_Component=false
generators: [beck-backend, effie-frontend]
evaluator: val-evaluator
threshold: 80                         # default 80; bump to 90 for security/payment routes
signed: false                         # @val-evaluator flips to true after validation
signed_by: []                         # [paige-product (drafted), val-evaluator (validated, ISO-timestamp)]
created: YYYY-MM-DD
---

## Goal

[1–2 sentences from PRD restated as the testable outcome — not the user-facing pitch]

## Non-Goals

- [Explicitly out of scope — prevents scope creep mid-sprint]

## Weighted Criteria

| # | Behavior | Weight | Probe |
|---|----------|--------|-------|
| 1 | [Single testable behavior] | [1–100] | [Runnable spec, see Probe DSL below] |
| ... | ... | ... | ... |

**Weights MUST sum to exactly 100. @val-evaluator will reject otherwise.**

## Critical Failure Conditions (zero score = FAIL regardless of weighted total)

- [Behavior whose absence is unconditionally a fail — e.g., "any 5xx on auth endpoint"]
- [Adversarial input that must not crash — e.g., "10MB body must return 413, not OOM the worker"]

## Out-of-Band Probes (optional, weight 0)

| # | Probe | Purpose |
|---|-------|---------|
| O1 | `db_state SELECT count(*) FROM audit_log WHERE event='user_create'` | Sanity check audit trail not silently broken |

These probes don't affect the weighted score; they detect orthogonal regressions Val notes in the verdict body.

## Notes for the Generator

- [Implementation hint that the SDD didn't capture but the evaluator wants the generator to know]
```

---

## Probe DSL

Each criterion's `Probe` column carries a runnable spec. Three forms:

### `http_probe` (most common)

```
http_probe <METHOD> <URL>
  [body=<JSON or @file>]
  [headers=<key=value;...>]
  [expect.status=<code>]
  [expect.json.<jsonpath>=<value>]
  [expect.json.<jsonpath>~=<regex>]
  [expect.header.<name>=<value>]
```

Example (criterion: "create user returns 201 + JSON shape"):
```
http_probe POST /api/users body={"email":"x@y.com"} expect.status=201 expect.json.id~=^[a-f0-9-]{36}$ expect.json.email=x@y.com
```

### `db_state` (verification only — read-only enforced)

```
db_state SELECT <expression> FROM <table> WHERE <param-bound clause>
  expect.<row|count|value>=<value>
```

Example (criterion: "user row persisted with hashed password"):
```
db_state SELECT password_hash FROM users WHERE email='x@y.com' expect.value~=^\$2[aby]\$
```

The MCP server enforces SELECT-only at the parser level. Mutation keywords (INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER) are rejected before the query reaches the database.

### `playwright` (DOM-level, sparingly)

```
playwright
  goto <url>
  fill <selector> <value>
  click <selector>
  expect <selector> [.toHaveText|.toBeDisabled|.toBeVisible] <value>
```

**Cap: max 1 screenshot OR 3 DOM assertions per criterion.** Playwright is heavy; use `http_probe` for behavior that doesn't require the browser.

### Shell escape (last resort)

If none of the above fits, use a literal shell command. Document why the probe DSL didn't suffice in the criterion's Notes column.

---

## Weighting Heuristics

| Stake | Weight band | Rationale |
|-------|-------------|-----------|
| Core happy path | 25–40 per criterion | The thing the user actually pays for |
| Critical failure mode | 20–30 per criterion | Auth, payment, data integrity — heavy weight even if "obvious" |
| Common edge case | 10–20 per criterion | Edge inputs, error states, empty states |
| Nice-to-have polish | 5–10 per criterion | Loading states, animations, copy refinements |

**Avoid splitting one behavior across many low-weight rows.** A criterion below weight 5 is usually a sign of over-decomposition; merge it into a related higher-weight criterion or move it to "Notes for the Generator."

---

## Revision Requests

When @val-evaluator returns `signed: false`, the file gains:

```markdown
## Revision Requests (round N)

- **Row 3** has compound criterion (`returns 201 AND sends email AND updates audit log`). Split into 3 rows.
- **Row 7** weight 0 — either delete or move to "Out-of-Band Probes".
- **Weights sum to 95**, not 100. Missing 5 points; re-balance.
- **Row 12** probe `manual review` is not runnable. Replace with http_probe / db_state / playwright spec or delete.
```

Paige addresses each, increments round in frontmatter, asks Val to re-validate. After round 2, escalate to @paige-product's circuit breaker.

---

## Calibration

**Read `references/calibration-examples.md` before validating or grading.** It contains one PASS contract and one FAIL contract with worked verdicts — the few-shot anchors that align Val's judgment with project conventions. Per the harness paper:

> Few-shot calibrate the evaluator with example score breakdowns to align its judgment with yours and reduce score drift across iterations.

Without the calibration read, score drift is the silent failure mode of evaluator agents over time.

---

## Gotchas

- **The CONTRACT is the gate, not the artifact.** /forge Step 5 reads `signed: true` and proceeds; if absent, halts. The CONTRACT is enforcement, not just documentation.
- **Critical Failure Conditions zero out the whole score.** A criterion that's "must not crash on 10MB input" being missed = FAIL even if everything else is perfect. Use sparingly — typically 1–3 per CONTRACT.
- **Non-Goals matter as much as Goals.** "Out of scope: rate limiting" lets Beck not over-build; without it, scope creeps into the sprint.
- **Read the `evaluator-tuning` skill periodically.** That's where evaluator-prompt drift gets measured against human verdicts.
- **CONTRACT is append-only after signing.** Mid-sprint criterion changes mean a new CONTRACT-<id>-r2.md, not edits to the signed file.

---

## Attribution

Methodology pattern derived from Anthropic Labs' "Harness Design for Long-Running Application Development" (Rajasekaran 2026, MIT-style sharing). Adapted to ohmyclaude's `.claude/pipeline/` artifact convention and Agent Teams coordination.
