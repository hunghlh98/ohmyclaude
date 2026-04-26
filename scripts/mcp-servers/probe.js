#!/usr/bin/env node
/**
 * ohmyclaude-probe — minimal stdio MCP server exposing runtime probes
 *                    for @val-evaluator (sprint contract grading).
 *
 * Tools:
 *   - http_probe   Make an HTTP/HTTPS request and assert on status / JSON-path /
 *                  header values. Used by Val to grade weighted criteria from
 *                  CONTRACT-<id>.md against running implementations.
 *   - db_state     v3.0.0 STUB. Validates a SELECT-only query against the
 *                  mutation-keyword denylist and returns a structured
 *                  "not_configured" response with re-routing instructions to
 *                  Bash-based DB probes via the project's conventional CLI.
 *                  Real backend (sqlite/psql/mysql) lands in a v3.x patch
 *                  once the DSN-detection design has empirical use data.
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

const http       = require('http');
const https      = require('https');
const { URL }    = require('url');
const readline   = require('readline');

const SERVER_NAME      = 'ohmyclaude-probe';
const SERVER_VERSION   = '0.1.0';
const PROTOCOL_VERSION = '2024-11-05';
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_BODY_BYTES     = 8 * 1024 * 1024;  // 8 MiB ceiling on response bodies

// Mutation keywords blocked at the SQL parser level for db_state. Case-insensitive,
// word-boundary match. Comments before keywords are stripped first.
const MUTATION_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
  'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'REPLACE',
  'MERGE', 'CALL', 'EXEC', 'EXECUTE', 'COMMIT',
  'ROLLBACK', 'SAVEPOINT', 'LOCK',
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

// ─── Tool: db_state (v3.0.0 stub — schema validated, runtime gated) ─────────

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

function callDbState(args) {
  if (!args || typeof args !== 'object' || typeof args.query !== 'string') {
    return { isError: true, content: [{ type: 'text', text: 'db_state requires args.query (SELECT statement)' }] };
  }
  const safety = isSafeSelect(args.query);
  if (!safety.ok) {
    return {
      isError: true,
      content: [{ type: 'text', text: `[ohmyclaude-probe db_state] ${safety.reason}` }],
    };
  }
  const dsn = process.env.OHMYCLAUDE_DB_DSN || '';
  if (!dsn) {
    return {
      content: [{ type: 'text', text:
`[ohmyclaude-probe db_state] not_configured (v3.0.0)

The query passed the mutation-keyword denylist, but db_state is a stub in v3.0.0.
A real backend (sqlite/psql/mysql shell-out) lands in a v3.x patch once DSN
detection has empirical usage data.

For v3.0.0 CONTRACT criteria that need DB state verification:

  1. Use Bash + your project's conventional CLI (sqlite3, psql, mysql) directly.
     Example for SQLite:
       Bash> sqlite3 path/to/db.sqlite "SELECT count(*) FROM users WHERE email='x@y.com'"

  2. Encode the safety check (read-only) at the CONTRACT level — write the
     probe spec as 'sqlite3 ... SELECT ...' and rely on @val-evaluator's
     prompt rules to refuse anything that isn't SELECT.

  3. Or, expose state via an HTTP endpoint and use http_probe instead.

The query you submitted (which would have been safe) was:

${args.query}

Safety check result: PASS (no mutation keywords detected).` }],
      structuredContent: {
        pass: false,
        reason: 'not_configured',
        query: args.query,
        safetyOk: true,
      },
    };
  }

  // Configured DSN path — placeholder for v3.x. Today, refuse with a clear
  // message rather than partial implementation; refusal is honest about scope.
  return {
    isError: true,
    content: [{ type: 'text', text:
`[ohmyclaude-probe db_state] OHMYCLAUDE_DB_DSN is set but the backend dispatcher is not implemented in v3.0.0. Tracked for a v3.x patch. Use Bash + your DB CLI directly for now (see not_configured guidance above; same workaround applies).` }],
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
    description: 'Run a read-only SELECT against the project database to verify persistence state during CONTRACT grading. v3.0.0 STUB: validates the query against a mutation-keyword denylist and returns not_configured with re-routing instructions to Bash + project DB CLI. Real backend lands in a v3.x patch.',
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
