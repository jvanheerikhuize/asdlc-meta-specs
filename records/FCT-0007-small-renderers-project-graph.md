---
id: FCT-0007
title: Compact renderers project a single record graph into multiple purpose-specific target views
status: active
promoted_from: ASM-0003
evidence: "In tools/spec.py, four compact renderer functions (render_markdown, render_gherkin, render_openspec, render_speckit) project the same record graph without format-specific schema fields in records/: Markdown preserves spec metadata, readiness, dependencies, non-goals, open questions, statements, scenarios, and because grounds; OpenSpec and Spec Kit project structured requirement/scenario/clarification views; and Gherkin projects executable Scenario blocks with status and question tags."
---

## Statement
Target specification formats (`markdown`, `gherkin`, `openspec`, `speckit`) can be generated as purpose-specific partial projections of a single underlying record graph using compact renderer functions, without maintaining separate sources of truth or format-specific fields in `records/`.
