---
name: sc-test
description: Test execution with coverage analysis and quality reporting. Used by @quinn-qa at the TEST stage. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-test — Testing and Quality Assurance

Execute unit / integration / e2e tests with coverage analysis, watch-mode support, and automated quality reporting.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Test execution for unit, integration, or e2e tests
- Coverage analysis and quality-gate validation
- Continuous testing and watch-mode scenarios
- Test-failure analysis and debugging

## Usage

Invoked by `@quinn-qa` at the TEST stage — after `IMPL-BE-<id>.md` and/or `IMPL-FE-<id>.md` exist.

Parameters:
- `--type unit | integration | e2e | all` — test scope (default: all)
- `--coverage` — generate coverage report
- `--watch` — continuous mode (dev use only)
- `--fix` — auto-apply simple failure fixes (use sparingly)

## Behavioral Flow

1. **Discover** — categorize tests using runner patterns and conventions.
2. **Configure** — set up test environment and execution parameters.
3. **Execute** — run tests with real-time progress tracking.
4. **Analyze** — coverage reports and failure diagnostics.
5. **Report** — actionable recommendations and quality metrics.

Key behaviors:

- **Framework auto-detection** — `package.json` scripts, `pytest.ini`, `go.mod`, `pom.xml`.
- **Coverage with meaning** — 90% on happy-path-only is worse than 70% that hits error paths and boundaries.
- **Determinism check** — run flaky-suspected tests 3× before accepting PASS.

## Coverage Standards (ohmyclaude canonical)

| Layer | Target | Priority |
|---|---|---|
| Business logic | 90%+ | All edge cases, all error paths |
| Service / utilities | 80%+ | Happy path + key error cases |
| UI components | 70%+ | Render, interaction, error state |
| Integration | All critical paths | Auth, payment, data-write flows |
| E2E | Primary user journeys | Login, create, read, error recovery |

## Tool Coordination

- **Bash** — test-runner execution (`npm test`, `pytest`, `go test`, `mvn test`)
- **Glob** — test discovery and pattern matching
- **Grep** — result parsing and failure analysis
- **Write** — coverage reports and TEST-<id>.md artifact

## Per-Framework Runners

| Framework | Test command |
|---|---|
| Node (Jest) | `npm test -- --coverage` |
| Node (Vitest) | `npx vitest run --coverage` |
| Python | `pytest --cov=src --cov-report=term-missing` |
| Go | `go test ./... -cover` |
| Java/Spring | `mvn test` then `mvn jacoco:report` |
| Rust | `cargo test` + `cargo tarpaulin` (if available) |

## Examples

### Basic test run
```
Trigger: @quinn-qa at TEST stage
Parameters: (defaults)
Output: TEST-<id>.md with verdict: PASS | FAIL, total counts, coverage %,
        and any adversarial-input findings.
```

### Targeted coverage analysis
```
Trigger: @quinn-qa checks src/components unit-test coverage
Parameters: --type unit --coverage
Output: coverage report with file-level breakdown and uncovered-line
        list for follow-up.
```

### E2E browser testing
```
Trigger: @quinn-qa validates a user journey
Parameters: --type e2e
Output: per-browser results, visual-regression diffs if applicable,
        performance metrics.
```

### Watch mode (dev only)
```
Trigger: developer running --watch
Parameters: --watch
Output: continuous test execution on file changes. Not used in CI or
        /forge pipeline runs.
```

## Failure Analysis

For each failing test, TEST-<id>.md records:
- Test name and file:line
- Expected vs actual
- First line of error or stack trace
- Suspected root cause (if obvious from output)

If the failure needs deeper investigation, escalate to `@heracles` with `sc-troubleshoot`.

## Adversarial / Fuzz Input

`@quinn-qa` supplements standard tests with adversarial input per the fuzz data matrix in `generate-fuzz-data` skill (email, currency, date, string, id, file — see that skill's reference).

## Boundaries

### Will
- Execute existing test suites using project's configured runner
- Generate coverage reports and quality metrics
- Provide intelligent test-failure analysis with actionable recommendations

### Will Not
- **Generate test cases** or modify test framework configuration (that's `@quinn-qa`'s core authoring role, supported by `qa-test-planner` skill)
- Execute tests requiring external services without proper setup
- Make destructive changes to test files without explicit permission

**Verdict**: `PASS` if all tests green, coverage targets met, no unhandled adversarial inputs. `FAIL` otherwise — blocks release.

**Next step**: if PASS, advance to `@stan-standards` code review. If FAIL, assign fixes to builder and re-run (up to 3 rounds; round 4 trips the circuit breaker).

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: added the coverage-standards table and per-framework test commands from `@quinn-qa`'s prompt; aligned with the ohmyclaude circuit-breaker protocol on round-3 FAIL verdicts.
