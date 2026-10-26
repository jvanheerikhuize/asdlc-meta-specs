#!/usr/bin/env python3
"""
Turn a capture (GitHub issue body or raw payload) into canonical record files.

Input  : an issue body produced by .github/ISSUE_TEMPLATE/capture-requirement.yml
         (structured `Payload` field from the Pages app, OR the plain fields filled in by hand),
         or a raw JSON/YAML payload file (--payload-file).
Output : new REQ / ASM / ACR markdown files in the record store + a JSON summary on stdout.

The input is UNTRUSTED. It is parsed with yaml.safe_load, validated against
schema/captures/requirement.capture.schema.json, and only ever written as data.

Usage:
  python tools/ingest_capture.py --issue-body-file body.md [--issue 12] [--author octocat]
                                 [--reserved-ids-file ids.txt] [--root PATH] [--dry-run]
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


def payload_from_issue(body: str) -> dict:
    secs = issue_sections(body)
    raw = strip_fence(find(secs, "Payload"))
    if raw.strip():
        try:
            payload = yaml.safe_load(raw)
        except yaml.YAMLError as exc:
            raise CaptureError(f"The payload is not valid YAML/JSON: {exc}") from exc
        if not isinstance(payload, dict):
            raise CaptureError("The payload must be an object.")
        return payload

    # Hand-filled issue form: build the payload from plain fields.
    statement = find(secs, "What should the system do")
    why = find(secs, "Why")
    refs = re.findall(r"\b(?:FCT|ASM)-\d{4}\b", find(secs, "Existing facts"))
    payload: dict = {"kind": "requirement", "version": 1, "requirement": {"statement": statement}}
    domain = find(secs, "Domain")
    if domain:
        payload["requirement"]["domain"] = domain
    prio = find(secs, "Priority")
    m = re.match(r"(p[0-3])", prio.lower())
    if m:
        payload["requirement"]["priority"] = m.group(1)
    if refs:
        payload["underpinned_by"] = sorted(set(refs))
    beliefs = [ln.strip(" -*\t") for ln in why.splitlines() if ln.strip(" -*\t")]
    if beliefs:
        payload["new_assumptions"] = [{"statement": b} for b in beliefs]
    criteria = parse_gwt(find(secs, "How will we know"))
    if criteria:
        payload["criteria"] = criteria
    return payload


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
    return text if len(text) >= 5 else (statement.strip()[:80] or "Untitled requirement")


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


def load_existing(root: Path, config: dict) -> dict[str, dict]:
    existing = {}
    for _, path in iter_record_files(config, root):
        try:
            meta, _ = parse_record(path)
            if meta.get("id"):
                existing[meta["id"]] = meta
        except ValueError:
            continue
    return existing


class IdAllocator:
    def __init__(self, taken: set[str]):
        self.taken = set(taken)

    def next(self, prefix: str) -> str:
        nums = [int(i.split("-")[1]) for i in self.taken if i.startswith(prefix + "-")]
        rid = f"{prefix}-{(max(nums) + 1 if nums else 1):04d}"
        self.taken.add(rid)
        return rid


# --------------------------------------------------------------------------- ingest

def ingest(payload: dict, root: Path, issue: int | None, author: str | None,
           reserved: set[str], dry_run: bool) -> dict:
    config = load_config(root)
    schema = json.loads((root / "schema/captures/requirement.capture.schema.json").read_text())
    problems = sorted(Draft202012Validator(schema).iter_errors(payload), key=lambda e: list(e.path))
    if problems:
        lines = []
        for e in problems[:10]:
            where = ".".join(str(p) for p in e.path) or "capture"
            msg = e.message
            if e.validator == "anyOf":
                msg = "Tell us *why*: pick at least one existing fact/assumption or write a reason."
            lines.append(f"- `{where}`: {msg}")
        raise CaptureError("The capture is incomplete or invalid:\n" + "\n".join(lines))

    existing = load_existing(root, config)
    for ref in payload.get("underpinned_by", []):
        if ref not in existing:
            raise CaptureError(f"`{ref}` does not exist in the repository.")

    alloc = IdAllocator(set(existing) | reserved)
    today = date.today().isoformat()
    req_in = payload["requirement"]
    statement = re.sub(r"[ \t]+", " ", req_in["statement"]).strip()
    title = (req_in.get("title") or "").strip() or derive_title(statement)
    domain = slugify(req_in.get("domain") or config.get("site", {}).get("default_domain", "general"), 40)
    provenance = "Captured" + (f" via issue #{issue}" if issue else "") + (f" by @{author}" if author else "") + f" on {today}."
    owners = [author] if author else []
    dirs = {t: root / s["directory"] for t, s in config["records"]["types"].items()}

    created: list[tuple[Path, str, dict]] = []  # (path, text, meta)
    req_id = alloc.next("REQ")

    # New assumptions (typed reasons) --------------------------------------
    asm_ids = []
    for a in payload.get("new_assumptions", []):
        aid = alloc.next("ASM")
        asm_ids.append(aid)
        a_stmt = re.sub(r"\s+", " ", a["statement"]).strip()
        meta = {
            "id": aid, "type": "assumption", "title": derive_title(a_stmt), "domain": domain,
            "status": "unvalidated", "confidence": a.get("confidence", 0.5), "risk": a.get("risk", "medium"),
            "validation_plan": "To be defined during review: how can we confirm or refute this?",
            "owners": owners, "tags": ["captured"], "created_at": today, "updated_at": today,
        }
        body = f"## Statement\n{a_stmt}\n\n## Context\nCaptured as rationale for `{req_id}`. {provenance}"
        created.append((dirs["assumption"] / f"{aid}-{slugify(meta['title'])}.md", dump_record(meta, body), meta))

    underpinned = list(payload.get("underpinned_by", [])) + asm_ids
    open_refs = [u for u in underpinned if u in asm_ids or
                 (existing.get(u, {}).get("type") == "assumption" and existing[u].get("status") in OPEN_ASM)]
    status = "provisional" if open_refs else "draft"

    # Acceptance criteria ----------------------------------------------------
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

    # Requirement ------------------------------------------------------------
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

    if not dry_run:
        for path, text, _ in created:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)

    return {
        "requirement": req_id,
        "title": title,
        "status": status,
        "assumptions": asm_ids,
        "criteria": acr_ids,
        "files": [str(p.relative_to(root)) for p, _, _ in created],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--issue-body-file", type=Path)
    src.add_argument("--payload-file", type=Path)
    ap.add_argument("--issue", type=int)
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
            payload = payload_from_issue(args.issue_body_file.read_text())
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
