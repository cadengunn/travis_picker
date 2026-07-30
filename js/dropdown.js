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
//
// THE PANEL IS PLUGGABLE (the chord wheel, session 21). Everything around the
// panel — the trigger, the value-setter wrap, one-panel-at-a-time, the outside-
// tap catcher, Escape, and closing when the ground shifts — is the same job
// whatever is drawn inside. So a caller can pass its own `render`, and the
// scrolling list below is simply the default one. `wheel.js` supplies the other.
// A renderer fills the panel and may return { onKey, afterOpen, cleanup }.
//
// A renderer MUST commit through the `commit` it is handed, never by capturing
// the select it was opened on — see retargetOpenPanel below for why.

const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");

let openPanel = null; // the one panel that can be open at a time

// `watch` names OTHER selects whose value also appears on this trigger's face —
// the Key × Progression field is one control over two selects, and its face shows
// both. They get the same treatment the owning select gets (a `change` listener
// AND a wrapped `value` setter), because the reason the wrap exists applies
// identically to them: a transpose, a load or a die roll sets a value
// programmatically and fires no `change`, so without it the face goes stale.
export function enhanceSelect(select, { render = renderList, label, watch = [] } = {}) {
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
  const aria = select.getAttribute("aria-label");
  if (aria) trigger.setAttribute("aria-label", aria);
  // The label lives in its own span so a long option ellipsizes cleanly and the
  // CSS caret (::after) is never overwritten by syncLabel.
  const labelEl = document.createElement("span");
  labelEl.className = "dd-label";
  trigger.appendChild(labelEl);
  dd.appendChild(trigger);

  // `label` lets a renderer draw its own trigger contents — the chord wheel's
  // Options-sheet field shows the root and the quality as two separate wells,
  // where the bar chip shows the one chord name.
  function syncLabel() {
    if (label) { label(select, labelEl); return; }
    const opt = select.options[select.selectedIndex];
    labelEl.textContent = opt ? opt.textContent : "";
  }
  syncLabel();
  select.addEventListener("change", syncLabel);

  // Refresh the trigger even when app.js sets .value programmatically.
  const wrapValue = (sel) => Object.defineProperty(sel, "value", {
    configurable: true,
    get() { return valueDesc.get.call(this); },
    set(v) { valueDesc.set.call(this, v); syncLabel(); },
  });
  wrapValue(select);
  for (const other of watch) {
    if (!other) continue;
    wrapValue(other);
    other.addEventListener("change", syncLabel);
  }

  trigger.addEventListener("click", () => {
    if (openPanel && openPanel.select === select) { closePanel(); return; }
    open(select, trigger, render);
  });
}

// Enhance every not-yet-enhanced <select> under `root` (default: document).
// `pick(select)` may return per-select options ({ render, label }) — that's how
// app.js hands the chord selects their wheel without knowing where each one is.
export function enhanceAll(root = document, pick) {
  for (const s of root.querySelectorAll("select:not([data-dd])")) {
    enhanceSelect(s, pick?.(s) || {});
  }
}

// Commit a pick: write through the wrapped setter (which refreshes the label)
// and fire the same bubbling `change` a native pick would. Shared by renderers.
export function commit(select, value) {
  if (select.value === value) return false;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

// POINT AN OPEN PANEL AT A REPLACEMENT <select>.
//
// The per-bar chord selects are rebuilt by every render(), and changing a chord
// IS a render — so the first pick from an open wheel destroyed the very element
// the panel was writing to. The panel stayed up (it lives on <body>), the reels
// still turned and ticked, and nothing happened: you had to close and reopen to
// make a second change, which is exactly the wrong behaviour on a control whose
// whole point is spinning to the right answer.
//
// `find(oldSelect)` returns the element that replaced it, or null to give up
// (then we close, rather than leave a live-looking panel wired to nothing).
// The panel's DOM and scroll positions are untouched — only the target moves.
export function retargetOpenPanel(find) {
  if (!openPanel) return;
  const next = find(openPanel.select);
  if (!next) { closePanel(); return; }
  if (next === openPanel.select) return;
  openPanel.select = next;
  const trigger = next.parentNode?.querySelector(".dd-trigger");
  if (trigger) {
    openPanel.trigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
  }
}

// The trigger of the currently-open panel, or null. The outside-tap catcher sits
// ON TOP of the trigger (it's `inset: 0`), so a tap that closes the panel by
// hitting the trigger lands on the catcher, not the button — app.js uses this to
// still sound the ka-chunk when you close by tapping the trigger (his note).
export function openDropdownTrigger() {
  return openPanel ? openPanel.trigger : null;
}

function closePanel() {
  if (!openPanel) return;
  const { el, trigger, cleanup } = openPanel;
  el.remove();
  trigger.setAttribute("aria-expanded", "false");
  cleanup();
  openPanel = null;
}

// The DEFAULT renderer: the scrolling list of options, mirroring the select's
// own structure so an <optgroup> becomes a section header.
function renderList(select, panel, { close, commit: commitTo }) {
  panel.setAttribute("role", "listbox");
  // `.dd-list` so CSS can give a LIST panel the drum's housing (his call,
  // v2.14.6: bring the five remaining list menus into the same design language)
  // without that treatment landing on the wheel, which brings its own housings.
  panel.classList.add("dd-list");
  let active = select.selectedIndex;

  const buildOption = (opt) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "dd-option";
    item.setAttribute("role", "option");
    item.textContent = opt.textContent;
    if (opt.disabled) item.disabled = true;
    if (opt.selected) {
      item.classList.add("selected");
      item.setAttribute("aria-selected", "true");
    }
    item.addEventListener("click", () => {
      if (opt.disabled) return;
      commitTo(opt.value);
      close();
    });
    panel.appendChild(item);
  };
  for (const child of select.children) {
    if (child.tagName === "OPTGROUP") {
      const header = document.createElement("div");
      header.className = "dd-group";
      header.setAttribute("role", "presentation");
      header.textContent = child.label;
      panel.appendChild(header);
      for (const opt of child.children) buildOption(opt);
    } else if (child.tagName === "OPTION") {
      buildOption(child);
    }
  }

  return {
    onKey(e) {
      const items = [...panel.querySelectorAll(".dd-option:not(:disabled)")];
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      active = Math.max(0, Math.min(items.length - 1,
        items.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1)));
      items[active]?.focus();
    },
    // Focus the selected option so keyboard + VoiceOver land somewhere sensible,
    // and bring it into view when the list is long.
    afterOpen() {
      requestAnimationFrame(() => {
        const sel = panel.querySelector(".dd-option.selected") || panel.querySelector(".dd-option");
        sel?.focus();
        sel?.scrollIntoView({ block: "nearest" });
      });
    },
  };
}

function open(select, trigger, render) {
  closePanel();

  const panel = document.createElement("div");
  panel.className = "dd-panel";

  // `commit` reads openPanel.select at call time, not the one captured here, so
  // a retarget (see retargetOpenPanel) is one assignment and the panel keeps
  // working across the re-render its own pick caused.
  const hooks = render(select, panel, {
    close: closePanel,
    commit: (value) => commit(openPanel?.select || select, value),
  }) || {};

  document.body.appendChild(panel);
  position(panel, trigger);
  trigger.setAttribute("aria-expanded", "true");

  // A transparent full-screen catcher closes on any outside tap.
  const catcher = document.createElement("div");
  catcher.className = "dd-catcher";
  catcher.addEventListener("click", closePanel);
  document.body.appendChild(catcher);

  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); closePanel(); trigger.focus(); return; }
    hooks.onKey?.(e);
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
      hooks.cleanup?.();
    },
  };

  // Synchronous, NOT in a rAF: the wheel sets its reels' scroll positions here,
  // and rAF never fires in a hidden tab (which is what the preview runs as), so
  // a rAF'd wheel would open blank whenever it was being checked.
  hooks.afterOpen?.();
}

// Anchor under the trigger; flip above when the bottom edge is closer. Clamp
// into the viewport so a grid trigger near the right edge stays fully visible.
function position(panel, trigger) {
  const r = trigger.getBoundingClientRect();
  const margin = 6;
  // A list lines up under the field it came from, so it takes the trigger's
  // width. A panel that opts out (`data-hug`) sizes to its own contents instead
  // — the chord wheel is a mechanism, not a menu, and the chord field (289px at
  // the time) left its two drums swimming in housing. The field is now cut to the
  // panel's own width instead, and `left = r.left` below is what makes that pay
  // off: each barrel opens directly under its half of the field.
  if (!panel.dataset.hug) panel.style.minWidth = `${Math.ceil(r.width)}px`;
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
