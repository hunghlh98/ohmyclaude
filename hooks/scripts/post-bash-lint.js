#!/usr/bin/env node
/**
 * post-bash-lint.js
 *
 * PostToolUse hook (async): after a bash command that looks like it modified
 * source files, run the project's lint command if one is configured.
 *
 * Detection heuristic: the bash command contains common source-modifying
 * patterns (mv, cp, tee, redirection) — or the output mentions a file change.
 *
 * Runs async so it doesn't block the main conversation flow.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isHookDisabled } = require('./_toggle');

// Commands that suggest source files were modified
const SOURCE_MODIFYING_PATTERNS = [
  /\bnpm\s+install\b/,
  /\byarn\s+add\b/,
  /\bbun\s+add\b/,
  /\bpip\s+install\b/,
  /\bgit\s+apply\b/,
  /\bgit\s+checkout\b/,
  /\bgit\s+stash\s+pop\b/,
];

// Commands where we definitely should NOT lint (read-only, test runners, etc.)
const SKIP_PATTERNS = [
  /^\s*(?:cat|ls|find|grep|echo|pwd|cd|which|curl|wget|git\s+(?:log|diff|status|show))\b/,
  /\bnpm\s+test\b/,
  /\byarn\s+test\b/,
  /\bbun\s+test\b/,
];

let rawInput = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });

process.stdin.on('end', () => {
  if (isHookDisabled(__filename)) { process.stdout.write(rawInput); process.exit(0); }
  let input;
  try {
    input = JSON.parse(rawInput);
  } catch {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const command = input.tool_input?.command || '';

  // Always pass through immediately (async hook)
  process.stdout.write(rawInput);

  // Skip read-only commands
  if (SKIP_PATTERNS.some(p => p.test(command))) {
    process.exit(0);
  }

  // Only lint if command suggests source modification
  const shouldLint = SOURCE_MODIFYING_PATTERNS.some(p => p.test(command));
  if (!shouldLint) {
    process.exit(0);
  }

  // Find lint command from package.json
  const cwd = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
  const pkgPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    process.exit(0);
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    process.exit(0);
  }

  const lintCmd = pkg.scripts?.lint;
  if (!lintCmd) {
    process.exit(0);
  }

  // Run lint (async, non-blocking output to stderr)
  const result = spawnSync('npm', ['run', 'lint', '--', '--max-warnings=0'], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
  });

  if (result.status !== 0) {
    process.stderr.write(
      `[ohmyclaude] Lint warnings after last change:\n` +
      (result.stdout || '') +
      (result.stderr || '') +
      '\n'
    );
  }

  process.exit(0);
});
