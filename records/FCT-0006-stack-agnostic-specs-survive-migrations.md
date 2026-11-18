---
id: FCT-0006
title: Technology-stack agnostic specification corpora survive stack migrations without record edits
status: active
promoted_from: ASM-0004
evidence: The lumen media appliance specification corpus (36 records) defines end-to-end streaming, transcoding, state persistence, and network guard capabilities without citing Go, SQLite, React, or Vite, isolating all concrete implementation technologies in TECH_STACK.md.
---

## Statement
When requirements and specs describe behaviour rather than product choices, implementation technologies and frameworks can be swapped or refactored without altering any record in the specification corpus.
