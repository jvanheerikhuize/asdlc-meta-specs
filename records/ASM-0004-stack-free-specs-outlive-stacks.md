---
id: ASM-0004
title: Isolating incidental technology choices in an external binding keeps specification records stack-neutral
status: validated
confidence: 0.75
promoted_to: FCT-0006
---

## Statement
When requirements describe observable system behaviour and isolate incidental product or framework choices in an external binding file bound at render time, a specification corpus can be authored and checked without embedding stack names in records.

## How we validate it
Author both the self-hosting specification corpus and a production appliance corpus with all technology choices isolated in an external stack file, verify zero forbidden stack terms in `records/`, and bound cross-stack migration claims until a second-stack re-implementation diff is recorded.
