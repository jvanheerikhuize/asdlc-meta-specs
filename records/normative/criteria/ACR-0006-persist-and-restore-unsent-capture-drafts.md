---
id: ACR-0006
type: criterion
title: Retrieve and display previously entered capture draft data across sessions
domain: workspace
status: provisional
format: gherkin
verifies:
  - REQ-0004
underpinned_by:
  - ASM-0004
owners:
  - jvanheerikhuize
tags:
  - workspace
  - capture
  - captured
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Scenario: Retrieve and display the previously entered draft data
- **GIVEN** a user has entered data into a capture form field in the browser workspace
- **WHEN** the user closes and later revisits the capture view
- **THEN** the system SHALL retrieve and display the previously entered draft data and indicate that an unsent draft was restored
