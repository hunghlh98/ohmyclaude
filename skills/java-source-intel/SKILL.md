---
name: java-source-intel
description: Semantic Java source investigation using text-based tools — find @Transactional boundaries, Spring beans, call chains, annotation usages. Uses ripgrep, find, and tree. Triggers on "find callers", "trace method", "where is X used", "Spring beans", "annotation scan", "Java impact".
origin: ohmyclaude
---

# java-source-intel

Semantic intelligence for Java codebases using text-based tools. The skill is **tool-agnostic at the agent level** — agents ask a question in natural terms ("find all callers of `UserService.login()`"), and this skill provides canonical ripgrep / find patterns that approximate AST queries.

> **Note on precision**: This skill currently uses text-based tools (ripgrep, find, grep). Some queries — interface-inheritor traversal, method-resolution with generic types, transitive impact radius — are fundamentally harder without a semantic graph. A graph backend may be re-introduced in a future release; when it lands, the query patterns in this skill will map onto that backend's tool names. Until then, agents should surface confidence and gaps explicitly.

## When to Activate

- Project discovery detected Java (`pom.xml` + `src/main/java/` or `build.gradle` + `src/main/java/`)
- Agent needs to answer any of:
  - "Find callers / callees of method X"
  - "Where is annotation @Y applied?"
  - "Which classes implement interface Z?"
  - "What's the impact radius of changing method M?"
  - "List all @Transactional boundaries / @RestController beans / @Scheduled tasks"
  - "Trace the call chain from endpoint E to the database"

## Tools

| Tool | Role |
|------|------|
| `rg` (ripgrep) | Primary — multiline regex, file-type filtering, fast |
| `find` | Structural queries (all files matching a name pattern) |
| `mcp__ohmyclaude-fs__tree` | Directory layout overview when scoping a query (plugin-owned, trackable) |
| Bash `tree` | Fallback when the MCP server isn't loaded |
| Native `Grep` / `Glob` | Fallback when `rg` isn't available |

All queries are read-only. No modification of source during investigation.

## Canonical Java Query Patterns

### Q1. Find callers of a method

```
Question: Who calls UserService.login(String, String)?
```

```bash
# Step 1 — locate the method definition(s)
rg -tjava --multiline 'login\s*\([^)]*\)' --files-with-matches

# Step 2 — find invocation sites
rg -tjava '\.login\(' --context 1
```

**Gaps**: static imports (`import static X.login`), method references (`::login`), reflection (`Class.getMethod("login")`) will be missed or incomplete. Flag these in output if the target method is in a utility class or framework.

### Q2. Find all @Transactional boundaries

```bash
# Files declaring @Transactional
rg -tjava '@Transactional' --files-with-matches

# With the annotated method signatures captured:
rg -tjava '@Transactional(?:\([^)]*\))?\s*\n\s*(?:public|private|protected)?\s*\S+\s+(\w+)\s*\(' --multiline -r '$1' --no-filename
```

**Gaps**: class-level `@Transactional` applies to every public method — ripgrep output will show one hit per class, not one per method. Agent must note that all public methods inherit the transactional boundary.

### Q3. List all Spring beans of a given stereotype

```
Question: Which classes are @RestController | @Service | @Repository | @Component?
```

```bash
# Single scan for all four
rg -tjava '@(RestController|Service|Repository|Component)\b' --files-with-matches

# For specific stereotype
rg -tjava '@RestController\b' --files-with-matches
```

**Gaps**: meta-annotations (e.g., a custom `@MyService` meta-annotated with `@Service`) won't be caught. Follow up with a targeted grep for any custom stereotype annotations found in the project.

### Q4. Impact radius of a change

```
Question: If I change PaymentService.charge(), what breaks?
```

```bash
# Direct callers
rg -tjava '\.charge\(' --files-with-matches

# Field and parameter references to the class
rg -tjava 'PaymentService\s+\w+' --files-with-matches

# Combined blast-radius list
rg -tjava '(PaymentService(\.charge|\s+\w+))' --files-with-matches
```

**Gaps**: this is **shallow impact only** — callers-of-callers (transitive) requires iterating the scan. Agent should state depth explicitly (`depth=1`) and offer to iterate if needed.

### Q5. Trace endpoint → database call chain

```
Question: Trace POST /api/payments from controller to JDBC.
```

```bash
# Step 1 — find controller method
rg -tjava '@PostMapping.*payments' --context 5

# Step 2 — read the controller file, note services it calls
#          (agent reads the identified file, extracts service calls)

# Step 3 — grep each service's method for downstream calls
rg -tjava 'jdbcTemplate|entityManager|@Query\b|Repository<' --files-with-matches
```

This is **labour-intensive** — the agent must stitch the chain manually by reading each hop's file. Flag the limitation in output. Depth beyond 2–3 hops gets expensive.

### Q6. Find all inheritors of an interface

```bash
# Implementations
rg -tjava 'implements\s+(\w+\s*,\s*)*PaymentProcessor\b' --files-with-matches

# Extensions (abstract class case)
rg -tjava 'extends\s+\w+\s+implements\s+.*PaymentProcessor' --files-with-matches

# Single-interface case
rg -tjava 'class\s+\w+\s+implements\s+PaymentProcessor\b' --files-with-matches
```

**Gaps**: generic interface parameterization (`implements PaymentProcessor<User>`) still matches, but parameterized sub-interfaces (`interface A extends PaymentProcessor`) require a second scan.

## Output Contract

When this skill runs, the agent produces:

```markdown
## Investigation: <question>

**Method:** ripgrep / find (text-based)
**Confidence:** HIGH | MEDIUM | LOW
**Coverage notes:** <what text tools can / can't see for this query>

### Results

<table or list>

### Gaps

- <anything a semantic graph would have caught that ripgrep missed>
```

Confidence rules:
- **HIGH** — the query maps well to text patterns (e.g., annotation scan, file-level bean inventory)
- **MEDIUM** — text captured the obvious cases; reflection / dynamic dispatch / meta-annotations may exist but are explicitly flagged in Gaps
- **LOW** — the query fundamentally requires semantic info (interface-inheritor chains, generic method resolution, lambda bodies); agent should state that a graph backend would improve this and proceed with best effort

## Anti-Patterns

- **Do not** re-read files already returned by a prior `rg` scan in the same session — the paths are authoritative.
- **Do not** silently return a shallow answer for a deep question. If Q5 needs 5 hops and you only followed 2, state the depth in Coverage notes.
- **Do not** overcount — `--files-with-matches` is usually the right flag for counting unique occurrences; raw line counts inflate when a pattern repeats within a file.

## Integration Points

| Agent | How it uses this skill |
|-------|------------------------|
| @beck-backend | Before editing Java — Q1 (callers), Q4 (impact) |
| @stan-standards | During review — Q2 (@Transactional audit), Q3 (bean inventory), Q4 (impact) |
| @heracles | Debugging — Q5 (trace endpoint), Q1 (caller lookup) |
| @artie-arch | Architecture — Q3 (bean graph), Q5 (flow), Q6 (inheritance) |
| @sam-sec | Security review — Q2 (@Transactional gaps), search for `@PreAuthorize`, `@Secured` via Q3 pattern |

## Key Rules

- This skill is **read-only**. Never modify source during investigation.
- For non-Java projects: this skill does not activate. Use `project-discovery` to select the appropriate language skill.
- State confidence and gaps on every output — a LOW-confidence honest answer is more useful than a HIGH-confidence wrong one.
