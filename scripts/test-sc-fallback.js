#!/usr/bin/env node
/**
 * test-sc-fallback.js
 *
 * Enforces the SuperClaude inlining contract defined in
 * docs/superclaude-integration.md (γ, v1.1.0+):
 *
 *   All 13 SC verbs are inlined from SuperClaude v4.3.0 (MIT) under
 *   skills/sc-*\/. Agents and commands reference them as bare
 *   "sc-<verb>" — never as the legacy plugin-prefixed "sc:sc-<verb>"
 *   form, which implied an external peer dependency.
 *
 * Contract (what this test enforces):
 *   1. NO agent, command, or operating/integration doc contains a
 *      legacy prefixed "sc:sc-<verb>" reference. The only exception
 *      is the dispatcher token "sc:sc-sc" itself (SC's top-level
 *      slash command), which is not a verb.
 *   2. Every bare "sc-<verb>" skill reference (wrapped in backticks)
 *      names a verb ohmyclaude recognizes — either inlined (13) or
 *      a known-upstream-but-deferred verb discussed as future work.
 *   3. No file references a retired skill name (e.g. sc-adviser).
 *
 * Scope (runtime-invocation surface only — keeps the signal high):
 *   - agents/*.md             — full check
 *   - commands/*.md           — full check
 *   - docs/OPERATING.md       — full check
 *   - docs/superclaude-integration.md — full check
 *
 * Research material and historical planning docs are not scanned:
 * they may reference the legacy form when describing the β→γ
 * transition, and false positives there would be noise.
 *
 * Exit 0 = contract holds. Exit 1 = violation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Inlined in skills/sc-*/ — shipped with ohmyclaude, v4.3.0 MIT.
const INLINED_SC_VERBS = new Set([
  'brainstorm', 'research', 'spec-panel',
  'pm', 'estimate', 'design',
  'analyze', 'implement', 'build',
  'test', 'improve', 'troubleshoot',
  'document',
]);

// Known upstream verbs — may be referenced in docs as future work /
// deferred. Not inlined yet, but not a violation to mention.
const DEFERRED_SC_VERBS = new Set([
  'save', 'load', 'workflow', 'task', 'reflect',
]);

const KNOWN_SC_VERBS = new Set([...INLINED_SC_VERBS, ...DEFERRED_SC_VERBS]);

const RETIRED_NAMES = ['sc-adviser'];

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

for (const rel of TARGETS) {
  const abs = path.join(root, rel);
  const content = fs.readFileSync(abs, 'utf8');
  filesChecked++;

  // Rule 3 — retired names
  for (const retired of RETIRED_NAMES) {
    const re = new RegExp(`\\b${retired.replace(/-/g, '\\-')}\\b`);
    if (re.test(content)) {
      fail(`${rel}: references retired skill "${retired}".`);
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
  const bareRefs = [...content.matchAll(/`sc-([a-z][a-z0-9-]*)`/g)];
  const seenBare = new Set();
  let bareOK = 0;
  for (const m of bareRefs) {
    const verb = m[1];
    if (seenBare.has(verb)) continue;
    seenBare.add(verb);
    if (!KNOWN_SC_VERBS.has(verb)) {
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
