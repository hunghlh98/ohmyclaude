# Test Case Templates

Standard templates for creating consistent, comprehensive test cases.

---

## Standard Test Case Template

```markdown
## TC-[ID]: [Test Case Title]

**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Type:** Functional | UI | Integration | Regression | Performance | Security
**Status:** Not Run | Pass | Fail | Blocked | Skipped
**Estimated Time:** X minutes
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

---

### Objective

[Clear statement of what this test validates and why it matters]

---

### Preconditions

- [ ] [Setup requirement 1]
- [ ] [Setup requirement 2]
- [ ] [Test data/accounts needed]
- [ ] [Environment configuration]

---

### Test Steps

1. **[Action to perform]**
   - Input: [specific data if any]
   - **Expected:** [What should happen]

2. **[Action to perform]**
   - Input: [specific data if any]
   - **Expected:** [What should happen]

3. **[Action to perform]**
   - Input: [specific data if any]
   - **Expected:** [What should happen]

---

### Test Data

| Field | Value | Notes |
|-------|-------|-------|
| [Field 1] | [Value] | [Any special handling] |
| [Field 2] | [Value] | [Any special handling] |

**Test Account:**
- Username: [test user]
- Password: [test password]
- Role: [user type]

---

### Post-conditions

- [System state after successful test]
- [Cleanup required]
- [Data to verify/restore]

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| Empty input | "" | Validation error shown |
| Max length | 256 chars | Accepted/Truncated |
| Special chars | @#$% | Handled correctly |

---

### Related Test Cases

- TC-XXX: [Related scenario]
- TC-YYY: [Prerequisite test]

---

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |

---

### Notes

[Additional context, known issues, or considerations]
```

---

## Functional Test Case Template

For testing business logic and feature functionality.

```markdown
## TC-FUNC-[ID]: [Feature] - [Scenario]

**Priority:** P[0-3]
**Type:** Functional
**Module:** [Feature/Module name]
**Requirement:** REQ-XXX

### Objective
Verify that [feature] behaves correctly when [scenario]

### Preconditions
- User logged in as [role]
- [Feature prerequisite]
- Test data: [dataset]

### Test Steps

1. Navigate to [page/feature]
   **Expected:** [Page loads correctly]

2. Perform [action]
   **Input:** [test data]
   **Expected:** [System response]

3. Verify [result]
   **Expected:** [Success criteria]

### Boundary Tests
- Minimum value: [test]
- Maximum value: [test]
- Null/empty: [test]

### Negative Tests
- Invalid input: [test]
- Unauthorized access: [test]
- Missing required fields: [test]
```

---

## UI/Visual Test Case Template

For validating visual appearance and design compliance.

```markdown
## TC-UI-[ID]: [Component/Page] Visual Validation

**Priority:** P[0-3]
**Type:** UI/Visual
**Figma Design:** [URL]
**Breakpoints:** Desktop | Tablet | Mobile

### Objective
Verify [component] matches Figma design specifications

### Preconditions
- Browser: [Chrome/Firefox/Safari]
- Screen resolution: [specified]
- Theme: [Light/Dark]

### Visual Specifications

**Layout:**
| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| Width | XXXpx | | [ ] |
| Height | XXXpx | | [ ] |
| Padding | XX XX XX XX | | [ ] |
| Margin | XX XX XX XX | | [ ] |

**Typography:**
| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| Font | [Family] | | [ ] |
| Size | XXpx | | [ ] |
| Weight | XXX | | [ ] |
| Line-height | XXpx | | [ ] |
| Color | #XXXXXX | | [ ] |

**Colors:**
| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| Background | #XXXXXX | | [ ] |
| Border | #XXXXXX | | [ ] |
| Text | #XXXXXX | | [ ] |

**Interactive States:**
- [ ] Default state matches design
- [ ] Hover state matches design
- [ ] Active/pressed state matches design
- [ ] Focus state matches design
- [ ] Disabled state matches design

### Responsive Checks

**Desktop (1920px):**
- [ ] Layout correct
- [ ] All elements visible

**Tablet (768px):**
- [ ] Layout adapts correctly
- [ ] Touch targets adequate

**Mobile (375px):**
- [ ] Layout stacks correctly
- [ ] Content readable
- [ ] Navigation accessible
```

---


---

See also: [test_case_templates_specialized.md](test_case_templates_specialized.md) for Integration, Regression, Security, and Performance templates.
