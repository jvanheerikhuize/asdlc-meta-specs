---
id: REQ-0005
title: Specs render to several target formats from the same records
status: active
because: [FCT-0004, FCT-0007]
---

## Statement
The system MUST render specs in topological order into each supported target format (`markdown`, `gherkin`, `openspec`, and `speckit`) without editing the records, SHOULD allow filtering by `--tier` (`skeleton` or `feature`), and SHOULD allow binding an external technology stack document at render time (`--stack FILE`) so concrete stack choices are appended to rendered Markdown specs under `## Technology Stack` while keeping `records/` technology-free. Markdown output MUST include the spec ID, title, tier, readiness percentage, optional `Builds on:` list, purpose, optional `## Non-goals` section when declared, spec-level open questions under `## Open questions (do not guess, ask)` as `- <QST-ID>: <title>`, each requirement's ID, title, status, statement, fenced `gherkin` acceptance blocks, `Because:` ground list, requirement-level open questions under `#### Open questions (do not guess, ask)` as `- <QST-ID>: <title>`, and the optional `## Technology Stack` section when `--stack` is supplied. Gherkin `.feature` output MUST emit a `Feature:` header (tagged with `@<QST-ID>` for any spec-level open questions) and one `Scenario: <REQ-ID> <title> #<N>` block per acceptance scenario, tagged with `@provisional` or `@broken` for non-active requirements and `@<QST-ID>` for blocking open questions, and MUST emit a comment preserving `<REQ-ID>`, status, and `@<QST-ID>` tags for any requirement that has no acceptance scenarios yet. OpenSpec output MUST emit `## Purpose`, optional `## Non-goals`, spec-level open questions, `## Requirements` with `### Requirement: <REQ-ID> · <title>`, requirement status and `because` grounds, requirement-level open questions, and `#### Scenario: <REQ-ID>#<N>` blocks with uppercased Gherkin keywords (`- **GIVEN** ...`). Spec Kit output MUST emit `# Feature Specification: <title>`, a spec metadata summary line, purpose, optional `## Non-goals`, `## User Scenarios & Testing` with `**Acceptance Scenario <REQ-ID>#<N>**` blocks, `## Requirements` / `### Functional Requirements` with `- **<REQ-ID>**: <statement> *(grounds: <comma-separated because IDs>)*`, and `## Clarifications` / `### Needs Clarification (do not guess, ask)` when any open question blocks the spec or its requirements.

## Acceptance
- Given a skeleton spec and a feature spec
- When rendering is requested for the skeleton tier only
- Then only the skeleton spec is written

- Given a stack-agnostic spec and an external technology stack file
- When Markdown rendering is requested with `--stack`
- Then the rendered spec includes the `## Technology Stack` section without modifying any record

- Given a spec with a `## Non-goals` section
- When Markdown rendering is requested
- Then the rendered spec includes the `## Non-goals` section before `## Requirements`

- Given an open question that blocks a requirement
- When the spec containing that requirement is rendered
- Then the question appears under the requirement
