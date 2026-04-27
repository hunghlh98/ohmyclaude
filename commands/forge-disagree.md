---
description: Record a HUMAN-VERDICT-<id>.md when you disagree with @val-evaluator's verdict on TEST-<id>.md. Feeds the evaluator-tuning calibration loop. Argument: TEST id (e.g. TEST-001 or 001).
---

# /forge-disagree — Record a Human-vs-Val Verdict Disagreement

Use this when @val-evaluator graded a sprint and you (the human reviewer) disagree. The command writes a `HUMAN-VERDICT-<id>.md` artifact in the format documented in `skills/evaluator-tuning/SKILL.md`. After ≥3 such disagreements cluster around a class, the next `/forge` SessionStart will surface a tuning reminder, and a real human can run the read-logs → patch-prompt loop in the `evaluator-tuning` skill.

Argument: the TEST id, with or without the `TEST-` prefix. Examples: `/forge-disagree TEST-001`, `/forge-disagree 001`.

## Steps

1. **Resolve the id.**
   - Strip a leading `TEST-` from `$ARGUMENTS` if present.
   - The artifact id is `HUMAN-VERDICT-<id>`; the source verdict is `TEST-<id>`.
   - If `$ARGUMENTS` is empty, list the most recent `.claude/pipeline/TEST-*.md` files and ask which one to disagree with via `AskUserQuestion`.

2. **Read Val's verdict.**
   - Read `.claude/pipeline/TEST-<id>.md`.
   - If the file does not exist, abort with: "No TEST-<id>.md in `.claude/pipeline/`. Either the id is wrong, or Val hasn't graded this sprint yet."
   - Extract the one-line summary: verdict (PASS/FAIL), `weighted_score`, threshold.

3. **Check for existing HUMAN-VERDICT.**
   - If `.claude/pipeline/HUMAN-VERDICT-<id>.md` already exists, read it and ask via `AskUserQuestion` whether to overwrite or abort. Default: abort to prevent accidental overwrite.

4. **Gather the disagreement via `AskUserQuestion`.**

   Ask exactly four questions in a single `AskUserQuestion` call (do NOT ask one at a time):

   - **Q1 — Did you agree with Val?** Single-select.
     - `no` — disagree on verdict or score
     - `partially` — agree on direction, disagree on degree
     - `yes` — agree (in which case, why are you running this command? — abort and tell the user the artifact is for disagreements only)

   - **Q2 — What would you have said?** Free-text via the user's "Other" option (no fixed choices). Phrase: "In one sentence, what verdict and rationale would you have given?"

   - **Q3 — Why do you differ?** Free-text. Phrase: "Which criterion / probe / weighting do you read differently? Be specific — name the criterion number from CONTRACT-<id>.md."

   - **Q4 — Is this a class or one-off?** Single-select.
     - `class` — this is a pattern Val will keep repeating
     - `one-off` — specific to this sprint, not a heuristic gap

   If Q4 is `class`, follow up with one more `AskUserQuestion`: "Name the class in 1 line. Examples: 'Shape-blind PASS — Val accepts 2xx without checking response shape.', 'Coverage-driven verdict — Val rounds up when coverage is high.'" (Free-text via "Other".)

5. **Write the artifact.**

   Write to `.claude/pipeline/HUMAN-VERDICT-<id>.md` with this exact frontmatter and structure (matches `skills/evaluator-tuning/SKILL.md:43-68`):

   ```markdown
   ---
   id: HUMAN-VERDICT-<id>
   val_verdict_ref: TEST-<id>
   agreed_with_val: <yes|no|partially>
   date: <YYYY-MM-DD>
   ---

   ## What Val said
   <Val's verdict and weighted_score, e.g. "PASS, weighted_score: 85, threshold: 80">

   ## What I'd say
   <user's Q2 response>

   ## Why we differ
   <user's Q3 response>

   ## Heuristic gap (if any)
   <user's Q5 response if Q4 was "class"; otherwise the literal string "(one-off, no class identified)">
   ```

   Use today's date in YYYY-MM-DD form.

6. **Confirm.**

   Print one line: `Wrote .claude/pipeline/HUMAN-VERDICT-<id>.md (agreed_with_val: <value>, class: <class-name-or-one-off>).`

   Then count: `ls .claude/pipeline/HUMAN-VERDICT-*.md | wc -l`. If the count is ≥3 since the last `agents/val-evaluator.md` modification (use `git log -1 --format=%aI agents/val-evaluator.md` for the watermark), append: `🔁 Tuning due: ${count} HUMAN-VERDICT files since last Val patch. Run the read-logs → find-divergence → patch loop in skills/evaluator-tuning/SKILL.md.`

## What this command does NOT do

- It does NOT change Val's verdict. Past TEST-<id>.md verdicts are immutable per `agents/val-evaluator.md:176`.
- It does NOT update `agents/val-evaluator.md`. That is a deliberate human-in-the-loop activity per `skills/evaluator-tuning/SKILL.md:131-134` ("Don't patch Val's prompt without ≥3 HUMAN-VERDICT instances of the same class").
- It does NOT trigger an automatic re-run. The disagreement is data; the patch is a separate, deliberate action.

## Related

- `agents/val-evaluator.md` — Val's prompt and current Calibration Patches
- `skills/evaluator-tuning/SKILL.md` — the tuning loop this command feeds
- `skills/write-contract/references/calibration-examples.md` — few-shot anchors the calibration hook injects on every val-evaluator Task spawn
