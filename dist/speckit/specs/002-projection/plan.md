# Technical Plan: Multi-Standard Projection Compiler & PSM Binding

<!-- Generated from Canonical Spec SPC-0002 (tier: skeleton) & Architectural Decisions (DEC-xxxx) -->

## 1. Constitution & Epistemic Gate Check

| Gate Check | Status | Details |
| :--- | :--- | :--- |
| **Architecture Tier & Rebuild Scope** | `skeleton` | Walking Skeleton (Core MVP) (Toggleable: `false`; Depends on: `SPC-0001`) |
| **Governing Constraints Satisfied** | `PASS` | `CON-0002` |
| **High-Risk Unvalidated Assumptions** | `PASS` | None (all assumptions validated) |

## 2. Architectural & Design Decisions

### DEC-0002: Separate the Platform-Independent Model (PIM) from external Platform-Specific Models (PSM) via declarative projection adapters (Status: `accepted`)
- **Satisfies**: `REQ-0003`, `CON-0002`
- **Underpinned By**: `FCT-0002`

We will maintain canonical records as a strictly tech-stack-agnostic Platform-Independent Model (PIM) and compile target standard artifacts (`dist/openspec/`, `dist/speckit/`) through declarative adapter mappings (`adapters/*/mapping.yaml`) and Handlebars templates (`adapters/*/templates/*.hbs`), binding concrete technology choices only when an external Tech-Stack Profile (`--stack-profile`) is supplied.
