// Stratified epistemic-to-normative record graph view (#/graph) + embedded neighborhood mini-graph.
// Zero dependencies: pure SVG + DOM with canonicalized reciprocal edges, barycenter crossing reduction,
// upstream/downstream transitive lineage highlighting, lenses, pan/zoom, and keyboard accessibility.
import { h, svg, clear } from "../dom.js";
import { typeLabel, statusTone, githubUrl, OPEN_ASSUMPTION } from "../data.js";

export const TIERS = [
  { col: 0, key: "epistemic_open", title: "1 · Hypotheses & Evidence", sub: "Assumptions (ASM) · Validations (VAL)", types: ["assumption", "validation"] },
  { col: 1, key: "epistemic_fact", title: "2 · Verified Truths", sub: "Facts (FCT)", types: ["fact"] },
  { col: 2, key: "normative_core", title: "3 · Normative Core", sub: "Constraints (CON) · Requirements (REQ)", types: ["constraint", "requirement"] },
  { col: 3, key: "normative_ver", title: "4 · Verification & Design", sub: "Criteria (ACR) · Decisions (DEC)", types: ["criterion", "decision"] },
  { col: 4, key: "composition", title: "5 · Composition", sub: "Specifications (SPC) · Changes (CHG)", types: ["spec", "change"] },
];

const TYPE_COL = new Map(TIERS.flatMap((t) => t.types.map((type) => [type, t.col])));
const TYPE_ORDER = { assumption: 0, validation: 1, fact: 2, constraint: 3, requirement: 4, criterion: 5, decision: 6, spec: 7, change: 8 };
const SHORT_TYPE = {
  assumption: "ASM", validation: "VAL", fact: "FCT", constraint: "CON",
  requirement: "REQ", criterion: "ACR", decision: "DEC", spec: "SPC", change: "CHG",
};

// ------------------------------------------------------------------ canonical graph extraction
export function extractCanonicalEdges(records, byId) {
  const seen = new Set();
  const edges = [];
  const add = (source, target, kind, label) => {
    if (!byId.has(source) || !byId.has(target) || source === target) return;
    const key = `${source}->${target}:${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ id: key, source, target, kind, label });
  };

  for (const r of records) {
    const L = r.links || {};
    // 1. Epistemic validation & promotion lineage (ASM -> VAL -> FCT, ASM -> FCT)
    for (const valId of [].concat(L.validated_by || [])) add(r.id, valId, "lineage", "validated by");
    for (const asmId of [].concat(L.tests || [])) add(asmId, r.id, "lineage", "tested by");
    for (const fctId of [].concat(L.establishes || [])) add(r.id, fctId, "lineage", "establishes");
    for (const valId of [].concat(L.evidence || [])) add(valId, r.id, "lineage", "establishes");
    for (const fctId of [].concat(L.promoted_to || [])) add(r.id, fctId, "promoted", "promoted to");
    if (L.promoted_from) add(L.promoted_from, r.id, "promoted", "promoted to");

    // 2. Epistemic grounding (FCT / ASM -> CON / REQ / ACR / DEC)
    for (const uId of [].concat(L.underpinned_by || [])) {
      const u = byId.get(uId);
      let kind = "underpins_fact";
      let label = "underpins";
      if (u?.type === "assumption") {
        if (OPEN_ASSUMPTION.has(u.status)) { kind = "underpins_asm"; label = "provisionally underpins"; }
        else if (u.status === "promoted") { kind = "underpins_stale"; label = "promoted assumption"; }
        else { kind = "underpins_broken"; label = "invalidated assumption"; }
      } else if (u?.type === "fact" && u.status !== "active") {
        kind = "underpins_broken";
        label = "deprecated fact";
      }
      add(uId, r.id, kind, label);
    }

    // 3. Normative structure (CON -> REQ, REQ -> ACR, REQ/CON -> DEC)
    for (const conId of [].concat(L.governed_by || [])) add(conId, r.id, "governs", "governs");
    for (const acrId of [].concat(L.verified_by || [])) add(r.id, acrId, "verifies", "verified by");
    for (const reqId of [].concat(L.verifies || [])) add(reqId, r.id, "verifies", "verified by");
    for (const satId of [].concat(L.satisfies || [])) add(satId, r.id, "satisfies", "satisfied by");

    // 4. Evolution links
    for (const supId of [].concat(L.supersedes || [])) add(supId, r.id, "lineage", "superseded by");
    if (L.parent) add(L.parent, r.id, "lineage", "parent of");

    // 5. Composition (CON/REQ/ACR/DEC -> SPC, SPC/records -> CHG)
    for (const members of Object.values(r.composition || {})) {
      for (const mId of members || []) add(mId, r.id, "composes", "composed in");
    }
    if (L.target_spec) add(L.target_spec, r.id, "delta", "target of change");
    for (const [group, items] of Object.entries(r.deltas || {})) {
      for (const dId of items || []) add(dId, r.id, "delta", `delta (${group})`);
    }
  }
  return edges;
}

// ------------------------------------------------------------------ lineage & neighborhood
export function computeLineage(focalId, edges) {
  const upstreamNodes = new Set();
  const downstreamNodes = new Set();
  const activeEdges = new Set();
  if (!focalId) return { focalId: null, nodes: new Set(), upstreamNodes, downstreamNodes, activeEdges };

  // Backward BFS (what focalId rests on)
  const qUp = [focalId];
  const seenUp = new Set([focalId]);
  while (qUp.length) {
    const cur = qUp.shift();
    for (const e of edges) {
      if (e.target === cur) {
        activeEdges.add(e.id);
        if (!seenUp.has(e.source)) {
          seenUp.add(e.source);
          upstreamNodes.add(e.source);
          qUp.push(e.source);
        }
      }
    }
  }

  // Forward BFS (what depends on focalId)
  const qDown = [focalId];
  const seenDown = new Set([focalId]);
  while (qDown.length) {
    const cur = qDown.shift();
    for (const e of edges) {
      if (e.source === cur) {
        activeEdges.add(e.id);
        if (!seenDown.has(e.target)) {
          seenDown.add(e.target);
          downstreamNodes.add(e.target);
          qDown.push(e.target);
        }
      }
    }
  }

  const nodes = new Set([focalId, ...upstreamNodes, ...downstreamNodes]);
  return { focalId, nodes, upstreamNodes, downstreamNodes, activeEdges };
}

// ------------------------------------------------------------------ stratified layout engine
const NODE_W = 204;
const NODE_H = 68;
const COL_GAP = 86;
const ROW_GAP = 20;
const PAD_X = 24;
const PAD_TOP = 68;
const PAD_BOTTOM = 28;

export function layoutGraph(records, edges, includeComposition = false) {
  const nodeMap = new Map(records.map((r) => [r.id, { ...r, col: TYPE_COL.get(r.type) ?? 2 }]));
  const activeEdges = edges.filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target));

  const visibleTiers = TIERS.filter((t) => includeComposition || t.col < 4);
  const cols = visibleTiers.map((t) => ({
    ...t,
    nodes: records
      .filter((r) => (TYPE_COL.get(r.type) ?? 2) === t.col)
      .map((r) => nodeMap.get(r.id))
      .sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id)),
  }));

  // Barycenter crossing reduction (4 sweeps forward & backward)
  const assignOrder = (colObj) => colObj.nodes.forEach((n, idx) => { n.order = idx; });
  cols.forEach(assignOrder);

  for (let iter = 0; iter < 4; iter++) {
    // Forward sweep
    for (let c = 1; c < cols.length; c++) {
      for (const n of cols[c].nodes) {
        const preds = activeEdges
          .filter((e) => (e.target === n.id && nodeMap.get(e.source).col < n.col) || (e.source === n.id && nodeMap.get(e.target).col < n.col))
          .map((e) => nodeMap.get(e.target === n.id ? e.source : e.target).order);
        n.bary = preds.length ? preds.reduce((a, b) => a + b, 0) / preds.length : n.order;
      }
      cols[c].nodes.sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || (a.bary - b.bary) || a.id.localeCompare(b.id));
      assignOrder(cols[c]);
    }
    // Backward sweep
    for (let c = cols.length - 2; c >= 0; c--) {
      for (const n of cols[c].nodes) {
        const succs = activeEdges
          .filter((e) => (e.source === n.id && nodeMap.get(e.target).col > n.col) || (e.target === n.id && nodeMap.get(e.source).col > n.col))
          .map((e) => nodeMap.get(e.source === n.id ? e.target : e.source).order);
        n.bary = succs.length ? succs.reduce((a, b) => a + b, 0) / succs.length : n.order;
      }
      cols[c].nodes.sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || (a.bary - b.bary) || a.id.localeCompare(b.id));
      assignOrder(cols[c]);
    }
  }

  // Keep VAL directly below the ASM it tests in Column 0
  if (cols[0]) {
    const asms = cols[0].nodes.filter((n) => n.type === "assumption");
    const vals = cols[0].nodes.filter((n) => n.type === "validation");
    const placedVals = new Set();
    const orderedCol0 = [];
    for (const a of asms) {
      orderedCol0.push(a);
      for (const v of vals) {
        if (!placedVals.has(v.id) && activeEdges.some((e) => e.source === a.id && e.target === v.id)) {
          orderedCol0.push(v);
          placedVals.add(v.id);
        }
      }
    }
    for (const v of vals) if (!placedVals.has(v.id)) orderedCol0.push(v);
    cols[0].nodes = orderedCol0;
    assignOrder(cols[0]);
  }

  // Compute coordinates (vertically centered per column relative to tallest column)
  const maxRows = Math.max(1, ...cols.map((c) => c.nodes.length));
  const contentH = maxRows * NODE_H + (maxRows - 1) * ROW_GAP;
  const height = PAD_TOP + contentH + PAD_BOTTOM;
  const width = PAD_X * 2 + cols.length * NODE_W + Math.max(0, cols.length - 1) * COL_GAP;

  cols.forEach((colObj, cIdx) => {
    const x = PAD_X + cIdx * (NODE_W + COL_GAP);
    colObj.x = x;
    const colH = colObj.nodes.length * NODE_H + Math.max(0, colObj.nodes.length - 1) * ROW_GAP;
    // Slight vertical offset so smaller columns sit balanced near the top-middle
    const offsetY = Math.min(36, Math.max(0, Math.round((contentH - colH) * 0.2)));
    colObj.nodes.forEach((n, rIdx) => {
      n.x = x;
      n.y = PAD_TOP + offsetY + rIdx * (NODE_H + ROW_GAP);
      n.row = rIdx;
      n.cIdx = cIdx;
    });
  });

  // Compute port offsets so multiple edges on one node fan out cleanly
  const outByNode = new Map();
  const inByNode = new Map();
  for (const e of activeEdges) {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    if (s.cIdx === t.cIdx) continue;
    if (!outByNode.has(s.id)) outByNode.set(s.id, []);
    if (!inByNode.has(t.id)) inByNode.set(t.id, []);
    outByNode.get(s.id).push(e);
    inByNode.get(t.id).push(e);
  }
  for (const list of outByNode.values()) {
    list.sort((a, b) => nodeMap.get(a.target).y - nodeMap.get(b.target).y);
  }
  for (const list of inByNode.values()) {
    list.sort((a, b) => nodeMap.get(a.source).y - nodeMap.get(b.source).y);
  }

  const portY = (node, list, edge) => {
    if (!list || list.length <= 1) return node.y + NODE_H / 2;
    const idx = list.indexOf(edge);
    const span = Math.min(28, (list.length - 1) * 7);
    return node.y + NODE_H / 2 - span / 2 + (span * idx) / (list.length - 1);
  };

  const laidEdges = activeEdges.map((e) => {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    let d;
    if (s.cIdx === t.cIdx) {
      // Intra-column link (e.g. ASM -> VAL in Col 0, or CON -> REQ in Col 2)
      if (t.row === s.row + 1) {
        const x = s.x + NODE_W / 2;
        d = `M ${x} ${s.y + NODE_H} L ${x} ${t.y - 4}`;
      } else {
        const x = s.x + NODE_W;
        const bulge = 26 + Math.abs(t.row - s.row) * 8;
        const sy = s.y + NODE_H / 2;
        const ty = t.y + NODE_H / 2;
        d = `M ${x} ${sy} C ${x + bulge} ${sy}, ${x + bulge} ${ty}, ${x + 3} ${ty}`;
      }
    } else {
      const sx = s.x + NODE_W;
      const sy = portY(s, outByNode.get(s.id), e);
      const tx = t.x - 4;
      const ty = portY(t, inByNode.get(t.id), e);
      const spanX = tx - sx;
      const dx = Math.max(40, Math.round(spanX * 0.44));
      d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
    }
    return { ...e, d, sourceNode: s, targetNode: t };
  });

  return { cols, nodes: Array.from(nodeMap.values()), edges: laidEdges, width, height };
}

// ------------------------------------------------------------------ text wrapping for SVG cards
function wrapLines(text, maxChars = 27, maxLines = 2) {
  const words = (text || "").trim().split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const rest = words.slice(consumed).join(" ");
  if (rest) {
    lines.push(rest.length > maxChars ? rest.slice(0, maxChars - 1).trimEnd() + "…" : rest);
  }
  return lines.slice(0, maxLines);
}

function edgeMarker(kind) {
  if (kind === "underpins_asm" || kind === "underpins_stale") return "url(#arrow-warn)";
  if (kind === "underpins_broken") return "url(#arrow-danger)";
  if (kind === "underpins_fact") return "url(#arrow-ok)";
  if (kind === "lineage" || kind === "promoted") return "url(#arrow-accent)";
  return "url(#arrow-muted)";
}

function createSvgDefs() {
  const marker = (id, cls) => svg("marker", {
    id, viewBox: "0 0 10 10", refX: "7", refY: "5",
    markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse", class: cls,
  }, svg("path", { d: "M 0 1.5 L 8.5 5 L 0 8.5 z" }));
  return svg("defs", {},
    marker("arrow-ok", "marker-ok"),
    marker("arrow-warn", "marker-warn"),
    marker("arrow-danger", "marker-danger"),
    marker("arrow-accent", "marker-accent"),
    marker("arrow-muted", "marker-muted"));
}

// ------------------------------------------------------------------ full interactive graph view (#/graph)
export function graph(main, data, params) {
  const allEdges = extractCanonicalEdges(data.records, data.byId);
  let domain = params.get("domain") || "all";
  let lens = params.get("lens") || "all";
  let selectedId = params.get("focus") && data.byId.has(params.get("focus")) ? params.get("focus") : null;
  let hoveredId = null;
  const selectedRec = selectedId ? data.byId.get(selectedId) : null;
  let showSpecs = params.get("specs") === "1" || (selectedRec && ["spec", "change"].includes(selectedRec.type));

  // Viewport transform state (pan & zoom)
  let scale = 1;
  let panX = 0;
  let panY = 0;

  const viewportWrap = h("div", { class: "graph-viewport", role: "region", "aria-label": "Interactive record relationship graph" });
  const inspectorWrap = h("aside", { class: "graph-inspector card", "aria-live": "polite" });
  const countBadge = h("span", { class: "muted", "aria-live": "polite" });
  const zoomLabel = h("span", { class: "mono", style: "min-width:3.5rem;text-align:center;font-size:.85rem" }, "100%");

  let svgEl = null;
  let stageEl = null;
  let nodeEls = new Map();
  let edgeEls = new Map();
  let currentEdges = [];

  function syncUrl() {
    const q = new URLSearchParams();
    if (domain !== "all") q.set("domain", domain);
    if (lens !== "all") q.set("lens", lens);
    if (selectedId) q.set("focus", selectedId);
    if (showSpecs) q.set("specs", "1");
    const qs = q.toString();
    history.replaceState(null, "", `#/graph${qs ? `?${qs}` : ""}`);
  }

  function applyTransform() {
    if (svgEl) svgEl.style.width = `${Math.round(scale * 100)}%`;
    if (stageEl) stageEl.setAttribute("transform", `translate(${panX}, ${panY})`);
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  }

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
    viewportWrap.scrollTo({ left: 0, top: 0 });
    applyTransform();
  }

  function zoomBy(factor) {
    scale = Math.min(2.2, Math.max(0.45, +(scale * factor).toFixed(2)));
    applyTransform();
  }

  function visibleRecords() {
    let list = data.records.filter((r) => showSpecs || !["spec", "change"].includes(r.type));
    if (domain !== "all") {
      // Include selected domain records plus any global constraints/facts that directly underpin/govern them
      const domIds = new Set(list.filter((r) => r.domain === domain).map((r) => r.id));
      for (const e of allEdges) {
        if (domIds.has(e.target) && list.some((r) => r.id === e.source)) domIds.add(e.source);
      }
      list = list.filter((r) => domIds.has(r.id));
    }
    if (lens === "risk") {
      // Unvalidated assumptions + everything downstream of them
      const riskSet = new Set();
      for (const r of list) {
        if (r.type === "assumption" && OPEN_ASSUMPTION.has(r.status)) {
          const lin = computeLineage(r.id, allEdges);
          riskSet.add(r.id);
          for (const d of lin.downstreamNodes) riskSet.add(d);
        } else if (["provisional", "needs_review", "broken"].includes(r.status)) {
          riskSet.add(r.id);
          const lin = computeLineage(r.id, allEdges);
          for (const u of lin.upstreamNodes) riskSet.add(u);
        }
      }
      list = list.filter((r) => riskSet.has(r.id));
    } else if (lens === "focus" && selectedId) {
      const lin = computeLineage(selectedId, allEdges);
      list = list.filter((r) => lin.nodes.has(r.id));
    }
    return list;
  }

  function updateHighlight() {
    const activeId = hoveredId || selectedId;
    const lin = computeLineage(activeId, currentEdges);
    for (const [id, el] of nodeEls) {
      el.classList.toggle("is-selected", id === selectedId);
      el.classList.toggle("is-focal", id === activeId);
      el.classList.toggle("is-highlighted", !!activeId && lin.nodes.has(id));
      el.classList.toggle("is-dimmed", !!activeId && !lin.nodes.has(id));
    }
    for (const [eid, el] of edgeEls) {
      el.classList.toggle("is-highlighted", !!activeId && lin.activeEdges.has(eid));
      el.classList.toggle("is-dimmed", !!activeId && !lin.activeEdges.has(eid));
    }
  }

  function renderInspector() {
    clear(inspectorWrap);
    if (!selectedId || !data.byId.has(selectedId)) {
      const openAsm = data.records.filter((r) => r.type === "assumption" && OPEN_ASSUMPTION.has(r.status)).length;
      const provReq = data.records.filter((r) => r.type === "requirement" && r.status === "provisional").length;
      inspectorWrap.append(
        h("h2", {}, "Inspector"),
        h("p", { class: "muted" }, "Click any node in the graph to lock its upstream grounding and downstream impact chain, or hover to preview."),
        h("dl", { class: "preview" },
          h("dt", {}, "Epistemic flow"),
          h("dd", {}, "Left-to-right: Assumptions & Validations → Verified Facts → Constraints & Requirements → Criteria & Decisions → Specs."),
          h("dt", {}, "Current health"),
          h("dd", {}, `${openAsm} open assumption${openAsm === 1 ? "" : "s"} · ${provReq} provisional requirement${provReq === 1 ? "" : "s"}`)),
        h("div", { class: "graph-legend" },
          h("h3", { style: "font-size:.9rem;margin-block:1rem .4rem" }, "Relationship legend"),
          h("ul", { class: "list" },
            h("li", {}, h("span", { class: "legend-line verified" }), "Verified fact underpinning (solid)"),
            h("li", {}, h("span", { class: "legend-line provisional" }), "Open assumption underpinning (dashed amber)"),
            h("li", {}, h("span", { class: "legend-line lineage" }), "Validation & promotion lineage"),
            h("li", {}, h("span", { class: "legend-line structural" }), "Governs / verifies / satisfies"))));
      return;
    }

    const r = data.byId.get(selectedId);
    const incoming = allEdges.filter((e) => e.target === r.id);
    const outgoing = allEdges.filter((e) => e.source === r.id);
    const lin = computeLineage(r.id, allEdges);
    const snippet = r.sections
      ? Object.values(r.sections)[0]?.replace(/[#*`>-]/g, "").trim().slice(0, 220)
      : "";

    const chipRow = (edge, otherId) => {
      const o = data.byId.get(otherId);
      if (!o) return null;
      return h("li", {},
        h("button", {
          type: "button", class: "link", style: "padding:0;text-decoration:none",
          onclick: () => selectNode(o.id),
        }, h("span", { class: `badge ${statusTone(o)}` }, o.id)),
        h("span", { style: "font-size:.88rem" }, o.title),
        h("small", { class: "muted" }, `· ${edge.label}`));
    };

    inspectorWrap.append(
      h("div", { style: "display:flex;justify-content:space-between;align-items:start;gap:.5rem" },
        h("div", { class: "badges" },
          h("span", { class: "badge" }, r.id),
          h("span", { class: "badge" }, typeLabel(r.type)),
          h("span", { class: `badge ${statusTone(r)}` }, r.status)),
        h("button", { type: "button", class: "icon", title: "Clear selection", onclick: () => selectNode(null) }, "✕")),
      h("h2", { style: "margin-top:.5rem;font-size:1.1rem" }, r.title),
      snippet ? h("p", { class: "muted", style: "font-size:.9rem;margin-block:.4rem .8rem" }, snippet, snippet.length >= 220 ? "…" : "") : null,
      h("div", { class: "form-actions", style: "margin-block-end:1rem" },
        h("a", { class: "button primary", href: `#/record/${r.id}` }, "Open record →"),
        h("a", { class: "button", href: githubUrl(data, `/blob/main/${r.path}`), target: "_blank", rel: "noopener" }, "GitHub ↗")),
      h("dl", { class: "preview" },
        h("dt", {}, `Upstream grounding (${incoming.length} direct · ${lin.upstreamNodes.size} total)`),
        h("dd", {}, incoming.length
          ? h("ul", { class: "list" }, incoming.map((e) => chipRow(e, e.source)))
          : h("span", { class: "empty" }, r.type === "assumption" || r.type === "fact" ? "Root epistemic record" : "No upstream links")),
        h("dt", {}, `Downstream impact (${outgoing.length} direct · ${lin.downstreamNodes.size} total)`),
        h("dd", {}, outgoing.length
          ? h("ul", { class: "list" }, outgoing.map((e) => chipRow(e, e.target)))
          : h("span", { class: "empty" }, "No downstream dependents yet"))));
  }

  function selectNode(id) {
    selectedId = id;
    if (id && ["spec", "change"].includes(data.byId.get(id)?.type) && !showSpecs) {
      showSpecs = true;
      specsToggle.checked = true;
      drawGraph();
      return;
    }
    if (!id && lens === "focus") {
      lens = "all";
      drawGraph();
      return;
    }
    syncUrl();
    updateHighlight();
    renderInspector();
  }

  function drawGraph() {
    const recs = visibleRecords();
    const layout = layoutGraph(recs, allEdges, showSpecs);
    currentEdges = layout.edges;
    nodeEls = new Map();
    edgeEls = new Map();

    countBadge.textContent = `${layout.nodes.length} record${layout.nodes.length === 1 ? "" : "s"} · ${layout.edges.length} link${layout.edges.length === 1 ? "" : "s"}`;
    clear(viewportWrap);

    if (!layout.nodes.length) {
      viewportWrap.append(h("p", { class: "empty", style: "padding:2rem" }, "No records match the current filter."));
      renderInspector();
      return;
    }

    stageEl = svg("g", { class: "graph-stage" });

    // Column swimlanes + headers
    for (const colObj of layout.cols) {
      stageEl.append(svg("g", { class: "graph-col" },
        svg("rect", {
          x: colObj.x - 10, y: 12, width: NODE_W + 20, height: layout.height - 24,
          rx: 12, class: "graph-lane",
        }),
        svg("text", { x: colObj.x, y: 34, class: "graph-col-title" }, colObj.title),
        svg("text", { x: colObj.x, y: 50, class: "graph-col-sub" }, `${colObj.sub} (${colObj.nodes.length})`)));
    }

    // Directed edges (rendered beneath nodes)
    const edgesGroup = svg("g", { class: "graph-edges" });
    for (const e of layout.edges) {
      const path = svg("path", {
        d: e.d,
        class: `graph-edge edge-${e.kind}`,
        "marker-end": edgeMarker(e.kind),
        "data-source": e.source,
        "data-target": e.target,
      }, svg("title", {}, `${e.source} ${e.label} ${e.target}`));
      edgeEls.set(e.id, path);
      edgesGroup.append(path);
    }
    stageEl.append(edgesGroup);

    // Interactive record nodes
    const nodesGroup = svg("g", { class: "graph-nodes" });
    for (const n of layout.nodes) {
      const tone = statusTone(n) || "neutral";
      const lines = wrapLines(n.title, 26, 2);
      const g = svg("g", {
        class: `graph-node tone-${tone}`,
        transform: `translate(${n.x}, ${n.y})`,
        tabindex: "0",
        role: "button",
        "aria-label": `${n.id} (${typeLabel(n.type)}, ${n.status}): ${n.title}`,
        "data-id": n.id,
        onmouseenter: () => { hoveredId = n.id; updateHighlight(); },
        onmouseleave: () => { hoveredId = null; updateHighlight(); },
        onfocus: () => { hoveredId = n.id; updateHighlight(); },
        onblur: () => { hoveredId = null; updateHighlight(); },
        onclick: (ev) => { ev.stopPropagation(); selectNode(selectedId === n.id ? null : n.id); },
        ondblclick: () => { location.hash = `#/record/${n.id}`; },
        onkeydown: (ev) => {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectNode(n.id); }
          else if (ev.key === "Escape") { selectNode(null); }
        },
      },
      svg("rect", { width: NODE_W, height: NODE_H, rx: 10, class: "node-card" }),
      svg("rect", { x: 0, y: 0, width: 6, height: NODE_H, rx: 3, class: "node-stripe" }),
      svg("text", { x: 14, y: 20, class: "node-id" }, n.id),
      svg("text", { x: NODE_W - 10, y: 20, "text-anchor": "end", class: "node-meta" }, `${SHORT_TYPE[n.type] || n.type} · ${n.status}`),
      svg("text", { x: 14, y: 39, class: "node-title" },
        lines.map((ln, idx) => svg("tspan", { x: 14, dy: idx === 0 ? 0 : 15 }, ln))));

      nodeEls.set(n.id, g);
      nodesGroup.append(g);
    }
    stageEl.append(nodesGroup);

    svgEl = svg("svg", {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "graph-svg",
      onclick: () => selectNode(null),
    }, createSvgDefs(), stageEl);

    // Drag-to-pan + Ctrl/Cmd-wheel zoom on viewport
    let dragStart = null;
    viewportWrap.onpointerdown = (ev) => {
      if (ev.target.closest(".graph-node")) return;
      dragStart = { x: ev.clientX - panX, y: ev.clientY - panY };
      viewportWrap.classList.add("is-panning");
    };
    viewportWrap.onpointermove = (ev) => {
      if (!dragStart) return;
      panX = ev.clientX - dragStart.x;
      panY = ev.clientY - dragStart.y;
      applyTransform();
    };
    viewportWrap.onpointerup = viewportWrap.onpointerleave = () => {
      dragStart = null;
      viewportWrap.classList.remove("is-panning");
    };
    viewportWrap.onwheel = (ev) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      zoomBy(ev.deltaY < 0 ? 1.12 : 0.9);
    };

    viewportWrap.append(svgEl);
    applyTransform();
    syncUrl();
    updateHighlight();
    renderInspector();
  }

  // Controls bar
  const domains = ["all", ...data.domains];
  const domainSelect = h("select", {
    id: "graph-domain",
    onchange: (e) => { domain = e.target.value; drawGraph(); },
  }, domains.map((d) => h("option", { value: d, selected: d === domain }, d === "all" ? "All domains" : `Domain: ${d}`)));

  const lenses = [
    ["all", "All records"],
    ["risk", "Epistemic risk (open assumptions)"],
    ["focus", "Isolate selected lineage"],
  ];
  const lensGroup = h("div", { class: "filters", role: "radiogroup", "aria-label": "Graph lens", style: "margin:0" },
    lenses.map(([val, label]) => h("label", { class: "chip-toggle" },
      h("input", {
        type: "radio", name: "graph-lens", value: val, checked: lens === val,
        onchange: () => {
          if (val === "focus" && !selectedId) {
            const firstReq = data.records.find((r) => r.type === "requirement") || data.records[0];
            selectedId = firstReq?.id || null;
          }
          lens = val;
          drawGraph();
        },
      }), label)));

  const specsToggle = h("input", {
    type: "checkbox", checked: showSpecs,
    onchange: (e) => { showSpecs = e.target.checked; drawGraph(); },
  });

  const focusListId = "graph-jump-list";
  const jumpInput = h("input", {
    type: "search", list: focusListId, placeholder: "Jump to record (e.g. REQ-0002)…",
    style: "width:15rem;min-height:38px;padding:.35rem .65rem",
    onchange: (e) => {
      const m = e.target.value.trim().match(/^([A-Z]{3}-\d{4})\b/);
      if (m && data.byId.has(m[1])) {
        selectNode(m[1]);
        e.target.value = "";
      }
    },
  });
  const jumpDatalist = h("datalist", { id: focusListId },
    data.records.map((r) => h("option", { value: `${r.id} — ${r.title}` })));

  const toolbar = h("div", { class: "graph-toolbar card" },
    h("div", { class: "graph-toolbar-row" },
      h("label", { for: "graph-domain", class: "visually-hidden" }, "Domain"),
      domainSelect,
      lensGroup,
      h("label", { class: "chip-toggle" }, specsToggle, "Show specs & changes (SPC/CHG)"),
      jumpInput, jumpDatalist),
    h("div", { class: "graph-toolbar-row" },
      countBadge,
      h("div", { class: "graph-zoom" },
        h("button", { type: "button", class: "icon", title: "Zoom out", onclick: () => zoomBy(0.88) }, "−"),
        zoomLabel,
        h("button", { type: "button", class: "icon", title: "Zoom in", onclick: () => zoomBy(1.14) }, "＋"),
        h("button", { type: "button", class: "icon", onclick: resetZoom }, "Reset"))));

  clear(main).append(
    h("div", { class: "page-head" },
      h("div", {},
        h("h1", { tabindex: "-1" }, "Record Graph"),
        h("p", { class: "lead" }, "Trace how assumptions, validations, and verified facts underpin requirements, criteria, decisions, and specifications.")),
      h("div", { class: "form-actions" },
        h("a", { class: "button primary", href: "#/capture/requirement" }, "＋ Capture a requirement"))),
    toolbar,
    h("div", { class: "graph-workspace" }, viewportWrap, inspectorWrap));

  drawGraph();
}

// ------------------------------------------------------------------ embedded neighborhood mini-graph for #/record/:id
export function renderMiniGraph(data, focalId) {
  const allEdges = extractCanonicalEdges(data.records, data.byId);
  const lin = computeLineage(focalId, allEdges);
  const focal = data.byId.get(focalId);
  if (!focal || lin.nodes.size <= 1) {
    return h("p", { class: "empty" }, "No linked records yet.");
  }

  const includeComp = ["spec", "change"].includes(focal.type);
  const subRecords = data.records.filter((r) => lin.nodes.has(r.id) && (includeComp || !["spec", "change"].includes(r.type) || r.id === focalId));
  const layout = layoutGraph(subRecords, allEdges, includeComp);

  const stage = svg("g", {});
  for (const colObj of layout.cols) {
    if (!colObj.nodes.length) continue;
    stage.append(svg("g", { class: "graph-col" },
      svg("rect", { x: colObj.x - 8, y: 10, width: NODE_W + 16, height: layout.height - 20, rx: 10, class: "graph-lane" }),
      svg("text", { x: colObj.x, y: 32, class: "graph-col-title" }, colObj.title)));
  }
  for (const e of layout.edges) {
    stage.append(svg("path", {
      d: e.d,
      class: `graph-edge edge-${e.kind} is-highlighted`,
      "marker-end": edgeMarker(e.kind),
    }, svg("title", {}, `${e.source} ${e.label} ${e.target}`)));
  }
  for (const n of layout.nodes) {
    const tone = statusTone(n) || "neutral";
    const lines = wrapLines(n.title, 26, 2);
    stage.append(svg("g", {
      class: `graph-node tone-${tone} is-highlighted ${n.id === focalId ? "is-selected is-focal" : ""}`,
      transform: `translate(${n.x}, ${n.y})`,
      tabindex: "0",
      role: "link",
      "aria-label": `${n.id}: ${n.title}`,
      onclick: () => { if (n.id !== focalId) location.hash = `#/record/${n.id}`; },
      onkeydown: (ev) => { if ((ev.key === "Enter" || ev.key === " ") && n.id !== focalId) { ev.preventDefault(); location.hash = `#/record/${n.id}`; } },
    },
    svg("rect", { width: NODE_W, height: NODE_H, rx: 10, class: "node-card" }),
    svg("rect", { x: 0, y: 0, width: 6, height: NODE_H, rx: 3, class: "node-stripe" }),
    svg("text", { x: 14, y: 20, class: "node-id" }, n.id),
    svg("text", { x: NODE_W - 10, y: 20, "text-anchor": "end", class: "node-meta" }, `${SHORT_TYPE[n.type] || n.type} · ${n.status}`),
    svg("text", { x: 14, y: 39, class: "node-title" },
      lines.map((ln, idx) => svg("tspan", { x: 14, dy: idx === 0 ? 0 : 15 }, ln)))));
  }

  return h("div", { class: "mini-graph-wrap" },
    svg("svg", {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "graph-svg mini-graph-svg",
      role: "img",
      "aria-label": `Traceability neighborhood graph for ${focalId}`,
    }, createSvgDefs(), stage));
}
