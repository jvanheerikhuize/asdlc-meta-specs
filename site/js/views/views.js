// Views rendered inside the persistent shell.
import { h, clear } from "../dom.js";
import { typeLabel, statusTone, readiness, githubUrl, OPEN_ASSUMPTION } from "../data.js";
import { renderMarkdown } from "../markdown.js";
import { graph, renderMiniGraph } from "./graph.js";

export { graph };

const idLink = (data, id) => {
  const r = data.byId.get(id);
  return h("a", { href: `#/record/${id}`, title: r?.title || "" }, h("span", { class: `badge ${r ? statusTone(r) : "danger"}` }, id));
};
const statusBadge = (r) => h("span", { class: `badge ${statusTone(r)}` }, r.status);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const head = (title, lead, ...actions) => h("div", { class: "page-head" },
  h("div", {}, h("h1", { tabindex: "-1" }, title), lead ? h("p", { class: "lead" }, lead) : null), h("div", { class: "form-actions" }, actions));

// ------------------------------------------------------------------ dashboard
export function dashboard(main, data) {
  const by = (t) => data.records.filter((r) => r.type === t);
  const reqs = by("requirement");
  const openAsm = by("assumption").filter((r) => OPEN_ASSUMPTION.has(r.status));
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const recent = data.records.filter((r) => (r.tags || []).includes("captured"))
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "") || b.id.localeCompare(a.id)).slice(0, 6);
  const count = (list, pred) => list.filter(pred).length;

  clear(main).append(
    head("Dashboard", "Where our specifications stand, and what they rest on.",
      h("a", { class: "button", href: "#/graph" }, "Explore graph"),
      h("a", { class: "button primary", href: "#/capture/requirement" }, "＋ Capture a requirement")),
    h("div", { class: "grid" },
      statCard(reqs.length, "Requirements", `${count(reqs, (r) => ["active", "accepted"].includes(r.status))} active · ${count(reqs, (r) => r.status === "provisional")} provisional · ${count(reqs, (r) => r.status === "draft")} draft`),
      statCard(count(by("fact"), (r) => r.status === "active"), "Verified facts", plural(by("validation").length, "validation") + " recorded"),
      statCard(openAsm.length, "Open assumptions", `${count(openAsm, (r) => ["high", "critical"].includes(r.risk))} high-risk`),
      statCard(by("spec").length, "Specifications", plural(by("change").length, "change proposal"))),
    h("div", { class: "grid", style: "margin-block-start:1rem; grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));" },
      h("section", { class: "card" }, h("h2", {}, "Specification readiness"),
        h("p", { class: "muted" }, "Share of requirements resting only on verified facts."),
        by("spec").length ? h("ul", { class: "list" }, by("spec").map((s) => {
          const r = readiness(data, s);
          return h("li", { style: "display:block" },
            h("div", { style: "display:flex;justify-content:space-between;gap:1rem" }, h("a", { href: `#/record/${s.id}` }, s.title), h("strong", {}, `${r.pct}%`)),
            h("div", { class: "bar", role: "img", "aria-label": `${r.pct}% ready` }, h("span", { style: `width:${r.pct}%` })),
            h("small", { class: "muted" }, `${r.active} of ${r.total} requirements active`));
        })) : h("p", { class: "empty" }, "No specifications yet.")),
      h("section", { class: "card" }, h("h2", {}, "Assumptions waiting for validation"),
        openAsm.length ? h("ul", { class: "list" }, openAsm.sort((a, b) => (riskOrder[a.risk] ?? 9) - (riskOrder[b.risk] ?? 9)).slice(0, 8).map((a) =>
          h("li", {}, idLink(data, a.id), h("span", {}, a.title),
            h("span", { class: `badge ${["high", "critical"].includes(a.risk) ? "danger" : ""}` }, `risk: ${a.risk}`),
            h("a", { href: `#/capture/fact?tests=${a.id}`, style: "margin-inline-start:auto;font-size:.82rem;white-space:nowrap" }, "Validate →"))))
          : h("p", { class: "empty" }, "None — everything rests on verified facts.")),
      h("section", { class: "card" }, h("h2", {}, "Recently captured"),
        recent.length ? h("ul", { class: "list" }, recent.map((r) => h("li", {}, idLink(data, r.id), h("span", {}, r.title), statusBadge(r))))
          : h("p", { class: "empty" }, "Nothing captured through the app yet. ", h("a", { href: "#/capture/requirement" }, "Capture the first requirement.")))));
}

function statCard(n, label, sub) {
  return h("section", { class: "card" }, h("div", { class: "stat" }, String(n)), h("div", { class: "stat-label" }, label), h("small", { class: "muted" }, sub));
}

// ------------------------------------------------------------------ records list
export function records(main, data, params) {
  const types = ["all", ...new Set(data.records.map((r) => r.type))];
  let q = params.get("q") || "";
  let type = params.get("type") || "all";
  const tbody = h("tbody");
  const countEl = h("p", { class: "muted", "aria-live": "polite" });

  const search = h("input", { type: "search", id: "records-q", value: q, placeholder: "Filter by ID, title or domain…",
    oninput: (e) => { q = e.target.value; draw(); } });
  const typeFilter = h("div", { class: "filters", role: "radiogroup", "aria-label": "Record type" }, types.map((t) =>
    h("label", { class: "chip-toggle" }, h("input", { type: "radio", name: "rtype", value: t, checked: t === type,
      onchange: () => { type = t; draw(); } }), t === "all" ? "All" : typeLabel(t))));

  function draw() {
    const needle = q.toLowerCase();
    const rows = data.records.filter((r) => (type === "all" || r.type === type)
      && (!needle || `${r.id} ${r.title} ${r.domain}`.toLowerCase().includes(needle)));
    countEl.textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
    clear(tbody).append(...rows.map((r) => h("tr", {},
      h("td", {}, idLink(data, r.id)), h("td", {}, h("a", { href: `#/record/${r.id}` }, r.title)),
      h("td", {}, typeLabel(r.type)), h("td", {}, statusBadge(r)), h("td", {}, r.domain))));
  }

  clear(main).append(head("Records", "Every elemental record in the repository."),
    h("label", { for: "records-q", class: "visually-hidden" }, "Filter records"), search, typeFilter, countEl,
    h("div", { style: "overflow-x:auto" }, h("table", {},
      h("thead", {}, h("tr", {}, ["ID", "Title", "Type", "Status", "Domain"].map((c) => h("th", { scope: "col" }, c)))), tbody)));
  draw();
}

// ------------------------------------------------------------------ record detail
const FIELD_LABEL = {
  underpinned_by: "Underpinned by", governed_by: "Governed by", verified_by: "Verified by", verifies: "Verifies",
  satisfies: "Satisfies", validated_by: "Validated by", promoted_to: "Promoted to", promoted_from: "Promoted from",
  tests: "Tests", establishes: "Establishes", evidence: "Evidence", supersedes: "Supersedes", parent: "Parent", target_spec: "Target spec",
};

export function record(main, data, params, id) {
  const r = data.byId.get(id);
  if (!r) return notFound(main, `No record ${id}.`);
  const meta = [["Type", typeLabel(r.type)], ["Domain", r.domain], ["Priority", r.priority], ["Strength", r.normative],
    ["Risk", r.risk], ["Confidence", r.confidence], ["Outcome", r.outcome], ["Method", r.method], ["Source", r.source],
    ["Owners", (r.owners || []).join(", ")], ["Created", r.created_at], ["Updated", r.updated_at]].filter(([, v]) => v !== undefined && v !== "");
  const links = Object.entries(r.links || {});
  const incoming = data.referencedBy.get(id) || [];
  const comp = Object.entries(r.composition || r.deltas || {}).filter(([, v]) => v?.length);
  const captureAction = r.type === "assumption" && OPEN_ASSUMPTION.has(r.status)
    ? h("a", { class: "button primary", href: `#/capture/fact?tests=${r.id}` }, "Validate / promote →")
    : (r.type === "requirement" || r.type === "constraint")
      ? h("a", { class: "button", href: `#/capture/decision?satisfies=${r.id}` }, "＋ Record decision")
      : null;

  clear(main).append(
    h("p", {}, h("a", { href: "#/records" }, "← All records")),
    h("div", { class: "page-head" },
      h("div", {}, h("div", { class: "badges" }, h("span", { class: "badge" }, r.id), statusBadge(r)), h("h1", { tabindex: "-1", style: "margin-top:.5rem" }, r.title)),
      h("div", { class: "form-actions" },
        captureAction,
        h("a", { class: "button", href: `#/graph?focus=${r.id}` }, "Explore in graph"),
        h("a", { class: "button", href: githubUrl(data, `/blob/main/${r.path}`), target: "_blank", rel: "noopener" }, "View / edit on GitHub ↗"))),
    h("div", { class: "capture" },
      h("div", { class: "stack" },
        h("article", { class: "card prose" }, r.sections
          ? Object.entries(r.sections).map(([title, body]) => [h("h2", {}, title), renderMarkdown(body)])
          : h("p", { class: "empty" }, "Record text is not published on this site (metadata-only mode).")),
        h("section", { class: "card" },
          h("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-block-end:.75rem" },
            h("h2", { style: "margin:0" }, "Traceability graph"),
            h("a", { href: `#/graph?focus=${r.id}` }, "Open in full graph →")),
          renderMiniGraph(data, r.id))),
      h("aside", { class: "capture-aside" },
        h("section", { class: "card" }, h("h2", {}, "Details"),
          h("dl", { class: "preview" }, meta.map(([k, v]) => [h("dt", {}, k), h("dd", {}, String(v))]))),
        links.length || comp.length ? h("section", { class: "card" }, h("h2", {}, "Links"),
          h("dl", { class: "preview" }, [...links, ...comp].map(([k, v]) => [h("dt", {}, FIELD_LABEL[k] || k.replace(/_/g, " ")),
            h("dd", { class: "badges" }, [].concat(v).map((t) => idLink(data, t)))]))) : null,
        incoming.length ? h("section", { class: "card" }, h("h2", {}, "Referenced by"),
          h("ul", { class: "list" }, incoming.map((x) => h("li", {}, idLink(data, x.id), h("small", { class: "muted" }, FIELD_LABEL[x.field] || x.field))))) : null)));
}

// ------------------------------------------------------------------ specs
export function specs(main, data) {
  const list = (type) => data.records.filter((r) => r.type === type);
  clear(main).append(head("Specifications", "Capability specifications and change proposals assembled from elemental records."),
    h("div", { class: "stack" }, list("spec").map((s) => {
      const r = readiness(data, s);
      return h("section", { class: "card" },
        h("div", { class: "badges" }, h("span", { class: "badge" }, s.id), statusBadge(s)),
        h("h2", { style: "margin-top:.5rem" }, h("a", { href: `#/record/${s.id}` }, s.title)),
        h("div", { class: "bar", role: "img", "aria-label": `${r.pct}% ready` }, h("span", { style: `width:${r.pct}%` })),
        h("p", { class: "muted" }, `${r.pct}% epistemic readiness · ${r.active} of ${r.total} requirements active`),
        h("div", { class: "badges" }, Object.values(s.composition || {}).flat().map((id) => idLink(data, id))));
    }),
    list("change").length ? h("h2", {}, "Change proposals") : null,
    list("change").map((c) => h("section", { class: "card" },
      h("div", { class: "badges" }, h("span", { class: "badge" }, c.id), statusBadge(c), c.links?.target_spec ? idLink(data, c.links.target_spec) : null),
      h("h3", { style: "margin-top:.5rem" }, h("a", { href: `#/record/${c.id}` }, c.title))))));
}

// ------------------------------------------------------------------ pending
export function pending(main, data) {
  clear(main).append(head("Pending approval", "Every capture becomes a pull request. Approving and merging it approves the record."),
    h("div", { class: "grid" },
      h("section", { class: "card stack" }, h("h2", {}, "Capture pull requests"),
        h("p", { class: "muted" }, "Review wording, links and status, then approve & merge."),
        h("a", { class: "button primary", href: githubUrl(data, "/pulls?q=is%3Apr+is%3Aopen+label%3Acapture"), target: "_blank", rel: "noopener" }, "Open review queue on GitHub ↗")),
      h("section", { class: "card stack" }, h("h2", {}, "Captures needing attention"),
        h("p", { class: "muted" }, "Captures the bot could not process yet (it comments on the issue with what to fix)."),
        h("a", { class: "button", href: githubUrl(data, "/issues?q=is%3Aissue+is%3Aopen+label%3Acapture"), target: "_blank", rel: "noopener" }, "Open capture issues ↗"))),
    h("p", { class: "muted", style: "margin-top:1rem" }, "An in-app approval view is planned; for now GitHub is the source of truth for reviews."));
}

export function notFound(main, msg = "This page does not exist.") {
  clear(main).append(head("Not found", msg), h("a", { href: "#/dashboard" }, "Go to the dashboard"));
}
