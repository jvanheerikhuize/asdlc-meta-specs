# Standard-Agnostic Mapping Reference

`asdlc-meta-specs` decouples the **capture and evolution of specification knowledge** from the **presentation format expected by specific AI coding frameworks**.

Using the mapping rules and templates in `adapters/`, the canonical elemental records (`ASM`, `VAL`, `FCT`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) can be deterministically projected into external standards.

---

## 1. Cross-Standard Translation Matrix

| Canonical Record | Semantic Role | **OpenSpec** Target (`adapters/openspec/`) | **GitHub Spec Kit** Target (`adapters/speckit/`) | **EARS / IEEE / Gherkin / ADR** |
| :--- | :--- | :--- | :--- | :--- |
| **`CON-xxxx`** | Global / domain guardrail | Governing constraints in `specs/<domain>/spec.md` (or `specs/principles/spec.md`) | `.specify/memory/constitution.md` (`templates/constitution.md.hbs`) | System Constraints / Non-Functional Invariants |
| **`SPC-xxxx`** | Capability / feature manifest | `specs/<domain>/spec.md` (`templates/spec.md.hbs`) | `specs/NNN-<domain>/spec.md` (`templates/spec.md.hbs`) | SRS Section 3 (Specific Requirements) |
| **`REQ-xxxx`** | Atomic normative requirement | `### Requirement: <title>` under `## Requirements` | `### REQ-xxxx: <title>` under `## 3. Requirements` in `spec.md` | EARS sentence (`WHEN ... THE system SHALL ...`) |
| **`ACR-xxxx`** | Testable verification scenario | `#### Scenario: <title>` (`GIVEN`/`WHEN`/`THEN`) nested under `REQ` | `### ACR-xxxx: <title>` under `## 4. Acceptance Scenarios` in `spec.md` | Cucumber `.feature` Scenario block |
| **`DEC-xxxx`** | Architectural design choice | `changes/<slug>/design.md` (or architectural context) | `specs/NNN-<domain>/plan.md` (`templates/plan.md.hbs`) | MADR / Nygard ADR (`docs/adr/ADR-xxxx.md`) |
| **`CHG-xxxx`** | Scoped delta proposal | `changes/<file_slug>/specs/<domain>/spec.md` (`templates/delta-spec.md.hbs`) | Feature branch delta + `specs/NNN-<domain>/tasks.md` | Change Request (CR) / RFC |
| **`FCT-xxxx`** | Verified domain truth | Provenance comments & rationale | Constitution fact base & `## 2. Epistemic Foundation` in `spec.md` | Domain Model Invariants |
| **`ASM-xxxx`** | Unvalidated belief | `> [!WARNING]` callout on provisional requirements | `## 2. Epistemic Foundation` in `spec.md` + **Epistemic Gate Check** in `plan.md` | Risk Register / Open Issues |

> [!NOTE]
> **Current Implementation Status**: The mapping definitions (`adapters/*/mapping.yaml`) and Handlebars templates (`adapters/*/templates/*.hbs`) are in place, and `dist/` contains reference sample projections for `SPC-0001` and `CHG-0001`. The automated projection compiler CLI is planned (see `README.md` Project Status).

---

## 2. Target 1: OpenSpec Projection (`adapters/openspec/`)

OpenSpec organizes specifications into two top-level directories under `dist/openspec/`:
- `specs/<domain>/spec.md` (current capability specification)
- `changes/<file_slug>/specs/<domain>/spec.md` (proposed delta partitioned into `ADDED`, `MODIFIED`, and `REMOVED` requirements)

### Derived Variables (`adapters/openspec/mapping.yaml`)
- `file_slug`: Record filename without the ID prefix and `.md` extension (e.g., `CHG-0001-add-revocation-denylist.md` $\rightarrow$ `add-revocation-denylist`).
- `section:<Heading>`: Markdown body content under `## <Heading>` (e.g., `section:Purpose`, `section:Statement`, `section:Scenario*`).

### How `asdlc-meta-specs` Maps to OpenSpec
1. **Capability Spec (`projections.capability_spec` $\rightarrow$ `templates/spec.md.hbs`)**:
   - Generates `dist/openspec/specs/{{domain}}/spec.md` from each `SPC-xxxx` manifest (sample: `dist/openspec/specs/auth/spec.md`).
   - Renders `SPC` `## Purpose` and an `## Epistemic Readiness Summary` listing governing `CON-xxxx` constraints.
   - Iterates through `composition.requirements` (`REQ-xxxx`), rendering each as `### Requirement: <REQ.title>` with provenance comments (`<!-- Canonical ID: REQ-xxxx | Status: ... | Underpinned by: ... -->`) followed by its `## Statement`.
   - If a `REQ` is underpinned by any unvalidated `ASM-xxxx`, injects a `> [!WARNING]` callout identifying the provisional requirement and the risk of each unvalidated assumption.
   - Nests each linked `ACR-xxxx` (`verified_by`) directly beneath its parent requirement as `#### Scenario: <ACR.title>`.
2. **Change Proposal (`projections.change_proposal` $\rightarrow$ `templates/delta-spec.md.hbs`)**:
   - Generates `dist/openspec/changes/{{file_slug}}/specs/{{domain}}/spec.md` from each `CHG-xxxx` manifest (sample: `dist/openspec/changes/add-revocation-denylist/specs/auth/spec.md`), partitioning `deltas.added`, `deltas.modified`, and `deltas.removed` requirements into `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements`.

---

## 3. Target 2: GitHub Spec Kit Projection (`adapters/speckit/`)

GitHub Spec Kit follows a phased artifact pipeline (`.specify/memory/constitution.md` $\rightarrow$ `specs/NNN-<domain>/spec.md` $\rightarrow$ `specs/NNN-<domain>/plan.md`).

### Derived Variables (`adapters/speckit/mapping.yaml`)
- `feature_number`: Numeric part of the `SPC` ID zero-padded to 3 digits (`SPC-0001` $\rightarrow$ `001`), matching Spec Kit's `specs/NNN-<feature>/` directory convention.
- `section:<Heading>`: Markdown body content under `## <Heading>`.

### How `asdlc-meta-specs` Maps to Spec Kit
1. **Constitution (`projections.constitution` $\rightarrow$ `templates/constitution.md.hbs`)**:
   - Output target: `dist/speckit/.specify/memory/constitution.md`.
   - Compiled from all `active` `CON-xxxx` (Constraints) and verified `FCT-xxxx` (Facts), including their `source` and `promoted_from` lineage.
2. **Feature Spec (`projections.feature_spec` $\rightarrow$ `templates/spec.md.hbs`)**:
   - Output target: `dist/speckit/specs/{{feature_number}}-{{domain}}/spec.md` (sample: `dist/speckit/specs/001-auth/spec.md`).
   - Compiled from `SPC-xxxx`, rendering `## 1. Overview & Purpose`, `## 2. Epistemic Foundation (Facts & Assumptions)` (including confidence, risk, and validation plans for open assumptions), `## 3. Requirements`, and `## 4. Acceptance Scenarios`.
3. **Technical Plan (`projections.technical_plan` $\rightarrow$ `templates/plan.md.hbs`)**:
   - Output target: `dist/speckit/specs/{{feature_number}}-{{domain}}/plan.md` (sample: `dist/speckit/specs/001-auth/plan.md`).
   - Compiled from `SPC-xxxx` and its `composition.decisions` (`DEC-xxxx`), preceded by a **Constitution & Epistemic Gate Check** table that flags any high-risk unvalidated assumptions (`WARN (PROVISIONAL)`) before implementation tasks are executed.

