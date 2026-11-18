---
id: REQ-0005
title: Specs render to several target formats from the same records
status: active
because: [FCT-0004, FCT-0007]
---

## Statement
The system MUST render specs in topological order into each supported target format (`markdown` and `gherkin`) without editing the records, and SHOULD allow filtering by `--tier` (`skeleton` or `feature`). Markdown output MUST include the spec ID, title, tier, readiness percentage, optional `Builds on:` list, purpose, spec-level open questions, and each requirement's ID, title, status, statement, fenced `gherkin` acceptance blocks, `Because:` ground list, and requirement-level open questions. Gherkin `.feature` output MUST emit a `Feature:` header and one `Scenario: <REQ-ID> <title> #<N>` block per acceptance scenario, tagged with `@provisional` or `@broken` for non-active requirements and `@<QST-ID>` for blocking open questions.

## Acceptance
- Given a skeleton spec and a feature spec
- When rendering is requested for the skeleton tier only
- Then only the skeleton spec is written
