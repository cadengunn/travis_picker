// wheel.js — the chord picker: two cylinders that roll under your thumb, one
// with the twelve roots printed on it and one with the qualities.
//
// WHY A WHEEL AND NOT A LIST (session 21, his call): the library is the full
// 12 × 3 matrix, so a flat list is 36 items — roughly a thousand pixels of
// scrolling in a panel that can only be 52vh tall. Root × quality is the shape
// of the data, and two reels are the mechanical way to say it: it reads like a
// part of the instrument rather than a menu, which is the language the rest of
// the faceplate speaks.
//
// It is a RENDERER, not a control (see dropdown.js): the native <select> stays
// the source of truth, the trigger/catcher/Escape/reflow machinery is shared,
// and a pick is `commit()` — the same bubbling `change` a native pick fires. So
// app.js's wiring and the #grid change delegation never learn this file exists.
//
// The reels are real scroll containers with CSS scroll-snap, NOT a hand-rolled
// drag: that buys iOS momentum, rubber-banding and detents for free, and they're
// physically right (a flick spins the barrel and it coasts to a stop). All this
// file adds on top is the cylinder's 3D and the two things a scroller can't say
// on its own — which name is in the window, and when it stopped moving.

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

export function createChordWheel({ tick = () => {} } = {}) {
  return function renderChordWheel(select, panel, { commit }) {
    panel.classList.add("dd-wheel");
    panel.style.setProperty("--reel-item", `${ITEM_H}px`);
    panel.style.setProperty("--reel-visible", String(VISIBLE));

    const start = splitChordId(select.value) || { root: ROOTS[0].id, quality: QUALITIES[0].id };
    const chosen = { root: start.root, quality: start.quality };

    // The panel HUGS the drums: dropdown.js's position() otherwise gives a panel
    // the trigger's width as a min-width, which is right for a list (it lines up
    // under the field) and wrong for a mechanism — the Options field was 289px
    // and left the two drums swimming in housing. The hug is still what decides
    // the width; since v2.14.3 the FIELD follows it (--wheel-w in styles.css),
    // not the reverse, so the two now open as one object.
    panel.dataset.hug = "1";

    // TWO DRUMS ON ONE AXLE (his call): the chord and its quality are separate
    // cylinders sitting next to each other and spinning freely, not two columns
    // of one list. Each gets its own housing and its own window, with a hairline
    // axle line between them. NO captions in here (his call, v2.14.2) — the
    // Options field already says Chord / Quality directly above, and on a bar
    // chip the drums are self-evident. The reels keep their `aria-label`s.
    const drums = document.createElement("div");
    drums.className = "wheel-drums";
    panel.append(drums);

    const reels = [
      buildDrum({
        cls: "root",
        legend: "Chord",
        items: ROOTS.map((r) => ({ value: r.id, label: r.name })),
        value: chosen.root,
        onSettle: (v) => { chosen.root = v; apply(); },
      }),
      split(),
      buildDrum({
        cls: "quality",
        legend: "Quality",
        items: QUALITIES.map((q) => ({ value: q.id, label: q.name })),
        value: chosen.quality,
        onSettle: (v) => { chosen.quality = v; apply(); },
      }),
    ];

    function split() {
      const rule = document.createElement("div");
      rule.className = "wheel-split";
      drums.appendChild(rule);
      return { open() {}, cleanup() {} };
    }

    // The reels commit as they snap and the panel STAYS OPEN (his call): every
    // root × quality is a real chord, so there's no invalid half-set state to
    // protect against, and you can spin one reel, hear it, then spin the other.
    // `commit` comes from dropdown.js and targets whatever select is CURRENT —
    // in progression mode a pick re-renders the grid and replaces the one we
    // opened on, and capturing it here is what broke the second spin.
    function apply() {
      commit(chordIdFor(chosen.root, chosen.quality));
    }

    function buildDrum({ cls, legend, items, value, onSettle }) {
      const drum = document.createElement("div");
      drum.className = `drum drum-${cls}`;
      drums.appendChild(drum);

      const el = document.createElement("div");
      el.className = `reel reel-${cls}`;
      el.tabIndex = 0;
      el.setAttribute("role", "listbox");
      el.setAttribute("aria-label", legend);
      drum.appendChild(el);

      // The aperture, drawn on THIS drum's housing — one per cylinder, which is
      // what says they're two objects rather than one split list.
      const aperture = document.createElement("div");
      aperture.className = "drum-window";
      drum.appendChild(aperture);

      const pad = document.createElement("div");
      pad.className = "reel-pad";
      el.appendChild(pad);
      // Two elements per name on purpose: the BUTTON is the detent (a scroll-
      // snap area is the element's *transformed* border box, so turning the
      // button would move its own notch and the reel would snap half a name
      // off — measured), and the FACE inside it is the facet that turns.
      const faces = [];
      items.forEach((it, i) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "reel-item";
        cell.setAttribute("role", "option");
        const face = document.createElement("span");
        face.className = "reel-face";
        face.textContent = it.label;
        cell.appendChild(face);
        cell.addEventListener("click", () => scrollToIndex(i, true));
        el.appendChild(cell);
        faces.push({ cell, face });
      });
      el.appendChild(pad.cloneNode());

      let index = Math.max(0, items.findIndex((it) => it.value === value));
      let settleTimer = null;

      // The cylinder: each name is a facet of a barrel, so how far it has turned
      // away from the window is just its distance from centre. Done here rather
      // than in CSS because the angle is a function of scroll position.
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

      el.addEventListener("scroll", () => {
        paint();
        // A detent every time a name passes through the window. This is the
        // whole reason the tick exists: it's the barrel indexing, not a button.
        const at = Math.round(el.scrollTop / ITEM_H);
        if (at !== index && at >= 0 && at < items.length) {
          index = at;
          tick();
        }
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => onSettle(items[index].value), SETTLE_MS);
      });

      el.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        scrollToIndex(Math.max(0, Math.min(items.length - 1, index + step)), true);
      });

      return {
        // Position and paint AFTER the panel is in the document — a scroll
        // container has no scrollTop until it has a height.
        open() { scrollToIndex(index, false); paint(); },
        cleanup() { clearTimeout(settleTimer); },
      };
    }

    return {
      afterOpen() { for (const r of reels) r.open(); },
      cleanup() { for (const r of reels) r.cleanup(); },
    };
  };
}

// The Options sheet's chord field shows the two halves SEPARATELY, under their
// own legends, because they're two controls that happen to open one panel. The
// per-bar chip keeps the single chord name (`C♯m`) — it's a chip on a bar, and
// there's no room to say it twice.
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

// What a chord is called. Exported so app.js and the grid can label a chord the
// same way the wheel spells it (C♯m, not C#m).
export const chordLabel = (id) => CHORDS[id]?.name || id;
