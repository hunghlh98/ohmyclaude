---
name: project-discovery
description: Detect project scope, language, framework, and conventions before any work begins. Use at /forge start to build context.
origin: ohmyclaude
---

# Project Discovery

Understand the target project before routing or implementing. This skill runs at the start of every `/forge` invocation.

## When to Activate

- First action in any `/forge` request
- When entering a new codebase for the first time
- When context about the project is missing or stale

## Discovery Steps (tool priority: graph > tree > grep)

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

**If code-review-graph is available:**
```
list_graph_stats_tool → graph exists?
  YES → get_minimal_context_tool (~100 tokens)
      → get_architecture_overview_tool (communities, flows)
  NO  → suggest: "Run /code-review-graph:build-graph for enhanced analysis"
        continue with tree
```

**Fallback — tree CLI:**
```bash
tree -I 'node_modules|.git|target|dist|build|.gradle|__pycache__|venv' --dirsfirst -L 3
```

**Last resort — Glob:**
```
Glob for: **/src/**/*.{java,ts,tsx,go,py,rs}
```

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

### 4. Load Rules

Based on detected language, load relevant rules:
- `rules/java/` for Java projects (coding-style, patterns, security, testing)
- `rules/common/` always loaded

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
Graph: {available | not available}
```

## Key Rules

- Discovery is read-only — never modify project files during discovery
- Keep the context summary under 200 tokens
- If CLAUDE.md exists, its conventions override defaults
- Always suggest code-review-graph if not installed (one-time, not every invocation)
