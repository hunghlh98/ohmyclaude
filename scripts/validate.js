#!/usr/bin/env node
/**
 * validate.js
 *
 * Validates plugin structure, version consistency, and frontmatter
 * across all agents, skills, hooks, and install manifests.
 *
 * Usage: node scripts/validate.js
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const { spawnSync } = require('child_process');

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
  const fm = parseFrontmatter(content);
  check(`${agentPath} — frontmatter`,
    fm && fm.name && fm.description && fm.model,
    'missing required frontmatter fields (name, description, model)');
}

// ── Skill files and frontmatter ──────────────────────────────────────────────
console.log('\nSkill SKILL.md files and frontmatter:');
const skillsDir = path.join(root, 'skills');
if (fs.existsSync(skillsDir)) {
  for (const skill of fs.readdirSync(skillsDir).sort()) {
    const skillFile = path.join(skillsDir, skill, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      check(`skills/${skill}/SKILL.md`, false, 'missing SKILL.md');
      continue;
    }
    const content = fs.readFileSync(skillFile, 'utf8');
    const fm = parseFrontmatter(content);

    // name must match folder
    check(`skills/${skill} — name matches folder`,
      fm && fm.name === skill,
      fm ? `name is "${fm.name}", expected "${skill}"` : 'could not parse frontmatter');

    // origin must be present
    check(`skills/${skill} — origin: ohmyclaude`,
      fm && fm.origin === 'ohmyclaude',
      fm ? `origin is "${fm.origin || 'missing'}"` : 'could not parse frontmatter');

    // description must be present
    check(`skills/${skill} — description present`,
      fm && typeof fm.description === 'string' && fm.description.length > 0,
      'missing description');
  }
}

// ── SKILL.md 400-line cap (stated invariant in CLAUDE.md) ───────────────────
// v2.0.0: enforce the cap validate.js used to merely promise.
console.log('\nSKILL.md line cap (≤400):');
const SKILL_LINE_CAP = 400;
if (fs.existsSync(skillsDir)) {
  const offenders = [];
  for (const skill of fs.readdirSync(skillsDir).sort()) {
    const skillFile = path.join(skillsDir, skill, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const lineCount = fs.readFileSync(skillFile, 'utf8').split('\n').length;
    if (lineCount > SKILL_LINE_CAP) {
      offenders.push({ skill, lineCount });
    }
  }
  if (offenders.length === 0) {
    console.log(`  ✓ All SKILL.md files ≤${SKILL_LINE_CAP} lines`);
  } else {
    for (const o of offenders) {
      console.error(`  ✗ skills/${o.skill}/SKILL.md exceeds cap: ${o.lineCount} lines (cap ${SKILL_LINE_CAP}). Move depth to references/.`);
      errors++;
    }
  }
}

// ── Release gate: CHANGELOG must have an entry for VERSION ──────────────────
// v2.0.0: the release gate — bumping VERSION requires a CHANGELOG section.
console.log('\nRelease gate (CHANGELOG ↔ VERSION):');
try {
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  const versionHeader = new RegExp(`^##\\s*\\[${versionFile.replace(/\./g, '\\.')}\\]`, 'm');
  if (versionHeader.test(changelog)) {
    console.log(`  ✓ CHANGELOG.md has entry for v${versionFile}`);
  } else {
    console.error(`  ✗ CHANGELOG.md has no "## [${versionFile}]" section. Add a dated entry before releasing.`);
    errors++;
  }
} catch (e) {
  console.error(`  ✗ Could not read CHANGELOG.md: ${e.message}`);
  errors++;
}

// ── Advisory: ROADMAP should reference the current VERSION ──────────────────
// Warning only. Encourages ROADMAP/CHANGELOG symmetry; doesn't fail the build.
console.log('\nROADMAP ↔ VERSION advisory:');
try {
  const roadmap = fs.readFileSync(path.join(root, 'ROADMAP.md'), 'utf8');
  if (roadmap.includes(versionFile) || roadmap.toLowerCase().includes('shipped')) {
    console.log(`  ✓ ROADMAP.md references v${versionFile} or "shipped"`);
  } else {
    console.log(`  ⚠ ROADMAP.md does not mention v${versionFile} — consider updating to reflect what shipped`);
  }
} catch (_) {
  console.log(`  ⚠ ROADMAP.md missing — add it to document shipped vs planned work`);
}

// ── Language rule frontmatter (v2.1.0+) ─────────────────────────────────────
// Every rules/<lang>/*.md must have a paths: array in frontmatter. This is
// what activates the rule on matching files. rules/java/ is the reference.
console.log('\nLanguage rule frontmatter:');
const rulesDir = path.join(root, 'rules');
if (fs.existsSync(rulesDir)) {
  for (const lang of fs.readdirSync(rulesDir).sort()) {
    const langDir = path.join(rulesDir, lang);
    if (!fs.statSync(langDir).isDirectory()) continue;
    for (const file of fs.readdirSync(langDir)) {
      if (!file.endsWith('.md')) continue;
      const rel = path.join('rules', lang, file);
      const content = fs.readFileSync(path.join(langDir, file), 'utf8');
      const hasFrontmatter = content.startsWith('---');
      const hasPaths = /\n\s*paths:\s*\n(\s+-\s+.+\n)+/.test(content.slice(0, 400));
      check(rel, hasFrontmatter && hasPaths, 'missing `paths:` array in frontmatter');
    }
  }
}

// ── test:hooks wiring (v2.1.0+) ─────────────────────────────────────────────
// The smoke test suite must be runnable via `npm run test:hooks`. Forces
// parity between what CI runs and what contributors run locally.
console.log('\nsmoke test wiring:');
check('package.json scripts.test:hooks',
  typeof pkg.scripts?.['test:hooks'] === 'string',
  'missing "test:hooks" script');
check('scripts/test-hooks.js exists',
  fs.existsSync(path.join(root, 'scripts', 'test-hooks.js')),
  'file not found');

// ── Hook scripts parse as valid JS ───────────────────────────────────────────
console.log('\nHook script syntax:');
const hooksScriptsDir = path.join(root, 'hooks', 'scripts');
if (fs.existsSync(hooksScriptsDir)) {
  for (const file of fs.readdirSync(hooksScriptsDir).filter(f => f.endsWith('.js'))) {
    const abs = path.join(hooksScriptsDir, file);
    const result = spawnSync(process.execPath, ['--check', abs], { encoding: 'utf8' });
    if (result.status === 0) {
      console.log(`  ✓ hooks/scripts/${file}`);
    } else {
      console.error(`  ✗ hooks/scripts/${file}: syntax error — ${(result.stderr || '').trim()}`);
      errors++;
    }
  }
}

// ── install-modules.json path existence ─────────────────────────────────────
console.log('\nInstall module paths:');
try {
  const modules = load('manifests/install-modules.json');
  for (const mod of modules.modules || []) {
    for (const p of mod.paths || []) {
      const abs = path.join(root, p);
      check(`manifests/${mod.id} → ${p}`, fs.existsSync(abs), 'path not found on disk');
    }
  }
} catch (e) {
  console.error(`  ✗ install-modules.json: ${e.message}`);
  errors++;
}

// ── Dead reference check (retired agent names) ──────────────────────────────
console.log('\nDead reference check:');
const STALE_NAMES = [
  // Greek names (v0.2.x)
  'metis', 'hermes', 'nemesis', 'eris', 'hephaestus', 'momus', 'mnemosyne', 'athena', 'apollo', 'argus',
  // Retired v0.4 agents (absorbed in v1.0.0)
  'scout-sprint', 'percy-perf', 'polyglot-reviewer', 'dora-docs', 'evan-evangelist', 'build-resolver', 'anna-analytics'
];
// Exclude scripts/ — validate.js itself contains the stale names array
const searchDirs = ['agents', 'commands', 'skills', 'rules', 'manifests'];
let staleFound = 0;

for (const dir of searchDirs) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    const results = [];
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) results.push(...walk(full));
      else if (e.name.endsWith('.md') || e.name.endsWith('.json')) results.push(full);
    }
    return results;
  };
  for (const file of walk(abs)) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file);
    const found = STALE_NAMES.filter(n => new RegExp(`@${n}\\b`, 'i').test(content));
    if (found.length > 0) {
      console.error(`  ✗ ${rel}: references retired agent name(s): ${found.join(', ')}`);
      errors++;
      staleFound++;
    }
  }
}
if (staleFound === 0) {
  console.log('  ✓ No stale agent name references found');
}

// ── Orphan-skill advisory (hygiene, not correctness) ───────────────────────
// Skills can still be auto-discovered by description match, so an un-named
// skill is not broken — but explicit references are more reliable than a
// hope for auto-match. This advisory surfaces naming hygiene without failing.
console.log('\nSkill reference audit (advisory):');
if (fs.existsSync(skillsDir)) {
  const skillNames = fs.readdirSync(skillsDir)
    .filter(s => fs.existsSync(path.join(skillsDir, s, 'SKILL.md')))
    .sort();

  const agentFiles   = fs.readdirSync(path.join(root, 'agents'))
    .filter(f => f.endsWith('.md')).map(f => path.join('agents', f));
  const commandFilesList = fs.readdirSync(path.join(root, 'commands'))
    .filter(f => f.endsWith('.md')).map(f => path.join('commands', f));
  const skillFiles   = skillNames.map(s => path.join('skills', s, 'SKILL.md'));
  const corpus = [...agentFiles, ...commandFilesList, ...skillFiles]
    .map(f => ({ file: f, content: fs.readFileSync(path.join(root, f), 'utf8') }));

  const orphans = [];
  for (const skill of skillNames) {
    const own = path.join('skills', skill, 'SKILL.md');
    const boundary = new RegExp(`(^|[^a-z0-9_-])${skill}([^a-z0-9_-]|$)`, 'i');
    const refCount = corpus.filter(c => c.file !== own && boundary.test(c.content)).length;
    if (refCount === 0) orphans.push(skill);
  }

  if (orphans.length === 0) {
    console.log(`  ✓ All ${skillNames.length} skills referenced by at least one agent/command/skill`);
  } else {
    console.log(`  ⚠ ${orphans.length}/${skillNames.length} skill(s) not named by any agent, command, or other skill:`);
    for (const o of orphans) {
      console.log(`    • skills/${o}  (still auto-discoverable by description match; consider naming it explicitly)`);
    }
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

// ── Project Inventory ───────────────────────────────────────────────────────
function countDir(dir, ext) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter(f => {
    const full = path.join(abs, f);
    if (ext) return f.endsWith(ext);
    return fs.statSync(full).isDirectory();
  });
}

function countLines(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return 0;
  return fs.readFileSync(abs, 'utf8').split('\n').length;
}

function walkDirs(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const results = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.isDirectory()) results.push(e.name);
  }
  return results;
}

function walkFiles(dir, ext) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const results = [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(abs, e.name);
    if (e.isDirectory()) results.push(...walkFiles(path.join(dir, e.name), ext));
    else if (e.name.endsWith(ext)) results.push(path.join(dir, e.name));
  }
  return results;
}

const agents = pluginJson.agents || [];
const skillDirs = walkDirs('skills');
const commandFiles = countDir('commands', '.md');
const ruleFiles = walkFiles('rules', '.md');
const hookScripts = countDir('hooks/scripts', '.js');
const profiles = (() => {
  try { return load('manifests/install-profiles.json').profiles || []; } catch (_) { return []; }
})();
const modules = (() => {
  try { return load('manifests/install-modules.json').modules || []; } catch (_) { return []; }
})();

// Categorize skills by module
const skillCategories = {};
for (const mod of modules) {
  if (mod.kind === 'skills') {
    const count = (mod.paths || []).length;
    const label = mod.id.replace('skills-', '');
    skillCategories[label] = count;
  }
}

// Categorize rules by language
const ruleLangs = {};
for (const r of ruleFiles) {
  const lang = r.split('/')[1] || 'unknown';
  ruleLangs[lang] = (ruleLangs[lang] || 0) + 1;
}

// Agent model distribution
const modelDist = {};
for (const agentPath of agents) {
  const abs = path.join(root, agentPath);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, 'utf8');
  const fm = parseFrontmatter(content);
  if (fm && fm.model) {
    modelDist[fm.model] = (modelDist[fm.model] || 0) + 1;
  }
}

// Doc line counts
const docFiles = ['README.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'ROADMAP.md', 'CHANGELOG.md'];
const docLines = {};
let totalDocLines = 0;
for (const d of docFiles) {
  const lines = countLines(d);
  docLines[d] = lines;
  totalDocLines += lines;
}

// ── Print Inventory ─────────────────────────────────────────────────────────
const cyan  = s => `\x1b[36m${s}\x1b[0m`;
const dim   = s => `\x1b[2m${s}\x1b[0m`;
const bold  = s => `\x1b[1m${s}\x1b[0m`;

console.log(bold('Project Inventory'));
console.log(dim('─'.repeat(60)));
console.log('');

// Table header
const pad = (s, n) => String(s).padEnd(n);
const padR = (s, n) => String(s).padStart(n);

console.log(`  ${pad('Component', 22)} ${padR('Count', 6)}  ${pad('Detail', 30)}`);
console.log(`  ${dim('─'.repeat(58))}`);
console.log(`  ${pad('Version', 22)} ${padR(versionFile, 6)}  ${dim('VERSION, package.json, plugin.json, marketplace.json')}`);
console.log(`  ${pad('Agents', 22)} ${padR(agents.length, 6)}  ${dim(Object.entries(modelDist).map(([m,c]) => `${m}: ${c}`).join(', '))}`);
console.log(`  ${pad('Skills', 22)} ${padR(skillDirs.length, 6)}  ${dim(Object.entries(skillCategories).map(([k,v]) => `${k}: ${v}`).join(', '))}`);
console.log(`  ${pad('Commands', 22)} ${padR(commandFiles.length, 6)}  ${dim(commandFiles.join(', '))}`);
console.log(`  ${pad('Rules', 22)} ${padR(ruleFiles.length, 6)}  ${dim(Object.entries(ruleLangs).map(([k,v]) => `${k}: ${v}`).join(', '))}`);
console.log(`  ${pad('Hooks', 22)} ${padR(hookScripts.length, 6)}  ${dim(hookScripts.join(', '))}`);
console.log(`  ${pad('Install profiles', 22)} ${padR(profiles.length, 6)}  ${dim(profiles.map(p => p.id + (p.default ? '*' : '')).join(', '))}`);
console.log(`  ${pad('Install modules', 22)} ${padR(modules.length, 6)}  ${dim(modules.map(m => m.id).join(', '))}`);
console.log(`  ${pad('Documentation', 22)} ${padR(totalDocLines + 'L', 6)}  ${dim(docFiles.map(d => `${d.replace('.md','')}:${docLines[d]}`).join(', '))}`);
console.log(`  ${dim('─'.repeat(58))}`);

// Agent list
console.log('');
console.log(`  ${bold('Agents')}`);
for (const agentPath of agents) {
  const abs = path.join(root, agentPath);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, 'utf8');
  const fm = parseFrontmatter(content);
  const name = fm ? fm.name : path.basename(agentPath, '.md');
  const model = fm ? fm.model : '?';
  const lines = content.split('\n').length;
  const desc = fm && fm.description ? fm.description.slice(0, 50) : '';
  console.log(`  ${dim('│')} ${pad('@' + name, 20)} ${padR(model, 7)} ${padR(lines + 'L', 5)} ${dim(desc)}`);
}

// Skill categories
console.log('');
console.log(`  ${bold('Skills by category')}`);
for (const mod of modules) {
  if (mod.kind !== 'skills') continue;
  const label = mod.id;
  const names = (mod.paths || []).map(p => {
    const parts = p.replace(/\/$/, '').split('/');
    return parts[parts.length - 1];
  });
  console.log(`  ${dim('│')} ${pad(label, 22)} ${dim(names.join(', '))}`);
}

console.log('');
