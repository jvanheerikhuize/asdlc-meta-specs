#!/usr/bin/env python3
"""One tool for the whole record graph.

    python tools/spec.py check [--strict] [--verify DIR]  validate links, epistemic gates, open questions, spec DAG, traceability
    python tools/spec.py impact <ID>               what must be revisited when <ID> changes
    python tools/spec.py render [--tier T] [--format markdown|gherkin|openspec|speckit] [--stack FILE] [--out DIR]
    python tools/spec.py index [--out FILE]        write the JSON the Pages site reads
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
RECORDS = ROOT / "records"

TYPES = {"ASM": "assumption", "FCT": "fact", "QST": "question", "REQ": "requirement", "SPC": "spec"}
STATUSES = {
    "ASM": {"open", "validated", "invalidated"},
    "FCT": {"active", "deprecated"},
    "QST": {"open", "answered"},
    "REQ": {"provisional", "active", "broken"},
    "SPC": {"draft", "active"},
}
ID_RE = re.compile(r"^(ASM|FCT|QST|REQ|SPC)-\d{4}$")

# Specs describe *what*, never *with what*. Concrete stacks are bound at render time.
STACK_TERMS = [
    "postgres", "postgresql", "mysql", "sqlite", "mongodb", "redis", "kafka", "rabbitmq",
    "react", "vue", "angular", "svelte", "django", "flask", "fastapi", "spring", "rails",
    "node.js", "nodejs", "typescript", "javascript", "python", "java", "golang",
    "docker", "kubernetes", "aws", "azure", "gcp", "graphql", "grpc", "json schema",
]
STACK_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(t) for t in STACK_TERMS) + r")(?![\w-])", re.I)


SCENARIO_STEP_RE = re.compile(r"^(given|when|then|and|but)\b\s+\S", re.I)


def valid_scenario(sc: list[str]) -> bool:
    if not sc or not all(SCENARIO_STEP_RE.match(ln) for ln in sc):
        return False
    kws = {ln.split(None, 1)[0].lower() for ln in sc}
    return {"given", "when", "then"} <= kws


class Record:
    def __init__(self, path: Path, meta: dict, body: str):
        self.path, self.meta, self.body = path, meta, body
        self.id = str(meta.get("id", ""))
        self.prefix = self.id[:3]
        self.status = meta.get("status")
        self.title = meta.get("title", "")

    def links(self) -> list[str]:
        out = []
        for key in ("because", "requirements", "depends_on", "blocks"):
            out += self.meta.get(key) or []
        for key in ("promoted_to", "promoted_from", "answered_by"):
            if self.meta.get(key):
                out.append(self.meta[key])
        return out

    def section(self, heading: str) -> str:
        m = re.search(rf"^## {re.escape(heading)}\s*$(.*?)(?=^## |\Z)", self.body, re.M | re.S)
        return m.group(1).strip() if m else ""

    def scenarios(self) -> list[list[str]]:
        blocks = re.split(r"\n\s*\n", self.section("Acceptance"))
        return [[ln.strip().lstrip("-").strip() for ln in b.splitlines() if ln.strip()] for b in blocks if b.strip()]


def load(root: Path = RECORDS) -> dict[str, Record]:
    records: dict[str, Record] = {}
    for path in sorted(root.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
        if not m:
            raise SystemExit(f"{path.name}: missing YAML frontmatter")
        rec = Record(path, yaml.safe_load(m.group(1)) or {}, m.group(2))
        if rec.id in records:
            raise SystemExit(f"{path.name}: duplicate id {rec.id}")
        records[rec.id] = rec
    return records


def check(records: dict[str, Record]) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    err = lambda r, msg: errors.append(f"{r.path.name}: {msg}")
    warn = lambda r, msg: warnings.append(f"{r.path.name}: {msg}")

    for r in records.values():
        # 1. Shape
        if not ID_RE.match(r.id):
            err(r, f"bad id {r.id!r}")
            continue
        if not r.path.name.startswith(r.id + "-"):
            err(r, f"filename must start with '{r.id}-'")
        if not str(r.title).strip():
            err(r, "missing title")
        if r.status not in STATUSES[r.prefix]:
            err(r, f"status {r.status!r} not in {sorted(STATUSES[r.prefix])}")
        for link in r.links():
            if link not in records:
                err(r, f"links to unknown record {link}")

        # 2. Assumptions are promoted to facts, both sides agree
        if r.prefix == "ASM":
            if not r.section("How we validate it"):
                err(r, "assumption must have a non-empty '## How we validate it' section")
            conf = r.meta.get("confidence")
            if conf is not None:
                try:
                    if isinstance(conf, bool) or not (0.0 <= float(conf) <= 1.0):
                        raise ValueError
                except (TypeError, ValueError):
                    err(r, f"confidence {conf!r} must be a number between 0 and 1")
            target = r.meta.get("promoted_to")
            if r.status == "validated" and not target:
                err(r, "validated assumption must name the fact it was promoted_to")
            if r.status != "validated" and target:
                err(r, "non-validated assumption cannot declare promoted_to")
            if target in records:
                if records[target].prefix != "FCT":
                    err(r, f"'promoted_to' must be a fact, not {target}")
                elif records[target].meta.get("promoted_from") != r.id:
                    err(r, f"{target} must declare promoted_from: {r.id}")
        if r.prefix == "FCT":
            if not r.meta.get("evidence"):
                err(r, "a fact needs evidence")
            source = r.meta.get("promoted_from")
            if source in records:
                if records[source].prefix != "ASM":
                    err(r, f"'promoted_from' must be an assumption, not {source}")
                elif records[source].status != "validated":
                    err(r, f"promoted from {source}, which is not validated")
                elif records[source].meta.get("promoted_to") != r.id:
                    err(r, f"{source} must declare promoted_to: {r.id}")
            review = r.meta.get("review_after")
            if review:
                review_str = review.isoformat() if isinstance(review, date) else str(review)
                try:
                    if not re.match(r"^\d{4}-\d{2}-\d{2}$", review_str):
                        raise ValueError
                    review_date = date.fromisoformat(review_str)
                    if date.today() > review_date:
                        warn(r, f"fact is past review date {review_date.isoformat()} and may be stale")
                except ValueError:
                    err(r, f"invalid review_after date format {review!r} (expected YYYY-MM-DD)")

        # 3. Open questions: a gap we know about, with no candidate answer yet
        if r.prefix == "QST":
            blocked = r.meta.get("blocks") or []
            answer = r.meta.get("answered_by")
            if not blocked:
                err(r, "a question must say which requirements or specs it 'blocks'")
            for b in blocked:
                if b in records and records[b].prefix not in ("REQ", "SPC"):
                    err(r, f"'blocks' may only list requirements or specs, not {b}")
            if r.status == "answered" and not answer:
                err(r, "answered question must name the fact or assumption it was answered_by")
            if r.status == "open" and answer:
                err(r, "open question cannot be answered_by anything yet -> status 'answered'")
            if answer in records:
                if records[answer].prefix not in ("FCT", "ASM"):
                    err(r, f"'answered_by' must be a fact or assumption, not {answer}")
                for b in blocked:
                    if b in records and records[b].prefix == "REQ" and answer not in (records[b].meta.get("because") or []):
                        warn(r, f"answered by {answer}, but {b} does not cite it in 'because'")

        # 4. Epistemic gate: a requirement is only as solid as what it rests on
        if r.prefix == "REQ":
            if not r.section("Statement"):
                err(r, "requirement must have a non-empty '## Statement' section")
            grounds = [records[g] for g in r.meta.get("because") or [] if g in records]
            if not r.meta.get("because"):
                err(r, "requirement must say 'because' (facts and/or assumptions)")
            for g in grounds:
                if g.prefix not in ("FCT", "ASM"):
                    err(r, f"'because' may only cite facts or assumptions, not {g.id}")
            shaky = [g.id for g in grounds if g.prefix == "ASM" and g.status == "open"]
            dead = [g.id for g in grounds if (g.prefix, g.status) in {("ASM", "invalidated"), ("FCT", "deprecated")}]
            stale = [g for g in grounds if g.prefix == "ASM" and g.status == "validated"]
            if dead and r.status != "broken":
                err(r, f"rests on {dead} (invalidated/deprecated) -> status must be 'broken'")
            elif shaky and not dead and r.status == "active":
                err(r, f"rests on open assumption(s) {shaky} -> status must be 'provisional'")
            for g in stale:
                warn(r, f"cites {g.id}, which was promoted -> cite {g.meta.get('promoted_to')} instead")
            asked = open_questions(r, records)
            if asked and r.status == "active":
                err(r, f"blocked by open question(s) {asked} -> status must be 'provisional'")
            scenarios = r.scenarios()
            for idx, sc in enumerate(scenarios, 1):
                if not valid_scenario(sc):
                    err(r, f"malformed acceptance scenario #{idx} (steps must start with Given/When/Then/And/But and include Given, When, and Then)")
            if r.status == "active" and not scenarios:
                err(r, "active requirement needs at least one Given/When/Then under '## Acceptance'")

        # 5. Specs: skeleton first, features layer on top, no cycles
        if r.prefix == "SPC":
            tier = r.meta.get("tier")
            if tier not in ("skeleton", "feature"):
                err(r, "tier must be 'skeleton' or 'feature'")
            reqs = r.meta.get("requirements") or []
            for req in reqs:
                if req in records and records[req].prefix != "REQ":
                    err(r, f"'requirements' lists non-requirement {req}")
            for dep in r.meta.get("depends_on") or []:
                if dep in records:
                    if records[dep].prefix != "SPC":
                        err(r, f"'depends_on' lists non-spec {dep}")
                    elif tier == "skeleton" and records[dep].meta.get("tier") == "feature":
                        err(r, f"skeleton spec cannot depend on feature {dep}")
            if r.status == "active" and (not reqs or any(q not in records or records[q].status != "active" for q in reqs)):
                err(r, "spec can only be active when all its requirements are active")
            if r.status == "active" and open_questions(r, records):
                err(r, f"spec blocked by open question(s) {open_questions(r, records)} cannot be active")

        # 6. Tech-stack agnostic
        hits = sorted({m.group(1).lower() for m in STACK_RE.finditer(r.title + "\n" + r.body)})
        if hits:
            warn(r, f"tech-stack term(s) {hits}; keep stack choices out of specs")

    specs = [r for r in records.values() if r.prefix == "SPC"]
    try:
        topo(specs, records)
    except ValueError as e:
        errors.append(str(e))
    return errors, warnings


def open_questions(r: Record, records: dict[str, Record]) -> list[str]:
    """Open questions that block this requirement or spec."""
    return sorted(q.id for q in records.values()
                  if q.prefix == "QST" and q.status == "open" and r.id in (q.meta.get("blocks") or []))


def readiness(spec: Record, records: dict[str, Record]) -> int:
    reqs = spec.meta.get("requirements") or []
    active = [q for q in reqs if q in records and records[q].status == "active"]
    return round(100 * len(active) / len(reqs)) if reqs else 0


def topo(specs: list[Record], records: dict[str, Record]) -> list[Record]:
    """Order specs so dependencies come first (skeleton before features)."""
    order, state = [], {}

    def visit(s: Record, trail: tuple[str, ...]):
        if state.get(s.id) == "done":
            return
        if state.get(s.id) == "visiting":
            raise ValueError(f"spec dependency cycle: {' -> '.join(trail + (s.id,))}")
        state[s.id] = "visiting"
        for dep in s.meta.get("depends_on") or []:
            if dep in records and records[dep].prefix == "SPC":
                visit(records[dep], trail + (s.id,))
        state[s.id] = "done"
        order.append(s)

    for s in sorted(specs, key=lambda s: (s.meta.get("tier") != "skeleton", s.id)):
        visit(s, ())
    return order


def impact(changed: str, records: dict[str, Record]) -> tuple[list[str], list[Record]]:
    """Everything downstream of `changed`, and the specs to rebuild in order."""
    downstream: dict[str, set[str]] = {rid: set() for rid in records}
    for r in records.values():
        for link in r.links():
            if link in (r.meta.get("blocks") or []):
                downstream[r.id].add(link)  # a question flows into what it blocks
            # promoted_to points downstream already; its mirror promoted_from carries the edge
            elif link in downstream and link != r.meta.get("promoted_to"):
                downstream[link].add(r.id)

    seen, todo = set(), [changed]
    while todo:
        for nxt in downstream.get(todo.pop(), ()):
            if nxt not in seen:
                seen.add(nxt)
                todo.append(nxt)
    hit_specs = [s for s in topo([r for r in records.values() if r.prefix == "SPC"], records) if s.id in seen]
    return sorted(seen - {s.id for s in hit_specs}), hit_specs


def verify_traceability(records: dict[str, Record], code_root: Path) -> tuple[list[str], list[str]]:
    """Check that active requirements and numbered scenarios are cited in code/tests under `code_root`."""
    errors, warnings = [], []
    if not code_root.exists():
        return [f"verify path not found: {code_root}"], warnings
    skip = {".git", "node_modules", "__pycache__", ".venv", "dist", "records", "site"}
    files = [code_root] if code_root.is_file() else [
        p for p in sorted(code_root.rglob("*"))
        if p.is_file() and not any(part in skip for part in p.parts)
    ]
    bare_cited: set[str] = set()
    scen_cited: set[tuple[str, int]] = set()
    cite_re = re.compile(r"\b(REQ-\d{4})(?:#(\d+))?\b")
    for p in files:
        text = p.read_text(encoding="utf-8", errors="ignore")
        for m in cite_re.finditer(text):
            rid, num = m.group(1), m.group(2)
            if rid not in records or records[rid].prefix != "REQ":
                errors.append(f"{p.name}: cites unknown requirement {rid}")
            elif num is None:
                bare_cited.add(rid)
            else:
                idx = int(num)
                if idx < 1 or idx > len(records[rid].scenarios()):
                    errors.append(f"{p.name}: cites unknown scenario {rid}#{idx}")
                else:
                    scen_cited.add((rid, idx))
    for r in sorted(records.values(), key=lambda x: x.id):
        if r.prefix != "REQ" or r.status != "active":
            continue
        has_specific = any(rid == r.id for rid, _ in scen_cited)
        if has_specific:
            for i in range(1, len(r.scenarios()) + 1):
                if (r.id, i) not in scen_cited and r.id not in bare_cited:
                    warnings.append(f"{r.path.name}: unverified scenario {r.id}#{i}")
        elif r.id not in bare_cited:
            warnings.append(f"{r.path.name}: active requirement {r.id} has no test/code citation")
    return errors, warnings


def render_markdown(spec: Record, records: dict[str, Record], stack: str = "") -> str:
    out = [f"# {spec.id} · {spec.title}", "",
           f"Tier: **{spec.meta['tier']}** · Readiness: **{readiness(spec, records)}%**", ""]
    if spec.meta.get("depends_on"):
        out += ["Builds on: " + ", ".join(spec.meta["depends_on"]), ""]
    out += [spec.section("Purpose"), ""]
    non_goals = spec.section("Non-goals")
    if non_goals:
        out += ["## Non-goals", "", non_goals, ""]
    out += _asked(spec, records, "##")
    out += ["## Requirements", ""]
    for rid in spec.meta.get("requirements") or []:
        req = records[rid]
        out += [f"### {rid} · {req.title} ({req.status})", "", req.section("Statement"), ""]
        for i, sc in enumerate(req.scenarios(), 1):
            out += [f"**{rid}#{i}**", "", "```gherkin", *sc, "```", ""]
        out += ["Because:"] + [f"- {g} ({records[g].status}): {records[g].title}" for g in req.meta["because"]] + [""]
        out += _asked(req, records, "####")
    if stack.strip():
        out += ["## Technology Stack", "", stack.strip(), ""]
    return "\n".join(out).rstrip() + "\n"


def _asked(r: Record, records: dict[str, Record], level: str) -> list[str]:
    qs = open_questions(r, records)
    if not qs:
        return []
    return ([f"{level} Open questions (do not guess, ask)", ""]
            + [f"- {q}: {records[q].title}" for q in qs] + [""])


def render_gherkin(spec: Record, records: dict[str, Record], stack: str = "") -> str:
    spec_qs = [f"@{q}" for q in open_questions(spec, records)]
    out = ([f"{' '.join(spec_qs)}"] if spec_qs else []) + [f"Feature: {spec.title}", ""]
    for rid in spec.meta.get("requirements") or []:
        req = records[rid]
        tags = ([] if req.status == "active" else [f"@{req.status}"]) + [f"@{q}" for q in open_questions(req, records)]
        tag = f"  {' '.join(tags)}\n" if tags else ""
        scenarios = req.scenarios()
        if not scenarios:
            prefix = f"{' '.join(tags)}: " if tags else ""
            out += [f"  # {prefix}{rid} {req.title} (no scenarios yet)", ""]
            continue
        for i, sc in enumerate(scenarios, 1):
            out += [f"{tag}  Scenario: {rid} {req.title} #{i}"] + [f"    {ln}" for ln in sc] + [""]
    return "\n".join(out).rstrip() + "\n"


def render_openspec(spec: Record, records: dict[str, Record], stack: str = "") -> str:
    """Project a spec to OpenSpec Markdown (`### Requirement:` / `#### Scenario:`)."""
    out = [f"# {spec.id} · {spec.title}", "", "## Purpose", "", spec.section("Purpose"), ""]
    non_goals = spec.section("Non-goals")
    if non_goals:
        out += ["## Non-goals", "", non_goals, ""]
    out += _asked(spec, records, "##")
    out += ["## Requirements", ""]
    for rid in spec.meta.get("requirements") or []:
        req = records[rid]
        grounds = ", ".join(req.meta.get("because") or [])
        out += [f"### Requirement: {rid} · {req.title}", "",
                f"*Status: {req.status} · Grounds: {grounds}*", "",
                req.section("Statement"), ""]
        out += _asked(req, records, "####")
        for i, sc in enumerate(req.scenarios(), 1):
            out += [f"#### Scenario: {rid}#{i}"]
            for ln in sc:
                kw, _, rest = ln.partition(" ")
                out.append(f"- **{kw.upper()}** {rest}" if kw.lower() in ("given", "when", "then", "and", "but") else f"- {ln}")
            out.append("")
    if stack.strip():
        out += ["## Technology Stack", "", stack.strip(), ""]
    return "\n".join(out).rstrip() + "\n"


def render_speckit(spec: Record, records: dict[str, Record], stack: str = "") -> str:
    """Project a spec to GitHub Spec Kit Markdown (`## User Scenarios & Testing` / `## Requirements`)."""
    out = [f"# Feature Specification: {spec.title}", "",
           f"**Spec ID**: `{spec.id}` | **Tier**: {spec.meta['tier']} | **Status**: {spec.status} ({readiness(spec, records)}% ready)", "",
           spec.section("Purpose"), ""]
    non_goals = spec.section("Non-goals")
    if non_goals:
        out += ["## Non-goals", "", non_goals, ""]
    out += ["## User Scenarios & Testing", ""]
    clarifications: list[str] = list(open_questions(spec, records))
    for rid in spec.meta.get("requirements") or []:
        req = records[rid]
        clarifications.extend(q for q in open_questions(req, records) if q not in clarifications)
        out += [f"### {rid} · {req.title} ({req.status})", ""]
        for i, sc in enumerate(req.scenarios(), 1):
            out += [f"**Acceptance Scenario {rid}#{i}**", ""] + [f"- {ln}" for ln in sc] + [""]
    out += ["## Requirements", "", "### Functional Requirements", ""]
    for rid in spec.meta.get("requirements") or []:
        req = records[rid]
        stmt = req.section("Statement").replace("\n", " ").strip()
        grounds = ", ".join(req.meta["because"])
        out.append(f"- **{rid}**: {stmt} *(grounds: {grounds})*")
    out.append("")
    if clarifications:
        out += ["## Clarifications", "", "### Needs Clarification (do not guess, ask)", ""]
        out += [f"- **{q}**: {records[q].title}" for q in clarifications] + [""]
    if stack.strip():
        out += ["## Technology Stack", "", stack.strip(), ""]
    return "\n".join(out).rstrip() + "\n"


RENDERERS = {
    "markdown": (render_markdown, ".md"),
    "gherkin": (render_gherkin, ".feature"),
    "openspec": (render_openspec, ".openspec.md"),
    "speckit": (render_speckit, ".speckit.md"),
}


def github_repo() -> str:
    """owner/name for links from the Pages site; CI sets GITHUB_REPOSITORY."""
    if os.environ.get("GITHUB_REPOSITORY"):
        return os.environ["GITHUB_REPOSITORY"]
    try:
        url = subprocess.run(["git", "remote", "get-url", "origin"], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""
    m = re.search(r"github\.com[:/](.+?)(?:\.git)?$", url)
    return m.group(1) if m else ""


def to_index(records: dict[str, Record]) -> dict:
    """Everything the Pages site needs, in one JSON document."""
    errors, warnings = check(records)
    issues: dict[str, list[str]] = {}
    global_issues: list[str] = []
    for level, items in (("error", errors), ("warning", warnings)):
        for item in items:
            name, _, msg = item.partition(": ")
            rid = name[:8]
            if rid in records:
                issues.setdefault(rid, []).append(f"{level}: {msg}")
            else:
                global_issues.append(f"{level}: {item}")
    specs = [r for r in records.values() if r.prefix == "SPC"]
    rows = []
    for r in records.values():
        try:
            touched, hit = impact(r.id, records)
        except ValueError:  # spec cycle, already reported by check()
            touched, hit = [], []
        row = {k: (v.isoformat() if isinstance(v, date) else v)
               for k, v in r.meta.items() if k not in ("created_at", "updated_at")}
        row.update(type=TYPES[r.prefix], path=f"records/{r.path.name}", body=r.body.strip(),
                   downstream=touched + [s.id for s in hit], issues=issues.get(r.id, []))
        if r.prefix == "SPC":
            row["readiness"] = readiness(r, records)
        if r.prefix in ("REQ", "SPC"):
            row["open_questions"] = open_questions(r, records)
        rows.append(row)
    return {
        "repo": github_repo(),
        "summary": {"records": len(records), "errors": len(errors), "warnings": len(warnings)},
        "issues": global_issues,
        "spec_order": [s.id for s in topo(specs, records)] if not errors else sorted(s.id for s in specs),
        "records": rows,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check")
    c.add_argument("--strict", action="store_true", help="treat warnings as errors")
    c.add_argument("--verify", help="verify active requirements against test/code citations in DIR")
    i = sub.add_parser("impact")
    i.add_argument("id")
    r = sub.add_parser("render")
    r.add_argument("--tier", choices=["skeleton", "feature"])
    r.add_argument("--format", choices=sorted(RENDERERS), default="markdown")
    r.add_argument("--stack", help="optional technology stack file to bind at render time")
    r.add_argument("--out", default="dist")
    x = sub.add_parser("index")
    x.add_argument("--out", default="site/data/index.json")
    args = ap.parse_args(argv)

    records = load()

    if args.cmd == "check":
        errors, warnings = check(records)
        if args.verify:
            vp = Path(args.verify)
            ve, vw = verify_traceability(records, vp if vp.is_absolute() else ROOT / vp)
            errors.extend(ve)
            warnings.extend(vw)
        for w in warnings:
            print(f"WARN  {w}")
        for e in errors:
            print(f"ERROR {e}")
        print(f"{len(records)} records · {len(errors)} errors · {len(warnings)} warnings")
        for s in topo([r for r in records.values() if r.prefix == "SPC"], records) if not errors else []:
            print(f"  {s.id} [{s.meta['tier']:<8}] {readiness(s, records):>3}% ready  {s.title}")
        return 1 if errors or (args.strict and warnings) else 0

    if args.cmd == "impact":
        if args.id not in records:
            print(f"unknown record {args.id}")
            return 1
        touched, specs = impact(args.id, records)
        print(f"Changing {args.id} affects: {', '.join(touched) or 'nothing'}")
        print("Rebuild specs in order: " + (" -> ".join(s.id for s in specs) or "none"))
        return 0

    if args.cmd == "index":
        out = ROOT / args.out
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(to_index(records), indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"wrote {args.out}")
        return 0

    stack_text = ""
    if args.stack:
        sp = Path(args.stack)
        if not sp.is_file():
            sp = ROOT / args.stack
        if not sp.is_file():
            print(f"unknown stack file {args.stack}")
            return 1
        stack_text = sp.read_text(encoding="utf-8").strip()

    render, ext = RENDERERS[args.format]
    out = ROOT / args.out
    out.mkdir(parents=True, exist_ok=True)
    for s in topo([r for r in records.values() if r.prefix == "SPC"], records):
        if args.tier and s.meta.get("tier") != args.tier:
            continue
        content = render(s, records, stack_text) if stack_text else render(s, records)
        (out / f"{s.id}{ext}").write_text(content, encoding="utf-8")
        print(f"wrote {args.out}/{s.id}{ext}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
