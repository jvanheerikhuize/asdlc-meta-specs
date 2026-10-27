---
id: REQ-0001
title: Every spec element is an atomic, linkable record
status: active
because: [FCT-0001, FCT-0002]
---

## Statement
The system MUST store each assumption, fact, requirement and spec as its own record with a stable ID, and MUST reject links to IDs that do not exist.

## Acceptance
- Given a requirement whose `because` names an ID that does not exist
- When the graph is checked
- Then the check fails and names the broken link
