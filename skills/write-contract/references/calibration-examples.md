# Calibration Examples

Two worked CONTRACT examples — one that PASSes Val's grading, one that FAILs. Read both before validating a new CONTRACT or grading an implementation. These are the few-shot anchors that align Val's judgment with project conventions.

The harness paper:

> Few-shot calibrate the evaluator with example score breakdowns to align its judgment with yours and reduce score drift across iterations.

---

## Example 1 — PASS (rate-limiting feature)

### CONTRACT-EX-001.md

```markdown
---
id: CONTRACT-EX-001
prd_ref: PRD-EX-001
generators: [beck-backend]
evaluator: val-evaluator
threshold: 80
signed: true
signed_by:
  - paige-product (drafted)
  - val-evaluator (validated, 2026-04-27T14:00:00Z)
---

## Goal
Add per-user rate limiting (10 req / min) to POST /api/users.

## Non-Goals
- Rate limiting on other endpoints
- Per-IP rate limiting
- Redis-backed (in-memory token bucket is fine for now)

## Weighted Criteria

| # | Behavior | Weight | Probe |
|---|----------|--------|-------|
| 1 | 1st–10th request from one user in 60s window returns 201 | 30 | `http_probe POST /api/users body=... × 10 expect.status=201` |
| 2 | 11th request from same user in 60s window returns 429 | 35 | `http_probe POST /api/users body=... (after 10 priors) expect.status=429 expect.json.code="RATE_LIMITED"` |
| 3 | 11th request from a different user returns 201 | 20 | `http_probe POST /api/users user=B (after 10 from user A) expect.status=201` |
| 4 | Rate limit window resets — 11th request 61s after 10th returns 201 | 15 | `http_probe POST /api/users (after 10 priors + sleep 61s) expect.status=201` |

## Critical Failure Conditions
- Rate limiter MUST NOT block all users when one user hits the cap (criterion 3).
- Rate limit MUST NOT persist across server restart in a way that locks users out.

## Notes for the Generator
- Use a sliding window or fixed window — Beck's call. Document the choice in IMPL-BE.
```

### TEST-EX-001.md (Val's verdict)

```markdown
---
id: TEST-EX-001
contract_ref: CONTRACT-EX-001
impl: [IMPL-BE-EX-001]
verdict: PASS
weighted_score: 100
threshold: 80
evaluator: val-evaluator
round: 1
---

## Test Suite Results
- Runner: `mvn verify`
- Total: 38 | Passed: 38 | Failed: 0 | Coverage: 87%
- Flake check: 3/3 runs identical

## Criterion Grades

| # | Weight | Probe output | Pass? | Score |
|---|--------|--------------|-------|-------|
| 1 | 30 | 10× `http_probe POST /api/users` → all 201 | YES | 30 |
| 2 | 35 | 11th from user A → 429, code=RATE_LIMITED | YES | 35 |
| 3 | 20 | User B's 1st (after A's 10) → 201 | YES | 20 |
| 4 | 15 | After 61s sleep, user A's 11th → 201 | YES | 15 |

**Weighted score: 100/100**

## Critical Failure Checks
- All-users-blocked scenario tested separately (probe scripted in test suite): user B served while user A throttled. PASS.
- Restart persistence: token bucket is in-memory; restart resets state without locking out. Documented in IMPL-BE-EX-001 as expected.

## Verdict: PASS

Threshold 80; observed 100. All criteria met, no critical failures, no flakes. Ready for @stan-standards code review.
```

**Why this is a PASS verdict** (calibration anchor):

- All 4 criteria probed against runtime, not source code inspection.
- Critical Failure Conditions explicitly checked, not assumed.
- Coverage is incidental signal — the verdict is criterion-driven, not coverage-driven.
- Score is reported as integer; no fractional credit.

---

## Example 2 — FAIL (search endpoint)

### CONTRACT-EX-002.md

```markdown
---
id: CONTRACT-EX-002
prd_ref: PRD-EX-002
generators: [beck-backend, effie-frontend]
evaluator: val-evaluator
threshold: 80
signed: true
signed_by:
  - paige-product (drafted)
  - val-evaluator (validated, 2026-04-27T15:30:00Z)
---

## Goal
Add full-text search on `/api/articles?q=<term>` with pagination at 50 results.

## Weighted Criteria

| # | Behavior | Weight | Probe |
|---|----------|--------|-------|
| 1 | Empty `q` returns 400 with `{"code":"MISSING_QUERY"}` | 15 | `http_probe GET /api/articles?q= expect.status=400 expect.json.code=MISSING_QUERY` |
| 2 | `q=spring` returns articles whose `title` or `body` contains "spring" (case-insensitive) | 30 | `http_probe GET /api/articles?q=spring expect.status=200 expect.json.results[*].body~=(?i)spring` |
| 3 | Results are paginated at 50 per page | 25 | `db_state seed(60); http_probe GET /api/articles?q=common expect.json.results.length=50` |
| 4 | Empty results return 200 with `{"results":[],"total":0}` | 15 | `http_probe GET /api/articles?q=nonexistentstring expect.status=200 expect.json.total=0` |
| 5 | Frontend search bar debounces at 250ms | 15 | `playwright type "spring" character-by-character; expect 1 network request after 250ms` |

## Critical Failure Conditions
- Query parameter must be sanitized — SQL injection input (`q=' OR 1=1--`) must not return all rows.
```

### TEST-EX-002.md (Val's verdict)

```markdown
---
id: TEST-EX-002
contract_ref: CONTRACT-EX-002
impl: [IMPL-BE-EX-002, IMPL-FE-EX-002]
verdict: FAIL
weighted_score: 55
threshold: 80
evaluator: val-evaluator
round: 1
---

## Test Suite Results
- Runner: `npm test`
- Total: 24 | Passed: 22 | Failed: 2 | Coverage: 71%

## Criterion Grades

| # | Weight | Probe output | Pass? | Score |
|---|--------|--------------|-------|-------|
| 1 | 15 | empty q → 400, code=MISSING_QUERY | YES | 15 |
| 2 | 30 | q=spring → 200, but `body` field absent in response (only `title` returned) — partial match | NO | 0 |
| 3 | 25 | seed(60) → response.results.length=60 (no pagination) | NO | 0 |
| 4 | 15 | q=nonexistentstring → 200, results=[], total=0 | YES | 15 |
| 5 | 15 | Playwright observed 4 network requests for 6-character input (no debounce) | NO | 0 |

**Weighted score: 30/100**

Wait — adding incidental partial credit for criterion 2 (search works but returns subset of fields)... no. The criterion specified `title OR body`. The implementation only checked title. That's a NO; cannot give half credit on a binary probe.

Actual weighted score: **30/100**.

## Critical Failure Checks
- SQL injection probe: `q=' OR 1=1--` returned 200 with results from all articles. **CRITICAL FAIL** — query is not parameterized.

## Failing Tests
- `ArticleSearchTest.shouldMatchBody` — expected match in body field, got null
- `ArticleSearchTest.shouldPaginate` — expected 50 results, got 60

## Verdict: FAIL

Three of five criteria missed including the highest-weighted (30pts). Critical SQL injection finding zero's the score regardless of weighted math; the verdict is FAIL with explicit security blocker.

Send back to @beck-backend with:
1. Search must match `title OR body`, not just title.
2. Add LIMIT 50 to query (or use Pageable).
3. Parameterize the query — current implementation is unsafe.

Send back to @effie-frontend with:
4. Add debounce(250ms) to search input — currently fires on every keystroke.

Round 2 will re-probe. After round 3 if still FAIL, circuit breaker.
```

**Why this is a FAIL verdict** (calibration anchor):

- **No partial credit on binary probes.** Criterion 2 was "title OR body" — the implementation matched only title. The probe-output question is "does this match the spec", not "does this match part of the spec". Score 0.
- **Critical Failure Conditions trump weighted math.** SQL injection finding alone would FAIL even if weighted score were 95.
- **Coverage drop (71%) is reported but not weighted.** Coverage is signal, not criterion — it appears in the test suite results section, not the criterion grades.
- **Verdict body names exact next steps, not vague advice.** "Add LIMIT 50" is actionable; "improve pagination" is not.
- **Drift trap caught**: the verdict author considered giving partial credit for criterion 2 (search works, just returns fewer fields). Calibration says NO — partial credit on binary probes is the slippery slope to evaluator generosity.

---

## Self-correction signals (read these before each grading session)

If you find yourself thinking any of these, **stop and re-read the calibration**:

1. *"It's mostly working — give partial credit."* No. Probes are binary. Score 0 or full weight.
2. *"The test failure is a flaky test, ignore it."* No. Re-run 3 times; if it fails any of 3, FAIL.
3. *"The implementer is close — bump the threshold down to 75 just this once."* No. Threshold is set in the CONTRACT; renegotiation requires a new round.
4. *"Code looks correct, the probe must be wrong."* If the probe is wrong, fix the probe (escalate to Paige) and re-grade. Don't assume probe error to favor the implementer.
5. *"This is a docs change, lower threshold is fine."* No — docs CONTRACTs should have lower threshold *in the CONTRACT itself* before code starts, not adjusted post-hoc.

---

## Attribution

Calibration methodology adapted from Anthropic Labs' "Harness Design for Long-Running Application Development" (Rajasekaran 2026), specifically Section "Evaluator Tuning Reality" and "Few-shot calibrate the evaluator." The PASS/FAIL examples above are synthetic for ohmyclaude's pedagogical purposes.
