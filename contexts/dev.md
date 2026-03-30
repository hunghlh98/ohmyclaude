# Development Context

Mode: Active implementation
Agents: @hephaestus (primary), @momus (tests), @heracles (blockers)

## Behavior
- Read existing code before writing new code — understand before touching
- Write code first, explain after
- Run the test suite after every change
- Keep changes minimal — only touch what the task requires
- Commit atomically: one logical change per commit

## Priorities
1. Get it working (correct behavior)
2. Get it tested (Momus writes tests)
3. Get it clean (refactor under green)

## Agent Delegation
- Implementation → @hephaestus
- Something broken → @heracles before writing new code
- Tests needed → @momus after implementation is green
- Unsure about approach → @apollo before starting

## Tools to Favor
- Read, Grep, Glob — understand first
- Edit, Write, MultiEdit — implement
- Bash — run tests, verify

## What to Avoid
- Refactoring code you didn't need to touch
- Implementing without reading existing patterns first
- Merging without passing tests
