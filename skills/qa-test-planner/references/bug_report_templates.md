# Bug Report Templates

Standard templates for clear, reproducible, actionable bug documentation.

---

## Standard Bug Report Template

```markdown
# BUG-[ID]: [Clear, Specific Title]

**Severity:** Critical | High | Medium | Low
**Priority:** P0 | P1 | P2 | P3
**Type:** Functional | UI | Performance | Security | Data | Crash
**Status:** Open | In Progress | In Review | Fixed | Verified | Closed
**Assignee:** [Developer name]
**Reporter:** [Your name]
**Reported Date:** YYYY-MM-DD

---

## Environment

| Property | Value |
|----------|-------|
| **OS** | [Windows 11 / macOS 14 / Ubuntu 22.04] |
| **Browser** | [Chrome 120 / Firefox 121 / Safari 17] |
| **Device** | [Desktop / iPhone 15 / Samsung S23] |
| **Build/Version** | [v2.5.0 / commit abc123] |
| **Environment** | [Production / Staging / Dev] |
| **URL** | [Exact page URL] |

---

## Description

[2-3 sentences clearly describing what the bug is and its impact]

---

## Steps to Reproduce

**Preconditions:**
- [Any setup required before reproduction]
- [Test account: user@test.com]

**Steps:**
1. [Navigate to specific URL]
2. [Perform specific action]
3. [Enter specific data: "example"]
4. [Click specific button]
5. [Observe the issue]

**Reproduction Rate:** [Always / 8 out of 10 times / Intermittent]

---

## Expected Behavior

[Clearly describe what SHOULD happen]

---

## Actual Behavior

[Clearly describe what ACTUALLY happens]

---

## Visual Evidence

**Screenshots:**
- [ ] Before state: [attached]
- [ ] After state: [attached]
- [ ] Error message: [attached]

**Video Recording:** [Link if available]

**Console Errors:**
```
[Paste any console errors here]
```

**Network Errors:**
```
[Paste any failed requests here]
```

---

## Impact Assessment

| Aspect | Details |
|--------|---------|
| **Users Affected** | [All users / Subset / Specific role] |
| **Frequency** | [Every time / Sometimes / Rarely] |
| **Data Impact** | [Data loss / Corruption / None] |
| **Business Impact** | [Revenue loss / User frustration / Minimal] |
| **Workaround** | [Describe workaround if exists, or "None"] |

---

## Additional Context

**Related Items:**
- Feature: [FEAT-123]
- Test Case: [TC-456]
- Similar Bug: [BUG-789]
- Figma Design: [URL if UI bug]

**Regression Information:**
- Is this a regression? [Yes / No]
- Last working version: [v2.4.0]
- First broken version: [v2.5.0]

**Notes:**
[Any additional context that might help fix the issue]

---

## Developer Section (To Be Filled)

### Root Cause
[Developer fills in after investigation]

### Fix Description
[Developer describes the fix approach]

### Files Changed
- [file1.js]
- [file2.css]

### Fix PR
[Link to pull request]

---

## QA Verification

- [ ] Fix verified in dev environment
- [ ] Fix verified in staging
- [ ] Regression tests passed
- [ ] Related test cases updated
- [ ] Ready for production

**Verified By:** [QA name]
**Verification Date:** [Date]
**Verification Build:** [Build number]
```



---

See also: [bug_report_templates_additional.md](bug_report_templates_additional.md) for Quick, UI, Performance, Security, and Crash templates plus the severity/priority matrix.
