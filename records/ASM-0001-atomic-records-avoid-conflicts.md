---
id: ASM-0001
title: One file per spec element reduces file-level merge conflicts and checks quickly in small corpora
status: validated
confidence: 0.8
promoted_to: FCT-0001
---

## Statement
If every requirement, fact, question, and assumption lives in its own small file, contributors and agents editing distinct records in parallel avoid file-level merge conflicts on those records, and a small corpus (roughly 30 to 50 records) can be checked in well under a second.

## How we validate it
Run a 30-to-40 record corpus through the checker and observe execution time and file-level conflicts across parallel pull requests touching distinct records, while noting where shared spec lists or sequential ID allocation still require coordination.
