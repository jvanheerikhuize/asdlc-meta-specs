---
id: FCT-0007
title: Small renderers project a single record graph to multiple target formats without data loss
status: active
promoted_from: ASM-0003
evidence: Both render_markdown and render_gherkin in tools/spec.py generate comprehensive spec artifacts (spec titles, metadata, tier, readiness, dependencies, statement, acceptance scenarios, and grounded because links) directly from the record graph without requiring format-specific fields in records.
---

## Statement
Target spec formats (Markdown, Gherkin feature files, and similar views) are projections of the underlying record graph, needing only compact renderer functions without requiring extra schema fields or separate sources of truth in records.
