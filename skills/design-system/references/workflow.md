# Design System Workflow, Documentation, and Governance

Phase-by-phase workflow for building, adopting, and maintaining a design system. Pair with `checklists/design-system-checklist.md` for a line-item audit.

---

## Documentation Standards

Each component should document:

- **Purpose**: what the component does
- **Usage**: import statement and basic example
- **Variants**: available visual styles
- **Props**: complete prop table with types, defaults, descriptions
- **Accessibility**: keyboard support, ARIA attributes, screen reader behavior
- **Examples**: common use cases with code

Use Storybook, Docusaurus, or similar for interactive documentation. See `templates/component-template.tsx` for the standard component structure.

---

## 1. Design Phase

- **Audit existing patterns**: identify inconsistencies across current surfaces (take screenshots of every button, every card, every form — you'll find 40 variants of "button").
- **Define design tokens**: colors, typography, spacing — these lock first.
- **Create component inventory**: list all needed components, prioritize by usage frequency.
- **Design in Figma**: build the component library with variants and auto-layout.

**Exit criteria**: tokens locked, inventory prioritized, Figma library published for review.

---

## 2. Development Phase

- **Set up tooling**: Storybook, TypeScript, testing (Jest + Testing Library), visual regression (Chromatic/Percy).
- **Implement tokens**: CSS variables or theme config — see `theming.md`.
- **Build atoms first**: start with primitives (Button, Input, Label, Icon). Don't build molecules until atoms are stable.
- **Compose upward**: build molecules (FormField, Card), then organisms (Modal, Table).
- **Document as you go**: write docs alongside code, not as a backfill project.

**Exit criteria**: atoms + key molecules shipped to Storybook, tests green, a11y audit passed.

---

## 3. Adoption Phase

- **Create migration guide**: help teams adopt — show before/after for common patterns.
- **Provide codemods**: automate migrations with jscodeshift/ts-morph when possible.
- **Run workshops**: train teams on usage, composition patterns, and when NOT to use the system.
- **Gather feedback**: iterate based on real usage, not imagined needs.

**Exit criteria**: at least one product team migrated end-to-end.

---

## 4. Maintenance Phase

- **Version semantically**: major/minor/patch releases per SemVer. Breaking token changes = major.
- **Deprecation strategy**: phase out old components gracefully — warn in console for 1-2 minors before removal.
- **Changelog**: document all changes (Keep a Changelog format).
- **Monitor adoption**: track usage across products (component telemetry or AST grep).

---

## Quick Start Checklist

When creating a new design system, hit these milestones in order:

- [ ] Define design principles and values
- [ ] Establish design token structure (colors, typography, spacing)
- [ ] Create primitive color palette (50-950 scale)
- [ ] Define semantic color tokens (brand, text, background, feedback)
- [ ] Set typography scale and font families
- [ ] Establish spacing scale (4px or 8px base)
- [ ] Design atomic components (Button, Input, Label, etc.)
- [ ] Implement theming system (light/dark mode)
- [ ] Ensure WCAG 2.1 Level AA compliance
- [ ] Set up documentation (Storybook or similar)
- [ ] Create usage examples for each component
- [ ] Establish versioning and release strategy
- [ ] Create migration guides for adopting teams

The detailed audit checklist in `checklists/design-system-checklist.md` expands each of these into line items for launch readiness.
