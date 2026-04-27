#!/usr/bin/env node
/**
 * ohmyclaude-probe — minimal stdio MCP server exposing runtime probes
 *                    for @val-evaluator (sprint contract grading).
 *
 * Tools:
 *   - http_probe   Make an HTTP/HTTPS request and assert on status / JSON-path /
 *                  header values. Used by Val to grade weighted criteria from
 *                  CONTRACT-<id>.md against running implementations.
 *   - db_state     Run a SELECT-only query against the project database via the
 *                  CLI named by OHMYCLAUDE_DB_DSN (sqlite3/psql/mysql). Validates
 *                  the query against a mutation-keyword denylist before AND after
 *                  $N parameter substitution; spawn-time timeout, row cap, and
 *                  output redaction for known secret patterns. Falls back to a
 *                  structured "not_configured" response when DSN is unset.
 *
 * Design notes:
 *   - Stdlib-only Node — uses `http`, `https`, `url`, `readline`. No `fetch`
 *     dependency (Node 16 compatible if present in the wild).
 *   - Mirrors the JSON-RPC plumbing in `fs.js` exactly. Initialize, tools/list,
 *     tools/call, ping. Notifications accepted, unknown methods → -32601.
 *   - Stdout reserved for JSON-RPC. All diagnostics → stderr.
 *
 * Protocol: MCP 2024-11-05 / 2025-03-26 compatible.
 */

'use strict';

const http              = require('http');
const https             = require('https');
const { URL }           = require('url');
const readline          = require('readline');
const { spawnSync }     = require('child_process');

const SERVER_NAME      = 'ohmyclaude-probe';
const SERVER_VERSION   = '0.2.0';
const PROTOCOL_VERSION = '2024-11-05';
const DEFAULT_TIMEOUT_MS    = 10000;
const MAX_BODY_BYTES        = 8 * 1024 * 1024;  // 8 MiB ceiling on response bodies
const DEFAULT_DB_TIMEOUT_MS = parseInt(process.env.OHMYCLAUDE_DB_TIMEOUT_MS || '5000', 10);
const MAX_DB_ROWS           = parseInt(process.env.OHMYCLAUDE_DB_MAX_ROWS  || '1000', 10);

// Mutation keywords blocked at the SQL parser level for db_state. Case-insensitive,
// word-boundary match. Comments before keywords are stripped first.
const MUTATION_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
  'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'REPLACE',
  'MERGE', 'CALL', 'EXEC', 'EXECUTE', 'COMMIT',
  'ROLLBACK', 'SAVEPOINT', 'LOCK',
];

// Patterns redacted from db_state stdout/stderr before returning to Val. Defensive
// — a SELECT could legitimately surface a secret stored in user data.
const DB_OUTPUT_REDACT_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,                                                         // AWS access key id
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  /ghp_[A-Za-z0-9]{36}/g,                                                      // GitHub classic PAT
  /github_pat_[A-Za-z0-9_]{82}/g,                                              // GitHub fine-grained PAT
  /sk-[A-Za-z0-9]{20,}/g,                                                      // OpenAI-style secret key
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,                                             // Slack tokens (xoxa/xoxb/xoxp/xoxr/xoxs)
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,            // JWT (header.payload.signature)
  /(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/gi,                              // Authorization header values
  /AIza[0-9A-Za-z_-]{35}/g,                                                    // Google API key
];

// ─── JSON-RPC plumbing ──────────────────────────────────────────────────────

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function respondError(id, code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  send({ jsonrpc: '2.0', id, error: err });
}

// ─── Tool: http_probe ───────────────────────────────────────────────────────

function makeRequest({ method, urlString, headers, body, timeoutMs }) {
  return new Promise((resolve) => {
    let target;
    try {
      target = new URL(urlString);
    } catch (e) {
      return resolve({ ok: false, error: `invalid url: ${urlString} (${e.message})` });
    }
    const lib = target.protocol === 'https:' ? https : http;

    const opts = {
      method,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + (target.search || ''),
      headers: { ...(headers || {}) },
      timeout: timeoutMs,
    };

    let bodyBuf;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        bodyBuf = Buffer.from(body, 'utf8');
      } else if (Buffer.isBuffer(body)) {
        bodyBuf = body;
      } else {
        bodyBuf = Buffer.from(JSON.stringify(body), 'utf8');
        if (!opts.headers['Content-Type'] && !opts.headers['content-type']) {
          opts.headers['Content-Type'] = 'application/json';
        }
      }
      opts.headers['Content-Length'] = bodyBuf.length;
    }

    const startMs = Date.now();
    const req = lib.request(opts, (res) => {
      let totalLen = 0;
      const chunks = [];
      res.on('data', (chunk) => {
        totalLen += chunk.length;
        if (totalLen > MAX_BODY_BYTES) {
          req.destroy(new Error(`response body exceeded ${MAX_BODY_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        const elapsedMs = Date.now() - startMs;
        const buf = Buffer.concat(chunks);
        let json;
        try {
          json = JSON.parse(buf.toString('utf8'));
        } catch {
          json = null;  // not JSON; assertions will see undefined
        }
        resolve({
          ok: true,
          status: res.statusCode,
          headers: lowercaseHeaders(res.headers),
          bodyText: buf.toString('utf8'),
          bodyJson: json,
          elapsedMs,
        });
      });
    });

    req.on('error', (e) => {
      resolve({ ok: false, error: `request failed: ${e.message}`, elapsedMs: Date.now() - startMs });
    });
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });

    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

function lowercaseHeaders(h) {
  const out = {};
  for (const k of Object.keys(h || {})) out[k.toLowerCase()] = h[k];
  return out;
}

function getJsonPath(obj, dottedPath) {
  // Simple dotted path with [N] for arrays, e.g. "results[0].id" or "$.id"
  if (obj === null || obj === undefined) return undefined;
  let cur = obj;
  let p = dottedPath.replace(/^\$\.?/, '');  // strip leading "$." or "$"
  if (p === '') return cur;
  // tokenize on . and [N]
  const parts = p.split(/\.|\[(\d+)\]/).filter(Boolean);
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (/^\d+$/.test(part)) cur = cur[Number(part)];
    else cur = cur[part];
  }
  return cur;
}

function assertValue(observed, spec) {
  // spec is either a literal (===) or {matches: regex} or {contains: substring}
  if (spec === null || typeof spec !== 'object') {
    return { pass: observed === spec, expected: spec };
  }
  if (spec.matches !== undefined) {
    if (typeof observed !== 'string') {
      return { pass: false, expected: `match /${spec.matches}/`, observed };
    }
    try {
      const re = new RegExp(spec.matches);
      return { pass: re.test(observed), expected: `match /${spec.matches}/`, observed };
    } catch (e) {
      return { pass: false, expected: `match /${spec.matches}/`, observed, error: e.message };
    }
  }
  if (spec.contains !== undefined) {
    if (typeof observed !== 'string') {
      return { pass: false, expected: `contains "${spec.contains}"`, observed };
    }
    return { pass: observed.includes(spec.contains), expected: `contains "${spec.contains}"`, observed };
  }
  if (spec.notNull !== undefined && spec.notNull) {
    return { pass: observed !== null && observed !== undefined, expected: 'not null', observed };
  }
  return { pass: false, expected: spec, observed, error: 'unrecognized assertion spec' };
}

function evaluateExpectations(response, expect) {
  const results = [];
  let pass = true;

  if (expect.status !== undefined) {
    const ok = response.status === expect.status;
    if (!ok) pass = false;
    results.push({ kind: 'status', expected: expect.status, observed: response.status, pass: ok });
  }
  if (expect.json && typeof expect.json === 'object') {
    for (const [pathKey, valSpec] of Object.entries(expect.json)) {
      const observed = getJsonPath(response.bodyJson, pathKey);
      const r = assertValue(observed, valSpec);
      if (!r.pass) pass = false;
      results.push({ kind: 'json', path: pathKey, expected: r.expected, observed, pass: r.pass, error: r.error });
    }
  }
  if (expect.headers && typeof expect.headers === 'object') {
    for (const [hdrKey, valSpec] of Object.entries(expect.headers)) {
      const observed = response.headers[hdrKey.toLowerCase()];
      const r = assertValue(observed, valSpec);
      if (!r.pass) pass = false;
      results.push({ kind: 'header', name: hdrKey.toLowerCase(), expected: r.expected, observed, pass: r.pass, error: r.error });
    }
  }
  return { pass, results };
}

async function callHttpProbe(args) {
  if (!args || typeof args !== 'object') {
    return { isError: true, content: [{ type: 'text', text: 'http_probe requires args.url and args.method' }] };
  }
  const method = String(args.method || 'GET').toUpperCase();
  const baseUrl = args.baseUrl ? String(args.baseUrl) : '';
  const path = String(args.url || '');
  const urlString = /^https?:\/\//i.test(path) ? path : (baseUrl + path);
  if (!urlString) {
    return { isError: true, content: [{ type: 'text', text: 'http_probe: missing url (or baseUrl + path)' }] };
  }
  const headers = (args.headers && typeof args.headers === 'object') ? args.headers : {};
  const body = args.body;  // undefined for GET; object/string/buffer for POST etc.
  const timeoutMs = Number.isInteger(args.timeoutMs) && args.timeoutMs > 0
    ? Math.min(args.timeoutMs, 60000) : DEFAULT_TIMEOUT_MS;
  const expect = (args.expect && typeof args.expect === 'object') ? args.expect : {};

  const response = await makeRequest({ method, urlString, headers, body, timeoutMs });
  if (!response.ok) {
    return {
      isError: true,
      content: [{ type: 'text', text: `[ohmyclaude-probe http_probe] ${response.error}` }],
    };
  }
  const verdict = evaluateExpectations(response, expect);

  const summaryLine = `${verdict.pass ? 'PASS' : 'FAIL'} · ${method} ${urlString} → ${response.status} (${response.elapsedMs}ms)`;
  const lines = [summaryLine, ''];
  for (const r of verdict.results) {
    const tag = r.pass ? '  ✓' : '  ✗';
    if (r.kind === 'status') {
      lines.push(`${tag} status: expected ${r.expected}, observed ${r.observed}`);
    } else if (r.kind === 'json') {
      lines.push(`${tag} json[${r.path}]: expected ${JSON.stringify(r.expected)}, observed ${JSON.stringify(r.observed)}`);
    } else if (r.kind === 'header') {
      lines.push(`${tag} header[${r.name}]: expected ${JSON.stringify(r.expected)}, observed ${JSON.stringify(r.observed)}`);
    }
    if (r.error) lines.push(`      error: ${r.error}`);
  }
  if (verdict.results.length === 0) {
    lines.push('  (no assertions specified — observed response only)');
  }

  // Append a compact response body preview (truncated) for forensic context
  const preview = (response.bodyText || '').slice(0, 1024);
  lines.push('');
  lines.push(`[response body preview, first 1024 bytes]`);
  lines.push(preview);

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
    structuredContent: {
      pass: verdict.pass,
      method,
      url: urlString,
      status: response.status,
      elapsedMs: response.elapsedMs,
      assertions: verdict.results,
    },
  };
}

// ─── Tool: db_state (DSN-dispatch backend, v0.2.0+) ─────────────────────────

function isSafeSelect(query) {
  // Strip line and block comments before scanning for mutation keywords
  const stripped = query
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  const upper = stripped.toUpperCase();

  // Must START with SELECT or WITH (CTE that ends in SELECT). Allow leading whitespace and parens.
  const startMatch = upper.replace(/^\s*\(*\s*/, '').match(/^(SELECT|WITH|EXPLAIN|SHOW|DESCRIBE|DESC|PRAGMA)\b/);
  if (!startMatch) {
    return { ok: false, reason: 'query must start with SELECT, WITH, EXPLAIN, SHOW, DESCRIBE, or PRAGMA' };
  }
  for (const kw of MUTATION_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b`);
    if (re.test(upper)) {
      return { ok: false, reason: `mutation keyword '${kw}' detected — db_state allows read-only queries only` };
    }
  }
  return { ok: true };
}

// DSN parser — tolerates the small surface we support intentionally.
// Supported forms:
//   sqlite:///abs/path/to.db        (third slash → empty host → absolute path)
//   sqlite:///./relative.db         (relative path; the leading "/./" is benign)
//   postgres://user:pass@host:port/dbname
//   postgresql://user:pass@host:port/dbname
//   mysql://user:pass@host:port/dbname
//   mariadb://user:pass@host:port/dbname
function parseDsn(dsn) {
  const m = dsn.match(/^([a-zA-Z][a-zA-Z0-9+]*):\/\/(.*)$/);
  if (!m) return { ok: false, reason: 'DSN missing scheme://' };
  const scheme = m[1].toLowerCase();
  const rest   = m[2];

  if (scheme === 'sqlite' || scheme === 'sqlite3') {
    if (!rest.startsWith('/')) {
      return { ok: false, reason: 'sqlite DSN requires sqlite:///<path> form (note the third slash)' };
    }
    // Strip a single leading slash if the next char is not / and not ./, so that
    // sqlite:///tmp/x.db → "/tmp/x.db" (absolute) and sqlite:///./relative.db
    // → "./relative.db" (relative).
    const path = rest.startsWith('/./') ? rest.slice(1) : rest;
    return { ok: true, scheme: 'sqlite', path };
  }

  if (scheme === 'postgres' || scheme === 'postgresql') {
    return { ok: true, scheme: 'postgres', dsn };
  }

  if (scheme === 'mysql' || scheme === 'mariadb') {
    try {
      const u = new URL(dsn);
      return {
        ok:   true,
        scheme: 'mysql',
        host: u.hostname || '127.0.0.1',
        port: u.port     || '3306',
        user: decodeURIComponent(u.username || ''),
        pass: decodeURIComponent(u.password || ''),
        db:   (u.pathname || '').replace(/^\//, ''),
      };
    } catch (e) {
      return { ok: false, reason: `mysql DSN parse failed: ${e.message}` };
    }
  }

  return { ok: false, reason: `unsupported DSN scheme: "${scheme}" (supported: sqlite, postgres, postgresql, mysql, mariadb)` };
}

// Substitute $1, $2, … placeholders with literal values. Caller MUST re-run
// isSafeSelect on the result to catch keyword smuggling through string params.
// Why substitute in-process: psql/mysql/sqlite3 CLIs make parameter binding
// awkward across all three; substitution + post-validation is the simplest
// uniform path. The denylist re-check closes the injection hole.
function substituteParams(query, params) {
  if (!Array.isArray(params) || params.length === 0) return query;
  let out = query;
  for (let i = 0; i < params.length; i++) {
    const placeholder = `$${i + 1}`;
    const p = params[i];
    let escaped;
    if (p === null || p === undefined) {
      escaped = 'NULL';
    } else if (typeof p === 'number' && Number.isFinite(p)) {
      escaped = String(p);
    } else if (typeof p === 'boolean') {
      escaped = p ? '1' : '0';
    } else {
      const s = String(p).replace(/'/g, "''");
      escaped = `'${s}'`;
    }
    out = out.split(placeholder).join(escaped);
  }
  return out;
}

function redactOutput(text) {
  if (typeof text !== 'string') return { text: '', redactedCount: 0 };
  let out = text;
  let count = 0;
  for (const re of DB_OUTPUT_REDACT_PATTERNS) {
    out = out.replace(re, () => { count++; return '[REDACTED]'; });
  }
  return { text: out, redactedCount: count };
}

// Tab-separated parser for psql/mysql --batch output: header line + data lines.
function parseTabSeparated(text) {
  const lines = text.split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const columns = lines[0].split('\t');
  const rows = lines.slice(1).map(line => line.split('\t'));
  return { columns, rows };
}

function dispatchSqlite(filePath, query, timeoutMs) {
  const r = spawnSync('sqlite3', ['-batch', '-json', filePath, query], {
    encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024,
  });
  if (r.error && r.error.code === 'ENOENT') {
    return { ok: false, reason: 'sqlite3 CLI not found in PATH (install via brew/apt/yum/pkg)' };
  }
  if (r.error) return { ok: false, reason: `sqlite3 spawn error: ${r.error.message}` };
  if (r.signal === 'SIGTERM') return { ok: false, reason: `sqlite3 timed out after ${timeoutMs}ms` };
  if (r.status !== 0) {
    return { ok: false, reason: `sqlite3 exit ${r.status}: ${(r.stderr || r.stdout || '').trim().slice(0, 500)}` };
  }
  let parsed;
  try {
    parsed = r.stdout.trim() ? JSON.parse(r.stdout) : [];
  } catch (e) {
    return { ok: false, reason: `sqlite3 -json output parse failed: ${e.message}` };
  }
  if (!Array.isArray(parsed)) return { ok: false, reason: 'sqlite3 -json output not a JSON array' };
  const columns = parsed.length > 0 ? Object.keys(parsed[0]) : [];
  const rows = parsed.map(obj => columns.map(c => obj[c]));
  return { ok: true, columns, rows };
}

function dispatchPostgres(dsn, query, timeoutMs) {
  const r = spawnSync('psql', ['--no-psqlrc', '-A', '-F', '\t', '-c', query, dsn], {
    encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PGCONNECT_TIMEOUT: '5' },
  });
  if (r.error && r.error.code === 'ENOENT') {
    return { ok: false, reason: 'psql CLI not found in PATH' };
  }
  if (r.error) return { ok: false, reason: `psql spawn error: ${r.error.message}` };
  if (r.signal === 'SIGTERM') return { ok: false, reason: `psql timed out after ${timeoutMs}ms` };
  if (r.status !== 0) {
    return { ok: false, reason: `psql exit ${r.status}: ${(r.stderr || r.stdout || '').trim().slice(0, 500)}` };
  }
  // psql -A -F'\t' emits header row + data rows + a trailing "(N rows)" summary line; strip it.
  const cleaned = r.stdout.replace(/\n\(\d+ rows?\)\s*$/, '\n');
  return { ok: true, ...parseTabSeparated(cleaned) };
}

function dispatchMysql(parsed, query, timeoutMs) {
  const args = ['--batch', '--default-character-set=utf8mb4', `-h${parsed.host}`, `-P${parsed.port}`];
  if (parsed.user) args.push(`-u${parsed.user}`);
  if (parsed.db)   args.push(`-D${parsed.db}`);
  args.push('-e', query);
  // Pass password via env var so it's not visible in `ps`.
  const env = { ...process.env };
  if (parsed.pass) env.MYSQL_PWD = parsed.pass;
  const r = spawnSync('mysql', args, {
    encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, env,
  });
  if (r.error && r.error.code === 'ENOENT') {
    return { ok: false, reason: 'mysql CLI not found in PATH' };
  }
  if (r.error) return { ok: false, reason: `mysql spawn error: ${r.error.message}` };
  if (r.signal === 'SIGTERM') return { ok: false, reason: `mysql timed out after ${timeoutMs}ms` };
  if (r.status !== 0) {
    return { ok: false, reason: `mysql exit ${r.status}: ${(r.stderr || r.stdout || '').trim().slice(0, 500)}` };
  }
  return { ok: true, ...parseTabSeparated(r.stdout) };
}

function applyDbExpectations(rows, columns, expect) {
  const results = [];
  let pass = true;
  if (expect && Number.isInteger(expect.rows)) {
    const ok = rows.length === expect.rows;
    if (!ok) pass = false;
    results.push({ kind: 'rows', expected: expect.rows, observed: rows.length, pass: ok });
  }
  if (expect && expect.values && typeof expect.values === 'object') {
    // Apply column-value assertions to the FIRST row (Val's CONTRACT DSL convention).
    const firstRow = rows[0] || [];
    for (const [colName, valSpec] of Object.entries(expect.values)) {
      const idx = columns.indexOf(colName);
      const observed = idx >= 0 ? firstRow[idx] : undefined;
      const v = assertValue(observed, valSpec);
      if (!v.pass) pass = false;
      results.push({ kind: 'value', column: colName, expected: v.expected, observed, pass: v.pass, error: v.error });
    }
  }
  return { pass, results };
}

function callDbState(args) {
  if (!args || typeof args !== 'object' || typeof args.query !== 'string') {
    return { isError: true, content: [{ type: 'text', text: 'db_state requires args.query (SELECT statement)' }] };
  }
  const safety = isSafeSelect(args.query);
  if (!safety.ok) {
    return { isError: true, content: [{ type: 'text', text: `[ohmyclaude-probe db_state] ${safety.reason}` }] };
  }

  const dsn = process.env.OHMYCLAUDE_DB_DSN || '';
  if (!dsn) {
    return {
      content: [{ type: 'text', text:
`[ohmyclaude-probe db_state] not_configured

OHMYCLAUDE_DB_DSN is unset. The query passed the mutation-keyword denylist but
no backend can run it. Set the env var on the MCP server:

  sqlite:    OHMYCLAUDE_DB_DSN=sqlite:///abs/path/to.db
  postgres:  OHMYCLAUDE_DB_DSN=postgres://user:pass@host:5432/db
  mysql:     OHMYCLAUDE_DB_DSN=mysql://user:pass@host:3306/db

Optional: OHMYCLAUDE_DB_TIMEOUT_MS (default ${DEFAULT_DB_TIMEOUT_MS}), OHMYCLAUDE_DB_MAX_ROWS (default ${MAX_DB_ROWS}).

The query you submitted (which would have been safe) was:

${args.query}` }],
      structuredContent: { pass: false, reason: 'not_configured', query: args.query, safetyOk: true },
    };
  }

  // Substitute params in our process. Re-run isSafeSelect on the substituted
  // query so a malicious string value can't smuggle a mutation keyword past
  // the denylist via $N expansion.
  const substituted = substituteParams(args.query, args.params);
  const recheck = isSafeSelect(substituted);
  if (!recheck.ok) {
    return { isError: true, content: [{ type: 'text', text: `[ohmyclaude-probe db_state] post-substitution safety check failed: ${recheck.reason}` }] };
  }

  const parsedDsn = parseDsn(dsn);
  if (!parsedDsn.ok) {
    return { isError: true, content: [{ type: 'text', text: `[ohmyclaude-probe db_state] ${parsedDsn.reason}` }] };
  }

  const timeoutMs = DEFAULT_DB_TIMEOUT_MS;
  const startMs = Date.now();
  let dispatch;
  if (parsedDsn.scheme === 'sqlite')   dispatch = dispatchSqlite(parsedDsn.path, substituted, timeoutMs);
  else if (parsedDsn.scheme === 'postgres') dispatch = dispatchPostgres(parsedDsn.dsn, substituted, timeoutMs);
  else if (parsedDsn.scheme === 'mysql')    dispatch = dispatchMysql(parsedDsn, substituted, timeoutMs);
  else dispatch = { ok: false, reason: `internal: unhandled scheme ${parsedDsn.scheme}` };
  const elapsedMs = Date.now() - startMs;

  if (!dispatch.ok) {
    return {
      isError: true,
      content: [{ type: 'text', text: `[ohmyclaude-probe db_state] ${dispatch.reason}` }],
      structuredContent: { pass: false, reason: dispatch.reason, query: args.query, safetyOk: true, elapsedMs },
    };
  }

  // Row cap.
  const totalRows = dispatch.rows.length;
  const truncated = totalRows > MAX_DB_ROWS;
  const rows = truncated ? dispatch.rows.slice(0, MAX_DB_ROWS) : dispatch.rows;

  // Output redaction across the entire result set.
  let totalRedacted = 0;
  const redactedRows = rows.map(r => r.map(cell => {
    if (typeof cell !== 'string') return cell;
    const { text, redactedCount } = redactOutput(cell);
    totalRedacted += redactedCount;
    return text;
  }));

  const expect = (args.expect && typeof args.expect === 'object') ? args.expect : {};
  const verdict = applyDbExpectations(redactedRows, dispatch.columns, expect);

  const lines = [
    `${verdict.pass ? 'PASS' : 'FAIL'} · ${parsedDsn.scheme} · ${redactedRows.length}${truncated ? `/${totalRows} (truncated)` : ''} row(s) · ${elapsedMs}ms`,
    '',
  ];
  for (const r of verdict.results) {
    const tag = r.pass ? '  ✓' : '  ✗';
    if (r.kind === 'rows') {
      lines.push(`${tag} rows: expected ${r.expected}, observed ${r.observed}`);
    } else if (r.kind === 'value') {
      lines.push(`${tag} value[${r.column}]: expected ${JSON.stringify(r.expected)}, observed ${JSON.stringify(r.observed)}`);
    }
    if (r.error) lines.push(`      error: ${r.error}`);
  }
  if (verdict.results.length === 0) {
    lines.push('  (no assertions specified — observed result set only)');
  }
  if (totalRedacted > 0) {
    lines.push('');
    lines.push(`  ⚠ ${totalRedacted} secret pattern match(es) redacted from output`);
  }

  // Compact preview of first 10 rows for forensic context.
  lines.push('');
  lines.push(`[result preview, first ${Math.min(10, redactedRows.length)} row(s)]`);
  if (dispatch.columns.length > 0) lines.push(dispatch.columns.join('\t'));
  for (const row of redactedRows.slice(0, 10)) {
    lines.push(row.map(c => c === null ? '<null>' : String(c)).join('\t'));
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
    structuredContent: {
      pass: verdict.pass,
      scheme: parsedDsn.scheme,
      rowCount: redactedRows.length,
      totalRowCount: totalRows,
      truncated,
      columns: dispatch.columns,
      assertions: verdict.results,
      redactedSecrets: totalRedacted,
      elapsedMs,
    },
  };
}

// ─── Tool catalog ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'http_probe',
    description: 'Make an HTTP(S) request and assert on the response (status, JSON-path values, headers). Used by @val-evaluator to grade CONTRACT criteria against a running implementation. Stdlib-only — no fetch dependency.',
    inputSchema: {
      type: 'object',
      properties: {
        method:    { type: 'string', description: 'HTTP method. Default: GET.', enum: ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'] },
        url:       { type: 'string', description: 'Path (relative to baseUrl) or absolute URL.' },
        baseUrl:   { type: 'string', description: 'Base URL prefix when `url` is a path. Optional.' },
        body:      { description: 'Request body. Object → serialized as JSON (Content-Type auto-set). String → sent as-is.' },
        headers:   { type: 'object', description: 'Request headers (case-preserving). Optional.' },
        timeoutMs: { type: 'integer', description: 'Request timeout in ms. Default 10000, max 60000.', minimum: 1, maximum: 60000 },
        expect:    {
          type: 'object',
          description: 'Assertions on the response. Each branch contributes one assertion line to the verdict.',
          properties: {
            status:  { type: 'integer', description: 'Expected HTTP status code.' },
            json:    { type: 'object',  description: 'Map of JSON path → expected value or {matches: regex} or {contains: substring} or {notNull: true}. Path examples: "id", "results[0].name", "$.user.email".' },
            headers: { type: 'object',  description: 'Map of header name (lowercase) → expected value or {matches: regex} or {contains: substring}.' },
          },
          additionalProperties: false,
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'db_state',
    description: 'Run a read-only SELECT against the project database to verify persistence state during CONTRACT grading. Dispatches via OHMYCLAUDE_DB_DSN to sqlite3/psql/mysql CLI. Validates the query against a mutation-keyword denylist; substitutes $N params then re-validates; caps rows; redacts well-known secret patterns from output. Returns not_configured if DSN is unset.',
    inputSchema: {
      type: 'object',
      properties: {
        query:  { type: 'string', description: 'SELECT-only SQL. Must begin with SELECT/WITH/EXPLAIN/SHOW/DESCRIBE/PRAGMA. Mutation keywords (INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER/CREATE/GRANT/REVOKE/REPLACE/MERGE/CALL/EXEC/COMMIT/ROLLBACK/SAVEPOINT/LOCK) are rejected before the query reaches the database.' },
        params: { type: 'array', description: 'Bound parameters for $1, $2, … placeholders. Optional.', items: {} },
        expect: {
          type: 'object',
          description: 'Assertions on the result set.',
          properties: {
            rows:   { type: 'integer', description: 'Expected row count.', minimum: 0 },
            values: { type: 'object',  description: 'Map of column name → expected value (literal or matcher).' },
          },
          additionalProperties: false,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
];

// ─── Request dispatch ───────────────────────────────────────────────────────

async function handleRequest(req) {
  const isNotification = req.id === undefined || req.id === null;

  switch (req.method) {
    case 'initialize':
      if (isNotification) return;
      return respond(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });

    case 'initialized':
    case 'notifications/initialized':
      return;  // notification, no reply

    case 'tools/list':
      if (isNotification) return;
      return respond(req.id, { tools: TOOLS });

    case 'tools/call': {
      if (isNotification) return;
      const params = req.params || {};
      try {
        if (params.name === 'http_probe') {
          const r = await callHttpProbe(params.arguments || {});
          return respond(req.id, r);
        }
        if (params.name === 'db_state') {
          return respond(req.id, callDbState(params.arguments || {}));
        }
        return respondError(req.id, -32602, `unknown tool: ${params.name}`);
      } catch (e) {
        return respondError(req.id, -32603, 'tool execution failed', String(e && e.message));
      }
    }

    case 'ping':
      if (isNotification) return;
      return respond(req.id, {});

    default:
      if (isNotification) return;
      return respondError(req.id, -32601, `method not found: ${req.method}`);
  }
}

// ─── Main loop ──────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch (e) {
    process.stderr.write(`[${SERVER_NAME}] malformed input: ${e.message}\n`);
    return;
  }
  Promise.resolve()
    .then(() => handleRequest(req))
    .catch((e) => {
      process.stderr.write(`[${SERVER_NAME}] dispatch error: ${e && e.stack || e}\n`);
      if (req && req.id !== undefined && req.id !== null) {
        respondError(req.id, -32603, 'internal error', String(e && e.message));
      }
    });
});

rl.on('close', () => {
  process.exit(0);
});

process.stderr.write(`[${SERVER_NAME}] v${SERVER_VERSION} ready (protocol ${PROTOCOL_VERSION})\n`);
