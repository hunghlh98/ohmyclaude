# .claude/pipeline/

This directory is a **runtime workspace** — agents write artifacts here during `/forge` runs so humans can review them between waves.

It is user-specific and machine-specific. Don't expect anything here to be under version control by default.

## What You Find Here

The five most common artifact types, by stage:

| Stage | Artifact | Example |
|---|---|---|
| Planning | `PRD-<id>.md` | `PRD-001.md` |
| Design | `UX-SPEC-<id>.md`, `SDD-<id>.md` | `SDD-003.md` |
| Build | `IMPL-BE-<id>.md`, `IMPL-FE-<id>.md` | `IMPL-BE-002.md` |
| Verify | `TEST-<id>.md`, `CODE-REVIEW-<id>.md`, `REVIEW-<id>.md`, `UX-REVIEW-<id>.md` | `CODE-REVIEW-001.md` |
| Ship | `DOC-<id>.md`, `RELEASE-vX.Y.Z.md`, `ANNOUNCEMENT-<id>.md` | `RELEASE-v1.0.1.md` |

Plus exceptional states:

| Event | Artifact | What it means |
|---|---|---|
| 3-strike review loop | `DEADLOCK-<id>.md` | Pipeline halted; human must choose Option A or B |
| Implementation blocked on arch | `ESCALATE-ARCH-<id>.md` | Builder needs updated SDD before continuing |
| End of `/forge` run | `SUMMARY-<timestamp>.md` | Team activity log |
| Cross-cut planning | `PLAN-<id>.md` | Multi-phase plan that a `/forge` sprint executes |

For the full list and frontmatter schema, see **[`docs/pipeline-schema.md`](../../docs/pipeline-schema.md)**.

## Gate vs Informational

Some artifacts are **gates** — the pipeline cannot advance past them without human review. Others are informational traces.

- **Gates**: `PRD`, `UX-SPEC`, `SDD`, `TEST` (FAIL), `REVIEW` (REVISE), `CODE-REVIEW` (REQUEST_CHANGES), `UX-REVIEW` (REQUEST_CHANGES), `RELEASE`, `DEADLOCK`.
- **Informational**: `CODE-DESIGN-*`, `IMPL-*`, `DOC`, `ANNOUNCEMENT`, `SUMMARY`, `PLAN`, `ANALYTICS`.

`@devon-ops` will not cut a release while a gate artifact is blocking.

## What Do I Do With These Files?

- **Read them.** They're written for you, not for future agents. They explain *why* a design was chosen, what tradeoffs were considered, and what the next step is.
- **Approve or revise.** A blocking gate artifact (FAIL / REVISE / REQUEST_CHANGES) is waiting for you. Either address the findings or mark the gate cleared.
- **Archive when done.** Once a `/forge` run reaches a satisfying end, you can move the artifacts out — `mv *.md .claude/archive/<date>/`.
- **Never edit an IMPL or RELEASE artifact after the fact.** They are historical records. If something is wrong, write a correction note in `.claude/pipeline/NOTE-<id>.md`.

## Examples Subdirectory (Phase 4)

When the plan reaches Phase 4 (v1.3.0), `.claude/pipeline/examples/` will ship canonical exemplars for each artifact type. Agents will cite them when producing their own artifacts.

## Related

- [`docs/pipeline-schema.md`](../../docs/pipeline-schema.md) — canonical artifact schema.
- [`docs/OPERATING.md`](../../docs/OPERATING.md) — who produces which artifact.
- [`commands/forge.md`](../../commands/forge.md) — how the pipeline orchestrates them.
