# ohmyclaude

Multi-agent orchestration for Claude Code. 11 specialist agents named after Greek gods, quality automation hooks, domain skills that activate when you need them, and session contexts that keep Claude in the right working mode.

Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) and [everything-claude-code](https://github.com/affaan-m/everything-claude-code).

## Agents

### Orchestration & Planning

| Agent | Role | Model |
|-------|------|-------|
| **Metis** | Requirements clarifier — asks the right questions before planning | sonnet |
| **Hermes** | Orchestrator — decomposes tasks, routes to specialists | sonnet |
| **Nemesis** | Plan consultant — validates plans for executability and completeness | sonnet |
| **Eris** | Challenger — devil's advocate, stress-tests plans and implementations | sonnet |

### Implementation

| Agent | Role | Model |
|-------|------|-------|
| **Hephaestus** | Implementer — writes code autonomously | sonnet |
| **Heracles** | Debugger — root cause analysis and fixes | sonnet |
| **Momus** | Test writer — TDD enforcer | sonnet |
| **Mnemosyne** | Documentation writer | haiku |

### Review & Analysis (read-only)

| Agent | Role | Model |
|-------|------|-------|
| **Athena** | Code reviewer — quality arbiter | sonnet |
| **Apollo** | Architect — system design and trade-offs | opus |
| **Argus** | Security reviewer — OWASP Top 10 | sonnet |

### Recommended Agent Workflow

```
User request
  ↓ @metis  — Clarify requirements (if vague)
  ↓ @hermes — Plan with agent assignments
  ↓ @nemesis — Validate the plan
  ↓ @eris   — Challenge assumptions (optional)
  ↓ @hephaestus — Implement
  ↓ @momus  — Write/run tests
  ↓ @athena — Review code quality
  ↓ @argus  — Security review
  ↓ @mnemosyne — Document
```

## Commands

| Command | Action |
|---------|--------|
| `/ultrawork` | **Super single entry** — full pipeline, one command |
| `/plan` | Planning only → Metis + Hermes |
| `/review` | Code review → Athena |
| `/commit` | Semantic commit message from diff |
| `/scaffold` | Generate project boilerplate |
| `/debug` | Structured debugging → Heracles |

## Hooks

- **pre-write-check** — Blocks writes containing hardcoded secrets
- **post-bash-lint** — Runs linter after bash commands that modify source files
- **session-summary** — Writes session summary to `~/.claude/ohmyclaude/` on Stop

## Skills

Activate automatically by keyword:

- **git-workflow** — Triggered by: commit, branch, PR, merge, rebase
- **tdd-patterns** — Triggered by: test, red-green-refactor, TDD
- **api-design** — Triggered by: endpoint, REST, GraphQL, OpenAPI
- **error-handling** — Triggered by: error, exception, try/catch, Result
- **code-review** — Triggered by: review, PR comment, quality gate

## Contexts

Launch Claude already in the right working mode. The installer adds shell aliases that inject the context as a system prompt:

```bash
claude-dev       # implementation — @hephaestus builds, @momus tests
claude-review    # code & security review — @athena + @argus, read-only
claude-plan      # planning pipeline — @metis → @hermes → @nemesis → @eris
claude-debug     # root cause — @heracles investigates and fixes
claude-research  # exploration — @metis + @apollo, no code until clear
```

Each alias expands to:
```bash
claude --system-prompt "$(cat ~/.claude/contexts/<mode>.md)"
```

| Mode | Primary agents | Use when |
|------|---------------|----------|
| `dev` | Hephaestus, Momus, Heracles | Writing or fixing code |
| `review` | Athena, Argus | Reviewing a PR or diff |
| `plan` | Metis, Hermes, Nemesis, Eris | Starting a new feature |
| `debug` | Heracles | Something is broken |
| `research` | Metis, Apollo | Exploring an unfamiliar codebase |

## Install

```bash
# Clone into your user plugin directory
git clone https://github.com/hunghlh98/ohmyclaude ~/.claude/plugins/ohmyclaude

# Or install via Claude Code marketplace (v1.0+)
claude plugin install ohmyclaude
```

## LSP Support (v0.2+)

Language server tooling via MCP — go-to-definition, find-references, diagnostics, symbols, rename. Requires Node.js and the relevant language server installed.

## Roadmap

See [ROADMAP.md](./ROADMAP.md).
