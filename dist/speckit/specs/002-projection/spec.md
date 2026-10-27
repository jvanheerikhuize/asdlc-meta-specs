# Feature Specification: Multi-Standard Projection Compiler & PSM Binding

<!-- Generated from Canonical Spec SPC-0002 (domain: projection, tier: skeleton) -->

## 1. Overview & Purpose

- **Spec ID**: `SPC-0002` | **Domain**: `projection` | **Tier**: `skeleton` (Walking Skeleton (Core MVP)) | **Toggleable**: `false`
- **Depends On**: `SPC-0001` (Core Epistemic Record Graph & Validation Engine)

Defines the second **Walking Skeleton** (`tier: skeleton`) capability of `asdlc-meta-specs`: the declarative projection compiler (`tools/project.py`) that compiles the canonical tech-stack-agnostic record graph (`SPC-0001`) into OpenSpec (`dist/openspec/`) and GitHub Spec Kit (`dist/speckit/`) artifacts, supports selective skeleton/feature projection and fact-change impact rebuild planning, and binds optional external Tech-Stack Profiles (PSM).

## 2. Epistemic Foundation (Facts & Assumptions)

### Verified Facts Underpinning This Spec
- **`FCT-0002` — The 10-type canonical record graph compiles deterministically into OpenSpec and GitHub Spec Kit artifacts without semantic loss**: A canonical Platform-Independent Model (PIM) composed of 10 elemental record types (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) compiles deterministically through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into OpenSpec capability/delta specifications and GitHub Spec Kit constitutions, feature specs, and technical plans.

### Active Assumptions (Pending Validation)
*All assumptions for this specification have been validated and promoted to facts.*

## 3. Requirements

### REQ-0003: Multi-Standard Projection Compilation and Drift Detection (`SHALL` | Status: `active`)
- **Underpinned By**: `FCT-0002`
- **Governed By**: `CON-0002`

WHEN the projection compiler (`tools/project.py`) is executed, THE system SHALL compile canonical records through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into target standard artifacts (`dist/openspec/` and `dist/speckit/`), support binding an optional external Tech-Stack Profile (`--stack-profile`), and fail with a non-zero exit status under `--check` whenever any projected artifact is missing or out of sync.

## 4. Acceptance Scenarios

### ACR-0004: Compile multi-standard projections and fail on out-of-sync dist artifacts (Verifies: `REQ-0003`)
- **GIVEN** the canonical record graph and the adapter mappings in `adapters/openspec/` and `adapters/speckit/`
- **WHEN** `tools/project.py` is run followed by `tools/project.py --check`
- **THEN** all target artifacts under `dist/openspec/` and `dist/speckit/` SHALL be generated deterministically and `--check` SHALL exit with status `0` (and exit `1` if any projected file is modified out of band)
