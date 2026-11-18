---
id: REQ-0007
title: A known gap is recorded as an open question, never filled with a guess
status: active
because: [FCT-0003]
---

## Statement
When nobody can yet propose an answer, the gap MUST be recorded as an open question that names the requirements or specs it `blocks`. A requirement blocked by an open question MUST be `provisional`, and a spec blocked by one MUST NOT be `active`. Rendered specs MUST list open questions under `## Open questions (do not guess, ask)` (for specs) or `#### Open questions (do not guess, ask)` (for requirements) as `- <QST-ID>: <title>`, so an implementing agent asks instead of guessing. An answered question MUST name the fact or assumption in `answered_by` (and an open question MUST NOT set `answered_by`); if a blocked requirement does not cite `answered_by` in `because`, the check MUST warn (`answered by <ID>, but <REQ-ID> does not cite it in 'because'`).

## Acceptance
- Given an `active` requirement that an open question blocks
- When the graph is checked
- Then the check fails and asks for status `provisional`

- Given an open question that blocks a requirement
- When the spec containing that requirement is rendered
- Then the question appears under the requirement

- Given a question marked `answered` with no `answered_by`
- When the graph is checked
- Then the check fails
