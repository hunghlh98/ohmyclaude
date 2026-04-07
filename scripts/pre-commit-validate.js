#!/usr/bin/env node
/**
 * pre-commit-validate.js
 *
 * PreToolUse hook — runs before `git commit` commands.
 * 1. Runs validate.js — blocks commit if validation fails
 * 2. Checks if plugin files changed but VERSION wasn't bumped — warns
 *
 * Matcher: Bash (matches commands containing "git commit")
 * Blocking: exit 2 to block, exit 0 to allow
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  const input = JSON.parse(raw);

  // Only intercept git commit commands
  const command = input?.tool_input?.command || '';
  if (!command.match(/\bgit\s+commit\b/)) {
    process.stdout.write(raw);
    process.exit(0);
  }

  const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '../..');

  // ── Step 1: Run validate.js ─────────────────────────────────────────────
  const validate = spawnSync(process.execPath, [path.join(root, 'scripts/validate.js')], {
    encoding: 'utf8',
    cwd: root,
    timeout: 30000
  });

  if (validate.status !== 0) {
    process.stderr.write('\n[pre-commit] Validation failed. Fix errors before committing.\n');
    process.stderr.write(validate.stdout || '');
    process.stderr.write(validate.stderr || '');
    process.stdout.write(raw);
    process.exit(2); // Block the commit
  }

  // ── Step 2: Check if plugin files changed without version bump ──────────
  const diff = spawnSync('git', ['diff', '--cached', '--name-only'], {
    encoding: 'utf8',
    cwd: root,
    timeout: 5000
  });

  const staged = (diff.stdout || '').split('\n').filter(Boolean);

  const pluginFiles = staged.filter(f =>
    f.startsWith('agents/') ||
    f.startsWith('skills/') ||
    f.startsWith('commands/') ||
    f.startsWith('hooks/') ||
    f.startsWith('rules/') ||
    f.startsWith('manifests/')
  );

  const versionChanged = staged.some(f =>
    f === 'VERSION' ||
    f === 'package.json' ||
    f.includes('plugin.json') ||
    f.includes('marketplace.json')
  );

  if (pluginFiles.length > 0 && !versionChanged) {
    process.stderr.write('\n[pre-commit] Warning: plugin files changed but VERSION not bumped.\n');
    process.stderr.write(`  Changed: ${pluginFiles.slice(0, 5).join(', ')}${pluginFiles.length > 5 ? ` (+${pluginFiles.length - 5} more)` : ''}\n`);
    process.stderr.write('  Run: node scripts/bump-version.js --patch\n\n');
    // Warning only — don't block. Some commits (docs, refactor) don't need a bump.
  }

  process.stdout.write(raw);
  process.exit(0);
});
