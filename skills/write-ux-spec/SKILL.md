---
name: write-ux-spec
description: Write and save the UX Specification (UX-SPEC-<id>.md) to .claude/pipeline/. Used by @una-ux when Has_FE_Component=true. Output must include a WCAG_Requirements array (required field), user journey, wireframe descriptions, and component states. Triggers on "write UX spec", "design spec", "wireframe", "accessibility requirements".
origin: ohmyclaude
---

# Write UX Spec

Produce and save the UX Specification for frontend components in the current pipeline request.

## When to Invoke

Only invoked when `Has_FE_Component=true` in the routing decision. Skip for purely backend or docs-only routes.

## Output

Write to `.claude/pipeline/UX-SPEC-<id>.md` using the template at `assets/template.md`.

## UX-SPEC Schema

```markdown
---
id: UX-SPEC-001
prd_ref: PRD-001
created: YYYY-MM-DD
status: draft | approved
has_fe_component: true
---

## Overview
[What screens/flows does this spec cover?]

## User Journey
[Step-by-step narrative: user goal → actions → outcomes]

1. User arrives at [entry point]
2. User sees [screen/state]
3. User performs [action]
4. System responds with [feedback/transition]

## WCAG_Requirements
<!-- REQUIRED FIELD — must not be empty -->
- contrast_ratio: [e.g., "4.5:1 minimum for body text (AA)"]
- aria_labels: [e.g., "All interactive elements have descriptive aria-label"]
- keyboard_nav: [e.g., "Tab order follows visual reading order; no keyboard traps"]
- focus_indicators: [e.g., "Visible focus ring on all interactive elements"]
- alt_text: [e.g., "All informational images have descriptive alt text"]

## Screens & States

### [Screen Name]

**Default state:**
[Wireframe description or ASCII sketch]

**Loading state:**
[Description]

**Error state:**
[Description — how errors surface to the user]

**Empty state:**
[Description — what the user sees with no data]

## Component Inventory
| Component | Variant | Notes |
|---|---|---|
| [Name] | [default/hover/disabled/etc.] | [Any special behavior] |

## Copy Guidelines
- Tone: [e.g., "friendly, direct, avoid jargon"]
- CTA labels: [e.g., "Use verbs: 'Save changes' not 'Submit'"]
- Error messages: [e.g., "State what went wrong + what to do next"]

## Design Tokens Referenced
| Token | Value | Usage |
|---|---|---|
| [token-name] | [value] | [where used] |

## Handoff Notes for @effie-frontend
[Anything non-obvious about the implementation that the spec doesn't make clear]
```

## WCAG 2.1 AA Audit Checklist

When reviewing an existing frontend implementation, check:

**Color & Contrast**
- [ ] Text contrast ratio ≥ 4.5:1 (normal text) or 3:1 (large text/UI components)
- [ ] No information conveyed by color alone

**Keyboard & Focus**
- [ ] All interactive elements reachable by Tab
- [ ] No keyboard traps
- [ ] Visible focus indicator on all focusable elements
- [ ] Logical tab order matches visual reading order

**ARIA & Semantics**
- [ ] Buttons use `<button>`, links use `<a href>`
- [ ] Form inputs have associated `<label>` or `aria-label`
- [ ] Images have `alt` text (empty `alt=""` for decorative images)
- [ ] Modals/dialogs use `role="dialog"` with `aria-labelledby`
- [ ] Dynamic content updates announced via `aria-live`

**Gotchas**
- Purple/blue hues on dark backgrounds often fail contrast — verify with a contrast checker
- Icon-only buttons with no visible text must have `aria-label`
- Placeholder text does NOT count as a label — always use `<label>`
