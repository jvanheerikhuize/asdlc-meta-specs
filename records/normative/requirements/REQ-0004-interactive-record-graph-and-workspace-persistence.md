---
id: REQ-0004
type: requirement
title: Interactive Stratified Record Graph and Durable Draft Persistence
domain: workspace
status: provisional
category: interface
normative: SHALL
ears_pattern: event_driven
priority: p1
underpinned_by:
  - FCT-0001
  - ASM-0004
governed_by:
  - CON-0001
  - CON-0002
verified_by:
  - ACR-0005
  - ACR-0006
owners:
  - jvanheerikhuize
tags:
  - workspace
  - graph
  - captured
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
WHEN a user navigates the browser workspace (`site/`) or edits a capture form, THE system SHALL render an interactive 5-tier stratified Record Graph (`#/graph` and per-record mini-graphs) with upstream grounding and downstream impact lineage highlighting, and SHALL durably persist unsent capture input data across browser sessions and page revisits.

## Rationale
Underpinned by `FCT-0001` and `ASM-0004`. **Provisional:** rests on unvalidated scaling assumption `ASM-0004`.

## Provenance
Captured via issue #9 by @jvanheerikhuize on 2026-10-27.
