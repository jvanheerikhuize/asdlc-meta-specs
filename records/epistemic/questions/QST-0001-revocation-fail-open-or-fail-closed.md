---
id: QST-0001
type: question
title: Should gateway nodes fail-open or fail-closed if revocation synchronization exceeds 30 seconds?
domain: auth
status: open
blocking: true
affects:
  - REQ-0002
  - SPC-0001
owners:
  - security-team
  - auth-team
tags:
  - auth
  - revocation
  - resilience
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Question
If an edge Gateway node loses connectivity to the revocation synchronization stream for longer than the 30-second propagation window (`ASM-0002`), should it **fail-open** (continue accepting unexpired credentials using its last-known denylist snapshot) or **fail-closed** (reject protected requests until synchronization is restored)?

## Context & Options
1. **Option A — Fail-Open with Stale Denylist Alerting**: Prioritizes availability during transient internal network partitions, but widens the revocation exposure window beyond 30 seconds on partitioned nodes.
2. **Option B — Fail-Closed after Grace Threshold**: Enforces a hard upper bound on revocation propagation at the cost of rejecting authenticated traffic if the revocation distributor is unreachable.
