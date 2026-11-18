---
id: REQ-0010
title: Workspace dashboard and prioritized task queue surface blockers and next actions
status: active
because: [FCT-0008, FCT-0009]
---

## Statement
The workspace MUST provide a Dashboard view and a Tasks view driven by the exported index. The Dashboard MUST display a summary callout linking to the task queue (failing closed with an error callout whenever `summary.errors > 0` or global `issues` exist), segmented status bars per record type mapping effective record states to four visual tones (`done`, `wait`, `bad`, `off`—treating active facts strictly past `review_after` as `wait` in both status tones and segmented bars, non-active requirements resting on refuted or deprecated grounds as `broken`, requirements with open questions as `asked`, and requirements resting solely on facts as `ready`), cards for non-active or errored specs with blocker breakdowns, and open questions and assumptions ranked by downstream impact reach. The Tasks view MUST derive a prioritized action queue grouped into five levels (*Fix now* for broken requirements and check errors including global graph errors, *Answer questions* for open questions, *Test assumptions* for open assumptions with validation plans, *Quick wins* for requirements and specs ready to activate, and *Tidy up* for ungrouped requirements and warnings) with direct action links to prefill capture forms or edit records.

## Acceptance
- Given a record index containing an open question and an open assumption
- When the dashboard and task queue are computed
- Then open questions appear before open assumptions, ranked by downstream reach, and each generates a corresponding action item in the task queue
