---
id: REQ-0003
title: Show what a changed fact or assumption affects, in rebuild order
status: active
because: [FCT-0001]
---

## Statement
Given any record, the system MUST list every requirement and spec downstream of it, and MUST order the affected specs so the walking skeleton comes before the features that build on it.

## Acceptance
- Given a fact cited by a skeleton requirement
- When its impact is requested
- Then the skeleton spec is listed before every feature spec that depends on it
