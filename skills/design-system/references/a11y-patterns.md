# Accessibility Patterns (WCAG 2.1 Level AA)

Reference patterns for meeting WCAG 2.1 AA in a design system. For a line-item audit checklist, use `checklists/design-system-checklist.md`.

---

## Color Contrast

- **Normal text** (< 18pt): 4.5:1 minimum
- **Large text** (>= 18pt or >= 14pt bold): 3:1 minimum
- **UI components and graphical objects**: 3:1 minimum

**Tools**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/), Stark (Figma), axe DevTools.

Validate every `{text.*} × {background.*}` semantic-token pair before shipping.

---

## Keyboard Navigation

Every interactive element must be reachable and operable via keyboard. Never block Tab/Shift+Tab.

```typescript
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</button>

// Focus trap inside a modal
<Modal>
  <FocusTrap>
    {/* Modal content */}
  </FocusTrap>
</Modal>
```

**Rules:**
- Use native `<button>`, `<a>`, `<input>` — they give keyboard support for free.
- Custom controls (`div` with `onClick`) require `role`, `tabIndex={0}`, and key handlers for Enter/Space.
- Every dialog/menu must trap focus and restore it to the opener on close.
- Provide a visible focus ring (`:focus-visible` with 2px offset) — never remove outlines without replacement.

---

## ARIA Attributes

Essential ARIA patterns:

| Attribute | Use |
|---|---|
| `aria-label` | Accessible name for icon-only buttons |
| `aria-labelledby` | Reference another element as the label |
| `aria-describedby` | Reference hint/error text |
| `aria-expanded` | Collapsible/disclosure state |
| `aria-controls` | Associate toggle with controlled element |
| `aria-live` | Announce dynamic content changes (`polite`, `assertive`) |
| `aria-busy` | Loading state (pair with spinner) |
| `aria-modal` | Dialog traps interaction |
| `aria-current` | Current page in nav |

**First rule of ARIA**: don't use ARIA if a native element will do. `<button>` beats `<div role="button">` every time.

---

## Screen Reader Support

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`).
- Avoid div/span soup for interactive elements.
- Provide meaningful labels for all form controls (explicit `<label htmlFor>`).
- Hide decorative icons with `aria-hidden="true"`.
- Use visually-hidden text (`sr-only` class) for context that sighted users get from layout.

See `component-examples.md` for the Skip Link pattern and `sr-only` CSS.

---

## Operable Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Visible focus indicators (outline, ring) — never `outline: none` without replacement
- [ ] No keyboard traps (users can navigate away)
- [ ] "Skip to main content" link at top of page
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Motion can be reduced (`prefers-reduced-motion`)

---

## Understandable Checklist

- [ ] `<html lang="en">` declared
- [ ] Form inputs have associated labels
- [ ] Error messages are clear and actionable (not "Invalid input")
- [ ] Navigation is consistent across pages
- [ ] Link text describes destination (not "click here")

---

## Robust Checklist

- [ ] HTML validates
- [ ] ARIA roles, states, and properties are correct
- [ ] Interactive elements have accessible name, role, value
- [ ] Tested with NVDA, VoiceOver, or JAWS at least once per major release
