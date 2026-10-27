---
id: ASM-0001
title: One file per spec element avoids merge conflicts and keeps checking instant
status: validated
confidence: 0.8
promoted_to: FCT-0001
---

## Statement
If every requirement, fact and assumption lives in its own small file, people and agents can edit the spec in parallel without conflicts, and the whole graph can be checked in well under a second.

## How we validate it
Run a realistic corpus through a checker and count conflicts across parallel edits.
