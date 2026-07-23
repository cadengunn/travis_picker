// dropdown.js — custom, theme-styled dropdowns that replace the native <select>
// open list (which iOS always draws as the OS wheel picker, outside our design
// language).
//
// KEY IDEA: the native <select> STAYS in the DOM as the source of truth — value,
// options, and the `change` event are unchanged, so every existing app.js wiring
// (el("chord").value, the #grid change delegation, fillSelect, etc.) keeps
// working with no edits. We only hide the native control and overlay:
//   • a .dd-trigger button showing the current option, styled like the old field
//   • a .dd-panel listbox, opened on tap, positioned by JS (flips up near the
//     bottom edge; appended to <body> so a sheet's overflow can't clip it).
// Choosing an option writes select.value and dispatches a bubbling `change`, so
// downstream logic fires exactly as it did with a native pick.
//
// Programmatic value changes (loadSaved, key transpose, syncProgressionSelect,
// the re-roll reverts…) don't fire `change`, so we wrap the element's own `value`
// setter to also refresh the trigger label. That keeps the button honest without
// scattering refresh calls through app.js.

const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");

let openPanel = null; // the one panel that can be open at a time

export function enhanceSelect(select) {
  if (select.dataset.dd === "1") return;
  select.dataset.dd = "1";

  const dd = document.createElement("span");
  dd.className = "dd";
  select.parentNode.insertBefore(dd, select);
  dd.appendChild(select);
  select.classList.add("dd-native");
  select.setAttribute("tabindex", "-1");
  select.setAttribute("aria-hidden", "true");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "dd-trigger";
  // Carry the select's own classes (e.g. bar-chord) so context CSS styles the
  // trigger the same as the control it replaces.
  for (const c of select.classList) if (c !== "dd-native") trigger.classList.add(c);
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const label = select.getAttribute("aria-label");
  if (label) trigger.setAttribute("aria-label", label);
  // The label lives in its own span so a long option ellipsizes cleanly and the
  // CSS caret (::after) is never overwritten by syncLabel.
  const labelEl = document.createElement("span");
  labelEl.className = "dd-label";
  trigger.appendChild(labelEl);
  dd.appendChild(trigger);

  function syncLabel() {
    const opt = select.options[select.selectedIndex];
    labelEl.textContent = opt ? opt.textContent : "";
  }
  syncLabel();
  select.addEventListener("change", syncLabel);

  // Refresh the trigger even when app.js sets .value programmatically.
  Object.defineProperty(select, "value", {
    configurable: true,
    get() { return valueDesc.get.call(this); },
    set(v) { valueDesc.set.call(this, v); syncLabel(); },
  });

  trigger.addEventListener("click", () => {
    if (openPanel && openPanel.select === select) { closePanel(); return; }
    open(select, trigger);
  });
}

// Enhance every not-yet-enhanced <select> under `root` (default: document).
export function enhanceAll(root = document) {
  for (const s of root.querySelectorAll("select:not([data-dd])")) enhanceSelect(s);
}

function closePanel() {
  if (!openPanel) return;
  const { el, trigger, cleanup } = openPanel;
  el.remove();
  trigger.setAttribute("aria-expanded", "false");
  cleanup();
  openPanel = null;
}

function open(select, trigger) {
  closePanel();

  const panel = document.createElement("div");
  panel.className = "dd-panel";
  panel.setAttribute("role", "listbox");

  const options = [...select.options];
  let active = select.selectedIndex;

  options.forEach((opt, i) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "dd-option";
    item.setAttribute("role", "option");
    item.textContent = opt.textContent;
    if (opt.disabled) item.disabled = true;
    if (i === select.selectedIndex) {
      item.classList.add("selected");
      item.setAttribute("aria-selected", "true");
    }
    item.addEventListener("click", () => {
      if (opt.disabled) return;
      if (select.value !== opt.value) {
        select.value = opt.value; // fires syncLabel via the wrapped setter
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      closePanel();
    });
    panel.appendChild(item);
  });

  document.body.appendChild(panel);
  position(panel, trigger);
  trigger.setAttribute("aria-expanded", "true");

  // A transparent full-screen catcher closes on any outside tap.
  const catcher = document.createElement("div");
  catcher.className = "dd-catcher";
  catcher.addEventListener("click", closePanel);
  document.body.appendChild(catcher);

  const onKey = (e) => {
    const items = [...panel.querySelectorAll(".dd-option:not(:disabled)")];
    if (e.key === "Escape") { e.stopPropagation(); closePanel(); trigger.focus(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(0, Math.min(items.length - 1,
        items.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1)));
      if (active < 0) active = 0;
      items[active]?.focus();
    }
  };
  document.addEventListener("keydown", onKey, true);

  // Detach if the ground shifts under us (sheet scroll, keyboard, rotate) — but
  // NOT when the scroll came from inside the panel itself (the open-time
  // scrollIntoView on a long list would otherwise close the panel instantly).
  const reflow = (e) => {
    if (e && e.type === "scroll" && e.target && e.target.nodeType && panel.contains(e.target)) return;
    closePanel();
  };
  window.addEventListener("resize", reflow);
  window.addEventListener("scroll", reflow, true);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", reflow);

  openPanel = {
    el: panel,
    select,
    trigger,
    cleanup() {
      catcher.remove();
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", reflow);
      window.removeEventListener("scroll", reflow, true);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", reflow);
    },
  };

  // Focus the selected option so keyboard + VoiceOver land somewhere sensible,
  // and bring it into view when the list is long.
  requestAnimationFrame(() => {
    const sel = panel.querySelector(".dd-option.selected") || panel.querySelector(".dd-option");
    sel?.focus();
    sel?.scrollIntoView({ block: "nearest" });
  });
}

// Anchor under the trigger; flip above when the bottom edge is closer. Clamp
// into the viewport so a grid trigger near the right edge stays fully visible.
function position(panel, trigger) {
  const r = trigger.getBoundingClientRect();
  const margin = 6;
  panel.style.minWidth = `${Math.ceil(r.width)}px`;
  const ph = panel.offsetHeight;
  const room = window.innerHeight - r.bottom;
  const flipUp = room < ph + margin && r.top > room;
  panel.style.top = flipUp
    ? `${Math.max(margin, r.top - ph - 4)}px`
    : `${r.bottom + 4}px`;

  const pw = panel.offsetWidth;
  let left = r.left;
  if (left + pw > window.innerWidth - margin) left = window.innerWidth - pw - margin;
  panel.style.left = `${Math.max(margin, left)}px`;
}
