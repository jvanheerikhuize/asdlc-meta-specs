---
id: FCT-0006
title: Externalizing incidental technology choices into a separate binding keeps specification corpora stack-neutral
status: active
promoted_from: ASM-0004
evidence: "Both the 31-record asdlc-meta-specs corpus and the 36-record lumen media appliance corpus define end-to-end behavioural requirements with zero technology-stack terms in records/ (passing tools/spec.py check --strict), isolating concrete runtime, storage, and framework choices in TECH_STACK.md bound at render time; full cross-stack re-implementation without record edits remains an empirical follow-up evaluation."
---

## Statement
When requirements and specifications describe observable system behaviour and isolate incidental product, language, or framework choices in an external technical binding document (`TECH_STACK.md`), complete specification corpora can be authored and validated without embedding technology names in `records/`.
