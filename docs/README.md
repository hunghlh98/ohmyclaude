# docs/

Split into **product docs** (shipped with the plugin, user-facing) and **research material** (background reading for contributors).

## Product Docs

| Doc | Audience | Purpose |
|---|---|---|
| [`OPERATING.md`](./OPERATING.md) | Operators / users | Per-agent and per-hook reference — purpose, model, tools, boundaries, examples |
| [`pipeline-schema.md`](./pipeline-schema.md) | Operators / contributors | Canonical artifact schema — IDs, frontmatter, gates, lifecycle |
| [`TOKENS.md`](./TOKENS.md) | Operators | Cost transparency — per-scenario cost envelope, levers, caching guidance |

## Research Material

| Path | Purpose |
|------|---------|
| [`archive/`](./archive/) | v1.0.0 planning notes + `MIGRATION-1.0.md`. Kept as provenance for the 17→10 agent consolidation, initial skill roster, and 0.x→1.0 upgrade path; safe to read, not safe to act on. See [`archive/README.md`](./archive/README.md) for the full index. |

> **Where did the external research material go?** The English source notes (Anthropic's skills lessons, Socratic prompting, Thariq's skill-authoring guide) were migrated into the second-brain vault at `~/second-brain/knowledge/` and `~/second-brain/research/`. Vietnamese translations were removed; the vault is English-only. Use `/recall` to query. The plugin repo now holds only plugin-authored product docs.

## Repo-Root Docs

Top-level documentation lives at the repo root:
- `README.md` — install, quickstart, inventory
- `ROADMAP.md` — planned work by version
- `CHANGELOG.md` — what changed, when
- `CONTRIBUTING.md` — how to add agents/skills/rules/hooks
- `SECURITY.md` — how to report vulnerabilities
- `LICENSE` — MIT
