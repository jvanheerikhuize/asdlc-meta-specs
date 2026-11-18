---
id: REQ-0009
title: Export a complete machine-readable index of the record graph for the workspace
status: active
because: [FCT-0007, FCT-0009]
---

## Statement
The system MUST export a single machine-readable index document containing the repository identifier, summary counts (`records`, `errors`, `warnings`), top-level `issues` for global diagnostics not tied to a single record ID, the topological `spec_order` list, and an entry for each record with its metadata (excluding internal timestamps and normalizing any parsed date values such as `review_after` to ISO `YYYY-MM-DD` strings), full `type` name, relative `path`, trimmed `body`, sorted `downstream` impact list, attached `issues` (`error: ...` and `warning: ...`), `readiness` percentage for specs, and blocking `open_questions` for requirements and specs.

## Acceptance
- Given a valid record graph with specs, requirements, facts, assumptions, and questions
- When the workspace index is generated
- Then the index contains summary counts, topological spec order, downstream impact lists, spec readiness percentages, and per-record issues
