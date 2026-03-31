#!/usr/bin/env node
/**
 * bump-version.js
 *
 * Atomically bumps the version across all 4 version-bearing files:
 *   VERSION, package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json
 *
 * Usage:
 *   node scripts/bump-version.js --patch       # 0.1.0 → 0.1.1
 *   node scripts/bump-version.js --minor       # 0.1.0 → 0.2.0
 *   node scripts/bump-version.js --major       # 0.1.0 → 1.0.0
 *   node scripts/bump-version.js 1.2.3         # set explicit version
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// ── Read current version ──────────────────────────────────────────────────────
const current = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
if (!/^\d+\.\d+\.\d+$/.test(current)) {
  console.error(`✗ Current VERSION "${current}" is not valid semver`);
  process.exit(1);
}

const [major, minor, patch] = current.split('.').map(Number);

// ── Parse argument ────────────────────────────────────────────────────────────
const arg = process.argv[2];
let next;

if (!arg) {
  console.error('Usage: node scripts/bump-version.js --patch | --minor | --major | <x.y.z>');
  process.exit(1);
} else if (arg === '--patch') {
  next = `${major}.${minor}.${patch + 1}`;
} else if (arg === '--minor') {
  next = `${major}.${minor + 1}.0`;
} else if (arg === '--major') {
  next = `${major + 1}.0.0`;
} else if (/^\d+\.\d+\.\d+$/.test(arg)) {
  next = arg;
} else {
  console.error(`✗ Unknown argument "${arg}". Use --patch, --minor, --major, or x.y.z`);
  process.exit(1);
}

console.log(`\nBumping version: ${current} → ${next}\n`);

// ── Update helpers ────────────────────────────────────────────────────────────
function updateJson(file, updater) {
  const abs  = path.join(root, file);
  const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  updater(json);
  fs.writeFileSync(abs, JSON.stringify(json, null, 2) + '\n');
  console.log(`  ✓ ${file}`);
}

// ── Apply updates ─────────────────────────────────────────────────────────────
// 1. VERSION (plain text)
fs.writeFileSync(path.join(root, 'VERSION'), next + '\n');
console.log('  ✓ VERSION');

// 2. package.json
updateJson('package.json', (j) => { j.version = next; });

// 3. .claude-plugin/plugin.json
updateJson('.claude-plugin/plugin.json', (j) => { j.version = next; });

// 4. .claude-plugin/marketplace.json — version is nested inside plugins[0]
updateJson('.claude-plugin/marketplace.json', (j) => {
  if (!Array.isArray(j.plugins) || !j.plugins[0]) {
    throw new Error('marketplace.json: expected plugins[0]');
  }
  j.plugins[0].version = next;
});

// ── Verify consistency ────────────────────────────────────────────────────────
console.log('\nVerifying consistency...');
const vFile   = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
const pkg     = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const plugin  = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
const market  = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));

let ok = true;
for (const [label, v] of [
  ['VERSION',            vFile],
  ['package.json',       pkg.version],
  ['plugin.json',        plugin.version],
  ['marketplace.json',   market.plugins?.[0]?.version],
]) {
  if (v === next) {
    console.log(`  ✓ ${label} = ${v}`);
  } else {
    console.error(`  ✗ ${label} = ${v} (expected ${next})`);
    ok = false;
  }
}

if (!ok) {
  console.error('\n✗ Version mismatch after update — check the files above.\n');
  process.exit(1);
}

console.log(`\n✓ All files updated to ${next}\n`);
