# sc-spec-panel — Output Formats

Full specs for each output format. Cited by `SKILL.md`.

Inlined from SuperClaude_Plugin v4.3.0 (MIT).

---

## Standard Format (`--format standard`, default)

Balanced detail — suitable for most review contexts.

```yaml
specification_review:
  original_spec: "authentication_service.spec.yml"
  review_date: "2025-01-15"
  expert_panel: ["wiegers", "adzic", "nygard", "fowler"]
  focus_areas: ["requirements", "architecture", "testing"]

quality_assessment:
  overall_score: 7.2/10
  requirements_quality: 8.1/10
  architecture_clarity: 6.8/10
  testability_score: 7.5/10

critical_issues:
  - category: "requirements"
    severity: "high"
    expert: "wiegers"
    issue: "Authentication timeout not specified"
    recommendation: "Define session timeout with configurable values"

  - category: "architecture"
    severity: "medium"
    expert: "fowler"
    issue: "Token refresh mechanism unclear"
    recommendation: "Specify refresh token lifecycle and rotation policy"

expert_consensus:
  - "Specification needs concrete failure handling definitions"
  - "Missing operational monitoring and alerting requirements"
  - "Authentication flow is well-defined but lacks error scenarios"

improvement_roadmap:
  immediate:  ["Define timeout specifications", "Add error handling scenarios"]
  short_term: ["Specify monitoring requirements", "Add performance criteria"]
  long_term:  ["Comprehensive security review", "Integration testing strategy"]
```

---

## Structured Format (`--format structured`)

Token-efficient, symbol-heavy representation. Preferred when cost or context pressure matters.

Symbols used:
- `!` — critical issue
- `~` — warning / medium issue
- `.` — minor / advisory
- `+` — consensus recommendation
- `>` — next step

Example:
```
! WIEGERS:R-001 — no measurable acceptance criteria
  > replace "gracefully" with "5 consecutive fails / 30s"
~ ADZIC:R-001 — no Given/When/Then examples
  > add per-requirement scenario block
. FOWLER:I-003 — CircuitBreaker couples state + execution
  > split into State + Executor
+ panel consensus — add failure notification interface
```

---

## Detailed Format (`--format detailed`)

Comprehensive analysis. Full expert commentary, examples, and implementation guidance. Highest token cost.

Use when:
- Training or mentoring someone on specification quality
- The specification is being evaluated as a reference / template
- A stakeholder needs to understand *why* each recommendation matters

Structure:
1. **Executive summary** — 3-sentence TL;DR
2. **Per-expert deep reviews** — full commentary from each panelist
3. **Consolidated findings** — deduplicated, cross-expert-validated
4. **Recommended edits** — paste-ready improved text
5. **Alternative framings** — how the spec might read if written by each expert
6. **Learning notes** — what this spec teaches about specification craft
