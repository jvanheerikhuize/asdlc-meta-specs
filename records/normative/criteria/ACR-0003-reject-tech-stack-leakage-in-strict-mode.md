---
id: ACR-0003
type: criterion
title: Reject tech-stack leakage in strict validation mode
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
  - tech-stack-agnostic
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Scenario: Tech-stack terms in canonical PIM records fail strict validation
- **GIVEN** a canonical specification, normative record, or domain epistemic record containing a forbidden technology-stack term configured in `meta-spec.config.yaml`
- **WHEN** `tools/validate.py --strict` is executed
- **THEN** the validator MUST report the offending tech-stack term(s) and exit with a non-zero status code
