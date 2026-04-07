---
paths:
  - "**/*.java"
---

# Java Coding Style

## Naming
- Classes/Records: PascalCase (`MarketService`, `Money`)
- Methods/fields: camelCase (`findBySlug`, `marketRepository`)
- Constants: UPPER_SNAKE_CASE (`MAX_PAGE_SIZE`)
- Packages: lowercase, no underscores (`com.example.app.service`)

## Immutability
- Prefer records for DTOs and value objects
- Use `final` fields; provide getters only, no setters
- Use `List.of()`, `Map.of()` for immutable collections

## Optional
- Return `Optional` from `find*` methods
- Use `map`/`flatMap`/`orElseThrow` — never call `.get()` without `.isPresent()`

## Null Handling
- Use `@NotNull`, `@NotBlank` Bean Validation on inputs
- Accept `@Nullable` only when unavoidable

## Formatting
- 2 or 4 spaces consistently (project standard)
- One public top-level type per file
- Member order: constants, fields, constructors, public methods, private methods
