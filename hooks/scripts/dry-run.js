#!/usr/bin/env node
/**
 * dry-run.js — /forge pipeline simulator
 *
 * Classifies a request, determines the agent route, estimates files touched
 * and cost, and prints a report WITHOUT invoking any Claude agent.
 *
 * Runtime utility (despite living in hooks/scripts/ — the only shipped
 * directory that holds JS).
 *
 * Usage:
 *   node hooks/scripts/dry-run.js "<request>"
 *   node hooks/scripts/dry-run.js "<request>" --json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---- Classification patterns -----------------------------------------------

const PATTERNS = {
  docs:        /\b(document|readme|docs?|explain|describe)\b/i,
  security:    /\b(vulnerability|cve|auth|security|token|jwt|oauth|permission|credential|xss|csrf|sql\s*injection)\b/i,
  debug:       /\b(debug|diagnose|why\s+(is|are|do|does)|root\s*cause|flaky|intermittent)\b/i,
  review:      /\b(review|audit|inspect)\b/i,
  bug:         /\b(fix|broken|error|bug|not\s+working|failing|crash|can.?t|cannot|unable)\b/i,
  boilerplate: /\b(scaffold|boilerplate|generate|template|init\b|bootstrap)\b/i,
  refactor:    /\b(refactor|clean\s*up|simplify|reorganize|rename)\b/i,
  enhancement: /\b(improve|optimize|enhance|extend|speed\s*up|faster)\b/i,
  feature:     /\b(add|build|implement|create|introduce|support)\b/i,
};

const FE_SIGNALS   = /\b(ui|frontend|front-end|component|css|react|vue|next|page|form|dashboard|button|modal|style|tsx|jsx)\b/i;
const BE_SIGNALS   = /\b(api|backend|back-end|service|endpoint|controller|database|\bdb\b|sql|migration|java|spring|node)\b/i;
const P0_SIGNALS   = /\b(urgent|p0|hotfix|production|critical|prod\s*down|users\s+can.?t)\b/i;
const ARCH_SIGNALS = /\b(architect|c4|design\s+system|microservice|distributed|scalable|throughput|redesign|rewrite)\b/i;

// ---- Route table (mirrors paige-product.md heuristics) ---------------------

const ROUTES = {
  docs:        { agents: ['@devon-ops', '@stan-standards'],                                                                         waves: 1, scenario: 'docs'     },
  review:      { agents: ['@stan-standards'],                                                                                       waves: 1, scenario: 'docs'     },
  debug:       { agents: ['@heracles'],                                                                                             waves: 1, scenario: 'hotfix'   },
  refactor:    { agents: ['@stan-standards', '{builder}', '@quinn-qa'],                                                             waves: 3, scenario: 'feature'  },
  boilerplate: { agents: ['{builder}', '@quinn-qa', '@stan-standards'],                                                             waves: 2, scenario: 'feature'  },
  security:    { agents: ['@sam-sec', '{builder}', '@quinn-qa', '@sam-sec (re-review)', '@devon-ops'],                              waves: 4, scenario: 'feature'  },
  bugP0:       { agents: ['{builder}', '@quinn-qa', '@devon-ops'],                                                                  waves: 2, scenario: 'hotfix'   },
  bug:         { agents: ['@paige-product', '@heracles', '{builder}', '@quinn-qa', '@stan-standards'],                              waves: 4, scenario: 'feature'  },
  featSimple:  { agents: ['@paige-product', '{builder}', '@quinn-qa', '@stan-standards', '@devon-ops'],                             waves: 4, scenario: 'feature'  },
  featComplex: { agents: ['@paige-product', '@artie-arch', '@una-ux', '@sam-sec', '@beck-backend', '@effie-frontend', '@quinn-qa', '@stan-standards', '@devon-ops'], waves: 6, scenario: 'full-app' },
  enhancement: { agents: ['@paige-product', '{builder}', '@quinn-qa', '@stan-standards'],                                            waves: 3, scenario: 'feature'  },
};

// ---- Classification ---------------------------------------------------------

function classify(request) {
  const r = request.toLowerCase();
  const isP0    = P0_SIGNALS.test(r);
  const hasFE   = FE_SIGNALS.test(r);
  const hasBE   = BE_SIGNALS.test(r);
  const hasArch = ARCH_SIGNALS.test(r);

  // Order matters — security / debug / review / docs are strong signals that
  // override the general feature/bug verbs
  const pick = (type, priority = 'P1') => ({ type, priority, hasFE, hasBE, hasArch });

  if (PATTERNS.security.test(r))    return pick('security',    isP0 ? 'P0' : 'P1');
  if (PATTERNS.debug.test(r))       return pick('debug',       isP0 ? 'P0' : 'P1');
  if (PATTERNS.review.test(r))      return pick('review',      'P2');
  if (PATTERNS.docs.test(r))        return pick('docs',        'P3');
  if (PATTERNS.bug.test(r))         return pick('bug',         isP0 ? 'P0' : 'P1');
  if (PATTERNS.boilerplate.test(r)) return pick('boilerplate', 'P2');
  if (PATTERNS.refactor.test(r))    return pick('refactor',    'P2');
  if (PATTERNS.enhancement.test(r)) return pick('enhancement', 'P2');
  if (PATTERNS.feature.test(r))     return pick('feature',     isP0 ? 'P0' : 'P1');
  return pick('feature', 'P1');
}

function complexityOf(request, c) {
  const words = request.trim().split(/\s+/).length;
  if (c.type === 'docs' || c.type === 'review') return 'low';
  if (c.hasArch || words > 20)                  return 'high';
  if (words > 10)                                return 'medium';
  return 'low';
}

function routeKey(c, complexity) {
  if (c.type === 'bug' && c.priority === 'P0')    return 'bugP0';
  if (c.type === 'feature' && complexity === 'high') return 'featComplex';
  if (c.type === 'feature')                        return 'featSimple';
  return c.type;
}

function resolveBuilders(agents, c) {
  const out = [];
  for (const a of agents) {
    if (a !== '{builder}') { out.push(a); continue; }
    if (c.hasFE && c.hasBE)      out.push('@beck-backend', '@effie-frontend');
    else if (c.hasFE)            out.push('@effie-frontend');
    else                          out.push('@beck-backend');
  }
  return out;
}

// ---- File-count estimate ----------------------------------------------------

function estimateFiles(cwd, c) {
  const IGNORE = new Set([
    'node_modules', '.git', 'target', 'dist', 'build',
    '.gradle', '__pycache__', 'venv', '.idea', '.vscode', '.claude'
  ]);
  let count = 0;
  function walk(dir, depth) {
    if (depth > 3) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (IGNORE.has(e.name) || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.isFile()) count++;
    }
  }
  walk(cwd, 0);
  if (count === 0) return { low: 1, high: 3, total: 0, confidence: 'low' };

  const pct = {
    docs:        0.01,
    review:      0.10,
    security:    0.05,
    debug:       0.03,
    refactor:    0.15,
    feature:     c.hasArch ? 0.10 : 0.03,
    bug:         0.03,
    boilerplate: 0.05,
    enhancement: 0.04,
  }[c.type] ?? 0.04;

  const mean = Math.max(1, Math.round(count * pct));
  return {
    low:  Math.max(1, Math.round(mean * 0.6)),
    high: Math.round(mean * 1.4),
    total: count,
    confidence: count < 20 ? 'low' : count < 100 ? 'medium' : 'high',
  };
}

// ---- Cost estimate ----------------------------------------------------------

const DRYRUN_PRIORS = {
  'full-app': { mean: 1.40, p95: 2.10 },
  'feature':  { mean: 0.68, p95: 1.15 },
  'hotfix':   { mean: 0.38, p95: 0.55 },
  'docs':     { mean: 0.05, p95: 0.10 },
};

function loadBaseline(cwd) {
  const p = path.join(cwd, '.claude', 'metrics', 'baseline.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function estimateCost(scenario, baseline) {
  const sb = baseline && baseline.scenarios ? baseline.scenarios[scenario] : null;
  if (sb && sb.mean_usd) {
    return {
      mean: sb.mean_usd,
      p95:  sb.p95_usd || sb.mean_usd * 1.5,
      source: `baseline (n=${sb.n || 0})`,
    };
  }
  const d = DRYRUN_PRIORS[scenario] || DRYRUN_PRIORS.feature;
  return { mean: d.mean, p95: d.p95, source: 'dry-run prior' };
}

// ---- Report -----------------------------------------------------------------

function formatReport(request, c, complexity, route, agents, files, cost) {
  const rule = '─'.repeat(64);
  const variance = cost.mean > 0
    ? Math.max(15, Math.round(((cost.p95 - cost.mean) / cost.mean) * 100))
    : 30;

  const lines = [
    `Dry-run: ${request}`,
    rule,
    `Classification: ${c.type} / Complexity: ${complexity} / Priority: ${c.priority}`,
    `Touches_Security: ${c.type === 'security'}`,
    `Has_FE_Component: ${c.hasFE}`,
    `Has_BE_Component: ${c.hasBE}`,
    `Architectural:    ${c.hasArch}`,
    '',
    `Route:  ${agents.join(' → ')}`,
    `Waves:  ${route.waves}`,
    `Files touched (est): ${files.low}-${files.high}${files.total ? ` of ${files.total}` : ''} (confidence: ${files.confidence})`,
    '',
    `Projected cost: $${cost.mean.toFixed(2)} (±${variance}%)`,
    `  scenario: ${route.scenario} — mean $${cost.mean.toFixed(2)} / p95 $${cost.p95.toFixed(2)}`,
    `  source:   ${cost.source}`,
  ];
  if (c.hasArch && !agents.some(a => a.includes('artie'))) {
    lines.push('  (architectural signals detected but @artie-arch not in route — cost may underestimate)');
  }
  lines.push('', '(No agents invoked)');
  return lines.join('\n');
}

// ---- Main -------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const request = argv.filter(a => a !== '--json' && a !== '--verbose').join(' ').trim();
  if (!request) {
    console.error('Usage: node hooks/scripts/dry-run.js "<request>" [--json]');
    process.exit(1);
  }
  const cwd = process.cwd();
  const c          = classify(request);
  const complexity = complexityOf(request, c);
  const key        = routeKey(c, complexity);
  const route      = ROUTES[key] || ROUTES.featSimple;
  const agents     = resolveBuilders(route.agents, c);
  const files      = estimateFiles(cwd, c);
  const baseline   = loadBaseline(cwd);
  const cost       = estimateCost(route.scenario, baseline);

  if (asJson) {
    console.log(JSON.stringify({
      request,
      classification: { ...c, complexity, routeKey: key },
      route: { agents, waves: route.waves, scenario: route.scenario },
      files,
      cost: { ...cost, projected: cost.mean },
    }, null, 2));
  } else {
    console.log(formatReport(request, c, complexity, route, agents, files, cost));
  }
}

main();
