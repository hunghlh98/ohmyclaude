#!/usr/bin/env node
/**
 * test-sc-fallback.js
 *
 * Enforces the SuperClaude inlining contract defined in
 * docs/superclaude-integration.md (v2.0.0+):
 *
 *   5 SC knowledge-skills are inlined from SuperClaude v4.3.0 (MIT)
 *   under skills/sc-*\/. Agents and commands reference them as bare
 *   "sc-<skill>" — never as the legacy plugin-prefixed "sc:sc-<skill>"
 *   form, which implied an external peer dependency.
 *
 *   v2.0.0 removed 8 verb-wrapper skills (sc-analyze, sc-build,
 *   sc-design, sc-document, sc-implement, sc-improve, sc-test,
 *   sc-troubleshoot). Those names must not appear in runtime-invocation
 *   files; they remain valid in CHANGELOG/ROADMAP/pipeline history docs.
 *
 * Contract (what this test enforces):
 *   1. NO agent, command, or operating/integration doc contains a
 *      legacy prefixed "sc:sc-<skill>" reference. The only exception
 *      is the dispatcher token "sc:sc-sc" itself.
 *   2. Every bare "sc-<skill>" reference (wrapped in backticks) names
 *      a skill ohmyclaude recognizes — one of the 5 inlined skills or
 *      a known-upstream-but-deferred skill discussed as future work.
 *   3. No file references a retired skill name (e.g. sc-adviser) or a
 *      v2.0.0-removed verb-wrapper.
 *
 * Scope (runtime-invocation surface only — keeps the signal high):
 *   - agents/*.md             — full check
 *   - commands/*.md           — full check
 *   - docs/OPERATING.md       — full check
 *   - docs/superclaude-integration.md — full check
 *
 * Exit 0 = contract holds. Exit 1 = violation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Inlined in skills/sc-*/ — shipped with ohmyclaude, v4.3.0 MIT.
// Named-methodology skills only after v2.0.0 removed verb-wrappers.
const INLINED_SC_VERBS = new Set([
  'brainstorm', 'research', 'spec-panel',
  'pm', 'estimate',
]);

// Known upstream verbs — may be referenced in docs as future work /
// deferred. Not inlined yet, but not a violation to mention.
const DEFERRED_SC_VERBS = new Set([
  'save', 'load', 'workflow', 'task', 'reflect',
]);

const KNOWN_SC_VERBS = new Set([...INLINED_SC_VERBS, ...DEFERRED_SC_VERBS]);

// Retired: sc-adviser (pre-v1). Removed in v2.0.0: verb-wrappers that
// duplicated agent docstrings without adding named methodology.
const RETIRED_NAMES = [
  'sc-adviser',
  'sc-analyze', 'sc-build', 'sc-design', 'sc-document',
  'sc-implement', 'sc-improve', 'sc-test', 'sc-troubleshoot',
];

// The dispatcher token "sc:sc-sc" — SC's top-level slash command.
// Not a verb, so "sc" as the matched group is tolerated.
const DISPATCHER_TOKEN = 'sc';

// Explicit target list. Add new files only when they host runtime invocations.
const TARGETS = [];

let errors = 0;
let filesChecked = 0;

function fail(msg) { console.error(`  \u2717 ${msg}`); errors++; }
function ok(msg)   { console.log(`  \u2713 ${msg}`); }

console.log('\nValidating SuperClaude inlining contract (γ)...\n');

for (const dir of ['agents', 'commands']) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of fs.readdirSync(abs)) {
    if (file.endsWith('.md')) TARGETS.push(path.join(dir, file));
  }
}
for (const doc of ['docs/OPERATING.md', 'docs/superclaude-integration.md']) {
  if (fs.existsSync(path.join(root, doc))) TARGETS.push(doc);
}

if (TARGETS.length === 0) {
  console.error('  \u2717 No target files found.');
  process.exit(1);
}

// The integration doc legitimately references removed/retired names when
// explaining the v2.0.0 subtraction (what was removed and why). It's the
// authoritative historical record, so retired-name and bare-ref checks
// do not apply to it. Runtime-invocation surfaces (agents/, commands/,
// docs/OPERATING.md) remain strictly scoped to the current stable subset.
const HISTORY_DOC_EXEMPT = new Set([
  'docs/superclaude-integration.md',
]);

for (const rel of TARGETS) {
  const abs = path.join(root, rel);
  const content = fs.readFileSync(abs, 'utf8');
  filesChecked++;

  // Rule 3 — retired names (skip docs that intentionally reference history)
  if (!HISTORY_DOC_EXEMPT.has(rel)) {
    for (const retired of RETIRED_NAMES) {
      const re = new RegExp(`\\b${retired.replace(/-/g, '\\-')}\\b`);
      if (re.test(content)) {
        fail(`${rel}: references retired skill "${retired}".`);
      }
    }
  }

  // Rule 1 — legacy "sc:sc-<verb>" prefixed form is forbidden
  // (placeholder text like `sc:sc-<verb>` with an angle-bracket
  // won't match because the group only accepts [a-z0-9-]).
  const prefixedRefs = [...content.matchAll(/\bsc:sc-([a-z][a-z0-9-]*)\b/g)];
  const seenPrefixed = new Set();
  for (const m of prefixedRefs) {
    const verb = m[1];
    if (verb === DISPATCHER_TOKEN) continue; // "sc:sc-sc" is the dispatcher, not a verb
    if (seenPrefixed.has(verb)) continue;
    seenPrefixed.add(verb);
    fail(`${rel}: uses legacy prefixed form "sc:sc-${verb}" — γ requires bare "sc-${verb}" (all verbs are inlined).`);
  }

  // Rule 2 — bare backtick-wrapped `sc-<verb>` references must be known
  // (history docs exempt; they legitimately name removed skills for context)
  const bareRefs = [...content.matchAll(/`sc-([a-z][a-z0-9-]*)`/g)];
  const seenBare = new Set();
  let bareOK = 0;
  for (const m of bareRefs) {
    const verb = m[1];
    if (seenBare.has(verb)) continue;
    seenBare.add(verb);
    if (!KNOWN_SC_VERBS.has(verb)) {
      if (HISTORY_DOC_EXEMPT.has(rel)) {
        // Historical mention — not a contract violation.
        continue;
      }
      fail(`${rel}: unknown sc-verb "sc-${verb}". Inlined: ${[...INLINED_SC_VERBS].sort().join(', ')}. Deferred: ${[...DEFERRED_SC_VERBS].sort().join(', ')}.`);
    } else {
      bareOK++;
    }
  }

  if (seenPrefixed.size === 0) {
    ok(`${rel} — ${bareOK} inlined reference(s); 0 legacy prefixed form(s)`);
  }
}

console.log('');
if (errors === 0) {
  console.log(`\u2713 SuperClaude inlining contract holds (γ). ${filesChecked} file(s) checked.\n`);
  process.exit(0);
} else {
  console.error(`\u2717 ${errors} contract violation(s). ${filesChecked} file(s) checked.\n`);
  process.exit(1);
}
