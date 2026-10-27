---
id: SPC-0004
type: spec
title: Interactive Stratified Record Graph & Browser Workspace
domain: workspace
status: provisional
tier: feature
toggleable: true
depends_on:
  - SPC-0001
  - SPC-0003
composition:
  constraints:
    - CON-0001
    - CON-0002
  requirements:
    - REQ-0004
  criteria:
    - ACR-0005
    - ACR-0006
owners:
  - jvanheerikhuize
tags:
  - feature
  - workspace
  - visualization
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Purpose
Defines the toggleable **Feature Specification** (`tier: feature`, `toggleable: true`) for the static browser workspace (`site/` and `tools/build_index.py`), building on the canonical record graph (`SPC-0001`) and guided capture workflow (`SPC-0003`).

## Scope & Architecture
1. **Stratified 5-Tier Record Graph (`#/graph`)**: Visualizes upstream epistemic grounding and downstream normative impact across all 10 record types (`REQ-0004`, `ACR-0005`).
2. **Durable Capture Draft Persistence**: Autosaves unsent capture form inputs in browser local storage across sessions (`REQ-0004`, `ACR-0006`).
