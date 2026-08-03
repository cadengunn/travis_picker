// app.js — the only DOM-glue / stateful file. Reads controls, calls the pure
// generator, resolves against the chord(s), renders the grid. No persistence yet
// (beyond the theme preference).

import {
  CHORDS,
  CHORD_IDS,
  DEFAULT_CHORD,
  BASS_PRESETS,
  CHAOS_GROUPS,
  CHAOS_PRESETS,
  PATTERN_LENGTHS,
  DEFAULT_PATTERN_BARS,
  LABEL_MODES,
  KEY_GROUPS,
  KEYS,
  DEFAULT_KEY,
  PROGRESSIONS,
  CUSTOM_PROGRESSION_ID,
  progressionGroups,
  progressionChords,
  detectProgression,
  randomKeyProgression,
  randomChord,
  degreeOf,
  degreeLabel,
  midiOf,
  clampCapo,
  capoLabel,
  soundingName,
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
import {
  createMetronome,
  DEFAULT_BPM,
  DEFAULT_SWING,
  SWING_MIN,
  clampSwing,
} from "./metronome.js";
import { setUiSoundEnabled, playPress, playRelease, playTick, playPlace } from "./ui-sound.js";
import { confirmModal, promptModal } from "./modal.js";
import { createHelp } from "./help.js";
import { enhanceSelect, enhanceAll, retargetOpenPanel, commit, openDropdownTrigger } from "./dropdown.js";
import { createChordWheel, createKeyProgWheel, chordSplitLabel, keyProgSplitLabel } from "./wheel.js";
import { createWakeLock, createAudioSession, createAppUpdater, createPlaybackGuard } from "./platform.js";

const el = (id) => document.getElementById(id);

// Force TEXT (not emoji) presentation of the transport glyphs. iOS renders a
// bare ▶ / ■ as a colour emoji — which ignores our font and colour and looked
// wrong on the phone. U+FE0E (text variation selector) pins the monochrome
// glyph so the button styling applies. The count-in digits need no selector.
const GLYPH_PLAY = "▶︎";
const GLYPH_STOP = "■︎";

// Shown on help mode's own card. Bump on every release, alongside CACHE in
// sw.js — it used to live in index.html's Options header, then at the foot of
// the Guide modal that help mode replaced.
const APP_VERSION = "v3.3.0";

// Help mode: the "?" latches and every other tap becomes an explanation instead
// of an action. Created here rather than in attach() because the edit-toggle
// handler needs to disarm it, and both are wired in the same pass.
const help = createHelp({
  version: APP_VERSION,
  onChange: (on) => {
    el("open-help").setAttribute("aria-pressed", String(on));
    // Edit mode signals itself with a dashed grid; help mode is app-wide, so the
    // latched pill plus the card that opens with it carry the state.
    if (on) el("open-help").blur();
  },
});

const state = {
  pattern: null,        // last generated (relative/absolute) pattern
  labelMode: "none",
  chordMode: "single",  // "single" | "progression"
  key: DEFAULT_KEY,
  capo: 0,              // shape-first transpose; negative = a down-tuned guitar
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

// Fill a <select> with <optgroup> section headers. `groups` is
// [{ label, items:[{ value, label }] }]; a trailing `extra` option (e.g. Custom)
// is appended outside any group.
function fillSelectGrouped(select, groups, extra) {
  select.innerHTML = "";
  for (const g of groups) {
    const og = document.createElement("optgroup");
    og.label = g.label;
    for (const it of g.items) {
      const opt = document.createElement("option");
      opt.value = it.value;
      opt.textContent = it.label;
      og.appendChild(opt);
    }
    select.appendChild(og);
  }
  if (extra) {
    const opt = document.createElement("option");
    opt.value = extra.value;
    opt.textContent = extra.label;
    select.appendChild(opt);
  }
}

// Every chord select — the Options sheet's and every per-bar one — opens the
// two-reel wheel instead of a list; everything else keeps the standard dropdown.
// The <select> itself is unchanged and still holds all 36 as flat options, so
// it remains the source of truth (see wheel.js).
const chordWheel = createChordWheel({
  // The detent obeys the same silent-switch policy as the buttons: no UI sound
  // while the transport holds the audio category that overrides the ring switch.
  tick: () => { if (!metronome.running) playTick(); },
});
// The Options sheet's field shows the two halves separately under their own
// legends; the per-bar chip shows the one chord name. Same panel either way.
// Key × Progression is the same mechanism over two selects (v2.14.5, his call
// that these are a cross-product like root × quality). The key reel can't go
// through the panel's own `commit` — that targets #progression — so it gets its
// own committer, looked up at call time rather than captured.
const keyProgWheel = createKeyProgWheel({
  tick: () => { if (!metronome.running) playTick(); },
  keySelect: () => el("key"),
  commitKey: (v) => commit(el("key"), v),
});
const chordPicker = (sel) =>
  sel.id === "chord" ? { render: chordWheel, label: chordSplitLabel }
  : sel.classList.contains("bar-chord") ? { render: chordWheel }
  : sel.id === "progression" ? {
      render: keyProgWheel,
      label: keyProgSplitLabel(() => el("key")),
      // the face shows the key too, and a transpose/load/die-roll sets it with no
      // `change` event — so the trigger has to watch it
      watch: [el("key")],
    }
  : null;

// Key groups from data → the {value,label} shape fillSelectGrouped wants.
const keyOptionGroups = () =>
  KEY_GROUPS.map((g) => ({ label: g.label, items: g.ids.map((k) => ({ value: k, label: KEYS[k].name })) }));
const chaosOptionGroups = () =>
  CHAOS_GROUPS.map((g) => ({ label: g.label, items: g.ids.map((c) => ({ value: c, label: CHAOS_PRESETS[c].name })) }));

const keyMode = () => KEYS[state.key]?.mode || "major";
const CUSTOM_OPTION = { value: CUSTOM_PROGRESSION_ID, label: "Custom" };

function initControls() {
  fillSelect(el("chord"), CHORD_IDS, (id) => id, (id) => CHORDS[id].name);
  fillSelectGrouped(el("key"), keyOptionGroups());
  fillSelect(el("bass"), BASS_PRESETS, (p) => p.id, (p) => p.name);
  fillSelectGrouped(el("chaos"), chaosOptionGroups());
  fillSelect(el("pattern"), PATTERN_LENGTHS, (n) => n, (n) => `${n} bar${n > 1 ? "s" : ""}`);
  fillSelect(el("label-mode"), LABEL_MODES, (m) => m.id, (m) => m.name);

  // Progression list is filtered to the current key's mode and grouped by style,
  // plus the "Custom" entry shown once bars stop matching a preset.
  syncProgressionOptions();

  el("chord").value = DEFAULT_CHORD;
  el("label-mode").value = state.labelMode;
  el("key").value = state.key;
  el("pattern").value = String(DEFAULT_PATTERN_BARS);
  setBpm(DEFAULT_BPM);
}

// One place that pushes tempo into the scheduler, the slider and the readout, so
// the fader, the boot default and the restored preference can't drift apart.
function setBpm(next) {
  const bpm = metronome.setBpm(Number(next));
  el("bpm").value = String(bpm);
  el("bpm-value").textContent = String(bpm);
  paintSlider(el("bpm"));
  return bpm;
}

// Paint the "traveled" portion of a fader in accent. WebKit has no
// ::-moz-range-progress, so the fill is a `--pct` custom property the styled
// track gradient reads; Firefox uses ::-moz-range-progress and ignores this.
// Called on every input and once at init for each slider.
function paintSlider(elm) {
  const min = Number(elm.min) || 0;
  const max = Number(elm.max) || 100;
  const pct = max > min ? ((Number(elm.value) - min) / (max - min)) * 100 : 0;
  elm.style.setProperty("--pct", pct.toFixed(1) + "%");
}

// The progression dropdown offers only the progressions matching the current
// key's mode (major keys → the major styles; minor keys → the minor set),
// grouped by style. There is no separate Major/Minor toggle: the key's mode is
// the filter. Called on boot and whenever the key changes mode.
function syncProgressionOptions() {
  fillSelectGrouped(el("progression"), progressionGroups(keyMode()), CUSTOM_OPTION);
}

// The first preset progression of the current key's mode — the landing choice
// when entering progression mode or switching a key across the major/minor line.
function firstProgressionForKey() {
  return PROGRESSIONS.find((p) => p.mode === keyMode())?.id;
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
  box.innerHTML = "";
  // Only a SAVED pattern gets a name here. A fresh random generation shows
  // nothing — no "Untitled" or other placeholder cluttering the header. The row
  // keeps its height so the grid doesn't jump when you save/load.
  if (!state.loaded) {
    box.classList.remove("untitled");
    return;
  }
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

// Shrink the context readout just enough to fit its row, and no further.
//
// It sits top-left beside the action pills, so its width is fixed by what they
// leave (~145px at 375px wide). Most readouts fit at the 14px base; the long ones
// — four hand-edited bars with accidentals, "i – ♯vi – I7 – ♭II · Am" — need ~180px
// and used to ellipsize away the very information they carry. So scale to fit
// instead of truncating, down to a legible floor (below that, truncation is the
// honest failure — you can't read 9px on a guitar stand anyway).
//
// One measure-and-set pass is enough: the pills are `flex: 0 0 auto`, so the
// space the context gets does NOT change when its font does. Fonts load async,
// so `document.fonts.ready` re-runs this once Fraunces is in (see boot).
const CONTEXT_BASE_PX = 22;
const CONTEXT_MIN_PX = 10.5;
function fitContext(node) {
  node.style.fontSize = `${CONTEXT_BASE_PX}px`;
  const avail = node.clientWidth;
  const needed = node.scrollWidth;
  if (!avail || needed <= avail) return;
  // Target one pixel inside the box: glyph advances don't scale perfectly
  // linearly, so aiming at exactly `avail` can still round a hair over and
  // ellipsize the last character.
  const scaled = Math.floor((CONTEXT_BASE_PX * (avail - 1)) / needed * 10) / 10;
  node.style.fontSize = `${Math.max(CONTEXT_MIN_PX, scaled)}px`;
}

// What the shapes on screen actually sound like at the current capo — the one
// piece of information a shape-first model owes you. Null at capo 0, where it
// would just repeat what's already written.
function soundingLabel() {
  if (!state.capo) return null;
  const shape = state.chordMode === "progression" ? state.key : el("chord").value;
  return soundingName(shape, state.capo);
}

// The capo control: the well's number, its end-stops, and the "sounding"
// readout beside it. INVISIBLE AT CAPO 0 — at 0 the readout goes quiet and the
// on-screen indicator doesn't exist, so the default case is exactly the app as
// it was before the capo existed.
function renderCapo() {
  const value = el("capo-value");
  // U+2212, matching the button glyph — a hyphen next to a real minus reads as
  // two different controls.
  value.textContent = state.capo > 0 ? `+${state.capo}` : String(state.capo).replace("-", "−");
  for (const b of el("capo").querySelectorAll("[data-capo-step]")) {
    b.disabled = clampCapo(state.capo + Number(b.dataset.capoStep)) === state.capo;
  }
  // The "sounds in" readout no longer lives beside the stepper — it's part of the
  // header tag now (renderCapoTag). The stepper keeps saying it out loud, since
  // the tag is visual and this is the control you're actually operating.
  const label = soundingLabel();
  el("capo").setAttribute("aria-label", `Capo ${state.capo}${label ? `, sounds in ${label}` : ""}`);
}

// The swing readout. At the bottom of the range it reads "Straight" rather than
// "50%" — that's the off position, and the number behind it is an implementation
// detail, not information.
function renderSwing() {
  const pct = audioPrefs.swing;
  const off = pct === SWING_MIN;
  const value = el("swing-value");
  value.textContent = off ? "Straight" : `${pct}%`;
  value.classList.toggle("at-zero", off);
  const slider = el("swing");
  slider.value = String(pct);
  slider.setAttribute("aria-valuetext", value.textContent);
  paintSlider(slider);
}

// One place that pushes the amount into the scheduler, so control and clock
// can't drift apart.
function applySwing() {
  metronome.setSwing(audioPrefs.swing);
  renderSwing();
  saveAudioPrefs();
}

// The on-screen capo indicator. It sits in the header row in BOTH chord modes —
// it used to ride the context in progression mode and the floating chord label
// in single mode, which moved it down the screen when you switched. Costs no
// layout either way: the header row is already reserved, and the tag only exists
// when a capo is set.
// Since v2.12.0 it carries the SOUNDING key too — "capo 2 → F♯" — which used to
// sit in the Options sheet, i.e. one half of a single fact on each of two
// screens. The arrow, not "sounds in": it reads as a transform (shapes → pitch),
// which is what a capo is, and it fits. Width is the constraint — the four pills
// leave the tag 156.3px at 375, and the longest string it can actually produce
// ("WHOLE STEP DOWN → F♯m", single mode on G♯m at capo −2) measures 151.2px. The
// old wording needed 210.6px, which is why this isn't "sounds in". Re-measure if
// the pills, the wording, or the chord library change; .capo-tag ellipsizes so
// that a miss degrades instead of shoving the pills off the row.
// NOTE: this can now contain ♭/♯, which fall back off Jost onto a taller line
// box — hence the pinned line-height on .capo-tag. Measured, that grows the
// TAG's box 13 → 14.5px but not the row, since the pills are taller; the pin is
// insurance for the day that stops being true.
function renderCapoTag() {
  const tag = el("capo-tag");
  const label = capoLabel(state.capo);
  const sounds = soundingLabel();
  tag.textContent = label ? (sounds ? `${label} → ${sounds}` : label) : "";
  // The arrow is a glyph, not a word; say it properly for a screen reader.
  tag.setAttribute("aria-label", label ? `${label}${sounds ? `, sounds in ${sounds}` : ""}` : "");
  tag.hidden = !label;
}

// What you're playing over, in the ONE slot above the grid: the progression's
// Roman numerals + key (e.g. "I – V – vi – IV · E"), or the single chord, big.
// Both live in #chord-head, whose height is reserved — only the contents swap,
// so the grid can't move when you change modes.
function renderContext() {
  const ctx = el("context");
  const head = el("chord-head");
  const chord = head.querySelector(".c");
  renderCapo();
  renderCapoTag();
  if (state.chordMode === "progression") {
    chord.hidden = true;
    ctx.hidden = false;
    ctx.innerHTML = "";
    // Concise idea when the bars match a preset (I–V, not I–V–I–V); the literal
    // per-bar degrees when they've been hand-edited into something custom.
    const detected = detectProgression(state.progression, state.key);
    const preset = PROGRESSIONS.find((p) => p.id === detected);
    const nums = document.createElement("span");
    nums.textContent = preset
      ? preset.label
      : state.progression.map((c) => degreeLabel(c, state.key)).join(" – ");
    const key = document.createElement("span");
    key.className = "key";
    key.textContent = state.key;
    // the divider gets its own span so the gap is set in px (.context .sep),
    // not by counting nbsp characters — HTML collapses plain spaces.
    const sep = document.createElement("span");
    sep.className = "sep";
    sep.textContent = "·";
    ctx.append(nums, sep, key);
    fitContext(ctx); // insurance only: the stage's full width fits any readout
  } else {
    ctx.hidden = true;
    const id = el("chord").value;
    chord.textContent = CHORDS[id]?.name ?? id;
    chord.hidden = false;
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
  // The per-bar chord <select>s are rebuilt every render; give them the same
  // wheel as the Options sheet's chord (idempotent per element).
  enhanceAll(el("grid"), chordPicker);
  // ...and if a wheel is open on one of them, point it at the replacement.
  // Picking a chord IS a render, so without this the panel stayed up over a
  // select that no longer existed: one change, then nothing until you closed
  // and reopened it.
  retargetOpenPanel((old) => (old.classList.contains("bar-chord")
    ? el("grid").querySelector(`select.bar-chord[data-bar="${old.dataset.bar}"]`)
    : old));
  syncProgressionSelect();
  renderContext();
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
  const LABEL = { absolute: "ABS", mixed: "MIX" };
  const DETAIL = {
    absolute: "Bass won't follow chord changes.",
    mixed: "Some bass notes won't follow chord changes.",
  };
  const ind = el("type-indicator");
  ind.hidden = !LABEL[t];
  ind.textContent = LABEL[t] ?? "";
  ind.title = DETAIL[t] ?? "";
  ind.className = "type-indicator " + t;

  // Remember the settings you keep. Render is the one funnel they all pass
  // through, so this can't miss a control the way a per-handler call would.
  savePrefs();
}

// Hand-drawn work is the only thing here that can't be re-rolled back, so warn
// before anything throws it away. Resolves false if the user backs out.
function confirmDiscardEdits(what) {
  if (!state.unsavedEdits) return Promise.resolve(true);
  return confirmModal({
    title: "Unsaved edits",
    message: `You have unsaved edits. ${what}`,
    confirmText: "Discard & continue",
    cancelText: "Keep editing",
    danger: true,
  });
}

async function generate() {
  if (!(await confirmDiscardEdits("Generating will replace the whole pattern."))) return;
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
  el("field-keyprog").hidden = !prog;
  for (const b of el("chord-mode").querySelectorAll("[data-mode]")) {
    b.classList.toggle("active", b.dataset.mode === mode);
  }
  if (prog) {
    // Make sure the dropdown offers this key's mode before we pick a default.
    syncProgressionOptions();
    if (state.progression.length === 0) {
      applyProgressionPreset(firstProgressionForKey());
    } else {
      render();
    }
  } else {
    render();
  }
  // Mode is switched from inside the Options sheet, and iOS Safari won't always
  // repaint content sitting behind the sheet's translucent backdrop when it
  // changes — so the old single-mode chord label lingered until the sheet closed.
  // Nudge the stage to force a repaint.
  forceRepaint(el("grid").parentElement);
}

// iOS repaint kick: an imperceptible opacity blip forces the compositor to
// recomposite a subtree whose content changed behind a fixed/translucent layer.
function forceRepaint(node) {
  if (!node) return;
  node.style.opacity = "0.999";
  requestAnimationFrame(() => { node.style.opacity = ""; });
}

// Re-roll the CHORD inputs (the ⚙ Setup die). Progression mode rolls a new
// key + a progression valid in that key's mode; single mode rolls a new chord.
// It never touches the right-hand pattern, so hand-drawn edits survive — no
// discard confirmation needed (unlike Generate, which re-rolls the pattern).
function randomizeChords() {
  if (state.chordMode === "progression") {
    const roll = randomKeyProgression(state.key, detectProgression(state.progression, state.key));
    if (!roll) return;
    state.key = roll.key;
    el("key").value = roll.key;
    syncProgressionOptions(); // the new key's mode decides what's on the menu
    applyProgressionPreset(roll.progression); // sets bars, marks dirty, renders
    return;
  }
  const chord = randomChord(el("chord").value);
  if (!chord) return;
  el("chord").value = chord;
  markDirty();
  render();
}

function applyProgressionPreset(presetId) {
  if (presetId === CUSTOM_PROGRESSION_ID) return; // "Custom" is a readout, not a choice
  // The progression's own length sets the bar count.
  state.progression = progressionChords(presetId, state.key);
  markDirty();
  render();
}

// Changing key within the SAME mode transposes by token: preset progressions
// re-resolve, and custom bars follow their token where they have one (unknown
// chords stay put). Crossing the major/minor line (e.g. E → Am) can't transpose —
// the token sets differ — so the progression list is rebuilt for the new mode and
// we land on that mode's first preset (the agreed default-on-mode-switch).
function setKey(newKey) {
  const oldKey = state.key;
  const modeChanged = KEYS[newKey].mode !== KEYS[oldKey].mode;
  state.key = newKey;
  if (state.chordMode === "progression" && modeChanged) {
    syncProgressionOptions();
    applyProgressionPreset(firstProgressionForKey());
    return;
  }
  state.progression = state.progression.map((c) => {
    const tok = degreeOf(c, oldKey);
    return tok ? KEYS[newKey].chords[tok] || c : c;
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
      // The capo shifts what you HEAR, never what's drawn: the grid's frets are
      // shape frets, so only the pitch moves.
      (table[step] ||= []).push({ midi: midiOf(ev, state.capo), bass: ev.finger === "p" });
    }
  });
  return table;
}

// Play emits two independent layers — the click and the plucked pattern — each
// an on/off preference (default on) persisted like the theme. localStorage may
// throw in private mode; fall back to the defaults rather than break boot.
const AUDIO_KEY = "tp-audio";
// Swing rides in here rather than in a saved pattern's context: it's a FEEL
// setting, the same class of thing as BPM, not part of what the pattern is. (It
// does persist across launches, unlike BPM — you settle on a feel for a tune and
// keep it, where you move the tempo constantly.)
const audioPrefs = {
  click: true, pattern: true, ui: true, countIn: true, swing: DEFAULT_SWING,
};
// Returns what was actually IN storage, which is not the same question as what
// audioPrefs now holds: the defaults above are always present, so a caller that
// asks `audioPrefs.x ?? fallback` can never tell "the user has no setting" from
// "the user's setting equals the default". The swing migration needs that
// distinction, and got it wrong until this returned the raw blob.
function loadAudioPrefs() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(AUDIO_KEY) || "{}") || {};
  } catch {}
  Object.assign(audioPrefs, stored);
  return stored;
}
function saveAudioPrefs() {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(audioPrefs));
  } catch {}
}

// ----- session preferences -----
// The controls you set ONCE AND KEEP, restored on the next launch (session 32,
// his ask). Separate store from `tp-audio`, which stays exactly what it is — the
// four sound toggles plus swing.
//
// NO SEEDED DEFAULT BLOB, deliberately: the documented footgun is that a blob
// pre-filled with defaults can never tell you "unset". This reads the RAW stored
// object and applies only the keys that are actually present, leaving the app's
// own defaults to cover the rest — so a future migration can still tell "never
// set" from "set to the default value".
//
// BPM IS IN HERE, which REVERSES the old rule that tempo is too volatile to
// persist (his call, session 32 — he changed his mind when asked). Swing stays
// in `tp-audio` where it already lives; moving it would strand real settings for
// no gain.
const PREFS_KEY = "tp-prefs";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
  } catch {
    return {}; // corrupt, or private mode — launch on the defaults
  }
}

// Written from render(), which is the ONE funnel every control here already goes
// through (capo, chord, key, progression, thumb, fingers, pattern length, labels
// and the mode switch all re-render). That includes loadSaved(), which is what
// makes "reopen how you left it" true of a loaded pattern too — his call. BPM
// doesn't render, so it saves itself.
function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      chordMode: state.chordMode,
      chord: el("chord").value,
      key: state.key,
      // Persisted as a SESSION DEFAULT. That's a different thing from the capo
      // inside a saved pattern's context, which is musical content and still
      // wins — loadSaved() runs long after this is restored.
      capo: state.capo,
      progression: [...state.progression],
      bass: el("bass").value,
      chaos: el("chaos").value,
      patternBars: patternBars(),
      labelMode: state.labelMode,
      bpm: metronome.bpm,
    }));
  } catch { /* quota or private mode: the app simply won't remember */ }
}

// Put a stored value back only if it's still a real option. Chords, keys,
// progressions and presets are all DATA and do change between releases, so a
// stale id has to be ignored rather than wedge a control on a value its menu no
// longer contains.
function restoreSelect(id, value) {
  if (value == null) return false;
  const sel = el(id);
  if (![...sel.options].some((o) => o.value === String(value))) return false;
  sel.value = String(value);
  return true;
}

// Runs after initControls/enhanceAll — the menus have to exist, and going through
// the wrapped `value` setter is what repaints the dropdown triggers — and BEFORE
// generate(), so the session's first pattern is rolled against the restored chord
// rather than the default one. `render()` no-ops while `state.pattern` is null,
// which is what makes the setChordMode call at the end safe this early.
function restorePrefs(stored) {
  if (LABEL_MODES.some((m) => m.id === stored.labelMode)) {
    state.labelMode = stored.labelMode;
    el("label-mode").value = stored.labelMode;
  }
  if (stored.capo != null) state.capo = clampCapo(stored.capo);
  if (KEYS[stored.key]) {
    state.key = stored.key;
    el("key").value = stored.key;
    syncProgressionOptions(); // this key's mode decides what's on the menu
  }
  restoreSelect("bass", stored.bass);
  restoreSelect("chaos", stored.chaos);
  restoreSelect("pattern", stored.patternBars);
  restoreSelect("chord", stored.chord);
  // Every bar must still be a chord we ship, or the grid renders a hole.
  const prog = stored.progression;
  if (Array.isArray(prog) && prog.length && prog.every((c) => CHORDS[c])) {
    state.progression = [...prog];
  }
  if (stored.bpm != null) setBpm(stored.bpm);
  // Last, exactly as in loadSaved(): it's the call that also lays out the mode's
  // fields, and it must see the restored progression or it would overwrite it
  // with the key's first preset.
  if (stored.chordMode === "progression") setChordMode("progression");
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
  const counting = n != null;
  const track = el("grid").querySelector(".grid-track");
  if (track) track.classList.toggle("counting", counting);
  // The Play button no longer flashes the count-in digits — that fought the
  // hardware feel. The dimmed grid + the blinking beat lamp carry the count now,
  // so Play just holds the running (stop) glyph through the count-in.
  const play = el("play");
  play.textContent = counting || metronome.running ? GLYPH_STOP : GLYPH_PLAY;
  play.setAttribute(
    "aria-label",
    counting ? "Counting in" : metronome.running ? "Stop metronome" : "Start metronome"
  );
}

// Beat lamp: pulse the amp jewel by the BPM readout on each beat, brighter on
// the downbeat. Restart the CSS blink each time by clearing + reflowing so it
// re-fires even faster than its own duration. Runs off onStep/onCountIn, which
// are already driven by the audio clock — no second timer.
function pulseBeatLamp(downbeat) {
  const lamp = el("beat-lamp");
  if (!lamp) return;
  lamp.classList.remove("lit", "downbeat");
  void lamp.offsetWidth; // reflow so the animation restarts on a repeat beat
  lamp.classList.add("lit");
  lamp.classList.toggle("downbeat", downbeat);
}
function clearBeatLamp() {
  const lamp = el("beat-lamp");
  if (lamp) lamp.classList.remove("lit", "downbeat");
}

// The count-in reports each digit twice (beat + its offbeat 8th carry the same
// number), so pulse only when the count actually advances.
let lastCountBeat = null;

const metronome = createMetronome({
  onStep: (pos) => {
    // The first real step ends the count-in — nothing else reports that.
    if (pos) showCountIn(null);
    highlightColumn(pos);
    // Beats are the odd 1-based slots (1,3,5,7); slot 1 is the bar's downbeat.
    if (pos && pos.slot % 2 === 1) pulseBeatLamp(pos.slot === 1);
  },
  onCountIn: (n) => {
    showCountIn(n);
    if (n == null) {
      lastCountBeat = null;
      clearBeatLamp();
    } else if (n !== lastCountBeat) {
      lastCountBeat = n;
      pulseBeatLamp(n === 1);
    }
  },
});

// The one way playback ends, whether you pressed stop or the phone went away in
// your pocket. Handing the audio category back matters as much as killing the
// scheduler: "playback" is what keeps iOS sounding us in the background.
function stopTransport() {
  if (!metronome.running) return;
  metronome.stop();
  releasePlayback();
}

// Everything that has to be undone whether the transport ran or merely tried to.
// It is deliberately NOT gated on `metronome.running`: a start that failed never
// set it, and that gate is what used to make the failure unrecoverable —
// stopTransport() returned early, so the audio category stayed claimed and the
// button stayed showing STOP forever.
function releasePlayback() {
  audioSession.setPlayback(false); // back to a category that respects silent mode
  el("play").setAttribute("aria-pressed", "false");
  showCountIn(null); // clears the dim and resets the label
}

// Guards against a second press landing while the first is still waiting on the
// audio hardware. `metronome.running` is only true at the END of that wait, so
// without this a double-tap starts the claim twice.
let startingTransport = false;

async function togglePlay() {
  if (metronome.running) {
    stopTransport();
    return;
  }
  if (startingTransport) return;
  startingTransport = true;
  // Flip the button OPTIMISTICALLY — the press should feel instant, and a start
  // normally resolves within a frame. What matters is that the optimism is
  // always paid back: if the start fails the button springs back, so it can
  // never sit there showing STOP over a silent app (session 32).
  el("play").setAttribute("aria-pressed", "true");
  el("play").textContent = GLYPH_STOP;
  // Claim the playback audio category BEFORE the AudioContext is created, so the
  // transport sounds through a silenced ring switch (see platform.js).
  audioSession.setPlayback(true);
  let started = false;
  try {
    // Started from the click handler so iOS Safari unlocks audio.
    started = await metronome.start(phraseChords().length);
  } catch (err) {
    console.error("Transport failed to start.", err);
  } finally {
    startingTransport = false;
  }
  // The button returning to ▶ is the failure report. metronome.start() has
  // already thrown the bad AudioContext away by this point, so simply pressing
  // Play again retries against a fresh one.
  if (!started) releasePlayback();
}

// ----- saved library -----
// A saved item is musical content only: the pattern plus the chord context it
// was written against. Theme and label mode are app preferences, not content.
function currentContext() {
  return {
    chordMode: state.chordMode,
    chord: el("chord").value,
    key: state.key,
    // The capo is musical content — it's what the pattern SOUNDS like, not a
    // preference like the theme. Items saved before it existed have no `capo`
    // and read back as 0, which is what they were.
    capo: state.capo,
    progression: [...state.progression],
  };
}

function describeCurrent() {
  const bassName = BASS_PRESETS.find((b) => b.id === el("bass").value)?.name ?? el("bass").value;
  if (state.chordMode === "progression") {
    const id = detectProgression(state.progression, state.key);
    const prog = PROGRESSIONS.find((p) => p.id === id);
    const label = prog ? prog.label : "Custom";
    return [`${label} in ${state.key}`, capoLabel(state.capo), bassName].filter(Boolean).join(" · ");
  }
  const n = patternBars();
  return `${el("chord").value} · ${bassName} · ${n} bar${n > 1 ? "s" : ""}`;
}

function refreshSavedCount() {
  const n = savedStore.count();
  // The pill is icon-only, so the count lives in the label rather than the face
  // (writing textContent here would wipe the SVG). The enabled/disabled state
  // already says "there is something to load"; the number is a long-press away.
  const label = n ? `Load pattern (${n} saved)` : "Load pattern";
  el("open-load").setAttribute("aria-label", label);
  el("open-load").title = n ? `Load (${n} saved)` : "Load";
  el("open-load").disabled = n === 0;
}

function renderSavedList() {
  const list = el("saved-list");
  list.innerHTML = "";
  const items = savedStore.list();

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "saved-empty";
    li.textContent = "Saved patterns will appear here.";
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

    const rename = document.createElement("button");
    rename.type = "button";
    rename.textContent = "Rename";
    rename.addEventListener("click", async () => {
      const next = await promptModal({
        title: "Rename pattern",
        message: `New name for "${item.name}"`,
        value: item.name,
        confirmText: "Rename",
      });
      if (next == null) return; // cancelled
      if (!savedStore.rename(item.id, next)) return; // blank or write failed
      // keep the on-screen name in sync if this is the loaded pattern
      if (state.loaded && state.loaded.id === item.id) {
        state.loaded.name = next.trim();
        renderLoadedName();
      }
      renderSavedList();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "Delete pattern",
        message: `Delete "${item.name}"? This can't be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        danger: true,
      });
      if (!ok) return;
      savedStore.remove(item.id);
      renderSavedList();
      refreshSavedCount();
    });

    li.append(meta, load, rename, del);
    list.appendChild(li);
  }
}

function summarize(item) {
  const ctx = item.context || {};
  const p = item.pattern || {};
  const bassName = BASS_PRESETS.find((b) => b.id === p.bass)?.name ?? p.bass;
  // The preset's NAME, not its stored id — the id is `chaos` but the menu says
  // "Wild Card", and a saved item that disagrees with the control is confusing.
  const fingersName = CHAOS_PRESETS[p.chaos]?.name ?? p.chaos;
  const where =
    ctx.chordMode === "progression"
      ? `${(ctx.progression || []).map((c) => degreeLabel(c, ctx.key)).join("–")} (key ${ctx.key})`
      : ctx.chord;
  const bars = p.patternBars ? `${p.patternBars} bar${p.patternBars > 1 ? "s" : ""}` : "";
  // Only when set: two saves that differ only by capo would otherwise look
  // identical in the list (and collide on the default name).
  return [where, capoLabel(ctx.capo), bassName, fingersName, bars].filter(Boolean).join(" · ");
}

// One warm-green flash on the save-confirmation lamp. Restart the one-shot each
// save by clearing + reflowing so repeated saves each blink.
function blinkSaveLamp() {
  const lamp = el("save-lamp");
  if (!lamp) return;
  lamp.classList.remove("blink");
  void lamp.offsetWidth;
  lamp.classList.add("blink");
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
  blinkSaveLamp();
  // What's on screen IS this saved pattern now.
  state.loaded = { id: item.id, name: item.name };
  state.dirty = false;
  state.unsavedEdits = false;
  renderLoadedName();
  renderSavedList();
  refreshSavedCount();
}

async function loadSaved(id) {
  const item = savedStore.get(id);
  if (!item) return;
  if (!(await confirmDiscardEdits("Loading will replace the pattern on screen."))) return;
  const ctx = item.context || {};

  // Restore musical content only — theme and label mode stay as the user has them.
  state.pattern = item.pattern;
  state.key = ctx.key || DEFAULT_KEY;
  state.capo = clampCapo(ctx.capo); // absent on pre-capo saves -> 0
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

// The Options sheet's open state, in ONE place. It used to be three bare
// `hidden = ...` assignments (gear, ✕/backdrop, Escape), and the body class the
// help "?" needs to stay above the scrim has to track all three or the pill
// gets stranded above a closed sheet. Half the controls worth explaining live
// in this sheet, so arming help mode from inside it is the common case, not an
// edge one — you shouldn't have to close, arm, and reopen.
function setOptionsOpen(open) {
  el("options-sheet").hidden = !open;
  document.body.classList.toggle("options-open", open);
  if (open) syncSheetToViewport();
}

// iOS Safari positions `position: fixed` against the LAYOUT viewport, so a
// bottom-anchored sheet stays put behind the on-screen keyboard when a field in
// it is focused (the Save name input) — the panel appeared to run off the screen
// on the phone. Pin any OPEN sheet to the VISUAL viewport instead, so it rides
// above the keyboard.
//
// ONLY WHILE THE KEYBOARD IS UP, and this is the whole landscape fix (session
// 32). These are INLINE styles overriding `.sheet { inset: 0 }`, and nothing used
// to remove them — so a height captured during a rotation outlived it. iOS
// reports transitional visual-viewport numbers for a frame or two mid-rotate, and
// the sync also skipped hidden sheets, so a sheet closed during the turn kept a
// landscape box into portrait: the panel then bottom-anchored inside the wrong
// box, which is the "Options opens at the top" report.
//
// With no keyboard the visual viewport EQUALS the layout viewport, so the pin was
// only ever a no-op in that case anyway. Clearing it instead of writing a no-op
// snapshot means the stylesheet governs whenever there's no keyboard — and the
// stylesheet is right at every orientation, so rotating now self-corrects with no
// orientation handling at all.
const KEYBOARD_SLACK = 40; // px of viewport loss that isn't a keyboard (URL bar)
function syncSheetToViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const keyboardUp = window.innerHeight - vv.height > KEYBOARD_SLACK;
  for (const s of document.querySelectorAll(".sheet")) {
    if (keyboardUp && !s.hidden) {
      s.style.height = `${vv.height}px`;
      s.style.top = `${vv.offsetTop}px`;
      s.style.bottom = "auto";
    } else {
      // Hand the box back to the stylesheet. Hidden sheets are cleared too —
      // a stale box on a closed sheet is exactly what survived the rotation.
      s.style.height = "";
      s.style.top = "";
      s.style.bottom = "";
    }
  }
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
  syncSheetToViewport();
  if (saving) el("save-name").focus();
}
function closeSheet() {
  el("saved-sheet").hidden = true;
}

// The Options sheet's two pages: what the PATTERN is, vs how the APP behaves.
// The split exists to buy height — everything on one page left ~27px spare on an
// SE, which is why the capo had nowhere to go (see index.html).
const OPTIONS_PAGES = { "tab-setup": "page-setup", "tab-prefs": "page-prefs" };
function showOptionsPage(tabId) {
  for (const [tab, page] of Object.entries(OPTIONS_PAGES)) {
    const on = tab === tabId;
    el(tab).classList.toggle("active", on);
    el(tab).setAttribute("aria-selected", String(on));
    // `is-away` keeps the page in its grid cell (see .sheet-pages) so the panel
    // stays the height of the TALLER page and the sheet can't jump on a switch.
    el(page).classList.toggle("is-away", !on);
  }
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
  el("bass").addEventListener("change", async () => {
    if (!(await confirmDiscardEdits("Re-rolling the bass will discard your edits to it."))) {
      el("bass").value = state.pattern.bass; // put the control back
      return;
    }
    state.pattern = regenerateBass(state.pattern, el("bass").value, phraseChords()[0]);
    markDirty();
    render();
  });
  el("chaos").addEventListener("change", async () => {
    if (!(await confirmDiscardEdits("Re-rolling the fingers will discard your edits to them."))) {
      el("chaos").value = state.pattern.chaos;
      return;
    }
    state.pattern = regenerateTreble(state.pattern, el("chaos").value);
    markDirty();
    render();
  });
  el("chord").addEventListener("change", () => { markDirty(); render(); });
  el("randomize-chords").addEventListener("click", randomizeChords);
  el("key").addEventListener("change", (e) => setKey(e.target.value));
  el("progression").addEventListener("change", (e) => applyProgressionPreset(e.target.value));

  // Format is a seated-key toggle now (session 27), so pressed == selected — the
  // same shape as the page tabs, and it acts on RELEASE for the same reason:
  // committing on pointerup (not click) keeps `.active` present the instant the
  // browser drops `:active`, so there's no bare raised frame between them. Guarded
  // to the actual mode change so the trailing `click` (which fires after our
  // pointerup) is a no-op rather than a second re-render. `click` stays for the
  // keyboard, which emits no pointer events.
  const switchMode = (e) => {
    const btn = e.target.closest("[data-mode]");
    if (btn && btn.dataset.mode !== state.chordMode) setChordMode(btn.dataset.mode);
  };
  el("chord-mode").addEventListener("pointerup", switchMode);
  el("chord-mode").addEventListener("click", switchMode);

  // The capo changes what you HEAR and what the readouts say — never the
  // pattern — so it re-renders without touching state.pattern. Nothing to
  // confirm: hand-drawn edits are untouched.
  el("capo").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-capo-step]");
    if (!btn) return;
    const next = clampCapo(state.capo + Number(btn.dataset.capoStep));
    if (next === state.capo) return;
    state.capo = next;
    markDirty();
    render();
  });

  // Swing. `input` (not `change`) so dragging the slider retunes the feel live —
  // the scheduler only queues ~0.2s ahead, so you hear it move under your hands
  // while the loop runs, which is the whole point of a control you hunt with.
  el("swing").addEventListener("input", (e) => {
    audioPrefs.swing = clampSwing(e.target.value);
    applySwing();
  });

  // Options pages. The die belongs to Setup, so it goes with it.
  // Switch on POINTERDOWN, not click, to kill the release flash (v2.14.7). A tab
  // is a latching key: while your finger is down it's `:active` (seated), and the
  // seated LOOK also needs `.active`. If `.active` is added on click, then between
  // the browser dropping `:active` at pointerup and the click firing, the tab has
  // neither and paints its raised state for a frame — the flash he kept seeing.
  // Switch on POINTERUP, not pointerdown (his note, session 27): a latching key
  // should hold while the finger is down and act on release, like every other
  // button in the app. Pointerdown (v2.14.7) fixed the flash but committed on
  // press, which read wrong — the page flipped under your finger. Pointerup keeps
  // BOTH properties: it's release-activation, and it still kills the flash the
  // click path had. The flash was a two-EVENT gap — the browser dropped `:active`
  // at pointerup and `.active` wasn't added until the later `click`, leaving one
  // raised frame between them. Adding `.active` in the pointerup handler itself
  // closes that gap: it runs synchronously within the same release, before the
  // browser paints, so `.active` is present the instant `:active` goes. `click`
  // stays for the keyboard (Enter/Space emit no pointer events); it re-sets the
  // same page, which is a no-op.
  const tabs = el("options-sheet").querySelector(".seg-tabs");
  const switchTab = (e) => {
    const tab = e.target.closest("[role=tab]");
    if (tab) showOptionsPage(tab.id);
  };
  tabs.addEventListener("pointerup", switchTab);
  tabs.addEventListener("click", switchTab);

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

  // Hardware button sound: two-phase like a tape-deck transport key — a light
  // "ka" on pointer-DOWN (the key travelling in) and a deeper "chunk" on pointer-
  // UP (the spring seating). Press-and-hold gives the ka, then the chunk when you
  // lift; the actions themselves fire on click/release, so the chunk lands with
  // them. Delegated so it covers every button — including custom dropdown
  // triggers/options built later — without per-button wiring. Bigger controls
  // hit a touch harder (a subtle size cue). The slider, text fields and grid
  // cells are intentionally excluded.
  const pressStrength = (e) => {
    const b = e.target.closest("button, .lamp, .dd-trigger, .dd-option");
    if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") return null;
    // A name on the chord wheel is a facet of a barrel, not a key: it's a
    // <button> so it can be tapped and focused, but its voice is the DETENT
    // (playTick, as it rolls past the window). Without this it would ka-chunk
    // on top of the tick, and also click on the first frame of a drag.
    if (b.classList.contains("reel-item")) return null;
    return b.classList.contains("btn-roll") ? 1.15
      : b.classList.contains("btn-icon") || b.classList.contains("btn-primary") ? 1.0
      : 0.82;
  };
  //
  // SILENT-SWITCH POLICY (v2.8.2): buttons go quiet while the transport is
  // running. The web can't read the iOS ring switch, so this is the only way to
  // honour it — playback is the one window where we hold the audio category that
  // overrides the switch, so muting the buttons there means a silenced phone
  // never hears them at all, while the metronome and melody (audio you asked
  // for) still come through. With the ringer ON the side effect is that buttons
  // don't click during a take either, which is no loss: thocks over your own
  // picking are noise. The Options "Buttons" toggle is unchanged and independent.
  //
  // The decision is taken ONCE per press and held for the pair, so the button
  // that starts or stops the transport gets a matched ka-chunk instead of half
  // a press.
  // Closing a dropdown by TAPPING ITS TRIGGER should ka-chunk like opening it did
  // (his note). It doesn't for free, because the outside-tap catcher (`inset: 0`)
  // sits on top of the trigger, so the tap lands on a bare <div> rather than the
  // `.dd-trigger` — pressStrength sees no button. A catcher tap that falls WITHIN
  // the open trigger's rect is a trigger press; a bare outside tap (off the trigger)
  // still lands on the catcher away from it and stays silent, which is right.
  const overOpenTrigger = (e) => {
    if (!e.target.classList || !e.target.classList.contains("dd-catcher")) return false;
    const trig = openDropdownTrigger();
    if (!trig) return false;
    const r = trig.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };

  // The die sits right beside the field that opens the wheel, so its own catcher
  // covers it too — a tap on the die used to be a dead first press that only
  // closed the wheel, and rolling took two taps (his ask, session 33). Same rect
  // check as overOpenTrigger, just against the die instead of the trigger.
  const overOpenDie = (e) => {
    if (!e.target.classList || !e.target.classList.contains("dd-catcher")) return false;
    const r = el("randomize-chords").getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  // Fires on the bubble AFTER the catcher's own listener (dropdown.js) has
  // already closed the panel, so the roll always lands on a clean, closed sheet
  // — never on stale reel positions from the wheel that just went away.
  document.addEventListener("click", (e) => {
    if (overOpenDie(e)) randomizeChords();
  });

  // A latching key that's already SEATED is a no-op when pressed again — like the
  // capo at an end-stop, it should stay silent; only the POPPED-OUT one sounds
  // (his note). Both the page tabs and the Format toggle are `.segmented button`,
  // and the seated one carries `.active`. Decided at pointerdown and HELD for the
  // pair (`pressNoop`), because by pointerup the press has already moved `.active`
  // onto the key you hit — so recomputing there would wrongly silence the chunk of
  // the popped-out key you just seated.
  const seatedLatch = (e) => {
    const seg = e.target.closest?.(".segmented button");
    return !!(seg && seg.classList.contains("active"));
  };

  let pressSilenced = false;
  let pressNoop = false;
  document.addEventListener("pointerdown", (e) => {
    let s = pressStrength(e);
    if (s == null && (overOpenTrigger(e) || overOpenDie(e))) s = 0.82;
    if (s == null) return;
    pressSilenced = metronome.running;
    pressNoop = seatedLatch(e);
    if (!pressSilenced && !pressNoop) playPress(s);
  });
  document.addEventListener("pointerup", (e) => {
    let s = pressStrength(e);
    if (s == null && (overOpenTrigger(e) || overOpenDie(e))) s = 0.82;
    if (s == null || pressSilenced || pressNoop) return;
    playRelease(s);
  });

  // Transport
  el("play").addEventListener("click", togglePlay);
  el("bpm").addEventListener("input", (e) => {
    setBpm(Number(e.target.value));
    // Tempo is the one persisted control that doesn't go through render(), so
    // it writes its own. `input` fires per pixel of drag; that's a handful of
    // localStorage writes per gesture, which is what the app already does for
    // the swing fader's saveAudioPrefs().
    savePrefs();
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
  // Button-press click sound (UI feedback, independent of what Play emits).
  el("ui-sound-toggle").addEventListener("change", (e) => {
    audioPrefs.ui = e.target.checked;
    setUiSoundEnabled(audioPrefs.ui);
    saveAudioPrefs();
  });
  // One-bar count-in before the loop (off = start immediately).
  el("count-in-toggle").addEventListener("change", (e) => {
    audioPrefs.countIn = e.target.checked;
    metronome.setCountInEnabled(audioPrefs.countIn);
    saveAudioPrefs();
  });

  // Manual editing — off by default so taps can't nudge a pattern mid-practice.
  el("edit-toggle").addEventListener("click", () => {
    // No help-mode guard here, and deliberately: this handler is unreachable
    // while help mode is armed, because the pencil isn't on help mode's
    // navigation allowlist — tapping it explains the pencil instead. The
    // exclusion only has to run the other way, in the "?" handler below.
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
    // A felt-on-board "thock" on every place/delete, so editing has the same
    // tactile confirmation the rest of the app does. Silenced while the transport
    // runs, exactly like the button ka-chunk (the ring-switch rule) — grid cells
    // are excluded from pressStrength(), so this is their only voice.
    if (!metronome.running) playPlace();
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
    // Always opens on Setup: gear -> the things you change between takes.
    // Preferences is one tap away and is set far more rarely.
    showOptionsPage("tab-setup");
    setOptionsOpen(true);
  });

  // Help "?" latches in like the pencil. `#open-help` is on help mode's own
  // navigation allowlist, so this handler is reached in BOTH directions and the
  // exit needs no special case.
  el("open-help").addEventListener("click", () => {
    if (help.on) { help.disarm(); return; }
    if (state.editing) el("edit-toggle").click(); // one latch at a time
    help.arm();
  });

  // The context is scaled to the width it's given, so re-fit when that changes
  // (rotation, split view). Cheap: two reads on an element that's usually short.
  window.addEventListener("resize", () => {
    const ctx = el("context");
    if (!ctx.hidden) fitContext(ctx);
  });

  // Keep any open sheet pinned to the visual viewport as the keyboard shows/hides.
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncSheetToViewport);
    window.visualViewport.addEventListener("scroll", syncSheetToViewport);
  }
  el("options-sheet").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) setOptionsOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!el("saved-sheet").hidden) closeSheet();
    else setOptionsOpen(false);
  });
}

// ----- platform integrations (see platform.js; all no-ops where unsupported) -----
const wakeLock = createWakeLock();
const audioSession = createAudioSession();
// A reload would discard hand-drawn edits and cut a take in half, so a pending
// update waits for a quieter moment — the worker is already active by then, so
// the next ordinary launch picks it up regardless.
const updater = createAppUpdater({
  canReload: () => !state.unsavedEdits && !metronome.running,
});
// Lock the screen (or switch apps) mid-take and the take is over — a frozen page
// can't hold a beat, and its backlog comes out as a burst on the way back.
// ...and on the way back, repair the audio the backgrounding may have broken,
// so the next Play starts from a healthy context instead of a dead button.
const playbackGuard = createPlaybackGuard({
  onHidden: stopTransport,
  onShown: () => { metronome.recoverAudio(); },
});

// Register the offline service worker — but ONLY on the real HTTPS origin.
// On localhost a cache-first SW would fight serve.py's no-store and feed you
// stale code while developing; over `--lan` (plain http) the browser blocks SW
// registration anyway. So it runs only where it should: the Pages deploy.
//
// It runs OUTSIDE boot() on purpose. Anything that threw earlier in boot would
// take the registration down with it, and an app that can't check for updates
// can't ship its own fix — you'd be stuck deleting and re-adding the icon. The
// updater is the one thing that must survive a broken build.
function registerServiceWorker() {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;
  // `load` keeps registration out of the way of the first paint — but if the
  // module happened to evaluate after it, that event is never coming.
  if (document.readyState === "complete") updater.start("sw.js");
  else window.addEventListener("load", () => { updater.start("sw.js"); });
}

// ----- boot -----
async function boot() {
  initControls();
  enhanceAll(document, chordPicker); // custom dropdowns / the chord wheel (theme fills later)
  // Before generate(), so the session's first roll uses the chord you left set.
  restorePrefs(loadPrefs());
  const stored = loadAudioPrefs();
  el("click-toggle").checked = audioPrefs.click;
  el("pattern-toggle").checked = audioPrefs.pattern;
  el("ui-sound-toggle").checked = audioPrefs.ui;
  el("count-in-toggle").checked = audioPrefs.countIn;
  // A pref blob from before swing existed has none of these keys; one from the
  // v2.13.0 trial has a single free-range `swing`. Snap whatever turns up onto a
  // real detent rather than trusting it into the scheduler — the migration is
  // one line because the old value was in the same units.
  // Read from `stored`, not audioPrefs: the latter always carries the defaults,
  // so `audioPrefs.x ?? fallback` can never tell "no setting" from "the default".
  // `swingEighths` is the v2.13.1 key for the resolution that survived; a
  // quarters value is deliberately dropped, since that feel no longer exists.
  audioPrefs.swing = clampSwing(stored.swing ?? stored.swingEighths ?? DEFAULT_SWING);
  delete audioPrefs.swingEighths;
  delete audioPrefs.swingQuarters;
  delete audioPrefs.swingUnit;
  metronome.setClickEnabled(audioPrefs.click);
  metronome.setPatternEnabled(audioPrefs.pattern);
  metronome.setCountInEnabled(audioPrefs.countIn);
  applySwing();
  setUiSoundEnabled(audioPrefs.ui);
  attach();
  // Hold the screen awake for as long as the app is up — a screen lock ends
  // practice mid-take. Re-acquired on every return to foreground (platform.js).
  wakeLock.start();
  playbackGuard.start();
  await generate(); // roll one immediately so the grid is never empty
  refreshSavedCount();

  // The first fit measured whatever font was available; Fraunces arrives async
  // and is wider than the fallback, so re-fit once it's actually in.
  document.fonts?.ready.then(() => {
    const ctx = el("context");
    if (!ctx.hidden) fitContext(ctx);
  });

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

registerServiceWorker(); // before boot, so a boot failure can still be fixed by a deploy
boot();
