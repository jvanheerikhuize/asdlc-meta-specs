# ASDLC Meta-Specs

[![validate-meta-specs](https://github.com/jvanheerikhuize/asdlc-meta-specs/actions/workflows/validate.yml/badge.svg)](https://github.com/jvanheerikhuize/asdlc-meta-specs/actions/workflows/validate.yml)

A **standard-agnostic, epistemic specification repository** for Agentic Software Development Life Cycles (ASDLC) and Specification-Driven Development (SDD).

Instead of monolithic spec documents that silently mix verified truths with guesswork, this repository breaks specifications down into **atomic, linkable elemental records** governed by an explicit **epistemic feedback loop**:

```mermaid
flowchart LR
    ASM["Assumptions (ASM)"] -->|"validated by"| VAL["Validations (VAL)"]
    VAL -->|"promote to"| FCT["Facts (FCT)"]
    FCT -->|"underpin"| REQ["Requirements (REQ) and Criteria (ACR)"]
    ASM -.->|"provisionally underpin"| REQ
    REQ -->|"compose"| SPC["Specifications (SPC)"]
    SPC -->|"project to"| STD["OpenSpec / Spec Kit / ..."]
```

> **Better facts → better requirements → better specs.**

---

## Core Philosophy

1. **Epistemic Transparency (Facts vs. Assumptions)**
   Every normative element — Constraint (`CON`), Requirement (`REQ`), Acceptance Criterion (`ACR`), or Decision (`DEC`) — links to the **Facts (`FCT`)** and/or **Assumptions (`ASM`)** that underpin it. The validator enforces that:
   - records underpinned by unvalidated assumptions cannot be `active` (they must be **provisional**);
   - records underpinned by an invalidated assumption or deprecated fact must be **broken** / **needs_review**;
   - records still pointing at a *promoted* assumption are flagged for review against the resulting fact.

2. **Atomic Elemental Records**
   Each record is one Markdown file with strict YAML frontmatter in `records/`. This gives clean Git diffs, no merge conflicts between unrelated requirements, stable ID addressing, and easy parsing by AI agents and future capture UIs.

3. **Standard-Agnostic Projections**
   External SDD formats — **OpenSpec**, **GitHub Spec Kit**, EARS, Gherkin, ADRs — are treated as **target projections** (`adapters/` → `dist/`) of the canonical record graph.

---

## Quickstart

```bash
pip install -r tools/requirements.txt
python tools/validate.py            # schema, links, reciprocity, epistemic consistency, readiness
python tools/validate.py --strict   # also fail on warnings
```

**Adding a record:** copy an existing record of the same type, take the next free ID (`REQ-0003`), name the file `<ID>-<kebab-slug>.md`, fill in the frontmatter, and run the validator. Dates must be quoted strings (`created_at: "2026-10-26"`).

---

## Repository Architecture

```text
asdlc-meta-specs/
├── meta-spec.config.yaml              # ID prefixes, directories, schemas, epistemic rules, adapters
├── schema/                            # JSON Schemas (Draft 2020-12) for record frontmatter
├── records/                           # Canonical atomic store (source of truth)
│   ├── epistemic/
│   │   ├── assumptions/               # ASM-xxxx: unverified hypotheses
│   │   ├── validations/               # VAL-xxxx: spikes, benchmarks, interviews, evidence
│   │   └── facts/                     # FCT-xxxx: verified truths & promoted assumptions
│   └── normative/
│       ├── constraints/               # CON-xxxx: project guardrails & invariants
│       ├── requirements/              # REQ-xxxx: atomic functional & non-functional requirements
│       ├── criteria/                  # ACR-xxxx: testable acceptance scenarios
│       └── decisions/                 # DEC-xxxx: architectural & design decisions
├── specs/
│   ├── capabilities/                  # SPC-xxxx: capability manifests composing records
│   └── changes/                       # CHG-xxxx: delta proposals (added / modified / removed)
├── adapters/                          # Mapping rules & templates per target standard
│   ├── openspec/
│   └── speckit/
├── dist/                              # Projected standard outputs (currently hand-written samples)
├── site/                              # GitHub Pages workspace (plain HTML/CSS/ES modules, no build step)
├── tools/
│   ├── recordlib.py                   # shared record parsing / writing
│   ├── validate.py                    # schema, links, epistemic consistency, readiness
│   ├── build_index.py                 # records → site/data/index.json (built in CI)
│   └── ingest_capture.py              # capture issue (or payload file) → new record files
├── tests/                             # unit tests + fixtures for ingestion & index
├── .github/
│   ├── ISSUE_TEMPLATE/                # capture-requirement issue form (fallback capture path)
│   └── workflows/                     # validate · ingest-capture · pages (gated)
└── docs/                              # Architecture, lifecycle & mapping guides
```

---

## GitHub Pages Workspace

`site/` is a small, framework-free web app that serves as the human-facing workspace: dashboard, record browser, prose view per record, pending captures, and **capture interfaces** — all inside one persistent shell (header, navigation, search, draft indicators).

### Capturing a requirement

```mermaid
flowchart LR
    F["Capture form (Pages)"] -->|"pre-filled issue"| I["GitHub issue (label: capture)"]
    I -->|"ingest-capture workflow"| P["PR with REQ / ASM / ACR files"]
    P -->|"validator passes, reviewer merges"| M["main = approved records"]
```

1. Open **Capture → Requirement**. Only one field is required: *what should the system do?* Everything else (why, underpinning facts/assumptions, acceptance criteria, domain, priority) is optional. Drafts autosave in the browser.
2. **Submit** opens the GitHub issue form with every field pre-filled (you can still edit them there); click *Create*. (No app login or token needed — your GitHub session is used.)
3. The `ingest-capture` workflow allocates IDs, writes the records (status `provisional` when underpinned by new/open assumptions, otherwise `draft`), validates them, and opens a PR that closes the issue.
4. **Approval = one approving review + merge.** A ruleset on `main` requires one approval from a collaborator with write access (the PR is opened by the bot, so any collaborator — including the capturer — can approve it). Approvals are dismissed if the capture is edited and the PR re-pushed. Repository admins can bypass.

Without the app you can use the issue form directly (*New issue → Capture a requirement*). Only repository owners/members/collaborators can trigger ingestion.

### Enabling the site

Deployment is **off by default**. To enable:

1. *Settings → Pages → Source:* **GitHub Actions**.
2. *Settings → Secrets and variables → Actions → Variables:* add `PAGES_ENABLED` = `true`.
3. Push to `main` (or run the *pages* workflow manually).

> [!WARNING]
> Pages sites are public unless you're on GitHub Enterprise Cloud — even for private repositories. Set `site.publish: "metadata"` in `meta-spec.config.yaml` to omit record prose from the published index.

Local preview: `python tools/build_index.py && python -m http.server -d site 8000`.

---

## Elemental Record Prefix Reference

| Prefix | Layer | Type | Description |
| :--- | :--- | :--- | :--- |
| **`ASM`** | Epistemic | `assumption` | Unverified belief with explicit `confidence`, `risk`, and `validation_plan`. |
| **`VAL`** | Epistemic | `validation` | Experiment, benchmark, test, or citation that `tests` an assumption or `establishes` a fact. |
| **`FCT`** | Epistemic | `fact` | Verified truth or invariant (native, or `promoted_from` an `ASM` via a `VAL`). |
| **`CON`** | Normative | `constraint` | Project principle, compliance boundary, or architectural invariant. |
| **`REQ`** | Normative | `requirement` | Atomic normative statement (`MUST`/`SHALL`/`SHOULD`/`MAY`). |
| **`ACR`** | Normative | `criterion` | Testable scenario (`GIVEN`/`WHEN`/`THEN` or assertion) verifying a `REQ`. |
| **`DEC`** | Normative | `decision` | Design choice / ADR satisfying `REQ`s and `CON`s. |
| **`SPC`** | Composition | `spec` | Capability specification assembling `CON`, `REQ`, `ACR`, `DEC` records. |
| **`CHG`** | Composition | `change` | Delta proposal adding, modifying, or removing records. |

---

## Project Status

| Area | Status |
| :--- | :--- |
| Record model, schemas, folder architecture | ✅ In place |
| Reference example (auth capability) | ✅ In place |
| Validator + CI | ✅ In place |
| Projection compiler (`adapters/` → `dist/`) | 🔜 Planned — `dist/` currently holds hand-written samples of the intended output |
| Pages workspace shell (dashboard, records, prose, pending) | ✅ In place — deploy gated behind `PAGES_ENABLED` |
| Requirement capture (app → issue → PR) | ✅ In place |
| Assumption / fact / decision capture, in-app approval | 🔜 Planned |

---

## Documentation

- **[Architecture & Data Model](docs/architecture.md)** — record graph, frontmatter conventions, traceability rules.
- **[Epistemic Lifecycle](docs/epistemic-lifecycle.md)** — capturing assumptions, validating, promoting to facts, cascading updates.
- **[Standard Mappings](docs/standard-mappings.md)** — how records project into OpenSpec, Spec Kit, EARS, and Gherkin.
