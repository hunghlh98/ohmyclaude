---
name: release-cut
description: Finalize a release by reading [Unreleased] from CHANGELOG.md, inferring the SemVer bump, writing RELEASE-vX.Y.Z.md to .claude/pipeline/, and updating the changelog with the version header. Used by @devon-ops after CODE-REVIEW and DOC phases clear. Triggers on "cut a release", "release-cut", "finalize release", "bump version".
---

# Release Cut

Determine the next SemVer version, write the release file, and seal the changelog.

## Prerequisites

- `CHANGELOG.md` must exist with a non-empty `[Unreleased]` block
- All CODE-REVIEW verdicts must be APPROVE or APPROVE_WITH_NOTES
- No open DEADLOCK files in `.claude/pipeline/`

## Step 1: Infer SemVer Bump

Read the `[Unreleased]` section of `CHANGELOG.md` and apply:

| Condition | Bump |
|---|---|
| `### Removed` has entries OR breaking API change | **MAJOR** (x.0.0) |
| `### Added` has entries (new feature, no breaking change) | **MINOR** (0.x.0) |
| Only `### Fixed`, `### Security`, `### Changed` | **PATCH** (0.0.x) |
| `### Security` with a CRITICAL finding | **PATCH** minimum — escalate to MINOR if feature added |

Read `CHANGELOG.md` to find the last version tag (e.g., `## [1.2.3]`) to determine the starting point. If no version exists yet, start from `0.1.0`.

## Step 2: Write RELEASE-vX.Y.Z.md

Write to `.claude/pipeline/RELEASE-vX.Y.Z.md`:

```markdown
---
version: vX.Y.Z
bump: major | minor | patch
created: YYYY-MM-DD
released_by: devon-ops
prd_refs:
  - PRD-001
  - PRD-002
---

## Release Notes: vX.Y.Z

### What's New
[Human-readable summary of the Added entries]

### Changes
[Summary of Changed and Deprecated entries]

### Bug Fixes
[Summary of Fixed entries]

### Security
[Summary of Security entries — omit section if empty]

## Artifacts
- PRD: .claude/pipeline/PRD-XXX.md
- SDD: .claude/pipeline/SDD-XXX.md
- PLAN: .claude/pipeline/PLAN-XXX.md
- CODE-REVIEW: .claude/pipeline/CODE-REVIEW-XXX.md
- TEST: .claude/pipeline/TEST-XXX.md
```

## Step 3: Seal the Changelog

In `CHANGELOG.md`:

1. Add a fresh empty `[Unreleased]` block at the top (with all 6 section headers)
2. Rename the old `[Unreleased]` block to `## [X.Y.Z] - YYYY-MM-DD`
3. Add a comparison link at the bottom (optional)

```markdown
## [Unreleased]

### Added

...

## [1.3.0] - 2026-04-03

### Added
- User authentication via JWT (PRD-003)
```

## Gotchas

- **MAJOR bump resets minor and patch to 0** — `1.2.3` → `2.0.0` not `2.2.3`
- **Never bump based on commit count** — bump is based solely on the CHANGELOG content
- **Seal CHANGELOG before writing the RELEASE file** — so the release file references the correct version
- **Trigger @evan-evangelist after writing** — pass the RELEASE file path so she can draft the announcement
