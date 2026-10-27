// Architectural / design decision (ADR) capture definition, rendered by capture/engine.js.
import { h } from "../dom.js";
import { OPEN_ASSUMPTION } from "../data.js";
import { deriveTitle, splitLines, decisionHints } from "./text.js";

const satisfiesOptions = (data) => data.records
  .filter((r) => r.type === "requirement" || r.type === "constraint")
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

const underpinningOptions = (data) => data.records
  .filter((r) => (r.type === "fact" && r.status === "active") || (r.type === "assumption" && OPEN_ASSUMPTION.has(r.status)))
  .sort((a, b) => (a.type === b.type ? a.id.localeCompare(b.id) : a.type === "fact" ? -1 : 1))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

const decisionOptions = (data) => data.records
  .filter((r) => r.type === "decision" && r.status !== "superseded")
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

function statusFor(v, data) {
  const openPicked = (v.underpinned_by || []).some((id) => OPEN_ASSUMPTION.has(data.byId.get(id)?.status) && data.byId.get(id)?.type === "assumption");
  return splitLines(v.beliefs).length || openPicked ? "provisional" : "proposed";
}

export const decisionCapture = {
  id: "decision",
  title: "Capture a decision",
  intro: "Record an architectural or design choice (ADR), the requirements or constraints it satisfies, and the facts or assumptions that justify it.",
  issueTemplate: "capture-decision.yml",

  defaults: () => ({
    statement: "", title: "", satisfies: [], underpinned_by: [], beliefs: "",
    context: "", alternatives: "", consequences: "", supersedes: [], domain: "", notes: "",
  }),

  fromParams: (params, data) => {
    const out = {};
    const s = params.get("satisfies");
    if (s && data.byId.has(s)) {
      out.satisfies = [s];
      const rec = data.byId.get(s);
      if (rec?.domain) out.domain = rec.domain;
    }
    return out;
  },

  isEmpty: (v) => !v.statement?.trim() && !v.title?.trim() && !(v.satisfies || []).length
    && !(v.underpinned_by || []).length && !v.beliefs?.trim() && !v.context?.trim()
    && !v.alternatives?.trim() && !v.consequences?.trim() && !(v.supersedes || []).length
    && !v.domain?.trim() && !v.notes?.trim(),

  sections: () => [
    {
      title: "What did we decide?",
      fields: [
        { name: "statement", type: "textarea", label: "Decision", required: true, minlength: 10, maxlength: 2000, rows: 3,
          placeholder: "e.g. Use EdDSA (Ed25519) asymmetric JWTs with 15-minute TTL for access tokens.",
          help: "State the chosen option clearly and concisely.",
          error: "Describe the decision (at least 10 characters)." },
        { name: "title", type: "text", label: "Short title", maxlength: 140,
          help: "Leave empty to use the suggestion." },
      ],
    },
    {
      title: "Which requirements or constraints does this satisfy?",
      help: "Every decision exists to fulfill one or more requirements (REQ) or constraints (CON).",
      fields: [
        { name: "satisfies", type: "records", label: "Satisfied requirements & constraints", required: true, options: satisfiesOptions,
          placeholder: "Search REQ-xxxx or CON-xxxx…",
          error: "Pick at least one requirement (REQ) or constraint (CON) that this decision satisfies." },
      ],
    },
    {
      title: "Why this option? What facts or assumptions justify it?",
      help: "Link verified facts or assumptions, or write new reasons (recorded as assumptions until validated).",
      fields: [
        { name: "underpinned_by", type: "records", label: "Existing facts & assumptions", options: underpinningOptions,
          placeholder: "Search FCT-xxxx or ASM-xxxx…",
          help: "Green = verified fact, amber = open assumption." },
        { name: "beliefs", type: "textarea", label: "New reasons or assumptions (one per line)", rows: 2, maxlength: 4000,
          placeholder: "e.g. Edge gateway nodes can cache public JWKS keys in memory with background rotation.",
          error: "Pick at least one existing fact/assumption or write a reason." },
      ],
    },
    {
      title: "Alternatives & trade-offs",
      optional: true,
      help: "Documenting rejected options and trade-offs prevents revisiting the same debate later.",
      fields: [
        { name: "context", type: "textarea", label: "Context & problem (optional)", rows: 2, maxlength: 4000,
          placeholder: "Why was a decision needed here?" },
        { name: "alternatives", type: "textarea", label: "Alternatives considered (optional)", rows: 3, maxlength: 4000,
          placeholder: "e.g. 1. Opaque tokens + DB lookup — rejected due to pool saturation at 650 req/s.\n2. HMAC-SHA256 — rejected because shared secrets violate least privilege." },
        { name: "consequences", type: "textarea", label: "Consequences & trade-offs (optional)", rows: 2, maxlength: 4000,
          placeholder: "e.g. + Zero DB load on hot path.\n- Revocation before 15m TTL requires an in-memory denylist." },
      ],
    },
    {
      title: "Details",
      optional: true,
      collapsed: true,
      summary: "Supersedes, domain & notes",
      fields: [
        { name: "supersedes", type: "records", label: "Supersedes older decisions", options: decisionOptions,
          placeholder: "Search DEC-xxxx…" },
        { name: "domain", type: "datalist", label: "Domain", options: (data) => data.domains, maxlength: 60,
          placeholder: "e.g. auth, billing", help: "Area of the product. Defaults to “general”." },
        { name: "notes", type: "textarea", label: "Notes", rows: 2, maxlength: 4000 },
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
      problems.push({ name: "statement", message: "Describe the decision (at least 10 characters)." });
    }
    if (!(v.satisfies || []).length) {
      problems.push({ name: "satisfies", message: "Pick at least one requirement (REQ) or constraint (CON) that this decision satisfies." });
    }
    if (!splitLines(v.beliefs).length && !(v.underpinned_by || []).length) {
      problems.push({ name: "beliefs", message: "Pick at least one existing fact/assumption above, or write a reason." });
    }
    return problems;
  },

  issueTitle: (v) => `[capture:decision] ${(v.title || "").trim() || deriveTitle(v.statement || "")}`.slice(0, 150),

  issueFields: (v) => [
    { id: "statement", label: "What did we decide?", value: (v.statement || "").trim() },
    { id: "satisfies", label: "Which requirements or constraints does this satisfy?", value: (v.satisfies || []).join(", ") },
    { id: "refs", label: "Existing facts or assumptions that justify this option", value: (v.underpinned_by || []).join(", ") },
    { id: "why", label: "New reasons or assumptions", value: splitLines(v.beliefs).join("\n") },
    { id: "context", label: "Context & problem", value: (v.context || "").trim() },
    { id: "alternatives", label: "Alternatives considered", value: (v.alternatives || "").trim() },
    { id: "consequences", label: "Consequences & trade-offs", value: (v.consequences || "").trim() },
    { id: "supersedes", label: "Supersedes older decisions", value: (v.supersedes || []).join(", ") },
    { id: "domain", label: "Domain", value: (v.domain || "").trim() },
    { id: "notes", label: "Notes", value: (v.notes || "").trim() },
  ],

  preview: (v, data) => {
    const statement = (v.statement || "").trim();
    if (!statement) return h("p", { class: "empty" }, "Start typing — your decision record will appear here.");
    const title = (v.title || "").trim() || deriveTitle(statement);
    const status = statusFor(v, data);
    const beliefs = splitLines(v.beliefs);
    const satisfies = v.satisfies || [];
    const underpinned = v.underpinned_by || [];

    return h("div", {},
      h("div", { class: "badges" },
        h("span", { class: "badge" }, "DEC-…"),
        h("span", { class: `badge ${status === "provisional" ? "warn" : ""}` }, status),
        h("span", { class: "badge" }, (v.domain || "").trim() || data.project.default_domain)),
      h("h3", {}, title),
      h("p", { class: "statement" }, statement),
      h("dl", {},
        h("dt", {}, "Satisfies"),
        h("dd", {}, satisfies.length
          ? h("ul", { class: "list" }, satisfies.map((id) => {
              const r = data.byId.get(id);
              return h("li", {}, h("span", { class: "badge" }, id), r?.title || "");
            }))
          : h("span", { class: "empty" }, "Pick at least one REQ or CON in step 2.")),
        h("dt", {}, "Rests on"),
        h("dd", {}, underpinned.length || beliefs.length
          ? h("ul", { class: "list" },
              underpinned.map((id) => {
                const r = data.byId.get(id);
                return h("li", {}, h("span", { class: `badge ${r?.type === "fact" ? "fact" : "assumption"}` }, id), r?.title || "");
              }),
              beliefs.map((b) => h("li", {}, h("span", { class: "badge assumption" }, "new assumption"), b)))
          : h("span", { class: "empty" }, "Nothing yet — link a fact/assumption or write a reason in step 3."))),
      h("p", { class: "creates" }, "Creates: 1 decision",
        beliefs.length ? ` · ${beliefs.length} assumption${beliefs.length > 1 ? "s" : ""}` : ""));
  },

  hints: (v) => decisionHints(v),
};
