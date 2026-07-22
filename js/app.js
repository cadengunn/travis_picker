// app.js — the only DOM-glue / stateful file. Reads controls, calls the pure
// generator, resolves against the chord(s), renders the grid. No persistence yet
// (beyond the theme preference).

import {
  CHORD_IDS,
  CHORDS,
  DEFAULT_CHORD,
  BASS_PRESETS,
  CHAOS_IDS,
  CHAOS_PRESETS,
  PATTERN_LENGTHS,
  DEFAULT_PATTERN_BARS,
  LABEL_MODES,
  KEY_IDS,
  KEYS,
  DEFAULT_KEY,
  PROGRESSIONS,
  CUSTOM_PROGRESSION_ID,
  progressionChords,
  detectProgression,
  degreeOf,
  midiOf,
} from "./data.js";
import {
  generatePattern,
  resolvePhrase,
  regenerateBass,
  regenerateTreble,
  setPatternBars,
} from "./generator.js";
import { renderGrid } from "./grid.js";
import { initThemes, listThemes, applyTheme } from "./theme.js";
import { savedStore } from "./storage.js";
import { toggleNote } from "./editor.js";
import { createMetronome, DEFAULT_BPM } from "./metronome.js";

const el = (id) => document.getElementById(id);

const state = {
  pattern: null,        // last generated (relative/absolute) pattern
  labelMode: "fret",
  chordMode: "single",  // "single" | "progression"
  key: DEFAULT_KEY,
  progression: [],      // chord id per phrase bar (progression mode)
  loaded: null,         // { id, name } of the saved pattern on screen, if any
  dirty: false,         // has it been altered since it was loaded/saved?
  editing: false,       // manual edit mode (off by default: no accidental taps)
  unsavedEdits: false,  // hand-drawn changes not yet written to the library
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
  fillSelect(el("bass"), BASS_PRESETS, (p) => p.id, (p) => p.name);
  fillSelect(el("chaos"), CHAOS_IDS, (c) => c, (c) => CHAOS_PRESETS[c].name);
  fillSelect(el("pattern"), PATTERN_LENGTHS, (n) => n, (n) => `${n} bar${n > 1 ? "s" : ""}`);
  fillSelect(el("label-mode"), LABEL_MODES, (m) => m.id, (m) => m.name);

  // Progression list + the "Custom" entry shown once bars stop matching a preset.
  fillSelect(el("progression"), PROGRESSIONS, (p) => p.id, (p) => p.name);
  const custom = document.createElement("option");
  custom.value = CUSTOM_PROGRESSION_ID;
  custom.textContent = "Custom";
  el("progression").appendChild(custom);

  el("chord").value = DEFAULT_CHORD;
  el("key").value = state.key;
  el("pattern").value = String(DEFAULT_PATTERN_BARS);
  el("bpm").value = String(DEFAULT_BPM);
  el("bpm-value").textContent = String(DEFAULT_BPM);
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

// The name of the saved pattern on screen. Anything that alters the pattern or
// its chord context marks it modified, so the label never lies about what
// you're looking at.
function markDirty() {
  if (state.loaded) {
    state.dirty = true;
    renderLoadedName();
  }
}

function renderLoadedName() {
  const box = el("loaded-name");
  if (!state.loaded) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.innerHTML = "";
  const name = document.createElement("span");
  name.textContent = state.loaded.name;
  box.appendChild(name);
  if (state.dirty) {
    const mod = document.createElement("span");
    mod.className = "modified";
    mod.textContent = "· modified";
    box.appendChild(mod);
  }
}

// ----- render -----
function render() {
  if (!state.pattern) return;
  const chords = phraseChords();
  const phrase = resolvePhrase(state.pattern, chords);
  renderGrid(el("grid"), phrase, {
    labelMode: state.labelMode,
    editableChords: state.chordMode === "progression",
    editable: state.editing,
  });
  syncProgressionSelect();
  // Re-rendering drops the playhead's cells; keep the loop length in sync too.
  litCells = [];
  metronome.setBars(chords.length);
  // Feed the resolved notes to the metronome so Play hears exactly what's on
  // screen — rebuilt every render, so edits/re-rolls/chord changes carry over.
  metronome.setNotes(noteTable(phrase));

  // Short label in the bar, full explanation on hover/long-press.
  //
  // `relative` is the normal case and the one where the bass just does what you
  // expect, so saying so is noise. The indicator only earns its space as a
  // warning: these bass notes will NOT follow the chords. (The spec asks for
  // exactly that — "a small 'absolute — bass won't follow chords' indicator,
  // never an error" — it was only ever the relative case that was gratuitous.)
  const t = state.pattern.type;
  const LABEL = { absolute: "absolute bass", mixed: "mixed bass" };
  const DETAIL = {
    absolute: "Bass won't follow chord changes.",
    mixed: "Some bass notes won't follow chord changes.",
  };
  const ind = el("type-indicator");
  ind.hidden = !LABEL[t];
  ind.textContent = LABEL[t] ?? "";
  ind.title = DETAIL[t] ?? "";
  ind.className = "type-indicator " + t;
}

// Hand-drawn work is the only thing here that can't be re-rolled back, so warn
// before anything throws it away. Returns false if the user backs out.
function confirmDiscardEdits(what) {
  if (!state.unsavedEdits) return true;
  return confirm(`You have unsaved edits. ${what}\n\nContinue?`);
}

function generate() {
  if (!confirmDiscardEdits("Generating will replace the whole pattern.")) return;
  // Reference chord only affects absolute (random) generation; relative
  // patterns are re-resolved per bar anyway.
  state.pattern = generatePattern(phraseChords()[0], readOptions());
  state.unsavedEdits = false;
  // A fresh roll is no longer the saved pattern at all.
  state.loaded = null;
  state.dirty = false;
  renderLoadedName();
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
  markDirty();
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
  markDirty();
  render();
}

// ----- metronome -----
// Resolved phrase -> step->notes table for playback. A step is the global 8th
// index (bar*8 + slot-1), matching the metronome's own stepping. Thumb events
// (finger "p") are flagged bass so the synth gives them more weight.
function noteTable(phrase) {
  const table = [];
  phrase.forEach(({ bar }, barIdx) => {
    for (const ev of bar) {
      const step = barIdx * 8 + (ev.slot - 1);
      (table[step] ||= []).push({ midi: midiOf(ev), bass: ev.finger === "p" });
    }
  });
  return table;
}

// Play emits two independent layers — the click and the plucked pattern — each
// an on/off preference (default on) persisted like the theme. localStorage may
// throw in private mode; fall back to the defaults rather than break boot.
const AUDIO_KEY = "tp-audio";
const audioPrefs = { click: true, pattern: true };
function loadAudioPrefs() {
  try {
    Object.assign(audioPrefs, JSON.parse(localStorage.getItem(AUDIO_KEY) || "{}"));
  } catch {}
}
function saveAudioPrefs() {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(audioPrefs));
  } catch {}
}

// The playhead touches cells directly rather than re-rendering the grid — it
// moves up to 8 times a bar and a full re-render would be wasteful (and would
// fight edit mode).
let litCells = [];
function highlightColumn(pos) {
  for (const c of litCells) c.classList.remove("playing");
  litCells = [];
  if (!pos) return;
  litCells = [...el("grid").querySelectorAll(
    `.cell[data-bar="${pos.bar}"][data-slot="${pos.slot}"]`
  )];
  for (const c of litCells) c.classList.add("playing");
}

function showCountIn(n) {
  const track = el("grid").querySelector(".grid-track");
  if (track) track.classList.toggle("counting", n != null);
  // Glyph-only now that Play is a 44px square: the count-in shows the bare
  // digit, which is all you can read at arm's length anyway.
  const play = el("play");
  play.textContent = n != null ? String(n) : metronome.running ? "■" : "▶";
  play.setAttribute(
    "aria-label",
    n != null ? `Counting in, beat ${n}` : metronome.running ? "Stop metronome" : "Start metronome"
  );
}

const metronome = createMetronome({
  onStep: (pos) => {
    // The first real step ends the count-in — nothing else reports that.
    if (pos) showCountIn(null);
    highlightColumn(pos);
  },
  onCountIn: showCountIn,
});

async function togglePlay() {
  if (metronome.running) {
    metronome.stop();
    el("play").setAttribute("aria-pressed", "false");
    showCountIn(null); // clears the dim and resets the label
    return;
  }
  el("play").setAttribute("aria-pressed", "true");
  el("play").textContent = "■";
  // Started from the click handler so iOS Safari unlocks audio.
  await metronome.start(phraseChords().length);
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
  el("open-load").textContent = n ? `Load (${n})` : "Load";
  el("open-load").disabled = n === 0;
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
    source: state.pattern.edited ? "drawn" : "generated",
  });
  const hint = el("save-hint");
  if (!item) {
    hint.textContent = "Couldn't save — browser storage is unavailable or full.";
    return;
  }
  el("save-name").value = "";
  hint.textContent = `Saved "${item.name}".`;
  // What's on screen IS this saved pattern now.
  state.loaded = { id: item.id, name: item.name };
  state.dirty = false;
  state.unsavedEdits = false;
  renderLoadedName();
  renderSavedList();
  refreshSavedCount();
}

function loadSaved(id) {
  const item = savedStore.get(id);
  if (!item) return;
  if (!confirmDiscardEdits("Loading will replace the pattern on screen.")) return;
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
  state.loaded = { id: item.id, name: item.name };
  state.dirty = false;
  state.unsavedEdits = false;
  renderLoadedName();
  closeSheet();
}

// One sheet, two modes: Save shows the name field, Load shows the library.
function openSheet(mode) {
  const saving = mode === "save";
  el("saved-title").textContent = saving ? "Save" : "Load";
  el("save-section").hidden = !saving;
  el("saved-list").hidden = saving;

  if (saving) {
    el("save-name").value = "";
    el("save-hint").textContent = "";
    el("save-name").placeholder = describeCurrent();
  } else {
    renderSavedList();
  }
  el("saved-sheet").hidden = false;
  if (saving) el("save-name").focus();
}
function closeSheet() {
  el("saved-sheet").hidden = true;
}

// ----- wire up -----
function attach() {
  el("generate").addEventListener("click", generate);

  // Pattern length EXTENDS rather than re-rolls: growing duplicates what you
  // already have (so hand-drawn work survives when you need more room), and the
  // copies can then be edited independently.
  el("pattern").addEventListener("change", () => {
    state.pattern = setPatternBars(state.pattern, Number(el("pattern").value));
    markDirty();
    render();
  });

  // Thumb and Chaos each re-roll only their own layer, so you can audition bass
  // patterns under one finger part (and vice versa) without losing the other.
  el("bass").addEventListener("change", () => {
    if (!confirmDiscardEdits("Re-rolling the bass will discard your edits to it.")) {
      el("bass").value = state.pattern.bass; // put the control back
      return;
    }
    state.pattern = regenerateBass(state.pattern, el("bass").value, phraseChords()[0]);
    markDirty();
    render();
  });
  el("chaos").addEventListener("change", () => {
    if (!confirmDiscardEdits("Re-rolling the fingers will discard your edits to them.")) {
      el("chaos").value = state.pattern.chaos;
      return;
    }
    state.pattern = regenerateTreble(state.pattern, el("chaos").value);
    markDirty();
    render();
  });
  el("chord").addEventListener("change", () => { markDirty(); render(); });
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
    markDirty();
    render();
  });

  el("label-mode").addEventListener("change", (e) => {
    state.labelMode = e.target.value;
    render();
  });

  el("theme").addEventListener("change", (e) => applyTheme(e.target.value));

  // Transport
  el("play").addEventListener("click", togglePlay);
  el("bpm").addEventListener("input", (e) => {
    el("bpm-value").textContent = metronome.setBpm(Number(e.target.value));
  });

  // What Play emits: independent Click and Pattern toggles (persisted).
  el("click-toggle").addEventListener("change", (e) => {
    audioPrefs.click = e.target.checked;
    metronome.setClickEnabled(audioPrefs.click);
    saveAudioPrefs();
  });
  el("pattern-toggle").addEventListener("change", (e) => {
    audioPrefs.pattern = e.target.checked;
    metronome.setPatternEnabled(audioPrefs.pattern);
    saveAudioPrefs();
  });

  // Manual editing — off by default so taps can't nudge a pattern mid-practice.
  el("edit-toggle").addEventListener("click", () => {
    state.editing = !state.editing;
    el("edit-toggle").setAttribute("aria-pressed", String(state.editing));
    render();
  });

  // Tap a cell to toggle a note. A short pattern repeating across a longer
  // progression shares one cell, so editing any repeat edits them all.
  el("grid").addEventListener("click", (e) => {
    if (!state.editing) return;
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const screenBar = Number(cell.dataset.bar);
    const chords = phraseChords();
    state.pattern = toggleNote(state.pattern, {
      cellIndex: screenBar % state.pattern.bars.length,
      slot: Number(cell.dataset.slot),
      string: Number(cell.dataset.string),
      chordId: chords[screenBar],
    });
    state.unsavedEdits = true;
    markDirty();
    render();
  });

  // Save / Load sheets
  el("open-save").addEventListener("click", () => openSheet("save"));
  el("open-load").addEventListener("click", () => openSheet("load"));
  el("save-btn").addEventListener("click", saveCurrent);
  el("save-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveCurrent();
  });
  el("saved-sheet").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeSheet();
  });

  // Options sheet: generation inputs + preferences. Its controls are wired
  // above exactly as before — the sheet only changes where they live.
  el("open-options").addEventListener("click", () => {
    el("options-sheet").hidden = false;
  });
  el("options-sheet").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) el("options-sheet").hidden = true;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!el("saved-sheet").hidden) closeSheet();
    else el("options-sheet").hidden = true;
  });
}

// Register the offline service worker — but ONLY on the real HTTPS origin.
// On localhost a cache-first SW would fight serve.py's no-store and feed you
// stale code while developing; over `--lan` (plain http) the browser blocks SW
// registration anyway. So it runs only where it should: the Pages deploy.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) =>
      console.error("Service worker registration failed.", err));
  });
}

// ----- boot -----
async function boot() {
  initControls();
  loadAudioPrefs();
  el("click-toggle").checked = audioPrefs.click;
  el("pattern-toggle").checked = audioPrefs.pattern;
  metronome.setClickEnabled(audioPrefs.click);
  metronome.setPatternEnabled(audioPrefs.pattern);
  attach();
  registerServiceWorker();
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
