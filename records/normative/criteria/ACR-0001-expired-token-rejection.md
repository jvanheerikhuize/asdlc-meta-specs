---
id: ACR-0001
type: criterion
title: Expired or tampered token rejection without database query
domain: auth
status: active
format: gherkin
verifies:
  - REQ-0001
underpinned_by:
  - FCT-0001
owners:
  - auth-team
tags:
  - auth
  - bdd
  - security
created_at: 2026-10-26
updated_at: 2026-10-26
---

## Scenario: Expired access token rejection
- **GIVEN** a client possesses a cryptographically signed access token whose `exp` timestamp is in the past
- **WHEN** the client sends a request to a protected API endpoint
- **THEN** the API Gateway SHALL return `401 Unauthorized` with error code `TOKEN_EXPIRED`
- **AND** the API Gateway SHALL execute `0` queries against the relational session database
- **AND** the p99 verification latency SHALL remain below `2ms`
