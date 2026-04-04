---
name: sc-adviser
description: Expert advisory panel trigger for ohmyclaude strategy agents. Use when a Tier 1 agent needs specialist review before finalizing a PRD, SDD, UX-SPEC, PLAN, or REVIEW verdict. Delegates to sc:spec-panel (Wiegers, Fowler, Nygard — technical spec review) or sc:business-panel (Porter, Christensen, Drucker — business strategy). Triggers: "expert review before finalizing", "spec panel review", "business panel analysis", "adviser review", or when paige/artie/una/sam/scout are about to write a pipeline artifact on Route D/E.
origin: ohmyclaude
---

# SC Adviser

Use this skill when a Tier 1 strategy agent needs expert review before finalizing a pipeline artifact.

## Dispatch Table

| Agent | Adviser | Trigger condition |
|-------|---------|-------------------|
| `paige-product` | `sc:business-panel` | Route D/E, or Complexity=high in routing JSON |
| `artie-arch` | `sc:spec-panel` | Before writing any SDD section |
| `una-ux` | `sc:spec-panel` | Before writing UX-SPEC |
| `sam-sec` | `sc:spec-panel` | Before writing REVIEW verdict |
| `scout-sprint` | `sc:business-panel` | Route D, before writing PLAN |

Invoke the adviser, then read the synthesis. Load `references/adviser-invocation-map.md` for the exact flags and the section name to write in the artifact.

## Synthesis Rule

Adviser output is synthesis-only — **never copy verbatim into artifacts**. Synthesize findings into a dedicated advisory section. Address or explicitly override each CRITICAL/MAJOR issue. MEDIUM/MINOR findings are optional.

## Gotchas

- `sc:spec-panel` and `sc:business-panel` output analysis documents only — they do not implement. The calling agent is still responsible for writing the artifact.
- Do not invoke an adviser for Route A, B, or C — they are for low-complexity or emergency routes where the overhead of a review panel is not justified.
- If the adviser output contradicts the PRD requirements, note the contradiction in the advisory section and defer to the PRD — Paige owns the WHAT.

## References

- [Per-agent invocation flags and artifact section names](references/adviser-invocation-map.md)
