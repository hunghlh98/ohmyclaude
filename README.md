# ohmyclaude

Multi-agent orchestration for Claude Code — 13 specialist agents, quality hooks, domain skills, and session contexts.

> Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) and [everything-claude-code](https://github.com/affaan-m/everything-claude-code).

---

## Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/hunghlh98/ohmyclaude/main/install.sh)
```

Or clone manually:
```bash
git clone https://github.com/hunghlh98/ohmyclaude ~/.claude/plugins/ohmyclaude
cd ~/.claude/plugins/ohmyclaude && bash install.sh
```

Profiles: `minimal` · `developer` (default) · `polyglot` · `security` · `full`

```bash
bash install.sh polyglot   # adds Java, Go, Python, Rust, Kotlin, C++, Flutter reviewers
```

---

## Quick Start

**One command, full pipeline:**
```
/ultrawork add rate limiting to the /api/users endpoint
```

**Or invoke agents directly:**
```
@metis  — clarify a vague requirement
@hermes — decompose and plan a task
@athena — review changed code
@argus  — security audit
@hephaestus — implement something
@polyglot-reviewer — review Java / Go / Python / Rust / Kotlin / C++ / Flutter / SQL
@build-resolver — fix a broken build (any language)
```

**Session contexts** — launch Claude already in the right mode:
```bash
claude-dev      # build mode  — hephaestus + momus
claude-review   # review mode — athena + argus
claude-plan     # plan mode   — metis → hermes → nemesis
claude-debug    # debug mode  — heracles
claude-research # explore mode — metis + apollo
```

---

## Agents

| Group | Agent | Does |
|-------|-------|------|
| Plan | **Metis** | Clarifies vague requirements before planning |
| Plan | **Hermes** | Decomposes tasks, assigns to specialists |
| Plan | **Nemesis** | Validates plans — approval bias, max 3 blockers |
| Plan | **Eris** | Stress-tests plans across 7 adversarial scenarios |
| Build | **Hephaestus** | Implements features and fixes — goal-oriented |
| Build | **Heracles** | Debugs failures to root cause |
| Build | **Momus** | Writes TDD tests — RED→GREEN→REFACTOR |
| Build | **Mnemosyne** | Writes docs, READMEs, changelogs |
| Review | **Athena** | Reviews JS/TS quality, correctness, React/Node |
| Review | **Apollo** | Architects systems, writes ADRs |
| Review | **Argus** | OWASP security audit |
| Lang | **polyglot-reviewer** | Language-aware review — detects and checks Java / Kotlin / Go / Python / Rust / TypeScript / C++ / Flutter / DB |
| Lang | **build-resolver** | Fixes build errors — Maven, Gradle, Cargo, tsc, CMake, go build |

---

## Commands

| Command | What it does |
|---------|-------------|
| `/ultrawork <task>` | Full pipeline: clarify → plan → challenge → implement → test → review → secure → document |
| `/plan <task>` | Plan only — Metis + Hermes |
| `/review [path]` | Code review — Athena (add `--security` for Argus) |
| `/debug <issue>` | Root cause analysis — Heracles |
| `/commit` | Semantic commit message from diff |
| `/scaffold <stack>` | Generate project boilerplate |

---

## Skills (auto-activate by keyword)

`git-workflow` · `tdd-patterns` · `api-design` · `error-handling` · `code-review`

---

## Hooks

- **pre-write-check** — blocks writes with hardcoded secrets
- **post-bash-lint** — runs linter after bash edits source
- **session-summary** — writes session log to `~/.claude/ohmyclaude/`

---

[Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md)
