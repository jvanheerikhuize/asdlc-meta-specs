---
id: SPC-0001
type: spec
title: ASDLC Epistemic Specification Engine & Projection Architecture
domain: asdlc-core
status: provisional
owners:
  - jvanheerikhuize
tags:
  - specification
  - blueprint
  - asdlc-core
created_at: "2026-10-27"
updated_at: "2026-10-27"
composition:
  constraints:
    - CON-0001
    - CON-0002
    - CON-0003
  requirements:
    - REQ-0001
    - REQ-0002
    - REQ-0003
    - REQ-0004
    - REQ-0005
  criteria:
    - ACR-0001
    - ACR-0002
    - ACR-0003
    - ACR-0004
    - ACR-0005
    - ACR-0006
    - ACR-0007
    - ACR-0008
  decisions:
    - DEC-0001
    - DEC-0002
    - DEC-0003
---

## Purpose
Defines the self-hosting canonical specification of `asdlc-meta-specs`: an epistemic specification repository and projection engine for Agentic Software Development Life Cycles (ASDLC) that decomposes specifications into atomic records (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`), enforces upward grounding in verified facts, prevents tech-stack leakage (PIM vs. PSM), provides guided browser-to-PR capture, and compiles deterministically into OpenSpec and GitHub Spec Kit artifacts.

## Scope
- **Included**: Canonical record schemas (`schema/`), graph and epistemic readiness validation (`tools/validate.py`), multi-standard projection compilation (`tools/project.py`), issue-to-PR capture ingestion (`tools/ingest_capture.py`), static index generation (`tools/build_index.py`), and the interactive GitHub Pages workspace (`site/`).
- **Excluded**: Target application code generation, external CI/CD deployment runners, and concrete target-system tech-stack bindings (supplied externally via `--stack-profile`).
