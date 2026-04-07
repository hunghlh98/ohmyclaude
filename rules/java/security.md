---
paths:
  - "**/*.java"
---

# Java Security Rules

## SQL Injection
- Use Spring Data repositories or parameterized `@Query`
- Never concatenate strings in native queries
- Use `:param` bindings with `@Param`

## Input Validation
- `@Valid` on all `@RequestBody` parameters
- Bean Validation constraints on DTOs (`@NotBlank`, `@Email`, `@Size`)
- Sanitize HTML input before rendering

## Authentication
- Stateless JWT with `OncePerRequestFilter`
- `httpOnly`, `Secure`, `SameSite=Strict` for cookies
- Deny by default; `@PreAuthorize` on sensitive endpoints

## Secrets
- No secrets in source or `application.yml`
- Use `${DB_PASSWORD}` env var placeholders
- Never log tokens, passwords, or PII

## CSRF
- Keep enabled for browser session apps
- Disable only for pure API with Bearer tokens + stateless sessions
