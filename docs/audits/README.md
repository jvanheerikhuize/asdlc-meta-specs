# Repository Audits

This directory preserves independent technical, corpus, and research audits of `asdlc-meta-specs` alongside their remediation status.

## Archived Reports

| Date | Audited Commit | Report | Scope |
| :--- | :--- | :--- | :--- |
| 2026-11-18 | `22f6fc8` | [`2026-11-18-sol-6.1-research-audit.md`](2026-11-18-sol-6.1-research-audit.md) | Theory, empirical evidence, 31-record corpus (`FCT-0001`..`FCT-0009`), checker/renderer implementation (`tools/spec.py`), static workspace (`site/`), and CI workflows |

## 2026-11-18 Sol 6.1 Audit — Disposition Tracker

### Corpus Fact Calibration (Section 5 & Finding A01)

| Record | Audit Finding | Disposition |
| :--- | :--- | :--- |
| `FCT-0001` / `ASM-0001` | Speed and conflict claim generalized beyond the 31–36 record corpora tested; shared spec edits and sequential ID allocation still require coordination | **Resolved (Pass 1):** Narrowed `ASM-0001` and `FCT-0001` to small corpora (~30–36 atomic files) and documented shared-index / ID-allocation conflict boundaries |
| `FCT-0002` | Conflated version-control capabilities (attribution, diffs, history) with workflow policy (mandatory review) | **Resolved (Pass 1):** Separated repository history/diff mechanisms from pull-request review policy |
| `FCT-0003` | Needed explicit benchmark, model, and sample scope from ClarifyGPT | **Resolved (Pass 1):** Scoped statement and evidence to Mu et al. (FSE 2024, `doi:10.1145/3660810`), GPT-4 Pass@1 on MBPP-sanitized (70.96% to 80.80%, +9.84 pp, 10-participant study) |
| `FCT-0004` / `QST-0002` | "Parsed directly" overstated context-window file ingestion as formal parsing or guaranteed compliance | **Resolved (Pass 1):** Scoped `FCT-0004` and `QST-0002` to direct text ingestion by the evaluated coding agents without intermediate schema compilation, plus a `review_after` date |
| `FCT-0005` / `ASM-0002` / `QST-0001` | Unlinked trials do not prove one scenario eliminates clarification universally or that silence equals correctness | **Resolved (Pass 1):** Calibrated `ASM-0002`, `QST-0001`, and `FCT-0005` to state that at least one concrete Given/When/Then scenario provides an executable baseline target in local trials while complex behavior still requires boundary scenarios and justified clarification |
| `FCT-0006` / `ASM-0004` | Authoring a 36-record corpus without stack terms is distinct from proving zero record edits across a second-stack migration | **Resolved (Pass 1):** Calibrated `ASM-0004` and `FCT-0006` to state that externalizing stack choices into `TECH_STACK.md` keeps behavioral corpora free of incidental technology names across two repositories, noting cross-stack re-implementation as a separate validation step |
| `FCT-0007` / `ASM-0003` | Claimed "without data loss" while Gherkin and OpenSpec intentionally omit fields | **Resolved (Pass 1):** Corrected `ASM-0003` and `FCT-0007` to describe target outputs as purpose-specific partial projections and documented what each format preserves or omits |
| `FCT-0008` | Overly universal decay statement; Zero of nine facts carried `review_after` | **Resolved (Pass 1):** Scoped `FCT-0008` to time-sensitive environmental and operational observations (referencing Zave & Jackson 1997; Lehman 1980; Lutz 1994) and added `review_after` dates to time-sensitive tool/workflow facts |
| `FCT-0009` | Dogfooding across 16 PRs supports reduced lookup friction, not complete "elimination" of manual work | **Resolved (Pass 1):** Replaced "eliminate" with bounded dogfooding observation ("reduce manual file cross-referencing during blocker triage") and added `review_after` |

### Implementation & Assurance Findings (Section 7)

| ID | Priority | Summary | Status |
| :--- | :--- | :--- | :--- |
| `A01` | P1 | Evidence declarations can launder weak claims into green assurance | **Addressed in Pass 1** (`records/FCT-*.md`, `records/ASM-*.md`, `records/QST-*.md`) |
| `A02` | P1 | Normative intent and rationale alongside empirical `because` grounds | **Addressed in Pass 1** (`REQ-0002`, `REQ-0003` grounds and rationale expanded) |
| `A03` | P1 | Exported artifacts do not consistently preserve spec-level open questions | Planned for Pass 2 & 3 (`REQ-0005`, `tools/spec.py`) |
| `A04` | P1 | Acceptance text is not checked for Given/When/Then structure | Planned for Pass 2 & 3 (`REQ-0004`, `tools/spec.py`) |
| `A05` | P1 | Traceability verifies text citations rather than executed test assertions | Planned for Pass 2 & 3 (`REQ-0013`, `tools/spec.py`) |
| `A06` | P1 | Unquoted YAML `review_after` dates break `to_index()` JSON serialization | Planned for Pass 2 & 3 (`REQ-0008`, `REQ-0009`, `tools/spec.py`) |
| `A07` | P1 | Pages deployment is not gated by check/tests; global cycle errors lack UI banner | Planned for Pass 2 & 3 (`REQ-0009`, `REQ-0010`, `tools/spec.py`, `site/app.js`, `.github/workflows/pages.yml`) |
| `A08` | P2 | Partial front-matter and relationship target-type validation | Planned for Pass 2 & 3 (`REQ-0001`, `REQ-0002`, `REQ-0003`, `tools/spec.py`) |
| `A09` | P2 | Rounded readiness (`round(...) == 100`) used as active-spec gate | Planned for Pass 2 & 3 (`REQ-0003`, `tools/spec.py`) |
| `A10` | P2 | Positional scenario IDs (`REQ-xxxx#n`) can drift when scenarios are reordered | Planned for Pass 2 & 3 (`REQ-0013`) |
| `A11` | P2 | Snapshot provenance metadata and backend/frontend stale-date alignment | Planned for Pass 2 & 3 (`REQ-0008`, `REQ-0009`, `REQ-0010`, `tools/spec.py`, `site/app.js`) |
| `A12` | P2 | Operational hygiene (license, runtime matrix, positioning copy) | Planned for Pass 4 (`README.md`, `ROADMAP.md`, `LICENSE`, `.github/workflows/check.yml`) |
