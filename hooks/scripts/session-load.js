#!/usr/bin/env node
/**
 * session-load.js
 *
 * SessionStart hook (async): when a fresh Claude Code session begins,
 * detect if a saved session exists for the current cwd and emit a
 * one-line stderr notification so the user knows it's available via
 * /load.
 *
 * This hook is OBSERVATIONAL ONLY per the SessionStart contract:
 * stdout/stderr cannot inject context into the model's prompt. Auto-
 * resume is left to the user's explicit /load invocation. The point of
 * this hook is discoverability — without it, saved sessions rot
 * invisibly.
 *
 * Contract:
 *   - Fires on `source: startup` only (fresh sessions). Sources `resume`,
 *     `clear`, and `compact` are skipped — native Claude Code flow is
 *     already handling those, and we don't want to flood the user with
 *     notifications about state they just touched.
 *   - Graceful no-op when ~/.claude/ohmyclaude/sessions/ does not exist.
 *   - Always exits 0; always passes stdin through.
 *
 * Schema read (by hint only — does not rehydrate):
 *   ~/.claude/ohmyclaude/sessions/_index.json : { <cwd_hash>: <session_id> }
 *   ~/.claude/ohmyclaude/sessions/<id>/meta.json
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');
const { isHookDisabled } = require('./_toggle');

const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'ohmyclaude', 'sessions');
const MAX_AGE_HOURS = 24 * 14; // hint up to 14 days back — beyond that is stale

function cwdHash(cwd) {
  return crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 16);
}

function hoursSince(isoTs) {
  const then = Date.parse(isoTs);
  if (isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000 * 60 * 60);
}

function emitSavedSessionHint(cwd) {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const indexPath = path.join(SESSIONS_DIR, '_index.json');
  let index = {};
  try {
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }
  } catch { return; }
  const hash = cwdHash(cwd);
  const sessionId = index[hash];
  if (!sessionId) return;
  const metaPath = path.join(SESSIONS_DIR, sessionId, 'meta.json');
  if (!fs.existsSync(metaPath)) return;
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch { return; }
  const age = hoursSince(meta.last_touch_ts);
  if (age > MAX_AGE_HOURS) return;
  const hrs = Math.round(age);
  const when = hrs < 1 ? 'just now' : hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
  process.stderr.write(
    `[ohmyclaude] Saved session available for this directory (last touched ${when}). ` +
    `Run /load to resume.\n`
  );
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);
  if (isHookDisabled(__filename)) process.exit(0);

  let evt;
  try { evt = JSON.parse(raw); } catch { process.exit(0); }

  // Only hint on fresh-startup sessions.
  if (evt.source && evt.source !== 'startup') process.exit(0);

  const cwd = evt.cwd || process.cwd();

  // Both checks are independent — neither blocks the other on early exit.
  emitSavedSessionHint(cwd);
  emitTuningReminderIfDue(cwd);
  process.exit(0);
});

// ── Evaluator-tuning reminder (Bundle C addition) ───────────────────────────
// If the consumer project's .claude/pipeline/ contains ≥3 HUMAN-VERDICT-*.md
// files marked `agreed_with_val: no | partially` since the plugin's val-evaluator
// agent file last changed, surface a one-line nudge so the tuning loop in
// skills/evaluator-tuning/SKILL.md doesn't rot invisibly.
//
// Watermark: mtime of the SHIPPED agents/val-evaluator.md inside the plugin.
// The function is best-effort — silent no-op on any IO error.
function emitTuningReminderIfDue(cwd) {
  try {
    const pipelineDir = path.join(cwd, '.claude', 'pipeline');
    if (!fs.existsSync(pipelineDir)) return;

    const valAgentPath = path.resolve(__dirname, '..', '..', 'agents', 'val-evaluator.md');
    if (!fs.existsSync(valAgentPath)) return;
    const watermarkMs = fs.statSync(valAgentPath).mtimeMs;

    const entries = fs.readdirSync(pipelineDir);
    let disagreements = 0;
    for (const name of entries) {
      if (!/^HUMAN-VERDICT-.+\.md$/.test(name)) continue;
      const full = path.join(pipelineDir, name);
      try {
        if (fs.statSync(full).mtimeMs < watermarkMs) continue;
        const text = fs.readFileSync(full, 'utf8');
        if (/^agreed_with_val:\s*(no|partially)\b/m.test(text)) disagreements++;
      } catch (_) { /* skip unreadable files */ }
    }

    if (disagreements >= 3) {
      process.stderr.write(
        `[ohmyclaude] 🔁 Evaluator tuning due: ${disagreements} HUMAN-VERDICT files ` +
        `disagree with Val since last patch. Run the read-logs → find-divergence → ` +
        `patch loop in skills/evaluator-tuning/SKILL.md.\n`
      );
    }
  } catch (_) { /* silent */ }
}
