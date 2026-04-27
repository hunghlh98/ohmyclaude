#!/usr/bin/env node
/**
 * test-probe.js
 *
 * Smoke test for scripts/mcp-servers/probe.js. Spawns the MCP server via
 * stdio, sends JSON-RPC frames, and asserts on the responses.
 *
 * Coverage:
 *   - http_probe: 1 happy-path assertion (network-gated; skip if
 *     OHMYCLAUDE_TEST_OFFLINE=1 or fetch fails)
 *   - db_state:   5 assertions
 *       1. not_configured when DSN unset
 *       2. mutation-keyword rejection
 *       3. comment-stripped mutation rejection
 *       4. happy-path SELECT against ephemeral sqlite returns rows
 *       5. row cap honored (truncated: true) for >MAX_DB_ROWS rows
 *
 * Stdlib only — mirrors test-hooks.js style.
 *
 * Usage: node scripts/test-probe.js
 * Exit:  0 = all assertions passed | 1 = at least one failed
 */

'use strict';

const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const { spawnSync, spawn } = require('child_process');

const PROBE_PATH = path.resolve(__dirname, 'mcp-servers/probe.js');

let passed = 0;
let failed = 0;

function ok(label)        { console.log(`  ✓ ${label}`); passed++; }
function fail(label, err) { console.error(`  ✗ ${label}: ${err}`); failed++; }
function assert(label, cond, msg) { if (cond) ok(label); else fail(label, msg); }

// ─── JSON-RPC over stdio: one round-trip helper ──────────────────────────────
// Spawn probe.js, write frames, await the response for `awaitId`, then close
// stdin. Bounded by `maxWaitMs` so a hung server doesn't hang the test.
function rpcCall(frames, awaitId, env = {}, maxWaitMs = 30000) {
  return new Promise((resolve) => {
    const child = spawn('node', [PROBE_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    let stdoutBuf = '';
    let stderrBuf = '';
    const responses = {};
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { child.stdin.end(); } catch (_) {}
      try { child.kill(); } catch (_) {}
      resolve({ responses, stderr: stderrBuf });
    };

    const guard = setTimeout(finish, maxWaitMs);

    child.stdout.on('data', (c) => {
      stdoutBuf += c.toString('utf8');
      let nl;
      while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && msg.id !== null) {
            responses[msg.id] = msg;
            if (msg.id === awaitId) {
              clearTimeout(guard);
              finish();
            }
          }
        } catch (_) {
          stderrBuf += `[parse-fail] ${line}\n`;
        }
      }
    });
    child.stderr.on('data', (c) => { stderrBuf += c.toString('utf8'); });
    child.on('exit', () => { clearTimeout(guard); finish(); });

    for (const f of frames) child.stdin.write(JSON.stringify(f) + '\n');
  });
}

function callDbState(args, env = {}) {
  return rpcCall([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test-probe', version: '0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'db_state', arguments: args } },
  ], 2, env).then(r => r.responses[2]);
}

function callHttpProbe(args, env = {}) {
  return rpcCall([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test-probe', version: '0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'http_probe', arguments: args } },
  ], 2, env).then(r => r.responses[2]);
}

// ─── Ephemeral sqlite fixture ────────────────────────────────────────────────
const tmpDb = path.join(os.tmpdir(), `ohmyclaude-test-probe-${process.pid}.db`);

function setupSqliteFixture() {
  // Clean prior fixture if any.
  try { fs.unlinkSync(tmpDb); } catch (_) {}
  // Schema + 1500 rows so we can test the row cap.
  const seedSql = `
    CREATE TABLE u (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
    INSERT INTO u(id, name, email) VALUES (1, 'alice', 'a@x.com'), (2, 'bob', 'b@x.com');
    WITH RECURSIVE seq(n) AS (SELECT 3 UNION ALL SELECT n+1 FROM seq WHERE n < 1502)
    INSERT INTO u(id, name, email) SELECT n, 'user'||n, 'u'||n||'@x.com' FROM seq;
  `;
  const r = spawnSync('sqlite3', [tmpDb, seedSql], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    throw new Error(`sqlite3 fixture seed failed: ${r.error || r.stderr || r.stdout}`);
  }
}

function teardownSqliteFixture() {
  try { fs.unlinkSync(tmpDb); } catch (_) {}
}

// ─── Tests ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nValidating ohmyclaude-probe MCP server...\n');

  console.log('db_state:');

  // 1. not_configured when DSN unset
  {
    const resp = await callDbState({ query: 'SELECT 1' }, { OHMYCLAUDE_DB_DSN: '' });
    const sc = resp && resp.result && resp.result.structuredContent;
    assert('1. not_configured when DSN unset',
      sc && sc.pass === false && sc.reason === 'not_configured',
      `expected pass=false reason=not_configured, got ${JSON.stringify(sc)}`);
  }

  // 2. mutation-keyword rejection (no DSN needed; rejected before dispatch)
  {
    const resp = await callDbState({ query: 'INSERT INTO u(id) VALUES(99)' });
    const isError = resp && resp.result && resp.result.isError;
    const text = resp && resp.result && resp.result.content && resp.result.content[0] && resp.result.content[0].text || '';
    assert('2. mutation keyword INSERT rejected',
      isError === true && /must start with SELECT|mutation keyword/i.test(text),
      `expected isError=true with mutation message, got isError=${isError} text="${text.slice(0, 120)}"`);
  }

  // 3. comment-stripped mutation rejection. After the parser strips comments
  // from "/* hi */ DROP TABLE u", the remainder is "DROP TABLE u" — which is
  // rejected at the start-prefix gate (must begin with SELECT/WITH/EXPLAIN/...)
  // BEFORE reaching the mutation-keyword gate. Both rejection paths are valid;
  // the assertion accepts either, since both prove comment-stripping worked.
  {
    const resp = await callDbState({ query: '/* hi */ DROP TABLE u' });
    const isError = resp && resp.result && resp.result.isError;
    const text = resp && resp.result && resp.result.content && resp.result.content[0] && resp.result.content[0].text || '';
    assert('3. comment-stripped DROP rejected (start-prefix or mutation-keyword gate)',
      isError === true && /must start with|DROP|mutation/i.test(text),
      `expected isError=true with prefix/DROP/mutation message, got isError=${isError} text="${text.slice(0, 120)}"`);
  }

  // 4. happy-path SELECT against ephemeral sqlite returns rows
  setupSqliteFixture();
  try {
    const resp = await callDbState(
      { query: "SELECT id, name FROM u WHERE name = $1", params: ['alice'], expect: { rows: 1, values: { name: 'alice' } } },
      { OHMYCLAUDE_DB_DSN: `sqlite:///${tmpDb}` });
    const sc = resp && resp.result && resp.result.structuredContent;
    assert('4. happy-path SELECT with $1 substitution',
      sc && sc.pass === true && sc.scheme === 'sqlite' && sc.rowCount === 1,
      `expected pass=true scheme=sqlite rowCount=1, got ${JSON.stringify(sc)}`);

    // 5. row cap honored
    const respAll = await callDbState(
      { query: 'SELECT id FROM u' },
      { OHMYCLAUDE_DB_DSN: `sqlite:///${tmpDb}` });
    const scAll = respAll && respAll.result && respAll.result.structuredContent;
    assert('5. row cap honored (truncated)',
      scAll && scAll.truncated === true && scAll.rowCount === 1000 && scAll.totalRowCount === 1502,
      `expected truncated=true rowCount=1000 totalRowCount=1502, got ${JSON.stringify(scAll)}`);

    // 5b. extended secret redaction — JWT in a column value gets redacted (Bundle D).
    // Insert one row whose `email` column holds a JWT-shaped value, then SELECT it
    // and confirm structuredContent.redactedSecrets > 0 + the response text shows
    // [REDACTED] in place of the JWT.
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghij1234567890';
    const seed = spawnSync('sqlite3', [tmpDb, `INSERT INTO u(id, name, email) VALUES (9999, 'jwtuser', '${fakeJwt}')`], { encoding: 'utf8' });
    if (seed.error || seed.status !== 0) throw new Error(`sqlite3 jwt seed failed: ${seed.stderr || seed.error}`);
    const respJwt = await callDbState(
      { query: "SELECT email FROM u WHERE name = 'jwtuser'" },
      { OHMYCLAUDE_DB_DSN: `sqlite:///${tmpDb}` });
    const scJwt = respJwt && respJwt.result && respJwt.result.structuredContent;
    const txtJwt = respJwt && respJwt.result && respJwt.result.content && respJwt.result.content[0] && respJwt.result.content[0].text || '';
    assert('5b. JWT in column value redacted',
      scJwt && scJwt.redactedSecrets >= 1 && txtJwt.includes('[REDACTED]') && !txtJwt.includes(fakeJwt),
      `expected redactedSecrets≥1 + [REDACTED] in text + JWT absent. Got redactedSecrets=${scJwt && scJwt.redactedSecrets}, JWT-in-text=${txtJwt.includes(fakeJwt)}`);
  } finally {
    teardownSqliteFixture();
  }

  // ─── http_probe (network-gated) ──────────────────────────────────────────
  console.log('\nhttp_probe:');
  if (process.env.OHMYCLAUDE_TEST_OFFLINE === '1') {
    console.log('  - http_probe network test skipped (OHMYCLAUDE_TEST_OFFLINE=1)');
  } else {
    try {
      const resp = await callHttpProbe(
        { url: 'https://httpbin.org/status/200', method: 'GET', expect: { status: 200 } });
      const sc = resp && resp.result && resp.result.structuredContent;
      if (sc && sc.pass === true && sc.status === 200) {
        ok('6. http_probe GET httpbin.org/status/200 → 200');
      } else if (resp && resp.result && resp.result.isError) {
        // Network unreachable in CI etc. — non-fatal advisory, not an assertion failure.
        console.log(`  - http_probe network unreachable; skipping (set OHMYCLAUDE_TEST_OFFLINE=1 to silence): ${resp.result.content[0].text.slice(0, 120)}`);
      } else {
        fail('6. http_probe GET httpbin.org/status/200 → 200',
          `expected pass=true status=200, got ${JSON.stringify(sc)}`);
      }
    } catch (e) {
      console.log(`  - http_probe network test failed transport-level (skipping): ${e.message}`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('');
  if (failed === 0) {
    console.log(`✓ All ${passed} probe assertion(s) hold.\n`);
    process.exit(0);
  } else {
    console.error(`✗ ${failed}/${passed + failed} probe assertion(s) failed.\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('test-probe.js crashed:', e);
  teardownSqliteFixture();
  process.exit(1);
});
