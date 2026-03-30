---
description: Decompose a complex task into a phased plan with agent assignments. Invokes Hermes.
---

# /plan

Invoke this command to decompose a complex engineering task into a structured, phased implementation plan with specialist agent assignments.

## What This Command Does

1. Passes your request to **Hermes** (orchestrator agent)
2. Hermes explores the codebase to understand the context
3. Hermes produces a phased plan with:
   - Clear phases ordered by dependency
   - Each phase assigned to the right specialist agent
   - Exact file paths and "done when" criteria
   - Risk flags for high-impact steps

## When to Use

- Before starting any task with 3+ steps
- When you need to coordinate multiple types of work (implementation + tests + docs + security review)
- When you want a plan before committing to implementation
- When a task touches multiple systems or teams

## How It Works

Your message after `/plan` is the task description. The more specific you are, the better the plan.

**Usage**:
```
/plan build a REST API for user authentication with JWT tokens
/plan refactor the payment service to use the new pricing model
/plan add real-time notifications using WebSockets
```

## Example

**User**: `/plan add Google OAuth login to the existing auth system`

**Hermes will produce**:
```markdown
# Plan: Google OAuth Login

## Goal
Add Google as an OAuth2 login provider alongside the existing email/password flow.

## Phases

### Phase 1: Architecture → @apollo
Analyze the existing auth system and propose the OAuth integration points.

### Phase 2: Implementation → @hephaestus
Implement the Google OAuth callback handler and session creation.

### Phase 3: Security Review → @argus
Review the OAuth implementation for token handling and state parameter validation.

### Phase 4: Tests → @momus
Write integration tests for the OAuth flow including error cases.

### Phase 5: Docs → @mnemosyne
Document the new login flow in the API reference.
```

## Related Agents

- **@hermes** — Directly invoke the planner
- **@apollo** — For architecture-only analysis without full planning
- **@hephaestus** — When you're ready to implement a specific phase
