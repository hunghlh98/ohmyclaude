---
name: sc-research
description: Deep web research with adaptive planning and intelligent search. Used by @artie-arch when proposing a pattern or technology not already in the codebase. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-research — Deep Research

Evidence-based research with adaptive planning, multi-hop reasoning, and cited findings.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Research questions beyond the model's knowledge cutoff
- Complex questions requiring multi-source synthesis
- Current events and real-time information needs
- Academic or technical deep-dives
- Market analysis and competitive intelligence
- **ohmyclaude canonical trigger**: `@artie-arch` proposes a pattern or technology **not already present** in the codebase — research is required before adding it to the SDD's "Alternatives Considered" section.

## Usage

Invoked by agents — primarily `@artie-arch`, occasionally `@stan-standards` on unfamiliar language idioms.

Parameters:
- `--depth quick | standard | deep | exhaustive` — research intensity
- `--strategy planning | intent | unified` — how to decompose the research question

## Behavioral Flow

### 1. Understand (5–10% of effort)
- Assess query complexity and ambiguity
- Identify required information types
- Define success criteria

### 2. Plan (10–15%)
- Select planning strategy based on complexity
- Identify parallelization opportunities
- Decompose the research question into sub-questions
- Create investigation milestones

### 3. Task list (5%)
- Create adaptive task hierarchy (3–15 tasks scaled to complexity)
- Establish task dependencies
- Set progress tracking

### 4. Execute (50–60%)
- **Parallel-first** — batch similar queries
- **Smart extraction** — route by content complexity
- **Multi-hop exploration** — follow entity and concept chains
- **Evidence collection** — track every source and its confidence level

### 5. Track (continuous)
- Monitor task progress
- Update confidence scores as evidence accumulates
- Flag information gaps explicitly

### 6. Validate (10–15%)
- Verify evidence chains
- Check source credibility
- Resolve contradictions (or note them as open)
- Confirm completeness against success criteria

## Key Patterns

### Parallel execution
- Batch all independent searches
- Run concurrent extractions
- Only sequentialise when a later query depends on an earlier result

### Evidence management
- Track every source with URL + access date
- Provide clear citations
- Note uncertainty explicitly — "claim A is well-supported; claim B is single-source"

### Adaptive depth
| Depth | Search | Hops | Output |
|---|---|---|---|
| `quick` | basic | 1 | summary |
| `standard` | extended | 2–3 | structured report |
| `deep` | comprehensive | 3–4 | detailed analysis |
| `exhaustive` | maximum | 5 | complete investigation |

## Tool Coordination

- **WebSearch / WebFetch** — primary search and extraction
- **Sequential reasoning** — complex synthesis across sources
- **Glob / Grep** — first check whether the question is already answered *in the codebase* before searching the web

## Output Standards

- **Every claim cited** — no unsupported assertions
- **Confidence level per finding** — high / medium / low, with reasoning
- **Alternatives presented** — if competing approaches exist, name them
- **Executive summary first** — decision-makers don't read to the end

Save deep reports to `.claude/pipeline/RESEARCH-<id>.md` when invoked from a `/forge` run; inline when invoked during design.

## Examples

### Quick check
```
Trigger: @artie-arch considering Kafka Streams for the notification pipeline
Depth:   quick
Output:  2-paragraph summary — when Kafka Streams wins vs KafkaJS,
         citation to one reference case, confidence medium.
```

### Deep analysis
```
Trigger: @paige-product needs competitive landscape for a new feature
Depth:   deep
Output:  Structured report covering 4–6 competitors, feature matrix,
         pricing, differentiation axes, gaps we could exploit.
```

### Exhaustive (rare)
```
Trigger: Pre-RFC investigation for a platform-level change
Depth:   exhaustive
Output:  Multi-section report, 5-hop evidence chains, alternatives
         weighed, migration implications, stakeholder impact map.
```

## Boundaries

### Will
- Use current information via web search when available
- Perform intelligent, evidence-based analysis
- Cite every source

### Will Not
- Make claims without sources
- Skip validation of contradictory evidence
- Access authenticated / restricted content
- **Implement findings or write code** — that is a builder's job after the research lands

### CRITICAL BOUNDARY — Stop After the Research Report

This skill produces a **research report only**.

It will not:
- Implement findings or recommendations
- Write code based on research
- Make architectural decisions
- Trigger system changes

**Output**: research report (with sources, confidence levels, cited references, and recommendations left for human decision).

**Next step**: the invoking agent uses the report — `@artie-arch` cites it in the SDD's ADR "Alternatives Considered" section; `@paige-product` uses it to inform PRD scope.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations for the `/forge` pipeline context (ohmyclaude canonical trigger added; SC-specific MCP server references generalized to standard Claude Code tools).
