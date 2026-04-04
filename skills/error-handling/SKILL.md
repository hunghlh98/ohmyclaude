---
name: error-handling
description: Robust error handling patterns — custom error classes, Result types, error boundaries, retry logic, and operational vs programmer errors. Used by @beck-backend and @effie-frontend when implementing error-resilient code.
origin: ohmyclaude
---

# Error Handling

Use this skill when the user mentions: error, exception, try/catch, Result, Either, error boundary, retry, fallback, or asks how to handle failures.

## Operational vs Programmer Errors

**Operational errors** are expected, recoverable failures:
- Network timeout, database unavailable
- Invalid user input, resource not found
- Rate limit exceeded

Handle these with care — they are part of normal flow.

**Programmer errors** are bugs:
- Passing `null` to a function that requires a string
- Calling a method that doesn't exist
- Array index out of bounds

Do NOT recover from programmer errors. Let them crash and surface them immediately.

## Custom Error Classes

```typescript
// Base class with structured metadata
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Domain-specific errors
class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 'NOT_FOUND', 404, { resource, id });
  }
}

class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super('Validation failed', 'VALIDATION_ERROR', 422, { fields });
  }
}

class UnauthorizedError extends AppError {
  constructor(reason = 'Authentication required') {
    super(reason, 'UNAUTHORIZED', 401);
  }
}
```

## Result Type Pattern

Avoid exceptions for expected failures — use Result types:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Usage
async function getUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await db.users.findById(id);
  if (!user) return { ok: false, error: new NotFoundError('User', id) };
  return { ok: true, value: user };
}

// Call site
const result = await getUser(id);
if (!result.ok) {
  return res.status(404).json({ error: result.error.message });
}
// result.value is User here — TypeScript knows
const user = result.value;
```

## Error Boundaries (React)

```typescript
class ErrorBoundary extends React.Component<Props, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('UI error boundary caught', { error, componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}
```

## Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 100 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay + Math.random() * baseDelayMs); // jitter
    }
  }

  throw lastError;
}
```

## Async Error Handling

```typescript
// Always await in try/catch — never float promises
try {
  const result = await riskyOperation();
} catch (err) {
  if (err instanceof NotFoundError) {
    // handle specifically
  } else {
    throw err; // re-throw unknown errors
  }
}

// Express/Next.js: wrap async handlers
const asyncHandler = (fn: Handler) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

## Anti-Patterns

- Catching all errors and swallowing them: `catch (e) {}` — silent failures are the worst
- Using exceptions for control flow: `throw` to return a "not found" value
- Logging and re-throwing without adding context
- Using string comparisons to detect error types: `if (err.message === 'not found')`
- Not cleaning up resources in finally blocks
- Retrying programmer errors (only retry operational errors)
