// wheel.js — the drum pickers: cylinders that roll under your thumb.
//
// WHY A WHEEL AND NOT A LIST (session 21, his call): the chord library is the full
// 12 × 3 matrix, so a flat list is 36 items — roughly a thousand pixels of
// scrolling in a panel that can only be 52vh tall. Root × quality is the shape of
// the data, and two reels are the mechanical way to say it: it reads like a part
// of the instrument rather than a menu, which is the language the rest of the
// faceplate speaks.
//
// TWO PICKERS SHARE ONE MECHANISM (v2.14.5). The second is Key × Progression,
// his call: "I see Key and Progression as a cross product similar to Chord and
// Quality. 'Let's play an E Major', 'Let's play a 1-4-5 in C'. Both very common
// guitar thoughts." That reframing is what made it buildable — I had been reading
// the axes as style × progression, which has holes (the styles hold 4/3/2/3/2
// members), and dismissed it. Key × progression is the thought a player actually
// has, and it's total within a mode.
//
// Both are RENDERERS, not controls (see dropdown.js): the native <select>s stay
// the source of truth, the trigger/catcher/Escape/reflow machinery is shared, and
// a pick is a bubbling `change`. So app.js's wiring and the #grid change
// delegation never learn this file exists.
//
// The reels are real scroll containers with CSS scroll-snap, NOT a hand-rolled
// drag: that buys iOS momentum, rubber-banding and detents for free, and they're
// physically right (a flick spins the barrel and it coasts to a stop). All this
// file adds on top is the cylinder's 3D and the two things a scroller can't say on
// its own — which name is in the window, and when it stopped moving.

import { ROOTS, QUALITIES, CHORDS, chordIdFor, splitChordId } from "./data.js";

const ITEM_H = 38;   // px per name; JS owns it and hands it to CSS (--reel-item)
const VISIBLE = 5;   // names in the window at once — an odd number has a centre
const SETTLE_MS = 110; // quiet time after the last scroll event before committing

// How far the barrel has turned by the time a name leaves the window.
//
// ROTATION ONLY — no translateZ. The scroll already puts each name in the right
// place; a stand-off from the axis moves it AGAIN, and under `perspective` that
// projection magnified the whole reel by ~16% about its centre. A 38px step
// rendered as 59px and the outermost names were pushed clean out of the housing,
// which is why the drum only ever showed three. Rotation alone foreshortens each
// face by cos θ, which is what a barrel's surface actually does.
const DEG_PER_STEP = 26;

// ---------------------------------------------------------------------------
// The mechanism: N cylinders on one axle, in one housing.
// ---------------------------------------------------------------------------

// `items` is [{ value, label, groupStart }]. `groupStart` engraves a machined
// groove above the name — that's how a curated list keeps its sections on a drum
// (his call for the progression reel), since the housing carries no captions.
function buildDrum(parent, { cls, legend, items, value, onSettle }, tick) {
  const drum = document.createElement("div");
  drum.className = `drum drum-${cls}`;
  parent.appendChild(drum);

  const el = document.createElement("div");
  el.className = `reel reel-${cls}`;
  el.tabIndex = 0;
  el.setAttribute("role", "listbox");
  // The reels keep their aria-labels: with no captions in the housing, this is
  // the only place the two halves are named to a screen reader.
  el.setAttribute("aria-label", legend);
  drum.appendChild(el);

  // The aperture, drawn on THIS drum's housing — one per cylinder, which is what
  // says they're two objects rather than one split list.
  const aperture = document.createElement("div");
  aperture.className = "drum-window";
  drum.appendChild(aperture);

  let faces = [];
  let list = [];
  let index = 0;
  let settleTimer = null;

  // The cylinder: each name is a facet of a barrel, so how far it has turned away
  // from the window is just its distance from centre. Done here rather than in CSS
  // because the angle is a function of scroll position.
  function paint() {
    const centre = el.scrollTop;
    for (let i = 0; i < faces.length; i++) {
      const d = i - centre / ITEM_H;
      const away = Math.abs(d);
      const { cell, face } = faces[i];
      face.style.transform = `rotateX(${(-d * DEG_PER_STEP).toFixed(2)}deg)`;
      face.style.opacity = String(Math.max(0, 1 - away * 0.17));
      cell.classList.toggle("in-window", away < 0.5);
      cell.setAttribute("aria-selected", away < 0.5 ? "true" : "false");
    }
  }

  function scrollToIndex(i, smooth) {
    el.scrollTo({ top: i * ITEM_H, behavior: smooth ? "smooth" : "auto" });
  }

  // Rebuilt rather than mutated, because the progression reel's contents change
  // wholesale when the key crosses the major/minor line — the one place these
  // axes aren't a total product, and the same boundary at which the app already
  // resets to that mode's first preset.
  function setItems(next, current) {
    list = next;
    faces = [];
    el.replaceChildren();
    const pad = document.createElement("div");
    pad.className = "reel-pad";
    el.appendChild(pad);
    // Two elements per name on purpose: the BUTTON is the detent (a scroll-snap
    // area is the element's *transformed* border box, so turning the button would
    // move its own notch and the reel would snap half a name off — measured), and
    // the FACE inside it is the facet that turns.
    list.forEach((it, i) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "reel-item";
      cell.setAttribute("role", "option");
      const face = document.createElement("span");
      face.className = "reel-face";
      if (it.groupStart && i > 0) face.classList.add("group-start");
      face.textContent = it.label;
      cell.appendChild(face);
      cell.addEventListener("click", () => scrollToIndex(i, true));
      el.appendChild(cell);
      faces.push({ cell, face });
    });
    el.appendChild(pad.cloneNode());
    index = Math.max(0, list.findIndex((it) => it.value === current));
    scrollToIndex(index, false);
    paint();
  }

  el.addEventListener("scroll", () => {
    paint();
    // A detent every time a name passes through the window. This is the whole
    // reason the tick exists: it's the barrel indexing, not a button.
    const at = Math.round(el.scrollTop / ITEM_H);
    if (at !== index && at >= 0 && at < list.length) {
      index = at;
      tick();
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => onSettle(list[index].value), SETTLE_MS);
  });

  el.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    scrollToIndex(Math.max(0, Math.min(list.length - 1, index + step)), true);
  });

  return {
    // Position and paint AFTER the panel is in the document — a scroll container
    // has no scrollTop until it has a height.
    open() { setItems(items(), value()); },
    setItems,
    list: () => list,
    cleanup() { clearTimeout(settleTimer); },
  };
}

// One housing, N drums, a hairline axle between each pair.
function buildHousing(panel, variant, specs, tick) {
  panel.classList.add("dd-wheel");
  if (variant) panel.classList.add(variant);
  panel.style.setProperty("--reel-item", `${ITEM_H}px`);
  panel.style.setProperty("--reel-visible", String(VISIBLE));

  // The panel HUGS the drums: dropdown.js's position() otherwise gives a panel
  // the trigger's width as a min-width, which is right for a list (it lines up
  // under the field) and wrong for a mechanism — the Options field was 289px and
  // left the two drums swimming in housing. The hug is still what decides the
  // width; since v2.14.3 the FIELD follows it (--wheel-w in styles.css), so the
  // two open as one object with each barrel under its own half.
  panel.dataset.hug = "1";

  const drums = document.createElement("div");
  drums.className = "wheel-drums";
  panel.append(drums);

  const built = [];
  specs.forEach((spec, i) => {
    if (i) {
      const rule = document.createElement("div");
      rule.className = "wheel-split";
      drums.appendChild(rule);
    }
    built.push(buildDrum(drums, spec, tick));
  });
  return built;
}

// Read a <select>'s options as reel items, marking where an <optgroup> begins so
// the drum can engrave a groove there.
function optionItems(select) {
  let group;
  return [...select.options].map((o) => {
    const label = o.parentElement.tagName === "OPTGROUP" ? o.parentElement.label : "";
    const groupStart = label !== group;
    group = label;
    return { value: o.value, label: o.textContent, groupStart };
  });
}

// ---------------------------------------------------------------------------
// CHORD × QUALITY — two reels writing ONE composite select value
// ---------------------------------------------------------------------------

export function createChordWheel({ tick = () => {} } = {}) {
  return function renderChordWheel(select, panel, { commit }) {
    const start = splitChordId(select.value) || { root: ROOTS[0].id, quality: QUALITIES[0].id };
    const chosen = { root: start.root, quality: start.quality };

    // The reels commit as they snap and the panel STAYS OPEN (his call): every
    // root × quality is a real chord, so there's no invalid half-set state to
    // protect against, and you can spin one reel, hear it, then spin the other.
    // `commit` comes from dropdown.js and targets whatever select is CURRENT — in
    // progression mode a pick re-renders the grid and replaces the one we opened
    // on, and capturing it here is what broke the second spin.
    const apply = () => commit(chordIdFor(chosen.root, chosen.quality));

    const reels = buildHousing(panel, null, [
      {
        cls: "root",
        legend: "Chord",
        items: () => ROOTS.map((r) => ({ value: r.id, label: r.name })),
        value: () => chosen.root,
        onSettle: (v) => { chosen.root = v; apply(); },
      },
      {
        cls: "quality",
        legend: "Quality",
        items: () => QUALITIES.map((q) => ({ value: q.id, label: q.name })),
        value: () => chosen.quality,
        onSettle: (v) => { chosen.quality = v; apply(); },
      },
    ], tick);

    return {
      afterOpen() { for (const r of reels) r.open(); },
      cleanup() { for (const r of reels) r.cleanup(); },
    };
  };
}

// ---------------------------------------------------------------------------
// KEY × PROGRESSION — two reels writing TWO selects
// ---------------------------------------------------------------------------

// `keySelect()` is looked up at call time rather than captured, for the same
// reason renderers commit through the handed `commit`: never hold an element
// across a render. (These two in particular are static in index.html, but the
// rule is cheap to keep and the next merged field may not be.)
//
// The panel is opened on the PROGRESSION select, so `commit` targets that one and
// the key reel writes through `commitKey`.
export function createKeyProgWheel({ tick = () => {}, keySelect, commitKey } = {}) {
  return function renderKeyProgWheel(select, panel, { commit }) {
    const reels = buildHousing(panel, "wheel-keyprog", [
      {
        cls: "key",
        legend: "Key",
        items: () => optionItems(keySelect()),
        value: () => keySelect().value,
        onSettle: (v) => {
          if (!commitKey(v)) return;
          // Crossing the major/minor line rebuilds the progression menu and lands
          // on that mode's first preset — the one hole in this product. Re-read
          // the select (app.js has already refilled it and set its value) and
          // re-cut the reel if the option set actually changed.
          const next = optionItems(select);
          const held = reels[1].list();
          const same = next.length === held.length
            && next.every((it, i) => it.value === held[i].value);
          if (!same) reels[1].setItems(next, select.value);
        },
      },
      {
        cls: "prog",
        legend: "Progression",
        items: () => optionItems(select),
        value: () => select.value,
        // "Custom" rides the end of the reel and is a READOUT, not a choice
        // (his call): picking it leaves the grid's chords exactly as they are,
        // which is already what applyProgressionPreset does. Editing a bar chord
        // makes app.js set this select to Custom, so the reel opens on it.
        onSettle: (v) => commit(v),
      },
    ], tick);

    return {
      afterOpen() { for (const r of reels) r.open(); },
      cleanup() { for (const r of reels) r.cleanup(); },
    };
  };
}

// ---------------------------------------------------------------------------
// Trigger faces
// ---------------------------------------------------------------------------

// The Options sheet's chord field shows the two halves SEPARATELY, under their own
// legends, because they're two controls that happen to open one panel. The per-bar
// chip keeps the single chord name (`C♯m`) — it's a chip on a bar, and there's no
// room to say it twice.
export function chordSplitLabel(select, labelEl) {
  const at = splitChordId(select.value);
  const root = document.createElement("span");
  root.className = "tl-half tl-root";
  root.textContent = at ? ROOTS.find((r) => r.id === at.root)?.name : select.value;
  const quality = document.createElement("span");
  quality.className = "tl-half tl-quality";
  quality.textContent = at ? QUALITIES.find((q) => q.id === at.quality)?.name : "";
  labelEl.replaceChildren(root, quality);
}

// The same face for Key × Progression. Reads BOTH selects, which is why
// enhanceSelect has to watch the key one too (see `watch` in dropdown.js) — a
// transpose or a load sets it programmatically and fires no `change`.
export function keyProgSplitLabel(keySelect) {
  return function label(select, labelEl) {
    const text = (sel) => sel.options[sel.selectedIndex]?.textContent || "";
    const key = document.createElement("span");
    key.className = "tl-half tl-key";
    key.textContent = text(keySelect());
    const prog = document.createElement("span");
    prog.className = "tl-half tl-prog";
    prog.textContent = text(select);
    labelEl.replaceChildren(key, prog);
  };
}

// What a chord is called. Exported so app.js and the grid can label a chord the
// same way the wheel spells it (C♯m, not C#m).
export const chordLabel = (id) => CHORDS[id]?.name || id;
