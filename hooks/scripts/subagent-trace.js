#!/usr/bin/env node
/**
 * subagent-trace.js
 *
 * SubagentStart hook (async): appends one JSONL line per subagent spawn
 * to the session's traces.jsonl. Pure telemetry — Claude Code's
 * SubagentStart event is observational, so this hook cannot inject
 * context into the subagent's prompt (that would require a
 * PreToolUse-on-Task hook, deferred to a later release).
 *
 * Pairs with cost-profiler.js: together they cover the full per-agent
 * lifecycle. Profiler writes cost/usage on SubagentStop; this hook
 * writes start/duration-start timestamps, enabling analysis of "which
 * agent types fire most often" without re-parsing transcripts.
 *
 * Contract:
 *   - Fires on every subagent spawn (Task tool or equivalent).
 *   - Graceful no-op when the session directory does not yet exist;
 *     /save must run first.
 *   - Always exits 0; always passes stdin through.
 *
 * Writes:
 *   ~/.claude/ohmyclaude/sessions/<session-id>/traces.jsonl  (append)
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');
const { isHookDisabled } = require('./_toggle');

const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'ohmyclaude', 'sessions');

function cwdHash(cwd) {
  return crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 16);
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);
  if (isHookDisabled(__filename)) process.exit(0);

  let evt;
  try { evt = JSON.parse(raw); } catch { process.exit(0); }

  const cwd = evt.cwd || process.cwd();
  if (!fs.existsSync(SESSIONS_DIR)) process.exit(0);

  const index = readJsonSafe(path.join(SESSIONS_DIR, '_index.json')) || {};
  const sessionId = index[cwdHash(cwd)];
  if (!sessionId) process.exit(0);

  const sessDir = path.join(SESSIONS_DIR, sessionId);
  if (!fs.existsSync(sessDir)) process.exit(0);

  const entry = {
    ts:         new Date().toISOString(),
    event:      'SubagentStart',
    session_id: evt.session_id || sessionId,
    agent_id:   evt.agent_id   || null,
    agent_type: evt.agent_type || null,
  };

  try {
    fs.appendFileSync(
      path.join(sessDir, 'traces.jsonl'),
      JSON.stringify(entry) + '\n'
    );
  } catch { /* non-fatal */ }

  process.exit(0);
});
