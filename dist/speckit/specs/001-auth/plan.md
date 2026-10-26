# Technical Plan: Stateless Authentication & Session Revocation Specification

<!-- Generated from Canonical Spec SPC-0001 & Architectural Decisions (DEC-xxxx) -->

## 1. Constitution & Epistemic Gate Check

| Gate Check | Status | Details |
| :--- | :--- | :--- |
| **Governing Constraints Satisfied** | `PASS` | `CON-0001` |
| **High-Risk Unvalidated Assumptions** | `WARN (PROVISIONAL)` | `ASM-0002` (risk: `high`) underpins `REQ-0002` and `ACR-0002` |

## 2. Architectural & Design Decisions

### DEC-0001: Use EdDSA (Ed25519) asymmetric JWTs with 15-minute TTL for access tokens (Status: `accepted`)
- **Satisfies**: `REQ-0001`, `CON-0001`
- **Underpinned By**: `FCT-0001`

We will issue short-lived (15-minute TTL) JSON Web Tokens (JWTs) signed asymmetrically using **EdDSA (Ed25519)**. Public verification keys (`JWKS`) will be cached in memory on all API Gateway nodes with background key-rotation refresh.
