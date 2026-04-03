Here is the comprehensive blueprint for the specialized skills (tools) required by each agent.

To ensure the system remains stable and agents do not overstep their boundaries, **every agent should inherit a Base Toolset** (e.g., `read_file`, `glob_directory`, `grep_search`), but the ability to *write* or *execute* must be strictly siloed via the custom skills below.

Here are the specific skill definitions and implementation requirements for the skill creator.

### TIER 1 — STRATEGY & DESIGN

**1. `@paige-product` (Gatekeeper / Product & Triage)**

- **`classify_and_route_issue`**
    - **Description:** The core Grand Router engine. Evaluates the user request and outputs a strict JSON routing object.
    - **Requirements:** Must accept a natural language description. Must return a JSON object containing `Task_Type`, `Complexity`, `Priority`, `Touches_Security` (boolean), `Has_FE_Component` (boolean), and the final `Route_ID` (A, B, C, D, or E).
- **`write_prd_document`**
    - **Description:** Generates the formalized Product Requirements Document.
    - **Requirements:** Must accept JSON from the routing engine and output a `.md` file in the `.claude/pipeline/` directory strictly matching the `PRD-<id>.md` frontmatter schema.

**2. `@artie-arch` (Architect)**

- **`generate_c4_diagram`**
    - **Description:** A specialized diagramming tool that validates Mermaid.js C4 syntax before saving.
    - **Requirements:** Must accept raw Mermaid syntax as a string. Must run a headless syntax validation (or strict regex) to ensure it renders correctly as a C1, C2, or C3 diagram before allowing the agent to save it to the `SDD-<id>.md` file.
- **`write_sdd_document`**
    - **Description:** Saves the architectural blueprint.
    - **Requirements:** Must enforce read-only linking to the PRD and UX-SPEC. Writes the final `SDD-<id>.md` file.

**3. `@una-ux` (UX/UI Design)**

- **`write_ux_spec`**
    - **Description:** Drafts the wireframes and visual states.
    - **Requirements:** Must output `UX-SPEC-<id>.md`. Must include a required array field for `WCAG_Requirements` (e.g., contrast ratios, ARIA labels).
- **`audit_accessibility_markup`**
    - **Description:** A post-dev read-only tool to scan Frontend code for UX compliance.
    - **Requirements:** Must accept a file path (e.g., a React/Vue component). Parses the AST or HTML structure to flag missing `alt` tags, improper ARIA roles, or hardcoded hex colors that violate the UX Spec.

**4. `@scout-sprint` (Planning & Sprint Coordination)**

- **`execute_antigravity_scaffold`**
    - **Description:** Triggers your preferred Antigravity workflows to bypass manual coding for standard boilerplate.
    - **Requirements:** Must accept a `template_name` (e.g., `spring-rest-controller`, `java-21-record`) and a `target_directory`. Automatically copies the template, injects the necessary class names, and commits the boilerplate so execution agents can just fill in the logic.
- **`write_sprint_plan`**
    - **Description:** Converts the SDD into actionable tickets.
    - **Requirements:** Generates `PLAN-<id>.md`.

---

### TIER 2 — EXECUTION

**5. `@sam-sec` (Validation & Security)**

- **`run_sast_scan_simulation`**
    - **Description:** A simulated Static Application Security Testing tool.
    - **Requirements:** Accepts a directory path. Instead of running a heavy real-world tool like SonarQube, this script should use AST parsing or RegEx to hunt for predefined "danger patterns" in the code (e.g., hardcoded secrets, raw SQL queries, missing auth annotations in Spring Boot).
- **`write_security_review`**
    - **Description:** Outputs the validation verdict.
    - **Requirements:** Generates `REVIEW-<id>.md`. Must require a strict ENUM verdict: `APPROVE`, `APPROVE_WITH_NOTES`, or `REVISE`.

**6. `@beck-backend` (BE Contributor) & 7. `@effie-frontend` (FE Contributor)**

- **`edit_source_code`**
    - **Description:** The primary tool for writing code.
    - **Requirements:** Must support precise line-number replacements and whole-file overwrites. Must gracefully handle indentation. *Constraint:* @beck-backend's instance of this tool will throw a permission error if he attempts to edit files in `src/frontend`, and @effie-frontend's will fail if she touches `src/main/java`.
- **`execute_bash_command`**
    - **Description:** Runs local terminal commands.
    - **Requirements:** Must execute commands like `mvn clean test`, `npm run dev`, or `git status`. Must have a strict timeout (e.g., 60 seconds) to prevent infinite loops, and must truncate outputs longer than 2000 lines to preserve context windows.

**8. `@quinn-qa` (QA / Tester)**

- **`generate_fuzz_data`**
    - **Description:** Generates adversarial edge-case inputs for testing.
    - **Requirements:** Accepts a data type (e.g., "email", "currency"). Returns an array of extreme edge cases (e.g., SQL injection strings, 10MB text blocks, negative currency values) for Quinn to inject into the test suite.
- **`write_test_report`**
    - **Description:** Logs the testing outcomes.
    - **Requirements:** Generates `TEST-<id>.md`. Must link to failing test output logs if the verdict is `FAIL`.

---

### TIER 3 — GOVERNANCE (Read-Only Tools)

**9. `@stan-standards` (Logic & Standards) & 10. `@percy-perf` (Performance)**

- **`write_code_review`**
    - **Description:** Co-authors the `CODE-REVIEW-<id>.md` file.
    - **Requirements:** Uses a file-locking mechanism or append-only mode so @stan-standards and @percy-perf can both write to the same file simultaneously without overwriting each other's sections.
- **`trip_circuit_breaker`**
    - **Description:** The emergency halt function.
    - **Requirements:** Keeps a stateful count of review cycles per issue. If called 3 times on the same issue, it automatically halts the workflow and generates `DEADLOCK-<id>.md`, pinging the Oracle (You).

**11. `@dora-docs` (Documentation)**

- **`update_keep_a_changelog`**
    - **Description:** Appends entries to `CHANGELOG.md` following strict SemVer formatting.
    - **Requirements:** Must accept `Section` (Added, Changed, Deprecated, Removed, Fixed, Security) and `Message`. Must correctly parse the existing markdown file and insert the bullet point under the `[Unreleased]` header.

**12. `@devon-ops` (SRE / DevOps)**

- **`trigger_release_cut`**
    - **Description:** Finalizes the code for the hypothetical production environment.
    - **Requirements:** Reads the `[Unreleased]` section of the changelog, determines the next SemVer bump (Major, Minor, Patch) based on the inputs, writes `RELEASE-vX.Y.Z.md`, and locks the repository state.

---

### TIER 4 — POST-RELEASE

**13. `@evan-evangelist` (DevRel / Community)**

- **`draft_announcement`**
    - **Description:** Translates technical release notes into human-friendly copy.
    - **Requirements:** Reads `RELEASE-vX.Y.Z.md` and generates `ANNOUNCEMENT-<id>.md`. Must output specific formats for different platforms (e.g., a 280-character Twitter version, a 3-paragraph GitHub Discussion version).

**14. `@anna-analytics` (Data / Analytics)**

- **`fetch_simulated_telemetry`**
    - **Description:** Provides fake but realistic post-deploy data to trigger feedback loops.
    - **Requirements:** Must accept a `Feature_ID`. Returns a JSON object with randomized (but probabilistically weighted) metrics: `error_rate_delta`, `latency_p99`, and `user_engagement_drop`.
- **`create_backlog_regression_issue`**
    - **Description:** Closes the loop. If the telemetry tool returns a high error rate, Anna uses this to create a new `ISS-NNN.md` in the backlog for `@paige-product` to route as a Hotfix.