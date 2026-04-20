---
name: sc-design
description: System architecture, API, component, and database design with best-practice specifications. Used by @artie-arch (system design) and @una-ux (UX design). Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-design — System and Component Design

Create comprehensive design specifications for systems, APIs, components, and data models using industry best practices.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Architecture planning and system design requests
- API specification and interface design needs
- Component design and technical specification requirements
- Database schema and data model design requests

## Usage

Invoked by agents during the design phase:
- `@artie-arch` — system architecture and C4 design
- `@una-ux` — UX-SPEC interaction and component design
- `@beck-backend` / `@effie-frontend` — per-component design (CODE-DESIGN-BE / CODE-DESIGN-FE)

Parameters:
- `--type architecture | api | component | database` — design domain
- `--format diagram | spec | code` — output format

## Behavioral Flow

1. **Analyze** — examine target requirements and existing system context.
2. **Plan** — define design approach and structure based on type and format.
3. **Design** — create comprehensive specifications with industry best practices.
4. **Validate** — ensure design meets requirements and maintainability standards.
5. **Document** — generate clear design documentation with diagrams and specifications.

Key behaviors:

- **Requirements-driven** — design shape follows requirements shape.
- **Best-practice integration** — proven patterns over novel ones (matches `@artie-arch`'s "boring is good" principle).
- **Multi-format output** — diagrams, specifications, or code based on the consumer of the design.
- **Validation against constraints** — existing architecture, compliance, and performance targets.

## Key Patterns

- **Architecture design**: requirements → system structure → scalability planning.
- **API design**: interface specification → RESTful / GraphQL patterns → documentation.
- **Component design**: functional requirements → interface design → implementation guidance.
- **Database design**: data requirements → schema design → relationship modeling.

## Design Pattern Catalog (reference before inventing)

### Frontend
- Component composition over inheritance
- Container / Presenter split (data fetching vs rendering)
- Custom hooks for reusable stateful logic
- Context API for cross-cutting state (auth, theme, locale)
- Route-level code splitting; lazy-load heavy components

### Backend
- Repository pattern for data access
- Service layer for business logic (independent of framework)
- Middleware chain for cross-cutting concerns (auth, logging, validation)
- Event-driven for decoupling write paths from downstream consumers
- CQRS when read and write models diverge significantly

### Data
- Normalized schema for write-heavy, correctness-critical data
- Denormalized / materialized views for read-heavy paths
- Event sourcing when history and auditability matter
- Cache-aside for expensive, read-heavy, tolerate-stale data
- Optimistic locking for concurrent updates to shared records

## Tool Coordination

- **Read** — requirements analysis and existing system examination
- **Grep / Glob** — pattern analysis and system-structure investigation
- **Write** — design documentation and specification generation
- **Bash** — external design tool integration when needed

## Examples

### System architecture
```
Trigger: @artie-arch designs a user-management system
Parameters: --type architecture --format diagram
Output: C4 diagrams (C1 context, C2 container, C3 component) with
        scalability considerations and ADR "Alternatives Considered".
```

### API specification
```
Trigger: @artie-arch designs a payment API
Parameters: --type api --format spec
Output: detailed API specification with endpoints, request/response
        schemas, status codes, and error models. Follows REST
        principles. Appended to SDD as "API Contracts".
```

### Component interface
```
Trigger: @effie-frontend designs a notification-service component
Parameters: --type component --format code
Output: TypeScript interface definitions, prop schemas, state-machine
        shape. Goes into CODE-DESIGN-FE-<id>.md.
```

### Database schema
```
Trigger: @beck-backend designs an e-commerce data model
Parameters: --type database --format diagram
Output: ER diagram with entities, relationships, constraints;
        normalization level stated explicitly; index strategy
        for read-heavy tables.
```

## Boundaries

### Will
- Create comprehensive design specifications with industry best practices
- Generate multiple format outputs (diagrams, specs, code) based on requirements
- Validate designs against maintainability and scalability standards

### Will Not
- Generate actual implementation code — use `sc-implement` / `@beck-backend` / `@effie-frontend` for that
- Modify existing system architecture without explicit design approval
- Create designs that violate established architectural constraints

**Output**: architecture documents with system diagrams (component, sequence, data-flow), API specifications, database schemas, and interface definitions.

**Next step**: after design is approved, use `sc-implement` or delegate to builders to execute.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: added the Design Pattern Catalog from `@artie-arch`'s prompt so the skill carries concrete patterns, not only abstract guidance; aligned output artifacts with ohmyclaude's pipeline (SDD, CODE-DESIGN-BE/FE).
