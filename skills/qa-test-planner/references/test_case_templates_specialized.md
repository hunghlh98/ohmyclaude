# Test Case Templates — Specialized

This file continues [test_case_templates.md](test_case_templates.md) with Integration, Regression, Security, and Performance templates. For Standard, Functional, and UI/Visual templates, see the main file.

---


## Integration Test Case Template

For testing component interactions and data flow.

```markdown
## TC-INT-[ID]: [System A] to [System B] Integration

**Priority:** P[0-3]
**Type:** Integration
**Systems:** [List integrated systems]
**API Endpoint:** [endpoint if applicable]

### Objective
Verify data flows correctly from [source] to [destination]

### Preconditions
- [System A] running
- [System B] running
- Test credentials configured
- Network connectivity verified

### Test Steps

1. Trigger [action] in [System A]
   **Input:** [data payload]
   **Expected:** Request sent to [System B]

2. Verify [System B] receives data
   **Expected:**
   - Status code: 200
   - Response format: JSON
   - Data transformation correct

3. Verify [System A] handles response
   **Expected:** [UI update/confirmation]

### Data Validation
| Field | Source Value | Transformed Value | Status |
|-------|--------------|-------------------|--------|
| [field1] | [value] | [expected] | [ ] |
| [field2] | [value] | [expected] | [ ] |

### Error Scenarios
- [ ] Network timeout handling
- [ ] Invalid response handling
- [ ] Authentication failure handling
- [ ] Rate limiting handling
```

---

## Regression Test Case Template

For ensuring existing functionality remains intact.

```markdown
## TC-REG-[ID]: [Feature] Regression

**Priority:** P[0-3]
**Type:** Regression
**Original Feature:** [Feature name]
**Last Modified:** [Date]

### Objective
Verify [feature] still works correctly after recent changes

### Context
Recent changes that may affect this feature:
- [Change 1]
- [Change 2]

### Critical Path Tests

1. [ ] Core functionality works
2. [ ] Data persistence correct
3. [ ] UI renders properly
4. [ ] Error handling intact

### Integration Points
- [ ] [Dependent feature 1] still works
- [ ] [Dependent feature 2] still works
- [ ] API contracts unchanged

### Performance Baseline
- Expected load time: < Xs
- Expected response time: < Xms
```

---

## Security Test Case Template

For validating security controls and vulnerabilities.

```markdown
## TC-SEC-[ID]: [Security Control] Validation

**Priority:** P0 (Critical)
**Type:** Security
**OWASP Category:** [A01-A10]
**Risk Level:** Critical | High | Medium | Low

### Objective
Verify [security control] prevents [vulnerability/attack]

### Preconditions
- Test account with [role]
- Security testing tools configured
- Audit logging enabled

### Test Steps

1. Attempt [attack vector]
   **Input:** [malicious payload]
   **Expected:** Request blocked/sanitized

2. Verify security control response
   **Expected:**
   - Error message: Generic (no info leak)
   - Log entry: Attack attempt recorded
   - Account: Not compromised

### Attack Vectors
- [ ] SQL injection
- [ ] XSS (stored/reflected)
- [ ] CSRF
- [ ] Authentication bypass
- [ ] Authorization escalation

### Compliance Check
- [ ] [Regulation] requirement met
- [ ] Audit trail complete
- [ ] Data encrypted
```

---

## Performance Test Case Template

For validating speed, scalability, and resource usage.

```markdown
## TC-PERF-[ID]: [Feature] Performance

**Priority:** P[0-3]
**Type:** Performance
**Baseline:** [Previous metrics]

### Objective
Verify [feature] meets performance requirements

### Preconditions
- Load testing tool configured
- Baseline metrics recorded
- Test environment isolated

### Performance Criteria

| Metric | Target | Acceptable | Actual | Status |
|--------|--------|------------|--------|--------|
| Response time | < 200ms | < 500ms | | [ ] |
| Throughput | > 1000 req/s | > 500 req/s | | [ ] |
| Error rate | < 0.1% | < 1% | | [ ] |
| CPU usage | < 70% | < 85% | | [ ] |
| Memory usage | < 70% | < 85% | | [ ] |

### Load Scenarios

1. **Normal load:** X concurrent users
   - Duration: 5 minutes
   - Expected: All metrics within target

2. **Peak load:** Y concurrent users
   - Duration: 10 minutes
   - Expected: All metrics within acceptable

3. **Stress test:** Z concurrent users
   - Duration: Until failure
   - Expected: Graceful degradation

### Results
[Document actual results and comparison to baseline]
```

---

## Quick Reference: Test Case Naming

| Type | Prefix | Example |
|------|--------|---------|
| Functional | TC-FUNC- | TC-FUNC-001 |
| UI/Visual | TC-UI- | TC-UI-045 |
| Integration | TC-INT- | TC-INT-012 |
| Regression | TC-REG- | TC-REG-089 |
| Security | TC-SEC- | TC-SEC-005 |
| Performance | TC-PERF- | TC-PERF-023 |
| API | TC-API- | TC-API-067 |
| Smoke | SMOKE- | SMOKE-001 |

---

## Priority Definitions

| Priority | Description | When to Run |
|----------|-------------|-------------|
| P0 | Critical path, blocks release | Every build |
| P1 | Major features, high impact | Daily/Weekly |
| P2 | Standard features, moderate impact | Weekly/Release |
| P3 | Minor features, low impact | Release only |


---

See also: [test_case_templates.md](test_case_templates.md) for Standard, Functional, and UI/Visual templates.
