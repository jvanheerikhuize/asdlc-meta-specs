# Project Constitution

<!-- Generated from Canonical Constraints (CON-xxxx) and Verified Facts (FCT-xxxx) -->

## Core Principles & Non-Negotiable Guardrails

### CON-0001: Zero synchronous persistent-store I/O on gateway authentication hot path
- **Scope**: `performance` | **Enforcement**: `mandatory`
- **Underpinned By**: `FCT-0001`

No service or middleware executing on the gateway request hot path SHALL perform synchronous network or persistent data store queries to validate bearer access credentials.

## Verified Domain Invariants (Fact Base)

- **`FCT-0001` (Peak token validation reaches 3,200 req/s and saturates synchronous session store lookups at 650 req/s)**: Ingress authentication traffic experiences flash bursts up to **3,200 requests/second**, whereas synchronous persistent session store lookups saturate connection pools at **650 requests/second** (`VAL-0001`). *(Source: `empirical_validation`, Promoted from `ASM-0001`)*
