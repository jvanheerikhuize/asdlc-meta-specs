---
id: REQ-0013
title: Acceptance scenarios carry sequential IDs and trace to test citations
status: active
because: [FCT-0001, FCT-0009]
---

## Statement
Rendered Markdown specs MUST label each acceptance scenario with a sequential ID (`**<REQ-ID>#<N>**`). When checking the graph with `--verify DIR`, the system MUST scan source and test files under `DIR` (skipping version-control, dependency, cache, build-output, `records`, and `site` directories) for `REQ-xxxx` or `REQ-xxxx#n` citations, fail on out-of-range scenario IDs (`cites unknown scenario <REQ-ID>#<N>`), and warn on any `active` requirement lacking a citation or any numbered scenario lacking a citation when at least one numbered scenario for that requirement is cited without a bare `REQ-xxxx` citation.

## Acceptance
- Given an `active` requirement whose ID is not cited under the verified directory
- When the graph is checked with `--verify`
- Then the check emits a traceability warning for that requirement

- Given a test file that cites an out-of-range scenario number such as `REQ-0001#99`
- When the graph is checked with `--verify`
- Then the check fails naming the unknown scenario ID
