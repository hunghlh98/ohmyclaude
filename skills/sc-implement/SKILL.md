---
name: sc-implement
description: Feature and code implementation with domain-appropriate best practices. Used by @beck-backend (IMPL-BE) and @effie-frontend (IMPL-FE). Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-implement — Feature Implementation

Systematic feature and code implementation following framework-specific best practices and the "read-first, match-convention" discipline.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Feature-development requests for components, APIs, or complete functionality
- Code implementation needs with framework-specific requirements
- Multi-domain development requiring coordinated expertise (BE + FE + security)
- Implementation projects requiring testing and validation integration

## Usage

Invoked by:
- `@beck-backend` — backend implementation (IMPL-BE)
- `@effie-frontend` — frontend implementation (IMPL-FE)

Parameters:
- `--type component | api | service | feature` — implementation scope
- `--framework react | vue | express | spring | …` — target framework
- `--safe` — conservative mode, extra validation
- `--with-tests` — generate tests alongside implementation (but `@quinn-qa` owns the canonical TEST stage)

## Behavioral Flow

1. **Analyze** — examine implementation requirements and detect technology context.
2. **Plan** — choose approach and identify the files, functions, and tests that will change.
3. **Generate** — create implementation with framework-specific best practices.
4. **Validate** — apply security and quality validation throughout development.
5. **Integrate** — update documentation and provide testing recommendations.

Key behaviors:

- **Read first, always** — do not touch code you haven't read.
- **Match convention** — style, naming, structure from surrounding code.
- **Minimal change, complete change** — smallest diff that achieves the goal; no stubs or TODOs.
- **No abstractions without triples** — three similar lines beat a premature utility.

## Per-Framework Guidance

Load framework-specific patterns from the relevant ohmyclaude skill at write time:

| Framework | Skill | Focus |
|---|---|---|
| Spring Boot | `springboot-patterns` | Layered architecture, JPA, validation |
| Spring Boot (security) | `springboot-security` | OAuth, JWT, CSRF, auth filters |
| Spring Boot (TDD) | `springboot-tdd` | JUnit 5, Mockito, Testcontainers |
| Java (general) | `java-coding-standards` | Java 17+ idioms |

For other languages / frameworks, rely on ohmyclaude's language rules (`rules/<language>/`) if present, plus the standard Read-first workflow.

## Standards (ohmyclaude canonical)

Applied during every implementation:

```
Functions:      < 50 lines
Files:          < 400 lines (hard limit 800)
Nesting:        ≤ 4 levels — use early returns
Naming:         match existing conventions exactly
Secrets:        never hardcoded — env vars only
Tests:          run after every change; update on behavior change
Bash:           60 s timeout, 2000-line output cap
```

Plus rules that appear in `@beck-backend` / `@effie-frontend`:
- No `console.log` in production paths
- No `var` — use `const` (prefer) or `let`
- No `any` in TypeScript — use `unknown` and narrow
- No docstrings/comments/type annotations unless surrounding code has them
- No error handling for impossible states

## Tool Coordination

- **Read** — required before any edit; full-file reads for touched files
- **Grep / Glob** — pattern detection for consistency + impact analysis
- **Write / Edit / MultiEdit** — code generation and modification
- **TaskCreate / TaskUpdate** — progress tracking for multi-file implementations

## Examples

### Backend service implementation
```
Trigger: @beck-backend loads sc-implement for rate-limit middleware
Parameters: --type api --framework spring --with-tests
Process:
  1. Read existing middleware patterns
  2. Read one test file for conventions
  3. Implement rate limiter with Redis backing
  4. Update existing tests, add new ones
  5. Run mvn test — all pass
Output: IMPL-BE-<id>.md citing files changed and test results
```

### Frontend component implementation
```
Trigger: @effie-frontend loads sc-implement for settings page
Parameters: --type component --framework react
Process:
  1. Read UX-SPEC-<id>.md fully
  2. Read existing component patterns
  3. Implement all 4 states: loading, empty, error, success
  4. Apply ARIA per UX-SPEC
  5. Run WCAG self-audit
Output: IMPL-FE-<id>.md citing states implemented and audit result
```

### API implementation
```
Trigger: @beck-backend loads sc-implement for user authentication API
Parameters: --type api --safe --with-tests
Process:
  1. Read SDD-<id>.md; read SECURITY-REVIEW if present
  2. Design API contract (RESTful)
  3. Implement with auth middleware, input validation
  4. Integration tests for happy + error paths
Output: IMPL-BE-<id>.md + test results
```

## Boundaries

### Will
- Implement features with framework-specific best practices
- Apply security and quality validation during implementation
- Provide implementation with testing integration (on request)

### Will Not
- Make architectural decisions — delegate to `@artie-arch`
- Implement features that conflict with security policies
- Override safety constraints or bypass quality gates

### COMPLETION CRITERIA

Implementation is **done** when:
- Feature code is written and compiles
- Basic functionality verified (local test or smoke check)
- Files saved and ready for the next stage

**Post-implementation checklist**:
1. Code compiles without errors
2. Basic functionality works
3. Ready for `@quinn-qa` (sc-test) review

**Next step**: after implementation, `@quinn-qa` runs `sc-test`; `@stan-standards` runs `sc-analyze`; `@devon-ops` handles docs and release.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: added the explicit code-standards table from `@beck-backend` and `@effie-frontend`; added per-framework skill routing for Spring Boot; generalized SC-specific MCP (Magic, Playwright, Context7) references to standard Claude Code tools.
