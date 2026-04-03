# ohmyclaude

14-agent OSS company simulation pipeline for Claude Code — document-driven, dynamically routed, with conflict resolution and a post-release feedback loop.

> Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) and [everything-claude-code](https://github.com/affaan-m/everything-claude-code).

---

## Install

```
claude plugin install hunghlh98/ohmyclaude
```

Then run once inside Claude Code to enable shell aliases:

```
/setup
```

**Upgrade:**
```bash
claude plugin update hunghlh98/ohmyclaude
```

---

## Quick Start

**Submit a request (auto-routed through pipeline):**
```
/forge request add rate limiting to the /api/users endpoint
```

**Or invoke agents directly:**
```
@paige-product  — classify and route a request
@artie-arch     — design architecture (C4 diagrams)
@stan-standards — review code quality
@sam-sec        — security audit + adversarial plan validation
@beck-backend   — implement backend features
@effie-frontend — implement frontend features
@polyglot-reviewer — review Java / Go / Python / Rust / Kotlin / C++ / Flutter / SQL
@build-resolver    — fix a broken build (any language)
```

**Session contexts** — launch Claude already in the right mode:
```bash
claude-oss      # full pipeline — all 14 agents, /forge entry point
claude-dev      # build mode   — beck-backend + effie-frontend + quinn-qa
claude-review   # review mode  — stan-standards + percy-perf + sam-sec
claude-debug    # debug mode   — heracles
```

---

## OSS Pipeline

```
TIER 1 — STRATEGY & DESIGN
  @paige-product  Grand Router + Product Gatekeeper
  @artie-arch     Architect (C4: C1→C3)
  @una-ux         UX/UI Design (pre-dev spec + post-dev visual review)
  @scout-sprint   Planning & Sprint Coordination

TIER 2 — EXECUTION
  @sam-sec        Security, Compliance & Adversarial Validation
  @beck-backend   BE Contributor (C4-Code + implementation)
  @effie-frontend FE Contributor (C4-Code + implementation)
  @quinn-qa       QA / Tester

TIER 3 — GOVERNANCE
  @stan-standards Logic & Standards (read-only)
  @percy-perf     Performance (read-only)
  @dora-docs      Documentation
  @devon-ops      SRE / DevOps + Releases (ultimate trump card)

TIER 4 — POST-RELEASE
  @evan-evangelist  DevRel / Community
  @anna-analytics   Data / Analytics (feedback loop)
```

**Document flow (each stage produces a named artifact):**
```
UX-SPEC → PRD → SDD → PLAN → REVIEW → IMPL-BE/FE → TEST → CODE-REVIEW → UX-REVIEW → DOC → RELEASE → ANNOUNCEMENT → ANALYTICS
```

---

## Dynamic Routing

`@paige-product` classifies every request and assigns a route before writing the PRD:

| Route | Name | Trigger | Skips |
|-------|------|---------|-------|
| **A** | Docs-Only | Type=docs, Complexity=low | Most agents |
| **B** | Fast-Track | Matches boilerplate template | @artie-arch, @una-ux |
| **C** | Hotfix | P0 bug | @artie-arch, @una-ux, @evan-evangelist |
| **D** | Full Feature | high complexity feature | None |
| **E** | Security Patch | Touches_Security=true | @una-ux, @evan-evangelist |

---

## Commands

| Command | What it does |
|---------|-------------|
| `/forge request <task>` | Route and triage a new request → ISS-NNN.md |
| `/forge sprint` | Execute current sprint through each issue's route |
| `/forge release` | @devon-ops cuts release → @evan-evangelist announces |
| `/forge analyze` | @anna-analytics post-deploy telemetry (async) |
| `/forge init <spec>` | Founding build: full Route D pipeline → v1.0.0 |
| `/forge triage` | @paige-product re-routes all backlog items |
| `/review [path]` | Code review — @stan-standards + @percy-perf |
| `/debug <issue>` | Root cause analysis — @heracles |
| `/commit` | Semantic commit message from diff |

---

## Conflict Resolution

**Domain Dictator** — who wins conflicts:

| Conflict | Winner |
|----------|--------|
| Velocity vs security | @sam-sec always |
| Release timing vs community hype | @devon-ops always |
| Product intuition vs telemetry | @anna-analytics (data beats intuition) |
| UX completeness vs velocity | @una-ux on WCAG failures |

**Circuit Breaker** — after 3 rejection rounds in any stage:
1. Reviewing agent writes `DEADLOCK-<id>.md`
2. Pipeline halts
3. @paige-product synthesizes binary choice for human
4. Human authorizes → pipeline resumes

---

## Agents

### Primary Pipeline (14)

| Tier | Agent | Persona | Does |
|------|-------|---------|------|
| 1 | **@paige-product** | Pragmatic Skeptic | Grand Router — classifies, routes, writes PRD |
| 1 | **@artie-arch** | Elegant Purist | C4 architect — SDD with C1-C3 diagrams |
| 1 | **@una-ux** | The Empath | UX-SPEC (pre-dev) + UX-REVIEW (post-dev) |
| 1 | **@scout-sprint** | Agile Hustler | Sprint planner — PLAN + agent delegation |
| 2 | **@sam-sec** | The Doomsayer | Security + 7 adversarial scenarios — REVIEW |
| 2 | **@beck-backend** | Blue-Collar Builder | BE implementation (BE-only scope) |
| 2 | **@effie-frontend** | Pixel Artisan | FE implementation + WCAG compliance |
| 2 | **@quinn-qa** | Professional Troll | Tests + fuzz data — TEST report |
| 3 | **@stan-standards** | Wise Mentor | Code logic + quality — CODE-REVIEW (logic section) |
| 3 | **@percy-perf** | Unblinking Watcher | Performance — CODE-REVIEW (perf section) |
| 3 | **@dora-docs** | The Historian | Docs + Keep a Changelog |
| 3 | **@devon-ops** | The Timekeeper | SRE — RELEASE file + CHANGELOG promotion |
| 4 | **@evan-evangelist** | The Hypeman | Community announcements |
| 4 | **@anna-analytics** | Cold Truth-Teller | Post-deploy telemetry + regression feedback loop |

### Utility (on-demand, not in pipeline)

| Agent | Does |
|-------|------|
| **@heracles** | Debugs failures to root cause |
| **@polyglot-reviewer** | Language-aware review — Java / Kotlin / Go / Python / Rust / TypeScript / C++ / Flutter / SQL |
| **@build-resolver** | Fixes build errors — Maven, Gradle, Cargo, tsc, CMake, go build |

---

## Contexts

| Alias | Mode | Agents |
|-------|------|--------|
| `claude-oss` | Full OSS pipeline | All 14 primary agents, /forge |
| `claude-dev` | Implementation | @beck-backend + @effie-frontend + @quinn-qa |
| `claude-review` | Code review | @stan-standards + @percy-perf + @sam-sec |
| `claude-debug` | Debugging | @heracles |

---

## Hooks

| Hook | Trigger | What it does |
|------|---------|-------------|
| **pre-write-check** | PreToolUse Write/Edit | Blocks writes with hardcoded secrets |
| **post-bash-lint** | PostToolUse Bash | Runs linter after bash edits source |
| **backlog-tracker** | PostToolUse Write | Rebuilds BACKLOG.md when ISS-*.md files are written |
| **session-summary** | Stop | Writes session log to `~/.claude/ohmyclaude/` |

---

## Skills (auto-activate by keyword)

`git-workflow` · `tdd-patterns` · `api-design` · `error-handling` · `code-review`

---

[Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md)
