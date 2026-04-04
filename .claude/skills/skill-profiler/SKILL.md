---
name: skill-profiler
description: Skill quality auditor — evaluates a SKILL.md for trigger precision, body length, progressive disclosure, gotchas quality, and token cost. Use when: profiling a skill, auditing a SKILL.md, tuning a skill for performance or cost, reviewing skill quality, checking if a new skill follows best practices, iterating after real usage. NOTE: For refactoring CLAUDE.md or AGENTS.md files, use the agent-md-refactor skill instead.
origin: ohmyclaude
---

# Skill Profiler

Use this skill when asked to profile, audit, tune, or review the quality of a SKILL.md file.

## Workflow

1. **Read** the target SKILL.md (and any `references/` files if they exist)
2. **Classify** the skill into one of the 9 categories below
3. **Load** `references/scoring-rubric.md` and score each dimension
4. **Check** `references/anti-patterns.md` for specific violations
5. **Output** the profiler report using the exact template below

## Skill Categories (9 Types)

| # | Category | Description |
|---|----------|-------------|
| 1 | Library/API Reference | How to correctly use a library, CLI, or SDK — edge cases, gotchas |
| 2 | Product Verification | Testing/verifying code is working (often with scripts or external tools) |
| 3 | Data Fetching & Analysis | Connects to data/monitoring stacks; fetches, queries, analyzes |
| 4 | Business Process & Automation | Automates repetitive workflows into one command |
| 5 | Code Scaffolding & Templates | Generates framework boilerplate for specific patterns |
| 6 | Code Quality & Review | Enforces quality standards; reviews code |
| 7 | CI/CD & Deployment | Fetches, pushes, deploys code; pipeline automation |
| 8 | Runbook | Symptom → investigation → structured report workflow |
| 9 | Infrastructure Ops | Routine maintenance and operational procedures |

## Report Template

ALWAYS output in this exact format:

```
## Skill Profiler Report: <skill-name>

**Skill Category**: [category name]
**Overall Score**: X.X / 10

| Dimension              | Score | Finding |
|------------------------|-------|---------|
| Trigger precision      | x/10  | ... |
| Body length            | x/10  | ... |
| Progressive disclosure | x/10  | ... |
| Gotchas quality        | x/10  | ... |
| Redundancy             | x/10  | ... |
| Asset separation       | x/10  | ... |
| Workflow clarity       | x/10  | ... |

### Top Tuning Recommendations
1. [HIGH] <specific file path + line range if applicable> — what to change and why
2. [MEDIUM] ...
3. [LOW] ...

### Gotchas Gap (if score < 7)
List specific gotchas this skill should include based on its domain and failure modes.
```

Overall score = average of 7 dimensions, rounded to 1 decimal.

## Gotcha

If a SKILL.md has **no Gotchas section** AND the file was last modified more than 90 days ago, automatically flag as `[HIGH]` in recommendations: "Skill has no Gotchas section after 90+ days — it hasn't been iterated from real usage. Add gotchas derived from actual failure patterns."

## References

- [Scoring rubric with 0/5/10 anchors](references/scoring-rubric.md)
- [Known anti-patterns with fixes](references/anti-patterns.md)
