#!/usr/bin/env node
/**
 * backlog-tracker.js
 *
 * PostToolUse hook triggered on Write tool calls.
 * Watches .claude/.ohmyclaude/backlog/issues/*.md for new/modified ISS-*.md files.
 * Rebuilds BACKLOG.md index — sorted by priority, grouped by route.
 *
 * Hook input (stdin): JSON { tool_name, tool_input: { file_path, content } }
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Read hook input ────────────────────────────────────────────────────────────
let input;
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch {
  process.exit(0); // Non-fatal: no stdin or malformed JSON
}

const filePath = input?.tool_input?.file_path || '';

// Only activate for writes to the backlog issues directory
if (!filePath.includes('.claude/.ohmyclaude/backlog/issues/') || !filePath.endsWith('.md')) {
  process.exit(0);
}

// ── Locate backlog directory ───────────────────────────────────────────────────
const repoRoot    = findRepoRoot(process.cwd());
const backlogDir  = path.join(repoRoot, '.claude', '.ohmyclaude', 'backlog', 'issues');
const backlogFile = path.join(repoRoot, '.claude', '.ohmyclaude', 'backlog', 'BACKLOG.md');

if (!fs.existsSync(backlogDir)) {
  process.exit(0);
}

// ── Parse all ISS-*.md files ───────────────────────────────────────────────────
const issues = [];

for (const file of fs.readdirSync(backlogDir)) {
  if (!file.startsWith('ISS-') || !file.endsWith('.md')) continue;

  const fileFull = path.join(backlogDir, file);
  const content  = fs.readFileSync(fileFull, 'utf8');
  const meta     = parseFrontmatter(content);

  if (!meta.id) continue;

  issues.push({
    id:       meta.id,
    type:     meta.type     || 'feature',
    priority: meta.priority || 'P3',
    route:    meta.route    || 'D',
    status:   meta.status   || 'backlog',
    file,
    title:    extractTitle(content),
  });
}

// ── Sort: P0 first, then by ID ────────────────────────────────────────────────
const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

issues.sort((a, b) => {
  const pa = PRIORITY_ORDER[a.priority] ?? 9;
  const pb = PRIORITY_ORDER[b.priority] ?? 9;
  if (pa !== pb) return pa - pb;
  return a.id.localeCompare(b.id);
});

// ── Group by route ────────────────────────────────────────────────────────────
const ROUTE_LABELS = {
  A: 'Route A — Docs-Only',
  B: 'Route B — Fast-Track',
  C: 'Route C — Hotfix',
  D: 'Route D — Full Feature',
  E: 'Route E — Security Patch',
};

const grouped = { A: [], B: [], C: [], D: [], E: [] };
for (const issue of issues) {
  const r = issue.route in grouped ? issue.route : 'D';
  grouped[r].push(issue);
}

// ── Build BACKLOG.md ──────────────────────────────────────────────────────────
const lines = [
  '# Backlog',
  '',
  `_Last updated: ${new Date().toISOString().slice(0, 10)}_`,
  `_Total issues: ${issues.length}_`,
  '',
];

for (const [route, label] of Object.entries(ROUTE_LABELS)) {
  const routeIssues = grouped[route];
  if (!routeIssues.length) continue;

  lines.push(`## ${label}`);
  lines.push('');
  lines.push('| ID | Priority | Type | Status | Title |');
  lines.push('|----|----------|------|--------|-------|');

  for (const iss of routeIssues) {
    const statusBadge = iss.status === 'done' ? '✓ done'
      : iss.status === 'in-progress' ? '⟳ in-progress'
      : 'backlog';
    lines.push(`| ${iss.id} | ${iss.priority} | ${iss.type} | ${statusBadge} | ${iss.title} |`);
  }

  lines.push('');
}

fs.mkdirSync(path.dirname(backlogFile), { recursive: true });
fs.writeFileSync(backlogFile, lines.join('\n'), 'utf8');

// ── Helpers ───────────────────────────────────────────────────────────────────

function findRepoRoot(dir) {
  if (fs.existsSync(path.join(dir, '.git'))) return dir;
  const parent = path.dirname(dir);
  if (parent === dir) return process.cwd(); // fallback
  return findRepoRoot(parent);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      meta[key.trim()] = rest.join(':').trim();
    }
  }
  return meta;
}

function extractTitle(content) {
  // First H2 heading after frontmatter, or first line of body
  const body = content.replace(/^---[\s\S]*?---\n/, '');
  const h2 = body.match(/^## (.+)/m);
  if (h2) return h2[1].trim();
  const firstLine = body.trim().split('\n')[0];
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}
