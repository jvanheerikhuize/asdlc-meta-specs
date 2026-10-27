---
id: QST-0002
type: question
title: How does the ASDLC specification graph perform as record volume scales?
domain: performance
status: open
blocking: false
affects:
- ACR-0003
- ACR-0004
- REQ-0003
owners:
- jvanheerikhuize
tags:
- captured
created_at: '2026-10-27'
updated_at: '2026-10-27'
---

## Question
How does the ASDLC specification workspace and validation pipeline perform as the canonical record graph scales to hundreds or thousands of records?

## Context & Options
- **Option A (Client-side full index up to 2,000 records)**: Keep a single static `index.json` payload and validate that search, filtering, and graph layout remain within the `REQ-0003` latency budget.
- **Option B (Domain-partitioned index shards)**: Partition the compiled index by domain once total record volume exceeds the interactive rendering budget.

## Notes
Non-blocking clarification to establish scaling thresholds for `REQ-0003` (`ACR-0003`, `ACR-0004`).

## Provenance
Captured via issue #11 by @jvanheerikhuize on 2026-10-27.
