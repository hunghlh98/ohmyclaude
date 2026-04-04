---
name: draft-announcement
description: Draft and save a community announcement (ANNOUNCEMENT-<id>.md) in .claude/pipeline/ from a RELEASE-vX.Y.Z.md file. Used by @evan-evangelist after @devon-ops cuts a release. Outputs three platform-specific formats: Tweet (≤280 chars), GitHub Discussion (3 paragraphs), Newsletter. Triggers on "draft announcement", "write release post", "community post", "tweet about release".
---

# Draft Announcement

Translate a release file into community-friendly copy for multiple platforms.

## Input

Read `RELEASE-vX.Y.Z.md` from `.claude/pipeline/`. If no path is provided, find the most recent RELEASE file.

## Output

Write to `.claude/pipeline/ANNOUNCEMENT-<id>.md` where `<id>` matches the release version (e.g., ANNOUNCEMENT-v1.3.0.md).

## Platform Formats

### Tweet (≤280 characters)
- Lead with the most impactful change
- Use plain language — no jargon
- End with a call to action or link placeholder
- Include version number
- Example: `🚀 ohmyclaude v1.3.0 is out! JWT auth, 3x faster build times, and a new @dora-docs that writes changelogs automatically. Full notes → [link] #claude #devtools`

### GitHub Discussion (3 paragraphs)
- **Paragraph 1:** What's new and why it matters (user value)
- **Paragraph 2:** Key changes with 2–4 bullet highlights
- **Paragraph 3:** How to get started / upgrade + link to full changelog

### Newsletter
- **Subject line:** [version] — [2–5 word hook]
- **Headline:** (H1, ≤60 chars)
- **Lead paragraph:** (2–3 sentences, non-technical audience)
- **Feature bullets:** (3–5 items, each with a one-line benefit statement)
- **CTA:** ("Update now", "Read the changelog", etc.)

## Writing Guidelines (use writing-clearly skill)

- **No puffery** — avoid "revolutionary", "game-changing", "groundbreaking"
- **Active voice** — "We added X" not "X was added"
- **Concrete benefits** — "Saves 10 minutes per PR review" beats "improves developer experience"
- **Short sentences** — especially for Tweet and Newsletter formats
- **Audience awareness** — GitHub Discussion can be technical; Newsletter assumes non-technical readers

## ANNOUNCEMENT Schema

```markdown
---
id: ANNOUNCEMENT-v1.3.0
release_ref: RELEASE-v1.3.0.md
created: YYYY-MM-DD
author: evan-evangelist
---

## Tweet (≤280 chars)
[tweet text here]

---

## GitHub Discussion

### [Headline]

[Paragraph 1 — what's new and why it matters]

[Paragraph 2 — key highlights as bullets]
- 
- 
- 

[Paragraph 3 — how to upgrade + changelog link]

---

## Newsletter

**Subject:** [version] — [hook]

# [Headline]

[Lead paragraph]

**What's new:**
- **[Feature]:** [one-line benefit]
- **[Feature]:** [one-line benefit]
- **[Feature]:** [one-line benefit]

[CTA]
```

## Gotchas

- **Tweet character limit is strict** — count carefully; URLs count as ~23 chars on Twitter/X
- **Never mention internal pipeline details** — PRD IDs, DEADLOCK files, agent names are internal; translate to user-facing language
- **Newsletter ≠ release notes** — summarize value, don't list every commit
