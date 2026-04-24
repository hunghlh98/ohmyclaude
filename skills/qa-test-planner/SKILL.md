---
name: qa-test-planner
origin: ohmyclaude
description: Generate comprehensive test plans, manual test cases, regression test suites, and bug reports. Used by @quinn-qa to produce TEST-<id>.md in .claude/pipeline/ — output must include a required PASS/FAIL verdict field. Includes Figma MCP integration for design validation.
trigger: explicit
---

# QA Test Planner

A comprehensive skill for QA engineers to create test plans, generate manual test cases, build regression test suites, validate designs against Figma, and document bugs effectively.

> **Activation:** This skill is triggered only when explicitly called by name (e.g., `/qa-test-planner`, `qa-test-planner`, or `use the skill qa-test-planner`).

---

## Quick Start

**Create a test plan:**
```
"Create a test plan for the user authentication feature"
```

**Generate test cases:**
```
"Generate manual test cases for the checkout flow"
```

**Build regression suite:**
```
"Build a regression test suite for the payment module"
```

**Validate against Figma:**
```
"Compare the login page against the Figma design at [URL]"
```

**Create bug report:**
```
"Create a bug report for the form validation issue"
```

---

## Quick Reference

| Task | What You Get | Time |
|------|--------------|------|
| Test Plan | Strategy, scope, schedule, risks | 10-15 min |
| Test Cases | Step-by-step instructions, expected results | 5-10 min each |
| Regression Suite | Smoke tests, critical paths, execution order | 15-20 min |
| Figma Validation | Design-implementation comparison, discrepancy list | 10-15 min |
| Bug Report | Reproducible steps, environment, evidence | 5 min |

---

## How It Works

```
Your Request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ 1. ANALYZE                                          │
│    • Parse feature/requirement                      │
│    • Identify test types needed                     │
│    • Determine scope and priorities                 │
├─────────────────────────────────────────────────────┤
│ 2. GENERATE                                         │
│    • Create structured deliverables                 │
│    • Apply templates and best practices             │
│    • Include edge cases and variations              │
├─────────────────────────────────────────────────────┤
│ 3. VALIDATE                                         │
│    • Check completeness                             │
│    • Verify traceability                            │
│    • Ensure actionable steps                        │
└─────────────────────────────────────────────────────┘
    │
    ▼
QA Deliverable Ready
```

---

## Output Contract

Every deliverable produced by this skill writes to `.claude/pipeline/TEST-<id>.md` and MUST include:

- **PASS / FAIL / CONDITIONAL verdict** (required field — consumed by @quinn-qa downstream)
- Traceability back to the requirement or feature being tested
- Actionable steps a human tester can execute without asking follow-up questions
- Explicit preconditions, test data, and expected results for every step

If any of the above is missing, the artifact is incomplete — do not stop until all are present.

---

## Commands

### Interactive Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `./scripts/generate_test_cases.sh` | Create test cases interactively | Step-by-step prompts |
| `./scripts/create_bug_report.sh` | Generate bug reports | Guided input collection |

### Natural Language

| Request | Output |
|---------|--------|
| "Create test plan for {feature}" | Complete test plan document |
| "Generate {N} test cases for {feature}" | Numbered test cases with steps |
| "Build smoke test suite" | Critical path tests |
| "Compare with Figma at {URL}" | Visual validation checklist |
| "Document bug: {description}" | Structured bug report |

---

## Core Deliverables

### 1. Test Plans
- Test scope and objectives
- Testing approach and strategy
- Environment requirements
- Entry/exit criteria
- Risk assessment
- Timeline and milestones

Full template: `references/test_plan_template.md`

### 2. Manual Test Cases
- Step-by-step instructions
- Expected vs actual results
- Preconditions and setup
- Test data requirements
- Priority and severity

Full templates — Standard/Functional/UI: `references/test_case_templates.md`; Integration/Regression/Security/Performance: `references/test_case_templates_specialized.md`

### 3. Regression Suites
- Smoke tests (15-30 min)
- Full regression (2-4 hours)
- Targeted regression (30-60 min)
- Execution order and dependencies

Full guide (suite structure, execution strategy, pass/fail criteria, maintenance): `references/regression_testing.md`

### 4. Figma Validation
- Component-by-component comparison
- Spacing and typography checks
- Color and visual consistency
- Interactive state validation

Full workflow (MCP queries, checklists, automation ideas): `references/figma_validation.md`

### 5. Bug Reports
- Clear reproduction steps
- Environment details
- Evidence (screenshots, logs)
- Severity and priority

Full templates — Standard: `references/bug_report_templates.md`; Quick/UI/Performance/Security/Crash plus severity matrix: `references/bug_report_templates_additional.md`

---

## Anti-Patterns

| Avoid | Why | Instead |
|-------|-----|---------|
| Vague test steps | Can't reproduce | Specific actions + expected results |
| Missing preconditions | Tests fail unexpectedly | Document all setup requirements |
| No test data | Tester blocked | Provide sample data or generation |
| Generic bug titles | Hard to track | Specific: "[Feature] issue when [action]" |
| Skip edge cases | Miss critical bugs | Include boundary values, nulls |

---

## Verification Checklist

**Test Plan:**
- [ ] Scope clearly defined (in/out)
- [ ] Entry/exit criteria specified
- [ ] Risks identified with mitigations
- [ ] Timeline realistic

**Test Cases:**
- [ ] Each step has expected result
- [ ] Preconditions documented
- [ ] Test data available
- [ ] Priority assigned

**Bug Reports:**
- [ ] Reproducible steps
- [ ] Environment documented
- [ ] Screenshots/evidence attached
- [ ] Severity/priority set

---

## Canonical Example: Login Flow Test Case

```markdown
## TC-LOGIN-001: Valid User Login

**Priority:** P0 (Critical)
**Type:** Functional
**Estimated Time:** 2 minutes

### Objective
Verify users can successfully login with valid credentials

### Preconditions
- User account exists (test@example.com / Test123!)
- User is not already logged in
- Browser cookies cleared

### Test Steps
1. Navigate to https://app.example.com/login
   **Expected:** Login page displays with email and password fields

2. Enter email: test@example.com
   **Expected:** Email field accepts input

3. Enter password: Test123!
   **Expected:** Password field shows masked characters

4. Click "Login" button
   **Expected:**
   - Loading indicator appears
   - User redirected to /dashboard
   - Welcome message shown: "Welcome back, Test User"
   - Avatar/profile image displayed in header

### Post-conditions
- User session created
- Auth token stored

### Verdict
PASS / FAIL (required)
```

More worked examples (responsive design, mobile nav, edge-case listings): `references/examples.md`

---

## References

- [Test Case Templates](references/test_case_templates.md) — Standard, Functional, UI formats + naming conventions
- [Test Case Templates — Specialized](references/test_case_templates_specialized.md) — Integration, Regression, Security, Performance formats
- [Test Plan Template](references/test_plan_template.md) — Plan structure, run reports, coverage matrix, QA workflow, best practices
- [Bug Report Templates](references/bug_report_templates.md) — Standard bug template (detailed)
- [Bug Report Templates — Additional](references/bug_report_templates_additional.md) — Quick, UI, Performance, Security, Crash templates + severity/priority matrix
- [Regression Testing Guide](references/regression_testing.md) — Suite structure, execution strategy, pass/fail criteria, maintenance
- [Figma Validation Guide](references/figma_validation.md) — MCP workflow, what-to-validate checklists, query patterns, automation
- [Examples](references/examples.md) — Full canonical examples (login, responsive design, mobile navigation)

---

**"Testing shows the presence, not the absence of bugs." — Edsger Dijkstra**
