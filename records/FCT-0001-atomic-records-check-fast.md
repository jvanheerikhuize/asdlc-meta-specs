---
id: FCT-0001
title: Small atomic record corpora check in under 150 ms and avoid file-level conflicts on distinct records
status: active
promoted_from: ASM-0001
evidence: "Across the 31-record asdlc-meta-specs corpus and 36-record lumen corpus (17 pull requests), tools/spec.py check --strict was reported to complete in under 150 ms on observed local and CI runs (not a formal multi-runner benchmark), and parallel edits to distinct record files merge without file-level text conflicts (while concurrent sequential ID allocation, shared spec requirement lists, and semantic conflicts still require contributor coordination)."
---

## Statement
In corpora of roughly 30 to 40 atomic Markdown records with front-matter links, structural validation runs in well under a second on observed runs and edits to separate record files do not produce file-level merge conflicts, though shared spec lists, sequential ID assignment, and semantic consistency still require coordination.
