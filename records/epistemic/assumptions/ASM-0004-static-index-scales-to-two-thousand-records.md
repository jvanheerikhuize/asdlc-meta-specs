---
id: ASM-0004
type: assumption
title: A single static JSON index payload sustains sub-100ms browser search and stratified SVG graph layout up to 2,000 records
domain: workspace
status: unvalidated
confidence: 0.75
risk: low
validation_plan: Generate synthetic specification graphs of 500, 1,000, and 2,000 linked records and benchmark index load time, filter latency, and barycenter SVG layout time in the browser workspace.
owners:
  - jvanheerikhuize
tags:
  - workspace
  - performance
  - captured
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
Compiling the canonical record graph into a single static `site/data/index.json` artifact sustains sub-100ms client-side search, filtering, and 5-tier stratified SVG graph layout up to 2,000 records, while browser local storage reliably retains unsent capture drafts across sessions.

## Validation Plan
Generate synthetic canonical graphs of 500, 1,000, and 2,000 records and measure `index.json` payload size, filter keystroke latency, and `layoutGraph()` execution time in `site/js/views/graph.js`.

## Impact if False
Repositories exceeding the single-index threshold will experience sluggish graph rendering and will require domain-partitioned index shards.

## Provenance
Captured via issues #9 and #11 by @jvanheerikhuize on 2026-10-27.
