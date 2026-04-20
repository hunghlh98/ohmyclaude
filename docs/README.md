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
| `docs/en/` | English source material (skill-authoring guides, Socratic prompting, Anthropic skill-design lessons) |
| `docs/vi/` | Vietnamese translations / notes |
| `docs/plan_v1.md`, `docs/review_skills.md`, `docs/skills_required_v1.md`, `docs/update_naming_v1.md` | v1.0.0 planning notes (historical) |

## English (`docs/en/`)

| File | Summary |
|------|---------|
| `how_to_use_skills.txt` | Best practices for authoring and invoking Claude Code skills |
| `socratic_prompting.txt` | Socratic questioning patterns; informs the HIGH/MEDIUM/LOW confidence model in `@paige-product` |
| `lessons_from_building_claude_code_how_we_use_skill.md` | Anthropic-published lessons on skill design; source for the "progressive disclosure" principle applied across `skills/*/references/` |

## Vietnamese (`docs/vi/`)

| File | Summary |
|------|---------|
| `how_to_use_skills.txt` | VI translation of the skill authoring guide |
| `socratic_prompting.txt` | VI translation of the Socratic pattern notes |
| `obsidian_connector.txt` | Integration notes for the Obsidian second-brain workflow |

## Repo-Root Docs

Top-level documentation lives at the repo root:
- `README.md` — install, quickstart, inventory
- `ROADMAP.md` — planned work by version
- `CHANGELOG.md` — what changed, when
- `CONTRIBUTING.md` — how to add agents/skills/rules/hooks
- `SECURITY.md` — how to report vulnerabilities
- `MIGRATION.md` — 0.x → 1.0 upgrade guide
- `LICENSE` — MIT
