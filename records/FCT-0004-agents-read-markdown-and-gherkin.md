---
id: FCT-0004
title: Evaluated coding agents ingest Markdown and Gherkin text files directly without intermediate schema compilation
status: active
review_after: "2027-05-18"
evidence: "During development of asdlc-meta-specs and the lumen corpus (PRs #1-#17), Claude Code and Google Antigravity read rendered Markdown (.md) and Gherkin (.feature) files directly into context via native file-reading tools without external format conversion; direct file ingestion establishes workflow readability, not formal grammar validation or guaranteed implementation obedience."
---

## Statement
Evaluated coding agents (Claude Code and Google Antigravity) read standard Markdown and Gherkin `.feature` text files directly into their context windows without requiring proprietary binary or schema compilation, though syntactic validity and behavioural correctness still depend on verification checks and tests.
