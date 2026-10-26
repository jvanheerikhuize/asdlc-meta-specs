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
