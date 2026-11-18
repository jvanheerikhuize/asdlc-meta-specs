---
id: REQ-0003
title: Enforce acyclic skeleton-first spec dependencies and show downstream impact in rebuild order
status: active
because: [FCT-0001]
---

## Statement
Every spec MUST declare a `tier` of `skeleton` or `feature` and list only `REQ` records in `requirements`. A `skeleton` spec MUST NOT depend on a `feature` spec (failing with `skeleton spec cannot depend on feature <ID>`), spec `depends_on` graphs MUST be acyclic (failing with `spec dependency cycle: ...`), and a spec MUST NOT be `active` unless its readiness (`round(100 * active_requirements / total_requirements)`) is 100% and no open question blocks it. Given any record ID, impact analysis MUST traverse downstream edges (including `ASM` to `promoted_to` fact, `QST` to `blocks`, `FCT`/`ASM` to `REQ`, and `REQ`/`SPC` to `SPC`) and return the sorted affected non-spec record IDs plus the affected spec records in topological rebuild order (`skeleton` before `feature`).

## Acceptance
- Given a fact cited by a skeleton requirement
- When its impact is requested
- Then the skeleton spec is listed before every feature spec that depends on it
