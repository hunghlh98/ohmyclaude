# Skill Anti-Patterns — Known Problems and Fixes

Each entry: problem → why it's a problem → specific fix.

---

## 1. "When to Use This Skill" Section in Body

**Problem**: A section titled "When to Use" or "Use Cases" inside the SKILL.md body.

**Why it fails**: The SKILL.md body is only loaded AFTER the skill has already triggered. By the time Claude reads the body, the activation decision is made. This section wastes tokens on every invocation with zero effect on behavior.

**Fix**: Move all activation guidance into the frontmatter `description` field. That is the only part Claude reads to decide whether to activate.

---

## 2. Explaining What Claude Already Knows

**Problem**: Prose explaining standard programming concepts — "REST APIs use HTTP methods", "always validate user input", "use descriptive variable names".

**Why it fails**: Claude knows this. Every line of obvious content is a token that doesn't help and adds to context cost on every invocation. Per Anthropic lessons: "focus on information that pushes Claude out of its normal way of thinking."

**Fix**: Delete it. Ask: "Would a skilled developer need to be told this?" If yes, it stays. If no, it goes.

---

## 3. Deep Nested References

**Problem**: `references/` files that themselves link to further sub-references, or references nested more than one level from SKILL.md.

**Why it fails**: Claude can't efficiently navigate a deep reference tree. References buried multiple levels down will often not be read.

**Fix**: Keep all references one level from SKILL.md. Flat is better. If a reference file is too large, add a table of contents at the top rather than splitting it further.

---

## 4. README / CHANGELOG / INSTALLATION Inside Skill Directory

**Problem**: Files like `README.md`, `CHANGELOG.md`, `INSTALLATION.md`, `QUICK_REFERENCE.md`, `SETUP.md` inside the skill folder.

**Why it fails**: These are for human readers, not agents. They add directory noise and may confuse Claude about which files are relevant. They pad the skill size without helping execution.

**Fix**: Delete them. Documentation for humans should live outside the skill directory. The skill should only contain what an agent needs to do the job.

---

## 5. Missing Gotchas Section

**Problem**: No Gotchas section after the skill has been in use for 3+ months.

**Why it fails**: The Gotchas section is the highest-signal content in any skill. It's built from real failure points. A skill without one hasn't been iterated from real usage — it's still theoretical.

**Fix**: Run the skill on real tasks. Record every time Claude gets confused, takes a wrong path, or produces bad output. Add each failure as a specific gotcha with: the failure description, the context that triggers it, and the correct behavior.

---

## 6. Generic Gotchas

**Problem**: Gotchas that apply to any skill or any coding task: "validate all inputs", "handle errors", "don't hardcode secrets".

**Why it fails**: These are not gotchas for this skill — they're general best practices Claude already knows. They occupy the highest-signal slot in the skill with zero marginal value.

**Fix**: Replace with gotchas specific to this skill's exact domain. Every gotcha should name a failure mode that only exists in the context of this specific skill.

---

## 7. Hardcoded Values That Belong in References

**Problem**: Large tables (10+ rows), full JSON schemas, enum lists, or configuration values inline in SKILL.md body.

**Why it fails**: These should be in `references/` for progressive disclosure. Every invocation loads the full SKILL.md body — inlining large tables increases token cost even when they're not needed for the current task.

**Fix**: Move to `references/your-table.md`. Link from SKILL.md with "Load `references/your-table.md` for [when to load]."

---

## 8. Duplicating Content from Another Skill

**Problem**: A skill that copies or paraphrases content from another skill (e.g., C4 syntax copied into a skill when `c4-architecture` already exists).

**Why it fails**: Duplication drifts. The original skill may be updated; the copy stays stale. Per skill-creator: "reference instead."

**Fix**: Reference the other skill by name. Example: "For C4 syntax and anti-patterns, load the `c4-architecture` skill."

---

## 9. Version/Changelog Noise Inside SKILL.md

**Problem**: Version headers like `> **Version:** 1.3 | **Date:** 2026-03-26` at the top of SKILL.md.

**Why it fails**: Agents don't need version history — they need current instructions. This adds tokens to every invocation and provides no execution value.

**Fix**: Delete version headers from SKILL.md. Git history tracks changes. If the user needs versioning, keep it in a separate human-facing changelog outside the skill directory.

---

## 10. Config Without Setup Detection

**Problem**: A skill that needs user configuration (API keys, account IDs, project keys) but doesn't check for the config file before trying to use it.

**Why it fails**: Claude will fail mid-execution and give a confusing error when the config is missing.

**Fix**: Open with a config existence check (as in `jira-log`):
```bash
test -f ~/.claude/config/skill-name.md && echo "EXISTS" || echo "MISSING"
```
If MISSING, run interactive setup before proceeding. Store config in `${CLAUDE_PLUGIN_DATA}` for persistence across upgrades.

---

## 11. Over-Railroading (Too Much Specificity)

**Problem**: Exhaustive step-by-step instructions that leave Claude no room to adapt — specifying the exact curl flags, exact file names, exact wording of every response.

**Why it fails**: Skills are reusable across contexts. Over-specification makes the skill brittle. When context differs slightly, Claude either fails or produces mechanical output.

**Fix**: Calibrate freedom to fragility. Use exact templates only for operations that are genuinely error-prone or require consistency (structured artifact formats, API calls). Use heuristic guidance for judgment calls (what to analyze, how to interpret findings).
