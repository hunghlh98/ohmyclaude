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

## Commands

| Command | What it does |
|---------|--------------|
| `/forge <natural language>` | Route and execute any request (default smart router) |
| `/forge sprint [--size N]` | Execute sprint from backlog |
| `/forge release` | Cut release |
| `/forge commit` | Generate semantic commit message |
| `/forge help` | Show help |
| `/save` | Snapshot the current session state to `~/.claude/ohmyclaude/sessions/` (v2.2.0 — opt-in via `full` profile) |
| `/load` | Resume a saved session — `/load`, `/load <session_id>`, or `/load --list` (v2.2.0) |

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

## Hooks (10)

| Hook | Trigger | What it does |
|------|---------|--------------|
| `pre-write-check` | PreToolUse Write/Edit | Blocks writes with hardcoded secrets |
| `post-bash-lint` | PostToolUse Bash | Runs linter after bash edits source |
| `backlog-tracker` | PostToolUse Write | Rebuilds BACKLOG.md when ISS-*.md written |
| `session-summary` | Stop | Writes per-response JSONL log to `~/.claude/ohmyclaude/sessions/YYYY-MM-DD.jsonl` |
| `team-cleanup` | Stop | Cleans orphaned teams older than 24h |
| `cost-profiler` | SubagentStop + Stop | Writes `.claude/pipeline/PROFILE-<runId>.md` and rolling `baseline.json`; pair with `skills/profile-run` |
| `usage-tracker` | PreToolUse + UserPromptSubmit + Stop + SessionStart | Per-project usage telemetry to `<cwd>/.claude/usage/events.jsonl` (v2.3+) |
| `session-load` | SessionStart | On fresh-startup only, emits a one-line hint when a saved session exists for this cwd (v2.2.0) |
| `state-snapshot` | PreCompact | Snapshots pipeline artifact inventory to the active session's `stages.json` before compaction (v2.2.0) |
| `subagent-trace` | SubagentStart | Appends one JSONL line per subagent spawn to `traces.jsonl`; pairs with `cost-profiler` for full per-agent lifecycle (v2.2.0) |

## Cost Profiler (harness observability)

Every `/forge` run emits structured telemetry. Agents stay blind to it — all measurement happens in-hook by parsing `transcript.jsonl`.

- **PROFILE artifact** — per-run table: agent, model, turns, in/out tokens, cache hit rate, USD, anomaly flags
- **Baseline** — rolling N=20 means + p95 per scenario (full-app, feature, hotfix, docs) and per agent
- **Anomaly flags** — `turn_explosion`, `cost_over_p95`, `cache_miss_spike`, `opus_budget_breach`
- **@paige-product** reads the latest PROFILE at team shutdown and surfaces a one-line cost summary in `SUMMARY-{timestamp}.md`
- **`profile-run` skill** interprets PROFILE + baseline and recommends concrete tuning (ranked by ROI)
- **Calibration** — `profile-run --calibrate` splits PROFILE artifacts into recent (≤30d) vs prior (30–90d) windows and diffs per-scenario means; flag drift >25%

## Exploration

The plugin ships md/js files only. Exploration uses `tree` CLI plus native Read/Grep/Glob. Java projects additionally get the `java-source-intel` skill, which provides canonical ripgrep + find patterns for callers, impact, `@Transactional` scans, and call chains.

### Exploration Tool Priority

| Priority | Tool | Type | Required? |
|----------|------|------|-----------|
| 1 | `code-review-graph` MCP | Structural graph (callers, impact radius, semantic search) | Opt-in (full profile, requires `uv`) |
| 2 | `tree` CLI | Directory structure | No (standard on macOS/Linux) |
| 3 | Glob / Grep | File-level search | Always available |

> **`code-review-graph` (MIT, Python 3.10+ via `uv`) is re-adopted as of v2.4.2** as the optional graph backend — install via the `full` profile or the `mcp-code-review-graph` module. Skills in `java-source-intel` continue to expose text-based query patterns; graph tools are additive. Consumer setup: on first SessionStart after install, a hook detects `uv` and writes `.claude/ohmyclaude.local.yaml` (YAML, human-inspectable) with status. If `uv` is missing, the file's comment header carries install instructions.

### Adding External Tools / Skills

When extending ohmyclaude with something external, follow the **External Dependency Decision Rule** in [CLAUDE.md](CLAUDE.md#external-dependency-decision-rule):

- **Skills (methodology, prompts)** → **embed inline** as a `skills/<name>/` directory with upstream attribution.
- **Tools (executables, CLIs, servers)** → **wrap as MCP** in `.mcp.json`. For trivial cases, write a stdlib-only stdio server under `scripts/mcp-servers/` — the `ohmyclaude-fs` server is the canonical pattern.
- **Another Claude Code plugin** → not a supported dependency; extract its MCP server portion or document it as a recommended companion.

The v2.4.0 cleanup (see `.claude/plans/pure-shimmying-leaf.md`) is the case study that motivated this rule.

## Install Profiles

| Profile | Contents |
|---------|----------|
| Minimal | 10 agents + /forge |
| Standard (default) | + 34 skills + Java + TypeScript rules + quality hooks |
| Full | + tracking hooks + cost profiler + session intelligence (`/save`, `/load`, SessionStart/PreCompact/SubagentStart hooks) + optional `code-review-graph` MCP (requires `uv`) |

## Session Intelligence (opt-in, v2.2.0)

Resumable per-cwd session state for "picked up where I left off" workflows.

- `/save` writes a structured snapshot to `~/.claude/ohmyclaude/sessions/<session_id>/` (never into the repo).
- `/load` reads it and reports which pipeline artifacts are intact, modified-since-save, or missing.
- Three companion hooks keep the snapshot fresh: `session-load` (discoverability on startup), `state-snapshot` (PreCompact checkpoint), `subagent-trace` (per-subagent telemetry pairing with `cost-profiler`).

Opt-in via the `full` profile or by adding `hooks-session` / `skills-session` / `commands-session` modules individually. Host-local, never committed, no secrets.

## Per-project state file (v2.4.2+)

Per-project ohmyclaude configuration and setup state live at `<project>/.claude/ohmyclaude.local.yaml`. Pure YAML by design (no frontmatter-in-markdown) so grep/ripgrep search it cleanly and hooks can parse it in a single mode. Extensible schema: today it only tracks `features.code_review_graph.*`, but additional `features.<name>.*` blocks slot in without breaking existing consumers.

The file is written by the `code-review-graph-setup` SessionStart hook on first run — see the `uv` detection flow above. It's safe to hand-edit (e.g., set `enabled: false` under a feature to silence the setup hook); changes take effect on next Claude Code restart.

```yaml
version: 1
features:
  code_review_graph:
    enabled: true
    setup_complete: true
    uv_version: "0.4.12"
    installed_at: "2026-04-24T11:30:00Z"
    reason: null
```

**Never commit.** Add `.claude/*.local.*` (broad pattern — covers YAML today, MD/JSON variants if adopted later) to your project's `.gitignore`. This deliberately diverges from the plugin-dev ecosystem's `.local.md` (frontmatter + body) convention, which fits plugins that mix state with prose (e.g. multi-agent-swarm, ralph-wiggum). ohmyclaude's file carries pure state, so pure YAML is a better fit.

## Project Inventory

| Component | Count | Detail |
|-----------|------:|--------|
| Version | 2.4.4 | VERSION, package.json, plugin.json, marketplace.json |
| Agents | 10 | sonnet: 8, opus: 1, haiku: 1 |
| Skills | 36 | engineering: 12, java: 5, pipeline: 4, specialized: 8, superclaude: 5, session: 2 |
| Commands | 3 | forge, load, save |
| Rules | 9 | common: 1, java: 4, typescript: 4 |
| Hooks | 11 | backlog-tracker, code-review-graph-setup, cost-profiler, post-bash-lint, pre-write-check, session-load, session-summary, state-snapshot, subagent-trace, team-cleanup, usage-tracker |
| Profiles | 3 | minimal, standard (default), full |
| Modules | 22 | agents: 4, skills: 6, rules: 3, commands: 2, mcp: 2, hooks: 5 |

Run `node scripts/validate.js` to see the live inventory with per-agent detail.

## Testing

| Script | What it validates |
|--------|-------------------|
| `npm run validate` | Plugin structure, frontmatter, version symmetry, CHANGELOG↔VERSION gate, rule frontmatter, AGENTS.md, test:hooks wiring, skill reference audit (advisory) |
| `npm run test:hooks` | 27 contract assertions across all 8 hook scripts (exit codes, stdout passthrough, side-effect sandboxing). Hermetic via `HOME` override. |
| `npm run test:sc-fallback` | SuperClaude inlining contract — no legacy `sc:sc-<verb>` prefixed refs; no references to verb-wrappers removed in v2.0.0. |

All three run in CI on every push to `main`/`develop` and every PR.

---

**Reference**: [Operating](./docs/OPERATING.md) -- [Pipeline Schema](./docs/pipeline-schema.md) -- [Cost Model](./docs/TOKENS.md) -- [Migration (0.x → 1.0)](./MIGRATION.md)

[Roadmap](./ROADMAP.md) -- [Contributing](./CONTRIBUTING.md) -- [Changelog](./CHANGELOG.md) -- [Security](./SECURITY.md) -- [License](./LICENSE)

Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) and [everything-claude-code](https://github.com/affaan-m/everything-claude-code).
