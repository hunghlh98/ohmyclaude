# Pipeline Artifact Schema

Agents write artifacts to `.claude/pipeline/` so humans can review them between waves. This doc is the canonical reference for **what ID, what frontmatter, what lifecycle**. If a `write-*` skill and this doc disagree, this doc wins — the skills cite this schema.

---

## Artifact Taxonomy

| Artifact | Producer agent | Producer skill | Stage type |
|---|---|---|---|
| `PRD-<id>.md` | @paige-product | — | **Gate** — human review required |
| `UX-SPEC-<id>.md` | @una-ux (pre-dev) | inline schema in agent | **Gate** |
| `SDD-<id>.md` | @artie-arch | inline schema in agent | **Gate** |
| `CONTRACT-<id>.md` *(v3.0.0+)* | @paige-product (drafts) + @val-evaluator (co-signs) | `write-contract` | **Gate** — `signed: true` required before any IMPL artifact |
| `CODE-DESIGN-BE-<id>.md` | @beck-backend | — | Informational |
| `CODE-DESIGN-FE-<id>.md` | @effie-frontend | — | Informational |
| `IMPL-BE-<id>.md` | @beck-backend | — | Informational |
| `IMPL-FE-<id>.md` | @effie-frontend | — | Informational |
| `TEST-<id>.md` plan section | @quinn-qa (test plan + cases + fuzz inputs) | — | Informational (plan only) |
| `TEST-<id>.md` verdict section *(v3.0.0+)* | @val-evaluator (runs tests + probes; writes verdict, criteria grades, weighted score) | — | **Gate** (FAIL blocks release) |
| `REVIEW-<id>.md` | @sam-sec | inline schema in agent | **Gate** (REVISE blocks release) |
| `UX-REVIEW-<id>.md` | @una-ux (post-dev) | — | **Gate** (REQUEST_CHANGES blocks release) |
| `CODE-REVIEW-<id>.md` | @stan-standards | inline schema in agent | **Gate** (REQUEST_CHANGES blocks release) |
| `HUMAN-VERDICT-<id>.md` *(v3.0.0+, optional)* | human reviewer | `evaluator-tuning` (consumed by) | Informational — feeds the evaluator-tuning loop |
| `DOC-<id>.md` | @devon-ops | — | Informational |
| `RELEASE-vX.Y.Z.md` | @devon-ops | `release-cut` | **Gate** |
| `ANNOUNCEMENT-<id>.md` | @devon-ops | — | Informational |
| `PLAN-<id>.md` | @paige-product (cross-cut planning) | — | Informational |
| `DEADLOCK-<id>.md` | any reviewer hitting 3-strike | — | **Halt** — pipeline cannot advance |
| `ESCALATE-ARCH-<id>.md` | @beck-backend / @effie-frontend | — | **Halt** — returns to @artie-arch |
| `SUMMARY-<timestamp>.md` | @paige-product (team shutdown) | — | Informational |
| `ANALYTICS-<id>.md` | `post-deploy-analytics` skill | — | Informational |

**Gate artifact** = pipeline cannot advance past this stage until a human reviews and (implicitly or explicitly) approves. **Informational artifact** = produced for traceability; does not block.

---

## ID Format

- Most artifact IDs are **three-digit zero-padded, sequential per artifact type**: `PRD-001`, `SDD-001`, `CODE-REVIEW-001`. Counters are per-type and independent.
- Release artifacts use SemVer: `RELEASE-v1.0.1.md`.
- Team-shutdown summaries use the ISO timestamp of the run: `SUMMARY-2026-04-20T14-32-10.md`.

When unsure of the next number: `ls .claude/pipeline/PRD-*.md | sort | tail -1` and increment.

---

## Canonical Frontmatter

Every artifact starts with YAML frontmatter. Required fields are in **bold**.

### PRD (Product Requirements Document)

```yaml
---
id: PRD-001
type: feature | bug | enhancement | refactor | docs | security | boilerplate
priority: P0 | P1 | P2 | P3
route: <one-line description of agent sequence>
created: YYYY-MM-DD
---
```

### UX-SPEC

```yaml
---
id: UX-SPEC-001
prd: PRD-001
---
```

### SDD (System Design Document)

```yaml
---
id: SDD-001
prd: PRD-001
ux-spec: UX-SPEC-001       # only if a UX-SPEC exists
c4-level: C1-C3            # or C1-C4 for detailed designs
---
```

### CODE-DESIGN-{BE,FE}

```yaml
---
c4-level: C4
layer: BE | FE
sdd: SDD-001
impl-id: IMPL-BE-001 | IMPL-FE-001
---
```

### IMPL-{BE,FE}

```yaml
---
id: IMPL-BE-001 | IMPL-FE-001
code-design: CODE-DESIGN-BE-001 | CODE-DESIGN-FE-001
plan: PLAN-001              # if a PLAN exists
ux-spec: UX-SPEC-001        # FE only, when applicable
---
```

### TEST

```yaml
---
id: TEST-001
impl: [IMPL-BE-001, IMPL-FE-001]
verdict: PASS | FAIL
round: 1
---
```

### REVIEW (Security)

```yaml
---
id: REVIEW-001
plan: PLAN-001              # or PRD if no formal PLAN exists
verdict: APPROVE | APPROVE_WITH_NOTES | REVISE
round: 1
---
```

### UX-REVIEW

```yaml
---
id: UX-REVIEW-001
ux-spec: UX-SPEC-001
impl-fe: IMPL-FE-001
verdict: APPROVED | REQUEST_CHANGES
---
```

### CODE-REVIEW

```yaml
---
id: CODE-REVIEW-001
impl: [IMPL-BE-001, IMPL-FE-001]
verdict: APPROVED | REQUEST_CHANGES
reviewer: stan-standards
round: 1
---
```

### DOC

```yaml
---
id: DOC-001
code-review: CODE-REVIEW-001
ux-review: UX-REVIEW-001    # when a UX-REVIEW exists
---
```

### RELEASE

```yaml
---
id: RELEASE-v1.0.1
docs: DOC-001
---
```

### ANNOUNCEMENT

```yaml
---
release: vX.Y.Z
channels: [twitter, github-discussions, newsletter]
---
```

### DEADLOCK

```yaml
---
id: DEADLOCK-001
issue: ISS-005                 # or PRD ID
stage: security-review | code-review | test | ux-review
agent-a: <agent-name>
agent-b: <agent-name>
turns: 3
status: awaiting-human
---
```

### ESCALATE-ARCH

```yaml
---
id: ESCALATE-ARCH-001
issue: ISS-005                 # or PRD ID
triggered-by: beck-backend | effie-frontend
reason: requires-new-infrastructure | out-of-sdd-scope
infrastructure: kafka | redis | new-db | message-broker | other
---
```

### PLAN

```yaml
---
id: PLAN-001
type: enhancement | refactor | documentation | coordination
priority: P0 | P1 | P2 | P3
scope: <target area or repo>
from_version: <optional>
target_version: <optional>
created: YYYY-MM-DD
status: draft | in-progress | done
author: <agent or panel>
---
```

---

## Verdicts and Release Gates

A release cannot cut while any of the following is true:

| Artifact | Blocking condition |
|---|---|
| `TEST-<id>.md` | `verdict: FAIL` |
| `REVIEW-<id>.md` | `verdict: REVISE` |
| `CODE-REVIEW-<id>.md` | `verdict: REQUEST_CHANGES` |
| `UX-REVIEW-<id>.md` | `verdict: REQUEST_CHANGES` |
| `DEADLOCK-<id>.md` | `status: awaiting-human` |
| `ESCALATE-ARCH-<id>.md` | Present and not resolved by updated `SDD-<id>.md` |

`@devon-ops` enforces this in `release-cut`. Bypassing it is a protocol violation — open a `DEADLOCK` instead.

---

## Lifecycle

```
                 ┌─────────────────┐
                 │ /forge <prompt> │
                 └────────┬────────┘
                          ▼
               ┌────────────────────┐
               │ @paige-product     │
               │ classifies + plans │
               │ writes PRD-<id>.md │
               └────────┬───────────┘
                        ▼
     ┌──────────────────┼──────────────────┐
     ▼                  ▼                  ▼
[ @una-ux ]      [ @artie-arch ]    [ @sam-sec ]
UX-SPEC-<id>     SDD-<id>           REVIEW-<id>
                                    (pre-build)
     │                  │                  │
     └──────────────────┴──────────────────┘
                        ▼
              [ @beck-backend / @effie-frontend ]
              CODE-DESIGN-{BE,FE}-<id>
              IMPL-{BE,FE}-<id>
                        ▼
                 [ @quinn-qa ]
                 TEST-<id>
                        ▼
     ┌──────────────────┴──────────────────┐
     ▼                                     ▼
[ @stan-standards ]                  [ @sam-sec ]
CODE-REVIEW-<id>                     REVIEW-<id> (post-build)
[ @una-ux ]                          UX-REVIEW-<id>
                        ▼
                [ @devon-ops ]
                DOC-<id> → RELEASE-vX.Y.Z → ANNOUNCEMENT-<id>
                        ▼
               [ @paige-product ]
               SUMMARY-<timestamp>
                        ▼
                  TeamDelete
```

### At any review stage, one of:

- **APPROVE / PASS** → advance to next stage.
- **REVISE / FAIL / REQUEST_CHANGES** (round < 3) → builder revises, reviewer re-reviews (new round).
- **REVISE / FAIL / REQUEST_CHANGES** (round = 3) → write `DEADLOCK-<id>.md`, halt, `@paige-product` escalates to human via `AskUserQuestion`.

### At implementation stage, one of:

- Normal completion → `IMPL-*` artifact.
- New infra needed → `ESCALATE-ARCH-<id>.md`, `@artie-arch` updates SDD, `@paige-product` revises plan.

---

## Naming Conventions

- All IDs are uppercase. All filenames are ASCII.
- No spaces in filenames. Use hyphen (`-`), not underscore.
- One artifact per file. Do not concatenate.
- Lineage cross-references use the other artifact's **id** (not its filename).
- `<id>` is scoped per artifact type — `PRD-001` is unrelated to `SDD-001`.

---

## Evolving This Schema

- Add a new artifact type by editing this doc and the relevant `write-*` skill at the same time.
- Changing a required frontmatter field is a minor version bump at minimum; add a `MIGRATION.md` note.
- Retiring an artifact type requires updating every agent that references it.

See `CONTRIBUTING.md` for the full change-management checklist.
