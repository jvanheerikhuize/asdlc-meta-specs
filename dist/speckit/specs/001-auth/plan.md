# Technical Plan: Stateless Authentication & Session Revocation Specification

<!-- Generated from Canonical Spec SPC-0001 & Architectural Decisions (DEC-xxxx) -->

## 1. Constitution & Epistemic Gate Check

| Gate Check | Status | Details |
| :--- | :--- | :--- |
| **Governing Constraints Satisfied** | `PASS` | `CON-0001` |
| **High-Risk Unvalidated Assumptions** | `WARN (PROVISIONAL)` | `ASM-0002` (risk: `high`) underpins `REQ-0002` and `ACR-0002` |

## 2. Architectural & Design Decisions

### DEC-0001: Use short-lived asymmetric cryptographic bearer tokens (15-minute TTL) with cached public verification keys (Status: `accepted`)
- **Satisfies**: `REQ-0001`, `CON-0001`
- **Underpinned By**: `FCT-0001`

We will issue short-lived (15-minute TTL) self-contained bearer tokens signed with an asymmetric private key by the Auth Service. Public verification keys will be cached in memory on all Gateway nodes with background key-rotation refresh. *(Concrete token encoding and signature curve—such as Ed25519 JWTs—are bound by the target repository's tech-stack configuration.)*
