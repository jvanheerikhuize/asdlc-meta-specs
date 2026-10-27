---
id: VAL-0001
type: validation
title: Empirical verification of the atomic graph validator, capture ingestion engine, and multi-standard projection compiler
domain: epistemic-graph
status: completed
method: prototype_spike
outcome: confirmed
tests:
  - ASM-0001
establishes:
  - FCT-0001
  - FCT-0002
artifacts:
  - tests/test_ingest.py
owners:
  - jvanheerikhuize
tags:
  - validation
  - epistemic-graph
  - projection
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Objective
Evaluate `ASM-0001` by building and executing the canonical validation engine (`tools/validate.py`), the untrusted capture ingestion pipeline (`tools/ingest_capture.py`), the static index compiler (`tools/build_index.py`), and the multi-standard projection compiler (`tools/project.py`) across automated test suites.

## Findings
1. **Deterministic Graph Validation (`FCT-0001`)**: Full validation across all 10 Draft 2020-12 JSON Schemas, 4 reciprocal link invariants (`promoted_to`/`promoted_from`, `validated_by`/`tests`, `establishes`/`evidence`, `verified_by`/`verifies`), epistemic status gates, and strict tech-stack agnosticism checks completes in **<150ms**.
2. **Lossless Multi-Standard Compilation (`FCT-0002`)**: `tools/project.py` deterministically compiles capability manifests (`SPC`), change proposals (`CHG`), constraints (`CON`), requirements (`REQ`), criteria (`ACR`), decisions (`DEC`), facts (`FCT`), assumptions (`ASM`), and open questions (`QST`) into both OpenSpec (`dist/openspec/`) and GitHub Spec Kit (`dist/speckit/`) artifacts with zero drift under `--check`.
3. **Automated Ingestion & Epistemic Cascading**: All 23 automated unit tests in `tests/test_ingest.py` pass in ~7 seconds, confirming collision-free ID allocation, hostile input containment, and automatic status cascading on assumption promotion, refutation, and blocking open questions.
