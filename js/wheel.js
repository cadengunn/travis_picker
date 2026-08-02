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

// `items` is [{ value, label, groupStart, group }]. A curated list carries its
// SECTIONS on the drum two ways (his call, session 29): a NAMED group prints its
// name as a non-selectable header facet riding the barrel (`.reel-head`), and an
// UNNAMED break (the ungrouped `Custom` after the styles) keeps the older machined
// groove, since there's no name to engrave. So the visual barrel is `rows` —
// headers interleaved with options — while `list` stays the pure options (1:1
// with the <select>), which is what index/commit and list() reason about.
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

  let faces = [];   // 1:1 with rows (headers + options) — the barrel's facets
  let rows = [];    // { head, label, value?, groove? } in barrel order
  let list = [];    // options only, 1:1 with the <select> — what commit reasons about
  let rowIndex = 0; // the centred ROW (headers included)
  let settleTimer = null;

  // Interleave section headers into the option list. A named group prints a header
  // before its first option; an unnamed break after a named group (Custom) marks
  // the following option for the plain groove instead.
  function toRows(opts) {
    const out = [];
    let prevGroup;
    for (const o of opts) {
      const g = o.group || "";
      if (g && g !== prevGroup) out.push({ head: true, label: g });
      out.push({ head: false, label: o.label, value: o.value, groove: !g && !!prevGroup });
      prevGroup = g;
    }
    return out;
  }

  const isOpt = (i) => rows[i] && !rows[i].head;
  // Headers are never a scroll-snap target, so at rest the centre is an option;
  // this only has to rescue the transient mid-drag frame and keyboard stepping.
  function nearestOpt(i) {
    if (isOpt(i)) return i;
    for (let k = 1; k < rows.length; k++) {
      if (isOpt(i - k)) return i - k;
      if (isOpt(i + k)) return i + k;
    }
    return i;
  }
  const rowOfValue = (v) => { const r = rows.findIndex((x) => !x.head && x.value === v); return r < 0 ? nearestOpt(0) : r; };

  // The cylinder: each facet is turned away from the window by its distance from
  // centre. Done here rather than in CSS because the angle is a function of scroll.
  function paint() {
    const centre = el.scrollTop;
    for (let i = 0; i < faces.length; i++) {
      const d = i - centre / ITEM_H;
      const away = Math.abs(d);
      const { cell, face, head } = faces[i];
      face.style.transform = `rotateX(${(-d * DEG_PER_STEP).toFixed(2)}deg)`;
      face.style.opacity = String(Math.max(0, 1 - away * 0.17));
      cell.classList.toggle("in-window", away < 0.5);
      if (!head) cell.setAttribute("aria-selected", away < 0.5 ? "true" : "false");
    }
  }

  function scrollToRow(i, smooth) {
    el.scrollTo({ top: i * ITEM_H, behavior: smooth ? "smooth" : "auto" });
  }

  // Rebuilt rather than mutated, because the progression reel's contents change
  // wholesale when the key crosses the major/minor line — the one place these
  // axes aren't a total product, and the same boundary at which the app already
  // resets to that mode's first preset.
  function setItems(next, current) {
    list = next;
    rows = toRows(next);
    faces = [];
    el.replaceChildren();
    const pad = document.createElement("div");
    pad.className = "reel-pad";
    el.appendChild(pad);
    // Two elements per row on purpose: the ITEM is the detent (a scroll-snap area
    // is the element's *transformed* border box, so turning the button would move
    // its own notch and the reel would snap half a name off — measured), and the
    // FACE inside it is the facet that turns. A header is the same two-part facet
    // but a <div> with no snap and no pointer, so a drag begun on it still scrolls.
    rows.forEach((row, i) => {
      const cell = document.createElement(row.head ? "div" : "button");
      const face = document.createElement("span");
      face.className = "reel-face";
      face.textContent = row.label;
      if (row.head) {
        cell.className = "reel-head";
        cell.setAttribute("aria-hidden", "true");
        face.classList.add("reel-head-face");
      } else {
        cell.type = "button";
        cell.className = "reel-item";
        cell.setAttribute("role", "option");
        if (row.groove) face.classList.add("group-start");
        cell.addEventListener("click", () => scrollToRow(i, true));
      }
      cell.appendChild(face);
      el.appendChild(cell);
      faces.push({ cell, face, head: row.head });
    });
    el.appendChild(pad.cloneNode());
    rowIndex = rowOfValue(current);
    scrollToRow(rowIndex, false);
    paint();
  }

  el.addEventListener("scroll", () => {
    paint();
    // A detent every time a facet passes through the window — headers included,
    // since a facet turning past the aperture is exactly what the tick reports.
    const at = Math.round(el.scrollTop / ITEM_H);
    if (at !== rowIndex && at >= 0 && at < rows.length) {
      rowIndex = at;
      tick();
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => onSettle(rows[nearestOpt(rowIndex)].value), SETTLE_MS);
  });

  el.addEventListener("keydown", (e) => {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    let r = rowIndex + dir;
    while (r >= 0 && r < rows.length && rows[r].head) r += dir; // skip headers
    if (r >= 0 && r < rows.length) scrollToRow(r, true);
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

// Read a <select>'s options as reel items, carrying each option's optgroup label
// so the drum can print a section header (named group) or cut a groove (the
// unnamed Custom break). `groupStart` is kept for anything still reading it.
function optionItems(select) {
  let group;
  return [...select.options].map((o) => {
    const label = o.parentElement.tagName === "OPTGROUP" ? o.parentElement.label : "";
    const groupStart = label !== group;
    group = label;
    return { value: o.value, label: o.textContent, groupStart, group: label };
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
        // `group` engraves a section header on the quality barrel (Triads /
        // Sevenths / Sixths / Suspended), the same mechanism the progression drum
        // uses — now that the reel carries up to a dozen qualities.
        items: () => QUALITIES.map((q) => ({ value: q.id, label: q.name, group: q.group })),
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
