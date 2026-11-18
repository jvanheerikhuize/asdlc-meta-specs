---
id: FCT-0002
title: Plain text under version control provides commit attribution, line-level diffs, and reversible history
status: active
evidence: "Version control systems record author metadata, timestamps, line-level diffs, and parent commits for every committed change to plain-text files; human or agent peer review is enforced by repository pull-request policy on top of those primitives (Gotel and Finkelstein 1994, doi:10.1109/ICRE.1994.292398)."
---

## Statement
Storing specification records as plain text in version control makes every committed change attributable, diffable, and reversible without specialized requirements databases, while repository branch and pull-request policies govern whether changes receive review before merge.
