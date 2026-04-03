---
name: setup
description: One-time setup after marketplace install — copies contexts and adds shell aliases for claude-oss, claude-dev, claude-review, claude-debug.
---

# /setup

Run once after `claude plugin install hunghlh98/ohmyclaude` to enable context-mode shell aliases.

## What it does

1. Copies `contexts/*.md` → `~/.claude/contexts/`
2. Injects 4 aliases into `~/.zshrc` / `~/.bashrc`
3. Prints reload instructions

## Usage

```
/setup
```

Then reload your shell:
```bash
source ~/.zshrc   # or ~/.bashrc
```

## After setup

```bash
claude-oss      # full OSS pipeline  (all 14 agents, /forge entry point)
claude-dev      # implementation     (@beck-backend + @effie-frontend + @quinn-qa)
claude-review   # code & security    (@stan-standards + @percy-perf + @sam-sec)
claude-debug    # debugging          (@heracles)
```

## How it works

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/postinstall.js
```

## When to re-run

- After `claude plugin update hunghlh98/ohmyclaude` to refresh contexts
- If your aliases are missing or stale
