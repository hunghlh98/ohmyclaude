---
name: sc-brainstorm
description: Interactive requirements discovery through Socratic dialogue and systematic exploration. Used by @paige-product on LOW confidence to shape clarifying questions. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-brainstorm — Interactive Requirements Discovery

Transform ambiguous project ideas into concrete specifications through systematic Socratic dialogue.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Ambiguous project ideas requiring structured exploration
- Requirements discovery and specification development needs
- Concept validation and feasibility assessment requests
- Cross-session brainstorming and iterative refinement scenarios

## Usage

Invoked by agents (primarily `@paige-product`) when request confidence is **LOW** and 2–3 clarifying questions would change the plan materially.

Parameters (optional):
- `--strategy systematic | agile | enterprise` — exploration style
- `--depth shallow | normal | deep` — how many layers of Socratic questioning
- `--parallel` — explore multiple dimensions concurrently

## Behavioral Flow

1. **Explore** — Transform ambiguous ideas through Socratic dialogue. Ask *why*, *what if*, and *who*.
2. **Analyze** — Consider the request from multiple angles (architecture, user, operator, security).
3. **Validate** — Apply feasibility assessment. Flag impossible or contradictory asks.
4. **Specify** — Generate concrete, testable specifications.
5. **Handoff** — Produce an actionable brief ready for `@paige-product` to decompose.

## Key Behaviors

- **Multi-angle questioning** — no single perspective dominates.
- **Progressive dialogue** — later questions build on earlier answers.
- **Systematic but not rigid** — skip questions whose answer would not change the plan.
- **Cross-session awareness** — if prior context exists (session history, PRDs), reuse it before re-asking.

## Key Patterns

- **Socratic Dialogue** — question-driven exploration, not statement-driven assertion.
- **Multi-Domain Analysis** — cross-functional perspective coverage.
- **Progressive Coordination** — iterate; refine; validate.
- **Specification Generation** — convert exploration into implementation-ready briefs.

## Tool Coordination

- **Read / Write / Edit** — capture emerging requirements as they surface
- **AskUserQuestion** — structured delivery of the 2–3 questions to the human
- **Grep / Glob** — check whether the ambiguity is already resolved in existing docs/code before asking

## Examples

### Systematic discovery
```
Trigger: "/forge build a notification system"
Effort:  deep — 3 layers of questions
Output:  PRD with clarified channels (email? SMS? push?),
         delivery guarantees, and rate-limiting posture.
```

### Agile exploration
```
Trigger: "/forge add real-time collaboration to the editor"
Effort:  normal — 1–2 questions
Output:  PRD with scoped collaboration model (presence only?
         concurrent edits with CRDT? full OT?) and integration seam.
```

### Cross-session refinement
```
Trigger: "/forge continue the monetization plan from yesterday"
Effort:  shallow — check existing artifacts first
Output:  PRD that extends previous exploration rather than restarting.
```

## Boundaries

### Will
- Transform ambiguous ideas into concrete specifications through systematic exploration.
- Coordinate multi-angle analysis (architecture / user / ops / security).
- Surface open questions explicitly.

### Will Not
- Make implementation decisions before requirements are discovered.
- Override user vision with prescriptive solutions during exploration.
- Bypass systematic exploration for complex multi-domain projects.

### CRITICAL BOUNDARY — Stop After Requirements Discovery

This skill produces a **REQUIREMENTS SPECIFICATION ONLY**.

It will not:
- Create architecture diagrams or system designs (that is `@artie-arch` with `sc-spec-panel` / inline principles).
- Generate implementation code (that is `@beck-backend` / `@effie-frontend`).
- Make architectural decisions.
- Design database schemas or API contracts.

**Output**: requirements clarification with user goals, functional requirements, non-functional requirements, user stories / acceptance criteria, and any remaining open questions.

**Next step**: `@paige-product` uses the output to shape the PRD and route to the correct agents.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations for agent-invocation context (removed MCP-server-specific sections that assume SC's environment; reframed trigger patterns for `/forge` pipeline).
