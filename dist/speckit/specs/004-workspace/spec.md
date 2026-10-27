# Feature Specification: Interactive Stratified Record Graph & Browser Workspace

<!-- Generated from Canonical Spec SPC-0004 (domain: workspace, tier: feature) -->

## 1. Overview & Purpose

- **Spec ID**: `SPC-0004` | **Domain**: `workspace` | **Tier**: `feature` (Feature Specification (Flesh)) | **Toggleable**: `true`
- **Depends On**: `SPC-0001` (Core Epistemic Record Graph & Validation Engine), `SPC-0003` (Guided Capture Ingestion & Epistemic Cascade Pipeline)

Defines the toggleable **Feature Specification** (`tier: feature`, `toggleable: true`) for the static browser workspace (`site/` and `tools/build_index.py`), building on the canonical record graph (`SPC-0001`) and guided capture workflow (`SPC-0003`).

## 2. Epistemic Foundation (Facts & Assumptions)

### Verified Facts Underpinning This Spec
- **`FCT-0001` — Atomic Markdown records with strict YAML frontmatter validate schema, reciprocity, and epistemic readiness in under 500ms**: Storing each specification element as an isolated Markdown file with strict YAML frontmatter enables deterministic validation of Draft 2020-12 JSON Schemas, bidirectional link reciprocity, epistemic status consistency, and tech-stack agnosticism in under 500ms while eliminating merge conflicts between unrelated requirements.
- **`FCT-0002` — The 10-type canonical record graph compiles deterministically into OpenSpec and GitHub Spec Kit artifacts without semantic loss**: A canonical Platform-Independent Model (PIM) composed of 10 elemental record types (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) compiles deterministically through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into OpenSpec capability/delta specifications and GitHub Spec Kit constitutions, feature specs, and technical plans.

### Active Assumptions (Pending Validation)
- **`ASM-0004` — A single static JSON index payload sustains sub-100ms browser search and stratified SVG graph layout up to 2,000 records** *(Confidence: 0.75, Risk: low)*: Compiling the canonical record graph into a single static `site/data/index.json` artifact sustains sub-100ms client-side search, filtering, and 5-tier stratified SVG graph layout up to 2,000 records, while browser local storage reliably retains unsent capture drafts across sessions.
  - *Validation Plan*: Generate synthetic specification graphs of 500, 1,000, and 2,000 linked records and benchmark index load time, filter latency, and barycenter SVG layout time in the browser workspace.

### Open Questions (`[NEEDS CLARIFICATION]`)
- **`QST-0002` — At what canonical record volume should the workspace index switch from a single JSON file to domain-partitioned shards?** *(non-blocking, affects: `REQ-0004`, `ACR-0005`, `ACR-0006`)*: How does the ASDLC specification workspace and validation pipeline perform as the canonical record graph scales, and at what threshold should `tools/build_index.py` partition `site/data/index.json` by domain?

## 3. Requirements

### REQ-0004: Interactive Stratified Record Graph and Durable Draft Persistence (`SHALL` | Status: `provisional`)
- **Underpinned By**: `FCT-0001`, `ASM-0004`
- **Governed By**: `CON-0001`, `CON-0002`

WHEN a user navigates the browser workspace (`site/`) or edits a capture form, THE system SHALL render an interactive 5-tier stratified Record Graph (`#/graph` and per-record mini-graphs) with upstream grounding and downstream impact lineage highlighting, and SHALL durably persist unsent capture input data across browser sessions and page revisits.

## 4. Acceptance Scenarios

### ACR-0005: Trace upstream grounding and downstream impact in the stratified Record Graph (Verifies: `REQ-0004`)
- **GIVEN** the compiled record index loaded in `#/graph` or `#/record/:id`
- **WHEN** a user selects or focuses any record node
- **THEN** the workspace SHALL highlight all transitive upstream grounding nodes and downstream dependent nodes across the 5 stratified columns and display their direct and total counts in the inspector

### ACR-0006: Retrieve and display previously entered capture draft data across sessions (Verifies: `REQ-0004`)
- **GIVEN** a user has entered data into a capture form field in the browser workspace
- **WHEN** the user closes and later revisits the capture view
- **THEN** the system SHALL retrieve and display the previously entered draft data and indicate that an unsent draft was restored
