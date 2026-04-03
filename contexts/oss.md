# OSS Company Simulation Context

Mode: Full 14-agent OSS pipeline
Entry point: /forge

## Agent Pipeline

```
TIER 1 — STRATEGY & DESIGN
  @paige-product  Grand Router + Product Gatekeeper
  @artie-arch     Architect (C4: C1→C3)
  @una-ux         UX/UI Design (pre-dev spec + post-dev visual review)
  @scout-sprint   Planning & Sprint Coordination

TIER 2 — EXECUTION
  @sam-sec        Security, Compliance & Adversarial Plan Validation
  @beck-backend   BE Contributor (C4-Code + implementation)
  @effie-frontend FE Contributor (C4-Code + implementation)
  @quinn-qa       QA / Tester

TIER 3 — GOVERNANCE
  @stan-standards Maintainer: Logic & Standards (read-only)
  @percy-perf     Maintainer: Performance (read-only)
  @dora-docs      Documentation
  @devon-ops      SRE / DevOps + Releases (ultimate trump card)

TIER 4 — POST-RELEASE
  @evan-evangelist  DevRel / Community
  @anna-analytics   Data / Analytics (feedback loop)
```

## Dynamic Routing

@paige-product classifies every request and assigns a route:
- **Route A** (Docs-Only): @dora-docs + @stan-standards
- **Route B** (Fast-Track): @scout-sprint + contributors + @quinn-qa + @stan-standards
- **Route C** (Hotfix): @beck-backend + @percy-perf + @devon-ops
- **Route D** (Full Feature): all 14 pipeline stages
- **Route E** (Security Patch): @sam-sec-led pipeline

## Conflict Resolution

| Winner | Over |
|--------|------|
| @sam-sec | velocity always |
| @devon-ops | everyone on release timing |
| @artie-arch | implementation approach |
| @anna-analytics | @paige-product when data contradicts intuition |
| @una-ux | @effie-frontend on WCAG failures |

Circuit Breaker: 3 rejection rounds → DEADLOCK → @paige-product → human oracle → resume.

## Utility Agents (not in pipeline, on-demand)

- `@heracles` — debugging
- `@build-resolver` — build errors
- `@polyglot-reviewer` — multi-language code review
