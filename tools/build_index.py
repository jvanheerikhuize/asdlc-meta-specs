#!/usr/bin/env python3
"""
Compile the canonical record store into site/data/index.json for the GitHub Pages workspace.

Usage: python tools/build_index.py [--root PATH] [--out PATH]
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recordlib import ROOT, iter_record_files, load_config, parse_record, sections  # noqa: E402

LINK_FIELDS = [
    "underpinned_by", "governed_by", "verified_by", "verifies", "satisfies",
    "validated_by", "promoted_to", "promoted_from", "tests", "establishes",
    "evidence", "supersedes", "parent", "target_spec",
]
META_FIELDS = [
    "confidence", "risk", "validation_plan", "method", "outcome", "source", "scope",
    "enforcement", "category", "normative", "ears_pattern", "priority", "format",
    "owners", "tags", "created_at", "updated_at",
]


def build(root: Path) -> dict:
    config = load_config(root)
    publish_text = config.get("site", {}).get("publish", "full") == "full"
    records = []
    for type_name, path in iter_record_files(config, root):
        try:
            meta, body = parse_record(path)
        except ValueError:
            continue  # validate.py reports these
        entry = {
            "id": meta.get("id"),
            "type": meta.get("type", type_name),
            "title": meta.get("title", ""),
            "status": meta.get("status", ""),
            "domain": meta.get("domain", ""),
            "path": str(path.relative_to(root)),
            "links": {f: meta[f] for f in LINK_FIELDS if meta.get(f)},
        }
        for f in META_FIELDS:
            if meta.get(f) is not None:
                entry[f] = str(meta[f]) if f.endswith("_at") else meta[f]
        if meta.get("composition"):
            entry["composition"] = meta["composition"]
        if meta.get("deltas"):
            entry["deltas"] = meta["deltas"]
        if publish_text:
            entry["sections"] = sections(body)
        records.append(entry)

    domains = sorted({r["domain"] for r in records if r["domain"]} | {config.get("site", {}).get("default_domain", "general")})
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project": {
            "name": config["project"]["name"],
            "description": config["project"].get("description", ""),
            "github": config["project"].get("github", ""),
            "publish": "full" if publish_text else "metadata",
            "default_domain": config.get("site", {}).get("default_domain", "general"),
        },
        "domains": domains,
        "records": records,
    }


def main() -> int:
    root = Path(sys.argv[sys.argv.index("--root") + 1]).resolve() if "--root" in sys.argv else ROOT
    out = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else root / "site/data/index.json"
    index = build(root)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print(f"Wrote {out} ({len(index['records'])} records, publish={index['project']['publish']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
