---
id: ASM-0004
title: Specs that never name a technology survive a change of technology
status: open
confidence: 0.75
---

## Statement
When requirements describe behaviour instead of products, swapping a storage engine or framework changes the implementation but not a single record.

## How we validate it
Re-implement one skeleton spec on a second, unrelated stack and diff the records.
