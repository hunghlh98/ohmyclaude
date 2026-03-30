# Engineering Standards

These rules apply to all code written or reviewed within this project.

## Code Structure

- Functions: max 50 lines
- Files: max 400 lines (hard limit 800)
- Nesting depth: max 4 levels — prefer early returns
- One responsibility per function, one concern per module

## Naming

- Use names that reveal intent: `getUserById` not `get`, `processPaymentRefund` not `handle`
- Match the naming convention already in use in the file (camelCase, snake_case, etc.)
- No single-letter variables except loop indexes (`i`, `j`) and math variables

## Immutability

- Never mutate function parameters
- Prefer `const` over `let`; never use `var`
- Return new objects instead of mutating input objects

## Error Handling

- Every async operation must have error handling
- Never swallow errors silently: `catch (e) {}` is forbidden
- Operational errors return `Result` types or throw typed errors
- Programmer errors (unexpected state) should throw and crash

## Secrets and Configuration

- No hardcoded API keys, passwords, or tokens — ever
- All config comes from environment variables
- Keep `.env.example` updated when adding new variables

## Tests

- All business logic must have unit tests
- All integration points must have integration tests
- Failing tests block merge — no exceptions
- Tests must be deterministic (no sleep, no random without seed)

## Dependencies

- Justify every new dependency: does it exist in stdlib? Is there an existing dep that does this?
- Pin major versions; review minor/patch updates
- No dependencies with known critical CVEs

## Security (minimum baseline)

- Validate all user input at system boundaries
- Use parameterized queries — no string concatenation in SQL
- Hash passwords with bcrypt/argon2 — never MD5/SHA1/plaintext
- Escape HTML output to prevent XSS
- Check authorization before every sensitive operation — not just authentication

## Git

- Commits follow Conventional Commits format (`feat:`, `fix:`, `refactor:`, etc.)
- Each commit is a single logical change
- No generated files, build artifacts, or `.env` files in version control

## What Not To Do

- No `console.log` in production code (use a logger)
- No `any` type in TypeScript (use `unknown` and narrow)
- No `TODO` comments in merged code (file an issue)
- No dead code — delete it, don't comment it out
- No premature abstraction — three similar lines of code is not a pattern
