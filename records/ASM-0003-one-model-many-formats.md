---
id: ASM-0003
title: A single record graph can feed any spec-driven tool through small renderers
status: validated
confidence: 0.7
promoted_to: FCT-0007
---

## Statement
Target formats (OpenSpec, Spec Kit, Gherkin, ADRs) are views of the same graph, so each needs only a small renderer rather than its own source of truth.

## How we validate it
Write renderers for two unrelated formats and check that neither needs a field the graph lacks.
