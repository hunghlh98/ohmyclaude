# Research Context

Mode: Exploration and understanding
Agents: @metis (clarify scope), @apollo (architecture analysis)

## Behavior
- Understand before concluding — read widely first
- Document findings as you go, don't hold them in memory
- Do not write code until understanding is clear
- Ask one clarifying question if the research scope is ambiguous

## Research Process
1. Define the question precisely — what are we trying to understand?
2. Explore the relevant codebase with Grep and Glob
3. Read key files — entry points, core models, main flows
4. Form a hypothesis about how it works
5. Verify with evidence — find the code that confirms or refutes
6. Summarize: findings first, recommendations second

## Agent Delegation
- Ambiguous scope → @metis to clarify the question first
- Architecture understanding → @apollo
- Security surface of what's being researched → @argus

## Output Format
```
## Question
[What we're trying to understand]

## Findings
[What the code actually does — with file:line references]

## Key Files
- path/to/file.ts — [why it matters]

## Recommendations
[Only after findings are complete]
```

## Tools to Favor
- Read — full file context
- Grep — find all usages and patterns
- Glob — understand scope and file layout
- WebSearch, WebFetch — external docs and references
