---
name: sc-troubleshoot
description: Systematic issue diagnosis and resolution for bugs, build failures, performance, and deployment. Used by @heracles. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-troubleshoot — Issue Diagnosis and Resolution

Diagnose and resolve issues through systematic root-cause analysis and hypothesis-driven debugging.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Code defects and runtime-error investigation
- Build-failure analysis and resolution
- Performance issue diagnosis and optimization
- Deployment problem analysis and system-behavior debugging

## Usage

Invoked by `@heracles` — the debugging agent. Called via `/forge debug <description>` or direct invocation.

Parameters:
- `--type bug | build | performance | deployment` — issue domain
- `--trace` — include stack-trace / debug-log analysis
- `--fix` — apply fix after diagnosis (default: diagnose-only)

## Behavioral Flow

1. **Analyze** — examine issue description and gather relevant system state.
2. **Investigate** — identify potential root causes through systematic pattern analysis.
3. **Debug** — execute structured debugging procedures (log + state examination, bisection, targeted reads).
4. **Propose** — validate solution approaches with impact and risk assessment.
5. **Resolve** — (with `--fix` flag only) apply fix and verify resolution.

Key behaviors:

- **Systematic root-cause analysis** — hypothesis testing with evidence collection.
- **Multi-domain** — code / build / performance / deployment issues.
- **Structured methodology** — not exploratory flailing.
- **Safe fix application** — verification and documentation.

## The Hypotheses-First Rule

**Before running any investigation command, state top 3 hypotheses ranked by likelihood.** This prevents the classic trap of "I'm just going to check everything."

Investigate hypothesis 1 first. Only move to 2 if 1 is definitively ruled out. Only move to 3 if 1 and 2 are ruled out.

## Root-Cause Pattern Library

| Pattern | Signature | Where to look |
|---|---|---|
| **Off-by-one** | Last element missing, first skipped | Loop bounds, slice indices |
| **Null / undefined** | `Cannot read property of null` | Optional chaining, missing guard |
| **Missing await** | Resolved promise printed, `undefined` value | Async calls without `await` |
| **Race condition** | Intermittent failure; passes in isolation | Shared mutable state, parallel writes |
| **Type mismatch** | Comparison always false, NaN in math | Implicit coercion, string vs number |
| **State mutation** | Correct initially, wrong on second call | Functions mutating their inputs |
| **Config / env** | Works locally, fails in CI or prod | Missing env var, wrong URL, wrong secret |
| **Import / module** | `not a function`, `undefined` import | Circular dep, wrong export, CJS/ESM mismatch |

## Bisection Strategy

When unsure which commit introduced a regression:

```bash
git log --oneline -20   # see recent commits

# Test at each midpoint
git checkout <midpoint-sha>
# run failing test
#   passes → bug introduced after this
#   fails  → bug introduced before this

# Narrow, then:
git diff <prev-sha>..<breaking-sha>
```

## Tool Coordination

- **Read** — log analysis and system-state examination
- **Bash** — diagnostic command execution; reproduction runs
- **Grep** — error-pattern detection and log analysis
- **Write** — diagnostic reports and resolution documentation
- **Edit** — (with `--fix` only) apply minimal verified fix

## Diagnose-First — `--fix` Required for Write

### Default (no `--fix`)
- Diagnose the issue
- Identify root cause at file:line
- Propose solution options ranked by risk
- **STOP and present findings** — do not apply fixes

### With `--fix`
- After diagnosis, prompt user for confirmation
- Apply fix only after explicit approval
- Verify fix with tests
- Run full suite to confirm no regressions

## Examples

### Bug investigation
```
Trigger: /forge debug NullPointerException in UserService after last deploy
Parameters: --type bug --trace

Process:
  Hypotheses (ranked):
    1. Input validation regression in commit <sha>
    2. Null result from repository call not handled
    3. Concurrent-access race exposing uninitialized state

Investigation: stack trace points to line 42 of UserService.java.
Root cause: optional.get() without isPresent check in findById.
Fix (with --fix): use orElseThrow(NotFoundException::new).
Verification: failing test now passes; full suite green.
```

### Build failure
```
Trigger: /forge debug TypeScript compilation errors --type build --fix
Process: read tsc output → identify missing type exports → fix
```

### Performance degradation
```
Trigger: /forge debug API response times degraded
Process: check metrics → bisect recent commits → identify N+1
         introduced in commit X → propose batch-fetch fix
```

### Deployment problem
```
Trigger: /forge debug service not starting in production --trace
Process: env verification → config validation → compare with prior
         working deployment → identify missing secret
```

## Debug Report Format

Heracles writes the report to `.claude/pipeline/DEBUG-<id>.md`:

```markdown
## Debug Report: <issue>

### Symptom
[Verbatim error message and stack trace]

### Reproduction
\`\`\`
[exact command]
\`\`\`

### Hypotheses (ranked)
1. [Most likely — why]
2. [Second — why]
3. [Third — why]

### Root Cause
[file:line] — [precise description]
[why this causes the observed symptom]

### Fix Applied
[What changed and why it addresses the root cause]

### Verification
- [x] Failing case now passes
- [x] Full suite passes
- [x] No new failures introduced
```

## Boundaries

### Will
- Execute systematic issue diagnosis with structured methodology
- Provide validated solution approaches with comprehensive problem analysis
- Apply safe fixes with verification and resolution documentation

### Will Not
- Apply risky fixes without proper analysis and user confirmation
- Modify production systems without explicit permission
- Make architectural changes (escalate to `@artie-arch` via ESCALATE-ARCH)
- Refactor surrounding code while debugging
- Apply a fix without stating a root cause first

## Escalation

After two failed fix attempts, escalate to `@artie-arch` with a written root-cause hypothesis — the bug may be architectural and the fix may belong elsewhere or require a different approach.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: added the root-cause pattern library and bisection strategy from `@heracles`'s prompt; aligned the diagnose-first contract with the `--fix` flag semantics so behavior is predictable.
