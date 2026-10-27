#!/usr/bin/env python3
"""
ASDLC Meta-Specs Projection Compiler.

Compiles the canonical tech-stack-agnostic record graph (SPC, CHG, CON, REQ, ACR, DEC, FCT, ASM)
through adapter definitions in adapters/*/mapping.yaml and Handlebars templates (.hbs) into
target specification standards under dist/ (OpenSpec, GitHub Spec Kit).

Optionally binds an external Tech-Stack Profile (--stack-profile <yaml>) into technical plans.

Usage:
  python tools/project.py
  python tools/project.py --check
  python tools/project.py --adapter openspec
  python tools/project.py --stack-profile path/to/stack-profile.yaml
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

import yaml

from recordlib import ROOT, iter_record_files, load_config, parse_record, sections


# ---------------------------------------------------------------------------
# Minimal, Dependency-Free Handlebars (.hbs) Compiler
# ---------------------------------------------------------------------------

STANDALONE_TAG_RE = re.compile(
    r"(?m)^[ \t]*(\{\{(?:#(?:each|if|unless)\s+[^}]+|else|/(?:each|if|unless))\}\})[ \t]*\r?\n"
)
TOKEN_RE = re.compile(r"(\{\{!--.*?--\}\}|\{\{!.*?\}\}|\{\{#(?:each|if|unless)\s+[^}]+\}\}|\{\{else\}\}|\{\{/(?:each|if|unless)\}\}|\{\{[^}]+\}\})", re.S)


def _preprocess_standalone_tags(template: str) -> str:
    """Strip trailing newlines from block control tags that appear alone on a line (Handlebars standalone rule)."""
    return STANDALONE_TAG_RE.sub(r"\1", template)


def _resolve_path(expr: str, stack: list[Any], loop_meta: dict[str, Any] | None) -> Any:
    expr = expr.strip()
    if expr.startswith("@"):
        return (loop_meta or {}).get(expr[1:])
    if expr == "this":
        return stack[-1] if stack else ""
    if expr.startswith("this."):
        cur = stack[-1] if stack else {}
        for part in expr[5:].split("."):
            if isinstance(cur, dict):
                cur = cur.get(part)
            else:
                cur = getattr(cur, part, None)
            if cur is None:
                return None
        return cur

    parts = expr.split(".")
    for scope in reversed(stack):
        if isinstance(scope, dict) and parts[0] in scope:
            cur = scope[parts[0]]
            for part in parts[1:]:
                if isinstance(cur, dict):
                    cur = cur.get(part)
                else:
                    cur = getattr(cur, part, None)
                if cur is None:
                    break
            return cur
    return None


def _is_truthy(val: Any) -> bool:
    if val is None or val is False:
        return False
    if isinstance(val, (list, dict, str, set, tuple)) and len(val) == 0:
        return False
    return True


def _parse_hbs(tokens: list[str], pos: int = 0, stop_tags: tuple[str, ...] = ()) -> tuple[list[Any], int, str | None]:
    ast: list[Any] = []
    while pos < len(tokens):
        tok = tokens[pos]
        if not tok:
            pos += 1
            continue
        if tok.startswith("{{!"):
            pos += 1
            continue
        if tok in stop_tags:
            return ast, pos + 1, tok
        if tok.startswith("{{#each "):
            expr = tok[8:-2].strip()
            body, pos, end_tag = _parse_hbs(tokens, pos + 1, ("{{/each}}",))
            if end_tag != "{{/each}}":
                raise ValueError(f"Unclosed {{{{#each {expr}}}}} block")
            ast.append(("each", expr, body))
            continue
        elif tok.startswith("{{#if ") or tok.startswith("{{#unless "):
            is_unless = tok.startswith("{{#unless ")
            expr = tok[10 if is_unless else 6 : -2].strip()
            end_marker = "{{/unless}}" if is_unless else "{{/if}}"
            true_branch, pos, mid_tag = _parse_hbs(tokens, pos + 1, ("{{else}}", end_marker))
            false_branch: list[Any] = []
            if mid_tag == "{{else}}":
                false_branch, pos, end_tag = _parse_hbs(tokens, pos, (end_marker,))
                if end_tag != end_marker:
                    raise ValueError(f"Unclosed block for {expr}")
            elif mid_tag != end_marker:
                raise ValueError(f"Unclosed block for {expr}")
            ast.append(("cond", is_unless, expr, true_branch, false_branch))
            continue
        elif tok.startswith("{{") and tok.endswith("}}"):
            expr = tok[2:-2].strip()
            ast.append(("var", expr))
        else:
            ast.append(("text", tok))
        pos += 1
    if stop_tags:
        raise ValueError(f"Expected one of {stop_tags}, reached end of template")
    return ast, pos, None


def _eval_hbs(ast: list[Any], stack: list[Any], loop_meta: dict[str, Any] | None = None) -> str:
    out: list[str] = []
    for node in ast:
        kind = node[0]
        if kind == "text":
            out.append(node[1])
        elif kind == "var":
            val = _resolve_path(node[1], stack, loop_meta)
            if val is not None:
                out.append(str(val))
        elif kind == "each":
            _, expr, body = node
            items = _resolve_path(expr, stack, loop_meta)
            if isinstance(items, list) and items:
                total = len(items)
                for idx, item in enumerate(items):
                    meta = {"index": idx, "first": idx == 0, "last": idx == total - 1}
                    stack.append(item)
                    out.append(_eval_hbs(body, stack, meta))
                    stack.pop()
        elif kind == "cond":
            _, is_unless, expr, true_branch, false_branch = node
            val = _resolve_path(expr, stack, loop_meta)
            cond = (not _is_truthy(val)) if is_unless else _is_truthy(val)
            branch = true_branch if cond else false_branch
            if branch:
                out.append(_eval_hbs(branch, stack, loop_meta))
    return "".join(out)


def render_hbs(template_str: str, context: dict[str, Any]) -> str:
    preprocessed = _preprocess_standalone_tags(template_str)
    tokens = TOKEN_RE.split(preprocessed)
    ast, _, _ = _parse_hbs(tokens)
    rendered = _eval_hbs(ast, [context])
    # Clean up excessive blank lines (more than 2 consecutive newlines -> 2 newlines)
    rendered = re.sub(r"\n{3,}", "\n\n", rendered)
    return rendered.strip() + "\n"


# ---------------------------------------------------------------------------
# Canonical Graph Loading & Context Builders
# ---------------------------------------------------------------------------

def load_canonical_graph(root: Path, config: dict) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    for type_name, path in iter_record_files(config, root):
        meta, body = parse_record(path)
        rid = meta["id"]
        sec = sections(body)
        slug = re.sub(r"^[A-Z]+-\d{4}-", "", path.stem)
        num_match = re.search(r"-(\d{4})$", rid)
        feature_number = f"{int(num_match.group(1)):03d}" if num_match else "000"
        records[rid] = {
            **meta,
            "_type_name": type_name,
            "_path": path,
            "_body": body,
            "_sections": sec,
            "file_slug": slug,
            "feature_number": feature_number,
        }
    return records


def _first_matching_section(sec: dict[str, str], prefix: str, fallback: str = "") -> str:
    if prefix.endswith("*"):
        p = prefix[:-1]
        for k, v in sec.items():
            if k.startswith(p):
                return v
    elif prefix in sec:
        return sec[prefix]
    return fallback


def _build_criterion(acr: dict[str, Any]) -> dict[str, Any]:
    sec = acr["_sections"]
    scenario_body = _first_matching_section(sec, "Scenario*", sec.get("Statement", acr["_body"].strip()))
    return {
        **acr,
        "scenario_body": scenario_body,
    }


def _build_requirement(
    req: dict[str, Any],
    records: dict[str, dict[str, Any]],
    allowed_criteria: set[str] | None = None,
) -> dict[str, Any]:
    sec = req["_sections"]
    crit_ids = req.get("verified_by") or []
    if allowed_criteria is not None:
        filtered = [cid for cid in crit_ids if cid in allowed_criteria]
        if filtered:
            crit_ids = filtered
    criteria = [_build_criterion(records[cid]) for cid in crit_ids if cid in records]

    unvalidated = []
    for uid in req.get("underpinned_by") or []:
        u = records.get(uid)
        if u and u.get("type") == "assumption" and u.get("status") in ("unvalidated", "validating"):
            unvalidated.append(u)

    return {
        **req,
        "statement": sec.get("Statement", ""),
        "rationale": sec.get("Rationale", ""),
        "criteria": criteria,
        "unvalidated_assumptions": unvalidated,
        "has_unvalidated_assumptions": len(unvalidated) > 0,
    }


def _build_constraint(con: dict[str, Any]) -> dict[str, Any]:
    sec = con["_sections"]
    return {
        **con,
        "statement": sec.get("Statement", ""),
        "rationale": sec.get("Rationale", ""),
    }


def _build_fact(fct: dict[str, Any]) -> dict[str, Any]:
    sec = fct["_sections"]
    stmt = sec.get("Statement", "")
    return {
        **fct,
        "statement": stmt,
        "summary": stmt,
    }


def _build_assumption(asm: dict[str, Any]) -> dict[str, Any]:
    sec = asm["_sections"]
    return {
        **asm,
        "statement": sec.get("Statement", ""),
    }


def _build_decision(dec: dict[str, Any]) -> dict[str, Any]:
    sec = dec["_sections"]
    return {
        **dec,
        "body": sec.get("Decision", dec["_body"].strip()),
    }


def _load_stack_profile(profile_path: Path | None) -> dict[str, Any] | None:
    if not profile_path:
        return None
    raw = yaml.safe_load(profile_path.read_text(encoding="utf-8")) or {}
    name = raw.get("name") or profile_path.stem
    bindings_raw = raw.get("bindings") or raw.get("stack") or {}
    bindings: list[dict[str, str]] = []
    if isinstance(bindings_raw, dict):
        for k, v in bindings_raw.items():
            bindings.append({"category": str(k), "value": str(v)})
    elif isinstance(bindings_raw, list):
        for item in bindings_raw:
            if isinstance(item, dict) and "category" in item and "value" in item:
                bindings.append({"category": str(item["category"]), "value": str(item["value"])})
    return {"name": name, "bindings": bindings, "raw": raw}


def build_spec_context(
    spc: dict[str, Any],
    records: dict[str, dict[str, Any]],
    stack_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    comp = spc.get("composition") or {}
    con_ids = comp.get("constraints") or []
    req_ids = comp.get("requirements") or []
    acr_ids = comp.get("criteria") or []
    dec_ids = comp.get("decisions") or []

    allowed_acr = set(acr_ids) if acr_ids else None
    constraints = [_build_constraint(records[cid]) for cid in con_ids if cid in records]
    requirements = [_build_requirement(records[rid], records, allowed_acr) for rid in req_ids if rid in records]
    criteria = [_build_criterion(records[cid]) for cid in acr_ids if cid in records]
    decisions = [_build_decision(records[did]) for did in dec_ids if did in records]

    # Compute Epistemic Readiness percentage
    if requirements:
        active_reqs = sum(1 for r in requirements if r.get("status") in ("active", "accepted"))
        pct = round(100 * active_reqs / len(requirements))
        epistemic_readiness = f"{pct}%"
    else:
        epistemic_readiness = "100%"

    # Collect underpinning Facts and open Assumptions across composed records
    composed_records = [records[i] for i in (con_ids + req_ids + acr_ids + dec_ids) if i in records]
    fact_ids: list[str] = []
    open_asm_dependents: dict[str, list[str]] = {}
    for rec in composed_records:
        for uid in rec.get("underpinned_by") or []:
            u = records.get(uid)
            if not u:
                continue
            if u.get("type") == "fact" and uid not in fact_ids:
                fact_ids.append(uid)
            elif u.get("type") == "assumption" and u.get("status") in ("unvalidated", "validating"):
                open_asm_dependents.setdefault(uid, [])
                if rec["id"] not in open_asm_dependents[uid]:
                    open_asm_dependents[uid].append(rec["id"])

    facts = [_build_fact(records[fid]) for fid in sorted(fact_ids)]
    assumptions = [_build_assumption(records[aid]) for aid in sorted(open_asm_dependents)]

    # Gate checks for Spec Kit technical_plan
    all_cons_active = all(c.get("status") == "active" for c in constraints)
    constitution_gate_status = "PASS" if all_cons_active else "WARN (PROVISIONAL)"

    if assumptions:
        epistemic_gate_status = "WARN (PROVISIONAL)"
        summaries: list[str] = []
        for asm in assumptions:
            aid = asm["id"]
            deps = open_asm_dependents.get(aid, [])
            if len(deps) == 1:
                dep_str = f"`{deps[0]}`"
            elif len(deps) == 2:
                dep_str = f"`{deps[0]}` and `{deps[1]}`"
            else:
                dep_str = ", ".join(f"`{d}`" for d in deps[:-1]) + f", and `{deps[-1]}`"
            summaries.append(f"`{aid}` (risk: `{asm.get('risk', 'unknown')}`) underpins {dep_str}")
        unvalidated_high_risk_summary = "; ".join(summaries)
    else:
        epistemic_gate_status = "PASS"
        unvalidated_high_risk_summary = "None (all assumptions validated)"

    return {
        **spc,
        "purpose": spc["_sections"].get("Purpose", ""),
        "epistemic_readiness": epistemic_readiness,
        "constraints": constraints,
        "requirements": requirements,
        "criteria": criteria,
        "decisions": decisions,
        "facts": facts,
        "assumptions": assumptions,
        "constitution_gate_status": constitution_gate_status,
        "epistemic_gate_status": epistemic_gate_status,
        "unvalidated_high_risk_summary": unvalidated_high_risk_summary,
        "stack_profile": stack_profile,
    }


def build_change_context(chg: dict[str, Any], records: dict[str, dict[str, Any]]) -> dict[str, Any]:
    deltas = chg.get("deltas") or {}
    target_spec = records.get(chg.get("target_spec", ""))
    domain = chg.get("domain") or (target_spec.get("domain") if target_spec else "general")

    def _resolve_delta_reqs(id_list: list[str]) -> list[dict[str, Any]]:
        acr_in_delta = {i for i in id_list if i in records and records[i].get("type") == "criterion"}
        allowed_acr = acr_in_delta if acr_in_delta else None
        out = []
        for rid in id_list:
            r = records.get(rid)
            if r and r.get("type") == "requirement":
                built = _build_requirement(r, records, allowed_acr)
                built["removal_reason"] = chg["_sections"].get("Why (Motivation)", "Removed by change proposal.")
                out.append(built)
        return out

    return {
        **chg,
        "domain": domain,
        "added_requirements": _resolve_delta_reqs(deltas.get("added") or []),
        "modified_requirements": _resolve_delta_reqs(deltas.get("modified") or []),
        "removed_requirements": _resolve_delta_reqs(deltas.get("removed") or []),
    }


def build_constitution_context(records: dict[str, dict[str, Any]]) -> dict[str, Any]:
    constraints = [
        _build_constraint(r)
        for _, r in sorted(records.items())
        if r.get("type") == "constraint" and r.get("status") == "active"
    ]
    facts = [
        _build_fact(r)
        for _, r in sorted(records.items())
        if r.get("type") == "fact" and r.get("status") == "active"
    ]
    return {
        "constraints": constraints,
        "facts": facts,
    }


# ---------------------------------------------------------------------------
# Projection Compiler Execution
# ---------------------------------------------------------------------------

def compile_projections(
    root: Path = ROOT,
    out_root: Path | None = None,
    adapter_filter: str | None = None,
    stack_profile_path: Path | None = None,
) -> dict[Path, str]:
    """
    Compile all enabled adapters and return a mapping of {target_file_path: rendered_content}.
    Does not write to disk directly so callers can either write or run --check diffs.
    """
    config = load_config(root)
    records = load_canonical_graph(root, config)
    stack_profile = _load_stack_profile(stack_profile_path)
    base_out = out_root if out_root is not None else root

    specs = [r for _, r in sorted(records.items()) if r.get("type") == "spec"]
    changes = [r for _, r in sorted(records.items()) if r.get("type") == "change"]

    outputs: dict[Path, str] = {}

    for adapter_name, adapter_cfg in (config.get("adapters") or {}).items():
        if not adapter_cfg.get("enabled", False):
            continue
        if adapter_filter and adapter_name != adapter_filter:
            continue

        mapping_path = root / adapter_cfg["config_path"]
        mapping_dir = mapping_path.parent
        mapping = yaml.safe_load(mapping_path.read_text(encoding="utf-8"))
        adapter_out_dir = base_out / adapter_cfg.get("output_dir", mapping.get("output_root", f"dist/{adapter_name}"))

        for proj_name, proj in (mapping.get("projections") or {}).items():
            source_type = proj["source_type"]
            pattern = proj["output_path_pattern"]
            template_str = (mapping_dir / proj["template"]).read_text(encoding="utf-8")

            if source_type == "spec":
                for spc in specs:
                    ctx = build_spec_context(spc, records, stack_profile=stack_profile)
                    rel_out = render_hbs(pattern, ctx).strip()
                    outputs[adapter_out_dir / rel_out] = render_hbs(template_str, ctx)
            elif source_type == "change":
                for chg in changes:
                    ctx = build_change_context(chg, records)
                    rel_out = render_hbs(pattern, ctx).strip()
                    outputs[adapter_out_dir / rel_out] = render_hbs(template_str, ctx)
            elif source_type == "constraint":
                ctx = build_constitution_context(records)
                rel_out = render_hbs(pattern, ctx).strip()
                outputs[adapter_out_dir / rel_out] = render_hbs(template_str, ctx)
            else:
                raise ValueError(f"Unsupported projection source_type '{source_type}' in {adapter_name}.{proj_name}")

    return outputs


def main() -> int:
    ap = argparse.ArgumentParser(description="Compile canonical records into target standard projections (dist/).")
    ap.add_argument("--root", type=Path, default=ROOT, help="Repository root directory")
    ap.add_argument("--out-root", type=Path, default=None, help="Override base directory for output_dir paths")
    ap.add_argument("--adapter", choices=["openspec", "speckit"], default=None, help="Compile only a single adapter")
    ap.add_argument("--stack-profile", type=Path, default=None, help="Optional YAML tech-stack profile (PSM)")
    ap.add_argument("--check", action="store_true", help="Verify that files on disk match compiled output without writing")
    args = ap.parse_args()

    root = args.root.resolve()
    out_root = args.out_root.resolve() if args.out_root else root
    outputs = compile_projections(
        root=root,
        out_root=out_root,
        adapter_filter=args.adapter,
        stack_profile_path=args.stack_profile,
    )

    if args.check:
        stale: list[str] = []
        for path, expected in sorted(outputs.items()):
            rel = path.relative_to(out_root) if path.is_relative_to(out_root) else path
            if not path.exists():
                stale.append(f"MISSING  {rel}")
            elif path.read_text(encoding="utf-8") != expected:
                stale.append(f"OUTDATED {rel}")
        if stale:
            for item in stale:
                print(item)
            print(f"RESULT: FAIL ({len(stale)} projected file(s) out of sync; run 'python tools/project.py')")
            return 1
        print(f"Verified {len(outputs)} projected file(s) in dist/.")
        print("RESULT: PASS")
        return 0

    for path, content in sorted(outputs.items()):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        rel = path.relative_to(out_root) if path.is_relative_to(out_root) else path
        print(f"Wrote {rel}")

    print(f"Compiled {len(outputs)} projected artifact(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
