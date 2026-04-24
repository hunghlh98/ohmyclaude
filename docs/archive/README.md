# docs/archive — Historical Documents

This directory holds documents that are no longer current but have archival value. Items land here when they describe a version, migration, or design decision that the project has moved past. The live authoritative docs are in `docs/` (one level up) and the project root.

| File | Scope | Superseded by |
|---|---|---|
| [MIGRATION-1.0.md](MIGRATION-1.0.md) | Upgrade path from ohmyclaude 0.x → 1.0 | [CHANGELOG.md](../../CHANGELOG.md) is the canonical upgrade reference for v1.0+ transitions. |
| [plan_v1.md](plan_v1.md) | Pre-v1.0 full-OSS simulation refactor plan | v1.0.0 shipped; see the [v1.0.0 CHANGELOG entry](../../CHANGELOG.md). |
| [review_skills.md](review_skills.md) | Pre-v1.0 skills audit | Skills layout now stable; see `skills/` tree. |
| [skills_required_v1.md](skills_required_v1.md) | Pre-v1.0 per-agent toolset blueprint | Each agent's tools list is now frontmatter-defined in `agents/*.md`. |
| [update_naming_v1.md](update_naming_v1.md) | Pre-v1.0 agent naming convention design | 10-agent corporate-Slack roster shipped in v1.0.0. |

**Curation rule**: anything moved here should remain readable as-is, without updates. If it needs updates, the content has moved somewhere live and this archive entry should cite the successor.
