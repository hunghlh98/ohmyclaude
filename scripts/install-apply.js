#!/usr/bin/env node
/**
 * install-apply.js
 *
 * Profile-based installation planner for ohmyclaude.
 * Reads manifests/install-profiles.json and manifests/install-modules.json,
 * then writes a summary of what was selected for the given profile.
 *
 * Usage:
 *   node scripts/install-apply.js --repo <path> --profile <profile>
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let repoRoot = process.cwd();
let profileId = 'developer';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo')    { repoRoot  = args[++i]; }
  if (args[i] === '--profile') { profileId = args[++i]; }
}

// ── Load manifests ───────────────────────────────────────────────────────────
function load(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifests', file), 'utf8'));
}

const profiles = load('install-profiles.json').profiles;
const modules  = load('install-modules.json').modules;

const profile = profiles.find(p => p.id === profileId);
if (!profile) {
  const ids = profiles.map(p => p.id).join(', ');
  console.error(`[ohmyclaude] Unknown profile '${profileId}'. Available: ${ids}`);
  process.exit(1);
}

// ── Resolve modules for profile ──────────────────────────────────────────────
const moduleMap = Object.fromEntries(modules.map(m => [m.id, m]));
const selected  = profile.modules.map(id => moduleMap[id]).filter(Boolean);

// ── Print install plan ───────────────────────────────────────────────────────
console.log('');
console.log(`[ohmyclaude] Installing profile: ${profile.name}`);
console.log(`             ${profile.description}`);
console.log('');
console.log('Modules:');

for (const mod of selected) {
  const stability = mod.stability === 'experimental' ? ' (experimental)' : '';
  console.log(`  ✓ ${mod.id}${stability}`);
  console.log(`    ${mod.description}`);
}

const skipped = modules.filter(m => !profile.modules.includes(m.id));
if (skipped.length > 0) {
  console.log('');
  console.log('Skipped (not in this profile):');
  for (const mod of skipped) {
    console.log(`  - ${mod.id} — ${mod.description}`);
  }
}

// ── Write install state ──────────────────────────────────────────────────────
const stateDir  = path.join(process.env.HOME || '~', '.claude', 'ohmyclaude');
const stateFile = path.join(stateDir, 'install-state.json');

try {
  fs.mkdirSync(stateDir, { recursive: true });
  const state = {
    installedAt: new Date().toISOString(),
    repoRoot,
    profile: profileId,
    modules: profile.modules,
    version: JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
    ).version,
  };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
} catch {
  // Non-fatal — state file is informational only
}

console.log('');
