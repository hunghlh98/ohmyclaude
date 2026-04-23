#!/usr/bin/env node
/**
 * usage-tracker.js
 *
 * Per-project usage telemetry for the ohmyclaude plugin. Captures how
 * the plugin is actually used — which agents spawn, which skills fire,
 * which commands get typed, how often the user course-corrects — so the
 * plugin author can improve based on evidence, not guesses.
 *
 * Writes only local files under <cwd>/.claude/usage/:
 *   events.jsonl              append-only event log (one JSON per line)
 *   insights.jsonl            sidecar of just `insight_captured` records
 *   .sessions/<sid>.json      running per-session aggregate state
 *
 * Event types emitted:
 *   session_start             fired once per SessionStart
 *   user_prompt               metadata-only: length, word count, first
 *                             word, detected slash command, correction
 *                             signal. Prompt body is NEVER logged.
 *   agent_spawn               a Task tool call — records subagent_type
 *   skill_invoke              a Skill tool call — records skill_name
 *   response_end              fired at every Stop with cumulative
 *                             session counters
 *   forge_run_end             fired at Stop when cost-profiler has
 *                             upserted a matching runId line in
 *                             runs/_index.jsonl (joins cost + usage)
 *   insight_captured          fired at Stop for each new Explanatory-
 *                             style "★ Insight ─────" block in the
 *                             transcript. Dedup'd by 16-char sha256 of
 *                             the block body within the session. Model
 *                             output is user-visible and safe to log.
 *
 * Privacy:
 *   - User prompt text is never logged. Only length, word count, first
 *     word (≤32 chars), detected slash-command name, flag-only args_hint.
 *   - Tool inputs other than subagent_type / skill name are never logged.
 *   - Model output is logged ONLY for explicit "★ Insight" blocks the
 *     user has already seen on-screen, to aggregate learning over time.
 *   - File contents and generated code are never logged.
 *   - Set OHMYCLAUDE_USAGE_TRACKING=off to disable entirely.
 *
 * Contract: read stdin → pass through → append JSONL → exit 0 on any
 * error. Never blocks. Same discipline as cost-profiler.js and
 * subagent-trace.js.
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const CORRECTION_RE = /^(no|nope|don'?t|do not|stop|wait|undo|revert|that'?s wrong|try again|actually|hmm|hold on|never mind|nvm|wrong|back|go back|cancel|retry|redo)\b/i;
// Affirmation: explicit approval of the prior turn. Ordered so shortest
// tokens ("ok", "yes") don't shadow multi-word phrases via early match.
const AFFIRMATION_RE = /^(lgtm|ship it|looks good|that works|perfect|exactly|awesome|great|thanks?|thx|nice|yep|yeah|yes|sure|ok(ay)?)\b/i;

// Matches Explanatory-style Insight blocks. Accepts optional surrounding
// backticks (when the model emits the block as a code span). Body is
// captured lazily until a terminating horizontal rule (≥10 dashes).
const INSIGHT_RE = /`?★\s*Insight[─\-\s]*`?\s*\n([\s\S]*?)\n\s*`?[─\-]{10,}[─\-\s]*`?/g;

function isDisabled() {
  return (process.env.OHMYCLAUDE_USAGE_TRACKING || '').toLowerCase() === 'off';
}

function usageDir(cwd) {
  const d = path.join(cwd, '.claude', 'usage');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function sessionStateFile(cwd, sid) {
  const d = path.join(usageDir(cwd), '.sessions');
  fs.mkdirSync(d, { recursive: true });
  return path.join(d, `${sid}.json`);
}

function appendEvent(cwd, evt) {
  const p = path.join(usageDir(cwd), 'events.jsonl');
  fs.appendFileSync(p, JSON.stringify(evt) + '\n');
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function firstWord(s) {
  const t = (s || '').trimStart();
  const i = t.search(/\s/);
  return (i < 0 ? t : t.slice(0, i)).slice(0, 32);
}

function countWords(s) {
  const t = (s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

function parseSlash(prompt) {
  const fw = firstWord(prompt);
  if (!fw.startsWith('/')) return { is_slash_command: false };
  const firstLine = (prompt || '').split('\n')[0].trim();
  const parts = firstLine.split(/\s+/);
  const command = parts[0].slice(1);
  const flags = parts.slice(1).filter(p => p.startsWith('-')).slice(0, 6);
  return {
    is_slash_command: true,
    command: command.slice(0, 64),
    args_hint: flags.join(' ').slice(0, 120),
  };
}

function detectCorrection(prompt) {
  return CORRECTION_RE.test((prompt || '').trimStart());
}

function detectAffirmation(prompt) {
  return AFFIRMATION_RE.test((prompt || '').trimStart());
}

// Split a fully-qualified name like "sc:sc-analyze" or "pen-claude-ai:jira-log"
// into { plugin, local }. If there's no colon, plugin is null and the whole
// name is local — caller can decide how to group (report renders null as "core").
function splitPlugin(name) {
  const s = String(name || '');
  const i = s.indexOf(':');
  if (i <= 0) return { plugin: null, local: s };
  return { plugin: s.slice(0, i), local: s.slice(i + 1) };
}

function gcOldSessionState(cwd, maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
  const dir = path.join(usageDir(cwd), '.sessions');
  if (!fs.existsSync(dir)) return;
  const now = Date.now();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const stat = fs.statSync(path.join(dir, f));
      if (now - stat.mtimeMs > maxAgeMs) fs.rmSync(path.join(dir, f));
    } catch { /* non-fatal */ }
  }
}

function makeInitialSessionState(sid, source, ts) {
  return {
    session_id:    sid,
    started_at:    ts,
    last_touch_at: ts,
    source,
    user_prompts:  0,
    corrections:   0,
    agent_spawns:  {},
    skill_invokes: {},
    tool_calls:    {},
  };
}

function bumpSession(cwd, sid, mutate) {
  const p = sessionStateFile(cwd, sid);
  const ts = new Date().toISOString();
  const s = readJson(p) || makeInitialSessionState(sid, 'unknown', ts);
  mutate(s);
  s.last_touch_at = ts;
  writeJson(p, s);
  return s;
}

function onSessionStart(evt) {
  const cwd = evt.cwd || process.cwd();
  const sid = evt.session_id || 'unknown';
  const ts  = new Date().toISOString();

  gcOldSessionState(cwd);

  const p = sessionStateFile(cwd, sid);
  if (!fs.existsSync(p)) {
    writeJson(p, makeInitialSessionState(sid, evt.source || 'startup', ts));
  }

  appendEvent(cwd, {
    ts,
    event:      'session_start',
    session_id: sid,
    cwd,
    source:     evt.source || 'startup',
  });
}

function onUserPromptSubmit(evt) {
  const cwd    = evt.cwd || process.cwd();
  const sid    = evt.session_id || 'unknown';
  const prompt = evt.prompt || '';
  const ts     = new Date().toISOString();

  const slash       = parseSlash(prompt);
  const correction  = detectCorrection(prompt);
  const affirmation = detectAffirmation(prompt);
  // Correction wins when both fire — "no, yes that fixes it" is still a
  // course correction signal that warrants attention in the rollup.
  const sentiment = correction ? 'correction'
                  : affirmation ? 'affirmation'
                  : 'neutral';

  const ev = {
    ts,
    event:            'user_prompt',
    session_id:       sid,
    prompt_len:       prompt.length,
    word_count:       countWords(prompt),
    first_word:       firstWord(prompt),
    is_slash_command: slash.is_slash_command,
    correction_signal:  correction,
    affirmation_signal: affirmation,
    sentiment,
  };
  if (slash.is_slash_command) {
    ev.command   = slash.command;
    ev.args_hint = slash.args_hint;
    // Plugin dimension for slash commands too — "/sc:sc-analyze" → sc.
    const parts = splitPlugin(slash.command);
    if (parts.plugin) {
      ev.command_plugin      = parts.plugin;
      ev.command_local_name  = parts.local;
    }
  }
  appendEvent(cwd, ev);

  bumpSession(cwd, sid, s => {
    s.user_prompts = (s.user_prompts || 0) + 1;
    if (correction) s.corrections = (s.corrections || 0) + 1;
    if (affirmation) s.affirmations = (s.affirmations || 0) + 1;
    // One-shot correlation slot for trigger provenance. Cleared (to null)
    // at every new user_prompt so a stale slash can't leak into the next
    // turn's skill_invoke. The next PreToolUse(Skill) consumes it.
    s.pending_slash_skill = slash.is_slash_command ? slash.command : null;
  });
}

function onPreToolUse(evt) {
  const cwd   = evt.cwd || process.cwd();
  const sid   = evt.session_id || 'unknown';
  const tool  = evt.tool_name || '';
  const input = evt.tool_input || {};
  const ts    = new Date().toISOString();
  if (!tool) return;

  let agentType = null;
  let skillName = null;
  let triggerForSkill = null;  // populated via session-state side effect

  if (tool === 'Task') {
    agentType = (input.subagent_type || 'unknown').slice(0, 64);
    const parts = splitPlugin(agentType);
    const spawn = {
      ts,
      event:           'agent_spawn',
      session_id:      sid,
      agent_type:      agentType,
      description_len: (input.description || '').length,
    };
    if (parts.plugin) {
      spawn.agent_plugin     = parts.plugin;
      spawn.agent_local_name = parts.local;
    }
    appendEvent(cwd, spawn);
  } else if (tool === 'Skill') {
    skillName = (input.skill || input.name || 'unknown').slice(0, 128);
    const parts = splitPlugin(skillName);
    // Correlate with the most recent user_prompt in this session. If the
    // user typed `/<skillName>`, the pending slot will match — consume it
    // so only the first matching skill_invoke in the turn is user_slash.
    const state = readJson(sessionStateFile(cwd, sid));
    const pending = state && state.pending_slash_skill;
    triggerForSkill = (pending && pending === skillName) ? 'user_slash' : 'model_auto';

    const invoke = {
      ts,
      event:      'skill_invoke',
      session_id: sid,
      skill_name: skillName,
      trigger:    triggerForSkill,
    };
    if (parts.plugin) {
      invoke.skill_plugin     = parts.plugin;
      invoke.skill_local_name = parts.local;
    }
    appendEvent(cwd, invoke);
  }

  bumpSession(cwd, sid, s => {
    s.tool_calls[tool] = (s.tool_calls[tool] || 0) + 1;
    if (agentType) s.agent_spawns[agentType] = (s.agent_spawns[agentType] || 0) + 1;
    if (skillName) {
      s.skill_invokes[skillName] = (s.skill_invokes[skillName] || 0) + 1;
      // Consume the pending slot after we've decided trigger — any
      // subsequent Skill call in the same turn is model_auto by design.
      if (triggerForSkill === 'user_slash') s.pending_slash_skill = null;
    }
  });
}

function readJsonl(p) {
  if (!p || !fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function extractInsights(transcript) {
  const out = [];
  for (const m of transcript) {
    if (!m || m.type !== 'assistant' || !m.message) continue;
    const content = m.message.content;
    const blocks = Array.isArray(content)
      ? content
      : (typeof content === 'string' ? [{ type: 'text', text: content }] : []);
    for (const b of blocks) {
      if (!b || b.type !== 'text' || !b.text) continue;
      const re = new RegExp(INSIGHT_RE.source, 'g');
      let match;
      while ((match = re.exec(b.text)) !== null) {
        const body = match[1].trim();
        if (body.length < 10 || body.length > 3000) continue;
        out.push({
          text: body,
          length: body.length,
          hash: crypto.createHash('sha256').update(body).digest('hex').slice(0, 16),
          model: m.message.model || null,
        });
      }
    }
  }
  return out;
}

function findRunIndexEntry(cwd, runId) {
  const p = path.join(cwd, '.claude', 'metrics', 'runs', '_index.jsonl');
  if (!fs.existsSync(p)) return null;
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.runId === runId) return entry;
    } catch { /* skip */ }
  }
  return null;
}

function onStop(evt) {
  const cwd = evt.cwd || process.cwd();
  const sid = evt.session_id || 'unknown';
  const ts  = new Date().toISOString();

  const sf = sessionStateFile(cwd, sid);
  const s  = readJson(sf);
  if (!s) return;

  const started = new Date(s.started_at).getTime();
  const nowMs   = new Date(ts).getTime();

  appendEvent(cwd, {
    ts,
    event:             'response_end',
    session_id:        sid,
    duration_ms:       Math.max(0, nowMs - started),
    user_prompts:      s.user_prompts,
    corrections:       s.corrections,
    agent_spawn_total: Object.values(s.agent_spawns || {}).reduce((a, b) => a + b, 0),
    skill_invoke_total: Object.values(s.skill_invokes || {}).reduce((a, b) => a + b, 0),
    tool_call_total:   Object.values(s.tool_calls || {}).reduce((a, b) => a + b, 0),
  });

  const transcript = readJsonl(evt.transcript_path);
  if (transcript.length) {
    const allInsights = extractInsights(transcript);
    const seen = new Set(s.seen_insight_hashes || []);
    const newOnes = allInsights.filter(i => !seen.has(i.hash));

    if (newOnes.length) {
      const insightsFile = path.join(usageDir(cwd), 'insights.jsonl');
      for (const ins of newOnes) {
        const record = {
          ts,
          event:      'insight_captured',
          session_id: sid,
          hash:       ins.hash,
          length:     ins.length,
          model:      ins.model,
          text:       ins.text,
        };
        appendEvent(cwd, record);
        fs.appendFileSync(insightsFile, JSON.stringify(record) + '\n');
        seen.add(ins.hash);
      }
      bumpSession(cwd, sid, st => {
        st.seen_insight_hashes = [...seen].slice(-500);
        st.insights_collected = (st.insights_collected || 0) + newOnes.length;
      });
    }
  }

  const run = findRunIndexEntry(cwd, sid);
  if (run) {
    appendEvent(cwd, {
      ts,
      event:           'forge_run_end',
      session_id:      sid,
      runId:           run.runId,
      scenario:        run.scenario,
      agents:          run.agents,
      agents_count:    run.agents_count,
      total_usd:       run.total_usd,
      total_turns:     run.total_turns,
      total_in_tokens: run.total_in_tokens,
      total_out_tokens: run.total_out_tokens,
      cache_hit_rate:  run.cache_hit_rate,
      wall_ms:         run.wall_ms,
      model_mix:       run.model_mix,
      tool_mix:        run.tool_mix,
    });
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  process.stdout.write(raw);
  if (isDisabled()) process.exit(0);

  let evt;
  try { evt = JSON.parse(raw); } catch { process.exit(0); }
  if (!evt || typeof evt !== 'object') process.exit(0);

  try {
    switch (evt.hook_event_name) {
      case 'SessionStart':     onSessionStart(evt);     break;
      case 'UserPromptSubmit': onUserPromptSubmit(evt); break;
      case 'PreToolUse':       onPreToolUse(evt);       break;
      case 'Stop':             onStop(evt);             break;
    }
  } catch { /* never block */ }
  process.exit(0);
});
