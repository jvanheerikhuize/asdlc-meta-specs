---
id: FCT-0001
title: An atomic record graph checks in under 150 ms with no merge conflicts
status: active
promoted_from: ASM-0001
evidence: The predecessor repository (asdlc-meta-specs) ran a 35-record graph through its checker in under 150 ms across many parallel pull requests, none of which conflicted.
---

## Statement
Atomic Markdown records with front-matter links validate in well under a second and do not cause merge conflicts between unrelated changes.
