---
id: ACR-0002
type: criterion
title: Ingest capture payload and cascade epistemic status transitions across dependent records
domain: capture
status: provisional
format: gherkin
verifies:
  - REQ-0002
underpinned_by:
  - ASM-0002
owners:
  - jvanheerikhuize
tags:
  - capture
  - ingestion
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Scenario: Ingesting a capture allocates collision-free IDs and cascades epistemic status
- **GIVEN** a contributor submits a valid capture issue or payload for a requirement, assumption, fact/validation, decision, or open question
- **WHEN** `tools/ingest_capture.py` processes the input against existing records and reserved open-branch IDs
- **THEN** the tool SHALL allocate the next free ID(s), write schema-valid record file(s) inside `records/`, and transition any affected `active` records to `provisional`, `broken`, or `needs_review` according to the epistemic lifecycle rules
