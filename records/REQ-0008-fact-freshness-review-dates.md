---
id: REQ-0008
title: Facts support optional review dates and warn when stale
status: active
because: [FCT-0008]
---

## Statement
A fact record MAY declare an optional `review_after` date formatted as `YYYY-MM-DD`. When checking the graph, the system MUST reject any malformed `review_after` value as an error (`invalid review_after date format ...`) and MUST emit a warning (`fact is past review date YYYY-MM-DD and may be stale`) when the current date is strictly greater than `review_after`.

## Acceptance
- Given a fact whose `review_after` date is in the past
- When the graph is checked
- Then the check emits a staleness warning containing `past review date`

- Given a fact whose `review_after` value is not a valid `YYYY-MM-DD` date
- When the graph is checked
- Then the check fails with an `invalid review_after date` error
