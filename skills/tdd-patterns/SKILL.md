---
name: tdd-patterns
description: Test-driven development patterns — RED/GREEN/REFACTOR cycle, test structure, mocking strategies, and coverage targets. Used by @quinn-qa when writing tests and by @stan-standards when auditing test quality.
origin: ohmyclaude
---

# TDD Patterns

Use this skill when the user mentions: test, spec, TDD, red-green-refactor, coverage, unit test, integration test, mock, stub, or asks how to test something.

## The RED → GREEN → REFACTOR Cycle

**RED**: Write a test that fails for the right reason.
```
Test failure: "Expected 42, got undefined"  ← right reason
Test failure: "SyntaxError: unexpected token"  ← wrong reason
```

**GREEN**: Write the simplest code that makes the test pass. Resist the urge to write more than needed.

**REFACTOR**: With the tests green, clean up. Extract duplication. Clarify intent. The tests protect you from regressions.

Repeat. Never skip steps. Never write production code without a failing test first.

## Test Structure: Arrange → Act → Assert

```typescript
it('returns user by id', async () => {
  // Arrange
  const user = await createTestUser({ name: 'Alice' });

  // Act
  const result = await getUser(user.id);

  // Assert
  expect(result.name).toBe('Alice');
});
```

Each test: one behavior, one assertion concept (can have multiple `expect` calls for that behavior).

## Test Naming

Name tests by behavior, not implementation:

```
// Bad
it('calls findById with the correct id')

// Good
it('returns the user when they exist')
it('throws NotFoundError when user does not exist')
it('returns null when id is null')
```

## Mocking Strategy

**Mock sparingly.** Mock:
- External services (HTTP APIs, email, SMS)
- Time (`Date.now()`, timers)
- File system (in unit tests only)
- Non-deterministic randomness

**Don't mock:**
- Your own domain logic
- The database in integration tests (use a test database)
- Pure functions

```typescript
// Good mock: external HTTP
jest.mock('./email-service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined)
}));

// Bad mock: mocking what you're testing
jest.mock('./user-service');  // defeats the purpose
```

## Coverage Targets

| Layer | Target |
|-------|--------|
| Domain/business logic | 90%+ |
| Services / use cases | 80%+ |
| Utilities / helpers | 85%+ |
| API handlers | 70%+ |
| UI components | 60%+ |

Coverage is a floor, not a goal. 60% with meaningful tests beats 95% with tests that only check `toBeDefined()`.

## Test Types and When to Use

| Type | Scope | Speed | Use for |
|------|-------|-------|---------|
| Unit | One function/class | Fast | Pure logic, algorithms, transformations |
| Integration | Module + dependencies | Medium | DB queries, service interactions |
| E2E | Full system | Slow | Critical user journeys only |

Ratio target: ~70% unit, ~25% integration, ~5% E2E.

## Anti-Patterns

- **Testing implementation**: `expect(spy).toHaveBeenCalledWith(...)` instead of testing the outcome
- **Shared state**: Tests that depend on execution order
- **Incomplete assertions**: `expect(result).toBeDefined()` — be specific
- **Skipping error paths**: Every `throw` and `catch` deserves a test
- **Magic numbers**: Use named constants or `describe` context to explain test data
