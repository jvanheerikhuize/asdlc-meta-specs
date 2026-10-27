---
id: ACR-0005
type: criterion
title: Retrieve and display the previously submitted data
domain: general
status: provisional
format: gherkin
verifies:
- REQ-0004
owners:
- jvanheerikhuize
tags:
- captured
created_at: '2026-10-27'
updated_at: '2026-10-27'
---

## Scenario: Retrieve and display the previously submitted data
- **GIVEN** a user has submitted data via an input field
- **WHEN** the user closes and later revisits the view
- **THEN** the system shall retrieve and display the previously submitted data
