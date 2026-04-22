---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Patterns

## React Components
- Function components only; no class components in new code
- One component per file; named export matches filename
- Props as a dedicated `interface` or `type` above the component
- Prefer composition over inheritance; lift state only when two siblings need it

## Hooks
- Call hooks at top level — never inside loops, conditions, or nested functions
- Custom hook names start with `use`; return tuple `[value, setValue]` or object, not both
- Every effect has an exhaustive dep array; list everything it reads
- `useCallback` / `useMemo` only when profiling shows the need — not prophylactically

## Async
- `async`/`await` over raw promise chains
- Never `await` inside a `for (... of ...)` when items are independent — use `Promise.all`
- Always handle rejection: `try/catch` or `.catch`; don't fire-and-forget

## Error Boundaries
- Wrap route-level subtrees in an error boundary; never the whole app in a single boundary
- Log error + component stack to your observability layer, not `console.error` in prod
- Render a bounded fallback; no recursive re-renders on error

## State Management
- Local state first; lift only when ≥2 siblings share it; context for widely-read config
- Reach for a store (Redux/Zustand/Jotai) only when prop-drilling exceeds 3 levels
- Derive from state; don't duplicate derivable values into state
