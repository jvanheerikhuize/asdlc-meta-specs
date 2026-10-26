# Stateless Authentication & Session Revocation Specification

<!-- Generated from Canonical Spec SPC-0001 (domain: auth, status: provisional) -->

## Purpose

Defines the authentication token verification and session revocation architecture for the API Gateway, ensuring high-throughput stateless verification (`REQ-0001`) alongside bounded-latency session revocation (`REQ-0002`).

## Epistemic Readiness Summary

- **Spec ID**: `SPC-0001`
- **Status**: `provisional` (Epistemic Readiness: `50%`)
- **Governing Constraints**: `CON-0001` (Zero synchronous database I/O on API gateway authentication hot path)

## Requirements

### Requirement: Stateless Cryptographic Access Token Verification
<!-- Canonical ID: REQ-0001 | Status: active | Underpinned by: FCT-0001 -->

WHEN a client sends a request to a protected endpoint with a bearer access token, THE API Gateway SHALL verify the token's cryptographic signature, issuer (`iss`), audience (`aud`), and expiration (`exp`) claims locally using cached public keys without querying persistent session storage.

#### Scenario: Expired or tampered token rejection without database query
<!-- Canonical ID: ACR-0001 -->
- **GIVEN** a client possesses a cryptographically signed access token whose `exp` timestamp is in the past
- **WHEN** the client sends a request to a protected API endpoint
- **THEN** the API Gateway SHALL return `401 Unauthorized` with error code `TOKEN_EXPIRED`
- **AND** the API Gateway SHALL execute `0` queries against the relational session database
- **AND** the p99 verification latency SHALL remain below `2ms`

### Requirement: Distributed In-Memory Token Revocation Denylist
<!-- Canonical ID: REQ-0002 | Status: provisional | Underpinned by: FCT-0001, ASM-0002 -->
> [!WARNING]
> **Provisional Requirement (`REQ-0002`)**: Underpinned by unvalidated assumption(s): `ASM-0002` (Eventual consistency window of 30 seconds is acceptable for token revocation, risk: high).

WHEN an active session is explicitly revoked, THE Auth Service SHALL publish the revoked token's unique identifier (`jti`) to an in-memory edge denylist synchronized across all API Gateway nodes within 30 seconds.

#### Scenario: Revoked token rejection within 30-second edge propagation window
<!-- Canonical ID: ACR-0002 -->
- **GIVEN** an authenticated user has an unexpired access token with identifier `jti-9941`
- **WHEN** the session is revoked via `POST /v1/auth/revoke`
- **AND** `30 seconds` have elapsed for edge denylist synchronization (`ASM-0002`)
- **THEN** any subsequent request bearing `jti-9941` SHALL be rejected by the API Gateway with `401 Unauthorized`
- **AND** the denylist check SHALL be served entirely from local gateway memory
