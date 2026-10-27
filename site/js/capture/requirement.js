// Requirement capture definition, rendered by capture/engine.js.
import { h } from "../dom.js";
import { OPEN_ASSUMPTION } from "../data.js";
import { deriveTitle, detectNormative, detectEars, EARS_LABEL, requirementHints, splitLines } from "./text.js";

const PRIORITIES = [
  { value: "p0", label: "Critical" }, { value: "p1", label: "High" },
  { value: "p2", label: "Normal" }, { value: "p3", label: "Low" },
];
const CATEGORIES = [
  { value: "functional", label: "Functional" }, { value: "non_functional", label: "Quality (performance, usability…)" },
  { value: "security", label: "Security" }, { value: "data", label: "Data" }, { value: "interface", label: "Interface" },
];

const underpinningOptions = (data) => data.records
  .filter((r) => (r.type === "fact" && r.status === "active") || (r.type === "assumption" && OPEN_ASSUMPTION.has(r.status)))
  .sort((a, b) => (a.type === b.type ? a.id.localeCompare(b.id) : a.type === "fact" ? -1 : 1))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

const filledScenarios = (v) => (v.criteria || []).filter((c) => (c.then || "").trim());

// "Given …\nWhen …\nThen …" per scenario, blank line between — mirrors parse_gwt() in tools/ingest_capture.py.
const oneLine = (s) => (s || "").replace(/\s+/g, " ").trim().replace(/^(given|when|then)\b[:\s]*/i, "");
const scenariosToText = (list) => list.map((c) => [["Given", c.given], ["When", c.when], ["Then", c.then]]
  .filter(([, x]) => oneLine(x)).map(([k, x]) => `${k} ${oneLine(x)}`).join("\n")).join("\n\n");

function statusFor(v, data) {
  const openPicked = (v.underpinned_by || []).some((id) => OPEN_ASSUMPTION.has(data.byId.get(id)?.status) && data.byId.get(id)?.type === "assumption");
  return splitLines(v.beliefs).length || openPicked ? "provisional" : "draft";
}

// ------------------------------------------------------------------ EARS phrasing helper
function earsBuilder(ctx) {
  const state = { trigger: "always", cond: "", actor: "the system", strength: "shall", response: "" };
  const sentence = h("p", { class: "sentence", "aria-live": "polite" });
  const condField = h("div", { class: "field", hidden: true });

  const compose = () => {
    const core = `${state.actor || "the system"} ${state.strength} ${state.response || "…"}`;
    const c = state.cond || "…";
    const s = {
      always: core, when: `When ${c}, ${core}`, while: `While ${c}, ${core}`,
      if: `If ${c}, then ${core}`, where: `Where ${c}, ${core}`,
    }[state.trigger];
    return s.charAt(0).toUpperCase() + s.slice(1) + ".";
  };
  const refresh = () => { condField.hidden = state.trigger === "always"; sentence.textContent = compose(); };
  const input = (key, label, placeholder) => {
    const id = `ears-${key}`;
    return h("div", { class: "field" }, h("label", { for: id }, label),
      h("input", { id, type: "text", value: state[key], placeholder, oninput: (e) => { state[key] = e.target.value.trim(); refresh(); } }));
  };
  const radios = (key, label, opts) => h("div", { class: "field" }, h("span", { class: "label", id: `ears-${key}-l` }, label),
    h("div", { class: "radio-row", role: "radiogroup", "aria-labelledby": `ears-${key}-l` }, opts.map(([v, l]) =>
      h("label", {}, h("input", { type: "radio", name: `ears-${key}`, value: v, checked: state[key] === v,
        onchange: () => { state[key] = v; refresh(); } }), l))));

  condField.append(h("label", { for: "ears-cond" }, "Condition"),
    h("input", { id: "ears-cond", type: "text", placeholder: "e.g. a user clicks Export", oninput: (e) => { state.cond = e.target.value.trim(); refresh(); } }));

  const box = h("div", { class: "ears" },
    radios("trigger", "When does it apply?", [["always", "Always"], ["when", "When something happens"], ["while", "While in a state"], ["if", "If something goes wrong"], ["where", "Where a feature is present"]]),
    condField,
    input("actor", "Who or what does it?", "the system"),
    radios("strength", "How binding?", [["shall", "shall (mandatory)"], ["should", "should (recommended)"], ["may", "may (optional)"]]),
    input("response", "What does it do?", "e.g. download the profile as a JSON file"),
    h("div", {}, h("span", { class: "label" }, "Result"), sentence),
    h("div", {}, h("button", { type: "button", onclick: () => ctx.set("statement", compose()) }, "Use this sentence")));
  refresh();
  return h("details", { class: "more" }, h("summary", {}, "Help me phrase it"), box);
}

// ------------------------------------------------------------------ definition
export const requirementCapture = {
  id: "requirement",
  title: "Capture a requirement",
  intro: "Two questions are enough: what should the system do, and why do we think so. Everything else is optional — reviewers can refine it in the pull request.",
  issueTemplate: "capture-requirement.yml",

  defaults: () => ({
    statement: "", title: "", underpinned_by: [], beliefs: "", criteria: [],
    domain: "", priority: "p2", category: "functional", notes: "",
  }),

  isEmpty: (v) => !v.statement?.trim() && !v.title?.trim() && !v.beliefs?.trim() && !v.underpinned_by?.length
    && !filledScenarios(v).length && !(v.criteria || []).some((c) => c.given || c.when) && !v.domain?.trim() && !v.notes?.trim(),

  sections: () => [
    {
      title: "What should the system do?",
      fields: [
        { name: "statement", type: "textarea", label: "Requirement", required: true, minlength: 10, maxlength: 2000, rows: 3,
          placeholder: "e.g. Users can export their profile data as a JSON file.",
          help: "One sentence in plain language. Who or what does it, and what happens.",
          error: "Describe what the system should do (at least 10 characters)." },
        { name: "_ears", type: "custom", render: earsBuilder },
        { name: "title", type: "text", label: "Short title", maxlength: 140,
          help: "Leave empty to use the suggestion." },
      ],
    },
    {
      title: "Why? What do we know or believe?",
      help: "Every requirement rests on something. Pick what we already know, or simply write your reasons — they are recorded as assumptions that can be validated later.",
      fields: [
        { name: "underpinned_by", type: "records", label: "Existing facts & assumptions", options: underpinningOptions,
          placeholder: "Search by ID or words…", help: "Green = verified fact, amber = assumption not yet validated." },
        { name: "beliefs", type: "textarea", label: "Your reasons (one per line)", rows: 3, maxlength: 4000,
          placeholder: "e.g. EU customers have a legal right to take their data with them.",
          error: "Add at least one reason, or pick an existing fact or assumption." },
      ],
    },
    {
      title: "How will we know it works?",
      optional: true,
      help: "Concrete examples make a requirement testable. Only “Then” is needed.",
      fields: [{ name: "criteria", type: "scenarios", label: "Acceptance scenarios" }],
    },
    {
      title: "Details",
      optional: true,
      collapsed: true,
      summary: "Domain, priority, category & notes",
      fields: [
        { name: "domain", type: "datalist", label: "Domain", options: (data) => data.domains, maxlength: 60,
          placeholder: "e.g. auth, billing", help: "Area of the product. Defaults to “general”." },
        { name: "priority", type: "radio", label: "Priority", options: PRIORITIES },
        { name: "category", type: "radio", label: "Category", options: CATEGORIES },
        { name: "notes", type: "textarea", label: "Notes", rows: 3, maxlength: 4000, help: "Anything else reviewers should know." },
      ],
    },
  ],

  onUpdate: (v, controls) => {
    const t = controls.get("title")?.el;
    if (t) t.placeholder = v.statement.trim().length >= 10 ? `Suggestion: ${deriveTitle(v.statement)}` : "";
  },

  validate: (v) => {
    const problems = [];
    if ((v.statement || "").trim().length < 10) problems.push({ name: "statement", message: "Describe what the system should do (at least 10 characters)." });
    if (!splitLines(v.beliefs).length && !(v.underpinned_by || []).length) {
      problems.push({ name: "beliefs", message: "Add at least one reason, or pick an existing fact or assumption above." });
    }
    return problems;
  },

  // The issue title carries the requirement title; ingestion strips the "[capture]" prefix.
  issueTitle: (v) => `[capture] ${(v.title || "").trim() || deriveTitle(v.statement || "")}`.slice(0, 150),

  // Ordered list of issue-form fields (ids match .github/ISSUE_TEMPLATE/capture-requirement.yml).
  // Every value lands in a visible, editable field — the issue form is the capture contract.
  issueFields: (v) => [
    { id: "statement", label: "What should the system do?", value: v.statement.trim() },
    { id: "why", label: "Why? What do we know or believe?", value: splitLines(v.beliefs).join("\n") },
    { id: "refs", label: "Existing facts or assumptions", value: v.underpinned_by.join(", ") },
    { id: "criteria", label: "How will we know it works?", value: scenariosToText(filledScenarios(v)) },
    { id: "domain", label: "Domain", value: v.domain.trim() },
    { id: "priority", label: "Priority", value: v.priority },
    { id: "category", label: "Category", value: v.category },
    { id: "notes", label: "Notes", value: v.notes.trim() },
  ],

  preview: (v, data) => {
    const statement = (v.statement || "").trim();
    if (!statement) return h("p", { class: "empty" }, "Start typing — your requirement will appear here.");
    const title = (v.title || "").trim() || deriveTitle(statement);
    const status = statusFor(v, data);
    const beliefs = splitLines(v.beliefs);
    const scenarios = filledScenarios(v);
    return h("div", {},
      h("div", { class: "badges" },
        h("span", { class: "badge" }, "REQ-…"),
        h("span", { class: `badge ${status === "provisional" ? "warn" : ""}` }, status),
        h("span", { class: "badge" }, detectNormative(statement) || "SHALL"),
        h("span", { class: "badge" }, EARS_LABEL[detectEars(statement)]),
        h("span", { class: "badge" }, PRIORITIES.find((p) => p.value === v.priority)?.label || v.priority),
        h("span", { class: "badge" }, v.domain.trim() || data.project.default_domain)),
      h("h3", {}, title),
      h("p", { class: "statement" }, statement),
      h("dl", {},
        h("dt", {}, "Rests on"),
        h("dd", {}, v.underpinned_by.length || beliefs.length
          ? h("ul", { class: "list" },
              v.underpinned_by.map((id) => {
                const r = data.byId.get(id);
                return h("li", {}, h("span", { class: `badge ${r?.type === "fact" ? "fact" : "assumption"}` }, id), r?.title || "");
              }),
              beliefs.map((b) => h("li", {}, h("span", { class: "badge assumption" }, "new assumption"), b)))
          : h("span", { class: "empty" }, "Nothing yet — tell us why in step 2.")),
        h("dt", {}, "Verified by"),
        h("dd", {}, scenarios.length ? `${scenarios.length} scenario${scenarios.length > 1 ? "s" : ""}` : h("span", { class: "empty" }, "No scenarios (optional)"))),
      h("p", { class: "creates" }, "Creates: 1 requirement",
        beliefs.length ? ` · ${beliefs.length} assumption${beliefs.length > 1 ? "s" : ""}` : "",
        scenarios.length ? ` · ${scenarios.length} acceptance criteri${scenarios.length > 1 ? "a" : "on"}` : ""));
  },

  hints: (v, data) => {
    const scenText = (v.criteria || []).map((c) => `${c.given || ""} ${c.when || ""} ${c.then || ""}`).join(" ");
    const out = requirementHints(v.statement || "", `${v.title || ""} ${v.beliefs || ""} ${scenText}`);
    (v.criteria || []).forEach((c, i) => {
      if ((c.given || c.when) && !(c.then || "").trim()) out.push({ level: "warn", text: `Scenario ${i + 1} has no “Then” yet, so it will be skipped.` });
    });
    if (statusFor(v, data) === "provisional" && (v.statement || "").trim()) {
      out.push({ level: "tip", text: "This requirement rests on assumptions, so it starts as provisional and becomes firm once they are validated." });
    }
    return out;
  },
};
