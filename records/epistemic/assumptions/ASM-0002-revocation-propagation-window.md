---
id: ASM-0002
type: assumption
title: Eventual consistency window of 30 seconds is acceptable for token revocation
domain: auth
status: unvalidated
confidence: 0.5
risk: high
validation_plan: Conduct security compliance audit with CISO and review enterprise customer SLA contracts regarding immediate session termination.
owners:
  - security-team
tags:
  - auth
  - revocation
  - compliance
created_at: "2026-10-26"
updated_at: "2026-10-26"
---

## Statement
We assume that when an administrator or user explicitly revokes an active session, a propagation delay of up to 30 seconds across edge gateway nodes is acceptable from a security and compliance standpoint.

## Impact if False
If enterprise compliance mandates sub-second revocation enforcement, edge nodes cannot rely on periodic 30-second polling of the revocation denylist and must instead use push-based pub/sub invalidation or ultra-short token TTLs.
