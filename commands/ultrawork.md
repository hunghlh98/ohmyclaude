---
description: Super single-entry orchestration command. Describe a task and the full agent pipeline runs automatically: Metis → Hermes → Nemesis → (Eris) → Hephaestus → Momus → Athena → Argus → Mnemosyne.
---

# /ultrawork

The super single entry point. One command, full pipeline. Describe what you want — the entire agent team handles the rest, from clarification through to documentation.

## Usage

```
/ultrawork <task description>
/ultrawork --quick <task description>       # skip Eris + Mnemosyne
/ultrawork --secure <task description>      # include deep Argus security review
/ultrawork --no-docs <task description>     # skip Mnemosyne
```

## Pipeline

When you invoke `/ultrawork`, execute the following stages in order. Each stage must complete before the next begins. If a stage returns a blocking result (REVISE, REQUEST CHANGES), loop back before proceeding.

---

### Stage 1 — Clarify with @metis (if needed)

**When to run**: The task is vague, touches multiple systems, or has unstated constraints.
**When to skip**: The task is specific and actionable (e.g., "fix the null check on line 42 of user.ts").

Prompt @metis:
> "Analyze this task and identify any ambiguities, missing constraints, or questions that would change the plan. Task: [USER'S TASK]"

If Metis produces clarifying questions:
- Present them to the user
- Wait for answers
- Proceed with the answers as additional context

---

### Stage 2 — Plan with @hermes

Prompt @hermes with the (now clarified) task:
> "Produce a phased implementation plan for this task. Assign each phase to the appropriate specialist agent. Task: [TASK + METIS CLARIFICATIONS]"

Hermes produces a plan document with phases, agent assignments, file paths, and done-when criteria.

---

### Stage 3 — Validate with @nemesis

Prompt @nemesis with Hermes's plan:
> "Review this implementation plan for feasibility, completeness, and risk calibration. Verify file references exist, check for missing steps, challenge assumptions. Plan: [HERMES PLAN]"

**If Nemesis returns REVISE**: feed the issues back to @hermes and regenerate the plan. Repeat until Nemesis returns APPROVE or APPROVE WITH NOTES.

---

### Stage 4 — Challenge with @eris (for HIGH-risk tasks)

**When to run**: The plan touches auth, payments, public APIs, schema migrations, or shared infrastructure.
**When to skip**: `--quick` flag, or the plan is low-risk CRUD/utility work.

Prompt @eris:
> "Challenge this plan. Find blind spots, stress-test assumptions, identify scenarios not covered. Plan: [HERMES PLAN]"

Present Eris's findings. If any are CRITICAL, loop back to Stage 2 with the findings as additional constraints.

---

### Stage 5 — Implement with @hephaestus

Execute each phase of the plan in order. For each implementation phase:

Prompt @hephaestus:
> "[PHASE DESCRIPTION FROM HERMES PLAN]. Follow the plan exactly. Do not refactor beyond what's needed."

Wait for each phase to complete before starting the next.

---

### Stage 6 — Test with @momus

After all implementation phases are complete:

Prompt @momus:
> "Write tests for the changes made in: [LIST OF CHANGED FILES]. Cover happy path, edge cases, and error paths. Run the tests and confirm they pass."

If tests fail, send the failure back to @hephaestus with the specific failure before re-running momus.

---

### Stage 7 — Review with @athena

Prompt @athena:
> "Review the code changes for correctness, readability, and adherence to project conventions. Files: [CHANGED FILES]"

**If Athena returns REQUEST CHANGES**:
- For CRITICAL/HIGH findings: send back to @hephaestus to fix, then re-run Stage 6 and 7
- For MEDIUM/LOW: present to user and ask if they want to fix before continuing

---

### Stage 8 — Security review with @argus

**When to run**: Changed files include auth, payments, user input handling, API endpoints, config, or crypto.
**When to run always**: `--secure` flag.
**When to skip**: Pure refactor with no security surface change, `--quick` flag.

Prompt @argus:
> "Security review the following changes for OWASP Top 10 issues, secret leakage, and injection risks. Files: [CHANGED FILES]"

If Argus finds CRITICAL/HIGH issues: send back to @hephaestus to fix before proceeding.

---

### Stage 9 — Document with @mnemosyne

**When to run**: New public APIs, new commands, new config, new modules, or significant behavior changes.
**When to skip**: `--no-docs` flag, `--quick` flag, internal refactor with no API surface change.

Prompt @mnemosyne:
> "Update documentation for the changes made. Update README if needed, add inline comments for non-obvious logic, update .env.example if new env vars were added. Files: [CHANGED FILES]"

---

### Completion

When all stages are done, output a brief summary:

```markdown
## Work Complete: [Task Name]

### Completed Stages
- [x] Clarified (Metis)
- [x] Planned (Hermes) — N phases
- [x] Validated (Nemesis) — APPROVED
- [x] Implemented (Hephaestus) — N files changed
- [x] Tested (Momus) — N tests, all passing
- [x] Reviewed (Athena) — APPROVED
- [x] Security reviewed (Argus) — No critical issues
- [x] Documented (Mnemosyne)

### Files Changed
- path/to/file.ts
- ...

### Next Steps
- [Any follow-up items from Nemesis or Eris]
```

---

## Pipeline Decision Tree

```
/work [task]
  │
  ├─ Vague? ──────────── @metis (clarify) ──┐
  │                                          │
  ◄──────────────────────────────────────────┘
  │
  ├─ @hermes (plan)
  │
  ├─ @nemesis (validate) ── REVISE? ── back to hermes
  │
  ├─ High risk? ─── @eris (challenge) ── CRITICAL? ── back to hermes
  │
  ├─ @hephaestus (implement, phase by phase)
  │
  ├─ @momus (tests) ── FAIL? ── back to hephaestus
  │
  ├─ @athena (review) ── REQUEST CHANGES (critical)? ── back to hephaestus
  │
  ├─ Security surface? ── @argus (security) ── CRITICAL? ── back to hephaestus
  │
  └─ API/module change? ── @mnemosyne (docs)
       │
       └─ DONE ✓
```

## Examples

```
/work add password reset via email with 1-hour expiry tokens
/work --secure refactor the payment webhook handler to use idempotency keys
/work --quick fix the race condition in the cache invalidation logic
/work --no-docs add a config option to disable email notifications
```

## Related Commands

- `/plan` — Run only Metis + Hermes (planning only, no implementation)
- `/review` — Run only Athena (code review only)
- `/debug` — Run only Heracles (debugging only)
