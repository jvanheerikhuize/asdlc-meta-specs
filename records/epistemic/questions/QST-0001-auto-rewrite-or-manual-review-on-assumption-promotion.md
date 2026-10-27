---
id: QST-0001
type: question
title: Should promoting an assumption automatically rewrite underpinned_by links on dependent requirements or require human review?
domain: capture
status: open
blocking: true
affects:
  - REQ-0002
  - SPC-0001
owners:
  - jvanheerikhuize
tags:
  - capture
  - epistemic-lifecycle
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Question
When an open assumption (`ASM-xxxx`) is validated and promoted to a verified fact (`FCT-yyyy`) via `#/capture/fact`, should `tools/ingest_capture.py` automatically replace `ASM-xxxx` with `FCT-yyyy` in the `underpinned_by` list of dependent requirements, or keep `ASM-xxxx` so `tools/validate.py --strict` forces a human reviewer to inspect and sharpen the requirement wording against the new fact?

## Context & Options
- **Option A (Human-in-the-loop review warning — current behavior)**: `ingest_capture.py` marks `ASM-xxxx` as `promoted` and mints `FCT-yyyy`, while `validate.py` emits a review warning (`still underpinned by promoted assumption(s)`) so a human explicitly updates the dependent `REQ` statement and swaps `ASM-xxxx` $\rightarrow$ `FCT-yyyy`.
- **Option B (Automatic link rewrite + `needs_review` status)**: Automatically replace `ASM-xxxx` with `FCT-yyyy` in `underpinned_by` on dependent records during ingestion, but set their status to `needs_review` until a reviewer approves the PR.
