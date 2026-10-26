# Feature Specification: Stateless Authentication & Session Revocation Specification

<!-- Generated from Canonical Spec SPC-0001 (domain: auth) -->

## 1. Overview & Purpose

Defines the authentication token verification and session revocation architecture for the API Gateway, ensuring high-throughput stateless verification (`REQ-0001`) alongside bounded-latency session revocation (`REQ-0002`).

## 2. Epistemic Foundation (Facts & Assumptions)

### Verified Facts Underpinning This Spec
- **`FCT-0001` — Peak token validation reaches 3,200 req/s and saturates synchronous DB lookups at 650 req/s**: Ingress authentication traffic experiences flash bursts up to 3,200 requests/second, whereas synchronous relational database lookups saturate connection pools at 650 requests/second (`VAL-0001`).

### Active Assumptions (Pending Validation)
- **`ASM-0002` — Eventual consistency window of 30 seconds is acceptable for token revocation** *(Confidence: 0.5, Risk: high)*: We assume that when an administrator or user explicitly revokes an active session, a propagation delay of up to 30 seconds across edge gateway nodes is acceptable from a security and compliance standpoint.
  - *Validation Plan*: Conduct security compliance audit with CISO and review enterprise customer SLA contracts regarding immediate session termination.

## 3. Requirements

### REQ-0001: Stateless Cryptographic Access Token Verification (`SHALL` | Status: `active`)
- **Underpinned By**: `FCT-0001`
- **Governed By**: `CON-0001`

WHEN a client sends a request to a protected endpoint with a bearer access token, THE API Gateway SHALL verify the token's cryptographic signature, issuer (`iss`), audience (`aud`), and expiration (`exp`) claims locally using cached public keys without querying persistent session storage.

### REQ-0002: Distributed In-Memory Token Revocation Denylist (`SHALL` | Status: `provisional`)
- **Underpinned By**: `FCT-0001`, `ASM-0002`
- **Governed By**: `CON-0001`

WHEN an active session is explicitly revoked, THE Auth Service SHALL publish the revoked token's unique identifier (`jti`) to an in-memory edge denylist synchronized across all API Gateway nodes within 30 seconds.

## 4. Acceptance Scenarios

### ACR-0001: Expired or tampered token rejection without database query (Verifies: `REQ-0001`)
- **GIVEN** a client possesses a cryptographically signed access token whose `exp` timestamp is in the past
- **WHEN** the client sends a request to a protected API endpoint
- **THEN** the API Gateway SHALL return `401 Unauthorized` with error code `TOKEN_EXPIRED`
- **AND** the API Gateway SHALL execute `0` queries against the relational session database
- **AND** the p99 verification latency SHALL remain below `2ms`

### ACR-0002: Revoked token rejection within 30-second edge propagation window (Verifies: `REQ-0002`)
- **GIVEN** an authenticated user has an unexpired access token with identifier `jti-9941`
- **WHEN** the session is revoked via `POST /v1/auth/revoke`
- **AND** `30 seconds` have elapsed for edge denylist synchronization (`ASM-0002`)
- **THEN** any subsequent request bearing `jti-9941` SHALL be rejected by the API Gateway with `401 Unauthorized`
- **AND** the denylist check SHALL be served entirely from local gateway memory
