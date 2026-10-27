// Assumption capture definition, rendered by capture/engine.js.
import { h } from "../dom.js";
import { deriveTitle, assumptionHints } from "./text.js";

const RISKS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const CONFIDENCES = [
  { value: "0.25", label: "25% (Guess)" },
  { value: "0.5", label: "50% (Plausible)" },
  { value: "0.75", label: "75% (Likely)" },
  { value: "0.9", label: "90% (Near certain)" },
];

const normativeOptions = (data) => data.records
  .filter((r) => ["requirement", "constraint", "decision"].includes(r.type))
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

export const assumptionCapture = {
  id: "assumption",
  title: "Capture an assumption",
  intro: "Whenever a requirement or design rests on an unverified belief, record it here with a plan to test it.",
  issueTemplate: "capture-assumption.yml",

  defaults: () => ({
    statement: "", title: "", validation_plan: "", impact: "",
    underpins: [], risk: "medium", confidence: "0.5", domain: "", notes: "",
  }),

  fromParams: (params, data) => {
    const out = {};
    const u = params.get("underpins");
    if (u && data.byId.has(u)) {
      out.underpins = [u];
      const rec = data.byId.get(u);
      if (rec?.domain) out.domain = rec.domain;
    }
    return out;
  },

  isEmpty: (v) => !v.statement?.trim() && !v.title?.trim() && !v.validation_plan?.trim()
    && !v.impact?.trim() && !(v.underpins || []).length && !v.domain?.trim() && !v.notes?.trim(),

  sections: () => [
    {
      title: "What do we assume is true?",
      fields: [
        { name: "statement", type: "textarea", label: "Assumption", required: true, minlength: 10, maxlength: 2000, rows: 3,
          placeholder: "e.g. Peak token validation bursts exceed 1,000 req/s during flash events.",
          help: "State the hypothesis clearly enough that we could prove it true or false.",
          error: "Describe what we assume is true (at least 10 characters)." },
        { name: "title", type: "text", label: "Short title", maxlength: 140,
          help: "Leave empty to use the suggestion." },
        { name: "risk", type: "radio", label: "Risk if wrong", options: RISKS,
          help: "How badly does it hurt our requirements or architecture if this turns out to be false?" },
        { name: "confidence", type: "radio", label: "Initial confidence", options: CONFIDENCES },
      ],
    },
    {
      title: "How can we validate it?",
      help: "An assumption is only useful if we know how to test it and promote it to a verified fact.",
      fields: [
        { name: "validation_plan", type: "textarea", label: "Validation plan", required: true, minlength: 10, maxlength: 2000, rows: 3,
          placeholder: "e.g. Replay 7-day peak production gateway traffic against staging and measure DB connection pool saturation.",
          help: "Concrete benchmark, prototype spike, user research, telemetry query, or audit.",
          error: "Describe how we can test or verify this assumption (at least 10 characters)." },
        { name: "impact", type: "textarea", label: "What breaks if this is wrong? (optional)", rows: 2, maxlength: 4000,
          placeholder: "e.g. Synchronous session lookups will exhaust DB connections and cause cascading 503 errors." },
      ],
    },
    {
      title: "What depends on this?",
      optional: true,
      help: "Link existing requirements, constraints, or decisions that rely on this premise.",
      fields: [
        { name: "underpins", type: "records", label: "Dependent requirements, constraints or decisions", options: normativeOptions,
          placeholder: "Search REQ, CON or DEC by ID or words…" },
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
      problems.push({ name: "statement", message: "Describe what we assume is true (at least 10 characters)." });
    }
    if ((v.validation_plan || "").trim().length < 10) {
      problems.push({ name: "validation_plan", message: "Describe how we can test or verify this assumption (at least 10 characters)." });
    }
    return problems;
  },

  issueTitle: (v) => `[capture:assumption] ${(v.title || "").trim() || deriveTitle(v.statement || "")}`.slice(0, 150),

  issueFields: (v) => [
    { id: "statement", label: "What do we assume is true?", value: (v.statement || "").trim() },
    { id: "validation_plan", label: "How can we validate it?", value: (v.validation_plan || "").trim() },
    { id: "impact", label: "What breaks if this is wrong?", value: (v.impact || "").trim() },
    { id: "underpins", label: "Requirements, constraints or decisions that rely on this", value: (v.underpins || []).join(", ") },
    { id: "risk", label: "Risk if wrong", value: v.risk },
    { id: "confidence", label: "Initial confidence", value: String(v.confidence) },
    { id: "domain", label: "Domain", value: (v.domain || "").trim() },
    { id: "notes", label: "Notes", value: (v.notes || "").trim() },
  ],

  preview: (v, data) => {
    const statement = (v.statement || "").trim();
    if (!statement) return h("p", { class: "empty" }, "Start typing — your assumption will appear here.");
    const title = (v.title || "").trim() || deriveTitle(statement);
    const underpins = v.underpins || [];
    const pct = Math.round(Number(v.confidence || 0.5) * 100);
    return h("div", {},
      h("div", { class: "badges" },
        h("span", { class: "badge" }, "ASM-…"),
        h("span", { class: "badge warn" }, "unvalidated"),
        h("span", { class: `badge ${["high", "critical"].includes(v.risk) ? "danger" : ""}` }, `risk: ${v.risk}`),
        h("span", { class: "badge" }, `confidence: ${pct}%`),
        h("span", { class: "badge" }, (v.domain || "").trim() || data.project.default_domain)),
      h("h3", {}, title),
      h("p", { class: "statement" }, statement),
      h("dl", {},
        h("dt", {}, "Validation plan"),
        h("dd", {}, (v.validation_plan || "").trim() || h("span", { class: "empty" }, "Add how we will test this in step 2.")),
        underpins.length ? [
          h("dt", {}, "Underpins"),
          h("dd", {}, h("ul", { class: "list" }, underpins.map((id) => {
            const r = data.byId.get(id);
            return h("li", {}, h("span", { class: "badge" }, id), r?.title || "");
          }))),
        ] : null),
      h("p", { class: "creates" }, "Creates: 1 assumption",
        underpins.length ? ` · updates ${underpins.length} dependent record${underpins.length > 1 ? "s" : ""}` : ""));
  },

  hints: (v) => assumptionHints(v),
};
