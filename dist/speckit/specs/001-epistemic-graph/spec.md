# Feature Specification: Core Epistemic Record Graph & Validation Engine

<!-- Generated from Canonical Spec SPC-0001 (domain: epistemic-graph, tier: skeleton) -->

## 1. Overview & Purpose

- **Spec ID**: `SPC-0001` | **Domain**: `epistemic-graph` | **Tier**: `skeleton` (Walking Skeleton (Core MVP)) | **Toggleable**: `false`

Defines the root **Walking Skeleton** (`tier: skeleton`) capability of `asdlc-meta-specs`: the canonical 10-type atomic Markdown record store (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`), Draft 2020-12 JSON Schema validation, bidirectional link reciprocity, epistemic status gating, tech-stack agnosticism enforcement, and per-specification Epistemic Readiness scoring.

## 2. Epistemic Foundation (Facts & Assumptions)

### Verified Facts Underpinning This Spec
- **`FCT-0001` — Atomic Markdown records with strict YAML frontmatter validate schema, reciprocity, and epistemic readiness in under 500ms**: Storing each specification element as an isolated Markdown file with strict YAML frontmatter enables deterministic validation of Draft 2020-12 JSON Schemas, bidirectional link reciprocity, epistemic status consistency, and tech-stack agnosticism in under 500ms while eliminating merge conflicts between unrelated requirements.
- **`FCT-0002` — The 10-type canonical record graph compiles deterministically into OpenSpec and GitHub Spec Kit artifacts without semantic loss**: A canonical Platform-Independent Model (PIM) composed of 10 elemental record types (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) compiles deterministically through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into OpenSpec capability/delta specifications and GitHub Spec Kit constitutions, feature specs, and technical plans.
- **`FCT-0003` — Issue-driven capture payloads are untrusted external inputs requiring strict schema confinement and path sanitization**: Any capture submitted through a public or repository Issue Form is untrusted input that could contain shell metacharacters, frontmatter injection strings, or relative path traversal sequences; ingestion must never interpolate issue text into shell scripts, must validate payloads against closed capture schemas (`additionalProperties: false`), and must verify that all output paths resolve inside configured record directories.

### Active Assumptions (Pending Validation)
*All assumptions for this specification have been validated and promoted to facts.*

## 3. Requirements

### REQ-0001: Atomic Graph Schema, Reciprocity, and Epistemic Readiness Validation (`MUST` | Status: `active`)
- **Underpinned By**: `FCT-0001`
- **Governed By**: `CON-0001`, `CON-0002`, `CON-0003`

The validation engine (`tools/validate.py`) MUST verify every canonical record against its Draft 2020-12 JSON Schema, enforce all 4 reciprocal link pairs (`promoted_to`/`promoted_from`, `validated_by`/`tests`, `establishes`/`evidence`, `verified_by`/`verifies`), reject `active` or `accepted` statuses on records resting on unvalidated assumptions or open blocking questions, enforce tech-stack agnosticism in `--strict` mode, and compute per-specification Epistemic Readiness scores.

## 4. Acceptance Scenarios

### ACR-0001: Reject active requirements resting on unvalidated assumptions or open blocking questions (Verifies: `REQ-0001`)
- **GIVEN** a canonical requirement record with `status: active`
- **WHEN** `tools/validate.py` evaluates the graph and finds that the requirement is underpinned by an `unvalidated` assumption or affected by an `open` question with `blocking: true`
- **THEN** the validator MUST emit a non-zero exit code and report an epistemic status error requiring `status: provisional`

### ACR-0003: Reject tech-stack leakage in strict validation mode (Verifies: `REQ-0001`)
- **GIVEN** a canonical specification, normative record, or domain epistemic record containing a forbidden technology-stack term configured in `meta-spec.config.yaml`
- **WHEN** `tools/validate.py --strict` is executed
- **THEN** the validator MUST report the offending tech-stack term(s) and exit with a non-zero status code
