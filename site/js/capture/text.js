// Text intelligence for captures. deriveTitle/detectNormative/detectEars mirror tools/ingest_capture.py.

export function deriveTitle(statement) {
  let text = statement.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  const actorModal = String.raw`(?:the\s+)?[\w\s-]{1,40}?\s+(?:shall|must|should|may|will)\s+(not\s+)?`;
  const keepNeg = (lead) => (_m, neg) => lead + (neg ? "do not " : ""); // never invert meaning
  if (/^(when|while|if|where)\b/i.test(text)) {
    text = text.replace(new RegExp(String.raw`,\s*(?:then\s+)?` + actorModal, "i"), keepNeg(", "));
  } else {
    text = text.replace(new RegExp("^" + actorModal, "i"), keepNeg(""));
  }
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (text.length > 80) text = text.slice(0, 80).replace(/\s+\S*$/, "") + "…";
  return text.length >= 5 ? text : statement.trim().slice(0, 80);
}

export function detectNormative(statement) {
  const s = statement.toUpperCase();
  for (const w of ["MUST", "SHALL", "SHOULD", "MAY"]) if (new RegExp(`\\b${w}\\b`).test(s)) return w;
  return null;
}

export function detectEars(statement) {
  const s = statement.trim().toLowerCase();
  if (s.startsWith("when ")) return "event_driven";
  if (s.startsWith("while ")) return "state_driven";
  if (s.startsWith("if ") && s.includes(" then ")) return "unwanted_behavior";
  if (s.startsWith("where ")) return "optional_feature";
  return "ubiquitous";
}

export const EARS_LABEL = {
  ubiquitous: "Always", event_driven: "Event (When…)", state_driven: "State (While…)",
  unwanted_behavior: "Unwanted (If… then…)", optional_feature: "Optional (Where…)", complex: "Complex",
};

const VAGUE = [
  "fast", "quick", "quickly", "easy", "easily", "user-friendly", "user friendly", "simple", "intuitive",
  "efficient", "robust", "flexible", "scalable", "seamless", "seamlessly", "appropriate", "adequate",
  "as soon as possible", "asap", "etc", "and/or", "tbd", "several", "optimal", "state-of-the-art", "modern",
];

/** Non-blocking quality hints for a requirement statement. */
export function requirementHints(statement) {
  const s = statement.trim();
  if (s.length < 10) return [];
  const hints = [];
  const lower = s.toLowerCase();
  const vague = VAGUE.filter((w) => new RegExp(`(^|[^\\w-])${w.replace(/[/-]/g, "\\$&")}([^\\w-]|$)`, "i").test(lower));
  if (vague.length) {
    hints.push({ level: "warn", text: `“${vague.slice(0, 3).join("”, “")}” is hard to test. Can you make it measurable? (e.g. “within 2 seconds”, “in 3 clicks”)` });
  }
  const modals = lower.match(/\b(shall|must|should|may|will)\b/g) || [];
  if (!modals.length) {
    hints.push({ level: "tip", text: "Say how binding it is: shall (mandatory), should (recommended) or may (optional). Without one, it is recorded as SHALL." });
  } else if (modals.length > 1) {
    hints.push({ level: "warn", text: "This reads like more than one requirement. Consider capturing them separately so each can be verified on its own." });
  }
  if (s.length > 300) hints.push({ level: "warn", text: "Long statements are harder to verify. Can you split it or move detail to notes?" });
  if (/\b(shall|must|should) not\b/i.test(s)) hints.push({ level: "tip", text: "Negative requirements are hard to test. If possible, also state what should happen instead." });
  if (!hints.length) hints.push({ level: "good", text: "Clear and testable — nice." });
  return hints;
}

/** Split free text into one belief per non-empty line. */
export function splitLines(text) {
  return (text || "").split("\n").map((l) => l.replace(/^[\s\-*•]+/, "").trim()).filter(Boolean);
}

/** Non-blocking quality hints for an assumption capture. */
export function assumptionHints(v) {
  const s = (v.statement || "").trim();
  const plan = (v.validation_plan || "").trim();
  if (s.length < 10 && plan.length < 10) return [];
  const hints = [];
  if (s.length >= 10 && !/\d/.test(s)) {
    hints.push({ level: "tip", text: "Numbers make assumptions easier to test (e.g. “under 200ms”, “more than 1,000 req/s”, “at least 80% of users”)." });
  }
  if (plan.length >= 10 && /\b(tbd|later|todo|somehow|ask|check)\b/i.test(plan)) {
    hints.push({ level: "warn", text: "Try to name a concrete check (e.g. a benchmark, spike, log query, or 5 user interviews) so anyone can run it." });
  }
  if (["high", "critical"].includes(v.risk) && !(v.impact || "").trim()) {
    hints.push({ level: "tip", text: "For high/critical risk assumptions, jotting down what breaks if it's false helps prioritize validation." });
  }
  if (s.length >= 10 && plan.length >= 10 && !hints.some((h) => h.level === "warn")) {
    hints.push({ level: "good", text: "Clear hypothesis and validation plan." });
  }
  return hints;
}

/** Non-blocking quality hints for a fact & validation capture. */
export function factHints(v) {
  const stmt = (v.statement || "").trim();
  const findings = (v.findings || "").trim();
  const tests = v.tests || [];
  if (!stmt && !findings && !tests.length) return [];
  const hints = [];
  if (v.outcome === "refuted" && tests.length) {
    hints.push({ level: "warn", text: `Refuting ${tests.join(", ")} will mark the assumption invalidated and flag dependent requirements as broken for review.` });
  } else if (tests.length && stmt) {
    hints.push({ level: "good", text: `Promoting ${tests.join(", ")} will mint a verified FCT record, record a VAL record, and mark the assumption promoted.` });
  }
  if (stmt.length >= 10 && /\b(probably|maybe|assume|think|believe|might)\b/i.test(stmt)) {
    hints.push({ level: "warn", text: "This sounds uncertain — if it hasn't been verified yet, capture it as an Assumption instead." });
  }
  if ((tests.length || v.source === "empirical_validation") && findings.length >= 10 && !splitLines(v.artifacts).length) {
    hints.push({ level: "tip", text: "If you have a benchmark log, PR, or doc link, add it under Evidence links so reviewers can trace the proof." });
  }
  return hints;
}

/** Non-blocking quality hints for an architectural/design decision capture. */
export function decisionHints(v) {
  const s = (v.statement || "").trim();
  if (s.length < 10) return [];
  const hints = [];
  if (!(v.alternatives || "").trim()) {
    hints.push({ level: "tip", text: "Listing 1–2 rejected alternatives helps future readers understand why this option won." });
  }
  if (!(v.consequences || "").trim()) {
    hints.push({ level: "tip", text: "Noting trade-offs or downsides makes the decision record much more useful." });
  }
  if ((v.satisfies || []).length && ((v.underpinned_by || []).length || splitLines(v.beliefs).length) && !hints.length) {
    hints.push({ level: "good", text: "Well-grounded decision with clear alternatives and trade-offs." });
  }
  return hints;
}

