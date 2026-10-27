---
id: FCT-0002
type: fact
title: The 10-type canonical record graph compiles deterministically into OpenSpec and GitHub Spec Kit artifacts without semantic loss
domain: projection
status: active
source: empirical_validation
promoted_from: ASM-0001
evidence:
  - VAL-0001
owners:
  - jvanheerikhuize
tags:
  - projection
  - sdd
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
A canonical Platform-Independent Model (PIM) composed of 10 elemental record types (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) compiles deterministically through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into OpenSpec capability/delta specifications and GitHub Spec Kit constitutions, feature specs, and technical plans.

## Implications
- External SDD frameworks (`dist/openspec/`, `dist/speckit/`) never need to be edited by hand; `tools/project.py --check` enforces zero drift between canonical records and projected artifacts in CI.
- Concrete technology stacks (PSM) can be bound externally at projection time via `--stack-profile` without polluting canonical domain requirements.
