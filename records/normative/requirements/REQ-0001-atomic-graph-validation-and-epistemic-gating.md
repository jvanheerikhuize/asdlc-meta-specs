---
id: REQ-0001
type: requirement
title: Atomic Graph Schema, Reciprocity, and Epistemic Readiness Validation
domain: epistemic-graph
status: active
category: functional
normative: MUST
ears_pattern: ubiquitous
priority: p0
underpinned_by:
  - FCT-0001
governed_by:
  - CON-0001
  - CON-0002
  - CON-0003
verified_by:
  - ACR-0001
  - ACR-0003
owners:
  - jvanheerikhuize
tags:
  - validator
  - epistemic-graph
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
The validation engine (`tools/validate.py`) MUST verify every canonical record against its Draft 2020-12 JSON Schema, enforce all 4 reciprocal link pairs (`promoted_to`/`promoted_from`, `validated_by`/`tests`, `establishes`/`evidence`, `verified_by`/`verifies`), reject `active` or `accepted` statuses on records resting on unvalidated assumptions or open blocking questions, enforce tech-stack agnosticism in `--strict` mode, and compute per-specification Epistemic Readiness scores.

## Rationale
Underpinned by `FCT-0001` and governed by `CON-0001`, `CON-0002`, and `CON-0003`. Automated graph validation guarantees that structural, epistemic, and stack-agnosticism invariants hold on every commit and pull request.
