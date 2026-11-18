// ASDLC Meta-Specs workspace: one module, no build step.
// Reads data/index.json (written by `python tools/spec.py index`) and renders five views.

const PREFIXES = ["ASM", "FCT", "QST", "REQ", "SPC"];
const LABELS = { ASM: "Assumptions", FCT: "Facts", QST: "Questions", REQ: "Requirements", SPC: "Specs" };
const main = document.getElementById("main");
let data, byId, usedBy, askedBy, redraw = null;

// ---------- helpers ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const prefix = (id) => id.slice(0, 3);
const BADGE_VARIANT = {
  active: "success", validated: "success", answered: "success",
  open: "warning", provisional: "warning", draft: "warning", stale: "warning", ready: "info", asked: "warning",
  broken: "accent", invalidated: "neutral", deprecated: "neutral",
};
const badge = (status) => h("ui-badge", { variant: BADGE_VARIANT[status] || "neutral" }, status);
const rid = (id) => h("a", { class: `rid t-${prefix(id)}`, href: `#/record/${id}` }, id);
const ofType = (p) => data.records.filter((r) => prefix(r.id) === p);
const gh = (path) => (data.repo ? `https://github.com/${data.repo}/${path}` : "#");
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

/** Links a record points to, i.e. what it rests on or is built from. Questions point the other way, so they are looked up. */
function upstream(r) {
  return [...(r.because || []), ...(r.requirements || []), ...(r.depends_on || []), ...(r.promoted_from ? [r.promoted_from] : []),
    ...(r.answered_by ? [r.answered_by] : []), ...(askedBy[r.id] || [])];
}

function inline(text) {
  return text.split(/(`[^`]*`)/).map((part) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return `<code>${esc(part.slice(1, -1))}</code>`;
    return esc(part)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\b(ASM|FCT|QST|REQ|SPC)-\d{4}\b/g, (m) => (byId[m] ? `<a class="rid t-${m.slice(0, 3)}" href="#/record/${m}">${m}</a>` : m));
  }).join("");
}

/** Just enough Markdown for record bodies: headings, lists, paragraphs, inline code/bold/links. */
function markdown(src) {
  const out = [];
  let list = null, para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    if (list) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
    para = []; list = null;
  };
  for (const line of src.split("\n")) {
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    const item = line.match(/^\s*[-*]\s+(.*)/);
    if (heading) { flush(); out.push(`<h2>${inline(heading[2])}</h2>`); }
    else if (item) { if (para.length) flush(); (list ||= []).push(item[1]); }
    else if (!line.trim()) flush();
    else { if (list) flush(); para.push(line.trim()); }
  }
  flush();
  return out.join("\n");
}

// ---------- state ----------
// Every status maps to one tone: done (green), wait (amber, needs a human), bad (red), off (grey, retired).
const TONES = {
  FCT: { active: ["done", "recorded"], stale: ["wait", "past review date"], deprecated: ["off", "retired"] },
  ASM: { validated: ["done", "validated"], open: ["wait", "need testing"], invalidated: ["off", "refuted"] },
  QST: { answered: ["done", "answered"], open: ["wait", "need an answer"] },
  REQ: { active: ["done", "active"], ready: ["wait", "ready to activate"], asked: ["wait", "waiting on a question"], provisional: ["wait", "waiting on assumptions"], broken: ["bad", "broken"] },
  SPC: { active: ["done", "active"], draft: ["wait", "in progress"] },
};
const isStale = (r) => prefix(r.id) === "FCT" && r.status === "active" && r.review_after && new Date().toISOString().slice(0, 10) > String(r.review_after);
/** The status a record really has: a requirement resting on something refuted is broken, one with an open question is waiting on it, and one resting only on facts is ready, whatever its file says. */
function effective(r) {
  if (isStale(r)) return "stale";
  if (prefix(r.id) !== "REQ" || r.status === "active") return r.status;
  const grounds = (r.because || []).map((g) => byId[g]).filter(Boolean);
  if (grounds.some((g) => tone(g) === "off")) return "broken";
  if (r.open_questions?.length) return "asked";
  return grounds.length && grounds.every((g) => prefix(g.id) === "FCT") ? "ready" : r.status;
}
function tone(r) {
  return (TONES[prefix(r.id)][effective(r)] || TONES[prefix(r.id)][r.status] || ["off", r.status])[0];
}
const section = (body, heading) => (body.match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m")) || [, ""])[1].trim();
const editLink = (r, label = "Edit on GitHub") => h("a", { class: "btn ghost", href: gh(`edit/main/${r.path}`), target: "_blank", rel: "noopener" }, label);
const idList = (ids) => ids.flatMap((d, i) => [i ? ", " : "", rid(d)]);

/** Why a requirement is not active yet, in one line. */
function blocker(req) {
  const grounds = (req.because || []).map((g) => byId[g]).filter(Boolean);
  const dead = grounds.filter((g) => tone(g) === "off");
  const open = grounds.filter((g) => g.status === "open");
  if (req.status === "broken" || dead.length) return ["bad", ["rests on ", ...idList(dead.map((g) => g.id)), dead.length > 1 ? ", which are" : ", which is", " no longer true. Rework it."]];
  const asked = req.open_questions || [];
  if (open.length || asked.length) return ["wait", ["waiting on ",
    ...(asked.length ? [...idList(asked), " to be answered"] : []), asked.length && open.length ? " and " : "",
    ...(open.length ? [...idList(open.map((g) => g.id)), " to be tested"] : []), "."]];
  return ["ready", ["all its grounds are facts. Set ", h("code", {}, "status: active"), "."]];
}

/** Everything a human can do to move the spec forward, most urgent first. */
function tasks() {
  const out = [];
  const add = (level, r, title, why, actions, unlocks = []) => out.push({ level, r, title, why, actions, unlocks });
  for (const issue of data.issues || []) {
    const [lvl, msg] = issue.split(": ", 2);
    add(lvl === "error" ? "fix" : "tidy", { id: "GRAPH", title: "Global graph validation" }, ["Fix graph validation error"], [msg || issue], []);
  }
  for (const r of ofType("REQ")) {
    if (r.status !== "active") {
      const [kind, why] = blocker(r);
      if (kind === "bad") add("fix", r, ["Rework ", rid(r.id)], why, [editLink(r)], r.downstream);
      if (kind === "ready") add("quick", r, ["Activate ", rid(r.id)], why, [editLink(r)], r.downstream);
    }
    if (!data.records.some((s) => (s.requirements || []).includes(r.id)))
      add("tidy", r, ["Put ", rid(r.id), " in a spec"], ["It is not part of any spec yet, so nothing will build it."], [h("a", { class: "btn ghost", href: "#/capture/spec" }, "New spec"), editLink(r, "Or edit an existing spec")]);
  }
  for (const q of ofType("QST").filter((q) => q.status === "open").sort((x, y) => y.downstream.length - x.downstream.length)) {
    add("answer", q, ["Answer ", rid(q.id)], [section(q.body, "Question") || "Nobody has proposed an answer yet."],
      [h("a", { class: "btn", href: `#/capture/fact?answers=${q.id}` }, "We know → record the fact"),
       h("a", { class: "btn ghost", href: `#/capture/assumption?answers=${q.id}` }, "We have a guess → record the assumption")], q.downstream);
  }
  for (const a of ofType("ASM").filter((a) => a.status === "open").sort((x, y) => y.downstream.length - x.downstream.length)) {
    const plan = section(a.body, "How we validate it");
    add("test", a, ["Test ", rid(a.id)], [plan ? [h("strong", {}, "How: "), plan] : "No validation plan yet. Add one."],
      [h("a", { class: "btn", href: `#/capture/fact?promote=${a.id}` }, "It held → record the fact"),
       editLink(a, "It failed → set status: invalidated")], a.downstream);
  }
  for (const sp of ofType("SPC").filter((s) => s.status !== "active" && (s.requirements || []).length && (s.requirements || []).every((q) => byId[q]?.status === "active") && !s.open_questions.length))
    add("quick", sp, ["Activate ", rid(sp.id)], ["Every requirement in it is active. Set ", h("code", {}, "status: active"), "."], [editLink(sp)]);
  for (const r of data.records) for (const issue of r.issues) {
    const [lvl, msg] = issue.split(": ", 2);
    const level = lvl === "error" ? "fix" : "tidy";
    const same = out.find((t) => t.r === r && t.level === level);
    if (same) same.why = [same.why, h("div", { class: "muted" }, `Check says: ${msg}`)];
    else add(level, r, [lvl === "error" ? "Fix " : "Check ", rid(r.id)], [msg], [editLink(r)]);
  }
  return out;
}
const LEVELS = {
  fix: ["Fix now", "Something is wrong or no longer true. CI fails until these are done."],
  answer: ["Answer questions", "Nobody has an answer yet, so what they block stays provisional and an agent will ask instead of guess. An answer can be a fact, or an assumption to test."],
  test: ["Test assumptions", "Each test turns guesswork into a fact, or tells you early that a requirement is wrong."],
  quick: ["Quick wins", "Already earned. Just flip the status."],
  tidy: ["Tidy up", "Not blocking, but worth doing."],
};

// ---------- views ----------
function dashboard() {
  const todo = tasks();
  const per = (lvl) => todo.filter((t) => t.level === lvl).length;
  // Questions first: they do not even have a candidate answer yet.
  const byReach = (a, b) => b.downstream.length - a.downstream.length;
  const open = ["QST", "ASM"].flatMap((p) => ofType(p).filter((r) => r.status === "open").sort(byReach));
  const attention = data.spec_order.map((id) => byId[id]).filter((sp) => sp.status !== "active" || sp.issues.length);
  const fine = data.spec_order.filter((id) => !attention.includes(byId[id]));

  main.append(
    h("h1", {}, "Dashboard"),
    data.generated_at ? h("p", { class: "muted" }, `Index generated ${data.generated_at}${data.revision ? ` (${data.revision})` : ""}`) : "",
    h("div", { class: "tiles" },
      h("ui-stat-tile", { value: String(data.records.length), label: "Total Records", status: "info" }),
      h("ui-stat-tile", { value: String(ofType("FCT").filter((r) => r.status === "active").length), label: "Active Facts", status: "done", variant: "success" }),
      h("ui-stat-tile", { value: String(open.length), label: "Open QST / ASM", status: open.length ? "wait" : "done", variant: open.length ? "warning" : "success" }),
      h("ui-stat-tile", { value: String(fine.length), label: "Specs Active", status: "done", variant: "accent" })),
    todo.length || data.summary?.errors
      ? h("a", { href: "#/tasks", style: "text-decoration:none;display:block;margin:16px 0 8px" },
          h("ui-callout", {
            variant: per("fix") || data.summary?.errors ? "danger" : "warning",
            title: `${todo.length || data.summary.errors} task${(todo.length || data.summary.errors) > 1 ? "s" : ""} need you`,
          }, Object.keys(LEVELS).filter(per).map((l) => `${per(l)} ${LEVELS[l][0].toLowerCase()}`).join(" · ") || `${data.summary.errors} validation error(s)`,
             " · ", h("strong", {}, "Open tasks →")))
      : h("ui-callout", { variant: "success", title: "Nothing needs you", style: "margin:16px 0 8px" },
          "Every requirement rests on recorded facts and all declared grounds are consistent."),

    h("h2", {}, "State of the spec"),
    h("div", { class: "legend" }, ...[["done", "done"], ["wait", "needs attention"], ["bad", "broken"], ["off", "retired"]].map(([t, l]) => h("span", {}, h("ui-dot", { status: t }), l))),
    h("div", { class: "states" }, PREFIXES.map(stateRow)),

    h("h2", {}, "Specs requiring attention"),
    attention.length ? h("div", { class: "cards" }, attention.map(specCard)) : h("p", { class: "muted" }, "None. All specs are locally active."),
    fine.length ? h("p", { class: "muted" }, "Locally active: ", idList(fine), " ✓") : "",

    h("h2", {}, "What's holding things back"),
    open.length
      ? h("ul", { class: "list" }, open.map((a) => { const q = prefix(a.id) === "QST"; return h("li", {}, rid(a.id),
          h("div", { class: "grow" }, a.title, h("div", { class: "muted" },
            q ? "no answer yet" : `confidence ${a.confidence ?? "?"}`, " · holds back ", a.downstream.length ? idList(a.downstream) : "nothing")),
          h("a", { href: q ? `#/capture/fact?answers=${a.id}` : `#/capture/fact?promote=${a.id}` }, q ? "Answer" : "Record result")); }))
      : h("p", { class: "muted" }, "No open questions or assumptions. Everything rests on facts."));
}

function stateRow(p) {
  const rs = ofType(p);
  const groups = Object.entries(TONES[p]).map(([status, [t, label]]) => ({ status, t, label, n: rs.filter((r) => effective(r) === status).length })).filter((g) => g.n);
  const link = (g) => `#/records?type=${p}&status=${g.status}`;
  return h("div", { class: "state" },
    h("a", { class: "state-name", href: `#/records?type=${p}` }, LABELS[p], h("span", { class: "muted" }, ` ${rs.length}`)),
    h("div", { class: "seg" }, groups.map((g) => h("a", { class: `seg-${g.t}`, href: link(g), style: `flex:${g.n}`, title: `${g.n} ${g.label}` }))),
    h("div", { class: "seg-legend" }, groups.map((g) => h("a", { href: link(g) }, h("ui-dot", { status: g.t }), `${g.n} ${g.label}`))));
}

function specCard(sp) {
  const reqs = (sp.requirements || []).map((id) => byId[id]).filter(Boolean);
  const pending = reqs.filter((r) => r.status !== "active");
  return h("div", { class: "card" },
    h("div", { style: "display:flex;align-items:center;gap:6px;flex-wrap:wrap" }, rid(sp.id), badge(sp.status), h("ui-badge", { variant: "info" }, sp.tier)),
    h("h3", {}, h("a", { href: `#/record/${sp.id}` }, sp.title)),
    h("ui-progress", { value: String(sp.readiness), variant: sp.readiness === 100 ? "success" : "warning", "aria-label": `${sp.readiness}% of requirements active` }),
    h("div", { class: "muted" }, `${reqs.length - pending.length} of ${reqs.length} requirements active`),
    h("ul", { class: "blockers" },
      sp.issues.map((i) => h("li", { class: "bad" }, i)),
      sp.open_questions.length ? h("li", { class: "wait" }, "Spec waiting on ", idList(sp.open_questions), " to be answered.") : "",
      pending.length ? pending.map((r) => { const [t, why] = blocker(r); return h("li", { class: t }, rid(r.id), " ", why); })
        : sp.status !== "active" && !sp.open_questions.length ? h("li", { class: "ready" }, "All requirements active. Set ", h("code", {}, "status: active"), ".") : ""));
}

function tasksView() {
  const todo = tasks();
  main.append(h("h1", {}, "Tasks"),
    h("p", { class: "muted" }, "What a human needs to do to move the spec forward, worked out from the records. Each action opens GitHub; CI checks the change."));
  if (!todo.length) return main.append(h("ui-callout", { variant: "success", title: "Nothing to do" }, "Every requirement rests on facts and every spec is ready."));
  for (const [lvl, [title, intro]] of Object.entries(LEVELS)) {
    const group = todo.filter((t) => t.level === lvl);
    if (!group.length) continue;
    main.append(h("h2", {}, title, h("span", { class: `count ${lvl}` }, group.length)), h("p", { class: "muted" }, intro),
      h("div", { class: "tasks" }, group.map((t) => h("div", { class: `task ${lvl}` },
        h("div", { class: "task-title" }, t.title, " ", h("span", { class: "muted" }, t.r.title)),
        h("div", { class: "task-why" }, t.why),
        t.unlocks.length ? h("div", { class: "muted" }, "Unlocks ", idList(t.unlocks)) : "",
        h("div", { class: "task-actions" }, t.actions)))));
  }
}

function records(params) {
  const type = params.get("type") || "";
  const status = params.get("status") || "";
  const list = h("ul", { class: "list" });
  const search = h("ui-input", { type: "search", placeholder: "Search id, title or text…", "aria-label": "Search records" });
  const fill = () => {
    const q = (search.value || "").toLowerCase();
    const rows = data.records.filter((r) => (!type || prefix(r.id) === type) && (!status || effective(r) === status) &&
      (!q || `${r.id} ${r.title} ${r.body}`.toLowerCase().includes(q)));
    list.replaceChildren(...(rows.length ? rows.map((r) => h("li", {}, rid(r.id),
      h("a", { class: "grow", href: `#/record/${r.id}`, style: "color:inherit" }, r.title), badge(r.status)))
      : [h("li", { class: "muted" }, "No records match.")]));
  };
  search.addEventListener("ui-input", fill);
  main.append(h("h1", {}, "Records"),
    h("div", { class: "toolbar" },
      ["", ...PREFIXES].map((p) => h("ui-chip", {
        pressed: p === type,
        onclick: () => { location.hash = p ? `#/records?type=${p}` : "#/records"; },
      }, p ? `${LABELS[p]} (${ofType(p).length})` : `All (${data.records.length})`)),
      status ? h("ui-chip", {
        variant: "accent",
        pressed: true,
        title: "Clear status filter",
        onclick: () => { location.hash = type ? `#/records?type=${type}` : "#/records"; },
      }, `status: ${status} ×`) : "",
      search),
    list);
  fill();
}

function record(id) {
  const r = byId[id];
  if (!r) return notFound();
  const links = (ids) => ids?.length ? h("div", {}, ids.map((x) => h("div", {}, rid(x), " ", h("span", { class: "muted" }, byId[x]?.title || "unknown")))) : null;
  const field = (label, value) => value == null || value === "" ? null : [h("dt", {}, label), h("dd", {}, value)];
  main.append(
    h("p", {}, h("a", { href: `#/records?type=${prefix(id)}` }, `← ${LABELS[prefix(id)]}`)),
    h("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:6px" }, rid(id), badge(r.status)),
    h("h1", {}, r.title),
    r.issues.length ? h("ui-callout", { variant: "danger", title: "Validation Issues", style: "margin:12px 0" }, r.issues.map((i) => h("div", {}, i))) : "",
    h("detail-layout", { style: "margin-top:16px" },
      h("article", { class: "prose", html: markdown(r.body) }),
      h("div", { slot: "aside" },
        h("dl", { class: "meta" },
          field("Confidence", r.confidence),
          field("Evidence", r.evidence),
          field("Review after", r.review_after),
          field("Tier", r.tier),
          field("Local eligibility", r.readiness != null ? `${(r.requirements || []).filter((reqId) => byId[reqId]?.status === "active").length}/${(r.requirements || []).length} direct requirements active (${r.readiness}%)` : null),
          field("Promoted from", r.promoted_from && rid(r.promoted_from)),
          field("Promoted to", r.promoted_to && rid(r.promoted_to)),
          field("Answered by", r.answered_by && rid(r.answered_by)),
          field("Blocks", links(r.blocks)),
          field("Open questions", links(r.open_questions)),
          field("Because", links(r.because)),
          field("Builds on", links(r.depends_on)),
          field("Requirements", links(r.requirements)),
          field("Used by", links(usedBy[id])),
          field("Changing this affects", links(r.downstream))),
        h("p", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" },
          h("a", { class: "btn ghost", href: `#/graph?focus=${id}` }, "Show in graph"),
          h("a", { class: "btn ghost", href: gh(`edit/main/${r.path}`), target: "_blank", rel: "noopener" }, "Edit on GitHub")))));
}

function graph(params) {
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  };
  const wrap = h("div", { class: "graph", role: "group", "aria-label": "Record graph" });
  // Two edge layers: the base layer sits under every card, the live layer (the selected lineage) sits above
  // dimmed cards but below lit ones, so a highlighted path is never cut by a faded card. See the z-index tokens in styles.css.
  const baseLayer = svgEl("svg", { class: "edges edges-base", "aria-hidden": "true", focusable: "false" });
  const liveLayer = svgEl("svg", { class: "edges edges-live", "aria-hidden": "true", focusable: "false" });
  const defs = svgEl("defs");
  for (const kind of ["fact", "weak", "dep"]) {
    const marker = svgEl("marker", { id: `arrow-${kind}`, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
    marker.append(svgEl("path", { d: "M 0 1.5 L 8 5 L 0 8.5 z", class: `arrow-${kind}` }));
    defs.append(marker);
  }

  const nodes = {};
  const order = [];
  const edges = [];
  const builtOn = (e) => prefix(e.from) === "SPC" && prefix(e.to) === "SPC";
  for (const r of data.records) {
    for (const from of upstream(r)) if (byId[from]) {
      const dep = prefix(from) === "SPC" && prefix(r.id) === "SPC";
      const weak = !dep && (prefix(from) === "ASM" ? byId[from].status !== "validated"
        : prefix(from) === "QST" ? byId[from].status === "open"
        : byId[from].status !== "active" && prefix(r.id) === "SPC");
      edges.push({ from, to: r.id, weak, dep });
    }
  }

  let selected = null, hovered = null, query = "";

  /** What a record rests on (up) and what a change to it affects (down). A spec built on another spec shows that spec, not its whole ground. */
  function lineage(id) {
    const walk = (dir) => {
      const seen = new Set(), todo = [id];
      while (todo.length) {
        const cur = todo.pop();
        for (const e of edges) {
          const next = dir === "up" ? (e.to === cur && e.from) : (e.from === cur && e.to);
          if (!next || next === id || seen.has(next)) continue;
          seen.add(next);
          if (!(dir === "up" && builtOn(e))) todo.push(next);
        }
      }
      return seen;
    };
    const up = walk("up"), down = walk("down");
    return { id, up, down, all: new Set([id, ...up, ...down]) };
  }
  const current = () => { const id = selected || hovered; return id && byId[id] ? lineage(id) : null; };
  const matchesOf = () => (query ? new Set(order.filter((id) => `${id} ${byId[id].title}`.toLowerCase().includes(query))) : null);
  const EXCERPT = { REQ: "Statement", ASM: "Statement", FCT: "Statement", QST: "Question", SPC: "Purpose" };
  const excerpt = (r) => section(r.body, EXCERPT[prefix(r.id)]).replace(/\s+/g, " ").trim();

  // The bar keeps a fixed shape (main row, actions, two-line excerpt) so previewing never shifts the graph under the pointer.
  function renderStatus(lin, matches) {
    const text = lin ? excerpt(byId[lin.id]) : "";
    const ex = h("p", { class: "graph-bar-excerpt", ...(text ? { html: inline(text) } : {}) });
    if (!lin) {
      bar.classList.remove("active");
      bar.replaceChildren(
        h("div", { class: "graph-bar-main muted" }, matches
          ? (matches.size ? `${matches.size} match${matches.size > 1 ? "es" : ""} · press Enter to select the first` : "No records match.")
          : "Hover or focus a record to preview its lineage · click to select it · Esc to clear."),
        h("div", { class: "graph-bar-actions" }), ex);
      return;
    }
    const r = byId[lin.id];
    bar.classList.add("active");
    bar.replaceChildren(
      h("div", { class: "graph-bar-main" },
        h("span", { class: `rid t-${prefix(r.id)}` }, r.id), badge(r.status), h("strong", {}, r.title),
        h("span", { class: "muted" }, `↑ rests on ${lin.up.size} · ↓ affects ${lin.down.size}`),
        selected ? null : h("span", { class: "muted" }, "· preview")),
      h("div", { class: "graph-bar-actions" },
        selected && r.depends_on?.length ? h("span", { class: "muted" }, "Builds on ",
          r.depends_on.map((d, i) => [i ? " " : "", h("button", { type: "button", class: "chip-inline", onclick: () => select(d, true) }, d)])) : null,
        selected ? h("a", { class: "btn ghost", href: `#/record/${r.id}` }, "Open record →") : null,
        selected ? h("button", { type: "button", class: "btn ghost", onclick: () => select(null) }, "Clear (Esc)") : null),
      ex);
  }

  function applyHighlight() {
    const lin = current();
    const matches = matchesOf();
    wrap.classList.toggle("focus", !!(lin || matches));
    for (const [nid, el] of Object.entries(nodes)) {
      const lit = lin ? lin.all.has(nid) : !!matches && matches.has(nid);
      el.classList.toggle("lit", lit);
      el.classList.toggle("dim", lin ? !lit : !!matches && !lit);
      el.classList.toggle("up", !!lin && lin.up.has(nid));
      el.classList.toggle("down", !!lin && lin.down.has(nid));
      el.classList.toggle("sel", nid === selected);
      el.classList.toggle("match", !lin && !!matches && matches.has(nid));
      el.setAttribute("aria-pressed", String(nid === selected));
    }
    renderStatus(lin, matches);
    draw(lin, matches);
  }

  /** Click toggles a selection; `reveal` (chips, search, deep links) always selects and scrolls the card into view. */
  function select(id, reveal = false) {
    const toggledOff = id && selected === id && !reveal;
    selected = !id || toggledOff ? null : id;
    hovered = toggledOff ? id : null;
    applyHighlight();
    if (selected && reveal) nodes[selected].scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function preview(id) {
    if (selected || hovered === id) return;
    hovered = id;
    applyHighlight();
  }

  const columns = PREFIXES.map((p) => {
    const items = ofType(p);
    return h("div", { class: "col" },
      h("h3", {}, LABELS[p], " ", h("span", { class: "muted" }, items.length)),
      items.map((r) => {
        order.push(r.id);
        return (nodes[r.id] = h("button", {
          type: "button", class: `node t-${p}`, "aria-pressed": "false", "aria-label": `${r.id}, ${r.status}: ${r.title}`,
          onclick: () => select(r.id),
          onmouseenter: () => preview(r.id), onmouseleave: () => preview(null),
          onfocus: () => preview(r.id), onblur: () => preview(null),
        }, h("div", { class: "node-head" }, h("span", { class: `rid t-${p}` }, r.id), badge(r.status)), h("div", {}, r.title)));
      }));
  });
  wrap.append(baseLayer, ...columns, liveLayer);

  function draw(lin, matches = null) {
    const box = wrap.getBoundingClientRect();
    if (!box.width) return;
    const active = lin ? lin.all : matches;
    const base = [], live = [];
    for (const e of edges) {
      const a = nodes[e.from].getBoundingClientRect(), b = nodes[e.to].getBoundingClientRect();
      const y1 = a.top + a.height / 2 - box.top, y2 = b.top + b.height / 2 - box.top;
      let d;
      if (e.dep) { // spec builds on spec: loop through the padded gutter right of the Specs column
        const x = a.right - box.left;
        d = `M${x},${y1} C${x + 38},${y1} ${x + 38},${y2} ${x + 3},${y2}`;
      } else {
        const x1 = a.right - box.left, x2 = b.left - box.left - 3, mid = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
      }
      const kind = e.dep ? "dep" : e.weak ? "weak" : "fact";
      const on = !!active && active.has(e.from) && active.has(e.to);
      (on ? live : base).push(svgEl("path", { d, class: `edge edge-${kind}${on ? " on" : ""}`, "marker-end": `url(#arrow-${kind})` }));
    }
    baseLayer.replaceChildren(defs, ...base);
    liveLayer.replaceChildren(...live);
  }

  const search = h("ui-input", { type: "search", class: "graph-search", placeholder: "Find a record…", "aria-label": "Find a record in the graph" });
  search.addEventListener("ui-input", (e) => { query = (e.detail.value || "").trim().toLowerCase(); applyHighlight(); });
  search.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      const m = matchesOf();
      const first = m && order.find((id) => m.has(id));
      if (first) select(first, true);
    }
    if (ev.key === "Escape" && search.value) ev.stopPropagation(); // the browser clears the field; keep the selection
  });

  const bar = h("div", { class: "graph-bar", "aria-live": "polite" });
  main.append(h("h1", {}, "Graph"),
    h("p", { class: "muted lede" }, "Arrows run from what a record rests on to what rests on it. Select a record to bring its lineage forward; everything else steps back."),
    h("div", { class: "graph-toolbar-sticky" },
      h("div", { class: "graph-toolbar glass" },
        h("div", { class: "graph-toolbar-row" }, search,
          h("div", { class: "legend" },
            h("span", {}, h("i"), "grounded"),
            h("span", {}, h("i", { class: "weak" }), "open assumption or question"),
            h("span", {}, h("i", { class: "dep" }), "spec builds on spec"),
            h("span", {}, "↑ rests on · ↓ affects"))),
        bar)),
    h("div", { class: "graph-wrap" }, wrap));

  redraw = () => draw(current(), matchesOf());
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => (wrap.isConnected ? redraw?.() : ro.disconnect()));
    ro.observe(wrap);
  }
  const onKey = (ev) => {
    if (!wrap.isConnected) return removeEventListener("keydown", onKey);
    if (ev.key !== "Escape") return;
    if (selected) select(null);
    else if (query) { search.value = ""; query = ""; applyHighlight(); }
  };
  addEventListener("keydown", onKey);

  const focus = params.get("focus");
  requestAnimationFrame(() => (focus && byId[focus] ? select(focus, true) : applyHighlight()));
}

// ---------- capture ----------
const yamlStr = (s) => (/^[A-Za-z0-9][\w .,()'/-]*$/.test(s) ? s : JSON.stringify(s));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "untitled";
function nextId(p) {
  const nums = ofType(p).map((r) => Number(r.id.slice(4)));
  return `${p}-${String(Math.max(0, ...nums) + 1).padStart(4, "0")}`;
}
const optionsOf = (p, filter = () => true) => ofType(p).filter(filter).map((r) => ({ value: r.id, label: `${r.id} · ${r.title} (${r.status})` }));

const CAPTURES = {
  requirement: {
    prefix: "REQ", label: "Requirement",
    intro: "What the system must do, and why. Citing an open assumption makes it provisional.",
    fields: () => [
      { key: "title", label: "Title", type: "text", hint: "Short and behavioural." },
      { key: "statement", label: "Statement", type: "textarea", placeholder: "The system MUST …" },
      { key: "because", label: "Because", type: "checks", options: [...optionsOf("FCT", (r) => r.status === "active"), ...optionsOf("ASM", (r) => r.status === "open")], hint: "At least one fact or assumption." },
      { key: "acceptance", label: "Acceptance", type: "textarea", initial: "- Given \n- When \n- Then ", hint: "Separate scenarios with a blank line." },
    ],
    required: ["title", "statement", "because"],
    build(v) {
      const because = v.because || [];
      const shaky = !because.length || because.some((id) => prefix(id) === "ASM");
      return { status: shaky ? "provisional" : "active", meta: { because: `[${because.join(", ")}]` },
        sections: { Statement: v.statement, Acceptance: v.acceptance } };
    },
  },
  assumption: {
    prefix: "ASM", label: "Assumption",
    intro: "Something we believe but have not proven, and how we will find out.",
    fields: () => [
      { key: "title", label: "Title", type: "text" },
      { key: "statement", label: "Statement", type: "textarea", placeholder: "We believe that …" },
      { key: "validate", label: "How we validate it", type: "textarea" },
      { key: "confidence", label: "Confidence (0–1)", type: "number", initial: "0.5" },
      { key: "answers", label: "Answers question", type: "select", options: [{ value: "", label: "— none —" }, ...optionsOf("QST", (r) => r.status === "open")] },
    ],
    required: ["title", "statement", "validate"],
    build: (v, id) => ({ status: "open", meta: { confidence: v.confidence || "0.5" },
      sections: { Statement: v.statement, "How we validate it": v.validate }, followUp: byId[v.answers] && answerNote(byId[v.answers], id) }),
  },
  fact: {
    prefix: "FCT", label: "Fact",
    intro: "Something we know, with evidence. Pick an open assumption to promote it.",
    fields: () => [
      { key: "title", label: "Title", type: "text" },
      { key: "statement", label: "Statement", type: "textarea" },
      { key: "evidence", label: "Evidence", type: "textarea", hint: "Measurement, test, source or decision record." },
      { key: "promoted_from", label: "Promotes assumption", type: "select", options: [{ value: "", label: "— none, a new fact —" }, ...optionsOf("ASM", (r) => r.status === "open")] },
      { key: "answers", label: "Answers question", type: "select", options: [{ value: "", label: "— none —" }, ...optionsOf("QST", (r) => r.status === "open")] },
    ],
    required: ["title", "statement", "evidence"],
    build(v, id) {
      const meta = {};
      if (v.promoted_from) meta.promoted_from = v.promoted_from;
      meta.evidence = yamlStr(v.evidence.replace(/\s+/g, " ").trim());
      const asm = byId[v.promoted_from];
      return { status: "active", meta, sections: { Statement: v.statement },
        followUp: [asm && promotionNote(asm, id), byId[v.answers] && answerNote(byId[v.answers], id)] };
    },
  },
  question: {
    prefix: "QST", label: "Question",
    intro: "A gap nobody can answer yet. Unlike an assumption there is no candidate answer to test. What it blocks stays provisional until it is answered.",
    fields: () => [
      { key: "title", label: "Title", type: "text", hint: "Phrase it as a question." },
      { key: "question", label: "Question", type: "textarea", placeholder: "We don't know whether … because …" },
      { key: "blocks", label: "Blocks", type: "checks", options: [...optionsOf("REQ"), ...optionsOf("SPC")], hint: "The requirements or specs that cannot be settled without an answer." },
    ],
    required: ["title", "question", "blocks"],
    build: (v) => ({ status: "open", meta: { blocks: `[${(v.blocks || []).join(", ")}]` }, sections: { Question: v.question },
      followUp: blockNote(v.blocks || []) }),
  },
  spec: {
    prefix: "SPC", label: "Spec",
    intro: "A group of requirements. The skeleton is the smallest end-to-end core; features build on it.",
    fields: () => [
      { key: "title", label: "Title", type: "text" },
      { key: "purpose", label: "Purpose", type: "textarea" },
      { key: "tier", label: "Tier", type: "select", initial: "feature", options: [{ value: "feature", label: "feature" }, { value: "skeleton", label: "skeleton" }] },
      { key: "depends_on", label: "Builds on", type: "checks", options: optionsOf("SPC") },
      { key: "requirements", label: "Requirements", type: "checks", options: optionsOf("REQ") },
    ],
    required: ["title", "purpose", "requirements"],
    build: (v) => ({ status: "draft",
      meta: { tier: v.tier || "feature", ...(v.depends_on?.length ? { depends_on: `[${v.depends_on.join(", ")}]` } : {}), requirements: `[${(v.requirements || []).join(", ")}]` },
      sections: { Purpose: v.purpose } }),
  },
};

/** Promoting an assumption touches more than one file; list every edit the check will ask for. */
function promotionNote(asm, factId) {
  const edit = (r) => h("a", { href: gh(`edit/main/${r.path}`), target: "_blank", rel: "noopener" }, r.id);
  const reqs = (usedBy[asm.id] || []).filter((x) => prefix(x) === "REQ").map((x) => byId[x]);
  return h("div", { class: "note" },
    h("p", {}, "In the same pull request, also edit:"),
    h("ul", {},
      h("li", {}, edit(asm), ": set ", h("code", {}, "status: validated"), " and add ", h("code", {}, `promoted_to: ${factId}`)),
      reqs.map((r) => h("li", {}, edit(r), ": in ", h("code", {}, "because"), ", replace ", h("code", {}, asm.id), " with ", h("code", {}, factId),
        r.status === "provisional" ? ". If it now rests only on facts, it can become active." : ""))));
}

/** Answering a question also edits the question and what it blocked. */
function answerNote(q, answerId) {
  const edit = (r) => h("a", { href: gh(`edit/main/${r.path}`), target: "_blank", rel: "noopener" }, r.id);
  const reqs = (q.blocks || []).map((x) => byId[x]).filter((r) => r && prefix(r.id) === "REQ");
  return h("div", { class: "note" },
    h("p", {}, "In the same pull request, also edit:"),
    h("ul", {},
      h("li", {}, edit(q), ": set ", h("code", {}, "status: answered"), " and add ", h("code", {}, `answered_by: ${answerId}`)),
      reqs.map((r) => h("li", {}, edit(r), ": add ", h("code", {}, answerId), " to ", h("code", {}, "because"), " and update the statement to match the answer."))));
}

/** A new question makes active requirements it blocks provisional again; say so before CI does. */
function blockNote(ids) {
  const active = ids.map((x) => byId[x]).filter((r) => r && r.status === "active");
  if (!active.length) return null;
  const edit = (r) => h("a", { href: gh(`edit/main/${r.path}`), target: "_blank", rel: "noopener" }, r.id);
  return h("div", { class: "note" },
    h("p", {}, "These are active now. In the same pull request, also edit:"),
    h("ul", {}, active.map((r) => h("li", {}, edit(r), ": set ", h("code", {}, prefix(r.id) === "REQ" ? "status: provisional" : "status: draft"), "."))));
}

function capture(kind, params) {
  const def = CAPTURES[kind];
  if (!def) return notFound();
  const key = `capture:${kind}`;
  const fields = def.fields();
  const values = Object.assign(Object.fromEntries(fields.map((f) => [f.key, f.type === "checks" ? [] : f.initial ?? ""])), store.get(key) || {});
  if (kind === "fact" && byId[params.get("promote")]) values.promoted_from = params.get("promote");
  if (byId[params.get("answers")] && fields.some((f) => f.key === "answers")) values.answers = params.get("answers");
  const id = nextId(def.prefix);
  const preview = h("ui-code-block", { language: "markdown" });
  const submit = h("a", { class: "btn", target: "_blank", rel: "noopener" }, "Propose on GitHub");
  const status = h("div", { class: "note", style: "margin-top:8px" });
  const followUp = h("div");

  function control(f) {
    const set = (val) => { values[f.key] = val; store.set(key, values); update(); };
    if (f.type === "checks") {
      return h("fieldset", { class: "field" }, h("legend", {}, f.label),
        h("div", { class: "checks" }, f.options.length ? f.options.map((o) => {
          const cb = h("ui-checkbox", {
            value: o.value,
            checked: values[f.key].includes(o.value),
          }, o.label);
          cb.addEventListener("ui-change", (e) => {
            set(e.detail.checked ? [...values[f.key], o.value] : values[f.key].filter((x) => x !== o.value));
          });
          return cb;
        }) : h("span", { class: "muted" }, "Nothing to pick yet.")),
        f.hint && h("small", {}, f.hint));
    }
    const fid = `f-${f.key}`;
    let input;
    if (f.type === "textarea") {
      input = h("ui-textarea", { id: fid, rows: "4", placeholder: f.placeholder || "", value: values[f.key], "aria-label": f.label });
      input.addEventListener("ui-input", (e) => set(e.detail.value));
    } else if (f.type === "select") {
      input = h("ui-select", { id: fid, options: JSON.stringify(f.options), value: values[f.key], "aria-label": f.label });
      input.addEventListener("ui-change", (e) => set(e.detail.value));
    } else {
      input = h("ui-input", { id: fid, type: f.type, placeholder: f.placeholder || "", value: values[f.key], "aria-label": f.label });
      input.addEventListener("ui-input", (e) => set(e.detail.value));
    }
    return h("div", { class: "field" }, h("ui-label", { for: fid }, f.label), input, f.hint && h("small", {}, f.hint));
  }

  function update() {
    const built = def.build(values, id);
    const meta = { id, title: yamlStr(values.title.trim() || "Untitled"), status: built.status, ...built.meta };
    const body = Object.entries(built.sections).map(([head, text]) => `## ${head}\n${(text || "").trim()}\n`).join("\n");
    const text = `---\n${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n${body}`;
    const recDir = data.records_dir || (data.records[0]?.path.replace(/\/[^/]+$/, "")) || "records";
    const path = `${recDir}/${id}-${slug(values.title)}.md`;
    preview.textContent = `${path}\n\n${text}`;
    const missing = def.required.filter((k) => !(Array.isArray(values[k]) ? values[k].length : String(values[k]).trim()));
    if (missing.length) {
      submit.removeAttribute("href");
      submit.setAttribute("aria-disabled", "true");
      status.textContent = `Still needed: ${missing.join(", ")}.`;
    } else {
      submit.href = gh(`new/main?filename=${encodeURIComponent(path)}&value=${encodeURIComponent(text)}`);
      submit.removeAttribute("aria-disabled");
      status.textContent = `Will be created as ${built.status}. GitHub opens with the file filled in; choose “create a new branch and start a pull request”. CI checks it.`;
    }
    followUp.replaceChildren(...[built.followUp].flat().filter(Boolean));
  }

  const clearBtn = h("ui-button", { variant: "secondary", size: "md" }, "Clear");
  clearBtn.addEventListener("ui-press", () => { store.del(key); route(); });

  main.append(
    h("h1", {}, `Capture: ${def.label}`),
    h("div", { class: "toolbar" }, Object.entries(CAPTURES).map(([k, d]) =>
      h("ui-chip", {
        pressed: k === kind,
        onclick: () => { location.hash = `#/capture/${k}`; },
      }, d.label))),
    h("p", { class: "muted" }, def.intro),
    h("div", { class: "capture" },
      h("form", { onsubmit: (e) => e.preventDefault() }, fields.map(control)),
      h("div", {}, h("div", { class: "field" }, h("ui-label", {}, `Preview · ${id}`), preview),
        h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px" }, submit, clearBtn),
        status, followUp)));
  update();
}

function notFound() {
  main.append(h("h1", {}, "Not found"), h("p", {}, h("a", { href: "#/" }, "Back to the dashboard")));
}

// ---------- theme ----------
function initTheme() {
  const navbar = document.getElementById("navbar");
  const saved = store.get("theme");
  let mode = saved === "light" ? "light" : "dark";
  const apply = (next) => {
    mode = next === "light" ? "light" : "dark";
    if (mode === "light") {
      document.documentElement.dataset.theme = "light";
      store.set("theme", "light");
    } else {
      delete document.documentElement.dataset.theme;
      store.set("theme", "dark");
    }
    if (navbar) navbar.setAttribute("theme", mode);
    requestAnimationFrame(() => redraw?.());
  };
  navbar?.addEventListener("ui-theme-change", (e) => apply(e.detail?.theme));
  apply(mode);
}

// ---------- router ----------
let booted = false;
let lastSection = null;

function route() {
  const [path, query = ""] = (location.hash.replace(/^#\/?/, "")).split("?");
  const [section = "", arg] = path.split("/");
  const params = new URLSearchParams(query);
  const changed = booted && lastSection !== section;
  lastSection = section;

  const render = () => {
    redraw = null;
    main.classList.toggle("wide", section === "graph");
    main.replaceChildren();
    if (section === "") dashboard();
    else if (section === "records") records(params);
    else if (section === "record") record(decodeURIComponent(arg || ""));
    else if (section === "graph") graph(params);
    else if (section === "capture") capture(arg || "requirement", params);
    else if (section === "tasks") tasksView();
    else notFound();
    document.querySelectorAll(".top-nav a").forEach((a) => {
      const on = a.dataset.route === section || (section === "record" && a.dataset.route === "records");
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    const heading = main.querySelector("h1");
    document.title = `${heading?.textContent || "Workspace"} · ASDLC Meta-Specs`;
    window.scrollTo({ top: 0 });
    return heading;
  };

  const focusHeading = () => {
    const heading = main.querySelector("h1");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  };

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (changed && document.startViewTransition && !reduce) {
    const vt = document.startViewTransition(render);
    vt.finished.finally(focusHeading);
  } else {
    render();
    if (changed) focusHeading();
  }
}

async function start() {
  initTheme();
  try {
    const res = await fetch("data/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    main.replaceChildren(h("h1", {}, "No index yet"),
      h("p", {}, `Couldn't load data/index.json (${err.message}). Build it with `, h("code", {}, "python tools/spec.py index"), "."));
    return;
  }
  byId = Object.fromEntries(data.records.map((r) => [r.id, r]));
  askedBy = {};
  for (const q of data.records) for (const b of q.blocks || []) (askedBy[b] ||= []).push(q.id);
  usedBy = {};
  for (const r of data.records) for (const up of upstream(r)) (usedBy[up] ||= []).push(r.id);
  document.getElementById("repo-link").href = gh("");
  if (data.repo && !data.repo.endsWith("/asdlc-meta-specs")) {
    const brand = document.querySelector(".brand");
    if (brand && brand.textContent.trim() === "ASDLC Meta-Specs") {
      const repoShort = data.repo.split("/")[1];
      brand.replaceChildren(repoShort, " ", h("span", {}, "Meta-Specs"));
    }
  }
  const all = tasks();
  if (all.length) document.querySelector('.top-nav a[data-route="tasks"]')?.append(h("span", { class: `count ${all.some((t) => t.level === "fix") ? "fix" : "test"}` }, all.length));
  addEventListener("hashchange", route);
  addEventListener("resize", () => redraw?.());
  route();
  booted = true;
}

start();
