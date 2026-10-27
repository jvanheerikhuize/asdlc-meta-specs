---
id: ASM-0001
type: assumption
title: Peak token validation bursts exceed 1,000 req/s during flash events
domain: auth
status: promoted
confidence: 0.6
risk: high
validation_plan: Replay 7-day peak production gateway traffic against staging auth service and measure persistent session store connection pool saturation.
validated_by:
  - VAL-0001
promoted_to:
  - FCT-0001
owners:
  - architecture-team
tags:
  - auth
  - throughput
  - storage
created_at: "2026-10-20"
updated_at: "2026-10-26"
---

## Statement
We assume that during flash events (marketing pushes, mass re-logins after incidents) authentication token validation traffic bursts **above 1,000 requests per second**, which would make synchronous persistent session store lookups on every request risky.

## Impact if True
If bursts exceed session store connection pool capacity, synchronous session lookups on the gateway hot path will cause connection starvation and cascading service unavailability across all downstream services.

## Resolution & Promotion Note
Tested by `VAL-0001` (Gateway Traffic Replay). Outcome **refined**: the assumption holds and was sharpened with measured boundaries — bursts reach **3,200 req/s** and synchronous persistent store lookups saturate at **650 req/s**. Promoted to `FCT-0001`.
