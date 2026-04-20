# Changelog

All notable changes to ohmyclaude are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versioning: [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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
