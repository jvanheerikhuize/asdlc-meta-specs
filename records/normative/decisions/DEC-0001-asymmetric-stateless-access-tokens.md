---
id: DEC-0001
type: decision
title: Use short-lived asymmetric cryptographic bearer tokens (15-minute TTL) with cached public verification keys
domain: auth
status: accepted
satisfies:
  - REQ-0001
  - CON-0001
underpinned_by:
  - FCT-0001
owners:
  - architecture-team
tags:
  - auth
  - adr
  - cryptography
created_at: "2026-10-26"
updated_at: "2026-10-26"
---

## Context
To satisfy `REQ-0001` and `CON-0001` under the empirical load established in `FCT-0001` (3,200 req/s bursts), Gateway nodes must verify access credentials locally without contacting the primary session store or internal auth service on every request.

## Decision
We will issue short-lived (15-minute TTL) self-contained bearer tokens signed with an asymmetric private key by the Auth Service. Public verification keys will be cached in memory on all Gateway nodes with background key-rotation refresh. *(Concrete token encoding and elliptic-curve signature algorithms are bound by the target repository's tech-stack configuration.)*

## Alternatives Considered
1. **Opaque Session Tokens + Synchronous Store Lookup**: Rejected due to connection pool saturation at 650 req/s (`FCT-0001`).
2. **Symmetric Shared-Secret Signatures (e.g., HMAC)**: Rejected because sharing the signing secret across all edge gateway nodes violates least-privilege boundaries.
3. **Long-Lived Stateless Tokens (>1 hour TTL)**: Rejected because it widens the exposure window if an edge revocation update is delayed.

## Consequences
- **Positive**: 18,500+ verifications/sec per node at <0.4ms p99 latency; zero persistent session store load on hot path.
- **Negative**: Explicit revocation prior to the 15-minute TTL requires a supplementary in-memory denylist (`REQ-0002`).
