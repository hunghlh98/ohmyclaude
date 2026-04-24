# MIGRATION.md — Upgrading to ohmyclaude 1.0

If you were running **ohmyclaude 0.1 – 0.5**, v1.0.0 is a breaking, harness-engineering overhaul. This doc is the fast path.

Timeline of breaking changes:

| Version | What broke |
|---|---|
| 0.2.x → 0.3.x | Greek-mythology agent names renamed to Corporate Slack personas |
| 0.3.x → 0.4.x | Skills reorganized into 4 categories; sc-adviser / circuit-breaker introduced |
| 0.4.x → 0.5.x | Skill frontmatter tightened; `origin: ohmyclaude` required; skill `name:` must match folder |
| 0.5.x → **1.0.0** | **10-agent consolidation, single `/forge` command, shell-alias removal, Agent Teams** |

This doc focuses on the 0.5 → 1.0 jump. Intermediate migrations can be followed from `CHANGELOG.md`.

---

## 1. Commands

### Retired standalone commands

| Removed | Replacement |
|---|---|
| `/review` | `/forge review <path>` |
| `/debug` | `/forge debug <description>` (or `/forge <debug prompt>` — the router detects it) |
| `/commit` | `/forge commit` |
| `/setup` | **Removed entirely.** Zero-setup model — the plugin works on install with no config. |
| `/ultrawork`, `/plan`, `/scaffold` | Removed in 0.3.0 — `/forge` subsumes them. |

### The one remaining command

```
/forge <natural language>     Smart router (default)
/forge sprint [--size N]      Execute sprint from backlog
/forge release                Cut release
/forge commit                 Generate semantic commit message
/forge help                   Show help
```

---

## 2. Agents — 17 → 10

7 agents were absorbed into others in 1.0.0. Use the new agent.

| Retired agent | Absorbed into | Reason |
|---|---|---|
| `scout-sprint` | **@paige-product** | One router + planner, not two |
| `percy-perf` | **@stan-standards** | Performance review folds into code review with an explicit perf checklist |
| `polyglot-reviewer` | **@stan-standards** | Language-specific checklists are now part of `@stan-standards` (lazy-loaded by file extension) |
| `dora-docs` | **@devon-ops** | Docs, release cut, and announcement are one coherent post-merge phase |
| `evan-evangelist` | **@devon-ops** | Same reason — announcement belongs with release |
| `build-resolver` | **@beck-backend** / **@effie-frontend** | Build failures are part of implementation, not a separate role |
| `anna-analytics` | `post-deploy-analytics` skill | Analytics is a skill invoked by `@devon-ops`, not a standalone agent |

Plus, 9 Greek-named agents from 0.2.x were renamed to Corporate Slack personas in 0.3.x. If your custom scripts or docs still reference the old names (`metis`, `hermes`, `nemesis`, `eris`, `hephaestus`, `momus`, `mnemosyne`, `athena`, `apollo`, `argus`), update them — `validate.js` actively scans for these and fails the build.

### Quick mapping

```
Old Greek name     → New Corporate Slack name
metis              → paige-product (0.3.0)
hephaestus         → beck-backend  (0.3.0)
athena             → artie-arch    (0.3.0)
hermes             → dora-docs     (0.3.0) → devon-ops (1.0.0)
nemesis            → stan-standards (0.3.0)
eris               → merged into sam-sec (0.3.0)
...
Retired v0.4 agent → Absorbed in v1.0.0
scout-sprint       → paige-product
percy-perf         → stan-standards
polyglot-reviewer  → stan-standards
dora-docs          → devon-ops
evan-evangelist    → devon-ops
build-resolver     → beck-backend / effie-frontend
anna-analytics     → post-deploy-analytics skill
```

---

## 3. Contexts and Shell Aliases — Removed

If you had this in your `~/.zshrc` / `~/.bashrc`:

```sh
alias claude-oss="claude --context ohmyclaude/contexts/oss.md"
alias claude-dev="claude --context ohmyclaude/contexts/dev.md"
alias claude-review="claude --context ohmyclaude/contexts/review.md"
alias claude-debug="claude --context ohmyclaude/contexts/debug.md"
```

**Remove those lines.** The `contexts/` directory and its files are gone. `/forge` routes all of these internally.

`postinstall.js` no longer modifies your shell rc — zero setup.

---

## 4. Routing — Rigid Routes A–E → Dynamic

0.3–0.5 used named routes: Route A (Docs), Route B (Fast-Track), Route C (Hotfix), Route D (Full Feature), Route E (Security Patch).

1.0.0 keeps the **spirit** (same five shapes) but `@paige-product` selects agents dynamically per request. You don't need to name the route; the lead infers it.

`BACKLOG.md` still groups issues by route for now (via the `backlog-tracker` hook) — legacy label, same meaning.

---

## 5. Artifacts — Kept, but Coordination Changed

**What's the same**: artifacts still live in `.claude/pipeline/`. Every named artifact type (PRD, SDD, UX-SPEC, IMPL-*, TEST, CODE-REVIEW, RELEASE, etc.) still exists. See `docs/pipeline-schema.md` for the authoritative frontmatter.

**What's different**:

- **Circuit Breaker now uses `AskUserQuestion`** to escalate to humans. The old `DEADLOCK-<id>.md` still exists as a recorded artifact, but the *resolution* is via the interactive question, not by waiting for a filesystem poll.
- **Inter-agent communication moved to `SendMessage`** (Agent Teams). Agents no longer coordinate by polling for new files; they send messages to the team lead.
- **Task tracking is now `TaskCreate` / `TaskUpdate`** — the lead assigns tasks, specialists update them.

Your artifact directory format is compatible. If you have a 0.5-era `.claude/pipeline/` with open artifacts, you can continue from it. Just re-invoke `/forge` and the lead will discover the state.

---

## 6. Skills

Skills from 0.5.0 that were retired (7 total):

| Retired skill | Why | What to use instead |
|---|---|---|
| `circuit-breaker` | Logic moved into each reviewer agent (@sam-sec, @stan-standards, @quinn-qa) | No replacement — agents handle 3-strike inline |
| `backend-to-frontend-handoff` | Boundary enforcement is now inline in agent prompts | Agents self-police (see @beck-backend "FE Boundary Enforcement") |
| `frontend-to-backend-requirements` | Same reason | Same |
| `sc-adviser` | Replaced by direct `sc:sc-spec-panel` references in agent prompts (Phase 3 of PLAN-001) | `sc:sc-spec-panel` invocation |
| `professional-communication` | Merged into agent personality sections | No replacement |
| `lesson-learned` | Removed — post-mortems weren't being read | No replacement |
| `draft-announcement` | Folded into @devon-ops | Use @devon-ops directly |

New skills in 1.0.0 (7): `task-breakdown`, `project-discovery`, `post-deploy-analytics`, `java-coding-standards`, `springboot-patterns`, `springboot-tdd`, `springboot-security`.

See `CHANGELOG.md [1.0.0]` for the full list.

---

## 7. Install Profiles

0.5.x had 5 profiles (`minimal`, `developer`, `pipeline`, `full`, `security`). 1.0.0 simplifies to 3:

| Old profile | New profile | Notes |
|---|---|---|
| `minimal` | `minimal` | 10 agents + /forge, no skills |
| `developer` | `standard` (default) | Full pipeline: agents + 27 skills + Java rules + quality hooks |
| `pipeline` | `standard` | Merged — skills are now always included |
| `security` | Removed | Was broken in 0.5.x (referenced retired `mcp-lsp`) |
| `full` | `full` | Everything including source-graph and tracking hooks |

On reinstall: `claude plugin install hunghlh98/ohmyclaude --profile standard`.

---

## 8. The `.lsp.json` Change (carry-over from 0.2.6)

If you were running < 0.2.6, the custom MCP LSP server was replaced with a native `.lsp.json` config. No action needed on 1.0.0; this is just a reminder if you skipped versions.

---

## Upgrade Checklist

```
[ ] Update your shell rc: remove claude-oss / claude-dev / claude-review / claude-debug aliases
[ ] Update any scripts or docs that mention a retired agent
    (scout-sprint, percy-perf, polyglot-reviewer, dora-docs, evan-evangelist,
     build-resolver, anna-analytics; plus 9 Greek names)
[ ] Replace /review, /debug, /commit, /setup calls with /forge equivalents
[ ] Reinstall: claude plugin install hunghlh98/ohmyclaude  (or --profile standard)
[ ] Run: node scripts/validate.js  → all checks should pass
[ ] Read docs/OPERATING.md once to recalibrate on who does what
```

If something unexpected happens, open an issue — the CHANGELOG is authoritative for intent, but bugs happen.
