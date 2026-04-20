---
id: PLAN-001
type: enhancement
priority: P1
scope: self-improvement (target repo is ohmyclaude itself)
route: docs-heavy, then SuperClaude integration, then observability, then correctness
from_version: 1.0.0
target_version: 1.4.0
created: 2026-04-20
updated: 2026-04-20
status: Phase 2 complete (2026-04-20) — ready for Phase 3 (SuperClaude integration)
author: spec-panel (Wiegers, Adzic, Cockburn, Fowler, Nygard, Newman, Crispin, Hightower)
---

## Problem Statement

ohmyclaude v1.0.0 shipped a sound mechanism (Agent Teams, single `/forge`, domain-dictator hierarchy) but with documentation, observability, and cost-transparency gaps large enough to block confident OSS adoption. A multi-expert spec panel review identified 13 missing or weak documents, 4 quality-spec gaps, and a per-run cost envelope users cannot see today. Rev 2 of this plan additionally integrates SuperClaude's verb-skill layer so agents inherit SC's research/brainstorm/implement/test/pm patterns without duplicating them.

## Guiding Constraints

1. Markdown-only repo — no code to break, doc accuracy drives everything.
2. Zero-setup promise must hold — no new required config, no new install steps. SuperClaude references are **optional**; absence falls back to inline agent behavior.
3. Every addition respects the repo's own token budgets (skills ≤400 lines, agent descriptions ≤30 words).
4. Ship patch-sized releases — one phase = one version bump = one PR. No mega-PRs.
5. Every new surface must be removable by deleting a single file or commenting a single line in `hooks.json`.
6. **Compose, don't duplicate**: where SuperClaude already provides a verb (implement, test, analyze, research, brainstorm, document, troubleshoot), ohmyclaude agents invoke it instead of re-authoring the behavior.

## SuperClaude Integration Strategy

SuperClaude exposes a dispatcher (`/sc:sc-sc`) over a library of verb-skills:
`sc:sc-research`, `sc:sc-brainstorm`, `sc:sc-implement`, `sc:sc-test`, `sc:sc-pm`, `sc:sc-analyze`, `sc:sc-design`, `sc:sc-document`, `sc:sc-troubleshoot`, `sc:sc-estimate`, `sc:sc-improve`, `sc:sc-build`, `sc:sc-spec-panel`, `sc:sc-reflect`, `sc:sc-workflow`, `sc:sc-task`, `sc:sc-load`, `sc:sc-save`.

ohmyclaude's `/forge` dispatcher keeps its role. The 10 agents gain one canonical SC verb invocation each at the right pipeline stage. The actor model (who does what, when, with what authority) is unchanged; the **content of each stage** is now powered by SC skills where they exist.

### Agent ↔ SuperClaude Skill Mapping

| Agent | Primary SC skills | When invoked |
|---|---|---|
| @paige-product | `sc:sc-brainstorm`, `sc:sc-pm`, `sc:sc-estimate` | Confidence=LOW → brainstorm; always → pm for wave scheduling; task sizing → estimate |
| @artie-arch | `sc:sc-design`, `sc:sc-research`, `sc:sc-spec-panel` | Unfamiliar tech choice → research; before SDD finalization → spec-panel critique |
| @una-ux | `sc:sc-design` | UX-SPEC drafting |
| @sam-sec | `sc:sc-analyze --focus security` | Security audit pass |
| @beck-backend | `sc:sc-implement`, `sc:sc-build` | IMPL-BE stage |
| @effie-frontend | `sc:sc-implement`, `sc:sc-build` | IMPL-FE stage |
| @quinn-qa | `sc:sc-test` | TEST stage (plan + coverage strategy) |
| @stan-standards | `sc:sc-analyze`, `sc:sc-improve` | Code review — multi-domain analysis; post-review improvement suggestions |
| @heracles | `sc:sc-troubleshoot` | Debug / root cause |
| @devon-ops | `sc:sc-document`, `release-cut` | Docs + release (release-cut already ships with ohmyclaude) |

### /forge Pipeline ↔ SC Workflow Mapping

| /forge stage | Actor | SC verb applied | Artifact |
|---|---|---|---|
| Discovery | /forge system | `sc:sc-load` (opt) | — |
| Classify + Clarify | @paige-product | `sc:sc-brainstorm` (LOW confidence) | PRD |
| Decompose / schedule | @paige-product | `sc:sc-pm` + `sc:sc-estimate` | PRD (phases section) |
| System design | @artie-arch | `sc:sc-design` + `sc:sc-research` + `sc:sc-spec-panel` | SDD |
| UX | @una-ux | `sc:sc-design` | UX-SPEC |
| Security | @sam-sec | `sc:sc-analyze --focus security` | SECURITY-REVIEW |
| Implement | @beck-backend / @effie-frontend | `sc:sc-implement` | IMPL-BE / IMPL-FE |
| Test | @quinn-qa | `sc:sc-test` | TEST |
| Review | @stan-standards | `sc:sc-analyze` + `sc:sc-improve` | CODE-REVIEW |
| Debug | @heracles | `sc:sc-troubleshoot` | DEBUG |
| Docs + ship | @devon-ops | `sc:sc-document` + `release-cut` | RELEASE + ANNOUNCEMENT |
| Orchestration | @paige-product | `sc:sc-pm` | SUMMARY |

### Why integrate rather than duplicate

1. **Verbs evolve faster than actors.** SC skills receive updates from their upstream; our agents inherit those without rewriting.
2. **Token economy.** SC skills already live in the user's skill library. Agents reference them by one line instead of re-authoring the verb's content.
3. **Interoperability.** Users who already use `/sc:sc-sc` get consistent behavior when they switch to `/forge` — same research shape, same test strategy, same analysis framework.
4. **Fallback guaranteed.** Every SC reference is conditional. If the user does not have SC installed, agents execute their current inline behavior. Zero-setup promise holds.

## Acceptance Criteria (plan-level)

- [x] v1.0.1 is OSS-publishable: `LICENSE`, `SECURITY.md` present; `note.md` removed; `validate.js` green. **Done 2026-04-20.**
- [x] v1.0.2 ships a single `docs/OPERATING.md` that answers "what does agent X do?" and "what does hook Y cost?" in one lookup. Also shipped `docs/pipeline-schema.md`, `docs/TOKENS.md`, `.claude/pipeline/README.md`, `MIGRATION.md`. **Done 2026-04-20.**
- [ ] v1.1.0 SuperClaude integration: every agent invokes at least one `sc:sc-*` verb at its canonical stage; `docs/superclaude-integration.md` published; fallback path verified.
- [ ] v1.2.0 adds a `cost-tracker` hook plus smoke tests for every hook script; `OHMYCLAUDE_HOOKS=skip:<id>` env var works.
- [ ] v1.3.0 enforces gate artifacts (PRD/SDD/CODE-REVIEW) and makes the HIGH/MEDIUM/LOW confidence classifier reproducible across runs.
- [ ] v1.4.0 reduces measured Scenario C (complex feature) cost by ≥40% vs v1.0.0 baseline captured in Phase 4.

## Phase 1 — v1.0.1 "Trust & Transparency" (1–2 days)

| # | Task | File(s) | Done-When | Effort |
|---|---|---|---|---|
| 1 | Add MIT license | `LICENSE` | `validate.js` sees it; `package.json "license"` matches | 5 min |
| 2 | Add vuln-report policy | `SECURITY.md` | Contact + triage SLA + scope; linked from README | 20 min |
| 3 | Delete `note.md` or convert to issues | remove file | Tree clean; CHANGELOG v0.5.0 claim true | 5 min |
| 4 | Decide `docs/en/` vs `docs/vi/` scaffolding | `docs/README.md` or remove dirs | No half-built i18n in the tree | 15 min |
| 5 | Bump to `1.0.1` | 4 version files via `scripts/bump-version.js --patch` | `validate.js` passes | 2 min |

**Exit criteria**: OSS-publishable; CHANGELOG matches reality; `validate.js` green.

## Phase 2 — v1.0.2 "Operator Docs" (2–4 days)

| # | Task | File(s) | Done-When | Effort |
|---|---|---|---|---|
| 6 | Single operator reference | `docs/OPERATING.md` (merges AGENTS.md + HOOKS.md) | 10 agents × (purpose, when, what-it-wont-do, example) + 6 hooks × (trigger, blocking, env, disable, failure) | 3 h |
| 7 | Pipeline artifact schema | `docs/pipeline-schema.md` | ID format, fields, gate vs informational, lifecycle diagram | 1 h |
| 8 | Pipeline README | `.claude/pipeline/README.md` (shipped) | Users opening the dir see an index, not empty silence | 30 min |
| 9 | 0.x → 1.0 migration guide | `MIGRATION.md` | Retired agent → replacement, retired command → `/forge ...`, alias removal walk-forward | 1 h |
| 10 | Cost transparency | `docs/TOKENS.md` | Per-scenario cost table from panel review + caching guidance | 45 min |

**Exit criteria**: a new user can answer "what does agent X do?" and "what does hook Y cost me?" in one file lookup.

## Phase 3 — v1.1.0 "SuperClaude Workflow Integration" (1 week)  [NEW]

Compose SC verb-skills into agent behaviors. No new agents. No breaking changes. Each agent gains one "Uses SuperClaude" block in its prompt plus a fallback clause.

| # | Task | File(s) | Done-When | Risk |
|---|---|---|---|---|
| 11 | Mapping doc | `docs/superclaude-integration.md` | Agent↔skill + stage↔verb tables; fallback semantics documented; example of fully-SC-powered `/forge` run | Low |
| 12 | Brainstorm gate on LOW confidence | `agents/paige-product.md` | When CONFIDENCE=LOW, paige invokes `sc:sc-brainstorm` before writing PRD; falls back to inline 2-3 questions if absent | Low |
| 13 | PM orchestration reference | `agents/paige-product.md` | Team-lead section invokes `sc:sc-pm` for wave scheduling; `sc:sc-estimate` for SP sizing | Low |
| 14 | Research gate for unfamiliar patterns | `agents/artie-arch.md` | When SDD proposes a tech/pattern not already in the codebase, artie invokes `sc:sc-research` first and cites it in the ADR | Medium — research can be token-heavy; gate on "unfamiliar pattern" trigger, not every SDD |
| 15 | Spec-panel pre-SDD check | `agents/artie-arch.md` | Existing reference to `sc-adviser` replaced with explicit `sc:sc-spec-panel` invocation (architecture focus, critique mode); findings appended to SDD | Low |
| 16 | Implementation verb (backend) | `agents/beck-backend.md` | IMPL-BE stage loads `sc:sc-implement` patterns; fallback to inline | Low |
| 17 | Implementation verb (frontend) | `agents/effie-frontend.md` | IMPL-FE stage loads `sc:sc-implement` patterns; fallback to inline | Low |
| 18 | Test verb | `agents/quinn-qa.md` | TEST stage loads `sc:sc-test` for coverage strategy | Low |
| 19 | Analyze verb (review) | `agents/stan-standards.md` | CODE-REVIEW loads `sc:sc-analyze` + `sc:sc-improve`; keeps existing Hard Limits section | Low |
| 20 | Analyze verb (security) | `agents/sam-sec.md` | Security audit loads `sc:sc-analyze --focus security` | Low |
| 21 | Troubleshoot verb | `agents/heracles.md` | Debug loads `sc:sc-troubleshoot` | Low |
| 22 | Document verb | `agents/devon-ops.md` | Docs stage loads `sc:sc-document`; `release-cut` unchanged | Low |
| 23 | Forge.md update | `commands/forge.md` | New "SuperClaude Verb Map" section; `/forge help` mentions fallback semantics | Low |
| 24 | Fallback contract | `scripts/validate.js` + new `scripts/test-sc-fallback.js` | Agents log `sc-skill-not-found` notice and continue with inline behavior when SC absent | Medium — needs fixture for "SC present" vs "SC absent" |

**Exit criteria**: every agent invokes at least one SC verb at its canonical pipeline stage; `docs/superclaude-integration.md` published; explicit fallback tests pass with SC both present and absent.

## Phase 4 — v1.2.0 "Observability & Safety Nets" (1 week)

First phase with runtime changes beyond prompt edits. Each item is individually reversible.

| # | Task | Surface | Done-When | Risk |
|---|---|---|---|---|
| 25 | `cost-tracker` hook | `hooks/scripts/cost-tracker.js` + `hooks-extended` module | Appends `~/.claude/ohmyclaude/costs.jsonl`; no-op if env var absent | Low |
| 26 | Smoke tests for hook scripts | `scripts/test-hooks.js` + fixtures | Every hook: valid input → exit 0 passthrough; blocking input → exit 2 (PreToolUse only) | Low |
| 27 | `prompt-injection-guard` hook | new PreToolUse hook on Write | Flags suspicious markers; exit 0 with warning (not blocking until v1.3) | Medium |
| 28 | `OHMYCLAUDE_HOOKS=skip:<id>` escape hatch | update 6 hook scripts | Setting env skips hook body but keeps passthrough | Low |
| 29 | Plugin C4 of itself | `docs/architecture.md` with C1 + C2 Mermaid | Dogfoods the `c4-architecture` skill; shows user → /forge → Team → agents → artifacts → SC verbs | Low |

**Exit criteria**: hooks have a test net; users have a kill switch per-hook; cost is observable; plugin architecture is documented in its own idiom including the SC verb layer from Phase 3.

## Phase 5 — v1.3.0 "Correctness at the Edges" (2 weeks)

The quality-gap items Wiegers flagged. Requires agent prompt edits — highest-surface changes in this plan.

| # | Task | What changes | Done-When |
|---|---|---|---|
| 30 | Make HIGH/MEDIUM/LOW confidence testable | `agents/paige-product.md` + new heuristic table | Each level has 3+ example prompts and a decision rule grounded in 4 named signals (scope, behavior, constraint, target-file-exists). Integrates with Phase 3 task 12 brainstorm gate. |
| 31 | Gate-stop enforcement | New tiny skill `gate-check` invoked between waves; `/forge` updated | Pipeline cannot advance past PRD/SDD/CODE-REVIEW until artifact exists AND has no unresolved `[ ]` criteria |
| 32 | Explicit circuit-breaker counter | `agents/paige-product.md` writes `.claude/pipeline/DEADLOCK-<id>.json` instead of implicit count | Counter survives context compaction; 3-strike rule is deterministic |
| 33 | Ship canonical example artifacts | `.claude/pipeline/examples/` | Each `write-*` skill links to an exemplar; one full end-to-end example uses SC verbs |
| 34 | Session lifecycle `/forge save` and `/forge load` | `commands/forge.md` adds `save`/`load` subcommands; calls `sc:sc-save` and `sc:sc-load` if present | Snapshot+resume roundtrips one sprint |

**Exit criteria**: confidence classifier is reproducible; gate artifacts are enforced, not aspirational; deadlock counter survives restarts; session save/load works via SC when available.

## Phase 6 — v1.4.0 "Cost Efficiency Pass" (follow-up)

Purely an optimization pass, informed by real `costs.jsonl` data from Phase 4.

| # | Task | Lever | Expected saving |
|---|---|---|---|
| 35 | Trim all agent descriptions to ≤30 words | Token budget | ~10% per spawn |
| 36 | Extract pattern catalogs from agents to skills (some now covered by SC verbs → delete redundancy) | Token budget | 20–30% per spawn for artie-arch, stan-standards |
| 37 | Evaluate `@artie-arch` on Sonnet for simple features; keep Opus gated to complex routes only | Model selection | ~25% per complex-feature run |
| 38 | Add prompt-caching hints where supported | Caching | 70% reduction on in-team re-reads |
| 39 | Audit SC invocations for over-eager loading | Skill discipline | Prevent unconditional SC skill loads; keep them gated on triggers defined in Phase 3 |

**Exit criteria**: Scenario C measured cost drops from ~$1/run to ~$0.40–0.60/run; no redundant local duplication of SC verb content.

## Out of Scope (this plan will NOT)

- Add new languages (TypeScript/Go/Python/Kotlin rules stay on ROADMAP v1.1.0 as-is unless user-requested).
- Add a new agent — the mechanism is fine; new actors dilute responsibility.
- Build an MCP server of our own — `code-review-graph` is good enough.
- Ship a UI or dashboard — cost tracker writes jsonl; grep-able.
- Replace `/forge` with `/sc:sc-sc` — two dispatchers can coexist; ohmyclaude agents/pipeline remain the value-add.
- Depend on SC as a hard requirement — every SC reference is optional with documented fallback.

## Risks

| Risk | Mitigation |
|---|---|
| Phase 3 agent edits invoke SC skills that do not exist in some users' environments | Every SC invocation is wrapped in a fallback clause: "If `sc:sc-<verb>` unavailable, proceed with inline behavior." Validated by `test-sc-fallback.js` (Phase 3 task 24). |
| SC verbs drift — upstream changes break our assumed contract | Pin SC verb usage to stable subset (research, brainstorm, implement, test, pm, analyze, design, document, troubleshoot). Version-check in mapping doc. |
| Token cost rises from loading SC skills on top of agent prompts | Phase 6 includes SC invocation audit; Phase 4 cost-tracker measures before/after so we can roll back per-agent if SC loading is net-negative |
| Phase 5 agent-prompt edits regress current behavior | Ship one agent at a time inside Phase 5; keep previous version in git for one-commit revert |
| Gate enforcement blocks legitimate fast-path work | `gate-check` has `--ack-missing` escape hatch; HIGH-confidence path stays hot |
| Smoke tests create CI surface we don't want | Run locally via `npm run test:hooks`; do NOT add to GitHub Actions until v1.4.0 |

## Suggested Cadence

```
Week 1       v1.0.1   Phase 1   patch  — unblock OSS
Week 1-2     v1.0.2   Phase 2   patch  — docs
Week 3       v1.1.0   Phase 3   minor  — SuperClaude integration
Week 4       v1.2.0   Phase 4   minor  — observability & safety nets
Week 6-7     v1.3.0   Phase 5   minor  — correctness at the edges
Week 8       v1.4.0   Phase 6   minor  — cost efficiency pass
```

## References

- Spec panel review (this session, 2026-04-20) — Wiegers, Adzic, Cockburn, Fowler, Nygard, Newman, Crispin, Hightower.
- `ROADMAP.md` — original tasks 25, 26, 28, 30, 34 were on v1.1.0 / v1.2.0 / v1.3.0; this plan sequences and adds acceptance criteria.
- `CHANGELOG.md` — v0.5.0 "Source Clarity" established the doc-hygiene precedent continued in Phase 1.
- SuperClaude dispatcher `/sc:sc-sc` — source of the verb-skill library integrated in Phase 3. Verbs used: research, brainstorm, implement, test, pm, analyze, design, document, troubleshoot, estimate, improve, build, spec-panel, save, load.

## Next Action

Human approval required on this plan rev 2, or one of:
- (a) Start Phase 1 — draft `LICENSE`, `SECURITY.md`, remove `note.md`, stamp `1.0.1`.
- (b) Skip ahead to Phase 3 — wire SC verbs into agents first because the workflow benefit is immediate.
- (c) Revise plan — reorder, drop, or split specific items.
- (d) Approve plan and proceed phase-by-phase in order.
