---
id: ASM-0001
type: assumption
title: Peak concurrent token validations remain under 500 req/s
domain: auth
status: promoted
confidence: 0.6
risk: high
validation_plan: Replay 7-day peak production gateway traffic against staging auth service and measure DB connection pool saturation.
validated_by:
  - VAL-0001
promoted_to:
  - FCT-0001
owners:
  - architecture-team
tags:
  - auth
  - throughput
  - database
created_at: 2026-10-20
updated_at: 2026-10-26
---

## Statement
We initially assume peak authentication token validation traffic will not exceed 500 requests per second, which would allow synchronous relational database lookups on every incoming API request.

## Impact if False
If request rates exceed database connection pool capacity (~650 req/s), synchronous session lookups on the API gateway hot path will cause connection starvation and cascading `503 Service Unavailable` failures across all downstream services.

## Resolution & Promotion Note
Tested by `VAL-0001` (Gateway Traffic Replay). Empirical measurements refuted the 500 req/s ceiling (actual burst reached 3,200 req/s) and established `FCT-0001`, refining our understanding of hot-path throughput constraints.
