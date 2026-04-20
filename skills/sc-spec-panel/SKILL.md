---
name: sc-spec-panel
description: Multi-expert specification review (Wiegers, Adzic, Cockburn, Fowler, Nygard, Newman, Hohpe, Crispin, Gregory, Hightower). Used before finalizing SDD / UX-SPEC / REVIEW. Inlined from SuperClaude v4.3.0 (MIT).
origin: ohmyclaude
upstream: SuperClaude-Org/SuperClaude_Plugin@4.3.0 (MIT)
---

# sc-spec-panel — Expert Specification Review Panel

Simulates a panel of 10 named software-engineering experts to critique a specification, surface gaps, and rank improvements.

This skill is **shipped with ohmyclaude** (inlined from SuperClaude). It is always available when this plugin is installed — no external dependency.

## Triggers

- Specification quality review and improvement
- Technical documentation validation
- Requirements analysis and completeness verification
- **ohmyclaude canonical triggers**:
  - `@artie-arch` before finalizing an SDD → `--focus architecture --mode critique`
  - `@una-ux` before finalizing a UX-SPEC → `--focus requirements --experts "cockburn,adzic"`
  - `@sam-sec` before writing a REVIEW verdict → `--focus compliance --experts "wiegers,nygard"`

## Usage

```
sc-spec-panel [spec-content | @file]
  [--mode discussion | critique | socratic]
  [--experts "name1,name2"]
  [--focus requirements | architecture | testing | compliance]
  [--iterations N]
  [--format standard | structured | detailed]
```

## Behavioral Flow

1. **Analyze** — parse specification content; identify key components, gaps, quality issues.
2. **Assemble** — select panel based on specification type and focus area.
3. **Review** — multi-expert analysis using distinct methodologies.
4. **Collaborate** — expert interaction (discussion / critique / socratic).
5. **Synthesize** — consolidated findings with prioritized recommendations.
6. **Improve** — enhanced specification incorporating expert feedback.

## Expert Panel (Summary)

Full bios and critique styles: [`references/experts.md`](./references/experts.md).

| Expert | Domain | Lead for |
|---|---|---|
| **Karl Wiegers** | Requirements engineering; SMART criteria | requirements, compliance |
| **Gojko Adzic** | Specification by example; Given/When/Then | requirements, testing |
| **Alistair Cockburn** | Use case methodology; agile requirements | requirements |
| **Martin Fowler** | Architecture, API design, evolutionary design | architecture |
| **Michael Nygard** | Production systems, failure modes, circuit breakers | architecture, compliance |
| **Sam Newman** | Microservices, distributed systems, API evolution | architecture |
| **Gregor Hohpe** | Enterprise integration patterns, messaging | architecture |
| **Lisa Crispin** | Agile testing, quality requirements | testing |
| **Janet Gregory** | Collaborative testing, three-amigos | testing |
| **Kelsey Hightower** | Cloud native, Kubernetes, ops excellence | compliance |

## Analysis Modes

Full mode behavior + example outputs: [`references/modes.md`](./references/modes.md).

| Mode | Purpose | Output shape |
|---|---|---|
| `discussion` | Collaborative improvement through expert dialogue | Sequential commentary, consensus building |
| `critique` | Systematic review with priority-ranked recommendations | Issue → recommendation → priority → impact |
| `socratic` | Learning through questioning | Discovery questions, no answers given |

Default: `critique`.

## Focus Areas

| Focus | Lead expert | Panel |
|---|---|---|
| `requirements` | Wiegers | Adzic, Cockburn |
| `architecture` | Fowler | Newman, Hohpe, Nygard |
| `testing` | Crispin | Gregory, Adzic |
| `compliance` | Wiegers | Nygard, Hightower |

## Tool Coordination

- **Read** — specification content analysis and parsing
- **Sequential reasoning** — multi-expert panel coordination
- **Grep** — cross-reference validation and consistency checking
- **Write / Edit** — improved specification generation when requested

## Iterative Improvement

Default is single-pass. Use `--iterations N` for multi-round refinement.

| Iteration | Emphasis |
|---|---|
| 1 | Structural + fundamental issues; requirements clarity; major gaps |
| 2 | Detail refinement; edge cases; quality attribute specifications |
| 3 | Polish and optimization; documentation quality; final consistency |

Full protocol: [`references/iterative.md`](./references/iterative.md).

## Output Formats

| Format | Token cost | When to use |
|---|---|---|
| `standard` (default) | Medium | General review, balanced detail |
| `structured` | Low | Token-efficient, symbol-heavy |
| `detailed` | High | Training / mentoring, full expert commentary |

Full format specs + examples: [`references/formats.md`](./references/formats.md).

## Examples

### Architecture critique (ohmyclaude canonical)
```
@artie-arch loads sc-spec-panel --focus architecture --mode critique
         before finalizing SDD-003.
Panel:   Fowler (lead), Newman, Hohpe, Nygard
Output:  Issues ranked by priority, each with specific improvement
         and estimated quality impact. Appended to SDD as
         "## Specification Review Notes".
```

### Requirements discussion
```
@paige-product loads sc-spec-panel --mode discussion --experts "wiegers,adzic,cockburn"
         on a PRD that has ambiguous acceptance criteria.
Panel:   Wiegers, Adzic, Cockburn
Output:  Sequential dialogue that converges on SMART criteria with
         Given/When/Then examples for each requirement.
```

### Compliance review
```
@sam-sec loads sc-spec-panel --focus compliance --experts "wiegers,nygard"
         after completing the adversarial matrix, before verdict.
Panel:   Wiegers, Nygard, Hightower
Output:  Compliance gaps, operational requirements, audit-trail
         recommendations. Blockers added to REVIEW (max 3 rule).
```

### Socratic learning (rare in /forge)
```
sc-spec-panel @my_first_spec.md --mode socratic --iterations 2
Panel:   Rotating, each expert asks one discovery question per iteration.
Output:  Questions only — author writes answers, panel re-engages
         in iteration 2 with follow-up questions.
```

## Quality Metrics

Each review can report per-dimension quality scores (0–10):

- **Clarity** — language precision and understandability
- **Completeness** — coverage of essential specification elements
- **Testability** — measurability and validation capability
- **Consistency** — internal coherence and contradiction detection

Computation details: [`references/metrics.md`](./references/metrics.md).

## Boundaries

### Will
- Provide expert-level specification review with prioritized recommendations
- Support multiple analysis modes for different learning objectives
- Generate consolidated findings with quality metrics
- Cite which expert raised each finding

### Will Not
- Replace human judgment in critical decisions
- Modify specifications without explicit user consent
- Generate specifications from scratch without existing content
- Provide legal or regulatory compliance guarantees

**Output**: expert review document with multi-expert analysis (up to 10 simulated experts), specific actionable recommendations, consensus points and disagreements, and priority-ranked improvements.

**Next step**: author incorporates feedback into the spec; `@devon-ops` cannot cut a release while the review's CRITICAL findings are unresolved.

---

## Attribution

Original content from **SuperClaude_Plugin** (SuperClaude-Org) v4.3.0.
Licensed under **MIT** — Copyright (c) 2024 SuperClaude Framework Contributors.
Upstream: https://github.com/SuperClaude-Org/SuperClaude_Plugin

Inlined into ohmyclaude with adaptations: the 435-line SKILL.md was split into a concise SKILL.md (this file, ≤400 lines per ohmyclaude convention) plus focused reference material under `references/`. SC-specific MCP-server references generalised; ohmyclaude canonical triggers and integration with `@artie-arch` / `@una-ux` / `@sam-sec` added to the examples.
