I have reviewed the @skills/** directory and compared them with the plugin-based skills provided. Below is the analysis of the conflicts, the purpose of plugin-forge, and the requested
  decision table.

  1. Conflict Resolution & Tuning

   * Jira Conflict:
       * Decision: Use jira-log instead of jira.
       * Rationale: The local jira skill is designed for the ohmyclaude pipeline (mapping PLAN files). However, jira-log is more advanced; it includes Workload Reduction Estimation (AI
         SP), sensitive information filtering, and automatic label inheritance for sub-tasks. It is better suited for the "Noah's Ark" project (VGB) conventions.
   * Sprint/Task Breakdown Conflict:
       * Decision: Use task-breakdown instead of write-sprint-plan.
       * Rationale: task-breakdown uses a formal Uncertainty × Complexity × Effort decision matrix for Story Points and calculates AI savings. write-sprint-plan is a basic template
         filler. task-breakdown provides the data needed for higher-quality Jira logging.
   * Security Review Tuning:
       * Status: The security-tools plugin version is the "Source of Truth."
       * Tuning: The workflow is currently optimized for Taint Analysis (Call-Graph mode), which is critical for the payment/callback logic in your project. It correctly maps to VNGG
         Internal Incident Reports (in refs/internal) and uses CVSS v3.1 for professional reporting.
       * Recommendation: Ensure python3 scripts/sync_cheatsheets.py is run to keep the 111+ OWASP cheatsheets fresh.

  2. What is plugin-forge?
  plugin-forge is a meta-tooling skill used to build and maintain the Claude Code plugins themselves.
   * Primary Use: Scaffolding new agents, skills, and commands for plugins like security-tools or pen-claude-ai.
   * Key Function: It automates version bumping (bump_version.py) and ensures that plugin.json and marketplace.json stay in sync.
   * Pipeline Role: Used by @scout-sprint to generate the "skeleton" of a new feature before implementation begins.

  ---

  3. Skill Decision Table


  ┌────────────────┬────────────────────────────┬────────┬───────────────────────────────────────────────────────────────┐
  │ Category       │ Primary Skill              │ Source │ Decision / Usage Context                                      │
  ├────────────────┼────────────────────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ Strategy       │ requirements-clarity       │ Local  │ Use to reach 90+ clarity score before writing any PRD.        │
  │                │ game-changing-features     │ Local  │ "10x Mode" - use for high-complexity features (Route D/E).    │
  │                │ sc-adviser                 │ Local  │ Trigger expert panels (Fowler, Porter, etc.) for peer review. │
  │ Planning       │ task-breakdown             │ Plugin │ REPLACES write-sprint-plan. Use for SP estimation.            │
  │                │ jira-log                   │ Plugin │ REPLACES jira. Use to create VGB tickets with AI metrics.     │
  │ Design         │ write-sdd                  │ Local  │ Formalizes the architectural blueprint with C4 diagrams.      │
  │                │ c4-architecture            │ Local  │ Generates Mermaid diagrams (Context, Container, Component).   │
  │                │ database-schema-designer   │ Local  │ Use for SQL/NoSQL normalization and migration scripts.        │
  │                │ api-design                 │ Local  │ Enforces REST/GraphQL naming and error conventions.           │
  │ Implementation │ error-handling             │ Local  │ Implements Result types and custom exception hierarchies.     │
  │                │ tdd-patterns               │ Local  │ RED/GREEN/REFACTOR cycle; 70/25/5 test ratio.                 │
  │                │ reducing-entropy           │ Local  │ Manual only. Bias toward deleting code over adding.           │
  │ Security       │ owasp-security-review      │ Plugin │ Use /security-review for deep taint analysis & CVSS reports.  │
  │                │ add-security-ref           │ Plugin │ Use to import new internal pentest/incident reports.          │
  │ Quality        │ write-code-review          │ Local  │ Used by @stan and @percy for standards/perf verdicts.         │
  │                │ circuit-breaker            │ Local  │ Trips the pipeline after 3 failed review rounds.              │
  │                │ qa-test-planner            │ Local  │ Generates manual test cases and Figma validations.            │
  │ Release        │ commit-work                │ Local  │ Enforces Conventional Commits with co-author trailers.        │
  │                │ release-cut                │ Local  │ Automates SemVer bumps based on CHANGELOG.md.                 │
  │                │ update-changelog           │ Local  │ Appends entries under [Unreleased].                           │
  │ Docs           │ crafting-effective-readmes │ Local  │ Tailors content to project type (OSS, Internal, Config).      │
  │                │ writing-clearly            │ Local  │ Applies Strunk's rules; removes AI "puffery".                 │
  │                │ professional-communication │ Local  │ Drafts Announcements (Tweet, Discussion, Newsletter).         │
  │                │ lesson-learned             │ Local  │ Extracts SE principles (SOLID, DRY) from git history.         │
  └────────────────┴────────────────────────────┴────────┴───────────────────────────────────────────────────────────────┘


  Summary Recommendation
   1. Decommission skills/jira and skills/write-sprint-plan to avoid confusion.
   2. Promote pen-claude-plugins to your primary toolset for Project Management and Security.
   3. Tuning: The writing-clearly skill should be applied to all ANNOUNCEMENT and PRD outputs to maintain a professional, non-AI tone.

plugin-forge is a meta-tooling skill specifically designed for the development and maintenance of the ohmyclaude project itself and its ecosystem.

   * Internal Use: It is used by @scout-sprint to automate the creation of boilerplate for new agents, skills, and commands following ohmyclaude conventions.
   * For the "User": A standard user of ohmyclaude (who is using the /forge pipeline to build their own apps) wouldn't typically use plugin-forge directly.
   * Extension: You would only use it if you were extending ohmyclaude (e.g., adding a custom agent or creating a new plugin that follows this project's architectural standards).

  In short: It's the "factory" tool for building the pipeline's components, not a tool for the end-user's application logic.

=> So 'plugin-forge' need to move to correct place, not in skills for user

I've identified a clear distinction between Productivity Skills (used to build the user's application) and Meta-Skills (used to maintain ohmyclaude or build other plugins).

  Based on the audit, here is the proposed separation:

  1. Meta-Skills (Should be moved/hidden from end-user)
  These skills focus on the "factory" (building plugins and maintaining this repo) rather than the "product."
   * plugin-forge: Scaffolding agents/skills for Claude plugins.
   * skill-profiler: Auditing SKILL.md quality.
   * update-changelog: Specifically tied to the @dora-docs workflow and "Keep a Changelog" format.
   * release-cut: Specifically tied to the @devon-ops workflow for versioning.
   * writing-clearly: While general, it is the "Style Guide" for the pipeline agents (@paige-product, @evan-evangelist, etc.).

  2. Application/Domain Skills (Keep for User)
  These are the skills the 14 agents use to actually build, secure, and document the user's software.
   * api-design, c4-architecture, database-schema-designer, owasp-security-review, tdd-patterns, etc.
   * write-sdd, write-ux-spec: These are the "Work Instructions" for the pipeline agents.

  Recommendation
  I propose moving the Meta-Skills to claude local, .claude/skills, and updating .claude-plugin/plugin.json to exclude them from the public skill set if they shouldn't be auto-activated for users.