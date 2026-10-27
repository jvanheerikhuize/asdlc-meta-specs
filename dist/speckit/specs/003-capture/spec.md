# Feature Specification: Guided Capture Ingestion & Epistemic Cascade Pipeline

<!-- Generated from Canonical Spec SPC-0003 (domain: capture, tier: feature) -->

## 1. Overview & Purpose

- **Spec ID**: `SPC-0003` | **Domain**: `capture` | **Tier**: `feature` (Feature Specification (Flesh)) | **Toggleable**: `true`
- **Depends On**: `SPC-0001` (Core Epistemic Record Graph & Validation Engine), `SPC-0002` (Multi-Standard Projection Compiler & PSM Binding)

Defines the toggleable **Feature Specification** (`tier: feature`, `toggleable: true`) for zero-backend capture ingestion (`tools/ingest_capture.py` and `.github/ISSUE_TEMPLATE/capture-*.yml`), building on the core record graph (`SPC-0001`) and projection compiler (`SPC-0002`).

## 2. Epistemic Foundation (Facts & Assumptions)

### Verified Facts Underpinning This Spec
- **`FCT-0001` — Atomic Markdown records with strict YAML frontmatter validate schema, reciprocity, and epistemic readiness in under 500ms**: Storing each specification element as an isolated Markdown file with strict YAML frontmatter enables deterministic validation of Draft 2020-12 JSON Schemas, bidirectional link reciprocity, epistemic status consistency, and tech-stack agnosticism in under 500ms while eliminating merge conflicts between unrelated requirements.
- **`FCT-0003` — Issue-driven capture payloads are untrusted external inputs requiring strict schema confinement and path sanitization**: Any capture submitted through a public or repository Issue Form is untrusted input that could contain shell metacharacters, frontmatter injection strings, or relative path traversal sequences; ingestion must never interpolate issue text into shell scripts, must validate payloads against closed capture schemas (`additionalProperties: false`), and must verify that all output paths resolve inside configured record directories.

### Active Assumptions (Pending Validation)
- **`ASM-0002` — Contributors can capture a complete, schema-valid specification record in under 3 minutes via the guided browser workflow** *(Confidence: 0.7, Risk: high)*: Both technical and non-technical contributors can capture a complete, schema-valid requirement, assumption, fact, decision, or open question in under 3 minutes using the guided browser capture form and pre-filled Issue Form contract without writing raw YAML.
  - *Validation Plan*: Conduct timed usability sessions with 5 contributors capturing a requirement, assumption, fact, decision, and open question through the browser workspace and GitHub Issue Form flow.

### Open Questions (`[NEEDS CLARIFICATION]`)
- **`QST-0001` — Should promoting an assumption automatically rewrite underpinned_by links on dependent requirements or require human review?** *(blocking, affects: `REQ-0002`, `SPC-0003`)*: When an open assumption (`ASM-xxxx`) is validated and promoted to a verified fact (`FCT-yyyy`) via `#/capture/fact`, should `tools/ingest_capture.py` automatically replace `ASM-xxxx` with `FCT-yyyy` in the `underpinned_by` list of dependent requirements, or keep `ASM-xxxx` so `tools/validate.py --strict` forces a human reviewer to inspect and sharpen the requirement wording against the new fact?

## 3. Requirements

### REQ-0002: Guided Capture Ingestion and Epistemic Status Cascading (`SHALL` | Status: `provisional`)
- **Underpinned By**: `FCT-0003`, `ASM-0002`
- **Governed By**: `CON-0001`, `CON-0003`

WHEN a contributor submits a requirement, assumption, fact/validation, decision, or open question capture via a GitHub Issue Form or payload file, THE ingestion engine (`tools/ingest_capture.py`) SHALL validate the payload against its capture schema, allocate collision-free IDs across open capture branches, write the resulting atomic record files, cascade epistemic status transitions (`provisional`, `promoted`, `invalidated`, `broken`, `needs_review`) onto affected records, and open a validated Pull Request.

## 4. Acceptance Scenarios

### ACR-0002: Ingest capture payload and cascade epistemic status transitions across dependent records (Verifies: `REQ-0002`)
- **GIVEN** a contributor submits a valid capture issue or payload for a requirement, assumption, fact/validation, decision, or open question
- **WHEN** `tools/ingest_capture.py` processes the input against existing records and reserved open-branch IDs
- **THEN** the tool SHALL allocate the next free ID(s), write schema-valid record file(s) inside `records/`, and transition any affected `active` records to `provisional`, `broken`, or `needs_review` according to the epistemic lifecycle rules
