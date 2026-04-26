# CLAUDE.md

ohmyclaude is a Claude Code plugin — an 11-agent pipeline with structural generator/evaluator separation (Anthropic Labs harness paper, 2026). Markdown + frontmatter content; no build step. Philosophy: *"The model IS the agent. Build harnesses, not prompt chains."*

Architecture narrative, /forge flow, agent table, install profiles → see `README.md`.

## Commands

```bash
node scripts/validate.js                            # run before every commit; CI runs the same
node scripts/bump-version.js --minor                # atomic bump: VERSION, package.json, plugin.json, marketplace.json
```

## Frontmatter contracts

### Agent (`agents/*.md`)

```yaml
---
name: lowercase-name
description: Under 30 words. Include <example> blocks after frontmatter.
tools: ["Read", "Grep", "Glob"]
model: sonnet
color: blue
---
```

**Read-only agents** must NEVER list `Write` / `Edit` / `MultiEdit`:
- `artie-arch`, `una-ux` (pre-dev), `stan-standards`, `sam-sec` (Bash-only exception)

### Skill (`skills/<name>/SKILL.md`)

```yaml
---
name: skill-name          # MUST match parent folder name
description: Under 200 chars with trigger keywords
origin: ohmyclaude
---
```

Skills stay under **400 lines** (~500 tokens). Verbose content → `references/`.

### Rule (`rules/<lang>/*.md`)

```yaml
---
paths:
  - "**/*.java"
---
```

## Registration — every new component touches 3 files

1. `.claude-plugin/plugin.json` — agents as **explicit file paths** (directory paths silently fail). Never add a `hooks` field (`hooks/hooks.json` auto-loads). Version must be full semver.
2. `manifests/install-modules.json` — grouped by module.
3. `manifests/install-profiles.json` — assign to `minimal` / `default` / `power`.

## Hook contract

```js
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);  // always pass through
  process.exit(0);            // 0 = allow, 2 = block (PreToolUse only)
});
```

## Model selection (cost: Haiku 1× · Sonnet 3× · Opus 5×)

- `opus` — only `artie-arch`. Justify in PR if adding elsewhere.
- `sonnet` — default (~90% of tasks).
- `haiku` — only `devon-ops` (templated work).

## External Dependency Decision Rule

**Skills embed, tools expose.**

| Nature | Strategy |
|---|---|
| **Methodology / knowledge** (prompts, checklists, frames) | Embed as `skills/<name>/SKILL.md` with upstream attribution. |
| **Executable tool** (CLI, server, binary) | Wrap as MCP. Plugin-owned servers (shipped to consumers, use `${CLAUDE_PLUGIN_ROOT}`) → `.claude-plugin/.mcp.json`. Dev-personal MCP servers (web search, API tokens, per-developer tooling) → user scope (`~/.claude/settings.json` or `~/.claude/mcp/`), **never** committed to this repo — root `/.mcp.json` is gitignored. For wrappers, write a stdlib-only stdio server under `scripts/mcp-servers/`. Register as install module. |
| **Another Claude Code plugin** | Not a supported dependency. Extract its MCP server, or document as companion in README. |

Rationale, anti-patterns, 9-step checklist, and the v2.4.0 case study that produced this rule: [`CONTRIBUTING.md#external-dependencies`](CONTRIBUTING.md#external-dependencies) and `.claude/plans/pure-shimmying-leaf.md`.

## Documentation + commits

- Any change affecting public behavior updates `README.md` in the same commit.
- Conventional Commits: `feat(agents):`, `fix(hooks):`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`.

## File categories

- **Plugin deliverable** (shipped): `agents/ skills/ commands/ hooks/ rules/ .claude-plugin/ manifests/ schemas/`
- **Repo dev config** (NOT shipped): `scripts/ .github/ .claude/skills/`
