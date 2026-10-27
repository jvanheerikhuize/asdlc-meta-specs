---
id: FCT-0003
type: fact
title: Issue-driven capture payloads are untrusted external inputs requiring strict schema confinement and path sanitization
domain: capture
status: active
source: domain_invariant
owners:
  - jvanheerikhuize
tags:
  - security
  - capture
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Statement
Any capture submitted through a public or repository Issue Form is untrusted input that could contain shell metacharacters, frontmatter injection strings, or relative path traversal sequences; ingestion must never interpolate issue text into shell scripts, must validate payloads against closed capture schemas (`additionalProperties: false`), and must verify that all output paths resolve inside configured record directories.

## Implications
- `.github/workflows/ingest-capture.yml` passes issue titles and bodies exclusively via environment variables and temporary files.
- `tools/ingest_capture.py` restricts record IDs and statuses to server-allocated values and rejects any payload attempting to set `id`, `status`, or out-of-tree paths.
