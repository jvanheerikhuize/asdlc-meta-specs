---
id: ACR-0004
type: criterion
title: Be finished within 30 minutes
domain: onboarding
status: provisional
format: gherkin
verifies:
- REQ-0003
owners:
- jvanheerikhuize
tags:
- captured
created_at: '2026-10-27'
updated_at: '2026-10-27'
---

## Scenario: Be finished within 30 minutes
- **GIVEN** a brownfield repo
- **WHEN** setting up the framework
- **THEN** the onboarding stage should be finished within 30 minutes
