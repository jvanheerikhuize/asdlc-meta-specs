// Open Question (QST) capture definition, rendered by capture/engine.js.
import { h } from "../dom.js";
import { deriveTitle, questionHints } from "./text.js";

const BLOCKING_OPTIONS = [
  { value: "true", label: "Yes — blocks active/release readiness until answered" },
  { value: "false", label: "No — non-blocking clarification" },
];

const affectableOptions = (data) => data.records
  .filter((r) => ["requirement", "constraint", "criterion", "decision", "spec", "change"].includes(r.type))
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

export const questionCapture = {
  id: "question",
  title: "Capture an open question",
  intro: "When a requirement or specification has an unresolved ambiguity, record it as a first-class open question instead of guessing.",
  issueTemplate: "capture-question.yml",

  defaults: () => ({
    statement: "", title: "", context: "",
    affects: [], blocking: "true", domain: "", notes: "",
  }),

  fromParams: (params, data) => {
    const out = {};
    const a = params.get("affects");
    if (a && data.byId.has(a)) {
      out.affects = [a];
      const rec = data.byId.get(a);
      if (rec?.domain) out.domain = rec.domain;
    }
    return out;
  },

  isEmpty: (v) => !v.statement?.trim() && !v.title?.trim() && !v.context?.trim()
    && !(v.affects || []).length && !v.domain?.trim() && !v.notes?.trim(),

  sections: () => [
    {
      title: "What needs clarification?",
      fields: [
        { name: "statement", type: "textarea", label: "Open question", required: true, minlength: 10, maxlength: 2000, rows: 3,
          placeholder: "e.g. Should edge gateway nodes fail-open or fail-closed if the revocation synchronization stream is unreachable for longer than 30 seconds?",
          help: "State the domain or behavioral question clearly without assuming an answer.",
          error: "Describe what needs clarification (at least 10 characters)." },
        { name: "title", type: "text", label: "Short title", maxlength: 140,
          help: "Leave empty to use the suggestion." },
        { name: "blocking", type: "radio", label: "Does this block release readiness?", options: BLOCKING_OPTIONS,
          help: "Blocking questions prevent affected requirements or specs from being marked active until resolved." },
      ],
    },
    {
      title: "Context & candidate options",
      optional: true,
      help: "Outline why this is ambiguous and what options or trade-offs are under consideration.",
      fields: [
        { name: "context", type: "textarea", label: "Context or options under consideration", rows: 3, maxlength: 4000,
          placeholder: "e.g. Option A: Fail-open with alerting (preserves availability). Option B: Fail-closed after 30s grace window (strict revocation SLA)." },
      ],
    },
    {
      title: "What does this affect?",
      optional: true,
      help: "Link requirements, constraints, criteria, decisions, or specifications affected by this question.",
      fields: [
        { name: "affects", type: "records", label: "Affected records", options: affectableOptions,
          placeholder: "Search REQ, CON, ACR, DEC, SPC or CHG by ID or words…" },
      ],
    },
    {
      title: "Details",
      optional: true,
      collapsed: true,
      summary: "Domain & notes",
      fields: [
        { name: "domain", type: "datalist", label: "Domain", options: (data) => data.domains, maxlength: 60,
          placeholder: "e.g. auth, billing", help: "Area of the product. Defaults to “general”." },
        { name: "notes", type: "textarea", label: "Notes", rows: 3, maxlength: 4000, help: "Anything else reviewers should know." },
      ],
    },
  ],

  onUpdate: (v, controls) => {
    const t = controls.get("title")?.el;
    if (t) t.placeholder = (v.statement || "").trim().length >= 10 ? `Suggestion: ${deriveTitle(v.statement)}` : "";
  },

  validate: (v) => {
    const problems = [];
    if ((v.statement || "").trim().length < 10) {
      problems.push({ name: "statement", message: "Describe what needs clarification (at least 10 characters)." });
    }
    return problems;
  },

  issueTitle: (v) => `[capture:question] ${(v.title || "").trim() || deriveTitle(v.statement || "")}`.slice(0, 150),

  issueFields: (v) => [
    { id: "statement", label: "What needs clarification?", value: (v.statement || "").trim() },
    { id: "context", label: "Context or options under consideration", value: (v.context || "").trim() },
    { id: "affects", label: "Requirements, constraints, decisions or specs affected", value: (v.affects || []).join(", ") },
    { id: "blocking", label: "Blocks release until answered?", value: String(v.blocking ?? "true") },
    { id: "domain", label: "Domain", value: (v.domain || "").trim() },
    { id: "notes", label: "Notes", value: (v.notes || "").trim() },
  ],

  preview: (v, data) => {
    const statement = (v.statement || "").trim();
    if (!statement) return h("p", { class: "empty" }, "Start typing — your open question will appear here.");
    const title = (v.title || "").trim() || deriveTitle(statement);
    const affects = v.affects || [];
    const isBlocking = String(v.blocking) !== "false";
    return h("div", {},
      h("div", { class: "badges" },
        h("span", { class: "badge" }, "QST-…"),
        h("span", { class: "badge warn" }, "open"),
        h("span", { class: `badge ${isBlocking ? "danger" : ""}` }, isBlocking ? "blocking" : "non-blocking"),
        h("span", { class: "badge" }, (v.domain || "").trim() || data.project.default_domain)),
      h("h3", {}, title),
      h("p", { class: "statement" }, statement),
      h("dl", {},
        (v.context || "").trim() ? [
          h("dt", {}, "Context & options"),
          h("dd", {}, (v.context || "").trim()),
        ] : null,
        affects.length ? [
          h("dt", {}, "Affects"),
          h("dd", {}, h("ul", { class: "list" }, affects.map((id) => {
            const r = data.byId.get(id);
            return h("li", {}, h("span", { class: "badge" }, id), r?.title || "");
          }))),
        ] : null),
      h("p", { class: "creates" }, "Creates: 1 open question",
        (isBlocking && affects.length) ? ` · gates ${affects.length} affected record${affects.length > 1 ? "s" : ""}` : ""));
  },

  hints: (v) => questionHints(v),
};
