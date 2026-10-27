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
from ingest_capture import load_existing_full, IdAllocator  # noqa: E402


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
        existing = load_existing_full(self.root, config)
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

    def _issue(self, body: str) -> str:
        p = self.root / "issue.md"
        p.write_text(body)
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

    def test_assumption_capture_and_underpins_update(self):
        alloc = self._allocator()
        exp_asm = alloc.next("ASM")
        issue = self._issue(
            "### What do we assume is true?\n\nCross-region revocation stream replication across 12 edge PoPs stays under 50ms p99.\n\n"
            "### How can we validate it?\n\nRun a cross-region synthetic stream latency benchmark for 24 hours.\n\n"
            "### What breaks if this is wrong? (optional)\n\nRevoked tokens could remain valid longer than the 30s window.\n\n"
            "### Requirements, constraints or decisions that rely on this (optional)\n\nREQ-0001\n\n"
            "### Risk if wrong (optional)\n\nhigh\n\n"
            "### Initial confidence (optional)\n\n75%\n\n"
            "### Domain (optional)\n\nauth\n"
        )
        code, out = ingest(self.root, "--issue-body-file", issue, "--issue-title", "[capture:assumption] Cross-region stream replication latency")
        self.assertEqual(code, 0, out)
        self.assertEqual(out["kind"], "assumption")
        self.assertEqual(out["primary_id"], exp_asm)
        self.assertEqual(out["underpins"], ["REQ-0001"])
        self.assertEqual(len(out["updated_files"]), 1)
        asm_text = (self.root / out["files"][0]).read_text()
        self.assertIn("confidence: 0.75", asm_text)
        self.assertIn("risk: high", asm_text)
        req_text = (self.root / out["updated_files"][0]).read_text()
        self.assertIn(exp_asm, req_text)
        self.assertIn("status: provisional", req_text)
        self.assertValid()

    def test_fact_capture_promotes_open_assumption(self):
        alloc = self._allocator()
        exp_val = alloc.next("VAL")
        exp_fct = alloc.next("FCT")
        issue = self._issue(
            "### What verified fact did we establish?\n\nIn-memory denylist stream propagation completes within 45ms p99 across all gateway nodes.\n\n"
            "### Assumptions tested (optional)\n\nASM-0002\n\n"
            "### Validation outcome (optional)\n\nconfirmed\n\n"
            "### Validation method (optional)\n\nbenchmark\n\n"
            "### Validation findings & evidence (optional)\n\nMeasured 10,000 revocation events across 6 gateway instances; max propagation delay was 120ms.\n\n"
            "### Evidence links or artifacts (optional)\n\nbenchmarks/2026-10-27-denylist-propagation.json\n"
        )
        code, out = ingest(self.root, "--issue-body-file", issue, "--issue-title", "[capture:fact] Denylist propagation completes within 45ms p99")
        self.assertEqual(code, 0, out)
        self.assertEqual(out["kind"], "fact")
        self.assertEqual(out["fact"], exp_fct)
        self.assertEqual(out["validation"], exp_val)
        self.assertEqual(len(out["updated_files"]), 1)
        asm_text = (self.root / out["updated_files"][0]).read_text()
        self.assertIn("status: promoted", asm_text)
        self.assertIn(exp_val, asm_text)
        self.assertIn(exp_fct, asm_text)
        # Note: validate without --strict because REQ-0002 now points at promoted ASM-0002 (which emits a helpful review warning)
        v = subprocess.run([PY, str(REPO / "tools/validate.py"), "--root", str(self.root)], capture_output=True, text=True)
        self.assertEqual(v.returncode, 0, v.stdout)

    def test_fact_capture_refutes_assumption_and_cascades_broken(self):
        alloc = self._allocator()
        exp_val = alloc.next("VAL")
        issue = self._issue(
            "### What verified fact did we establish?\n\n_No response_\n\n"
            "### Assumptions tested (optional)\n\nASM-0002\n\n"
            "### Validation outcome (optional)\n\nrefuted\n\n"
            "### Validation method (optional)\n\nprototype_spike\n\n"
            "### Validation findings & evidence (optional)\n\nDuring WAN partition tests, pub/sub messages were dropped and revocation took over 15 minutes.\n"
        )
        code, out = ingest(self.root, "--issue-body-file", issue, "--issue-title", "[capture:fact] Pub/sub drops messages under partition")
        self.assertEqual(code, 0, out)
        self.assertIsNone(out["fact"])
        self.assertEqual(out["validation"], exp_val)
        # ASM-0002 (invalidated) plus both REQ-0002 and ACR-0002 (broken) are updated
        self.assertEqual(len(out["updated_files"]), 3)
        self.assertValid()

    def test_decision_capture_from_issue(self):
        alloc = self._allocator()
        exp_dec = alloc.next("DEC")
        exp_asm = alloc.next("ASM")
        issue = self._issue(
            "### What did we decide?\n\nUse durable append-only event streams with consumer-group offsets instead of fire-and-forget broadcast for revocation events.\n\n"
            "### Which requirements or constraints does this satisfy?\n\nREQ-0002, CON-0001\n\n"
            "### Existing facts or assumptions that justify this option (optional)\n\nFCT-0001\n\n"
            "### New reasons or assumptions (optional)\n\nGateway nodes can replay missed stream entries on reconnect within 2 seconds.\n\n"
            "### Alternatives considered (optional)\n\nDedicated external message broker cluster — rejected to avoid operating a separate stateful tier.\n\n"
            "### Consequences & trade-offs (optional)\n\nBounded stream memory on the edge cache (~10MB for 24h of revocations).\n"
        )
        code, out = ingest(self.root, "--issue-body-file", issue, "--issue-title", "[capture:decision] Use durable event streams for revocation")
        self.assertEqual(code, 0, out)
        self.assertEqual(out["kind"], "decision")
        self.assertEqual(out["decision"], exp_dec)
        self.assertEqual(out["assumptions"], [exp_asm])
        self.assertEqual(out["status"], "provisional")
        self.assertValid()

    def test_question_capture_from_issue(self):
        alloc = self._allocator()
        exp_qst = alloc.next("QST")
        issue = self._issue(
            "### What needs clarification?\n\n"
            "Should token verification fail open or fail closed when the local key rotation cache expires during a control-plane outage?\n\n"
            "### Context or options under consideration (optional)\n\n"
            "- **Option A (Fail closed)**: Reject all requests once the key rotation cache expires.\n"
            "- **Option B (Fail open with grace window)**: Continue accepting requests signed by the last known key for up to 15 minutes.\n\n"
            "### Requirements, constraints, decisions or specs affected (optional)\n\n"
            "REQ-0001, SPC-0001\n\n"
            "### Blocks release until answered? (optional)\n\n"
            "true\n\n"
            "### Domain (optional)\n\n"
            "auth\n"
        )
        code, out = ingest(self.root, "--issue-body-file", issue, "--issue-title", "[capture:question] Key rotation cache expiry behavior")
        self.assertEqual(code, 0, out)
        self.assertEqual(out["kind"], "question")
        self.assertEqual(out["question"], exp_qst)
        self.assertEqual(out["primary_id"], exp_qst)
        self.assertTrue(out["blocking"])
        self.assertEqual(out["affects"], ["REQ-0001", "SPC-0001"])
        # REQ-0001 was active, so a blocking question cascades it to provisional
        self.assertEqual(len(out["updated_files"]), 1)
        req_text = (self.root / out["updated_files"][0]).read_text(encoding="utf-8")
        self.assertIn("status: provisional", req_text)
        qst_text = (self.root / out["files"][0]).read_text(encoding="utf-8")
        self.assertIn("blocking: true", qst_text)
        self.assertIn("## Context & Options", qst_text)
        self.assertValid()

    def test_tech_stack_leakage_warning_in_strict_mode(self):
        req_file = self.root / "records/normative/requirements/REQ-0001-stateless-token-verification.md"
        text = req_file.read_text(encoding="utf-8")
        req_file.write_text(
            text.replace("## Statement\n", "## Statement\nThe gateway MUST query PostgreSQL for every JWT token.\n"),
            encoding="utf-8",
        )
        v = validate(self.root)
        self.assertEqual(v.returncode, 1)
        self.assertIn("tech-stack term(s)", v.stdout)


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
        val = next(r for r in idx["records"] if r["id"] == "VAL-0001")
        self.assertEqual(val["artifacts"], ["benchmarks/2026-10-24-gateway-replay-results.json"])


class ProjectionTests(unittest.TestCase):
    def test_project_compile_and_check(self):
        out_root = Path(tempfile.mkdtemp(prefix="metaspec-proj-"))
        try:
            p = subprocess.run(
                [PY, str(REPO / "tools/project.py"), "--root", str(REPO), "--out-root", str(out_root)],
                capture_output=True, text=True,
            )
            self.assertEqual(p.returncode, 0, p.stderr)
            expected_files = [
                out_root / "dist/openspec/specs/auth/spec.md",
                out_root / "dist/openspec/changes/add-revocation-denylist/specs/auth/spec.md",
                out_root / "dist/speckit/.specify/memory/constitution.md",
                out_root / "dist/speckit/specs/001-auth/spec.md",
                out_root / "dist/speckit/specs/001-auth/plan.md",
            ]
            for f in expected_files:
                self.assertTrue(f.exists(), f"Missing projected file: {f}")

            # --check should pass
            chk = subprocess.run(
                [PY, str(REPO / "tools/project.py"), "--root", str(REPO), "--out-root", str(out_root), "--check"],
                capture_output=True, text=True,
            )
            self.assertEqual(chk.returncode, 0, chk.stdout)

            # Mutating a projected file should cause --check to fail
            expected_files[0].write_text("stale content\n", encoding="utf-8")
            chk_fail = subprocess.run(
                [PY, str(REPO / "tools/project.py"), "--root", str(REPO), "--out-root", str(out_root), "--check"],
                capture_output=True, text=True,
            )
            self.assertEqual(chk_fail.returncode, 1)
            self.assertIn("OUTDATED", chk_fail.stdout)
        finally:
            shutil.rmtree(out_root, ignore_errors=True)

    def test_project_with_stack_profile(self):
        out_root = Path(tempfile.mkdtemp(prefix="metaspec-psm-"))
        try:
            profile = out_root / "stack.yaml"
            profile.write_text(
                "name: go-edge-production\n"
                "bindings:\n"
                "  Token Format: Ed25519 JWT\n"
                "  Edge Cache: Redis Cluster\n",
                encoding="utf-8",
            )
            p = subprocess.run(
                [
                    PY, str(REPO / "tools/project.py"),
                    "--root", str(REPO),
                    "--out-root", str(out_root),
                    "--adapter", "speckit",
                    "--stack-profile", str(profile),
                ],
                capture_output=True, text=True,
            )
            self.assertEqual(p.returncode, 0, p.stderr)
            plan_txt = (out_root / "dist/speckit/specs/001-auth/plan.md").read_text(encoding="utf-8")
            self.assertIn("## 3. Target Tech-Stack Binding (PSM)", plan_txt)
            self.assertIn("`go-edge-production`", plan_txt)
            self.assertIn("**Token Format**: Ed25519 JWT", plan_txt)
        finally:
            shutil.rmtree(out_root, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()

