---
name: java-source-intel
description: Semantic Java source investigation — find @Transactional boundaries, Spring beans, call chains, annotation usages. Routes through whichever graph backend is present (codegraph → code-review-graph → ripgrep). Triggers on "find callers", "trace method", "where is X used", "Spring beans", "annotation scan", "Java impact".
origin: ohmyclaude
---

# java-source-intel

Semantic intelligence for Java codebases. The skill is **tool-agnostic at the agent level** — agents ask a question in natural terms ("find all callers of `UserService.login()`"), and this skill routes to the best available backend. Nothing is installed by the plugin; everything degrades gracefully.

## When to Activate

- Project discovery detected Java (`pom.xml` + `src/main/java/` or `build.gradle` + `src/main/java/`)
- Agent needs to answer any of:
  - "Find callers / callees of method X"
  - "Where is annotation @Y applied?"
  - "Which classes implement interface Z?"
  - "What's the impact radius of changing method M?"
  - "List all @Transactional boundaries / @RestController beans / @Scheduled tasks"
  - "Trace the call chain from endpoint E to the database"

## Backend Detection Order

The skill probes, in order:

| Priority | Backend | Detection signal | Strength |
|---------:|---------|------------------|----------|
| 1 | **codegraph** | `.codegraph/codegraph.db` exists in project root, OR MCP tools prefixed `mcp__codegraph__*` are available | Pre-indexed, FTS5 search, designed for Explore-agent orchestration |
| 2 | **code-review-graph** | MCP tools prefixed `mcp__plugin_code-review-graph__*` available, OR `which code-review-graph` succeeds | Impact radius, community detection, flow analysis |
| 3 | **ripgrep + tree** (always available) | — | Regex approximations of AST queries; last resort |

Detection is **soft**: never error if a backend is absent. Always fall to the next tier.

## Canonical Java Query Patterns

The patterns below show how each question maps to each backend. Agents pick the question; the skill picks the route.

### Q1. Find callers of a method

```
Question: Who calls UserService.login(String, String)?
```

**Backend 1 — codegraph:**
```
mcp__codegraph__codegraph_search({ query: "login", kind: "method" })
  → get node id
mcp__codegraph__codegraph_callers({ nodeId: <id>, depth: 2 })
```

**Backend 2 — code-review-graph:**
```
semantic_search_nodes_tool({ query: "UserService.login" })
  → node id
query_graph_tool({ pattern: "callers_of", node: <id>, depth: 2 })
```

**Backend 3 — ripgrep (approximation — may miss method overloads, static imports, reflection):**
```
rg -tjava --multiline 'login\s*\([^)]*\)' --files-with-matches
rg -tjava '\.login\(' --context 1
```

### Q2. Find all @Transactional boundaries

**Backend 1 — codegraph:**
```
mcp__codegraph__codegraph_search({ query: "Transactional", kind: "annotation" })
```

**Backend 2 — code-review-graph:**
```
semantic_search_nodes_tool({ query: "@Transactional" })
query_graph_tool({ pattern: "file_summary" })  # for context
```

**Backend 3 — ripgrep:**
```
rg -tjava '@Transactional' -A 1 --files-with-matches
# Follow up with:
rg -tjava '@Transactional(?:\([^)]*\))?\s*\n\s*(?:public|private|protected)?\s*\S+\s+(\w+)\s*\(' --multiline -r '$1' --no-filename
```

### Q3. List all Spring beans of a given stereotype

```
Question: Which classes are @RestController | @Service | @Repository | @Component?
```

**Backend 1 — codegraph:**
```
mcp__codegraph__codegraph_search({ query: "RestController", kind: "annotation" })
mcp__codegraph__codegraph_search({ query: "Service",        kind: "annotation" })
mcp__codegraph__codegraph_search({ query: "Repository",     kind: "annotation" })
mcp__codegraph__codegraph_search({ query: "Component",      kind: "annotation" })
```

**Backend 2 — code-review-graph:**
```
semantic_search_nodes_tool({ query: "Spring stereotype: RestController Service Repository Component" })
query_graph_tool({ pattern: "children_of", node: <class_node> })  # for injected fields
```

**Backend 3 — ripgrep:**
```
rg -tjava '@(RestController|Service|Repository|Component)\b' --files-with-matches
```

### Q4. Impact radius of a change

```
Question: If I change PaymentService.charge(), what breaks?
```

**Backend 1 — codegraph:**
```
mcp__codegraph__codegraph_search({ query: "charge", kind: "method" })
  → node id
mcp__codegraph__codegraph_impact({ nodeId: <id>, depth: 3 })
mcp__codegraph__codegraph_affected({ files: ["src/main/java/.../PaymentService.java"] })
```

**Backend 2 — code-review-graph:**
```
get_impact_radius_tool({ target: "PaymentService.charge", depth: 3 })
get_affected_flows_tool({ nodes: [<id>] })
```

**Backend 3 — ripgrep (shallow — callers only, no transitive):**
```
rg -tjava '\.charge\(' --files-with-matches
rg -tjava 'PaymentService\s+\w+' --files-with-matches  # field/param references
```

### Q5. Trace endpoint → database call chain

```
Question: Trace POST /api/payments from controller to JDBC.
```

**Backend 1 — codegraph:**
```
mcp__codegraph__codegraph_search({ query: "@PostMapping.*payments" })  # regex-aware
mcp__codegraph__codegraph_callees({ nodeId: <controller_method>, depth: 5 })
```

**Backend 2 — code-review-graph:**
```
semantic_search_nodes_tool({ query: "POST /api/payments" })
get_flow_tool({ start: <controller_node>, maxDepth: 5 })
```

**Backend 3 — ripgrep (manual stitching):**
```
rg -tjava '@PostMapping.*payments' --context 5
# Read controller, grep each service it calls, repeat — labour-intensive, agent should flag limitation
```

### Q6. Find all inheritors of an interface

**Backend 1 — codegraph:**
```
mcp__codegraph__codegraph_search({ query: "PaymentProcessor", kind: "interface" })
  → node id
mcp__codegraph__codegraph_callers({ nodeId: <id> })  # implementations appear as callers in some graphs
# OR
mcp__codegraph__codegraph_node({ nodeId: <id>, include: "implementations" })
```

**Backend 2 — code-review-graph:**
```
query_graph_tool({ pattern: "inheritors_of", node: "PaymentProcessor" })
```

**Backend 3 — ripgrep:**
```
rg -tjava 'implements\s+(\w+\s*,\s*)*PaymentProcessor\b' --files-with-matches
rg -tjava 'extends\s+\w+\s+implements\s+.*PaymentProcessor' --files-with-matches
```

## Output Contract

When this skill runs, the agent produces:

```markdown
## Investigation: <question>

**Backend used:** codegraph | code-review-graph | ripgrep-fallback
**Confidence:** HIGH | MEDIUM | LOW
**Coverage notes:** <what the backend can / can't see>

### Results

<table or list>

### Gaps

- <anything the backend missed that a higher tier would have caught>
```

Confidence rules:
- **HIGH** — codegraph or code-review-graph answered the question directly
- **MEDIUM** — graph answered but with depth limit; or ripgrep caught the obvious cases but reflection / dynamic dispatch may exist
- **LOW** — only ripgrep available AND the question requires semantic info (e.g., method resolution with generic types, lambda bodies, annotation inheritance)

## Anti-Patterns

- **Do not** mix backends in one answer — pick the highest tier that works, say which, and stop. Mixing adds tokens and hides blind spots.
- **Do not** re-read files that `codegraph_explore` or `get_review_context_tool` already returned. The source sections are authoritative.
- **Do not** call `codegraph_explore` / `codegraph_context` from the main session — spawn an Explore subagent (per codegraph's own guidance). These tools return large source blobs and pollute main context.
- **Do not** suggest installing a backend in the main response. Install prompts belong in `project-discovery`, once per session, not per query.

## Integration Points

| Agent | How it uses this skill |
|-------|------------------------|
| @beck-backend | Before editing Java — Q1 (callers), Q4 (impact) |
| @stan-standards | During review — Q2 (@Transactional audit), Q3 (bean inventory), Q4 (impact) |
| @heracles | Debugging — Q5 (trace endpoint), Q1 (caller lookup) |
| @artie-arch | Architecture — Q3 (bean graph), Q5 (flow), Q6 (inheritance) |
| @sam-sec | Security review — Q2 (@Transactional gaps), search for `@PreAuthorize`, `@Secured` via Q3 pattern |

## Fallback Escalation

If the Backend 3 (ripgrep) path is used AND confidence is LOW, the agent must:

1. State the limitation in the output (see `## Gaps`).
2. Suggest — **once per session** — that the user may want to enable a graph backend for higher-fidelity answers. Do not repeat the suggestion on subsequent queries in the same session.
3. Proceed with the best-effort answer.

## Key Rules

- This skill is **read-only**. Never modify source during investigation.
- Backend detection runs **once per session**, cached in the agent's working memory — do not re-probe on every query.
- For non-Java projects: this skill does not activate. Use `project-discovery` to select the appropriate language skill.
