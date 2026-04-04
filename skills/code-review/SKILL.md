---
name: code-review
description: Code review checklist and patterns — what to look for, how to give feedback, review etiquette, and common code smells. Used by @stan-standards (logic/readability) and @percy-perf (performance) during the governance phase.
origin: ohmyclaude
---

# Code Review

Use this skill when the user asks to review code, create PR review comments, or check a diff for quality issues.

## Review Priority Order

1. **Correctness** — Does it work? Are edge cases handled?
2. **Security** — Any vulnerabilities? (delegate deep analysis to @argus)
3. **Readability** — Can the next person understand it?
4. **Maintainability** — Will this be easy to change?
5. **Performance** — Any obvious bottlenecks? (don't prematurely optimize)

Never block a PR on performance without a measured benchmark.

## Review Checklist

### Correctness
- [ ] Logic handles all inputs, including null/undefined/empty
- [ ] Off-by-one errors in loops and index operations
- [ ] Async code is awaited properly — no floating promises
- [ ] Mutations are safe — no unintended side effects
- [ ] Business rules are correctly encoded

### Security (surface check — escalate to @argus for depth)
- [ ] No hardcoded secrets or credentials
- [ ] User input is validated before use
- [ ] SQL/template/command injection not possible
- [ ] Authorization check before sensitive operations

### Readability
- [ ] Function names say what they do
- [ ] Variable names are unambiguous
- [ ] Complex logic has a comment explaining *why*
- [ ] No nested ternaries or complex one-liners
- [ ] Functions are short enough to understand in 30 seconds

### Tests
- [ ] New behavior has tests
- [ ] Edge cases and error paths are tested
- [ ] Tests are named for behavior, not implementation

### Conventions
- [ ] Follows project naming and structure conventions
- [ ] No unused imports or dead code
- [ ] No TODOs or stubs in production paths

## Code Smells to Flag

| Smell | Signal | Action |
|-------|--------|--------|
| Long function (>50 lines) | Does too much | Extract sub-functions |
| Deep nesting (>4 levels) | Complex control flow | Early returns or extract |
| Boolean flag parameter | `doThing(user, true)` | Split into two functions |
| God object | Class with >10 responsibilities | Extract classes |
| Shotgun surgery | Changing one thing requires N files | Extract to one location |
| Feature envy | Function accesses another object's data heavily | Move the function |
| Magic numbers | `if (status === 7)` | Named constant |

## Feedback Etiquette

**Be specific**: "Line 42: `data.map()` creates a new array on every render — memoize with `useMemo`" beats "performance issue here".

**Distinguish blocking from non-blocking**:
- `CRITICAL:` / `MUST:` — blocks merge
- `SHOULD:` — strong recommendation
- `NIT:` — minor style preference, non-blocking
- `Q:` — question, not a change request

**Suggest, don't just criticize**:
```
NIT: Consider extracting this into a named constant for clarity:
const MAX_RETRY_ATTEMPTS = 3;
```

**Approve with notes**: If issues are minor, approve and leave the team to decide:
```
LGTM with some nits — non-blocking, but worth addressing before v1.
```

## What Not to Block On

- Style issues already covered by the linter
- Personal style preferences not in the team guide
- "I would have done it differently" without a concrete reason
- Speculative performance concerns without benchmarks
- Hypothetical future requirements

## Self-Review Before Requesting Review

Before requesting review:
- [ ] Run all tests locally
- [ ] Read your own diff top-to-bottom
- [ ] Remove debug prints and TODOs
- [ ] Write a clear PR description explaining *why* the change was made
