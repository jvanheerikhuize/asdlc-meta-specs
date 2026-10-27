---
id: CON-0003
type: constraint
title: Immutable Epistemic Lineage and Untrusted Input Containment
domain: global
status: active
scope: security
enforcement: mandatory
underpinned_by:
  - FCT-0001
  - FCT-0003
owners:
  - jvanheerikhuize
tags:
  - security
  - lineage
  - capture
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
Assumptions (`ASM`) MUST NOT be deleted or overwritten in place when validated; promoting or refuting an assumption MUST preserve the historical `ASM` record (`status: promoted` or `invalidated`) linked reciprocally to its `VAL` and `FCT` records. All capture ingestion pipelines MUST treat external issue submissions as untrusted data, reject unrecognised fields, and confine generated files strictly within configured record directories.

## Rationale
Derived from `FCT-0001` and `FCT-0003`: immutable lineage preserves the audit trail of what was initially assumed versus empirically proven, while strict schema and path containment prevents frontmatter or path-traversal injection from untrusted issue bodies.
