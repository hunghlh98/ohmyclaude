#!/usr/bin/env node
/**
 * test-agents.js
 *
 * Agent frontmatter discipline validator. Catches drift that
 * scripts/validate.js does not check: description word count,
 * tools list shape, color presence, read-only tier discipline,
 * <example> block presence.
 *
 * Stdlib only — mirrors validate.js style.
 *
 * Usage: node scripts/test-agents.js
 * Exit:  0 = all checks passed | 1 = at least one assertion failed
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const agentsDir = path.join(root, 'agents');

let errors = 0;
let checks = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  checks++;
}

function fail(label, msg) {
  console.error(`  ✗ ${label}: ${msg}`);
  errors++;
  checks++;
}

function check(label, cond, msg) {
  if (cond) ok(label);
  else fail(label, msg);
}

// ── YAML frontmatter parser (subset) ─────────────────────────────────────────
// Mirrors the parser in scripts/validate.js but adds array literal support
// (tools: ["Read", "Grep"]) so we can introspect tool sets.
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;
  const block = content.slice(4, end);
  const fields = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    // Inline JSON-like array: ["Read", "Grep", "Glob"]
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        fields[key] = JSON.parse(val);
        continue;
      } catch (_) {
        // Fall through to string assignment so the test fails with a
        // useful message instead of a parse exception.
      }
    }
    fields[key] = val;
  }
  return fields;
}

// ── Tier discipline (the actual contract) ────────────────────────────────────
// See CLAUDE.md "Read-only contract" section.
const STRICT_READONLY = new Set(['stan-standards', 'sam-sec', 'val-evaluator']);
const IMPL_RESTRICTED = new Set(['artie-arch', 'una-ux', 'paige-product', 'devon-ops']);
const IMPLEMENTER     = new Set(['beck-backend', 'effie-frontend', 'heracles', 'quinn-qa']);

const KNOWN_MODELS = new Set(['opus', 'sonnet', 'haiku']);
const WRITE_TOOLS  = new Set(['Write', 'Edit', 'MultiEdit']);
const EDIT_TOOLS   = new Set(['Edit', 'MultiEdit']);

function tierOf(name) {
  if (STRICT_READONLY.has(name)) return 'strict-readonly';
  if (IMPL_RESTRICTED.has(name)) return 'impl-restricted';
  if (IMPLEMENTER.has(name))     return 'implementer';
  return 'unknown';
}

console.log('\nValidating agent frontmatter discipline...\n');

// ── Inventory ────────────────────────────────────────────────────────────────
const files = fs.readdirSync(agentsDir)
  .filter(f => f.endsWith('.md'))
  .sort();

console.log(`Discovered ${files.length} agent file(s).\n`);

const declared = new Set([...STRICT_READONLY, ...IMPL_RESTRICTED, ...IMPLEMENTER]);
const seen = new Set();

for (const file of files) {
  const abs = path.join(agentsDir, file);
  const content = fs.readFileSync(abs, 'utf8');
  const fm = parseFrontmatter(content);

  console.log(`agents/${file}`);

  if (!fm) {
    fail(`${file}`, 'frontmatter missing or malformed');
    continue;
  }

  const name = fm.name;
  seen.add(name);

  // 1. name field
  check(`  name present`, typeof name === 'string' && name.length > 0, 'missing name');
  check(`  name is lowercase-kebab`,
    typeof name === 'string' && /^[a-z][a-z0-9-]*$/.test(name),
    `"${name}" must be lowercase-kebab (a-z, 0-9, hyphen, no leading digit)`);
  check(`  name matches filename`,
    typeof name === 'string' && `${name}.md` === file,
    `name "${name}" does not match file "${file}"`);

  // 2. description: present, ≤30 words
  const desc = fm.description;
  if (typeof desc !== 'string' || desc.length === 0) {
    fail(`  description present`, 'missing description');
  } else {
    ok(`  description present`);
    const wordCount = desc.split(/\s+/).filter(Boolean).length;
    check(`  description ≤30 words (got ${wordCount})`,
      wordCount <= 30,
      `${wordCount} words exceeds CLAUDE.md cap (≤30)`);
  }

  // 3. tools: array of strings
  const tools = fm.tools;
  if (!Array.isArray(tools)) {
    fail(`  tools is array`, `expected array, got ${typeof tools} (${JSON.stringify(tools)})`);
  } else {
    ok(`  tools is array`);
    check(`  tools entries all strings`,
      tools.every(t => typeof t === 'string'),
      `non-string entry in tools: ${JSON.stringify(tools)}`);
  }

  // 4. model: opus | sonnet | haiku
  check(`  model is opus|sonnet|haiku`,
    typeof fm.model === 'string' && KNOWN_MODELS.has(fm.model),
    `"${fm.model}" is not opus|sonnet|haiku`);

  // 5. color: present (any colour name accepted)
  check(`  color present`,
    typeof fm.color === 'string' && fm.color.length > 0,
    'missing color');

  // 6. tier discipline
  const tier = tierOf(name);
  check(`  declared tier`,
    tier !== 'unknown',
    `"${name}" not declared in any tier (STRICT_READONLY / IMPL_RESTRICTED / IMPLEMENTER) in test-agents.js`);

  if (Array.isArray(tools) && tier !== 'unknown') {
    const hasWrite = tools.some(t => WRITE_TOOLS.has(t));
    const hasEdit  = tools.some(t => EDIT_TOOLS.has(t));

    if (tier === 'strict-readonly') {
      check(`  strict-readonly tier respects no-write rule`,
        !hasWrite,
        `${name} (strict-readonly) must NOT list Write/Edit/MultiEdit but has: ${tools.filter(t => WRITE_TOOLS.has(t)).join(', ')}`);
    } else if (tier === 'impl-restricted') {
      check(`  impl-restricted tier respects no-edit rule`,
        !hasEdit,
        `${name} (impl-restricted) must NOT list Edit/MultiEdit but has: ${tools.filter(t => EDIT_TOOLS.has(t)).join(', ')}`);
    }
    // implementer tier: no constraint to check beyond shape.
  }

  // 7. <example> block in body (per CLAUDE.md frontmatter contract)
  const body = content.slice(content.indexOf('\n---', 4) + 4);
  check(`  <example> block in body`,
    /<example>[\s\S]+?<\/example>/.test(body),
    'no <example>...</example> block found in body (CLAUDE.md requires example blocks after frontmatter)');

  console.log('');
}

// ── Coverage: every declared agent has a file ────────────────────────────────
console.log('Tier registry coverage:');
for (const declaredName of declared) {
  check(`  ${declaredName} has agent file`,
    seen.has(declaredName),
    `declared in tier registry but no agents/${declaredName}.md found`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('');
if (errors === 0) {
  console.log(`✓ All ${checks} agent discipline checks passed.\n`);
  process.exit(0);
} else {
  console.error(`✗ ${errors}/${checks} agent discipline checks failed.\n`);
  process.exit(1);
}
