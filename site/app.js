// Meta-Specs Lite workspace: one module, no build step.
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
const badge = (status) => h("span", { class: `badge s-${status}` }, status);
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
  FCT: { active: ["done", "known"], deprecated: ["off", "retired"] },
  ASM: { validated: ["done", "proven"], open: ["wait", "need testing"], invalidated: ["off", "refuted"] },
  QST: { answered: ["done", "answered"], open: ["wait", "need an answer"] },
  REQ: { active: ["done", "active"], ready: ["wait", "ready to activate"], asked: ["wait", "waiting on a question"], provisional: ["wait", "waiting on assumptions"], broken: ["bad", "broken"] },
  SPC: { active: ["done", "ready"], draft: ["wait", "in progress"] },
};
/** The status a record really has: a requirement resting on something refuted is broken, one with an open question is waiting on it, and one resting only on facts is ready, whatever its file says. */
function effective(r) {
  if (prefix(r.id) !== "REQ" || r.status === "active") return r.status;
  const grounds = (r.because || []).map((g) => byId[g]).filter(Boolean);
  if (grounds.some((g) => tone(g) === "off")) return "broken";
  if (r.open_questions?.length) return "asked";
  return grounds.length && grounds.every((g) => prefix(g.id) === "FCT") ? "ready" : r.status;
}
function tone(r) { return (TONES[prefix(r.id)][r.status] || ["off", r.status])[0]; }
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
  for (const sp of ofType("SPC").filter((s) => s.status !== "active" && s.readiness === 100 && !s.open_questions.length))
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
    todo.length
      ? h("a", { class: `callout ${per("fix") ? "bad" : "wait"}`, href: "#/tasks" },
          h("b", {}, `${todo.length} task${todo.length > 1 ? "s" : ""} need you`),
          h("span", {}, Object.keys(LEVELS).filter(per).map((l) => `${per(l)} ${LEVELS[l][0].toLowerCase()}`).join(" · ")),
          h("span", { class: "go" }, "Open tasks →"))
      : h("div", { class: "callout done" }, h("b", {}, "Nothing needs you"), h("span", {}, "Every requirement rests on facts and every spec is ready.")),

    h("h2", {}, "State of the spec"),
    h("div", { class: "legend" }, ...[["done", "done"], ["wait", "needs attention"], ["bad", "broken"], ["off", "retired"]].map(([t, l]) => h("span", {}, h("span", { class: `dot ${t}` }), l))),
    h("div", { class: "states" }, PREFIXES.map(stateRow)),

    h("h2", {}, "Specs requiring attention"),
    attention.length ? h("div", { class: "cards" }, attention.map(specCard)) : h("p", { class: "muted" }, "None. All specs are ready."),
    fine.length ? h("p", { class: "muted" }, "Ready: ", idList(fine), " ✓") : "",

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
    h("div", { class: "seg-legend" }, groups.map((g) => h("a", { href: link(g) }, h("span", { class: `dot ${g.t}` }), `${g.n} ${g.label}`))));
}

function specCard(sp) {
  const reqs = (sp.requirements || []).map((id) => byId[id]).filter(Boolean);
  const pending = reqs.filter((r) => r.status !== "active");
  return h("div", { class: "card" },
    h("div", {}, rid(sp.id), " ", badge(sp.status), " ", h("span", { class: "badge" }, sp.tier)),
    h("h3", {}, h("a", { href: `#/record/${sp.id}` }, sp.title)),
    h("div", { class: "bar", title: `${sp.readiness}% of requirements active` }, h("i", { style: `width:${sp.readiness}%` })),
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
  if (!todo.length) return main.append(h("div", { class: "callout done" }, h("b", {}, "Nothing to do"), h("span", {}, "Every requirement rests on facts and every spec is ready.")));
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
  const search = h("input", { type: "search", placeholder: "Search id, title or text…", "aria-label": "Search records" });
  const fill = () => {
    const q = search.value.toLowerCase();
    const rows = data.records.filter((r) => (!type || prefix(r.id) === type) && (!status || effective(r) === status) &&
      (!q || `${r.id} ${r.title} ${r.body}`.toLowerCase().includes(q)));
    list.replaceChildren(...(rows.length ? rows.map((r) => h("li", {}, rid(r.id),
      h("a", { class: "grow", href: `#/record/${r.id}`, style: "color:inherit" }, r.title), badge(r.status)))
      : [h("li", { class: "muted" }, "No records match.")]));
  };
  search.addEventListener("input", fill);
  main.append(h("h1", {}, "Records"),
    h("div", { class: "toolbar" },
      ["", ...PREFIXES].map((p) => h("a", { class: "chip", href: p ? `#/records?type=${p}` : "#/records", "aria-pressed": String(p === type) },
        p ? `${LABELS[p]} (${ofType(p).length})` : `All (${data.records.length})`)),
      status ? h("a", { class: "chip filter", href: type ? `#/records?type=${type}` : "#/records", title: "Clear status filter" }, `status: ${status} ×`) : "",
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
    h("div", {}, rid(id), " ", badge(r.status)),
    h("h1", {}, r.title),
    r.issues.length ? h("div", { class: "issues" }, r.issues.map((i) => h("div", {}, i))) : "",
    h("div", { class: "record-grid" },
      h("article", { class: "prose", html: markdown(r.body) }),
      h("aside", {},
        h("dl", { class: "meta" },
          field("Confidence", r.confidence),
          field("Evidence", r.evidence),
          field("Tier", r.tier),
          field("Readiness", r.readiness != null ? `${r.readiness}%` : null),
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
        h("p", {},
          h("a", { class: "btn ghost", href: `#/graph?focus=${id}` }, "Show in graph"), " ",
          h("a", { class: "btn ghost", href: gh(`edit/main/${r.path}`), target: "_blank", rel: "noopener" }, "Edit on GitHub")))));
}

function graph(params) {
  const wrap = h("div", { class: "graph" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const nodes = {};
  const edges = [];
  for (const r of data.records) {
    for (const from of upstream(r)) if (byId[from]) {
      const weak = prefix(from) === "ASM" ? byId[from].status !== "validated"
        : prefix(from) === "QST" ? byId[from].status === "open"
        : byId[from].status !== "active" && prefix(r.id) === "SPC";
      edges.push({ from, to: r.id, weak });
    }
  }
  wrap.append(svg, ...PREFIXES.map((p) => h("div", { class: "col" }, h("h3", {}, LABELS[p]),
    ofType(p).map((r) => (nodes[r.id] = h("button", { class: `node t-${p}`, title: r.title, onclick: () => select(r.id) },
      h("div", { class: "node-head" }, h("span", { class: `rid t-${p}` }, r.id), badge(r.status)), h("div", {}, r.title)))))));

  let selected = null;
  function lineage(id) {
    const seen = new Set([id]);
    const walk = (start, dir) => {
      const todo = [start];
      while (todo.length) {
        const cur = todo.pop();
        for (const e of edges) {
          const next = dir === "up" ? (e.to === cur && e.from) : (e.from === cur && e.to);
          if (next && !seen.has(next)) { seen.add(next); todo.push(next); }
        }
      }
    };
    walk(id, "up"); walk(id, "down");
    return seen;
  }
  function select(id) {
    selected = selected === id ? null : id;
    const keep = selected ? lineage(selected) : null;
    for (const [nid, el] of Object.entries(nodes)) {
      el.classList.toggle("dim", !!keep && !keep.has(nid));
      el.classList.toggle("sel", nid === selected);
    }
    info.replaceChildren(selected
      ? h("span", {}, "Lineage of ", rid(selected), ": what it rests on and what it affects. ", h("a", { href: `#/record/${selected}` }, "Open record →"))
      : "Click a record to trace its lineage.");
    draw(keep);
  }
  function draw(keep) {
    const box = wrap.getBoundingClientRect();
    svg.replaceChildren(...edges.map((e) => {
      const a = nodes[e.from].getBoundingClientRect(), b = nodes[e.to].getBoundingClientRect();
      const y1 = a.top + a.height / 2 - box.top, y2 = b.top + b.height / 2 - box.top;
      let d;
      if (prefix(e.from) === prefix(e.to)) { // spec builds on spec: loop out to the right
        const x = a.right - box.left;
        d = `M${x},${y1} C${x + 40},${y1} ${x + 40},${y2} ${x},${y2}`;
      } else {
        const x1 = a.right - box.left, x2 = b.left - box.left, mid = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
      }
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", `edge${e.weak ? " weak" : ""}${keep && !(keep.has(e.from) && keep.has(e.to)) ? " dim" : ""}`);
      return path;
    }));
  }
  const info = h("p", { class: "muted" });
  main.append(h("h1", {}, "Graph"),
    h("div", { class: "legend" },
      h("span", {}, h("i"), "rests on a fact / active requirement"),
      h("span", {}, h("i", { class: "weak" }), "rests on an open assumption or question / unfinished requirement")),
    info, h("div", { class: "graph-wrap" }, wrap));
  redraw = () => draw(selected ? lineage(selected) : null);
  const focus = params.get("focus");
  requestAnimationFrame(() => (focus && byId[focus] ? select(focus) : select(null)));
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
      const shaky = (v.because || []).some((id) => prefix(id) === "ASM");
      return { status: shaky ? "provisional" : "active", meta: { because: `[${(v.because || []).join(", ")}]` },
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
  const preview = h("pre", { class: "preview" });
  const submit = h("a", { class: "btn", target: "_blank", rel: "noopener" }, "Propose on GitHub");
  const status = h("div", { class: "note" });
  const followUp = h("div");

  function control(f) {
    const set = (val) => { values[f.key] = val; store.set(key, values); update(); };
    if (f.type === "checks") {
      return h("fieldset", { class: "field" }, h("legend", {}, f.label),
        h("div", { class: "checks" }, f.options.length ? f.options.map((o) => h("label", {},
          h("input", { type: "checkbox", checked: values[f.key].includes(o.value),
            onchange: (e) => set(e.target.checked ? [...values[f.key], o.value] : values[f.key].filter((x) => x !== o.value)) }), o.label))
          : h("span", { class: "muted" }, "Nothing to pick yet.")),
        f.hint && h("small", {}, f.hint));
    }
    const fid = `f-${f.key}`;
    const input = f.type === "textarea" ? h("textarea", { id: fid, rows: 4, placeholder: f.placeholder })
      : f.type === "select" ? h("select", { id: fid }, f.options.map((o) => h("option", { value: o.value }, o.label)))
      : h("input", { id: fid, type: f.type, placeholder: f.placeholder, ...(f.type === "number" ? { min: 0, max: 1, step: 0.05 } : {}) });
    input.value = values[f.key];
    input.addEventListener("input", () => set(input.value));
    return h("div", { class: "field" }, h("label", { for: fid }, f.label), input, f.hint && h("small", {}, f.hint));
  }

  function update() {
    const built = def.build(values, id);
    const meta = { id, title: yamlStr(values.title.trim() || "Untitled"), status: built.status, ...built.meta };
    const body = Object.entries(built.sections).map(([head, text]) => `## ${head}\n${(text || "").trim()}\n`).join("\n");
    const text = `---\n${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n${body}`;
    const path = `records/${id}-${slug(values.title)}.md`;
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

  main.append(
    h("h1", {}, `Capture: ${def.label}`),
    h("div", { class: "toolbar" }, Object.entries(CAPTURES).map(([k, d]) =>
      h("a", { class: "chip", href: `#/capture/${k}`, "aria-pressed": String(k === kind) }, d.label))),
    h("p", { class: "muted" }, def.intro),
    h("div", { class: "capture" },
      h("form", { onsubmit: (e) => e.preventDefault() }, fields.map(control)),
      h("div", {}, h("div", { class: "field" }, h("label", {}, `Preview · ${id}`), preview),
        h("p", {}, submit, " ",
          h("button", { class: "btn ghost", type: "button", onclick: () => navigator.clipboard?.writeText(preview.textContent.split("\n\n").slice(1).join("\n\n")) }, "Copy"), " ",
          h("button", { class: "btn ghost", type: "button", onclick: () => { store.del(key); route(); } }, "Clear")),
        status, followUp)));
  update();
}

function notFound() {
  main.append(h("h1", {}, "Not found"), h("p", {}, h("a", { href: "#/" }, "Back to the dashboard")));
}

// ---------- router ----------
function route() {
  const [path, query = ""] = (location.hash.replace(/^#\/?/, "")).split("?");
  const [section = "", arg] = path.split("/");
  const params = new URLSearchParams(query);
  redraw = null;
  main.replaceChildren();
  if (section === "") dashboard();
  else if (section === "records") records(params);
  else if (section === "record") record(decodeURIComponent(arg || ""));
  else if (section === "graph") graph(params);
  else if (section === "capture") capture(arg || "requirement", params);
  else if (section === "tasks") tasksView();
  else notFound();
  document.querySelectorAll(".top nav a").forEach((a) => {
    const on = a.dataset.route === section || (section === "record" && a.dataset.route === "records");
    on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
  document.title = `${main.querySelector("h1")?.textContent || "Workspace"} · Meta-Specs Lite`;
  window.scrollTo({ top: 0 });
}

async function start() {
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
  const all = tasks();
  if (all.length) document.querySelector('.top nav a[data-route="tasks"]').append(h("span", { class: `count ${all.some((t) => t.level === "fix") ? "fix" : "test"}` }, all.length));
  addEventListener("hashchange", route);
  addEventListener("resize", () => redraw?.());
  route();
}

start();
