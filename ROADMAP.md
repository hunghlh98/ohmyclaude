# ohmyclaude Roadmap

## Process Invariant

**Every release must diff against this file in the same commit.** If the release ships something not listed here, either (a) update ROADMAP.md to reflect the shipped scope, or (b) hold the release until the planning doc catches up. Enforced via `scripts/validate.js` as an advisory check.

**No two minor releases within 24 hours** without an explicit `RELEASE-CUT.md` artifact in `.claude/pipeline/`. A fast cadence is fine; an invisible cadence is not.

---

## Current State (2026-04-24)

- **Last shipped**: `v2.4.1` — CLAUDE.md compaction, `ohmyclaude-fs` plugin-owned MCP server (first graph-backend-free release cycle), dashboard data-correctness fixes.
- **In-flight (Unreleased → v2.4.2)**: code-review-graph re-adoption as optional graph backend; `.claude/ohmyclaude.local.yaml` per-project state file convention; new SessionStart setup hook detects `uv` prereq. Closes the near-term graph-backend backlog item opened at v2.4.0. See `CHANGELOG.md` [2.4.2] section and `.claude/plans/resilient-hopping-gadget.md`.
- **Nothing else scheduled**. The backlog below is an honest inventory of what's *still desired* — not a release calendar. Items move from backlog → release only when explicitly planned in a plan file and executed in a session.
- **Scope discipline**: each backlog item carries one of four statuses — `[ ]` still desired · `[x]` shipped · `[~]` partially shipped · `[-]` superseded / dropped. No item lists a target version until the moment it's being implemented. v2.0.0's whole thesis was that aspirational version pins cause drift.

### Near-term (pending decisions)

- [x] **Graph backend re-adoption** — *shipped v2.4.2*: picked `code-review-graph` (MIT, tirth8205/code-review-graph). Declared in `.claude-plugin/.mcp.json`; launched via `uvx code-review-graph serve`. Ships through the new opt-in `mcp-code-review-graph` install module (grouped under the `full` profile). Per-agent query-pattern re-integration into `java-source-intel` and `project-discovery` is deliberately deferred — agents discover the MCP organically for now.
- [x] **`ohmyclaude-fs` stdio MCP server** — *shipped v2.4.0*: plugin-owned filesystem helpers wrapping `tree`. Exposes `tree` as a named, trackable MCP tool so `mcp_mix` shows it distinctly. Stdlib-only Node (zero deps).

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

### v1.2.0 — Cost Profiler (2026-04-21)

- `cost-profiler.js` hook (SubagentStop + Stop) writes `PROFILE-<runId>.md` per run and a rolling `baseline.json`
- `profile-run` skill interprets profiles and surfaces anomaly flags (`turn_explosion`, `cost_over_p95`, `cache_miss_spike`, `opus_budget_breach`)

### v1.3.0 — Dual-Graph Backend + java-source-intel (2026-04-21)

- Exploration tier list: `codegraph → code-review-graph → tree → grep`
- `graph-update.js` probes codegraph first, code-review-graph second, silently skips if neither present
- `skills/java-source-intel/` — Java semantic-query skill with 6 canonical patterns (callers, `@Transactional` boundaries, Spring bean inventory, impact radius, endpoint→DB traces, interface inheritors)
- All graph backends are opt-in: the plugin still ships md + js only, nothing installed on the client

---

## v2.0.0 — Restore Invariants (Shipped 2026-04-22)

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

## v2.1.0 — Language Expansion + Distribution Hygiene (Shipped 2026-04-22)

All three items named below landed in v2.1.0. ROADMAP ↔ CHANGELOG symmetry honored (see `CHANGELOG.md` `## [2.1.0]`).

- [x] `rules/typescript/` — 4 path-activated rule files (coding-style, patterns, security, testing). Second language in the rules system. Activates on `**/*.ts` / `**/*.tsx`. Mirrors `rules/java/` exactly.
- [x] Smoke test suite for the 8 hooks — `scripts/test-hooks.js`, 27 contract assertions. Hermetic via `HOME` override; zero hook code modified. Wired into CI as required step.
- [x] `AGENTS.md` consolidated reference — new file at repo root. One section per agent with purpose, triggers, hard boundaries, and example prompts. Complements `docs/OPERATING.md` without duplicating body content.

Release gate additions (checked by `validate.js`):
- `rules/<lang>/*.md` must declare a `paths:` array (dead otherwise).
- `AGENTS.md` must mention + link every agent in `plugin.json`.
- `package.json` must declare a `test:hooks` script.

---

## v2.2.0 — Session Intelligence (Shipped 2026-04-22)

Ships resumable per-cwd session state — the `/save` and `/load` commands, plus three new hook events (`SessionStart`, `PreCompact`, `SubagentStart`) that keep the snapshot current between explicit saves. Opt-in bundle: `hooks-session`, `skills-session`, and `commands-session` modules are `defaultInstall: false` and land in the `full` profile only, not `standard`.

- [x] `/save` command + `skills/save/` — snapshot session state to `~/.claude/ohmyclaude/sessions/<session_id>/`. Writes `meta.json`, `stages.json`, updates `_index.json`. Idempotent, host-local.
- [x] `/load` command + `skills/load/` — read-only resume. Three forms: `/load`, `/load <id>`, `/load --list`. Cross-references saved `stages.json` with live `.claude/pipeline/`.
- [x] `SessionStart` hook (`hooks/scripts/session-load.js`) — fresh-startup only (source-filtered); emits discoverability hint when saved session exists for this cwd.
- [x] `PreCompact` hook (`hooks/scripts/state-snapshot.js`) — updates `stages.json` + `meta.last_touch_ts` before compaction.
- [x] `SubagentStart` hook (`hooks/scripts/subagent-trace.js`) — telemetry only. Original ROADMAP intent was context-injection; the event is observational per Claude Code docs, so scope was reduced honestly rather than shipping something broken. Context-injection capability remains in the backlog below (needs a `PreToolUse`-on-`Task` design, not `SubagentStart`).

Smoke suite grew from 27 → 37 contract assertions.

---

## Backlog — Still Desired, Not Scheduled

Carryover from the original v1.1–v1.3 ROADMAP. Items move from this list into a release only when a plan file is written and the work is actually executed. Nothing here is promised against a version number.

### Hooks

- [ ] **console-log-auditor** — language-aware scan for debug statements (`console.log` / `print(` / `System.out.println` / `fmt.Println`) in `PostToolUse`. Advisory, never blocks. Low priority.
- [ ] **prompt-injection-guard** — `PreToolUse` on tools that ingest external content (`WebFetch`, `Read` outside cwd, MCP tool results). Blocks on known injection markers. High-value safety; needs heuristic-tuning care to avoid false positives.
- [ ] **Subagent context-injection** — the original intent behind the "SubagentStart hook" line in the v1.2 backlog. Cannot be done via `SubagentStart` (that event is observational); needs a `PreToolUse`-on-`Task` hook design that mutates `tool_input` before the subagent's prompt is locked. Separate design cycle.
- [-] **pre-commit-quality-gate** — *superseded*. `validate.js` + the release gate cover most of this; the remaining run-tests-before-commit need can be a single `PostToolUse` on `Bash`.
- [-] **cost-tracker** — *superseded* by `cost-profiler.js` shipped in v1.2.0. `.claude/metrics/baseline.json` replaces the JSONL log idea.

### Language Rules

- [x] **TypeScript** (`rules/typescript/`) — shipped in v2.1.0.
- [ ] **Go** (`rules/go/`) — still desired.
- [ ] **Python** (`rules/python/`) — still desired.
- [ ] **Kotlin** (`rules/kotlin/`) — still desired.

Each follows the `rules/java/` template: 4 files (coding-style, patterns, security, testing), each ≤40 lines, `paths:` frontmatter activates on file extension.

### Command Depth

- [ ] **`/forge sprint --think`** — explore ≥3 approaches in `PLAN.md` before task-breakdown, each with explicit trade-offs. Leans on `sc-spec-panel` skill.
- [ ] **`/forge sprint --delegate`** — pause after `PLAN.md` for human approval via a `HOLD.md` marker in `.claude/pipeline/`. Resume with `/forge sprint --resume`.

### Pipeline Discipline

- [ ] **Pre-implementation 5-dimension confidence scorecard** — would gate `@paige-product`'s plan output. **Needs a design spec** (`.claude/pipeline/DESIGN-confidence-scorecard.md`) naming the 5 dimensions, scoring rubric, and gate behavior before any code. Not scheduled — unscoped.
- [ ] **Wave orchestration integration checkpoints** — partially shipped in v1.0.0 via `task-breakdown`; the explicit between-wave checkpoint is still an open gap. Likely surfaces as an addition to one of the existing session hooks once a concrete need lands.

### Distribution & Testing

- [x] **Smoke test suite** — shipped in v2.1.0 (`scripts/test-hooks.js`, 37 contract assertions after v2.2.0's extension).
- [x] **AGENTS.md reference** — shipped in v2.1.0.
- [ ] **`npm prepublishOnly`** — one-line: run `validate.js` + `test-hooks.js` before `npm publish`. Small change.
- [ ] **Agent integration tests** (`scripts/test-agents.js`) — verify each agent's frontmatter, tools, example triggers, read-only tool-list discipline.
- [ ] **HOOKS.md consolidated reference** — parallel to AGENTS.md, but for hooks.
- [ ] **`install.sh`** — cross-shell POSIX install script mirroring the 3 install profiles. Tested on macOS (zsh + bash), Ubuntu 22.04, Windows WSL2.
- [ ] **`install.ps1`** — PowerShell parity for `install.sh`. Lower priority than the shell version.

---

Forward-looking ideas that are **not** carryover from the original v1.x backlog. Each must pass the "earn its spot" gate (*Guiding Principles*, last bullet) — i.e., show it's not duplicating an existing skill or agent capability. **None of these has a release slot**; each requires its own plan + design spec before any code lands.

### UI/UX Intelligence Upgrade — `@una-ux` + `@effie-frontend` + `design-system`

**Reference**: [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) — 161 industry-specific design-reasoning rules, 67 UI style templates, 161 color palettes, 57 font pairings, 25 chart recommendations, and a hierarchical design-system retrieval pattern (`MASTER.md` + per-page overrides).

**Why desired**: ohmyclaude's current `@una-ux` (UX research pre-dev) and `skills/design-system/` cover methodology but ship no content library. A designer asking `@una-ux` for "a dashboard for a fintech B2B product" today gets principles; ui-ux-pro-max would give a grounded palette + typography + component recommendations matched to the product category.

**Architectural tension — must resolve before scoping**:
ui-ux-pro-max installs via its own `uipro-cli`, writing Python scripts and CSV databases into the consumer's repo. This **conflicts with the v1.3.0 invariant** above: *"the plugin still ships md + js only, nothing installed on the client."* Taking the skill as a hard dependency would break that invariant.

**Two candidate integration paths** (a future design spec picks one):

- **Path A — Soft-dependency tier** (mirrors the `codegraph → code-review-graph → tree → grep` exploration ladder). Detect if `~/.claude/skills/ui-ux-pro-max/` is present; if yes, `@una-ux` and `@effie-frontend` delegate to it for palette/typography queries; if no, fall back to the native `design-system` skill. Zero install footprint added by ohmyclaude itself; user opts in via `uipro init --ai claude --global`.
- **Path B — Inspiration-only pattern port**. Adopt the *hierarchical design-system retrieval* pattern (`MASTER.md` global rules + `pages/[page].md` overrides) into `skills/design-system/references/` as a pure-markdown structure. No external dep, no Python, no auto-install. Loses the 161-rule reasoning engine but keeps ohmyclaude's purity invariant.

**Acceptance criteria if scoped in**:
1. Design spec at `.claude/pipeline/DESIGN-ui-ux-intel.md` picks Path A or B with explicit rationale.
2. If Path A: `hooks/ui-ux-probe.js` follows the pattern of `hooks/graph-update.js` — graceful no-op when absent, no errors.
3. If Path B: `skills/design-system/SKILL.md` stays ≤400 lines; hierarchical pattern lives in `references/`.
4. `@una-ux` and `@effie-frontend` frontmatter / prompts updated in the same commit; `docs/OPERATING.md` agent table annotated.

**Status**: Not scoped. Open question: does the VNG Games internal design-system (a frequent user workflow) diverge enough from ui-ux-pro-max's 161 product categories that Path B is strictly better?

---

## Guiding Principles

**The model IS the agent. Build harnesses, not prompt chains.** Tools + knowledge + permissions = effective orchestration.

**Skills are reference material, not instructions.** Progressive disclosure: SKILL.md is concise (≤400 lines, enforced), `references/` has depth.

**Hooks are defensive infrastructure.** Clear failure mode, deterministic exit code, graceful no-op when dependency absent.

**Every new feature must be removable.** Delete one file or comment one line in hooks.json.

**Token budgets are explicit.** Skill ≤400 lines, agent description ≤30 words, model selection justified in PR.

**Subtract before adding.** v2.0.0's refactor was subtractive: remove verb-wrappers, enforce caps, honest ROADMAP. Additive work earns its spot by showing it's not duplicating what already exists.
