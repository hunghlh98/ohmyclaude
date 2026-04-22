#!/usr/bin/env node
/**
 * state-snapshot.js
 *
 * PreCompact hook (async): before Claude compacts the conversation,
 * snapshot pipeline state to disk so /load can resume from the most
 * recent checkpoint rather than the pre-compaction tip.
 *
 * Contract:
 *   - Fires before every compaction event.
 *   - Writes minimal pipeline-cursor state. Does NOT attempt to summarize
 *     the full transcript — that is what Claude's own compaction does.
 *     This snapshot is the ohmyclaude-specific state the compaction
 *     cannot recover (pipeline artifact pointers, lead-agent cursor).
 *   - Graceful no-op when the session directory does not yet exist;
 *     /save must run first before PreCompact has anything to update.
 *   - Always exits 0; always passes stdin through.
 *
 * The hook updates:
 *   ~/.claude/ohmyclaude/sessions/<session-id>/stages.json
 *     by reading the current cwd's .claude/pipeline/ and recording
 *     which artifacts are present.
 *   ~/.claude/ohmyclaude/sessions/<session-id>/meta.json
 *     bumps last_touch_ts so session-load.js reports fresh "compacted
 *     Nh ago".
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');

const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'ohmyclaude', 'sessions');

function cwdHash(cwd) {
  return crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 16);
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function listPipelineArtifacts(cwd) {
  const dir = path.join(cwd, '.claude', 'pipeline');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    // Skip hidden / helper files; the pipeline convention is ARTIFACT-<id>.md
    if (file.startsWith('.') || file.toUpperCase() === file.replace(/\.md$/, '') + '.md' && file === 'README.md') continue;
    const abs = path.join(dir, file);
    const stat = fs.statSync(abs);
    out.push({
      artifact: file.replace(/\.md$/, ''),
      path:     path.join('.claude', 'pipeline', file),
      mtime:    stat.mtimeMs,
      size:     stat.size,
    });
  }
  return out.sort((a, b) => a.mtime - b.mtime);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);

  let evt;
  try { evt = JSON.parse(raw); } catch { process.exit(0); }

  const cwd = evt.cwd || process.cwd();
  if (!fs.existsSync(SESSIONS_DIR)) process.exit(0);

  const indexPath = path.join(SESSIONS_DIR, '_index.json');
  const index = readJsonSafe(indexPath) || {};
  const sessionId = index[cwdHash(cwd)];

  // No saved session for this cwd — /save hasn't run yet. Nothing to snapshot.
  if (!sessionId) process.exit(0);

  const sessDir = path.join(SESSIONS_DIR, sessionId);
  if (!fs.existsSync(sessDir)) process.exit(0);

  // Update stages.json with the current pipeline artifact inventory.
  try {
    const artifacts = listPipelineArtifacts(cwd);
    const stages = {
      snapshot_ts: new Date().toISOString(),
      artifacts,
    };
    fs.writeFileSync(path.join(sessDir, 'stages.json'), JSON.stringify(stages, null, 2));
  } catch { /* non-fatal */ }

  // Touch meta.last_touch_ts so /load shows freshness.
  try {
    const metaPath = path.join(sessDir, 'meta.json');
    const meta = readJsonSafe(metaPath);
    if (meta) {
      meta.last_touch_ts = new Date().toISOString();
      meta.last_event = 'PreCompact';
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }
  } catch { /* non-fatal */ }

  process.exit(0);
});
