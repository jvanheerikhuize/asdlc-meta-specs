---
id: FCT-0005
title: At least one Given/When/Then scenario per requirement anchors baseline agent implementation and test traceability
status: active
promoted_from: ASM-0002
review_after: "2027-05-18"
evidence: "Across clean-room reconstructions of earlier corpus snapshots (21 records in PR #15; 30 records, 12 requirements, and 28 tests in PR #17; before expanding to the current 31-record, 22-scenario corpus) and authoring of the 36-record lumen corpus, requiring at least one concrete Given/When/Then scenario per active requirement gave coding agents (Claude Code and Google Antigravity) an executable behavioural target and scenario ID for test citation; this establishes a minimum baseline requirement rather than proof that a single example covers all boundary cases or removes the need for justified clarification."
---

## Statement
Requiring at least one concrete Given/When/Then acceptance scenario per active requirement provides coding agents with an observable baseline behaviour and traceable test target on scoped tasks, while complex requirements still benefit from boundary/negative scenarios and explicit open questions (`QST`) when ambiguity remains.
