"""Shared helpers for reading the canonical record store (used by validate, build_index, ingest_capture)."""
from __future__ import annotations

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.S)


def load_config(root: Path = ROOT) -> dict:
    return yaml.safe_load((root / "meta-spec.config.yaml").read_text())


def parse_record(path: Path) -> tuple[dict, str]:
    """Return (frontmatter, markdown body). Raises ValueError on malformed files."""
    match = FRONTMATTER.match(path.read_text())
    if not match:
        raise ValueError("missing YAML frontmatter")
    try:
        meta = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as exc:
        raise ValueError(f"invalid YAML frontmatter ({exc})") from exc
    if not isinstance(meta, dict):
        raise ValueError("frontmatter is not a mapping")
    return meta, match.group(2)


def iter_record_files(config: dict, root: Path = ROOT):
    """Yield (type_name, path) for every record file in configured directories."""
    for type_name, spec in config["records"]["types"].items():
        for path in sorted((root / spec["directory"]).glob("*.md")):
            yield type_name, path


def sections(body: str) -> dict[str, str]:
    """Split a markdown body into {'Heading': 'content'} using '## ' headings."""
    out: dict[str, str] = {}
    current = None
    buf: list[str] = []
    for line in body.splitlines():
        if line.startswith("## "):
            if current is not None:
                out[current] = "\n".join(buf).strip()
            current, buf = line[3:].strip(), []
        elif current is not None:
            buf.append(line)
    if current is not None:
        out[current] = "\n".join(buf).strip()
    return out


def dump_record(meta: dict, body: str) -> str:
    """Serialise a record. Strings that look like dates are quoted by PyYAML automatically."""
    front = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=1000).strip()
    return f"---\n{front}\n---\n\n{body.strip()}\n"
