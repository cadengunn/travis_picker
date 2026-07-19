// app.js — the only DOM-glue / stateful file. Reads controls, calls the pure
// generator, resolves against the chord, renders the grid. No persistence yet.

import {
  CHORD_IDS,
  CHORDS,
  BASS_PRESETS,
  V1_BASS_IDS,
  CHAOS_IDS,
  CHAOS_PRESETS,
  LOOP_OPTIONS,
  PHRASE_LENGTHS,
} from "./data.js";
import { generatePattern, resolvePattern } from "./generator.js";
import { renderGrid } from "./grid.js";

const el = (id) => document.getElementById(id);

const state = {
  pattern: null,   // last generated (relative/absolute) pattern
  labelMode: "fret",
};

// ----- populate controls from data -----
function fillSelect(select, items, getVal, getLabel) {
  select.innerHTML = "";
  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = getVal(it);
    opt.textContent = getLabel(it);
    select.appendChild(opt);
  }
}

function initControls() {
  fillSelect(el("chord"), CHORD_IDS, (c) => c, (c) => CHORDS[c].name);
  fillSelect(
    el("bass"),
    BASS_PRESETS.filter((p) => V1_BASS_IDS.includes(p.id)),
    (p) => p.id,
    (p) => p.name
  );
  fillSelect(el("chaos"), CHAOS_IDS, (c) => c, (c) => CHAOS_PRESETS[c].name);
  fillSelect(el("loop"), LOOP_OPTIONS, (o) => o.id, (o) => o.name);
  fillSelect(el("phrase"), PHRASE_LENGTHS, (n) => n, (n) => `${n} bars`);
}

function readOptions() {
  return {
    bass: el("bass").value,
    chaos: el("chaos").value,
    loop: el("loop").value,
    phraseBars: Number(el("phrase").value),
  };
}

// ----- render -----
function render() {
  if (!state.pattern) return;
  const chordId = el("chord").value;
  const resolved = resolvePattern(state.pattern, chordId);
  renderGrid(el("grid"), resolved, { labelMode: state.labelMode, chord: chordId });

  // Absolute-pattern indicator (bass won't follow chords).
  el("type-indicator").textContent =
    state.pattern.type === "absolute"
      ? "absolute — bass won't follow chords"
      : "relative";
  el("type-indicator").className =
    "type-indicator " + state.pattern.type;
}

function generate() {
  const chordId = el("chord").value;
  state.pattern = generatePattern(chordId, readOptions());
  render();
}

// ----- wire up -----
function attach() {
  el("generate").addEventListener("click", generate);

  // Regenerate when a generation input changes (chord just re-resolves).
  for (const id of ["bass", "chaos", "loop", "phrase"]) {
    el(id).addEventListener("change", generate);
  }
  // Chord change only needs a re-resolve of the existing pattern (relative
  // patterns follow the chord; absolute stay put).
  el("chord").addEventListener("change", render);

  // Label toggle: pure re-render, no re-roll.
  el("label-mode").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-label]");
    if (!btn) return;
    state.labelMode = btn.dataset.label;
    for (const b of el("label-mode").querySelectorAll("[data-label]")) {
      b.classList.toggle("active", b.dataset.label === state.labelMode);
    }
    render();
  });
}

initControls();
attach();
generate(); // roll one on load
