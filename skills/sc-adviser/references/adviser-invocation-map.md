# SC Adviser — Invocation Map

Per-agent adviser invocation with exact flags and artifact section names.

---

## paige-product → sc:business-panel

**When**: Route D/E, or `Complexity=high` in the routing JSON output.

**Command**:
```
/sc:business-panel --experts "porter,christensen,drucker" --mode discussion
```

**Input to adviser**: The problem statement and acceptance criteria from the PRD draft.

**Artifact section**: Add `## Business Advisory Notes` to the PRD after `## Routing Decision`.

**What to synthesize**:
- Porter: Competitive positioning — does this feature differentiate or is it table-stakes?
- Christensen: Jobs-to-be-done — what is the user actually hiring this for?
- Drucker: Management clarity — is the objective measurable and actionable?

---

## artie-arch → sc:spec-panel

**When**: Before writing the SDD, after reading the PRD + UX-SPEC.

**Command**:
```
/sc:spec-panel --focus architecture --mode critique
```

**Input to adviser**: The draft API Contracts and Data Model sections (before full SDD is written).

**Artifact section**: Add `## Specification Review Notes` to the SDD after `## ADR`.

**What to synthesize**:
- Fowler: Interface design quality — SRP violations, coupling issues
- Newman: Service boundary clarity — are bounded contexts clean?
- Nygard: Production reliability — failure modes, circuit breakers, operational concerns

---

## una-ux → sc:spec-panel

**When**: Before writing UX-SPEC, after reading the PRD.

**Command**:
```
/sc:spec-panel --focus requirements --experts "cockburn,adzic"
```

**Input to adviser**: The user journey draft and the WCAG requirements list.

**Artifact section**: Add `## Requirements Advisory Notes` to the UX-SPEC after `## Accessibility Requirements`.

**What to synthesize**:
- Cockburn: Use case completeness — primary actor goals, alternate paths
- Adzic: Specification by example — are acceptance criteria backed by concrete examples?

---

## sam-sec → sc:spec-panel

**When**: Before writing REVIEW verdict, after Phase 3 adversarial matrix.

**Command**:
```
/sc:spec-panel --focus compliance --experts "wiegers,nygard"
```

**Input to adviser**: The SAST findings and the adversarial scenario matrix results.

**Artifact section**: Add `## Compliance Advisory Notes` to the REVIEW before `## Blockers`.

**What to synthesize**:
- Wiegers: Requirements completeness — are security requirements measurable and testable?
- Nygard: Operational excellence — monitoring, recovery mechanisms, failure transparency

---

## scout-sprint → sc:business-panel

**When**: Route D, before writing PLAN (after SDD is complete).

**Command**:
```
/sc:business-panel --mode socratic
```

**Input to adviser**: The SDD's API Contracts and the PRD's acceptance criteria.

**Artifact section**: Add `## Strategic Alignment Notes` to the PLAN after `## Assumptions`.

**What to synthesize**:
- Christensen's socratic questions: Is each phase delivering the minimum viable outcome, or over-building?
- Meadows (systems thinking): Are phase dependencies creating unnecessary coupling?
- Drucker: Is the sprint ordered around measurable milestones?
