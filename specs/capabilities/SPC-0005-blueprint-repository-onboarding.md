---
id: SPC-0005
type: spec
title: Blueprint Repository Onboarding
domain: onboarding
status: provisional
tier: feature
toggleable: true
depends_on:
  - SPC-0001
  - SPC-0002
composition:
  constraints:
    - CON-0002
  requirements:
    - REQ-0005
  criteria:
    - ACR-0007
    - ACR-0008
owners:
  - jvanheerikhuize
tags:
  - feature
  - onboarding
  - adoption
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Purpose
Defines the toggleable **Feature Specification** (`tier: feature`, `toggleable: true`) for installing and initializing the ASDLC meta-spec blueprint in greenfield and brownfield repositories, building on the core record graph (`SPC-0001`) and projection compiler (`SPC-0002`).

## Scope & Architecture
1. **Greenfield Onboarding Budget**: Initialize and validate a new repository within 10 minutes (`REQ-0005`, `ACR-0007`, `ASM-0003`).
2. **Brownfield Onboarding Budget**: Integrate into an existing repository and capture initial Walking Skeleton + Feature specifications within 30 minutes (`REQ-0005`, `ACR-0008`, `ASM-0003`).
