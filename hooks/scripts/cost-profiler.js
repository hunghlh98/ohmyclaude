#!/usr/bin/env node
/**
 * cost-profiler.js
 *
 * Transcript-based measurement hook for the /forge Agent Teams pipeline.
 *
 * SubagentStop: snapshot cumulative token totals into
 *   .claude/metrics/runs/<runId>/snap-<ts>.json
 * Stop: diff consecutive snapshots into per-agent deltas, write
 *   .claude/pipeline/PROFILE-<runId>.md, update
 *   .claude/metrics/baseline.json (rolling N=20).
 *
 * Non-fatal: any error exits 0 and passes stdin through. The profiler
 * never blocks /forge. Agents stay blind to it — no prompt changes.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const PRICING = {
  opus:   { in: 15.00, out: 75.00, cache_read: 1.50, cache_write: 18.75 },
  sonnet: { in:  3.00, out: 15.00, cache_read: 0.30, cache_write:  3.75 },
  haiku:  { in:  1.00, out:  5.00, cache_read: 0.10, cache_write:  1.25 },
};

function modelClass(m) {
  if (!m) return 'sonnet';
  if (m.includes('opus'))  return 'opus';
  if (m.includes('haiku')) return 'haiku';
  return 'sonnet';
}

function costOf(usage, model) {
  const p = PRICING[modelClass(model)];
  return (
    (usage.input_tokens                  || 0) * p.in          / 1e6 +
    (usage.output_tokens                 || 0) * p.out         / 1e6 +
    (usage.cache_read_input_tokens       || 0) * p.cache_read  / 1e6 +
    (usage.cache_creation_input_tokens   || 0) * p.cache_write / 1e6
  );
}

function readJsonl(p) {
  if (!p || !fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function cumulativeTotals(transcript) {
  const t = { in: 0, out: 0, cacheR: 0, cacheW: 0, usd: 0, turns: 0, model: 'unknown' };
  for (const m of transcript) {
    if (m.type !== 'assistant' || !m.message || !m.message.usage) continue;
    const u = m.message.usage;
    t.in     += u.input_tokens                || 0;
    t.out    += u.output_tokens               || 0;
    t.cacheR += u.cache_read_input_tokens     || 0;
    t.cacheW += u.cache_creation_input_tokens || 0;
    t.usd    += costOf(u, m.message.model);
    t.turns  += 1;
    t.model   = m.message.model || t.model;
  }
  return t;
}

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function percentile(a, p) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(a.length * p)] ?? s[s.length - 1];
}

function runDir(cwd, runId) {
  const d = path.join(cwd, '.claude', 'metrics', 'runs', runId);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function onSubagentStop(evt) {
  const cwd   = evt.cwd || process.cwd();
  const runId = evt.session_id || 'unknown';
  const transcript = readJsonl(evt.transcript_path);
  if (!transcript.length) return;

  const snap = {
    ts: Date.now(),
    agent: evt.subagent_type || evt.agent_name || 'unknown',
    cumulative: cumulativeTotals(transcript),
  };
  fs.writeFileSync(
    path.join(runDir(cwd, runId), `snap-${snap.ts}.json`),
    JSON.stringify(snap, null, 2)
  );
}

function deltasByAgent(snapshots) {
  const sorted = [...snapshots].sort((a, b) => a.ts - b.ts);
  const rows = [];
  let prev = { in: 0, out: 0, cacheR: 0, cacheW: 0, usd: 0, turns: 0 };
  for (const s of sorted) {
    const c = s.cumulative;
    rows.push({
      agent:  s.agent,
      model:  c.model,
      turns:  Math.max(0, c.turns  - prev.turns),
      input:  Math.max(0, c.in     - prev.in),
      output: Math.max(0, c.out    - prev.out),
      cacheR: Math.max(0, c.cacheR - prev.cacheR),
      cacheW: Math.max(0, c.cacheW - prev.cacheW),
      usd:    Math.max(0, c.usd    - prev.usd),
    });
    prev = c;
  }
  return rows;
}

function inferScenario(transcript, agentCount) {
  for (const m of transcript) {
    const content = m.message && m.message.content;
    const text = Array.isArray(content)
      ? content.map(c => c.text || '').join('\n')
      : (typeof content === 'string' ? content : '');
    const match = text.match(/"Task_Type"\s*:\s*"(\w+)"/);
    if (match) {
      if (match[1] === 'feature') return agentCount >= 7 ? 'full-app' : 'feature';
      if (match[1] === 'bug')     return 'hotfix';
      if (match[1] === 'docs')    return 'docs';
      return match[1];
    }
  }
  return agentCount >= 7 ? 'full-app' : agentCount >= 4 ? 'feature' : 'hotfix';
}

function flagsFor(row, agentBaseline) {
  const f = [];
  if (row.turns >= 3) f.push('turn_explosion');
  if (agentBaseline && row.usd > (agentBaseline.p95_usd || Infinity)) f.push('cost_over_p95');
  const total = row.cacheR + row.input;
  if (total > 5000 && (row.cacheR / total) < 0.20) f.push('cache_miss_spike');
  if (modelClass(row.model) === 'opus' && row.output > 5000) f.push('opus_budget_breach');
  return f;
}

function writeProfile(cwd, runId, scenario, perAgent, baseline) {
  const totals = perAgent.reduce((a, r) => ({
    in: a.in + r.input, out: a.out + r.output,
    cacheR: a.cacheR + r.cacheR, usd: a.usd + r.usd,
  }), { in: 0, out: 0, cacheR: 0, usd: 0 });

  const sb = (baseline.scenarios || {})[scenario] || {};
  const hitRate = (totals.in + totals.cacheR)
    ? (totals.cacheR / (totals.in + totals.cacheR)).toFixed(2)
    : '0.00';
  const delta = sb.mean_usd
    ? Math.round(((totals.usd - sb.mean_usd) / sb.mean_usd) * 100)
    : null;

  const lines = [
    '---',
    `runId: ${runId}`,
    `scenario: ${scenario}`,
    `agents: ${perAgent.length}`,
    `total_in_tokens: ${totals.in + totals.cacheR}`,
    `total_out_tokens: ${totals.out}`,
    `cache_hit_rate: ${hitRate}`,
    `total_usd: ${totals.usd.toFixed(4)}`,
  ];
  if (sb.mean_usd) {
    lines.push(`baseline_usd: ${sb.mean_usd.toFixed(4)}`);
    lines.push(`delta_pct: ${delta > 0 ? '+' : ''}${delta}`);
  }
  lines.push('---', '', `# PROFILE-${runId}`, '',
    '| Agent | Model | Turns | In | Out | Cache Hit | USD | Flags |',
    '|---|---|---:|---:|---:|---:|---:|---|');

  const allFlags = new Set();
  for (const r of perAgent) {
    const ab = (baseline.agents || {})[r.agent];
    const flags = flagsFor(r, ab);
    flags.forEach(f => allFlags.add(f));
    const hit = (r.input + r.cacheR)
      ? (r.cacheR / (r.input + r.cacheR)).toFixed(2)
      : '0.00';
    lines.push(
      `| ${r.agent} | ${modelClass(r.model)} | ${r.turns} | ${r.input + r.cacheR} | ${r.output} | ${hit} | $${r.usd.toFixed(4)} | ${flags.join(', ') || '—'} |`
    );
  }

  lines.push('', '## Next Actions');
  if (allFlags.size === 0) {
    lines.push('- No anomalies. Run within baseline envelope.');
  } else {
    if (allFlags.has('turn_explosion'))
      lines.push('- `turn_explosion` — agent hit REVISE cap. Investigate upstream brief quality.');
    if (allFlags.has('cost_over_p95'))
      lines.push('- `cost_over_p95` — agent exceeded its rolling p95. Check artifact size or file-read volume.');
    if (allFlags.has('cache_miss_spike'))
      lines.push('- `cache_miss_spike` — prompt prefix may have drifted. Check system-prompt stability.');
    if (allFlags.has('opus_budget_breach'))
      lines.push('- `opus_budget_breach` — Opus output >5K tokens. Tighten SDD contract.');
  }

  const out = path.join(cwd, '.claude', 'pipeline', `PROFILE-${runId}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n'));
}

function updateBaseline(cwd, scenario, perAgent, totalUsd) {
  const file = path.join(cwd, '.claude', 'metrics', 'baseline.json');
  let bl = {};
  if (fs.existsSync(file)) {
    try { bl = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { bl = {}; }
  }
  bl.scenarios = bl.scenarios || {};
  bl.agents    = bl.agents    || {};

  const s = bl.scenarios[scenario] || { recent: [] };
  s.recent   = (s.recent || []).concat(totalUsd).slice(-20);
  s.n        = s.recent.length;
  s.mean_usd = mean(s.recent);
  s.p95_usd  = percentile(s.recent, 0.95);
  bl.scenarios[scenario] = s;

  for (const r of perAgent) {
    const ab = bl.agents[r.agent] || {
      recent_usd: [], recent_in: [], recent_out: [], recent_turns: [],
    };
    ab.recent_usd   = (ab.recent_usd   || []).concat(r.usd).slice(-20);
    ab.recent_in    = (ab.recent_in    || []).concat(r.input + r.cacheR).slice(-20);
    ab.recent_out   = (ab.recent_out   || []).concat(r.output).slice(-20);
    ab.recent_turns = (ab.recent_turns || []).concat(r.turns).slice(-20);
    ab.n           = ab.recent_usd.length;
    ab.mean_in     = mean(ab.recent_in);
    ab.mean_out    = mean(ab.recent_out);
    ab.p95_usd     = percentile(ab.recent_usd, 0.95);
    ab.turns_p95   = Math.round(percentile(ab.recent_turns, 0.95));
    bl.agents[r.agent] = ab;
  }

  bl.updated = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(bl, null, 2));
}

function onStop(evt) {
  const cwd   = evt.cwd || process.cwd();
  const runId = evt.session_id || 'unknown';
  const dir   = path.join(cwd, '.claude', 'metrics', 'runs', runId);
  if (!fs.existsSync(dir)) return;

  const snaps = fs.readdirSync(dir)
    .filter(f => f.startsWith('snap-'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
      catch { return null; }
    })
    .filter(Boolean);
  if (!snaps.length) return;

  const perAgent = deltasByAgent(snaps);
  if (!perAgent.length) return;

  const transcript = readJsonl(evt.transcript_path);
  const scenario   = inferScenario(transcript, perAgent.length);

  let baseline = {};
  const blPath = path.join(cwd, '.claude', 'metrics', 'baseline.json');
  if (fs.existsSync(blPath)) {
    try { baseline = JSON.parse(fs.readFileSync(blPath, 'utf8')); } catch { baseline = {}; }
  }

  writeProfile(cwd, runId, scenario, perAgent, baseline);
  const total = perAgent.reduce((s, r) => s + r.usd, 0);
  updateBaseline(cwd, scenario, perAgent, total);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);
  let evt = null;
  try { evt = JSON.parse(raw); } catch { process.exit(0); }
  try {
    if (evt && evt.hook_event_name === 'SubagentStop') onSubagentStop(evt);
    else if (evt && evt.hook_event_name === 'Stop')    onStop(evt);
  } catch (_) { /* never block */ }
  process.exit(0);
});
