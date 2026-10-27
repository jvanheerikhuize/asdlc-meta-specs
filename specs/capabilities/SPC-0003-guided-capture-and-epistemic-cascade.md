---
id: SPC-0003
type: spec
title: Guided Capture Ingestion & Epistemic Cascade Pipeline
domain: capture
status: provisional
tier: feature
toggleable: true
depends_on:
  - SPC-0001
  - SPC-0002
composition:
  constraints:
    - CON-0001
    - CON-0003
  requirements:
    - REQ-0002
  criteria:
    - ACR-0002
  decisions:
    - DEC-0003
owners:
  - jvanheerikhuize
tags:
  - feature
  - capture
  - ingestion
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Purpose
Defines the toggleable **Feature Specification** (`tier: feature`, `toggleable: true`) for zero-backend capture ingestion (`tools/ingest_capture.py` and `.github/ISSUE_TEMPLATE/capture-*.yml`), building on the core record graph (`SPC-0001`) and projection compiler (`SPC-0002`).

## Scope & Architecture
1. **Untrusted Input Confinement**: Validates capture submissions against closed schemas (`schema/captures/*.capture.schema.json`) and confines output paths within `records/` (`CON-0003`, `FCT-0003`).
2. **Collision-Free ID Allocation & Epistemic Cascading**: Mints new records (`REQ`, `ASM`, `FCT`, `VAL`, `DEC`, `QST`) and cascades status transitions (`provisional`, `promoted`, `invalidated`, `broken`, `needs_review`) onto dependent records (`REQ-0002`, `ACR-0002`, `DEC-0003`).
