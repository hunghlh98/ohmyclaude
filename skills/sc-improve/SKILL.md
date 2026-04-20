---
name: sc-improve
description: Systematic code improvements for quality, performance, maintainability, and security. Used by @stan-standards post-review. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-improve — Code Improvement

Apply systematic improvements with domain expertise and safe refactoring patterns.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Code-quality enhancement and refactoring requests
- Performance optimization and bottleneck resolution
- Maintainability improvements and technical-debt reduction
- Best-practices application and coding-standards enforcement

## Usage

Invoked by:
- `@stan-standards` — after issuing CODE-REVIEW findings, may suggest `sc-improve` to apply MEDIUM / LOW severity fixes
- Builder agents — during refactor tasks where `@stan-standards` approved the change

Parameters:
- `--type quality | performance | maintainability | style` — improvement dimension
- `--safe` — conservative mode (defaults to read-only analysis + proposals)
- `--interactive` — prompt per change

## Behavioral Flow

1. **Analyze** — examine codebase for improvement opportunities and quality issues.
2. **Plan** — choose improvement approach and identify affected files.
3. **Execute** — apply systematic improvements with domain-specific best practices.
4. **Validate** — ensure improvements preserve functionality and meet quality standards.
5. **Document** — generate improvement summary and recommendations for future work.

Key behaviors:

- **Safe refactoring** — comprehensive validation and rollback capability.
- **Domain-specific** — quality / performance / maintainability / security each have distinct playbooks.
- **Preserve functionality** — refactors must be behavior-preserving unless explicitly scoped otherwise.

## Auto-Fix vs Approval-Required

### Auto-fix (applies automatically in non-safe mode)
- Style fixes (formatting, naming conventions)
- Unused variable / import removal
- Import organization
- Simple type annotations

### Approval-required (prompts user first)
- Architectural changes
- Logic refactoring
- Function signature changes
- Removing code used by public APIs
- Changes affecting multiple files

### Explicitly will not (without `--force` flag)
- Make architectural decisions (delegate to `@artie-arch`)
- Refactor code structure without confirmation
- Remove functionality

## Tool Coordination

- **Read / Grep / Glob** — code analysis and opportunity identification
- **Edit / MultiEdit** — safe code modification and refactoring
- **TaskCreate / TaskUpdate** — progress tracking for multi-file operations

## Improvement Playbooks

### `--type quality`
- Technical-debt identification → targeted refactor
- Complexity reduction — extract functions, flatten nesting
- Remove dead code, TODOs, console.logs

### `--type performance`
- Profile → identify bottlenecks → targeted optimization
- Replace N+1 with batch queries
- Add caching where stale-tolerant
- Lazy-load heavy resources

### `--type maintainability`
- Rename for intent
- Extract helper functions
- Add meaningful tests where missing
- Improve type coverage

### `--type style`
- Apply project linter / formatter
- Normalize naming conventions
- Remove unused imports

## Examples

### Code quality enhancement
```
Trigger: @stan-standards after CODE-REVIEW finds MEDIUM issues
Parameters: --type quality --safe
Process: systematic quality analysis → safe refactoring proposals →
         apply after confirmation
Output: improvement summary with before/after metrics
```

### Performance optimization
```
Trigger: @stan-standards flagged N+1 queries at src/user.java:42
Parameters: --type performance --interactive
Process: bottleneck analysis → optimization options → per-change confirm
Output: performance improvements with measured impact
```

### Maintainability improvement
```
Trigger: legacy-module refactor task
Parameters: --type maintainability --preview
Process: structure analysis → maintainability proposals → preview mode
         shows changes before application
Output: proposals with rationale; human approves per change
```

## Boundaries

### Will
- Apply systematic improvements with domain-specific expertise
- Provide comprehensive analysis with multi-dimensional coverage
- Execute safe refactoring with rollback and functionality preservation

### Will Not
- Apply risky improvements without proper analysis and user confirmation
- Make architectural changes without understanding full system impact
- Override established coding standards or project conventions

**Next step**: after improvement, `@quinn-qa` re-runs `sc-test` to verify functionality preservation. `@stan-standards` may issue a follow-up review.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: integrated the auto-fix vs approval-required split explicitly so behavior is predictable; generalized SC-specific persona coordination to ohmyclaude agent names.
