---
id: ACR-0005
type: criterion
title: Trace upstream grounding and downstream impact in the stratified Record Graph
domain: workspace
status: active
format: gherkin
verifies:
  - REQ-0004
underpinned_by:
  - FCT-0001
owners:
  - jvanheerikhuize
tags:
  - workspace
  - graph
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Scenario: Selecting a node in the Record Graph highlights its full epistemic and normative lineage
- **GIVEN** the compiled record index loaded in `#/graph` or `#/record/:id`
- **WHEN** a user selects or focuses any record node
- **THEN** the workspace SHALL highlight all transitive upstream grounding nodes and downstream dependent nodes across the 5 stratified columns and display their direct and total counts in the inspector
