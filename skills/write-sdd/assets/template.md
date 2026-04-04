---
id: SDD-XXX
prd_ref: PRD-XXX
ux_spec_ref: UX-SPEC-XXX
created: YYYY-MM-DD
status: draft
---

## System Overview
[1–2 sentence summary]

## C4 Architecture Diagrams

### Level 1 — System Context
```mermaid
C4Context
  title System Context — [System Name]
  Person(user, "User", "Description")
  System(system, "System Name", "Description")
  Rel(user, system, "Uses")
```

### Level 2 — Container
```mermaid
C4Container
  title Container Diagram — [System Name]
  Person(user, "User", "Description")
  Container_Boundary(app, "Application") {
    Container(service, "Service", "Technology", "Description")
  }
  Rel(user, service, "Uses")
```

## Architecture Decision Records (ADRs)

### ADR-001: [Decision Title]
- **Status:** Accepted
- **Context:** 
- **Decision:** 
- **Consequences:** 

## Data Model
[Omit if trivial — use database-schema-designer skill for detail]

## Interface Contracts
[API signatures, event schemas, or message formats]

## Constraints
- 

## Dependencies
| Dependency | Type | Owner | Risk |
|---|---|---|---|
| | | | |

## Open Questions
- [ ] 
