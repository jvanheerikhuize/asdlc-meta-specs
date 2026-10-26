// <record-picker>: searchable multi-select of existing records shown as removable chips.
// Usage: el.options = [{id, title, type, status}]; el.value = ["FCT-0001"]; listen for "change".
// Attributes: input-id (id for the inner input, so an external <label for> works), placeholder, describedby.
import { h, clear, nextId } from "../dom.js";
import { statusTone } from "../data.js";

class RecordPicker extends HTMLElement {
  #options = [];
  #value = [];
  #input; #list; #chips; #live;

  connectedCallback() {
    if (this.#input) return;
    const listId = nextId("dl");
    this.#input = h("input", {
      type: "text", id: this.getAttribute("input-id") || nextId("rp"), list: listId,
      placeholder: this.getAttribute("placeholder") || "Type to search…",
      autocomplete: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done",
      "aria-describedby": this.getAttribute("describedby") || false,
    });
    this.#list = h("datalist", { id: listId });
    this.#chips = h("ul", { class: "chips", "aria-label": "Selected" });
    this.#live = h("span", { class: "visually-hidden", "aria-live": "polite" });
    this.#input.addEventListener("input", () => this.#tryAdd(false));
    this.#input.addEventListener("change", () => this.#tryAdd(true));
    this.#input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); this.#tryAdd(true); }
    });
    this.append(this.#input, this.#list, this.#chips, this.#live);
    this.#render();
  }

  set options(opts) { this.#options = opts || []; this.#render(); }
  get value() { return [...this.#value]; }
  set value(v) { this.#value = [...new Set(v || [])]; this.#render(); }
  focus() { this.#input?.focus(); }

  #tryAdd(fuzzy) {
    const raw = this.#input.value.trim();
    if (!raw) return;
    const id = raw.match(/\b[A-Z]{3}-\d{4}\b/)?.[0];
    let opt = id && this.#options.find((o) => o.id === id);
    if (!opt && fuzzy) {
      const q = raw.toLowerCase();
      const hits = this.#options.filter((o) => !this.#value.includes(o.id) && `${o.id} ${o.title}`.toLowerCase().includes(q));
      if (hits.length === 1) opt = hits[0];
    }
    if (!opt) return;
    if (!this.#value.includes(opt.id)) this.#value.push(opt.id);
    this.#input.value = "";
    this.#live.textContent = `Added ${opt.id}`;
    this.#render();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #remove(id) {
    this.#value = this.#value.filter((v) => v !== id);
    this.#live.textContent = `Removed ${id}`;
    this.#render();
    this.#input.focus();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #render() {
    if (!this.#input) return;
    clear(this.#list).append(...this.#options.filter((o) => !this.#value.includes(o.id))
      .map((o) => h("option", { value: `${o.id} — ${o.title}` })));
    clear(this.#chips).append(...this.#value.map((id) => {
      const o = this.#options.find((x) => x.id === id) || { id, title: "(unknown)", type: "" };
      return h("li", {},
        h("span", { class: `badge ${statusTone(o)}` }, o.id),
        h("span", { class: "t", title: o.title }, o.title),
        h("button", { type: "button", class: "icon", "aria-label": `Remove ${o.id}`, onclick: () => this.#remove(id) }, "×"));
    }));
  }
}
customElements.define("record-picker", RecordPicker);
