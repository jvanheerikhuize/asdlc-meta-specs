# Interactive Stratified Record Graph & Browser Workspace

<!-- Generated from Canonical Spec SPC-0004 (domain: workspace, status: provisional) -->

## Purpose

Defines the toggleable **Feature Specification** (`tier: feature`, `toggleable: true`) for the static browser workspace (`site/` and `tools/build_index.py`), building on the canonical record graph (`SPC-0001`) and guided capture workflow (`SPC-0003`).

## Epistemic Readiness Summary

- **Spec ID**: `SPC-0004`
- **Architecture Tier**: `feature` (Feature Specification (Flesh) | Toggleable: `true`)
- **Depends On**: `SPC-0001` (Core Epistemic Record Graph & Validation Engine), `SPC-0003` (Guided Capture Ingestion & Epistemic Cascade Pipeline)
- **Status**: `provisional` (Epistemic Readiness: `0%`)
- **Governing Constraints**: `CON-0001` (Epistemic Grounding and Readiness Gate Invariant), `CON-0002` (Platform-Independent Tech-Stack Agnosticism (PIM vs. PSM Separation))

## Requirements

### Requirement: Interactive Stratified Record Graph and Durable Draft Persistence
<!-- Canonical ID: REQ-0004 | Status: provisional | Underpinned by: FCT-0001, ASM-0004 -->
> [!WARNING]
> **Provisional Requirement (`REQ-0004`)**: Underpinned by unvalidated assumption(s): `ASM-0004` (A single static JSON index payload sustains sub-100ms browser search and stratified SVG graph layout up to 2,000 records, risk: low).

WHEN a user navigates the browser workspace (`site/`) or edits a capture form, THE system SHALL render an interactive 5-tier stratified Record Graph (`#/graph` and per-record mini-graphs) with upstream grounding and downstream impact lineage highlighting, and SHALL durably persist unsent capture input data across browser sessions and page revisits.

#### Scenario: Trace upstream grounding and downstream impact in the stratified Record Graph
<!-- Canonical ID: ACR-0005 -->
- **GIVEN** the compiled record index loaded in `#/graph` or `#/record/:id`
- **WHEN** a user selects or focuses any record node
- **THEN** the workspace SHALL highlight all transitive upstream grounding nodes and downstream dependent nodes across the 5 stratified columns and display their direct and total counts in the inspector

#### Scenario: Retrieve and display previously entered capture draft data across sessions
<!-- Canonical ID: ACR-0006 -->
- **GIVEN** a user has entered data into a capture form field in the browser workspace
- **WHEN** the user closes and later revisits the capture view
- **THEN** the system SHALL retrieve and display the previously entered draft data and indicate that an unsent draft was restored
