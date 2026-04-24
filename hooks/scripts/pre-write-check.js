#!/usr/bin/env node
/**
 * pre-write-check.js
 *
 * PreToolUse hook: blocks Write/Edit/MultiEdit if the content contains
 * patterns that look like hardcoded secrets (API keys, passwords, tokens).
 *
 * Exit code 2 = block the tool call.
 * Exit code 0 = allow.
 */

'use strict';

const { isHookDisabled } = require('./_toggle');

const SECRET_PATTERNS = [
  // Generic high-entropy assignments
  /(?:api_key|apikey|api-key)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}['"]?/i,
  /(?:secret|password|passwd|pwd)\s*[:=]\s*['"]?[A-Za-z0-9_\-!@#$%^&*]{8,}['"]?/i,
  /(?:token|access_token|auth_token)\s*[:=]\s*['"]?[A-Za-z0-9_\-\.]{20,}['"]?/i,
  // AWS
  /AKIA[0-9A-Z]{16}/,
  // Stripe
  /sk_live_[0-9a-zA-Z]{24,}/,
  /pk_live_[0-9a-zA-Z]{24,}/,
  // GitHub
  /ghp_[0-9a-zA-Z]{36}/,
  /github_pat_[0-9a-zA-Z_]{82}/,
  // Private keys
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
];

// Patterns that are clearly safe (test values, placeholders)
const SAFE_PATTERNS = [
  /your[_-]?api[_-]?key/i,
  /your[_-]?secret/i,
  /example[_-]?key/i,
  /placeholder/i,
  /\$\{[A-Z_]+\}/,           // ${ENV_VAR}
  /process\.env\./,           // process.env.KEY
  /os\.environ/,              // os.environ['KEY']
  /getenv\(/,                 // getenv('KEY')
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
    // Can't parse — pass through
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const content = input.tool_input?.content || input.tool_input?.new_string || '';

  if (!content) {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  // Check each line
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip if line matches a safe pattern
    if (SAFE_PATTERNS.some(p => p.test(line))) continue;

    // Check for secret patterns
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        process.stderr.write(
          `[ohmyclaude] BLOCKED: Potential hardcoded secret detected on line ${i + 1}.\n` +
          `  Use environment variables instead: process.env.YOUR_SECRET_NAME\n` +
          `  If this is a test value or placeholder, prefix the variable name with "example_" or "test_".\n`
        );
        process.exit(2); // Block
      }
    }
  }

  process.stdout.write(rawInput);
  process.exit(0);
});
