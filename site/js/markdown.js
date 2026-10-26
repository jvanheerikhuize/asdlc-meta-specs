// Minimal, safe Markdown → DOM renderer for record prose (headings, lists, paragraphs, code, bold, italics, links).
import { h } from "./dom.js";

function inline(text) {
  const out = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(h("code", {}, m[1].slice(1, -1)));
    else if (m[2]) out.push(h("strong", {}, m[2].slice(2, -2)));
    else if (m[3]) out.push(h("em", {}, m[3].slice(1, -1)));
    else if (m[4]) out.push(h("a", { href: m[5], rel: "noopener" }, m[4].slice(1, m[4].indexOf("]"))));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(md) {
  const frag = document.createDocumentFragment();
  const lines = (md || "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      frag.append(h("pre", {}, h("code", {}, buf.join("\n"))));
      continue;
    }
    const hm = line.match(/^(#{1,4})\s+(.*)$/);
    if (hm) { frag.append(h(`h${Math.min(hm[1].length + 1, 5)}`, {}, inline(hm[2]))); i++; continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const list = h(ordered ? "ol" : "ul");
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        list.append(h("li", {}, inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""))));
        i++;
      }
      frag.append(list);
      continue;
    }
    if (line.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      frag.append(h("blockquote", {}, inline(buf.filter((l) => !/^\[!\w+\]$/.test(l.trim())).join(" "))));
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.split("|").slice(1, -1).map((c) => c.trim());
      const body = rows.filter((r) => !/^\|\s*:?-/.test(r));
      frag.append(h("table", {}, h("thead", {}, h("tr", {}, cells(body[0]).map((c) => h("th", {}, inline(c))))),
        h("tbody", {}, body.slice(1).map((r) => h("tr", {}, cells(r).map((c) => h("td", {}, inline(c))))))));
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) buf.push(lines[i++]);
    frag.append(h("p", {}, inline(buf.join(" "))));
  }
  return frag;
}
