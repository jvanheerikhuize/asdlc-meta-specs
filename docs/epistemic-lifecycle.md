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
When designing a feature, any unverified premise is recorded in `records/epistemic/assumptions/ASM-xxxx-<slug>.md`:
- `status: unvalidated`
- `confidence`: `0.0` to `1.0` (how sure we are before testing)
- `risk`: `low` | `medium` | `high` | `critical` (impact if the assumption is wrong)
- `validation_plan`: concrete experiment or check required to verify it

### Step 2: Running a Validation (`VAL`)
To test one or more assumptions, create `records/epistemic/validations/VAL-xxxx-<slug>.md`:
- `tests: [ASM-xxxx]`
- `method`: e.g., `benchmark`, `prototype_spike`, `user_research`, `documentation_audit`
- `outcome`:
  - `confirmed`: The assumption holds as stated.
  - `refined`: The core premise holds, but with sharper quantitative or qualitative boundaries.
  - `refuted`: The assumption is false.

### Step 3: Immutable Promotion (`ASM` $\rightarrow$ `FCT`)
When a validation completes with `outcome: confirmed` or `outcome: refined`:
1. **Mint a new Fact (`FCT-yyyy`)** in `records/epistemic/facts/` with:
   - `status: active`
   - `source: empirical_validation`
   - `promoted_from: ASM-xxxx`
   - `evidence: [VAL-zzzz]`
2. **Update the original Assumption (`ASM-xxxx`)** with:
   - `status: promoted`
   - `validated_by: [VAL-zzzz]`
   - `promoted_to: [FCT-yyyy]`

> [!IMPORTANT]
> **Why Immutable Lineage?** Never delete or overwrite an `ASM` record into a `FCT` in place. Keeping `ASM-xxxx` (`status: promoted`) alongside `FCT-yyyy` (`promoted_from: ASM-xxxx`) preserves the exact history of *what we initially assumed* versus *what empirical validation proved*.

---

## 2. Cascading Updates to Normative Records

Every `REQ`, `CON`, and `DEC` has a computed or explicit **Epistemic Readiness State** based on its `underpinned_by` links:

| Underpinning State | Normative Record Status | Action Required |
| :--- | :--- | :--- |
| All linked records are `FCT` (`status: active`) | **`active`** | Ready for implementation and release gates. |
| At least one linked record is `ASM` (`unvalidated` or `validating`) | **`provisional`** | Allowed in draft/spike phases; blocked from strict release gates if `ASM.risk` is `high`/`critical`. |
| A linked `ASM` transitions to `promoted` (new `FCT` minted) | **`needs_review`** | Review the requirement against the newly minted `FCT-yyyy`, sharpen the requirement & acceptance criteria, and replace `ASM-xxxx` with `FCT-yyyy` in `underpinned_by`. |
| A linked `ASM` transitions to `invalidated` (or `FCT` is `deprecated`) | **`broken`** | Immediate halt/re-architecture required; the premise justifying this requirement is false. |

---

## 3. Spec Readiness Metric

For any Specification Manifest (`SPC-xxxx`), its **Epistemic Readiness Score** is defined as:

$$\text{Epistemic Readiness} = \frac{\text{Number of included REQs with status = active}}{\text{Total number of included REQs}}$$

A specification reaches **`100% Epistemic Readiness`** when every included requirement and decision is underpinned exclusively by verified Facts (`FCT`) and verified by active Acceptance Criteria (`ACR`).
