#!/usr/bin/env node
/**
 * validate.js
 *
 * Validates plugin.json against schema, checks version consistency
 * across VERSION, package.json, and .claude-plugin/plugin.json.
 *
 * Usage: node scripts/validate.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let errors = 0;

function check(label, condition, msg) {
  if (!condition) {
    console.error(`  ✗ ${label}: ${msg}`);
    errors++;
  } else {
    console.log(`  ✓ ${label}`);
  }
}

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

console.log('\nValidating ohmyclaude plugin...\n');

// ── Version consistency ──────────────────────────────────────────────────────
console.log('Version consistency:');
const versionFile  = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
const pkg          = load('package.json');
const pluginJson   = load('.claude-plugin/plugin.json');
const marketJson   = load('.claude-plugin/marketplace.json');

check('VERSION file', /^\d+\.\d+\.\d+$/.test(versionFile), `Invalid format: "${versionFile}"`);
check('package.json matches VERSION',      pkg.version        === versionFile, `${pkg.version} ≠ ${versionFile}`);
check('plugin.json matches VERSION',       pluginJson.version === versionFile, `${pluginJson.version} ≠ ${versionFile}`);
const marketVersion = marketJson.plugins?.[0]?.version;
check('marketplace.json matches VERSION',  marketVersion === versionFile, `${marketVersion} ≠ ${versionFile}`);

// ── plugin.json structure ────────────────────────────────────────────────────
console.log('\nplugin.json structure:');
check('name present',    typeof pluginJson.name === 'string',   'missing name');
check('version present', typeof pluginJson.version === 'string', 'missing version');
check('agents is array', Array.isArray(pluginJson.agents),      'agents must be array');
check('skills is array', Array.isArray(pluginJson.skills),      'skills must be array');
check('commands is array', Array.isArray(pluginJson.commands),  'commands must be array');
check('no hooks field',  !('hooks' in pluginJson), '"hooks" must not be in plugin.json — it auto-loads');

// ── Agent files exist ────────────────────────────────────────────────────────
console.log('\nAgent file existence:');
for (const agentPath of pluginJson.agents) {
  const abs = path.join(root, agentPath);
  check(agentPath, fs.existsSync(abs), 'file not found');
}

// ── Agent frontmatter ────────────────────────────────────────────────────────
console.log('\nAgent frontmatter:');
for (const agentPath of pluginJson.agents) {
  const abs = path.join(root, agentPath);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, 'utf8');
  const hasFrontmatter = content.startsWith('---');
  const hasName  = /^name:\s+\S+/m.test(content);
  const hasModel = /^model:\s+\S+/m.test(content);
  const hasDesc  = /^description:\s+\S+/m.test(content);
  check(`${agentPath} — frontmatter`, hasFrontmatter && hasName && hasModel && hasDesc,
    'missing required frontmatter fields (name, description, model)');
}

// ── Skill files exist ────────────────────────────────────────────────────────
console.log('\nSkill SKILL.md files:');
const skillsDir = path.join(root, 'skills');
if (fs.existsSync(skillsDir)) {
  for (const skill of fs.readdirSync(skillsDir)) {
    const skillFile = path.join(skillsDir, skill, 'SKILL.md');
    check(`skills/${skill}/SKILL.md`, fs.existsSync(skillFile), 'missing SKILL.md');
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('');
if (errors === 0) {
  console.log('✓ All checks passed.\n');
} else {
  console.error(`✗ ${errors} check(s) failed.\n`);
  process.exit(1);
}
