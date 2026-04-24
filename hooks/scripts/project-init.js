#!/usr/bin/env node
/**
 * project-init.js
 *
 * SessionStart hook (sync): on first launch in a git repo root, scaffold
 * the ohmyclaude structure under <gitroot>/.claude/.ohmyclaude/. The
 * single per-project state file .ohmyclaude/local.yaml doubles as the
 * sentinel via features.project_init.setup_complete. Subsequent sessions
 * read the YAML, see setup_complete=true, and silent-exit.
 *
 * Creates under <gitroot>:
 *   .claude/.ohmyclaude/local.yaml           ← shared state (written LAST)
 *   .claude/.ohmyclaude/usage/               ← usage-tracker.js target
 *   .claude/.ohmyclaude/backlog/issues/      ← human-authored ISS-*.md
 *   .claude/.ohmyclaude/backlog/BACKLOG.md   ← backlog-tracker.js target
 *   .claude/.ohmyclaude/pipeline/            ← cost-profiler.js target
 *   .claude/.ohmyclaude/metrics/             ← cost-profiler.js target
 *   .claude/CLAUDE.md                        ← marker-delimited section:
 *                                              - missing → create with header + section
 *                                              - exists without marker → append
 *                                              - exists with marker → no change
 *
 * Six guardrails — ALL must pass, else silent no-op:
 *   1. source === 'startup' (skip resume/clear/compact)
 *   2. git root found
 *   3. cwd IS the git root (not a subfolder)
 *   4. git root is not $HOME
 *   5. not the ohmyclaude plugin repo itself
 *   6. YAML features.project_init.setup_complete !== true
 *
 * Coexistence with code-review-graph-setup: both hooks write
 * local.yaml. Writes merge-preserve existing features.* blocks so
 * whichever runs second doesn't clobber the other's state.
 *
 * Output:
 *   - stdout: plain-text banner on successful first-run init
 *   - exit: always 0
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const MARKER_BEGIN = '<!-- BEGIN: ohmyclaude (auto-generated — do not edit inside markers) -->';
const MARKER_END   = '<!-- END: ohmyclaude -->';

function findGitRoot(start) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function isOhmyclaudeRepo(root) {
  const manifest = path.join(root, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifest)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    return pkg.name === 'ohmyclaude';
  } catch {
    return false;
  }
}

const BACKLOG_TEMPLATE = `# Backlog

Issues are tracked as \`ISS-*.md\` files under \`.claude/.ohmyclaude/backlog/issues/\`.
This index is auto-maintained by the ohmyclaude \`backlog-tracker\` hook.

_No issues yet._
`;

function ohmyclaudeSection() {
  return [
    MARKER_BEGIN,
    '## ohmyclaude',
    '',
    'This project uses the **ohmyclaude** plugin — a 10-agent pipeline for structured software delivery.',
    '',
    '### Available commands',
    '',
    '- `/forge <goal>` — run the full 10-agent pipeline (discover → ship)',
    '- `/save` — persist session context to `~/.claude/ohmyclaude/sessions/`',
    '- `/load` — resume a saved session for this directory',
    '',
    '### Conventions',
    '',
    '- **Plugin-generated state**: everything ohmyclaude writes lives under `.claude/.ohmyclaude/` (hidden; machine-managed).',
    '- **Backlog**: `ISS-*.md` files under `.claude/.ohmyclaude/backlog/issues/`; the rolled-up index at `.claude/.ohmyclaude/backlog/BACKLOG.md` is auto-maintained by the `backlog-tracker` hook.',
    '- **Usage telemetry**: per-project metrics live under `.claude/.ohmyclaude/usage/` (consider gitignoring `.claude/.ohmyclaude/`).',
    '- **Session history**: saved under `~/.claude/ohmyclaude/sessions/` (user scope, not this repo).',
    '',
    MARKER_END,
    ''
  ].join('\n');
}

function updateClaudeMd(claudePath) {
  if (!fs.existsSync(claudePath)) {
    fs.mkdirSync(path.dirname(claudePath), { recursive: true });
    fs.writeFileSync(claudePath, `# CLAUDE.md\n\n${ohmyclaudeSection()}`);
    return 'created';
  }
  const existing = fs.readFileSync(claudePath, 'utf8');
  if (existing.includes(MARKER_BEGIN)) return 'unchanged';
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  fs.appendFileSync(claudePath, separator + ohmyclaudeSection());
  return 'appended';
}

// ── Minimal YAML parser/emitter (schema-limited; shared with
//    code-review-graph-setup.js — same format, kept lockstep) ──────────────

function emitScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number')  return String(v);
  return `"${String(v).replace(/"/g, '\\"')}"`;
}

function emitDoc(doc) {
  const lines = [];
  lines.push(`version: ${emitScalar(doc.version)}`);
  lines.push('features:');
  for (const [feature, block] of Object.entries(doc.features || {})) {
    lines.push(`  ${feature}:`);
    for (const [k, v] of Object.entries(block)) {
      lines.push(`    ${k}: ${emitScalar(v)}`);
    }
  }
  return lines;
}

function buildYaml(doc) {
  const lines = [
    '# ohmyclaude · per-project host-local state',
    '# Edit by hand is safe; changes take effect on next Claude Code restart.',
    '# Never commit — .claude/.ohmyclaude/ is machine-managed.',
    '',
  ];
  lines.push(...emitDoc(doc));
  return lines.join('\n') + '\n';
}

function parseScalar(raw) {
  const s = (raw || '').trim();
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true')  return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s))      return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  const qm = s.match(/^"((?:[^"\\]|\\.)*)"$/) || s.match(/^'([^']*)'$/);
  if (qm) return qm[1].replace(/\\"/g, '"');
  return s;
}

function readState(file) {
  if (!fs.existsSync(file)) return null;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }

  const doc = {};
  let currentFeature = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;

    if (/^features:\s*$/.test(line)) {
      doc.features = doc.features || {};
      currentFeature = '__awaiting__';
      continue;
    }

    const topMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (topMatch && !line.startsWith(' ')) {
      if (topMatch[1] === 'features') continue;
      doc[topMatch[1]] = parseScalar(topMatch[2]);
      currentFeature = null;
      continue;
    }

    const featMatch = line.match(/^ {2}([A-Za-z_][\w-]*):\s*$/);
    if (featMatch && doc.features) {
      currentFeature = featMatch[1];
      doc.features[currentFeature] = {};
      continue;
    }

    const kvMatch = line.match(/^ {4}([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kvMatch && doc.features && currentFeature && currentFeature !== '__awaiting__') {
      doc.features[currentFeature][kvMatch[1]] = parseScalar(kvMatch[2]);
      continue;
    }
  }
  return doc;
}

function writeStateAtomic(target, contents) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, target);
}

// ── Hook entry ───────────────────────────────────────────────────────────────

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  let evt = {};
  try { evt = JSON.parse(raw); } catch {}

  if (evt.source && evt.source !== 'startup') return process.exit(0);

  const cwd = evt.cwd || process.cwd();
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) return process.exit(0);
  if (path.resolve(cwd) !== gitRoot) return process.exit(0);
  if (gitRoot === os.homedir()) return process.exit(0);
  if (isOhmyclaudeRepo(gitRoot)) return process.exit(0);

  const stateFile = path.join(gitRoot, '.claude', '.ohmyclaude', 'local.yaml');
  const existing  = readState(stateFile);
  const already   = existing && existing.features && existing.features.project_init && existing.features.project_init.setup_complete === true;
  if (already) return process.exit(0);

  const created = [];
  try {
    const base = path.join(gitRoot, '.claude', '.ohmyclaude');
    fs.mkdirSync(base, { recursive: true });
    created.push('.claude/.ohmyclaude/');

    fs.mkdirSync(path.join(base, 'usage'), { recursive: true });
    created.push('.claude/.ohmyclaude/usage/');

    fs.mkdirSync(path.join(base, 'backlog', 'issues'), { recursive: true });
    created.push('.claude/.ohmyclaude/backlog/issues/');

    const backlogPath = path.join(base, 'backlog', 'BACKLOG.md');
    if (!fs.existsSync(backlogPath)) {
      fs.writeFileSync(backlogPath, BACKLOG_TEMPLATE);
      created.push('.claude/.ohmyclaude/backlog/BACKLOG.md');
    }

    fs.mkdirSync(path.join(base, 'pipeline'), { recursive: true });
    created.push('.claude/.ohmyclaude/pipeline/');

    fs.mkdirSync(path.join(base, 'metrics'), { recursive: true });
    created.push('.claude/.ohmyclaude/metrics/');

    const claudeMdPath = path.join(gitRoot, '.claude', 'CLAUDE.md');
    const claudeMdState = updateClaudeMd(claudeMdPath);
    if (claudeMdState === 'created')  created.push('.claude/CLAUDE.md (created)');
    else if (claudeMdState === 'appended') created.push('.claude/CLAUDE.md (appended ohmyclaude section)');

    // Merge-preserving write: keep any existing features.* (e.g. code_review_graph)
    const mergedDoc = {
      version: (existing && existing.version) || 1,
      features: {
        ...((existing && existing.features) || {}),
        project_init: {
          enabled: true,
          setup_complete: true,
          schema_version: 1,
          initialised_at: new Date().toISOString(),
        },
      },
    };
    writeStateAtomic(stateFile, buildYaml(mergedDoc));
    created.push('.claude/.ohmyclaude/local.yaml');
  } catch {
    return process.exit(0);
  }

  process.stdout.write(
    `Initialised ohmyclaude project at ${gitRoot}: ${created.join(', ')}\n`
  );
  process.exit(0);
});
