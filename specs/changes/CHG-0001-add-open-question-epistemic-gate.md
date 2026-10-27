---
id: CHG-0001
type: change
title: Add First-Class Open Question (QST) Capture and Blocking Readiness Gate
domain: epistemic-graph
status: active
target_spec: SPC-0001
owners:
  - jvanheerikhuize
tags:
  - change-proposal
  - epistemic-graph
  - question
created_at: "2026-10-27"
updated_at: "2026-10-27"
deltas:
  added:
    - QST-0001
    - QST-0002
  modified:
    - REQ-0001
    - REQ-0002
  removed: []
---

## Why
When an engineer or AI agent encounters an underspecified domain edge case, inline `[NEEDS CLARIFICATION]` text markers are invisible to graph validation and cannot automatically block affected requirements or specifications from being treated as settled. Elevating Open Questions (`QST-xxxx`) to first-class epistemic records closes this gap.

## What Changes
- Introduces `QST-xxxx` (`type: question`) in `records/epistemic/questions/` with `blocking`, `affects`, and `resolved_by` links.
- Updates `REQ-0001` (`tools/validate.py`) and `REQ-0002` (`tools/ingest_capture.py`) so open blocking questions cascade `status: provisional` onto affected records and project into Spec Kit `### Open Questions ([NEEDS CLARIFICATION])`.
