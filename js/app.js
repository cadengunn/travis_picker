// app.js — the only DOM-glue / stateful file. Reads controls, calls the pure
// generator, resolves against the chord(s), renders the grid. No persistence yet
// (beyond the theme preference).

import {
  CHORD_IDS,
  CHORDS,
  BASS_PRESETS,
  V1_BASS_IDS,
  CHAOS_IDS,
  CHAOS_PRESETS,
  PATTERN_LENGTHS,
  DEFAULT_PATTERN_BARS,
  KEY_IDS,
  KEYS,
  DEFAULT_KEY,
  PROGRESSIONS,
  CUSTOM_PROGRESSION_ID,
  progressionChords,
  detectProgression,
  degreeOf,
} from "./data.js";
import { generatePattern, resolvePhrase } from "./generator.js";
import { renderGrid } from "./grid.js";
import { initThemes, listThemes, applyTheme } from "./theme.js";

const el = (id) => document.getElementById(id);

const state = {
  pattern: null,        // last generated (relative/absolute) pattern
  labelMode: "fret",
  chordMode: "single",  // "single" | "progression"
  key: DEFAULT_KEY,
  progression: [],      // chord id per phrase bar (progression mode)
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
  fillSelect(el("key"), KEY_IDS, (k) => k, (k) => KEYS[k].name);
  fillSelect(el("bass"), BASS_PRESETS.filter((p) => V1_BASS_IDS.includes(p.id)), (p) => p.id, (p) => p.name);
  fillSelect(el("chaos"), CHAOS_IDS, (c) => c, (c) => CHAOS_PRESETS[c].name);
  fillSelect(el("pattern"), PATTERN_LENGTHS, (n) => n, (n) => `${n} bar${n > 1 ? "s" : ""}`);

  // Progression list + the "Custom" entry shown once bars stop matching a preset.
  fillSelect(el("progression"), PROGRESSIONS, (p) => p.id, (p) => p.name);
  const custom = document.createElement("option");
  custom.value = CUSTOM_PROGRESSION_ID;
  custom.textContent = "Custom";
  el("progression").appendChild(custom);

  el("key").value = state.key;
  el("pattern").value = String(DEFAULT_PATTERN_BARS);
}

// Distinct bars of right-hand pattern (the only length dial).
const patternBars = () => Number(el("pattern").value);

function readOptions() {
  return {
    bass: el("bass").value,
    chaos: el("chaos").value,
    patternBars: patternBars(),
  };
}

// Chords for the bars on screen — one per bar. In progression mode the
// progression sets the bar count; in single mode the pattern length does.
function phraseChords() {
  if (state.chordMode === "progression") {
    return state.progression;
  }
  return Array.from({ length: patternBars() }, () => el("chord").value);
}

// Keep the progression dropdown honest: a preset id, or "Custom".
function syncProgressionSelect() {
  if (state.chordMode !== "progression") return;
  el("progression").value = detectProgression(state.progression, state.key);
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
  syncProgressionSelect();

  const t = state.pattern.type;
  el("type-indicator").textContent =
    t === "absolute" ? "absolute — bass won't follow chords" : "relative";
  el("type-indicator").className = "type-indicator " + t;
}

function generate() {
  // Reference chord only affects absolute (random) generation; relative
  // patterns are re-resolved per bar anyway.
  state.pattern = generatePattern(phraseChords()[0], readOptions());
  render();
}

// ----- chord mode / key / progression -----
function setChordMode(mode) {
  state.chordMode = mode;
  const prog = mode === "progression";
  el("field-chord").hidden = prog;
  el("field-key").hidden = !prog;
  el("field-prog").hidden = !prog;
  for (const b of el("chord-mode").querySelectorAll("[data-mode]")) {
    b.classList.toggle("active", b.dataset.mode === mode);
  }
  if (prog && state.progression.length === 0) {
    applyProgressionPreset(PROGRESSIONS[0].id);
    return;
  }
  render();
}

function applyProgressionPreset(presetId) {
  if (presetId === CUSTOM_PROGRESSION_ID) return; // "Custom" is a readout, not a choice
  // The progression's own length sets the bar count.
  state.progression = progressionChords(presetId, state.key);
  render();
}

// Changing key transposes by degree: preset progressions re-resolve, and custom
// bars follow their degree where they have one (unknown chords stay put).
function setKey(newKey) {
  const oldKey = state.key;
  state.key = newKey;
  state.progression = state.progression.map((c) => {
    const deg = degreeOf(c, oldKey);
    return deg ? KEYS[newKey].degrees[deg] || c : c;
  });
  render();
}

// ----- wire up -----
function attach() {
  el("generate").addEventListener("click", generate);

  for (const id of ["bass", "chaos", "pattern"]) {
    el(id).addEventListener("change", generate);
  }
  el("chord").addEventListener("change", render);
  el("key").addEventListener("change", (e) => setKey(e.target.value));
  el("progression").addEventListener("change", (e) => applyProgressionPreset(e.target.value));

  el("chord-mode").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (btn) setChordMode(btn.dataset.mode);
  });

  // Per-bar chord edits, delegated so they survive re-renders.
  el("grid").addEventListener("change", (e) => {
    const sel = e.target.closest("select.bar-chord");
    if (!sel) return;
    state.progression[Number(sel.dataset.bar)] = sel.value;
    render();
  });

  el("label-mode").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-label]");
    if (!btn) return;
    state.labelMode = btn.dataset.label;
    for (const b of el("label-mode").querySelectorAll("[data-label]")) {
      b.classList.toggle("active", b.dataset.label === state.labelMode);
    }
    render();
  });

  el("theme").addEventListener("change", (e) => applyTheme(e.target.value));
}

// ----- boot -----
async function boot() {
  initControls();
  attach();
  generate(); // roll one immediately so the grid is never empty

  // Themes load async; the app is usable before they land.
  try {
    const active = await initThemes();
    fillSelect(el("theme"), listThemes(), (t) => t.id, (t) => t.name);
    el("theme").value = active;
  } catch (err) {
    console.error("Theme load failed; using stylesheet fallback.", err);
    el("theme").hidden = true;
  }
}

boot();
