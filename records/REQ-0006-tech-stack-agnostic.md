---
id: REQ-0006
title: Specs describe behaviour, never technology
status: provisional
because: [ASM-0004]
---

## Statement
Records SHOULD NOT name languages, frameworks, databases or vendors. The check MUST warn when they do, and strict mode MUST fail.

## Acceptance
- Given a requirement that names a specific database product
- When the graph is checked in strict mode
- Then the check fails and names the term
