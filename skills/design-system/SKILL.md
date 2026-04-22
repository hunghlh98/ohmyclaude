---
name: design-system
origin: ohmyclaude
description: Create and evolve design systems with design tokens, component architecture, WCAG 2.1 AA accessibility audit (contrast ratios, ARIA roles, keyboard navigation), and documentation templates. Used by @una-ux when authoring UX-SPEC-<id>.md and auditing frontend accessibility.
license: MIT
metadata:
  version: 1.0.0
  tags: [design-system, ui, components, design-tokens, accessibility, frontend]
---

# Design System Starter

Build robust, scalable design systems that ensure visual consistency and exceptional user experiences.

---

## Quick Start

Just describe what you need:

```
Create a design system for my React app with dark mode support
```

The skill provides tokens, components, and accessibility guidelines.

---

## Triggers

| Trigger | Example |
|---------|---------|
| Create design system | "Create a design system for my app" |
| Design tokens | "Set up design tokens for colors and spacing" |
| Component architecture | "Design component structure using atomic design" |
| Accessibility | "Ensure WCAG 2.1 compliance for my components" |
| Dark mode | "Implement theming with dark mode support" |

---

## Bundled Resources

Progressive disclosure — load only what the task requires.

| Path | Use when |
|---|---|
| `references/tokens.md` | Defining/extending the color, typography, spacing, radius, shadow token taxonomy |
| `references/components.md` | Planning atomic hierarchy, API contracts, polymorphism, controlled/uncontrolled patterns |
| `references/component-examples.md` | Need a concrete React+TypeScript implementation (Button, Card, Modal, FormField, Input, Navigation, ThemeToggle, SkipLink, polymorphic button) |
| `references/theming.md` | Choosing between CSS variables, Tailwind `dark:`, ThemeProvider; multi-brand theming |
| `references/a11y-patterns.md` | WCAG 2.1 AA contrast, keyboard, ARIA, screen-reader patterns |
| `references/workflow.md` | Phase-by-phase build plan (design → dev → adoption → maintenance) |
| `checklists/design-system-checklist.md` | Line-item audit before launching v1 |
| `templates/design-tokens-template.json` | W3C design-tokens starter to copy into a project |
| `templates/component-template.tsx` | Standard component file structure |

---

## Core Principles

1. **Consistency over creativity** — predictable patterns reduce cognitive load; users learn once, apply everywhere.
2. **Accessible by default** — WCAG 2.1 AA minimum; keyboard navigation and screen-reader support from the start, not as a backfill.
3. **Scalable and maintainable** — design tokens enable global changes; composition beats duplication; version deprecations, never silent removals.
4. **Developer-friendly** — clear API contracts, sensible defaults, comprehensive docs.

A design system is not just a component library. It is: (1) **design tokens**, (2) **components**, (3) **patterns**, (4) **guidelines**, (5) **documentation**. Missing any one of these five is how systems rot.

---

## Design Tokens Primer

Use a two-layer model:

- **Primitive tokens** — raw values (e.g. `color.primitive.blue.600 = #2563eb`). Never referenced by components directly.
- **Semantic tokens** — contextual aliases (e.g. `color.semantic.brand.primary = {color.primitive.blue.600}`). Components consume these.

This indirection is what lets you reskin (light/dark, white-label) without touching component code.

Token categories: **color**, **typography**, **spacing**, **border-radius**, **shadow**, plus secondary categories (transitions, z-index, breakpoints). Every semantic color pair must meet WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large text / UI).

Full token JSON catalogs with examples for each category: `references/tokens.md`. W3C-format starter: `templates/design-tokens-template.json`.

---

## Component Architecture Primer

Atomic Design taxonomy:

```
Atoms → Molecules → Organisms → Templates → Pages
```

- **Atoms**: Button, Input, Label, Icon, Badge, Avatar
- **Molecules**: SearchBar, FormField, Card, Alert
- **Organisms**: Navigation, Modal, Table, ProfileSection
- **Templates**: Dashboard layout, Marketing layout, Settings layout
- **Pages**: hydrated templates with real content

Build atoms first, compose upward. Never skip levels. Component API rules of thumb:

- Predictable prop names (`variant`, `size`, `disabled` — consistent across every component)
- Sensible defaults (`variant = 'primary'`, `size = 'md'`)
- Composition over configuration (`<Card.Header>` beats `hasHeader={true}`)
- Polymorphic `as` prop for atoms that might render as link or button
- Forward refs on every atom
- Support both controlled and uncontrolled modes for stateful inputs

Full taxonomy, API principles, and the polymorphic component pattern: `references/components.md`. Working React+TypeScript implementations: `references/component-examples.md`.

---

## When to Adopt vs Extend

Decision flow before you build anything new:

1. **Existing component fits?** Use it. Stop.
2. **Existing component fits with a new variant?** Extend (add a `variant` value). Ship as minor version.
3. **Existing component fits but composition is awkward?** Refactor to compound component (`Card.Header`, `Card.Body`). Ship as minor if backward compatible, major if not.
4. **No existing component fits, but one molecule + one atom combo would work?** Compose in the consumer, don't add a new component yet. Wait for the third use case before promoting.
5. **Third use case arrived?** Promote the composed pattern to a new component. Start at atom level if it's indivisible; molecule if it's an atom combo.
6. **Breaking change to public API?** Major version + migration guide + codemod if feasible. Never silently break.

Always prefer tokens + existing components over new components. Every new component is a maintenance liability.

---

## Output Contract

When @una-ux uses this skill to author `UX-SPEC-<id>.md`, the spec should include:

- **Tokens used**: list of semantic tokens the feature touches (e.g. `brand.primary`, `text.secondary`, `spacing.4`)
- **Components used**: list of existing components, with any required extensions flagged
- **New components proposed**: justified via the decision flow above
- **Accessibility notes**: keyboard flow, ARIA attributes, contrast validation results
- **Responsive behavior**: breakpoints and layout shifts
- **States**: default, hover, focus, active, disabled, loading, error, empty

For accessibility audits, output a line-item report against `checklists/design-system-checklist.md` § Accessibility.

---

## Canonical Example — Button

Minimum viable atom contract:

```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;    // default: 'primary'
  size?: ButtonSize;          // default: 'md'
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

This is the smallest contract that covers four variants × three sizes × six states (default, hover, focus, active, disabled, loading) — exactly what the `checklists/design-system-checklist.md` requires for a launch-ready Button.

Full implementation (Tailwind classes, `aria-busy`, focus rings, icon slot): `references/component-examples.md` § Button.

---

## Workflow

Build → adopt → maintain in four phases: **Design**, **Development**, **Adoption**, **Maintenance**. Each phase has explicit exit criteria before moving on.

Full phase-by-phase plan: `references/workflow.md`. Launch-readiness audit: `checklists/design-system-checklist.md`.
