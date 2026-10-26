// Generic, schema-driven capture engine. Every capture interface (requirement now; assumption, fact,
// decision… later) is a small definition object rendered by this engine, so they all share the same
// layout, autosave, validation, live preview, hints and "submit via GitHub" flow.
//
// Definition shape (see capture/requirement.js):
//   id, title, intro, issueTemplate,
//   defaults(data) -> values, isEmpty(values), sections(data) -> [{title, help, optional, collapsed, fields:[…]}],
//   validate(values) -> [{name, message}], toPayload(values, data), issueTitle(values), issueFields(values),
//   preview(values, data) -> Node, hints(values, data) -> [{level, text}]
// Field types: textarea | text | datalist | radio | records | scenarios | custom
import { h, append, clear, nextId, debounce } from "../dom.js";
import { githubUrl } from "../data.js";

const MAX_URL = 7800;
export const draftKey = (id) => `asdlc.capture.${id}.v1`;

export function hasDraft(id) {
  try { return !!localStorage.getItem(draftKey(id)); } catch { return false; }
}

function readDraft(id) {
  try { return JSON.parse(localStorage.getItem(draftKey(id)) || "null"); } catch { return null; }
}

export function mountCapture(main, def, data) {
  const key = draftKey(def.id);
  const defaults = def.defaults(data);
  const saved = readDraft(def.id);
  let values = { ...defaults, ...(saved?.values || {}) };
  const controls = new Map();

  // ------------------------------------------------------------ fields
  const errorEls = new Map();

  function fieldShell(f, control, labelFor) {
    const hintId = f.help ? nextId("hint") : null;
    const errId = nextId("err");
    const err = h("span", { class: "error-msg", id: errId, role: "alert" }, "⚠ ", f.error || "Please fill this in.");
    errorEls.set(f.name, err);
    if (control instanceof HTMLElement && control.matches("input, textarea")) {
      control.setAttribute("aria-describedby", [hintId, errId].filter(Boolean).join(" "));
    }
    return h("div", { class: "field", dataset: { field: f.name } },
      h(labelFor ? "label" : "span", { class: labelFor ? null : "label", for: labelFor || false, id: labelFor ? false : nextId("lbl") },
        f.label, f.required ? h("span", { class: "req-mark", "aria-hidden": "true" }, " *") : null),
      control,
      f.help ? h("span", { class: "hint", id: hintId }, f.help) : null,
      err);
  }

  function renderField(f) {
    const id = nextId("f");
    const onChange = () => update();
    switch (f.type) {
      case "textarea":
      case "text":
      case "datalist": {
        const listId = f.type === "datalist" ? nextId("dl") : null;
        const el = h(f.type === "textarea" ? "textarea" : "input", {
          id, name: f.name, rows: f.rows || 3, required: !!f.required,
          minlength: f.minlength || false, maxlength: f.maxlength || false,
          placeholder: f.placeholder || false, list: listId || false,
          type: f.type === "textarea" ? false : "text",
          autocomplete: "off", enterkeyhint: f.type === "textarea" ? false : "next",
          oninput: onChange,
        });
        el.value = values[f.name] ?? "";
        controls.set(f.name, { get: () => el.value, set: (v) => { el.value = v ?? ""; }, el });
        const extra = listId ? h("datalist", { id: listId }, (f.options?.(data) || []).map((o) => h("option", { value: o }))) : null;
        return fieldShell(f, extra ? h("div", {}, el, extra) : el, id);
      }
      case "radio": {
        const group = h("div", { class: "radio-row", role: "radiogroup" });
        const name = `${def.id}-${f.name}`;
        for (const o of f.options) {
          group.append(h("label", {},
            h("input", { type: "radio", name, value: o.value, checked: values[f.name] === o.value, onchange: onChange }), o.label));
        }
        controls.set(f.name, {
          get: () => group.querySelector("input:checked")?.value ?? defaults[f.name],
          set: (v) => group.querySelectorAll("input").forEach((i) => { i.checked = i.value === v; }),
          el: group,
        });
        const shell = fieldShell(f, group, null);
        group.setAttribute("aria-labelledby", shell.querySelector(".label").id);
        return shell;
      }
      case "records": {
        const el = h("record-picker", { "input-id": id, placeholder: f.placeholder || false });
        el.options = f.options(data);
        el.value = values[f.name] || [];
        el.addEventListener("change", onChange);
        controls.set(f.name, { get: () => el.value, set: (v) => { el.value = v || []; }, el });
        return fieldShell(f, el, id);
      }
      case "scenarios": {
        const el = h("gwt-rows");
        el.value = values[f.name] || [];
        el.addEventListener("input", onChange);
        controls.set(f.name, { get: () => el.value, set: (v) => { el.value = v || []; }, el });
        return fieldShell(f, el, null);
      }
      case "custom":
        return f.render({ data, get: () => values, set: setValue });
      default:
        throw new Error(`Unknown field type ${f.type}`);
    }
  }

  function setValue(name, v) {
    controls.get(name)?.set(v);
    update();
    controls.get(name)?.el.focus?.();
  }

  // ------------------------------------------------------------ layout
  const restoreBanner = saved && !def.isEmpty(values)
    ? h("div", { class: "banner", role: "status" },
        h("span", {}, `Restored your unsent draft from ${new Date(saved.savedAt).toLocaleString()}.`),
        h("button", { type: "button", class: "link", onclick: () => reset(true) }, "Start over"))
    : null;

  const saveStatus = h("span", { class: "save-status", "aria-live": "polite" });
  const form = h("form", { onsubmit: onSubmit });

  def.sections(data).forEach((s, i) => {
    const fields = s.fields.map(renderField);
    const legend = h("legend", {}, h("span", { class: "step-no", "aria-hidden": "true" }, String(i + 1)), s.title,
      s.optional ? h("span", { class: "optional-tag" }, "optional") : null);
    const help = s.help ? h("p", { class: "section-help" }, s.help) : null;
    form.append(s.collapsed
      ? h("fieldset", {}, legend, help, h("details", { class: "more", open: !!s.fields.some((f) => values[f.name] && values[f.name] !== defaults[f.name]) },
          h("summary", {}, s.summary || "Show"), fields))
      : h("fieldset", {}, legend, help, fields));
  });

  form.append(h("div", { class: "form-actions" },
    h("button", { type: "submit", class: "primary" }, "Submit for review on GitHub →"),
    h("button", { type: "button", class: "link", onclick: () => reset(true) }, "Clear form"),
    saveStatus));

  const previewBox = h("div");
  const hintList = h("ul", { class: "hints", "aria-live": "polite" });
  const aside = h("aside", { class: "capture-aside", "aria-label": "Preview and hints" },
    h("section", { class: "card preview" }, h("h2", {}, "Preview"), previewBox),
    h("section", { class: "card" }, h("h2", {}, "Hints"), hintList),
    h("section", { class: "card" }, h("h2", {}, "What happens next"),
      h("ol", { class: "muted" },
        h("li", {}, "GitHub opens with everything filled in — click ", h("strong", {}, "Create"), "."),
        h("li", {}, "A bot turns it into a pull request with proper IDs and links."),
        h("li", {}, "Approving & merging that pull request approves the record."))));

  const dialog = h("dialog", { "aria-labelledby": "dlg-title" });

  append(clear(main), [
    h("div", { class: "page-head" },
      h("div", {}, h("h1", { tabindex: "-1" }, def.title), h("p", { class: "lead" }, def.intro))),
    restoreBanner,
    h("div", { class: "capture" }, form, aside),
    dialog]);

  // Keep aria-invalid in sync with :user-invalid (visual state alone is not announced).
  form.addEventListener("blur", (e) => {
    if (e.target.matches?.("input, textarea")) e.target.setAttribute("aria-invalid", e.target.matches(":user-invalid") ? "true" : "false");
  }, true);

  // ------------------------------------------------------------ state
  const persist = debounce(() => {
    try {
      if (def.isEmpty(values)) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values }));
      saveStatus.textContent = def.isEmpty(values) ? "" : `Draft saved on this device · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      saveStatus.textContent = "Drafts can't be saved in this browser (storage blocked).";
    }
    window.dispatchEvent(new CustomEvent("drafts-changed"));
  }, 400);

  function collect() {
    const v = { ...values };
    for (const [name, c] of controls) v[name] = c.get();
    return v;
  }

  function update() {
    values = collect();
    for (const [name, el] of errorEls) {
      if (el.parentElement?.classList.contains("show-error") && !def.validate(values).some((e) => e.name === name)) {
        el.parentElement.classList.remove("show-error");
      }
    }
    def.onUpdate?.(values, controls);
    clear(previewBox).append(def.preview(values, data));
    const hints = def.hints(values, data);
    clear(hintList).append(...(hints.length ? hints : [{ level: "", text: "Hints appear here as you type." }])
      .map((x) => h("li", { class: x.level }, x.text)));
    persist();
  }

  function reset(ask) {
    if (ask && !def.isEmpty(values) && !confirm("Clear this form? Your draft will be removed.")) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("drafts-changed"));
    mountCapture(main, def, data);
  }

  // ------------------------------------------------------------ submit
  function onSubmit(e) {
    e.preventDefault();
    values = collect();
    const problems = def.validate(values);
    form.querySelectorAll(".show-error").forEach((el) => el.classList.remove("show-error"));
    if (problems.length) {
      for (const p of problems) {
        const err = errorEls.get(p.name);
        if (!err) continue;
        err.lastChild.textContent = p.message;
        err.parentElement.classList.add("show-error");
      }
      const first = controls.get(problems[0].name)?.el;
      first?.focus?.();
      first?.scrollIntoView?.({ block: "center" });
      return;
    }
    const payload = def.toPayload(values, data);
    const { url, tooLong, json } = buildIssueUrl(data, def, values, payload);
    window.open(url, "_blank", "noopener");
    showDialog(url, tooLong, json);
  }

  function showDialog(url, tooLong, json) {
    const copy = async (btn) => {
      try { await navigator.clipboard.writeText(json); btn.textContent = "Copied ✓"; } catch { btn.textContent = "Copy failed — select it in the GitHub form"; }
    };
    clear(dialog).append(
      h("h2", { id: "dlg-title" }, "Almost there!"),
      h("ol", {},
        h("li", {}, "GitHub opened in a new tab with your capture filled in. ",
          h("a", { href: url, target: "_blank", rel: "noopener" }, "Didn't open? Click here.")),
        tooLong ? h("li", {}, "Your capture is large: copy the data below and paste it into the ", h("strong", {}, "Payload"), " field.") : null,
        h("li", {}, "Click ", h("strong", {}, "Create"), " at the bottom of the GitHub form."),
        h("li", {}, "Within a minute a pull request appears. Approving & merging it approves the record.")),
      h("div", { class: "form-actions" },
        h("button", { type: "button", class: "primary", onclick: () => { dialog.close(); reset(false); } }, "I've submitted it — clear my draft"),
        h("button", { type: "button", onclick: () => dialog.close() }, "Keep editing"),
        h("button", { type: "button", class: "link", onclick: (ev) => copy(ev.target) }, "Copy capture data")));
    dialog.showModal();
  }

  update();
  saveStatus.textContent = saved && !def.isEmpty(values) ? "Draft restored" : "";
}

export function buildIssueUrl(data, def, values, payload) {
  const base = githubUrl(data, "/issues/new");
  const json = JSON.stringify(payload, null, 2);
  const build = (withFields, withPayload) => {
    const p = new URLSearchParams({ template: def.issueTemplate, title: def.issueTitle(values) });
    if (withFields) for (const [k, v] of Object.entries(def.issueFields(values))) if (v) p.set(k, v);
    if (withPayload) p.set("payload", json);
    return `${base}?${p}`;
  };
  let url = build(true, true);
  if (url.length > MAX_URL) url = build(false, true);
  if (url.length > MAX_URL) return { url: build(true, false), tooLong: true, json };
  return { url, tooLong: false, json };
}
