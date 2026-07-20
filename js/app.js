// app.js — the only DOM-glue / stateful file. Reads controls, calls the pure
// generator, resolves against the chord(s), renders the grid. No persistence yet.

import {
  CHORD_IDS,
  CHORDS,
  BASS_PRESETS,
  V1_BASS_IDS,
  CHAOS_IDS,
  CHAOS_PRESETS,
  LOOP_OPTIONS,
  PHRASE_LENGTHS,
  PROGRESSIONS,
  fitProgression,
} from "./data.js";
import { generatePattern, resolvePhrase } from "./generator.js";
import { renderGrid } from "./grid.js";

const el = (id) => document.getElementById(id);

const state = {
  pattern: null,            // last generated (relative/absolute) pattern
  labelMode: "fret",
  chordMode: "single",      // "single" | "progression"
  progression: [],          // chord id per phrase bar (progression mode)
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
  fillSelect(el("progression"), PROGRESSIONS, (p) => p.id, (p) => p.name);
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

function phraseBars() {
  return Number(el("phrase").value);
}

function readOptions() {
  return {
    bass: el("bass").value,
    chaos: el("chaos").value,
    loop: el("loop").value,
    phraseBars: phraseBars(),
  };
}

// Chords for the current phrase: one per bar. Single mode fills every bar with
// the single chord; progression mode uses the per-bar list (kept length-fit).
function phraseChords() {
  const n = phraseBars();
  if (state.chordMode === "progression") {
    state.progression = fitProgression(state.progression, n);
    return state.progression;
  }
  return Array.from({ length: n }, () => el("chord").value);
}

// ----- render -----
function render() {
  if (!state.pattern) return;
  const chords = phraseChords();
  const phrase = resolvePhrase(state.pattern, chords);
  renderGrid(el("grid"), phrase, {
    labelMode: state.labelMode,
    editableChords: state.chordMode === "progression",
  });

  // Absolute-pattern indicator (bass won't follow chords) — matters most in
  // progression mode, but always shown so the model is visible.
  const t = state.pattern.type;
  el("type-indicator").textContent =
    t === "absolute" ? "absolute — bass won't follow chords" : "relative";
  el("type-indicator").className = "type-indicator " + t;
}

function generate() {
  // Reference chord only affects absolute (random) generation; relative
  // patterns are re-resolved per bar anyway. Use the first phrase chord.
  const ref = phraseChords()[0];
  state.pattern = generatePattern(ref, readOptions());
  render();
}

// ----- chord-mode switching -----
function setChordMode(mode) {
  state.chordMode = mode;
  const prog = mode === "progression";
  el("field-chord").hidden = prog;
  el("field-prog").hidden = !prog;
  for (const b of el("chord-mode").querySelectorAll("[data-mode]")) {
    b.classList.toggle("active", b.dataset.mode === mode);
  }
  if (prog && state.progression.length === 0) {
    // first entry into progression mode: seed from the selected preset
    applyProgressionPreset(el("progression").value);
    return; // applyProgressionPreset renders
  }
  render();
}

function applyProgressionPreset(presetId) {
  const preset = PROGRESSIONS.find((p) => p.id === presetId) || PROGRESSIONS[0];
  state.progression = fitProgression(preset.chords, phraseBars());
  render();
}

// ----- wire up -----
function attach() {
  el("generate").addEventListener("click", generate);

  // Regenerate when a generation input changes.
  for (const id of ["bass", "chaos", "loop"]) {
    el(id).addEventListener("change", generate);
  }
  // Phrase length changes the number of bars (and re-rolls so cell/phrase stay
  // consistent); progression is re-fit to the new length inside phraseChords().
  el("phrase").addEventListener("change", generate);

  // Single-chord change: just re-resolve (relative patterns follow the chord).
  el("chord").addEventListener("change", render);

  // Progression preset: fill the per-bar chords, then re-resolve.
  el("progression").addEventListener("change", (e) => applyProgressionPreset(e.target.value));

  // Chord-mode toggle.
  el("chord-mode").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (btn) setChordMode(btn.dataset.mode);
  });

  // Per-bar chord edits are delegated on the grid container (survives
  // re-renders). Changing one bar updates just that bar's chord.
  el("grid").addEventListener("change", (e) => {
    const sel = e.target.closest("select.bar-chord");
    if (!sel) return;
    const i = Number(sel.dataset.bar);
    state.progression = fitProgression(state.progression, phraseBars());
    state.progression[i] = sel.value;
    render();
  });

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
