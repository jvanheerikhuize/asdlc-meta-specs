---
id: DEC-0001
type: decision
title: Store each elemental specification artifact as an atomic Markdown file with strict YAML frontmatter
domain: epistemic-graph
status: accepted
satisfies:
  - REQ-0001
  - CON-0001
  - CON-0003
underpinned_by:
  - FCT-0001
owners:
  - jvanheerikhuize
tags:
  - architecture
  - adr
  - epistemic-graph
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Context
To satisfy `REQ-0001`, `CON-0001`, and `CON-0003`, the specification repository must allow concurrent human and AI agent updates without merge collisions while supporting fast, deterministic graph traversal and schema validation (`FCT-0001`).

## Decision
We will store every elemental record (`ASM`, `VAL`, `FCT`, `QST`, `CON`, `REQ`, `ACR`, `DEC`, `SPC`, `CHG`) as an isolated Markdown file (`<PREFIX>-<4-DIGIT-ID>-<slug>.md`) with a strict YAML frontmatter envelope validated against Draft 2020-12 JSON Schemas (`schema/*.schema.json`) and structured `## <Heading>` prose sections.

## Alternatives Considered
1. **Single Monolithic Specification Document**: Rejected because it mixes verified truths with unvalidated assumptions and causes frequent merge conflicts when multiple contributors or agents edit unrelated requirements.
2. **External Relational or Document Database**: Rejected because it breaks Git-native branching, pull-request review, and offline agent execution.
3. **Pure JSON/YAML Files Without Markdown Body**: Rejected because multi-paragraph rationale, Gherkin scenarios, and architectural context are awkward to author and diff inside escaped YAML strings.

## Consequences
- **Positive**: Clean per-record Git diffs, deterministic sub-second validation (`FCT-0001`), and direct readability for both humans and LLM agents.
- **Negative**: Requires a lightweight index step (`tools/build_index.py`) to bundle records into a single JSON file for the browser workspace.
