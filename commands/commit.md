---
description: Generate a semantic commit message from the current git diff. Follows Conventional Commits format.
---

# /commit

Generate a well-formatted commit message from your staged or unstaged changes.

## What This Command Does

1. Reads the current `git diff --staged` (or `git diff` if nothing staged)
2. Analyzes the nature of the changes
3. Produces a Conventional Commits–formatted message with:
   - Correct type (`feat`, `fix`, `refactor`, `test`, etc.)
   - Appropriate scope (module or area of the codebase)
   - Clear imperative subject line
   - Optional body explaining *why*

## When to Use

- When you want a consistent, well-formatted commit message
- When you've made a non-trivial change and want help describing it
- To enforce Conventional Commits across the team

## Format Produced

```
<type>(<scope>): <subject>

[optional body explaining why, not what]

[optional footer: Fixes #123, Co-authored-by, etc.]
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `build`

## Example

**Staged changes**: Added Google OAuth callback handler, updated session creation, added state parameter validation.

**Generated commit**:
```
feat(auth): add Google OAuth2 login provider

Adds Google as an alternative to email/password login. The OAuth
callback validates the state parameter against the session to prevent
CSRF attacks, and creates a new user record on first login.

Closes #89
```

## Usage

```
/commit              → generate message from current diff
/commit --amend      → generate message for amending last commit
/commit --scope api  → force a specific scope
```

## Related Skills

- **git-workflow** — Activates automatically with Conventional Commits context
