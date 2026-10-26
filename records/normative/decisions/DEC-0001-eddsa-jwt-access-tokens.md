---
id: DEC-0001
type: decision
title: Use EdDSA (Ed25519) asymmetric JWTs with 15-minute TTL for access tokens
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
To satisfy `REQ-0001` and `CON-0001` under the empirical load established in `FCT-0001` (3,200 req/s bursts), API Gateway nodes must verify access tokens locally without contacting the primary database or internal auth service on every request.

## Decision
We will issue short-lived (15-minute TTL) JSON Web Tokens (JWTs) signed asymmetrically using **EdDSA (Ed25519)**. Public verification keys (`JWKS`) will be cached in memory on all API Gateway nodes with background key-rotation refresh.

## Alternatives Considered
1. **Opaque Session Tokens + Synchronous DB Lookup**: Rejected due to connection pool saturation at 650 req/s (`FCT-0001`).
2. **HMAC-SHA256 (Symmetric JWT)**: Rejected because sharing the signing secret across all edge gateway nodes violates least-privilege boundaries.
3. **RSA-2048 JWT**: Larger token payload size and ~3x higher signature verification CPU cost compared to Ed25519.

## Consequences
- **Positive**: 18,500+ verifications/sec per node at <0.4ms p99 latency; zero database load on hot path.
- **Negative**: Explicit revocation prior to the 15-minute TTL requires a supplementary in-memory denylist (`REQ-0002`).
