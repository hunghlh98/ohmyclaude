# Skill Profiler — Scoring Rubric

Score each dimension 0, 5, or 10. Interpolate for values between anchors.

---

## 1. Trigger Precision (0–10)

Does the `description` field cause the skill to activate for the right tasks and only those tasks?

| Score | Criteria |
|-------|----------|
| **0** | Description is vague ("general purpose helper") or will trigger on unrelated tasks |
| **5** | Mostly correct activation; 1-2 realistic false-positive scenarios; description misses edge cases |
| **10** | Laser-precise — no false positives; includes explicit "NOTE: for X use Y skill instead" boundary; trigger keywords match exactly how users phrase the task |

**Scoring guidance**:
- Read the description as if you had no other context. Would you activate this skill for a request that has nothing to do with it?
- Check: does the description include "when NOT to use" boundaries for commonly confused scenarios?
- Excellent example: owasp-security-review includes 7 trigger examples showing exactly which phrases activate it

---

## 2. Body Length (0–10)

Is the SKILL.md body appropriately lean?

| Score | Criteria |
|-------|----------|
| **0** | >800 lines — significant reference material should be in `references/` |
| **5** | 300–500 lines — some chunky sections that could be offloaded |
| **10** | <200 lines for thin-trigger skills; <300 lines for workflow skills. All detailed reference material is in `references/` |

**Scoring guidance**:
- Count lines in the body (exclude frontmatter)
- Tables of 10+ rows, long enum lists, full schemas → should be in `references/`
- Thin-trigger pattern (like owasp-security-review): ~40-50 lines is optimal
- Workflow skills (like task-breakdown): 80-100 lines is optimal

---

## 3. Progressive Disclosure (0–10)

Is the file system used as context engineering? Are details deferred to `references/`?

| Score | Criteria |
|-------|----------|
| **0** | Flat structure — just SKILL.md, no `references/` despite having 3+ large reference sections |
| **5** | Some `references/` used but main body still contains inline tables/schemas that belong there |
| **10** | SKILL.md is navigation and essentials only. `references/` files are linked with clear "when to load" guidance. Each reference file stands alone |

**Scoring guidance**:
- Does SKILL.md tell Claude which `references/` file to read and when?
- Are reference files structured with their own headers/TOC if >100 lines?
- Are there any reference files that are never actually mentioned in SKILL.md?

---

## 4. Gotchas Quality (0–10)

⭐ **HIGHEST SIGNAL DIMENSION** — built from real failure points, not assumptions

| Score | Criteria |
|-------|----------|
| **0** | No Gotchas section — skill has never been iterated from real usage |
| **5** | Gotchas exist but are generic ("make sure to validate input") or obvious things Claude already knows |
| **10** | Specific gotchas derived from real failure modes for this exact skill domain. Each gotcha names the specific failure, the context that triggers it, and the fix. Updated over time as Claude encounters new edge cases |

**Scoring guidance**:
- Generic gotchas = 2-3 points, not 5+. Examples of generic (low value):
  - "Always handle errors properly"
  - "Make sure to test your changes"
  - "Don't hardcode credentials"
- Specific gotchas = 8-10 points. Examples of specific (high value):
  - "If a SKILL.md has a 'When to Use This Skill' section in the body, it has zero effect — the body only loads after activation. Remove it."
  - "C4 diagram: `Rel_U()` / `Rel_D()` direction arrows are ignored in some Mermaid renderers — don't rely on them for layout"
  - "task-breakdown: AI SP should be 0 for SPIKE tasks — spikes are investigation, Claude isn't replacing the exploration"

---

## 5. Redundancy (0–10)

Is content duplicated between SKILL.md body and `references/` files, or between this skill and other skills?

| Score | Criteria |
|-------|----------|
| **0** | >30% of content duplicated — same tables/instructions appear in both body and references |
| **5** | Minimal overlap — 1-2 sections are slightly redundant |
| **10** | Zero duplication. SKILL.md body contains only what's not in references. No content that already exists in another skill (reference instead) |

---

## 6. Asset Separation (0–10)

Are the right files in the right places?

| Score | Criteria |
|-------|----------|
| **0** | Scripts embedded inline in SKILL.md; no `scripts/` or `assets/` directory despite the skill needing them |
| **5** | `references/` exists but contains template files that should be in `assets/`; scripts exist but aren't tested |
| **10** | Clear separation: `references/` for docs Claude reads, `scripts/` for executable code, `assets/` for template files to copy. README/CHANGELOG/INSTALLATION absent. Only execution-relevant files present |

---

## 7. Workflow Clarity (0–10)

Can Claude execute the skill without ambiguity?

| Score | Criteria |
|-------|----------|
| **0** | Prose paragraphs describing the workflow; no numbered steps; decision points are implicit |
| **5** | Steps exist but some are vague ("analyze the request") without criteria for what that means; missing conditional branching |
| **10** | Numbered imperative steps with explicit decision points ("If X → do A; if Y → do B"). Low-freedom operations use exact templates. High-freedom operations explain the heuristic |

**Scoring guidance**:
- "Analyze the codebase" → 2 points. "Grep for `class.*Controller` to find entry points, Glob `**/*.test.*` to find test coverage" → 9 points
- Does the skill tell Claude what to do when something unexpected happens?
