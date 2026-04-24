#!/usr/bin/env node
/**
 * ohmyclaude-fs — minimal stdio MCP server exposing filesystem helpers.
 *
 * Currently one tool: `tree`. Promotes the directory-listing capability
 * from anonymous Bash invocations to a named, trackable MCP tool so the
 * dashboard's tool_mix / offered surface shows it distinctly.
 *
 * Design notes:
 *   - Stdlib-only. No @modelcontextprotocol/sdk dependency. Consistent with
 *     the Python dashboard's zero-dep invariant.
 *   - Implements the MCP JSON-RPC subset actually exercised by Claude Code:
 *     initialize, tools/list, tools/call. Notifications are accepted but
 *     ignored. Any unknown method returns JSON-RPC MethodNotFound (-32601).
 *   - Shells out to the system `tree` CLI when available (faster, richer
 *     output). Falls back to a portable Node implementation (readdirSync)
 *     otherwise — so the server works on Windows / minimal containers
 *     without requiring `brew install tree` etc.
 *   - Stdout is reserved for JSON-RPC. All diagnostics go to stderr.
 *
 * Protocol: MCP 2024-11-05 / 2025-03-26 compatible (client negotiates).
 */

'use strict';

const fs          = require('fs');
const path        = require('path');
const { spawnSync } = require('child_process');
const readline    = require('readline');

const SERVER_NAME    = 'ohmyclaude-fs';
const SERVER_VERSION = '0.1.0';
const PROTOCOL_VERSION = '2024-11-05';

// ─── Protocol plumbing ──────────────────────────────────────────────────────

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

// ─── Tool: tree ─────────────────────────────────────────────────────────────

const DEFAULT_IGNORE = [
  'node_modules', '.git', 'target', 'dist', 'build',
  '.gradle', '__pycache__', 'venv', '.venv', '.next',
  '.turbo', '.cache', 'coverage', '.pytest_cache',
];

function hasSystemTree() {
  try {
    const r = spawnSync('tree', ['--version'], { stdio: 'ignore' });
    return r.status === 0;
  } catch {
    return false;
  }
}

function runSystemTree(root, maxDepth, ignore) {
  const ignorePattern = ignore.join('|');
  const args = ['-I', ignorePattern, '--dirsfirst', '-L', String(maxDepth), root];
  const r = spawnSync('tree', args, {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,  // 8 MiB ceiling for very large trees
  });
  if (r.error || r.status !== 0) {
    return { ok: false, text: (r.stderr || String(r.error || 'unknown error')).trim() };
  }
  return { ok: true, text: r.stdout };
}

function portableTree(root, maxDepth, ignore) {
  const ignoreSet = new Set(ignore);
  const lines = [path.resolve(root)];
  let dirs = 0;
  let files = 0;

  function walk(dir, depth, prefix) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => !ignoreSet.has(e.name))
        .sort((a, b) => {
          // dirs first, then alpha (matches `tree --dirsfirst`)
          if (a.isDirectory() !== b.isDirectory()) {
            return a.isDirectory() ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    } catch (e) {
      lines.push(prefix + '└── [error: ' + e.code + ']');
      return;
    }
    entries.forEach((e, i) => {
      const last   = i === entries.length - 1;
      const branch = last ? '└── ' : '├── ';
      const child  = last ? '    ' : '│   ';
      lines.push(prefix + branch + e.name);
      if (e.isDirectory()) {
        dirs++;
        walk(path.join(dir, e.name), depth + 1, prefix + child);
      } else {
        files++;
      }
    });
  }
  walk(root, 1, '');
  lines.push('');
  lines.push(`${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`);
  return { ok: true, text: lines.join('\n') };
}

function callTreeTool(args) {
  const root = (args && typeof args.path === 'string') ? args.path : process.cwd();
  const maxDepth = (args && Number.isInteger(args.maxDepth) && args.maxDepth > 0)
    ? Math.min(args.maxDepth, 10)   // safety cap — very deep trees = very large output
    : 3;
  const ignore = (args && Array.isArray(args.ignore) && args.ignore.length)
    ? args.ignore.filter(x => typeof x === 'string' && x.length > 0)
    : DEFAULT_IGNORE;

  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved)) {
    return { isError: true, content: [{ type: 'text', text: `path not found: ${resolved}` }] };
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return { isError: true, content: [{ type: 'text', text: `not a directory: ${resolved}` }] };
  }

  const backend = hasSystemTree() ? 'system' : 'portable';
  const result  = backend === 'system'
    ? runSystemTree(resolved, maxDepth, ignore)
    : portableTree(resolved, maxDepth, ignore);

  if (!result.ok) {
    return { isError: true, content: [{ type: 'text', text: result.text }] };
  }
  // Prepend a one-liner so agents know which backend produced the output
  const header = `[ohmyclaude-fs tree · backend=${backend} · depth=${maxDepth}]\n`;
  return { content: [{ type: 'text', text: header + result.text }] };
}

const TOOLS = [
  {
    name: 'tree',
    description: 'List a directory as a tree. Shells out to the system `tree` CLI when available, falls back to a portable Node implementation. Defaults ignore node_modules, .git, build, dist, target, and similar generated dirs. Use this instead of a Bash `tree` call so the invocation is trackable in tool_mix metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        path:     { type: 'string',  description: 'Directory to scan (absolute or relative). Default: cwd.' },
        maxDepth: { type: 'integer', description: 'Maximum depth (1-10). Default: 3.', minimum: 1, maximum: 10 },
        ignore:   { type: 'array', items: { type: 'string' }, description: 'Path-segment names to exclude. Defaults cover node_modules, .git, build outputs, and language-specific caches.' },
      },
      additionalProperties: false,
    },
  },
];

// ─── Request dispatch ───────────────────────────────────────────────────────

function handleRequest(req) {
  // Notifications (no id) are accepted but unanswered, per JSON-RPC.
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
      if (params.name !== 'tree') {
        return respondError(req.id, -32602, `unknown tool: ${params.name}`);
      }
      try {
        return respond(req.id, callTreeTool(params.arguments || {}));
      } catch (e) {
        return respondError(req.id, -32603, 'tree execution failed', String(e && e.message));
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
  try {
    handleRequest(req);
  } catch (e) {
    process.stderr.write(`[${SERVER_NAME}] dispatch error: ${e && e.stack || e}\n`);
    if (req && req.id !== undefined && req.id !== null) {
      respondError(req.id, -32603, 'internal error', String(e && e.message));
    }
  }
});

rl.on('close', () => {
  process.exit(0);
});

process.stderr.write(`[${SERVER_NAME}] v${SERVER_VERSION} ready (protocol ${PROTOCOL_VERSION})\n`);
