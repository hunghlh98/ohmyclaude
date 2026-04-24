#!/usr/bin/env node
/**
 * team-cleanup.js
 *
 * Stop hook — clean up orphaned teams older than 24 hours.
 * Prevents stale team state from accumulating after crashed sessions.
 *
 * Matcher: * (all stops)
 * Async: true (non-blocking)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { isHookDisabled } = require('./_toggle');

let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);
  if (isHookDisabled(__filename)) process.exit(0);

  const teamsDir = path.join(os.homedir(), '.claude', 'teams');
  if (!fs.existsSync(teamsDir)) {
    process.exit(0);
  }

  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();

  for (const entry of fs.readdirSync(teamsDir)) {
    const teamPath = path.join(teamsDir, entry);
    try {
      const stat = fs.statSync(teamPath);
      if (stat.isDirectory() && (now - stat.mtimeMs) > MAX_AGE_MS) {
        fs.rmSync(teamPath, { recursive: true, force: true });
        // Also clean matching tasks directory
        const tasksPath = path.join(os.homedir(), '.claude', 'tasks', entry);
        if (fs.existsSync(tasksPath)) {
          fs.rmSync(tasksPath, { recursive: true, force: true });
        }
      }
    } catch (_) {
      // Skip entries we can't access
    }
  }

  process.exit(0);
});
