# ohmyclaude Roadmap

## v0.1.0 — Foundation (current)

### Agents
- [x] Hermes — Orchestrator & planner
- [x] Hephaestus — Deep implementer
- [x] Athena — Code reviewer (read-only)
- [x] Apollo — Architect (read-only)
- [x] Argus — Security reviewer (read-only)
- [x] Heracles — Debugger
- [x] Momus — Test writer & TDD enforcer
- [x] Mnemosyne — Documentation writer
- [x] Metis — Requirements clarifier & pre-planning consultant
- [x] Nemesis — Plan consultant & validator
- [x] Eris — Devil's advocate & challenger

### Skills
- [x] git-workflow
- [x] tdd-patterns
- [x] api-design
- [x] error-handling
- [x] code-review

### Commands
- [x] /ultrawork — full pipeline, single entry
- [x] /plan
- [x] /review
- [x] /commit
- [x] /scaffold
- [x] /debug

### Contexts
- [x] dev — implementation mode
- [x] review — code & security review mode
- [x] plan — planning pipeline mode
- [x] debug — root cause investigation mode
- [x] research — exploration mode

### Hooks
- [x] pre-write-check (block writes with secrets)
- [x] post-bash-lint (run linter after changes)
- [x] session-summary (write session summary on Stop)

### Rules
- [x] engineering-standards.md

---

## v0.2.0 — LSP + MCP

- [ ] LSP MCP server: goto-definition, find-references, symbols, diagnostics, rename
- [ ] Language server auto-detection (TS, Python, Go, Rust)
- [ ] Exa web search MCP (requires `EXA_API_KEY`)
- [ ] grep.app code search MCP (no auth)
- [ ] Skills: performance-patterns, security-patterns, database-patterns

---

## v0.3.0 — Hook Depth

- [ ] Session context persistence (SessionStart/Stop)
- [ ] Secret detection with entropy analysis
- [ ] Cost tracker (`~/.claude/ohmyclaude/costs.jsonl`)
- [ ] Desktop notifications on long task completion
- [ ] Hook profiles via `OHMYCLAUDE_PROFILE=minimal|standard|strict`
- [ ] Pre-commit quality gate hook (lint + test before git commit)

---

## v1.0.0 — Polish & Distribution

- [ ] marketplace.json for Claude Code marketplace
- [ ] install.sh one-liner
- [ ] Plugin validation tests
- [ ] Multi-harness: Codex support (`.codex-plugin/plugin.json`)
- [ ] COMMANDS-QUICK-REF.md
- [ ] Full AGENTS.md user guide
