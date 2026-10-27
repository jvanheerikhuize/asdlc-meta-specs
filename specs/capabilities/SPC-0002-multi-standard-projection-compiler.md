---
id: SPC-0002
type: spec
title: Multi-Standard Projection Compiler & PSM Binding
domain: projection
status: active
tier: skeleton
toggleable: false
depends_on:
  - SPC-0001
composition:
  constraints:
    - CON-0002
  requirements:
    - REQ-0003
  criteria:
    - ACR-0004
  decisions:
    - DEC-0002
owners:
  - jvanheerikhuize
tags:
  - skeleton
  - projection
  - pim-psm
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Purpose
Defines the second **Walking Skeleton** (`tier: skeleton`) capability of `asdlc-meta-specs`: the declarative projection compiler (`tools/project.py`) that compiles the canonical tech-stack-agnostic record graph (`SPC-0001`) into OpenSpec (`dist/openspec/`) and GitHub Spec Kit (`dist/speckit/`) artifacts, supports selective skeleton/feature projection and fact-change impact rebuild planning, and binds optional external Tech-Stack Profiles (PSM).

## Scope & Architecture
1. **Declarative Adapter Compilation**: Compiles canonical records through `adapters/*/mapping.yaml` and `.hbs` templates (`DEC-0002`, `REQ-0003`, `ACR-0004`).
2. **Topological Rebuild & Feature Filtering**: Supports `--tier skeleton`, `--specs`, `--exclude-specs`, and `--impacted-by <ID> --rebuild-plan` so coding agents can rebuild the walking skeleton first and layer feature specs in topological dependency order.
3. **PSM Tech-Stack Binding**: Binds external technology choices (`--stack-profile`) only during projection (`CON-0002`).
