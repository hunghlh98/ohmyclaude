# docs/

Research and reference material used while building ohmyclaude. These are **not shipped** with the plugin — they are background reading for contributors.

## Layout

| Path | Purpose |
|------|---------|
| `docs/en/` | English source material |
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

## Not Product Documentation

End-user documentation lives at the repo root:
- `README.md` — install, quickstart, inventory
- `ROADMAP.md` — planned work by version
- `CHANGELOG.md` — what changed, when
- `CONTRIBUTING.md` — how to add agents/skills/rules/hooks
- `SECURITY.md` — how to report vulnerabilities

When `docs/OPERATING.md` ships (planned in v1.0.2 per `ROADMAP.md`), it will be the canonical per-agent, per-hook reference. `docs/TOKENS.md` will cover cost transparency.
