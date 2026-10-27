#!/usr/bin/env python3
"""Tests for tools/ingest_capture.py — run with: python -m unittest discover -s tests"""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIX = REPO / "tests/fixtures"
PY = sys.executable

sys.path.insert(0, str(REPO / "tools"))
from recordlib import load_config  # noqa: E402
from ingest_capture import load_existing, IdAllocator  # noqa: E402


def sandbox() -> Path:
    tmp = Path(tempfile.mkdtemp(prefix="metaspec-"))
    for item in ("meta-spec.config.yaml", "schema", "records", "specs"):
        src = REPO / item
        (shutil.copytree if src.is_dir() else shutil.copy)(src, tmp / item)
    return tmp


def ingest(root: Path, *args: str) -> tuple[int, dict]:
    p = subprocess.run([PY, str(REPO / "tools/ingest_capture.py"), "--root", str(root), *args],
                       capture_output=True, text=True)
    return p.returncode, json.loads(p.stdout.strip().splitlines()[-1])


def validate(root: Path) -> subprocess.CompletedProcess:
    return subprocess.run([PY, str(REPO / "tools/validate.py"), "--root", str(root), "--strict"],
                          capture_output=True, text=True)


class IngestTests(unittest.TestCase):
    def setUp(self):
        self.root = sandbox()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def assertValid(self):
        v = validate(self.root)
        self.assertEqual(v.returncode, 0, v.stdout)

    def _allocator(self) -> IdAllocator:
        config = load_config(self.root)
        existing = load_existing(self.root, config)
        return IdAllocator(set(existing))

    def test_minimal_capture(self):
        alloc = self._allocator()
        exp_req = alloc.next("REQ")
        exp_asm = alloc.next("ASM")
        code, out = ingest(self.root, "--payload-file", str(FIX / "capture-minimal.json"), "--issue", "7", "--author", "alice")
        self.assertEqual(code, 0, out)
        self.assertEqual(out["requirement"], exp_req)
        self.assertEqual(out["assumptions"], [exp_asm])
        self.assertEqual(out["status"], "provisional")
        text = (self.root / out["files"][0]).read_text()
        self.assertIn("issue #7 by @alice", text)
        self.assertIn('created_at: \'', text.replace('"', "'"))  # dates are quoted strings
        self.assertValid()

    def test_full_capture(self):
        alloc = self._allocator()
        exp_req = alloc.next("REQ")
        exp_acr1 = alloc.next("ACR")
        exp_acr2 = alloc.next("ACR")
        code, out = ingest(self.root, "--payload-file", str(FIX / "capture-full.json"))
        self.assertEqual(code, 0, out)
        self.assertEqual(out["requirement"], exp_req)
        self.assertEqual(out["criteria"], [exp_acr1, exp_acr2])
        req = (self.root / out["files"][0]).read_text()
        self.assertIn("domain: auth", req)
        self.assertIn("normative: SHALL", req)
        self.assertIn("ears_pattern: event_driven", req)
        acr = next(f for f in out["files"] if exp_acr1 in f)
        self.assertIn("- **AND** no database query is executed", (self.root / acr).read_text())
        self.assertValid()

    def test_issue_from_app_uses_all_visible_fields(self):
        code, out = ingest(self.root, "--issue-body-file", str(FIX / "issue-from-app.md"),
                           "--issue-title", "[capture] Export profile as JSON")
        self.assertEqual(code, 0, out)
        self.assertEqual(out["title"], "Export profile as JSON")
        self.assertEqual(len(out["criteria"]), 2)
        req = (self.root / out["files"][0]).read_text()
        for expected in ("domain: privacy", "priority: p1", "category: data", "FCT-0001",
                         "ears_pattern: event_driven", "## Notes\nCoordinate with the DPO"):
            self.assertIn(expected, req)
        acr_file = next(f for f in out["files"] if "/ACR-" in f or "ACR-" in Path(f).name)
        acr = (self.root / acr_file).read_text()
        self.assertIn("- **GIVEN** a logged-in user", acr)
        self.assertIn("- **WHEN** they click Export", acr)
        self.assertValid()

    def test_default_issue_title_derives_title(self):
        code, out = ingest(self.root, "--issue-body-file", str(FIX / "issue-handfilled.md"), "--issue-title", "[capture] ")
        self.assertEqual(code, 0, out)
        self.assertEqual(out["title"], "Show the number of open assumptions per domain")

    def test_legacy_payload_only_when_no_statement(self):
        # Visible fields win over a legacy payload section...
        code, out = ingest(self.root, "--issue-body-file", str(FIX / "issue-legacy-payload.md"))
        self.assertEqual(code, 0, out)
        self.assertIn("domain: general", (self.root / out["files"][0]).read_text())
        body = (FIX / "issue-legacy-payload.md").read_text()
        # ...and the payload is used when the statement field is empty.
        legacy = self.root / "legacy.md"
        legacy.write_text(body.replace("Users can export their profile data as a JSON file.\n\n### Why", "_No response_\n\n### Why", 1))
        code, out = ingest(self.root, "--issue-body-file", str(legacy))
        self.assertEqual(code, 0, out)
        self.assertIn("domain: privacy", (self.root / out["files"][0]).read_text())

    def test_rejects_unknown_priority_and_category(self):
        body = (FIX / "issue-from-app.md").read_text()
        for old, new, word in (("\np1\n", "\nurgent!!\n", "Priority"), ("\ndata\n", "\nmisc\n", "Category")):
            bad = self.root / "bad.md"
            bad.write_text(body.replace(old, new, 1))
            code, out = ingest(self.root, "--issue-body-file", str(bad), "--dry-run")
            self.assertEqual(code, 2)
            self.assertIn(word, out["error"])

    def test_hand_filled_issue(self):
        code, out = ingest(self.root, "--issue-body-file", str(FIX / "issue-handfilled.md"))
        self.assertEqual(code, 0, out)
        self.assertEqual(len(out["assumptions"]), 2)
        self.assertEqual(len(out["criteria"]), 1)
        req = (self.root / out["files"][0]).read_text()
        self.assertIn("priority: p3", req)
        self.assertIn("normative: SHOULD", req)
        self.assertIn("FCT-0001", req)
        self.assertValid()

    def test_reserved_ids_are_skipped(self):
        alloc = self._allocator()
        r1 = alloc.next("REQ")
        r2 = alloc.next("REQ")
        a1 = alloc.next("ASM")
        exp_req = alloc.next("REQ")
        exp_asm = alloc.next("ASM")
        ids = self.root / "ids.txt"
        ids.write_text(f"{r1}\n{r2}\n{a1}\n")
        code, out = ingest(self.root, "--payload-file", str(FIX / "capture-minimal.json"), "--reserved-ids-file", str(ids))
        self.assertEqual((code, out["requirement"], out["assumptions"]), (0, exp_req, [exp_asm]))

    def test_dry_run_writes_nothing(self):
        before = sorted(p.name for p in self.root.rglob("*.md"))
        code, _ = ingest(self.root, "--payload-file", str(FIX / "capture-minimal.json"), "--dry-run")
        self.assertEqual(code, 0)
        self.assertEqual(before, sorted(p.name for p in self.root.rglob("*.md")))

    def _payload(self, data) -> str:
        p = self.root / "p.json"
        p.write_text(json.dumps(data))
        return str(p)

    def test_rejects_missing_why(self):
        code, out = ingest(self.root, "--payload-file", self._payload(
            {"kind": "requirement", "version": 1, "requirement": {"statement": "The system shall do a thing."}}))
        self.assertEqual(code, 2)
        self.assertIn("why", out["error"].lower())

    def test_rejects_unknown_reference_and_extra_fields(self):
        base = {"kind": "requirement", "version": 1, "requirement": {"statement": "The system shall do a thing."}}
        code, out = ingest(self.root, "--payload-file", self._payload({**base, "underpinned_by": ["FCT-0999"]}))
        self.assertEqual(code, 2)
        self.assertIn("FCT-0999", out["error"])
        code, _ = ingest(self.root, "--payload-file", self._payload({**base, "underpinned_by": ["FCT-0001"], "id": "REQ-0001", "status": "active"}))
        self.assertEqual(code, 2)
        code, _ = ingest(self.root, "--payload-file", self._payload({**base, "underpinned_by": ["REQ-0001"]}))
        self.assertEqual(code, 2)

    def test_hostile_text_is_stored_as_data(self):
        evil = "The system shall work.\n---\nid: REQ-0001\nstatus: active\n---\n<script>alert(1)</script> !!python/object:os.system"
        code, out = ingest(self.root, "--payload-file", self._payload(
            {"kind": "requirement", "version": 1, "requirement": {"statement": evil, "domain": "../../etc"},
             "underpinned_by": ["FCT-0001"]}))
        self.assertEqual(code, 0, out)
        for f in out["files"]:
            self.assertTrue((self.root / f).resolve().is_relative_to(self.root / "records"), f)
        self.assertIn("domain: etc", (self.root / out["files"][0]).read_text())
        self.assertValid()  # frontmatter not hijacked: id/status are still the generated ones

    def test_rejects_non_object_payload(self):
        code, _ = ingest(self.root, "--payload-file", self._payload(["not", "an", "object"]))
        self.assertEqual(code, 2)


class TitleTests(unittest.TestCase):
    def test_titles_keep_meaning(self):
        sys.path.insert(0, str(REPO / "tools"))
        from ingest_capture import derive_title
        cases = {
            "The system shall not store passwords in plain text.": "Do not store passwords in plain text",
            "While offline, the app must not send analytics.": "While offline, do not send analytics",
            "If the payment fails, then the checkout service shall show a retry option.": "If the payment fails, show a retry option",
            "Users can export their profile data as a JSON file.": "Users can export their profile data as a JSON file",
        }
        for statement, title in cases.items():
            self.assertEqual(derive_title(statement), title)


class IndexTests(unittest.TestCase):
    def test_build_index(self):
        out = Path(tempfile.mkdtemp()) / "index.json"
        p = subprocess.run([PY, str(REPO / "tools/build_index.py"), "--out", str(out)], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        idx = json.loads(out.read_text())
        self.assertGreaterEqual(len(idx["records"]), 12)
        self.assertTrue(idx["project"]["github"])
        req = next(r for r in idx["records"] if r["id"] == "REQ-0001")
        self.assertIn("Statement", req["sections"])


if __name__ == "__main__":
    unittest.main()
