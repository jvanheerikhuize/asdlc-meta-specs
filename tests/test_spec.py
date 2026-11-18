"""Each test mirrors an acceptance scenario in records/."""
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import spec  # noqa: E402

FACT = """---
id: FCT-0001
title: A fact
status: active
evidence: Measured.
---
"""
SCENARIO = "\n## Acceptance\n- Given a\n- When b\n- Then c\n"


def req(status="active", because="[FCT-0001]", body=SCENARIO, rid="REQ-0001"):
    return f"---\nid: {rid}\ntitle: A requirement\nstatus: {status}\nbecause: {because}\n---\n{body}"


def asm(status, rid="ASM-0001", extra=""):
    return f"---\nid: {rid}\ntitle: An assumption\nstatus: {status}\n{extra}---\n"


def qst(status="open", blocks="[REQ-0001]", extra="", rid="QST-0001"):
    return f"---\nid: {rid}\ntitle: A question?\nstatus: {status}\nblocks: {blocks}\n{extra}---\n"


def spc(rid, tier, reqs, deps="[]", status="draft"):
    return f"---\nid: {rid}\ntitle: {rid}\nstatus: {status}\ntier: {tier}\ndepends_on: {deps}\nrequirements: {reqs}\n---\n"


class Graph:
    def __init__(self, **files):
        with tempfile.TemporaryDirectory() as tmp:
            for name, text in files.items():
                (Path(tmp) / f"{name.replace('_', '-')}-x.md").write_text(textwrap.dedent(text))
            self.records = spec.load(Path(tmp))

    def check(self):
        return spec.check(self.records)


class CheckTest(unittest.TestCase):
    def test_repository_records_pass_strict(self):
        errors, warnings = spec.check(spec.load())
        self.assertEqual(errors + warnings, [])

    def test_broken_link_fails(self):  # REQ-0001
        errors, _ = Graph(FCT_0001=FACT, REQ_0001=req(because="[FCT-0099]")).check()
        self.assertTrue(any("FCT-0099" in e for e in errors))

    def test_active_on_open_assumption_fails(self):  # REQ-0002
        errors, _ = Graph(ASM_0001=asm("open"), REQ_0001=req(because="[ASM-0001]")).check()
        self.assertTrue(any("provisional" in e for e in errors))

    def test_provisional_on_open_assumption_passes(self):  # REQ-0002
        errors, _ = Graph(ASM_0001=asm("open"), REQ_0001=req("provisional", "[ASM-0001]")).check()
        self.assertEqual(errors, [])

    def test_invalidated_assumption_requires_broken(self):  # REQ-0002
        g = Graph(ASM_0001=asm("invalidated"), REQ_0001=req("provisional", "[ASM-0001]"))
        self.assertTrue(any("broken" in e for e in g.check()[0]))
        g = Graph(ASM_0001=asm("invalidated"), REQ_0001=req("broken", "[ASM-0001]"))
        self.assertEqual(g.check()[0], [])

    def test_promotion_must_be_mutual(self):
        g = Graph(ASM_0001=asm("validated", extra="promoted_to: FCT-0001\n"), FCT_0001=FACT)
        self.assertTrue(any("promoted_from" in e for e in g.check()[0]))

    def test_citing_promoted_assumption_warns(self):
        fact = FACT.replace("status: active", "status: active\npromoted_from: ASM-0001")
        g = Graph(ASM_0001=asm("validated", extra="promoted_to: FCT-0001\n"), FCT_0001=fact,
                  REQ_0001=req(because="[ASM-0001]"))
        errors, warnings = g.check()
        self.assertEqual(errors, [])
        self.assertTrue(any("cite FCT-0001" in w for w in warnings))

    def test_active_requirement_needs_scenario(self):  # REQ-0004
        errors, _ = Graph(FCT_0001=FACT, REQ_0001=req(body="\n## Statement\nMUST.\n")).check()
        self.assertTrue(any("Given/When/Then" in e for e in errors))

    def test_tech_stack_term_warns(self):  # REQ-0006
        body = "\n## Statement\nData MUST be stored in PostgreSQL.\n" + SCENARIO
        _, warnings = Graph(FCT_0001=FACT, REQ_0001=req(body=body)).check()
        self.assertTrue(any("postgresql" in w for w in warnings))

    def test_skeleton_cannot_depend_on_feature(self):
        g = Graph(FCT_0001=FACT, REQ_0001=req(),
                  SPC_0001=spc("SPC-0001", "skeleton", "[REQ-0001]", "[SPC-0002]"),
                  SPC_0002=spc("SPC-0002", "feature", "[REQ-0001]"))
        self.assertTrue(any("skeleton spec cannot depend" in e for e in g.check()[0]))

    def test_spec_cycle_fails(self):
        g = Graph(FCT_0001=FACT, REQ_0001=req(),
                  SPC_0001=spc("SPC-0001", "feature", "[REQ-0001]", "[SPC-0002]"),
                  SPC_0002=spc("SPC-0002", "feature", "[REQ-0001]", "[SPC-0001]"))
        self.assertTrue(any("cycle" in e for e in g.check()[0]))

    def test_fact_freshness_warns_when_stale(self):
        stale_fact = FACT.replace("status: active", "status: active\nreview_after: 2020-01-01")
        errors, warnings = Graph(FCT_0001=stale_fact, REQ_0001=req()).check()
        self.assertEqual(errors, [])
        self.assertTrue(any("past review date" in w for w in warnings))

    def test_fact_freshness_invalid_date_fails(self):
        bad_fact = FACT.replace("status: active", "status: active\nreview_after: not-a-date")
        errors, warnings = Graph(FCT_0001=bad_fact, REQ_0001=req()).check()
        self.assertTrue(any("invalid review_after date" in e for e in errors))


class QuestionTest(unittest.TestCase):
    def test_open_question_keeps_requirement_provisional(self):  # REQ-0007
        errors, _ = Graph(FCT_0001=FACT, REQ_0001=req(), QST_0001=qst()).check()
        self.assertTrue(any("open question" in e and "provisional" in e for e in errors))
        errors, _ = Graph(FCT_0001=FACT, REQ_0001=req("provisional"), QST_0001=qst()).check()
        self.assertEqual(errors, [])

    def test_open_question_keeps_spec_from_active(self):  # REQ-0007
        errors, _ = Graph(FCT_0001=FACT, REQ_0001=req(), QST_0001=qst(blocks="[SPC-0001]"),
                          SPC_0001=spc("SPC-0001", "skeleton", "[REQ-0001]", status="active")).check()
        self.assertTrue(any("SPC-0001" in e and "open question" in e for e in errors))

    def test_answered_question_names_its_answer(self):  # REQ-0007
        errors, _ = Graph(FCT_0001=FACT, REQ_0001=req(), QST_0001=qst("answered")).check()
        self.assertTrue(any("answered_by" in e for e in errors))
        errors, warnings = Graph(FCT_0001=FACT, REQ_0001=req(),
                                 QST_0001=qst("answered", extra="answered_by: FCT-0001\n")).check()
        self.assertEqual(errors + warnings, [])

    def test_answer_not_cited_by_blocked_requirement_warns(self):
        fact2 = FACT.replace("FCT-0001", "FCT-0002")
        _, warnings = Graph(FCT_0001=FACT, FCT_0002=fact2, REQ_0001=req(),
                            QST_0001=qst("answered", extra="answered_by: FCT-0002\n")).check()
        self.assertTrue(any("does not cite" in w for w in warnings))

    def test_question_must_block_something(self):
        errors, _ = Graph(QST_0001=qst(blocks="[]")).check()
        self.assertTrue(any("blocks" in e for e in errors))

    def test_open_question_is_rendered_where_it_blocks(self):  # REQ-0007
        g = Graph(FCT_0001=FACT, REQ_0001=req("provisional"), QST_0001=qst(),
                  SPC_0001=spc("SPC-0001", "skeleton", "[REQ-0001]"))
        s = g.records["SPC-0001"]
        self.assertIn("QST-0001: A question?", spec.render_markdown(s, g.records))
        self.assertIn("@QST-0001", spec.render_gherkin(s, g.records))

    def test_question_impact_flows_to_what_it_blocks(self):
        g = Graph(FCT_0001=FACT, REQ_0001=req("provisional"), QST_0001=qst(),
                  SPC_0001=spc("SPC-0001", "skeleton", "[REQ-0001]"))
        touched, specs = spec.impact("QST-0001", g.records)
        self.assertEqual(touched, ["REQ-0001"])
        self.assertEqual([s.id for s in specs], ["SPC-0001"])


class ImpactTest(unittest.TestCase):
    def test_skeleton_rebuilt_before_features(self):  # REQ-0003
        g = Graph(FCT_0001=FACT, REQ_0001=req(),
                  SPC_0002=spc("SPC-0002", "feature", "[]", "[SPC-0001]"),
                  SPC_0001=spc("SPC-0001", "skeleton", "[REQ-0001]"))
        touched, specs = spec.impact("FCT-0001", g.records)
        self.assertEqual(touched, ["REQ-0001"])
        self.assertEqual([s.id for s in specs], ["SPC-0001", "SPC-0002"])

    def test_assumption_impact_flows_through_its_fact(self):
        fact = FACT.replace("status: active", "status: active\npromoted_from: ASM-0001")
        g = Graph(ASM_0001=asm("validated", extra="promoted_to: FCT-0001\n"), FCT_0001=fact, REQ_0001=req())
        touched, _ = spec.impact("ASM-0001", g.records)
        self.assertEqual(touched, ["FCT-0001", "REQ-0001"])


class RenderTest(unittest.TestCase):
    def test_both_formats_render_every_scenario(self):  # REQ-0005
        records = spec.load()
        s = records["SPC-0001"]
        md = spec.render_markdown(s, records)
        feature = spec.render_gherkin(s, records)
        for rid in s.meta["requirements"]:
            self.assertIn(rid, md)
            self.assertIn(rid, feature)
        self.assertEqual(feature.count("Scenario:"), md.count("```gherkin"))

    def test_render_binds_optional_tech_stack(self):  # REQ-0005
        records = spec.load()
        s = records["SPC-0001"]
        md = spec.render_markdown(s, records, stack="Runtime: Python 3.10+")
        self.assertIn("## Technology Stack\n\nRuntime: Python 3.10+", md)
        with tempfile.TemporaryDirectory() as tmp:
            stack_file = Path(tmp) / "TECH_STACK.md"
            stack_file.write_text("Runtime: Python 3.10+\n", encoding="utf-8")
            out_dir = Path(tmp) / "dist"
            rc = spec.main(["render", "--tier", "skeleton", "--stack", str(stack_file), "--out", str(out_dir)])
            self.assertEqual(rc, 0)
            rendered = (out_dir / "SPC-0001.md").read_text(encoding="utf-8")
            self.assertIn("## Technology Stack\n\nRuntime: Python 3.10+", rendered)
            self.assertEqual(spec.main(["render", "--stack", str(Path(tmp) / "missing.md"), "--out", str(out_dir)]), 1)


class IndexTest(unittest.TestCase):
    def test_index_has_everything_the_site_reads(self):  # REQ-0009
        index = spec.to_index(spec.load())
        self.assertEqual(index["summary"]["errors"], 0)
        self.assertEqual(index["spec_order"], ["SPC-0001", "SPC-0002", "SPC-0003"])
        rows = {r["id"]: r for r in index["records"]}
        self.assertEqual(rows["SPC-0001"]["readiness"], 100)
        self.assertEqual(rows["SPC-0002"]["readiness"], 100)
        self.assertEqual(rows["SPC-0003"]["readiness"], 100)
        self.assertIn("SPC-0002", rows["ASM-0002"]["downstream"])
        self.assertTrue(rows["REQ-0001"]["path"].startswith("records/REQ-0001-"))
        self.assertEqual(rows["REQ-0005"]["open_questions"], [])
        self.assertEqual(rows["QST-0002"]["status"], "answered")
        self.assertEqual(rows["QST-0002"]["type"], "question")

    def test_issues_are_attached_to_their_record(self):  # REQ-0009
        index = spec.to_index(Graph(ASM_0001=asm("open"), REQ_0001=req(because="[ASM-0001]")).records)
        rows = {r["id"]: r for r in index["records"]}
        self.assertTrue(any("provisional" in i for i in rows["REQ-0001"]["issues"]))


class WorkspaceContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        site = Path(__file__).resolve().parent.parent / "site"
        cls.html = (site / "index.html").read_text(encoding="utf-8")
        cls.app = (site / "app.js").read_text(encoding="utf-8")

    def test_dashboard_and_five_task_levels_present(self):  # REQ-0010
        for level in ("Fix now", "Answer questions", "Test assumptions", "Quick wins", "Tidy up"):
            self.assertIn(level, self.app)
        self.assertIn("review_after", self.app)

    def test_interactive_graph_lineage_stops_at_spec_boundary(self):  # REQ-0011
        self.assertIn('const PREFIXES = ["ASM", "FCT", "QST", "REQ", "SPC"]', self.app)
        self.assertIn("!(dir === \"up\" && builtOn(e))", self.app)
        self.assertIn("edges-base", self.app)
        self.assertIn("edges-live", self.app)

    def test_record_browser_guided_capture_and_theme_toggle(self):  # REQ-0012
        for kind in ("requirement:", "assumption:", "fact:", "question:", "spec:"):
            self.assertIn(kind, self.app)
        self.assertIn('field("Review after", r.review_after)', self.app)
        self.assertIn("theme-toggle", self.html)


if __name__ == "__main__":
    unittest.main()
