---
name: git-workflow
description: Git best practices — branching strategy, PR workflows, rebasing, and merge strategies for releases. Used by @devon-ops for release branch management. For commit message hygiene, use the commit-work skill instead.
origin: ohmyclaude
---

# Git Workflow

Use this skill when the user mentions: commit, branch, PR, pull request, merge, rebase, stash, cherry-pick, or asks for help with git history.

## Commit Messages

Follow Conventional Commits format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `build`

**Rules**:
- Subject line: imperative mood, present tense, max 72 chars, no period
- Body: explain *why*, not *what* — the code shows what
- Reference issues: `Fixes #123`, `Closes #456`

**Examples**:
```
feat(auth): add OAuth2 login via Google

Adds Google OAuth2 as an alternative to email/password login.
Users who sign up via Google will have their avatar pre-populated.

Closes #89
```

```
fix(api): handle null user_id in payment endpoint

Previously threw 500 when user_id was null; now returns 400 with
a clear error message. Null can occur when the JWT payload is
malformed.
```

## Branching Strategy

| Branch | Purpose | Merges into |
|--------|---------|------------|
| `main` | Production-ready code | — |
| `develop` | Integration branch | `main` (via PR) |
| `feat/<name>` | New features | `develop` |
| `fix/<name>` | Bug fixes | `develop` or `main` (hotfix) |
| `chore/<name>` | Non-user-facing work | `develop` |

Keep feature branches short-lived (< 3 days). Long-lived branches cause painful merges.

## Pull Request Discipline

A good PR:
- Does one thing — single logical change
- Has a description explaining *why* (not just what changed)
- References the issue it closes
- Is reviewable in < 30 minutes
- Has passing tests before review is requested

## Rebasing vs Merging

**Rebase before PR**: Keep history linear.
```bash
git fetch origin
git rebase origin/main
```

**Merge for long-lived branches**: Use `--no-ff` to preserve branch history.

**Never rebase shared branches** — rewrites history that others have built on.

## Common Operations

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Squash last N commits
git rebase -i HEAD~N

# Stash with description
git stash push -m "WIP: auth refactor"

# Find when a bug was introduced
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
```

## Anti-Patterns

- Force-pushing to main/develop
- Committing directly to main
- Commit messages like "fix", "wip", "stuff"
- Stacking unrelated changes in one commit
- Committing generated files or build artifacts
