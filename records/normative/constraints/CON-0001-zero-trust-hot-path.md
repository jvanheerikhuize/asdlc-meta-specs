---
id: CON-0001
type: constraint
title: Zero synchronous database I/O on API gateway authentication hot path
domain: global
status: active
scope: performance
enforcement: mandatory
underpinned_by:
  - FCT-0001
owners:
  - architecture-team
tags:
  - auth
  - performance
  - gateway
created_at: 2026-10-26
updated_at: 2026-10-26
---

## Statement
No service or middleware executing on the API gateway request hot path SHALL perform synchronous network or relational database queries to validate bearer access tokens.

## Rationale
Directly enforced due to `FCT-0001`: peak ingress bursts (3,200 req/s) exceed relational database connection pool limits (650 req/s) by nearly 5x.
