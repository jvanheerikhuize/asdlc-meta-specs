// <gwt-rows>: repeatable Given / When / Then scenario editor. value = [{given, when, then}]. Emits "input".
import { h, clear, nextId } from "../dom.js";

const blank = () => ({ given: "", when: "", then: "" });

class GwtRows extends HTMLElement {
  #value = [];
  #wrap;

  connectedCallback() {
    if (this.#wrap) return;
    this.#wrap = h("div");
    const add = h("button", { type: "button", onclick: () => this.#add() }, "＋ Add a scenario");
    this.append(this.#wrap, add);
    if (!this.#value.length) this.#value = [blank()];
    this.#render();
  }

  get value() { return this.#value.map((s) => ({ ...s })); }
  set value(v) { this.#value = (v && v.length ? v : [blank()]).map((s) => ({ ...blank(), ...s })); this.#render(); }

  #add() {
    this.#value.push(blank());
    this.#render();
    this.#wrap.querySelector(".scenario:last-child input")?.focus();
    this.#emit();
  }

  #remove(i) {
    this.#value.splice(i, 1);
    if (!this.#value.length) this.#value = [blank()];
    this.#render();
    this.#emit();
  }

  #emit() { this.dispatchEvent(new Event("input", { bubbles: true })); }

  #render() {
    if (!this.#wrap) return;
    clear(this.#wrap).append(...this.#value.map((sc, i) => {
      const row = (key, label, placeholder) => {
        const id = nextId("gwt");
        return h("div", { class: "row" },
          h("label", { for: id }, label),
          h("input", { id, type: "text", value: sc[key], placeholder,
            oninput: (e) => { this.#value[i][key] = e.target.value; this.#emit(); } }));
      };
      return h("fieldset", { class: "scenario" },
        h("legend", {}, `Scenario ${i + 1}`),
        row("given", "GIVEN", "a starting situation (optional)"),
        row("when", "WHEN", "something happens (optional)"),
        row("then", "THEN", "the observable result"),
        this.#value.length > 1 || sc.given || sc.when || sc.then
          ? h("button", { type: "button", class: "link", onclick: () => this.#remove(i) }, `Remove scenario ${i + 1}`)
          : null);
    }));
  }
}
customElements.define("gwt-rows", GwtRows);
