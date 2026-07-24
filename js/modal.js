// modal.js — confirm/prompt dialogs in the app's own tweed language, replacing
// the browser's native confirm()/prompt() (which iOS renders in the system
// style, breaking the "piece of gear" illusion).
//
// Promise-based so callers read almost like the built-ins:
//   if (await confirmModal({ message })) { ... }
//   const name = await promptModal({ message, value });   // null if cancelled
//
// Pure DOM, no deps. Buttons reuse the app's .pill / .btn-primary classes, so
// they inherit the push-in feel and the press-click for free. Backdrop tap or
// Escape cancels; the card is centred (an alert, not a bottom sheet).

let openCount = 0;

function build({ title, message, value, confirmText, cancelText, danger, prompt }) {
  const root = document.createElement("div");
  root.className = "tp-modal";

  const backdrop = document.createElement("div");
  backdrop.className = "tp-modal-backdrop";

  const card = document.createElement("div");
  card.className = "tp-modal-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");

  if (title) {
    const h = document.createElement("h2");
    h.className = "tp-modal-title";
    h.textContent = title;
    card.appendChild(h);
    card.setAttribute("aria-label", title);
  }

  const p = document.createElement("p");
  p.className = "tp-modal-msg";
  p.textContent = message;
  card.appendChild(p);

  let input = null;
  if (prompt) {
    input = document.createElement("input");
    input.className = "tp-modal-input";
    input.type = "text";
    input.value = value ?? "";
    input.autocomplete = "off";
    card.appendChild(input);
  }

  const actions = document.createElement("div");
  actions.className = "tp-modal-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "pill tp-modal-cancel";
  cancel.textContent = cancelText || "Cancel";
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "btn-primary tp-modal-ok" + (danger ? " tp-modal-danger" : "");
  ok.textContent = confirmText || "OK";
  actions.append(cancel, ok);
  card.appendChild(actions);

  root.append(backdrop, card);
  return { root, backdrop, card, input, cancel, ok };
}

// A read-only info card (Help): a scrollable body filled by `render(bodyEl)` and
// a single close button — no cancel, no input. Same tweed shell + present() flow.
function buildInfo({ title, closeText, render }) {
  const root = document.createElement("div");
  root.className = "tp-modal";

  const backdrop = document.createElement("div");
  backdrop.className = "tp-modal-backdrop";

  const card = document.createElement("div");
  card.className = "tp-modal-card tp-modal-info";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");

  if (title) {
    const h = document.createElement("h2");
    h.className = "tp-modal-title";
    h.textContent = title;
    card.appendChild(h);
    card.setAttribute("aria-label", title);
  }

  const body = document.createElement("div");
  body.className = "tp-modal-body";
  if (typeof render === "function") render(body);
  card.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "tp-modal-actions";
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "btn-primary tp-modal-ok";
  ok.textContent = closeText || "Got it";
  actions.appendChild(ok);
  card.appendChild(actions);

  root.append(backdrop, card);
  return { root, backdrop, card, input: null, cancel: null, ok };
}

function present(parts, resolveWith) {
  const prev = document.activeElement;
  document.body.appendChild(parts.root);
  openCount++;

  function close(result) {
    parts.root.remove();
    openCount = Math.max(0, openCount - 1);
    document.removeEventListener("keydown", onKey, true);
    if (prev && prev.focus) prev.focus();
    resolveWith(result);
  }

  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); close("cancel"); }
    else if (e.key === "Enter" && (!parts.input || document.activeElement === parts.input)) {
      e.preventDefault(); close("ok");
    }
  }
  document.addEventListener("keydown", onKey, true);

  parts.backdrop.addEventListener("click", () => close("cancel"));
  if (parts.cancel) parts.cancel.addEventListener("click", () => close("cancel"));
  parts.ok.addEventListener("click", () => close("ok"));

  // Focus the input (prompt) or the confirm button (alert), after paint.
  requestAnimationFrame(() => {
    if (parts.input) { parts.input.focus(); parts.input.select(); }
    else parts.ok.focus();
  });

  return close;
}

export function confirmModal(opts = {}) {
  return new Promise((resolve) => {
    const parts = build({ ...opts, prompt: false });
    present(parts, (r) => resolve(r === "ok"));
  });
}

export function promptModal(opts = {}) {
  return new Promise((resolve) => {
    const parts = build({ ...opts, prompt: true });
    present(parts, (r) => resolve(r === "ok" ? parts.input.value : null));
  });
}

// A read-only Help/info dialog. Resolves (void) when closed by the button,
// the backdrop or Escape. `render(bodyEl)` fills the scrollable content.
export function infoModal(opts = {}) {
  return new Promise((resolve) => {
    const parts = buildInfo(opts);
    present(parts, () => resolve());
  });
}

// So callers/tests can tell whether a dialog is up (e.g. to gate Escape).
export function modalOpen() {
  return openCount > 0;
}
