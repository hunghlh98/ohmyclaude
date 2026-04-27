# ohmyclaude

11-agent OSS pipeline for Claude Code — harness engineering framework with structural generator/evaluator separation (Anthropic Labs harness paper), sprint contract gate before code, runtime probes via MCP, Agent Teams coordination, document-driven artifacts for human review, and Java-first skills.

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
| `/save` | Snapshot the current session state to `~/.claude/ohmyclaude/sessions/` (v2.2.0 — opt-in; commands and skills retained in repo, not in any profile after v2.6.0) |
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

11 agents with corporate Slack personas — Lead, Design, Execution, Evaluation, Governance, Ship, Utility tiers. Full per-agent reference (purpose, model, tools, boundaries, examples) lives in [`docs/OPERATING.md`](./docs/OPERATING.md#part-1--agents-11). Model distribution: 9 sonnet, 1 opus (`@artie-arch`), 1 haiku (`@devon-ops`). The **Evaluation** tier (added v3.0.0) is `@val-evaluator` — read-only verdict authority that runs tests and probes the live app, structurally separated from the generators that author code and tests (per Anthropic Labs' [harness paper](https://www.anthropic.com/engineering/harness-design-long-running-apps), 2026).

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

## Skills (17)

All SKILL.md files are capped at ≤400 lines (enforced by `validate.js` since v2.0.0). Depth lives in each skill's `references/` directory, loaded on-demand.

### General Engineering (3)

`c4-architecture` `code-review` `commit-work`

### Java / Spring Boot (1)

`java-source-intel`

### Specialized (6)

`task-breakdown` `project-discovery` `post-deploy-analytics` `qa-test-planner` `reducing-entropy` `profile-run`

### Sprint Contracts (2, v3.0.0+)

Implements the negotiate-DOD-before-code pattern from Anthropic Labs' [harness paper](https://www.anthropic.com/engineering/harness-design-long-running-apps).

`write-contract` (CONTRACT-<id>.md schema + Probe DSL + PASS/FAIL calibration examples) · `evaluator-tuning` (operational read-logs → find-divergence → patch loop for keeping `@val-evaluator` aligned with human judgment)

### SuperClaude Knowledge Skills (3)

Inlined from [SuperClaude_Plugin](https://github.com/SuperClaude-Org/SuperClaude_Plugin) v4.3.0 (MIT). v2.0.0 removed 8 verb-wrappers; v2.6.0 dropped `sc-pm` (Paige's inline Step 5 orchestration covers it) and `sc-estimate` (`task-breakdown`'s SP matrix duplicates it). The 3 named-methodology survivors:

`sc-spec-panel` (10 expert review panel) · `sc-brainstorm` (Socratic discovery) · `sc-research` (adaptive research)

### Session lifecycle (2, opt-in via custom hooks)

`save` · `load` — host-local session snapshots; deregistered from default profile in v2.6.0.

### Pipeline Artifact Schemas (inline since v2.6.0)

The four `write-*` skills (write-sdd, write-code-review, write-security-review, write-ux-spec) were retired in v2.6.0 — their schemas already lived in the consuming agent's prompt. Schemas are now versioned alongside agents at `agents/{artie-arch,stan-standards,sam-sec,una-ux}.md`.

## Rules System

Path-activated language rules:

| Path | Scope |
|------|-------|
| `rules/common/` | Shared coding style (all files) |
| `rules/java/` | Coding style, patterns, security, testing (activates on `**/*.java`) |
| `rules/typescript/` | Coding style, patterns, security, testing (activates on `**/*.ts` and `**/*.tsx`) |

## Hooks

13 scripts on disk; **6 active registrations** in `hooks/hooks.json` after v2.6.0's ablation. Default profile loads only `hooks-quality` (`pre-write-check.js` + `post-bash-lint.js`); `power` profile adds `hooks-profiler` (`cost-profiler.js`). Other scripts (`backlog-tracker`, `session-summary`, `team-cleanup`, `usage-tracker`, `session-load`, `state-snapshot`, `subagent-trace`) are retained in the repo and re-enabled via custom settings.json registrations — they were observability-only and never changed agent behavior. Per-hook detail in [`docs/OPERATING.md` → Part 2](./docs/OPERATING.md#part-2--hooks). Any active hook can be disabled with `OHMYCLAUDE_HOOK_<NAME>=off` (v2.5.1+).

## Cost Profiler (harness observability)

`cost-profiler` writes per-run `PROFILE-<runId>.md` artifacts and a rolling `baseline.json` (N=20). Anomaly flags surface spikes (`turn_explosion`, `cost_over_p95`, `cache_miss_spike`, `opus_budget_breach`); pair with [`skills/profile-run`](./skills/profile-run/) to interpret. Full cost model — pricing, canonical scenarios, cost-driver ranking, levers — in [`docs/TOKENS.md`](./docs/TOKENS.md).

## Exploration

The plugin ships md/js files only. Exploration uses `tree` CLI plus native Read/Grep/Glob. Java projects additionally get the `java-source-intel` skill, which provides canonical ripgrep + find patterns for callers, impact, `@Transactional` scans, and call chains.

### Exploration Tool Priority

| Priority | Tool | Type | Required? |
|----------|------|------|-----------|
| 1 | `code-review-graph` MCP | Structural graph (callers, impact radius, semantic search) | Opt-in (power profile, requires `uv`) |
| 2 | `tree` CLI | Directory structure | No (standard on macOS/Linux) |
| 3 | Glob / Grep | File-level search | Always available |

> **`code-review-graph` (MIT, Python 3.10+ via `uv`) is re-adopted as of v2.4.2** as the optional graph backend — install via the `power` profile or the `mcp-code-review-graph` module. Skills in `java-source-intel` continue to expose text-based query patterns; graph tools are additive. Consumer setup: on first SessionStart after install, a hook detects `uv` and writes `.claude/.ohmyclaude/local.yaml` (YAML, human-inspectable) with status. If `uv` is missing, the file's comment header carries install instructions.

### Adding External Tools / Skills

When extending ohmyclaude with something external, follow the **External Dependency Decision Rule** in [CLAUDE.md](CLAUDE.md#external-dependency-decision-rule):

- **Skills (methodology, prompts)** → **embed inline** as a `skills/<name>/` directory with upstream attribution.
- **Tools (executables, CLIs, servers)** → **wrap as MCP** in `.mcp.json`. For trivial cases, write a stdlib-only stdio server under `scripts/mcp-servers/` — the `ohmyclaude-fs` server is the canonical pattern.
- **Another Claude Code plugin** → not a supported dependency; extract its MCP server portion or document it as a recommended companion.

The v2.4.0 cleanup (see `.claude/plans/pure-shimmying-leaf.md`) is the case study that motivated this rule.

## Install Profiles

| Profile | Contents |
|---------|----------|
| Minimal | 11 agents + /forge |
| Default (recommended) | + 17 skills + Java + TypeScript rules + quality hooks (pre-write-check + post-bash-lint) + plugin MCPs (`ohmyclaude-fs` for `tree`, `ohmyclaude-probe` for `http_probe` / `db_state`) |
| Power | Default + cost-profiler hook (PROFILE-<runId>.md + baseline.json drift) + optional `code-review-graph` MCP (requires `uv`). For plugin contributors and users running ablation campaigns. |

## Session Intelligence (opt-in, v2.2.0)

Resumable per-cwd session state for "picked up where I left off" workflows.

- `/save` writes a structured snapshot to `~/.claude/ohmyclaude/sessions/<session_id>/` (never into the repo).
- `/load` reads it and reports which pipeline artifacts are intact, modified-since-save, or missing.
- Three companion hooks keep the snapshot fresh: `session-load` (discoverability on startup), `state-snapshot` (PreCompact checkpoint), `subagent-trace` (per-subagent telemetry pairing with `cost-profiler`).

Opt-in via custom settings.json (modules `hooks-session` / `skills-session` / `commands-session` are no longer assigned to any profile after v2.6.0; scripts and skills remain in the repo for re-enable). Host-local, never committed, no secrets.

## Per-project state file (v2.4.2+)

Per-project ohmyclaude configuration and setup state live at `<project>/.claude/.ohmyclaude/local.yaml` (moved from `.claude/ohmyclaude.local.yaml` in v2.4.6 as part of consolidating all plugin-generated output under `.claude/.ohmyclaude/`). Pure YAML by design (no frontmatter-in-markdown) so grep/ripgrep search it cleanly and hooks can parse it in a single mode. Extensible schema: `features.code_review_graph.*` for the graph backend, `features.project_init.*` as the setup sentinel, and additional `features.<name>.*` blocks slot in without breaking existing consumers. Hooks merge-preserve other features' blocks on write so concurrent SessionStart hooks don't clobber each other's state.

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
| Version | 3.0.1 | VERSION, package.json, plugin.json, marketplace.json |
| Agents | 11 | sonnet: 9, opus: 1, haiku: 1 |
| Skills | 17 | engineering: 3, java: 1, specialized: 6, superclaude: 3, contract: 2, session: 2 |
| Commands | 4 | forge-disagree, forge, load, save |
| Rules | 9 | common: 1, java: 4, typescript: 4 |
| Hooks | 14 | _toggle, backlog-tracker, code-review-graph-setup, cost-profiler, post-bash-lint, pre-write-check, project-init, session-load, session-summary, state-snapshot, subagent-trace, team-cleanup, usage-tracker, val-calibration |
| Profiles | 3 | minimal, default (default), power |
| Modules | 23 | agents: 5, skills: 6, rules: 3, commands: 2, mcp: 2, hooks: 5 |

Run `node scripts/validate.js` to see the live inventory with per-agent detail.

## Testing

| Script | What it validates |
|--------|-------------------|
| `npm run validate` | Plugin structure, frontmatter, version symmetry, CHANGELOG↔VERSION gate, rule frontmatter, test:hooks wiring, skill reference audit (advisory) |
| `npm run test:hooks` | 27 contract assertions across all 8 hook scripts (exit codes, stdout passthrough, side-effect sandboxing). Hermetic via `HOME` override. |
| `npm run test:sc-fallback` | SuperClaude inlining contract — no legacy `sc:sc-<verb>` prefixed refs; no references to verb-wrappers removed in v2.0.0. |

All three run in CI on every push to `main`/`develop` and every PR.

---

**Reference**: [Operating](./docs/OPERATING.md) -- [Pipeline Schema](./docs/pipeline-schema.md) -- [Cost Model](./docs/TOKENS.md) -- [Migration (0.x → 1.0, archived)](./docs/archive/MIGRATION-1.0.md)

[Roadmap](./ROADMAP.md) -- [Contributing](./CONTRIBUTING.md) -- [Changelog](./CHANGELOG.md) -- [Security](./SECURITY.md) -- [License](./LICENSE)

Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) and [everything-claude-code](https://github.com/affaan-m/everything-claude-code).
