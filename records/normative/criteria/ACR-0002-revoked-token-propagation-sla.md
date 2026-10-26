---
id: ACR-0002
type: criterion
title: Revoked token rejection within 30-second edge propagation window
domain: auth
status: provisional
format: gherkin
verifies:
  - REQ-0002
underpinned_by:
  - ASM-0002
owners:
  - security-team
tags:
  - auth
  - revocation
  - bdd
created_at: 2026-10-26
updated_at: 2026-10-26
---

## Scenario: Revoked token blocked at edge gateway
- **GIVEN** an authenticated user has an unexpired access token with identifier `jti-9941`
- **WHEN** the session is revoked via `POST /v1/auth/revoke`
- **AND** `30 seconds` have elapsed for edge denylist synchronization (`ASM-0002`)
- **THEN** any subsequent request bearing `jti-9941` SHALL be rejected by the API Gateway with `401 Unauthorized`
- **AND** the denylist check SHALL be served entirely from local gateway memory
