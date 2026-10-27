---
id: REQ-0002
type: requirement
title: Distributed In-Memory Token Revocation Denylist
domain: auth
status: provisional
category: security
normative: SHALL
ears_pattern: event_driven
priority: p1
underpinned_by:
  - FCT-0001
  - ASM-0002
governed_by:
  - CON-0001
verified_by:
  - ACR-0002
owners:
  - security-team
tags:
  - auth
  - revocation
  - cache
created_at: "2026-10-26"
updated_at: "2026-10-26"
---

## Statement
WHEN an active session is explicitly revoked, THE Auth Service SHALL publish the revoked credential's unique identifier to an in-memory edge denylist synchronized across all Gateway nodes within 30 seconds.

## Rationale & Provisional Notice
- Requires in-memory edge lookup to obey `CON-0001` and `FCT-0001`.
- **Epistemic Status (`provisional`)**: The 30-second synchronization window is underpinned by unvalidated assumption `ASM-0002`. Once `ASM-0002` is validated with security compliance, this requirement will either transition to `active` or be sharpened to a tighter propagation bound.
