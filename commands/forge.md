---
name: forge
description: Single OSS entry point. Routes work through the 14-agent pipeline based on @paige-product's routing decision. Subcommands — init, request, triage, sprint, release, analyze — cover the full software lifecycle from founding build to post-release analytics.
---

# /forge

The primary orchestration command for the ohmyclaude OSS simulation pipeline. Every request enters through `/forge`. Every release exits through `/forge`.

## Subcommands

### `/forge init <spec>`

Founding build. Use when starting a project from scratch.

**What it does:**
1. @paige-product reads `<spec>` and routes as Route D (Full Feature, founding build)
2. Full 14-stage pipeline executes: UX-SPEC → PRD → SDD → PLAN → REVIEW → IMPL-BE/FE → TEST → CODE-REVIEW → UX-REVIEW → DOC → RELEASE
3. Version set to `v1.0.0`
4. Backlog scaffold created at `.claude/backlog/issues/`
5. CHANGELOG.md initialized with the founding release

**Example:**
```
/forge init "A task management app with REST API and React frontend"
```

---

### `/forge request <description>`

Submit a new request for triage. @paige-product classifies and routes it.

**What it does:**
1. @paige-product classifies the request (type, complexity, priority, security, FE component)
2. Emits routing JSON (Route A/B/C/D/E)
3. Writes `ISS-NNN.md` to `.claude/backlog/issues/` with route tag assigned
4. BACKLOG.md index updates automatically (backlog-tracker hook)

**Route assignment at intake:**
- Route A: docs-only tasks
- Route B: fast-track boilerplate/template features
- Route C: P0 bug hotfixes
- Route D: full feature pipeline (high complexity)
- Route E: security patches

**Example:**
```
/forge request "Add rate limiting to the /api/users endpoint"
/forge request "Fix: null pointer exception in payment processor"
/forge request "Update the README with the new API endpoints"
```

---

### `/forge triage`

Re-route all existing backlog items. Use after a significant architecture change or when backlog has accumulated unrouted items.

**What it does:**
1. @paige-product reads all `ISS-*.md` in `.claude/backlog/issues/`
2. Re-evaluates routing for each item (priorities may have changed, security context may be different)
3. Updates route tags on any items whose routing has changed
4. BACKLOG.md index rebuilds

---

### `/forge sprint [--size N]`

Execute a sprint. @devon-ops selects issues from the backlog, each runs its assigned route.

**What it does:**
1. @devon-ops selects N issues from the backlog (default: 3, override with `--size`)
2. Writes `SPRINT-NNN.md` with the selected issues and their routes
3. Each issue runs its assigned route in parallel where possible:

```
SPRINT-001:
  ISS-001 (Route A — docs)        → @dora-docs + @stan-standards
  ISS-002 (Route B — fast-track)  → @scout-sprint + @beck-backend + @quinn-qa + @stan-standards
  ISS-003 (Route C — hotfix)      → @beck-backend + @percy-perf + @devon-ops
  ISS-004 (Route D — full feature) → all 14 pipeline stages
  ISS-005 (Route E — security)    → @sam-sec → @beck-backend → @percy-perf → @sam-sec → @devon-ops
```

4. Issues are promoted to `status: in-progress` in their ISS files
5. Completed issues are promoted to `status: done`

**Route agent sequences (quick reference):**

| Route | Agents |
|-------|--------|
| A (Docs-Only) | @paige-product → @dora-docs → @stan-standards |
| B (Fast-Track) | @paige-product → @scout-sprint → @beck-backend/effie-frontend → @quinn-qa → @stan-standards |
| C (Hotfix) | @paige-product → @beck-backend → @percy-perf → @devon-ops |
| D (Full Feature) | @paige-product → @una-ux → @artie-arch → @scout-sprint → @sam-sec → @beck-backend + @effie-frontend → @quinn-qa → @stan-standards + @percy-perf + @una-ux → @dora-docs → @devon-ops → @evan-evangelist |
| E (Security) | @paige-product → @sam-sec → @beck-backend → @percy-perf → @sam-sec (re-review) → @devon-ops |

---

### `/forge release`

Cut a release. @devon-ops gates, writes RELEASE file, updates CHANGELOG, triggers announcement.

**What it does:**
1. @devon-ops verifies all pipeline gates are cleared (TEST=PASS, CODE-REVIEW=APPROVED, REVIEW=APPROVE)
2. Determines SemVer bump from CHANGELOG.md [Unreleased] entries
3. Writes `RELEASE-vX.Y.Z.md`
4. Updates `CHANGELOG.md` (promotes [Unreleased] to versioned section)
5. Triggers @evan-evangelist to write `ANNOUNCEMENT-<id>.md`

**Blocking conditions (release will not proceed):**
- Any open DEADLOCK-<id>.md with `status: awaiting-human`
- TEST-<id>.md verdict is FAIL
- CODE-REVIEW-<id>.md verdict is REQUEST_CHANGES
- REVIEW-<id>.md verdict is REVISE

---

### `/forge analyze`

Post-deploy analytics. Async — run after deployment is confirmed in production.

**What it does:**
1. @anna-analytics fetches or simulates telemetry for the deployed release
2. Compares against 7-day pre-release baseline
3. Writes `ANALYTICS-<id>.md` with recommendation (maintain / investigate / rollback)
4. If regression detected → creates `ISS-NNN.md` in backlog (triggers backlog-tracker hook → BACKLOG.md updates)

**Example:**
```
/forge analyze  # run after deploy of v0.3.0
```

---

## Conflict Resolution Protocol

### Domain Dictator (who wins)

| Conflict | Winner |
|----------|--------|
| Feature WHAT vs implementation HOW | @paige-product (WHAT), @artie-arch (HOW) |
| Velocity vs security | @sam-sec always |
| UX completeness vs velocity | @una-ux on public UI (WCAG non-negotiable) |
| Performance regression vs feature | @percy-perf on CRITICAL; @stan-standards otherwise |
| Release readiness vs stability | @devon-ops (ultimate trump card) |
| Community hype vs stability | @devon-ops |
| Community hype vs architectural truth | @artie-arch |
| Product intuition vs telemetry | @anna-analytics (data beats intuition) |

### Circuit Breaker (3-Strike Rule)

After 3 REVISE/REQUEST_CHANGES/FAIL rounds in any stage:
1. The reviewing agent emits `DEADLOCK-<id>.md`
2. All agents halt on that issue
3. @paige-product synthesizes the deadlock as a binary choice
4. Human authorizes Option A or B
5. Pipeline resumes from the halted stage

### Oracle Fallback

When Circuit Breaker trips:
- Use `@paige-product` to view the deadlock summary
- Authorize: "Authorize Option A" or "Authorize Option B"
- The pipeline resumes automatically

---

## Utility Agents (on-demand, not in primary pipeline)

| Agent | When to use |
|-------|------------|
| `@heracles` | Something is broken and root cause is not obvious |
| `@build-resolver` | Build fails — compile/type/dependency error |
| `@polyglot-reviewer` | Code review for Java, Kotlin, Go, Python, Rust, C++, Flutter, SQL |
