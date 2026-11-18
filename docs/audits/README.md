# Repository Audits

This directory preserves independent technical, corpus, and research audits of `asdlc-meta-specs` alongside their remediation status.

## Archived Reports

| Date | Audited Commit | Report | Scope |
| :--- | :--- | :--- | :--- |
| 2026-11-18 | `22f6fc8` | [`2026-11-18-sol-6.1-research-audit.md`](2026-11-18-sol-6.1-research-audit.md) | Theory, empirical evidence, 31-record corpus (`FCT-0001`..`FCT-0009`), checker/renderer implementation (`tools/spec.py`), static workspace (`site/`), and CI workflows |
| 2026-11-18 | `cc47da7` | [`2026-11-18-asdlc-cc47da7-research-audit.md`](2026-11-18-asdlc-cc47da7-research-audit.md) | Post-remediation evaluation of `cc47da7`, Lumen comparison, research synthesis, and P1/P2 assurance findings (`B01`–`B07`) |

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
| `A01` | P1 | Evidence declarations can launder weak claims into green assurance | **Specific defect fixed (Pass 1); assurance limit remains** (tracked in `B04`) |
| `A02` | P1 | Normative intent and rationale alongside empirical `because` grounds | **Resolved in Pass 1** (`REQ-0002`, `REQ-0003` grounds and rationale expanded) |
| `A03` | P1 | Exported artifacts do not consistently preserve spec-level open questions | **Resolved in Pass 2 & 3** (`REQ-0005`, `render_gherkin`, `render_openspec`) |
| `A04` | P1 | Acceptance text is not checked for Given/When/Then structure | **Resolved in Pass 2 & 3** (`REQ-0004`, `valid_scenario` in `tools/spec.py`) |
| `A05` | P1 | Traceability verifies text citations; unknown `REQ` IDs not rejected | **Specific defect fixed (Pass 2 & 3); assurance limit remains** (tracked in `B03`) |
| `A06` | P1 | Unquoted YAML `review_after` dates break `to_index()` JSON serialization | **Resolved in Pass 2 & 3** (`REQ-0009`, `to_index` ISO date normalization) |
| `A07` | P1 | Pages deployment is not gated by check/tests; global cycle errors lack UI banner | **Resolved in Pass 2 & 3** (`REQ-0009`, `REQ-0010`, `tools/spec.py`, `site/app.js`, `.github/workflows/pages.yml`) |
| `A08` | P2 | Partial front-matter and relationship target-type validation | **Resolved in Pass 2 & 3** (`REQ-0001`, `REQ-0002`, `REQ-0003`, `tools/spec.py`) |
| `A09` | P2 | Rounded readiness (`round(...) == 100`) used as active-spec gate | **Resolved in Pass 2 & 3** (`REQ-0003`, `tools/spec.py`, `site/app.js`) |
| `A10` | P2 | Positional scenario IDs (`REQ-xxxx#n`) and unknown requirement citations | **Specific defect fixed (Pass 2 & 3); assurance limit remains** (tracked in `B03`) |
| `A11` | P2 | Backend/frontend stale-date alignment and segmented status bar consistency | **Resolved in Pass 2 & 3** (`REQ-0010`, `site/app.js`) |
| `A12` | P2 | Operational hygiene (license, runtime matrix, positioning copy) | **Resolved in Pass 4** (`README.md`, `ROADMAP.md`, `LICENSE`, `requirements.txt`, `.github/workflows/check.yml`, `site/app.js`) |

## 2026-11-18 Astra 6.2 Audit — Disposition Tracker

| ID | Priority | Summary | Status |
| :--- | :--- | :--- | :--- |
| `B01` | P1 | Live corpus expected to stay all-active/green in `test_index_has_everything_the_site_reads` (`REQ-0007`, `REQ-0009`) | **Resolved in Pass 1** (`tests/test_spec.py` decoupled from live active state using synthetic fixtures) |
| `B02` | P1 | Blocked or provisional requirement without scenarios vanishes from Gherkin output (`REQ-0004`, `REQ-0005`, `REQ-0007`) | **Resolved in Pass 1** (`REQ-0005`, `render_gherkin` preserves scenario-less requirements and blockers as Gherkin comments) |
| `B03` | P1 | `--verify` measures text citation coverage rather than executed behavioral passes (`REQ-0004`, `REQ-0010`–`REQ-0013`) | **Open (Pass 2)** |
| `B04` | P1 | Shape guards allow empty `## Statement` on requirements or empty `## How we validate it` on assumptions (`REQ-0001`, `REQ-0002`, `REQ-0003`, `REQ-0007`) | **Resolved in Pass 1** (`REQ-0001`, `check()` in `tools/spec.py`) |
| `B05` | P2 | Freshness has two clocks: strict `YYYY-MM-DD` date grammar and index `generated_at` / source SHA (`REQ-0008`–`REQ-0010`) | **Partially resolved in Pass 1** (`tools/spec.py` enforces strict `YYYY-MM-DD` regex; `generated_at` & UI alignment in Pass 2) |
| `B06` | P2 | Local eligibility vs dependency-wide readiness and UI badge copy (`REQ-0002`, `REQ-0003`, `REQ-0007`) | **Open (Pass 2)** |
| `B07` | P2 | Corpus calibration for `FCT-0001` (150ms benchmark) and `FCT-0005` (dated clean-room PR boundaries) | **Open (Pass 2)** |

