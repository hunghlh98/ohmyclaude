# ohmyclaude Roadmap

## v0.2.7 — Previous Release (snapshot)

### Agents (13, Greek mythology names)
- [x] Metis, Hermes, Nemesis, Eris — orchestration
- [x] Hephaestus, Heracles, Momus, Mnemosyne — implementation + docs
- [x] Athena, Apollo, Argus — review
- [x] Polyglot Reviewer, Build Resolver — multi-language utilities

### Commands (7): /ultrawork, /plan, /review, /commit, /scaffold, /debug, /setup
### Contexts (5): dev, review, plan, debug, research
### Hooks (3): pre-write-check, post-bash-lint, session-summary

---

## v0.3.0 — OSS Company Simulation Refactor (this release)

Complete architectural transformation: Corporate Slack personas, document-driven pipeline, dynamic routing, C4 model, conflict resolution protocol, Keep a Changelog releases, backlog system.

### Agents (14 primary — renamed + rewritten)

**Renamed from Greek to Corporate Slack:**
- [x] `paige-product` (was metis) — Grand Router + Oracle Fallback synthesizer
- [x] `artie-arch` (was apollo) — C4 architect: SDD with C1-C3 Mermaid diagrams
- [x] `scout-sprint` (was hermes) — PLAN output + boilerplate scaffold
- [x] `sam-sec` (was nemesis, absorbs eris) — SAST simulation + 7 adversarial scenarios + REVIEW output
- [x] `beck-backend` (was hephaestus) — BE-only scope + CODE-DESIGN-BE + IMPL-BE + ESCALATE-ARCH
- [x] `quinn-qa` (was momus) — fuzz data generation + TEST output + Circuit Breaker aware
- [x] `stan-standards` (was athena) — CODE-REVIEW logic section + 3-Strike rule
- [x] `percy-perf` (was argus) — refocused from security to performance + CODE-REVIEW perf section
- [x] `dora-docs` (was mnemosyne) — DOC output + Keep a Changelog (append-only [Unreleased])

**New agents (5):**
- [x] `una-ux` — dual-role: UX-SPEC (pre-dev) + UX-REVIEW (post-dev), WCAG AA gatekeeper
- [x] `effie-frontend` — FE-only scope + CODE-DESIGN-FE + IMPL-FE + WCAG self-audit
- [x] `devon-ops` — SRE release manager + SemVer bump + RELEASE file + CHANGELOG promotion
- [x] `evan-evangelist` — multi-platform announcements (tweet/GitHub/newsletter)
- [x] `anna-analytics` — post-deploy telemetry + regression → ISS-NNN feedback loop

**Unchanged (utility agents):** heracles, build-resolver, polyglot-reviewer

**Deleted:** eris (adversarial scenarios absorbed into sam-sec)

### Commands
- [x] `/forge` — single OSS entry point: init, request, triage, sprint, release, analyze
- [x] Deleted: /ultrawork, /plan, /scaffold, /setup
- [x] Kept: /review, /debug, /commit

### Contexts
- [x] `oss.md` — full 14-agent pipeline, claude-oss alias
- [x] `dev.md` — updated: beck-backend + effie-frontend + quinn-qa
- [x] `review.md` — updated: stan-standards + percy-perf + sam-sec + una-ux
- [x] Deleted: plan.md, research.md

### Hooks
- [x] `backlog-tracker.js` — PostToolUse Write, rebuilds BACKLOG.md when ISS-*.md files written

### Infrastructure
- [x] `manifests/install-modules.json` — 17 modules with new tier-based grouping
- [x] `manifests/install-profiles.json` — updated to 14-agent counts, agents-community module
- [x] `hooks/hooks.json` — added backlog-tracker PostToolUse hook
- [x] `scripts/postinstall.js` — claude-oss alias, removed claude-plan/claude-research
- [x] `install.sh` — updated profile descriptions and agent counts

### Documentation
- [x] `README.md` — full rewrite: 14-agent OSS model, /forge commands, routing table
- [x] `ROADMAP.md` — this file
- [x] `CONTRIBUTING.md` — Corporate Slack naming convention, 5-tier workflow, updated PR checklist
- [x] `CODE_OF_CONDUCT.md` — "Sam Sec" replaces "Nemesis and Eris"

---

## v0.4.0 — Hook Depth

Richer automated quality signals. All hooks are standalone Node.js scripts — no new external dependencies.

### New hooks
- [ ] **console-log-auditor** (PostToolUse / Write|Edit|MultiEdit) — scan for `console.log`, `print(`, `fmt.Println`. Language-aware by extension. Non-blocking.
- [ ] **pre-commit-quality-gate** (PreToolUse / Bash — matcher: `git commit`) — run project lint + test suite before Claude-initiated commits. Blocks on failure (exit 2).
- [ ] **typescript-check** (PostToolUse / Write|Edit|MultiEdit, async) — after writing `.ts`/`.tsx`, run `npx tsc --noEmit`.
- [ ] **cost-tracker** (Stop) — extend session-summary to compute estimated USD cost. Write to `~/.claude/ohmyclaude/costs.jsonl`.
- [ ] **desktop-notify** (Stop, async) — fire desktop notification when session exceeds `OHMYCLAUDE_NOTIFY_THRESHOLD_SEC`.
- [ ] **prompt-injection-guard** (PreToolUse / Write) — detect injection patterns in writes. Blocks on match (exit 2).

### Hook infrastructure
- [ ] `hooks-extended` module in install-modules.json
- [ ] `OHMYCLAUDE_HOOKS=skip:<id>` env var — disable individual hooks at runtime

---

## v0.5.0 — Skills & Commands Expansion

### New skills
- [ ] **performance-patterns** — N+1 detection, caching strategies, batch vs stream, bundle analysis
- [ ] **security-patterns** — OWASP Top 10, input validation, parameterised queries, CSRF, secrets discipline
- [ ] **database-patterns** — reversible migrations, index design, transaction boundaries, connection pool sizing
- [ ] **frontend-patterns** — component decomposition, controlled inputs, a11y, loading/error/empty state trifecta
- [ ] **backend-patterns** — 12-factor, structured logging, graceful shutdown, idempotency keys, background jobs

### New commands
- [ ] **/compact** — phase-aware context compaction (preserves task, plan, files changed, current stage)
- [ ] **/test** — focused test runner: Jest/Vitest/pytest/go test/cargo test. On failure, passes to @heracles.

### Command flag additions
- [ ] `/forge sprint --think` — explore ≥3 approaches before committing to plan
- [ ] `/forge sprint --delegate` — pause after plan for human approval before implementation
- [ ] `/review --security` — invoke @sam-sec after @stan-standards
- [ ] `/debug --trace` — full execution-trace hypothesis before fix

---

## v0.6.0 — Orchestration Intelligence

### Confidence gate
Pre-implementation 5-dimension scorecard (requirements clarity, codebase coverage, dependency risk, test plan, rollback plan). Score < 80 → pause, targeted clarifying questions.

### Wave orchestration
Group 6+ implementation phases into parallel waves with integration checkpoints between waves.

### Session lifecycle
- [ ] **/save** — snapshot to `~/.claude/ohmyclaude/sessions/<id>.json`
- [ ] **/load [id]** — restore context, resume from next pending stage
- [ ] Stop hook extended: append to `sessions/index.jsonl`

### Context injection hook
- [ ] **SubagentStart hook** — prepend compact context block before each agent invocation in /forge sprint (original task, files changed, current stage). Eliminates agents re-exploring already-reviewed files.

---

## v1.0.0 — Polish & Distribution

No new features — reliability, documentation, distribution.

### Documentation
- [ ] `AGENTS.md` — all 14 agents: purpose, when to invoke, what it won't do, example prompts
- [ ] `HOOKS.md` — all hooks: trigger, blocking vs async, env vars, how to disable
- [ ] `COMMANDS-QUICK-REF.md` — one-page cheat sheet for all /forge subcommands and flags
- [ ] `SKILLS.md` — index of all skills with one-sentence description and primary use case

### Validation & testing
- [ ] `validate.js` expanded: all agent files have required frontmatter + personality sections, hook scripts are syntactically valid JS, all install-modules.json paths exist on disk
- [ ] Smoke test suite: fixture inputs through each hook script, asserting exit codes

### Distribution
- [ ] `marketplace.json` updated for v1.0 agent counts (14 primary)
- [ ] `install.sh` verified on macOS (zsh + bash), Ubuntu 22.04, Windows WSL2
- [ ] `install.ps1` brought to parity with `install.sh` for native Windows PowerShell
- [ ] npm `prepublishOnly` script: runs `npm run validate`, aborts on failure

---

## Guiding Principles

**Hooks are defensive infrastructure, not features.** Each hook must have a clear failure mode, a deterministic exit code, and a graceful no-op when its dependency is absent.

**Commands orchestrate agents — they don't replace them.** A command is a prompt program. Logic stays in agent `.md` files.

**Skills are reference material, not instructions.** A skill gives Claude accurate domain knowledge — not orders. Readable by a human engineer as a quality reference.

**Profiles are install-time decisions, not runtime mode switches.** Runtime variation comes from `/forge` subcommands and env vars, not profile switching.

**Every new feature must be removable.** If a hook, skill, or agent causes problems, the user should be able to remove it by deleting one file or commenting out one line in `hooks.json`.
