# ASDLC Meta-Specs: what the evidence supports

**Repository and research audit · 18 November 2026**  
**Audited:** [`jvanheerikhuize/asdlc-meta-specs` at `cc47da7`][head], the `main` revision merged at 16:16 UTC. This is a new assessment of the revision *after* the [earlier audit and remediation][tracker].

## Verdict

**Yes: keep developing it as a way to maintain specifications when the reasons behind them change. Don’t promote it as a general method for generating correct software, or mandate it on every ticket.** Its most valuable question is not “Is this spec green?” but **“What did we believe, what changed our minds, and what now needs revisiting?”** This is especially useful when a different person or agent inherits a long-lived feature.

I would pilot it today on work with consequential business rules, repeated handoffs, or changing external dependencies. I would use an ordinary issue and tests for a small, reversible change. I would not use an `active` record as a release approval, an assurance certificate, or permission for an agent to make unresolved product decisions.

Three observations drive that verdict:

1. **There is a real case outside the meta-spec repo.** In Lumen, a playback assumption was refuted, a requirement changed, and the same commit changed the implementation and tests. That is better evidence for the idea than a green dashboard.
2. **The green indicators measure less than a reader may infer.** All three specs report 100% readiness. Only **3 of 22** current scenario IDs occur as distinct, valid, numbered references in the test file. Some of those occurrences test the citation mechanism itself. Neither figure tells us how many behaviors work.
3. **Research supports the ingredients more than the recipe.** Controlled studies support targeted clarification, useful trace links, and explicit behavioral contracts in particular settings. There is also evidence that extra agent context costs money and that specification artifacts in real repositories do not, on their own, predict fewer defects. I found no independent comparative evaluation of *this five-record workflow* against a good issue, acceptance criteria, and tests.

## 1. What was examined

I inventoried the complete [53-file tree][tree]; read all 31 records, the [README][readme], [roadmap][roadmap], [technical binding][stack], checker/renderers, tests, and CI definitions; inspected the workspace’s state, graph and capture logic, the six explanatory diagrams, and the previous audit and dispositions. I checked the relevant historical PRs rather than attributing today’s features to an older trial. I also checked the public Pages index and the public Lumen corpus the project cites.

| At the audited revision | Observed |
|---|---|
| Record states | 9 active facts (`FCT`); 4 validated assumptions (`ASM`); 2 answered questions (`QST`); 13 active requirements (`REQ`); 3 active specs (`SPC`). No open, provisional, or broken record in this corpus. |
| Declared structure | 22 direct `because` links and 22 acceptance scenarios. They are different sets that happen to have the same size. `SPC-0001` is the skeleton; `SPC-0002` depends on it; `SPC-0003` depends on both. |
| Recorded automation | The [head check run][ci] reports 31 records, 0 errors, 0 warnings, and 38 passing unit tests on **each** of Python 3.10, 3.11 and 3.12. [Pages build and deploy][pagesrun] succeeded. These are existing CI results, not tests I reran. |
| Freshness and reach | 3 of 9 facts carry `review_after`, all set to 2027-05-18. In the [published index][live], changing `FCT-0009` reaches five requirements (`0009`–`0013`) and two specs. That is a useful review list, not proof the list includes every real dependency. |

**Method and limits.** This is a static repository audit, a check of published run evidence, and a targeted literature review, not a penetration test, an accessibility certification, a new agent benchmark, or a systematic review of every paper. I counted source records and citations independently of the project’s checker. I did not rerun its clean-room exercise, time the checker, replay Lumen’s measurements, or conduct browser user testing. Online research used DOI records, scholarly indexes, author/project publications and official tool documents; the research table identifies where only an abstract was inspected. A demonstrated mechanism, a maintainer’s experimental report, and an independent comparative result receive different weight here.

## 2. The strongest evidence is a refutation, not a promotion

The [cited Lumen snapshot][lumen] really has **36 records**: 4 assumptions, 13 facts, 2 questions, 12 requirements and 5 specs, plus a separate technical binding. It is a different application under the same GitHub owner: evidence of transfer beyond self-specification, **not** an independent team replication.

In [Lumen commit `19b54d7`][lumendiff], the project reports checking subtitle timing against runtimes for 14 films. Its proposed 94% “finished” threshold would have cleared progress before the final dialogue or ending audio for **10 of 14**. The project marked `ASM-0003` invalidated, recorded a bounded observation in `FCT-0012`, changed `REQ-0008` to preserve progress at 95% and clear it at 97%, and changed playback code and tests in the same commit. The trace and the edits are directly inspectable. The measurements are the project’s report; 97% still did not protect every film in the sample, and subtitle timing is not a measurement of viewer preference.

**Why it matters:** someone maintaining that behavior can recover why 94 became 97 and see the exceptions. We cannot tell whether ordinary tests and a clear PR would have found the problem just as quickly. Make *that comparison*, rather than using this example to claim a productivity gain.

The same consumer exposes a conceptual limit. [Lumen’s household-state question][lumenq] asks whether profiles **should** be separate. Tests can show that state **is** isolated; they cannot establish that households prefer isolation. And [the requirement][lumenreq] groups profile management, filtering, playback completion, episode resumption and synchronization. One file with one ID is not necessarily one independently changeable behavior. Split at different reasons for change, not at an arbitrary word count.

## 3. Claim-by-claim audit

“Supported” below means supported at the stated scope. It does not mean the requirement that cites the claim follows logically from it.

| Record and associated theory | What survives scrutiny | What I would change or measure |
|---|---|---|
| [FCT-0001][f1] / ASM-0001: atomic files check quickly and reduce conflicts | The small corpora exist. Edits to distinct files need not overlap at the text level. The record now acknowledges shared spec lists, sequential IDs and semantic conflicts. | Treat **under 150 ms** as a reported measurement until a revision, runner, command, repetitions and distribution are linked. The unit-suite time is not a checker benchmark. Compare conflict/rework rates against the previous layout, not against an imaginary worst case. |
| [FCT-0002][f2]: version control gives traceability | Git history and diffs make changes inspectable. The current record correctly distinguishes that capability from mandatory review. | Committed author metadata is not necessarily the accountable decision-maker. A diff cannot recover a reason nobody wrote down, or prove that somebody approved it. Link material policy decisions to their authority. |
| [FCT-0003][f3]: clarifying before coding can improve generated code | The named paper and numbers check out: GPT-4 Pass@1 on MBPP-sanitized rose from 70.96% to 80.80%. This is the best externally sourced empirical fact in the corpus. | Keep the exact task, intervention and model in the wording. The intervention elicited answers; a `QST` file alone does not. It does not justify blocking every experiment while a question is open. |
| [FCT-0004][f4] / QST-0002: agents can ingest the views | Reading Markdown or `.feature` text without conversion is a plausible, bounded workflow observation for the two named agents. | File access, syntax acceptance by the target tool, and actually following the instruction are three distinct claims. Date/version the first; add consumer contract tests for the second; evaluate the third on tasks. |
| [FCT-0005][f5] / ASM-0002 / QST-0001: examples anchor implementation | An example gives the implementer a concrete target. It is reasonable to require one as a minimum authoring policy. | The original question asks how many examples let an agent build *without asking*; “our minimum is one” answers a different question. Rephrase the policy question and leave sufficiency open. Correct the historical trial attribution below. |
| [FCT-0006][f6] / ASM-0004: isolate incidental technology | Two corpora and separate bindings demonstrate that this organization is possible. The current record explicitly does **not** claim a successful migration. | A short word list, applied to title and body, does not certify neutrality. A required wire format, data residence rule, or platform interface can be a genuine requirement. Test a second-stack implementation before claiming unchanged behavior or zero record edits. |
| [FCT-0007][f7] / ASM-0003: one graph, several views | Strong local implementation evidence: there really are four [renderer functions][renders] and one canonical corpus. “Partial projections” is the right description. | Formatting output is not end-to-end OpenSpec, Spec Kit, or Cucumber compatibility. Publish what each view deliberately omits and what must never disappear, especially a blocker. |
| [FCT-0008][f8]: environmental facts can go stale | A sound reason to revisit tool capabilities, policies and operating limits. The checker implements review reminders. | A review date is a prompt, not an expiry of truth; an unexpired claim may already be wrong. Prefer a named reviewer and an event such as “model upgrade” alongside the date for consequential facts. |
| [FCT-0009][f9]: derived queues and lineage reduce manual cross-referencing | The index, reverse links, queue, graph, and capture forms exist. The claim is explicitly based on dogfooding. | Five requirements depend directly on this one fact, including scenario traceability. The presence of the views is demonstrable; **net triage savings** and the necessity of a particular UI are not. Measure minutes, missed dependents and false alarms against search/grep plus a good issue. |

**A problem with the history of “validated.”** [PR #29][pr29] made the language more honest, but also changed the hypothesis *and its validation plan* while leaving `status: validated`. ASM-0002 went from “needs no clarification” to “has a baseline target.” ASM-0004 went from “reimplement on another stack and diff” to “author stack-neutral records.” The weaker claims are useful; their evidence does not settle the stronger ones. Preserve the original proposition, its outcome or “not tested,” and link the narrower replacement. Git preserves the edit; the **current graph** should communicate the distinction without requiring Git archaeology.

**The clean-room claim needs a dated boundary.** [PR #15][pr15] reports 21 **records**. [PR #17][pr17] reports 30 records, 28 tests, and byte-identical rendered Markdown for three specs in a reconstruction. Its [merge tree][pr17tree] had 12 requirements, not today’s 13. Numbered Markdown citations and `--verify` arrived in [PR #20][pr20]. Today there are 31 records and 22 scenarios, whereas FCT-0005 refers to 31 records and 21 scenarios alongside the earlier PRs. Those PRs cannot substantiate the whole current description. Link a later trial if one exists, or date the narrower result. Byte-identical renderer output is worth reporting; it is not application equivalence. The [binding][stack] gives the builder module signatures, CLI behavior, index shape and UI internals. A reconstruction with that information tests **records plus that detailed contract**, not records alone.

## 4. What independent research says

The findings that most changed my assessment are the maintenance experiment, the contract-driven test study, and the counterevidence on real PRs. They test different interventions; their percentages should not be pooled.

| Research and evidence type | Result relevant to ASDLC | Boundary or design implication |
|---|---|---|
| [Zave & Jackson, *Four dark corners of requirements engineering* (1997)][zave], conceptual paper (publisher abstract); [NASA Systems Engineering Handbook §4][nasa], engineering guidance | Distinguish domain knowledge, requirements and what the machine must do. NASA starts from stakeholder expectations, constraints and success criteria, and iterates. | Facts constrain which designs can satisfy a goal. They do not determine which goal is worth pursuing. Preserve **who wants this and why**, not just what observations are compatible with it. |
| [Gotel & Finkelstein (1994)][gotel], practitioner research (abstract); [Mäder & Egyed (2012)][mader], controlled maintenance experiment (abstract) | The former identified missing traceability *before* a requirement was written. In the latter, 52 participants worked on two projects with and without traceability; with links they were on average **21% faster per task** and produced more correct solutions. | Good evidence that *available, useful* links can help maintenance. It does not give the lifetime cost of authoring and updating ASDLC’s links, or prove graph reach is complete. Test it on change tasks. |
| [Méndez Fernández et al., NaPiRE (2017)][napire], survey across 228 companies in 10 countries (abstract); [Mu et al., ClarifyGPT (2024)][clarify], controlled code-generation study (publisher abstract and [artifact][clarifyart]) | The survey establishes a real requirements-engineering problem in practice. ClarifyGPT detected ambiguity, asked targeted questions and used the replies. With ten participants in its human evaluation, it reports **+9.84 percentage points** for GPT-4 on MBPP-sanitized. | A survey diagnoses pain, not the cure. ClarifyGPT supports a **clarification loop**, not mandatory file types, one example per requirement, or fewer questions as a quality metric. Reward necessary questions. |
| [Tufano et al., *Grounding AI Agents in Contracts* (SpecOps 2026)][tufano], workshop empirical study (authors’ abstract) | On Google production bugs, asking the agent to document preconditions, postconditions and undefined behavior before generating tests improved bug detection **9.8 percentage points** and branch coverage **2.5 points** against its test-generation baseline. | Stronger, more relevant support for investing in *boundaries* than for adding more templates. The treatment concerned test generation from code; it did not test a human-authored YAML graph or delivery speed. |
| [Chen et al., SpecFirst (2026)][specfirst], benchmark preprint (abstract and methods overview) | On 200 ProgramBench instances and four models, separating behavioral elicitation from implementation improved test pass rates compared with a single-loop baseline. The spec agent could probe an executable reference. | Encouraging for the clean-room idea. The executable reference and a hidden behavioral evaluator are crucial differences from regenerating a Markdown file. |
| [Gloaguen et al., *Evaluating AGENTS.md* (2026)][agentspaper], agent benchmark (paper, including the breakdown by file origin) | Across the studied settings, generated context files tended to hurt task success, developer-written files slightly helped on average, and context files increased inference cost by over 20%. | These were **repository-wide context files**, not feature-specific specs. The lesson is to test a small task-specific packet against a full export, not that specs are harmful. |
| [Hill, *Does Spec-Driven Development Reduce Defects?* (2026)][hill], observational SSRN working paper (**registered abstract only** [via Crossref][hillmeta]) | Across 100,247 PRs in 119 open-source repositories, it reports no evidence for the claimed defect reduction. Within-author, spec artifacts were associated with **5.0 percentage points more rework**; the reported +1.4-point defect association had *p* = .056. | A serious counterweight to blanket marketing, not proof SDD causes harm. Harder changes attract specs; defect tracing and detecting spec artifacts are proxies. No random assignment and no identification of this workflow. |

Two useful precedents are [W3C PROV-DM][prov] (where evidence came from, who produced it, and through what activity) and [OMG’s Structured Assurance Case Metamodel][sacm] (claim **plus argument plus evidence**). These are standards, not productivity experiments. Borrow the distinction without importing their full schemas. Similarly, [Parnas on information hiding][parnas] supports isolating change-prone design decisions by analogy; [Lehman on evolution][lehman] motivates revisiting assumptions. Neither paper validates a vendor-name blacklist, a six-month review interval, or zero-edit migrations.

For evaluation, [EvalPlus][evalplus] illustrates why stronger tests matter: it extended the original HumanEval and MBPP test sets substantially. [METR’s follow-up on developer productivity][metr] explains how selection of participants and tasks can bias an apparent speedup. Together they argue for **held-out behavior, all-in cost and deliberate task sampling**, not an extrapolation from benchmark Pass@1 or participant enthusiasm.

## 5. Implementation and assurance findings

**Priority 1** means fix before treating the tool as a dependable handoff between people or agents. **Priority 2** means address in a pilot, or document the limitation if it is intentional. These are product and assurance priorities, not security severity ratings.

| Priority / affected requirements | Finding at this revision | Smallest useful correction |
|---|---|---|
| **1 · The live corpus is expected to stay green** (`REQ-0007`, `0009`) | [`test_index_has_everything_the_site_reads`][indextest] reads the real corpus and asserts all three specs are 100%, `QST-0002` is answered, and `REQ-0005` has no open questions. Reopening that question and **correctly** demoting its requirement/spec can satisfy the structural policy but still fail the test and therefore [block Pages publication][pages]. This penalizes the act the method exists to encourage. | Put the fixed all-green example in a fixture. Against live records, assert the index reflects the records, not that the records stay active. Add a valid mixed-state fixture that can be published. |
| **1 · A citation is not a passing behavioral test** (`REQ-0004`, `0010`–`0013`) | [`--verify`][verify] scans text. A bare requirement ID can cover its entire set of scenarios, by the current [REQ-0013 contract][req13]. In the only test file, 12 of 13 requirements have a bare reference; the only valid, distinct literal numbered IDs are `REQ-0001#1`, `REQ-0004#1`, and `REQ-0004#2`. **19 of 22 lack a literal numbered reference**; this is *not* “19 untested.” The [three workspace tests][uitests] assert strings in JS/HTML, not what a user sees or can do. Positional IDs can silently change meaning after reordering. | Name the current check “citation coverage.” Introduce durable scenario keys when externally referenced; bind critical keys to named, executed assertions and results for a commit. Add one behavioral browser test for blocker triage/lineage, not more implementation-string tests. |
| **1 · A blocked requirement can vanish from Gherkin** (`REQ-0004`, `0005`, `0007`) | The [checker][reqgate] permits a provisional requirement with no scenario. The [Gherkin renderer][gherkin] emits its question/status tags only inside the scenario loop. Thus if a question blocks **that requirement only**, a `.feature`-only consumer gets neither the requirement nor its blocker. Feature-level questions are preserved; the earlier fix was real but did not cover this case. | Preserve outstanding blockers in a feature-level handoff summary or companion manifest regardless of scenario count. Add this exact valid case to renderer contracts. A Gherkin tag is metadata, not an instruction that forces an agent to stop. |
| **1 · Evidence can be present without supporting the claim** (`REQ-0001`, `0002`, `0003`, `0007`) | [Validation][shape] checks whether `evidence` is truthy, not whether it has a usable source, scope, or argument. An assumption’s `How we validate it` is encouraged, but not required by the checker. A requirement can have a scenario but no meaningful `Statement`. For example, fast checking and Git history motivate *building* a graph but do not entail skeleton-first ordering. | Enforce nonblank statements and a validation plan where promised. For consequential promotions require a dated source/run, bounded claim, and reviewer. Add a sentence explaining why the grounds support the rule, or identify it as an authorized design choice. Do not promise to machine-verify truth. |
| **2 · Local eligibility is not dependency-wide readiness** (`REQ-0002`, `0003`, `0007`) | The [spec gate][specgate] checks direct requirements and direct open questions. A feature can be active while a prerequisite spec is draft. A question blocking only a spec can be “answered” by a still-open assumption; the [answer citation warning][qgate] only checks blocked *requirements*. Also, an open assumption/question rejects `active` but does not force exactly `provisional` rather than `broken` in the absence of a dead ground. | Define `active` as local eligibility and expose upstream unresolved work separately, or propagate blockers where release policy requires it. State the precedence of broken versus provisional. A team should be able to explore a reversible assumption without shipping it as settled. |
| **2 · Freshness has two clocks** (`REQ-0008`–`0010`) | The [checker][fresh] evaluates dates when run; [the UI][uistate] recalculates a stale badge with the current date but derives warning tasks from the built index. With no rebuild, the badge can turn stale without putting a new review task in the queue. The index has no generation timestamp/source SHA. Also, the requirement says `YYYY-MM-DD`; [`date.fromisoformat` accepts additional forms since Python 3.11][pydate]. | Use one defined date grammar/time basis, derive stale tasks consistently, and show `generated_at` and source revision. Keep a last-valid view visibly dated when a new build cannot publish. |
| **2 · Capture, portability and scale have not earned stronger claims** (`REQ-0001`, `0005`, `0006`, `0009`, `0012`) | [Capture][capture] selects the next ID from the published snapshot. Two authors can select the same ID. It can also propose an `active` requirement on factual grounds while its example is still a placeholder; CI, not the form, catches that. [`to_index`][indexcode] computes downstream impact for each record and materializes each reachable set. This is reasonable at 31 records and can be costly on a dense corpus. | Surface form/CI disagreement before handoff; specify how concurrent proposals resolve IDs. Benchmark sparse and dense graphs at realistic sizes before adding infrastructure. Keep the stack lint a heuristic, with an explicit place for real interoperability constraints. |

**What is already fixed.** [PR #30][pr30] added scenario-shape checks, an exact all-direct-requirements-active gate rather than a rounded percentage gate, normalized parsed dates on index export, exposed global cycle errors, rejected unknown requirement citations, and gated Pages on checks/tests. [PR #31][pr31] improved positioning and the runtime matrix; the repository has an MIT license. These are meaningful changes. I would change the [disposition tracker][tracker] from “resolved” to **“specific defect fixed; assurance limit remains”** for evidence quality and positional scenario traceability. A valid but reinterpreted `#2` is not an unknown ID.

## 6. Positioning: what to build, and what to leave out

Keep the five record types and the separation between canonical records and rendered views. The [OpenSpec workflow][openspec] already has proposals, designs, tasks and scenarios; [GitHub Spec Kit][speckit] already supplies a development workflow. ASDLC’s contribution is the persistent link from an implementing requirement back to **evidence, uncertainty and a reason to revisit it**. Export that information to other tools rather than recreating their orchestration. Label outputs *format projections* until tested with named downstream versions. In particular, [Cucumber’s own reference][cucumber] distinguishes Gherkin steps from the executable step definitions that implement them.

In [Böckeler’s practitioner taxonomy][bockeler], this fits **spec-anchored development**: retain the spec after delivery so it can guide change. It is more useful than just “spec first” and far less demanding than “the spec is the only source.” The walking skeleton is a sensible build-order convention; a topological sort proves an ordering of **declared** dependencies, not that the skeleton works end to end or that every feature should wait.

**The smallest model change I would make:** keep `because`, but distinguish (in prose first) *observation*, *external obligation*, and *team decision*. Give material requirements an owner/authority and one sentence of rationale. For a promoted fact, record what was observed, under what conditions, the immutable artifact, and what result would make the team revisit it. Two independent pieces of supporting evidence need not both be necessary conditions: losing one may trigger review rather than logically invalidate the requirement. Don’t introduce a sixth record type until repeated real cases justify it.

For the agent, send only the relevant spec, blockers, grounds and necessary technical binding, with a clear distinction between “may prototype” and “may deliver.” For the human, replace “100% ready” with **“5/5 direct requirements active”** where that is what was computed. Keep execution results, evidence review and stakeholder acceptance separate. This is a wording change with a concrete consequence: a reviewer knows which question still needs answering.

## 7. A pilot that could change the verdict

**Hypothesis worth testing:** after a material assumption changes, a new maintainer using ASDLC finds the right downstream changes with less total human effort, without sacrificing behavior. This is narrower, more plausible, and easier to falsify than “SDD makes agents better.”

| Design choice | Proposed protocol |
|---|---|
| Sample and comparator | Start with **12 real tasks across at least two independently maintained projects**. Include ambiguous features, changes to prior decisions, and simple controls. Run each in two fresh contexts (24 implementations): **A**, a strong ordinary issue with rationale, acceptance examples and tests; **B**, the same substantive information organized as ASDLC records with gates and impact. Neither arm gets extra answers. |
| Fair assignment | Block by project, task type and maintainer experience; randomize arm/order, and don’t let the same person solve the same task twice. Fix model/version, permissions, time budget, repository revision and access to a stakeholder. Charge both arms for preparing and maintaining their inputs. |
| Independent outcome | Before runs, a reviewer freezes hidden happy-path, boundary and negative checks and a set of genuinely affected behaviors for a later change. Blind the assessor to the arm where possible. After delivery, give a *different maintainer* the same changed assumption. Compare found versus missed dependents, extraneous edits, and behavior on held-out checks. |
| Primary and guardrail measures | Primary: total human minutes through accepted initial delivery **and the follow-up change**, including authoring, review, clarification and rework. Also report impact recall/precision, held-out pass rate, critical misses, agent cost, and latency. Classify justified questions separately from avoidable ones. Publish per-pair results, not just averages. |
| Decision rule | **Illustrative threshold to agree before collecting data:** expand the trial if median paired total human effort drops at least 15%, hidden acceptance is no more than 5 percentage points worse, and there is no new critical miss. Show paired uncertainty intervals. Twelve pairs are a feasibility pilot, not proof; if uncertainty spans material benefit and harm, extend rather than declare a win. If only impact triage improves, ship that narrower capability. |

Separately, test the portability claim by rebuilding one skeleton on a genuinely different stack against an independent behavioral suite. Freeze the corpus and binding versions in advance; record every clarification and corpus edit. A failed reconstruction that identifies an unstated assumption is a successful use of the method, even though it is a failed portability test.

**Investment decision:** fix the test that requires the real world to stay green, protect blockers in every agent handoff, then run the comparison. Defer new schemas, record types and autonomous workflows. **The project has earned a pilot, not a mandate.**

[head]: https://github.com/jvanheerikhuize/asdlc-meta-specs/commit/cc47da7dd024b2d7cb2370a6c2ba308373f8af08
[tree]: https://github.com/jvanheerikhuize/asdlc-meta-specs/tree/cc47da7dd024b2d7cb2370a6c2ba308373f8af08
[tracker]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/docs/audits/README.md
[readme]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/README.md
[roadmap]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/ROADMAP.md
[stack]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/TECH_STACK.md
[ci]: https://github.com/jvanheerikhuize/asdlc-meta-specs/actions/runs/44345403862
[pagesrun]: https://github.com/jvanheerikhuize/asdlc-meta-specs/actions/runs/44345403919
[live]: https://jvanheerikhuize.github.io/asdlc-meta-specs/data/index.json
[lumen]: https://github.com/jvanheerikhuize/lumen/tree/d2d35f56ec39f65ac7d13b879ace214bde8eef61/records
[lumendiff]: https://github.com/jvanheerikhuize/lumen/commit/19b54d78de3205f33c8f036b3ff0c92d173073c6
[lumenq]: https://github.com/jvanheerikhuize/lumen/blob/d2d35f56ec39f65ac7d13b879ace214bde8eef61/records/QST-0001-multiple-viewer-profiles-or-shared-household.md
[lumenreq]: https://github.com/jvanheerikhuize/lumen/blob/d2d35f56ec39f65ac7d13b879ace214bde8eef61/records/REQ-0008-watch-progress-and-household-state-sync.md
[f1]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0001-atomic-records-check-fast.md
[f2]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0002-version-control-gives-traceability.md
[f3]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0003-clarifying-first-improves-generated-code.md
[f4]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0004-agents-read-markdown-and-gherkin.md
[f5]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0005-acceptance-scenarios-prevent-clarification.md
[f6]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0006-stack-agnostic-specs-survive-migrations.md
[f7]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0007-small-renderers-project-graph.md
[f8]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0008-domain-facts-decay-over-time.md
[f9]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/FCT-0009-derived-task-queues-and-visual-lineage-accelerate-triage.md
[pr15]: https://github.com/jvanheerikhuize/asdlc-meta-specs/pull/15
[pr17]: https://github.com/jvanheerikhuize/asdlc-meta-specs/pull/17
[pr17tree]: https://github.com/jvanheerikhuize/asdlc-meta-specs/tree/2e0b262b10ea182299bb36b7109fa8982d00958a/records
[pr20]: https://github.com/jvanheerikhuize/asdlc-meta-specs/pull/20
[pr29]: https://github.com/jvanheerikhuize/asdlc-meta-specs/pull/29/files
[pr30]: https://github.com/jvanheerikhuize/asdlc-meta-specs/pull/30
[pr31]: https://github.com/jvanheerikhuize/asdlc-meta-specs/pull/31
[shape]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L95-L153
[qgate]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L154-L173
[reqgate]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L174-L200
[specgate]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L201-L244
[fresh]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L145-L153
[verify]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L288-L325
[renders]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L328-L433
[gherkin]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L359-L368
[indexcode]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tools/spec.py#L449-L484
[req13]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/records/REQ-0013-acceptance-scenario-traceability.md
[indextest]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tests/test_spec.py#L256-L270
[uitests]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/tests/test_spec.py#L294-L339
[pages]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/.github/workflows/pages.yml#L4-L36
[uistate]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/site/app.js#L73-L190
[capture]: https://github.com/jvanheerikhuize/asdlc-meta-specs/blob/cc47da7dd024b2d7cb2370a6c2ba308373f8af08/site/app.js#L493-L518
[zave]: https://doi.org/10.1145/237432.237434
[nasa]: https://www.nasa.gov/reference/4-0-system-design-processes/
[gotel]: https://doi.org/10.1109/ICRE.1994.292398
[mader]: https://doi.org/10.1109/ICSM.2012.6405269
[napire]: https://doi.org/10.1007/s10664-016-9451-7
[clarify]: https://doi.org/10.1145/3660810
[clarifyart]: https://github.com/ClarifyGPT/ClarifyGPT
[tufano]: https://research.google/pubs/grounding-ai-agents-in-contracts-an-empirical-evaluation-of-spec-driven-test-generation/
[specfirst]: https://huggingface.co/papers/2607.27167
[agentspaper]: https://huggingface.co/papers/2602.11988
[hill]: https://doi.org/10.2139/ssrn.6515898
[hillmeta]: https://api.crossref.org/works/10.2139/ssrn.6515898
[prov]: https://www.w3.org/TR/2013/REC-prov-dm-20130430/
[sacm]: https://www.omg.org/spec/SACM/2.3/About-SACM
[parnas]: https://doi.org/10.1145/361598.361623
[lehman]: https://doi.org/10.1109/PROC.1980.11805
[evalplus]: https://evalplus.github.io/
[metr]: https://metr.org/blog/2026-02-24-uplift-update/
[pydate]: https://docs.python.org/3.12/library/datetime.html#datetime.date.fromisoformat
[openspec]: https://github.com/Fission-AI/OpenSpec
[speckit]: https://github.com/github/spec-kit/blob/main/spec-driven.md
[cucumber]: https://cucumber.io/docs/gherkin/reference/
[bockeler]: https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
