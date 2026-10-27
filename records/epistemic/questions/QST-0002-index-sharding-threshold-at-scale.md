---
id: QST-0002
type: question
title: At what canonical record volume should the workspace index switch from a single JSON file to domain-partitioned shards?
domain: workspace
status: open
blocking: false
affects:
  - REQ-0004
  - ACR-0005
  - ACR-0006
owners:
  - jvanheerikhuize
tags:
  - workspace
  - performance
  - captured
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Question
How does the ASDLC specification workspace and validation pipeline perform as the canonical record graph scales, and at what threshold should `tools/build_index.py` partition `site/data/index.json` by domain?

## Context & Options
- **Option A (Single static `index.json` up to 2,000 records)**: Keep a single compiled JSON file for zero-waterfall client navigation as long as benchmark validation (`ASM-0004`) confirms sub-100ms filtering and SVG layout.
- **Option B (Domain-sharded index with manifest)**: Emit a lightweight metadata index for global search/graph topology and lazy-load prose sections per domain once record count exceeds 2,000.

## Notes
Non-blocking architectural clarification for `REQ-0004` and `ASM-0004`.

## Provenance
Captured via issue #11 by @jvanheerikhuize on 2026-10-27.
