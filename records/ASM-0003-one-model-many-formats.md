---
id: ASM-0003
title: A single record graph can project purpose-specific views for multiple spec-driven tools
status: validated
confidence: 0.7
promoted_to: FCT-0007
---

## Statement
Target formats (Markdown, Gherkin, OpenSpec, Spec Kit) can be generated as purpose-specific partial views of the same record graph through compact renderers rather than maintaining separate sources of truth.

## How we validate it
Write renderers for four target formats from the same record graph and document which metadata, grounds, questions, and scenarios each projection preserves or omits.
