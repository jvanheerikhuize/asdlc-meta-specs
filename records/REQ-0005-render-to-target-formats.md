---
id: REQ-0005
title: Specs render to several target formats from the same records
status: provisional
because: [ASM-0003]
---

## Statement
The system MUST render any spec into each supported target format without editing the records, and SHOULD allow rendering only the walking skeleton.

## Acceptance
- Given a skeleton spec and a feature spec
- When rendering is requested for the skeleton tier only
- Then only the skeleton spec is written
