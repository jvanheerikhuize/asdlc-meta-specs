// Meta-Specs Lite workspace: one module, no build step.
// Reads data/index.json (written by `python tools/spec.py index`) and renders five views.

const PREFIXES = ["ASM", "FCT", "REQ", "SPC"];
const LABELS = { ASM: "Assumptions", FCT: "Facts", REQ: "Requirements", SPC: "Specs" };
const main = document.getElementById("main");
let data, byId, usedBy, redraw = null;

// ---------- helpers ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
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

/** Links a record points to, i.e. what it rests on or is built from. */
function upstream(r) {
  return [...(r.because || []), ...(r.requirements || []), ...(r.depends_on || []), ...(r.promoted_from ? [r.promoted_from] : [])];
}

function inline(text) {
  return text.split(/(`[^`]*`)/).map((part) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return `<code>${esc(part.slice(1, -1))}</code>`;
    return esc(part)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\b(ASM|FCT|REQ|SPC)-\d{4}\b/g, (m) => (byId[m] ? `<a class="rid t-${m.slice(0, 3)}" href="#/record/${m}">${m}</a>` : m));
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

// ---------- views ----------
function dashboard() {
  const open = ofType("ASM").filter((r) => r.status === "open");
  const reqs = ofType("REQ");
  const count = (rs, s) => rs.filter((r) => r.status === s).length;
  const s = data.summary;
  main.append(
    h("h1", {}, "Dashboard"),
    h("p", { class: "muted" }, "Every requirement says ", h("em", {}, "because"), ". This page shows how much of the spec rests on facts, and which assumptions hold the rest back."),
    h("div", { class: "tiles" },
      tile(count(ofType("FCT"), "active"), "facts"),
      tile(open.length, "open assumptions"),
      tile(`${count(reqs, "active")}/${reqs.length}`, "requirements active"),
      tile(count(reqs, "broken"), "broken requirements"),
      tile(s.errors ? `${s.errors} ✗` : "✓", s.errors ? "check errors" : `check passes${s.warnings ? `, ${s.warnings} warnings` : ""}`)),
    h("h2", {}, "Specs in build order"),
    h("div", { class: "cards" }, data.spec_order.map((id) => specCard(byId[id]))),
    h("h2", {}, "What's holding things back"),
    open.length
      ? h("ul", { class: "list" }, open
          .sort((a, b) => b.downstream.length - a.downstream.length)
          .map((a) => h("li", {}, rid(a.id),
            h("div", { class: "grow" }, a.title, h("div", { class: "muted" },
              `confidence ${a.confidence ?? "?"} · holds back `, a.downstream.length ? a.downstream.flatMap((d, i) => [i ? ", " : "", rid(d)]) : "nothing")))))
      : h("p", { class: "muted" }, "No open assumptions. Everything rests on facts."));
  const withIssues = data.records.filter((r) => r.issues.length);
  if (withIssues.length) {
    main.append(h("h2", {}, "Check findings"), h("ul", { class: "list" }, withIssues.map((r) =>
      h("li", {}, rid(r.id), h("div", { class: "grow" }, r.issues.join(" · "))))));
  }
}
const tile = (n, label) => h("div", { class: "tile" }, h("b", {}, n), h("span", {}, label));

function specCard(sp) {
  return h("div", { class: "card" },
    h("div", {}, rid(sp.id), " ", badge(sp.status), " ", h("span", { class: "badge" }, sp.tier)),
    h("h3", {}, h("a", { href: `#/record/${sp.id}` }, sp.title)),
    h("div", { class: "bar", title: `${sp.readiness}% of requirements active` }, h("i", { style: `width:${sp.readiness}%` })),
    h("div", { class: "muted" }, `${sp.readiness}% ready · ${(sp.requirements || []).length} requirements`,
      (sp.depends_on || []).length ? [" · builds on ", ...sp.depends_on.map(rid)] : ""));
}

function records(params) {
  const type = params.get("type") || "";
  const list = h("ul", { class: "list" });
  const search = h("input", { type: "search", placeholder: "Search id, title or text…", "aria-label": "Search records" });
  const fill = () => {
    const q = search.value.toLowerCase();
    const rows = data.records.filter((r) => (!type || prefix(r.id) === type) &&
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
      const weak = prefix(from) === "ASM" ? byId[from].status !== "validated" : byId[from].status !== "active" && prefix(r.id) === "SPC";
      edges.push({ from, to: r.id, weak });
    }
  }
  wrap.append(svg, ...PREFIXES.map((p) => h("div", { class: "col" }, h("h3", {}, LABELS[p]),
    ofType(p).map((r) => (nodes[r.id] = h("button", { class: `node t-${p}`, title: r.title, onclick: () => select(r.id) },
      h("span", { class: `rid t-${p}` }, r.id, " "), badge(r.status), h("div", {}, r.title)))))));

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
      h("span", {}, h("i", { class: "weak" }), "rests on an open assumption / unfinished requirement")),
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
    ],
    required: ["title", "statement", "validate"],
    build: (v) => ({ status: "open", meta: { confidence: v.confidence || "0.5" },
      sections: { Statement: v.statement, "How we validate it": v.validate } }),
  },
  fact: {
    prefix: "FCT", label: "Fact",
    intro: "Something we know, with evidence. Pick an open assumption to promote it.",
    fields: () => [
      { key: "title", label: "Title", type: "text" },
      { key: "statement", label: "Statement", type: "textarea" },
      { key: "evidence", label: "Evidence", type: "textarea", hint: "Measurement, test, source or decision record." },
      { key: "promoted_from", label: "Promotes assumption", type: "select", options: [{ value: "", label: "— none, a new fact —" }, ...optionsOf("ASM", (r) => r.status === "open")] },
    ],
    required: ["title", "statement", "evidence"],
    build(v, id) {
      const meta = {};
      if (v.promoted_from) meta.promoted_from = v.promoted_from;
      meta.evidence = yamlStr(v.evidence.replace(/\s+/g, " ").trim());
      const asm = byId[v.promoted_from];
      return { status: "active", meta, sections: { Statement: v.statement },
        followUp: asm && promotionNote(asm, id) };
    },
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

function capture(kind) {
  const def = CAPTURES[kind];
  if (!def) return notFound();
  const key = `capture:${kind}`;
  const fields = def.fields();
  const values = Object.assign(Object.fromEntries(fields.map((f) => [f.key, f.type === "checks" ? [] : f.initial ?? ""])), store.get(key) || {});
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
      submit.style.opacity = 0.5;
      status.textContent = `Still needed: ${missing.join(", ")}.`;
    } else {
      submit.href = gh(`new/main?filename=${encodeURIComponent(path)}&value=${encodeURIComponent(text)}`);
      submit.removeAttribute("aria-disabled");
      submit.style.opacity = 1;
      status.textContent = `Will be created as ${built.status}. GitHub opens with the file filled in; choose “create a new branch and start a pull request”. CI checks it.`;
    }
    followUp.replaceChildren(built.followUp || "");
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
  else if (section === "capture") capture(arg || "requirement");
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
  usedBy = {};
  for (const r of data.records) for (const up of upstream(r)) (usedBy[up] ||= []).push(r.id);
  document.getElementById("repo-link").href = gh("");
  addEventListener("hashchange", route);
  addEventListener("resize", () => redraw?.());
  route();
}

start();
