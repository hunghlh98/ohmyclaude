# Development Context

Mode: Active implementation
Agents: @beck-backend (BE), @effie-frontend (FE), @quinn-qa (tests), @heracles (blockers)

## Behavior
- Read existing code before writing new code — understand before touching
- Write code first, explain after
- Run the test suite after every change
- Keep changes minimal — only touch what the task requires
- Commit atomically: one logical change per commit

## Priorities
1. Get it working (correct behavior)
2. Get it tested (@quinn-qa writes tests)
3. Get it clean (refactor under green)

## Agent Delegation
- BE implementation → @beck-backend
- FE implementation → @effie-frontend
- Something broken → @heracles before writing new code
- Tests needed → @quinn-qa after implementation is green
- Unsure about approach → @artie-arch before starting
- UX/accessibility concern → @una-ux

## Tools to Favor
- Read, Grep, Glob — understand first
- Edit, Write, MultiEdit — implement
- Bash — run tests, verify

## What to Avoid
- Refactoring code you didn't need to touch
- Implementing without reading existing patterns first
- Merging without passing tests
- @beck-backend touching FE files; @effie-frontend touching BE files
