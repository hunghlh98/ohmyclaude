# Contributing to ohmyclaude

## Before You Start

Read the [PLUGIN_SCHEMA_NOTES.md](.claude-plugin/PLUGIN_SCHEMA_NOTES.md) — it documents the validator quirks that will save you debugging time.

Run validation before any commit:
```bash
node scripts/validate.js
```

---

## Project Structure

Two categories of files exist in this repo. Know which is which:

| Category | Files | Purpose |
|----------|-------|---------|
| **Plugin deliverable** | `agents/`, `skills/`, `commands/`, `hooks/`, `rules/`, `contexts/`, `.claude-plugin/`, `.mcp.json`, `mcp/`, `manifests/` | Shipped to end users |
| **Repo dev config** | `scripts/`, `tests/`, `.github/`, `CONTRIBUTING.md`, `package.json` | Repo maintenance only |

**`CLAUDE.md` (this file's sibling) is a contributor guide — not end-user content.**

---

## Working Style

### Naming Convention — Greek Mythology Theme

All agents follow the Greek mythology theme. When adding a new agent, pick a name whose **mythological role matches the agent's function**:

| Agent | Myth role | Plugin function |
|-------|-----------|----------------|
| Hermes | Messenger, connector | Orchestrator — routes work |
| Hephaestus | Smith, builder | Implementer — forges code |
| Athena | Wisdom, strategy | Code reviewer — judges quality |
| Apollo | Reason, light | Architect — illuminates structure |
| Argus | Hundred-eyed guardian | Security reviewer — sees everything |
| Heracles | Hero of trials | Debugger — solves hard problems |
| Momus | God of criticism | Test writer — finds every gap |
| Mnemosyne | Memory | Docs writer — preserves knowledge |
| Metis | Deep counsel | Clarifier — asks the right questions |
| Nemesis | Balance, retribution | Plan validator — keeps plans honest |
| Eris | Productive discord | Challenger — devil's advocate |

Don't pick a name just because it sounds good. The myth must fit the function.

### Agent Workflow Order

The intended pipeline is:

```
Metis → Hermes → Nemesis → (Eris) → Hephaestus → Momus → Athena → Argus → Mnemosyne
```

New agents should slot into this pipeline with a clear position. Document where in the workflow the agent belongs.

### Model Selection

| Model | When to use |
|-------|------------|
| `opus` | Expensive analysis, architecture (Apollo only by default) |
| `sonnet` | Most agents — good balance |
| `haiku` | High-volume, low-complexity (Mnemosyne) |

Don't use `opus` unless the agent genuinely needs deep reasoning. Justify it in the PR.

### Read-Only Agents

Review agents (Athena, Apollo, Argus, Metis, Nemesis, Eris) must **never** have `Write`, `Edit`, or `MultiEdit` in their tools list. They observe and advise only.

---

## Documentation Rule

**Any change that affects public behavior must update documentation in the same commit. No exceptions.**

| What changed | What to update |
|-------------|---------------|
| New agent added | `README.md` agents table + group, `ROADMAP.md` v0.1 checklist |
| New skill added | `README.md` skills list with trigger keywords |
| New command added | `README.md` commands table |
| New context added | `README.md` contexts table |
| New hook added | `README.md` hooks list |
| New install profile | `README.md` install section, `manifests/install-profiles.json` |
| Any new module | `manifests/install-modules.json` + relevant profile(s) |
| Version bumped | `VERSION`, `package.json`, `plugin.json`, `marketplace.json` — all 4 |
| Behavior changed | `README.md` relevant section + context file if mode affected |

**The PR checklist blocks merge if `README.md` is not updated.** If you're unsure whether a change requires a doc update, it does.

---

## Adding a New Context

Create `contexts/<mode-name>.md`:

```markdown
# <Mode Name> Context

Mode: <short description>
Agents: @<primary> (primary), @<secondary> (secondary role)

## Behavior
- <Rule 1>
- <Rule 2>

## Agent Delegation
- <Task type> → @<agent>

## Tools to Favor
- <Tool> — why

## Output Format
<What the output should look like>
```

Then update:
- `README.md` — add row to the Contexts table
- `manifests/install-modules.json` — add path to `contexts` module paths list
- `ROADMAP.md` — if it's a new v0.x feature

---

## Adding a New Agent

1. Create `agents/<name>.md` with required frontmatter:

```markdown
---
name: <lowercase-name>
description: <One sentence. What triggers auto-invocation. Mention /command or @name usage.>
tools: ["Read", "Grep", "Glob"]
model: sonnet
---

You are <Name>, <mythological role>. <What that means for this plugin>.

## Your Role
...

## What You Do NOT Do
...
```

2. Add the explicit file path to `.claude-plugin/plugin.json` `agents` array (not a directory — see schema notes).

3. Add the module entry to `manifests/install-modules.json`.

4. Assign the agent to one or more profiles in `manifests/install-profiles.json`.

5. Run `node scripts/validate.js` — all checks must pass.

6. Document the agent in `README.md` under the correct group (Orchestration / Implementation / Review).

---

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md`:

```markdown
---
name: <skill-name>
description: <One sentence describing what this skill teaches.>
origin: ohmyclaude
---

# <Skill Title>

Use this skill when the user mentions: <trigger keywords>.

## <Section>
...

## Anti-Patterns
...
```

The **"Use this skill when..."** line is critical — it drives auto-activation. Without it, the skill never loads.

2. Run `node scripts/validate.js` to confirm the file is detected.

---

## Adding a New Command

Create `commands/<command-name>.md`:

```markdown
---
description: <One sentence shown in the command picker.>
---

# /<command-name>

<What this command does in 1-2 sentences.>

## What This Command Does
<Numbered steps>

## When to Use
<Scenarios>

## Related Agents
- **@<agent>** — why
```

Commands describe workflows and invoke agents — they contain no logic themselves.

---

## Adding a Hook

1. Add the hook entry to `hooks/hooks.json`:

```json
{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/scripts/my-hook.js\"",
    "timeout": 10
  }],
  "description": "One sentence: what this hook does and why"
}
```

2. Create `hooks/scripts/my-hook.js` following the stdin/stdout passthrough pattern:

```js
'use strict';
let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  const input = JSON.parse(raw);
  // ... your logic ...
  process.stdout.write(raw); // always pass through
  process.exit(0);           // 0 = allow, 2 = block (PreToolUse only)
});
```

3. Add the module to `manifests/install-modules.json`.

**Hook rules:**
- Always pass stdin through to stdout — never drop it
- Only exit code `2` blocks (and only in `PreToolUse`)
- Async hooks (`"async": true`) must not block the conversation
- Never call the Claude API from a hook script

---

## Versioning

All three version sources must match or CI fails:

| File | Field |
|------|-------|
| `VERSION` | entire file content |
| `package.json` | `version` |
| `.claude-plugin/plugin.json` | `version` |
| `.claude-plugin/marketplace.json` | `version` |

To bump the version:
```bash
NEW=0.2.0
echo $NEW > VERSION
# update package.json, plugin.json, marketplace.json manually
node scripts/validate.js  # verify
git add -A && git commit -m "chore: bump version to $NEW"
git tag v$NEW && git push origin main v$NEW
```

The release workflow creates the GitHub release automatically on tag push.

---

## Pull Request Checklist

Before opening a PR:

**Validation**
- [ ] `node scripts/validate.js` passes with no errors
- [ ] New agent files have all required frontmatter (`name`, `description`, `tools`, `model`)
- [ ] New skill files have a "Use this skill when..." activation line
- [ ] `plugin.json` uses explicit file paths for agents (no directory refs)
- [ ] No `hooks` field in `plugin.json`
- [ ] Version is consistent across all 4 files (if bumped)

**Manifests**
- [ ] `manifests/install-modules.json` updated if new module added
- [ ] `manifests/install-profiles.json` updated if new module should be in a profile

**Documentation — required for every change that affects public behavior**
- [ ] `README.md` updated (new agent / skill / command / context / hook → add to the relevant table)
- [ ] `ROADMAP.md` updated if this completes or adds a milestone item
- [ ] `contexts/` updated if behavior change affects a working mode
- [ ] `CONTRIBUTING.md` updated if the contribution process itself changes

**Commit**
- [ ] Commit message follows Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- [ ] `docs:` commits used when only documentation changes

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(agents): add Prometheus agent for strategic planning
fix(hooks): pre-write-check false positive on test files
chore: bump version to 0.2.0
docs: update README with LSP setup instructions
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
