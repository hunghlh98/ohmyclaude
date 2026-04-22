---
id: REFACTOR-BASELINE-v1.3.0
type: baseline
status: pinned
for: v1.3.0 → v2.0.0 refactor
date: 2026-04-22
---

# Refactor Baseline — ohmyclaude v1.3.0

Snapshot frozen before the v2.0.0 refactor. Every post-refactor diff is measured against this file.

## 1. Inventory (from `node scripts/validate.js`)

| Component | Count | Detail |
|---|--:|---|
| Version | 1.3.0 | VERSION, package.json, plugin.json, marketplace.json |
| Agents | 10 | sonnet: 8, opus: 1, haiku: 1 |
| Skills | 42 | engineering: 12, java: 5, pipeline: 4, specialized: 8, superclaude: 13 |
| Commands | 1 | forge.md |
| Rules | 5 | common: 1, java: 4 |
| Hooks | 8 | backlog-tracker, cost-profiler, dry-run, graph-update, post-bash-lint, pre-write-check, session-summary, team-cleanup |
| Install profiles | 3 | minimal, standard (default), full |
| Install modules | 16 | |
| Doc lines | 1010 | README 198, CLAUDE 161, CONTRIBUTING 239, ROADMAP 128, CHANGELOG 284 |

## 2. SKILL.md line counts (cap is 400 per CLAUDE.md)

Measured with `find skills/ -type f -name SKILL.md -exec wc -l {} \; | sort -rn`.

```
VIOLATORS (>400 lines):
  758  skills/qa-test-planner/SKILL.md
  688  skills/database-schema-designer/SKILL.md
  604  skills/design-system/SKILL.md

Near-cap (warn band 300–400):
  325  skills/requirements-clarity/SKILL.md

Compliant (<300):
  296  skills/c4-architecture/SKILL.md
  265  skills/game-changing-features/SKILL.md
  235  skills/java-source-intel/SKILL.md
  201  skills/sc-troubleshoot/SKILL.md
  186  skills/sc-spec-panel/SKILL.md
  183  skills/sc-document/SKILL.md
  175  skills/sc-analyze/SKILL.md
  163  skills/springboot-patterns/SKILL.md
  163  skills/sc-implement/SKILL.md
  162  skills/sc-research/SKILL.md
  160  skills/error-handling/SKILL.md
  158  skills/springboot-tdd/SKILL.md
  156  skills/sc-pm/SKILL.md
  148  skills/sc-build/SKILL.md
  146  skills/sc-improve/SKILL.md
  145  skills/sc-test/SKILL.md
  144  skills/sc-design/SKILL.md
  142  skills/springboot-security/SKILL.md
  142  skills/sc-estimate/SKILL.md
  136  skills/java-coding-standards/SKILL.md
  134  skills/task-breakdown/SKILL.md
  128  skills/datadog-cli/SKILL.md
  124  skills/api-design/SKILL.md
  117  skills/sc-brainstorm/SKILL.md
  110  skills/project-discovery/SKILL.md
  108  skills/write-ux-spec/SKILL.md
  108  skills/generate-fuzz-data/SKILL.md
  107  skills/tdd-patterns/SKILL.md
  105  skills/git-workflow/SKILL.md
  100  skills/code-review/SKILL.md
   86  skills/write-code-review/SKILL.md
   86  skills/profile-run/SKILL.md
   85  skills/write-security-review/SKILL.md
   83  skills/reducing-entropy/SKILL.md
   81  skills/write-sdd/SKILL.md
   79  skills/readme-templates/SKILL.md
   77  skills/post-deploy-analytics/SKILL.md
   56  skills/commit-work/SKILL.md
```

**Plan correction**: the pre-refactor plan named 5 skills as violators based on total-per-skill line count (including `references/`). The 400-line cap per CLAUDE.md applies to `SKILL.md` specifically. After re-measuring, only 3 are actual violators. `c4-architecture` (296) and `readme-templates` (79) already follow the progressive-disclosure pattern correctly.

## 3. SuperClaude skill reference map

Which files reference each sc-* skill (source of truth before Phase 2 deletions):

```
sc-analyze (DELETE)       → agents/sam-sec.md, agents/stan-standards.md,
                            commands/forge.md, manifests/install-modules.json,
                            docs/superclaude-integration.md, docs/TOKENS.md

sc-brainstorm (KEEP)      → agents/paige-product.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-build (DELETE)         → agents/effie-frontend.md, agents/beck-backend.md,
                            commands/forge.md, manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-design (DELETE)        → agents/una-ux.md, agents/artie-arch.md,
                            commands/forge.md, manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-document (DELETE)      → agents/devon-ops.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-estimate (KEEP)        → agents/paige-product.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-implement (DELETE)     → agents/effie-frontend.md, agents/beck-backend.md,
                            commands/forge.md, manifests/install-modules.json,
                            docs/superclaude-integration.md, docs/TOKENS.md

sc-improve (DELETE)       → agents/stan-standards.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-pm (KEEP)              → agents/paige-product.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-research (KEEP)        → agents/artie-arch.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-spec-panel (KEEP)      → agents/una-ux.md, agents/sam-sec.md,
                            agents/artie-arch.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md

sc-test (DELETE)          → agents/quinn-qa.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md, docs/TOKENS.md

sc-troubleshoot (DELETE)  → agents/heracles.md, commands/forge.md,
                            manifests/install-modules.json,
                            docs/superclaude-integration.md
```

**Agent → removed-skill map** (each file in the left column needs Phase 2b edits):

| Agent file | Remove references to |
|---|---|
| `agents/sam-sec.md` | `sc-analyze` |
| `agents/stan-standards.md` | `sc-analyze`, `sc-improve` |
| `agents/effie-frontend.md` | `sc-build`, `sc-implement` |
| `agents/beck-backend.md` | `sc-build`, `sc-implement` |
| `agents/una-ux.md` | `sc-design` |
| `agents/artie-arch.md` | `sc-design` (keep `sc-research`, `sc-spec-panel`) |
| `agents/devon-ops.md` | `sc-document` |
| `agents/quinn-qa.md` | `sc-test` |
| `agents/heracles.md` | `sc-troubleshoot` |

## 4. Release cadence baseline

CHANGELOG shows three v1.Y minor releases on 2026-04-21 (one day):
- v1.1.0 (SuperClaude inlining γ)
- v1.2.0 (Cost profiler + dry-run simulator)
- v1.3.0 (Dual-graph backend + java-source-intel)

No `RELEASE-*.md` artifact exists for any of them. `release-cut` skill present but unused as a gate.

## 5. Roadmap drift

`ROADMAP.md` as of v1.3.0 still lists:
- v1.1 = "Hook Depth & Language Expansion" (console-log-auditor, pre-commit-quality-gate, cost-tracker, prompt-injection-guard, TS/Go/Python/Kotlin rules, /forge sprint --think, --delegate)
- v1.2 = "Session Intelligence" (/save, /load, confidence gate, wave orchestration)
- v1.3 = "Distribution & Testing" (smoke tests, install.sh verification, AGENTS.md, HOOKS.md)

None of those items shipped. All three slots were filled with unrelated work.

**Drift rate**: 100% (0 of 21 listed items landed; 3 entirely different deliverables shipped under those version numbers).

## 6. Post-refactor targets

After v2.0.0:
- Skills: 42 → 34 (remove 8 sc-* verb-wrappers)
- Skill line count (SKILL.md): max 400, enforced by validator
- ROADMAP: rewritten with honest "what shipped" + v2.0 + v2.1+ deferred backlog
- Release gate: VERSION change requires ROADMAP/README/CHANGELOG co-change
- sc-* skills: 13 → 5 (sc-spec-panel, sc-brainstorm, sc-pm, sc-research, sc-estimate)

## 7. Out of scope for v2.0.0

- New skills, agents, or hooks (strictly subtractive per plan)
- Filesystem reboundary of `skills/` categories (deferred to v2.1)
- Language expansion (TS/Go/Python/Kotlin rules) — deferred to v2.1+
- Session intelligence (/save, /load) — deferred to v2.1+
