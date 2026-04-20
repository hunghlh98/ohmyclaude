---
name: sc-build
description: Project compilation, packaging, and artifact generation with error analysis and environment-specific optimization. Used by @beck-backend and @effie-frontend before TEST stage. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-build — Build and Packaging

Execute project builds with configuration-driven orchestration, intelligent error analysis, and environment-specific optimization.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Project compilation and packaging for different environments (dev / prod / test)
- Build optimization and artifact generation
- Error debugging during build processes
- Deployment preparation and artifact packaging

## Usage

Invoked by:
- `@beck-backend` / `@effie-frontend` — after implementation, before `@quinn-qa` runs tests
- `@devon-ops` — during release cut (production builds)

Parameters:
- `--type dev | prod | test` — environment target
- `--clean` — delete previous artifacts before building
- `--optimize` — apply production optimizations (minification, tree-shaking)
- `--verbose` — detailed output for debugging

## Behavioral Flow

1. **Analyze** — project structure, build configurations, and dependency manifests.
2. **Validate** — build environment, dependencies, and required toolchain components.
3. **Execute** — build process with real-time monitoring and error detection.
4. **Optimize** — apply optimizations; minimize bundle sizes where applicable.
5. **Package** — generate deployment artifacts and a build report.

Key behaviors:

- **Configuration-driven** — respect existing build tooling (Maven, Gradle, npm scripts, Go modules, Cargo, etc.); do not invent new build systems.
- **Intelligent error analysis** — parse failure output, identify root cause, suggest fix.
- **Environment-specific optimization** — dev builds prioritize speed; prod builds prioritize size + correctness.
- **Comprehensive reporting** — timing metrics, artifact sizes, dependency tree.

## Tool Coordination

- **Bash** — build system execution (mvn, gradle, npm, go build, cargo build, …)
- **Read** — configuration analysis (pom.xml, package.json, go.mod, Cargo.toml)
- **Grep** — error parsing and build-log analysis
- **Glob** — artifact discovery and validation
- **Write** — build reports and deployment documentation

## Build Profiles

### `--type dev`
Fast compilation, source maps, no minification. Optimized for iteration.
```
npm run build:dev
mvn compile
go build -tags debug
```

### `--type prod`
Clean build, full optimization, minification, tree-shaking, production config.
```
npm run build --if-present
mvn package -DskipTests=false -P prod
go build -ldflags="-s -w" -tags release
```

### `--type test`
Build + run unit tests, generate coverage artifacts.
```
npm run build && npm test -- --coverage
mvn verify
go test ./... -cover
```

## Error Analysis

When a build fails, parse the output and identify category:

| Category | Signal | Suggested action |
|---|---|---|
| Dependency | "cannot find module", "class not found" | `npm install` / `mvn install` / verify lockfile |
| Syntax | "Parse error", "Unexpected token" | Grep the file:line, apply fix |
| Type | "Type X is not assignable", "incompatible types" | Check signatures, narrow types |
| Config | "cannot resolve config", "plugin not found" | Verify build config (tsconfig, pom, gradle) |
| Environment | "env var X not set", "permission denied" | Check .env, permissions, CI env |

Escalate to `@heracles` (sc-troubleshoot) if root cause is unclear after initial triage.

## Examples

### Standard project build
```
Trigger: @beck-backend post-implementation
Parameters: (defaults)
Process: detect build system → run default target → report artifacts + timing
```

### Production optimization build
```
Trigger: @devon-ops before release cut
Parameters: --type prod --clean --optimize
Process: clean workspace → prod build → minify → report artifact sizes
```

### Development iteration
```
Trigger: @effie-frontend iterating on a component
Parameters: --type dev --verbose
Process: incremental build with full source maps and detailed output
```

### Build verification
```
Trigger: @quinn-qa before running the main test suite
Parameters: --type test
Process: build + run unit tests + generate coverage → pass to sc-test
```

## Boundaries

### Will
- Execute project build systems using existing configurations
- Provide error analysis and optimization recommendations
- Generate deployment-ready artifacts with detailed reporting

### Will Not
- Modify build system configuration or create new build scripts
- Install missing build dependencies or development tools
- Execute deployment beyond artifact preparation

**Next step**: after a clean build, `@quinn-qa` runs `sc-test`. `@devon-ops` uses the build output in release-cut.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: added per-profile command examples for Java/Spring, Node, and Go so agents have concrete invocations; added error-category triage table with escalation path to `@heracles`.
