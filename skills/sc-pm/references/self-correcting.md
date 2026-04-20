# sc-pm — Self-Correcting Execution

Root-cause-first error protocol and warning-investigation culture. Cited by `SKILL.md`.

Inlined from SuperClaude_Plugin v4.3.0 (MIT).

---

## Core Principle

**Never retry the same approach without understanding why it failed.**

Retrying a failed command without root-cause investigation is how technical debt enters a codebase — the command succeeds by coincidence rather than correctness, and the underlying issue reappears later in a harder-to-diagnose form.

---

## Error-Investigation Protocol

```yaml
1. Error occurs:
   → STOP: never re-execute the same command immediately
   → Question: "Why did this error occur?"

2. Root-cause investigation (MANDATORY):
   - sc-research: official documentation lookup
   - WebFetch: Stack Overflow, GitHub issues, community solutions
   - Grep: codebase pattern analysis for similar issues
   - Read: related files and configuration inspection
   → Document: "The cause is likely <X>, because <evidence Y>"

3. Hypothesis formation:
   - Create .claude/pipeline/pdca/<feature>/hypothesis-error-fix.md
   - State: "Cause: <X>. Evidence: <Y>. Solution: <Z>"
   - Rationale: "<Why this approach will solve the problem>"

4. Solution design (MUST BE DIFFERENT):
   - Previous approach A failed → design approach B
   - NOT: approach A failed → retry approach A
   - Verify: is this truly a different method?

5. Execute new approach:
   - Implement solution based on root-cause understanding
   - Measure: did it fix the actual problem?

6. Learning capture:
   - Success → write_memory("learning/solutions/<error_type>", solution)
   - Failure → return to step 2 with new hypothesis
   - Document: .claude/pipeline/pdca/<feature>/do.md (trial-and-error log)
```

---

## Anti-Patterns (strictly prohibited)

- ❌ "Got an error. Let's just try again."
- ❌ "Retry: attempt 1... attempt 2... attempt 3..."
- ❌ "It timed out, so let's increase the wait time." (ignoring root cause)
- ❌ "There are warnings but it works, so it's fine." (future technical debt)

---

## Correct Patterns (required)

- ✓ "Got an error. Investigating via official documentation."
- ✓ "Cause: environment variable not set. Why is it needed? Understanding the spec."
- ✓ "Solution: add to `.env` + implement startup validation."
- ✓ "Learning: run environment-variable checks first from now on."

---

## Warning / Error Investigation Culture

**Rule: investigate every warning and error with curiosity.**

### Zero tolerance for dismissal

When a warning is detected:

1. **Never dismiss with "probably not important".**
2. **Always investigate**:
   - `sc-research` for official documentation
   - Understand the *why* behind the warning
3. **Categorize impact**:
   - **Critical**: must fix immediately (security, data loss)
   - **Important**: fix before completion (deprecation, performance)
   - **Informational**: document why it's safe to ignore (with evidence)
4. **Document the decision**:
   - If fixed: why it was important + what was learned
   - If ignored: why safe + evidence + future implications

### Example — correct behavior

```
Warning: "Deprecated API usage in auth.js:45"

Investigation:
  1. sc-research: "React useEffect deprecated pattern"
  2. Finding: cleanup function signature changed in React 18
  3. Impact: will break in React 19 (timeline: 6 months)
  4. Action: refactor to new pattern immediately
  5. Learning: deprecation = future breaking change
  6. Document: .claude/pipeline/pdca/<feature>/do.md
```

### Example — wrong behavior (prohibited)

```
Warning: "Deprecated API usage"
Response: "Probably fine, ignoring." ❌ NEVER DO THIS
```

---

## Quality Mindset

- Warnings = future technical debt.
- "Works now" ≠ "production ready."
- Investigate thoroughly = higher code quality.
- Learn from every warning = continuous improvement.

This principle underpins the ohmyclaude `@heracles` debugging agent: state a root cause at file:line level before touching code; minimal verified fix; no refactoring during debugging.
