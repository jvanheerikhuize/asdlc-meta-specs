---
id: REQ-0003
type: requirement
title: Multi-Standard Projection Compilation and Drift Detection
domain: projection
status: active
category: functional
normative: SHALL
ears_pattern: event_driven
priority: p0
underpinned_by:
  - FCT-0002
governed_by:
  - CON-0002
verified_by:
  - ACR-0004
owners:
  - jvanheerikhuize
tags:
  - projection
  - openspec
  - speckit
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
WHEN the projection compiler (`tools/project.py`) is executed, THE system SHALL compile canonical records through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into target standard artifacts (`dist/openspec/` and `dist/speckit/`), support binding an optional external Tech-Stack Profile (`--stack-profile`), and fail with a non-zero exit status under `--check` whenever any projected artifact is missing or out of sync.

## Rationale
Underpinned by `FCT-0002` and governed by `CON-0002`. Ensures that external SDD artifacts remain a deterministic, zero-drift function of the canonical record graph.
