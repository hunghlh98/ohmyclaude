# Theming and Dark Mode

Three proven approaches for runtime theming. Pick one — don't mix.

---

## Theme Shape (TypeScript)

```typescript
interface Theme {
  colors: {
    brand: {
      primary: string;
      secondary: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
    background: {
      primary: string;
      secondary: string;
    };
    feedback: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadow: Record<string, string>;
}
```

---

## Approach 1: CSS Variables (Recommended)

Framework-agnostic, no runtime cost, smallest bundle.

```css
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #000000;
}

[data-theme="dark"] {
  --color-bg-primary: #1a1a1a;
  --color-text-primary: #ffffff;
}
```

Toggle via `document.documentElement.setAttribute('data-theme', 'dark')`.

**Pros:** zero JS to re-render, works across framework boundaries, easy to preview.
**Cons:** values are strings (no type safety at consumption site).

---

## Approach 2: Tailwind CSS Dark Mode

Built-in `dark:` variant driven by a class or media query.

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

Configure `darkMode: 'class'` in `tailwind.config.js` and toggle `document.documentElement.classList.toggle('dark')`.

**Pros:** zero config in components, Tailwind handles purging.
**Cons:** Tailwind lock-in; every component repeats `dark:` variants.

---

## Approach 3: Styled Components / Emotion ThemeProvider

```typescript
const lightTheme = { background: '#fff', text: '#000' };
const darkTheme = { background: '#000', text: '#fff' };

<ThemeProvider theme={isDark ? darkTheme : lightTheme}>
  <App />
</ThemeProvider>
```

**Pros:** full type safety, theme object available via hook.
**Cons:** runtime cost, CSS-in-JS bundle size, re-renders on theme switch.

---

## Theme Toggle Implementation

See `component-examples.md` for a complete `ThemeToggle` that:
- Reads `prefers-color-scheme` on mount
- Persists choice in `localStorage`
- Sets `data-theme` attribute on `<html>`
- Provides an accessible aria-label

---

## Multi-Brand Theming

If you need to support multiple brands (white-label), layer a third token level:

```
primitive → semantic → brand-override
```

Brand overrides only replace semantic tokens (e.g. `brand.primary`), never primitives. Switch at the app root, not per component.
