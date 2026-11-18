---
id: FCT-0003
title: Clarifying ambiguous requirements before code generation improved pass rates on benchmark tasks
status: active
evidence: "Mu et al., ClarifyGPT: A Framework for Enhancing LLM-Based Code Generation via Requirements Clarification (FSE 2024, doi:10.1145/3660810): detecting ambiguity and asking clarifying questions raised GPT-4 Pass@1 on MBPP-sanitized from 70.96% to 80.80% (+9.84 percentage points), alongside a 10-participant human evaluation."
---

## Statement
In controlled code-generation benchmarks (ClarifyGPT, FSE 2024), prompting a model to detect requirement ambiguity and obtain clarification before generating code significantly improved test pass rates compared to generating code directly from ambiguous prompts; this supports surfacing unresolved gaps explicitly (`QST`) rather than silently guessing, without implying that a single example eliminates all ambiguity.
