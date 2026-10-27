# The Epistemic Lifecycle: From Assumptions to Better Specs

A specification is only as strong as the truths that underpin it. In `asdlc-meta-specs`, specifications evolve through a disciplined epistemic feedback loop:

1. **Capture Assumptions (`ASM`)** explicitly whenever uncertainty exists.
2. **Draft Provisional Requirements (`REQ`)** underpinned by those assumptions and existing facts.
3. **Execute Validations (`VAL`)** (benchmarks, spikes, user research, audits) to test assumptions.
4. **Promote to Facts (`FCT`)** (or invalidate) based on empirical outcomes.
5. **Refine Requirements & Specs (`REQ` $\rightarrow$ `SPC`)** triggered by newly promoted facts or invalidated assumptions.

---

## 1. Epistemic States & Promotion Mechanics

### Step 1: Authoring an Assumption (`ASM`)
When designing a feature, any unverified premise is recorded in `records/epistemic/assumptions/ASM-xxxx-<slug>.md` (or captured via `#/capture/assumption`):
- `status`: `unvalidated` (also supports `validating`, `promoted`, `invalidated`, `retired`)
- `confidence`: `0.0` to `1.0` (how sure we are before testing)
- `risk`: `low` | `medium` | `high` | `critical` (impact if the assumption is wrong)
- `validation_plan`: concrete experiment or check required to verify it (minimum 10 characters)

If an existing normative record (`REQ`, `CON`, or `DEC`) depends on a newly captured assumption, `tools/ingest_capture.py` appends `ASM-xxxx` to its `underpinned_by` list and transitions any `active`/`accepted` record to `provisional`.

### Step 2: Running a Validation (`VAL`)
To test one or more assumptions (or provide empirical evidence for a fact), create `records/epistemic/validations/VAL-xxxx-<slug>.md` (or use `#/capture/fact`):
- `status`: `planned` | `in_progress` | `completed` | `aborted`
- `tests: [ASM-xxxx]`
- `method`: `benchmark` | `prototype_spike` | `user_research` | `documentation_audit` | `production_telemetry` | `formal_proof` | `stakeholder_signoff`
- `outcome`:
  - `pending`: Validation is not yet complete.
  - `confirmed`: The assumption holds as stated.
  - `refined`: The core premise holds, but with sharper quantitative or qualitative boundaries.
  - `refuted`: The assumption is false.
- `artifacts`: optional list of benchmark logs, scripts, PRs, or external references.

### Step 3A: Immutable Promotion (`ASM` $\rightarrow$ `FCT`)
When a validation completes with `outcome: confirmed` or `outcome: refined`:
1. **Mint a new Fact (`FCT-yyyy`)** in `records/epistemic/facts/` with:
   - `status: active`
   - `source: empirical_validation` (other supported sources for standalone facts: `domain_invariant`, `external_contract`, `regulatory_mandate`, `hardware_limit`, `business_policy`)
   - `promoted_from: ASM-xxxx`
   - `evidence: [VAL-zzzz]`
2. **Record the Validation (`VAL-zzzz`)** in `records/epistemic/validations/` with:
   - `status: completed`
   - `tests: [ASM-xxxx]`
   - `establishes: [FCT-yyyy]` *(required reciprocal link for `FCT.evidence`)*
3. **Update the original Assumption (`ASM-xxxx`)** with:
   - `status: promoted`
   - `validated_by: [VAL-zzzz]` *(required reciprocal link for `VAL.tests`)*
   - `promoted_to: [FCT-yyyy]` *(required reciprocal link for `FCT.promoted_from`)*

### Step 3B: Refutation (`outcome: refuted`)
When a validation refutes an assumption (`outcome: refuted`):
1. **Record the Validation (`VAL-zzzz`)** with `status: completed`, `outcome: refuted`, and `tests: [ASM-xxxx]`. No `FCT` record is minted.
2. **Update the Assumption (`ASM-xxxx`)** with `status: invalidated` and `validated_by: [VAL-zzzz]`.
3. **Cascade to Dependent Normative Records**: Any `REQ` underpinned by `ASM-xxxx` transitions to `status: broken`, and any dependent `CON`, `ACR`, or `DEC` transitions to `status: needs_review`.

> [!IMPORTANT]
> **Why Immutable Lineage?** Never delete or overwrite an `ASM` record into a `FCT` in place. Keeping `ASM-xxxx` (`status: promoted` or `invalidated`) alongside `VAL-zzzz` and `FCT-yyyy` (`promoted_from: ASM-xxxx`) preserves the exact history of *what we initially assumed* versus *what empirical validation proved*. Submitting the **Fact & validation** capture form (`#/capture/fact`) performs all of these multi-file updates automatically in one pull request.

---

## 2. Cascading Updates to Normative Records

Every `REQ`, `CON`, `ACR`, and `DEC` has an epistemic status governed by its `underpinned_by` links and checked by `tools/validate.py`:

| Underpinning State | Allowed Normative Status | Validator & Ingestion Behavior |
| :--- | :--- | :--- |
| All linked records are `FCT` (`status: active`) | **`active`** (`REQ`, `CON`, `ACR`) or **`accepted`** (`DEC`); starts as **`draft`** / **`proposed`** upon initial capture | Ready for implementation and release gates once reviewed (`active` `REQ`s must also have `verified_by: [ACR-xxxx]`). |
| At least one linked record is an open `ASM` (`unvalidated` or `validating`) | **`provisional`** | Enforced as an **ERROR** by `validate.py` if marked `active` or `accepted`. Blocked from `release_ready` gates when `ASM.risk` is `high`/`critical`. |
| A linked `ASM` transitions to `promoted` (new `FCT` minted) | **`needs_review`** (or current non-broken status with warning) | `validate.py` emits a **WARN** (`still underpinned by promoted assumption(s)`); review the record against the newly minted `FCT-yyyy`, sharpen statements/thresholds, and replace `ASM-xxxx` with `FCT-yyyy` in `underpinned_by`. |
| A linked `ASM` is `invalidated`/`retired` or a linked `FCT` is `deprecated`/`superseded` | **`broken`** (`REQ`) or **`needs_review`** (`CON`, `ACR`, `DEC`) | Enforced as an **ERROR** by `validate.py` unless the record is marked `broken`, `needs_review`, `deprecated`, `superseded`, or `rejected`. Automatically cascaded by `ingest_capture.py` on refutation. |

---

## 3. Spec Readiness Metric

For any Specification Manifest (`SPC-xxxx`), its **Epistemic Readiness Score** (computed by `tools/validate.py` and `site/js/data.js`) is defined as:

$$\text{Epistemic Readiness} = \frac{\text{Number of included REQs with status} \in \{\text{active}, \text{accepted}\}}{\text{Total number of included REQs in composition.requirements}}$$

A specification reaches **`100% Epistemic Readiness`** when every included requirement is `active`—meaning it is underpinned exclusively by active verified Facts (`FCT`) and verified by Acceptance Criteria (`ACR`).

