// grid.js — renders a resolved phrase into the drum-machine grid.
// One component for everything (display now; editing/playback later). No
// generation logic here. Both label modes are pure transforms of the events.
//
// Input `phrase` is an array of { chord, bar } — one entry per phrase bar,
// already resolved (each event has string+fret). See generator.resolvePhrase /
// resolvePattern+expandToPhrase.

import { CHORD_IDS, CHORDS } from "./data.js";

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

// Bar header. When there's more than one bar on screen, it leads with a small
// numeral chip (its own "home") so the 2x2 reading order is unambiguous. In
// progression mode it also holds an editable chord <select> (data-bar lets
// app.js delegate the change). In single mode it carries NO chord — the one
// chord is shown once, big, above the whole grid (#chord-head), so a per-bar
// header there would just repeat it; an empty header collapses via CSS.
function buildHeader(chordId, barIdx, editableChords, showNumeral) {
  const header = document.createElement("div");
  header.className = "bar-header";

  if (showNumeral) {
    const num = document.createElement("span");
    num.className = "bar-num";
    num.textContent = String(barIdx + 1);
    header.appendChild(num);
  }

  if (editableChords) {
    const sel = document.createElement("select");
    sel.className = "bar-chord";
    sel.dataset.bar = String(barIdx);
    for (const c of CHORD_IDS) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = CHORDS[c].name;
      if (c === chordId) opt.selected = true;
      sel.appendChild(opt);
    }
    header.appendChild(sel);
  }
  return header;
}

// renderGrid(container, phrase, { labelMode, editableChords })
export function renderGrid(container, phrase, opts = {}) {
  const labelMode = opts.labelMode || "fret";
  const editableChords = !!opts.editableChords;
  const editable = !!opts.editable;
  container.innerHTML = "";

  const track = document.createElement("div");
  track.className = "grid-track";
  if (editable) track.classList.add("editable");
  // Drives the responsive layout: every bar must be on screen at once (no
  // scrolling while your hands are on the guitar), so CSS sizes cells from the
  // bar count rather than using a fixed cell width.
  track.dataset.bars = String(phrase.length);
  const showNumeral = phrase.length > 1;

  phrase.forEach(({ chord, bar }, barIdx) => {
    const barEl = document.createElement("div");
    barEl.className = "bar";
    barEl.setAttribute("role", "group");
    barEl.setAttribute("aria-label", `Bar ${barIdx + 1}, chord ${chord}`);

    barEl.appendChild(buildHeader(chord, barIdx, editableChords, showNumeral));

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
