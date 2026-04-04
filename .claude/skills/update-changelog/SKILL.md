---
name: update-changelog
description: Append entries to CHANGELOG.md following Keep a Changelog / SemVer format. Used by @dora-docs after a feature is reviewed and approved. Always inserts under [Unreleased] — never creates a new version header (that is release-cut's job). Append-only: never removes or rewrites existing entries. Triggers on "update changelog", "add changelog entry", "document release notes".
---

# Update Changelog

Append structured entries to `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com) format.

## Rules

1. **Append only** — never remove or rewrite existing entries
2. **Insert under `[Unreleased]`** — never create a version header (that belongs to `release-cut` skill)
3. **One bullet per change** — be specific and human-readable
4. **Use the correct section** — see section guide below

## CHANGELOG.md Structure

If `CHANGELOG.md` does not exist, create it:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
```

## Inserting an Entry

1. Read `CHANGELOG.md`
2. Find the `## [Unreleased]` block
3. Find the correct section header within it (e.g., `### Added`)
4. Insert the new bullet immediately below the section header
5. Write the file back

**Entry format:**
```
- [Feature/change description] — linked to PRD-<id> if applicable
```

## Section Guide

| Section | Use when |
|---|---|
| **Added** | New feature, endpoint, or capability |
| **Changed** | Existing behavior changed (non-breaking) |
| **Deprecated** | Feature marked for future removal |
| **Removed** | Feature or API removed |
| **Fixed** | Bug fix |
| **Security** | Security fix or vulnerability patched |

## Example Entry

```markdown
## [Unreleased]

### Added
- User authentication via JWT — supports refresh token rotation (PRD-003)

### Fixed
- Payment webhook incorrectly rejected valid Stripe signatures on retry (PRD-007)
```

## Gotchas

- **Never create a version header** — `[1.2.0]` headers are written only by the `release-cut` skill
- **"Changed" ≠ "Fixed"** — behavioral changes go in Changed, bug fixes go in Fixed
- **Security entries get their own section** — even if it's also a bug fix
- **Use past tense, active voice** — "Added X" not "Adds X" and not "X was added"
- **Link to PRD when possible** — `(PRD-003)` at the end of the bullet helps traceability
