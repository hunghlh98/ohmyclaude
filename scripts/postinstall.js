#!/usr/bin/env node
/**
 * postinstall.js
 *
 * Runs automatically after:
 *   - claude plugin install hunghlh98/ohmyclaude  (marketplace)
 *   - npm install  (manual)
 *   - bash install.sh  (delegates here)
 *
 * What it does:
 *   1. Copies contexts/ to ~/.claude/contexts/
 *   2. Injects shell aliases into ~/.zshrc / ~/.bashrc / ~/.bash_profile
 *   3. Prints quick-start instructions
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const REPO_ROOT    = path.resolve(__dirname, '..');
const HOME         = os.homedir();
const CONTEXTS_SRC = path.join(REPO_ROOT, 'contexts');
const CONTEXTS_DST = path.join(HOME, '.claude', 'contexts');

const ALIAS_MARKER_START = '# ohmyclaude — context-mode aliases';
const ALIAS_MARKER_END   = '# end ohmyclaude';

// ── Helpers ──────────────────────────────────────────────────────────────────
const green  = s => `\x1b[32m${s}\x1b[0m`;
const blue   = s => `\x1b[34m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;

function info(msg)    { console.log(`${blue('[ohmyclaude]')} ${msg}`); }
function success(msg) { console.log(`${green('[ohmyclaude]')} ${msg}`); }
function warn(msg)    { console.log(`${yellow('[ohmyclaude]')} ${msg}`); }

// ── 1. Copy contexts ──────────────────────────────────────────────────────────
function installContexts() {
  if (!fs.existsSync(CONTEXTS_SRC)) {
    warn('contexts/ directory not found — skipping context install.');
    return;
  }

  fs.mkdirSync(CONTEXTS_DST, { recursive: true });

  for (const file of fs.readdirSync(CONTEXTS_SRC)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(
      path.join(CONTEXTS_SRC, file),
      path.join(CONTEXTS_DST, file)
    );
  }

  success(`Contexts installed → ${CONTEXTS_DST}`);
}

// ── 2. Inject shell aliases ───────────────────────────────────────────────────
function buildAliasBlock() {
  const ctxDir = CONTEXTS_DST.replace(HOME, '$HOME');
  return [
    '',
    ALIAS_MARKER_START,
    `alias claude-dev='claude --system-prompt "$(cat ${ctxDir}/dev.md)"'`,
    `alias claude-review='claude --system-prompt "$(cat ${ctxDir}/review.md)"'`,
    `alias claude-plan='claude --system-prompt "$(cat ${ctxDir}/plan.md)"'`,
    `alias claude-debug='claude --system-prompt "$(cat ${ctxDir}/debug.md)"'`,
    `alias claude-research='claude --system-prompt "$(cat ${ctxDir}/research.md)"'`,
    ALIAS_MARKER_END,
    '',
  ].join('\n');
}

function detectShellRc() {
  const candidates = ['.zshrc', '.bashrc', '.bash_profile'];
  for (const f of candidates) {
    const p = path.join(HOME, f);
    if (fs.existsSync(p)) return p;
  }
  // Default to .zshrc — create it if needed
  return path.join(HOME, '.zshrc');
}

function installAliases() {
  if (process.platform === 'win32') {
    warn('Windows detected — skipping bash alias install. Add aliases to your PowerShell $PROFILE manually (see README).');
    return null;
  }

  const rcFile = detectShellRc();
  let content  = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, 'utf8') : '';

  // Remove existing block (replace if present)
  const startIdx = content.indexOf(ALIAS_MARKER_START);
  const endIdx   = content.indexOf(ALIAS_MARKER_END);
  if (startIdx !== -1 && endIdx !== -1) {
    // +1 to also consume the newline after the end marker
    content = content.slice(0, startIdx) + content.slice(endIdx + ALIAS_MARKER_END.length + 1);
  } else if (startIdx !== -1) {
    // Partial/corrupted block — remove from start marker to end of file section
    content = content.slice(0, startIdx);
  }

  content = content.trimEnd() + '\n' + buildAliasBlock();
  fs.writeFileSync(rcFile, content, 'utf8');
  success(`Aliases added → ${rcFile}`);
  return rcFile;
}

// ── 3. Print quick-start ──────────────────────────────────────────────────────
function printQuickStart(rcFile) {
  console.log('');
  console.log(green('  ohmyclaude ready!'));
  console.log('');
  if (rcFile) {
    console.log(`  Reload your shell:`);
    console.log(`    source ${rcFile}`);
    console.log('');
  }
  console.log('  Start Claude in a mode:');
  console.log('    claude-dev        implementation  (@hephaestus + @momus)');
  console.log('    claude-review     code & security (@athena + @argus)');
  console.log('    claude-plan       planning        (@metis → @hermes → @nemesis)');
  console.log('    claude-debug      debugging       (@heracles)');
  console.log('    claude-research   exploration     (@metis + @apollo)');
  console.log('');
  console.log('  Or inside any session:');
  console.log('    /ultrawork <task>   full pipeline, one command');
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
try {
  info('Setting up ohmyclaude...');
  installContexts();
  const rcFile = installAliases();
  printQuickStart(rcFile);
} catch (err) {
  warn(`Setup encountered an error: ${err.message}`);
  warn('Run  bash install.sh  to retry, or add aliases manually (see README).');
  // Non-fatal — don't block npm install
}
