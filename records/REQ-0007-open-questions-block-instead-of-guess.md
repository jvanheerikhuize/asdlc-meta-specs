---
id: REQ-0007
title: A known gap is recorded as an open question, never filled with a guess
status: active
because: [FCT-0003]
---

## Statement
When nobody can yet propose an answer, the gap MUST be recorded as an open question that names the requirements or specs it `blocks`. A requirement blocked by an open question MUST be `provisional`, and a spec blocked by one MUST NOT be `active` (failing on the blocked requirement or spec record file with `blocked by open question(s) ...`). An answered question MUST name the fact or assumption in `answered_by` (and an open question MUST NOT set `answered_by`); if a blocked requirement does not cite `answered_by` in `because`, the check MUST emit a warning on the question record file (`answered by <ID>, but <REQ-ID> does not cite it in 'because'`).

## Acceptance
- Given an `active` requirement that an open question blocks
- When the graph is checked
- Then the check fails and asks for status `provisional`

- Given a question marked `answered` with no `answered_by`
- When the graph is checked
- Then the check fails
