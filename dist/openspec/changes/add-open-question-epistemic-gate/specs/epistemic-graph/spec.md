# Delta Specification: Add First-Class Open Question (QST) Capture and Blocking Readiness Gate

<!-- Generated from Canonical Change CHG-0001 targeting SPC-0001 -->

## MODIFIED Requirements

### Requirement: Atomic Graph Schema, Reciprocity, and Epistemic Readiness Validation
<!-- Canonical ID: REQ-0001 | Underpinned by: FCT-0001 -->
The validation engine (`tools/validate.py`) MUST verify every canonical record against its Draft 2020-12 JSON Schema, enforce all 4 reciprocal link pairs (`promoted_to`/`promoted_from`, `validated_by`/`tests`, `establishes`/`evidence`, `verified_by`/`verifies`), reject `active` or `accepted` statuses on records resting on unvalidated assumptions or open blocking questions, enforce tech-stack agnosticism in `--strict` mode, and compute per-specification Epistemic Readiness scores.

#### Scenario: Reject active requirements resting on unvalidated assumptions or open blocking questions
- **GIVEN** a canonical requirement record with `status: active`
- **WHEN** `tools/validate.py` evaluates the graph and finds that the requirement is underpinned by an `unvalidated` assumption or affected by an `open` question with `blocking: true`
- **THEN** the validator MUST emit a non-zero exit code and report an epistemic status error requiring `status: provisional`
#### Scenario: Reject tech-stack leakage in strict validation mode
- **GIVEN** a canonical specification, normative record, or domain epistemic record containing a forbidden technology-stack term configured in `meta-spec.config.yaml`
- **WHEN** `tools/validate.py --strict` is executed
- **THEN** the validator MUST report the offending tech-stack term(s) and exit with a non-zero status code
### Requirement: Guided Capture Ingestion and Epistemic Status Cascading
<!-- Canonical ID: REQ-0002 | Underpinned by: FCT-0003, ASM-0002 -->
WHEN a contributor submits a requirement, assumption, fact/validation, decision, or open question capture via a GitHub Issue Form or payload file, THE ingestion engine (`tools/ingest_capture.py`) SHALL validate the payload against its capture schema, allocate collision-free IDs across open capture branches, write the resulting atomic record files, cascade epistemic status transitions (`provisional`, `promoted`, `invalidated`, `broken`, `needs_review`) onto affected records, and open a validated Pull Request.

#### Scenario: Ingest capture payload and cascade epistemic status transitions across dependent records
- **GIVEN** a contributor submits a valid capture issue or payload for a requirement, assumption, fact/validation, decision, or open question
- **WHEN** `tools/ingest_capture.py` processes the input against existing records and reserved open-branch IDs
- **THEN** the tool SHALL allocate the next free ID(s), write schema-valid record file(s) inside `records/`, and transition any affected `active` records to `provisional`, `broken`, or `needs_review` according to the epistemic lifecycle rules
