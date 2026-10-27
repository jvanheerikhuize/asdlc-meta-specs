---
id: ACR-0001
type: criterion
title: Reject active requirements resting on unvalidated assumptions or open blocking questions
domain: epistemic-graph
status: active
format: gherkin
verifies:
  - REQ-0001
underpinned_by:
  - FCT-0001
owners:
  - jvanheerikhuize
tags:
  - validator
  - epistemic-gating
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Scenario: Active requirement underpinned by an unvalidated assumption or open blocking question is rejected
- **GIVEN** a canonical requirement record with `status: active`
- **WHEN** `tools/validate.py` evaluates the graph and finds that the requirement is underpinned by an `unvalidated` assumption or affected by an `open` question with `blocking: true`
- **THEN** the validator MUST emit a non-zero exit code and report an epistemic status error requiring `status: provisional`
