---
name: write-sdd
description: Write and save the System Design Document (SDD-<id>.md) to .claude/pipeline/. Used by @artie-arch after completing C4 diagrams to formalize the architectural blueprint. Output must include frontmatter, embedded Mermaid C4 diagrams, ADRs, constraints, and dependencies. Triggers on "write SDD", "save architecture doc", "finalize system design".
origin: ohmyclaude
---

# Write SDD

Produce and save the System Design Document for the current pipeline request.

## Prerequisites

Before writing the SDD:
- The corresponding `PRD-<id>.md` must exist in `.claude/pipeline/`
- C4 diagrams must be ready (use the `c4-architecture` skill if not)
- UX-SPEC must exist if `Has_FE_Component=true`

## Output

Write to `.claude/pipeline/SDD-<id>.md` using the template at `assets/template.md`.

Use the same `<id>` as the PRD (e.g., PRD-001 → SDD-001). Increment if an SDD already exists for that ID.

## SDD Schema

```markdown
---
id: SDD-001
prd_ref: PRD-001
ux_spec_ref: UX-SPEC-001   # omit if Has_FE_Component=false
created: YYYY-MM-DD
status: draft | approved
---

## System Overview
[1–2 sentence summary of what is being built and why]

## C4 Architecture Diagrams

### Level 1 — System Context
[Mermaid C4Context diagram]

### Level 2 — Container
[Mermaid C4Container diagram]

### Level 3 — Component (only if adds value)
[Mermaid C4Component diagram — omit if not needed]

## Architecture Decision Records (ADRs)

### ADR-001: [Decision Title]
- **Status:** Accepted | Superseded | Deprecated
- **Context:** [Why this decision was needed]
- **Decision:** [What was decided]
- **Consequences:** [Trade-offs and implications]

## Data Model
[Schema overview — use database-schema-designer skill for detail]

## Interface Contracts
[API signatures, event schemas, or message formats]

## Constraints
- [Technical constraint from PRD, infra, or external systems]

## Dependencies
| Dependency | Type | Owner | Risk |
|---|---|---|---|
| [Name] | internal / external | [Team/Agent] | low / medium / high |

## Open Questions
- [ ] [Question that must be resolved before implementation]
```

## Gotchas

- **Never copy the PRD problem statement verbatim** — the SDD describes HOW, the PRD describes WHAT
- **Max 20 elements per C4 diagram** — split into multiple diagrams if the system is large
- **ADRs are append-only** — never delete an ADR, mark it Superseded instead
- **Data Model section is optional** — only include if the schema is non-trivial; use `database-schema-designer` skill for full schema detail
- **Open Questions block the pipeline** — if any exist, ping @artie-arch before handing off to @scout-sprint
