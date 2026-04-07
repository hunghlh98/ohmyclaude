# Contributing to ohmyclaude

## Before You Start

Read the [PLUGIN_SCHEMA_NOTES.md](.claude-plugin/PLUGIN_SCHEMA_NOTES.md) — it documents the validator quirks that will save you debugging time.

Run validation before any commit:
```bash
node scripts/validate.js
```

---

## Project Structure

| Category | Files | Purpose |
|----------|-------|---------|
| **Plugin deliverable** | `agents/`, `skills/`, `commands/`, `hooks/`, `rules/`, `.claude-plugin/`, `manifests/`, `schemas/` | Shipped to end users |
| **Repo dev config** | `scripts/`, `.github/`, `CONTRIBUTING.md`, `package.json` | Repo maintenance only |
| **Dev-only skills** | `.claude/skills/` | Local skills for developing ohmyclaude — NOT shipped |

---

## Working Style

### Naming Convention — Corporate Slack Persona Theme

All agents follow the "Corporate Slack" persona theme — a recognizable human name that signals their role and personality.

| Agent | Persona | Role |
|-------|---------|------|
| paige-product | Pragmatic Skeptic | Team lead, Grand Router, Oracle |
| artie-arch | Elegant Purist | C4 system architect |
| una-ux | The Empath | UX spec (pre-dev) + accessibility review (post-dev) |
| sam-sec | The Doomsayer | Security, compliance, adversarial validation |
| beck-backend | Blue-Collar Builder | BE implementer (BE-only scope) |
| effie-frontend | Pixel Artisan | FE implementer (FE-only scope) |
| quinn-qa | Professional Troll | Test writer + fuzz generator |
| stan-standards | Wise Mentor | Logic + performance + language reviewer (read-only) |
| devon-ops | The Timekeeper | Docs + release + announcement (ultimate trump card) |
| heracles | — | Debugger (utility, on-demand) |

### Agent Teams Workflow

```
/forge <request>
  ├── Project discovery (graph > tree > grep)
  ├── TeamCreate
  ├── @paige-product classifies + decomposes into tasks
  ├── Agents work in parallel waves
  ├── Artifacts written to .claude/pipeline/ for human review
  └── TeamDelete + summary
```

### Model Selection

| Model | When to use |
|-------|------------|
| `opus` | Deep reasoning, architecture (artie-arch only by default) |
| `sonnet` | Most agents — 90% of tasks |
| `haiku` | Templated work (devon-ops only) |

Don't use `opus` unless the agent genuinely needs deep reasoning. Justify it in the PR.

### Read-Only Agents

These agents must **never** have `Write`, `Edit`, or `MultiEdit` in their tools list:
- `artie-arch`, `una-ux` (pre-dev role only), `stan-standards`, `sam-sec` (except Bash)

### Token Budget Rules

- **Skills**: ≤400 lines per SKILL.md (≈500 tokens). Verbose content in `references/`.
- **Agent descriptions**: ≤30 words (loaded in every Task invocation — bloat is expensive).
- **Token estimation**: words x 1.3 for prose, chars / 4 for code.

---

## Documentation Rule

**Any change that affects public behavior must update documentation in the same commit.**

| What changed | What to update |
|-------------|---------------|
| New agent added | `README.md` agents table, `ROADMAP.md` |
| New skill added | `README.md` skills list |
| New rule added | `README.md` rules section |
| New hook added | `README.md` hooks list |
| Version bumped | `node scripts/bump-version.js` (handles all 4 files) |
| Behavior changed | `README.md` relevant section |

---

## Adding a New Agent

1. Create `agents/<name>.md` with required frontmatter:

```yaml
---
name: <lowercase-name>
description: Use @<name> for <what>. Under 30 words.
tools: ["Read", "Grep", "Glob"]
model: sonnet
color: blue
---
```

2. Add `<example>` blocks after frontmatter for reliable auto-triggering.

3. Add the explicit file path to `.claude-plugin/plugin.json` `agents` array.

4. Add the module entry to `manifests/install-modules.json`.

5. Assign to profiles in `manifests/install-profiles.json`.

6. Run `node scripts/validate.js` — all checks must pass.

7. Document in `README.md` under the correct tier.

---

## Adding a New Skill

### Skill taxonomy

| Category | Module | Who uses it | Examples |
|----------|--------|-------------|---------|
| **General engineering** | `skills-engineering` | Any user, standalone | `api-design`, `tdd-patterns` |
| **Java / Spring Boot** | `skills-java` | Java backend developers | `springboot-patterns`, `springboot-tdd` |
| **Pipeline artifact writers** | `skills-pipeline` | Specific agents, writes named docs | `write-sdd`, `write-code-review` |
| **Specialized** | `skills-specialized` | Pipeline coordination, project tools | `task-breakdown`, `project-discovery` |

### Steps

1. Create `skills/<skill-name>/SKILL.md` (≤400 lines) with frontmatter:

```yaml
---
name: <skill-name>          # MUST match folder name
description: Under 200 chars with trigger keywords.
origin: ohmyclaude
---
```

2. Optional: Create `skills/<skill-name>/references/` for verbose content.

3. Add to the correct module in `manifests/install-modules.json`.

4. Run `node scripts/validate.js`.

5. Document in `README.md` under the correct category.

---

## Adding a Language Rule

1. Create `rules/<language>/<rule-name>.md` with frontmatter:

```yaml
---
paths:
  - "**/*.<extension>"
---
```

2. Add to the `rules-<language>` module in `manifests/install-modules.json`.

3. Document in `README.md` rules section.

---

## Adding a Hook

1. Add the hook entry to `hooks/hooks.json`.

2. Create `hooks/scripts/<hook-name>.js` following the stdin/stdout passthrough pattern:

```js
'use strict';
let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  // ... your logic ...
  process.stdout.write(raw); // always pass through
  process.exit(0);           // 0 = allow, 2 = block (PreToolUse only)
});
```

3. Add to a hooks module in `manifests/install-modules.json`.

**Hook rules:**
- Always pass stdin through to stdout
- Only exit code `2` blocks (PreToolUse only)
- Async hooks (`"async": true`) must not block the conversation
- Never call the Claude API from a hook script

---

## Versioning

Use the bump script (handles all 4 files atomically):
```bash
node scripts/bump-version.js --patch   # 1.0.0 → 1.0.1
node scripts/bump-version.js --minor   # 1.0.0 → 1.1.0
node scripts/bump-version.js --major   # 1.0.0 → 2.0.0
node scripts/bump-version.js 1.2.3     # explicit version
```

Then validate and commit:
```bash
node scripts/validate.js
git add -A && git commit -m "chore: bump version to X.Y.Z"
```

---

## Pull Request Checklist

**Validation**
- [ ] `node scripts/validate.js` passes with no errors
- [ ] New agent files have all required frontmatter (`name`, `description`, `tools`, `model`, `color`)
- [ ] Agent descriptions ≤30 words with `<example>` blocks
- [ ] New skill files have `origin: ohmyclaude` and match folder name
- [ ] Skill SKILL.md ≤400 lines
- [ ] `plugin.json` uses explicit file paths for agents
- [ ] No `hooks` field in `plugin.json`
- [ ] Version consistent across all 4 files (use bump-version.js)

**Manifests**
- [ ] `manifests/install-modules.json` updated if new module added
- [ ] `manifests/install-profiles.json` updated if new module should be in a profile

**Documentation**
- [ ] `README.md` updated (new agent / skill / rule / hook → add to relevant table)
- [ ] `ROADMAP.md` updated if this completes or adds a milestone item
- [ ] No references to retired agents (scout-sprint, percy-perf, polyglot-reviewer, dora-docs, evan-evangelist, build-resolver, anna-analytics)

**Commit**
- [ ] Conventional Commits format (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
