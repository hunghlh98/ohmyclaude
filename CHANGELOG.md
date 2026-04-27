# Changelog

All notable changes to ohmyclaude are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versioning: [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- `scripts/test-agents.js` — agent frontmatter discipline validator (description ≤30 words, tools shape, color, three-tier read-only discipline, `<example>` block presence). 11 agents × ~12 checks = 139 assertions.
- `npm prepublishOnly` — runs `validate.js`, `test-hooks.js`, `test-agents.js`, `test-probe.js` before `npm publish`. Complements CI; catches drift on local publish.
- `npm run test:agents` and `npm run test:probe` script entries.
- **`db_state` real backend** in `scripts/mcp-servers/probe.js` — DSN-dispatch to `sqlite3` / `psql` / `mysql` CLIs via `OHMYCLAUDE_DB_DSN`. Closes the v3.0.0 stub. Includes safety envelope: `$N` parameter substitution with post-substitution mutation re-check, configurable timeout (`OHMYCLAUDE_DB_TIMEOUT_MS`, default 5000), row cap (`OHMYCLAUDE_DB_MAX_ROWS`, default 1000), output redaction for AWS keys / PEM blocks / GitHub PATs / OpenAI-style secret keys. Probe MCP version bumped 0.1.0 → 0.2.0.
- `scripts/test-probe.js` — 6 smoke assertions against the probe MCP (5 `db_state` paths against an ephemeral sqlite fixture + 1 `http_probe` round-trip). Network test gated by `OHMYCLAUDE_TEST_OFFLINE=1` for CI.
- CI step: `apt-get install sqlite3` + `node scripts/test-probe.js` with `OHMYCLAUDE_TEST_OFFLINE=1` so the network assertion gracefully skips on GitHub Actions runners.

### Changed
- `CLAUDE.md` "Read-only agents" paragraph rewritten as three explicit tool tiers (strict-readonly · implementation-restricted · implementer). The previous one-liner asserted `artie-arch` and `una-ux` were read-only despite both shipping `Write`; the rewrite resolves that drift and adds `val-evaluator` (v3.0.0) to strict-readonly.
- `agents/artie-arch.md` description: removed misleading "Read-only" phrasing — Artie writes SDD artifacts but never edits user code.
- `agents/val-evaluator.md` Probe DSL row for `db_state` documents the `OHMYCLAUDE_DB_DSN` contract and tunables.
- `docs/OPERATING.md` Part 1 preface updated to the three-tier framing, replacing the "read-only agents never carry Write" generalization that contradicted the per-agent rows below it.

## [3.0.0] — 2026-04-27

**Breaking workflow change**: structural generator/evaluator separation. `@val-evaluator` is the verdict authority on every /forge run; `@quinn-qa` no longer issues PASS/FAIL on her own tests; `@beck-backend` and `@effie-frontend` cannot interpret a green build as success.

### Added
- **`@val-evaluator` agent** (`agents/val-evaluator.md`, sonnet, read-only — Read+Bash+Grep+Glob, no Write/Edit). Co-signs `CONTRACT-<id>.md`, runs tests, runs probes, issues PASS/FAIL. Cannot patch failing tests by design. Module: `agents-evaluator` (default profile).
- **Sprint contract artifact** `CONTRACT-<id>.md` written to `.claude/pipeline/`. Weighted criteria table (sums to 100) where each row has a runnable probe spec. Co-signed by Paige + Val before any code starts.
- **`write-contract` skill** (`skills/write-contract/SKILL.md` + `references/calibration-examples.md`). Schema spec + Probe DSL (http_probe / db_state / playwright / shell) + one PASS and one FAIL worked example for few-shot evaluator calibration.
- **`evaluator-tuning` skill** (`skills/evaluator-tuning/SKILL.md`). Documents the read-logs → find-divergence → update-prompt loop. Operational practice; runs on user clock, not in /forge.
- **`ohmyclaude-probe` MCP server** (`scripts/mcp-servers/probe.js`, stdlib-only Node ~470L). Two tools: `http_probe` (full implementation — assert on status / JSON-path / headers) and `db_state` (v3.0.0 stub — validates SELECT-only queries, returns not_configured with re-routing instructions; real backend lands in v3.x).
- **`/forge` Step 4.5 — Sprint Contract Negotiation**. Inserted between Step 4 (Classify and decompose) and Step 5 (Spawn specialists). No code starts until `signed: true` on CONTRACT.

### Changed
- `@quinn-qa` tools: dropped `Bash`. Quinn writes tests; Val runs them. Quinn's TEST-<id>.md schema reduced to plan + cases section; verdict + Fuzz Results owned by Val.
- `@beck-backend` and `@effie-frontend` prompts: explicit "do not interpret a green build as success — Val's verdict is success" guidance.
- `@paige-product` Step 4.5 added: drafts CONTRACT, awaits Val's signature, then proceeds to Step 5.
- 11 agents (was 10), 17 skills (was 15), 21 install modules (was 21 — `skills-contract` + `agents-evaluator` added; counts stayed flat because `mcp-servers` paths were extended in-place rather than splitting into a new module).

### Rationale
- Applied the GAN-inspired Planner → Generator ⇄ Evaluator pattern from Anthropic Labs' [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (Rajasekaran 2026). The paper's central finding: *"Out of the box, Claude is a poor QA agent... agents praise their own work."* Self-evaluation blindness was structurally embedded in v2.x — Quinn writing AND grading tests, Beck/Effie self-checking before review. v3.0.0 makes the separation structural rather than aspirational.
- Cost discipline: ≈ +$0.18 per /forge feature run vs v2.5.1 baseline ($0.68 → ~$0.86, +26%). The `evaluator-tuning` skill's loop measures whether rework reduction recovers that cost. If `cost-profiler.js` reports `cost_over_p95` repeatedly with no observed defect-prevention lift, env-var disable path is one line away.
- See `.claude/plans/from-knowledge-from-recall-foamy-yeti.md` for full design justification.

## [2.6.0] — 2026-04-27

### Removed
- 6 skills deleted (21 → 15): `write-sdd`, `write-code-review`, `write-security-review`, `write-ux-spec` (schemas already inlined in consuming agents); `sc-pm` (duplicate of Paige's inline Step 5 orchestration); `sc-estimate` (duplicate of `task-breakdown` SP matrix).
- 7 hook registrations removed from `hooks/hooks.json` (×4 events: PreToolUse + Stop + SessionStart + UserPromptSubmit for `usage-tracker.js`; PostToolUse for `backlog-tracker.js`; Stop for `session-summary.js` and `team-cleanup.js`). Scripts retained in repo for re-enable via custom settings.json.
- 3 hook registrations removed from `hooks/hooks.json` (`session-load.js` SessionStart, `state-snapshot.js` PreCompact, `subagent-trace.js` SubagentStart). Scripts retained.
- 70 lines of inlined per-language review checklists from `agents/stan-standards.md` (280L → 218L); Stan now reads `rules/<lang>/*.md` on-demand.
- `MultiEdit` tool from `agents/beck-backend.md` and `agents/effie-frontend.md` (Vault Pattern 8: progressive tool disclosure).
- Routing-heuristic table from `agents/paige-product.md` (the authoritative copy lives in `commands/forge.md`; drift risk eliminated).
- `full` install profile (collapsed; `power` replaces it). `skills-pipeline` install module entirely.

### Changed
- Install profiles: `minimal` + `default` (was `standard`) + `power` (was `full`). Two distinct tiers instead of three.
- `hooks-tracking` and `hooks-usage` modules marked `stability: experimental`; both already `defaultInstall: false`.
- `manifests/install-modules.json` 22 → 21 entries (`skills-pipeline` removed).

### Rationale
- Applied harness paper "ablate one component at a time" methodology (Anthropic Labs, Rajasekaran 2026) under Opus 4.7 / 1M context. Components encoding model-capability assumptions from the Sonnet 4.5 / Opus 4.6 era no longer load-bearing. See `.claude/plans/from-knowledge-from-recall-foamy-yeti.md` for full justification per cut.

## [2.5.1] — 2026-04-25

### Added
- Per-hook env-var opt-out `OHMYCLAUDE_HOOK_<NAME>=off` via `hooks/scripts/_toggle.js`; all 12 hooks honor it (legacy `OHMYCLAUDE_USAGE_TRACKING=off` kept as alias).
- `validate.js` skill-glob drift check (glob-vs-disk registration mismatch) and underscore-prefix exclusion from hook inventory.
- `docs/OPERATING.md` Part 4 documents ship-vs-dev script boundary; Part 2 adds tier overview of 5 install modules.
- 13 new hook contract assertions in `test-hooks.js` (47 → 60 total).
- `.gitignore` allow-list for `scripts/mcp-servers/` (only shipped `fs.js` permitted; dev-personal MCPs blocked at `git add`).

### Changed
- `docs/OPERATING.md` Part 2 expanded 6 → 12 hooks; dropped stale `graph-update` section replaced by current hook set.
- `README.md` shrunk duplicated Agents table, Hooks table, and Cost Profiler section to pointers into OPERATING.md / TOKENS.md (-33 lines).
- `ROADMAP.md` pruned shipped-release narratives (v1.x–v2.2); CHANGELOG is now the authoritative release log (209 → 115 lines).
- Split oversized `references/*.md` files at H2 boundaries: `c4-architecture/{advanced-patterns, c4-syntax, common-mistakes}.md` and `qa-test-planner/{test_case_templates, bug_report_templates}.md`.
- `docs/TOKENS.md` expanded cost-profiler anomaly-flag detail; corrected stale `graph-update` reference to `code-review-graph-setup`.

### Removed
- Relocated dev-personal `debug-log.js` MCP out of `scripts/mcp-servers/`; that directory now ships `fs.js` only.
- Archived `MIGRATION.md` (0.x → 1.0 upgrade) to `docs/archive/MIGRATION-1.0.md`; v1.0+ upgrade guidance lives in CHANGELOG.

## [2.5.0] — 2026-04-25

### Removed
- Dropped 15 orphan/auto-trigger-only skills: api-design, database-schema-designer, design-system, error-handling, game-changing-features, git-workflow, readme-templates, requirements-clarity, tdd-patterns, java-coding-standards, springboot-patterns, springboot-security, springboot-tdd, datadog-cli, generate-fuzz-data. 36 → 21 skills.
- Removed `AGENTS.md`; canonical agent content lives in `agents/*.md`.

### Changed
- Compressed CHANGELOG 616 → 364 lines; enforced Keep-a-Changelog format (no preambles, no Philosophy sections, flat `### Changed`).
- Updated README skill counts/lists, profile descriptions, and SECURITY Supported Versions table to reflect current state.

### Added
- `CONTRIBUTING.md` — Changelog Conventions section locks future entries to 1-line bullets, no preambles, max 5 bullets per section.

## [2.4.6] — 2026-04-25

### Changed
- Consolidated plugin state under `.claude/.ohmyclaude/` (usage, backlog, pipeline, metrics, local.yaml, CLAUDE.md).
- `project-init` and `code-review-graph-setup` merge-preserve `features.*` blocks on write.
- `CLAUDE.md` injection is additive via `<!-- BEGIN/END: ohmyclaude -->` markers, not file generation.
- `project-init` writes init banner to stdout (fixes invisible-banner bug from v2.4.5).

### Migration
- Consumers from v2.4.5 must delete stale `.claude/ohmyclaude/` and `.claude/{usage,backlog,pipeline,metrics}/` trees to re-scaffold at new paths.

## [2.4.5] — 2026-04-24

### Added
- `hooks/scripts/project-init.js` — SessionStart hook that scaffolds `.claude/ohmyclaude/` on first launch in a consumer git root.

### Changed
- `hooks/hooks.json` — SessionStart entry inserted first so dependent hooks see scaffolded dirs.
- `README.md` — Hooks table expanded to 11 rows, inventory count bumped to 12.

## [2.4.4] — 2026-04-24

### Removed
- Root `.mcp.json` — dev-personal MCPs (`exa-search`, `grep-app`) no longer live in repo; route to user scope (`~/.claude/settings.json` or `~/.claude/mcp/`).

### Changed
- `.gitignore` — `/.mcp.json` anchored so `.claude-plugin/.mcp.json` is unaffected.
- `CLAUDE.md` — External Dependency Decision Rule rewritten; dev-personal MCPs route to user scope.
- `CONTRIBUTING.md` — External Dependencies examples updated to `ohmyclaude-fs` and `code-review-graph`.

## [2.4.3] — 2026-04-24

### Fixed
- `hooks/hooks.json` — removed trailing comma that broke strict JSON parsing after v2.4.2 hook reload.

## [2.4.2] — 2026-04-24

### Added
- `code-review-graph` MCP re-adopted (28 tools via `uvx code-review-graph serve`; opt-in `mcp-code-review-graph` module). Requires `uv` on PATH.
- `.claude/ohmyclaude.local.yaml` — per-project YAML state file with extensible `features.<name>.*` schema.
- `hooks/scripts/code-review-graph-setup.js` — SessionStart hook that detects `uv` and writes status to local YAML.

### Changed
- `README.md` — Exploration Tool Priority: code-review-graph promoted to tier 1.
- `manifests/install-profiles.json` — `full` description mentions graph backend and `uv` prereq.
- `.gitignore` — added `.claude/*.local.*` pattern.
- `scripts/test-hooks.js` — 3 new setup-hook assertions; removed 2 dead `graph-update.js` tests.

## [2.4.1] — 2026-04-24

### Changed
- `CLAUDE.md` compacted 188 → 94 lines; External Dependency 9-step checklist moved to `CONTRIBUTING.md`.

### Fixed
- `usage-tracker.js` + `cost-profiler.js` — accept `Agent` (plus legacy `Task`) as subagent-spawn tool name.
- `usage-tracker.js` — dedup `forge_run_end` emission; adds `via: /forge` vs `ad-hoc` provenance.

### Added
- Dashboard telemetry: `bash_cmd_mix`, `mcp_mix`, `offered_tools` + `offered_skills`, retroactive backfill, run-detail agent resolution.

## [2.4.0] — 2026-04-24

### Added
- `ohmyclaude-fs` stdio MCP server (`scripts/mcp-servers/fs.js`) — first plugin-owned MCP; exposes `tree` as named trackable tool.
- ROADMAP near-term backlog entry: "Graph backend re-adoption (pending decision)".

### Removed
- Graph-backend references across 8 agents, `forge.md`, and 3 skills (codegraph and code-review-graph both stripped).
- `hooks-graph` install module, `hooks/scripts/graph-update.js`, SECURITY.md graph mention.

### Changed
- `skills/java-source-intel/SKILL.md` rewritten — 6 canonical Java query patterns via ripgrep + find.
- `agents/paige-product.md` — tools reduced to `["Read","Write"]`; Paige consumes `project-discovery` output and no longer reads code.
- `skills/project-discovery/SKILL.md` — primary tool is `mcp__ohmyclaude-fs__tree` with Bash `tree` fallback.
- Install profiles — `standard` and `full` include `mcp-servers` by default; `minimal` remains MCP-free.

## [2.3.4] — 2026-04-24

### Changed
- Dashboard Logs tab demoted to a Settings drawer (gear icon) with error-count badge.
- Insights promoted to top-level tab: theme-pill filtering, free-text search, card list with `<mark>` highlighting.
- `compute_summary()` — `insights.recent` raised 10 → 50.

## [2.3.3] — 2026-04-24

### Changed
- `cost-profiler.js` — adds `SEED_BASELINE` constant + `readBaselineMerged()` helper.
- `.gitignore` — `.claude/metrics/` added so rolling baseline stops showing as working-tree changes.

### Removed
- `.claude/metrics/baseline.json` as shipped seed data — hook now provides its own fallback.

## [2.3.2] — 2026-04-24

### Removed
- `/forge --dry-run` subcommand and `hooks/scripts/dry-run.js` (−319 LOC); regex classifier duplicated @paige-product's routing with weaker heuristics.
- 3 dry-run contract tests from `scripts/test-hooks.js` (49 → 46).

### Changed
- `profile-run` skill Mode 3 (`--calibrate`) re-anchored to split `PROFILE-*.md` into 30-day / 30–90-day windows and report drift.

## [2.3.1] — 2026-04-23

### Added
- `skill_invoke` events carry `trigger: "user_slash" | "model_auto"` via one-shot `pending_slash_skill` state.
- Plugin dimension on `skill_invoke`, `agent_spawn`, slash-command `user_prompt` when name contains `:` prefix.
- `user_prompt` events carry `affirmation_signal` + derived `sentiment` tag (correction | affirmation | neutral).
- `scripts/usage-report.js` — Skill triggers, Plugins, Prompt sentiment sections; aggregate.json gains matching keys.
- Dashboard `/api/summary` parity; 4 new hook smoke tests (49 contracts total).

### Changed
- `usage-tracker.js` — adds `AFFIRMATION_RE`, `splitPlugin()` helper, session state `pending_slash_skill`.

## [2.3.0] — 2026-04-23

### Added
- `hooks/scripts/usage-tracker.js` — SessionStart/UserPromptSubmit/PreToolUse/Stop; appends metadata-only events to `<cwd>/.claude/usage/events.jsonl`. Opt-out via `OHMYCLAUDE_USAGE_TRACKING=off`.
- `scripts/usage-report.js` — zero-dep Node reporter; writes `insights.md` + `aggregate.json`.
- `scripts/dashboard/` — local-only Python stdlib dashboard (127.0.0.1 only) with Metrics and Logs tabs.
- `hooks-usage` install module (experimental, `full`-only).
- 8 hook smoke tests for usage-tracker (45 contracts total).

### Changed
- `cost-profiler.js` — subagent name resolution via transcript walk (fixes "unknown" pooling); upserts `.claude/metrics/runs/_index.jsonl` on Stop.
- `hooks/hooks.json` — registers `UserPromptSubmit`; wires usage-tracker.
- `package.json` — new `usage-report`, `dashboard` scripts.

### Fixed
- Baselines stop being pooled under "unknown".
- Dashboard empty-state on legacy repos (synthesizes summaries from snap dirs).
- Chart.js unbounded growth (fixed-height `.chart-box` wrappers).

## [2.2.0] — 2026-04-22

### Added
- `/save` command + `skills/save/` — captures session pipeline state to `~/.claude/ohmyclaude/sessions/<session_id>/`.
- `/load` command + `skills/load/` — read-only; `/load`, `/load <session_id>`, `/load --list`.
- `session-load.js`, `state-snapshot.js`, `subagent-trace.js` — SessionStart / PreCompact / SubagentStart hooks.
- `hooks-session`, `skills-session`, `commands-session` install modules (opt-in, `full` profile only).
- 10 new hook contract tests (37 total).

### Changed
- `hooks/hooks.json` — registers `SessionStart`, `PreCompact`, `SubagentStart`.
- `manifests/install-profiles.json` — `full` expanded with session modules.

## [2.1.0] — 2026-04-22

### Added
- `rules/typescript/` — 4 path-activated rule files mirroring `rules/java/`.
- `scripts/test-hooks.js` — 27 contract assertions across 8 hook scripts; hermetic via `HOME` override.
- `AGENTS.md` — consolidated agent directory at repo root.
- `scripts/validate.js` — `paths:` frontmatter enforcement for rules, AGENTS.md presence check, `test:hooks` script enforcement.
- `.github/workflows/ci.yml` — runs validate + test-hooks + test-sc-fallback on push/PR.

### Changed
- `manifests/install-modules.json` — new `rules-typescript` module.
- `manifests/install-profiles.json` — `standard` and `full` include `rules-typescript`.

## [2.0.0] — 2026-04-22

### BREAKING
- Removed 8 SuperClaude verb-wrapper skills: sc-analyze, sc-build, sc-design, sc-document, sc-implement, sc-improve, sc-test, sc-troubleshoot. Agents handle these verbs inline.
- `skills-superclaude` install module shrinks 13 → 5 paths.

### Added
- `scripts/validate.js` — SKILL.md ≤400-line cap enforcement; CHANGELOG↔VERSION release gate; ROADMAP↔VERSION advisory.
- `docs/OPERATING.md` Part 3 — Release Gate section.

### Changed
- `ROADMAP.md` rewritten with Process Invariant, truthful "What Actually Shipped", v2.0.0 work log, deferred backlog.
- `skills/qa-test-planner/SKILL.md` split 758 → 258 lines.
- `skills/database-schema-designer/SKILL.md` split 688 → 280 lines.
- `skills/design-system/SKILL.md` split 604 → 171 lines.
- `commands/forge.md` SuperClaude section renamed to "Knowledge Skills"; table shrunk 10 → 5 rows.

### Removed
- 8 sc-* verb-wrapper skill directories (−~1,400 LOC).

## [1.3.0] — 2026-04-21

### Added
- `skills/java-source-intel/` — Java semantic-query skill with 6 canonical patterns (callers, @Transactional, Spring stereotypes, impact, endpoint→DB, inheritors).

### Changed
- `hooks/scripts/graph-update.js` — probes codegraph first, falls back to code-review-graph, silent skip.
- `skills/project-discovery/SKILL.md` — 4-tier exploration: codegraph → code-review-graph → tree → grep.
- `commands/forge.md` Step-1 discovery rewritten; references `java-source-intel` for Java.
- `CLAUDE.md`, `README.md`, `manifests/install-modules.json` — updated for dual-backend probing.

## [1.2.0] — 2026-04-21

### Added
- `hooks/scripts/cost-profiler.js` — SubagentStop + Stop hook; writes `PROFILE-<runId>.md` via transcript parsing. Zero agent-side cost.
- `skills/profile-run/` — interprets PROFILE + baseline; anomaly flags; `--calibrate` drift audit.
- `.claude/metrics/baseline.json` seeded with dry-run priors per scenario and agent.
- `hooks-profiler` install module (in `full`; opt-in on `standard`).
- `hooks/scripts/dry-run.js` + `/forge --dry-run` — pure Node classifier + router + cost estimator.

### Changed
- `hooks/hooks.json` — registers `SubagentStop`; cost-profiler on Stop.
- `manifests/install-modules.json` — `hooks-profiler` module; `skills-specialized` gains `profile-run`.
- `@paige-product` — `profile-run` in SuperClaude table; "Post-Run Cost Surface" in SUMMARY.

## [1.1.0] — 2026-04-21

### Added
- `skills/sc-*/` — 13 SuperClaude verb-skills inlined from SuperClaude_Plugin v4.3.0 (MIT).
- `## SuperClaude Integration` sections in 6 previously-unwired agents.
- `## SuperClaude Verb Map` in `commands/forge.md`.

### Changed
- `agents/{paige-product,artie-arch,una-ux,sam-sec}.md` — legacy `sc:sc-<verb>` refs removed; now bare `sc-<verb>`.
- `docs/superclaude-integration.md` rewritten for inlining.
- `scripts/test-sc-fallback.js` — contract inverted: proves no external `sc:sc-<verb>` refs remain.
- `manifests/install-modules.json` + `install-profiles.json` — `skills-superclaude` lists 13 inlined skills; in `standard` and `full`.

### Removed
- External SuperClaude peer dependency.
- Fallback clauses from every agent's SC section.

## [1.0.2] — 2026-04-20

### Added
- `docs/OPERATING.md`, `docs/pipeline-schema.md`, `docs/TOKENS.md` — operator reference, artifact schema, cost transparency.
- `.claude/pipeline/README.md` — artifact directory index.
- `MIGRATION.md` — 0.x → 1.0 upgrade guide.

### Changed
- `docs/README.md` split into "Product Docs" and "Research Material".
- `package.json` files — adds `docs/` and `MIGRATION.md` to shipped tarball.

## [1.0.1] — 2026-04-20

### Added
- `LICENSE` (MIT), `SECURITY.md` (vulnerability-report policy, triage SLA, scope).
- `docs/README.md`, `.claude/pipeline/PLAN-001.md`.

### Changed
- `package.json` description matches `plugin.json`; files array drops `contexts/`, adds `rules/`, CHANGELOG/CONTRIBUTING/COC/LICENSE/SECURITY.

### Removed
- Stale `note.md` at repo root.

## [1.0.0] — 2026-04-08

### Added
- Agent Teams coordination model (TeamCreate/SendMessage/TaskList).
- Single `/forge` entry point absorbing /review, /debug, /commit via natural-language routing.
- Smart UX with 3-level confidence model (HIGH/MEDIUM/LOW → 0/1/2-3 questions).
- Task dependency graph with parallel wave execution (`task-breakdown` skill).
- 4 Java/Spring Boot skills; language rules system with path-based activation; source graph integration.

### BREAKING
- Agents consolidated 17 → 10 (paige-product absorbs scout-sprint; stan-standards absorbs percy-perf + polyglot-reviewer; devon-ops absorbs dora-docs + evan-evangelist).
- Commands consolidated: /review, /debug, /commit, /setup removed; all absorbed into /forge.
- Contexts removed (claude-oss/dev/review/debug aliases retired); shell alias installation removed from postinstall.js.

### Changed
- Dynamic routing replaces rigid Routes A-E.
- Install profiles simplified 5 → 3 (minimal, standard, full).
- Circuit Breaker uses AskUserQuestion instead of DEADLOCK files.

### Removed
- 7 agents: scout-sprint, percy-perf, polyglot-reviewer, dora-docs, evan-evangelist, build-resolver, anna-analytics.
- 7 skills: circuit-breaker, backend-to-frontend-handoff, frontend-to-backend-requirements, sc-adviser, professional-communication, lesson-learned, draft-announcement.
- 4 commands (/review, /debug, /commit, /setup); shell aliases.

## [0.5.0] — 2026-04-05

### Removed
- `knowledge/`, `venv/`, `note.md`, `rules/` (v0.5 content migrated to agent constraints), `manifests/install-components.json`.

### Fixed
- Version skew across VERSION / package.json / marketplace.json.
- 3 skill `name:` fields mismatched folder names.
- 19 skills missing `origin: ohmyclaude` — all 27 now have it.
- Stale Greek agent references in polyglot-reviewer, heracles, sam-sec.

### Changed
- `manifests/install-modules.json` — `skills-core` replaced with 3-category taxonomy (engineering / pipeline-artifacts / pipeline-mechanics).
- `manifests/install-profiles.json` — `minimal` skill-free; `developer` (default) uses `skills-engineering`; new `pipeline` profile.
- `scripts/validate.js` — skill frontmatter checks, hook syntax validation, install-module path existence, Greek-name scan.

### Added
- `schemas/skill.schema.json`, `.claude/skills/README.md`, `CHANGELOG.md`.

## [0.4.0] — 2025-08-31

### Added
- 22 new skills across pipeline artifact writers, pipeline mechanics, and general engineering categories.

## [0.3.0] — 2025-08-28

### Added
- 5 agents: una-ux, effie-frontend, devon-ops, evan-evangelist, anna-analytics.
- `/forge` command with subcommands (init, request, triage, sprint, release, analyze).
- Dynamic routing model (Routes A–E); document-driven pipeline with 10 named artifacts.
- Circuit Breaker (3-strike rule); `backlog-tracker.js` hook; `oss.md` context.

### Changed
- 9 agents renamed Greek → Corporate Slack personas.
- `sam-sec` absorbs `eris` (adversarial scenarios).
- All agents rewritten with explicit domain authority, conflict rules, artifact schemas.

### Removed
- `/ultrawork`, `/plan`, `/scaffold` commands; `plan.md`, `research.md` contexts; `eris` agent.

## [0.2.7] — 2025-08-27

### Changed
- ROADMAP rewritten for v0.2.6 state + v0.3.0–v1.0.0 plan.

## [0.2.6] — 2025-08-26

### Changed
- Replaced custom MCP LSP server with native `.lsp.json` config.

### Removed
- `mcp/` directory.

## [0.2.5] — 2025-08-25

### Fixed
- `postinstall.js` — consume trailing newline when replacing alias block; handle partial block.

## [0.2.4] — 2025-08-24

### Fixed
- `/setup` — use `${CLAUDE_PLUGIN_ROOT}` with braces for template substitution.

## [0.2.3] — 2025-08-23

### Fixed
- Add `polyglot` profile to `--list-profiles`; fix README profile flag; add upgrade instructions.

## [0.2.2] — 2025-08-22

### Fixed
- `/setup` — use `$CLAUDE_PLUGIN_ROOT` instead of hardcoded path.

## [0.2.0] — 2025-07-15

### Added
- `polyglot-reviewer` and `build-resolver` agents (Java, Kotlin, Go, Python, Rust, TS, C++, Flutter/Dart, SQL).

## [0.1.2] — 2025-07-10

### Changed
- Enhanced all 11 agent character and behavior.

## [0.1.0] — 2025-07-01

### Added
- Initial release: 11 agents (Greek names), 5 skills, hooks, contexts, install profiles.
