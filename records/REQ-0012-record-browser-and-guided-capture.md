---
id: REQ-0012
title: Record browser, detail inspection, guided capture forms, and theme persistence
status: active
because: [FCT-0002, FCT-0009]
---

## Statement
The workspace MUST provide a Records list view supporting filtering by record prefix and effective status plus full-text search across ID, title, and body; a Record detail view rendering the record's Markdown body alongside a metadata sidebar (`Confidence`, `Evidence`, `Review after`, `Tier`, `Readiness`, `Promoted from`, `Promoted to`, `Answered by`, `Blocks`, `Open questions`, `Because`, `Builds on`, `Requirements`, `Used by`, and `Changing this affects`) with links to focus the record in the graph or edit it in version control; a Capture view providing guided forms for all five record types that assigns the next sequential ID (`<PREFIX>-000N`), supports query-parameter prefill (`promote` for assumptions and `answers` for questions), renders a live file preview, and lists companion edits required in the same pull request; and a persistent theme toggle (`System`, `Light`, `Dark`).

## Acceptance
- Given an open assumption or open question selected for promotion or answering in the Capture view
- When the form is filled with title, statement, and evidence
- Then the preview shows the next sequential fact ID, populates `promoted_from` or companion `answered_by` instructions, and lists every downstream requirement that must be updated in the same change
