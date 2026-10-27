---
id: CON-0001
type: constraint
title: Epistemic Grounding and Readiness Gate Invariant
domain: global
status: active
scope: global
enforcement: mandatory
underpinned_by:
  - FCT-0001
owners:
  - jvanheerikhuize
tags:
  - epistemic-governance
  - readiness
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
Every normative record (`CON`, `REQ`, `DEC`) MUST declare at least one underpinning `FCT` or `ASM` record. No normative record or specification manifest (`SPC`, `CHG`) may hold an `active` or `accepted` status while underpinned by an unvalidated assumption (`unvalidated` or `validating`) or while affected by an open blocking question (`blocking: true`), and every `active` requirement MUST be verified by at least one acceptance criterion (`ACR`).

## Rationale
Derived from `FCT-0001`: enforcing upward epistemic grounding and downward verification coverage prevents unverified guesswork or unresolved ambiguities from silently entering implementation-ready specifications.
