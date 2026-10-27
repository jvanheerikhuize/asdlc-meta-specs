---
id: ACR-0007
type: criterion
title: Complete greenfield repository onboarding within 10 minutes
domain: onboarding
status: provisional
format: gherkin
verifies:
  - REQ-0005
underpinned_by:
  - ASM-0003
owners:
  - jvanheerikhuize
tags:
  - onboarding
  - captured
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Scenario: Greenfield repository onboarding completes within 10 minutes
- **GIVEN** a greenfield repository
- **WHEN** an engineer initializes the ASDLC meta-spec framework and runs the validation and projection pipeline
- **THEN** the onboarding stage SHOULD be finished within 10 minutes
