---
id: FCT-0001
type: fact
title: Atomic Markdown records with strict YAML frontmatter validate schema, reciprocity, and epistemic readiness in under 500ms
domain: epistemic-graph
status: active
source: empirical_validation
promoted_from: ASM-0001
evidence:
  - VAL-0001
owners:
  - jvanheerikhuize
tags:
  - epistemic-graph
  - validation
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
Storing each specification element as an isolated Markdown file with strict YAML frontmatter enables deterministic validation of Draft 2020-12 JSON Schemas, bidirectional link reciprocity, epistemic status consistency, and tech-stack agnosticism in under 500ms while eliminating merge conflicts between unrelated requirements.

## Implications
- All normative records (`CON`, `REQ`, `ACR`, `DEC`) can be gated in CI by `tools/validate.py --strict` on every push and pull request without slowing developer or agent feedback loops.
- The browser workspace can compile the entire canonical graph into `site/data/index.json` via `tools/build_index.py` in milliseconds.
