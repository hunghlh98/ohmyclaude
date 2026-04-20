---
name: sc-analyze
description: Multi-domain code analysis (quality, security, performance, architecture) with severity-ranked findings. Used by @stan-standards and @sam-sec. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-analyze — Code Analysis and Quality Assessment

Comprehensive code analysis across quality, security, performance, and architecture domains with severity-ranked findings and actionable recommendations.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Code-quality assessment for projects or specific components
- Security vulnerability scanning and compliance validation
- Performance bottleneck identification and optimization planning
- Architecture review and technical-debt assessment

## Usage

Invoked by:
- `@stan-standards` — multi-domain code review (logic, performance, language idioms)
- `@sam-sec` — security-focused analysis (`--focus security`) alongside the 7-scenario adversarial matrix

Parameters:
- `--focus quality | security | performance | architecture` — analysis domain
- `--depth quick | deep` — surface-level scan vs thorough investigation
- `--format text | json | report` — output format

## Behavioral Flow

1. **Discover** — categorize source files using language detection and project analysis.
2. **Scan** — apply domain-specific analysis techniques and pattern matching.
3. **Evaluate** — generate prioritized findings with severity ratings and impact assessment.
4. **Recommend** — create actionable recommendations with implementation guidance.
5. **Report** — present comprehensive analysis with metrics and improvement roadmap.

Key behaviors:

- **Multi-domain analysis** — combines static analysis with heuristic evaluation.
- **Intelligent file discovery** — language-specific pattern recognition.
- **Severity-based prioritization** — CRITICAL / HIGH / MEDIUM / LOW with investment signals.
- **Comprehensive reporting** — metrics, trends, and actionable insights.

## Severity + Investment Matrix (ohmyclaude canonical)

Every finding carries both severity and an effort signal — same convention as `@stan-standards` code reviews.

| Severity | Meaning | Default Investment |
|---|---|---|
| **CRITICAL** | Bug, crash, data loss, or outage risk | `[Medium]` or `[Large]` |
| **HIGH** | Likely issue; measurable regression | `[Quick]` or `[Short]` |
| **MEDIUM** | Should fix; tech debt with clear cost | `[Quick]` |
| **LOW** | Minor improvement | `[Quick]` |

Investment signals:
- `[Quick]` — 5–15 min, one-line fix
- `[Short]` — 30–90 min, contained refactor
- `[Medium]` — half-day, multiple files
- `[Large]` — multi-day, structural change

## Tool Coordination

- **Glob** — file discovery and project-structure analysis
- **Grep** — pattern analysis and code search
- **Read** — source-code inspection and configuration analysis
- **Bash** — external analysis tool execution (`mvn spotbugs:check`, `go vet`, `ruff check`, etc.)
- **Write** — report generation

## Per-Focus Scan Recipes

### `--focus security` (invoked by `@sam-sec`)

```bash
# Hardcoded secrets
grep -rn "password\s*[=:]\s*['\"][^'\"]" --include="*.ts" --include="*.py"
grep -rn "api_key\s*[=:]\s*['\"][^'\"]" --include="*.ts"

# SQL injection (string concat in queries)
grep -rn "query\s*[+]\|execute.*\`\|raw.*[+]"

# Command injection
grep -rn "exec(\|spawn(\|eval("

# innerHTML / dangerouslySetInnerHTML
grep -rn "innerHTML\s*=\|dangerouslySetInnerHTML"
```

### `--focus performance` (invoked by `@stan-standards`)

- N+1 queries — loop containing ORM/DB call
- Unbounded result sets — missing LIMIT / Pageable
- Missing timeouts on external HTTP calls
- Synchronous I/O in async paths
- O(n²) algorithms on potentially large inputs
- Memory-leak patterns — undisposed listeners, setInterval without clearInterval

### `--focus quality` (invoked by `@stan-standards`)

- Correctness: edge cases (null, empty, zero, max)
- Error paths handled — no swallowed exceptions
- Hard limits: functions ≤ 50 lines, files ≤ 400 lines, nesting ≤ 4 levels
- No `var` (use `const` / `let`), no `any` in TypeScript
- No `TODO` / `FIXME` / `console.log` in merged code

### `--focus architecture` (invoked by `@artie-arch` occasionally)

- Bounded-context violations
- Service-boundary coupling
- Dependency direction inversions
- Missing interface segregation

## Examples

### Comprehensive project analysis
```
Trigger: /forge review src/
Parameters: (default — multi-domain)
Output: severity-ranked report covering quality, security, performance,
        architecture. Each finding has file:line, severity, investment
        signal, and specific fix recommendation.
```

### Focused security assessment
```
Trigger: @sam-sec loads sc-analyze --focus security --depth deep
Output: vulnerability findings with remediation guidance, aligned with
        the 7-scenario adversarial matrix. CRITICAL findings go into
        REVIEW-<id>.md Blockers (max 3).
```

### Performance optimization
```
Trigger: /forge review --focus performance
Output: bottleneck identification with expected impact and specific
        fix recommendations (e.g., "batch findAllById replaces 100
        findById calls in loop at src/user.java:42 — Short, ~100ms
        per request saved").
```

### Quick quality check
```
Trigger: @stan-standards loads sc-analyze on src/components/
Parameters: --focus quality --depth quick
Output: code-smell identification and maintainability issues with
        investment signals.
```

## Boundaries

### Will
- Perform comprehensive static analysis across multiple domains
- Generate severity-rated findings with actionable recommendations
- Provide detailed reports with metrics and improvement guidance

### Will Not
- Execute dynamic analysis requiring code compilation or runtime
- Modify source code or apply fixes without explicit user consent
- Analyze external dependencies beyond import and usage patterns

**Output**: analysis report with severity-rated findings, code-quality metrics, security vulnerabilities, performance issues, and recommendations.

**Next step**: after review, use `sc-improve` to apply recommended fixes, or invoke `@beck-backend` / `@effie-frontend` for specific remediation.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: integrated the severity/investment matrix and per-focus scan recipes from `@stan-standards` and `@sam-sec` prompts so the skill carries concrete scanning patterns rather than abstract methodology.
