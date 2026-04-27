#!/usr/bin/env node
/**
 * val-calibration.js
 *
 * PreToolUse hook on the Task tool. When @val-evaluator is being spawned
 * (subagent_type === "val-evaluator" or the description references the
 * agent), reads `skills/write-contract/references/calibration-examples.md`
 * and prepends its content as a <calibration-anchor>...</calibration-anchor>
 * block to `tool_input.prompt`.
 *
 * Why: agents/val-evaluator.md:174 says Val MUST read calibration-examples.md
 * "every run" to anchor its judgment with the few-shot examples — but no
 * mechanism enforced that contract. Val could (and would) skip the read on
 * busy runs. This hook makes the calibration anchor a structural part of
 * the prompt instead of a procedural expectation.
 *
 * Per harness paper (Rajasekaran 2026): "Few-shot calibrate the evaluator
 * with example score breakdowns to align its judgment with yours and reduce
 * score drift across iterations."
 *
 * Failure mode: graceful no-op pass-through when:
 *   - the env-var toggle OHMYCLAUDE_HOOK_VAL_CALIBRATION=off is set,
 *   - the input is not a Task tool call,
 *   - the Task target is not val-evaluator,
 *   - the calibration file is missing or unreadable,
 *   - JSON parsing fails.
 *
 * Always exits 0 (allow). Never blocks.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { isHookDisabled } = require('./_toggle');

// Resolve relative to the plugin root: hooks/scripts/ → ../../skills/...
const CALIBRATION_PATH = path.resolve(
  __dirname, '..', '..', 'skills', 'write-contract', 'references', 'calibration-examples.md'
);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });

process.stdin.on('end', () => {
  if (isHookDisabled(__filename)) {
    process.stdout.write(raw);
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw);
    process.exit(0);
  }

  // Only act on Task tool calls.
  if (input.tool_name !== 'Task') {
    process.stdout.write(raw);
    process.exit(0);
  }

  const ti = input.tool_input || {};
  const subagentType = (ti.subagent_type || '').toString();
  const description  = (ti.description  || '').toString();
  const targetsVal =
    subagentType === 'val-evaluator' ||
    /val-evaluator/i.test(description);

  if (!targetsVal) {
    process.stdout.write(raw);
    process.exit(0);
  }

  let calibration;
  try {
    calibration = fs.readFileSync(CALIBRATION_PATH, 'utf8');
  } catch (e) {
    process.stderr.write(
      `[ohmyclaude val-calibration] calibration-examples.md not found at ${CALIBRATION_PATH} ` +
      `(${e.message}); passing through unchanged\n`
    );
    process.stdout.write(raw);
    process.exit(0);
  }

  const originalPrompt = (ti.prompt || '').toString();
  const anchor = [
    '<calibration-anchor source="skills/write-contract/references/calibration-examples.md">',
    calibration.trimEnd(),
    '</calibration-anchor>',
    '',
    originalPrompt,
  ].join('\n');

  const augmented = {
    ...input,
    tool_input: { ...ti, prompt: anchor },
  };

  process.stderr.write(
    `[ohmyclaude val-calibration] injected calibration anchor ` +
    `(${calibration.length} chars from ${path.basename(CALIBRATION_PATH)}) into val-evaluator Task prompt\n`
  );
  process.stdout.write(JSON.stringify(augmented));
  process.exit(0);
});
