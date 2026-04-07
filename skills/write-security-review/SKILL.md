---
name: write-security-review
origin: ohmyclaude
description: Write and save the Security Review (REVIEW-<id>.md) to .claude/pipeline/. Used by @sam-sec after running SAST analysis. Output must include a verdict ENUM (APPROVE / APPROVE_WITH_NOTES / REVISE) — this field is required. Triggers on "write security review", "save REVIEW", "security verdict", "SAST findings".
---

# Write Security Review

Produce and save the Security Review document for the current pipeline request.

## When to Invoke

Invoked by @sam-sec after completing SAST scan simulation and OWASP review. Also invoked for @sam-sec re-review on Route E (Security Patch) after @beck-backend implements fixes.

## Output

Write to `.claude/pipeline/REVIEW-<id>.md` using the template at `assets/template.md`.

## REVIEW Schema

```markdown
---
id: REVIEW-001
prd_ref: PRD-001
created: YYYY-MM-DD
reviewer: sam-sec
verdict: APPROVE | APPROVE_WITH_NOTES | REVISE
---

## Verdict
<!-- REQUIRED — must be one of: APPROVE, APPROVE_WITH_NOTES, REVISE -->
**APPROVE** | **APPROVE_WITH_NOTES** | **REVISE**

Rationale: [1–2 sentences explaining the verdict]

## SAST Findings

| # | CWE ID | Severity | File:Line | Description | Remediation |
|---|---|---|---|---|---|
| 1 | CWE-89 | HIGH | auth/login.ts:42 | Raw SQL query | Use parameterized queries |
| 2 | CWE-798 | CRITICAL | config.ts:12 | Hardcoded secret | Move to environment variable |

*If no findings: "No SAST findings detected."*

## CVSS Scores (for HIGH/CRITICAL findings only)

| Finding # | CVSS v3.1 Score | Vector |
|---|---|---|
| 1 | 8.1 | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N |

## OWASP Top 10 Checklist
- [x] A01 Broken Access Control — reviewed
- [x] A02 Cryptographic Failures — reviewed
- [x] A03 Injection — reviewed
- [x] A04 Insecure Design — reviewed
- [x] A05 Security Misconfiguration — reviewed
- [x] A06 Vulnerable Components — reviewed
- [x] A07 Auth Failures — reviewed
- [x] A08 Software Integrity Failures — reviewed
- [x] A09 Logging Failures — reviewed
- [x] A10 SSRF — reviewed

## Remediation Checklist
<!-- Populated when verdict is APPROVE_WITH_NOTES or REVISE -->
- [ ] [Specific fix required — e.g., "Replace raw SQL at auth/login.ts:42 with prepared statement"]
- [ ] [Another fix]

## Notes
[Any additional context for the implementation team]
```

## Verdict Decision Guide

| Condition | Verdict |
|---|---|
| Zero findings, all OWASP checks pass | APPROVE |
| Low/medium findings only, documented mitigations | APPROVE_WITH_NOTES |
| Any HIGH or CRITICAL finding unmitigated | REVISE |
| Any hardcoded secret or broken auth | REVISE (always) |

## Gotchas

- **REVISE always blocks the pipeline** — @beck-backend cannot proceed to @quinn-qa until sam-sec re-reviews and changes to APPROVE or APPROVE_WITH_NOTES
- **APPROVE_WITH_NOTES allows proceed** — the remediation checklist is tracked but does not block the current sprint
- **Partial security fixes are worse than none** — if a finding cannot be fully remediated, document why and the compensating control, then APPROVE_WITH_NOTES
