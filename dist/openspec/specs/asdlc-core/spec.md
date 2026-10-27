# ASDLC Epistemic Specification Engine & Projection Architecture

<!-- Generated from Canonical Spec SPC-0001 (domain: asdlc-core, status: provisional) -->

## Purpose

Defines the self-hosting canonical specification of `asdlc-meta-specs`: an epistemic specification repository and projection engine for Agentic Software Development Life Cycles (ASDLC) that decomposes specifications into atomic records (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`), enforces upward grounding in verified facts, prevents tech-stack leakage (PIM vs. PSM), provides guided browser-to-PR capture, and compiles deterministically into OpenSpec and GitHub Spec Kit artifacts.

## Epistemic Readiness Summary

- **Spec ID**: `SPC-0001`
- **Status**: `provisional` (Epistemic Readiness: `40%`)
- **Governing Constraints**: `CON-0001` (Epistemic Grounding and Readiness Gate Invariant), `CON-0002` (Platform-Independent Tech-Stack Agnosticism (PIM vs. PSM Separation)), `CON-0003` (Immutable Epistemic Lineage and Untrusted Input Containment)

## Requirements

### Requirement: Atomic Graph Schema, Reciprocity, and Epistemic Readiness Validation
<!-- Canonical ID: REQ-0001 | Status: active | Underpinned by: FCT-0001 -->

The validation engine (`tools/validate.py`) MUST verify every canonical record against its Draft 2020-12 JSON Schema, enforce all 4 reciprocal link pairs (`promoted_to`/`promoted_from`, `validated_by`/`tests`, `establishes`/`evidence`, `verified_by`/`verifies`), reject `active` or `accepted` statuses on records resting on unvalidated assumptions or open blocking questions, enforce tech-stack agnosticism in `--strict` mode, and compute per-specification Epistemic Readiness scores.

#### Scenario: Reject active requirements resting on unvalidated assumptions or open blocking questions
<!-- Canonical ID: ACR-0001 -->
- **GIVEN** a canonical requirement record with `status: active`
- **WHEN** `tools/validate.py` evaluates the graph and finds that the requirement is underpinned by an `unvalidated` assumption or affected by an `open` question with `blocking: true`
- **THEN** the validator MUST emit a non-zero exit code and report an epistemic status error requiring `status: provisional`

#### Scenario: Reject tech-stack leakage in strict validation mode
<!-- Canonical ID: ACR-0003 -->
- **GIVEN** a canonical specification, normative record, or domain epistemic record containing a forbidden technology-stack term configured in `meta-spec.config.yaml`
- **WHEN** `tools/validate.py --strict` is executed
- **THEN** the validator MUST report the offending tech-stack term(s) and exit with a non-zero status code

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

### Requirement: Multi-Standard Projection Compilation and Drift Detection
<!-- Canonical ID: REQ-0003 | Status: active | Underpinned by: FCT-0002 -->

WHEN the projection compiler (`tools/project.py`) is executed, THE system SHALL compile canonical records through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into target standard artifacts (`dist/openspec/` and `dist/speckit/`), support binding an optional external Tech-Stack Profile (`--stack-profile`), and fail with a non-zero exit status under `--check` whenever any projected artifact is missing or out of sync.

#### Scenario: Compile multi-standard projections and fail on out-of-sync dist artifacts
<!-- Canonical ID: ACR-0004 -->
- **GIVEN** the canonical record graph and the adapter mappings in `adapters/openspec/` and `adapters/speckit/`
- **WHEN** `tools/project.py` is run followed by `tools/project.py --check`
- **THEN** all target artifacts under `dist/openspec/` and `dist/speckit/` SHALL be generated deterministically and `--check` SHALL exit with status `0` (and exit `1` if any projected file is modified out of band)

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

### Requirement: Install and Initialize the Blueprint Framework in New or Existing Repositories
<!-- Canonical ID: REQ-0005 | Status: provisional | Underpinned by: ASM-0003 -->
> [!WARNING]
> **Provisional Requirement (`REQ-0005`)**: Underpinned by unvalidated assumption(s): `ASM-0003` (Engineering teams can adopt the ASDLC meta-spec blueprint within 10 minutes for greenfield and 30 minutes for brownfield repositories, risk: medium).

An engineering team SHOULD be able to install and initialize the ASDLC meta-spec framework in a new (greenfield) or existing (brownfield) repository using only standard Python tooling and GitHub Actions without requiring external database or server infrastructure.

#### Scenario: Complete greenfield repository onboarding within 10 minutes
<!-- Canonical ID: ACR-0007 -->
- **GIVEN** a greenfield repository
- **WHEN** an engineer initializes the ASDLC meta-spec framework and runs the validation and projection pipeline
- **THEN** the onboarding stage SHOULD be finished within 10 minutes

#### Scenario: Complete brownfield repository onboarding within 30 minutes
<!-- Canonical ID: ACR-0008 -->
- **GIVEN** an existing brownfield repository
- **WHEN** an engineer integrates the ASDLC meta-spec framework and captures the initial domain records
- **THEN** the onboarding stage SHOULD be finished within 30 minutes
