---
id: ACR-0008
type: criterion
title: Complete brownfield repository onboarding within 30 minutes
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

## Scenario: Brownfield repository onboarding completes within 30 minutes
- **GIVEN** an existing brownfield repository
- **WHEN** an engineer integrates the ASDLC meta-spec framework and captures the initial domain records
- **THEN** the onboarding stage SHOULD be finished within 30 minutes
