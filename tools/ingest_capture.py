#!/usr/bin/env python3
"""
Turn a capture (GitHub issue body or raw payload) into canonical record files.

Supported capture kinds:
  - requirement (.github/ISSUE_TEMPLATE/capture-requirement.yml) -> REQ (+ optional ASM, ACR)
  - assumption  (.github/ISSUE_TEMPLATE/capture-assumption.yml)  -> ASM (+ optional updates to underpinned REQ/CON/DEC)
  - fact        (.github/ISSUE_TEMPLATE/capture-fact.yml)        -> FCT and/or VAL (+ optional ASM promotion/invalidation)
  - decision    (.github/ISSUE_TEMPLATE/capture-decision.yml)    -> DEC (+ optional ASM, superseded DEC updates)

The input is UNTRUSTED. It is parsed with yaml.safe_load, validated against
schema/captures/<kind>.capture.schema.json, and only ever written as data.

Usage:
  python tools/ingest_capture.py --issue-body-file body.md [--issue-title "[capture] …"] [--issue 12]
                                 [--author octocat] [--reserved-ids-file ids.txt] [--root PATH] [--dry-run]
  python tools/ingest_capture.py --payload-file capture.yml [...]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recordlib import ROOT, dump_record, iter_record_files, load_config, parse_record  # noqa: E402

NO_RESPONSE = "_No response_"
OPEN_ASM = {"unvalidated", "validating"}
ACTIVE_STATES = {"active", "accepted"}


class CaptureError(Exception):
    """A user-facing problem with the capture (reported back on the issue)."""


# --------------------------------------------------------------------------- parsing

def issue_sections(body: str) -> dict[str, str]:
    """Split an Issue Form body into {'Label': 'value'} using '### ' headings."""
    out, current, buf = {}, None, []
    for line in body.replace("\r\n", "\n").split("\n"):
        if line.startswith("### "):
            if current:
                out[current] = "\n".join(buf).strip()
            current, buf = line[4:].strip(), []
        elif current:
            buf.append(line)
    if current:
        out[current] = "\n".join(buf).strip()
    return {k: ("" if v == NO_RESPONSE else v) for k, v in out.items()}


def strip_fence(text: str) -> str:
    m = re.match(r"^```[a-zA-Z]*\n(.*?)\n?```\s*$", text.strip(), re.S)
    return m.group(1) if m else text


def find(sections: dict[str, str], *prefixes: str) -> str:
    for label, value in sections.items():
        if any(label.lower().startswith(p.lower()) for p in prefixes):
            return value.strip()
    return ""


def split_lines(text: str) -> list[str]:
    return [ln.strip(" -*\t") for ln in text.splitlines() if ln.strip(" -*\t")]


def parse_gwt(text: str) -> list[dict]:
    """Parse free-text 'Given/When/Then' blocks (blank line separates scenarios)."""
    scenarios = []
    for block in re.split(r"\n\s*\n", text.strip()):
        sc: dict[str, str] = {}
        last = None
        for raw in block.splitlines():
            line = raw.strip().lstrip("-*").strip()
            m = re.match(r"^(given|when|then|and|but)\b[:\s]*(.*)$", line, re.I)
            if m:
                key = m.group(1).lower()
                if key in ("and", "but"):
                    key = last or "then"
                    sc[key] = f"{sc[key]} AND {m.group(2)}" if sc.get(key) else m.group(2)
                else:
                    sc[key] = m.group(2).strip()
                last = key
            elif line:
                sc["then"] = f"{sc.get('then', '')} {line}".strip()
        if sc.get("then"):
            scenarios.append(sc)
    return scenarios


PRIORITY_WORDS = {"critical": "p0", "high": "p1", "normal": "p2", "medium": "p2", "low": "p3"}
CATEGORIES = ("functional", "non_functional", "interface", "data", "security")
CATEGORY_ALIASES = {"nonfunctional": "non_functional", "quality": "non_functional", "nfr": "non_functional",
                    "performance": "non_functional", "usability": "non_functional"}
RISKS = ("low", "medium", "high", "critical")
METHODS = ("benchmark", "prototype_spike", "user_research", "documentation_audit",
           "production_telemetry", "formal_proof", "stakeholder_signoff")
METHOD_ALIASES = {
    "spike": "prototype_spike", "prototype": "prototype_spike", "interview": "user_research",
    "research": "user_research", "audit": "documentation_audit", "docs": "documentation_audit",
    "telemetry": "production_telemetry", "production": "production_telemetry",
    "proof": "formal_proof", "signoff": "stakeholder_signoff", "sign_off": "stakeholder_signoff",
}
OUTCOMES = ("confirmed", "refined", "refuted")
OUTCOME_ALIASES = {"true": "confirmed", "valid": "confirmed", "false": "refuted", "invalid": "refuted", "invalidated": "refuted"}
SOURCES = ("empirical_validation", "domain_invariant", "external_contract",
           "regulatory_mandate", "hardware_limit", "business_policy")
SOURCE_ALIASES = {
    "empirical": "empirical_validation", "validation": "empirical_validation",
    "invariant": "domain_invariant", "domain": "domain_invariant",
    "contract": "external_contract", "external": "external_contract",
    "regulatory": "regulatory_mandate", "regulation": "regulatory_mandate", "legal": "regulatory_mandate",
    "hardware": "hardware_limit", "policy": "business_policy", "business": "business_policy",
}


def parse_priority(text: str) -> str | None:
    t = text.strip().lower()
    if not t:
        return None
    m = re.match(r"p\s*([0-3])\b", t)
    if m:
        return f"p{m.group(1)}"
    for word, value in PRIORITY_WORDS.items():
        if t.startswith(word):
            return value
    raise CaptureError(f"Priority `{text.strip()}` is not recognised — use p0, p1, p2 or p3.")


def parse_category(text: str) -> str | None:
    t = re.sub(r"[\s-]+", "_", text.strip().lower()).split("(")[0].strip("_")
    if not t:
        return None
    t = CATEGORY_ALIASES.get(t.replace("_", ""), t)
    if t in CATEGORIES:
        return t
    raise CaptureError(f"Category `{text.strip()}` is not recognised — use one of: {', '.join(CATEGORIES)}.")


def parse_risk(text: str) -> str | None:
    t = text.strip().lower().split()[0] if text.strip() else ""
    if not t:
        return None
    if t in RISKS:
        return t
    raise CaptureError(f"Risk `{text.strip()}` is not recognised — use one of: {', '.join(RISKS)}.")


def parse_confidence(text: str) -> float | None:
    t = text.strip().lower()
    if not t:
        return None
    word_map = {"low": 0.25, "medium": 0.5, "high": 0.75, "very_high": 0.9, "very high": 0.9}
    if t in word_map:
        return word_map[t]
    m = re.match(r"^(\d+(?:\.\d+)?)\s*(%)?$", t)
    if m:
        val = float(m.group(1))
        if m.group(2) or (val > 1.0 and val <= 100.0):
            val = val / 100.0
        if 0.0 <= val <= 1.0:
            return round(val, 2)
    raise CaptureError(f"Confidence `{text.strip()}` must be a number between 0.0 and 1.0 (or a percentage like 60%).")


def parse_method(text: str) -> str | None:
    t = re.sub(r"[\s/-]+", "_", text.strip().lower()).split("(")[0].strip("_")
    if not t:
        return None
    t = METHOD_ALIASES.get(t, t)
    if t in METHODS:
        return t
    raise CaptureError(f"Validation method `{text.strip()}` is not recognised — use one of: {', '.join(METHODS)}.")


def parse_outcome(text: str) -> str | None:
    t = re.sub(r"[\s/-]+", "_", text.strip().lower()).split("(")[0].strip("_")
    if not t:
        return None
    t = OUTCOME_ALIASES.get(t, t)
    if t in OUTCOMES:
        return t
    raise CaptureError(f"Validation outcome `{text.strip()}` is not recognised — use one of: {', '.join(OUTCOMES)}.")


def parse_source(text: str) -> str | None:
    t = re.sub(r"[\s/-]+", "_", text.strip().lower()).split("(")[0].strip("_")
    if not t:
        return None
    t = SOURCE_ALIASES.get(t, t)
    if t in SOURCES:
        return t
    raise CaptureError(f"Fact source `{text.strip()}` is not recognised — use one of: {', '.join(SOURCES)}.")


def parse_blocking(text: str) -> bool | None:
    t = text.strip().lower().split()[0] if text.strip() else ""
    if not t:
        return None
    if t in ("true", "yes", "1", "blocking"):
        return True
    if t in ("false", "no", "0", "non-blocking", "non_blocking"):
        return False
    raise CaptureError(f"Blocking value `{text.strip()}` is not recognised — use true or false.")


def title_from_issue(issue_title: str | None) -> str:
    t = re.sub(r"^\s*\[capture(?::[a-z_]+)?\]\s*", "", issue_title or "", flags=re.I).strip()
    return t[:140]


def detect_issue_kind(secs: dict[str, str], issue_title: str | None) -> str:
    m = re.match(r"^\s*\[capture:([a-z_]+)\]", issue_title or "", flags=re.I)
    if m and m.group(1).lower() in {"requirement", "assumption", "fact", "decision", "question"}:
        return m.group(1).lower()
    if any(k.lower().startswith("what do we assume") for k in secs):
        return "assumption"
    if any(k.lower().startswith(("what verified fact", "assumptions tested", "validation outcome")) for k in secs):
        return "fact"
    if any(k.lower().startswith(("what did we decide", "which requirements or constraints")) for k in secs):
        return "decision"
    if any(k.lower().startswith("what needs clarification") for k in secs):
        return "question"
    return "requirement"


def payload_from_issue(body: str, issue_title: str | None = None) -> dict:
    """Build a capture payload from an Issue Form body across all capture topics."""
    secs = issue_sections(body)
    raw = strip_fence(find(secs, "Payload"))
    kind = detect_issue_kind(secs, issue_title)

    if kind == "requirement":
        statement = find(secs, "What should the system do")
        if not statement and raw.strip():
            try:
                payload = yaml.safe_load(raw)
            except yaml.YAMLError as exc:
                raise CaptureError(f"The payload is not valid YAML/JSON: {exc}") from exc
            if not isinstance(payload, dict):
                raise CaptureError("The payload must be an object.")
            return payload

        req: dict = {"statement": statement}
        if title := title_from_issue(issue_title):
            req["title"] = title
        if domain := find(secs, "Domain"):
            req["domain"] = domain
        if prio := parse_priority(find(secs, "Priority")):
            req["priority"] = prio
        if cat := parse_category(find(secs, "Category")):
            req["category"] = cat
        if notes := find(secs, "Notes"):
            req["notes"] = notes

        payload = {"kind": "requirement", "version": 1, "requirement": req}
        refs = re.findall(r"\b(?:FCT|ASM)-\d{4}\b", find(secs, "Existing facts"))
        if refs:
            payload["underpinned_by"] = sorted(set(refs))
        beliefs = split_lines(find(secs, "Why"))
        if beliefs:
            payload["new_assumptions"] = [{"statement": b} for b in beliefs]
        criteria = parse_gwt(find(secs, "How will we know"))
        if criteria:
            payload["criteria"] = criteria
        return payload

    if kind == "assumption":
        asm: dict = {
            "statement": find(secs, "What do we assume"),
            "validation_plan": find(secs, "How can we validate"),
        }
        if title := title_from_issue(issue_title):
            asm["title"] = title
        if domain := find(secs, "Domain"):
            asm["domain"] = domain
        if risk := parse_risk(find(secs, "Risk")):
            asm["risk"] = risk
        if (conf := parse_confidence(find(secs, "Initial confidence"))) is not None:
            asm["confidence"] = conf
        if impact := find(secs, "What breaks"):
            asm["impact"] = impact
        if notes := find(secs, "Notes"):
            asm["notes"] = notes
        payload = {"kind": "assumption", "version": 1, "assumption": asm}
        underpins = re.findall(r"\b(?:REQ|CON|DEC)-\d{4}\b", find(secs, "Requirements, constraints"))
        if underpins:
            payload["underpins"] = sorted(set(underpins))
        return payload

    if kind == "fact":
        payload = {"kind": "fact", "version": 1}
        if domain := find(secs, "Domain"):
            payload["domain"] = domain
        if notes := find(secs, "Notes"):
            payload["notes"] = notes
        tests = re.findall(r"\bASM-\d{4}\b", find(secs, "Assumptions tested"))
        if tests:
            payload["tests"] = sorted(set(tests))
        supersedes = re.findall(r"\bFCT-\d{4}\b", find(secs, "Supersedes"))
        if supersedes:
            payload["supersedes"] = sorted(set(supersedes))

        statement = find(secs, "What verified fact")
        findings = find(secs, "Validation findings")
        outcome = parse_outcome(find(secs, "Validation outcome"))
        method = parse_method(find(secs, "Validation method"))
        source = parse_source(find(secs, "Fact source"))
        artifacts = split_lines(find(secs, "Evidence links"))
        title = title_from_issue(issue_title)

        has_val = bool(tests or findings or outcome == "refuted" or artifacts)
        if has_val:
            val_obj: dict = {
                "method": method or "benchmark",
                "outcome": outcome or ("confirmed" if statement else "refuted"),
                "findings": findings,
            }
            if title and outcome == "refuted" and not statement:
                val_obj["title"] = title
            if artifacts:
                val_obj["artifacts"] = artifacts
            payload["validation"] = val_obj

        if statement or (outcome != "refuted" and not has_val):
            fct_obj: dict = {"statement": statement}
            if title:
                fct_obj["title"] = title
            fct_obj["source"] = source or ("empirical_validation" if has_val else "domain_invariant")
            if implications := find(secs, "Architectural or product implications"):
                fct_obj["implications"] = implications
            payload["fact"] = fct_obj
        return payload

    if kind == "decision":
        dec: dict = {"statement": find(secs, "What did we decide")}
        if title := title_from_issue(issue_title):
            dec["title"] = title
        if domain := find(secs, "Domain"):
            dec["domain"] = domain
        if context := find(secs, "Context"):
            dec["context"] = context
        if alternatives := find(secs, "Alternatives"):
            dec["alternatives"] = alternatives
        if consequences := find(secs, "Consequences"):
            dec["consequences"] = consequences
        if notes := find(secs, "Notes"):
            dec["notes"] = notes

        satisfies = re.findall(r"\b(?:REQ|CON)-\d{4}\b", find(secs, "Which requirements"))
        payload = {"kind": "decision", "version": 1, "decision": dec, "satisfies": sorted(set(satisfies))}
        refs = re.findall(r"\b(?:FCT|ASM)-\d{4}\b", find(secs, "Existing facts"))
        if refs:
            payload["underpinned_by"] = sorted(set(refs))
        beliefs = split_lines(find(secs, "New reasons"))
        if beliefs:
            payload["new_assumptions"] = [{"statement": b} for b in beliefs]
        supersedes = re.findall(r"\bDEC-\d{4}\b", find(secs, "Supersedes"))
        if supersedes:
            payload["supersedes"] = sorted(set(supersedes))
        return payload

    if kind == "question":
        qst: dict = {
            "statement": find(secs, "What needs clarification"),
        }
        if title := title_from_issue(issue_title):
            qst["title"] = title
        if domain := find(secs, "Domain"):
            qst["domain"] = domain
        if (blocking := parse_blocking(find(secs, "Blocks release"))) is not None:
            qst["blocking"] = blocking
        if context := find(secs, "Context"):
            qst["context"] = context
        if notes := find(secs, "Notes"):
            qst["notes"] = notes
        payload = {"kind": "question", "version": 1, "question": qst}
        affects = re.findall(r"\b(?:REQ|CON|ACR|DEC|SPC|CHG)-\d{4}\b", find(secs, "Requirements, constraints"))
        if affects:
            payload["affects"] = sorted(set(affects))
        return payload

    raise CaptureError(f"Unknown capture kind `{kind}`.")


# --------------------------------------------------------------------------- helpers

def slugify(text: str, max_len: int = 50) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if len(slug) > max_len:
        slug = slug[:max_len].rsplit("-", 1)[0]
    return slug or "untitled"


def derive_title(statement: str) -> str:
    """Short human title: drop the 'the <actor> shall' phrasing, keep conditions. Mirrored in site/js/capture/text.js."""
    text = re.sub(r"\s+", " ", statement).strip().rstrip(".")
    actor_modal = r"(?:the\s+)?[\w\s-]{1,40}?\s+(?:shall|must|should|may|will)\s+(not\s+)?"
    keep_neg = lambda m, lead="": lead + ("do not " if m.group(1) else "")  # noqa: E731  never invert meaning
    text = re.sub(rf"^{actor_modal}", keep_neg, text, flags=re.I) if not re.match(r"^(when|while|if|where)\b", text, re.I) \
        else re.sub(rf",\s*(?:then\s+)?{actor_modal}", lambda m: keep_neg(m, ", "), text, count=1, flags=re.I)
    text = text[:1].upper() + text[1:]
    if len(text) > 80:
        text = text[:80].rsplit(" ", 1)[0] + "…"
    return text if len(text) >= 5 else (statement.strip()[:80] or "Untitled record")


def detect_normative(statement: str) -> str:
    s = statement.upper()
    for word in ("MUST", "SHALL", "SHOULD", "MAY"):
        if re.search(rf"\b{word}\b", s):
            return word
    return "SHALL"


def detect_ears(statement: str) -> str:
    s = statement.strip().lower()
    if s.startswith("when "):
        return "event_driven"
    if s.startswith("while "):
        return "state_driven"
    if s.startswith("if ") and " then " in s:
        return "unwanted_behavior"
    if s.startswith("where "):
        return "optional_feature"
    return "ubiquitous"


def load_existing_full(root: Path, config: dict) -> dict[str, tuple[Path, dict, str]]:
    """Return {record_id: (path, meta, body)} for all existing records."""
    existing: dict[str, tuple[Path, dict, str]] = {}
    for _, path in iter_record_files(config, root):
        try:
            meta, body = parse_record(path)
            if meta.get("id"):
                existing[meta["id"]] = (path, meta, body)
        except ValueError:
            continue
    return existing


def append_unique(lst: list | None, item: str) -> list[str]:
    out = list(lst or [])
    if item not in out:
        out.append(item)
    return out


class IdAllocator:
    def __init__(self, taken: set[str]):
        self.taken = set(taken)

    def next(self, prefix: str) -> str:
        nums = [int(i.split("-")[1]) for i in self.taken if i.startswith(prefix + "-")]
        rid = f"{prefix}-{(max(nums) + 1 if nums else 1):04d}"
        self.taken.add(rid)
        return rid


def check_refs(ids: list[str], existing: dict[str, tuple[Path, dict, str]], expected_types: set[str] | None = None) -> None:
    for ref in ids:
        if ref not in existing:
            raise CaptureError(f"`{ref}` does not exist in the repository.")
        if expected_types and existing[ref][1].get("type") not in expected_types:
            raise CaptureError(f"`{ref}` is a `{existing[ref][1].get('type')}`, expected {' or '.join(sorted(expected_types))}.")


def mint_inline_assumptions(new_assumptions: list[dict], alloc: IdAllocator, dirs: dict[str, Path],
                            domain: str, owners: list[str], today: str, parent_id: str, provenance: str) -> tuple[list[str], list[tuple[Path, str, dict]]]:
    asm_ids: list[str] = []
    created: list[tuple[Path, str, dict]] = []
    for a in new_assumptions:
        aid = alloc.next("ASM")
        asm_ids.append(aid)
        a_stmt = re.sub(r"\s+", " ", a["statement"]).strip()
        meta = {
            "id": aid, "type": "assumption", "title": derive_title(a_stmt), "domain": domain,
            "status": "unvalidated", "confidence": a.get("confidence", 0.5), "risk": a.get("risk", "medium"),
            "validation_plan": "To be defined during review: how can we confirm or refute this?",
            "owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today,
        }
        body = f"## Statement\n{a_stmt}\n\n## Context\nCaptured as rationale for `{parent_id}`. {provenance}"
        created.append((dirs["assumption"] / f"{aid}-{slugify(meta['title'])}.md", dump_record(meta, body), meta))
    return asm_ids, created


# --------------------------------------------------------------------------- ingest handlers

def ingest(payload: dict, root: Path, issue: int | None, author: str | None,
           reserved: set[str], dry_run: bool) -> dict:
    config = load_config(root)
    kind = payload.get("kind", "requirement")
    if kind not in {"requirement", "assumption", "fact", "decision", "question"}:
        raise CaptureError(f"Unsupported capture kind `{kind}`.")

    schema_path = root / f"schema/captures/{kind}.capture.schema.json"
    schema = json.loads(schema_path.read_text())
    problems = sorted(Draft202012Validator(schema).iter_errors(payload), key=lambda e: list(e.path))
    if problems:
        lines = []
        for e in problems[:10]:
            where = ".".join(str(p) for p in e.path) or "capture"
            msg = e.message
            if e.validator == "anyOf":
                if kind in ("requirement", "decision"):
                    msg = "Tell us *why*: pick at least one existing fact/assumption or write a reason."
                elif kind == "fact":
                    msg = "Provide a verified fact statement, or select an assumption and mark it refuted with findings."
            lines.append(f"- `{where}`: {msg}")
        raise CaptureError("The capture is incomplete or invalid:\n" + "\n".join(lines))

    existing = load_existing_full(root, config)
    alloc = IdAllocator(set(existing) | reserved)
    today = date.today().isoformat()
    provenance = "Captured" + (f" via issue #{issue}" if issue else "") + (f" by @{author}" if author else "") + f" on {today}."
    owners = [author] if author else []
    dirs = {t: root / s["directory"] for t, s in config["records"]["types"].items()}
    default_domain = config.get("site", {}).get("default_domain", "general")

    if kind == "requirement":
        return _ingest_requirement(payload, root, existing, alloc, dirs, default_domain, owners, today, provenance, dry_run)
    if kind == "assumption":
        return _ingest_assumption(payload, root, existing, alloc, dirs, default_domain, owners, today, provenance, dry_run)
    if kind == "fact":
        return _ingest_fact(payload, root, existing, alloc, dirs, default_domain, owners, today, provenance, dry_run)
    if kind == "question":
        return _ingest_question(payload, root, existing, alloc, dirs, default_domain, owners, today, provenance, dry_run)
    return _ingest_decision(payload, root, existing, alloc, dirs, default_domain, owners, today, provenance, dry_run)


def _write_files(created: list[tuple[Path, str, dict]], updated: list[tuple[Path, str, dict]], dry_run: bool) -> None:
    if dry_run:
        return
    for path, text, _ in created + updated:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)


def _ingest_requirement(payload: dict, root: Path, existing: dict[str, tuple[Path, dict, str]], alloc: IdAllocator,
                        dirs: dict[str, Path], default_domain: str, owners: list[str], today: str, provenance: str, dry_run: bool) -> dict:
    check_refs(payload.get("underpinned_by", []), existing, {"fact", "assumption"})
    req_in = payload["requirement"]
    statement = re.sub(r"[ \t]+", " ", req_in["statement"]).strip()
    title = (req_in.get("title") or "").strip() or derive_title(statement)
    domain = slugify(req_in.get("domain") or default_domain, 40)

    req_id = alloc.next("REQ")
    asm_ids, created = mint_inline_assumptions(payload.get("new_assumptions", []), alloc, dirs, domain, owners, today, req_id, provenance)

    underpinned = list(payload.get("underpinned_by", [])) + asm_ids
    open_refs = [u for u in underpinned if u in asm_ids or
                 (existing.get(u, (None, {}, ""))[1].get("type") == "assumption" and existing[u][1].get("status") in OPEN_ASM)]
    status = "provisional" if open_refs else "draft"

    acr_ids = []
    for c in payload.get("criteria", []):
        cid = alloc.next("ACR")
        acr_ids.append(cid)
        c_title = (c.get("title") or "").strip() or derive_title(c["then"])
        lines = []
        for key in ("given", "when", "then"):
            if (c.get(key) or "").strip():
                parts = [p.strip() for p in re.split(r"\s+AND\s+", c[key].strip()) if p.strip()]
                lines.append(f"- **{key.upper()}** {parts[0]}")
                lines += [f"- **AND** {p}" for p in parts[1:]]
        meta = {
            "id": cid, "type": "criterion", "title": c_title, "domain": domain, "status": status,
            "format": "gherkin", "verifies": [req_id], "owners": owners, "tags": ["captured"],
            "created_at": today, "updated_at": today,
        }
        body = f"## Scenario: {c_title}\n" + "\n".join(lines)
        created.append((dirs["criterion"] / f"{cid}-{slugify(c_title)}.md", dump_record(meta, body), meta))

    meta = {
        "id": req_id, "type": "requirement", "title": title, "domain": domain, "status": status,
        "category": req_in.get("category", "functional"),
        "normative": req_in.get("normative") or detect_normative(statement),
        "ears_pattern": req_in.get("ears_pattern") or detect_ears(statement),
        "priority": req_in.get("priority", "p2"),
        "underpinned_by": underpinned,
    }
    if acr_ids:
        meta["verified_by"] = acr_ids
    meta.update({"owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today})
    rationale = "Underpinned by: " + ", ".join(f"`{u}`" for u in underpinned) + "."
    if open_refs:
        rationale += f"\n\n**Provisional:** rests on unvalidated assumption(s) {', '.join(f'`{u}`' for u in open_refs)}."
    body = f"## Statement\n{statement}\n\n## Rationale\n{rationale}"
    if (req_in.get("notes") or "").strip():
        body += f"\n\n## Notes\n{req_in['notes'].strip()}"
    body += f"\n\n## Provenance\n{provenance}"
    created.insert(0, (dirs["requirement"] / f"{req_id}-{slugify(title)}.md", dump_record(meta, body), meta))

    _write_files(created, [], dry_run)
    return {
        "kind": "requirement",
        "primary_id": req_id,
        "requirement": req_id,
        "title": title,
        "status": status,
        "assumptions": asm_ids,
        "criteria": acr_ids,
        "files": [str(p.relative_to(root)) for p, _, _ in created],
        "updated_files": [],
    }


def _ingest_assumption(payload: dict, root: Path, existing: dict[str, tuple[Path, dict, str]], alloc: IdAllocator,
                       dirs: dict[str, Path], default_domain: str, owners: list[str], today: str, provenance: str, dry_run: bool) -> dict:
    underpins = payload.get("underpins", [])
    check_refs(underpins, existing, {"requirement", "constraint", "decision"})
    asm_in = payload["assumption"]
    statement = re.sub(r"[ \t]+", " ", asm_in["statement"]).strip()
    val_plan = re.sub(r"\s+", " ", asm_in["validation_plan"]).strip()
    title = (asm_in.get("title") or "").strip() or derive_title(statement)

    inferred_domain = existing[underpins[0]][1].get("domain") if underpins else None
    domain = slugify(asm_in.get("domain") or inferred_domain or default_domain, 40)

    asm_id = alloc.next("ASM")
    meta = {
        "id": asm_id, "type": "assumption", "title": title, "domain": domain,
        "status": "unvalidated",
        "confidence": asm_in.get("confidence", 0.5),
        "risk": asm_in.get("risk", "medium"),
        "validation_plan": val_plan,
        "owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today,
    }
    body = f"## Statement\n{statement}\n\n## Validation Plan\n{val_plan}"
    if (asm_in.get("impact") or "").strip():
        body += f"\n\n## Impact if False\n{asm_in['impact'].strip()}"
    if (asm_in.get("notes") or "").strip():
        body += f"\n\n## Notes\n{asm_in['notes'].strip()}"
    body += f"\n\n## Provenance\n{provenance}"
    created = [(dirs["assumption"] / f"{asm_id}-{slugify(title)}.md", dump_record(meta, body), meta)]

    updated: list[tuple[Path, str, dict]] = []
    for target_id in underpins:
        t_path, t_meta, t_body = existing[target_id]
        t_meta = dict(t_meta)
        t_meta["underpinned_by"] = append_unique(t_meta.get("underpinned_by"), asm_id)
        if t_meta.get("status") in ACTIVE_STATES:
            t_meta["status"] = "provisional"
        t_meta["updated_at"] = today
        updated.append((t_path, dump_record(t_meta, t_body), t_meta))

    _write_files(created, updated, dry_run)
    return {
        "kind": "assumption",
        "primary_id": asm_id,
        "assumption": asm_id,
        "title": title,
        "status": "unvalidated",
        "underpins": underpins,
        "files": [str(p.relative_to(root)) for p, _, _ in created],
        "updated_files": [str(p.relative_to(root)) for p, _, _ in updated],
    }


def _ingest_fact(payload: dict, root: Path, existing: dict[str, tuple[Path, dict, str]], alloc: IdAllocator,
                 dirs: dict[str, Path], default_domain: str, owners: list[str], today: str, provenance: str, dry_run: bool) -> dict:
    tests = payload.get("tests", [])
    supersedes = payload.get("supersedes", [])
    check_refs(tests, existing, {"assumption"})
    check_refs(supersedes, existing, {"fact"})

    val_in = payload.get("validation")
    fct_in = payload.get("fact")
    outcome = val_in.get("outcome", "confirmed") if val_in else "confirmed"

    if outcome != "refuted" and not fct_in:
        raise CaptureError("Provide the verified fact statement (or set outcome to `refuted`).")
    if tests and not val_in:
        raise CaptureError("Testing an assumption requires validation method and findings.")

    inferred_domain = existing[tests[0]][1].get("domain") if tests else (existing[supersedes[0]][1].get("domain") if supersedes else None)
    domain = slugify(payload.get("domain") or inferred_domain or default_domain, 40)

    created: list[tuple[Path, str, dict]] = []
    updated_map: dict[str, tuple[Path, dict, str]] = {}

    val_id = alloc.next("VAL") if val_in else None
    fct_id = alloc.next("FCT") if (fct_in and outcome != "refuted") else None

    fct_title = ""
    if fct_id and fct_in:
        f_stmt = re.sub(r"[ \t]+", " ", fct_in["statement"]).strip()
        fct_title = (fct_in.get("title") or "").strip() or derive_title(f_stmt)
        source = fct_in.get("source") or ("empirical_validation" if val_id else "domain_invariant")
        f_meta: dict = {
            "id": fct_id, "type": "fact", "title": fct_title, "domain": domain,
            "status": "active", "source": source,
        }
        if tests:
            f_meta["promoted_from"] = tests[0]
        if val_id:
            f_meta["evidence"] = [val_id]
        if supersedes:
            f_meta["supersedes"] = supersedes
        f_meta.update({"owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today})
        f_body = f"## Statement\n{f_stmt}"
        if (fct_in.get("implications") or "").strip():
            f_body += f"\n\n## Architectural Implications\n{fct_in['implications'].strip()}"
        if (payload.get("notes") or "").strip():
            f_body += f"\n\n## Notes\n{payload['notes'].strip()}"
        f_body += f"\n\n## Provenance\n{provenance}"
        created.append((dirs["fact"] / f"{fct_id}-{slugify(fct_title)}.md", dump_record(f_meta, f_body), f_meta))

    val_title = ""
    if val_id and val_in:
        findings = val_in["findings"].strip()
        default_v_title = f"Validation of {', '.join(tests)}" if tests else (f"Evidence for {fct_id}" if fct_id else derive_title(findings))
        val_title = (val_in.get("title") or "").strip() or default_v_title
        v_meta: dict = {
            "id": val_id, "type": "validation", "title": val_title, "domain": domain,
            "status": "completed", "method": val_in["method"], "outcome": outcome,
        }
        if tests:
            v_meta["tests"] = tests
        if fct_id:
            v_meta["establishes"] = [fct_id]
        if val_in.get("artifacts"):
            v_meta["artifacts"] = val_in["artifacts"]
        v_meta.update({"owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today})
        objective = f"Evaluate {', '.join(f'`{a}`' for a in tests)}." if tests else f"Establish empirical evidence for `{fct_id}`."
        v_body = f"## Objective\n{objective}\n\n## Findings\n{findings}"
        if (payload.get("notes") or "").strip() and not fct_id:
            v_body += f"\n\n## Notes\n{payload['notes'].strip()}"
        v_body += f"\n\n## Provenance\n{provenance}"
        created.append((dirs["validation"] / f"{val_id}-{slugify(val_title)}.md", dump_record(v_meta, v_body), v_meta))

    # Update tested assumptions (promotion or invalidation) + cascade if refuted
    for aid in tests:
        a_path, a_meta, a_body = updated_map.get(aid) or existing[aid]
        a_meta = dict(a_meta)
        if val_id:
            a_meta["validated_by"] = append_unique(a_meta.get("validated_by"), val_id)
        if outcome in ("confirmed", "refined") and fct_id:
            a_meta["status"] = "promoted"
            a_meta["promoted_to"] = append_unique(a_meta.get("promoted_to"), fct_id)
        elif outcome == "refuted":
            a_meta["status"] = "invalidated"
        a_meta["updated_at"] = today
        updated_map[aid] = (a_path, a_meta, a_body)

    if outcome == "refuted" and tests:
        refuted_set = set(tests)
        for rid, (r_path, r_meta, r_body) in existing.items():
            if r_meta.get("type") not in {"constraint", "requirement", "criterion", "decision"}:
                continue
            if any(u in refuted_set for u in (r_meta.get("underpinned_by") or [])):
                if r_meta.get("status") not in {"broken", "needs_review", "deprecated", "superseded", "rejected"}:
                    r_meta_copy = dict(r_meta)
                    r_meta_copy["status"] = "broken" if r_meta.get("type") == "requirement" else "needs_review"
                    r_meta_copy["updated_at"] = today
                    updated_map[rid] = (r_path, r_meta_copy, r_body)

    for sid in supersedes:
        s_path, s_meta, s_body = updated_map.get(sid) or existing[sid]
        s_meta = dict(s_meta)
        s_meta["status"] = "superseded"
        s_meta["updated_at"] = today
        updated_map[sid] = (s_path, s_meta, s_body)

    updated = [(p, dump_record(m, b), m) for p, m, b in updated_map.values()]
    _write_files(created, updated, dry_run)

    primary_id = fct_id or val_id or ""
    primary_title = fct_title or val_title
    return {
        "kind": "fact",
        "primary_id": primary_id,
        "fact": fct_id,
        "validation": val_id,
        "title": primary_title,
        "status": "active" if fct_id else "completed",
        "tests": tests,
        "outcome": outcome if val_id else None,
        "files": [str(p.relative_to(root)) for p, _, _ in created],
        "updated_files": [str(p.relative_to(root)) for p, _, _ in updated],
    }


def _ingest_decision(payload: dict, root: Path, existing: dict[str, tuple[Path, dict, str]], alloc: IdAllocator,
                     dirs: dict[str, Path], default_domain: str, owners: list[str], today: str, provenance: str, dry_run: bool) -> dict:
    satisfies = payload["satisfies"]
    underpinned_in = payload.get("underpinned_by", [])
    supersedes = payload.get("supersedes", [])
    check_refs(satisfies, existing, {"requirement", "constraint"})
    check_refs(underpinned_in, existing, {"fact", "assumption"})
    check_refs(supersedes, existing, {"decision"})

    dec_in = payload["decision"]
    statement = re.sub(r"[ \t]+", " ", dec_in["statement"]).strip()
    title = (dec_in.get("title") or "").strip() or derive_title(statement)
    inferred_domain = existing[satisfies[0]][1].get("domain") if satisfies else None
    domain = slugify(dec_in.get("domain") or inferred_domain or default_domain, 40)

    dec_id = alloc.next("DEC")
    asm_ids, created = mint_inline_assumptions(payload.get("new_assumptions", []), alloc, dirs, domain, owners, today, dec_id, provenance)
    underpinned = list(underpinned_in) + asm_ids
    open_refs = [u for u in underpinned if u in asm_ids or
                 (existing.get(u, (None, {}, ""))[1].get("type") == "assumption" and existing[u][1].get("status") in OPEN_ASM)]
    status = "provisional" if open_refs else "proposed"

    meta: dict = {
        "id": dec_id, "type": "decision", "title": title, "domain": domain,
        "status": status, "satisfies": satisfies, "underpinned_by": underpinned,
    }
    if supersedes:
        meta["supersedes"] = supersedes
    meta.update({"owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today})

    context_text = (dec_in.get("context") or "").strip() or (
        "Decision to satisfy " + ", ".join(f"`{s}`" for s in satisfies)
        + " underpinned by " + ", ".join(f"`{u}`" for u in underpinned) + "."
    )
    body = f"## Context\n{context_text}\n\n## Decision\n{statement}"
    if (dec_in.get("alternatives") or "").strip():
        body += f"\n\n## Alternatives Considered\n{dec_in['alternatives'].strip()}"
    if (dec_in.get("consequences") or "").strip():
        body += f"\n\n## Consequences\n{dec_in['consequences'].strip()}"
    if (dec_in.get("notes") or "").strip():
        body += f"\n\n## Notes\n{dec_in['notes'].strip()}"
    body += f"\n\n## Provenance\n{provenance}"
    created.insert(0, (dirs["decision"] / f"{dec_id}-{slugify(title)}.md", dump_record(meta, body), meta))

    updated: list[tuple[Path, str, dict]] = []
    for sid in supersedes:
        s_path, s_meta, s_body = existing[sid]
        s_meta = dict(s_meta)
        s_meta["status"] = "superseded"
        s_meta["updated_at"] = today
        updated.append((s_path, dump_record(s_meta, s_body), s_meta))

    _write_files(created, updated, dry_run)
    return {
        "kind": "decision",
        "primary_id": dec_id,
        "decision": dec_id,
        "title": title,
        "status": status,
        "satisfies": satisfies,
        "assumptions": asm_ids,
        "files": [str(p.relative_to(root)) for p, _, _ in created],
        "updated_files": [str(p.relative_to(root)) for p, _, _ in updated],
    }


def _ingest_question(payload: dict, root: Path, existing: dict[str, tuple[Path, dict, str]], alloc: IdAllocator,
                     dirs: dict[str, Path], default_domain: str, owners: list[str], today: str, provenance: str, dry_run: bool) -> dict:
    affects = payload.get("affects", [])
    check_refs(affects, existing, {"requirement", "constraint", "criterion", "decision", "spec", "change"})
    qst_in = payload["question"]
    statement = re.sub(r"[ \t]+", " ", qst_in["statement"]).strip()
    title = (qst_in.get("title") or "").strip() or derive_title(statement)
    blocking = qst_in.get("blocking", True)

    inferred_domain = existing[affects[0]][1].get("domain") if affects else None
    domain = slugify(qst_in.get("domain") or inferred_domain or default_domain, 40)

    qst_id = alloc.next("QST")
    meta: dict = {
        "id": qst_id, "type": "question", "title": title, "domain": domain,
        "status": "open", "blocking": bool(blocking),
    }
    if affects:
        meta["affects"] = affects
    meta.update({"owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today})

    body = f"## Question\n{statement}"
    if (qst_in.get("context") or "").strip():
        body += f"\n\n## Context & Options\n{qst_in['context'].strip()}"
    if (qst_in.get("notes") or "").strip():
        body += f"\n\n## Notes\n{qst_in['notes'].strip()}"
    body += f"\n\n## Provenance\n{provenance}"
    created = [(dirs["question"] / f"{qst_id}-{slugify(title)}.md", dump_record(meta, body), meta)]

    updated: list[tuple[Path, str, dict]] = []
    if blocking:
        for target_id in affects:
            t_path, t_meta, t_body = existing[target_id]
            if t_meta.get("status") in ACTIVE_STATES:
                t_meta = dict(t_meta)
                t_meta["status"] = "provisional"
                t_meta["updated_at"] = today
                updated.append((t_path, dump_record(t_meta, t_body), t_meta))

    _write_files(created, updated, dry_run)
    return {
        "kind": "question",
        "primary_id": qst_id,
        "question": qst_id,
        "title": title,
        "status": "open",
        "blocking": bool(blocking),
        "affects": affects,
        "files": [str(p.relative_to(root)) for p, _, _ in created],
        "updated_files": [str(p.relative_to(root)) for p, _, _ in updated],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--issue-body-file", type=Path)
    src.add_argument("--payload-file", type=Path)
    ap.add_argument("--issue", type=int)
    ap.add_argument("--issue-title", help="Issue title; '[capture] <title>' sets the record title")
    ap.add_argument("--author")
    ap.add_argument("--reserved-ids-file", type=Path, help="IDs already used on open capture branches (one per line)")
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    reserved = set()
    if args.reserved_ids_file and args.reserved_ids_file.exists():
        reserved = {ln.strip() for ln in args.reserved_ids_file.read_text().splitlines() if ln.strip()}
    author = re.sub(r"[^A-Za-z0-9-]", "", args.author or "") or None

    try:
        if args.issue_body_file:
            payload = payload_from_issue(args.issue_body_file.read_text(), args.issue_title)
        else:
            payload = yaml.safe_load(args.payload_file.read_text())
            if not isinstance(payload, dict):
                raise CaptureError("The payload must be an object.")
        summary = ingest(payload, args.root.resolve(), args.issue, author, reserved, args.dry_run)
    except CaptureError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 2
    print(json.dumps({"ok": True, **summary}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
