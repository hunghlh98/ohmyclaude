---
description: One-time setup after marketplace install — copies contexts and adds shell aliases for claude-dev, claude-review, claude-plan, claude-debug, claude-research.
---

# /setup

Run this once after installing ohmyclaude via the Claude Code marketplace to enable context-mode shell aliases.

## What This Command Does

1. Runs `postinstall.js` from the plugin directory
2. Copies `contexts/*.md` to `~/.claude/contexts/`
3. Injects aliases into your shell config (`~/.zshrc` or `~/.bashrc`)
4. Prints reload instructions

## When to Use

- After `claude plugin install hunghlh98/ohmyclaude` (marketplace install)
- After updating the plugin to get new/updated contexts
- If your aliases are missing or broken

## How It Works

```bash
node "$CLAUDE_PLUGIN_ROOT/scripts/postinstall.js"
```

`$CLAUDE_PLUGIN_ROOT` is set automatically by Claude Code when running commands from an installed plugin. If it is unset, set it manually before running:

```bash
export CLAUDE_PLUGIN_ROOT="<path-to-ohmyclaude>"
node "$CLAUDE_PLUGIN_ROOT/scripts/postinstall.js"
```

Then reload your shell:
```bash
source ~/.zshrc   # or ~/.bashrc
```

## After Setup

```bash
claude-dev        # start Claude in implementation mode
claude-review     # start Claude in review mode
claude-plan       # start Claude in planning mode
claude-debug      # start Claude in debug mode
claude-research   # start Claude in research mode
```

## Note

If npm is available in your environment, postinstall runs automatically on marketplace install and this command is not needed.
