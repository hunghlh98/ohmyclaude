#!/usr/bin/env node
/**
 * test-sc-fallback.js
 *
 * Enforces the SuperClaude fallback contract defined in
 * docs/superclaude-integration.md:
 *
 *   1. Every sc:sc-<verb> reference in an agent or command file has
 *      a fallback clause in the same H2 section — either the canonical
 *      "**Fallback**:" label or a natural-language
 *      "if sc:sc-<verb> ... not installed/available" form.
 *   2. Every SC verb referenced is in the stable pinned subset.
 *   3. No file references a retired/never-existed skill name (sc-adviser).
 *
 * Scope (intentionally narrow — enforcement only where invocations
 * actually run at agent spawn time):
 *   - agents/*.md             — full check (fallback + retired + verb)
 *   - commands/*.md           — full check
 *   - docs/OPERATING.md       — full check (product doc that references invocation points)
 *   - docs/superclaude-integration.md — retired + verb only (schema doc with examples)
 *
 * Other docs (research material, historical planning, TOKENS.md prose
 * discussion) are not enforced — false-positive cost outweighs signal.
 *
 * The dispatcher token `sc:sc-sc` is a Claude Code slash command for
 * the SuperClaude dispatcher, not a verb. It is excluded from the
 * verb-subset check.
 *
 * Exit 0 = contract holds. Exit 1 = violation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const STABLE_SC_VERBS = new Set([
  'research', 'brainstorm', 'implement', 'test', 'pm', 'analyze',
  'design', 'document', 'troubleshoot', 'estimate', 'improve',
  'build', 'spec-panel', 'save', 'load',
  'workflow', 'task', 'reflect',
]);

const RETIRED_NAMES = ['sc-adviser'];

const MAPPING_DOC = 'docs/superclaude-integration.md';

// Explicit target list. Add new files only when they host runtime invocations.
const TARGETS = {
  full: [],          // filled from agents/ and commands/
  stableOnly: [MAPPING_DOC],
};
const PRODUCT_DOCS_FULL = ['docs/OPERATING.md']; // full check

// The dispatcher itself — not a verb. Exclude from verb-subset check.
const DISPATCHER_TOKENS = new Set(['sc']);

let errors = 0;
let filesChecked = 0;

function fail(msg) { console.error(`  \u2717 ${msg}`); errors++; }
function ok(msg)   { console.log(`  \u2713 ${msg}`); }

function hasFallback(section) {
  if (/\*\*Fallback\*\*\s*:/.test(section)) return true;
  if (/\bif\s+`?sc:sc-[a-z\-]+`?[^.]{0,200}\b(not installed|not available|unavailable|is absent|not present)\b/i.test(section)) return true;
  return false;
}

function splitSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentTitle = '(preamble)';
  let currentBody = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      sections.push({ title: currentTitle, body: currentBody.join('\n') });
      currentTitle = m[1].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  sections.push({ title: currentTitle, body: currentBody.join('\n') });
  return sections;
}

console.log('\nValidating SuperClaude fallback contract...\n');

// Build target list from explicit directories + explicit files
for (const dir of ['agents', 'commands']) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of fs.readdirSync(abs)) {
    if (file.endsWith('.md')) TARGETS.full.push(path.join(dir, file));
  }
}
for (const doc of PRODUCT_DOCS_FULL) {
  if (fs.existsSync(path.join(root, doc))) TARGETS.full.push(doc);
}

const targets = [...TARGETS.full, ...TARGETS.stableOnly];

if (targets.length === 0) {
  console.error('  \u2717 No target files found.');
  process.exit(1);
}

for (const rel of targets) {
  const abs = path.join(root, rel);
  const content = fs.readFileSync(abs, 'utf8');
  filesChecked++;

  for (const retired of RETIRED_NAMES) {
    const re = new RegExp(`\\b${retired.replace(/-/g, '\\-')}\\b`);
    if (re.test(content)) {
      fail(`${rel}: references retired skill "${retired}" — use sc:sc-<verb> directly.`);
    }
  }

  const scRefMatches = [...content.matchAll(/sc:sc-([a-z\-]+)/g)];
  if (scRefMatches.length === 0) continue;

  const seenVerbs = new Set();
  for (const m of scRefMatches) {
    const verb = m[1];
    if (DISPATCHER_TOKENS.has(verb)) continue; // sc:sc-sc is the dispatcher, not a verb
    if (seenVerbs.has(verb)) continue;
    seenVerbs.add(verb);
    if (!STABLE_SC_VERBS.has(verb)) {
      fail(`${rel}: references non-stable SC verb "sc:sc-${verb}". Stable subset: ${[...STABLE_SC_VERBS].sort().join(', ')}`);
    }
  }

  if (TARGETS.stableOnly.includes(rel)) {
    ok(`${rel} — ${scRefMatches.length} reference(s) [schema/discussion doc, per-section fallback check skipped]`);
    continue;
  }

  const sections = splitSections(content);
  let sectionViolations = 0;
  for (const sec of sections) {
    if (!/sc:sc-/.test(sec.body)) continue;
    if (!hasFallback(sec.body)) {
      fail(`${rel} — section "## ${sec.title}" has sc:sc-* reference but no **Fallback**: clause (or inline "if … not installed" form)`);
      sectionViolations++;
    }
  }
  if (sectionViolations === 0) {
    ok(`${rel} — ${scRefMatches.length} SC reference(s) in fallback-guarded section(s)`);
  }
}

console.log('');
if (errors === 0) {
  console.log(`\u2713 SuperClaude fallback contract holds. ${filesChecked} file(s) checked.\n`);
  process.exit(0);
} else {
  console.error(`\u2717 ${errors} contract violation(s). ${filesChecked} file(s) checked.\n`);
  process.exit(1);
}
