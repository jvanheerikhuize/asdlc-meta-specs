---
id: ACR-0004
type: criterion
title: Compile multi-standard projections and fail on out-of-sync dist artifacts
domain: projection
status: active
format: gherkin
verifies:
  - REQ-0003
underpinned_by:
  - FCT-0002
owners:
  - jvanheerikhuize
tags:
  - projection
  - openspec
  - speckit
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Scenario: Compiling projections and verifying zero drift
- **GIVEN** the canonical record graph and the adapter mappings in `adapters/openspec/` and `adapters/speckit/`
- **WHEN** `tools/project.py` is run followed by `tools/project.py --check`
- **THEN** all target artifacts under `dist/openspec/` and `dist/speckit/` SHALL be generated deterministically and `--check` SHALL exit with status `0` (and exit `1` if any projected file is modified out of band)
