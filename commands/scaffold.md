---
description: Generate project boilerplate for a given tech stack. Invokes Hephaestus with Apollo's guidance.
---

# /scaffold

Generate project structure and boilerplate files for a new project or module.

## What This Command Does

1. **Apollo** designs the appropriate structure for your stack
2. **Hephaestus** creates the directory tree and boilerplate files
3. **Momus** adds starter tests
4. Output includes: directory structure, config files, entry point, and a README stub

## When to Use

- Starting a new project
- Adding a new module or service to an existing project
- Generating boilerplate for a specific pattern (REST API, React component, CLI tool)

## Usage

```
/scaffold typescript REST API with Express and PostgreSQL
/scaffold React component with Storybook and tests
/scaffold Node.js CLI tool with Commander.js
/scaffold Next.js app with Tailwind and Supabase
/scaffold Python FastAPI service with SQLAlchemy
```

## What Gets Generated

For `/scaffold typescript REST API with Express and PostgreSQL`:

```
src/
├── app.ts              # Express app setup
├── server.ts           # Entry point
├── routes/
│   └── users.ts        # Example resource route
├── controllers/
│   └── users.ts        # Request handlers
├── services/
│   └── users.ts        # Business logic
├── models/
│   └── user.ts         # Data model + DB queries
├── middleware/
│   ├── error.ts        # Error handler
│   └── auth.ts         # Auth middleware stub
└── types/
    └── index.ts        # Shared types
tests/
├── users.test.ts       # Starter integration test
.env.example
tsconfig.json
package.json
```

## Notes

- Generated code follows the conventions in `rules/engineering-standards.md`
- Tests are included but intentionally minimal — Momus writes the real tests
- The scaffold is a starting point, not a finished product

## Related Agents

- **@apollo** — Architecture design decisions
- **@hephaestus** — Implementation
- **@momus** — Tests
