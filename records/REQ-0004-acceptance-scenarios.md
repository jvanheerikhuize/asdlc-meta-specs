---
id: REQ-0004
title: Every active requirement carries a Given/When/Then scenario
status: active
because: [FCT-0005]
---

## Statement
A requirement MUST have at least one Given/When/Then scenario before it can become `active` (failing with `active requirement needs at least one Given/When/Then ...`).

## Acceptance
- Given an `active` requirement with no scenario
- When the graph is checked
- Then the check fails
