---
name: evaluator-tuning
description: Documents the read-logs → find-divergence → update-prompt loop for keeping @val-evaluator's judgment aligned with human reviewers over time. Loaded by @paige-product (post-run cost surface) and the user (manual calibration sessions). Triggers on "tune evaluator", "calibrate val", "audit verdicts", "evaluator drift".
origin: ohmyclaude
---

# Evaluator Tuning

The single highest-leverage operational practice for the v3.0.0+ pipeline. Without it, @val-evaluator's prompt drifts from human judgment over time and the structural separation of generator/evaluator stops paying.

The harness paper:

> Out of the box, Claude is a poor QA agent. Early runs: Claude identified legitimate issues → talked itself into deciding they weren't a big deal → approved anyway. Even after tuning, output showed QA limits: small layout issues, unintuitive interactions, bugs in deeply nested features the evaluator hadn't exercised.
>
> The tuning loop: (1) read evaluator logs, (2) find divergence from your judgment, (3) update QA prompt for that divergence class, (4) repeat many rounds.

---

## When to invoke

- After 5+ /forge runs since the last tuning pass
- When a `HUMAN-VERDICT-<id>.md` artifact disagrees with Val's verdict on the same id
- When `cost-profiler.js` reports `cost_over_p95` repeatedly with no observed defect-prevention lift (Val may be over-confident → under-rejecting → no lift)
- Before bumping ohmyclaude minor versions
- When a new model release changes default agent behavior

---

## Inputs

All four already exist in the pipeline; this skill is the practice that ties them together:

| Source | Purpose | Path |
|--------|---------|------|
| **CONTRACT-* artifacts** | What was supposed to be tested | `.claude/pipeline/CONTRACT-*.md` |
| **TEST-* artifacts** | What Val actually verdict'd | `.claude/pipeline/TEST-*.md` |
| **HUMAN-VERDICT-* artifacts (optional)** | Where humans disagreed | `.claude/pipeline/HUMAN-VERDICT-*.md` |
| **subagent-trace.jsonl** (if `hooks-session` enabled) | Per-subagent telemetry pairing with cost-profiler | `~/.claude/ohmyclaude/sessions/<id>/traces.jsonl` |
| **PROFILE-* + baseline.json** | Cost trajectory | `.claude/pipeline/PROFILE-*.md`, `.claude/.ohmyclaude/metrics/baseline.json` |

---

## The HUMAN-VERDICT artifact (free-form, optional)

When a human reviewer disagrees with Val's verdict, write:

```markdown
---
id: HUMAN-VERDICT-001
val_verdict_ref: TEST-001
agreed_with_val: yes | no | partially
date: YYYY-MM-DD
---

## What Val said
[1-line summary of Val's verdict and weighted score]

## What I'd say
[1-line summary of the human verdict]

## Why we differ
[Free-form: which criterion / probe / weighting does the human read differently. Be specific — "Val accepted 200-with-empty-body as PASS for criterion 2; I'd require non-empty body when contract says JSON object."]

## Heuristic gap (if any)
[If the disagreement is a class, not a one-off: "Val gives PASS to any 2xx response, even when contract specifies response shape." This is the patch target.]
```

No schema validation — schema = `agreed_with_val` field plus a heuristic gap line. Free-form so the human writing this never has to fight the format.

---

## The tuning loop

### Step 1 — Inventory recent disagreements

```bash
# Across the project's pipeline directory
ls .claude/pipeline/HUMAN-VERDICT-*.md 2>/dev/null | wc -l    # how many human verdicts exist
grep -l 'agreed_with_val: no' .claude/pipeline/HUMAN-VERDICT-*.md
```

If zero "no" disagreements: Val is calibrated within human tolerance. Document and stop. Don't update the prompt without evidence.

### Step 2 — Cluster by heuristic gap

For each "no" verdict, read the `## Heuristic gap` section. Group by class:

| Class | Pattern | Count |
|-------|---------|-------|
| Shape-blind PASS | Val accepts 2xx without checking response shape | 4 |
| Flake tolerance | Val ignored a 1/3 flake rate as "passing" | 2 |
| Threshold drift | Val gave PASS at score=78 with threshold=80 | 1 |

A class with 3+ instances is a tuning target. Single-instance gaps are noise — track but don't patch.

### Step 3 — Patch Val's prompt

For each high-instance class, write a one-line **calibration patch** to `agents/val-evaluator.md` under a new section:

```markdown
## Calibration Patches v3.x

- v3.0.0 (2026-04-27): Shape-blind PASS class — when criterion specifies JSON shape, http_probe must include `expect.json.<path>` assertions, not just `expect.status`. Source: 4 HUMAN-VERDICTs.
- v3.0.1 (2026-05-15): Flake tolerance class — flake rate >0% is FAIL, not "round up". Source: 2 HUMAN-VERDICTs.
```

Keep patches as a running list, never delete. They are the project's evolving knowledge of where Val's defaults misalign with the team's quality bar.

### Step 4 — Re-add a few-shot example

For high-impact patches, add a worked example to `skills/write-contract/references/calibration-examples.md`. Per the harness paper, few-shot examples are the cheapest, most effective alignment lever — cheaper than prompt edits and more transferable across model versions.

### Step 5 — Verify with profile-run

After patches land:

```bash
node scripts/profile-run.js --recent 10
```

Look for:
- Did `total_usd` increase (Val being more thorough = more probes = more cost)?
- Did rerun-rate (REVISE rounds via subagent-trace) decrease (= caught more issues at gate, fewer late-stage rework)?

The trade is acceptable if rework reduction > cost increase. If neither moved, the patch missed the actual gap; revert and try again on the next class.

---

## What NOT to do

- **Don't patch Val's prompt without ≥3 HUMAN-VERDICT instances of the same class.** One-off disagreements are noise; you'll over-fit to a single reviewer's preferences.
- **Don't retroactively change past TEST-*.md verdicts.** Val's verdict is the record of what Val saw at that moment. The patch fixes future verdicts; the past is data, not error.
- **Don't lower the threshold to "match" Val.** If Val is too lenient, the answer is to make Val stricter; the threshold is the contract with the human, not with Val.
- **Don't expect the loop to converge.** Drift is continuous because contracts evolve as the project evolves. Plan for periodic re-tuning, not a one-time alignment.

---

## Anti-patterns the loop catches

| Pattern | Why Val falls into it | Patch direction |
|---------|----------------------|-----------------|
| **Talked-into-PASS** | Val notes a real issue then reasons it away | Add: "If you considered FAIL, document the consideration in the verdict body. Treat your first instinct as the strong prior." |
| **Coverage-driven verdict** | Val rounds up when coverage is high | Add: "Coverage is signal, not criterion. The verdict is criterion-driven." |
| **Probe-output trust** | Val assumes the probe spec is correct when it disagrees with intuition | Add: "If you doubt the probe, escalate to Paige for re-spec. Do not adjust the verdict to favor the implementer." |
| **Boundary-floor rounding** | Val gives PASS at exactly threshold (80=80) but is generous on edge | Add: "Threshold is inclusive (≥80). The next failure trips it. Communicate this in the verdict body." |

---

## Cost discipline

This loop is operational, not a /forge subroutine. It runs on the user's clock, not the agent's. There is no automated tuning *patch* hook (intentionally — the harness paper warns that auto-tuning evaluators against themselves recreates the self-evaluation blindness this whole pattern fixes).

What IS automated, since v3.x `[Unreleased]`:

- **`hooks/scripts/val-calibration.js`** (PreToolUse:Task) — every time `@val-evaluator` is spawned via Task, this hook prepends `references/calibration-examples.md` as a `<calibration-anchor>` block to the subagent's prompt. The "read calibration before grading" instruction is no longer a procedural expectation; it's a structural part of every val-evaluator invocation. Disable with `OHMYCLAUDE_HOOK_VAL_CALIBRATION=off`.
- **`hooks/scripts/session-load.js`** (SessionStart) — if `.claude/pipeline/` accumulates ≥3 `HUMAN-VERDICT-*.md` files marked `agreed_with_val: no | partially` since the last modification of `agents/val-evaluator.md` (the patch watermark), the hook emits a one-line stderr nudge to run this loop.
- **`/forge-disagree <test-id>`** (slash command) — UX surface for writing `HUMAN-VERDICT-<id>.md`. Reads Val's TEST-<id>.md, prompts via `AskUserQuestion`, writes the artifact in the format documented above.

What is NOT automated, on purpose:
- **Patching `agents/val-evaluator.md`.** That's a deliberate human review action — see Step 3 above. The harness paper's reason holds: an automated patch loop would re-introduce the self-evaluation blindness this whole pattern was built to defeat.

Estimated time: ~30 min per tuning session, every 5–10 /forge runs. Less than the cost of one rework cycle if a misaligned verdict had let a real issue ship.

---

## Attribution

Loop methodology adapted from Anthropic Labs' "Harness Design for Long-Running Application Development" (Rajasekaran 2026), specifically Section "Evaluator Tuning Reality." The HUMAN-VERDICT artifact format and the calibration-patch pattern are ohmyclaude additions for capturing the loop in the document-driven pipeline.
