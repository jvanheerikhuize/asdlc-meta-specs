---
id: FCT-0001
type: fact
title: Peak token validation reaches 3,200 req/s and saturates synchronous DB lookups at 650 req/s
domain: auth
status: active
source: empirical_validation
promoted_from: ASM-0001
evidence:
  - VAL-0001
owners:
  - architecture-team
tags:
  - auth
  - throughput
  - latency
created_at: "2026-10-26"
updated_at: "2026-10-26"
---

## Statement
Ingress authentication traffic experiences flash bursts up to **3,200 requests/second**, whereas synchronous relational database lookups saturate connection pools at **650 requests/second** (`VAL-0001`).

## Architectural Implications
1. Access token verification on the API gateway hot path **cannot** perform synchronous database queries per request.
2. Token verification must operate locally at the edge using stateless cryptographic verification or in-memory state.
