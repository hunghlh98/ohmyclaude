# ohmyclaude

10-agent OSS pipeline for Claude Code -- harness engineering framework with Agent Teams coordination, document-driven artifacts for human review, Java-first skills, and source graph integration.

## Install

```
claude plugin install hunghlh98/ohmyclaude
```

Zero-setup. No `/setup` command, no config files, no shell aliases. Install and go.

## Quick Start

```
/forge add rate limiting to the /api/users endpoint
/forge fix the null pointer in payment processor
/forge review src/auth/
/forge debug tests fail in CI but pass locally
/forge commit
```

One command. The pipeline figures out the rest.

## The `/forge` Command

| Subcommand | What it does |
|------------|--------------|
| `/forge <natural language>` | Route and execute any request (default) |
| `/forge --dry-run <request>` | Simulate routing + cost, no agents invoked |
| `/forge sprint [--size N]` | Execute sprint from backlog |
| `/forge release` | Cut release |
| `/forge commit` | Generate semantic commit message |
| `/forge help` | Show help |

## How It Works

```
1. Project discovery    CLAUDE.md, source graph, tree, language detection
2. Create Agent Team    TeamCreate allocates agents for this request
3. Plan                 @paige-product classifies, decomposes into tasks
                        with dependency graph
4. Execute              Agents work in parallel waves, write artifacts
                        for human review
5. Progress             Real-time display
6. Shutdown             Team cleanup, summary
```

### Smart UX -- Confidence-Based Interaction

| Confidence | Behavior |
|------------|----------|
| HIGH | Execute immediately |
| MEDIUM | 1 clarifying question |
| LOW | 2-3 questions |

Never more than 3 questions. Circuit breaker: 3 rejection rounds triggers human oracle decision via `AskUserQuestion`.

## Agents

10 agents with corporate Slack personas. Each has a name, a clear lane, and a model assignment.

| Tier | Agent | Role | Model |
|------|-------|------|-------|
| Lead | @paige-product | Grand Router + Planner + Oracle | sonnet |
| Design | @artie-arch | C4 system architect | opus |
| Design | @una-ux | UX spec + WCAG review | sonnet |
| Execution | @sam-sec | Security audit, adversarial validation | sonnet |
| Execution | @beck-backend | Backend implementation (BE-only) | sonnet |
| Execution | @effie-frontend | Frontend implementation (FE-only) | sonnet |
| Execution | @quinn-qa | Testing + fuzz data | sonnet |
| Governance | @stan-standards | Code review -- logic + performance + language | sonnet |
| Ship | @devon-ops | Docs + release + announcement | haiku |
| Utility | @heracles | Debugging + root cause analysis | sonnet |

## Dynamic Routing

@paige-product classifies every request and selects agents based on intent:

| Intent | Agent Chain |
|--------|-------------|
| Docs | @devon-ops + @stan-standards |
| Template / boilerplate | builder + @quinn-qa + @stan-standards |
| P0 hotfix | builder + @quinn-qa + @devon-ops |
| Complex feature | @artie-arch, @una-ux, @sam-sec, builders, @quinn-qa, @stan-standards, @devon-ops |
| Security | @sam-sec, builder, @quinn-qa, @sam-sec (re-review), @devon-ops |
| Code review | @stan-standards |
| Debug | @heracles |

### Conflict Resolution

| Conflict | Winner |
|----------|--------|
| Velocity vs security | @sam-sec always |
| Release vs stability | @devon-ops (ultimate trump card) |
| UX vs velocity | @una-ux on WCAG failures |

## Skills (27)

### General Engineering (12)

`api-design` `c4-architecture` `code-review` `commit-work` `database-schema-designer` `datadog-cli` `design-system` `error-handling` `game-changing-features` `generate-fuzz-data` `git-workflow` `tdd-patterns`

### Java / Spring Boot (4)

`java-coding-standards` `springboot-patterns` `springboot-tdd` `springboot-security`

### Pipeline Artifact Writers (4)

`write-sdd` `write-code-review` `write-security-review` `write-ux-spec`

### Specialized (7)

`task-breakdown` `project-discovery` `post-deploy-analytics` `qa-test-planner` `readme-templates` `reducing-entropy` `requirements-clarity`

## Rules System

Path-activated language rules:

| Path | Scope |
|------|-------|
| `rules/common/` | Shared coding style (all files) |
| `rules/java/` | Coding style, patterns, security, testing (activates on `**/*.java`) |

## Hooks (7)

| Hook | Trigger | What it does |
|------|---------|--------------|
| `pre-write-check` | PreToolUse Write/Edit | Blocks writes with hardcoded secrets |
| `post-bash-lint` | PostToolUse Bash | Runs linter after bash edits source |
| `backlog-tracker` | PostToolUse Write | Rebuilds BACKLOG.md when ISS-*.md written |
| `graph-update` | PostToolUse Write/Edit | Incrementally updates source graph (optional) |
| `session-summary` | Stop | Writes session log |
| `team-cleanup` | Stop | Cleans orphaned teams older than 24h |
| `cost-profiler` | SubagentStop + Stop | Writes `.claude/pipeline/PROFILE-<runId>.md` and rolling `baseline.json`; pair with `skills/profile-run` |

## Cost Profiler (harness observability)

Every `/forge` run emits structured telemetry. Agents stay blind to it — all measurement happens in-hook by parsing `transcript.jsonl`.

- **PROFILE artifact** — per-run table: agent, model, turns, in/out tokens, cache hit rate, USD, anomaly flags
- **Baseline** — rolling N=20 means + p95 per scenario (full-app, feature, hotfix, docs) and per agent
- **Anomaly flags** — `turn_explosion`, `cost_over_p95`, `cache_miss_spike`, `opus_budget_breach`
- **@paige-product** reads the latest PROFILE at team shutdown and surfaces a one-line cost summary in `SUMMARY-{timestamp}.md`
- **`profile-run` skill** interprets PROFILE + baseline and recommends concrete tuning (ranked by ROI)
- **Calibration** — `profile-run --calibrate` diffs observed means against dry-run priors; flag drift >25%

## Source Graph Integration (optional)

Install [code-review-graph](https://github.com/nicholasgriffintn/code-review-graph) for enhanced analysis:

```
claude plugin install code-review-graph
```

Provides semantic code search, blast radius analysis, architecture overview, and flow detection. Agents use graph tools when available, fall back to tree/grep when not.

### Exploration Tool Priority

| Priority | Tool | Type |
|----------|------|------|
| 1 | tree-sitter source graph (code-review-graph) | Semantic intelligence |
| 2 | `tree` CLI | Directory structure |
| 3 | Glob / Grep | Last resort |

## Install Profiles

| Profile | Contents |
|---------|----------|
| Minimal | 10 agents + /forge |
| Standard (default) | + 27 skills + Java rules + quality hooks |
| Full | + source graph hooks + tracking hooks |

## Project Inventory

| Component | Count | Detail |
|-----------|------:|--------|
| Version | 1.2.0 | VERSION, package.json, plugin.json, marketplace.json |
| Agents | 10 | sonnet: 8, opus: 1, haiku: 1 |
| Skills | 42 | engineering: 12, java: 4, pipeline: 4, specialized: 8, superclaude: 13 |
| Commands | 1 | forge |
| Rules | 5 | common: 1, java: 4 |
| Hooks | 8 | backlog-tracker, cost-profiler, dry-run, graph-update, post-bash-lint, pre-write-check, session-summary, team-cleanup |
| Profiles | 3 | minimal, standard (default), full |
| Modules | 16 | agents: 4, skills: 5, rules: 2, commands: 1, hooks: 4 |

Run `node scripts/validate.js` to see the live inventory with per-agent detail.

---

**Reference**: [Operating](./docs/OPERATING.md) -- [Pipeline Schema](./docs/pipeline-schema.md) -- [Cost Model](./docs/TOKENS.md) -- [Migration (0.x → 1.0)](./MIGRATION.md)

[Roadmap](./ROADMAP.md) -- [Contributing](./CONTRIBUTING.md) -- [Changelog](./CHANGELOG.md) -- [Security](./SECURITY.md) -- [License](./LICENSE)

Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) and [everything-claude-code](https://github.com/affaan-m/everything-claude-code).
