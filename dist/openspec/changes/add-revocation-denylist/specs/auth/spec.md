# Delta Specification: Introduce distributed in-memory revocation denylist

<!-- Generated from Canonical Change CHG-0001 targeting SPC-0001 -->

## ADDED Requirements

### Requirement: Distributed In-Memory Token Revocation Denylist
<!-- Canonical ID: REQ-0002 | Underpinned by: FCT-0001, ASM-0002 -->
WHEN an active session is explicitly revoked, THE Auth Service SHALL publish the revoked token's unique identifier (`jti`) to an in-memory edge denylist synchronized across all API Gateway nodes within 30 seconds.

#### Scenario: Revoked token rejection within 30-second edge propagation window
- **GIVEN** an authenticated user has an unexpired access token with identifier `jti-9941`
- **WHEN** the session is revoked via `POST /v1/auth/revoke`
- **AND** `30 seconds` have elapsed for edge denylist synchronization (`ASM-0002`)
- **THEN** any subsequent request bearing `jti-9941` SHALL be rejected by the API Gateway with `401 Unauthorized`
- **AND** the denylist check SHALL be served entirely from local gateway memory
