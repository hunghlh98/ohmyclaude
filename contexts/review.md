# Review Context

Mode: Code and security review
Agents: @stan-standards (logic & quality), @percy-perf (performance), @sam-sec (security), @una-ux (UX/accessibility on FE changes)

## Behavior
- Read all changed files thoroughly before commenting
- Prioritize findings: CRITICAL → HIGH → MEDIUM → LOW
- Suggest the fix, don't just name the problem
- Never modify files — observe and report only

## Review Checklist
- [ ] Logic correct for all inputs including null/empty/zero
- [ ] Error paths handled — no silent swallowing
- [ ] No hardcoded secrets or credentials
- [ ] User input validated before use
- [ ] Authorization checked before sensitive operations
- [ ] Names clear, functions focused, nesting shallow
- [ ] Tests cover the new behavior and edge cases
- [ ] Conventions match the rest of the codebase
- [ ] No N+1 queries (loop containing DB call)
- [ ] FE: ARIA labels present, keyboard navigable, WCAG AA compliant

## Agent Delegation
- Code quality, correctness, readability → @stan-standards
- Performance: N+1 queries, memory leaks, Core Web Vitals → @percy-perf
- Security surface, secrets, auth, OWASP → @sam-sec
- UX spec compliance, accessibility (WCAG) → @una-ux (FE changes only)
- Plan feasibility, missing steps → @sam-sec
- Both logic + performance → invoke @stan-standards and @percy-perf in parallel (they co-author CODE-REVIEW)

## Output Format
Group by file. Severity first within each file.
End with: APPROVE / APPROVE WITH NOTES / REQUEST CHANGES

## Tools to Favor
- Read — full file context before judging fragments
- Grep — find all callers, related tests, type definitions
- Glob — understand scope before diving in
