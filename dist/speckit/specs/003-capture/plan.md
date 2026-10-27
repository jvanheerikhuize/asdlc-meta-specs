# Technical Plan: Guided Capture Ingestion & Epistemic Cascade Pipeline

<!-- Generated from Canonical Spec SPC-0003 (tier: feature) & Architectural Decisions (DEC-xxxx) -->

## 1. Constitution & Epistemic Gate Check

| Gate Check | Status | Details |
| :--- | :--- | :--- |
| **Architecture Tier & Rebuild Scope** | `feature` | Feature Specification (Flesh) (Toggleable: `true`; Depends on: `SPC-0001`, `SPC-0002`) |
| **Governing Constraints Satisfied** | `PASS` | `CON-0001`, `CON-0003` |
| **High-Risk Unvalidated Assumptions** | `WARN (PROVISIONAL)` | `ASM-0002` (risk: `high`) underpins `REQ-0002`, `ACR-0002`, and `DEC-0003` |

## 2. Architectural & Design Decisions

### DEC-0003: Use pre-filled GitHub Issue Forms and automated PR ingestion for zero-backend specification capture (Status: `provisional`)
- **Satisfies**: `REQ-0002`, `REQ-0004`, `CON-0001`, `CON-0003`
- **Underpinned By**: `FCT-0003`, `ASM-0002`

We will render schema-driven capture forms in the static browser workspace (`site/js/capture/`) that autosave drafts locally and pre-fill structured GitHub Issue Forms (`.github/ISSUE_TEMPLATE/capture-*.yml`) via URL parameters; a serialized GitHub Actions workflow (`ingest-capture.yml`) then runs `tools/ingest_capture.py`, validates the graph, compiles projections, and opens a Pull Request for review.
