# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ohmyclaude is a **Claude Code plugin** — a 10-agent OSS pipeline using Agent Teams for coordination. It ships agents, skills, commands, hooks, and rules as markdown files with YAML frontmatter. There is no application code to build or run — the "product" is the plugin content itself.

**Guiding philosophy**: *"The model IS the agent. Build harnesses, not prompt chains."*

## Validation

```bash
node scripts/validate.js
```

Validates: version consistency (4 files), plugin.json structure, agent/skill frontmatter, hook JS syntax, install-module path existence, and stale retired agent name references. CI runs this same script.

**Version bump** (atomic across 4 files):
```bash
node scripts/bump-version.js --major   # or --minor, --patch, or explicit x.y.z
```

## Architecture

### Single Entry Point

Users interact through `/forge` — the only command. It routes everything:
```
/forge <natural language>     Smart router (default)
/forge sprint [--size N]      Execute sprint from backlog
/forge release                Cut release
/forge commit                 Generate semantic commit message
/forge help                   Show help
```

### Agent Teams Model

Every `/forge` request creates a Team:
1. Project discovery (CLAUDE.md, source graph, tree, language detection)
2. TeamCreate → spawn @paige-product as lead
3. Lead classifies, decomposes into tasks with dependency graph
4. Lead spawns specialist agents, assigns tasks in parallel waves
5. Agents write artifacts to `.claude/pipeline/` for human review
6. Team shutdown, summary

### 10 Agents (Corporate Slack personas)

| Role | Agent | Model | Read-only? |
|------|-------|-------|------------|
| Lead | @paige-product | sonnet | No |
| Design | @artie-arch | opus | Yes |
| Design | @una-ux | sonnet | Yes (pre-dev) |
| Security | @sam-sec | sonnet | Yes + Bash |
| Backend | @beck-backend | sonnet | No |
| Frontend | @effie-frontend | sonnet | No |
| Testing | @quinn-qa | sonnet | No |
| Review | @stan-standards | sonnet | Yes |
| Ship | @devon-ops | haiku | No |
| Debug | @heracles | sonnet | No |

### Exploration Tool Priority

1. **codegraph** ([`@colbymchenry/codegraph`](https://github.com/colbymchenry/codegraph)) — pre-indexed tree-sitter graph, FTS5 search, designed for Explore-subagent orchestration. Use if `.codegraph/` exists or `mcp__codegraph__*` tools are loaded.
2. **code-review-graph** MCP — tree-sitter semantic graph with impact radius, community detection, review tooling. Use if `mcp__plugin_code-review-graph__*` tools are loaded.
3. **`tree` CLI** — directory structure overview.
4. **Glob/Grep** — file-level search (last resort).

All graph backends are **soft dependencies** — the plugin ships md/js files only and works without any of them. Detection is graceful: never error if a backend is absent, fall to the next tier. See `skills/java-source-intel/` for the canonical query patterns per tier.

### Two File Categories

| Category | Directories | Shipped? |
|----------|-------------|----------|
| Plugin deliverable | `agents/`, `skills/`, `commands/`, `hooks/`, `rules/`, `.claude-plugin/`, `manifests/`, `schemas/` | Yes |
| Repo dev config | `scripts/`, `.github/`, `.claude/skills/` | No |

## Critical Conventions

### Versioning — 4 Files Must Match

Use `node scripts/bump-version.js` to update atomically:
- `VERSION`, `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

### plugin.json Gotchas

- Agents must be **explicit file paths** — directory paths silently fail
- Skills and commands **can** use directory paths
- **Never add a `hooks` field** — `hooks/hooks.json` auto-loads
- Version must be full semver (`1.0.0` not `1.0`)

### Agent Frontmatter (Required)

```yaml
---
name: lowercase-name
description: Under 30 words. Include <example> blocks after frontmatter.
tools: ["Read", "Grep", "Glob"]
model: sonnet
color: blue
---
```

### Skill Frontmatter (Required)

```yaml
---
name: skill-name          # MUST match parent folder name
description: Under 200 chars with trigger keywords
origin: ohmyclaude
---
```

Skills stay under **400 lines** (≈500 tokens). Verbose content goes in `references/`.

### Rules System

Path-activated language rules in `rules/{language}/`:
```yaml
---
paths:
  - "**/*.java"
---
```

### Read-Only Agents

Must **never** have Write/Edit/MultiEdit in tools list:
- `artie-arch`, `una-ux` (pre-dev), `stan-standards`, `sam-sec` (except Bash)

### Model Selection (token cost: Haiku 1x, Sonnet 3x, Opus 5x)

- `opus` — only `artie-arch`. Justify in PR if adding elsewhere.
- `sonnet` — default (90% of tasks)
- `haiku` — only `devon-ops` (templated work)

### Install Manifests

Every new component registers in:
1. `.claude-plugin/plugin.json` (agents as explicit paths)
2. `manifests/install-modules.json` (grouped by module)
3. `manifests/install-profiles.json` (3 profiles: minimal, standard, full)

### Hook Pattern

```js
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);  // always pass through
  process.exit(0);            // 0 = allow, 2 = block (PreToolUse only)
});
```

### Documentation Rule

Any change affecting public behavior must update `README.md` in the same commit.

### Commit Messages

Conventional Commits: `feat(agents):`, `fix(hooks):`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`
