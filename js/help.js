// Help mode — the app explains itself in place.
//
// Tap the "?" and it latches in like the Edit pencil. From then on, tapping
// anything on screen shows a short card about it INSTEAD of doing what it
// normally does, so you can poke at every control without changing your
// pattern, your settings or your library.
//
// This replaced a scrolling instruction-manual modal. The argument for it is
// specific rather than general: the four header pills are icon-only, and the
// ABS / MIX chips and the REC and save lamps are deliberately cryptic hardware
// indicators — those are exactly the things a manual explains badly, because a
// list of glyphs somewhere else is the one place the reader can't compare the
// glyph to the thing. Help mode explains the pencil by pointing at the pencil.
//
// Two structural notes:
//
// * The copy is DATA (`HELP` in data.js), keyed to `data-help` attributes.
//   `tests.js` checks both directions, because a control pointing at a missing
//   entry is a tap that silently does nothing — the worst possible bug in a
//   mode whose entire promise is "tap anything".
//
// * NAVIGATION SURVIVES. You can still open the Options sheet, move between its
//   pages and close it again, because half the controls worth explaining live
//   in there and would otherwise be unreachable. Everything else — including
//   Play, the die, Save and Load — becomes educational.
import { HELP } from "./data.js";

// The allowlist, and it is deliberately tiny. `[data-close]` is the sheet's ✕
// and its backdrop. The "?" is here so that tapping it reaches its own handler
// and toggles the mode off — which means the exit needs no special case at all.
// `.help-pop` lets you dismiss a card by tapping it.
export const NAV_SELECTOR =
  "#open-options, #open-help, #tab-setup, #tab-prefs, [data-close], .help-pop";

const closestIn = (node, sel) =>
  node && typeof node.closest === "function" ? node.closest(sel) : null;

// Does this element keep working while help mode is armed?
export function isNav(node) {
  return !!closestIn(node, NAV_SELECTOR);
}

// The element a card RINGS and hangs off is usually the annotated element
// itself, but not always: `data-help-ring` splits the two jobs where ONE
// explanation covers two mutually-exclusive boxes of different shapes.
//
// `#chord-head` is the case that forced it. It reserves a full-width 28px slot
// so the grid can't move, and what you actually see in that slot is either a
// 40px chord glyph that overflows the slot UPWARD (single mode) or a
// text-width run of Roman numerals sitting inside it (progression mode).
// Ringing the container drew the same wide, short box either way — in single
// mode that box is mostly empty space under the chord it claims to point at.
//
// Only one child is ever rendered, so "first one with a box" picks the right
// one with no mode flag crossing over from app.js. Falls back to the annotated
// element, which is also what happens before `enhanceAll()` has built a
// dropdown's `.dd` wrapper.
function ringFor(anchor) {
  const sel = anchor.dataset?.helpRing;
  if (!sel) return anchor;
  for (const n of anchor.querySelectorAll(sel)) {
    if (n.getClientRects().length) return n;
  }
  return anchor;
}

// Which help entry does a tap on this element belong to? Walks up, so tapping
// the SVG inside a pill, the jewel inside a lamp or a cell inside the grid all
// resolve to the annotated ancestor.
export function helpTargetFor(node) {
  const el = closestIn(node, "[data-help]");
  if (!el) return null;
  const key = el.dataset.help;
  return HELP[key] ? { key, anchor: ringFor(el), entry: HELP[key] } : null;
}

// Anchor the card to what was tapped: below it, flipped above when the bottom
// edge is closer, clamped into the viewport. Same approach as the dropdown
// panel — a 375px screen has controls hard against every edge.
function position(pop, anchor) {
  const r = anchor.getBoundingClientRect();
  const margin = 8;
  const maxW = Math.min(300, window.innerWidth - margin * 2);
  pop.style.maxWidth = `${maxW}px`;

  const ph = pop.offsetHeight;
  const below = window.innerHeight - r.bottom;
  const flipUp = below < ph + margin && r.top > below;
  pop.style.top = flipUp
    ? `${Math.max(margin, r.top - ph - 6)}px`
    : `${Math.min(window.innerHeight - ph - margin, r.bottom + 6)}px`;

  // Centre on the anchor, then pull back inside the screen.
  const pw = pop.offsetWidth;
  let left = r.left + r.width / 2 - pw / 2;
  if (left + pw > window.innerWidth - margin) left = window.innerWidth - pw - margin;
  pop.style.left = `${Math.max(margin, left)}px`;
}

// A DISABLED control emits no click at all, so it would be a dead tap in a mode
// whose promise is "tap anything". That is not a corner case here: the Load pill
// is disabled whenever the library is empty — the first-run state, i.e. exactly
// the person most likely to be reading help — and the capo's −/+ disable at
// their end stops. Help mode already guarantees that nothing acts, so `disabled`
// has no job while it's armed: lift it, remember what we lifted, put it back on
// exit. `aria-disabled` keeps the state truthful to assistive tech meanwhile.
const LIFTED = "data-help-lifted";

function liftDisabled(doc) {
  for (const n of doc.querySelectorAll("[data-help][disabled], [data-help] [disabled]")) {
    n.setAttribute(LIFTED, "");
    n.disabled = false;
    n.setAttribute("aria-disabled", "true");
  }
}

function restoreDisabled(doc) {
  for (const n of doc.querySelectorAll(`[${LIFTED}]`)) {
    n.removeAttribute(LIFTED);
    n.removeAttribute("aria-disabled");
    n.disabled = true;
  }
}

export function createHelp({ doc = document, onChange, version = "" } = {}) {
  let on = false;
  let pop = null;
  let lit = null; // the element currently outlined as "this is what you tapped"

  const close = () => {
    pop?.remove();
    pop = null;
    lit?.classList.remove("help-target");
    lit = null;
  };

  const show = (key, anchor, entry) => {
    close();
    pop = doc.createElement("div");
    pop.className = "help-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-live", "polite");

    const h = doc.createElement("h3");
    h.className = "help-pop-title";
    h.textContent = entry.title;
    pop.appendChild(h);

    // A blank line in a `body` starts a new paragraph. Real <p>s rather than
    // `white-space: pre-line`, which would open a full blank line where the
    // card only has room for paragraph spacing. Only the grid's card uses this
    // today: it explains the picking rows, then the per-bar chord pickers,
    // which are two different things sharing one card.
    for (const para of String(entry.body).split(/\n\s*\n/)) {
      const p = doc.createElement("p");
      p.className = "help-pop-body";
      p.textContent = para.trim();
      pop.appendChild(p);
    }

    // The version rides the mode's own card. It used to sit at the foot of the
    // Guide modal this replaced — and before that in the Options sheet header,
    // where it was taking width from the tabs. This is the app's reference
    // surface now, which is exactly where a version number belongs.
    if (key === "help-mode" && version) {
      const v = doc.createElement("p");
      v.className = "help-pop-version";
      v.textContent = `Travis Picker ${version}`;
      pop.appendChild(v);
    }

    doc.body.appendChild(pop);
    anchor.classList.add("help-target");
    lit = anchor;
    position(pop, anchor);
    pop.dataset.helpKey = key;
  };

  // ONE interceptor for all three input paths, in capture phase so it runs
  // before anything else has a chance.
  //
  // `click` alone is NOT enough, and this was measured rather than assumed: a
  // capture-phase click listener with preventDefault does stop a <label> from
  // toggling its hidden checkbox (the Sound lamps), but it does NOT stop a
  // drag on an <input type="range"> — the BPM and Swing sliders move anyway.
  // Killing pointerdown is what stops those.
  const swallow = (e) => {
    if (!on) return;
    if (isNav(e.target)) {
      // Navigation takes the card with it. Opening the sheet, switching pages or
      // closing the sheet all move or hide whatever the card was anchored to,
      // and a card left pointing at nothing is worse than no card — the ✕ used
      // to leave a "Theme" card floating over the grid. This also covers a tap
      // ON the card, which is how you put one away.
      if (e.type === "click") close();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Act once per tap. pointerdown is intercepted to neutralise the control;
    // the card is shown on the click that follows, so a scroll or a stray drag
    // doesn't fire one.
    if (e.type !== "click") return;
    const hit = helpTargetFor(e.target);
    if (!hit) {
      close(); // tapping bare faceplate puts the card away
      return;
    }
    // Tapping the SAME thing again puts its card away, so every control is its
    // own toggle. The card has no ✕ — it's dismissed by tapping it, tapping the
    // faceplate, or tapping the thing it's about — and the last of those is the
    // one you reach for without thinking, because your finger is already there.
    if (pop?.dataset.helpKey === hit.key) close();
    else show(hit.key, hit.anchor, hit.entry);
  };

  const onKey = (e) => {
    if (!on) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      disarm();
      return;
    }
    if (isNav(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  // Any reflow invalidates the card's position (sheet scroll, rotate, the tab
  // row swapping pages under it), and a card floating away from its anchor is
  // worse than no card.
  const reflow = () => close();

  const listen = (add) => {
    const fn = add ? "addEventListener" : "removeEventListener";
    doc[fn]("pointerdown", swallow, true);
    // pointerup is an activation edge now (session 27): the Options tabs and the
    // Format control both act on release, so a non-nav control left with a live
    // pointerup would switch state in help mode. `swallow` lets nav through and
    // neutralises everything else, whatever the event type.
    doc[fn]("pointerup", swallow, true);
    doc[fn]("click", swallow, true);
    doc[fn]("keydown", onKey, true);
    window[fn]("resize", reflow);
    window[fn]("scroll", reflow, true);
  };

  function arm() {
    if (on) return;
    on = true;
    doc.body.classList.add("help-on");
    liftDisabled(doc);
    listen(true);
    onChange?.(true);
    // Announce the mode with its own card, anchored to the "?" that armed it.
    // Without this you'd be looking at an unchanged screen wondering what the
    // button did — and it's where the version number lives now.
    const btn = doc.getElementById("open-help");
    if (btn && HELP["help-mode"]) show("help-mode", btn, HELP["help-mode"]);
  }

  function disarm() {
    if (!on) return;
    on = false;
    close();
    doc.body.classList.remove("help-on");
    restoreDisabled(doc);
    listen(false);
    onChange?.(false);
  }

  return {
    arm,
    disarm,
    toggle: () => (on ? disarm() : arm()),
    get on() {
      return on;
    },
    // for tests
    _shownKey: () => pop?.dataset.helpKey ?? null,
  };
}
