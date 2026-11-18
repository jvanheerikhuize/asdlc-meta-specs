---
id: REQ-0006
title: Specs describe behaviour, never technology
status: active
because: [FCT-0006]
---

## Statement
Records SHOULD NOT name languages, frameworks, databases or vendors in their `title` or `body`. The check MUST scan each record's `title` and `body` case-insensitively, emit a warning naming the sorted lowercase matched terms (`tech-stack term(s) [...]`) when any are found, and fail in strict mode.

## Acceptance
- Given a requirement that names a specific database product
- When the graph is checked in strict mode
- Then the check fails and names the lowercase term
