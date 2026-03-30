---
description: Start a structured debugging session to identify and fix the root cause of a failure. Invokes Heracles.
---

# /debug

Invoke this command to start a structured debugging session for a failing test, crash, error, or unexpected behavior.

## What This Command Does

1. Passes the problem description to **Heracles** (debugger agent)
2. Heracles forms hypotheses and investigates systematically
3. Heracles identifies the root cause (not just the symptom)
4. Heracles applies a targeted fix and verifies it works

## When to Use

- A test is failing and you don't know why
- You're getting an error you can't trace
- Something worked before and broke after a change
- You need to bisect a regression

## Usage

```
/debug              → describe the problem interactively
/debug <description of the issue>
```

## Examples

```
/debug TypeError: Cannot read property 'id' of undefined in UserService.getUser

/debug The payment webhook handler returns 200 but the order status is not updated

/debug Tests pass locally but fail in CI with "connection refused"
```

## What Heracles Will Do

```markdown
## Debug Report

### Symptom
TypeError: Cannot read property 'id' of undefined
  at UserService.getUser (src/services/user.ts:42)

### Root Cause
src/services/user.ts:40 — `db.users.findOne()` returns `null` when the user
doesn't exist, but line 42 accesses `.id` without a null check.

### Fix Applied
Added null check: if user is null, throw NotFoundError before accessing fields.

### Verification
- [x] Original test now passes
- [x] All 47 related tests still pass
```

## Related Agents

- **@heracles** — Directly invoke the debugger
- **@athena** — If Heracles finds the bug was caused by a code quality issue
- **@momus** — To write a regression test after the fix
