# Roadmap

This repository grows **one evidence-backed step at a time**, keeping the model minimal until real usage demonstrates a need for more.

## The reasoning

1. **Grow with the repo's own method.** The axiom is *facts → requirements → specs*. Candidate features start as **assumptions** ("we will need separate validation records", "teams need an ingest bot") and are added only when a real need has been observed and recorded as a fact.
2. **Simplicity makes the idea transferable.** The model fits in one diagram and one table. Anything added to the core model must earn its place in three places: the **check** (a rule), the **dashboard** (a state), and the **Tasks tab** (a human or agent action).
3. **Grow along the axiom, not along the architecture.** The highest-value additions strengthen the chain from facts to code: making gaps explicit (`QST`), catching stale facts, and verifying acceptance scenarios against real implementations.

## Phases

```mermaid
flowchart LR
    P0["0 · Use it"] --> P1["1 · Sharpen the axiom"]
    P1 --> P2["2 · Bridge to agents"]
    P2 --> P3["3 · Scale on evidence"]
```

### Phase 0: Use it (complete)

Run real projects on the record model, extract existing repositories into `records/`, and close out this repo's own open items:

- ~~**Extract a production application corpus.**~~ Done: applied to a real self-hosted media appliance (`lumen`, 36 records across 1 `skeleton` and 4 `feature` specs, passing `tools/spec.py check --strict` with 0 errors and 0 warnings).
- ~~**Interactive lineage & task triage in the workspace.**~~ Done: the static workspace (`site/`, specified by `SPC-0003`) derives actionable queues (*fix now*, *answer questions*, *test assumptions*, *quick wins*) and provides interactive left-to-right graph lineage focus.
- ~~**Settle this repo's own open grounds & verify self-recreation.**~~ Done: all initial assumptions (`ASM-0001`..`ASM-0004`) promoted to facts (`FCT-0001`, `FCT-0005`..`FCT-0007`), questions answered (`QST-0001`..`QST-0002`), and the 30-record corpus (`SPC-0001`..`SPC-0003` + `TECH_STACK.md`) verified via clean-room blind reconstruction.

### Phase 1: Sharpen the axiom

Small additions that make the chain more truthful:

- ~~**Open questions (`QST`).**~~ Done: included in the core model (`REQ-0007`, part of `SPC-0001`). Without `QST`, the only way to record an unknown is to invent a guess (`ASM`). Resolving ambiguity before coding measurably improves generated code (`FCT-0003`, ClarifyGPT).
- ~~**Fact freshness (`review_after` on `FCT`).**~~ Done: specified by `REQ-0008` and checked by `tools/spec.py check`; flags stale facts as warnings and surfaces them on the dashboard and Tasks queue.
- ~~**Non-goals on `SPC`.**~~ Done: optional `## Non-goals` section on `SPC` records (`REQ-0005`), rendered before `## Requirements` to tell implementing agents what not to build.

### Phase 2: Bridge to agents (complete)

- ~~**Playbook workflows for agent extraction, assumption testing, and question resolution.**~~ Done: documented in [`README.md`](README.md#playbook-agent--human-workflows) with copy-pasteable prompts.
- ~~**Separate tech-stack file (`TECH_STACK.md`) bound at render time.**~~ Done: adopted in both [`TECH_STACK.md`](TECH_STACK.md) and consumer repositories (`lumen`), and bound into rendered specs via `python tools/spec.py render --stack TECH_STACK.md` (`REQ-0005`), keeping `records/` 100% stack-agnostic.
- ~~**Projection to OpenSpec and Spec Kit**~~ Done: `render_openspec` and `render_speckit` in `tools/spec.py` (`--format openspec` / `--format speckit`, `REQ-0005`).
- ~~**Acceptance criteria with their own IDs and code traceability.**~~ Done: rendered Markdown labels each scenario `**REQ-xxxx#n**` (`REQ-0013`), and `python tools/spec.py check --verify DIR` verifies test/code citations, closing the loop `facts → requirements → specs → tests`.

### Phase 3: Scale on evidence

Add each capability only when its trigger is observed in real usage:

| Candidate feature | Current state | Add when |
| :--- | :--- | :--- |
| `VAL` validation records | `evidence` field on `FCT` | A single fact needs multiple independent validation runs or reusable benchmark logs |
| `CON` constraints | `SHOULD`/`MUST` requirements + `TECH_STACK.md` | The same cross-cutting rule is repeated across three or more requirements |
| `DEC` decisions | Git history + `FCT`/`ASM` grounds | Architectural choices between alternatives keep getting reopened |
| `CHG` change proposals | Pull requests + `tools/spec.py impact` | A change spans many records and needs review as one unit beyond a PR |
| JSON Schemas | Rules in `tools/spec.py check` | External tools write records directly and need a machine-readable schema contract |
| Issue → bot → PR capture | GitHub web editor links from the Capture tab | Contributors without GitHub fluency hit friction, or volume makes manual PRs a bottleneck |
| `TRM` terms, `CTR` contracts | Inline definitions in `REQ`/`SPC` | Agents demonstrably drift on domain vocabulary or interfaces across specs |
| `autonomy_tier` | Human PR review | Agents act on specs without a human reviewing every pull request |

Some of these may never be needed. Every candidate is an assumption to be tested in real use.
