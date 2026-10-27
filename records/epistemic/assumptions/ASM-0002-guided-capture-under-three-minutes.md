---
id: ASM-0002
type: assumption
title: Contributors can capture a complete, schema-valid specification record in under 3 minutes via the guided browser workflow
domain: capture
status: unvalidated
confidence: 0.7
risk: high
validation_plan: Conduct timed usability sessions with 5 contributors capturing a requirement, assumption, fact, decision, and open question through the browser workspace and GitHub Issue Form flow.
owners:
  - jvanheerikhuize
tags:
  - capture
  - ux
  - captured
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
Both technical and non-technical contributors can capture a complete, schema-valid requirement, assumption, fact, decision, or open question in under 3 minutes using the guided browser capture form and pre-filled Issue Form contract without writing raw YAML.

## Validation Plan
Conduct timed usability sessions with 5 contributors across all 5 capture topics (`requirement`, `assumption`, `fact`, `decision`, `question`) and measure time-to-PR and validation pass rate on first submission.

## Impact if False
If guided capture takes longer than 3 minutes or frequently fails validation on first submission, contributors will revert to unstructured chat prompts or ad-hoc issue prose.
