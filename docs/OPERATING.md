# OPERATING.md — Operator Reference

The single lookup for every agent, every hook, and how they behave at runtime. If you need "what does agent X do?" or "what does hook Y cost me?", this is the one page to read.

Inventory is authoritative at install time — run `node scripts/validate.js` for the live count.

---

## Part 1 — Agents (10)

Each agent has a corporate-Slack persona with a clear lane. The pattern for every entry below:

- **Purpose** — one sentence describing the role.
- **Model** — sonnet / opus / haiku. Drives token cost.
- **Tools** — what the agent is authorized to do; read-only agents never carry `Write`/`Edit`/`MultiEdit`.
- **Invoke** — when `@paige-product` (the lead) spawns this agent during a `/forge` run.
- **What it won't do** — hard boundaries the agent is instructed to refuse.
- **Example prompt** — copy-pasteable.

### @paige-product — Team Lead + Router + Oracle

- **Purpose**: Classify intent, decompose work into tasks with a dependency graph, spawn specialists, and synthesize deadlocks.
- **Model**: `sonnet` · **Tools**: `Read`, `Grep`, `Glob`, `Write`
- **Invoke**: Every `/forge` request starts here. She is the first and last agent in the pipeline.
- **Will not**:
  - Design systems (that's `@artie-arch`).
  - Write implementation code (that's `@beck-backend` / `@effie-frontend`).
  - Review code quality (that's `@stan-standards`).
  - Ask questions whose answer would not change the plan.
  - Override `post-deploy-analytics` telemetry with intuition.
- **Example**: `/forge add rate limiting to /api/users`

### @artie-arch — Architect (C4, ADRs)

- **Purpose**: System architecture, C4 diagrams, and ADRs. Owns the **HOW**.
- **Model**: `opus` · **Tools**: `Read`, `Grep`, `Glob`, `Write` (read-only w.r.t. source; writes only SDD artifacts)
- **Invoke**: Complex features (Route D), architecture-scale changes, any `ESCALATE-ARCH` signal from a builder.
- **Will not**:
  - Implement (builder's job).
  - Audit security (that's `@sam-sec`).
  - Review code style / performance (that's `@stan-standards`).
  - Dismiss `ESCALATE-ARCH` signals.
  - Recommend a pattern just because it is modern.
- **Example**: `@artie-arch design the architecture for a real-time notification system`

### @una-ux — UX Spec + WCAG Reviewer

- **Purpose**: Dual-role — pre-dev `UX-SPEC-<id>.md`, post-dev `UX-REVIEW-<id>.md` against WCAG AA.
- **Model**: `sonnet` · **Tools**: `Read`, `Grep`, `Glob`, `Write` (pre-dev writes spec; post-dev is read-only review)
- **Invoke**: PRD has `Has_FE_Component=true`; or post-implementation when an `IMPL-FE` artifact exists.
- **Will not**:
  - Modify source code.
  - Block BE-only changes.
  - Block on aesthetic preferences (WCAG failures only).
  - Skip empty-state or error-state specs.
- **Example**: `@una-ux design the UX for the admin settings page`

### @sam-sec — Security Auditor

- **Purpose**: SAST patterns, 7-scenario adversarial matrix, OWASP coverage on Route E.
- **Model**: `sonnet` · **Tools**: `Read`, `Grep`, `Glob`, `Bash` (no Write/Edit — review only, but Bash for scans)
- **Invoke**: `Touches_Security=true` (modifies `/auth/**`, `/security/**`, `**/pom.xml`, `**/package.json`, mentions auth/tokens/CVE); Route E security patches; post-build re-review.
- **Will not**:
  - Write or modify code.
  - Raise more than 3 blocking issues per REVISE.
  - Issue a 4th REVISE — trips the Circuit Breaker instead.
  - Review code style or performance (that's `@stan-standards`).
- **Example**: `/forge fix CVE-2024-1234 in JWT validation`

### @beck-backend — Backend Builder

- **Purpose**: Implement BE features — APIs, services, DBs, queues, jobs.
- **Model**: `sonnet` · **Tools**: `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, `MultiEdit`
- **Invoke**: Task is BE-only or BE-heavy; language is a BE language (Java/Spring, Go, Python, Node, Rust).
- **Will not**:
  - Touch FE files (`*.tsx`, `*.vue`, `src/ui/**`, `components/**`, `pages/**`) — escalates to `@paige-product` for `@effie-frontend` handoff.
  - Write tests as a primary task (updates tests when behavior changes).
  - Audit security or review code quality.
  - Propose architecture — triggers `ESCALATE-ARCH-<id>.md` when new infra is needed.
- **Example**: `@beck-backend implement rate limiting on /api/users`

### @effie-frontend — Frontend Builder

- **Purpose**: Implement FE features — React/Vue/Angular, CSS, WCAG compliance.
- **Model**: `sonnet` · **Tools**: `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, `MultiEdit`
- **Invoke**: Task has FE component; UX-SPEC exists for pre-dev guidance.
- **Will not**:
  - Touch BE files (`*.java`, `*.go`, `*.py`, `src/main/java/**`, `database/**`, `migrations/**`).
  - Ship without implementing all 4 states (loading / empty / error / success) per UX-SPEC.
  - Ship without passing the WCAG self-audit.
  - Goldplate animations not in the UX-SPEC.
- **Example**: `@effie-frontend implement the settings page per UX-SPEC-003`

### @quinn-qa — Testing

- **Purpose**: Write tests with adversarial fuzz data; enforce coverage; TDD discipline.
- **Model**: `sonnet` · **Tools**: `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`
- **Invoke**: After `IMPL-BE` / `IMPL-FE` artifacts exist; coverage-gap issues; TDD-driven features.
- **Will not**:
  - Write tests that confirm implementation details (tests behavior, not method calls).
  - Mock internal domain logic (only mock at the boundary).
  - Leave flaky tests — a flaky test is worse than none.
  - Issue a 4th FAIL — trips the Circuit Breaker.
- **Example**: `@quinn-qa write tests for the new rate limiting middleware`

### @stan-standards — Code Reviewer (Logic + Performance + Language)

- **Purpose**: Multi-domain code review — correctness, performance, language idioms. Issues severity + investment signals.
- **Model**: `sonnet` · **Tools**: `Read`, `Grep`, `Glob`, `Bash` (read-only — never modifies code)
- **Invoke**: After `IMPL-*` artifacts exist; `/forge review <path>`; refactor stages.
- **Will not**:
  - Fix issues — delegates to builders.
  - Audit security deeply (that's `@sam-sec`).
  - Flag issues <80% confident in.
  - Apply a checklist for a language not present in the diff.
  - Issue a 4th `REQUEST_CHANGES` — trips the Circuit Breaker.
- **Example**: `@stan-standards review the changes in src/api/users.java`

### @devon-ops — Docs + Release + Announcement

- **Purpose**: Documentation (`DOC-<id>.md`), release cut (CHANGELOG + RELEASE artifact), and announcement drafting. The ultimate gate.
- **Model**: `haiku` (cheapest — templated work) · **Tools**: `Read`, `Write`, `Grep`, `Glob`
- **Invoke**: `/forge release`, post-merge doc updates, announcements.
- **Will not**:
  - Implement or review code.
  - Cut a release with open `DEADLOCK-<id>.md` or failed gates.
  - Yield to "just ship it" pressure.
  - Describe security vulnerabilities publicly in announcements.
  - Promise unconfirmed roadmap features.
- **Example**: `/forge release`

### @heracles — Debugger

- **Purpose**: Root-cause analysis, bisection, minimal verified fixes.
- **Model**: `sonnet` · **Tools**: `Read`, `Bash`, `Grep`, `Glob`, `Write`, `Edit`
- **Invoke**: `/forge debug <description>`; P0 incident response; flaky-test investigations.
- **Will not**:
  - Fix without a stated root cause at file:line level.
  - Refactor surrounding code while debugging.
  - Gold-plate the fix beyond what the root cause requires.
  - Declare "it seems to work" without running the full suite.
  - Escalate to a rewrite without first exhausting targeted fixes.
- **Example**: `/forge debug tests pass locally but fail in CI`

---

## Part 2 — Hooks (6)

Hooks are shell-invoked Node scripts wired via `hooks/hooks.json`. The harness, not the model, executes them. Every hook follows the stdin-passthrough pattern: it reads JSON on stdin, reasons about it, writes stdin back to stdout, and exits 0 (or exits 2 to **block** — PreToolUse only).

For each hook below:

- **Trigger** — tool event + matcher.
- **Blocking vs async** — blocking means the main conversation waits; async returns immediately.
- **Timeout** — wall-clock budget.
- **Env vars** — which env vars it reads.
- **Failure mode** — what happens when the hook errors.
- **How to disable** — remove the entry from `hooks/hooks.json` or comment the hook block.

### 1. `pre-write-check` — Secret-Blocking Guard

- **Trigger**: `PreToolUse` on `Write | Edit | MultiEdit`.
- **Blocking**: **Yes** (PreToolUse; exit code 2 blocks the tool call).
- **Timeout**: 5s.
- **Script**: `hooks/scripts/pre-write-check.js`.
- **What it does**: Scans tool input content line-by-line against a curated list of secret patterns (AWS `AKIA…`, Stripe `sk_live_…`, GitHub PATs, generic high-entropy API keys, RSA/EC private keys). Lines that match one of the SAFE_PATTERNS (`process.env.*`, `${ENV_VAR}`, `your_api_key`, `placeholder`) are skipped.
- **Env vars**: None required.
- **Failure modes**:
  - Invalid JSON on stdin → pass through, exit 0.
  - Missing `content` / `new_string` field → pass through, exit 0.
  - Pattern match → stderr warning + exit 2 (block). Agent sees the block message.
- **To disable**: remove the `PreToolUse` block from `hooks/hooks.json`, or add a keyword like `placeholder` around your real secret (not recommended).

### 2. `post-bash-lint` — Opportunistic Linter

- **Trigger**: `PostToolUse` on `Bash`.
- **Blocking**: No — `async: true`. Output streams to stderr; conversation doesn't wait.
- **Timeout**: 30s.
- **Script**: `hooks/scripts/post-bash-lint.js`.
- **What it does**: When a bash command looks source-modifying (`npm install`, `yarn add`, `pip install`, `git apply`, `git checkout`, `git stash pop`), runs `npm run lint -- --max-warnings=0` if `package.json.scripts.lint` exists.
- **Env vars**: `CLAUDE_PROJECT_ROOT` (falls back to `cwd`).
- **Failure modes**:
  - Read-only commands (`cat`, `ls`, `find`, `grep`, `git log/diff/status/show`, test runners) → skip immediately.
  - No `package.json` / no `lint` script → exit 0 silently.
  - Lint returns non-zero → stderr warning, exit 0 (not blocking).
- **To disable**: remove the `PostToolUse Bash` block from `hooks/hooks.json`, or remove the `lint` script from `package.json`.

### 3. `backlog-tracker` — BACKLOG.md Rebuilder

- **Trigger**: `PostToolUse` on `Write` — only when `file_path` includes `.claude/backlog/issues/` and ends in `.md`.
- **Blocking**: No — `async: true`.
- **Timeout**: 10s.
- **Script**: `hooks/scripts/backlog-tracker.js`.
- **What it does**: Parses every `ISS-*.md` in `.claude/backlog/issues/`, sorts by `priority` (P0→P3) then by `id`, groups by `route` (A–E), rewrites `BACKLOG.md` at the repo root.
- **Env vars**: None.
- **Failure modes**:
  - Writes outside `.claude/backlog/issues/` → skip.
  - Non-`ISS-*.md` file → skip.
  - No backlog dir → exit 0.
  - Malformed frontmatter in an issue file → that issue is excluded from the index; others still render.
- **To disable**: remove the `PostToolUse Write` block for this script from `hooks/hooks.json`.

### 4. `graph-update` — Incremental Source-Graph Sync

- **Trigger**: `PostToolUse` on `Write | Edit | MultiEdit`.
- **Blocking**: No — `async: true`.
- **Timeout**: 10s (the underlying `code-review-graph update --incremental` call is capped at 8s).
- **Script**: `hooks/scripts/graph-update.js`.
- **What it does**: Runs `which code-review-graph`; if installed, calls `code-review-graph update --incremental`. Keeps the tree-sitter knowledge graph current after code edits.
- **Env vars**: None (relies on `$PATH`).
- **Failure modes**:
  - `code-review-graph` not on PATH → exit 0 silently (zero-setup guarantee).
  - Update call fails → stderr log, exit 0.
- **To disable**: remove the `hooks-graph` module from your install, or remove the block from `hooks/hooks.json`.

### 5. `session-summary` — Per-Response Token Log

- **Trigger**: `Stop` (every assistant response).
- **Blocking**: No — `async: true`.
- **Timeout**: 10s.
- **Script**: `hooks/scripts/session-summary.js`.
- **What it does**: Appends one JSON line to `~/.claude/ohmyclaude/sessions/YYYY-MM-DD.jsonl` recording timestamp, session id, model, input/output token counts, and a 120-char preview of the last assistant message.
- **Env vars**: `CLAUDE_SESSION_ID`, `CLAUDE_MODEL` (both optional; fall back to values in stdin JSON).
- **Failure modes**:
  - Malformed stdin → exit 0.
  - Cannot create sessions dir or write → exit 0 silently (never fails the main flow).
- **To disable**: remove the `Stop` block for this script from `hooks/hooks.json`.

### 6. `team-cleanup` — Orphan Team Garbage Collector

- **Trigger**: `Stop`.
- **Blocking**: No — `async: true`.
- **Timeout**: 5s.
- **Script**: `hooks/scripts/team-cleanup.js`.
- **What it does**: Scans `~/.claude/teams/`, deletes any directory whose mtime is older than 24h, also cleans the matching `~/.claude/tasks/<team>/`.
- **Env vars**: None.
- **Failure modes**:
  - No teams dir → exit 0.
  - Per-entry errors (permissions, stat failure) → skipped, continues.
- **To disable**: remove the second `Stop` block from `hooks/hooks.json`.

---

## Hook Invariants (all 6)

The repo's hook convention, derived from these 6 implementations:

1. **Always pass stdin through** to stdout before exit — downstream hooks in the chain need it.
2. **Exit 0 = allow; exit 2 = block (PreToolUse only)**. Async hooks should never exit non-zero.
3. **Never fail loudly** when dependencies are absent — graceful no-op is the rule.
4. **Timeouts are upper bounds**, not targets. Everything above uses a budget well under its limit.
5. **Hooks are defensive infrastructure**, not AI logic. If your hook needs to call the Claude API, it's not a hook.

---

## Part 3 — Release Gate (v2.0.0+)

The release gate is enforced by `scripts/validate.js`. It makes the "three releases in one day" failure mode from v1.1–v1.3 impossible to repeat.

### What the gate checks

| Check | Severity | What it enforces |
|---|---|---|
| **SKILL.md ≤400 lines** | Fail | Every `skills/*/SKILL.md` respects the progressive-disclosure cap. Depth lives in `references/`. |
| **CHANGELOG ↔ VERSION** | Fail | `CHANGELOG.md` must contain a `## [${VERSION}]` section. Bumping VERSION without adding a changelog entry fails CI. |
| **ROADMAP ↔ VERSION** | Warn | `ROADMAP.md` should mention the current VERSION or the word "shipped". Soft warning — doesn't block release but surfaces drift. |

### What the gate does NOT check (yet)

- **Git co-modification** — whether VERSION, CHANGELOG.md, ROADMAP.md, and README.md all changed in the same commit. Best done as a pre-commit hook; not in scope for v2.0.0.
- **Soak time** — no two minor releases within 24h without a `RELEASE-CUT.md` artifact. Documented in `ROADMAP.md` Process Invariant but not mechanically enforced.

### Release flow

1. `@devon-ops` completes all gate stages (TEST=PASS, CODE-REVIEW=APPROVED, REVIEW ≠ REJECT).
2. `release-cut` skill reads `[Unreleased]` section from CHANGELOG.md, infers the SemVer bump, writes `RELEASE-vX.Y.Z.md` to `.claude/pipeline/`.
3. `scripts/bump-version.js` atomically updates VERSION, package.json, plugin.json, marketplace.json.
4. ROADMAP.md is updated in the same commit to reflect the shipped scope (Process Invariant).
5. `node scripts/validate.js` must pass — including the three gate checks above.
6. Only then: tag and publish.

### When the gate trips

- **"CHANGELOG.md has no `## [X.Y.Z]` section"** — add the entry before running the bump script. Entries under `## [Unreleased]` should be promoted to a dated section.
- **"SKILL.md exceeds cap"** — split the skill: keep orientation + decision flow in SKILL.md, move depth to `references/*.md`. See `skills/qa-test-planner/`, `skills/design-system/`, `skills/database-schema-designer/` for the v2.0.0 reference splits.
- **"ROADMAP.md does not mention vX.Y.Z"** (warning) — update ROADMAP.md's "What Actually Shipped" section to reflect the release. This is the Process Invariant in action.

---

## Related Docs

- `README.md` — install and quick start.
- `ROADMAP.md` — planned hook/agent changes by version.
- `SECURITY.md` — vulnerability report policy (`@sam-sec`'s scope is ohmyclaude's agent prompts, not user code).
- `CONTRIBUTING.md` — how to add a new agent, skill, hook, or rule.
- `docs/pipeline-schema.md` — the shape of artifacts agents write to `.claude/pipeline/`.
- `docs/TOKENS.md` — per-`/forge`-run cost envelope and the levers that move it.
