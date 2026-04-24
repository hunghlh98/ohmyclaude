---
name: profile-run
description: Inspect and calibrate /forge run telemetry. Reads PROFILE-*.md artifacts and baseline.json to surface cost anomalies, drift vs prior baseline windows, and suggest harness tuning. Triggers on "profile run", "run cost", "calibrate baseline", "cost drift".
origin: ohmyclaude
---

# profile-run

Use this skill to reason about the ohmyclaude pipeline's cost and efficiency, not to *run* a pipeline. The `cost-profiler.js` hook writes telemetry automatically; this skill interprets it.

## When to Activate

- User asks "what did the last /forge run cost?"
- User asks "which agent is most expensive?"
- User wants to audit cost drift against a prior baseline window
- Post-run review when paige's SUMMARY references an anomaly flag
- Quarterly baseline audit

## Data Sources

| Path | Purpose |
|------|---------|
| `.claude/pipeline/PROFILE-<runId>.md` | Per-run telemetry (frontmatter + per-agent table) |
| `.claude/metrics/baseline.json` | Rolling N=20 means + p95 per scenario and per agent |
| `.claude/metrics/runs/<runId>/snap-*.json` | Raw SubagentStop snapshots (for deep dives) |

## Inspection Modes

### Mode 1 — latest (default)

Read the most recent `PROFILE-*.md` in `.claude/pipeline/`. Report:

- Scenario + total cost + delta vs baseline
- Top 3 most expensive agents
- Any anomaly flags and their meaning
- One concrete tuning suggestion (smallest change, biggest lever)

### Mode 2 — compare <runA> <runB>

Diff two PROFILE artifacts. Useful for "did my prompt-tightening change reduce cost?"

### Mode 3 — `--calibrate`

Diff cost drift over time. Split all `PROFILE-*.md` artifacts into two windows — **recent** (last 30 days) and **prior** (30–90 days ago) — and compare per-scenario means:

```
Scenario       Prior     Recent    Drift
full-app       $1.40     $1.62     +16%   ← watch
feature        $0.68     $0.71     +4%    ← within tolerance
hotfix         $0.38     $0.29     -24%   ← improving
```

Write the diff to `.claude/metrics/calibration-<date>.md`. Surface any drift >25% as an action item — the pipeline has changed (agents added/removed, model swaps, artifact caps tightened). If the prior window has fewer than 3 runs per scenario, note the thin evidence and stop.

## Anomaly Flag Reference

| Flag | Cause | Action |
|------|-------|--------|
| `turn_explosion` | Agent hit ≥3 REVISE turns | Check upstream brief quality; may indicate ambiguous PRD |
| `cost_over_p95` | Agent exceeded rolling p95 | Inspect artifact word count + files read volume |
| `cache_miss_spike` | Cache hit rate <20% | System prompt / CLAUDE.md prefix drifted; fix prefix stability |
| `opus_budget_breach` | @artie-arch output >5K tokens | Tighten SDD contract with word-cap instruction |

## Tuning Recommendations Library

When surfacing advice, prefer these ranked by ROI:

1. **Skip @artie for non-architectural features** — 40% savings on feature runs; check if routing JSON marks arch as needed
2. **Scope builder agent reads via project-discovery output** — pass the discovery context block into each builder's brief so they read only the files the skill identified as relevant, instead of re-exploring. 20-30% input reduction for brownfield.
3. **Cap artifact word counts** — PRD <500w, SDD <1500w, REVIEW <800w
4. **Promote frequently-revising agent to Opus** *only if* counterfactual turn reduction outweighs 5x model multiplier (measure, don't assume)
5. **Keep @devon-ops on Haiku** — promoting is a trap; templated work does not benefit from larger models

## What You Do NOT Do

- Do not modify agent system prompts — routing and artifact caps live in `paige-product.md` and skill contracts
- Do not rewrite `baseline.json` outside calibrate mode
- Do not invent telemetry — if no PROFILE file exists, say so and stop
- Do not suggest tuning based on a single run — require ≥3 data points per agent

## Key Rules

- Interpret data; the hook produces it
- All recommendations are measurable (propose a hypothesis + how to verify)
- Drift >25% triggers a review of the prior window composition (were agents added/swapped mid-window?), not silent baseline overwrite
