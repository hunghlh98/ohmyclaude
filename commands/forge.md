---
name: forge
description: Single entry point for the ohmyclaude pipeline. Routes work through 10 agents via Agent Teams. Subcommands — sprint, release, commit, help.
---

# /forge

Single entry point. Every task enters here. Natural language in, working software out.

## Subcommands

```
/forge <natural language>     Smart router (DEFAULT)
/forge --dry-run <request>    Simulate routing + cost without running agents
/forge sprint [--size N]      Execute sprint from backlog
/forge release                Cut release
/forge commit                 Generate semantic commit from diff
/forge help                   Show help
```

Bare `/forge <description>` is the primary interaction. It handles features, bugs, docs, security, review, debug — everything. The lead classifies intent from natural language.

---

## /forge --dry-run <request> — Pipeline Simulator

Classify, route, and estimate cost for a request WITHOUT invoking any agents. Use this to budget a sprint, sanity-check routing before a costly run, or explain the pipeline to a new teammate.

**Handling**: when the request begins with `--dry-run`, execute the simulator and return its output directly. Do NOT create a team, do NOT spawn @paige-product.

```bash
!node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/dry-run.js" "<the rest of the request>"
```

Flags on `dry-run.js`: `--json` emits structured JSON instead of a human-readable report.

**What it does**:
- Classifies via regex (mirrors @paige-product's routing table): feature, bug, enhancement, refactor, docs, security, boilerplate, debug, review
- Detects signals: FE/BE components, architectural scope, P0 priority
- Routes through the same heuristic paige would apply (single agent for debug/review, 2–3 for docs/hotfix, 5–9 for feature/arch)
- Counts files in the cwd (depth ≤3, standard ignore list) and estimates touched count by classification
- Reads `.claude/metrics/baseline.json` (if present) for per-scenario mean/p95; falls back to dry-run priors (`full-app $1.40`, `feature $0.68`, `hotfix $0.38`, `docs $0.05`)

**What it does NOT do**:
- Does not read the source graph (pure-Node, no MCP)
- Does not read CLAUDE.md or apply project-specific rules
- Does not resolve ambiguity (no clarifying questions) — classification is best-effort from the request text alone

Treat the output as an estimate, not a contract. Routing is heuristic; the real `@paige-product` may refine the plan based on codebase discovery.

---

## /forge <request> — Main Pipeline

### Step 1 — Project discovery

Before any planning, gather context. The `project-discovery` skill runs this — it **soft-detects** graph backends, so the plugin ships nothing and nothing is required.

Exploration tool priority (first match wins):

1. **codegraph** — pre-indexed tree-sitter graph ([`@colbymchenry/codegraph`](https://github.com/colbymchenry/codegraph)). Detect via `.codegraph/` directory or `mcp__codegraph__*` tools. Best for Explore-subagent orchestration (one `codegraph_explore` call returns full source sections, stops).
2. **code-review-graph** — tree-sitter graph with impact radius + review tools. Detect via `mcp__plugin_code-review-graph__*` tools.
3. **`tree` CLI** — directory structure fallback.
4. **Glob/Grep** — last resort file search.

For Java projects, the `java-source-intel` skill provides canonical query patterns (callers, impact, annotation scans, call chains) that route across whichever backend is present.

Also read: CLAUDE.md, package.json (or equivalent), language/framework detection, existing `.claude/pipeline/` state.

### Step 2 — Create Agent Team

```
TeamCreate(team_name="forge-{timestamp}")
```

### Step 3 — Spawn team lead

Spawn `@paige-product` as team lead. Pass the full request plus discovery context.

### Step 4 — Classify and decompose

@paige-product:
1. Classifies intent (feature, bug, docs, security, review, debug, refactor, etc.)
2. Assesses confidence level (HIGH / MEDIUM / LOW)
3. Decomposes into tasks using the `task-breakdown` skill pattern:
   - Each task has: agent owner, SP estimate, depends-on list
   - Identify parallel waves
   - If total SP > 13, trigger decomposition break

**3-level confidence UX:**
- **HIGH** — Execute immediately. Zero questions.
- **MEDIUM** — Ask 1 targeted question via AskUserQuestion.
- **LOW** — Ask 2-3 questions in a single AskUserQuestion.
- Never more than 3 questions. Never ask what will not change the plan.

### Step 5 — Spawn specialists and assign tasks

Lead spawns only the agents needed. Agents work their tasks, write artifacts, communicate progress via SendMessage to the lead.

### Step 6 — Lead reports progress

Display clean progress output as agents complete work:

```
Rate limiting on /api/users

  Type       Enhancement (P1)
  Route      Fast-Track
  Agents     @beck-backend, @quinn-qa, @stan-standards
  Scope      src/api/users.ts, src/middleware/

  [done]  Plan       @paige-product: 3 tasks, 2 waves
  [done]  Impl       @beck-backend: added rate-limiter middleware
  [done]  Test       @quinn-qa: 4 tests, all pass
  [live]  Review     @stan-standards checking...

  @stan-standards: APPROVED (no issues)

Complete. 3 files changed.
```

### Step 7 — Shutdown

When all tasks are complete: shutdown all teammates, TeamDelete, show summary.

---

## Dynamic Routing

@paige-product selects agents based on the request. No rigid route taxonomy — use these heuristics:

| Intent | Typical agent sequence |
|--------|----------------------|
| Docs / README | @devon-ops + @stan-standards |
| Template / boilerplate | @beck-backend or @effie-frontend + @quinn-qa + @stan-standards |
| P0 hotfix | @beck-backend or @effie-frontend + @quinn-qa + @devon-ops |
| Complex feature | @artie-arch -> @una-ux -> @sam-sec -> builders -> @quinn-qa -> @stan-standards -> @devon-ops |
| Security patch | @sam-sec -> builder -> @quinn-qa -> @sam-sec (re-review) -> @devon-ops |
| Code review | @stan-standards |
| Debug | @heracles |
| Refactor | @stan-standards -> builder -> @quinn-qa |

The lead may combine or skip agents. A docs fix does not need @artie-arch. A hotfix does not need @una-ux.

---

## Pipeline Artifacts

Agents write artifacts to `.claude/pipeline/` at gate stages. Human reviews artifacts before the pipeline advances past gate stages.

**Gate stages (human review required):**
- PRD, SDD, UX-SPEC, REVIEW, CODE-REVIEW, RELEASE

**Informational stages (pipeline continues):**
- TEST, IMPL-BE, IMPL-FE

Artifact naming: `{STAGE}-{id}.md` (e.g., `PRD-001.md`, `CODE-REVIEW-001.md`).

---

## SuperClaude Knowledge Skills

Five named-methodology skills are inlined from SuperClaude v4.3.0 (MIT) and ship with ohmyclaude. Verb-wrappers (analyze/build/design/document/implement/improve/test/troubleshoot) were removed in v2.0.0 — agents handle those inline. What remains is genuine knowledge work: named expert panels, Socratic methodology, orchestration patterns, estimation frames.

| Skill | Used by | For |
|---|---|---|
| `sc-spec-panel` | @artie-arch, @una-ux, @sam-sec | 10-expert review before finalizing SDD / UX-SPEC / REVIEW |
| `sc-brainstorm` | @paige-product | Socratic requirements discovery on LOW-confidence requests |
| `sc-pm` | @paige-product | Project-manager orchestration patterns for multi-wave sprints |
| `sc-research` | @artie-arch | Evidence-based research when SDD proposes an unfamiliar pattern |
| `sc-estimate` | @paige-product | Structured estimation frames when task-breakdown needs SP numbers |

Full mapping, attribution, and versioning: see `docs/superclaude-integration.md`.

---

## Conflict Resolution

### Domain Dictator Hierarchy

| Conflict | Winner |
|----------|--------|
| Feature WHAT vs implementation HOW | @paige-product (WHAT), @artie-arch (HOW) |
| Velocity vs security | @sam-sec always |
| UX completeness vs velocity | @una-ux on public UI (WCAG non-negotiable) |
| Release readiness vs stability | @devon-ops (ultimate gate) |

### Circuit Breaker (3-Strike Rule)

After 3 REVISE / REQUEST_CHANGES / FAIL rounds in any stage (tracked by @paige-product via SendMessage):
1. Reviewing agent emits `DEADLOCK-{id}.md`
2. All agents halt on that issue
3. @paige-product synthesizes the deadlock as a binary choice
4. AskUserQuestion presents Option A / Option B to the human
5. Pipeline resumes from the halted stage

---

## /forge sprint [--size N]

Execute a sprint from the backlog.

1. @paige-product selects N issues from `.claude/backlog/issues/` (default N=3)
2. Creates team, decomposes selected issues into tasks with dependency graph
3. Spawns agents, runs tasks (parallel where dependencies allow)
4. Each issue transitions: `backlog` -> `in-progress` -> `done`
5. On completion: updates BACKLOG.md, shows sprint summary

---

## /forge release

Cut a release. Uses the `release-cut` skill.

1. @devon-ops verifies all gates cleared (TEST=PASS, CODE-REVIEW=APPROVED)
2. Reads `[Unreleased]` from CHANGELOG.md
3. Infers SemVer bump
4. Writes `RELEASE-vX.Y.Z.md` to `.claude/pipeline/`
5. Updates CHANGELOG.md with versioned section
6. @devon-ops writes `ANNOUNCEMENT-{id}.md`

**Blocking conditions (release will not proceed):**
- Open `DEADLOCK-{id}.md` with `status: awaiting-human`
- `TEST-{id}.md` verdict is FAIL
- `CODE-REVIEW-{id}.md` verdict is REQUEST_CHANGES

---

## /forge commit

Generate a semantic commit message. No team needed — inline operation.

1. Read `git diff --staged` (fall back to `git diff` if nothing staged)
2. Analyze the nature of changes
3. Produce Conventional Commits format using the `commit-work` skill:

```
<type>(<scope>): <subject>

[optional body: why, not what]

[optional footer: Fixes #N, Co-authored-by, etc.]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

**Usage:**
```
/forge commit              Generate from current diff
/forge commit --amend      Generate for amending last commit
/forge commit --scope api  Force a specific scope
```

---

## /forge help

Print the following and stop:

```
/forge -- OSS pipeline for Claude Code

Usage:
  /forge <what you want>       Describe your task in natural language
  /forge --dry-run <request>   Simulate routing + cost, no agents invoked
  /forge sprint [--size N]     Run a sprint from the backlog
  /forge release               Cut a release
  /forge commit                Generate semantic commit message
  /forge help                  Show this help

Examples:
  /forge add rate limiting to the /api/users endpoint
  /forge fix the null pointer in payment processor
  /forge review src/auth/
  /forge update the README
  /forge debug: tests fail in CI but pass locally
  /forge --dry-run add OAuth login to /api/users

Agents:
  @paige-product  Route + plan    @beck-backend   Backend code
  @artie-arch     Architecture    @effie-frontend Frontend code
  @una-ux         UX design       @quinn-qa       Testing
  @sam-sec        Security        @stan-standards Code review
  @devon-ops      Ship + docs     @heracles       Debugging
```

---

## Agents (10)

| Agent | Role | Model |
|-------|------|-------|
| @paige-product | Team lead, router, planner | sonnet |
| @artie-arch | Architecture, C4 diagrams | opus |
| @una-ux | UX spec, WCAG review | sonnet |
| @sam-sec | Security audit | sonnet |
| @beck-backend | Backend implementation | sonnet |
| @effie-frontend | Frontend implementation | sonnet |
| @quinn-qa | Testing, fuzz data | sonnet |
| @stan-standards | Code review — logic, performance, language | sonnet |
| @devon-ops | Docs, release, announcement | haiku |
| @heracles | Debugging, root cause analysis | sonnet |

---

## Referenced Skills

- `commit-work` — Conventional Commits formatting
- `task-breakdown` — Decompose work into agent tasks with dependency graph
- `project-discovery` — Detect project scope, language, framework
- `java-source-intel` — Java semantic queries (callers, impact, annotations) routed across codegraph → code-review-graph → ripgrep
- `post-deploy-analytics` — Post-deploy telemetry analysis
- `write-code-review` — Structured code review output
- `write-sdd` — System design document generation
- `write-ux-spec` — UX specification format
- `write-security-review` — Security audit output
- `c4-architecture` — C4 diagram generation
- `qa-test-planner` — Test plan and coverage strategy
- `reducing-entropy` — Bias toward deletion and simplification
