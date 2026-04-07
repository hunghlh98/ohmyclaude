---
name: post-deploy-analytics
description: Post-deploy telemetry analysis — compare deployed version against baseline, detect regressions, recommend maintain/investigate/rollback. Invoked by @devon-ops after release.
origin: ohmyclaude
---

# Post-Deploy Analytics

Analyze post-deploy metrics to detect regressions and provide actionable recommendations. Replaces the former analytics agent (now a skill invoked by @devon-ops).

## When to Activate

- After `/forge release` completes and deployment is confirmed
- When @devon-ops invokes post-deploy analysis
- When investigating production regressions

## Analysis Process

### 1. Collect Metrics

If monitoring tools are available (Datadog, Grafana, CloudWatch):
```
- Error rate (5xx responses) — compare to 7-day baseline
- Latency (p50, p95, p99) — compare to pre-release baseline
- Throughput (req/sec) — check for unexpected drops
- Memory / CPU usage — check for resource regression
- Key business metrics (signups, transactions, etc.)
```

If no monitoring: check application logs for error rate changes.

### 2. Compare Against Baseline

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | >2% increase | Investigate |
| Error rate | >5% increase | Recommend rollback |
| p95 latency | >20% increase | Investigate |
| p95 latency | >50% increase | Recommend rollback |
| Throughput | >10% drop | Investigate |
| Memory | >30% increase | Investigate |

### 3. Generate Recommendation

```markdown
## Post-Deploy Analysis: v{X.Y.Z}

**Deployed**: {timestamp}
**Baseline**: 7-day average before deploy
**Status**: MAINTAIN | INVESTIGATE | ROLLBACK

### Metrics Summary
| Metric | Baseline | Current | Delta |
|--------|----------|---------|-------|
| Error rate | 0.3% | 0.4% | +0.1% |
| p95 latency | 120ms | 135ms | +12.5% |

### Recommendation
{MAINTAIN/INVESTIGATE/ROLLBACK with specific reasoning}

### Action Items
- [ ] {Specific action if INVESTIGATE or ROLLBACK}
```

### 4. Create Regression Issues

If regression detected (INVESTIGATE or ROLLBACK):
- Create `ISS-NNN.md` in `.claude/backlog/issues/` describing the regression
- Reference the release version and affected metrics
- Set priority based on severity (>5% error rate = P0, >2% = P1)

## Key Rules

- Data beats intuition — if metrics say there's a regression, there is one
- Never recommend ROLLBACK for < 2% error rate increase unless business-critical
- Always specify which metrics triggered the recommendation
- Post-deploy analysis is optional — only run when telemetry is available
