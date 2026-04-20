# sc-pm — PDCA Document Templates

Plan / Do / Check / Act document structure. Cited by `SKILL.md`.

Inlined from SuperClaude_Plugin v4.3.0 (MIT).

---

## Location

`.claude/pipeline/pdca/<feature-name>/`

Structure:
```
.claude/pipeline/pdca/<feature-name>/
  plan.md    # hypothesis and design
  do.md      # experimentation and trial-and-error
  check.md   # evaluation and analysis
  act.md     # improvement and next actions
```

---

## Template — plan.md

```markdown
# Plan: <feature name>

## Hypothesis
[What to implement and why this approach]

## Expected Outcomes (quantitative)
- Test coverage: 45% → 85%
- Implementation time: ~4 hours
- Security: OWASP compliance

## Risks & Mitigation
- [Risk 1] → [mitigation]
- [Risk 2] → [mitigation]
```

---

## Template — do.md

```markdown
# Do: <feature name>

## Implementation Log (chronological)
- 10:00 Started auth middleware implementation
- 10:30 Error: JWTError — SUPABASE_JWT_SECRET undefined
  → Investigation: sc-research "Supabase JWT configuration"
  → Root cause: missing environment variable
  → Solution: add to .env + startup validation
- 11:00 Tests passing, coverage 87%

## Learnings During Implementation
- Environment variables need startup validation
- Supabase Auth requires JWT secret for token validation
```

---

## Template — check.md

```markdown
# Check: <feature name>

## Results vs Expectations

| Metric | Expected | Actual | Status |
|---|---|---|---|
| Test Coverage | 80% | 87% | ✓ Exceeded |
| Time | 4h | 3.5h | ✓ Under |
| Security | OWASP | Pass | ✓ Compliant |

## What Worked Well
- Root cause analysis prevented repeat errors
- Official docs research was accurate

## What Failed / Challenges
- Initial assumption about JWT config was wrong
- Needed 2 investigation cycles to find root cause
```

---

## Template — act.md

```markdown
# Act: <feature name>

## Success Pattern → Formalization
Created: docs/patterns/<feature>-integration.md

## Learnings → Global Rules
CLAUDE.md updated:
  - Always validate environment variables at startup
  - Use sc-research for official configuration patterns

## Checklist Updates
.claude/pipeline/checklists/new-feature-checklist.md:
  - [ ] Environment variables documented
  - [ ] Startup validation implemented
  - [ ] Security scan passed
```

---

## Lifecycle

1. **Start**: create `pdca/<feature>/plan.md`
2. **Work**: continuously update `pdca/<feature>/do.md`
3. **Complete**: create `pdca/<feature>/check.md`
4. **Success → formalize**:
   - Move pattern content to `docs/patterns/<feature>.md`
   - Create `pdca/<feature>/act.md`
   - Update `CLAUDE.md` if globally applicable
5. **Failure → learn**:
   - Create `.claude/pipeline/mistakes/<feature>-<date>.md`
   - Create `pdca/<feature>/act.md` with prevention steps
   - Update checklists with new validation steps

---

## When to Use PDCA in `/forge`

Not every task needs a full PDCA cycle. Use it for:

- Features with explicit quantitative success criteria
- Work that will be repeated (creates reusable patterns)
- High-risk changes where post-hoc analysis is valuable
- Multi-session projects where memory across sessions matters

For routine work (a typo fix, a small refactor), the standard `PRD → SDD → IMPL → TEST → CODE-REVIEW` sequence is enough. Do not create PDCA artifacts for trivial tasks.
