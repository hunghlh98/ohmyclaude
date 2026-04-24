#!/usr/bin/env node
/**
 * usage-report.js
 *
 * Reads <project>/.claude/.ohmyclaude/usage/events.jsonl and produces an
 * insight report. Run from any project root (or pass --cwd):
 *
 *   node scripts/usage-report.js             # reads ./.claude/.ohmyclaude/usage
 *   node scripts/usage-report.js --cwd /abs  # reads /abs/.claude/.ohmyclaude/usage
 *   node scripts/usage-report.js --json      # machine-readable summary
 *   node scripts/usage-report.js --since 7d  # only last N days (1h, 30d)
 *
 * Writes:
 *   <cwd>/.claude/.ohmyclaude/usage/insights.md          human-readable report
 *   <cwd>/.claude/.ohmyclaude/usage/aggregate.json       machine-readable rollup
 *
 * Pure Node. No dependencies. Designed to be reran after every session
 * so insights drift with real usage — no manual curation.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

function listEntries(dir, predicate) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(predicate)
      .map(e => e.name);
  } catch { return []; }
}

const ALL_AGENTS = listEntries(
  path.join(PLUGIN_ROOT, 'agents'),
  e => e.isFile() && e.name.endsWith('.md'),
).map(f => f.replace(/\.md$/, ''));

const ALL_SKILLS = listEntries(
  path.join(PLUGIN_ROOT, 'skills'),
  e => e.isDirectory(),
);

function parseArgs(argv) {
  const args = { cwd: process.cwd(), json: false, since: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd') { args.cwd = argv[++i]; }
    else if (a === '--json') { args.json = true; }
    else if (a === '--since') { args.since = argv[++i]; }
    else if (a === '-h' || a === '--help') { args.help = true; }
  }
  return args;
}

function parseSinceMs(spec) {
  if (!spec) return null;
  const m = String(spec).match(/^(\d+)\s*(h|d)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2].toLowerCase() === 'h' ? n * 3_600_000 : n * 86_400_000;
}

function loadEvents(cwd, sinceMs) {
  const p = path.join(cwd, '.claude', '.ohmyclaude', 'usage', 'events.jsonl');
  if (!fs.existsSync(p)) return [];
  const cutoff = sinceMs ? Date.now() - sinceMs : 0;
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line) continue;
    try {
      const ev = JSON.parse(line);
      if (!cutoff || (new Date(ev.ts).getTime() >= cutoff)) out.push(ev);
    } catch { /* skip malformed */ }
  }
  return out;
}

function group(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function sortDesc(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function pct(n, total) {
  return total ? `${((n / total) * 100).toFixed(1)}%` : '—';
}

function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m${rs ? ' ' + rs + 's' : ''}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h${rm ? ' ' + rm + 'm' : ''}`;
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','should','can','could',
  'of','in','on','at','to','for','with','by','from','as','into','about',
  'this','that','these','those','it','its','you','your','we','our','they',
  'than','then','so','if','not','no','yes','only','just','more','most','less',
  'because','since','when','while','where','which','who','what','how','why',
  'per','via','also','even','still','already','yet','etc','i',
]);

function topKeywords(texts, n = 10) {
  const counts = new Map();
  for (const txt of texts) {
    const words = (txt || '').toLowerCase()
      .replace(/[^a-z0-9\s_\-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
    const seen = new Set();
    for (const w of words) {
      if (seen.has(w)) continue;
      seen.add(w);
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return sortDesc(counts).slice(0, n);
}

function compute(events) {
  const byType = new Map();
  for (const e of events) byType.set(e.event, (byType.get(e.event) || 0) + 1);

  const prompts    = events.filter(e => e.event === 'user_prompt');
  const spawns     = events.filter(e => e.event === 'agent_spawn');
  const skills     = events.filter(e => e.event === 'skill_invoke');
  const responses  = events.filter(e => e.event === 'response_end');
  const forgeRuns  = events.filter(e => e.event === 'forge_run_end');
  const sessions   = events.filter(e => e.event === 'session_start');
  const insights   = events.filter(e => e.event === 'insight_captured');

  const agentCounts   = sortDesc(group(spawns, e => e.agent_type));
  const skillCounts   = sortDesc(group(skills, e => e.skill_name));
  const commandCounts = sortDesc(group(prompts.filter(p => p.is_slash_command), e => e.command));
  const scenarioCounts = sortDesc(group(forgeRuns, e => e.scenario || 'unknown'));

  const promptTotal = prompts.length;
  const corrections = prompts.filter(p => p.correction_signal).length;
  const affirmations = prompts.filter(p => p.affirmation_signal).length;
  const neutrals = promptTotal - corrections - affirmations;

  // Skill trigger provenance (v2.3.1+). Events from older logs lack `trigger`
  // and fall through to an "unknown" bucket so the ratio doesn't silently
  // lie when someone upgrades mid-corpus.
  const triggerCounts = { user_slash: 0, model_auto: 0, unknown: 0 };
  const triggerBySkill = new Map();
  for (const s of skills) {
    const t = s.trigger || 'unknown';
    triggerCounts[t] = (triggerCounts[t] || 0) + 1;
    const key = s.skill_name || 'unknown';
    const cur = triggerBySkill.get(key) || { user_slash: 0, model_auto: 0, unknown: 0 };
    cur[t] = (cur[t] || 0) + 1;
    triggerBySkill.set(key, cur);
  }

  // Plugin usage aggregation across skills + agents + slash commands. Null
  // plugin (unprefixed) is rendered as "core" — that's the ohmyclaude own
  // surface. Colon-prefixed names come from other installed plugins.
  const pluginCounts = new Map();
  const bump = (p, k, n = 1) => {
    const key = p || 'core';
    const cur = pluginCounts.get(key) || { skills: 0, agents: 0, commands: 0, total: 0 };
    cur[k] += n;
    cur.total += n;
    pluginCounts.set(key, cur);
  };
  for (const e of skills)  bump(e.skill_plugin, 'skills');
  for (const e of spawns)  bump(e.agent_plugin, 'agents');
  for (const e of prompts.filter(p => p.is_slash_command)) bump(e.command_plugin, 'commands');

  const spawnSet = new Set(agentCounts.map(([n]) => n));
  const deadAgents = ALL_AGENTS.filter(a => !spawnSet.has(a));
  const skillSet = new Set(skillCounts.map(([n]) => n));
  const deadSkills = ALL_SKILLS.filter(s => !skillSet.has(s));

  const totalUsd    = forgeRuns.reduce((s, r) => s + (r.total_usd || 0), 0);
  const avgUsd      = forgeRuns.length ? totalUsd / forgeRuns.length : 0;
  const totalTurns  = forgeRuns.reduce((s, r) => s + (r.total_turns || 0), 0);
  const totalWallMs = forgeRuns.reduce((s, r) => s + (r.wall_ms || 0), 0);

  const sessionDurations = responses.length
    ? (() => {
        const bySid = new Map();
        for (const r of responses) {
          const cur = bySid.get(r.session_id) || 0;
          bySid.set(r.session_id, Math.max(cur, r.duration_ms || 0));
        }
        return [...bySid.values()].sort((a, b) => a - b);
      })()
    : [];

  const correctionsByAgent = (() => {
    const m = new Map();
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.event !== 'user_prompt' || !e.correction_signal) continue;
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
        const prev = events[j];
        if (prev.session_id !== e.session_id) break;
        if (prev.event === 'agent_spawn') {
          m.set(prev.agent_type, (m.get(prev.agent_type) || 0) + 1);
          break;
        }
      }
    }
    return sortDesc(m);
  })();

  const toolsBySpawn = (() => {
    const perAgent = new Map();
    for (const r of forgeRuns) {
      const mix = r.tool_mix || {};
      for (const [tool, count] of Object.entries(mix)) {
        perAgent.set(tool, (perAgent.get(tool) || 0) + count);
      }
    }
    return sortDesc(perAgent);
  })();

  const uniqInsights = (() => {
    const m = new Map();
    for (const i of insights) {
      if (!m.has(i.hash)) m.set(i.hash, i);
    }
    return [...m.values()];
  })();
  const insightKeywords = topKeywords(uniqInsights.map(i => i.text), 12);
  const recentInsights = insights.slice(-5).reverse();

  return {
    window: {
      first_event: events.length ? events[0].ts : null,
      last_event:  events.length ? events[events.length - 1].ts : null,
      total_events: events.length,
      sessions_started: sessions.length,
    },
    totals: {
      user_prompts: promptTotal,
      corrections,
      affirmations,
      correction_rate:  promptTotal ? corrections / promptTotal : 0,
      affirmation_rate: promptTotal ? affirmations / promptTotal : 0,
      agent_spawns: spawns.length,
      skill_invokes: skills.length,
      forge_runs: forgeRuns.length,
      total_usd: Number(totalUsd.toFixed(6)),
      avg_usd_per_run: Number(avgUsd.toFixed(6)),
      total_turns: totalTurns,
      total_wall_ms: totalWallMs,
      insights_captured: insights.length,
      insights_unique:   uniqInsights.length,
    },
    sentiment: {
      correction: corrections,
      affirmation: affirmations,
      neutral: Math.max(0, neutrals),
      total: promptTotal,
    },
    skill_triggers: {
      totals: triggerCounts,
      by_skill: [...triggerBySkill.entries()]
        .sort((a, b) => (b[1].user_slash + b[1].model_auto) - (a[1].user_slash + a[1].model_auto))
        .map(([name, c]) => ({ name, ...c, total: c.user_slash + c.model_auto + c.unknown })),
    },
    plugins: [...pluginCounts.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, c]) => ({ name, ...c })),
    agents: {
      fired: agentCounts.map(([name, count]) => ({ name, count })),
      dead:  deadAgents,
    },
    skills: {
      fired: skillCounts.map(([name, count]) => ({ name, count })),
      dead:  deadSkills,
    },
    commands: commandCounts.map(([name, count]) => ({ name, count })),
    scenarios: scenarioCounts.map(([name, count]) => ({ name, count })),
    corrections: {
      total: corrections,
      by_preceding_agent: correctionsByAgent.map(([name, count]) => ({ name, count })),
    },
    tool_mix: toolsBySpawn.map(([name, count]) => ({ name, count })),
    session_latency: {
      count: sessionDurations.length,
      p50_ms: sessionDurations[Math.floor(sessionDurations.length * 0.5)] || null,
      p95_ms: sessionDurations[Math.floor(sessionDurations.length * 0.95)] || null,
      max_ms: sessionDurations.length ? sessionDurations[sessionDurations.length - 1] : null,
    },
    insights: {
      total:   insights.length,
      unique:  uniqInsights.length,
      per_session: sessions.length
        ? Math.round((insights.length / sessions.length) * 10) / 10
        : 0,
      keywords: insightKeywords.map(([k, c]) => ({ keyword: k, count: c })),
      recent:   recentInsights.map(i => ({
        ts: i.ts, session_id: i.session_id, hash: i.hash, text: i.text,
      })),
    },
    event_counts: Object.fromEntries(byType),
  };
}

function renderMd(summary) {
  const { window: w, totals: t } = summary;
  const lines = [];
  lines.push(`# ohmyclaude usage insights`);
  lines.push('');
  lines.push(`_Generated: ${new Date().toISOString()}_  `);
  lines.push(`_Window: ${w.first_event || '—'} → ${w.last_event || '—'} (${w.total_events} events, ${w.sessions_started} sessions)_`);
  lines.push('');

  lines.push(`## Totals`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---:|`);
  lines.push(`| User prompts | ${t.user_prompts} |`);
  lines.push(`| Corrections | ${t.corrections} (${pct(t.corrections, t.user_prompts)}) |`);
  lines.push(`| Affirmations | ${t.affirmations} (${pct(t.affirmations, t.user_prompts)}) |`);
  lines.push(`| Agent spawns | ${t.agent_spawns} |`);
  lines.push(`| Skill invocations | ${t.skill_invokes} |`);
  lines.push(`| /forge runs | ${t.forge_runs} |`);
  lines.push(`| Total USD | $${t.total_usd.toFixed(4)} |`);
  lines.push(`| Avg USD / run | $${t.avg_usd_per_run.toFixed(4)} |`);
  lines.push(`| Total wall-clock | ${fmtMs(t.total_wall_ms)} |`);
  lines.push('');

  lines.push(`## Agents`);
  lines.push('');
  if (summary.agents.fired.length) {
    lines.push(`| Agent | Spawns | % of spawns |`);
    lines.push(`|---|---:|---:|`);
    for (const a of summary.agents.fired) {
      lines.push(`| @${a.name} | ${a.count} | ${pct(a.count, t.agent_spawns)} |`);
    }
  } else {
    lines.push('_No agent spawns recorded yet._');
  }
  lines.push('');
  if (summary.agents.dead.length) {
    lines.push(`**Never spawned** (${summary.agents.dead.length}/${ALL_AGENTS.length}): ${summary.agents.dead.map(a => '@' + a).join(', ')}`);
    lines.push('');
  }

  lines.push(`## Skills`);
  lines.push('');
  if (summary.skills.fired.length) {
    lines.push(`| Skill | Invocations |`);
    lines.push(`|---|---:|`);
    for (const s of summary.skills.fired.slice(0, 20)) {
      lines.push(`| ${s.name} | ${s.count} |`);
    }
    if (summary.skills.fired.length > 20) {
      lines.push(`| _…${summary.skills.fired.length - 20} more_ | |`);
    }
  } else {
    lines.push('_No skill invocations recorded yet._');
    lines.push('');
    lines.push('Note: Claude Code only logs Skill tool calls here. Skills auto-activated by description matching do not emit a Skill tool call and will not appear.');
  }
  lines.push('');
  if (summary.skills.dead.length) {
    lines.push(`**Never invoked via Skill tool** (${summary.skills.dead.length}/${ALL_SKILLS.length}): ${summary.skills.dead.slice(0, 15).join(', ')}${summary.skills.dead.length > 15 ? ', …' : ''}`);
    lines.push('');
  }

  lines.push(`## Skill triggers (v2.3.1+)`);
  lines.push('');
  const st = summary.skill_triggers;
  const stTotal = st.totals.user_slash + st.totals.model_auto + st.totals.unknown;
  if (stTotal === 0) {
    lines.push('_No Skill tool invocations yet._');
  } else {
    lines.push(`Out of ${stTotal} Skill-tool invocations: **${st.totals.user_slash}** user-triggered (typed as a slash command) · **${st.totals.model_auto}** auto-triggered by Claude${st.totals.unknown ? ` · ${st.totals.unknown} from pre-v2.3.1 events (no trigger field)` : ''}.`);
    lines.push('');
    if (st.by_skill.length) {
      lines.push(`| Skill | User-typed | Auto | Unknown |`);
      lines.push(`|---|---:|---:|---:|`);
      for (const r of st.by_skill.slice(0, 20)) {
        lines.push(`| ${r.name} | ${r.user_slash} | ${r.model_auto} | ${r.unknown} |`);
      }
    }
  }
  lines.push('');

  lines.push(`## Plugins (v2.3.1+)`);
  lines.push('');
  if (!summary.plugins.length) {
    lines.push('_No plugin-namespaced skills/agents/commands observed yet._');
  } else {
    lines.push(`Usage grouped by name prefix (\`<plugin>:<name>\`). "core" is ohmyclaude itself (no prefix).`);
    lines.push('');
    lines.push(`| Plugin | Skills | Agents | Commands | Total |`);
    lines.push(`|---|---:|---:|---:|---:|`);
    for (const p of summary.plugins) {
      lines.push(`| ${p.name} | ${p.skills} | ${p.agents} | ${p.commands} | ${p.total} |`);
    }
  }
  lines.push('');

  lines.push(`## Commands`);
  lines.push('');
  if (summary.commands.length) {
    lines.push(`| Command | Uses |`);
    lines.push(`|---|---:|`);
    for (const c of summary.commands.slice(0, 20)) {
      lines.push(`| /${c.name} | ${c.count} |`);
    }
  } else {
    lines.push('_No slash commands recorded yet._');
  }
  lines.push('');

  lines.push(`## Scenario mix`);
  lines.push('');
  if (summary.scenarios.length) {
    lines.push(`| Scenario | Runs |`);
    lines.push(`|---|---:|`);
    for (const sc of summary.scenarios) lines.push(`| ${sc.name} | ${sc.count} |`);
  } else {
    lines.push('_No /forge runs recorded yet. Run a /forge to populate this._');
  }
  lines.push('');

  lines.push(`## Prompt sentiment (v2.3.1+)`);
  lines.push('');
  const sent = summary.sentiment;
  if (sent.total === 0) {
    lines.push('_No user prompts yet._');
  } else {
    lines.push(`| Sentiment | Count | Share |`);
    lines.push(`|---|---:|---:|`);
    lines.push(`| correction | ${sent.correction} | ${pct(sent.correction, sent.total)} |`);
    lines.push(`| affirmation | ${sent.affirmation} | ${pct(sent.affirmation, sent.total)} |`);
    lines.push(`| neutral | ${sent.neutral} | ${pct(sent.neutral, sent.total)} |`);
    lines.push('');
    lines.push('_Detection is regex on the first token only — "no", "stop", "revert" → correction; "yes", "perfect", "lgtm", "ship it" → affirmation. Correction wins when both match._');
  }
  lines.push('');

  lines.push(`## Correction signals`);
  lines.push('');
  if (summary.corrections.total === 0) {
    lines.push('_No course-corrections detected. Either the pipeline is predicting intent well, or users are polite._');
  } else {
    lines.push(`Total corrections: **${summary.corrections.total}** out of ${t.user_prompts} prompts (${pct(summary.corrections.total, t.user_prompts)}).`);
    lines.push('');
    if (summary.corrections.by_preceding_agent.length) {
      lines.push(`Corrections most often follow these agent spawns:`);
      lines.push('');
      lines.push(`| Preceding agent | Corrections |`);
      lines.push(`|---|---:|`);
      for (const c of summary.corrections.by_preceding_agent.slice(0, 10)) {
        lines.push(`| @${c.name} | ${c.count} |`);
      }
    }
  }
  lines.push('');

  lines.push(`## Tool mix (across /forge runs)`);
  lines.push('');
  if (summary.tool_mix.length) {
    lines.push(`| Tool | Calls |`);
    lines.push(`|---|---:|`);
    for (const t of summary.tool_mix.slice(0, 15)) {
      lines.push(`| ${t.name} | ${t.count} |`);
    }
  } else {
    lines.push('_No tool mix data yet (populated from runs/_index.jsonl after /forge runs)._');
  }
  lines.push('');

  lines.push(`## Explanatory-mode insights captured`);
  lines.push('');
  if (summary.insights.total === 0) {
    lines.push('_No ★ Insight blocks captured yet. They are collected from assistant messages in the transcript at Stop time — enable Explanatory output style to generate them._');
  } else {
    lines.push(`Captured: **${summary.insights.total}** total, **${summary.insights.unique}** unique · avg ${summary.insights.per_session} per session.`);
    lines.push('');
    if (summary.insights.keywords.length) {
      lines.push(`**Top themes** (keyword × document-frequency):`);
      lines.push('');
      lines.push(`| Keyword | Insights |`);
      lines.push(`|---|---:|`);
      for (const k of summary.insights.keywords) {
        lines.push(`| \`${k.keyword}\` | ${k.count} |`);
      }
      lines.push('');
    }
    if (summary.insights.recent.length) {
      lines.push(`**Most recent insights:**`);
      lines.push('');
      for (const i of summary.insights.recent) {
        const snippet = i.text.length > 400 ? i.text.slice(0, 400) + '…' : i.text;
        lines.push(`- _${i.ts}_ — \`${i.hash}\``);
        for (const ln of snippet.split('\n')) lines.push(`  > ${ln}`);
        lines.push('');
      }
    }
    lines.push(`Full log: \`.claude/.ohmyclaude/usage/insights.jsonl\``);
    lines.push('');
  }

  lines.push(`## Session latency`);
  lines.push('');
  const sl = summary.session_latency;
  lines.push(`Sessions sampled: ${sl.count}  `);
  lines.push(`p50: ${fmtMs(sl.p50_ms)} · p95: ${fmtMs(sl.p95_ms)} · max: ${fmtMs(sl.max_ms)}`);
  lines.push('');

  lines.push(`## Event log stats`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(summary.event_counts, null, 2));
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function renderTerm(summary) {
  const { totals: t } = summary;
  const out = [];
  out.push('');
  out.push('╭─ ohmyclaude usage insights');
  out.push(`│  events: ${summary.window.total_events}  ·  sessions: ${summary.window.sessions_started}  ·  /forge runs: ${t.forge_runs}`);
  out.push(`│  total spend: $${t.total_usd.toFixed(4)}  ·  avg/run: $${t.avg_usd_per_run.toFixed(4)}  ·  wall: ${fmtMs(t.total_wall_ms)}`);
  out.push(`│  prompts: ${t.user_prompts}  ·  corrections: ${t.corrections} (${pct(t.corrections, t.user_prompts)})  ·  affirmations: ${t.affirmations} (${pct(t.affirmations, t.user_prompts)})`);
  out.push('╰─');
  out.push('');

  out.push('Top agents (by spawns):');
  if (summary.agents.fired.length) {
    for (const a of summary.agents.fired.slice(0, 10)) {
      out.push(`  ${String(a.count).padStart(5)}  @${a.name}`);
    }
    if (summary.agents.dead.length) {
      out.push(`  ── never spawned: ${summary.agents.dead.map(a => '@' + a).join(', ')}`);
    }
  } else {
    out.push('  (no spawns yet)');
  }
  out.push('');

  out.push('Top skills (by Skill tool invocations):');
  if (summary.skills.fired.length) {
    for (const s of summary.skills.fired.slice(0, 10)) {
      out.push(`  ${String(s.count).padStart(5)}  ${s.name}`);
    }
    out.push(`  ── never invoked: ${summary.skills.dead.length}/${ALL_SKILLS.length}`);
  } else {
    out.push('  (no Skill-tool invocations yet)');
  }
  out.push('');

  const st = summary.skill_triggers.totals;
  const stTotal = st.user_slash + st.model_auto + st.unknown;
  if (stTotal > 0) {
    out.push('Skill trigger mix:');
    out.push(`  ${String(st.user_slash).padStart(5)}  user-typed (${pct(st.user_slash, stTotal)})`);
    out.push(`  ${String(st.model_auto).padStart(5)}  auto by Claude (${pct(st.model_auto, stTotal)})`);
    if (st.unknown) out.push(`  ${String(st.unknown).padStart(5)}  unknown (pre-v2.3.1)`);
    out.push('');
  }

  if (summary.plugins.length) {
    out.push('Plugin usage:');
    for (const p of summary.plugins.slice(0, 8)) {
      out.push(`  ${String(p.total).padStart(5)}  ${p.name}  (skills:${p.skills} agents:${p.agents} commands:${p.commands})`);
    }
    out.push('');
  }

  out.push('Commands:');
  if (summary.commands.length) {
    for (const c of summary.commands.slice(0, 10)) {
      out.push(`  ${String(c.count).padStart(5)}  /${c.name}`);
    }
  } else {
    out.push('  (no slash commands yet)');
  }
  out.push('');

  out.push('Scenario mix:');
  if (summary.scenarios.length) {
    for (const sc of summary.scenarios) {
      out.push(`  ${String(sc.count).padStart(5)}  ${sc.name}`);
    }
  } else {
    out.push('  (no /forge runs yet)');
  }
  out.push('');

  if (summary.corrections.by_preceding_agent.length) {
    out.push('Corrections by preceding agent:');
    for (const c of summary.corrections.by_preceding_agent.slice(0, 5)) {
      out.push(`  ${String(c.count).padStart(5)}  @${c.name}`);
    }
    out.push('');
  }

  out.push('Explanatory insights captured:');
  if (summary.insights.total === 0) {
    out.push('  (none yet — use Explanatory output style)');
  } else {
    out.push(`  total: ${summary.insights.total}  ·  unique: ${summary.insights.unique}  ·  per session avg: ${summary.insights.per_session}`);
    if (summary.insights.keywords.length) {
      const top = summary.insights.keywords.slice(0, 6)
        .map(k => `${k.keyword}(${k.count})`).join('  ');
      out.push(`  themes: ${top}`);
    }
    if (summary.insights.recent.length) {
      const last = summary.insights.recent[0];
      const snip = last.text.replace(/\n/g, ' ').slice(0, 140);
      out.push(`  latest: ${snip}${last.text.length > 140 ? '…' : ''}`);
    }
  }
  out.push('');

  return out.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('usage-report — read .claude/.ohmyclaude/usage/events.jsonl, write insights.md + aggregate.json');
    console.log('  --cwd <path>   project root (default: cwd)');
    console.log('  --since <spec> 1h, 24h, 7d, 30d');
    console.log('  --json         print machine-readable summary');
    process.exit(0);
  }

  const sinceMs  = parseSinceMs(args.since);
  const events   = loadEvents(args.cwd, sinceMs);

  if (!events.length) {
    const hint = sinceMs
      ? `No events in the last ${args.since}. Widen the window or run /forge.`
      : `No events yet at ${path.join(args.cwd, '.claude', '.ohmyclaude', 'usage', 'events.jsonl')}. Use Claude Code with the usage-tracker hook installed.`;
    if (args.json) process.stdout.write(JSON.stringify({ empty: true, hint }, null, 2) + '\n');
    else process.stdout.write(hint + '\n');
    process.exit(0);
  }

  const summary = compute(events);

  const usageDir = path.join(args.cwd, '.claude', '.ohmyclaude', 'usage');
  fs.mkdirSync(usageDir, { recursive: true });
  fs.writeFileSync(path.join(usageDir, 'aggregate.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(usageDir, 'insights.md'),    renderMd(summary));

  if (args.json) process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  else process.stdout.write(renderTerm(summary));
}

main();
