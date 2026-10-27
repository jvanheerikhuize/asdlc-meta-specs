---
id: REQ-0002
title: A requirement is never more certain than what it rests on
status: active
because: [FCT-0001]
---

## Statement
Every requirement MUST cite the facts and/or assumptions it rests on. A requirement resting on an open assumption MUST be `provisional`; one resting on a refuted assumption or deprecated fact MUST be `broken`.

## Acceptance
- Given an `active` requirement that cites an open assumption
- When the graph is checked
- Then the check fails and asks for status `provisional`

- Given a requirement that cites an invalidated assumption
- When the graph is checked
- Then the check fails unless the requirement is `broken`
