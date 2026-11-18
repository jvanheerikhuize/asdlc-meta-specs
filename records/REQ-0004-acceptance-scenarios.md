---
id: REQ-0004
title: Every active requirement carries a Given/When/Then scenario
status: active
because: [FCT-0005]
---

## Statement
A requirement MUST have at least one Given/When/Then scenario under `## Acceptance` before it can become `active` (failing with `active requirement needs at least one Given/When/Then ...`), and every scenario block in `## Acceptance` MUST consist of steps beginning with `Given `, `When `, `Then `, `And `, or `But ` (case-insensitive) including at least one `Given`, one `When`, and one `Then` step (failing with `malformed acceptance scenario ...`).

## Acceptance
- Given an `active` requirement with no scenario
- When the graph is checked
- Then the check fails

- Given a requirement whose `## Acceptance` section contains freeform placeholder text lacking `Given`/`When`/`Then` steps
- When the graph is checked
- Then the check fails and reports a malformed acceptance scenario
