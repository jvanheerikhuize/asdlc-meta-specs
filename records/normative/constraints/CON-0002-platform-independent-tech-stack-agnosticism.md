---
id: CON-0002
type: constraint
title: Platform-Independent Tech-Stack Agnosticism (PIM vs. PSM Separation)
domain: global
status: active
scope: global
enforcement: mandatory
underpinned_by:
  - FCT-0002
owners:
  - jvanheerikhuize
tags:
  - architecture
  - tech-stack-agnostic
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
Canonical specifications (`SPC`, `CHG`), normative records (`CON`, `REQ`, `ACR`, `DEC`), and domain epistemic records (`ASM`, `FCT`, `QST`) MUST state domain behavior, architectural topology, and operational invariants in strictly tech-stack-agnostic language; concrete programming languages, frameworks, storage engines, wire protocols, and cryptographic cipher suites MUST be deferred to external Tech-Stack Profiles bound during target projection.

## Rationale
Derived from `FCT-0002`: separating the Platform-Independent Model (PIM) from the Platform-Specific Model (PSM) prevents premature implementation anchoring in AI coding agents and keeps specifications reusable across technology migrations.
