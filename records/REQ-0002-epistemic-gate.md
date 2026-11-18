---
id: REQ-0002
title: A requirement is never more certain than what it rests on
status: active
because: [FCT-0001]
---

## Statement
Every requirement MUST cite one or more facts (`FCT`) and/or assumptions (`ASM`) in `because`, and every fact MUST declare non-empty `evidence`. A requirement resting on an `open` assumption MUST be `provisional` (never `active`); one resting on an `invalidated` assumption or `deprecated` fact MUST be `broken`. When an assumption is `validated`, it MUST declare `promoted_to` pointing to a fact that reciprocally declares `promoted_from` pointing back to that `validated` assumption, and any requirement that still cites a `validated` assumption MUST emit a warning (`cites <ASM-ID>, which was promoted -> cite <FCT-ID> instead`).

## Acceptance
- Given an `active` requirement that cites an open assumption
- When the graph is checked
- Then the check fails and asks for status `provisional`

- Given a requirement that cites an invalidated assumption
- When the graph is checked
- Then the check fails unless the requirement is `broken`
