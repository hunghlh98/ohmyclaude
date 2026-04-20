# .claude/skills — Development-Only Skills

This directory contains skills used **only when developing ohmyclaude itself**. They are NOT shipped with the plugin and are NOT available to end users.

## Why this exists

The plugin's `skills/` directory (repo root) contains skills for end users. This directory holds meta-skills for the plugin developer — tools you use when building, auditing, and releasing ohmyclaude.

## Current dev skills

| Skill | Source | Purpose |
|-------|--------|---------|
| `plugin-forge` | ohmyclaude marketplace | Scaffold new plugins from templates |
| `release-cut` | ohmyclaude marketplace | Finalize a release from CHANGELOG [Unreleased] |
| `skill-profiler` | ohmyclaude marketplace | Audit a SKILL.md for quality and clarity |
| `update-changelog` | ohmyclaude marketplace | Append entries to CHANGELOG.md |
| `writing-clearly` | ohmyclaude marketplace | Apply Strunk's rules for clearer writing |

## How to add a dev skill

Dev skills are installed locally via the marketplace or symlinked manually — they do not live in this repo. To add one:

```bash
# Install from marketplace
claude mcp install <plugin-name>

# Or symlink manually
ln -s ~/.claude/plugins/<skill-name> .claude/skills/<skill-name>
```

Do NOT commit the skill contents here — only README entries. Each skill directory here is a local-only reference.

## End-user skills

All skills shipped with the plugin are in `skills/` at the repo root, organized into three categories:

- **`skills-engineering`** — General engineering skills (api-design, tdd-patterns, etc.) — auto-trigger
- **`skills-pipeline-artifacts`** — Pipeline document writers (write-sdd, write-ux-spec, etc.) — invoked by agents
- **`skills-pipeline-mechanics`** — Internal pipeline coordination (circuit-breaker, sc-adviser, etc.) — pipeline-internal

See `manifests/install-modules.json` for the full taxonomy.
