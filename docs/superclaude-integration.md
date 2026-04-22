# SuperClaude Integration

ohmyclaude ships with **5 SuperClaude knowledge-skills inlined** (MIT, from [SuperClaude_Plugin](https://github.com/SuperClaude-Org/SuperClaude_Plugin) v4.3.0). Agents that reference `sc-<skill>` can rely on those skills being present — no peer dependency on SuperClaude itself.

This doc explains which skill each agent invokes, when, and why ohmyclaude kept a deliberately small SuperClaude surface.

---

## v2.0.0 Change — Subtract the Verb-Wrappers

Between v1.1.0 (full 13-skill inline) and v2.0.0, ohmyclaude removed 8 verb-wrapper skills:

```
Removed in v2.0.0: sc-analyze, sc-build, sc-design, sc-document,
                   sc-implement, sc-improve, sc-test, sc-troubleshoot

Kept in v2.0.0:   sc-spec-panel, sc-brainstorm, sc-pm,
                   sc-research, sc-estimate
```

**Why remove them**: the 8 removed skills were verb-wrappers — they described "how to analyze / build / test / implement" as reference material that duplicated what ohmyclaude agents already describe in their own instructions. Each one was ~150 lines of MIT-drift surface with no unique knowledge. Agents handle those verbs inline.

**Why keep the 5**: the kept skills each encode a genuine named methodology:
- `sc-spec-panel` — 10 named software-engineering experts (Fowler, Newman, Nygard, Wiegers, Adzic, Cockburn, Hohpe, Crispin, Gregory, Hightower) with distinct critique styles.
- `sc-brainstorm` — Socratic-method requirements discovery protocol.
- `sc-pm` — project-manager orchestration patterns for multi-wave sprints.
- `sc-research` — adaptive research strategy (breadth → depth → synthesis).
- `sc-estimate` — structured estimation frames (story points, complexity axes, risk-weighted).

The difference is *knowledge worth loading on-demand* vs. *procedure already captured in the agent*.

---

## Design Model — Two Layers That Compose

- **`/forge`** is ohmyclaude's dispatcher — **actors + pipeline + gates**. It spawns agents via `TeamCreate`, runs Agent Teams, writes gate artifacts to `.claude/pipeline/` (PRD, SDD, UX-SPEC, IMPL-*, TEST, REVIEW, CODE-REVIEW, DOC, RELEASE).
- **`sc-<skill>` skills** are SuperClaude's **knowledge library** — named methodologies for how to run a spec panel, brainstorm Socratically, orchestrate PM waves, research, and estimate.

ohmyclaude agents invoke SC skills inside their prompts at well-defined triggers. Skills are the **what-you-know**; agents are the **who-does**; pipeline artifacts are the **what-ships**.

---

## Agent ↔ SC Skill Mapping

| Agent | SC skills | Canonical invocation point |
|---|---|---|
| `@paige-product` | `sc-brainstorm`, `sc-pm`, `sc-estimate` | Confidence=LOW → brainstorm. Wave scheduling → pm. Task sizing → estimate. |
| `@artie-arch` | `sc-research`, `sc-spec-panel` | Unfamiliar pattern → research. Before finalizing SDD → spec-panel (architecture focus, critique mode). |
| `@una-ux` | `sc-spec-panel` | Before finalizing UX-SPEC → spec-panel (requirements focus, Cockburn + Adzic). |
| `@sam-sec` | `sc-spec-panel` | Before verdict → spec-panel (compliance focus, Wiegers + Nygard). |

Other agents (`@beck-backend`, `@effie-frontend`, `@quinn-qa`, `@stan-standards`, `@heracles`, `@devon-ops`) no longer reference SC skills — they execute their verbs inline, using their own instructions and the general engineering skills (`tdd-patterns`, `code-review`, `commit-work`, `qa-test-planner`, etc.).

---

## Integration Pattern — What an Agent's SC Reference Looks Like

Agents that use SC have a `## SuperClaude Integration` section with a trigger table:

```markdown
## SuperClaude Integration

All SC skills are inlined from SuperClaude (MIT) and ship with ohmyclaude — no external dependency.

| Trigger | Load | Use it for |
|---|---|---|
| <stage/condition> | `sc-<skill>` [with `<args>`] | <what the output informs> |
```

Two properties make this work:

1. **Skills always exist.** Because they ship in-tree, agents can assume `sc-<skill>` is available. No conditional logic, no fallback clause.
2. **Gated invocations, not unconditional loads.** Each trigger specifies *when* the skill loads (e.g., "LOW confidence only", "pattern not already in the codebase", "before finalizing the SDD"). Token cost stays predictable.

### Example — `@artie-arch` research gate (unfamiliar pattern)

```markdown
| SDD proposes a pattern or technology **not already present** in the codebase | `sc-research` | Evidence-based research on the candidate pattern; cite findings in the ADR. |
| Before finalizing the SDD (mandatory) | `sc-spec-panel --focus architecture --mode critique` | Fowler / Newman / Nygard spec critique. Append to SDD `## Specification Review Notes`. |
```

---

## Version Pinning

Inlined from SuperClaude **v4.3.0** (MIT). The stable subset:

```
sc-spec-panel    sc-brainstorm    sc-pm    sc-research    sc-estimate
```

Upstream updates are pulled deliberately, not automatically:

1. Watch SuperClaude_Plugin releases.
2. Diff the upstream skill vs the inlined SKILL.md.
3. Port changes that improve the skill; preserve ohmyclaude adaptations; bump the `upstream:` field in frontmatter.
4. Ship under an ohmyclaude minor-version bump so consumers know SC content moved.

---

## Contract Test

`scripts/test-sc-fallback.js` enforces the inlining contract:

- No agent, command, or operating doc references `sc:sc-<skill>` (the old external form) — references must be bare `sc-<skill>`.
- Every `sc-<skill>` reference names a skill in the stable 5-skill subset above.
- No removed verb-wrappers survive (the script maintains an explicit removed-names list for v2.0.0: `sc-analyze`, `sc-build`, `sc-design`, `sc-document`, `sc-implement`, `sc-improve`, `sc-test`, `sc-troubleshoot`).

Run locally with `npm run test:sc-fallback`. CI runs it too.

---

## Why Compose Rather Than Rewrite

1. **Knowledge evolves faster than actors.** Keeping ohmyclaude's agents focused on pipeline behavior (gates, artifacts, conflict resolution) means knowledge updates don't force agent rewrites.
2. **Token economy.** Each inlined SKILL.md is ≤400 lines (~500 tokens), loaded by reference at a well-defined trigger — not unconditionally on every spawn.
3. **Separation of concerns.** SC owns the methodology shape (what it means to run a "spec panel" or "socratic brainstorm"). ohmyclaude owns the actor model, the pipeline gates, and the artifact schema.
4. **Interoperability.** A user who also installs SuperClaude_Plugin standalone sees the same skill names and the same methodology — `sc-spec-panel` behaves the same whether invoked by `@artie-arch` or by SC's own dispatcher.

---

## Attribution

SuperClaude content is MIT-licensed — Copyright (c) 2024 SuperClaude Framework Contributors. Each inlined skill preserves the original attribution in its frontmatter (`upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)`) and an explicit `## Attribution` section citing source, version, license, and the adaptations ohmyclaude made.

---

## See Also

- `docs/OPERATING.md` — per-agent reference.
- `docs/TOKENS.md` — cost implications of knowledge loading and gating rationale.
- `scripts/test-sc-fallback.js` — enforces the inlining contract.
- Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin
