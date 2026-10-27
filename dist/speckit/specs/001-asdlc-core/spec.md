# Feature Specification: ASDLC Epistemic Specification Engine & Projection Architecture

<!-- Generated from Canonical Spec SPC-0001 (domain: asdlc-core) -->

## 1. Overview & Purpose

Defines the self-hosting canonical specification of `asdlc-meta-specs`: an epistemic specification repository and projection engine for Agentic Software Development Life Cycles (ASDLC) that decomposes specifications into atomic records (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`), enforces upward grounding in verified facts, prevents tech-stack leakage (PIM vs. PSM), provides guided browser-to-PR capture, and compiles deterministically into OpenSpec and GitHub Spec Kit artifacts.

## 2. Epistemic Foundation (Facts & Assumptions)

### Verified Facts Underpinning This Spec
- **`FCT-0001` — Atomic Markdown records with strict YAML frontmatter validate schema, reciprocity, and epistemic readiness in under 500ms**: Storing each specification element as an isolated Markdown file with strict YAML frontmatter enables deterministic validation of Draft 2020-12 JSON Schemas, bidirectional link reciprocity, epistemic status consistency, and tech-stack agnosticism in under 500ms while eliminating merge conflicts between unrelated requirements.
- **`FCT-0002` — The 10-type canonical record graph compiles deterministically into OpenSpec and GitHub Spec Kit artifacts without semantic loss**: A canonical Platform-Independent Model (PIM) composed of 10 elemental record types (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) compiles deterministically through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into OpenSpec capability/delta specifications and GitHub Spec Kit constitutions, feature specs, and technical plans.
- **`FCT-0003` — Issue-driven capture payloads are untrusted external inputs requiring strict schema confinement and path sanitization**: Any capture submitted through a public or repository Issue Form is untrusted input that could contain shell metacharacters, frontmatter injection strings, or relative path traversal sequences; ingestion must never interpolate issue text into shell scripts, must validate payloads against closed capture schemas (`additionalProperties: false`), and must verify that all output paths resolve inside configured record directories.

### Active Assumptions (Pending Validation)
- **`ASM-0002` — Contributors can capture a complete, schema-valid specification record in under 3 minutes via the guided browser workflow** *(Confidence: 0.7, Risk: high)*: Both technical and non-technical contributors can capture a complete, schema-valid requirement, assumption, fact, decision, or open question in under 3 minutes using the guided browser capture form and pre-filled Issue Form contract without writing raw YAML.
  - *Validation Plan*: Conduct timed usability sessions with 5 contributors capturing a requirement, assumption, fact, decision, and open question through the browser workspace and GitHub Issue Form flow.
- **`ASM-0003` — Engineering teams can adopt the ASDLC meta-spec blueprint within 10 minutes for greenfield and 30 minutes for brownfield repositories** *(Confidence: 0.65, Risk: medium)*: Engineering teams can adopt and initialize the ASDLC meta-spec blueprint in a greenfield repository within 10 minutes and in an existing brownfield repository within 30 minutes, with a full feature specification lifecycle completing in under 3 hours.
  - *Validation Plan*: Time end-to-end onboarding across 3 greenfield repositories and 3 existing brownfield repositories from template clone to first validated specification projection.
- **`ASM-0004` — A single static JSON index payload sustains sub-100ms browser search and stratified SVG graph layout up to 2,000 records** *(Confidence: 0.75, Risk: low)*: Compiling the canonical record graph into a single static `site/data/index.json` artifact sustains sub-100ms client-side search, filtering, and 5-tier stratified SVG graph layout up to 2,000 records, while browser local storage reliably retains unsent capture drafts across sessions.
  - *Validation Plan*: Generate synthetic specification graphs of 500, 1,000, and 2,000 linked records and benchmark index load time, filter latency, and barycenter SVG layout time in the browser workspace.

### Open Questions (`[NEEDS CLARIFICATION]`)
- **`QST-0001` — Should promoting an assumption automatically rewrite underpinned_by links on dependent requirements or require human review?** *(blocking, affects: `REQ-0002`, `SPC-0001`)*: When an open assumption (`ASM-xxxx`) is validated and promoted to a verified fact (`FCT-yyyy`) via `#/capture/fact`, should `tools/ingest_capture.py` automatically replace `ASM-xxxx` with `FCT-yyyy` in the `underpinned_by` list of dependent requirements, or keep `ASM-xxxx` so `tools/validate.py --strict` forces a human reviewer to inspect and sharpen the requirement wording against the new fact?
- **`QST-0002` — At what canonical record volume should the workspace index switch from a single JSON file to domain-partitioned shards?** *(non-blocking, affects: `REQ-0004`, `ACR-0005`, `ACR-0006`)*: How does the ASDLC specification workspace and validation pipeline perform as the canonical record graph scales, and at what threshold should `tools/build_index.py` partition `site/data/index.json` by domain?

## 3. Requirements

### REQ-0001: Atomic Graph Schema, Reciprocity, and Epistemic Readiness Validation (`MUST` | Status: `active`)
- **Underpinned By**: `FCT-0001`
- **Governed By**: `CON-0001`, `CON-0002`, `CON-0003`

The validation engine (`tools/validate.py`) MUST verify every canonical record against its Draft 2020-12 JSON Schema, enforce all 4 reciprocal link pairs (`promoted_to`/`promoted_from`, `validated_by`/`tests`, `establishes`/`evidence`, `verified_by`/`verifies`), reject `active` or `accepted` statuses on records resting on unvalidated assumptions or open blocking questions, enforce tech-stack agnosticism in `--strict` mode, and compute per-specification Epistemic Readiness scores.

### REQ-0002: Guided Capture Ingestion and Epistemic Status Cascading (`SHALL` | Status: `provisional`)
- **Underpinned By**: `FCT-0003`, `ASM-0002`
- **Governed By**: `CON-0001`, `CON-0003`

WHEN a contributor submits a requirement, assumption, fact/validation, decision, or open question capture via a GitHub Issue Form or payload file, THE ingestion engine (`tools/ingest_capture.py`) SHALL validate the payload against its capture schema, allocate collision-free IDs across open capture branches, write the resulting atomic record files, cascade epistemic status transitions (`provisional`, `promoted`, `invalidated`, `broken`, `needs_review`) onto affected records, and open a validated Pull Request.

### REQ-0003: Multi-Standard Projection Compilation and Drift Detection (`SHALL` | Status: `active`)
- **Underpinned By**: `FCT-0002`
- **Governed By**: `CON-0002`

WHEN the projection compiler (`tools/project.py`) is executed, THE system SHALL compile canonical records through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into target standard artifacts (`dist/openspec/` and `dist/speckit/`), support binding an optional external Tech-Stack Profile (`--stack-profile`), and fail with a non-zero exit status under `--check` whenever any projected artifact is missing or out of sync.

### REQ-0004: Interactive Stratified Record Graph and Durable Draft Persistence (`SHALL` | Status: `provisional`)
- **Underpinned By**: `FCT-0001`, `ASM-0004`
- **Governed By**: `CON-0001`, `CON-0002`

WHEN a user navigates the browser workspace (`site/`) or edits a capture form, THE system SHALL render an interactive 5-tier stratified Record Graph (`#/graph` and per-record mini-graphs) with upstream grounding and downstream impact lineage highlighting, and SHALL durably persist unsent capture input data across browser sessions and page revisits.

### REQ-0005: Install and Initialize the Blueprint Framework in New or Existing Repositories (`SHOULD` | Status: `provisional`)
- **Underpinned By**: `ASM-0003`
- **Governed By**: `CON-0002`

An engineering team SHOULD be able to install and initialize the ASDLC meta-spec framework in a new (greenfield) or existing (brownfield) repository using only standard Python tooling and GitHub Actions without requiring external database or server infrastructure.

## 4. Acceptance Scenarios

### ACR-0001: Reject active requirements resting on unvalidated assumptions or open blocking questions (Verifies: `REQ-0001`)
- **GIVEN** a canonical requirement record with `status: active`
- **WHEN** `tools/validate.py` evaluates the graph and finds that the requirement is underpinned by an `unvalidated` assumption or affected by an `open` question with `blocking: true`
- **THEN** the validator MUST emit a non-zero exit code and report an epistemic status error requiring `status: provisional`

### ACR-0002: Ingest capture payload and cascade epistemic status transitions across dependent records (Verifies: `REQ-0002`)
- **GIVEN** a contributor submits a valid capture issue or payload for a requirement, assumption, fact/validation, decision, or open question
- **WHEN** `tools/ingest_capture.py` processes the input against existing records and reserved open-branch IDs
- **THEN** the tool SHALL allocate the next free ID(s), write schema-valid record file(s) inside `records/`, and transition any affected `active` records to `provisional`, `broken`, or `needs_review` according to the epistemic lifecycle rules

### ACR-0003: Reject tech-stack leakage in strict validation mode (Verifies: `REQ-0001`)
- **GIVEN** a canonical specification, normative record, or domain epistemic record containing a forbidden technology-stack term configured in `meta-spec.config.yaml`
- **WHEN** `tools/validate.py --strict` is executed
- **THEN** the validator MUST report the offending tech-stack term(s) and exit with a non-zero status code

### ACR-0004: Compile multi-standard projections and fail on out-of-sync dist artifacts (Verifies: `REQ-0003`)
- **GIVEN** the canonical record graph and the adapter mappings in `adapters/openspec/` and `adapters/speckit/`
- **WHEN** `tools/project.py` is run followed by `tools/project.py --check`
- **THEN** all target artifacts under `dist/openspec/` and `dist/speckit/` SHALL be generated deterministically and `--check` SHALL exit with status `0` (and exit `1` if any projected file is modified out of band)

### ACR-0005: Trace upstream grounding and downstream impact in the stratified Record Graph (Verifies: `REQ-0004`)
- **GIVEN** the compiled record index loaded in `#/graph` or `#/record/:id`
- **WHEN** a user selects or focuses any record node
- **THEN** the workspace SHALL highlight all transitive upstream grounding nodes and downstream dependent nodes across the 5 stratified columns and display their direct and total counts in the inspector

### ACR-0006: Retrieve and display previously entered capture draft data across sessions (Verifies: `REQ-0004`)
- **GIVEN** a user has entered data into a capture form field in the browser workspace
- **WHEN** the user closes and later revisits the capture view
- **THEN** the system SHALL retrieve and display the previously entered draft data and indicate that an unsent draft was restored

### ACR-0007: Complete greenfield repository onboarding within 10 minutes (Verifies: `REQ-0005`)
- **GIVEN** a greenfield repository
- **WHEN** an engineer initializes the ASDLC meta-spec framework and runs the validation and projection pipeline
- **THEN** the onboarding stage SHOULD be finished within 10 minutes

### ACR-0008: Complete brownfield repository onboarding within 30 minutes (Verifies: `REQ-0005`)
- **GIVEN** an existing brownfield repository
- **WHEN** an engineer integrates the ASDLC meta-spec framework and captures the initial domain records
- **THEN** the onboarding stage SHOULD be finished within 30 minutes
