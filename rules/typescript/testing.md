---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
---

# TypeScript Testing Rules

## Frameworks
- Vitest (default) or Jest; one framework per repo, never both
- React: Testing Library — query by role/label/text, never by test-id unless semantics are impossible
- E2E: Playwright; reserve Cypress only for existing codebases on it

## Patterns
- Arrange-Act-Assert structure
- One behavior per test; descriptive names: `returns_404_when_user_does_not_exist`
- `it.each` / `test.each` for parameterized variants
- Test the public API, not the implementation — no `expect(fn).toHaveBeenCalledWith(...)` on internal helpers

## Anti-Patterns
- No `setTimeout` in tests — use `vi.useFakeTimers()` / `jest.useFakeTimers()`
- No `any` in test doubles — satisfy the real type or extract a narrow interface
- No snapshot tests for large trees; target small, intentional fragments
- Never mock modules you own — mock only the boundary (fetch, DB client, time)

## React Testing
- Render once per test; query afresh with `screen` — no `wrapper.rerender` unless you're testing re-render behavior
- Use `userEvent` over `fireEvent` for interactions
- Assert accessible queries first (`getByRole`, `getByLabelText`), fall back to `getByText`

## Coverage
- V8 / istanbul with 80%+ line target; don't chase 100% — test meaningful branches
- `.test.ts` files excluded from coverage numerator and denominator

## CI Commands
- `npm test -- --run` (CI mode, non-watch)
- `npm run test:e2e` for Playwright; runs against a prod-like build
