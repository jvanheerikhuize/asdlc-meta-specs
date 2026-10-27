---
id: DEC-0003
type: decision
title: Use pre-filled GitHub Issue Forms and automated PR ingestion for zero-backend specification capture
domain: capture
status: provisional
satisfies:
  - REQ-0002
  - REQ-0004
  - CON-0001
  - CON-0003
underpinned_by:
  - FCT-0003
  - ASM-0002
owners:
  - jvanheerikhuize
tags:
  - architecture
  - adr
  - capture
created_at: "2026-10-27"
updated_at: "2026-10-27"
---

## Context
To satisfy `REQ-0002`, `REQ-0004`, `CON-0001`, and `CON-0003`, contributors need a guided capture experience with live previews and quality hints, while the repository must remain a static, zero-backend blueprint that anyone can fork and host on GitHub Pages.

## Decision
We will render schema-driven capture forms in the static browser workspace (`site/js/capture/`) that autosave drafts locally and pre-fill structured GitHub Issue Forms (`.github/ISSUE_TEMPLATE/capture-*.yml`) via URL parameters; a serialized GitHub Actions workflow (`ingest-capture.yml`) then runs `tools/ingest_capture.py`, validates the graph, compiles projections, and opens a Pull Request for review.

## Alternatives Considered
1. **Custom Backend API with OAuth Token Broker**: Rejected because it requires hosting and securing a stateful server, violating zero-infrastructure repository onboarding (`REQ-0005`).
2. **Direct Browser Commits via Personal Access Tokens**: Rejected because storing write tokens in browser storage poses a security risk and bypasses structured issue triage.

## Consequences
- **Positive**: Zero server infrastructure to operate, full GitHub branch-protection and PR review governance, and safe handling of untrusted inputs (`FCT-0003`).
- **Negative**: Submitting a capture requires two clicks (Submit in the browser workspace $\rightarrow$ Create on the pre-filled GitHub Issue Form).
