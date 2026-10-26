# Standard-Agnostic Mapping Reference

`asdlc-meta-specs` decouples the **capture and evolution of specification knowledge** from the **presentation format expected by specific AI coding frameworks**.

Using the mapping rules and templates in `adapters/`, the canonical elemental records (`ASM`, `VAL`, `FCT`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) can be deterministically projected into external standards.

---

## 1. Cross-Standard Translation Matrix

| Canonical Record | Semantic Role | **OpenSpec** Target | **GitHub Spec Kit** Target | **EARS / IEEE / Gherkin / ADR** |
| :--- | :--- | :--- | :--- | :--- |
| **`CON-xxxx`** | Global / domain guardrail | `openspec/specs/principles/spec.md` | `.specify/memory/constitution.md` | System Constraints / Non-Functional Invariants |
| **`SPC-xxxx`** | Capability / feature manifest | `openspec/specs/<domain>/spec.md` (`# <Title>` & `## Purpose`) | `specs/<domain>/spec.md` (Feature Header & Scope) | SRS Section 3 (Specific Requirements) |
| **`REQ-xxxx`** | Atomic normative requirement | `### Requirement: <title>` under `## Requirements` | Requirement item under `## Requirements` in `spec.md` | EARS sentence (`WHEN ... THE system SHALL ...`) |
| **`ACR-xxxx`** | Testable verification scenario | `#### Scenario: <title>` (`GIVEN`/`WHEN`/`THEN`) nested under `REQ` | `### Acceptance Scenarios` in `spec.md` | Cucumber `.feature` Scenario block |
| **`DEC-xxxx`** | Architectural design choice | `openspec/changes/<id>/design.md` | `specs/<domain>/plan.md` (Architecture & Technical Plan) | MADR / Nygard ADR (`docs/adr/ADR-xxxx.md`) |
| **`CHG-xxxx`** | Scoped delta proposal | `openspec/changes/<id>/proposal.md` + `specs/<domain>/spec.md` (`ADDED`/`MODIFIED`/`REMOVED`) | Feature branch delta + `specs/<domain>/tasks.md` | Change Request (CR) / RFC |
| **`FCT-xxxx`** | Verified domain truth | Provenance metadata / rationale block | Constitution fact base & `plan.md` context | Domain Model Invariants |
| **`ASM-xxxx`** | Unvalidated belief | `> [!WARNING]` callout on provisional requirements | **Epistemic Gate Check** warning in `plan.md` | Risk Register / Open Issues |

---

## 2. Target 1: OpenSpec Projection (`adapters/openspec/`)

OpenSpec organizes specifications into two top-level directories:
- `openspec/specs/<capability>/spec.md` (current source of truth)
- `openspec/changes/<change-slug>/` (proposed delta with `proposal.md`, `design.md`, `tasks.md`, and delta `specs/`)

### How `asdlc-meta-specs` Compiles to OpenSpec
1. For each active `SPC-xxxx` manifest:
   - Generates `dist/openspec/specs/<domain>/spec.md`.
   - Renders the `SPC` Markdown summary under `## Purpose`.
   - Iterates through `composition.requirements` (`REQ-xxxx`), rendering each as `### Requirement: <REQ.title>` followed by its RFC 2119 / EARS statement.
   - If a `REQ` is underpinned by any unvalidated `ASM-xxxx`, injects an epistemic warning callout so agents know the requirement is provisional.
   - Nests each linked `ACR-xxxx` (`verified_by`) directly beneath its parent requirement as `#### Scenario: <ACR.title>`.
2. For each `CHG-xxxx` delta manifest:
   - Generates `dist/openspec/changes/<chg-slug>/proposal.md`, `design.md` (from linked `DEC-xxxx`), and `specs/<domain>/spec.md` partitioned into `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements`.

---

## 3. Target 2: GitHub Spec Kit Projection (`adapters/speckit/`)

GitHub Spec Kit follows a phased artifact pipeline (`.specify/memory/constitution.md` $\rightarrow$ `specs/<feature>/spec.md` $\rightarrow$ `plan.md` $\rightarrow$ `tasks.md`).

### How `asdlc-meta-specs` Compiles to Spec Kit
1. **Constitution (`.specify/memory/constitution.md`)**:
   - Compiled from all active `CON-xxxx` (Constraints) and global `FCT-xxxx` (Facts), complete with their empirical `VAL-xxxx` provenance.
2. **Feature Spec (`specs/<domain>/spec.md`)**:
   - Compiled from `SPC-xxxx`, rendering `REQ-xxxx` items, `ACR-xxxx` acceptance scenarios, and an **Epistemic Foundation** appendix listing all underpinning `FCT` and `ASM` records.
3. **Technical Blueprint (`specs/<domain>/plan.md`)**:
   - Compiled from `DEC-xxxx` (Architectural Decisions) and an automated **Constitution & Epistemic Gate Check** table that flags any unvalidated assumptions (`ASM`) before implementation tasks are executed.
