# Core Epistemic Record Graph & Validation Engine

<!-- Generated from Canonical Spec SPC-0001 (domain: epistemic-graph, status: active) -->

## Purpose

Defines the root **Walking Skeleton** (`tier: skeleton`) capability of `asdlc-meta-specs`: the canonical 10-type atomic Markdown record store (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`), Draft 2020-12 JSON Schema validation, bidirectional link reciprocity, epistemic status gating, tech-stack agnosticism enforcement, and per-specification Epistemic Readiness scoring.

## Epistemic Readiness Summary

- **Spec ID**: `SPC-0001`
- **Architecture Tier**: `skeleton` (Walking Skeleton (Core MVP) | Toggleable: `false`)
- **Status**: `active` (Epistemic Readiness: `100%`)
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
