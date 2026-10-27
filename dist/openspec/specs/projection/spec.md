# Multi-Standard Projection Compiler & PSM Binding

<!-- Generated from Canonical Spec SPC-0002 (domain: projection, status: active) -->

## Purpose

Defines the second **Walking Skeleton** (`tier: skeleton`) capability of `asdlc-meta-specs`: the declarative projection compiler (`tools/project.py`) that compiles the canonical tech-stack-agnostic record graph (`SPC-0001`) into OpenSpec (`dist/openspec/`) and GitHub Spec Kit (`dist/speckit/`) artifacts, supports selective skeleton/feature projection and fact-change impact rebuild planning, and binds optional external Tech-Stack Profiles (PSM).

## Epistemic Readiness Summary

- **Spec ID**: `SPC-0002`
- **Architecture Tier**: `skeleton` (Walking Skeleton (Core MVP) | Toggleable: `false`)
- **Depends On**: `SPC-0001` (Core Epistemic Record Graph & Validation Engine)
- **Status**: `active` (Epistemic Readiness: `100%`)
- **Governing Constraints**: `CON-0002` (Platform-Independent Tech-Stack Agnosticism (PIM vs. PSM Separation))

## Requirements

### Requirement: Multi-Standard Projection Compilation and Drift Detection
<!-- Canonical ID: REQ-0003 | Status: active | Underpinned by: FCT-0002 -->

WHEN the projection compiler (`tools/project.py`) is executed, THE system SHALL compile canonical records through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into target standard artifacts (`dist/openspec/` and `dist/speckit/`), support binding an optional external Tech-Stack Profile (`--stack-profile`), and fail with a non-zero exit status under `--check` whenever any projected artifact is missing or out of sync.

#### Scenario: Compile multi-standard projections and fail on out-of-sync dist artifacts
<!-- Canonical ID: ACR-0004 -->
- **GIVEN** the canonical record graph and the adapter mappings in `adapters/openspec/` and `adapters/speckit/`
- **WHEN** `tools/project.py` is run followed by `tools/project.py --check`
- **THEN** all target artifacts under `dist/openspec/` and `dist/speckit/` SHALL be generated deterministically and `--check` SHALL exit with status `0` (and exit `1` if any projected file is modified out of band)
