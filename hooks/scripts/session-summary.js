#!/usr/bin/env node
/**
 * session-summary.js
 *
 * Stop hook (async): after each Claude response, appends a compact summary
 * entry to ~/.claude/ohmyclaude/sessions/<date>.jsonl
 *
 * Each entry records: timestamp, session_id, model, token usage.
 * On session end (when last_assistant_message is present and substantial),
 * also writes a human-readable summary file.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { isHookDisabled } = require('./_toggle');

const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'ohmyclaude', 'sessions');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

let rawInput = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });

process.stdin.on('end', () => {
  // Pass through immediately
  process.stdout.write(rawInput);
  if (isHookDisabled(__filename)) process.exit(0);

  let input;
  try {
    input = JSON.parse(rawInput);
  } catch {
    process.exit(0);
  }

  const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';
  const model = input.model || process.env.CLAUDE_MODEL || 'unknown';
  const usage = input.usage || {};
  const lastMessage = input.last_assistant_message || '';

  const entry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    model,
    input_tokens: usage.input_tokens || 0,
    output_tokens: usage.output_tokens || 0,
    message_preview: lastMessage.slice(0, 120).replace(/\n/g, ' '),
  };

  try {
    ensureDir(SESSIONS_DIR);
    const logFile = path.join(SESSIONS_DIR, `${todayStr()}.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Never fail silently on the main flow — just exit
  }

  process.exit(0);
});
