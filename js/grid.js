// grid.js — renders a resolved phrase into the drum-machine grid.
// One component for everything (display now; editing/playback later). No
// generation logic here. Both label modes are pure transforms of the events.
//
// Input `phrase` is an array of { chord, bar } — one entry per phrase bar,
// already resolved (each event has string+fret). See generator.resolvePhrase /
// resolvePattern+expandToPhrase.

import { CHORDS, CHORD_IDS } from "./data.js";

const STRING_ROWS = [1, 2, 3, 4, 5, 6]; // top->bottom: high E (1) ... low E (6)
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const BEAT_LABEL = { 1: "1", 3: "2", 5: "3", 7: "4", 2: "&", 4: "&", 6: "&", 8: "&" };

// Build a fast lookup: slot -> string -> event
function indexBar(bar) {
  const map = new Map();
  for (const ev of bar) {
    if (!map.has(ev.slot)) map.set(ev.slot, new Map());
    map.get(ev.slot).set(ev.string, ev);
  }
  return map;
}

function labelFor(ev, labelMode) {
  if (labelMode === "none") return "";     // dot only
  if (labelMode === "pima") return ev.finger;
  return String(ev.fret ?? 0);             // fret mode
}

// Bar header. In progression mode it holds an editable chord <select>
// (data-bar lets app.js delegate the change) — that alone is reading order
// enough (left-right, top-bottom), so there's no separate bar-number chip
// (removed session 36; his call — "it's clear enough you read left-right top
// to bottom", and it doubled as easy-to-miss on light themes anyway). In
// single mode the header carries NO chord — the one chord is shown once, big,
// above the whole grid (#chord-head), so a per-bar header there would just
// repeat it; an empty header collapses via CSS.
//
// Under ×2 (always exactly 4 bars when it's active — see app.js's x2Active),
// it also carries two small pass lamps at the top-left corner: left lights on
// the first pass through this bar's chord, right on the second. app.js's
// playhead lights them directly (same no-re-render approach as the cell
// highlight) by querying `passLampSelector()` below, so the markup only needs
// to exist — nothing here drives it live. Omitted entirely (not hidden) when
// x2 is false.
//
// THE SELECTOR LIVES HERE, beside the markup it has to match, and app.js
// imports it — it must never be re-typed at the call site. Session 36b: it was,
// as `.pass-lamp[data-bar=…][data-pass=…]`, and matched nothing, because
// `data-bar` is on the CONTAINER and only `data-pass` is on the lamp. The lamps
// silently never lit, and a test that asserted the markup's SHAPE (counts,
// data-attrs) passed the whole time — shape is not the contract, the query is.
export function passLampSelector(bar, pass) {
  return `.pass-lamps[data-bar="${bar}"] .pass-lamp[data-pass="${pass}"]`;
}

function buildHeader(chordId, barIdx, editableChords, x2) {
  const header = document.createElement("div");
  header.className = "bar-header";

  if (x2) {
    const lamps = document.createElement("span");
    lamps.className = "pass-lamps";
    lamps.dataset.bar = String(barIdx);
    for (let pass = 0; pass < 2; pass++) {
      const lamp = document.createElement("span");
      lamp.className = "pass-lamp";
      lamp.dataset.pass = String(pass);
      lamps.appendChild(lamp);
    }
    header.appendChild(lamps);
  }

  if (editableChords) {
    const sel = document.createElement("select");
    sel.className = "bar-chord";
    sel.dataset.bar = String(barIdx);
    // Flat, and in wheel order: the chord picker is two reels now (root ×
    // quality), so the <select> is pure source-of-truth and its option ORDER is
    // never seen. It still holds every chord, because that's what makes
    // select.value assignable to any of them.
    for (const c of CHORD_IDS) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = CHORDS[c].name;
      if (c === chordId) opt.selected = true;
      sel.appendChild(opt);
    }
    header.appendChild(sel);
    // No `data-help` here, deliberately (v2.13.6, his call). The picker had its
    // own card for one version; the grid's card now covers it in a second
    // paragraph instead, so a tap falls through to `#grid` like every other tap
    // inside the grid. That fall-through was a BUG in v2.13.4 — the grid card
    // said nothing about chords, so it explained the wrong thing — and is
    // correct now only because the copy was rewritten to cover it. Re-check the
    // grid entry in `data.js` before changing either.
  }
  return header;
}

// renderGrid(container, phrase, { labelMode, editableChords, editable, x2 })
export function renderGrid(container, phrase, opts = {}) {
  const labelMode = opts.labelMode || "fret";
  const editableChords = !!opts.editableChords;
  const editable = !!opts.editable;
  const x2 = !!opts.x2;
  container.innerHTML = "";

  const track = document.createElement("div");
  track.className = "grid-track";
  if (editable) track.classList.add("editable");
  // Drives the responsive layout: every bar must be on screen at once (no
  // scrolling while your hands are on the guitar), so CSS sizes cells from the
  // bar count rather than using a fixed cell width.
  track.dataset.bars = String(phrase.length);

  phrase.forEach(({ chord, bar }, barIdx) => {
    const barEl = document.createElement("div");
    barEl.className = "bar";
    barEl.setAttribute("role", "group");
    barEl.setAttribute("aria-label", `Bar ${barIdx + 1}, chord ${chord}`);

    barEl.appendChild(buildHeader(chord, barIdx, editableChords, x2));

    const idx = indexBar(bar);

    // Rows top->bottom: strings 1..6 (low E at the bottom).
    STRING_ROWS.forEach((string) => {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      rowEl.classList.add(string >= 4 ? "domain-thumb" : "domain-finger");
      if (string === 3) rowEl.classList.add("domain-divider");

      SLOTS.forEach((slot) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.classList.add(slot % 2 === 1 ? "beat" : "offbeat");
        // Coordinates for tap-to-edit; app.js only acts on them in edit mode.
        cell.dataset.bar = String(barIdx);
        cell.dataset.slot = String(slot);
        cell.dataset.string = String(string);

        const ev = idx.get(slot)?.get(string);
        if (ev) {
          const dot = document.createElement("span");
          dot.className = "note";
          dot.classList.add(ev.finger === "p" ? "note-thumb" : "note-finger");
          dot.textContent = labelFor(ev, labelMode);
          cell.appendChild(dot);
          cell.classList.add("filled");
        }
        rowEl.appendChild(cell);
      });

      barEl.appendChild(rowEl);
    });

    // Beat-number ruler under the bar (1 & 2 & 3 & 4 &).
    const ruler = document.createElement("div");
    ruler.className = "ruler";
    SLOTS.forEach((slot) => {
      const tick = document.createElement("div");
      tick.className = "tick";
      tick.classList.add(slot % 2 === 1 ? "beat" : "offbeat");
      tick.textContent = BEAT_LABEL[slot];
      ruler.appendChild(tick);
    });
    barEl.appendChild(ruler);

    track.appendChild(barEl);
  });

  container.appendChild(track);
}
