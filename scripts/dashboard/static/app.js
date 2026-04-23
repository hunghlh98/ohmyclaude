"use strict";

// Chart.js global defaults — dark theme
(function setChartDefaults() {
  function apply() {
    if (!window.Chart) return false;
    Chart.defaults.color = "#8b949e";
    Chart.defaults.borderColor = "#30363d";
    Chart.defaults.font.family =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    Chart.defaults.font.size = 11;
    Chart.defaults.maintainAspectRatio = false;
    return true;
  }
  if (!apply()) window.addEventListener("load", apply);
})();

const PALETTE = [
  "#6ee7b7", "#60a5fa", "#f59e0b", "#f472b6",
  "#a78bfa", "#34d399", "#fbbf24", "#fb7185",
  "#22d3ee", "#c084fc", "#4ade80", "#e879f9",
];

const el  = (id) => document.getElementById(id);
const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );

function fmtMs(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m${rs ? " " + rs + "s" : ""}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h${rm ? " " + rm + "m" : ""}`;
}
function fmtUsd(n) { return `$${(n || 0).toFixed(4)}`; }
function fmtPct(f) { return `${((f || 0) * 100).toFixed(1)}%`; }
function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

const charts = {};
function drawBar(canvasId, labels, data, color = PALETTE[0], horizontal = true) {
  const ctx = el(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color, borderWidth: 0 }] },
    options: {
      indexAxis: horizontal ? "y" : "x",
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: "#30363d" } }, y: { grid: { color: "#30363d" } } },
    },
  });
}
function drawPie(canvasId, labels, data) {
  const ctx = el(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: PALETTE, borderWidth: 0 }] },
    options: {
      plugins: { legend: { position: "right", labels: { boxWidth: 10 } } },
      cutout: "55%",
    },
  });
}
function drawLine(canvasId, points) {
  const ctx = el(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map((p) => fmtTs(p.ts)),
      datasets: [{
        data: points.map((p) => p.total_usd),
        borderColor: PALETTE[1],
        backgroundColor: "rgba(96,165,250,0.15)",
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: PALETTE[0],
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { callback: (v) => `$${Number(v).toFixed(2)}` },
          grid: { color: "#30363d" },
        },
        x: { grid: { color: "#30363d" } },
      },
    },
  });
}

// ── state ───────────────────────────────────────────────────────────────────
let currentPath = null;

function setStatus(msg, kind = "") {
  const s = el("status");
  s.textContent = msg;
  s.className = "status" + (kind ? " " + kind : "");
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const body = await r.json();
      if (body && body.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

async function loadPath(rawPath) {
  const q = encodeURIComponent(rawPath);
  setStatus("loading…");
  try {
    const [summary, runs] = await Promise.all([
      fetchJson(`/api/summary?path=${q}`),
      fetchJson(`/api/runs?path=${q}`),
    ]);
    currentPath = rawPath;
    renderSummary(summary);
    renderRuns(runs);
    renderInsightsList(summary.insights.recent);
    el("main").classList.remove("hidden");
    setStatus(
      `loaded · ${summary.window.total_events} events · ${summary.totals.forge_runs} runs`,
      "ok",
    );
  } catch (err) {
    setStatus(`load failed: ${err.message}`, "err");
  }
}

// ── rendering ───────────────────────────────────────────────────────────────
function renderSummary(s) {
  const t = s.totals;
  el("c-events").textContent   = s.window.total_events;
  el("c-sessions").textContent = s.window.sessions_started;
  el("c-runs").textContent     = t.forge_runs;
  el("c-usd").textContent      = fmtUsd(t.total_usd);
  el("c-avg-usd").textContent  = fmtUsd(t.avg_usd_per_run);
  el("c-corr").textContent     = fmtPct(t.correction_rate);
  el("c-wall").textContent     = fmtMs(t.total_wall_ms);
  el("c-insights").textContent = t.insights_unique === t.insights_captured
    ? t.insights_captured
    : `${t.insights_captured} (${t.insights_unique} unique)`;

  // cost timeline
  drawLine("chart-cost", s.cost_timeline);

  // agents
  const topAgents = s.agents.fired.slice(0, 10);
  drawBar(
    "chart-agents",
    topAgents.map((a) => "@" + a.name),
    topAgents.map((a) => a.count),
    PALETTE[0],
  );
  el("dead-agents").innerHTML = s.agents.dead.length
    ? `<strong>never spawned (${s.agents.dead.length}/${s.agents.known_total}):</strong> ${s.agents.dead.map((a) => "@" + esc(a)).join(", ")}`
    : `all ${s.agents.known_total} agents have spawned at least once ✓`;

  // skills
  const topSkills = s.skills.fired.slice(0, 10);
  drawBar(
    "chart-skills",
    topSkills.map((s) => s.name),
    topSkills.map((s) => s.count),
    PALETTE[1],
  );
  el("dead-skills").innerHTML = s.skills.dead.length
    ? `<strong>never invoked (${s.skills.dead.length}/${s.skills.known_total}):</strong> ${s.skills.dead.slice(0, 20).map(esc).join(", ")}${s.skills.dead.length > 20 ? ", …" : ""}`
    : `all ${s.skills.known_total} skills have been invoked at least once ✓`;

  // tool mix
  const topTools = s.tool_mix.slice(0, 12);
  drawBar(
    "chart-tools",
    topTools.map((t) => t.name),
    topTools.map((t) => t.count),
    PALETTE[2],
    false,
  );

  // scenarios
  drawPie(
    "chart-scenarios",
    s.scenarios.map((x) => x.name),
    s.scenarios.map((x) => x.count),
  );

  // commands
  drawBar(
    "chart-commands",
    s.commands.slice(0, 10).map((c) => "/" + c.name),
    s.commands.slice(0, 10).map((c) => c.count),
    PALETTE[3],
  );

  // corrections
  const corr = s.corrections.by_preceding_agent.slice(0, 8);
  drawBar(
    "chart-corrections",
    corr.map((c) => "@" + c.name),
    corr.map((c) => c.count),
    PALETTE[6],
  );
  el("corr-rate").textContent =
    `total: ${s.corrections.total} / ${t.user_prompts} prompts (${fmtPct(t.correction_rate)})`;

  // session latency
  const sl = s.session_latency;
  el("session-latency").innerHTML = `
    <div class="lat-box"><div class="lat-label">p50</div><div class="lat-value">${fmtMs(sl.p50_ms)}</div></div>
    <div class="lat-box"><div class="lat-label">p95</div><div class="lat-value">${fmtMs(sl.p95_ms)}</div></div>
    <div class="lat-box"><div class="lat-label">max</div><div class="lat-value">${fmtMs(sl.max_ms)}</div></div>
  `;

  // themes
  el("insight-themes").innerHTML = s.insights.keywords
    .map((k) => `<span class="theme-pill">${esc(k.keyword)}<span class="count">${k.count}</span></span>`)
    .join("");
  el("insights-hint").textContent =
    `${s.insights.total} total · ${s.insights.unique} unique · avg ${s.insights.per_session}/session`;

  // window footer
  el("window-info").textContent =
    `window: ${fmtTs(s.window.first_event)} → ${fmtTs(s.window.last_event)}`;
}

function renderRuns(runs) {
  el("runs-hint").textContent = `${runs.length} total`;
  const body = el("runs-body");
  if (!runs.length) {
    body.innerHTML = '<tr><td colspan="9" class="dim">no runs recorded yet</td></tr>';
    return;
  }
  runs.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""));
  body.innerHTML = runs
    .map((r) => {
      const tools = Object.entries(r.tool_mix || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ");
      return `<tr class="clickable" data-run="${esc(r.runId)}">
        <td>${esc(r.runId).slice(0, 12)}…</td>
        <td>${fmtTs(r.started_at)}</td>
        <td>${esc(r.scenario || "—")}</td>
        <td class="num">${r.agents_count ?? 0}</td>
        <td class="num">${r.total_turns ?? 0}</td>
        <td class="num">${fmtMs(r.wall_ms)}</td>
        <td class="num">${fmtUsd(r.total_usd)}</td>
        <td class="num">${fmtPct(r.cache_hit_rate)}</td>
        <td>${esc(tools)}</td>
      </tr>`;
    })
    .join("");
  body.querySelectorAll("tr.clickable").forEach((tr) => {
    tr.addEventListener("click", () => {
      body.querySelectorAll("tr.selected").forEach((x) => x.classList.remove("selected"));
      tr.classList.add("selected");
      openRunDetail(tr.dataset.run);
    });
  });
}

async function openRunDetail(runId) {
  const panel = el("run-detail-panel");
  const body = el("run-detail-body");
  el("run-detail-id").textContent = runId;
  panel.hidden = false;
  body.innerHTML = '<div class="dim">loading…</div>';
  try {
    const detail = await fetchJson(
      `/api/run/${encodeURIComponent(runId)}?path=${encodeURIComponent(currentPath)}`,
    );
    const snaps = detail.snaps || [];
    if (!snaps.length) {
      body.innerHTML = '<div class="dim">no snapshots for this run</div>';
      return;
    }
    // compute per-agent deltas
    let prev = { in: 0, out: 0, cacheR: 0, cacheW: 0, usd: 0, turns: 0, tool_calls: {} };
    const rows = snaps.map((s) => {
      const c = s.cumulative || {};
      const row = {
        agent:  s.agent,
        model:  c.model,
        turns:  Math.max(0, (c.turns || 0)  - (prev.turns || 0)),
        input:  Math.max(0, (c.in || 0)     - (prev.in || 0)),
        output: Math.max(0, (c.out || 0)    - (prev.out || 0)),
        cacheR: Math.max(0, (c.cacheR || 0) - (prev.cacheR || 0)),
        usd:    Math.max(0, (c.usd || 0)    - (prev.usd || 0)),
        wall_ms: s.wall_ms_since_last,
        tools: {},
      };
      const prevTools = prev.tool_calls || {};
      for (const [k, v] of Object.entries(c.tool_calls || {})) {
        const d = v - (prevTools[k] || 0);
        if (d > 0) row.tools[k] = d;
      }
      prev = c;
      return row;
    });
    const toolsStr = (t) =>
      Object.entries(t || {})
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${v}`)
        .join(" ");
    body.innerHTML = `
      <table class="snap-table">
        <thead><tr>
          <th>agent</th><th>model</th>
          <th class="num">turns</th><th class="num">in</th><th class="num">out</th>
          <th class="num">cacheR</th><th class="num">usd</th><th class="num">wall</th>
          <th>tools</th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${esc(r.agent)}</td>
            <td>${esc(r.model || "—")}</td>
            <td class="num">${r.turns}</td>
            <td class="num">${r.input + r.cacheR}</td>
            <td class="num">${r.output}</td>
            <td class="num">${r.cacheR}</td>
            <td class="num">${fmtUsd(r.usd)}</td>
            <td class="num">${fmtMs(r.wall_ms)}</td>
            <td>${esc(toolsStr(r.tools))}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    body.innerHTML = `<div class="dim">failed: ${esc(err.message)}</div>`;
  }
}

function renderInsightsList(items) {
  const ul = el("insights-list");
  if (!items || !items.length) {
    ul.innerHTML = '<li class="dim">no ★ Insight blocks captured yet — enable Explanatory output style</li>';
    return;
  }
  ul.innerHTML = items
    .map(
      (i) => `<li>
      <div class="insight-meta">${fmtTs(i.ts)} · ${esc((i.session_id || "").slice(0, 8))} · <code>${esc(i.hash)}</code></div>
      <div class="insight-body">${esc(i.text)}</div>
    </li>`,
    )
    .join("");
}

// ── wire up ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const form  = el("path-form");
  const input = el("claude-path");

  // Restore last path from localStorage (cosmetic only; empty by default)
  try {
    const saved = localStorage.getItem("ohmyclaude-dashboard-path");
    if (saved) input.value = saved;
  } catch {}

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    try { localStorage.setItem("ohmyclaude-dashboard-path", v); } catch {}
    loadPath(v);
  });
  el("reload-btn").addEventListener("click", () => {
    if (currentPath) loadPath(currentPath);
  });
  el("run-detail-close").addEventListener("click", () => {
    el("run-detail-panel").hidden = true;
  });

  // Auto-load if a saved path exists
  if (input.value.trim()) form.requestSubmit();
});
