// Loads the compiled record index (site/data/index.json, built by tools/build_index.py).
const TYPE_LABEL = {
  assumption: "Assumption", validation: "Validation", fact: "Fact", question: "Open question",
  constraint: "Constraint", requirement: "Requirement", criterion: "Acceptance criterion",
  decision: "Decision", spec: "Specification", change: "Change",
};
export const typeLabel = (t) => TYPE_LABEL[t] || t;
export const OPEN_ASSUMPTION = new Set(["unvalidated", "validating"]);
export const ACTIVE = new Set(["active", "accepted"]);

let cache;

export async function loadData() {
  if (cache) return cache;
  const res = await fetch("data/index.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`data/index.json: HTTP ${res.status}`);
  const raw = await res.json();
  const byId = new Map(raw.records.map((r) => [r.id, r]));
  const referencedBy = new Map();
  const addRef = (t, id, field) => {
    if (!referencedBy.has(t)) referencedBy.set(t, []);
    referencedBy.get(t).push({ id, field });
  };
  for (const r of raw.records) {
    for (const [field, targets] of Object.entries(r.links || {})) {
      for (const t of [].concat(targets)) addRef(t, r.id, field);
    }
    for (const [group, targets] of Object.entries(r.composition || {})) {
      for (const t of targets || []) addRef(t, r.id, `composition.${group}`);
    }
    for (const [group, targets] of Object.entries(r.deltas || {})) {
      for (const t of targets || []) addRef(t, r.id, `deltas.${group}`);
    }
  }
  cache = { ...raw, byId, referencedBy };
  return cache;
}

export function githubUrl(data, path = "") {
  return `https://github.com/${data.project.github}${path}`;
}

export function statusTone(r) {
  if (r.type === "fact") return r.status === "active" ? "fact" : "danger";
  if (r.type === "assumption") return OPEN_ASSUMPTION.has(r.status) ? "assumption" : r.status === "promoted" ? "ok" : "danger";
  if (r.type === "question") return r.status === "open" ? "warn" : r.status === "answered" ? "ok" : "";
  if (ACTIVE.has(r.status)) return "ok";
  if (["broken", "rejected"].includes(r.status)) return "danger";
  if (["provisional", "needs_review", "draft", "proposed"].includes(r.status)) return "warn";
  return "";
}

export function readiness(data, spec) {
  const reqs = spec.composition?.requirements || [];
  const active = reqs.filter((id) => ACTIVE.has(data.byId.get(id)?.status));
  return { total: reqs.length, active: active.length, pct: reqs.length ? Math.round((active.length / reqs.length) * 100) : 0 };
}
