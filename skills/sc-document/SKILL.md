---
name: sc-document
description: Focused documentation generation for components, functions, APIs, and features. Used by @devon-ops at the DOC stage. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-document — Documentation Generation

Generate focused, accurate documentation for components, functions, APIs, and features.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Documentation requests for specific components, functions, or features
- API documentation and reference-material generation
- Code comment and inline-documentation requirements
- User guide and technical-documentation creation

## Usage

Invoked by `@devon-ops` at the DOC stage, after CODE-REVIEW is APPROVED and before release cut.

Parameters:
- `--type inline | external | api | guide` — documentation target
- `--style brief | detailed` — depth preference

## Behavioral Flow

1. **Analyze** — examine target component structure, interfaces, functionality.
2. **Identify** — determine documentation requirements and target audience.
3. **Generate** — create appropriate documentation based on type and style.
4. **Format** — apply consistent structure and organizational patterns.
5. **Integrate** — ensure compatibility with existing documentation ecosystem.

Key behaviors:

- **Read before writing** — always read what the doc describes first.
- **Accurate over complete** — wrong docs are worse than no docs.
- **Match audience** — write for the engineer at 2 a.m., not for your future self.
- **Cross-reference existing** — update, don't duplicate.

## Rules (ohmyclaude canonical)

From `@devon-ops`'s read-first workflow:
1. Read all CODE-REVIEW and UX-REVIEW artifacts for the issue.
2. Read every file the documentation will describe.
3. Grep for usage examples — real call sites beat invented examples.
4. Check existing tests — they show edge cases and contracts.
5. Check if documentation already exists (update, don't duplicate).

## Tool Coordination

- **Read** — component analysis and existing-docs review
- **Grep** — reference extraction and pattern identification
- **Write** — documentation file creation with proper formatting
- **Glob** — multi-file documentation projects and organization

## Output Types

### `--type inline`
JSDoc / docstrings / code comments at the function or class level.

**Inline comment rules**:
- **Write when**: non-obvious problem (explain *why*), known gotcha, business rule encoded in logic, workaround with an `eslint-disable`.
- **Do NOT write when**: code is self-explanatory, name already says it, you're narrating the next line.

### `--type external`
External reference docs — typically Markdown files for a library, component, or module.

### `--type api`
API reference — per endpoint or function:
- **What it does** — one sentence
- **Parameters** — name, type, required/optional, description
- **Returns** — type and what the value means
- **Throws** — when thrown and what it means
- **Example** — working code snippet
- **Status codes** (REST only) — 200, 201, 400, 403, 404 with conditions

### `--type guide`
User guide — feature-focused, implementation-oriented. Target: someone using the feature for the first time.

## README Structure (`@devon-ops` canonical)

```markdown
# Project Name
One sentence: what this does and who it's for.

## Quick Start
[Minimal working example — copy-pasteable]

## Installation
[Steps, requirements, prerequisites]

## Usage
[Common use cases with examples]

## API / Configuration
[Reference table: name | type | default | description]

## Development
[How to set up, run tests, contribute]
```

## DOC Artifact Output

`@devon-ops` writes `.claude/pipeline/DOC-<id>.md`:

```markdown
---
id: DOC-001
code-review: CODE-REVIEW-001
ux-review: UX-REVIEW-001
---

## API Documentation Changes
[New or modified endpoints with full request/response schema]

## README Updates
[Sections added, changed, or removed — paste final content]

## Inline Comments Added
[file:line references for non-obvious logic that now has a why-comment]

## Configuration Reference Updates
[New env vars, config options, or feature flags]
```

## Examples

### Inline code documentation
```
Trigger: @devon-ops loads sc-document for src/auth/login.js
Parameters: --type inline
Output: JSDoc for public functions; no comments on obvious code.
```

### API reference
```
Trigger: post-CODE-REVIEW docs for new endpoints
Parameters: --type api --style detailed
Output: endpoint-by-endpoint reference with examples and status codes.
```

### User guide
```
Trigger: new payment-module feature
Parameters: --type guide --style brief
Output: user-focused guide with common use cases.
```

### Component documentation
```
Trigger: new component library
Parameters: --type external
Output: component docs including props, usage examples, integration.
```

## Boundaries

### Will
- Generate focused documentation for specific components and features
- Create multiple formats based on target audience needs
- Integrate with existing documentation ecosystems and maintain consistency

### Will Not
- Generate documentation without proper code analysis and context
- Override existing documentation standards or project-specific conventions
- Create documentation that exposes sensitive implementation details
- Pad docs with obvious statements or make up behavior

**Next step**: after DOC-<id>.md, `@devon-ops` proceeds to release cut (via `release-cut` skill) and announcement.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: added `@devon-ops`'s read-first workflow and the canonical README structure and DOC-<id>.md artifact schema so the skill outputs match ohmyclaude's pipeline conventions.
