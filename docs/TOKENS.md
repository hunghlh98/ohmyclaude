# TOKENS.md — Cost Transparency

A `/forge` run is not free. This doc shows what you're actually paying for and the levers that move the bill.

> **Caveat**: Prices are Anthropic list pricing at writing (April 2026). Check [anthropic.com/pricing](https://www.anthropic.com/pricing) for current rates. This doc is a model for reasoning about cost, not an invoice.

---

## Model Pricing (reference)

| Model | Input $/M tokens | Output $/M tokens | Relative |
|---|---:|---:|---:|
| Haiku 4.5 | $1 | $5 | 1× |
| Sonnet 4.6 | $3 | $15 | 3× |
| Opus 4.7 | $15 | $75 | 5× |

Prompt caching reduces input cost on cache-hit by **~90%** (cache reads) but adds ~**25%** on cache writes. TTL is 5 minutes.

---

## What a `/forge` Run Pays For

Every run loads at least:

| Surface | Size | Tokens (≈) |
|---|---:|---:|
| `/forge` command prompt | 266 lines | ~2,700 |
| Project `CLAUDE.md` | 157 lines | ~1,500 |
| Agent system prompt (per spawned agent) | ~230 lines avg | **~2,300 each** |
| Skill SKILL.md (per loaded skill, capped at 400) | ≤400 lines | ≤500 each |
| README.md (when referenced) | 180 lines | ~1,100 |
| Codebase context (discovery + file reads) | — | ~5–30 K |

A **complex-feature** run spawns all 11 agents across waves (10 pre-v3.0.0 + @val-evaluator). At ~2,300 tokens per agent × 11 = **~25 K tokens of system-prompt surface** if every agent is active in the team. Prompt caching (5-min TTL) drops re-reads to ~10% of that; the first load still pays full. The +1 agent (@val-evaluator, ~250L prompt) is the cost the harness paper's GAN pattern accepts in exchange for structural separation of generator and verdict — see `agents/val-evaluator.md` "Cost Posture".

---

## Four Canonical Scenarios

| Scenario | Agents spawned | Input tokens | Output tokens | Est. cost |
|---|---|---:|---:|---:|
| **A. `/forge commit`** (inline, no team) | 0 | ~5 K | ~0.3 K | **~$0.02** |
| **B. Fast-track** ("add rate limit") | paige + beck + quinn + stan (4 sonnet) | ~40–60 K | ~5–10 K | **~$0.25–$0.40** |
| **C. Complex feature** (full chain) | all 11, inc. artie-arch on opus + val-evaluator on sonnet | ~85–130 K | ~12–17 K | **~$0.85–$1.40** |
| **D. Sprint `--size 3`** | ~3 × Scenario C, partial cache reuse | ~200–280 K | ~25–40 K | **~$1.50–$3.00** |

### Worked example: Scenario C (complex feature, $0.90 typical)

- Sonnet agents (9 agents incl. @val-evaluator): ~65 K input × $3/M + ~13 K output × $15/M → $0.20 + $0.20 = **$0.40**
- Opus @artie-arch: ~15 K input × $15/M + ~5 K output × $75/M → $0.23 + $0.38 = **$0.61**  ← the expensive one
- Haiku @devon-ops: ~4 K input × $1/M + ~1 K output × $5/M → ~**$0.01**
- Total: **~$1.02** (vs ~$0.98 pre-v3.0.0; +$0.04 incremental for @val-evaluator's contract-sign + grading invocations)

Without Opus on @artie-arch (running it on Sonnet for simple features): total drops to ~**$0.45–0.65**. That's the single biggest lever — bigger than the +$0.04 GAN-pattern cost.

---

## Cost-Driver Ranking

| # | Driver | Why it matters | Lever |
|---|---|---|---|
| 1 | `@artie-arch` on **Opus** | 5× the price of Sonnet agents; every complex-feature path hits it. | Gate Opus to truly architectural work; default to Sonnet for simple designs. Planned in `PLAN-001` Phase 6 (task 37). |
| 2 | **Agent system-prompt** tokens | 11 agents × ~2,300 tokens = ~25 K of resident system surface at peak. | Caching helps; trimming helps more. v2.6.0 pruned stan-standards (-62L) and dedup'd routing tables; future passes can target Beck/Effie/Una. |
| 3 | **Exploration fallback** to Glob/Grep | Without `code-review-graph`, agents re-scan the tree. | Install `code-review-graph`. Zero-config fallback, but pays off. |
| 4 | **Artifact writes** (PRD + SDD + CODE-REVIEW) | 6–12 K output tokens per feature × $15/M on Sonnet = $0.09–$0.18 of output cost. | Keep artifacts lean; defer verbose reference material to skill `references/` instead of inlining. |
| 5 | **Hooks** | Zero token cost (they run local Node) but add wall-clock (5–30 s timeouts). | Keep `async: true` where possible. |

---

## Levers to Pull

### Free wins

1. **Install `code-review-graph`** — agents explore via semantic graph instead of scanning the tree with Grep/Glob. Typical saving: 30–50% input reduction on large repos. Zero-setup penalty if absent — the `code-review-graph-setup` SessionStart hook detects `uv` presence and writes state to `local.yaml`; missing `uv` yields a one-line notice with install instructions, not a crash.
2. **Let prompt caching work** — spawn all the agents you need inside one Team, so their system prompts hit the cache on re-invocation. Avoid splitting a task across separate `/forge` calls if they'd reuse the same agents.
3. **Use `/forge commit` for commits** — it's Scenario A ($0.02). Don't spawn a full team for a commit message.

### Medium wins

4. **Trim `@artie-arch`'s use** — reserve it for Route D (complex features). For a README update or a CRUD endpoint, `@paige-product` can skip architecture.
5. **Keep agent descriptions ≤30 words** — they load on every auto-trigger attempt, not just when the agent is spawned. Bloat here is expensive. `validate.js` does not yet enforce this; planned in PLAN-001 Phase 6.
6. **Write lean artifacts** — a 500-token SDD is clearer than a 3,000-token one. Output tokens are the expensive half of a Sonnet call.

### Structural wins (applied in v2.0.0)

7. **Keep SuperClaude surface small.** v2.0.0 removed 8 verb-wrapper skills (`sc-analyze`, `sc-build`, `sc-design`, `sc-document`, `sc-implement`, `sc-improve`, `sc-test`, `sc-troubleshoot`) that duplicated agent docstrings. Agents invoke verbs inline. The 5 remaining SC skills (`sc-spec-panel`, `sc-brainstorm`, `sc-pm`, `sc-research`, `sc-estimate`) encode named methodologies worth loading on-demand.
8. **Cap SKILL.md at 400 lines.** Enforced by `validate.js` in v2.0.0. Depth lives in `references/`, loaded only when agents drill in.

### Observability (shipped in v1.2.0)

9. The `cost-profiler` hook (SubagentStop + Stop events) writes per-run `PROFILE-<runId>.md` to `.claude/.ohmyclaude/pipeline/` and a rolling `.claude/.ohmyclaude/metrics/baseline.json` (N=20).

   **What lands in `PROFILE-<runId>.md`**: per-agent row with model, turns, in/out tokens, cache hit rate, USD, and any tripped anomaly flags.

   **What the baseline captures**: rolling N=20 means + p95 per scenario (full-app, feature, hotfix, docs) and per agent.

   **Anomaly flags** (any tripped flag surfaces on @paige-product's shutdown summary):
   - `turn_explosion` — agent burned more turns than p95 + tolerance for that agent/scenario.
   - `cost_over_p95` — total USD for the run exceeded the rolling p95 for its scenario.
   - `cache_miss_spike` — cache-hit rate dropped below baseline, indicating TTL churn or prompt drift.
   - `opus_budget_breach` — Opus USD on this run exceeded its scenario-specific ceiling.

   **Calibration**: `skills/profile-run --calibrate` diffs recent (≤30d) vs prior (30–90d) per-scenario means and flags drift >25%. Use when you suspect the baseline is stale.

---

## How to Read This Cost Model

- **One-time spawn** ≠ per-message. Sonnet at $3/M is cheap per token; the system prompt amortizes across many tool calls within the same spawn.
- **Big jumps come from model tier, not prompt length.** Moving one agent from Sonnet to Opus is a bigger cost than adding 5 K tokens to every Sonnet agent.
- **Output >> input per token.** A Sonnet output token is 5× an input token. Artifacts are output-heavy.
- **Caching is not free.** Cache writes cost 25% more than raw inputs. The economics only work when you re-read the cached block within 5 min.

---

## See Also

- `docs/OPERATING.md` — per-agent model assignment (the primary cost knob).
- `ROADMAP.md` — planned cost-related hooks and optimizations.
- `.claude/pipeline/PLAN-001.md` — Phase 4 ships the cost tracker; Phase 6 is the cost-cut pass.
