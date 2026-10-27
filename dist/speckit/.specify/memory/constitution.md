# Project Constitution

<!-- Generated from Canonical Constraints (CON-xxxx) and Verified Facts (FCT-xxxx) -->

## Core Principles & Non-Negotiable Guardrails

### CON-0001: Epistemic Grounding and Readiness Gate Invariant
- **Scope**: `global` | **Enforcement**: `mandatory`
- **Underpinned By**: `FCT-0001`

Every normative record (`CON`, `REQ`, `DEC`) MUST declare at least one underpinning `FCT` or `ASM` record. No normative record or specification manifest (`SPC`, `CHG`) may hold an `active` or `accepted` status while underpinned by an unvalidated assumption (`unvalidated` or `validating`) or while affected by an open blocking question (`blocking: true`), and every `active` requirement MUST be verified by at least one acceptance criterion (`ACR`).

### CON-0002: Platform-Independent Tech-Stack Agnosticism (PIM vs. PSM Separation)
- **Scope**: `global` | **Enforcement**: `mandatory`
- **Underpinned By**: `FCT-0002`

Canonical specifications (`SPC`, `CHG`), normative records (`CON`, `REQ`, `ACR`, `DEC`), and domain epistemic records (`ASM`, `FCT`, `QST`) MUST state domain behavior, architectural topology, and operational invariants in strictly tech-stack-agnostic language; concrete programming languages, frameworks, storage engines, wire protocols, and cryptographic cipher suites MUST be deferred to external Tech-Stack Profiles bound during target projection.

### CON-0003: Immutable Epistemic Lineage and Untrusted Input Containment
- **Scope**: `security` | **Enforcement**: `mandatory`
- **Underpinned By**: `FCT-0001`, `FCT-0003`

Assumptions (`ASM`) MUST NOT be deleted or overwritten in place when validated; promoting or refuting an assumption MUST preserve the historical `ASM` record (`status: promoted` or `invalidated`) linked reciprocally to its `VAL` and `FCT` records. All capture ingestion pipelines MUST treat external issue submissions as untrusted data, reject unrecognised fields, and confine generated files strictly within configured record directories.

## Verified Domain Invariants (Fact Base)

- **`FCT-0001` (Atomic Markdown records with strict YAML frontmatter validate schema, reciprocity, and epistemic readiness in under 500ms)**: Storing each specification element as an isolated Markdown file with strict YAML frontmatter enables deterministic validation of Draft 2020-12 JSON Schemas, bidirectional link reciprocity, epistemic status consistency, and tech-stack agnosticism in under 500ms while eliminating merge conflicts between unrelated requirements. *(Source: `empirical_validation`, Promoted from `ASM-0001`)*
- **`FCT-0002` (The 10-type canonical record graph compiles deterministically into OpenSpec and GitHub Spec Kit artifacts without semantic loss)**: A canonical Platform-Independent Model (PIM) composed of 10 elemental record types (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) compiles deterministically through declarative adapter mappings (`adapters/*/mapping.yaml`) and templates into OpenSpec capability/delta specifications and GitHub Spec Kit constitutions, feature specs, and technical plans. *(Source: `empirical_validation`, Promoted from `ASM-0001`)*
- **`FCT-0003` (Issue-driven capture payloads are untrusted external inputs requiring strict schema confinement and path sanitization)**: Any capture submitted through a public or repository Issue Form is untrusted input that could contain shell metacharacters, frontmatter injection strings, or relative path traversal sequences; ingestion must never interpolate issue text into shell scripts, must validate payloads against closed capture schemas (`additionalProperties: false`), and must verify that all output paths resolve inside configured record directories. *(Source: `domain_invariant`)*
