# ohmyclaude Roadmap

## v1.0.0 — Harness Engineering Overhaul ✅ Complete

Major architectural transformation: Agent Teams coordination, single entry point, Java-first skills, source graph integration, token-conscious design.

### Agent Teams Model
- [x] TeamCreate/SendMessage/TaskList for runtime agent coordination
- [x] @paige-product as team lead (absorbs scout-sprint's planning duties)
- [x] Dynamic routing replaces rigid Routes A-E
- [x] Circuit Breaker via AskUserQuestion (replaces DEADLOCK files)
- [x] Task dependency graph with parallel wave execution

### Agent Consolidation (17 → 10)
- [x] `paige-product` absorbs `scout-sprint` — Grand Router + Planner + Oracle
- [x] `stan-standards` absorbs `percy-perf` + `polyglot-reviewer` — unified reviewer
- [x] `devon-ops` absorbs `dora-docs` + `evan-evangelist` — docs + release + announcement
- [x] `anna-analytics` converted to `post-deploy-analytics` skill
- [x] `build-resolver` absorbed into `beck-backend` / `effie-frontend`
- [x] All agents: `color` field, `<example>` blocks, descriptions ≤30 words

### Single Entry Point
- [x] `/forge` as the only command — absorbs /review, /debug, /commit
- [x] Shell aliases and contexts removed (zero-setup model)
- [x] Smart UX: 3-level confidence model (HIGH/MEDIUM/LOW)
- [x] Progress display during team execution

### Java-First Skills & Rules
- [x] 4 Java/Spring Boot skills: java-coding-standards, springboot-patterns, springboot-tdd, springboot-security
- [x] `rules/java/` with path-based activation (coding-style, patterns, security, testing)
- [x] `rules/common/` shared coding style

### New Skills (7)
- [x] `task-breakdown` — dependency graph with parallel waves, SP estimation, Trigger break
- [x] `project-discovery` — language/framework detection, source graph querying
- [x] `post-deploy-analytics` — post-deploy telemetry (replaces anna-analytics agent)
- [x] `java-coding-standards` — Java 17+ conventions
- [x] `springboot-patterns` — REST APIs, layered architecture, JPA, validation
- [x] `springboot-tdd` — JUnit 5, Mockito, Testcontainers, JaCoCo
- [x] `springboot-security` — Spring Security, OAuth, JWT, CSRF

### Source Graph Integration
- [x] code-review-graph MCP tools in all agent instructions (optional, graceful fallback)
- [x] Exploration tool priority: tree-sitter > `tree` CLI > Glob/Grep
- [x] `graph-update` hook for incremental graph updates after code changes
- [x] `team-cleanup` hook for orphaned team cleanup

### Infrastructure
- [x] Install profiles simplified: 5 → 3 (minimal, standard, full)
- [x] Install modules restructured for 10-agent model
- [x] validate.js: enhanced dead-reference check (retired agent names)
- [x] postinstall.js: zero-setup, print-only
- [x] Document artifacts kept for human review (PRD, SDD, CODE-REVIEW, RELEASE)

---

## v1.1.0 — Hook Depth & Language Expansion

### New hooks
- [ ] **console-log-auditor** — scan for debug statements by language
- [ ] **pre-commit-quality-gate** — run lint + tests before Claude-initiated commits
- [ ] **cost-tracker** — estimated USD cost per session to `~/.claude/ohmyclaude/costs.jsonl`
- [ ] **prompt-injection-guard** — detect injection patterns in writes

### Hook infrastructure
- [ ] `OHMYCLAUDE_HOOKS=skip:<id>` env var — disable individual hooks at runtime
- [ ] `hooks-extended` module in install-modules.json

### Language expansion (rules + skills)
- [ ] TypeScript/JavaScript rules (`rules/typescript/`)
- [ ] Go rules (`rules/go/`)
- [ ] Python rules (`rules/python/`)
- [ ] Kotlin rules (`rules/kotlin/`)

### Forge flags
- [ ] `/forge sprint --think` — explore ≥3 approaches before committing to plan
- [ ] `/forge sprint --delegate` — pause after plan for human approval before implementation

---

## v1.2.0 — Session Intelligence

### Session lifecycle
- [ ] **/save** — snapshot session state to `~/.claude/ohmyclaude/sessions/<id>.json`
- [ ] **/load [id]** — restore context, resume from next pending stage
- [ ] SessionStart hook — auto-load previous session context
- [ ] PreCompact hook — save agent state before context compaction

### Confidence gate
- [ ] Pre-implementation 5-dimension scorecard (requirements, coverage, risk, test plan, rollback)
- [ ] Score < 80 → pause, targeted clarifying questions

### Wave orchestration
- [ ] Group implementation phases into parallel waves with integration checkpoints
- [ ] SubagentStart hook — prepend compact context block before each agent invocation

---

## v1.3.0 — Distribution & Testing

### Validation & testing
- [ ] Smoke test suite: fixture inputs through each hook script, asserting exit codes
- [ ] `npm prepublishOnly` script: runs `npm run validate`, aborts on failure
- [ ] Agent integration tests: verify each agent's frontmatter, tools, and example triggers

### Distribution
- [ ] `install.sh` verified on macOS (zsh + bash), Ubuntu 22.04, Windows WSL2
- [ ] `install.ps1` parity with `install.sh` for native Windows PowerShell
- [ ] Marketplace listing updated with v1.0.0 screenshots and examples

### Documentation
- [ ] `AGENTS.md` — all 10 agents: purpose, when to invoke, what it won't do, example prompts
- [ ] `HOOKS.md` — all hooks: trigger, blocking vs async, env vars, how to disable

---

## Guiding Principles

**The model IS the agent. Build harnesses, not prompt chains.** Tools + knowledge + permissions = effective orchestration.

**Skills are reference material, not instructions.** Progressive disclosure: SKILL.md is concise, references/ has depth.

**Hooks are defensive infrastructure.** Clear failure mode, deterministic exit code, graceful no-op when dependency absent.

**Every new feature must be removable.** Delete one file or comment one line in hooks.json.

**Token budgets are explicit.** Skills ≤400 lines, agent descriptions ≤30 words, model selection justified.
