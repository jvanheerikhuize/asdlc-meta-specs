---
id: VAL-0001
type: validation
title: Staging gateway production traffic replay benchmark
domain: auth
status: completed
method: benchmark
outcome: refined
tests:
  - ASM-0001
establishes:
  - FCT-0001
artifacts:
  - "benchmarks/2026-10-24-gateway-replay-results.json"
owners:
  - platform-team
tags:
  - auth
  - benchmark
  - throughput
created_at: 2026-10-24
updated_at: 2026-10-26
---

## Objective
Evaluate `ASM-0001` by replaying peak production ingress traffic against the staging API gateway configured with synchronous PostgreSQL session token lookups.

## Findings
1. **Peak Traffic**: Flash burst traffic reached **3,200 requests/second** (6.4x higher than the 500 req/s assumption in `ASM-0001`).
2. **Database Bottleneck**: At **650 requests/second**, the PostgreSQL connection pool saturated, driving p99 auth latency from 4ms to >1,800ms.
3. **Stateless Verification Benchmark**: Switching to local Ed25519 signature verification sustained **18,500 requests/second** per gateway node at <0.4ms p99 latency.

## Conclusion
`ASM-0001` is refined and promoted to verified fact `FCT-0001`.
