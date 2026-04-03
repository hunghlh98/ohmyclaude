---
description: Review changed files for code quality, correctness, and conventions. Invokes @stan-standards.
---

# /review

Invoke this command to perform a structured code review on changed or specified files.

## What This Command Does

1. Identifies files to review (changed files, or files you specify)
2. Invokes **@stan-standards** (code reviewer) on those files
3. @stan-standards produces a prioritized review with severity-rated findings
4. Optionally escalates to **@sam-sec** for security-specific issues

## When to Use

- Before requesting a PR review from teammates
- After implementing a feature to catch issues before tests
- When reviewing a colleague's code
- For a self-review before merging

## How It Works

```
/review                          → review all recently changed files
/review src/auth/handler.ts      → review a specific file
/review src/api/                 → review all files in a directory
/review --security               → include @sam-sec for security analysis
```

## Example Output (from @stan-standards)

```markdown
## Review: src/auth/oauth.ts

### Summary
Generally well-structured. One CRITICAL issue with token validation that must be fixed.
Two HIGH issues around error handling.

### CRITICAL
- **oauth.ts:47** — The `state` parameter is not verified against the session value.
  This allows CSRF attacks on the OAuth callback.
  Fix: Compare `req.query.state` to `session.oauthState` before processing.

### HIGH
- **oauth.ts:62** — Google API error responses are caught but the error is swallowed.
  Fix: Re-throw or return a Result error so callers can handle failures.

### MEDIUM
- **oauth.ts:88** — Magic number `3600` should be a named constant `TOKEN_EXPIRY_SECONDS`.

### What's Good
- Clean separation between token exchange and user creation
- Consistent use of async/await throughout

### Verdict
REQUEST CHANGES — CRITICAL issue must be resolved before merge.
```

## Related Agents

- **@stan-standards** — Directly invoke the reviewer
- **@sam-sec** — For security-focused review
- **@heracles** — When @stan-standards finds a bug and you need it fixed
