---
id: REQ-0002
type: requirement
title: Guided Capture Ingestion and Epistemic Status Cascading
domain: capture
status: provisional
category: functional
normative: SHALL
ears_pattern: event_driven
priority: p0
underpinned_by:
  - FCT-0003
  - ASM-0002
governed_by:
  - CON-0001
  - CON-0003
verified_by:
  - ACR-0002
owners:
  - jvanheerikhuize
tags:
  - capture
  - ingestion
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
WHEN a contributor submits a requirement, assumption, fact/validation, decision, or open question capture via a GitHub Issue Form or payload file, THE ingestion engine (`tools/ingest_capture.py`) SHALL validate the payload against its capture schema, allocate collision-free IDs across open capture branches, write the resulting atomic record files, cascade epistemic status transitions (`provisional`, `promoted`, `invalidated`, `broken`, `needs_review`) onto affected records, and open a validated Pull Request.

## Rationale
Underpinned by `FCT-0003` and `ASM-0002`, and governed by `CON-0001` and `CON-0003`. Currently **provisional** pending empirical usability validation of `ASM-0002` and resolution of blocking question `QST-0001`.
