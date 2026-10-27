---
id: SPC-0001
type: spec
title: Core Epistemic Record Graph & Validation Engine
domain: epistemic-graph
status: active
tier: skeleton
toggleable: false
composition:
  constraints:
    - CON-0001
    - CON-0002
    - CON-0003
  requirements:
    - REQ-0001
  criteria:
    - ACR-0001
    - ACR-0003
  decisions:
    - DEC-0001
owners:
  - jvanheerikhuize
tags:
  - skeleton
  - validation
  - epistemic-graph
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Purpose
Defines the root **Walking Skeleton** (`tier: skeleton`) capability of `asdlc-meta-specs`: the canonical 10-type atomic Markdown record store (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`), Draft 2020-12 JSON Schema validation, bidirectional link reciprocity, epistemic status gating, tech-stack agnosticism enforcement, and per-specification Epistemic Readiness scoring.

## Scope & Architecture
1. **Atomic Canonical Store**: Every specification element is stored as an isolated Markdown file with strict YAML frontmatter in `records/` or `specs/` (`DEC-0001`).
2. **Referential & Reciprocal Integrity**: `tools/validate.py` verifies all link targets, enforces the 4 reciprocal link pairs, and validates the specification `depends_on` DAG and `skeleton` vs. `feature` tier boundaries.
3. **Epistemic Gating & Tech-Stack Agnosticism**: Enforces `CON-0001`, `CON-0002`, and `CON-0003` (`REQ-0001`, `ACR-0001`, `ACR-0003`).
