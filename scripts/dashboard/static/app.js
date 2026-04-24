"use strict";

// ── client-side logging ────────────────────────────────────────────────────
// Captures console.error, uncaught errors, unhandled promise rejections, and
// manual logs. POSTs to /api/log (server persists under
// scripts/dashboard/logs/dashboard.log). In-memory ring buffer powers the
// Logs tab; a "refresh" action fetches the server tail on demand.
const LOG_BUFFER = [];
const LOG_BUFFER_MAX = 500;
const LOG_STATE = {
  source: "client",   // "client" | "server"
  filter: "all",      // "all" | "error" | "warn" | "info"
  serverTail: [],
  unseenErrors: 0,
};

function pushLog(level, message, extra) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message: String(message == null ? "" : message),
    stack:   extra && extra.stack ? String(extra.stack) : "",
    url:     location.href,
    context: extra && extra.context ? extra.context : null,
  };
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > LOG_BUFFER_MAX) LOG_BUFFER.shift();

  if (level === "error" && !isDrawerOpen()) {
    LOG_STATE.unseenErrors += 1;
    updateDrawerBadge();
  }
  if (isDrawerOpen() && LOG_STATE.source === "client") renderLogs();

  // Best-effort POST; do not await, do not throw (logging must never fail).
  try {
    fetch("/api/log", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// Wrap console.error so stray stack traces get captured.
(function wrapConsole() {
  const origError = console.error.bind(console);
  const origWarn  = console.warn.bind(console);
  console.error = function (...args) {
    try {
      const msg = args.map((a) => (a && a.stack) ? a.stack : String(a)).join(" ");
      pushLog("error", msg);
    } catch {}
    return origError(...args);
  };
  console.warn = function (...args) {
    try { pushLog("warn", args.map(String).join(" ")); } catch {}
    return origWarn(...args);
  };
})();

window.addEventListener("error", (e) => {
  pushLog("error", e.message || "window error", {
    stack: (e.error && e.error.stack) || "",
    context: { filename: e.filename, lineno: e.lineno, colno: e.colno },
  });
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  const msg    = reason && reason.message ? reason.message : String(reason);
  const stack  = reason && reason.stack   ? reason.stack   : "";
  pushLog("error", "unhandledrejection: " + msg, { stack });
});


// Chart.js global defaults — dark theme + no-animation (perf)
(function setChartDefaults() {
  function apply() {
    if (!window.Chart) return false;
    Chart.defaults.color = "#8b949e";
    Chart.defaults.borderColor = "#30363d";
    Chart.defaults.font.family =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    Chart.defaults.font.size = 11;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.responsive = true;
    Chart.defaults.animation = false;        // 6 charts × animated resizes = visible stutter
    Chart.defaults.plugins.legend.display = false;  // per-chart opt-in
    return true;
  }
  if (!apply()) window.addEventListener("load", apply);
})();

// Defensive caps — a 36-row horizontal bar renders tiny labels and chews CPU.
const MAX_BAR_ROWS = 12;

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
  // cap to prevent unreadable / slow charts
  if (labels.length > MAX_BAR_ROWS) {
    labels = labels.slice(0, MAX_BAR_ROWS);
    data   = data.slice(0, MAX_BAR_ROWS);
  }
  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color, borderWidth: 0 }] },
    options: {
      indexAxis: horizontal ? "y" : "x",
      scales: {
        x: { grid: { color: "#30363d" }, ticks: { autoSkip: true, maxRotation: 0 } },
        y: { grid: { color: "#30363d" }, ticks: { autoSkip: false } },
      },
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
      plugins: {
        legend: { display: true, position: "right", labels: { boxWidth: 10 } },
      },
      cutout: "55%",
    },
  });
}
function drawLine(canvasId, points) {
  const ctx = el(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  // for very dense timelines, thin to ~40 points to keep rendering cheap
  const maxPts = 40;
  const sampled = points.length > maxPts
    ? points.filter((_, i) => i % Math.ceil(points.length / maxPts) === 0)
    : points;
  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: sampled.map((p) => fmtTs(p.ts)),
      datasets: [{
        data: sampled.map((p) => p.total_usd),
        borderColor: PALETTE[1],
        backgroundColor: "rgba(96,165,250,0.15)",
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: PALETTE[0],
      }],
    },
    options: {
      scales: {
        y: {
          ticks: { callback: (v) => `$${Number(v).toFixed(2)}` },
          grid: { color: "#30363d" },
        },
        x: { grid: { color: "#30363d" }, ticks: { autoSkip: true, maxTicksLimit: 6 } },
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
  let r;
  try {
    r = await fetch(url);
  } catch (networkErr) {
    pushLog("error", `fetch network failed: ${networkErr.message}`, {
      stack: networkErr.stack || "",
      context: { url },
    });
    throw networkErr;
  }
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const body = await r.json();
      if (body && body.error) msg = body.error;
    } catch {}
    pushLog("error", `fetch ${url} → ${msg}`, { context: { url, status: r.status } });
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
    renderInsightsTab(summary.insights);
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

  // tool mix — vertical bar shows top tool names; the two lines below
  // split Bash into first-token subtypes (grep/find/tree/…) and list MCP
  // tools separately so "is my graph backend invoked?" is a glance away.
  const topTools = s.tool_mix.slice(0, 12);
  drawBar(
    "chart-tools",
    topTools.map((t) => t.name),
    topTools.map((t) => t.count),
    PALETTE[2],
    false,
  );
  const bash = (s.bash_cmd_mix || []).slice(0, 8);
  el("bash-breakdown").innerHTML = bash.length
    ? `<strong>Bash:</strong> ${bash.map((b) => `${esc(b.name)}:${b.count}`).join(" · ")}`
    : "";
  const mcp = s.mcp_mix || [];
  const mcpTotal = mcp.reduce((a, b) => a + b.count, 0);
  el("mcp-breakdown").innerHTML = mcpTotal > 0
    ? `<strong>MCP:</strong> ${mcp.slice(0, 6).map((m) => `${esc(m.name.replace(/^mcp__/, ""))}:${m.count}`).join(" · ")}`
    : `<strong>MCP:</strong> <span style="color:#f59e0b">0 calls</span> — no MCP tool fired across ${s.totals.forge_runs} run${s.totals.forge_runs === 1 ? "" : "s"}`;

  // "Was offered but never called" — the dead surface area of your
  // installed plugins. Tooltip shows the full unused list so you can
  // decide whether to uninstall, promote the skill in its description,
  // or route an agent to it.
  const off = s.offered || {};
  const tn  = off.tools_count  || 0;
  const sn  = off.skills_count || 0;
  if (tn || sn) {
    const unusedT = (off.unused_tools  || []).filter((x) => !x.startsWith("mcp__claude_ai_")); // auth endpoints are noise
    const unusedS = off.unused_skills || [];
    const tooltip = [
      unusedT.length ? `Unused tools (${unusedT.length}):\n  ${unusedT.join("\n  ")}` : "",
      unusedS.length ? `Unused skills (${unusedS.length}):\n  ${unusedS.join("\n  ")}` : "",
    ].filter(Boolean).join("\n\n") || "all offered surfaces were used";
    el("offer-breakdown").setAttribute("title", tooltip);
    el("offer-breakdown").innerHTML =
      `<strong>Offered:</strong> ${(off.tools_called || 0)}/${tn} tools · ${(off.skills_called || 0)}/${sn} skills called ` +
      `<span class="dim">(hover for unused list)</span>`;
  } else {
    el("offer-breakdown").innerHTML = "";
  }

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

// ── insights tab ───────────────────────────────────────────────────
const INSIGHT_STATE = {
  data: null,        // {total, unique, per_session, keywords, recent}
  activeTheme: null, // string | null
  query: "",
};

function renderInsightsTab(insights) {
  INSIGHT_STATE.data = insights;
  el("i-total").textContent       = insights.total;
  el("i-unique").textContent      = insights.unique;
  el("i-per-session").textContent = insights.per_session;
  const dups = insights.total - insights.unique;
  el("i-unique-sub").textContent =
    dups > 0 ? `after SHA-256 dedup (−${dups} dupes)` : "after SHA-256 dedup";

  const themesEl = el("insights-themes");
  if (!insights.keywords || !insights.keywords.length) {
    themesEl.innerHTML = '<span class="dim">no themes yet</span>';
  } else {
    themesEl.innerHTML = insights.keywords
      .map((k) => {
        const active = INSIGHT_STATE.activeTheme === k.keyword ? " active" : "";
        return `<span class="theme-pill${active}" data-theme="${esc(k.keyword)}">${esc(k.keyword)}<span class="count">${k.count}</span></span>`;
      })
      .join("");
  }
  renderInsightCards();
}

function renderInsightCards() {
  const data = INSIGHT_STATE.data;
  const wrap = el("insights-cards");
  if (!wrap || !data) return;

  const theme = INSIGHT_STATE.activeTheme ? INSIGHT_STATE.activeTheme.toLowerCase() : null;
  const query = INSIGHT_STATE.query.trim().toLowerCase();

  const items = (data.recent || []).filter((i) => {
    const text = (i.text || "").toLowerCase();
    if (theme && !text.includes(theme)) return false;
    if (query && !text.includes(query)) return false;
    return true;
  });

  el("insights-result-count").textContent =
    data.recent && data.recent.length
      ? `${items.length} of ${data.recent.length}`
      : "";
  el("insights-clear-theme").classList.toggle("hidden", !INSIGHT_STATE.activeTheme);

  if (!items.length) {
    wrap.innerHTML = data.recent && data.recent.length
      ? '<div class="dim empty">no matches</div>'
      : '<div class="dim empty">no ★ Insight blocks captured yet — enable Explanatory output style in Claude Code.</div>';
    return;
  }

  wrap.innerHTML = items.map((i) => {
    let body = esc(i.text || "");
    const highlights = [theme, query].filter(Boolean);
    for (const h of highlights) {
      const re = new RegExp(`(${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      body = body.replace(re, "<mark>$1</mark>");
    }
    const sid = (i.session_id || "").slice(0, 8);
    return `<div class="insight-card">
      <div class="i-meta">
        <span>${esc(fmtTs(i.ts))}</span>
        <span>session ${esc(sid)}</span>
      </div>
      <div class="i-body">${body}</div>
    </div>`;
  }).join("");
}

// ── settings drawer + tabs ─────────────────────────────────────────
function isDrawerOpen() {
  const d = el("settings-drawer");
  return d && !d.classList.contains("hidden");
}

function updateDrawerBadge() {
  const badge = el("gear-badge");
  if (!badge) return;
  if (LOG_STATE.unseenErrors > 0) {
    badge.textContent = String(LOG_STATE.unseenErrors);
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function openDrawer() {
  el("settings-drawer").classList.remove("hidden");
  el("drawer-backdrop").classList.remove("hidden");
  el("gear-btn").classList.add("open");
  LOG_STATE.unseenErrors = 0;
  updateDrawerBadge();
  renderLogs();
}

function closeDrawer() {
  el("settings-drawer").classList.add("hidden");
  el("drawer-backdrop").classList.add("hidden");
  el("gear-btn").classList.remove("open");
}

function activateTab(name) {
  document.querySelectorAll(".tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === name);
  });
  document.querySelectorAll(".tab-content").forEach((c) => {
    c.classList.toggle("hidden", c.id !== `tab-${name}`);
  });
}

function normalizeEntry(e, source) {
  return {
    ts:      source === "server" ? (e.server_ts || e.client_ts || "") : (e.ts || ""),
    level:   (e.level || "info").toLowerCase(),
    message: e.message || "",
    stack:   e.stack || "",
    context: e.context || null,
    url:     e.url || "",
    source,
  };
}

function renderLogs() {
  const body = el("log-body");
  const count = el("log-count");
  if (!body) return;

  const entries = (LOG_STATE.source === "server" ? LOG_STATE.serverTail : LOG_BUFFER)
    .map((e) => normalizeEntry(e, LOG_STATE.source));

  const filtered = LOG_STATE.filter === "all"
    ? entries
    : entries.filter((e) => e.level === LOG_STATE.filter);

  const errs = entries.filter((e) => e.level === "error").length;
  const warns = entries.filter((e) => e.level === "warn").length;
  if (count) {
    count.textContent = entries.length
      ? `${entries.length} entries · ${errs} errors · ${warns} warns`
      : "(empty)";
  }

  if (!filtered.length) { body.innerHTML = ""; return; }

  body.innerHTML = filtered.slice(-500).reverse().map((e) => {
    const oneLine = (e.message || "").replace(/\s+/g, " ").trim();
    const hasDetail = !!(e.stack || e.context || (e.message || "").includes("\n"));
    const caret = hasDetail ? '<span class="log-caret">▸</span>' : '<span class="log-caret" style="visibility:hidden">▸</span>';
    const stack = e.stack ? `<div class="log-stack">${esc(e.stack)}</div>` : "";
    const ctx = e.context
      ? `<div class="log-ctx">${esc(JSON.stringify(e.context))}</div>`
      : "";
    const detail = hasDetail
      ? `<div class="log-detail"><div class="log-full">${esc(e.message)}</div>${stack}${ctx}</div>`
      : "";
    return `<div class="log-entry" data-expandable="${hasDetail ? '1' : '0'}">
      <div class="log-line">
        <span class="log-ts">${esc((e.ts || "").slice(11, 19))}</span>
        <span class="log-src">${esc(e.source)}</span>
        <span class="log-level ${esc(e.level)}">${esc(e.level)}</span>
        <span class="log-msg">${esc(oneLine)}</span>
        ${caret}
      </div>
      ${detail}
    </div>`;
  }).join("");
}

async function refreshServerLogs() {
  const body = el("log-body");
  if (LOG_STATE.source !== "server") return;
  body.innerHTML = '<div class="dim">fetching server log…</div>';
  try {
    LOG_STATE.serverTail = await fetchJson("/api/logs?tail=500");
    renderLogs();
  } catch (err) {
    body.innerHTML = `<div class="dim">failed to fetch: ${esc(err.message)}</div>`;
  }
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
    pushLog("info", `loading path: ${v}`);
    loadPath(v);
  });
  el("reload-btn").addEventListener("click", () => {
    if (currentPath) {
      pushLog("info", `reload: ${currentPath}`);
      loadPath(currentPath);
    }
  });
  el("run-detail-close").addEventListener("click", () => {
    el("run-detail-panel").hidden = true;
  });

  // tab switching
  document.querySelectorAll(".tab").forEach((b) => {
    b.addEventListener("click", () => activateTab(b.dataset.tab));
  });

  // gear / settings drawer
  el("gear-btn").addEventListener("click", () => {
    if (isDrawerOpen()) closeDrawer(); else openDrawer();
  });
  el("drawer-close").addEventListener("click", closeDrawer);
  el("drawer-backdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isDrawerOpen()) closeDrawer();
  });

  // insights tab controls (theme filter + search)
  el("insights-themes").addEventListener("click", (e) => {
    const pill = e.target.closest(".theme-pill");
    if (!pill || !pill.dataset.theme) return;
    const kw = pill.dataset.theme;
    INSIGHT_STATE.activeTheme = INSIGHT_STATE.activeTheme === kw ? null : kw;
    renderInsightsTab(INSIGHT_STATE.data);
  });
  el("insights-clear-theme").addEventListener("click", () => {
    INSIGHT_STATE.activeTheme = null;
    renderInsightsTab(INSIGHT_STATE.data);
  });
  el("insights-search").addEventListener("input", (e) => {
    INSIGHT_STATE.query = e.target.value;
    renderInsightCards();
  });

  // Dashboard logs (inside Settings drawer): source + level filters
  document.querySelectorAll(".seg-btn[data-source]").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn[data-source]")
        .forEach((x) => x.classList.toggle("active", x === b));
      LOG_STATE.source = b.dataset.source;
      if (LOG_STATE.source === "server" && !LOG_STATE.serverTail.length) {
        refreshServerLogs();
      } else {
        renderLogs();
      }
    });
  });
  document.querySelectorAll(".seg-btn[data-filter]").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn[data-filter]")
        .forEach((x) => x.classList.toggle("active", x === b));
      LOG_STATE.filter = b.dataset.filter;
      renderLogs();
    });
  });
  el("log-clear").addEventListener("click", () => {
    LOG_BUFFER.length = 0;
    LOG_STATE.unseenErrors = 0;
    updateLogsBadge();
    if (LOG_STATE.source === "client") renderLogs();
  });
  // click-to-expand for log rows (delegated; one listener for all entries)
  el("log-body").addEventListener("click", (e) => {
    const row = e.target.closest(".log-entry");
    if (!row || row.dataset.expandable !== "1") return;
    row.classList.toggle("expanded");
  });
  el("log-refresh").addEventListener("click", () => {
    if (LOG_STATE.source === "server") refreshServerLogs();
    else renderLogs();
  });

  // surface the actual server log path if health returns it
  fetchJson("/api/health").then((h) => {
    if (h && h.log_file) {
      const pathEl = el("log-file-path");
      if (pathEl) pathEl.textContent = h.log_file;
    }
  }).catch(() => {});

  pushLog("info", "dashboard boot");

  // Auto-load if a saved path exists
  if (input.value.trim()) form.requestSubmit();
});
