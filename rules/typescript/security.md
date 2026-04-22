---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Security Rules

## XSS
- Never set `dangerouslySetInnerHTML` with user input; if unavoidable, sanitize via DOMPurify first
- No `document.write`; no `innerHTML` on user-controlled strings
- URLs in `href`/`src` from user input must be validated against an allow-list of protocols (`https:`, `mailto:`)

## Prototype Pollution
- Never `Object.assign({}, userInput)` without a prototype-safe allow-list of keys
- Parse JSON with `JSON.parse` only; guard against `__proto__`, `constructor`, `prototype` keys
- Use `Object.create(null)` for dictionaries populated from external data

## Input Validation
- Validate every request body with zod / valibot / io-ts at the boundary — not inside handlers
- Never trust `req.body` or `req.params` shape from type declarations alone
- Strip or reject unknown properties (`.strict()` in zod)

## Secrets
- No secrets in source, `.env.example`, or client-bundled code
- Access via `process.env.KEY` server-side only; never `NEXT_PUBLIC_*` for secrets
- Never log tokens, cookies, or auth headers

## Unsafe APIs
- No `eval`, no `Function(...)` constructor, no `setTimeout(string, ...)` form
- Limit `postMessage` targets to specific origins, never `*`
- CSP header with `script-src 'self'` at minimum for browser apps

## Dependencies
- Pin exact versions in `package.json` for production deps; allow `^` only for dev deps
- Run `npm audit` in CI and fail on high/critical findings
