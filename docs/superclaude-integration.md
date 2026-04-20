# SuperClaude Integration

ohmyclaude composes SuperClaude's verb-skills into agent behaviors. This doc explains **which verb each agent invokes, when, and what happens if SC is not installed.**

`/forge` and `/sc:sc-sc` coexist by design:

- **`/forge`** is ohmyclaude's dispatcher — **actors + pipeline + gates**. It spawns agents, runs Agent Teams, writes artifacts to `.claude/pipeline/`.
- **`/sc:sc-sc`** is SuperClaude's dispatcher — a **library of verb-skills** (`research`, `brainstorm`, `implement`, `test`, `pm`, `analyze`, `design`, `document`, `troubleshoot`, `estimate`, `improve`, `build`, `spec-panel`, `reflect`, `workflow`, `task`, `save`, `load`).

ohmyclaude agents reference SC verbs inside their prompts. When SC is installed, agents inherit SC's up-to-date patterns. When SC is absent, agents fall back to their inline guidance — the zero-setup promise holds.

---

## Agent ↔ SC Skill Mapping

| Agent | Primary SC skills | Canonical invocation point |
|---|---|---|
| `@paige-product` | `sc:sc-brainstorm`, `sc:sc-pm`, `sc:sc-estimate` | Confidence=LOW → brainstorm. Always → pm for wave scheduling. Task sizing → estimate. |
| `@artie-arch` | `sc:sc-design`, `sc:sc-research`, `sc:sc-spec-panel` | Pattern/tech not already in codebase → research. Before finalizing SDD → spec-panel (architecture focus, critique mode). |
| `@una-ux` | `sc:sc-design` | UX-SPEC drafting. |
| `@sam-sec` | `sc:sc-analyze` (with `--focus security`) | Security audit pass; adversarial scenario review. |
| `@beck-backend` | `sc:sc-implement`, `sc:sc-build` | IMPL-BE stage. |
| `@effie-frontend` | `sc:sc-implement`, `sc:sc-build` | IMPL-FE stage. |
| `@quinn-qa` | `sc:sc-test` | TEST stage (plan + coverage strategy). |
| `@stan-standards` | `sc:sc-analyze`, `sc:sc-improve` | CODE-REVIEW — multi-domain analysis and post-review improvement suggestions. |
| `@heracles` | `sc:sc-troubleshoot` | Debug / root cause investigation. |
| `@devon-ops` | `sc:sc-document`, `release-cut` | Docs stage; `release-cut` (ohmyclaude-native) handles the release itself. |

---

## `/forge` Stage ↔ SC Verb Mapping

| Stage | Actor | SC verb | Output artifact |
|---|---|---|---|
| Discovery | `/forge` system | `sc:sc-load` (optional) | — |
| Classify + clarify | `@paige-product` | `sc:sc-brainstorm` (LOW confidence) | `PRD-<id>.md` |
| Decompose + schedule | `@paige-product` | `sc:sc-pm` + `sc:sc-estimate` | PRD phases section |
| System design | `@artie-arch` | `sc:sc-design` + `sc:sc-research` + `sc:sc-spec-panel` | `SDD-<id>.md` |
| UX | `@una-ux` | `sc:sc-design` | `UX-SPEC-<id>.md` |
| Security audit | `@sam-sec` | `sc:sc-analyze --focus security` | `REVIEW-<id>.md` |
| Implement | `@beck-backend` / `@effie-frontend` | `sc:sc-implement` | `IMPL-BE-<id>.md` / `IMPL-FE-<id>.md` |
| Test | `@quinn-qa` | `sc:sc-test` | `TEST-<id>.md` |
| Review | `@stan-standards` | `sc:sc-analyze` + `sc:sc-improve` | `CODE-REVIEW-<id>.md` |
| Debug | `@heracles` | `sc:sc-troubleshoot` | `DEBUG` report |
| Docs + ship | `@devon-ops` | `sc:sc-document` + `release-cut` | `DOC-<id>.md` + `RELEASE-vX.Y.Z.md` + `ANNOUNCEMENT-<id>.md` |
| Orchestration | `@paige-product` | `sc:sc-pm` | `SUMMARY-<timestamp>.md` |

Session-lifecycle commands (`sc:sc-save`, `sc:sc-load`) are optional enhancements planned for v1.3.0 per `PLAN-001` Phase 5 task 34.

---

## Integration Pattern (what an agent's SC reference looks like)

Every agent SC invocation follows the same three-line contract:

```markdown
### SuperClaude Integration

Load `sc:sc-<verb>` [with `<args>`] before [stage]. Use its output to inform the [artifact/decision].
**Fallback**: if `sc:sc-<verb>` is not installed, proceed with the inline guidance above — do not block.
```

Two properties make this safe:

1. **Additive, not replacing.** The inline guidance in every agent stays. The SC reference is guidance layered *on top*.
2. **Fallback is explicit.** Agents are instructed to continue when the skill is missing, not error out.

### Example — `@paige-product` brainstorm gate (LOW confidence)

```markdown
### SuperClaude Integration

When confidence is LOW, load `sc:sc-brainstorm` before asking clarifying questions via `AskUserQuestion`. Use its output to shape the 2-3 questions.
**Fallback**: if `sc:sc-brainstorm` is not installed, use the inline confidence ladder below (2-3 targeted questions on scope / behavior / constraints).
```

### Example — `@artie-arch` research gate (unfamiliar pattern)

```markdown
### SuperClaude Integration

When the SDD proposes a pattern or technology not already present in the codebase, load `sc:sc-research` first and cite its findings in the ADR. Also load `sc:sc-spec-panel --focus architecture --mode critique` before finalizing the SDD; append panel findings to `## Specification Review Notes`.
**Fallback**: if either skill is unavailable, proceed with the inline architectural principles below and document your own reasoning in the ADR.
```

---

## Fallback Contract

This is load-bearing — ohmyclaude must behave correctly with **or without** SuperClaude.

### The rule

When an agent encounters `Load sc:sc-<verb>` and the skill is unavailable:

1. Log a notice (stderr or output): `[ohmyclaude] sc:sc-<verb> not available — falling back to inline guidance.`
2. **Continue** with the inline behavior the agent's prompt already defines.
3. **Do not halt** the stage. The artifact still gets written; it just doesn't benefit from SC's latest patterns.

### How this is tested

`scripts/test-sc-fallback.js` (added in the same Phase 3) simulates an SC-absent environment and confirms:

- Every agent file contains at least one SC reference with a matching `**Fallback**:` clause.
- Every SC invocation is preceded by a clear stage trigger (not unconditional).
- No agent references a retired SC verb name.

Run locally with `npm run test:sc-fallback` (added in Phase 3 task 24).

### Why conditional, not always-on

Unconditional SC loads would inflate per-spawn token cost. Each SC skill is ~500 tokens; loading four per agent spawn adds up fast. Instead, each agent gates its SC invocations on a stage or trigger (e.g., "LOW confidence only", "unfamiliar pattern only"). See `docs/TOKENS.md` §9 for the cost impact.

---

## Version Pinning

ohmyclaude's Phase 3 integration uses this **stable subset** of SC verbs:

```
sc:sc-research          sc:sc-brainstorm      sc:sc-implement
sc:sc-test              sc:sc-pm              sc:sc-analyze
sc:sc-design            sc:sc-document        sc:sc-troubleshoot
sc:sc-estimate          sc:sc-improve         sc:sc-build
sc:sc-spec-panel        (sc:sc-save / sc:sc-load — future)
```

If a verb disappears from SC upstream, the fallback contract protects runtime behavior, but agents referencing it should be updated. `test-sc-fallback.js` will flag the broken reference on its next run.

---

## Why Compose Rather Than Duplicate

1. **Verbs evolve faster than actors.** SC maintains verb content upstream; ohmyclaude inherits those updates without rewriting agent prompts.
2. **Token economy.** One SC reference line (~30 tokens) is cheaper than an inline reimplementation of the verb (~500–2,000 tokens per agent). At 10 agents, that saves 5K–20K tokens per team spawn.
3. **Interoperability.** Users who work in both `/sc:sc-sc` and `/forge` get consistent behavior — the same research shape, the same test strategy, the same analysis framework.
4. **Fallback guaranteed.** Every SC reference is conditional. Zero-setup holds.
5. **Separation of concerns.** SC owns the verbs. ohmyclaude owns the actors, the pipeline, and the gates. Neither project absorbs the other.

---

## See Also

- `docs/OPERATING.md` — per-agent reference (now includes SC invocation points).
- `docs/TOKENS.md` §9 — cost implications of SC loading and gating rationale.
- `.claude/pipeline/PLAN-001.md` Phase 3 — the task list that produced this integration.
- `scripts/test-sc-fallback.js` — enforces the fallback contract.
