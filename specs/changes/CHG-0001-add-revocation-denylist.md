---
id: CHG-0001
type: change
title: Introduce distributed in-memory revocation denylist
domain: auth
status: provisional
target_spec: SPC-0001
deltas:
  added:
    - ASM-0002
    - REQ-0002
    - ACR-0002
  modified: []
  removed: []
owners:
  - security-team
tags:
  - auth
  - revocation
created_at: "2026-10-26"
updated_at: "2026-10-26"
---

## Why (Motivation)
Following the adoption of short-lived stateless asymmetric access tokens (`DEC-0001`, underpinned by `FCT-0001`), compromised or explicitly logged-out credentials remain valid until their 15-minute expiration window elapses unless a supplementary revocation mechanism is introduced.

## What Changes
- **Added Epistemic Assumption (`ASM-0002`)**: Assumes a 30-second eventual consistency window is acceptable for edge revocation propagation.
- **Added Requirement (`REQ-0002`)**: Mandates an in-memory edge denylist synchronized within 30 seconds.
- **Added Acceptance Criterion (`ACR-0002`)**: Verifies unauthorized rejection on a revoked credential identifier after the synchronization window without hitting the persistent session store.
