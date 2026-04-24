---
name: project-discovery
description: Detect project scope, language, framework, and conventions before any work begins. Use at /forge start to build context.
origin: ohmyclaude
---

# Project Discovery

Understand the target project before routing or implementing. This skill runs in the orchestrator context at the start of every `/forge` invocation, before spawning `@paige-product`. Paige consumes its context block as input; she never invokes discovery herself.

**Tool priority:** `tree` → `Glob/Grep`. Nothing is required — the plugin ships md files only.

## When to Activate

- First action in any `/forge` request
- When entering a new codebase for the first time
- When context about the project is missing or stale

## Discovery Steps (tool priority: tree > grep)

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

**Primary — `mcp__ohmyclaude-fs__tree`** (plugin-owned, always available when ohmyclaude is installed):
```
mcp__ohmyclaude-fs__tree({ maxDepth: 3 })
```

**Fallback 1 — Bash `tree` CLI** (if the MCP server isn't loaded for any reason):
```bash
tree -I 'node_modules|.git|target|dist|build|.gradle|__pycache__|venv' --dirsfirst -L 3
```

**Fallback 2 — Glob:**
```
Glob for: **/src/**/*.{java,ts,tsx,go,py,rs}
```

A graph backend may be re-introduced in a future release; discovery will prefer it when present, while keeping the tree fallback.

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
- If Java detected → activate `java-source-intel` for semantic queries (callers, impact, annotation scans) using text-based tools.

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
Size: {file count from tree -L 3}
```

## Key Rules

- Discovery is read-only — never modify project files during discovery
- Keep the context summary under 200 tokens
- If CLAUDE.md exists, its conventions override defaults
