# Guided Capture Ingestion & Epistemic Cascade Pipeline

<!-- Generated from Canonical Spec SPC-0003 (domain: capture, status: provisional) -->

## Purpose

Defines the toggleable **Feature Specification** (`tier: feature`, `toggleable: true`) for zero-backend capture ingestion (`tools/ingest_capture.py` and `.github/ISSUE_TEMPLATE/capture-*.yml`), building on the core record graph (`SPC-0001`) and projection compiler (`SPC-0002`).

## Epistemic Readiness Summary

- **Spec ID**: `SPC-0003`
- **Architecture Tier**: `feature` (Feature Specification (Flesh) | Toggleable: `true`)
- **Depends On**: `SPC-0001` (Core Epistemic Record Graph & Validation Engine), `SPC-0002` (Multi-Standard Projection Compiler & PSM Binding)
- **Status**: `provisional` (Epistemic Readiness: `0%`)
- **Governing Constraints**: `CON-0001` (Epistemic Grounding and Readiness Gate Invariant), `CON-0003` (Immutable Epistemic Lineage and Untrusted Input Containment)

## Requirements

### Requirement: Guided Capture Ingestion and Epistemic Status Cascading
<!-- Canonical ID: REQ-0002 | Status: provisional | Underpinned by: FCT-0003, ASM-0002 -->
> [!WARNING]
> **Provisional Requirement (`REQ-0002`)**: Underpinned by unvalidated assumption(s): `ASM-0002` (Contributors can capture a complete, schema-valid specification record in under 3 minutes via the guided browser workflow, risk: high).

WHEN a contributor submits a requirement, assumption, fact/validation, decision, or open question capture via a GitHub Issue Form or payload file, THE ingestion engine (`tools/ingest_capture.py`) SHALL validate the payload against its capture schema, allocate collision-free IDs across open capture branches, write the resulting atomic record files, cascade epistemic status transitions (`provisional`, `promoted`, `invalidated`, `broken`, `needs_review`) onto affected records, and open a validated Pull Request.

#### Scenario: Ingest capture payload and cascade epistemic status transitions across dependent records
<!-- Canonical ID: ACR-0002 -->
- **GIVEN** a contributor submits a valid capture issue or payload for a requirement, assumption, fact/validation, decision, or open question
- **WHEN** `tools/ingest_capture.py` processes the input against existing records and reserved open-branch IDs
- **THEN** the tool SHALL allocate the next free ID(s), write schema-valid record file(s) inside `records/`, and transition any affected `active` records to `provisional`, `broken`, or `needs_review` according to the epistemic lifecycle rules
