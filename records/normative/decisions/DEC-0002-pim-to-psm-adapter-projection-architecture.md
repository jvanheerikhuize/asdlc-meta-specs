---
id: DEC-0002
type: decision
title: Separate the Platform-Independent Model (PIM) from external Platform-Specific Models (PSM) via declarative projection adapters
domain: projection
status: accepted
satisfies:
  - REQ-0003
  - CON-0002
underpinned_by:
  - FCT-0002
owners:
  - jvanheerikhuize
tags:
  - architecture
  - adr
  - projection
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Context
To satisfy `REQ-0003` and `CON-0002`, canonical specifications must remain reusable across technology stacks and across external SDD ecosystems (OpenSpec, GitHub Spec Kit) without duplicating requirement records.

## Decision
We will maintain canonical records as a strictly tech-stack-agnostic Platform-Independent Model (PIM) and compile target standard artifacts (`dist/openspec/`, `dist/speckit/`) through declarative adapter mappings (`adapters/*/mapping.yaml`) and Handlebars templates (`adapters/*/templates/*.hbs`), binding concrete technology choices only when an external Tech-Stack Profile (`--stack-profile`) is supplied.

## Alternatives Considered
1. **Authoring Directly in OpenSpec or GitHub Spec Kit Format**: Rejected because neither format natively enforces bidirectional epistemic links (`ASM` $\rightarrow$ `VAL` $\rightarrow$ `FCT`) or tech-stack agnosticism.
2. **Embedding Concrete Stack Choices Directly in `REQ` Records**: Rejected because it causes premature implementation anchoring in AI coding agents and invalidates requirements whenever the underlying tech stack changes.

## Consequences
- **Positive**: Zero vendor or SDD-framework lock-in (`FCT-0002`), and CI drift detection via `tools/project.py --check`.
- **Negative**: Adapter templates must be re-compiled whenever canonical records included in a specification change (automated in `ingest-capture.yml`).
