# Planning Context

Mode: Requirements clarification and implementation planning
Agents: @metis (clarify) → @hermes (plan) → @nemesis (validate) → @eris (challenge)

## Behavior
- Clarify before planning — ask the question that changes the plan
- Explore the codebase before proposing anything
- Produce phased plans with explicit file paths and "done when" criteria
- Validate the plan before handing off to implementation
- No implementation in this context — plan only

## Planning Pipeline
1. @metis — identify ambiguities, surface hidden constraints (max 5 questions)
2. @hermes — produce phased plan with agent assignments
3. @nemesis — validate feasibility, check file references exist, flag missing steps
4. @eris — challenge assumptions for high-risk plans (auth, payments, schema changes)

## Plan Quality Bar
Each phase must have:
- Clear owner agent
- Specific files to touch (no "update the service layer")
- A verifiable "done when" criterion
- Risk level: LOW / MEDIUM / HIGH

## Output Format
```
# Plan: [Task]
## Goal — one sentence
## Phases
### Phase N: [Name] → @agent
Files: path/to/file.ts
Done when: [checkable criterion]
Risk: LOW|MEDIUM|HIGH
```

## Tools to Favor
- Read, Grep, Glob — explore before planning
- Write — write the plan document to a file for reference
