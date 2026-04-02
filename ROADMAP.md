# ohmyclaude Roadmap

## v0.2.6 — Current Release

### Agents (13)
- [x] Hermes — Orchestrator & planner
- [x] Hephaestus — Deep implementer
- [x] Athena — Code reviewer (JS/TS, React, Node — read-only)
- [x] Apollo — Architect & ADR writer (read-only)
- [x] Argus — Security reviewer — OWASP, payments, auth (read-only)
- [x] Heracles — Debugger & root-cause analyst
- [x] Momus — Test writer & TDD enforcer
- [x] Mnemosyne — Documentation writer
- [x] Metis — Requirements clarifier & pre-planning consultant
- [x] Nemesis — Plan validator (approval bias, max 3 blockers)
- [x] Eris — Devil's advocate — 7 adversarial stress-test scenarios
- [x] Polyglot Reviewer — Language-aware review: Java, Kotlin, Go, Python, Rust, TS, C++, Flutter, SQL
- [x] Build Resolver — Build error fixer: Maven, Gradle, Cargo, go mod, tsc, CMake

### Skills (5)
- [x] api-design
- [x] code-review
- [x] error-handling
- [x] git-workflow
- [x] tdd-patterns

### Commands (7)
- [x] /ultrawork — full pipeline: clarify → plan → challenge → implement → test → review → secure → document
- [x] /plan — Metis + Hermes only
- [x] /review — Athena (+ Argus with `--security`)
- [x] /commit — semantic commit message from diff
- [x] /scaffold — project boilerplate generator
- [x] /debug — root-cause investigation via Heracles
- [x] /setup — first-run after marketplace install (copies contexts, adds shell aliases)

### Contexts (5)
- [x] dev — implementation mode (Hephaestus + Momus)
- [x] review — code & security review (Athena + Argus)
- [x] plan — planning pipeline (Metis → Hermes → Nemesis)
- [x] debug — root-cause investigation (Heracles)
- [x] research — exploration mode (Metis + Apollo)

### Hooks (3)
- [x] pre-write-check — blocks writes with hardcoded secrets (PreToolUse)
- [x] post-bash-lint — runs linter after bash edits source (PostToolUse, async)
- [x] session-summary — writes session log to `~/.claude/ohmyclaude/sessions/` (Stop, async)

### Rules (1)
- [x] engineering-standards.md

### Infrastructure
- [x] Native LSP via `.lsp.json` — TS, Python, Go, Rust, Kotlin, C++, Java
- [x] MCP servers: exa-search (web search), grep-app (GitHub code search)
- [x] Profiles: minimal · developer (default) · polyglot · security · full
- [x] Module manifest system (`install-modules.json`, `install-profiles.json`, `install-components.json`)
- [x] Scripts: `bump-version.js`, `validate.js`, `install-apply.js`, `postinstall.js`
- [x] `marketplace.json` · `install.sh` one-liner · `install.ps1`

---

## v0.3.0 — Hook Depth

Richer automated quality signals. Every hook is a standalone Node.js script — no new external
dependencies beyond what already exists.

### New hooks

- [ ] **console-log-auditor** (PostToolUse / Write|Edit|MultiEdit) — scan written files for `console.log`, `print(`, `fmt.Println`, `debugPrint` and similar. Warn to stderr with file + line. Language-aware by extension. Non-blocking.
- [ ] **pre-commit-quality-gate** (PreToolUse / Bash — matcher: `git commit`) — run project lint + test suite before Claude-initiated commits (`npm run lint && npm test` / `pytest` / `go test ./...` detected from project root). Blocks on failure (exit 2).
- [ ] **typescript-check** (PostToolUse / Write|Edit|MultiEdit, async) — after writing `.ts`/`.tsx`, run `npx tsc --noEmit`. Surface type errors to stderr. No-op if no `tsconfig.json` found.
- [ ] **cost-tracker** (Stop) — extend session-summary to compute estimated USD cost (token prices in a small lookup table per model). Write to `~/.claude/ohmyclaude/costs.jsonl` with `session_id`, `date`, `model`, `input_tokens`, `output_tokens`, `estimated_usd`.
- [ ] **desktop-notify** (Stop, async) — fire desktop notification (`osascript` on macOS, `notify-send` on Linux) when session runs longer than `OHMYCLAUDE_NOTIFY_THRESHOLD_SEC` (default: 60). Graceful no-op if neither binary present.
- [ ] **prompt-injection-guard** (PreToolUse / Write|Edit|MultiEdit) — detect classic injection patterns in markdown/JSON/config writes (`\n\nIgnore previous instructions`, `<system>`, `[INST]`, `<!-- claude:`). Blocks on match (exit 2). Runs inside `pre-write-check.js` to avoid an extra process spawn.

### Hook infrastructure

- [ ] `hooks-extended` module in `install-modules.json` — included in developer / security / full, excluded from minimal
- [ ] `OHMYCLAUDE_HOOKS=skip:<id>,skip:<id>` env var — disable individual hooks at runtime without editing JSON

---

## v0.4.0 — Skills & Commands Expansion

### New skills

- [ ] **performance-patterns** — profiling-first mindset, N+1 query detection, caching strategies (memoisation, Redis, HTTP cache headers), batch vs. stream processing, frontend bundle analysis
- [ ] **security-patterns** — OWASP Top 10 quick reference, input validation, parameterised queries, CSRF protection, secure session management, secrets-in-env discipline
- [ ] **database-patterns** — migration discipline (reversible, never drop in same PR), index design, transaction boundary decisions, soft-delete vs. hard-delete, connection pool sizing, optimistic vs. pessimistic locking
- [ ] **frontend-patterns** — component decomposition, controlled vs. uncontrolled inputs, a11y basics (ARIA, keyboard nav), client-side error boundaries, loading/error/empty state trifecta
- [ ] **backend-patterns** — 12-factor discipline, structured logging, graceful shutdown, health check design, idempotency keys, rate limiting placement, background job patterns

### New commands

- [ ] **/compact** — phase-aware context compaction. Preserves: original task, current Hermes plan, files changed so far, next pending pipeline stage. Suggested proactively by Stop hook when input tokens exceed threshold. Inspired by everything-claude-code strategic-compact skill.
- [ ] **/test** — focused test runner. Detects Jest / Vitest / pytest / go test / cargo test from project root. Scoped by file: `/test path/to/file.ts`. On failure, passes output to @heracles for a first-pass root-cause read before presenting to user.

### Command flag additions

- [ ] `/ultrawork --think` — before Hermes plan, explore ≥3 approaches with reasoning before committing to one
- [ ] `/ultrawork --delegate` — pause after plan, ask user to approve before Hephaestus starts implementing
- [ ] `/review --security` — invoke @argus after @athena in the standalone review command
- [ ] `/debug --trace` — Heracles produces a full execution-trace hypothesis (suspected code path + values at each step) before proposing a fix

---

## v0.5.0 — Orchestration Intelligence

### Confidence check system

Before Hephaestus begins implementation, a **pre-implementation confidence gate** runs automatically.

Five-dimension scorecard (0–20 each, total 100):
1. Requirements clarity — acceptance criteria unambiguous?
2. Codebase coverage — all files that need to change identified?
3. Dependency risk — external dependencies well-understood?
4. Test coverage plan — test plan complete?
5. Rollback plan — safe rollback path known?

Score < 80 → pipeline pauses, presents low-scoring dimensions with targeted clarifying questions.
Score ≥ 80 → proceeds. Override with `--skip-confidence`. Scorecard included in work-complete summary.

Implemented as: new `confidence-check.md` command + optional stage in `ultrawork.md`.

### Wave orchestration

For tasks where Hermes identifies 6+ implementation phases, group into **waves** of parallel phases.

Rules:
- Phases with a shared file dependency cannot be in the same wave
- Integration checkpoint (compile + existing tests pass) required between waves
- Maximum 3 phases per wave

Auto-activated at 6+ phases, or manually with `/ultrawork --wave`. Completion summary shows wave
groupings, elapsed time per wave, and any phase promotions.

### Session lifecycle: /save and /load

- [ ] **/save** — writes snapshot to `~/.claude/ohmyclaude/sessions/<session_id>.json`: original task, Hermes plan, confidence scorecard, files changed (with diff summaries), current pipeline stage, Nemesis/Eris findings. Auto-invoked by Stop hook on any incomplete /ultrawork session.
- [ ] **/load [id]** — restores context, shows completed stages, resumes from next pending stage. `/load --search <keyword>` scans `sessions/index.jsonl` by task description.
- [ ] Stop hook extended to append searchable entry to `sessions/index.jsonl`: session_id, date, task_preview (120 chars), files_changed count, completed_stages.

### Context injection hook

- [ ] **SubagentStart hook** — before each agent invocation in the /ultrawork pipeline, prepend a compact context block: original task (1 sentence), files already changed, current stage number. ~200–400 tokens per stage; eliminates agents re-exploring already-reviewed files.

---

## v1.0.0 — Polish & Distribution

No new features — reliability, documentation, and distribution.

### Documentation
- [ ] `AGENTS.md` — all 13 agents: purpose, when to invoke directly, what it won't do, example prompts
- [ ] `HOOKS.md` — all hooks: trigger event, blocking vs. async, env vars that control behaviour, how to disable
- [ ] `COMMANDS-QUICK-REF.md` — one-page cheat sheet for all commands and flags
- [ ] `SKILLS.md` — index of all skills with one-sentence description and primary use case

### Validation & testing
- [ ] `validate.js` expanded: all agent `.md` files have required frontmatter, hook scripts are syntactically valid JS, all paths in `install-modules.json` exist on disk, all profile module IDs resolve
- [ ] Smoke test suite: fixture inputs through each hook script in isolation, asserting exit codes and stderr. Runnable via `npm test`.

### Distribution
- [ ] `marketplace.json` updated for v1.0 agent/skill/command counts
- [ ] `install.sh` verified on macOS (zsh + bash), Ubuntu 22.04 (bash), Windows WSL2 (bash)
- [ ] `install.ps1` brought to parity with `install.sh` for native Windows PowerShell
- [ ] `research` profile — contexts (research, plan) + Metis + Apollo + Eris + exa-search + grep-app, no write-capable agents. For senior engineers in pre-RFC / exploration mode.
- [ ] npm `prepublishOnly` script: runs `npm run validate`, aborts on failure

---

## Guiding Principles

**Hooks are defensive infrastructure, not features.** Each hook must have a clear failure mode
(block or warn), a deterministic exit code, and a graceful no-op path when its dependency is
absent. No hook should ever cause a Claude Code session to hang.

**Commands orchestrate agents — they don't replace them.** Commands are prompt programs. Business
logic stays in agent `.md` files. A command should be replaceable by reading the agents it calls
and knowing the order.

**Skills are reference material, not instructions.** A skill is loaded to give Claude accurate
knowledge of a domain — not to tell Claude what to do. Skills should be readable by a human
engineer as a quality reference document.

**Profiles are install-time decisions, not runtime mode switches.** A profile determines which
files land in `~/.claude/`. Runtime behaviour variation comes from command flags and env vars,
not profile switching.

**Every new feature must be removable.** If a hook, skill, or agent causes problems, the user
should be able to remove it by deleting one file or commenting out one line in `hooks.json`. No
feature should create a dependency that makes removal risky.
