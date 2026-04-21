#!/usr/bin/env node
/**
 * graph-update.js
 *
 * PostToolUse hook — triggers incremental graph update after code changes.
 *
 * Probes graph backends in priority order:
 *   1. codegraph           (if `codegraph` CLI is on PATH AND `.codegraph/` exists)
 *   2. code-review-graph   (if `code-review-graph` CLI is on PATH)
 *   3. skip silently       (no backend installed)
 *
 * Matcher: Write|Edit|MultiEdit
 * Async: true (non-blocking; fire-and-forget)
 *
 * The hook is informational only — always passes stdin through to stdout and
 * always exits 0. Nothing here can block or fail a tool call.
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  // Always pass through — this hook is informational only
  process.stdout.write(raw);

  // ---- Tier 1: codegraph ----
  // Requires both: CLI installed AND project has been initialized (.codegraph/ exists).
  // codegraph's own file watcher handles auto-sync when the MCP server is running,
  // so this manual sync is a belt-and-suspenders idempotent no-op in that case.
  const codegraphOnPath = spawnSync('which', ['codegraph'], { encoding: 'utf8' });
  if (codegraphOnPath.status === 0) {
    const projectHasCodegraph = fs.existsSync(path.join(process.cwd(), '.codegraph'));
    if (projectHasCodegraph) {
      const sync = spawnSync('codegraph', ['sync', '--quiet'], {
        encoding: 'utf8',
        timeout: 8000
      });
      if (sync.status !== 0 && sync.stderr) {
        process.stderr.write(`[graph-update/codegraph] ${sync.stderr.trim()}\n`);
      }
      process.exit(0);
    }
    // codegraph installed but project not initialized — fall through to tier 2
  }

  // ---- Tier 2: code-review-graph ----
  const crgOnPath = spawnSync('which', ['code-review-graph'], { encoding: 'utf8' });
  if (crgOnPath.status === 0) {
    const update = spawnSync('code-review-graph', ['update', '--incremental'], {
      encoding: 'utf8',
      timeout: 8000
    });
    if (update.status !== 0 && update.stderr) {
      process.stderr.write(`[graph-update/code-review-graph] ${update.stderr.trim()}\n`);
    }
    process.exit(0);
  }

  // ---- Tier 3: no backend installed — skip silently ----
  process.exit(0);
});
