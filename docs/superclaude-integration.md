# SuperClaude Integration

ohmyclaude ships with **13 SuperClaude verb-skills inlined** (MIT, from [SuperClaude_Plugin](https://github.com/SuperClaude-Org/SuperClaude_Plugin) v4.3.0). Every agent that references a `sc-<verb>` skill can rely on it — it's part of this plugin, not a peer dependency.

This doc explains which verb each agent invokes, when, and how ohmyclaude composes the SuperClaude verb library with its own actor + pipeline model.

---

## Design Model — Two Layers That Compose

- **`/forge`** is ohmyclaude's dispatcher — **actors + pipeline + gates**. It spawns agents via `TeamCreate`, runs Agent Teams, writes gate artifacts to `.claude/pipeline/` (PRD, SDD, UX-SPEC, IMPL-*, TEST, REVIEW, CODE-REVIEW, DOC, RELEASE).
- **`sc-<verb>` skills** are SuperClaude's **verb library** — reusable behaviors for how to brainstorm, research, spec-review, implement, test, analyze, troubleshoot, design, document, estimate, improve, build, and orchestrate project management.

ohmyclaude agents invoke SC verbs inside their prompts at well-defined triggers. Verbs are the **how**; agents are the **who**; pipeline artifacts are the **what**.

---

## Agent ↔ SC Skill Mapping

| Agent | SC skills | Canonical invocation point |
|---|---|---|
| `@paige-product` | `sc-brainstorm`, `sc-pm`, `sc-estimate` | Confidence=LOW → brainstorm. Wave scheduling → pm. Task sizing → estimate. |
| `@artie-arch` | `sc-research`, `sc-design`, `sc-spec-panel` | Unfamiliar pattern → research. All Step 4 decisions → design. Before finalizing SDD → spec-panel (architecture focus, critique mode). |
| `@una-ux` | `sc-design`, `sc-spec-panel` | UX-SPEC drafting. Before finalizing UX-SPEC → spec-panel (requirements focus). |
| `@sam-sec` | `sc-analyze`, `sc-spec-panel` | Phase 2+3 — plan review and adversarial matrix. Before verdict → spec-panel (compliance focus). |
| `@beck-backend` | `sc-implement`, `sc-build` | Step 2 — implementation workflow and multi-file scaffolding. |
| `@effie-frontend` | `sc-implement`, `sc-build` | Step 2 — component/page implementation and multi-component scaffolding. |
| `@quinn-qa` | `sc-test` | TEST stage — execution + coverage + adversarial-input matrix. |
| `@stan-standards` | `sc-analyze`, `sc-improve` | Multi-domain code review. Post-review MEDIUM/LOW proposals (read-only — Stan hands edits off to builders). |
| `@heracles` | `sc-troubleshoot` | Debug loop — hypotheses-first, diagnose-only by default, `--fix` for applied fixes. |
| `@devon-ops` | `sc-document` | Phase 1 — inline / external / api / guide docs. Release and announcement phases remain inline. |

---

## `/forge` Stage ↔ SC Verb Mapping

| Stage | Actor | SC verb(s) | Output artifact |
|---|---|---|---|
| Classify + clarify | `@paige-product` | `sc-brainstorm` (LOW confidence only) | `PRD-<id>.md` |
| Decompose + schedule | `@paige-product` | `sc-pm` + `sc-estimate` | PRD phases section |
| System design | `@artie-arch` | `sc-research` (gated) + `sc-design` + `sc-spec-panel` | `SDD-<id>.md` |
| UX | `@una-ux` | `sc-design` + `sc-spec-panel` | `UX-SPEC-<id>.md` |
| Security audit | `@sam-sec` | `sc-analyze --focus security` + `sc-spec-panel` | `REVIEW-<id>.md` |
| Implement | `@beck-backend` / `@effie-frontend` | `sc-implement` + `sc-build` | `IMPL-BE-<id>.md` / `IMPL-FE-<id>.md` |
| Test | `@quinn-qa` | `sc-test` | `TEST-<id>.md` |
| Code review | `@stan-standards` | `sc-analyze` + `sc-improve` | `CODE-REVIEW-<id>.md` |
| Debug | `@heracles` | `sc-troubleshoot` | `DEBUG-<id>.md` |
| Docs | `@devon-ops` | `sc-document` | `DOC-<id>.md` |
| Release + announce | `@devon-ops` | `release-cut` (ohmyclaude-native) | `RELEASE-vX.Y.Z.md` + `ANNOUNCEMENT-<id>.md` |
| Orchestration | `@paige-product` | `sc-pm` | `SUMMARY-<timestamp>.md` |

Release-cut and announcement are intentionally **not** SC verbs — they are ohmyclaude-specific pipeline gates coupled to the artifact schema and CHANGELOG conventions.

---

## Integration Pattern — What an Agent's SC Reference Looks Like

Every agent that uses SC has a `## SuperClaude Integration` section with a trigger table:

```markdown
## SuperClaude Integration

All SC verbs are inlined from SuperClaude (MIT) and ship with ohmyclaude — no external dependency.

| Trigger | Load | Use it for |
|---|---|---|
| <stage/condition> | `sc-<verb>` [with `<args>`] | <what the output informs> |
```

Two properties make this work:

1. **Verbs always exist.** Because they ship in-tree, an agent can assume `sc-<verb>` is available. No conditional logic, no fallback clause, no "log notice and continue" dance.
2. **Gated invocations, not unconditional loads.** Each trigger specifies *when* the verb is loaded (e.g., "LOW confidence only", "pattern not already in the codebase", "before finalizing the SDD"). This keeps per-spawn token cost predictable.

### Example — `@artie-arch` research gate (unfamiliar pattern)

```markdown
| SDD proposes a pattern or technology **not already present** in the codebase | `sc-research` | Evidence-based research on the candidate pattern; cite findings in the ADR. |
| Before finalizing the SDD (mandatory) | `sc-spec-panel --focus architecture --mode critique` | Fowler / Newman / Nygard spec critique. Append to SDD `## Specification Review Notes`. |
```

---

## Inlining — What Changed and Why

Previously (β release), ohmyclaude referenced SC verbs as `sc:sc-<verb>` with a fallback clause: "if not installed, proceed with inline guidance." The β design made SuperClaude optional.

v1.1.0 (γ) inlines the full verb library under `skills/sc-*/`. Rationale:

- **Single install story.** Users install ohmyclaude and every verb agents reference is present. No peer-dependency coordination, no version-skew bugs between two plugins.
- **Deterministic behavior.** Fallback paths are defensive dead code if the verb always exists. Removing them sharpens the contract: agents declare a hard dependency on verbs that are guaranteed to exist.
- **MIT compatibility.** Each inlined skill preserves SuperClaude's attribution (`upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)` in frontmatter + `## Attribution` section at the bottom).
- **Adaptation room.** A few inlined skills append ohmyclaude-specific workflow rules (e.g., `@devon-ops`'s read-first documentation workflow, `@heracles`'s pattern library, `@quinn-qa`'s coverage-standards table). Each adaptation is called out in the skill's Attribution note.

---

## Version Pinning

Inlined from SuperClaude **v4.3.0** (MIT). The stable subset:

```
sc-brainstorm        sc-research        sc-spec-panel
sc-pm                sc-estimate        sc-design
sc-analyze           sc-implement       sc-build
sc-test              sc-improve         sc-troubleshoot
sc-document
```

Session-lifecycle verbs (`sc-save`, `sc-load`) are not inlined — they are planned for a future session-continuity feature (`PLAN-001` Phase 5 task 34).

Upstream updates are pulled deliberately, not automatically:

1. Watch SuperClaude_Plugin releases.
2. Diff the upstream verb vs the inlined SKILL.md.
3. Port changes that improve the verb; preserve ohmyclaude adaptations; bump the `upstream:` field in frontmatter.
4. Ship under an ohmyclaude minor-version bump so consumers know SC content moved.

---

## Contract Test

`scripts/test-sc-fallback.js` enforces the inlining contract:

- No agent, command, or operating doc references `sc:sc-<verb>` (the old external form) — references must be bare `sc-<verb>`.
- Every `sc-<verb>` reference names a verb in the stable subset above (inlined) or a known deferred verb (`sc-save`, `sc-load`, `sc-workflow`, `sc-task`, `sc-reflect`).
- No retired or never-existed skill names survive (the script maintains an explicit retired-names list).
- The dispatcher token for SC's top-level slash command is excluded from the prefixed-form check — it isn't a verb.

Run locally with `npm run test:sc-fallback`. CI runs it too.

---

## Why Compose Rather Than Rewrite

1. **Verbs evolve faster than actors.** Keeping ohmyclaude's agents focused on pipeline behavior (gates, artifacts, conflict resolution) means verb updates don't force agent rewrites.
2. **Token economy.** Each inlined SKILL.md is ≤400 lines (~500 tokens). Agents load verbs by reference at a well-defined trigger — not unconditionally on every spawn.
3. **Separation of concerns.** SC owns the verb shape (what it means to "research" or "brainstorm"). ohmyclaude owns the actor model, the pipeline gates, and the artifact schema. Neither project absorbs the other.
4. **Interoperability.** A user who later installs SuperClaude_Plugin standalone sees the same verb names and the same methodology — `sc-implement` behaves the same whether invoked by `@beck-backend` or by SC's own dispatcher.

---

## Attribution

SuperClaude content is MIT-licensed — Copyright (c) 2024 SuperClaude Framework Contributors. Each inlined skill preserves the original attribution in its frontmatter (`upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)`) and an explicit `## Attribution` section citing source, version, license, and the adaptations ohmyclaude made.

---

## See Also

- `docs/OPERATING.md` — per-agent reference (includes SC invocation points).
- `docs/TOKENS.md` — cost implications of verb loading and gating rationale.
- `.claude/pipeline/PLAN-001.md` Phase 3 — the task list that produced this integration.
- `scripts/test-sc-fallback.js` — enforces the inlining contract.
- Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin
