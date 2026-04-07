#!/usr/bin/env node
/**
 * graph-update.js
 *
 * PostToolUse hook — triggers incremental graph update after code changes.
 * Only runs if code-review-graph is installed.
 *
 * Matcher: Write|Edit|MultiEdit
 * Async: true (non-blocking)
 */

'use strict';

const { spawnSync } = require('child_process');

let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  // Always pass through — this hook is informational only
  process.stdout.write(raw);

  // Check if code-review-graph is available
  const check = spawnSync('which', ['code-review-graph'], { encoding: 'utf8' });
  if (check.status !== 0) {
    // code-review-graph not installed — skip silently
    process.exit(0);
  }

  // Trigger incremental update (fire-and-forget)
  const update = spawnSync('code-review-graph', ['update', '--incremental'], {
    encoding: 'utf8',
    timeout: 8000
  });

  if (update.status !== 0 && update.stderr) {
    // Log but don't block
    process.stderr.write(`[graph-update] ${update.stderr.trim()}\n`);
  }

  process.exit(0);
});
