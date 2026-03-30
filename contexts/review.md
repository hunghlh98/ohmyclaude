# Review Context

Mode: Code and security review
Agents: @athena (quality), @argus (security), @nemesis (plan review)

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

## Agent Delegation
- Code quality, correctness, readability → @athena
- Security surface, OWASP, secrets → @argus
- Plan feasibility, missing steps → @nemesis
- Both in one pass → invoke @athena then @argus sequentially

## Output Format
Group by file. Severity first within each file.
End with: APPROVE / APPROVE WITH NOTES / REQUEST CHANGES

## Tools to Favor
- Read — full file context before judging fragments
- Grep — find all callers, related tests, type definitions
- Glob — understand scope before diving in
