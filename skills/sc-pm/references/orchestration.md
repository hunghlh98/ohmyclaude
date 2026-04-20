# sc-pm — Full Orchestration Patterns

Detailed sub-agent delegation patterns. Cited by `SKILL.md`.

Inlined from SuperClaude_Plugin v4.3.0 (MIT).

---

## Vague Feature Request — Discovery-First Workflow

```
User: "I want to add authentication to the app"

Lead: Activate brainstorming mode
      → Socratic questioning to discover requirements

      Delegate to @paige-product (with sc-brainstorm)
      → Create formal PRD with acceptance criteria

      Delegate to @artie-arch
      → Architecture design (JWT / OAuth / Supabase Auth evaluation)

      Delegate to @sam-sec
      → Threat modeling, security patterns

      Delegate to @beck-backend
      → Implement authentication middleware

      Delegate to @quinn-qa
      → Security testing, integration tests

      Delegate to @devon-ops
      → Documentation, release notes

Output: complete authentication system with docs
```

## Clear Implementation — Targeted Fix

```
User: "Fix the login form validation bug in LoginForm.tsx:45"

Lead: No brainstorming needed (scope is clear)
      Read LoginForm.tsx to identify root cause

      Delegate to @heracles (if root cause unclear)
      → Trace, form hypotheses, confirm root cause

      Delegate to @beck-backend or @effie-frontend
      → Apply minimal fix (no refactoring beyond the root cause)

      Delegate to @quinn-qa
      → Verify fix, run regression tests

      Delegate to @stan-standards
      → Review for logic/performance/idiom issues

Output: bug fixed, tests pass, review approved
```

## Multi-Domain Complex Project — Wave Scheduling

```
User: "Build a real-time chat feature with video calling"

Wave 0 — Planning
  @paige-product
    → User stories, acceptance criteria
    → Decompose into waves with dependencies

  @artie-arch
    → Architecture (Supabase Realtime, WebRTC)
    → Produce SDD with C1-C3 diagrams
    → sc-spec-panel review before finalizing

Wave 1 — Backend foundation (parallel)
  @beck-backend: Realtime subscriptions
  @beck-backend: WebRTC signaling (concurrent task)
  @sam-sec: Security review on both

Wave 2 — Frontend (parallel)
  @effie-frontend: Chat UI components
  @effie-frontend: Video calling UI (concurrent task)
  @una-ux: UX-SPEC + WCAG review on both

Wave 3 — Integration (sequential)
  Integration: chat + video
  End-to-end smoke testing

Wave 4 — Quality (parallel)
  @quinn-qa: testing
  @stan-standards: code review
  @sam-sec: security audit

Wave 5 — Ship
  @devon-ops
    → User guide
    → Release cut
    → Announcement

Output: production-ready real-time chat with video
```

## Wave Orchestration Rules

1. **Independence within a wave** — tasks in the same wave must not depend on each other.
2. **Explicit handoff between waves** — later waves reference earlier artifacts by ID.
3. **Critical-path awareness** — identify the longest dependency chain; that sets the timeline.
4. **Gate artifacts halt the wave** — if `TEST-<id>.md` is `FAIL`, downstream waves wait.
5. **Circuit-breaker at 3 strikes** — if a review round hits 3, write a `DEADLOCK-<id>.md` and escalate to human oracle.

## Strategy Selection

| Strategy | When to use |
|---|---|
| `brainstorm` | Requirements are vague; scope is undefined; user says "maybe" or "I want to explore" |
| `direct` | Scope is clear; single agent can handle; no cross-domain dependencies |
| `multi-agent` | Cross-domain but shallow; 3–4 agents in one or two waves |
| `wave` | Deep cross-domain; 5+ agents; clear dependency chain |

## Common Delegation Mistakes

- **Over-delegation** — spawning an agent for trivial work. If one file needs one-line edit, don't create a team.
- **Under-delegation** — keeping cross-domain work on the lead's lap. If the task touches security and performance, delegate explicitly.
- **Skipping gates** — merging `IMPL` without a `TEST` and `CODE-REVIEW`. Never cut a release while a gate artifact is blocking.
- **Ignoring `ESCALATE-ARCH`** — builders' escalation signals mean the SDD is wrong; update it, don't override.
