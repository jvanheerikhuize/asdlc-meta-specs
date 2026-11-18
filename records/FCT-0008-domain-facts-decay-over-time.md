---
id: FCT-0008
title: Time-sensitive facts about external environments, tools, and operational limits can become stale
status: active
evidence: "Requirements engineering and software-evolution literature (Zave and Jackson 1997, doi:10.1145/237432.237434; Lehman 1980, doi:10.1109/PROC.1980.11805; Lutz 1994, NTRS 20060042270) shows that domain assumptions and observations tied to evolving external systems, agent toolchains, traffic patterns, or regulations can lose validity as the environment changes, motivating optional scheduled review dates on time-sensitive facts."
---

## Statement
Unlike timeless mathematical or definitional truths, observations that describe evolving external systems, tool capabilities, or operational thresholds can lose validity as the surrounding environment changes; attaching an optional `review_after` date to time-sensitive facts lets the checker flag potentially stale grounds for human review.
