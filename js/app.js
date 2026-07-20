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
import { generatePattern, resolvePhrase, regenerateBass, regenerateTreble } from "./generator.js";
import { renderGrid } from "./grid.js";
import { initThemes, listThemes, applyTheme } from "./theme.js";
import { savedStore } from "./storage.js";

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

// ----- saved library -----
// A saved item is musical content only: the pattern plus the chord context it
// was written against. Theme and label mode are app preferences, not content.
function currentContext() {
  return {
    chordMode: state.chordMode,
    chord: el("chord").value,
    key: state.key,
    progression: [...state.progression],
  };
}

function describeCurrent() {
  const bassName = BASS_PRESETS.find((b) => b.id === el("bass").value)?.name ?? el("bass").value;
  if (state.chordMode === "progression") {
    const id = detectProgression(state.progression, state.key);
    const prog = PROGRESSIONS.find((p) => p.id === id);
    return `${prog ? prog.name : "Custom"} in ${state.key} · ${bassName}`;
  }
  const n = patternBars();
  return `${el("chord").value} · ${bassName} · ${n} bar${n > 1 ? "s" : ""}`;
}

function refreshSavedCount() {
  const n = savedStore.count();
  el("open-saved").textContent = n ? `Saved (${n})` : "Saved";
}

function renderSavedList() {
  const list = el("saved-list");
  list.innerHTML = "";
  const items = savedStore.list();

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "saved-empty";
    li.textContent = "Nothing saved yet. Name the current pattern above to keep it.";
    list.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "saved-item";

    const meta = document.createElement("div");
    meta.className = "saved-meta";
    const name = document.createElement("div");
    name.className = "saved-name";
    name.textContent = item.name;
    const sub = document.createElement("div");
    sub.className = "saved-sub";
    sub.textContent = summarize(item);
    meta.append(name, sub);

    const load = document.createElement("button");
    load.className = "load";
    load.type = "button";
    load.textContent = "Load";
    load.addEventListener("click", () => loadSaved(item.id));

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
      savedStore.remove(item.id);
      renderSavedList();
      refreshSavedCount();
    });

    li.append(meta, load, del);
    list.appendChild(li);
  }
}

function summarize(item) {
  const ctx = item.context || {};
  const p = item.pattern || {};
  const bassName = BASS_PRESETS.find((b) => b.id === p.bass)?.name ?? p.bass;
  const where =
    ctx.chordMode === "progression"
      ? `${(ctx.progression || []).join("–")} (key ${ctx.key})`
      : ctx.chord;
  const bars = p.patternBars ? `${p.patternBars} bar${p.patternBars > 1 ? "s" : ""}` : "";
  return [where, bassName, p.chaos, bars].filter(Boolean).join(" · ");
}

function saveCurrent() {
  if (!state.pattern) return;
  const typed = el("save-name").value;
  const item = savedStore.save({
    name: typed.trim() || describeCurrent(),
    pattern: state.pattern,
    context: currentContext(),
  });
  const hint = el("save-hint");
  if (!item) {
    hint.textContent = "Couldn't save — browser storage is unavailable or full.";
    return;
  }
  el("save-name").value = "";
  hint.textContent = `Saved "${item.name}".`;
  renderSavedList();
  refreshSavedCount();
}

function loadSaved(id) {
  const item = savedStore.get(id);
  if (!item) return;
  const ctx = item.context || {};

  // Restore musical content only — theme and label mode stay as the user has them.
  state.pattern = item.pattern;
  state.key = ctx.key || DEFAULT_KEY;
  state.progression = [...(ctx.progression || [])];

  el("bass").value = item.pattern.bass;
  el("chaos").value = item.pattern.chaos;
  el("pattern").value = String(item.pattern.patternBars ?? 1);
  el("key").value = state.key;
  if (ctx.chord) el("chord").value = ctx.chord;

  setChordMode(ctx.chordMode === "progression" ? "progression" : "single");
  closeSheet();
}

function openSheet() {
  el("save-name").value = "";
  el("save-hint").textContent = "";
  el("save-name").placeholder = describeCurrent();
  renderSavedList();
  el("saved-sheet").hidden = false;
}
function closeSheet() {
  el("saved-sheet").hidden = true;
}

// ----- wire up -----
function attach() {
  el("generate").addEventListener("click", generate);

  // Pattern length changes the bar count, so it re-rolls everything.
  el("pattern").addEventListener("change", generate);

  // Thumb and Chaos each re-roll only their own layer, so you can audition bass
  // patterns under one finger part (and vice versa) without losing the other.
  el("bass").addEventListener("change", () => {
    state.pattern = regenerateBass(state.pattern, el("bass").value, phraseChords()[0]);
    render();
  });
  el("chaos").addEventListener("change", () => {
    state.pattern = regenerateTreble(state.pattern, el("chaos").value);
    render();
  });
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

  // Saved sheet
  el("open-saved").addEventListener("click", openSheet);
  el("save-btn").addEventListener("click", saveCurrent);
  el("save-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveCurrent();
  });
  el("saved-sheet").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el("saved-sheet").hidden) closeSheet();
  });
}

// ----- boot -----
async function boot() {
  initControls();
  attach();
  generate(); // roll one immediately so the grid is never empty
  refreshSavedCount();

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
