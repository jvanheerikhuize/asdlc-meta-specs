# ASDLC Meta-Specs

A **standard-agnostic, epistemic specification repository** designed for Agentic Software Development Life Cycles (ASDLC) and Specification-Driven Development (SDD).

Instead of authoring monolithic, static specification files that silently mix verified truths with unverified guesswork, this repository breaks specifications down into **atomic, linkable elemental records** governed by an explicit **epistemic feedback loop**:

$$\text{Assumptions (ASM)} \xrightarrow{\text{Validation (VAL)}} \text{Facts (FCT)} \xrightarrow{\text{Underpins}} \text{Requirements (REQ) \& Criteria (ACR)} \xrightarrow{\text{Composes}} \text{Specifications (SPC)}$$

---

## Core Philosophy

1. **Epistemic Transparency (Facts vs. Assumptions)**
   Every normative element—whether a global Constraint (`CON`), a Requirement (`REQ`), an Acceptance Criterion (`ACR`), or an Architectural Decision (`DEC`)—must explicitly link to the **Facts (`FCT`)** and/or **Assumptions (`ASM`)** that underpin it.
   - Requirements underpinned by unvalidated assumptions are automatically treated as **provisional**.
   - Validating an assumption (`VAL`) promotes it to a new **Fact (`FCT`)** with immutable lineage (`promoted_from`), triggering a review of downstream requirements to sharpen the specification.
   - Invalidating an assumption immediately flags all dependent requirements and decisions as **stale/broken**.

2. **Atomic Elemental Records**
   Each record lives in its own Markdown file with strict YAML frontmatter (`records/`). This guarantees clean Git diffs, zero merge conflicts on unrelated requirements, deterministic ID addressing, and effortless parsing by both AI agents and future capture UIs/CLIs.

3. **Standard-Agnostic Projections**
   External SDD frameworks—such as **OpenSpec**, **GitHub Spec Kit**, EARS, Gherkin, and ADRs—are treated as **target projections** (`adapters/` $\rightarrow$ `dist/`) compiled from the canonical elemental graph.

---

## Repository Architecture

```text
asdlc-meta-specs/
├── meta-spec.config.yaml              # Global configuration, ID prefixes, and epistemic gate rules
├── schema/                            # JSON Schemas (Draft 2020-12) for YAML frontmatter validation
│   ├── base-record.schema.json
│   ├── assumption.schema.json
│   ├── validation.schema.json
│   ├── fact.schema.json
│   ├── constraint.schema.json
│   ├── requirement.schema.json
│   ├── criterion.schema.json
│   ├── decision.schema.json
│   └── spec-manifest.schema.json
├── records/                           # Canonical Atomic Store (Source of Truth)
│   ├── epistemic/
│   │   ├── assumptions/               # ASM-xxxx: Unverified hypotheses & provisional premises
│   │   ├── validations/               # VAL-xxxx: Spikes, benchmarks, interviews, & evidence
│   │   └── facts/                     # FCT-xxxx: Verified truths & promoted assumptions
│   └── normative/
│       ├── constraints/               # CON-xxxx: Global project guardrails & invariants
│       ├── requirements/              # REQ-xxxx: Atomic functional & non-functional requirements
│       ├── criteria/                  # ACR-xxxx: Testable acceptance scenarios (Gherkin / assertions)
│       └── decisions/                 # DEC-xxxx: Architectural & technical design choices
├── specs/                             # Specification Assemblies & Scoped Deltas
│   ├── capabilities/                  # SPC-xxxx: Feature/capability manifests composing elemental records
│   └── changes/                       # CHG-xxxx: Delta proposals (ADDED / MODIFIED / REMOVED records)
├── adapters/                          # Standard Mapping Rules & Templates
│   ├── openspec/                      # Projection config & templates for OpenSpec
│   └── speckit/                       # Projection config & templates for GitHub Spec Kit
├── dist/                              # Projected standard outputs (generated artifacts)
└── docs/                              # Architecture & Governance Guides
    ├── architecture.md                # Meta-model graph, record taxonomy, and file conventions
    ├── epistemic-lifecycle.md         # Assumption promotion, invalidation cascades, and readiness scoring
    └── standard-mappings.md           # Mapping matrix for OpenSpec, Spec Kit, EARS, Gherkin, and ADR
```

---

## Elemental Record Prefix Reference

| Prefix | Layer | Type | Description |
| :--- | :--- | :--- | :--- |
| **`ASM`** | Epistemic | `assumption` | Unverified belief or hypothesis with explicit `confidence`, `risk`, and `validation_plan`. |
| **`VAL`** | Epistemic | `validation` | Experiment, benchmark, test, or citation that `tests` an assumption or `establishes` a fact. |
| **`FCT`** | Epistemic | `fact` | Verified truth or domain invariant (native or `promoted_from` an `ASM` via a `VAL`). |
| **`CON`** | Normative | `constraint` | Global project principle, compliance boundary, or architectural invariant. |
| **`REQ`** | Normative | `requirement` | Atomic normative statement (`MUST`/`SHALL`/`SHOULD`) underpinned by facts/assumptions. |
| **`ACR`** | Normative | `criterion` | Testable acceptance scenario (`GIVEN`/`WHEN`/`THEN` or invariant assertion) verifying a `REQ`. |
| **`DEC`** | Normative | `decision` | Technical design choice or Architecture Decision Record satisfying `REQ`s and `CON`s. |
| **`SPC`** | Composition | `spec` | Capability or feature specification assembling `CON`, `REQ`, `ACR`, and `DEC` records. |
| **`CHG`** | Composition | `change` | Delta manifest proposing additions, modifications, or removals across elemental records. |

---

## Documentation

- **[Architecture & Data Model](docs/architecture.md)**: Deep dive into the canonical record graph, YAML frontmatter conventions, and bidirectional traceability.
- **[Epistemic Lifecycle & Promotion Guide](docs/epistemic-lifecycle.md)**: Step-by-step workflow for capturing assumptions, running validations, promoting to facts, and cascading updates to requirements.
- **[Standard Mappings Reference](docs/standard-mappings.md)**: How the canonical records project into **OpenSpec**, **GitHub Spec Kit**, EARS, and Gherkin.
