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

## Skills (34)

All SKILL.md files are capped at ≤400 lines (enforced by `validate.js` since v2.0.0). Depth lives in each skill's `references/` directory, loaded on-demand.

### General Engineering (12)

`api-design` `c4-architecture` `code-review` `commit-work` `database-schema-designer` `datadog-cli` `design-system` `error-handling` `game-changing-features` `generate-fuzz-data` `git-workflow` `tdd-patterns`

### Java / Spring Boot (5)

`java-coding-standards` `springboot-patterns` `springboot-tdd` `springboot-security` `java-source-intel`

### Pipeline Artifact Writers (4)

`write-sdd` `write-code-review` `write-security-review` `write-ux-spec`

### Specialized (8)

`task-breakdown` `project-discovery` `post-deploy-analytics` `qa-test-planner` `readme-templates` `reducing-entropy` `requirements-clarity` `profile-run`

### SuperClaude Knowledge Skills (5)

Inlined from [SuperClaude_Plugin](https://github.com/SuperClaude-Org/SuperClaude_Plugin) v4.3.0 (MIT). v2.0.0 removed 8 verb-wrapper skills that duplicated agent docstrings; only the named-methodology skills remain.

`sc-spec-panel` (10 expert review panel) · `sc-brainstorm` (Socratic discovery) · `sc-pm` (project orchestration) · `sc-research` (adaptive research) · `sc-estimate` (structured estimation)

## Rules System

Path-activated language rules:

| Path | Scope |
|------|-------|
| `rules/common/` | Shared coding style (all files) |
| `rules/java/` | Coding style, patterns, security, testing (activates on `**/*.java`) |
| `rules/typescript/` | Coding style, patterns, security, testing (activates on `**/*.ts` and `**/*.tsx`) |

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

## Source Graph Integration (all optional, all soft-detected)

The plugin ships md/js files only. Nothing is installed on your machine when you install ohmyclaude. Graph backends are **opportunistic** — if one is present, agents use it; if not, they fall through to the next tier without error.

Either of these unlocks richer exploration:

- [codegraph](https://github.com/colbymchenry/codegraph) — `npx @colbymchenry/codegraph` (project-level, `.codegraph/codegraph.db`). Benchmarks at ~94% fewer tool calls for Explore-agent workloads.
- [code-review-graph](https://github.com/nicholasgriffintn/code-review-graph) — `claude plugin install code-review-graph` (Claude Code plugin MCP). Adds impact radius + review-specific tools.

The `hooks-graph` hook auto-detects which is present and syncs incrementally after edits. Java projects additionally get the `java-source-intel` skill, which routes semantic queries (callers, impact, `@Transactional` scans, call chains) to whichever backend is installed — or falls back to ripgrep patterns when none is.

### Exploration Tool Priority

| Priority | Tool | Type | Required? |
|----------|------|------|-----------|
| 1 | codegraph | Pre-indexed tree-sitter graph, FTS5 search | No |
| 2 | code-review-graph | Tree-sitter graph + review tooling | No |
| 3 | `tree` CLI | Directory structure | No (standard on macOS/Linux) |
| 4 | Glob / Grep | File-level search | Always available |

## Install Profiles

| Profile | Contents |
|---------|----------|
| Minimal | 10 agents + /forge |
| Standard (default) | + 34 skills + Java rules + quality hooks |
| Full | + source graph hooks + tracking hooks |

## Project Inventory

| Component | Count | Detail |
|-----------|------:|--------|
| Version | 2.1.0 | VERSION, package.json, plugin.json, marketplace.json |
| Agents | 10 | sonnet: 8, opus: 1, haiku: 1 |
| Skills | 34 | engineering: 12, java: 5, pipeline: 4, specialized: 8, superclaude: 5 |
| Commands | 1 | forge |
| Rules | 9 | common: 1, java: 4, typescript: 4 |
| Hooks | 8 | backlog-tracker, cost-profiler, dry-run, graph-update, post-bash-lint, pre-write-check, session-summary, team-cleanup |
| Profiles | 3 | minimal, standard (default), full |
| Modules | 17 | agents: 4, skills: 5, rules: 3, commands: 1, hooks: 4 |

Run `node scripts/validate.js` to see the live inventory with per-agent detail.

## Testing

| Script | What it validates |
|--------|-------------------|
| `npm run validate` | Plugin structure, frontmatter, version symmetry, CHANGELOG↔VERSION gate, rule frontmatter, AGENTS.md, test:hooks wiring |
| `npm run test:hooks` | 27 contract assertions across all 8 hook scripts (exit codes, stdout passthrough, side-effect sandboxing). Hermetic via `HOME` override. |
| `npm run test:sc-fallback` | SuperClaude inlining contract — no legacy `sc:sc-<verb>` prefixed refs; no references to verb-wrappers removed in v2.0.0. |

All three run in CI on every push to `main`/`develop` and every PR.

---

**Reference**: [Operating](./docs/OPERATING.md) -- [Pipeline Schema](./docs/pipeline-schema.md) -- [Cost Model](./docs/TOKENS.md) -- [Migration (0.x → 1.0)](./MIGRATION.md)

[Roadmap](./ROADMAP.md) -- [Contributing](./CONTRIBUTING.md) -- [Changelog](./CHANGELOG.md) -- [Security](./SECURITY.md) -- [License](./LICENSE)

Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) and [everything-claude-code](https://github.com/affaan-m/everything-claude-code).
