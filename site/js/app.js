// App shell bootstrap + hash router. The shell (top bar, nav, footer) stays mounted; only <main> changes.
import "./components/record-picker.js";
import "./components/gwt-rows.js";
import { h, clear } from "./dom.js";
import { loadData, githubUrl } from "./data.js";
import { mountCapture, hasDraft } from "./capture/engine.js";
import { requirementCapture } from "./capture/requirement.js";
import { assumptionCapture } from "./capture/assumption.js";
import { questionCapture } from "./capture/question.js";
import { factCapture } from "./capture/fact.js";
import { decisionCapture } from "./capture/decision.js";
import * as views from "./views/views.js";

const main = document.getElementById("main");
const CAPTURES = {
  requirement: requirementCapture,
  assumption: assumptionCapture,
  question: questionCapture,
  fact: factCapture,
  decision: decisionCapture,
};
let firstRender = true;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "") || "dashboard";
  const [path, query = ""] = raw.split("?");
  return { parts: path.split("/").filter(Boolean), params: new URLSearchParams(query) };
}

async function render() {
  const { parts, params } = parseHash();
  let data;
  try {
    data = await loadData();
  } catch (err) {
    clear(main).append(h("div", { class: "banner error", role: "alert" },
      h("span", {}, "Couldn't load the record index (", err.message, "). If you're running locally, build it first: "),
      h("code", {}, "python tools/build_index.py")));
    return;
  }

  const [section, arg] = parts;
  let route = section;
  if (section === "capture" && CAPTURES[arg]) { mountCapture(main, CAPTURES[arg], data, params); route = `capture/${arg}`; }
  else if (section === "dashboard") views.dashboard(main, data);
  else if (section === "graph") views.graph(main, data, params);
  else if (section === "records") views.records(main, data, params);
  else if (section === "record" && arg) { views.record(main, data, params, decodeURIComponent(arg)); route = "records"; }
  else if (section === "specs") views.specs(main, data);
  else if (section === "pending") views.pending(main, data);
  else views.notFound(main);

  document.querySelectorAll(".sidenav a[data-route]").forEach((a) => {
    if (a.dataset.route === route) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const h1 = main.querySelector("h1");
  document.title = `${h1?.textContent || "ASDLC"} · ${data.project.name}`;
  if (!firstRender) h1?.focus({ preventScroll: false });
  firstRender = false;
  window.scrollTo({ top: 0 });
  footer(data);
}

function refreshDraftBadges() {
  document.querySelectorAll(".sidenav a[data-draft]").forEach((a) => a.classList.toggle("draft-dot", hasDraft(a.dataset.draft)));
}

function footer(data) {
  clear(document.getElementById("footer")).append(
    `Data built ${new Date(data.generated_at).toLocaleString()} · ${data.records.length} records · `,
    h("a", { href: githubUrl(data), target: "_blank", rel: "noopener" }, "Repository on GitHub ↗"));
}

document.getElementById("global-search").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = new FormData(e.target).get("q") || "";
  location.hash = `#/records?q=${encodeURIComponent(q)}`;
});

window.addEventListener("hashchange", render);
window.addEventListener("drafts-changed", refreshDraftBadges);
window.addEventListener("storage", refreshDraftBadges);   // drafts edited in another tab
refreshDraftBadges();
render();
