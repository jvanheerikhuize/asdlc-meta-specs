// Fact & validation capture definition, rendered by capture/engine.js.
// Supports:
//  1) Validating & promoting an open assumption (ASM -> VAL + FCT + ASM promoted)
//  2) Refuting an assumption (ASM -> VAL + ASM invalidated + dependent REQs marked broken)
//  3) Recording a standalone verified fact (FCT, optionally backed by a VAL record)
import { h } from "../dom.js";
import { OPEN_ASSUMPTION } from "../data.js";
import { deriveTitle, splitLines, factHints } from "./text.js";

const OUTCOMES = [
  { value: "confirmed", label: "Confirmed (holds as stated)" },
  { value: "refined", label: "Refined (holds with sharper bounds)" },
  { value: "refuted", label: "Refuted (assumption is false)" },
];

const METHODS = [
  { value: "benchmark", label: "Benchmark" },
  { value: "prototype_spike", label: "Prototype / spike" },
  { value: "user_research", label: "User research" },
  { value: "documentation_audit", label: "Docs / spec audit" },
  { value: "production_telemetry", label: "Production telemetry" },
  { value: "formal_proof", label: "Formal proof" },
  { value: "stakeholder_signoff", label: "Stakeholder sign-off" },
];

const SOURCES = [
  { value: "empirical_validation", label: "Empirical validation" },
  { value: "domain_invariant", label: "Domain invariant" },
  { value: "external_contract", label: "External API / contract" },
  { value: "regulatory_mandate", label: "Regulation / legal" },
  { value: "hardware_limit", label: "Hardware / platform limit" },
  { value: "business_policy", label: "Business policy" },
];

const assumptionOptions = (data) => data.records
  .filter((r) => r.type === "assumption")
  .sort((a, b) => (OPEN_ASSUMPTION.has(a.status) === OPEN_ASSUMPTION.has(b.status)
    ? a.id.localeCompare(b.id)
    : OPEN_ASSUMPTION.has(a.status) ? -1 : 1))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

const factOptions = (data) => data.records
  .filter((r) => r.type === "fact" && r.status === "active")
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, title, type, status }) => ({ id, title, type, status }));

const hasValidation = (v) => Boolean((v.tests || []).length || (v.findings || "").trim() || v.outcome === "refuted" || splitLines(v.artifacts).length);

export const factCapture = {
  id: "fact",
  title: "Capture a fact & validation",
  intro: "Record a verified truth, or log validation evidence that promotes (or refutes) an open assumption.",
  issueTemplate: "capture-fact.yml",

  defaults: () => ({
    tests: [], outcome: "confirmed", statement: "", title: "", source: "empirical_validation",
    method: "benchmark", findings: "", artifacts: "", implications: "",
    supersedes: [], domain: "", notes: "",
  }),

  fromParams: (params, data) => {
    const out = {};
    const t = params.get("tests");
    if (t && data.byId.has(t)) {
      out.tests = [t];
      const rec = data.byId.get(t);
      if (rec?.domain) out.domain = rec.domain;
    }
    return out;
  },

  isEmpty: (v) => !(v.tests || []).length && !v.statement?.trim() && !v.title?.trim()
    && !v.findings?.trim() && !v.artifacts?.trim() && !v.implications?.trim()
    && !(v.supersedes || []).length && !v.domain?.trim() && !v.notes?.trim(),

  sections: () => [
    {
      title: "What did we establish or test?",
      help: "Pick an assumption if you are validating one, or leave it empty to record a standalone verified fact.",
      fields: [
        { name: "tests", type: "records", label: "Assumptions tested (optional)", options: assumptionOptions,
          placeholder: "Search ASM-xxxx by ID or words…",
          help: "Confirmed/refined assumptions are automatically promoted to the new fact." },
        { name: "outcome", type: "radio", label: "Validation outcome", options: OUTCOMES },
        { name: "statement", type: "textarea", label: "Verified fact", minlength: 10, maxlength: 2000, rows: 3,
          placeholder: "e.g. Peak token validation reaches 3,200 req/s and saturates synchronous DB lookups at 650 req/s.",
          help: "State the verified truth or measurement. (Not needed if the assumption was refuted.)",
          error: "Describe the verified fact (at least 10 characters), or mark the assumption as Refuted." },
        { name: "title", type: "text", label: "Short title", maxlength: 140,
          help: "Leave empty to use the suggestion." },
        { name: "source", type: "radio", label: "Fact source", options: SOURCES },
      ],
    },
    {
      title: "Validation evidence (VAL)",
      help: "Required when testing an assumption or recording an empirical validation.",
      fields: [
        { name: "method", type: "radio", label: "Validation method", options: METHODS },
        { name: "findings", type: "textarea", label: "Findings & observations", maxlength: 4000, rows: 3,
          placeholder: "e.g. Replayed 7-day peak gateway traffic; burst reached 3,200 req/s and PostgreSQL pool saturated at 650 req/s.",
          help: "What was tested and what did we observe?",
          error: "Describe the validation findings (at least 10 characters)." },
        { name: "artifacts", type: "textarea", label: "Evidence links or artifacts (optional)", rows: 2, maxlength: 2000,
          placeholder: "e.g. benchmarks/2026-10-24-gateway-replay-results.json",
          help: "One file path or URL per line." },
      ],
    },
    {
      title: "Details",
      optional: true,
      collapsed: true,
      summary: "Implications, superseded facts, domain & notes",
      fields: [
        { name: "implications", type: "textarea", label: "Architectural or product implications", rows: 2, maxlength: 4000,
          placeholder: "e.g. Token verification on the hot path cannot perform synchronous DB queries." },
        { name: "supersedes", type: "records", label: "Supersedes older facts", options: factOptions,
          placeholder: "Search FCT-xxxx…" },
        { name: "domain", type: "datalist", label: "Domain", options: (data) => data.domains, maxlength: 60,
          placeholder: "e.g. auth, billing", help: "Area of the product. Defaults to “general”." },
        { name: "notes", type: "textarea", label: "Notes", rows: 2, maxlength: 4000 },
      ],
    },
  ],

  onUpdate: (v, controls) => {
    const t = controls.get("title")?.el;
    const basis = (v.statement || "").trim() || (v.findings || "").trim();
    if (t) t.placeholder = basis.length >= 10 ? `Suggestion: ${deriveTitle(basis)}` : "";
  },

  validate: (v) => {
    const problems = [];
    const stmt = (v.statement || "").trim();
    const findings = (v.findings || "").trim();
    const tests = v.tests || [];
    if (v.outcome !== "refuted" && stmt.length < 10) {
      problems.push({ name: "statement", message: "Describe the verified fact (at least 10 characters), or select Refuted if an assumption proved false." });
    }
    if (v.outcome === "refuted" && !tests.length) {
      problems.push({ name: "tests", message: "Pick the assumption(s) that were refuted." });
    }
    if ((tests.length || v.outcome === "refuted" || findings.length > 0 || splitLines(v.artifacts).length > 0) && findings.length < 10) {
      problems.push({ name: "findings", message: "Describe what was tested and observed (at least 10 characters)." });
    }
    return problems;
  },

  issueTitle: (v) => {
    const basis = (v.title || "").trim() || deriveTitle((v.statement || "").trim() || (v.findings || "").trim());
    return `[capture:fact] ${basis}`.slice(0, 150);
  },

  issueFields: (v) => {
    const valPresent = hasValidation(v);
    return [
      { id: "statement", label: "What verified fact did we establish?", value: v.outcome === "refuted" ? "" : (v.statement || "").trim() },
      { id: "tests", label: "Assumptions tested", value: (v.tests || []).join(", ") },
      { id: "outcome", label: "Validation outcome", value: valPresent ? v.outcome : "" },
      { id: "method", label: "Validation method", value: valPresent ? v.method : "" },
      { id: "findings", label: "Validation findings & evidence", value: (v.findings || "").trim() },
      { id: "artifacts", label: "Evidence links or artifacts", value: splitLines(v.artifacts).join("\n") },
      { id: "source", label: "Fact source", value: v.outcome === "refuted" ? "" : v.source },
      { id: "implications", label: "Architectural or product implications", value: (v.implications || "").trim() },
      { id: "supersedes", label: "Supersedes older facts", value: (v.supersedes || []).join(", ") },
      { id: "domain", label: "Domain", value: (v.domain || "").trim() },
      { id: "notes", label: "Notes", value: (v.notes || "").trim() },
    ];
  },

  preview: (v, data) => {
    const stmt = (v.statement || "").trim();
    const findings = (v.findings || "").trim();
    const tests = v.tests || [];
    if (!stmt && !findings && !tests.length) {
      return h("p", { class: "empty" }, "Start typing or pick an assumption — your fact & validation preview will appear here.");
    }
    const valPresent = hasValidation(v);
    const mintsFact = v.outcome !== "refuted" && stmt.length > 0;
    const title = (v.title || "").trim() || deriveTitle(stmt || findings || "Validation");
    const creates = [
      mintsFact ? "1 verified fact (FCT)" : null,
      valPresent ? "1 validation record (VAL)" : null,
      tests.length ? `${v.outcome === "refuted" ? "invalidates" : "promotes"} ${tests.join(", ")}` : null,
    ].filter(Boolean).join(" · ");

    return h("div", {},
      h("div", { class: "badges" },
        mintsFact ? h("span", { class: "badge fact" }, "FCT-… · active") : null,
        valPresent ? h("span", { class: `badge ${v.outcome === "refuted" ? "danger" : "ok"}` }, `VAL-… · ${v.outcome}`) : null,
        mintsFact ? h("span", { class: "badge" }, SOURCES.find((s) => s.value === v.source)?.label || v.source) : null,
        h("span", { class: "badge" }, (v.domain || "").trim() || data.project.default_domain)),
      h("h3", {}, title),
      mintsFact ? h("p", { class: "statement" }, stmt) : null,
      h("dl", {},
        tests.length ? [
          h("dt", {}, v.outcome === "refuted" ? "Refutes assumption" : "Promotes assumption"),
          h("dd", {}, h("ul", { class: "list" }, tests.map((id) => {
            const r = data.byId.get(id);
            return h("li", {}, h("span", { class: "badge assumption" }, id), r?.title || "");
          }))),
        ] : null,
        valPresent ? [
          h("dt", {}, `Validation (${METHODS.find((m) => m.value === v.method)?.label || v.method})`),
          h("dd", {}, findings || h("span", { class: "empty" }, "Describe findings in step 2.")),
        ] : null),
      h("p", { class: "creates" }, "Creates: ", creates || "1 fact"));
  },

  hints: (v) => factHints(v),
};
