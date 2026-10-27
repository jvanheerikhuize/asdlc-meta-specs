#!/usr/bin/env python3
"""
Validate the canonical meta-spec record graph.

Checks performed:
  1. Frontmatter parses and validates against its JSON schema (schema/*.schema.json).
  2. File naming: filename starts with the record ID and lives in the directory configured for its type.
  3. IDs are unique and every reference resolves to an existing record.
  4. Reciprocal links are consistent (e.g. ASM.promoted_to <-> FCT.promoted_from).
  5. Epistemic consistency: a normative record's status matches the state of what underpins it.
  6. Reports Epistemic Readiness per specification manifest (SPC).

Usage:  python tools/validate.py [--strict] [--root PATH]   (--strict turns warnings into errors)
Exit code is non-zero when errors are found.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recordlib import ROOT as DEFAULT_ROOT, iter_record_files, parse_record, sections  # noqa: E402
from recordlib import load_config as _load_config  # noqa: E402

ROOT = DEFAULT_ROOT

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def load_config() -> dict:
    return _load_config(ROOT)


def load_schemas() -> tuple[dict, Registry]:
    schemas, registry = {}, Registry()
    for path in sorted((ROOT / "schema").glob("*.schema.json")):
        schema = json.loads(path.read_text())
        Draft202012Validator.check_schema(schema)
        schemas[path.name] = schema
        resource = Resource.from_contents(schema)
        registry = registry.with_resources([(schema["$id"], resource), (f"./{path.name}", resource)])
    return schemas, registry


def load_records(config: dict) -> dict[str, tuple[Path, dict, str]]:
    records: dict[str, tuple[Path, dict, str]] = {}
    for type_name, path in iter_record_files(config, ROOT):
        rel = path.relative_to(ROOT)
        try:
            meta, body = parse_record(path)
        except ValueError as exc:
            err(f"{rel}: {exc}")
            continue
        rid = meta.get("id")
        if not rid:
            err(f"{rel}: missing 'id'")
            continue
        if meta.get("type") != type_name:
            err(f"{rel}: type '{meta.get('type')}' does not belong in {config['records']['types'][type_name]['directory']} (expected '{type_name}')")
        if not path.name.startswith(f"{rid}-"):
            err(f"{rel}: filename must start with '{rid}-'")
        if rid in records:
            err(f"{rel}: duplicate id {rid} (also in {records[rid][0]})")
            continue
        records[rid] = (rel, meta, body)
    return records


def validate_schemas(records, schemas, registry, config) -> None:
    by_type = {t: Path(s["schema"]).name for t, s in config["records"]["types"].items()}
    for rid, (rel, meta, _) in records.items():
        schema = schemas.get(by_type.get(meta.get("type"), ""))
        if schema is None:
            err(f"{rel}: no schema for type '{meta.get('type')}'")
            continue
        for e in Draft202012Validator(schema, registry=registry).iter_errors(meta):
            loc = ".".join(str(p) for p in e.path) or "<root>"
            err(f"{rel}: schema [{loc}] {e.message}")


LIST_LINKS = [
    "validated_by", "promoted_to", "tests", "establishes", "evidence", "supersedes",
    "underpinned_by", "governed_by", "verified_by", "verifies", "satisfies",
]


def references(meta: dict):
    for field in LIST_LINKS:
        for target in meta.get(field) or []:
            yield field, target
    for field in ("promoted_from", "target_spec", "parent"):
        if meta.get(field):
            yield field, meta[field]
    for group, targets in (meta.get("composition") or {}).items():
        for target in targets or []:
            yield f"composition.{group}", target
    for group, targets in (meta.get("deltas") or {}).items():
        for target in targets or []:
            yield f"deltas.{group}", target


def validate_references(records) -> None:
    for rid, (rel, meta, _) in records.items():
        for field, target in references(meta):
            if target not in records:
                err(f"{rel}: {field} -> {target} does not exist")


def reciprocal(records, src_field: str, dst_field: str, label: str) -> None:
    """If A.src_field contains B, then B.dst_field must contain A (and vice versa)."""
    def as_list(v):
        return v if isinstance(v, list) else ([v] if v else [])

    for rid, (rel, meta, _) in records.items():
        for target in as_list(meta.get(src_field)):
            if target in records and rid not in as_list(records[target][1].get(dst_field)):
                err(f"{rel}: {src_field} -> {target}, but {target}.{dst_field} does not reference {rid} ({label})")
        for target in as_list(meta.get(dst_field)):
            if target in records and rid not in as_list(records[target][1].get(src_field)):
                err(f"{rel}: {dst_field} -> {target}, but {target}.{src_field} does not reference {rid} ({label})")


def validate_reciprocity(records) -> None:
    reciprocal(records, "promoted_to", "promoted_from", "promotion lineage")
    reciprocal(records, "validated_by", "tests", "validation coverage")
    reciprocal(records, "establishes", "evidence", "fact evidence")
    reciprocal(records, "verified_by", "verifies", "acceptance coverage")


OPEN_ASM = {"unvalidated", "validating"}
ACTIVE_STATES = {"active", "accepted"}


def epistemic_state(records, rid: str) -> str:
    """Return 'verified', 'open', 'promoted', or 'broken' for an underpinning record."""
    meta = records[rid][1]
    if meta["type"] == "fact":
        return "verified" if meta.get("status") == "active" else "broken"
    status = meta.get("status")
    if status in OPEN_ASM:
        return "open"
    if status == "promoted":
        return "promoted"
    return "broken"  # invalidated / retired


def validate_epistemics(records, config) -> None:
    rules = config.get("epistemic_rules", {})
    for rid, (rel, meta, _) in records.items():
        if meta.get("type") not in {"constraint", "requirement", "criterion", "decision"}:
            continue
        states = {u: epistemic_state(records, u) for u in meta.get("underpinned_by") or [] if u in records}
        status = meta.get("status")
        if any(s == "broken" for s in states.values()) and status not in {"broken", "needs_review", "deprecated", "superseded", "rejected"}:
            bad = [u for u, s in states.items() if s == "broken"]
            err(f"{rel}: underpinned by invalidated/deprecated {bad} but status is '{status}' (expected broken/needs_review)")
        if any(s == "open" for s in states.values()) and status in ACTIVE_STATES:
            bad = [u for u, s in states.items() if s == "open"]
            err(f"{rel}: status '{status}' but underpinned by unvalidated assumption(s) {bad} (expected provisional)")
        if any(s == "promoted" for s in states.values()):
            promoted = [u for u, s in states.items() if s == "promoted"]
            warn(f"{rel}: still underpinned by promoted assumption(s) {promoted}; replace with the resulting fact(s) and review")
        if (meta.get("type") == "requirement" and status in ACTIVE_STATES
                and rules.get("require_criteria_for_active_requirements") and not meta.get("verified_by")):
            err(f"{rel}: active requirement has no acceptance criteria (verified_by)")


STACK_AGNOSTIC_TYPES = {"constraint", "requirement", "criterion", "spec", "change"}
STACK_AGNOSTIC_SECTIONS = ("Statement", "Scenario", "Purpose", "What Changes")


def validate_tech_agnostic(records, config) -> None:
    rules = config.get("epistemic_rules", {})
    if not rules.get("enforce_tech_stack_agnostic_specs"):
        return
    terms = [t.strip() for t in (rules.get("forbidden_tech_terms") or []) if t.strip()]
    if not terms:
        return
    pattern = re.compile(r"(?<![\w-])(" + "|".join(re.escape(t) for t in terms) + r")(?![\w-])", re.I)
    for rid, (rel, meta, body) in records.items():
        rtype = meta.get("type")
        if rtype not in STACK_AGNOSTIC_TYPES:
            continue
        secs = sections(body)
        checked_text = " ".join([
            str(meta.get("title", "")),
            *(text for heading, text in secs.items() if heading.startswith(STACK_AGNOSTIC_SECTIONS)),
        ])
        hits = sorted({m.group(1).lower() for m in pattern.finditer(checked_text)})
        if hits:
            warn(f"{rel}: tech-stack term(s) {hits} found in stack-agnostic {rtype}; keep tech-stack choices in DEC or external stack config")


def readiness_report(records) -> list[str]:
    lines = []
    for rid, (rel, meta, _) in sorted(records.items()):
        if meta.get("type") != "spec":
            continue
        reqs = (meta.get("composition") or {}).get("requirements") or []
        active = [r for r in reqs if r in records and records[r][1].get("status") in ACTIVE_STATES]
        score = (len(active) / len(reqs) * 100) if reqs else 0.0
        lines.append(f"  {rid} ({meta.get('title')}): {score:.0f}% epistemic readiness ({len(active)}/{len(reqs)} requirements active)")
    return lines


def main() -> int:
    global ROOT
    strict = "--strict" in sys.argv
    if "--root" in sys.argv:
        ROOT = Path(sys.argv[sys.argv.index("--root") + 1]).resolve()
    config = load_config()
    schemas, registry = load_schemas()
    records = load_records(config)
    validate_schemas(records, schemas, registry, config)
    validate_references(records)
    validate_reciprocity(records)
    validate_epistemics(records, config)
    validate_tech_agnostic(records, config)

    print(f"Checked {len(records)} records against {len(schemas)} schemas.")
    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    report = readiness_report(records)
    if report:
        print("Epistemic readiness:")
        print("\n".join(report))

    failed = bool(errors) or (strict and bool(warnings))
    print("RESULT:", "FAIL" if failed else "PASS", f"({len(errors)} errors, {len(warnings)} warnings)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
