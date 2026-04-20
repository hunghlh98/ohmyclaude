---
name: sc-estimate
description: Development estimation — time, effort, complexity with confidence intervals and risk assessment. Used by @paige-product for per-task SP sizing. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-estimate — Development Estimation

Systematic estimation of time, effort, and complexity with confidence intervals and risk factors.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Development planning requiring time / effort / complexity estimates
- Project scoping and resource allocation decisions
- Feature breakdown needing systematic estimation methodology
- Risk assessment and confidence-interval analysis

## Usage

Invoked by `@paige-product` during Step 5 (decompose into tasks) — each task gets an estimate so the lead can schedule waves correctly.

Parameters (optional):
- `--type time | effort | complexity` — which dimension to estimate
- `--unit hours | days | weeks` — granularity for time estimates
- `--breakdown` — produce a per-component decomposition

## Behavioral Flow

1. **Analyze** — examine scope, complexity factors, dependencies, and framework patterns.
2. **Calculate** — apply estimation methodology with historical benchmarks and complexity scoring.
3. **Validate** — cross-reference estimates with project patterns and domain expertise.
4. **Present** — detailed breakdown with confidence intervals and risk assessment.
5. **Track** — document estimation accuracy for methodology improvement (feeds `learning/patterns/`).

## Key Patterns

- **Scope analysis** — project requirements → complexity factors → framework patterns → risk assessment.
- **Estimation methodology** — time-based → effort-based → complexity-based → cost-based approaches.
- **Multi-domain assessment** — architecture complexity × performance requirements × project timeline.
- **Validation framework** — historical benchmarks → cross-validation → confidence intervals → accuracy tracking.

## Decision Matrix (ohmyclaude canonical, via task-breakdown skill)

For each task, score three axes:

| Axis | Low (1 pt) | Medium (2 pts) | High (3 pts) |
|---|---|---|---|
| **Uncertainty** | Well-known territory | Some unknowns | Research required |
| **Complexity** | Single file, one concept | Few files, one subsystem | Multi-file, cross-subsystem |
| **Effort** | < 1 hour | Half-day | Multi-day |

**Story points = sum of axes:**
- 3 pts → SP 1 (trivial)
- 4–5 pts → SP 2–3 (small)
- 6–7 pts → SP 5–8 (medium)
- 8–9 pts → SP 13+ (**trigger break** — decompose further before proceeding)

Tasks scoring "trigger break" must be split. Large tasks are where estimates fail hardest.

## Tool Coordination

- **Read / Grep / Glob** — codebase analysis for complexity assessment and scope evaluation
- **TaskCreate / TaskUpdate** — estimation breakdown and progress tracking
- **Bash** — project analysis and dependency evaluation

## Examples

### Feature development estimation (breakdown)
```
Trigger: @paige-product estimates "user authentication system"
Parameters: --type time --unit days --breakdown

Output:
  - Database design: 2 days
  - Backend API: 3 days
  - Frontend UI: 2 days
  - Testing: 1 day
  Total: 8 days (confidence interval: 85%)
```

### Project complexity assessment
```
Trigger: planning a monolith → microservices migration
Parameters: --type complexity --breakdown

Output:
  - Architecture complexity: HIGH
  - Risk factors: backward compatibility, data migration, operational
  - Dependency mapping included
  - Recommendation: decompose into 5+ multi-week phases
```

### Performance optimization effort
```
Trigger: "optimize application performance"
Parameters: --type effort --unit hours

Output:
  - Profile + identify bottlenecks: 4 hours
  - Implement optimizations: 8 hours per optimization target
  - Regression testing: 3 hours
  - Expected impact: documented per optimization
```

## Boundaries

### Will
- Provide systematic development estimates with confidence intervals
- Apply multi-dimensional analysis for comprehensive complexity assessment
- Generate detailed breakdown with historical benchmark comparisons

### Will Not
- Guarantee estimate accuracy without proper scope analysis and validation
- Provide estimates without appropriate domain expertise assessment
- Override historical benchmarks without clear justification

### CRITICAL BOUNDARY — Stop After Estimation

This skill produces an **estimation report only** — not an execution plan.

It will not:
- Execute work based on estimates
- Create implementation timelines for execution
- Start implementation tasks
- Commit on behalf of the user

**Output**: estimation report with time/effort breakdown, complexity analysis, confidence intervals, risk assessment, and resource requirements.

**Next step**: user or team lead decides on timeline and scheduling; `@paige-product` uses the output to build the PRD's Phases section.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: aligned with the Decision Matrix used by the `task-breakdown` skill; integrated the "trigger break" rule for oversized tasks; generalized SC-specific MCP server references.
