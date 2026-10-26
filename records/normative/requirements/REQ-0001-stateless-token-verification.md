---
id: REQ-0001
type: requirement
title: Stateless Cryptographic Access Token Verification
domain: auth
status: active
category: functional
normative: SHALL
ears_pattern: event_driven
priority: p0
underpinned_by:
  - FCT-0001
governed_by:
  - CON-0001
verified_by:
  - ACR-0001
owners:
  - auth-team
tags:
  - auth
  - jwt
  - gateway
created_at: 2026-10-26
updated_at: 2026-10-26
---

## Statement
WHEN a client sends a request to a protected endpoint with a bearer access token, THE API Gateway SHALL verify the token's cryptographic signature, issuer (`iss`), audience (`aud`), and expiration (`exp`) claims locally using cached public keys without querying persistent session storage.

## Rationale
Underpinned by `FCT-0001` (promoted from `ASM-0001` via `VAL-0001`). Local cryptographic verification enables >18,000 req/s per node while complying with `CON-0001`.
