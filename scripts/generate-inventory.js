#!/usr/bin/env node
/**
 * generate-inventory.js
 *
 * Generates the Project Inventory markdown table from disk.
 * Used by pre-commit hook to keep README.md inventory in sync.
 *
 * Usage:
 *   node scripts/generate-inventory.js          # print to stdout
 *   node scripts/generate-inventory.js --patch  # update README.md in-place
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;
  const block = content.slice(4, end);
  const fields = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

function countDirs(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return 0;
  return fs.readdirSync(abs, { withFileTypes: true }).filter(e => e.isDirectory()).length;
}

function walkFiles(dir, ext) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const results = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, e.name);
    if (e.isDirectory()) results.push(...walkFiles(path.join(dir, e.name), ext));
    else if (e.name.endsWith(ext)) results.push(path.join(dir, e.name));
  }
  return results;
}

// ── Gather data ──────────────────────────────────────────────────────────────
const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
const pluginJson = load('.claude-plugin/plugin.json');
const agents = pluginJson.agents || [];
const modules = (() => { try { return load('manifests/install-modules.json').modules || []; } catch (_) { return []; } })();
const profiles = (() => { try { return load('manifests/install-profiles.json').profiles || []; } catch (_) { return []; } })();

// Agent model distribution
const modelDist = {};
for (const ap of agents) {
  const abs = path.join(root, ap);
  if (!fs.existsSync(abs)) continue;
  const fm = parseFrontmatter(fs.readFileSync(abs, 'utf8'));
  if (fm && fm.model) modelDist[fm.model] = (modelDist[fm.model] || 0) + 1;
}

// Skills by category
const skillCats = {};
for (const mod of modules) {
  if (mod.kind === 'skills') {
    skillCats[mod.id.replace('skills-', '')] = (mod.paths || []).length;
  }
}

// Rules by language
const ruleFiles = walkFiles('rules', '.md');
const ruleLangs = {};
for (const r of ruleFiles) {
  const lang = r.split('/')[1] || 'unknown';
  ruleLangs[lang] = (ruleLangs[lang] || 0) + 1;
}

// Hooks
const hookScripts = (() => {
  const dir = path.join(root, 'hooks/scripts');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.js'));
})();

// Commands
const commandFiles = (() => {
  const dir = path.join(root, 'commands');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md'));
})();

// ── Generate table ───────────────────────────────────────────────────────────
const lines = [
  '## Project Inventory',
  '',
  '| Component | Count | Detail |',
  '|-----------|------:|--------|',
  `| Version | ${version} | VERSION, package.json, plugin.json, marketplace.json |`,
  `| Agents | ${agents.length} | ${Object.entries(modelDist).map(([m,c]) => `${m}: ${c}`).join(', ')} |`,
  `| Skills | ${countDirs('skills')} | ${Object.entries(skillCats).map(([k,v]) => `${k}: ${v}`).join(', ')} |`,
  `| Commands | ${commandFiles.length} | ${commandFiles.map(f => f.replace('.md','')).join(', ')} |`,
  `| Rules | ${ruleFiles.length} | ${Object.entries(ruleLangs).map(([k,v]) => `${k}: ${v}`).join(', ')} |`,
  `| Hooks | ${hookScripts.length} | ${hookScripts.map(f => f.replace('.js','')).join(', ')} |`,
  `| Profiles | ${profiles.length} | ${profiles.map(p => p.id + (p.default ? ' (default)' : '')).join(', ')} |`,
  `| Modules | ${modules.length} | ${modules.map(m => m.kind).filter((v,i,a) => a.indexOf(v) === i).map(k => `${k}: ${modules.filter(m => m.kind === k).length}`).join(', ')} |`,
  '',
  'Run `node scripts/validate.js` to see the live inventory with per-agent detail.',
];

const table = lines.join('\n');

// ── Output ───────────────────────────────────────────────────────────────────
if (process.argv.includes('--patch')) {
  const readmePath = path.join(root, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');

  const startMarker = '## Project Inventory';
  const endMarker = 'Run `node scripts/validate.js`';

  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx === -1) {
    console.error('Could not find "## Project Inventory" in README.md');
    process.exit(1);
  }

  if (endIdx === -1) {
    console.error('Could not find inventory end marker in README.md');
    process.exit(1);
  }

  // Find the end of the marker line
  const endLineIdx = readme.indexOf('\n', endIdx) + 1;

  const before = readme.slice(0, startIdx);
  const after = readme.slice(endLineIdx);

  readme = before + table + '\n' + after;
  fs.writeFileSync(readmePath, readme);
  console.log('[inventory] README.md updated');
} else {
  console.log(table);
}
