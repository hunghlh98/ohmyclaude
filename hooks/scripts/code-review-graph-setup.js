#!/usr/bin/env node
/**
 * code-review-graph-setup.js
 *
 * SessionStart hook (async): detects whether the `uv` runtime prereq
 * for the code-review-graph MCP server is present, and writes the
 * detection outcome to <cwd>/.claude/.ohmyclaude/local.yaml.
 *
 * Why this exists: ohmyclaude declares `code-review-graph` in
 * .claude-plugin/.mcp.json, but the server is spawned lazily by
 * Claude Code via `uvx code-review-graph serve`. If `uv` is missing,
 * that spawn fails with a cryptic error on first MCP tool use. This
 * hook surfaces the problem at session start with a one-line notice
 * and leaves human-readable install instructions as YAML comments
 * at the top of the state file.
 *
 * Contract (per CLAUDE.md):
 *   - Always pass stdin through to stdout byte-identically.
 *   - Always exit 0 (this is an informational hook, not a gate).
 *   - Self-gate: no-op if the plugin's .mcp.json doesn't declare
 *     `code-review-graph` (lets this hook ship in a cycle earlier
 *     than the MCP, or stay behind if the MCP is later removed).
 *   - Respect user override: if the config shows
 *     features.code_review_graph.enabled == false, silent no-op.
 *   - Fast path after first success: setup_complete=true → exit 0
 *     without probing `uv` again.
 *
 * No external dependencies (stdlib only). Hand-parses the small,
 * fixed YAML schema we emit — we never need a general YAML parser.
 */

'use strict';

const fs           = require('fs');
const path         = require('path');
const { spawnSync } = require('child_process');
const { isHookDisabled } = require('./_toggle');

// ── Stdin passthrough boilerplate ───────────────────────────────────────────
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);
  if (isHookDisabled(__filename)) process.exit(0);
  try { main(raw); } catch (_) { /* never let a hook crash block the session */ }
  process.exit(0);
});

function main(rawInput) {
  // Parse the event. On malformed or empty input, bail silently — matches
  // the contract every other hook here follows (no side effects without a
  // valid event object).
  if (!rawInput) return;
  let evt;
  try { evt = JSON.parse(rawInput); } catch (_) { return; }
  if (!evt || typeof evt !== 'object') return;
  const cwd = evt.cwd || process.cwd();

  // Only act on fresh-startup sessions. resume/clear/compact are routine
  // and shouldn't re-emit the notice every time.
  if (evt.source && evt.source !== 'startup') return;

  // Self-gate: is `code-review-graph` declared in this plugin version?
  // Locate .mcp.json via CLAUDE_PLUGIN_ROOT when set, else infer from __dirname.
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT
    || path.resolve(__dirname, '..', '..');
  const mcpJsonPath = path.join(pluginRoot, '.claude-plugin', '.mcp.json');
  if (!mcpJsonPath || !fs.existsSync(mcpJsonPath)) return;
  let mcpDeclared = false;
  try {
    const mcp = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
    mcpDeclared = Boolean(mcp && mcp.mcpServers && mcp.mcpServers['code-review-graph']);
  } catch (_) { return; }
  if (!mcpDeclared) return;

  // Read any existing state file for fast-path + user-override checks.
  const stateDir  = path.join(cwd, '.claude', '.ohmyclaude');
  const stateFile = path.join(stateDir, 'local.yaml');
  const existing  = readState(stateFile);
  const current   = existing && existing.features && existing.features.code_review_graph;

  // User explicitly disabled → silent no-op.
  if (current && current.enabled === false) return;

  // Fast path: already set up successfully.
  if (current && current.setup_complete === true && current.enabled !== false) return;

  // Detection: is `uv` on PATH?
  const uvResult = spawnSync('uv', ['--version'], { encoding: 'utf8', timeout: 2000 });
  const uvAvailable = uvResult.status === 0;
  const uvVersion   = uvAvailable
    ? (uvResult.stdout || '').trim().replace(/^uv\s+/, '')  // "uv 0.4.12" → "0.4.12"
    : null;

  // Write the state file.
  try {
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
    const now = new Date().toISOString();
    // Merge-preserving: keep any existing features.* (e.g. project_init)
    // so concurrent SessionStart hooks don't clobber each other's state.
    const mergeInto = (block) => ({
      version: (existing && existing.version) || 1,
      features: {
        ...((existing && existing.features) || {}),
        code_review_graph: block,
      },
    });
    if (uvAvailable) {
      writeState(stateFile, buildHealthyYaml(mergeInto({
        enabled: true,
        setup_complete: true,
        uv_version: uvVersion,
        installed_at: now,
        reason: null,
      })));
      process.stderr.write(
        `[ohmyclaude] code-review-graph MCP ready (uv ${uvVersion}). ` +
        `First call may be slow while uv caches the package.\n`
      );
    } else {
      writeState(stateFile, buildMissingUvYaml(mergeInto({
        enabled: false,
        setup_complete: false,
        reason: 'uv-missing',
        detected_at: now,
      })));
      process.stderr.write(
        `[ohmyclaude] code-review-graph MCP needs 'uv'. ` +
        `See .claude/.ohmyclaude/local.yaml for install instructions.\n`
      );
    }
  } catch (_) { /* best-effort; never fail the session */ }
}

// ── Minimal YAML emitter (healthy case) ─────────────────────────────────────
function buildHealthyYaml(doc) {
  const lines = [
    '# ohmyclaude · per-project host-local state',
    '# Edit by hand is safe; changes take effect on next Claude Code restart.',
    '# Never commit — .claude/.ohmyclaude/ is machine-managed.',
    '',
  ];
  lines.push(...emitDoc(doc));
  return lines.join('\n') + '\n';
}

function buildMissingUvYaml(doc) {
  const lines = [
    '# ohmyclaude · per-project host-local state',
    '# code-review-graph MCP is waiting on `uv`. Install one of:',
    '#   macOS:         brew install uv',
    '#   Linux/macOS:   curl -LsSf https://astral.sh/uv/install.sh | sh',
    '#   Docs:          https://docs.astral.sh/uv/',
    '# After installing, restart Claude Code — this file will be rewritten',
    '# on the next SessionStart.',
    '',
  ];
  lines.push(...emitDoc(doc));
  return lines.join('\n') + '\n';
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

function emitScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number')  return String(v);
  const s = String(v);
  // Quote strings containing anything YAML-ish. Our values are timestamps,
  // semver strings, identifiers — always safe under double-quotes.
  return `"${s.replace(/"/g, '\\"')}"`;
}

// ── Minimal YAML reader for round-trip checks ───────────────────────────────
// Parses ONLY the schema we emit above: top-level scalars + a `features:`
// block with two-level nesting. Hand-written so we avoid a js-yaml dep.
function readState(file) {
  if (!fs.existsSync(file)) return null;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return null; }

  const doc = {};
  let currentFeature = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;

    // features: (block start)
    if (/^features:\s*$/.test(line)) {
      doc.features = doc.features || {};
      currentFeature = '__awaiting__';
      continue;
    }

    // top-level scalar  "key: value"
    const topMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (topMatch && !line.startsWith(' ')) {
      if (topMatch[1] === 'features') continue; // handled above
      doc[topMatch[1]] = parseScalar(topMatch[2]);
      currentFeature = null;
      continue;
    }

    // feature-name line  "  <name>:" (2-space indent)
    const featMatch = line.match(/^ {2}([A-Za-z_][\w-]*):\s*$/);
    if (featMatch && doc.features) {
      currentFeature = featMatch[1];
      doc.features[currentFeature] = {};
      continue;
    }

    // nested key-value  "    key: value" (4-space indent)
    const kvMatch = line.match(/^ {4}([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kvMatch && doc.features && currentFeature && currentFeature !== '__awaiting__') {
      doc.features[currentFeature][kvMatch[1]] = parseScalar(kvMatch[2]);
      continue;
    }

    // Unknown shape — tolerate silently.
  }
  return doc;
}

function parseScalar(raw) {
  const s = (raw || '').trim();
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true')  return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s))         return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s))    return parseFloat(s);
  // Strip a surrounding pair of quotes, unescape \"
  const qm = s.match(/^"((?:[^"\\]|\\.)*)"$/) || s.match(/^'([^']*)'$/);
  if (qm) return qm[1].replace(/\\"/g, '"');
  return s; // unquoted string
}

// ── Atomic write ────────────────────────────────────────────────────────────
function writeState(target, contents) {
  const dir = path.dirname(target);
  const tmp = path.join(dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, target);
}
