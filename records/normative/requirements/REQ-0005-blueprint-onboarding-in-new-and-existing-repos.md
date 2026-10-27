---
id: REQ-0005
type: requirement
title: Install and Initialize the Blueprint Framework in New or Existing Repositories
domain: onboarding
status: provisional
category: non_functional
normative: SHOULD
ears_pattern: ubiquitous
priority: p1
underpinned_by:
  - ASM-0003
governed_by:
  - CON-0002
verified_by:
  - ACR-0007
  - ACR-0008
owners:
  - jvanheerikhuize
tags:
  - onboarding
  - captured
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
An engineering team SHOULD be able to install and initialize the ASDLC meta-spec framework in a new (greenfield) or existing (brownfield) repository using only standard Python tooling and GitHub Actions without requiring external database or server infrastructure.

## Rationale
Underpinned by `ASM-0003`. **Provisional:** rests on unvalidated onboarding time assumption `ASM-0003`.

## Provenance
Captured via issue #3 by @jvanheerikhuize on 2026-10-27.
