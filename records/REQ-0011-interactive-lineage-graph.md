---
id: REQ-0011
title: Interactive lineage graph visualizes upstream grounds and downstream impact
status: active
because: [FCT-0009]
---

## Statement
The workspace MUST provide a Graph view that arranges records in five columns from left to right (`ASM`, `FCT`, `QST`, `REQ`, `SPC`) connected by directed curves: solid grounded edges for validated facts and active requirements, dashed weak edges for unvalidated assumptions, open questions, or non-active requirements, and right-gutter loops for spec-to-spec `depends_on` links. Hovering or focusing a node MUST preview its lineage, and clicking a node (or pressing `Enter` in the graph search input) MUST lock selection, elevating active lineage nodes and edges onto a foreground layer while dimming unrelated records, stopping upward traversal at `depends_on` spec boundaries, and displaying upstream/downstream counts, a section excerpt, and dependency jump controls in a sticky status bar. Typing in the graph search input without an active selection MUST dim unrelated records and unrelated edges, keeping only matching records and edges between matching records highlighted. Pressing `Escape` MUST clear the active selection or search filter.

## Acceptance
- Given a feature spec that builds on a skeleton spec and has its own requirements
- When the feature spec is selected in the lineage graph
- Then upward lineage includes the feature spec's own requirements and grounds plus the skeleton spec node itself, without traversing into the skeleton spec's internal requirements

- Given an unselected graph with a search query entered
- When matching records are highlighted
- Then unrelated records and unrelated edges are dimmed while matching records and edges between them remain prominent
