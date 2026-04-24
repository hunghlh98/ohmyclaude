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

Authoritative release log: **[CHANGELOG.md](CHANGELOG.md)**. It records every v1.0 → v2.5 release with its actual diff.

Context on milestones not obvious from a diff:

- **v1.0.0 — harness-engineering overhaul** (2026-04-08): 17 agents consolidated to 10, single `/forge` entry, document-driven pipeline, install profiles simplified to 3. Full notes: CHANGELOG `## [1.0.0]`.
- **v2.0.0 — subtractive refactor** (2026-04-22): addressed drift between stated invariants and shipped state. Three findings drove the work — (1) roadmap fiction across v1.1/v1.2/v1.3, (2) three SKILL.md files over the 400-line cap, (3) 8 SuperClaude verb-wrappers duplicating agent docstrings. No new capabilities; only enforcement + honest documentation. Full notes: CHANGELOG `## [2.0.0]`.
- **v2.2.0 — session intelligence** (2026-04-22): `/save`, `/load`, three new SessionStart/PreCompact/SubagentStart hooks. Opt-in bundle (`full` profile only). Full notes: CHANGELOG `## [2.2.0]`.

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
- [ ] **`npm prepublishOnly`** — one-line: run `validate.js` + `test-hooks.js` before `npm publish`. Small change.
- [ ] **Agent integration tests** (`scripts/test-agents.js`) — verify each agent's frontmatter, tools, example triggers, read-only tool-list discipline.
- [ ] **HOOKS.md consolidated reference** — directory-entry index for hooks, one section per hook script.
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
