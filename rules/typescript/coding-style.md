---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Coding Style

## Naming
- Classes/Types/Interfaces: PascalCase (`UserService`, `OrderDto`)
- Functions/variables: camelCase (`findBySlug`, `userRepository`)
- Constants: UPPER_SNAKE_CASE (`MAX_PAGE_SIZE`)
- Files: kebab-case (`user-service.ts`), React components PascalCase (`UserCard.tsx`)

## Types
- Prefer `interface` for object shapes extended across files; `type` for unions, intersections, mapped types
- Never use `any` — use `unknown` and narrow explicitly
- Avoid non-null assertion `!` unless following an immediately prior narrow
- Avoid `as` casts; prefer type guards (`in`, `typeof`, user-defined predicates)

## Immutability
- `readonly` on fields that never reassign after construction
- `ReadonlyArray<T>` / `readonly T[]` for inputs you won't mutate
- Prefer `const` + spread over mutation; no `push`/`splice` on shared state

## Null Handling
- `strict: true` and `strictNullChecks: true` in tsconfig — not optional
- Return `undefined` (not `null`) from maybe-empty lookups; reserve `null` for explicit DB/JSON interop
- Narrow with `if (x == null)` to catch both

## Formatting
- 2 spaces (project standard)
- One public top-level export per file when feasible
- Member order: static, fields, constructor, public, protected, private
