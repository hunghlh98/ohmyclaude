# sc-spec-panel — Analysis Modes

Full behavior and example output per mode. Cited by `SKILL.md`.

Inlined from SuperClaude_Plugin v4.3.0 (MIT).

---

## Discussion Mode (`--mode discussion`)

**Purpose**: collaborative improvement through expert dialogue and knowledge sharing.

### Expert interaction pattern
- Sequential expert commentary, each building on previous insights
- Cross-expert validation and refinement of recommendations
- Consensus building around critical improvements
- Collaborative solution development

### Example output

```
KARL WIEGERS: "The requirement 'SHALL handle failures gracefully' lacks
specificity. What constitutes graceful handling? What types of failures
are we addressing?"

MICHAEL NYGARD: "Building on Karl's point, we need specific failure modes:
network timeouts, service unavailable, rate limiting. Each requires
different handling strategies."

GOJKO ADZIC: "Let's make this concrete with examples:
  Given: Service timeout after 30 seconds
  When: Circuit breaker activates
  Then: Return cached response within 100ms"

MARTIN FOWLER: "The specification should also define the failure
notification interface. How do upstream services know what type of
failure occurred?"
```

### Best for
- Early-stage specification development
- Stakeholder alignment sessions
- Teaching requirements patterns through example

---

## Critique Mode (`--mode critique`)

**Purpose**: systematic review with specific improvement suggestions and priority rankings.

### Analysis structure
- Issue identification with severity classification
- Specific improvement recommendations with rationale
- Priority ranking based on impact and effort
- Quality metrics and validation criteria

### Example output

```
=== REQUIREMENTS ANALYSIS ===

KARL WIEGERS — Requirements Quality Assessment:
  CRITICAL:      Requirement R-001 lacks measurable acceptance criteria
  Recommendation: Replace "handle failures gracefully" with "open circuit
                  breaker after 5 consecutive failures within 30 seconds"
  Priority:       High — affects testability and validation
  Quality impact: +40% testability, +60% clarity

GOJKO ADZIC — Specification Testability:
  MAJOR:          No executable examples provided for complex behaviors
  Recommendation: Add Given/When/Then scenarios for each requirement
  Priority:       Medium — improves understanding and validation
  Quality impact: +50% comprehensibility, +35% validation coverage

=== ARCHITECTURE ANALYSIS ===

MARTIN FOWLER — Interface Design:
  MINOR:          CircuitBreaker interface couples state management with
                  execution logic
  Recommendation: Separate CircuitBreakerState from CircuitBreakerExecutor
  Priority:       Low — design improvement, not functional issue
  Quality impact: +20% maintainability, +15% testability
```

### Best for
- Pre-release specification review
- ohmyclaude canonical invocation by `@artie-arch` before SDD finalization
- `@sam-sec` compliance review before verdict

---

## Socratic Mode (`--mode socratic`)

**Purpose**: learning-focused questioning to deepen understanding and improve thinking.

### Question categories
- Foundational understanding questions
- Stakeholder and purpose clarification
- Assumption identification and validation
- Alternative approach exploration

### Example output

```
ALISTAIR COCKBURN: "What is the fundamental problem this specification
is trying to solve?"

KARL WIEGERS: "Who are the primary stakeholders affected by these
requirements?"

MICHAEL NYGARD: "What assumptions are you making about the deployment
environment and operational context?"

GOJKO ADZIC: "How would you explain these requirements to a
non-technical business stakeholder?"

MARTIN FOWLER: "What would happen if we removed this requirement
entirely? What breaks?"

LISA CRISPIN: "How would you validate that this specification is
working correctly in production?"

KELSEY HIGHTOWER: "What operational and monitoring capabilities does
this specification require?"
```

### Best for
- Learning and mentoring contexts
- Early-career engineers authoring their first specifications
- Retrospective review where the goal is understanding, not change
