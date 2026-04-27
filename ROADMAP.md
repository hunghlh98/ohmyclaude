# ohmyclaude Roadmap

## Process Invariant

**Every release must diff against this file in the same commit.** If the release ships something not listed here, either (a) update ROADMAP.md to reflect the shipped scope, or (b) hold the release until the planning doc catches up. Enforced via `scripts/validate.js` as an advisory check.

**No two minor releases within 24 hours** without an explicit `RELEASE-CUT.md` artifact in `.claude/pipeline/`. A fast cadence is fine; an invisible cadence is not.

---

## Current State (2026-04-25)

- **Last shipped**: `v2.5.0` — lightweight skill reset (see CHANGELOG.md for full entry).
- **In-flight**: `[Unreleased]` in CHANGELOG tracks the current follow-up round (dev-MCP relocation, skill-glob validator, hook-toggle convention, reference-file splits, README↔docs dedup).
- **Nothing else scheduled**. The backlog below is an honest inventory of what's *still desired* — not a release calendar. Items move from backlog → release only when explicitly planned in a plan file and executed in a session.
- **Scope discipline**: each backlog item carries one of four statuses — `[ ]` still desired · `[x]` shipped · `[~]` partially shipped · `[-]` superseded / dropped. No item lists a target version until the moment it's being implemented. v2.0.0's whole thesis was that aspirational version pins cause drift.

---

## Shipped History

Authoritative release log: **[CHANGELOG.md](CHANGELOG.md)**. It records every v1.0 → v2.6 release with its actual diff.

Context on milestones not obvious from a diff:

- **v1.0.0 — harness-engineering overhaul** (2026-04-08): 17 agents consolidated to 10, single `/forge` entry, document-driven pipeline, install profiles simplified to 3. Full notes: CHANGELOG `## [1.0.0]`.
- **v2.0.0 — subtractive refactor** (2026-04-22): addressed drift between stated invariants and shipped state. Three findings drove the work — (1) roadmap fiction across v1.1/v1.2/v1.3, (2) three SKILL.md files over the 400-line cap, (3) 8 SuperClaude verb-wrappers duplicating agent docstrings. No new capabilities; only enforcement + honest documentation. Full notes: CHANGELOG `## [2.0.0]`.
- **v2.2.0 — session intelligence** (2026-04-22): `/save`, `/load`, three new SessionStart/PreCompact/SubagentStart hooks. Opt-in bundle (`full` profile only). Full notes: CHANGELOG `## [2.2.0]`.
- **v2.6.0 — load-bearing ablation under Opus 4.7** (2026-04-27): re-applied the harness-paper methodology (Anthropic Labs, Rajasekaran 2026) — *every harness component encodes an assumption about what the model can't do alone; those assumptions go stale as models improve*. Cut 6 skills (21→15) where Opus 4.7 produces native output, dropped 10 hook registrations from `hooks.json` whose telemetry never changed agent behavior, collapsed 3 install profiles to 2, removed inline language checklists in stan-standards (now consults `rules/<lang>/`), removed routing-table duplication between Paige and forge.md. Subtractive only — no new capabilities. Full notes: CHANGELOG `## [2.6.0]`.
- **v3.0.0 — generator/evaluator separation** (2026-04-27): structural fix for self-evaluation blindness identified in the same harness paper — *"agents praise their own work."* Added `@val-evaluator` (read-only verdict authority), `CONTRACT-<id>.md` sprint contracts (weighted criteria + runnable probe specs, co-signed before code starts), `ohmyclaude-probe` MCP (`http_probe` full impl, `db_state` v3.0.0 stub). Quinn dropped Bash (writes tests but doesn't run them); Beck/Effie cannot interpret green builds as success. /forge inserted Step 4.5 (Contract Negotiation). Major bump: breaking workflow. Full notes: CHANGELOG `## [3.0.0]`.

For any release not called out above, read the CHANGELOG entry directly — this file does not mirror it.

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

- [x] **Smoke test suite** — shipped in v2.1.0 (`scripts/test-hooks.js`, 60 contract assertions after v2.5.1's per-hook toggle additions).
- [x] **AGENTS.md reference** — shipped in v2.1.0, later absorbed into `agents/` frontmatter docs in v2.5.0.
- [x] **`npm prepublishOnly`** — shipped in `[Unreleased]`; chains `validate.js && test-hooks.js && test-agents.js` before `npm publish`.
- [x] **Agent integration tests** (`scripts/test-agents.js`) — shipped in `[Unreleased]`; 139 assertions across 11 agents covering frontmatter, tools shape, three-tier read-only discipline, `<example>` block presence. The validator surfaced and resolved a documented-but-unenforced read-only contract drift in `CLAUDE.md` (artie-arch / una-ux had `Write` despite the doc declaring them read-only).
- [ ] **HOOKS.md consolidated reference** — directory-entry index for hooks, one section per hook script.
- [ ] **`install.sh`** — cross-shell POSIX install script mirroring the 3 install profiles. Tested on macOS (zsh + bash), Ubuntu 22.04, Windows WSL2.
- [ ] **`install.ps1`** — PowerShell parity for `install.sh`. Lower priority than the shell version.

### Harness Audit Gaps (raised by `/recall harness` audit, 2026-04-27)

Items where v2.6.0 + v3.0.0 documented a vault principle but didn't fully implement it. Tracked as honest debt rather than silently skipped. Source: [[knowledge/harness-design-long-running-apps]] + [[research/agentic-harness-patterns]] + [[research/claude-code-harness-engineering]].

**Methodology debt** (highest priority — the harness paper's central practice):
- [ ] **Empirical ablation loop unexecuted.** v2.6.0's plan documented a baseline-corpus → per-cut measurement procedure (`hooks-profiler` + `hooks-usage` enabled, 6 scenarios × 3 reps as decision gate). Cuts landed reasoning-first. Run the baseline against current v3.0.0 surface and validate or revert each cut + the +26% v3.0.0 cost claim. Cite: harness paper, "Methodology for simplification: Remove one component at a time, measure impact."
- [ ] **Evaluator tuning enforcement.** `skills/evaluator-tuning/SKILL.md` documents the read-logs → find-divergence → patch loop, but no schedule or trigger wires it in. Currently aspirational practice. Options: a `/forge tune-eval` subcommand, a SessionStart hint after N runs, or a calendar-driven reminder.
- [ ] **Calibration-read enforcement.** `@val-evaluator`'s prompt says "read `references/calibration-examples.md` before scoring, every run." No enforcement — Val could skip it silently. A pre-grade hook or a validate.js check on TEST artifacts could close this.

**Runtime tooling debt** (the `db_state` + Playwright gaps from harness paper Section "Give evaluators runtime tools, not static artifacts"):
- [ ] **`db_state` real backend.** v3.0.0 ships the schema + safety check (mutation-keyword denylist) but returns `not_configured` at runtime. Implement DSN-based dispatch to `sqlite3` / `psql` / `mysql` CLI. Likely wants a small empirical-usage window first to see what schemes consumers actually use.
- [ ] **Playwright MCP shipped (not just companion).** Currently documented as opt-in companion via `npx @playwright/mcp`. FE behavioral probes fall to Bash. Options: bundle `@playwright/mcp` as a power-profile module, or write a thin stdlib-only wrapper following `fs.js` / `probe.js` pattern.
- [ ] **HUMAN-VERDICT UX.** The artifact format is documented in `evaluator-tuning` skill but no /forge surface prompts humans to write it. Without uptake, the tuning loop has no input. Options: `/forge disagree <id>` subcommand, or a Stop hook that checks for verdict disagreements.

**Structural debt** (vault patterns documented but not implemented):
- [ ] **Pattern 8 — Parallel worktrees** ([[research/agentic-harness-patterns]] + [[research/claude-code-harness-engineering]]). ohmyclaude uses in-process `TeamCreate`, not git worktrees. True parallel feature dev across module boundaries with file conflicts is constrained. Multi-feature `/forge sprint --size 3` would benefit most.
- [ ] **Pattern 3 + 4 — Tiered Memory + Memory Consolidation** ([[research/agentic-harness-patterns]]). Cross-`/forge` memory remains absent. Each run starts fresh; `post-deploy-analytics` is the only cross-run signal and it's informal. A `consolidator` agent reading recent PROFILE-* + SUMMARY-* and writing `MEMORY-<cwd>.md` for Paige to consult at Step 1 would close this.
- [ ] **Mid-flight checkpoint over end-to-end /forge** ([[research/claude-code-harness-engineering]]). /forge runs end-to-end; partial-failure recovery requires re-running from scratch. The retired session-intelligence bundle was the closest mechanism — re-evaluate whether a focused checkpoint hook earns its spot.
- [ ] **Builder Bash strip (Option 2 from v3.0.0 plan).** Beck/Effie can still self-execute via `Bash` (`npm test`, `mvn verify`). Option 1 (prompt-level "do not interpret green build as success") shipped in v3.0.0; Option 2 (strip `Bash` from builders so only Val executes) would close the structural fix completely. Cost: every Beck commit triggers a Val spawn. Worth measuring after the empirical loop runs.

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
