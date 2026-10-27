# Technical Plan: ASDLC Epistemic Specification Engine & Projection Architecture

<!-- Generated from Canonical Spec SPC-0001 & Architectural Decisions (DEC-xxxx) -->

## 1. Constitution & Epistemic Gate Check

| Gate Check | Status | Details |
| :--- | :--- | :--- |
| **Governing Constraints Satisfied** | `PASS` | `CON-0001`, `CON-0002`, `CON-0003` |
| **High-Risk Unvalidated Assumptions** | `WARN (PROVISIONAL)` | `ASM-0002` (risk: `high`) underpins `REQ-0002`, `ACR-0002`, and `DEC-0003`; `ASM-0003` (risk: `medium`) underpins `REQ-0005`, `ACR-0007`, and `ACR-0008`; `ASM-0004` (risk: `low`) underpins `REQ-0004` and `ACR-0006` |

## 2. Architectural & Design Decisions

### DEC-0001: Store each elemental specification artifact as an atomic Markdown file with strict YAML frontmatter (Status: `accepted`)
- **Satisfies**: `REQ-0001`, `CON-0001`, `CON-0003`
- **Underpinned By**: `FCT-0001`

We will store every elemental record (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) as an isolated Markdown file (`<PREFIX>-<4-DIGIT-ID>-<slug>.md`) with a strict YAML frontmatter envelope validated against Draft 2020-12 JSON Schemas (`schema/*.schema.json`) and structured `## <Heading>` prose sections.

### DEC-0002: Separate the Platform-Independent Model (PIM) from external Platform-Specific Models (PSM) via declarative projection adapters (Status: `accepted`)
- **Satisfies**: `REQ-0003`, `CON-0002`
- **Underpinned By**: `FCT-0002`

We will maintain canonical records as a strictly tech-stack-agnostic Platform-Independent Model (PIM) and compile target standard artifacts (`dist/openspec/`, `dist/speckit/`) through declarative adapter mappings (`adapters/*/mapping.yaml`) and Handlebars templates (`adapters/*/templates/*.hbs`), binding concrete technology choices only when an external Tech-Stack Profile (`--stack-profile`) is supplied.

### DEC-0003: Use pre-filled GitHub Issue Forms and automated PR ingestion for zero-backend specification capture (Status: `provisional`)
- **Satisfies**: `REQ-0002`, `REQ-0004`, `CON-0001`, `CON-0003`
- **Underpinned By**: `FCT-0003`, `ASM-0002`

We will render schema-driven capture forms in the static browser workspace (`site/js/capture/`) that autosave drafts locally and pre-fill structured GitHub Issue Forms (`.github/ISSUE_TEMPLATE/capture-*.yml`) via URL parameters; a serialized GitHub Actions workflow (`ingest-capture.yml`) then runs `tools/ingest_capture.py`, validates the graph, compiles projections, and opens a Pull Request for review.
