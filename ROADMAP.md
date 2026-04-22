# ohmyclaude Roadmap

## Process Invariant

**Every release must diff against this file in the same commit.** If the release ships something not listed here, either (a) update ROADMAP.md to reflect the shipped scope, or (b) hold the release until the planning doc catches up. Enforced via `scripts/validate.js` as an advisory check.

**No two minor releases within 24 hours** without an explicit `RELEASE-CUT.md` artifact in `.claude/pipeline/`. A fast cadence is fine; an invisible cadence is not.

---

## What Actually Shipped (v1.0 → v1.3)

Truthful record of the three minor releases that landed on 2026-04-21. The plan-vs-reality drift was discovered during the v2.0.0 spec-panel review and is the primary motivation for the "restore invariants" refactor.

### v1.0.0 — Harness Engineering Overhaul (2026-04-08)

- Agent Teams coordination model (TeamCreate / SendMessage / TaskList)
- Single `/forge` entry point absorbs /review, /debug, /commit
- 17 agents consolidated to 10 (Corporate Slack personas)
- Java-first skills (4) + path-activated rules for `rules/java/`
- Document-driven pipeline with 10 named artifact types
- 3-level confidence UX (HIGH / MEDIUM / LOW)
- code-review-graph MCP soft-integration
- Install profiles simplified to 3 (minimal, standard, full)

### v1.1.0 — SuperClaude Inlining γ (2026-04-21)

- 13 SuperClaude verb-skills inlined from upstream v4.3.0 (MIT)
- Every `sc-<verb>` reference resolves in-tree — no external peer dependency
- Agents' SuperClaude Integration sections rewritten to reference inlined forms
- `scripts/test-sc-fallback.js` inverted: proves no external `sc:sc-<verb>` remains

### v1.2.0 — Cost Profiler + Dry-Run Simulator (2026-04-21)

- `cost-profiler.js` hook (SubagentStop + Stop) writes `PROFILE-<runId>.md` per run and a rolling `baseline.json`
- `profile-run` skill interprets profiles and surfaces anomaly flags (`turn_explosion`, `cost_over_p95`, `cache_miss_spike`, `opus_budget_breach`)
- `dry-run.js` pure-Node classifier + router + cost estimator
- `/forge --dry-run <request>` simulates routing without spawning agents

### v1.3.0 — Dual-Graph Backend + java-source-intel (2026-04-21)

- Exploration tier list: `codegraph → code-review-graph → tree → grep`
- `graph-update.js` probes codegraph first, code-review-graph second, silently skips if neither present
- `skills/java-source-intel/` — Java semantic-query skill with 6 canonical patterns (callers, `@Transactional` boundaries, Spring bean inventory, impact radius, endpoint→DB traces, interface inheritors)
- All graph backends are opt-in: the plugin still ships md + js only, nothing installed on the client

---

## v2.0.0 — Restore Invariants (In Progress, 2026-04-22)

The v2.0.0 refactor addresses drift between ohmyclaude's stated invariants and its shipped state. Strictly subtractive: no new skills, agents, or hooks. Additive work stays in v2.1+.

**Finding 1 — Roadmap fiction (CRITICAL)**: v1.1 / v1.2 / v1.3 shipped nothing from their listed items. This file is now rewritten to be truthful, with the Process Invariant at the top to prevent recurrence.

**Finding 2 — Skills violated the ≤400-line cap (HIGH)**: 3 SKILL.md files exceeded the cap (`qa-test-planner` 758, `database-schema-designer` 688, `design-system` 604). All three split into compliant SKILL.md + expanded `references/`.

**Finding 3 — SuperClaude inlining added drift surface for low value (HIGH)**: 8 of 13 inlined sc-* skills were verb-wrappers duplicating agent docstrings. Removed: `sc-analyze`, `sc-build`, `sc-design`, `sc-document`, `sc-implement`, `sc-improve`, `sc-test`, `sc-troubleshoot`. Kept 5 knowledge-methodology skills: `sc-spec-panel`, `sc-brainstorm`, `sc-pm`, `sc-research`, `sc-estimate`. ~1,400 lines of MIT-drift surface removed.

**Finding 4 — Three releases in one day with no gate (MEDIUM)**: Added release gate to `validate.js` — VERSION bump requires a matching `## [VERSION]` section in CHANGELOG.md, plus an advisory ROADMAP↔VERSION cross-check.

### What changed

- [x] `scripts/validate.js` — enforces ≤400-line cap on all `skills/*/SKILL.md`
- [x] `scripts/validate.js` — enforces CHANGELOG↔VERSION symmetry (hard)
- [x] `scripts/validate.js` — advises ROADMAP↔VERSION symmetry (soft warning)
- [x] `skills/qa-test-planner/` split (758 → 258 lines in SKILL.md)
- [x] `skills/database-schema-designer/` split (688 → 280 lines in SKILL.md)
- [x] `skills/design-system/` split (604 → 171 lines in SKILL.md)
- [x] 8 sc-* verb-wrapper skills deleted
- [x] 9 agent files updated to drop deleted-verb references
- [x] `commands/forge.md` SuperClaude section rewritten around the 5 knowledge skills
- [x] `docs/superclaude-integration.md` rewritten with "subtract the verb-wrappers" rationale
- [x] `scripts/test-sc-fallback.js` updated with new stable subset and removed-verb list
- [x] `manifests/install-modules.json` `skills-superclaude` shrunk 13 → 5
- [x] `ROADMAP.md` rewritten (this file)
- [x] `docs/OPERATING.md` — release gate documented
- [x] CHANGELOG entry for v2.0.0 — subtractive refactor summary

### What is NOT in v2.0.0 (intentional)

- No new skills, agents, hooks, or rules
- No filesystem re-boundary of `skills/` categories (deferred to v2.1)
- No language expansion (see v2.1+ backlog)
- No session intelligence features (see v2.1+ backlog)

---

## v2.1+ — Deferred From Original v1.1/v1.2 Roadmap

These items were listed in the original ROADMAP for v1.1–v1.3 but never shipped. Each is annotated with a decision status: **still desired** (planned), **superseded** (better approach found), or **dropped** (no longer in scope).

### From original v1.1 — Hook Depth & Language Expansion

- [ ] **console-log-auditor hook** — still desired. Language-aware scan for debug statements. Low priority.
- [ ] **pre-commit-quality-gate hook** — superseded. `validate.js` + the release gate cover most of this; the remaining need (run tests + lint before Claude-initiated commits) can be a single PostToolUse on Bash.
- [ ] **cost-tracker hook** — superseded by `cost-profiler.js` shipped in v1.2.0. The `.claude/metrics/baseline.json` replaces the JSONL log idea.
- [ ] **prompt-injection-guard hook** — still desired. High-value safety. Scope a v2.1 design.
- [ ] **TypeScript/JavaScript rules** (`rules/typescript/`) — still desired. Next language after Java.
- [ ] **Go rules** (`rules/go/`) — still desired.
- [ ] **Python rules** (`rules/python/`) — still desired.
- [ ] **Kotlin rules** (`rules/kotlin/`) — still desired.
- [ ] **`/forge sprint --think`** — explore ≥3 approaches before committing. Still desired.
- [ ] **`/forge sprint --delegate`** — pause after plan for human approval. Still desired.

### From original v1.2 — Session Intelligence

- [ ] **`/save` command** — snapshot session state to `~/.claude/ohmyclaude/sessions/<id>.json`. Still desired.
- [ ] **`/load [id]` command** — restore context, resume from next pending stage. Still desired.
- [ ] **SessionStart hook — auto-load previous session context.** Still desired; pairs with /save.
- [ ] **PreCompact hook — save agent state before compaction.** Still desired.
- [ ] **Pre-implementation 5-dimension confidence scorecard** — still desired. Would gate `@paige-product`'s plan output.
- [ ] **Wave orchestration with integration checkpoints** — partially shipped in v1.0.0 via `task-breakdown`; the explicit integration checkpoint is still an open gap.
- [ ] **SubagentStart hook** — compact context block prepended per agent invocation. Still desired.

### From original v1.3 — Distribution & Testing

- [ ] **Smoke test suite** — fixture inputs through each hook script, asserting exit codes. Still desired. First candidate for v2.1.
- [ ] **`npm prepublishOnly` script** — runs `validate.js`, aborts on failure. Quick win for v2.1.
- [ ] **Agent integration tests** — verify each agent's frontmatter, tools, example triggers. Still desired.
- [ ] **`install.sh` verified on macOS (zsh + bash), Ubuntu 22.04, Windows WSL2** — still desired.
- [ ] **`install.ps1` parity** — still desired; likely lower priority than shell.
- [ ] **AGENTS.md reference** — all 10 agents: purpose, when to invoke, what it won't do, example prompts. Partially covered by `docs/OPERATING.md`; a consolidated reference still missing.
- [ ] **HOOKS.md reference** — all hooks: trigger, blocking vs async, env vars, how to disable. Same as above.

---

## v2.1.0 — Tentative Cut Candidates

Minimum viable additions to get language expansion moving without re-repeating the v1.x drift:

1. `rules/typescript/` with path-activated rule loading — smallest valuable add, expands the "Java-first" story.
2. Smoke test suite for the 8 hooks — closes the v1.3-was-promised-but-not-shipped gap.
3. AGENTS.md consolidated reference — replaces scattered agent docs with one canonical file.

All three are in the "deferred from original v1.1" backlog and all three fit in a single point-release without churn.

---

## v2.2+ — New Initiatives (Exploratory)

Forward-looking additions that are **not** carryover from the original v1.x backlog. Each must pass the "earn its spot" gate (*Guiding Principles*, last bullet) — i.e., show it's not duplicating an existing skill or agent capability.

### UI/UX Intelligence Upgrade — `@una-ux` + `@effie-frontend` + `design-system`

**Reference**: [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) — 161 industry-specific design-reasoning rules, 67 UI style templates, 161 color palettes, 57 font pairings, 25 chart recommendations, and a hierarchical design-system retrieval pattern (`MASTER.md` + per-page overrides).

**Why desired**: ohmyclaude's current `@una-ux` (UX research pre-dev) and `skills/design-system/` cover methodology but ship no content library. A designer asking `@una-ux` for "a dashboard for a fintech B2B product" today gets principles; ui-ux-pro-max would give a grounded palette + typography + component recommendations matched to the product category.

**Architectural tension — must resolve before scoping**:
ui-ux-pro-max installs via its own `uipro-cli`, writing Python scripts and CSV databases into the consumer's repo. This **conflicts with the v1.3.0 invariant** above: *"the plugin still ships md + js only, nothing installed on the client."* Taking the skill as a hard dependency would break that invariant.

**Two candidate integration paths** (pick one in the v2.2 design spec):

- **Path A — Soft-dependency tier** (mirrors the `codegraph → code-review-graph → tree → grep` exploration ladder). Detect if `~/.claude/skills/ui-ux-pro-max/` is present; if yes, `@una-ux` and `@effie-frontend` delegate to it for palette/typography queries; if no, fall back to the native `design-system` skill. Zero install footprint added by ohmyclaude itself; user opts in via `uipro init --ai claude --global`.
- **Path B — Inspiration-only pattern port**. Adopt the *hierarchical design-system retrieval* pattern (MASTER.md global rules + `pages/[page].md` overrides) into `skills/design-system/references/` as a pure-markdown structure. No external dep, no Python, no auto-install. Loses the 161-rule reasoning engine but keeps ohmyclaude's purity invariant.

**Acceptance criteria for v2.2 cut**:
1. Design spec in `.claude/pipeline/DESIGN-ui-ux-intel.md` picks Path A or B with explicit rationale.
2. If Path A: `hooks/ui-ux-probe.js` follows the pattern of `hooks/graph-update.js` — graceful no-op when absent, no errors.
3. If Path B: `skills/design-system/SKILL.md` stays ≤400 lines; hierarchical pattern lives in `references/`.
4. `@una-ux` and `@effie-frontend` frontmatter / prompts updated in the same commit; `docs/OPERATING.md` agent table annotated.

**Status**: Not yet scoped. Open question: does the VNG Games internal design-system (a frequent user workflow) diverge enough from ui-ux-pro-max's 161 product categories that Path B is strictly better?

---

## Guiding Principles

**The model IS the agent. Build harnesses, not prompt chains.** Tools + knowledge + permissions = effective orchestration.

**Skills are reference material, not instructions.** Progressive disclosure: SKILL.md is concise (≤400 lines, enforced), `references/` has depth.

**Hooks are defensive infrastructure.** Clear failure mode, deterministic exit code, graceful no-op when dependency absent.

**Every new feature must be removable.** Delete one file or comment one line in hooks.json.

**Token budgets are explicit.** Skill ≤400 lines, agent description ≤30 words, model selection justified in PR.

**Subtract before adding.** v2.0.0's refactor was subtractive: remove verb-wrappers, enforce caps, honest ROADMAP. Additive work earns its spot by showing it's not duplicating what already exists.
