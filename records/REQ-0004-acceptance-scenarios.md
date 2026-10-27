---
id: REQ-0004
title: Every active requirement carries a Given/When/Then scenario
status: provisional
because: [ASM-0002]
---

## Statement
A requirement MUST have at least one Given/When/Then scenario before it can become `active`.

## Acceptance
- Given an `active` requirement with no scenario
- When the graph is checked
- Then the check fails
