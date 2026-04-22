#!/usr/bin/env node
/**
 * test-hooks.js
 *
 * Smoke test suite for every hook script under hooks/scripts/. For each,
 * asserts the runtime contract declared in hooks/hooks.json and
 * docs/OPERATING.md:
 *
 *   - exit code ∈ {0, 2} — only pre-write-check.js may emit 2 (block)
 *   - stdout pass-through is byte-identical for non-blocking hooks
 *   - no crash on empty / malformed stdin
 *   - side effects (file writes) happen in sandboxed dirs, not the real
 *     user home
 *
 * Hermeticity strategy: every child spawn runs with HOME set to a fresh
 * temp dir, so any `os.homedir()` write (session-summary, team-cleanup)
 * lands in the sandbox. Hooks that write to cwd (backlog-tracker,
 * cost-profiler) are sandboxed via spawn.cwd. No production hook code
 * is modified by this harness.
 *
 * Zero dependencies — same convention as test-sc-fallback.js.
 *
 * Exit 0 = all contracts hold. Exit 1 = at least one violation.
 */

'use strict';

const fs           = require('fs');
const os           = require('os');
const path         = require('path');
const { spawnSync } = require('child_process');

const root       = path.resolve(__dirname, '..');
const hooksDir   = path.join(root, 'hooks', 'scripts');

let pass = 0;
let fail = 0;
const failures = [];

function makeSandbox() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ohmyclaude-hooktest-'));
  // Seed the expected sub-tree so hooks that mkdirSync recursive succeed.
  // We do NOT pre-create ~/.claude — absence-as-graceful-no-op is part of
  // the contract and should be exercised.
  return d;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

/**
 * Spawn a hook script with a hermetic environment.
 * @param {string} script     Basename under hooks/scripts/.
 * @param {string} stdinText  Payload to write to stdin (raw bytes).
 * @param {object} [opts]
 * @param {string} [opts.cwd]            Override child cwd (default sandbox).
 * @param {object} [opts.extraEnv]       Merged into child env.
 * @param {string} [opts.sandbox]        Reuse an existing sandbox dir.
 * @returns {{ code:number|null, stdout:string, stderr:string, sandbox:string }}
 */
function runHook(script, stdinText, opts = {}) {
  const sandbox = opts.sandbox || makeSandbox();
  const env = {
    ...process.env,
    HOME:           sandbox,
    USERPROFILE:    sandbox,                            // windows parity
    CLAUDE_PROJECT_ROOT: opts.cwd || sandbox,
    ...(opts.extraEnv || {}),
  };

  const result = spawnSync(process.execPath, [path.join(hooksDir, script)], {
    input:    stdinText,
    cwd:      opts.cwd || sandbox,
    env,
    encoding: 'utf8',
    timeout:  15000,
  });

  return {
    code:   result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    sandbox,
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`      ${e.message}`);
    failures.push({ name, message: e.message });
    fail++;
  }
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: expected to include ${JSON.stringify(needle)}; got ${JSON.stringify(haystack.slice(0, 200))}`);
  }
}

function assertExists(p, label) {
  if (!fs.existsSync(p)) throw new Error(`${label}: expected path to exist: ${p}`);
}

function assertAbsent(p, label) {
  if (fs.existsSync(p)) throw new Error(`${label}: expected path to NOT exist (test not hermetic?): ${p}`);
}

console.log('\nValidating hook runtime contracts...\n');

// ── pre-write-check.js (PreToolUse, BLOCKING) ───────────────────────────────
console.log('pre-write-check.js — blocking on secrets:');

test('blocks AWS access key', () => {
  const input = JSON.stringify({
    tool_input: { content: "const KEY = 'AKIAIOSFODNN7EXAMPLE';" }
  });
  const r = runHook('pre-write-check.js', input);
  assertEq(r.code, 2, 'exit code');
  assertIncludes(r.stderr, 'BLOCKED', 'stderr');
  cleanup(r.sandbox);
});

test('allows env-var style reference', () => {
  const input = JSON.stringify({
    tool_input: { content: "const KEY = process.env.API_KEY;" }
  });
  const r = runHook('pre-write-check.js', input);
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, input, 'passthrough');
  cleanup(r.sandbox);
});

test('allows ${ENV_VAR} placeholder form', () => {
  const input = JSON.stringify({
    tool_input: { content: "password: ${DB_PASSWORD}" }
  });
  const r = runHook('pre-write-check.js', input);
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

test('passes through on malformed stdin JSON', () => {
  const input = 'not-json-at-all';
  const r = runHook('pre-write-check.js', input);
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, input, 'passthrough');
  cleanup(r.sandbox);
});

test('passes through on empty stdin', () => {
  const r = runHook('pre-write-check.js', '');
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

test('blocks GitHub personal access token', () => {
  const input = JSON.stringify({
    tool_input: { content: "const tok = 'ghp_" + "wWPw5k4aXcaT4fNP0UcnZwJUVFk6LO0pINUx';" }
  });
  const r = runHook('pre-write-check.js', input);
  assertEq(r.code, 2, 'exit code');
  cleanup(r.sandbox);
});

// ── post-bash-lint.js (PostToolUse async) ───────────────────────────────────
console.log('\npost-bash-lint.js — advisory linter:');

test('skips read-only commands (ls) with exit 0', () => {
  const input = JSON.stringify({ tool_input: { command: 'ls -la' } });
  const r = runHook('post-bash-lint.js', input);
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, input, 'passthrough');
  cleanup(r.sandbox);
});

test('skips when no package.json exists', () => {
  // sandbox has no package.json, so even a "source-modifying" command should no-op
  const input = JSON.stringify({ tool_input: { command: 'npm install lodash' } });
  const r = runHook('post-bash-lint.js', input);
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

test('passes through on malformed stdin', () => {
  const r = runHook('post-bash-lint.js', '{broken');
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, '{broken', 'passthrough');
  cleanup(r.sandbox);
});

// ── backlog-tracker.js (PostToolUse Write, async) ───────────────────────────
console.log('\nbacklog-tracker.js — BACKLOG.md rebuilder:');

test('exits 0 when write path is not in backlog dir', () => {
  const input = JSON.stringify({
    tool_input: { file_path: '/tmp/somewhere-else.md', content: '# x' }
  });
  const r = runHook('backlog-tracker.js', input);
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

test('exits 0 on missing stdin', () => {
  const r = runHook('backlog-tracker.js', '');
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

test('rebuilds BACKLOG.md when triggered from backlog dir', () => {
  const sandbox = makeSandbox();
  // Seed a .git so findRepoRoot stops at sandbox
  fs.mkdirSync(path.join(sandbox, '.git'), { recursive: true });
  // Seed one ISS-*.md
  const issuesDir = path.join(sandbox, '.claude', 'backlog', 'issues');
  fs.mkdirSync(issuesDir, { recursive: true });
  const issuePath = path.join(issuesDir, 'ISS-001.md');
  fs.writeFileSync(issuePath,
    '---\nid: ISS-001\npriority: P1\ntype: bug\nroute: D\nstatus: backlog\n---\n\n## Fix the thing\n');

  const input = JSON.stringify({
    tool_input: { file_path: issuePath, content: '' }
  });
  const r = runHook('backlog-tracker.js', input, { cwd: sandbox, sandbox });
  assertEq(r.code, 0, 'exit code');
  assertExists(path.join(sandbox, 'BACKLOG.md'), 'BACKLOG.md written');
  const backlog = fs.readFileSync(path.join(sandbox, 'BACKLOG.md'), 'utf8');
  assertIncludes(backlog, 'ISS-001', 'backlog contains issue id');
  assertIncludes(backlog, 'Fix the thing', 'backlog contains title');
  cleanup(sandbox);
});

// ── graph-update.js (PostToolUse, async; silent no-op without backend) ──────
console.log('\ngraph-update.js — graph sync (silent when absent):');

test('exits 0 and passes through when no graph backend is installed', () => {
  // PATH=/tmp means `which codegraph` and `which code-review-graph` both fail
  const input = JSON.stringify({ tool_input: { file_path: 'x.js' } });
  const r = runHook('graph-update.js', input, { extraEnv: { PATH: '/tmp' } });
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, input, 'passthrough');
  cleanup(r.sandbox);
});

test('exits 0 on empty stdin', () => {
  const r = runHook('graph-update.js', '', { extraEnv: { PATH: '/tmp' } });
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

// ── session-summary.js (Stop, async; writes to sandbox via HOME override) ──
console.log('\nsession-summary.js — per-response JSONL log:');

test('appends one JSONL line to sandboxed HOME/.claude/ohmyclaude/sessions/', () => {
  const input = JSON.stringify({
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 123, output_tokens: 45 },
    last_assistant_message: 'ok',
  });
  const r = runHook('session-summary.js', input);
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, input, 'passthrough');
  const today = new Date().toISOString().slice(0, 10);
  const logFile = path.join(r.sandbox, '.claude', 'ohmyclaude', 'sessions', `${today}.jsonl`);
  assertExists(logFile, 'JSONL file written');
  const line = fs.readFileSync(logFile, 'utf8').trim();
  const parsed = JSON.parse(line);
  assertEq(parsed.input_tokens, 123, 'recorded input_tokens');
  // Hermeticity check — real $HOME must not be touched
  assertAbsent(path.join(os.homedir(), '.claude', 'ohmyclaude', 'sessions', 'sandbox-leak.jsonl'),
    'no leak to real HOME');
  cleanup(r.sandbox);
});

test('exits 0 on malformed stdin without writing', () => {
  const r = runHook('session-summary.js', 'garbage');
  assertEq(r.code, 0, 'exit code');
  // Should not have created any sessions dir
  assertAbsent(path.join(r.sandbox, '.claude', 'ohmyclaude', 'sessions'), 'no dir on malformed');
  cleanup(r.sandbox);
});

// ── team-cleanup.js (Stop, async; GC for orphaned teams) ────────────────────
console.log('\nteam-cleanup.js — orphan team GC:');

test('exits 0 when sandboxed HOME has no teams dir', () => {
  const r = runHook('team-cleanup.js', '');
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, '', 'passthrough (empty)');
  cleanup(r.sandbox);
});

test('deletes an orphan team dir >24h old', () => {
  const sandbox = makeSandbox();
  const teamsDir = path.join(sandbox, '.claude', 'teams');
  const orphan   = path.join(teamsDir, 'abandoned-team-xyz');
  fs.mkdirSync(orphan, { recursive: true });
  // Backdate the dir's mtime to 48h ago
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  fs.utimesSync(orphan, twoDaysAgo / 1000, twoDaysAgo / 1000);

  const r = runHook('team-cleanup.js', '', { sandbox });
  assertEq(r.code, 0, 'exit code');
  assertAbsent(orphan, 'orphan deleted');
  cleanup(sandbox);
});

test('leaves a fresh team dir alone', () => {
  const sandbox = makeSandbox();
  const teamsDir = path.join(sandbox, '.claude', 'teams');
  const fresh    = path.join(teamsDir, 'active-team-abc');
  fs.mkdirSync(fresh, { recursive: true });
  // mtime is now — within the 24h window

  const r = runHook('team-cleanup.js', '', { sandbox });
  assertEq(r.code, 0, 'exit code');
  assertExists(fresh, 'fresh team preserved');
  cleanup(sandbox);
});

// ── cost-profiler.js (SubagentStop + Stop) ──────────────────────────────────
console.log('\ncost-profiler.js — /forge cost telemetry:');

test('SubagentStop with empty transcript exits 0 silently', () => {
  const sandbox = makeSandbox();
  const evt = {
    hook_event_name: 'SubagentStop',
    session_id: 'testrun-123',
    cwd: sandbox,
    transcript_path: path.join(sandbox, 'does-not-exist.jsonl'),
    subagent_type: 'paige-product',
  };
  const r = runHook('cost-profiler.js', JSON.stringify(evt), { sandbox });
  assertEq(r.code, 0, 'exit code');
  cleanup(sandbox);
});

test('Stop with no prior snapshots is a no-op', () => {
  const sandbox = makeSandbox();
  const evt = {
    hook_event_name: 'Stop',
    session_id: 'testrun-none',
    cwd: sandbox,
    transcript_path: path.join(sandbox, 'missing.jsonl'),
  };
  const r = runHook('cost-profiler.js', JSON.stringify(evt), { sandbox });
  assertEq(r.code, 0, 'exit code');
  // No PROFILE should be written when there are no snapshots
  assertAbsent(path.join(sandbox, '.claude', 'pipeline', 'PROFILE-testrun-none.md'),
    'no PROFILE without snapshots');
  cleanup(sandbox);
});

test('Stop with a seeded snapshot writes PROFILE-<runId>.md', () => {
  const sandbox = makeSandbox();
  const runId = 'testrun-profile';
  // Seed one snapshot matching the shape cost-profiler writes on SubagentStop
  const snapDir = path.join(sandbox, '.claude', 'metrics', 'runs', runId);
  fs.mkdirSync(snapDir, { recursive: true });
  fs.writeFileSync(path.join(snapDir, 'snap-1000.json'), JSON.stringify({
    ts: 1000,
    agent: 'paige-product',
    cumulative: { in: 1200, out: 340, cacheR: 800, cacheW: 100, usd: 0.0042, turns: 3, model: 'claude-sonnet-4-6' },
  }));
  // Seed a minimal transcript so inferScenario has something to read
  const transcriptPath = path.join(sandbox, 'transcript.jsonl');
  fs.writeFileSync(transcriptPath, '');

  const evt = {
    hook_event_name: 'Stop',
    session_id: runId,
    cwd: sandbox,
    transcript_path: transcriptPath,
  };
  const r = runHook('cost-profiler.js', JSON.stringify(evt), { sandbox });
  assertEq(r.code, 0, 'exit code');
  assertExists(path.join(sandbox, '.claude', 'pipeline', `PROFILE-${runId}.md`),
    'PROFILE artifact written');
  assertExists(path.join(sandbox, '.claude', 'metrics', 'baseline.json'),
    'baseline.json updated');
  cleanup(sandbox);
});

test('non-Stop / non-SubagentStop event exits 0 without writing', () => {
  const sandbox = makeSandbox();
  const evt = { hook_event_name: 'PreToolUse', session_id: 'x' };
  const r = runHook('cost-profiler.js', JSON.stringify(evt), { sandbox });
  assertEq(r.code, 0, 'exit code');
  cleanup(sandbox);
});

test('malformed stdin exits 0', () => {
  const r = runHook('cost-profiler.js', 'not-json');
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

// ── session-load.js (SessionStart; hint on saved sessions) ─────────────────
console.log('\nsession-load.js — saved-session hint on startup:');

test('exits 0 silently when sessions dir does not exist', () => {
  const input = JSON.stringify({
    hook_event_name: 'SessionStart',
    source: 'startup',
    cwd: '/tmp/anywhere',
  });
  const r = runHook('session-load.js', input);
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stdout, input, 'passthrough');
  assertEq(r.stderr, '', 'no hint when no sessions');
  cleanup(r.sandbox);
});

test('skips hint when source is "resume" (not startup)', () => {
  const sandbox = makeSandbox();
  const sessRoot = path.join(sandbox, '.claude', 'ohmyclaude', 'sessions');
  fs.mkdirSync(sessRoot, { recursive: true });
  // Even if an index exists, resume should not emit a hint
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update('/tmp/proj').digest('hex').slice(0, 16);
  fs.writeFileSync(path.join(sessRoot, '_index.json'), JSON.stringify({ [hash]: 'sid1' }));
  const sidDir = path.join(sessRoot, 'sid1');
  fs.mkdirSync(sidDir, { recursive: true });
  fs.writeFileSync(path.join(sidDir, 'meta.json'),
    JSON.stringify({ last_touch_ts: new Date().toISOString() }));

  const input = JSON.stringify({
    hook_event_name: 'SessionStart',
    source: 'resume',
    cwd: '/tmp/proj',
  });
  const r = runHook('session-load.js', input, { sandbox });
  assertEq(r.code, 0, 'exit code');
  assertEq(r.stderr, '', 'no hint on resume');
  cleanup(sandbox);
});

test('emits hint on startup when saved session exists for cwd', () => {
  const sandbox = makeSandbox();
  const sessRoot = path.join(sandbox, '.claude', 'ohmyclaude', 'sessions');
  fs.mkdirSync(sessRoot, { recursive: true });
  const crypto = require('crypto');
  const targetCwd = '/tmp/proj-with-saved';
  const hash = crypto.createHash('sha256').update(targetCwd).digest('hex').slice(0, 16);
  fs.writeFileSync(path.join(sessRoot, '_index.json'), JSON.stringify({ [hash]: 'sidA' }));
  const sidDir = path.join(sessRoot, 'sidA');
  fs.mkdirSync(sidDir, { recursive: true });
  fs.writeFileSync(path.join(sidDir, 'meta.json'),
    JSON.stringify({ last_touch_ts: new Date().toISOString() }));

  const input = JSON.stringify({
    hook_event_name: 'SessionStart',
    source: 'startup',
    cwd: targetCwd,
  });
  const r = runHook('session-load.js', input, { sandbox });
  assertEq(r.code, 0, 'exit code');
  assertIncludes(r.stderr, 'Saved session available', 'hint stderr');
  assertIncludes(r.stderr, '/load', 'mentions /load');
  cleanup(sandbox);
});

test('exits 0 on malformed stdin', () => {
  const r = runHook('session-load.js', 'garbage');
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

// ── state-snapshot.js (PreCompact; update stages.json) ──────────────────────
console.log('\nstate-snapshot.js — pipeline cursor on PreCompact:');

test('exits 0 silently when no saved session exists for cwd', () => {
  const input = JSON.stringify({
    hook_event_name: 'PreCompact',
    cwd: '/tmp/unsaved',
  });
  const r = runHook('state-snapshot.js', input);
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

test('updates stages.json when session exists', () => {
  const sandbox = makeSandbox();
  const sessRoot = path.join(sandbox, '.claude', 'ohmyclaude', 'sessions');
  fs.mkdirSync(sessRoot, { recursive: true });
  const crypto = require('crypto');
  const cwd = sandbox;                      // snapshot uses evt.cwd for pipeline scan
  const hash = crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 16);
  fs.writeFileSync(path.join(sessRoot, '_index.json'), JSON.stringify({ [hash]: 'sidB' }));
  const sidDir = path.join(sessRoot, 'sidB');
  fs.mkdirSync(sidDir, { recursive: true });
  fs.writeFileSync(path.join(sidDir, 'meta.json'),
    JSON.stringify({ session_id: 'sidB', start_ts: '2026-01-01T00:00:00Z', last_touch_ts: '2026-01-01T00:00:00Z' }));
  // Seed a pipeline artifact
  const pipelineDir = path.join(cwd, '.claude', 'pipeline');
  fs.mkdirSync(pipelineDir, { recursive: true });
  fs.writeFileSync(path.join(pipelineDir, 'PRD-001.md'), '# PRD-001\n');

  const input = JSON.stringify({ hook_event_name: 'PreCompact', cwd });
  const r = runHook('state-snapshot.js', input, { sandbox, cwd });
  assertEq(r.code, 0, 'exit code');
  const stagesPath = path.join(sidDir, 'stages.json');
  assertExists(stagesPath, 'stages.json written');
  const stages = JSON.parse(fs.readFileSync(stagesPath, 'utf8'));
  if (!Array.isArray(stages.artifacts) || stages.artifacts.length !== 1) {
    throw new Error(`expected 1 artifact, got ${JSON.stringify(stages.artifacts)}`);
  }
  assertEq(stages.artifacts[0].artifact, 'PRD-001', 'artifact name');
  // meta should be touched
  const meta = JSON.parse(fs.readFileSync(path.join(sidDir, 'meta.json'), 'utf8'));
  assertEq(meta.last_event, 'PreCompact', 'meta.last_event bumped');
  cleanup(sandbox);
});

test('exits 0 on malformed stdin', () => {
  const r = runHook('state-snapshot.js', 'not-json');
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

// ── subagent-trace.js (SubagentStart; telemetry) ────────────────────────────
console.log('\nsubagent-trace.js — subagent telemetry:');

test('exits 0 silently when no saved session exists for cwd', () => {
  const input = JSON.stringify({
    hook_event_name: 'SubagentStart',
    cwd: '/tmp/unsaved-x',
    agent_type: 'paige-product',
  });
  const r = runHook('subagent-trace.js', input);
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

test('appends one line to traces.jsonl when session exists', () => {
  const sandbox = makeSandbox();
  const sessRoot = path.join(sandbox, '.claude', 'ohmyclaude', 'sessions');
  fs.mkdirSync(sessRoot, { recursive: true });
  const crypto = require('crypto');
  const cwd = '/tmp/proj-trace';
  const hash = crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 16);
  fs.writeFileSync(path.join(sessRoot, '_index.json'), JSON.stringify({ [hash]: 'sidC' }));
  const sidDir = path.join(sessRoot, 'sidC');
  fs.mkdirSync(sidDir, { recursive: true });

  const input = JSON.stringify({
    hook_event_name: 'SubagentStart',
    session_id: 'sidC',
    cwd,
    agent_type: 'beck-backend',
  });
  const r = runHook('subagent-trace.js', input, { sandbox });
  assertEq(r.code, 0, 'exit code');
  const tracesPath = path.join(sidDir, 'traces.jsonl');
  assertExists(tracesPath, 'traces.jsonl written');
  const lines = fs.readFileSync(tracesPath, 'utf8').trim().split('\n');
  assertEq(lines.length, 1, 'one line appended');
  const rec = JSON.parse(lines[0]);
  assertEq(rec.agent_type, 'beck-backend', 'agent_type recorded');
  assertEq(rec.event, 'SubagentStart', 'event recorded');
  cleanup(sandbox);
});

test('exits 0 on malformed stdin', () => {
  const r = runHook('subagent-trace.js', '{unclosed');
  assertEq(r.code, 0, 'exit code');
  cleanup(r.sandbox);
});

// ── dry-run.js (utility, not a hook — still asserted for v1.2.0 contract) ──
console.log('\ndry-run.js — /forge --dry-run classifier:');

test('usage error when called with no args', () => {
  const result = spawnSync(process.execPath, [path.join(hooksDir, 'dry-run.js')], {
    encoding: 'utf8', timeout: 10000, input: '',
  });
  assertEq(result.status, 1, 'exit code');
});

test('classifies a simple feature request and exits 0', () => {
  const result = spawnSync(process.execPath,
    [path.join(hooksDir, 'dry-run.js'), 'add a login form'],
    { encoding: 'utf8', timeout: 10000, cwd: root });
  assertEq(result.status, 0, 'exit code');
  assertIncludes(result.stdout, 'agents', 'reports agent route');
});

test('--json flag produces parseable JSON', () => {
  const result = spawnSync(process.execPath,
    [path.join(hooksDir, 'dry-run.js'), '--json', 'fix the bug'],
    { encoding: 'utf8', timeout: 10000, cwd: root });
  assertEq(result.status, 0, 'exit code');
  const parsed = JSON.parse(result.stdout);
  if (typeof parsed !== 'object' || !parsed) {
    throw new Error('JSON output is not an object');
  }
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('');
const total = pass + fail;
if (fail === 0) {
  console.log(`✓ All ${total} hook contract(s) hold.\n`);
  process.exit(0);
} else {
  console.error(`✗ ${fail} of ${total} checks failed.\n`);
  for (const f of failures) {
    console.error(`  - ${f.name}: ${f.message}`);
  }
  console.error('');
  process.exit(1);
}
