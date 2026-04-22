# Changelog

All notable changes to ohmyclaude are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versioning: [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [2.0.0] — 2026-04-22

Restore Invariants — a subtractive refactor prompted by a spec-panel review that surfaced a 100% divergence between ROADMAP.md and what actually shipped in v1.1-v1.3, plus three SKILL.md files violating the plugin's own ≤400-line cap, plus 8 SuperClaude verb-wrapper skills that duplicated agent docstrings for zero added knowledge. No new features. Everything added in v2.0.0 is enforcement; everything removed is redundancy.

### BREAKING

- **8 SuperClaude verb-wrapper skills removed**: `sc-analyze`, `sc-build`, `sc-design`, `sc-document`, `sc-implement`, `sc-improve`, `sc-test`, `sc-troubleshoot`. Agents handle these verbs inline via their own instructions. Users who explicitly loaded any of these skill names must update to agent-native flows or install SuperClaude_Plugin standalone.
- **`skills-superclaude` install module** shrinks from 13 to 5 paths. Any third-party manifest referencing the removed skills will fail `validate.js`.

### Added

- `scripts/validate.js` — **SKILL.md ≤400-line cap enforcement** (was stated in CLAUDE.md, not enforced). All `skills/*/SKILL.md` must comply; CI fails if any exceed 400 lines.
- `scripts/validate.js` — **CHANGELOG ↔ VERSION release gate**: bumping VERSION requires a matching `## [X.Y.Z]` section in CHANGELOG.md. Hard fail.
- `scripts/validate.js` — **ROADMAP ↔ VERSION advisory**: soft warning if ROADMAP.md doesn't reference the current version or the word "shipped". Surfaces the Process Invariant without blocking release.
- `docs/OPERATING.md` — new "Part 3 — Release Gate" section documenting what the gate checks, what it does NOT check, and the canonical release flow.
- `.claude/pipeline/REFACTOR-BASELINE-v1.3.0.md` — evidence artifact pinning pre-refactor state (line counts, reference maps, roadmap drift) so future audits can diff against it.

### Changed

- `ROADMAP.md` — **rewritten**. New structure: Process Invariant at top, truthful "What Actually Shipped (v1.0 → v1.3)" record, "v2.0.0 — Restore Invariants" work log, "v2.1+ — Deferred From Original v1.1/v1.2 Roadmap" backlog with per-item decision status.
- `skills/qa-test-planner/SKILL.md` — split 758 → 258 lines. New `references/`: `test_plan_template.md`, `examples.md` (joining existing references/).
- `skills/database-schema-designer/SKILL.md` — split 688 → 280 lines. New `references/`: `normalization.md`, `data-types.md`, `indexing.md`, `constraints.md`, `relationships.md`, `nosql.md`, `migrations.md`, `performance.md`.
- `skills/design-system/SKILL.md` — split 604 → 171 lines. New `references/`: `tokens.md`, `components.md`, `a11y-patterns.md`, `theming.md`, `workflow.md`.
- `commands/forge.md` — "SuperClaude Verb Map" renamed to "SuperClaude Knowledge Skills"; table shrunk from 10 rows (13-verb mapping) to 5 rows (5 knowledge-skill mapping). The distinction between knowledge and verb-wrapper is now explicit.
- `docs/superclaude-integration.md` — rewritten with a "v2.0.0 Change — Subtract the Verb-Wrappers" section at top, Agent↔Skill mapping shrunk to the 4 agents still using SC (paige-product, artie-arch, una-ux, sam-sec), "Version Pinning" section updated to the 5-skill stable subset.
- `docs/TOKENS.md` — "Structural wins (PLAN-001 Phase 3)" section rewritten around v2.0.0's skill subtraction and 400-line cap; cost-tracker forward-reference replaced with cost-profiler description shipped in v1.2.0.
- `scripts/test-sc-fallback.js` — stable-subset list shrunk from 13 to 5; `RETIRED_NAMES` list extended with the 8 removed verb-wrappers; `HISTORY_DOC_EXEMPT` set added to exempt `docs/superclaude-integration.md` from retired-name and bare-ref checks (it authoritatively describes the removal).
- `manifests/install-modules.json` — `skills-superclaude` description and paths array updated to 5 knowledge-skills.
- `agents/heracles.md`, `agents/stan-standards.md`, `agents/beck-backend.md`, `agents/effie-frontend.md`, `agents/quinn-qa.md`, `agents/devon-ops.md` — entire `## SuperClaude Integration` section removed; these agents now fully self-contained.
- `agents/artie-arch.md`, `agents/una-ux.md`, `agents/sam-sec.md` — `sc-design` / `sc-analyze` references pruned from the integration table; `sc-research` and `sc-spec-panel` retained.

### Removed

- `skills/sc-analyze/`, `skills/sc-build/`, `skills/sc-design/`, `skills/sc-document/`, `skills/sc-implement/`, `skills/sc-improve/`, `skills/sc-test/`, `skills/sc-troubleshoot/` — 8 verb-wrapper skills that duplicated agent docstrings for zero added knowledge. ~1,400 lines of upstream MIT drift surface gone.

### Philosophy

v2.0.0 is the version where the plugin lives up to its own stated invariants. The CLAUDE.md rules ("Skills stay under 400 lines", "Every new feature must be removable") had drifted from enforcement. The roadmap had drifted from reality. The SuperClaude inlining overshot its own thesis ("load knowledge on-demand"). This release doesn't add capability — it restores coherence. Additive work resumes at v2.1.

## [1.3.0] — 2026-04-21

Graph Backend Pluralism — the exploration-tool tier list is now `codegraph → code-review-graph → tree → grep`, all soft-detected at runtime. The plugin ships exactly the same files; nothing new is installed on the client's machine. If the user has a graph backend (either one), agents use it; if not, they fall through to ripgrep. The new `java-source-intel` skill is the first consumer — it routes Java semantic queries to whichever backend is present.

### Added
- `skills/java-source-intel/` — Java semantic-query skill. Canonical patterns for 6 question types (callers, `@Transactional` boundaries, Spring bean inventory, impact radius, endpoint→DB traces, interface inheritors). Routes across graph backends in priority order: codegraph → code-review-graph → ripgrep. Read-only; used by @beck-backend, @stan-standards, @heracles, @artie-arch, @sam-sec.

### Changed
- `hooks/scripts/graph-update.js` — incremental-sync hook now probes **codegraph first** (`codegraph sync --quiet` when `.codegraph/` exists), then falls back to `code-review-graph update --incremental`, then silently skips. Passes stdin through unchanged; always exits 0.
- `skills/project-discovery/SKILL.md` — tool priority list extended to `codegraph → code-review-graph → tree → grep` with soft-detect probes per tier. Install suggestions are rate-limited to once per session. Java detection now activates `java-source-intel`.
- `commands/forge.md` — Step-1 discovery rewritten to reflect the 4-tier exploration priority and reference `java-source-intel` for Java projects.
- `CLAUDE.md` — "Exploration Tool Priority" section updated to list codegraph as tier 1 and emphasize that all graph backends are soft dependencies.
- `manifests/install-modules.json` — `skills-java` module adds `skills/java-source-intel/`; `hooks-graph` description updated to reflect dual-backend probing.
- `README.md` — "Source Graph Integration" section rewritten to make the opt-in / soft-dependency nature explicit, lists both codegraph and code-review-graph as unlock paths.

### Philosophy
All three tools (`tree`, `tree-sitter-*`-based graphs, codegraph) are **inlined as behavior**, not as install steps. The plugin ships md + js; nothing is installed on the client's machine by `claude plugin install`. Agents detect at runtime and degrade gracefully — harnesses, not prompt chains.

## [1.2.0] — 2026-04-21

Cost Profiler Harness — measurement-driven observability for `/forge` runs. Every Agent Teams run now emits structured telemetry, compared against a rolling baseline, so harness tuning is evidence-based rather than intuition-based.

### Added
- `hooks/scripts/cost-profiler.js` — SubagentStop + Stop hook. Parses `transcript.jsonl`, diffs per-agent deltas, writes `.claude/pipeline/PROFILE-<runId>.md` on Stop. Non-fatal: passes through and exits 0 on any error. Zero token cost on agents.
- `skills/profile-run/` — interpretation skill. Reads PROFILE artifacts + `baseline.json`, surfaces anomaly flags (`turn_explosion`, `cost_over_p95`, `cache_miss_spike`, `opus_budget_breach`), recommends concrete tuning. Has `--calibrate` mode for quarterly drift audit against dry-run priors.
- `.claude/metrics/baseline.json` — seeded with dry-run priors per scenario (full-app $1.43, feature $0.68, hotfix $0.38, docs $0.05) and per agent (mean_in, mean_out, p95_usd, turns_p95). Rolling N=20 maintained by `cost-profiler.js`.
- `hooks-profiler` install module; included in `full` profile. Opt-in on `standard`.
- New agent frontmatter integration in `@paige-product`: `profile-run` skill entry in SuperClaude Integration table; "Post-Run Cost Surface" section in Teams Coordination adds one cost line to SUMMARY artifacts when PROFILE is present.

### Changed
- `hooks/hooks.json` — registers `SubagentStop` (new event type for this plugin) and appends cost-profiler to Stop. Both async, timeout 5-10s.
- `manifests/install-modules.json` — adds `hooks-profiler` module; `skills-specialized` gains `skills/profile-run/`.
- `manifests/install-profiles.json` — `full` profile includes `hooks-profiler`.

### Philosophy
Agents stay blind to the profiler. All measurement happens in-hook, off the Claude side, parsing a transcript the platform already writes. "Build harnesses, not prompt chains" — this is the harness layer.

### Pipeline Simulator (`/forge --dry-run`)
- `hooks/scripts/dry-run.js` — pure Node classifier + router + cost estimator. Regex-classifies the request against the 9 intent types (feature, bug, enhancement, refactor, docs, security, boilerplate, debug, review), infers P0 / arch / FE / BE signals, picks an agent route via the same heuristic table as `@paige-product`, counts files via a depth-3 walk, and reads `.claude/metrics/baseline.json` for cost priors (falls back to dry-run defaults if missing).
- `commands/forge.md` — new `/forge --dry-run <request>` subcommand. Emits a structured report (human-readable by default, `--json` flag available) and invokes zero agents. Intended for sprint budgeting, route sanity-checks, and explaining the pipeline.
- No new manifest entries needed — `dry-run.js` sits in the already-shipped `hooks/scripts/` directory. Paired with `commands/forge.md` which is part of the `commands` install module.

## [1.1.0] — 2026-04-21

SuperClaude Inlining (γ) — Phase 3 of `PLAN-001`. Every SC verb ohmyclaude agents reference is now shipped in-tree; no external peer dependency, no fallback paths. Agent behaviors are unchanged in intent but sharper in contract.

### Added
- `skills/sc-*/` — 13 SuperClaude verb-skills inlined from [SuperClaude_Plugin](https://github.com/SuperClaude-Org/SuperClaude_Plugin) v4.3.0 (MIT): `sc-brainstorm`, `sc-research`, `sc-spec-panel`, `sc-pm`, `sc-estimate`, `sc-design`, `sc-analyze`, `sc-implement`, `sc-build`, `sc-test`, `sc-improve`, `sc-troubleshoot`, `sc-document`. Each skill preserves upstream attribution (MIT) in frontmatter + `## Attribution` section, with ohmyclaude-specific adaptations called out where applied.
- `## SuperClaude Integration` section in all 6 previously-unwired agents: `@beck-backend` (sc-implement + sc-build), `@effie-frontend` (sc-implement + sc-build), `@quinn-qa` (sc-test), `@stan-standards` (sc-analyze + sc-improve), `@heracles` (sc-troubleshoot), `@devon-ops` (sc-document).
- `## SuperClaude Verb Map` section in `commands/forge.md` — stage → agent → verb reference table.

### Changed
- `agents/paige-product.md`, `agents/artie-arch.md`, `agents/una-ux.md`, `agents/sam-sec.md` — removed legacy `sc:sc-<verb>` external references and fallback clauses; references are now bare `sc-<verb>` pointing at inlined skills.
- `docs/superclaude-integration.md` — rewritten for γ. Removed "fallback contract" section (no longer applicable); added "Inlining — What Changed and Why" and an explicit attribution section.
- `scripts/test-sc-fallback.js` — contract inverted. Previously proved every external reference had a fallback clause; now proves no external `sc:sc-<verb>` references remain (the bare form is required), all bare references name a known verb, and retired names are absent.
- `manifests/install-modules.json` — `skills-superclaude` module now lists all 13 inlined skills.
- `manifests/install-profiles.json` — `standard` and `full` profiles include `skills-superclaude`.

### Removed
- External SuperClaude peer dependency. Users install ohmyclaude and every verb its agents reference is present.
- "Fallback" clauses from every agent's SC Integration section — dead code in an always-present-verb world.

## [1.0.2] — 2026-04-20

Operator Docs — Phase 2 of `PLAN-001`. Documentation-only; zero runtime behavior changes.

### Added
- `docs/OPERATING.md` — single operator reference for all 10 agents and 6 hooks (purpose, model, tools, boundaries, failure modes, how to disable).
- `docs/pipeline-schema.md` — canonical artifact schema (IDs, frontmatter, gate vs informational, lifecycle diagram).
- `docs/TOKENS.md` — cost transparency with 4-scenario cost envelope ($0.02 trivial → ~$1 complex feature → $1.50–$3.00 sprint) and ranked cost levers.
- `.claude/pipeline/README.md` — index for runtime artifact directory.
- `MIGRATION.md` — 0.x → 1.0 upgrade guide covering retired agents, retired commands, shell-alias removal, and profile consolidation.
- README footer links to product docs.

### Changed
- `docs/README.md` — split into "Product Docs" (shipped) and "Research Material" (not shipped) sections.
- `package.json` files array: add `docs/` and `MIGRATION.md` so product docs ship in the npm tarball.

## [1.0.1] — 2026-04-20

Trust & Transparency — OSS hygiene pass. Phase 1 of `PLAN-001` (spec-panel self-improvement plan). No runtime behavior changes.

### Added
- `LICENSE` (MIT) at repo root — unblocks OSS publication.
- `SECURITY.md` with vulnerability-report policy, triage SLA, and scope boundaries.
- `docs/README.md` — index for research/reference material in `docs/en/` and `docs/vi/`.
- `.claude/pipeline/PLAN-001.md` — self-improvement plan from spec-panel review (rev 2 with SuperClaude integration).
- README footer links to `CHANGELOG`, `SECURITY`, `LICENSE`.

### Changed
- `package.json`: description now matches `plugin.json` ("10-agent OSS pipeline..."), `files` array drops retired `contexts/`, adds `rules/`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `SECURITY.md`.

### Removed
- Stale `note.md` at repo root — its TODO items are addressed in v1.0.0 (pipeline folder, AskUserQuestion confidence model, c4-architecture skill); CHANGELOG v0.5.0 erroneously claimed this file was already removed.

---

## [1.0.0] — 2026-04-08

Harness Engineering Overhaul — the v1.0.0 release.

### Added
- Agent Teams coordination model (TeamCreate/SendMessage/TaskList) for runtime orchestration
- Single `/forge` entry point — absorbs /review, /debug, /commit into natural-language routing
- Smart UX with 3-level confidence model (HIGH/MEDIUM/LOW → 0/1/2-3 clarifying questions)
- Task dependency graph with parallel wave execution (`task-breakdown` skill)
- Project discovery phase — detects language, framework, CLAUDE.md, source graph before routing
- 4 Java / Spring Boot skills: `java-coding-standards`, `springboot-patterns`, `springboot-tdd`, `springboot-security`
- Language rules system with path-based activation (`rules/java/`, `rules/common/`)
- Source graph integration (code-review-graph, optional) — semantic search, blast radius, architecture overview
- `project-discovery` skill for automated project context detection
- `post-deploy-analytics` skill (replaces anna-analytics agent)
- `graph-update` hook — incremental source graph update after code changes
- `team-cleanup` hook — clean orphaned Agent Teams older than 24h
- Exploration tool priority: tree-sitter > `tree` CLI > Glob/Grep
- Agent `color` field and `<example>` blocks for reliable triggering (official plugin-dev pattern)
- Agent description budget: ≤30 words (token cost optimization)

### Changed
- **BREAKING**: Agents consolidated from 17 to 10 — paige-product absorbs scout-sprint, stan-standards absorbs percy-perf + polyglot-reviewer, devon-ops absorbs dora-docs + evan-evangelist
- **BREAKING**: Commands consolidated — /review, /debug, /commit, /setup removed as standalone; all absorbed into `/forge`
- **BREAKING**: Contexts removed — claude-oss, claude-dev, claude-review, claude-debug aliases retired
- **BREAKING**: Shell alias installation removed from postinstall.js — zero-setup model
- Dynamic routing replaces rigid Routes A-E — @paige-product uses adaptive heuristics
- Install profiles simplified from 5 to 3 (minimal, standard, full)
- Install modules restructured for 10-agent model with Java skills and rules
- Pipeline artifacts kept for human review (PRD, SDD, CODE-REVIEW, RELEASE) — Teams messaging used for coordination
- Circuit Breaker now uses AskUserQuestion instead of DEADLOCK files

### Removed
- 7 agents: scout-sprint, percy-perf, polyglot-reviewer, dora-docs, evan-evangelist, build-resolver, anna-analytics
- 7 skills: circuit-breaker, backend-to-frontend-handoff, frontend-to-backend-requirements, sc-adviser, professional-communication, lesson-learned, draft-announcement
- 4 standalone commands: /review, /debug, /commit, /setup
- 4 contexts: oss.md, dev.md, review.md, debug.md
- Shell aliases (claude-oss, claude-dev, claude-review, claude-debug)

---

## [0.5.0] — 2026-04-05

Source Clarity — no new features, strictly cleanup and structural consistency.

### Removed
- `knowledge/` directory (superseded planning docs with stale Greek agent names)
- `venv/` directory (stale Python virtualenv, no Python code in project)
- `note.md` (untracked TODO file)
- `rules/` directory (content migrated to agent constraints; not loadable by plugin system)
- `manifests/install-components.json` (v0.1.0 artifact, obsolete)
- Dead `bin` field and `mcp/`, `rules/` entries from `package.json` `files` array

### Fixed
- Version skew: `VERSION`, `package.json`, `marketplace.json` now all match `plugin.json` at 0.4.0
- 3 skill `name:` fields mismatched their folder names (`backend-to-frontend-handoff`, `design-system`, `readme-templates`) — folder is now canonical
- 19 skills were missing `origin: ohmyclaude` frontmatter — all 27 skills now have it
- `reducing-entropy` declared manual-only in its description but lacked `trigger: explicit` frontmatter guard
- `polyglot-reviewer.md`, `heracles.md`, `sam-sec.md` referenced stale Greek agent names — updated to current Corporate Slack names
- `venv/` added to `.gitignore`

### Changed
- `manifests/install-modules.json`: replaced flat `skills-core` with 3-category taxonomy: `skills-engineering` (16 standalone skills), `skills-pipeline-artifacts` (5 agent-invoked writers), `skills-pipeline-mechanics` (6 internal coordination skills). Removed `rules-core` and dead `mcp-lsp` modules. Bumped to v0.4.0.
- `manifests/install-profiles.json`: `minimal` profile no longer includes skills; `developer` (default) uses `skills-engineering`; new `pipeline` profile includes all 3 skill modules; `security` profile replaced by `pipeline` (was broken, referenced `mcp-lsp`). Bumped to v0.4.0.
- `scripts/validate.js`: expanded with skill frontmatter checks (name/folder match, origin, description), hook syntax validation via `node --check`, install-module path existence, stale Greek agent name scan
- `agents/stan-standards.md`: added **Hard Limits** section to checklist (function max 50 lines, file max 400 lines, no `var`, no `any` in TypeScript, no TODO in merged code)
- `agents/beck-backend.md`, `agents/effie-frontend.md`: added dependency guardrails and secrets policy from former `rules/engineering-standards.md`

### Added
- `schemas/skill.schema.json` — canonical frontmatter contract for ohmyclaude skills
- `.claude/skills/README.md` — documents dev-only skills in `.claude/skills/` vs shipped skills in `skills/`
- `CHANGELOG.md` — this file, backfilled from git log

---

## [0.4.0] — 2025-08-31

Full 27-skill set for the 14-agent pipeline.

### Added
- 22 new skills across three categories:
  - **Pipeline artifact writers**: `write-ux-spec`, `write-sdd`, `write-security-review`, `write-code-review`, `draft-announcement`
  - **Pipeline mechanics**: `circuit-breaker`, `backend-to-frontend-handoff`, `frontend-to-backend-requirements`, `sc-adviser`, `lesson-learned`, `reducing-entropy`
  - **General engineering**: `c4-architecture`, `database-schema-designer`, `design-system`, `qa-test-planner`, `commit-work`, `professional-communication`, `requirements-clarity`, `game-changing-features`, `generate-fuzz-data`, `datadog-cli`, `readme-templates`

---

## [0.3.0] — 2025-08-28

Complete architectural transformation: Corporate Slack personas, document-driven pipeline, dynamic routing.

### Added
- 5 new agents: `una-ux`, `effie-frontend`, `devon-ops`, `evan-evangelist`, `anna-analytics`
- `/forge` command — single OSS entry point with subcommands: init, request, triage, sprint, release, analyze
- Dynamic routing model (Routes A–E) — @paige-product classifies and routes each request
- Document-driven pipeline — 10 named artifacts (PRD, UX-SPEC, SDD, PLAN, CODE-DESIGN-*, IMPL-*, TEST, CODE-REVIEW, DOC, RELEASE)
- Circuit Breaker (3-strike rule) — prevents infinite review loops
- `backlog-tracker.js` hook — rebuilds BACKLOG.md index when ISS-*.md files written
- `oss.md` context (claude-oss alias) — loads the full 14-agent pipeline

### Changed
- 9 agents renamed from Greek mythology to Corporate Slack personas
- `sam-sec` absorbs `eris` (adversarial scenarios now part of security review)
- All agents rewritten with explicit domain authority, conflict rules, and artifact output schemas
- `manifests/install-modules.json` updated to new 14-agent tier structure

### Removed
- `/ultrawork`, `/plan`, `/scaffold` commands
- `plan.md`, `research.md` contexts
- `eris` agent (functionality merged into `sam-sec`)

---

## [0.2.7] — 2025-08-27

### Changed
- ROADMAP rewritten to describe v0.2.6 state and plan v0.3.0–v1.0.0

---

## [0.2.6] — 2025-08-26

### Changed
- Replaced custom MCP LSP server with native `.lsp.json` configuration

### Removed
- `mcp/` directory (MCP server implementation)

---

## [0.2.5] — 2025-08-25

### Fixed
- `postinstall.js`: consume trailing newline when replacing alias block, handle partial block

---

## [0.2.4] — 2025-08-24

### Fixed
- `/setup` command: use `${CLAUDE_PLUGIN_ROOT}` with braces for Claude Code template substitution

---

## [0.2.3] — 2025-08-23

### Fixed
- Add `polyglot` profile to `--list-profiles`, fix README profile flag, add upgrade instructions

---

## [0.2.2] — 2025-08-22

### Fixed
- `/setup` command: use `$CLAUDE_PLUGIN_ROOT` instead of hardcoded plugin path

---

## [0.2.0] — 2025-07-15

### Added
- `polyglot-reviewer` and `build-resolver` agents for multi-language support (Java, Kotlin, Go, Python, Rust, TypeScript, C++, Flutter/Dart, Database/SQL)

---

## [0.1.2] — 2025-07-10

### Changed
- Enhanced all 11 agent character and behavior

---

## [0.1.0] — 2025-07-01

### Added
- Initial release: 11 agents (Greek mythology names), 5 skills, hooks, contexts, install profiles
