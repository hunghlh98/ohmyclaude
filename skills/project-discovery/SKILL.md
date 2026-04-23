---
name: project-discovery
description: Detect project scope, language, framework, and conventions before any work begins. Use at /forge start to build context.
origin: ohmyclaude
---

# Project Discovery

Understand the target project before routing or implementing. This skill runs at the start of every `/forge` invocation.

**Tool priority (soft-detect, graceful fallback):** `codegraph` → `code-review-graph` → `tree` → `Glob/Grep`. Nothing is required — the plugin ships md files only; external tools are opportunistic.

## When to Activate

- First action in any `/forge` request
- When entering a new codebase for the first time
- When context about the project is missing or stale

## Discovery Steps (tool priority: codegraph > code-review-graph > tree > grep)

### 1. Read Project Config

Check for these files (in order):
- `CLAUDE.md` — project-level guidance, conventions, architecture notes
- `.claude/` directory — local agents, skills, settings
- `package.json` — Node/TS project (name, scripts, dependencies)
- `pom.xml` / `build.gradle` — Java/Spring project
- `go.mod` — Go project
- `Cargo.toml` — Rust project
- `pyproject.toml` / `requirements.txt` — Python project

### 2. Get Project Structure

Probe graph backends in priority order. **Soft detect** — never error if a backend is absent; fall to the next tier.

**Tier 1 — codegraph** (check first if `.codegraph/` exists or codegraph MCP tools are loaded):
```
mcp__codegraph__codegraph_status       → is graph indexed?
  YES → mcp__codegraph__codegraph_files  (file structure, ~100 tokens)
        For deep "how does X work?" questions, spawn an Explore subagent
        that uses mcp__codegraph__codegraph_context / codegraph_explore —
        never call those from the main session (they return large source
        blobs and pollute main context).
  NO  → suggest once: "Run `codegraph init -i` to index this project"
        continue to tier 2
```

**Tier 2 — code-review-graph** (check if MCP tools `mcp__plugin_code-review-graph__*` are loaded):
```
list_graph_stats_tool → inspect files_count
  files_count > 0 → get_minimal_context_tool (~100 tokens)
                  → get_architecture_overview_tool (communities, flows)
  files_count == 0 → build_or_update_graph_tool (bootstrap once per session)
                     then retry stats + context calls above
                     Skip the bootstrap and suggest the manual command
                     /code-review-graph:build-graph if the repo is obviously
                     large (> ~500 source files by tree count) — full builds
                     on huge repos can be slow and should be user-initiated.
```

**Tier 3 — tree CLI** (always available on macOS/Linux with `brew install tree` / `apt install tree`):
```bash
tree -I 'node_modules|.git|target|dist|build|.gradle|__pycache__|venv' --dirsfirst -L 3
```

**Last resort — Glob:**
```
Glob for: **/src/**/*.{java,ts,tsx,go,py,rs}
```

Install-suggestion rule: each tier emits its suggestion **at most once per session**. Do not repeat on every discovery call.

### 3. Detect Language & Framework

| File Found | Language | Framework |
|-----------|----------|-----------|
| `pom.xml` + `src/main/java/` | Java | Spring Boot (check for spring-boot-starter-*) |
| `build.gradle` + `src/main/java/` | Java | Spring Boot or Gradle project |
| `package.json` + `src/**/*.tsx` | TypeScript | React (check for react in deps) |
| `package.json` + `src/**/*.ts` | TypeScript | Node.js / Express / NestJS |
| `go.mod` | Go | Check for gin/echo/fiber in go.sum |
| `pyproject.toml` | Python | Check for django/fastapi/flask |
| `Cargo.toml` | Rust | Check for actix/axum/rocket |

### 4. Load Rules & Language Skills

Based on detected language, load relevant rules:
- `rules/java/` for Java projects (coding-style, patterns, security, testing)
- `rules/common/` always loaded

**Language-specific investigation skills:**
- If Java detected → activate `java-source-intel` for semantic queries (callers, impact, annotation scans). The skill routes across whichever graph backend is present.

### 5. Build Context Summary

Output a compact project context block for @paige-product:

```
Project: {name}
Language: {Java 17 / TypeScript / Go / ...}
Framework: {Spring Boot 3.x / React 18 / ...}
Structure: {monolith / monorepo / microservice}
Test framework: {JUnit 5 / Jest / go test / pytest}
Build tool: {Maven / Gradle / npm / cargo}
Key directories: {src/main/java/..., src/test/...}
Graph: {codegraph | code-review-graph | none}
```

## Key Rules

- Discovery is read-only — never modify project files during discovery
- Keep the context summary under 200 tokens
- If CLAUDE.md exists, its conventions override defaults
- Install suggestions (codegraph / code-review-graph) are one-time per session, not per invocation
