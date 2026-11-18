# ASDLC Meta-Specs — Technology Stack & Implementation Contract

This document lives **outside** the epistemic specification corpus (`records/`) so that all assumptions (`ASM`), facts (`FCT`), questions (`QST`), requirements (`REQ`), and specifications (`SPC`) remain 100% technology-stack-agnostic (`python3 tools/spec.py check --strict`).

Together with the rendered specifications (`SPC-0001`, `SPC-0002`, `SPC-0003`), this file provides the complete technical binding needed to build and verify the entire repository from scratch.

---

## 1. Runtime & Tooling Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **CLI & Checker (`tools/spec.py`)** | **Python 3.10+** + **`PyYAML`** (`requirements.txt`) | Single-file CLI (~400 LOC) implementing `check`, `impact`, `render`, and `index`. Uses only the Python standard library (`argparse`, `datetime.date`, `json`, `os`, `pathlib`, `re`, `subprocess`, `sys`) plus `yaml.safe_load`. |
| **Automated Test Suite (`tests/test_spec.py`)** | **Python `unittest`** | Unit and acceptance test suite executed via `python3 -m unittest discover -s tests -v`. |
| **Static Web Workspace (`site/`)** | **HTML5 (`site/index.html`)**, **Vanilla ES Module (`site/app.js`)**, **CSS3 (`site/styles.css`)** | Zero-build single-page application served statically (GitHub Pages or `python3 -m http.server -d site 8000`), reading `site/data/index.json`. |
| **CI / CD (`.github/workflows/`)** | **GitHub Actions** | Runs `python tools/spec.py check --strict` and `python -m unittest discover -s tests -v` on every push/PR, and deploys `site/` to GitHub Pages on `main`. |

---

## 2. File & Record Conventions (`records/`)

1. **Path & Filename:** Every record is a UTF-8 Markdown file in `records/` named `<ID>-<slug>.md`, where `<ID>` matches `^(ASM|FCT|QST|REQ|SPC)-\d{4}$`.
2. **YAML Front Matter:** Bounded by `---\n...\n---\n` at the top of the file.
   - Common keys: `id` (string), `title` (string), `status` (string).
   - `ASM` keys: `status` in `{"open", "validated", "invalidated"}`, optional `confidence` (float `0..1`), `promoted_to` (`FCT-xxxx`, required when `validated`). Markdown sections: `## Statement`, `## How we validate it`.
   - `FCT` keys: `status` in `{"active", "deprecated"}`, `evidence` (non-empty string, required), optional `promoted_from` (`ASM-xxxx`), optional `review_after` (`YYYY-MM-DD`). Markdown section: `## Statement`.
   - `QST` keys: `status` in `{"open", "answered"}`, `blocks` (non-empty list of `REQ-xxxx` / `SPC-xxxx`), optional `answered_by` (`FCT-xxxx` or `ASM-xxxx`, required when `answered`, forbidden when `open`). Markdown section: `## Question`.
   - `REQ` keys: `status` in `{"provisional", "active", "broken"}`, `because` (non-empty list of `FCT-xxxx` / `ASM-xxxx`). Markdown sections: `## Statement`, `## Acceptance` (one or more scenario blocks separated by blank lines, each line prefixed with `- Given ...`, `- When ...`, `- Then ...`).
   - `SPC` keys: `status` in `{"draft", "active"}`, `tier` in `{"skeleton", "feature"}`, `requirements` (list of `REQ-xxxx`), optional `depends_on` (list of `SPC-xxxx`). Markdown section: `## Purpose`.
3. **Stack-Term Guardrail (`STACK_TERMS`):** Whole-word case-insensitive regex `(?<![\w-])(...)(?![\w-])` scanned across `r.title + "\n" + r.body` (not front-matter `evidence`):
   `postgres`, `postgresql`, `mysql`, `sqlite`, `mongodb`, `redis`, `kafka`, `rabbitmq`, `react`, `vue`, `angular`, `svelte`, `django`, `flask`, `fastapi`, `spring`, `rails`, `node.js`, `nodejs`, `typescript`, `javascript`, `python`, `java`, `golang`, `docker`, `kubernetes`, `aws`, `azure`, `gcp`, `graphql`, `grpc`, `json schema`.

---

## 3. Module API & CLI Contract (`tools/spec.py`)

### Python Module API (`tools/spec.py`)

- `TYPES = {"ASM": "assumption", "FCT": "fact", "QST": "question", "REQ": "requirement", "SPC": "spec"}`
- `class Record(path: Path, meta: dict, body: str)`:
  - Attributes: `self.path`, `self.meta`, `self.body`, `self.id = str(meta.get("id", ""))`, `self.prefix = self.id[:3]`, `self.status = meta.get("status")`, `self.title = meta.get("title", "")`.
  - Methods: `links() -> list[str]`, `section(heading: str) -> str`, `scenarios() -> list[list[str]]` (splits `## Acceptance` on blank lines and strips leading `-`).
- `load(root: Path = RECORDS) -> dict[str, Record]`: loads sorted `*.md` files into a dict keyed by `rec.id` (raising `SystemExit` on missing front matter or duplicate `id`).
- `check(records: dict[str, Record]) -> tuple[list[str], list[str]]`: returns `(errors, warnings)` where each entry is formatted as `"<r.path.name>: <message>"` (or `"spec dependency cycle: a -> b -> a"`).
- `open_questions(r: Record, records: dict[str, Record]) -> list[str]`: returns sorted `QST` IDs with `status == "open"` that list `r.id` in `blocks`.
- `readiness(spec: Record, records: dict[str, Record]) -> int`: returns `round(100 * len(active_reqs) / len(reqs))` or `0` if empty.
- `topo(specs: list[Record], records: dict[str, Record]) -> list[Record]`: orders specs with `skeleton` before `feature` and dependencies before dependents, raising `ValueError("spec dependency cycle: ...")` on cycles.
- `impact(changed: str, records: dict[str, Record]) -> tuple[list[str], list[Record]]`: returns `(sorted_non_spec_ids, ordered_spec_records)` downstream of `changed`.
- `render_markdown(spec: Record, records: dict[str, Record]) -> str` and `render_gherkin(spec: Record, records: dict[str, Record]) -> str`.
- `to_index(records: dict[str, Record]) -> dict` and `main(argv: list[str] | None = None) -> int`.

### CLI Subcommands

1. `python tools/spec.py check [--strict]`
   - Prints `WARN  <filename>: <message>` for each warning and `ERROR <filename>: <message>` for each error.
   - Prints summary line: `<N> records · <E> errors · <W> warnings`.
   - If `errors == 0`, prints each spec in topological order (`skeleton` before `feature`, breaking ties by ID):
     `  <SPC-ID> [<tier:<8>] <readiness:>3}% ready  <title>`
   - Exits with code `1` if `errors > 0` or (`--strict` and `warnings > 0`), else `0`.
2. `python tools/spec.py impact <ID>`
   - Exits with `1` and prints `unknown record <ID>` if `<ID>` is not in `records/`.
   - Otherwise prints:
     ```text
     Changing <ID> affects: <comma-separated sorted non-SPC IDs or 'nothing'>
     Rebuild specs in order: <SPC-ID -> SPC-ID ... or 'none'>
     ```
3. `python tools/spec.py render [--tier skeleton|feature] [--format markdown|gherkin] [--out DIR]`
   - Default `--format` is `markdown` (`.md`); `gherkin` writes `.feature` files. Default `--out` is `dist`.
   - Writes `<out>/<SPC-ID><ext>` for each matching spec in topological order and prints `wrote <out>/<SPC-ID><ext>`.
4. `python tools/spec.py index [--out FILE]`
   - Default `--out` is `site/data/index.json`.
   - Serializes the JSON object returned by `to_index(records)` with `indent=1, ensure_ascii=False` and prints `wrote <out>`.

### `site/data/index.json` Schema

```json
{
  "repo": "owner/name",
  "summary": { "records": 30, "errors": 0, "warnings": 0 },
  "spec_order": ["SPC-0001", "SPC-0002", "SPC-0003"],
  "records": [
    {
      "id": "REQ-0001",
      "title": "...",
      "status": "active",
      "because": ["FCT-0001", "FCT-0002"],
      "type": "requirement",
      "path": "records/REQ-0001-atomic-records.md",
      "body": "## Statement\n...",
      "downstream": ["SPC-0001", "SPC-0002", "SPC-0003"],
      "issues": [],
      "open_questions": []
    }
  ]
}
```
- `created_at` and `updated_at` front-matter keys are omitted from `records` entries.
- Specs additionally carry `"readiness": <0..100>` and `"open_questions": [...]`.
- Any check errors/warnings for a record are attached to its `"issues"` list as `"error: <msg>"` or `"warning: <msg>"` (matching `name[:8]` against `r.id`).

---

## 4. Web Workspace Architecture (`site/`)

- **`site/index.html`**: Sticky glass top bar with brand link (`#/`), 5 primary navigation links (`Dashboard` `#/`, `Tasks` `#/tasks`, `Graph` `#/graph`, `Records` `#/records`, `Capture` `#/capture/requirement`), `#theme-toggle` button (`Theme: System` / `Light` / `Dark`), `<main id="main" tabindex="-1">`, and footer with `#repo-link`.
- **`site/app.js`**:
  - Fetches `data/index.json` (`cache: "no-cache"`), builds lookup maps (`byId`, `askedBy`, `usedBy`), attaches a badge with total task count to the `Tasks` nav link, and routes on `location.hash`.
  - Uses `localStorage` under prefix `asdlc:` (`asdlc:theme` and `asdlc:capture:<kind>`).
  - Uses `document.startViewTransition` when switching top-level routes unless `prefers-reduced-motion: reduce` is active.
  - Implements the 5 views specified in `SPC-0003` (`dashboard`, `tasksView`, `graph`, `records`/`record`, `capture`).
- **`site/styles.css`**: CSS custom properties for light/dark color tokens (`--bg`, `--fg`, `--card`, `--line`, `--done`, `--wait`, `--bad`, `--off`, `--dep`), responsive grid layouts, `.glass` backdrop blur, and z-index layering for the interactive graph (`.graph.focus .node.lit`, `.edges-base`, `.edges-live`).
