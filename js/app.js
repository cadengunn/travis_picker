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
  LABEL_MODES,
  TONES,
  KEY_GROUPS,
  KEYS,
  DEFAULT_KEY,
  PROGRESSIONS,
  CUSTOM_PROGRESSION_ID,
  QUALITIES,
  splitChordId,
  allProgressions,
  setCustomProgressions,
  progressionGroups,
  progressionChords,
  detectProgression,
  randomKeyProgression,
  randomChord,
  degreeLabel,
  romanInKey,
  chordForRoman,
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
} from "./generator.js";
import { renderGrid, passLampSelector } from "./grid.js";
import { initThemes, listThemes, applyTheme } from "./theme.js";
import {
  savedStore, buildExport, parseImport,
  progressionStore, CUSTOM_PROGRESSION_PREFIX,
} from "./storage.js";
import { BUILTIN_PATTERNS } from "./builtin-patterns.js";
import { toggleNote, moveNote } from "./editor.js";
import {
  createMetronome,
  DEFAULT_BPM,
  DEFAULT_SWING,
  SWING_MIN,
  clampSwing,
  splitAudioBar,
} from "./metronome.js";
// Straight from synth.js, which owns the voice table — `TONES` in data.js is
// only the menu, and synth.js stays dependency-free so it can't own both.
import { DEFAULT_TONE } from "./synth.js";
import { setUiSoundEnabled, playPress, playRelease, playTick, playPlace } from "./ui-sound.js";
import { confirmModal, promptModal, infoModal, unlockModal } from "./modal.js";
import { createEntitlement, UNLOCK_BENEFITS, FREE_SAVE_SLOTS } from "./entitlement.js";
import { createHelp } from "./help.js";
import { enhanceSelect, enhanceAll, retargetOpenPanel, commit, openDropdownTrigger } from "./dropdown.js";
import { createChordWheel, createKeyProgWheel, chordSplitLabel, keyProgSplitLabel } from "./wheel.js";
import { createWakeLock, createAudioSession, createAppUpdater, createPlaybackGuard } from "./platform.js";

const el = (id) => document.getElementById(id);

// ---- the paywall (APP_STORE.md item 18) ----
// A STUB until the native StoreKit bridge exists — see entitlement.js. It
// defaults to UNLOCKED, so the live PWA is unchanged for him; `?tier=free`
// switches this device to the free tier and persists, `?tier=paid` switches it
// back. That costs no chrome at all, which is what makes it affordable to carry
// while the real bridge is still months out behind a build machine.
const tier = createEntitlement({
  store: (() => { try { return localStorage; } catch { return null; } })(),
  search: (() => { try { return location.search; } catch { return ""; } })(),
});

// Marks a control as PURCHASABLE: a lock glyph, and `data-tier-locked` for the
// press handlers to check. Deliberately never touches `disabled` — a disabled
// button emits no click, so it could not open the unlock sheet, which is the
// same trap that made help mode need `liftDisabled`.
// `markIn` is separate from `host` on purpose: the ATTRIBUTE belongs on the
// control the press handler checks, but the GLYPH belongs wherever it reads as a
// label rather than as debris inside the control. On ×2 that's the field's
// legend ("×2 🔒"); dropped into the `.segmented` itself it floats in the gap
// between the two keys, which is where the first cut put it.
function setTierLock(host, locked, { markIn = null } = {}) {
  if (!host) return locked;
  host.toggleAttribute("data-tier-locked", locked);
  const parent = markIn || host;
  if (!parent) return locked;
  let mark = parent.querySelector(":scope > .tier-lock");
  if (locked && !mark) {
    mark = document.createElement("span");
    mark.className = "tier-lock";
    mark.setAttribute("aria-hidden", "true");
    parent.appendChild(mark);
  } else if (!locked && mark) {
    mark.remove();
  }
  return locked;
}

// One sheet for every locked surface. It names the FAMILIES rather than saying
// "premium features" — "adds Ragtime / Piedmont and Classic Country" is a real
// pitch, and a user who can see a locked section can't otherwise tell what is
// inside it. `lead` says which control they actually pressed, so the card
// answers the question they asked rather than opening a generic store page.
async function showUnlockSheet(lead) {
  const bought = await unlockModal({
    title: "Unlock everything",
    // Blank line = a real paragraph (modal.js), so the sentence about the
    // control he actually pressed stands apart from the generic pitch.
    message: lead
      ? lead + "\n\nUnlocking is a one-time purchase — every feature, forever, no subscription."
      : "One purchase unlocks every feature, forever. No subscription.",
    items: UNLOCK_BENEFITS,
  });
  // TODO(APP_STORE.md §3): this is where the StoreKit purchase goes. Until the
  // native bridge exists, tapping Unlock flips the stub so the unlocked app can
  // be exercised end to end on a real phone.
  if (bought) {
    tier.setUnlocked(true);
    syncTierLocks();
    render();
  }
  return bought;
}

// The paywall as the DRUMS see it — plain callbacks, so wheel.js stays free of
// entitlement entirely (same trick as `tick`). `refuse` is what turns a settle
// on a locked family into the unlock sheet plus a barrel that turns back.
const wheelGate = {
  // One question per FACE, for both drums. There is no group-level gate any more
  // (session 46g) — headers carry nothing, every locked face wears its own lock.
  qualityLocked: (id) => tier.qualityLocked(id),
  progressionLocked: (id) => {
    // "Unsaved" is a READOUT, not a choice — picking it is already a no-op, so
    // refusing it would be a dead detent for everyone.
    if (id === CUSTOM_PROGRESSION_ID) return false;
    const st = allProgressions().find((p) => p.id === id)?.style;
    return st ? tier.progressionStyleLocked(st) : false;
  },
  // Resolves TRUE if he bought it — the caller then accepts the value he spun
  // to, rather than snapping the barrel away from a chord he just paid for.
  refuse: (kind) => showUnlockSheet(
    kind === "quality"
      ? "That chord is part of the full set — maj7, m7, 6, m6, sus2, sus4 and add9 on every root."
      : "That progression family is part of the full set."
  ),
};

// Pools the DIE may draw from. Without these it would hand you a chord or a
// progression you can't select — a roll you have to undo is worse than no roll.
const rollableChords = () => CHORD_IDS.filter((id) => !tier.qualityLocked(splitChordId(id)?.quality));
const rollableProgression = (p) => !tier.progressionStyleLocked(p.style);

// Re-applies every tier lock. Called from render(), the one funnel all of these
// controls already pass through — the same reason savePrefs() lives there.
function syncTierLocks() {
  const prog = state.chordMode === "progression";
  // PRECEDENCE: MODE BEATS TIER. In single mode ×2 is *not applicable*, so it
  // keeps the plain grey `data-locked` and stays silent; unlocking wouldn't help
  // you there. Only in progression mode does the tier lock apply.
  const x2 = el("x2-toggle");
  setTierLock(x2, prog && tier.featureLocked("x2"), {
    markIn: x2?.parentElement?.querySelector(":scope > span"),
  });
  syncProgressionSaveKey();
}

// The transport glyphs are SVG in index.html now, swapped by CSS off
// `aria-pressed` (session 44e). They used to be the text characters ▶ / ■ plus
// U+FE0E to stop iOS drawing them as colour emoji — a hack that only existed
// because they were text at all, and one that still left their SIZE up to the
// font: U+25A0 rendered as a 5.74px square in a 46px button, beside two 22px
// SVG icons. Nothing here sets the button's contents any more; the only thing
// JS still owns is `aria-pressed` and the aria-label.

// Shown on help mode's own card. Bump on every release, alongside CACHE in
// sw.js — it used to live in index.html's Options header, then at the foot of
// the Guide modal that help mode replaced.
const APP_VERSION = "v3.23.2";

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
  x2: false,            // progression mode only: each chord rings for 2 bars
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
// [{ label, items:[{ value, label }] }]. Every option belongs to a group — the
// trailing ungrouped `extra` this used to take (the progression menu's "Custom")
// went in session 45c, because on a drum an ungrouped option reads as a member of
// whatever section is above it.
function fillSelectGrouped(select, groups) {
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
}

// Every chord select — the Options sheet's and every per-bar one — opens the
// two-reel wheel instead of a list; everything else keeps the standard dropdown.
// The <select> itself is unchanged and still holds all 36 as flat options, so
// it remains the source of truth (see wheel.js).
const chordWheel = createChordWheel({
  // The detent sounds whenever UI sound is on, transport or not (session 47).
  // See the ui-sound listeners near the bottom of this file for why the old
  // "silent while the transport runs" rule was dropped.
  tick: () => playTick(),
  gate: wheelGate,
});
// The Options sheet's field shows the two halves separately under their own
// legends; the per-bar chip shows the one chord name. Same panel either way.
// Key × Progression is the same mechanism over two selects (v2.14.5, his call
// that these are a cross-product like root × quality). The key reel can't go
// through the panel's own `commit` — that targets #progression — so it gets its
// own committer, looked up at call time rather than captured.
const keyProgWheel = createKeyProgWheel({
  tick: () => playTick(),
  keySelect: () => el("key"),
  commitKey: (v) => commit(el("key"), v),
  gate: wheelGate,
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
// "Unsaved", not "Custom", since session 45: saved custom progressions now ride
// their own `Custom` section header on the drum, and two things reading "Custom"
// a few rows apart — one of them a group, one of them a state — was the collision
// worth spending a word on. The VALUE is untouched (`custom`), so every saved
// pattern, describeCurrent() and the docs' vocabulary stay exactly as they were.
const CUSTOM_OPTION = { value: CUSTOM_PROGRESSION_ID, label: "Unsaved" };

// ----- saved custom progressions (item 17) -----
//
// A stored entry is { id, mode, tokens, savedAt }; data.js wants something
// shaped like a preset. This is the one place the two meet, and it's why nothing
// downstream of the registry has to know a custom exists: the LABEL is derived
// from the tokens rather than stored, so an entry is self-describing and can
// never carry a name that's drifted out of step with what it plays.
const asProgression = (item) => ({
  id: item.id,
  mode: item.mode,
  style: "Custom",
  label: item.tokens.join("–"),
  tokens: item.tokens,
  savedAt: item.savedAt,
});

function registerCustomProgressions() {
  setCustomProgressions(progressionStore.list().map(asProgression));
}

const isCustomProgressionId = (id) => typeof id === "string" && id.startsWith(CUSTOM_PROGRESSION_PREFIX);

function initControls() {
  fillSelect(el("chord"), CHORD_IDS, (id) => id, (id) => CHORDS[id].name);
  fillSelectGrouped(el("key"), keyOptionGroups());
  fillSelect(el("bass"), BASS_PRESETS, (p) => p.id, (p) => p.name);
  fillSelectGrouped(el("chaos"), chaosOptionGroups());
  fillSelect(el("label-mode"), LABEL_MODES, (m) => m.id, (m) => m.name);
  fillSelect(el("tone"), TONES, (t) => t.id, (t) => t.name);

  // Progression list is filtered to the current key's mode and grouped by style,
  // plus the "Custom" entry shown once bars stop matching a preset.
  syncProgressionOptions();

  el("chord").value = DEFAULT_CHORD;
  el("label-mode").value = state.labelMode;
  el("key").value = state.key;
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
// The `Custom` section is ALWAYS drawn, even when "Unsaved" is its only member
// (his call, session 45c). It used to ride the end of the drum ungrouped, so with
// nothing saved yet it sat directly under the last style's header and read as
// another Classic Standard. A barrel's engraved captions name everything below
// them until the next one — there is no such thing as "outside a section" on a
// drum, only "in the last one".
function progressionOptionGroups() {
  const groups = progressionGroups(keyMode());
  const last = groups[groups.length - 1];
  // progressionGroups already appends a Custom group when saved customs exist in
  // this mode; Unsaved joins the end of it rather than starting a second one.
  if (last && last.label === "Custom") last.items.push(CUSTOM_OPTION);
  else groups.push({ label: "Custom", items: [CUSTOM_OPTION] });
  return groups;
}

function syncProgressionOptions() {
  fillSelectGrouped(el("progression"), progressionOptionGroups());
}

// The first preset progression of the current key's mode — the landing choice
// when entering progression mode or switching a key across the major/minor line.
function firstProgressionForKey() {
  return PROGRESSIONS.find((p) => p.mode === keyMode())?.id;
}

function readOptions() {
  return {
    bass: el("bass").value,
    chaos: el("chaos").value,
  };
}

// Chords for the bars on screen — one per bar. In progression mode the
// progression sets the bar count; single mode is always the one chord, one bar
// (every bar plays the same distinct picking pattern, so there's nothing left
// for a bar count to vary — see generator.js).
function phraseChords() {
  if (state.chordMode === "progression") {
    return state.progression;
  }
  return [el("chord").value];
}

// ×2 only means anything in progression mode — with one chord there's nothing
// to double. Persists across mode switches (like the capo); just inert while
// in single mode.
function x2Active() {
  return state.chordMode === "progression" && state.x2;
}

// Bars the AUDIO loop actually covers. Under ×2 this is double the bars on
// screen — each displayed bar's chord rings for two bars in a row while the
// grid keeps showing one (see render()'s audioChords).
function audioBars() {
  const n = phraseChords().length;
  return x2Active() ? n * 2 : n;
}

// Keep the progression dropdown honest: a preset id, or "Custom".
function syncProgressionSelect() {
  if (state.chordMode !== "progression") return;
  el("progression").value = detectProgression(state.progression, state.key);
}

// ONE KEY, THREE STATES (his call): greyed on a preset or in single mode, a save
// icon on a hand-edit you haven't stored, a delete icon on one you have. You
// delete a progression from the same place you saved it.
//
// Real `disabled`, NOT the ×2 toggle's `data-locked`: that treatment is scoped to
// `.segmented[data-locked]` in the stylesheet and the ui-sound silence rule keys
// off `.segmented button`, so a plain key inherits neither the dimming nor the
// silence. `disabled` gives both for free, and help mode's liftDisabled already
// makes disabled controls explainable (the Load pill set that precedent).
function syncProgressionSaveKey() {
  const btn = el("save-progression");
  if (!btn) return;
  const mode = isCustomProgressionId(el("progression").value) ? "delete"
    : canSaveProgression() ? "save"
    : "off";
  btn.dataset.action = mode;
  // PRECEDENCE, same rule as ×2: "off" means there is nothing savable here
  // (a preset, or single mode) — not applicable, so it stays really `disabled`
  // and wears no lock. The tier lock only applies where a save WOULD work.
  // Deleting is never gated: removing your own saved data must always be
  // reachable, even on a device that has since dropped to the free tier.
  const tierLocked = mode === "save" && tier.featureLocked("customProgressions");
  setTierLock(btn, tierLocked, { markIn: btn.parentElement });
  btn.disabled = mode === "off";
  btn.setAttribute("aria-label", mode === "delete" ? "Delete this saved progression" : "Save this progression");
  btn.title = mode === "delete" ? "Delete progression" : "Save progression";
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

// The ×2 toggle's own face: a two-key segmented control (Format's family),
// so the seated key mirrors state.x2 (which persists across mode switches —
// see x2Active). Called from render() alongside renderCapo/renderSwing's
// siblings. Same "SEATED == SELECTED" convention as Format: only `.active`
// needs setting, `:active`/`.active` share one CSS rule.
function renderX2() {
  for (const b of el("x2-toggle").querySelectorAll("[data-x2]")) {
    b.classList.toggle("active", (b.dataset.x2 === "on") === state.x2);
  }
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
  syncTierLocks();
  const chords = phraseChords();                       // un-doubled, ≤4 bars on screen
  const phrase = resolvePhrase(state.pattern, chords);  // what's DRAWN
  const x2 = x2Active();
  const progression = state.chordMode === "progression";
  // Lamp COUNT, not a ×2 flag (session 47): 2 under ×2, 1 under ×1, and 0 in
  // single mode — where the bar header is otherwise empty and collapses, so a
  // lamp would cost 26px to say what the playhead already says on one bar.
  // Distinct from `passesPerBar` below, which is the audio→screen bar mapping.
  const passes = progression ? (x2 ? 2 : 1) : 0;
  renderGrid(el("grid"), phrase, {
    labelMode: state.labelMode,
    editableChords: progression,
    editable: state.editing,
    passes,
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
  syncProgressionSaveKey();
  renderContext();
  renderX2();
  // Re-rendering drops the playhead's cells/lamps; keep the loop length in sync
  // too. AUDIO can cover more ground than the grid shows: under ×2 each
  // displayed bar's chord actually rings for two bars in a row. This doubled
  // array is a local, throwaway transform built fresh every render — it must
  // NEVER be written into state.progression, or detectProgression/degreeLabel/
  // the per-bar selects would all start reading a phantom 8-chord progression.
  litCells = [];
  highlightPassLamps(null);
  const audioChords = x2 ? chords.flatMap((c) => [c, c]) : chords;
  const audioPhrase = x2 ? resolvePhrase(state.pattern, audioChords) : phrase;
  passesPerBar = x2 ? 2 : 1;
  metronome.setBars(audioChords.length);
  // Feed the resolved notes to the metronome so Play hears exactly what's on
  // screen — rebuilt every render, so edits/re-rolls/chord changes carry over.
  metronome.setNotes(noteTable(audioPhrase));

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

  // Same chip language as the ABS/MIX bass warning, its own indicator (his
  // call) — a persistent "heads up" readout, independent of the per-bar pass
  // lamps in the grid. Sits beside ABS/MIX in `.type-indicators`, since both
  // can be true at once (e.g. Full Random bass + ×2).
  const x2Ind = el("x2-indicator");
  x2Ind.hidden = !x2;
  x2Ind.textContent = x2 ? "×2" : "";
  x2Ind.title = x2 ? "Each chord rings for two bars instead of one." : "";
  x2Ind.className = "type-indicator" + (x2 ? " x2" : "");

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
  // ×2 stays VISIBLE (not hidden) in single mode, so the sheet doesn't jump —
  // but it LOCKS TO ×1 (his call, session 36c): with one chord there's nothing
  // to double, so entering single mode doesn't just grey the control, it turns
  // ×2 off. That REVERSES the original "persists across mode switches like the
  // capo" design — coming back to progression mode starts at ×1 and you turn it
  // on again. `data-locked` (not `disabled`) is what lets a press still show
  // its press-in/pop-out travel; see index.html and switchX2 below.
  if (!prog) state.x2 = false;
  el("x2-toggle").toggleAttribute("data-locked", !prog);
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
    const roll = randomKeyProgression(state.key, detectProgression(state.progression, state.key), Math.random, rollableProgression);
    if (!roll) return;
    state.key = roll.key;
    el("key").value = roll.key;
    syncProgressionOptions(); // the new key's mode decides what's on the menu
    applyProgressionPreset(roll.progression); // sets bars, marks dirty, renders
    return;
  }
  const chord = randomChord(el("chord").value, Math.random, rollableChords());
  if (!chord) return;
  el("chord").value = chord;
  markDirty();
  render();
}

function applyProgressionPreset(presetId) {
  if (presetId === CUSTOM_PROGRESSION_ID) return; // "Unsaved" is a readout, not a choice
  // The progression's own length sets the bar count.
  state.progression = progressionChords(presetId, state.key);
  markDirty();
  render();
}

// ----- saving and deleting a custom progression (item 17) -----

// The bars, as key-relative numerals. romanInKey RATHER THAN degreeLabel, even
// though a test pins the two as identical for every library chord in every key:
// that agreement is a property maintained by a test, and this value goes into
// STORAGE, where a future KEYS token that disagreed would rot silently. One
// function in, one function out, and chordForRoman is literally its inverse.
const progressionTokens = (chords, keyId) => chords.map((c) => romanInKey(c, keyId));

// Whether the bars on screen COULD be saved as a progression. Four bars, because
// every progression in the app is a four-bar phrase and a shorter one would cycle
// into the wrong bars everywhere downstream (a restored pref or an old export is
// the only way to get here with another length). And a verified round trip,
// because the value goes into storage: this can't fail today — a test drives all
// 120 chords × 7 keys through both directions — which is exactly what makes it
// cheap to assert. What it guards is a future chord quality whose numeral doesn't
// spell back, and the place you must not discover that is after it's in someone's
// library. Both live HERE rather than inside the save handler so the key is simply
// disabled when they don't hold: an unsavable progression is never a dead tap.
function canSaveProgression() {
  if (state.chordMode !== "progression") return false;
  if (state.progression.length !== 4) return false;
  if (detectProgression(state.progression, state.key) !== CUSTOM_PROGRESSION_ID) return false;
  return progressionTokens(state.progression, state.key)
    .every((t, i) => chordForRoman(t, state.key) === state.progression[i]);
}

async function saveCurrentProgression() {
  if (!canSaveProgression()) return;
  const tokens = progressionTokens(state.progression, state.key);
  const saved = progressionStore.save({ mode: keyMode(), tokens });
  if (!saved) {
    await infoModal({
      title: "Couldn't save",
      message: "Browser storage is unavailable or full.",
      confirmText: "OK",
    });
    return;
  }
  registerCustomProgressions();
  syncProgressionOptions();
  el("progression").value = saved.id;
  syncProgressionSaveKey();
}

async function deleteCurrentProgression() {
  const id = el("progression").value;
  if (!isCustomProgressionId(id)) return;
  const entry = allProgressions().find((p) => p.id === id);
  const ok = await confirmModal({
    title: "Delete progression",
    message: `Delete the saved progression ${entry ? entry.label : ""}? The bars on screen won't change.`,
    confirmText: "Delete",
    cancelText: "Keep",
    danger: true,
  });
  if (!ok) return;
  progressionStore.remove(id);
  registerCustomProgressions();
  // syncProgressionOptions REBUILDS the select, which drops the deleted <option>
  // and leaves the browser pointing at the first one — so the trigger would read
  // a preset while the bars are untouched. syncProgressionSelect puts it back on
  // whatever the bars actually are, which is now "Unsaved".
  syncProgressionOptions();
  syncProgressionSelect();
  render();
}

// Changing key within the SAME mode transposes by numeral: every bar is read as
// its degree in the old key and re-spelled in the new one. Crossing the major/
// minor line (e.g. E → Am) can't transpose — the token sets differ — so the
// progression list is rebuilt for the new mode and we land on that mode's first
// preset (the agreed default-on-mode-switch).
//
// THIS USED TO GO THROUGH degreeOf ALONE, and therefore through the curated KEYS
// map, which left any chord the map doesn't name exactly where it was: a bar
// edited to Am7 in C stayed Am7 in G instead of becoming Em7. That was a
// documented wart ("unknown chords stay put") for as long as a custom progression
// was welded to one pattern. It stops being survivable in session 45, where the
// whole promise of a saved progression is that it plays in any key of its mode —
// a mis-transposed bar would be real, plausible, and silently wrong.
//
// romanInKey/chordForRoman are total over the library (a test drives all 120
// chords × 7 keys both ways), so the numeral path subsumes the map path rather
// than competing with it: for a chord the map does name, the two agree by
// construction. The `?? c` is belt and braces for a chord id from outside the
// library entirely.
function setKey(newKey) {
  const oldKey = state.key;
  const modeChanged = KEYS[newKey].mode !== KEYS[oldKey].mode;
  state.key = newKey;
  if (state.chordMode === "progression" && modeChanged) {
    syncProgressionOptions();
    applyProgressionPreset(firstProgressionForKey());
    return;
  }
  state.progression = state.progression.map(
    (c) => chordForRoman(romanInKey(c, oldKey), newKey) ?? c);
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
// Swing lives here as a SESSION DEFAULT (persists across launches, the same
// class of thing as BPM used to be before it moved to tp-prefs) — you settle on
// a feel and keep it, rather than re-picking it every launch. It ALSO now saves
// with each pattern (currentContext()), musical content same as the capo, with
// the saved value winning on load (loadSaved()) — additive, not a migration off
// this store.
const audioPrefs = {
  click: true, pattern: true, ui: true, countIn: true, swing: DEFAULT_SWING,
  // Timbre lives here with the other sound settings, NOT in a pattern's saved
  // context: it's what the app sounds like, in the same class as the four
  // toggles, not musical content the way swing/bpm/capo are. (Swing moved into
  // pattern context because a feel belongs to a piece; "nylon or steel" is a
  // property of the instrument you're practising on.)
  tone: DEFAULT_TONE,
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
// through (capo, chord, key, progression, thumb, fingers, ×2, labels and the
// mode switch all re-render). That includes loadSaved(), which is what makes
// "reopen how you left it" true of a loaded pattern too — his call. BPM doesn't
// render, so it saves itself.
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
      // Same dual-layer treatment as capo: a session default here, and musical
      // content inside a saved pattern's own context, which wins on load.
      x2: state.x2,
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
  if (typeof stored.x2 === "boolean") state.x2 = stored.x2;
  if (KEYS[stored.key]) {
    state.key = stored.key;
    el("key").value = stored.key;
    syncProgressionOptions(); // this key's mode decides what's on the menu
  }
  restoreSelect("bass", stored.bass);
  restoreSelect("chaos", stored.chaos);
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
  // Called UNCONDITIONALLY, single mode included (session 36c) — it's now also
  // what applies ×2's lock, and a stored `x2: true` alongside a stored single
  // mode would otherwise restore a seated ×2 key inside a control that's
  // supposed to be locked to ×1. Harmless for single mode: it just re-lays the
  // fields and calls render(), which no-ops while state.pattern is null.
  setChordMode(stored.chordMode === "progression" ? "progression" : "single");
}

// The playhead touches cells directly rather than re-rendering the grid — it
// moves up to 8 times a bar and a full re-render would be wasteful (and would
// fight edit mode).
let litCells = [];
// How many AUDIO bars each SCREEN bar covers — 2 under ×2, else 1. Set in
// render(), read here to translate the metronome's audio-bar position back to
// a screen bar + which pass it's on. No second clock: this rides the exact same
// onStep callback that already drives the cell highlight and the beat lamp.
let passesPerBar = 1;
function highlightColumn(pos) {
  for (const c of litCells) c.classList.remove("playing");
  litCells = [];
  if (!pos) { highlightPassLamps(null); return; }
  const { bar: screenBar, pass } = splitAudioBar(pos.bar, passesPerBar);
  litCells = [...el("grid").querySelectorAll(
    `.cell[data-bar="${screenBar}"][data-slot="${pos.slot}"]`
  )];
  for (const c of litCells) c.classList.add("playing");
  // Unconditional since session 47: ×1 lights its single lamp too, and under ×1
  // splitAudioBar always reports pass 0, so the same call covers both. Single
  // mode renders no lamps at all, so the lookup simply finds nothing there —
  // self-guarding, rather than a mode test that could drift from the markup.
  highlightPassLamps(screenBar, pass);
}

// The pass lamps in a bar's header. Under ×2 there are two — left lights on the
// first pass through that bar's chord, right on the second; under ×1 there is one
// and it simply marks the sounding bar. Same direct-DOM-touch approach as the
// cell highlight, for the same reason (no re-render mid-playback).
let litLamps = [];
function highlightPassLamps(screenBar, pass) {
  for (const l of litLamps) l.classList.remove("lit");
  litLamps = [];
  if (screenBar == null) return;
  // The selector comes from grid.js, which owns the markup — never re-typed
  // here. It was, once, and matched nothing (see passLampSelector's comment).
  const lamp = el("grid").querySelector(passLampSelector(screenBar, pass));
  if (lamp) {
    litLamps = [lamp];
    lamp.classList.add("lit");
  }
}

function showCountIn(n) {
  const counting = n != null;
  const track = el("grid").querySelector(".grid-track");
  if (track) track.classList.toggle("counting", counting);
  // The Play button no longer flashes the count-in digits — that fought the
  // hardware feel. The dimmed grid + the blinking beat lamp carry the count now,
  // so Play just holds the running (stop) glyph through the count-in.
  const play = el("play");
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
// stopTransport() returned early, so the button stayed showing STOP forever.
function releasePlayback() {
  el("play").setAttribute("aria-pressed", "false");
  showCountIn(null); // clears the dim and resets the label
  syncAudioCategory(); // may hand the category back now the take is over
}

// WHETHER WE HOLD THE SILENT-SWITCH OVERRIDE, in one place (session 48b, his call).
// On the web this is ONE knob: "playback" ignores the iOS silent switch but does
// NOT mix, so holding it stops another app's audio. The two things you might want
// — clicks on a silenced phone, and a podcast that keeps playing — are therefore
// mutually exclusive, and this function is where that trade is made. We hold it
// only where it actually buys something:
//   • while the transport runs — non-negotiable, you must hear the click; and
//   • while the BUTTONS LAMP is on — the only reason to want it outside a take is
//     to make the UI thock audible through a silenced ring switch.
// So turning Buttons off leaves another app's audio alone until you press Play,
// which is the podcast case, with no new control to find. The playback guard
// releases it on hide regardless, which bounds the cost to "while you're in here".
// (A native shell could have both at once — iOS's own API has playback +
// mixWithOthers — but `navigator.audioSession` doesn't expose that option.)
function syncAudioCategory() {
  audioSession.setPlayback(metronome.running || audioPrefs.ui);
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
  // Claim it UNCONDITIONALLY here, not via syncAudioCategory(): a take must sound
  // through a silenced switch whatever the Buttons lamp says, and `running` is
  // still false at this point anyway. It must also precede the AudioContext being
  // born, so the context is created under "playback" (see platform.js).
  audioSession.setPlayback(true);
  let started = false;
  try {
    // Started from the click handler so iOS Safari unlocks audio.
    started = await metronome.start(audioBars());
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
    // ×2 changes the harmonic rhythm, which is musical content — same tier as
    // the capo, dual-layer with a tp-prefs session default (see restorePrefs).
    x2: state.x2,
    // Swing ALSO saves here now (his call), additively — it stays a tp-audio
    // session default too (see the comment above audioPrefs). Absent on loads
    // of a pattern saved before this shipped; loadSaved() leaves the session
    // swing untouched in that case rather than resetting it, since an old
    // pattern never "had" a swing value the way it always had a capo.
    swing: audioPrefs.swing,
    // BPM joins swing, not capo (his call — a beginner built-in pattern wants
    // a slower tempo than an intermediate one, and that has to travel with
    // the pattern). Same dual-layer shape: a tp-prefs session default too
    // (see restorePrefs), with the saved value winning on load. Same absent
    // handling as swing, not capo: an old save's missing bpm doesn't mean "it
    // wanted 90" the way a missing capo means "it was 0" — tempo simply
    // wasn't pattern content yet — so loadSaved() leaves the session tempo
    // alone rather than resetting it.
    bpm: metronome.bpm,
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
  return `${el("chord").value} · ${bassName}`;
}

// ----- built-in pattern seeding (item 2, session 41 redesign) -----
// His verdict on the first design (v3.8.0, read-only + "save a copy"): it
// cost two library entries for what's really one thing, for what's meant to
// be a demo. So a built-in is instead seeded ONCE into the real library, via
// the ordinary savedStore.save(), filed into a folder literally named
// "Built-in" — after that it's indistinguishable from a hand-saved pattern:
// rename, move, delete, whatever. `builtinId` (storage.js) is the invisible
// thread that survives all of that, and it's what "missing" means below —
// never the item's current name or folder, both of which are fair game to
// change.
const BUILTIN_SEEDED_KEY = "tp-builtin-seeded";

// Ids ever auto-seeded — NOT the same question as which ones are in the
// library right now. Read raw (no seeded defaults) for the same reason
// loadAudioPrefs() does: this only has one job, remembering what's already
// been offered once, and a blob pre-filled with "everything" would make a
// genuinely-new id in a future release indistinguishable from one that was
// already seeded.
function loadSeededBuiltinIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(BUILTIN_SEEDED_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function saveSeededBuiltinIds(ids) {
  try {
    localStorage.setItem(BUILTIN_SEEDED_KEY, JSON.stringify(ids));
  } catch { /* quota or private mode: seeding just won't stick this session */ }
}

function seedBuiltin(entry) {
  savedStore.save({
    name: entry.name,
    pattern: entry.pattern,
    context: entry.context,
    source: entry.source,
    folder: "Built-in",
    builtinId: entry.id,
  });
}

// The built-in entries with no matching `builtinId` anywhere in the real
// library right now — "missing" in the sense the Restore button cares about.
// A rename or a move to another folder doesn't touch builtinId, so neither
// counts; only an actual delete does.
function missingBuiltins() {
  const present = new Set(savedStore.list().map((i) => i.builtinId).filter(Boolean));
  return BUILTIN_PATTERNS.filter((b) => !present.has(b.id));
}

// Boot-time only. Adds any builtin id that's NEVER been seeded before — a
// true first launch, or a future release adding a new one — and never an id
// that has been, whether or not it's still in the library. That's what makes
// a delete stick across relaunches instead of silently reappearing.
function seedNewBuiltins() {
  const seeded = new Set(loadSeededBuiltinIds());
  let added = false;
  for (const entry of BUILTIN_PATTERNS) {
    if (seeded.has(entry.id)) continue;
    seedBuiltin(entry);
    seeded.add(entry.id);
    added = true;
  }
  if (added) saveSeededBuiltinIds([...seeded]);
}

// The Restore button (`#restore-builtins-btn`): the explicit, on-demand
// counterpart to seedNewBuiltins() — adds back whatever's actually missing
// right now, regardless of seed history. Returns the count restored, for the
// status line.
function restoreMissingBuiltins() {
  const missing = missingBuiltins();
  for (const entry of missing) seedBuiltin(entry);
  if (missing.length) {
    const seeded = new Set(loadSeededBuiltinIds());
    for (const entry of missing) seeded.add(entry.id);
    saveSeededBuiltinIds([...seeded]);
  }
  return missing.length;
}

function refreshSavedCount() {
  const n = savedStore.count();
  // The pill is icon-only, so the count lives in the label rather than the face
  // (writing textContent here would wipe the SVG). The enabled/disabled state
  // already says "there is something to load"; the number is a long-press away.
  const label = n ? `Load pattern (${n} saved)` : "Load pattern";
  el("open-load").setAttribute("aria-label", label);
  el("open-load").title = n ? `Load (${n} saved)` : "Load";
  // Built-ins are real saved items now (session 41), so n === 0 only happens
  // if EVERYTHING, Built-ins included, has been deleted — and that's exactly
  // when the Load sheet, the only way to reach Restore, must stay reachable.
  el("open-load").disabled = n === 0 && BUILTIN_PATTERNS.length === 0;
  // Export/Import/Restore are paid. They keep their own "nothing to do yet"
  // disabled state — MODE BEATS TIER here too, so an empty library still reads
  // as empty rather than as something to buy.
  const libLocked = tier.featureLocked("exportImport");
  el("export-btn").disabled = n === 0;
  el("restore-builtins-btn").disabled = !missingBuiltins().length;
  setTierLock(el("export-btn"), libLocked && n > 0);
  setTierLock(el("import-btn"), libLocked);
}

// Sentinel option value for the per-item folder <select>'s trailing "+ New
// Folder…" entry — UI-local, never written to storage.js (setFolder always
// gets called with a real typed name or not at all), so it only has to avoid
// colliding with a real folder name, not with anything storage.js knows about.
const NEW_FOLDER_OPTION = "__new_folder__";

// A group header row: real folders get Rename/Delete (revealed on tap, per
// his settled design — the actions stay out of the way until you ask).
// "Built-in" is a real folder (session 41) and gets the same treatment as
// any other; only "Unfiled" is a plain, unbuttoned label, since it's the
// absence of a folder rather than one you could rename or delete. Wears
// the app's existing engraved-section-header idiom (`.dd-group`, the same
// class an <optgroup> becomes in a drum's list panel) rather than a new one.
function appendGroupHeader(list, name, { folder = false } = {}) {
  const li = document.createElement("li");
  li.className = "folder-header";

  if (!folder) {
    const label = document.createElement("span");
    label.className = "folder-name dd-group";
    label.textContent = name;
    li.appendChild(label);
    list.appendChild(li);
    return;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "folder-header-btn";
  const label = document.createElement("span");
  label.className = "folder-name dd-group";
  label.textContent = name;
  btn.appendChild(label);
  li.appendChild(btn);

  const actions = document.createElement("div");
  actions.className = "folder-actions";
  actions.hidden = true;

  const rename = document.createElement("button");
  rename.type = "button";
  rename.textContent = "Rename";
  rename.addEventListener("click", async () => {
    const next = await promptModal({
      title: "Rename folder",
      message: `New name for "${name}"`,
      value: name,
      confirmText: "Rename",
    });
    if (next == null) return;
    if (!savedStore.renameFolder(name, next)) return;
    renderSavedList();
  });

  // Deleting a folder can only reorganize, never lose a pattern (it un-files
  // every item in it), same principle as import's merge-only behaviour — so,
  // like import, it needs no confirmModal.
  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "Delete";
  del.addEventListener("click", () => {
    savedStore.clearFolder(name);
    renderSavedList();
  });

  actions.append(rename, del);
  li.appendChild(actions);
  btn.addEventListener("click", () => { actions.hidden = !actions.hidden; });

  list.appendChild(li);
}

// A real, personal saved item's row (session 43 redesign): one row to load —
// tap the pattern itself, "Load" as a separate button is gone — plus a "..."
// that reveals Rename/Export/Delete and the folder-assign select, which used
// to sit in the open beside Load/Rename/Delete and now moves in with them
// (his call: the row was crowded, and everything but loading is reached rarely
// enough to earn its own tap).
function appendSavedRow(list, item, folders) {
  const li = document.createElement("li");
  li.className = "saved-item";

  const main = document.createElement("button");
  main.type = "button";
  main.className = "saved-main";
  main.setAttribute("aria-label", `Load "${item.name}"`);
  const name = document.createElement("div");
  name.className = "saved-name";
  name.textContent = item.name;
  const sub = document.createElement("div");
  sub.className = "saved-sub";
  sub.textContent = summarize(item);
  main.append(name, sub);
  main.addEventListener("click", () => loadSaved(item.id));

  const actions = document.createElement("div");
  actions.className = "saved-actions";
  actions.hidden = true;

  const optionsBtn = document.createElement("button");
  optionsBtn.type = "button";
  optionsBtn.className = "saved-options-btn";
  optionsBtn.setAttribute("aria-label", `Options for "${item.name}"`);
  // Vertical dots (a kebab) mark a PER-ITEM menu; the header's "..." (a
  // meatball, horizontal) marks the page-level one — so the two never read as
  // the same kind of control at a glance.
  optionsBtn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/></svg>';
  optionsBtn.addEventListener("click", () => { actions.hidden = !actions.hidden; });

  const actionsRow = document.createElement("div");
  actionsRow.className = "saved-actions-row";

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

  const exportOne = document.createElement("button");
  exportOne.type = "button";
  exportOne.textContent = "Export";
  // The per-item export is the SAME feature as the library one — buildExport()
  // has shared a wrapper shape between a single item and the whole library since
  // session 38 — so it takes the same gate (his note, session 46d).
  setTierLock(exportOne, tier.featureLocked("exportImport"));
  exportOne.addEventListener("click", () => {
    if (exportOne.hasAttribute("data-tier-locked")) {
      showUnlockSheet("Exporting writes a pattern to a file you can keep, move to another device, or hand to someone.");
      return;
    }
    exportItem(item);
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

  // Folder assignment: a plain <select>, enhanced the same way every other
  // picker in the app is (dropdown.js) rather than a new control paradigm —
  // Unfiled, every folder currently in use, then a prompt to create one. His
  // follow-up: it rides the SAME row as Rename/Export/Delete now (there used
  // to be a row of its own underneath), and its trigger always reads "Folder"
  // rather than the current folder name — the group header above already
  // shows which folder an item is in, so the current name on the trigger was
  // redundant, and a fixed short label is what lets it fit the row at all
  // (`renderSavedList()`'s enhanceAll() picker gives it that fixed label).
  const sel = document.createElement("select");
  sel.className = "folder-select";
  sel.setAttribute("aria-label", `Folder for "${item.name}"`);
  sel.add(new Option("Unfiled", ""));
  for (const f of folders) sel.add(new Option(f, f));
  sel.add(new Option("+ New Folder…", NEW_FOLDER_OPTION));
  sel.value = item.folder && folders.includes(item.folder) ? item.folder : "";
  sel.addEventListener("change", async () => {
    if (sel.value === NEW_FOLDER_OPTION) {
      const created = await promptModal({
        title: "New folder",
        message: `Move "${item.name}" into a new folder`,
        confirmText: "Create",
      });
      const clean = (created || "").trim();
      // Cancelled or blank: fall through to a re-render, which resets the
      // trigger to the item's actual (unchanged) folder rather than leaving
      // it showing "+ New Folder…", a value nothing was ever committed to.
      if (clean) savedStore.setFolder(item.id, clean);
    } else {
      savedStore.setFolder(item.id, sel.value || null);
    }
    renderSavedList();
  });

  actionsRow.append(rename, exportOne, del, sel);

  actions.append(actionsRow);
  li.append(main, optionsBtn, actions);
  list.appendChild(li);
}

function renderSavedList() {
  const list = el("saved-list");
  list.innerHTML = "";
  const items = savedStore.list();
  const folders = savedStore.folders();

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "saved-empty";
    li.textContent = "Saved patterns will appear here.";
    list.appendChild(li);
    return;
  }

  // No dead chrome: group headers (including "Unfiled") only earn their keep
  // once at least one real folder is in use. Nobody who's never touched
  // folders should see an "Unfiled" label over every single item. "Built-in"
  // is a real folder now (session 41) — it earns its header the same way any
  // other folder does, sorted alphabetically among them, not pinned.
  if (folders.length) {
    for (const name of folders) {
      const inFolder = items.filter((i) => i.folder === name);
      if (!inFolder.length) continue; // folders() only lists names in use; defensive
      appendGroupHeader(list, name, { folder: true });
      for (const item of inFolder) appendSavedRow(list, item, folders);
    }
    const unfiled = items.filter((i) => !i.folder);
    if (unfiled.length) {
      appendGroupHeader(list, "Unfiled");
      for (const item of unfiled) appendSavedRow(list, item, folders);
    }
  } else {
    for (const item of items) appendSavedRow(list, item, folders);
  }

  // The per-item folder selects are rebuilt every call, same as the per-bar
  // chord selects on every render() — idempotent per element via data-dd, and
  // the default list panel closes on its own commit (see dropdown.js), so
  // unlike the wheel this needs no retargetOpenPanel: nothing here stays open
  // across more than one pick. The folder-select's `label` picker fixes its
  // trigger's face at "Folder" always — the group header above already shows
  // which folder it's in, and a static short label is what lets it sit in the
  // Rename/Export/Delete row at all.
  enhanceAll(list, (s) =>
    s.classList.contains("folder-select")
      ? { label: (_sel, labelEl) => { labelEl.textContent = "Folder"; } }
      : {}
  );
}

// Whole-library backup, and how patterns move between devices or to someone
// else — belt-and-braces insurance against iOS evicting localStorage, item 4.
// Export is deliberately library-wide, never per-pattern: it covers both
// jobs (backup, and handing someone a file) without a fourth button crowding
// the saved-item row.
function exportLibrary() {
  const payload = buildExport(savedStore.list());
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thumbpicker-library-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Export ONE pattern (item 6, session 43 — his call, from the per-item "..."
// menu). The wrapper shape is identical to the whole-library export (a single
// item and a full library have always shared one wrapper, so import only ever
// needs one code path, per storage.js) — this just hands buildExport() a
// one-item array instead of the whole store.
function exportItem(item) {
  const payload = buildExport([item]);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = item.name.replace(/[^\w\- ]+/g, "").trim() || "pattern";
  a.download = `thumbpicker-${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Import is a MERGE, never a replace — nothing existing is overwritten or
// deleted, so it needs no confirmModal (that's reserved for actions that can
// lose data). Name collisions get the same Finder-style "(2)" suffix a manual
// double-Save already produces, via the same savedStore.save() every other
// save path uses.
function importLibrary(file) {
  const hint = el("import-hint");
  const reader = new FileReader();
  reader.onload = () => {
    const result = parseImport(String(reader.result));
    if (!result.ok) {
      hint.textContent = result.error;
      return;
    }
    let saved = 0;
    for (const item of result.items) {
      if (savedStore.save(item)) saved++;
    }
    const failed = result.items.length - saved;
    const parts = [`Imported ${saved} pattern${saved === 1 ? "" : "s"}`];
    if (result.skipped) parts.push(`skipped ${result.skipped} unreadable`);
    if (failed) parts.push(`${failed} failed to save`);
    hint.textContent = parts.join(", ") + ".";
    renderSavedList();
    refreshSavedCount();
  };
  reader.onerror = () => {
    hint.textContent = "Couldn't read that file.";
  };
  reader.readAsText(file);
}

// Rewritten session 43 (his call): the old line led with Thumb/Fingers preset
// names, falling back to "Custom" for any hand-edited item — and since the
// built-ins and most real use are hand-edited, that's almost every item in the
// library. What's actually useful at a glance is what you're playing OVER.
// His follow-up: say it the way you'd say it out loud — "I-V-vi-IV in E," not
// a separate "Progression" label and a "Key E" segment — so the numerals and
// the key are ONE clause, not two. Single mode already reads fine as just the
// chord's name, no "Single" label needed either. The custom NAME is still the
// place for anything else worth remembering.
function summarize(item) {
  const ctx = item.context || {};
  const headline = ctx.chordMode === "progression"
    ? `${(ctx.progression || []).map((c) => degreeLabel(c, ctx.key)).join("–")} in ${ctx.key}`
    : (CHORDS[ctx.chord]?.name ?? ctx.chord);
  // Capo and ×2 are still worth a glance — real hardware/timing facts, not
  // generation metadata — so they ride along after the format/chord info.
  return [headline, capoLabel(ctx.capo), ctx.x2 ? "×2" : ""]
    .filter(Boolean).join(" · ");
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

async function saveCurrent() {
  if (!state.pattern) return;
  const typed = el("save-name").value;
  const name = typed.trim() || describeCurrent();
  const source = state.pattern.edited ? "drawn" : "generated";

  // Re-saving under a name already in the library used to silently spawn a
  // "(2)" — his reported friction (edit a pattern, save, then hunt down and
  // delete the stale duplicate by hand). Ask once, and only here: import
  // still merges via the old suffix behaviour untouched (see storage.js),
  // since a batch import has no one to ask.
  const existing = savedStore.list().find((i) => i.name === name);

  // THE FREE CAP. Checked against `existing.id`, so overwriting one of your
  // three is always allowed — it consumes no new slot, and refusing it would
  // strand a free user who just wants to revise something. Built-ins never
  // count (entitlement.js): seedNewBuiltins() puts five real items in the
  // library at boot, so counting them would start a free user at 5 of 3.
  if (!tier.canSave(savedStore.list(), existing?.id)) {
    const used = tier.usedSlots(savedStore.list());
    await showUnlockSheet(`The free library holds ${FREE_SAVE_SLOTS} patterns, and you've used ${used}.`);
    return;
  }

  let item;
  if (existing) {
    const overwrite = await confirmModal({
      title: "Overwrite pattern",
      message: `A pattern named "${name}" already exists. Overwrite it?`,
      confirmText: "Overwrite",
      cancelText: "Cancel",
    });
    if (!overwrite) return;
    item = savedStore.update(existing.id, { name, pattern: state.pattern, context: currentContext(), source });
  } else {
    item = savedStore.save({ name, pattern: state.pattern, context: currentContext(), source });
  }
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
  state.x2 = !!ctx.x2; // absent (pre-×2 saves) -> off, same hard default as capo

  el("bass").value = item.pattern.bass;
  el("chaos").value = item.pattern.chaos;
  el("key").value = state.key;
  if (ctx.chord) el("chord").value = ctx.chord;
  // Swing diverges from capo's precedent: absent doesn't mean "was Straight" the
  // way absent capo means "was 0" — swing never existed as pattern content
  // before this, so an old save's silence on it leaves the current session
  // swing exactly as it was, rather than resetting it.
  if (ctx.swing != null) {
    audioPrefs.swing = clampSwing(ctx.swing);
    applySwing();
  }
  // Same precedent as swing, for the same reason: absent means "never had a
  // bpm," not "wanted 90," so an old save leaves the session tempo untouched.
  if (ctx.bpm != null) setBpm(ctx.bpm);

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
// Show/hide a bottom sheet WITH the slide animation (styles.css). `hidden` stays
// the logical source of truth and flips synchronously, so every reader (the
// Escape/click handlers, help mode, the tests) sees open/closed instantly. The
// only extra is the exit: [hidden]{display:none!important} would kill the panel
// before it could slide out, so we hold it in the tree with `.sheet-closing`
// (display:flex!important in CSS) for one animation, then let `hidden` take over.
const SHEET_MS = 300; // keep in step with --sheet-ms in styles.css (his call: 220 read as too quick)
function showSheet(sheet, open) {
  clearTimeout(sheet._sheetTimer);
  if (open) {
    sheet.classList.remove("sheet-closing"); // in case a close was still in flight
    sheet.hidden = false; // base rule is the open look; @starting-style slides it in
  } else {
    sheet.classList.add("sheet-closing"); // keep it displayed just long enough to slide out
    sheet.hidden = true;
    sheet._sheetTimer = setTimeout(() => sheet.classList.remove("sheet-closing"), SHEET_MS + 40);
  }
}

function setOptionsOpen(open) {
  showSheet(el("options-sheet"), open);
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

// ONE SYNC IS NOT ENOUGH, AND THAT WAS THE WHOLE BUG (session 47, his second
// report: "the save field doesn't come up with the keyboard until after another
// tap"). `syncSheetToViewport` is a snapshot, and every moment it could be taken
// at is the wrong one:
//   - at `focusin` the keyboard has not opened yet, so `keyboardUp` is false and
//     the sync CLEARS the pin;
//   - iOS then fires visualViewport resizes DURING the keyboard animation, with
//     intermediate heights, and does not reliably fire a final one once it
//     settles.
// So the sheet was left unpinned until some unrelated later event — the next tap
// — happened to re-run the snapshot against a settled viewport.
//
// Re-running until the viewport stops moving fixes both halves: the sheet lands
// as the keyboard arrives rather than a tap later, and because it lands promptly
// iOS has less reason to scroll the document to reveal the field, which is what
// the scroll guard was left mopping up. Self-terminating — three identical
// heights or 1.2s, whichever comes first — so it costs nothing at rest.
let sheetSyncTimer = null;
function scheduleSheetSync() {
  syncSheetToViewport();
  const vv = window.visualViewport;
  if (!vv) return;
  clearInterval(sheetSyncTimer);
  let last = vv.height;
  let stable = 0;
  const startedAt = Date.now();
  sheetSyncTimer = setInterval(() => {
    syncSheetToViewport();
    stable = vv.height === last ? stable + 1 : 0;
    last = vv.height;
    if (stable >= 3 || Date.now() - startedAt > 1200) {
      clearInterval(sheetSyncTimer);
      sheetSyncTimer = null;
    }
  }, 60);
}

// One sheet, two modes: Save shows the name field, Load shows the library.
function openSheet(mode) {
  const saving = mode === "save";
  el("saved-title").textContent = saving ? "Save" : "Load";
  el("save-section").hidden = !saving;
  el("library-menu-btn").hidden = saving;
  el("saved-list").hidden = saving;
  // The library menu ("...") and its status line never carry over from a
  // previous visit — closed on every open, same as it is on every close, so
  // a "Restored N patterns" line can't linger past the moment that opened it
  // (session 43: it used to survive until the app was force-quit, and showed
  // on the Save card too, since nothing ever cleared it).
  el("library-menu").hidden = true;
  el("import-hint").textContent = "";

  if (saving) {
    el("save-name").value = "";
    el("save-hint").textContent = "";
    el("save-name").placeholder = describeCurrent();
  } else {
    renderSavedList();
  }
  showSheet(el("saved-sheet"), true);
  // Same treatment as the Options sheet: half of what's worth explaining now
  // lives inside, so help mode has to reach the "?" over this sheet's scrim
  // too (see body.saved-open in styles.css).
  document.body.classList.add("saved-open");
  syncSheetToViewport();
  // THE NAME FIELD IS DELIBERATELY NOT FOCUSED (session 47, his call). Opening
  // Save used to focus it immediately, which summoned the keyboard while the
  // sheet was still animating in — and that race is what produced the quick
  // slide-and-flash he reported in the grid behind it: iOS begins scrolling to
  // reveal the field, paints that frame, and the scroll guard in initControls
  // then yanks it back. Not focusing removes the race rather than fighting it.
  //
  // It is also the better default on its own terms: the placeholder already
  // carries a sensible auto-name (describeCurrent()), so a save that accepts it
  // had to dismiss a keyboard it never asked for, over a sheet the keyboard was
  // covering. Typing a custom name now costs one tap on the field.
}
function closeSheet() {
  showSheet(el("saved-sheet"), false);
  document.body.classList.remove("saved-open");
  el("library-menu").hidden = true;
  el("import-hint").textContent = "";
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

  // ×2 never touches the pattern — same reasoning as the capo — so it just
  // re-renders. Wired exactly like Format: a seated key is a no-op re-press
  // (guarded here, and also covered by seatedLatch()'s silent-ka-chunk rule
  // below since these are `.segmented button`s), and it commits on pointerup
  // for the same flash-free reason Format and the page tabs do.
  //
  // LOCKED in single mode (`data-locked`, set by setChordMode): the press is
  // refused HERE rather than by `disabled`, which is what gives it the
  // press-in-and-pop-back-out travel he asked for — a disabled button can't be
  // `:active` at all, so it just sat dead under the finger.
  const switchX2 = (e) => {
    if (el("x2-toggle").hasAttribute("data-locked")) return;
    // Tier-locked is the OTHER kind of refusal: it has somewhere to go, so it
    // opens the sheet instead of being a silent no-op.
    if (el("x2-toggle").hasAttribute("data-tier-locked")) {
      if (e.type === "click") showUnlockSheet("×2 lets each chord in a progression ring for two bars.");
      return;
    }
    const btn = e.target.closest("[data-x2]");
    if (btn && btn.classList.contains("active") === false) {
      state.x2 = btn.dataset.x2 === "on";
      markDirty();
      render();
    }
  };
  el("x2-toggle").addEventListener("pointerup", switchX2);
  el("x2-toggle").addEventListener("click", switchX2);

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
  // Picking "Unsaved" is a no-op in applyProgressionPreset, so the key's face has
  // to be refreshed here as well as from render() — selecting a saved progression
  // DOES re-render (it changes the bars), but landing back on Unsaved doesn't.
  el("progression").addEventListener("change", syncProgressionSaveKey);
  el("save-progression").addEventListener("click", () => {
    const btn = el("save-progression");
    if (btn.hasAttribute("data-tier-locked")) {
      showUnlockSheet("Saving your own progressions stores them as numerals, so one idea plays in any key.");
      return;
    }
    if (btn.dataset.action === "delete") deleteCurrentProgression();
    else saveCurrentProgression();
  });

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
  // A key in a LOCKED segmented control (×2 in single mode) is the same class of
  // no-op: it presses in and pops back out without committing anything, so it
  // takes the same silence. Generic on `[data-locked]` rather than named after
  // ×2 — any locked-but-still-pressable control gets it for free.
  const seatedLatch = (e) => {
    const seg = e.target.closest?.(".segmented button");
    if (!seg) return false;
    return seg.classList.contains("active") || !!seg.closest("[data-locked]");
  };

  // UI SOUND DURING A TAKE: ALLOWED (session 47, his call — REVERSES v2.8.2).
  //
  // The old rule silenced every UI voice while the transport ran. The reasoning
  // was sound and is kept here because it is still TRUE, just no longer decisive:
  // the web cannot read the iOS ring switch, and playback is the only window in
  // which we hold the `playback` audio category that overrides it — so muting
  // buttons there is what made a silenced phone genuinely silent while the
  // metronome and melody (audio you asked for) still came through.
  //
  // What overturned it: the UI sound has its own Preferences lamp. Anyone bothered
  // by clicks over a take can switch them off, and that is a clearer contract than
  // a voice that vanishes for reasons the user can neither see nor predict. The
  // cost is the accepted side effect in reverse — with the ringer OFF you now hear
  // button clicks during a take unless you turn the lamp off.
  //
  // All four voices moved together (press/release here, the wheel's detent and
  // edit mode's thock above): they were one policy, and splitting them would make
  // the wheel silent over a take while the button beside it clicked.
  let pressNoop = false;
  document.addEventListener("pointerdown", (e) => {
    let s = pressStrength(e);
    if (s == null && (overOpenTrigger(e) || overOpenDie(e))) s = 0.82;
    if (s == null) return;
    pressNoop = seatedLatch(e);
    if (!pressNoop) playPress(s);
  });
  document.addEventListener("pointerup", (e) => {
    let s = pressStrength(e);
    if (s == null && (overOpenTrigger(e) || overOpenDie(e))) s = 0.82;
    if (s == null || pressNoop) return;
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
    // The lamp is also the silent-switch/mixing trade (see syncAudioCategory):
    // switching it off mid-session should hand another app's audio straight back.
    syncAudioCategory();
    saveAudioPrefs();
  });
  // One-bar count-in before the loop (off = start immediately).
  el("count-in-toggle").addEventListener("change", (e) => {
    audioPrefs.countIn = e.target.checked;
    metronome.setCountInEnabled(audioPrefs.countIn);
    saveAudioPrefs();
  });
  // Nylon vs steel. Lands on the next scheduled slot like swing, so it can be
  // A/B'd mid-loop without stopping.
  el("tone").addEventListener("change", (e) => {
    audioPrefs.tone = e.target.value;
    metronome.setTone(audioPrefs.tone);
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

  // A tapped cell as a {cellIndex, slot, string, chordId} the editor understands.
  // cellIndex is the DISTINCT bar (screenBar % bars.length) — a repeat shares one
  // cell — and chordId is that screen bar's chord.
  const cellRef = (cell) => {
    const screenBar = Number(cell.dataset.bar);
    return {
      cellIndex: screenBar % state.pattern.bars.length,
      slot: Number(cell.dataset.slot),
      string: Number(cell.dataset.string),
      chordId: phraseChords()[screenBar],
    };
  };

  // Edit-mode gestures (his call, session 48): a TAP toggles a note, a DRAG from a
  // filled cell MOVES it — swapping if the target is occupied. A small movement
  // threshold separates the two, and a finished drag swallows the click it spawns
  // so the moved note isn't also toggled. Only a filled cell starts a drag, so an
  // empty cell is always a plain tap-to-place (a jittered tap can't become a drag).
  // THE NOTE IS CARRIED, NOT TELEPORTED (session 48b, his phone note — he wanted to
  // "pick it up with my finger"). A clone of the note rides under the pointer in a
  // body-level ghost, the source keeps a faint trace of where it came from, and the
  // cell it would land in is ringed — so the drop is never a guess. The ghost is
  // LIFTED above the contact point because a fingertip is about twice a cell wide
  // at phone size: centred on the touch it would sit under your own finger, which
  // is the thing he couldn't see. GHOST_LIFT is the dial if that reads wrong.
  const DRAG_PX = 10;
  const GHOST_LIFT = 12; // px above the fingertip — subtle, his call (26 then 18 both read as too far)
  let drag = null;           // { cell, x, y, moved, ghost } while a filled cell is pressed
  let dragCommitted = false; // a finished drag — suppress the trailing click
  let hoverCell = null;      // the cell currently ringed as the drop target

  const setHover = (cell) => {
    if (hoverCell === cell) return;
    if (hoverCell) hoverCell.classList.remove("drop-target", "drop-swap");
    hoverCell = cell;
    if (!cell) return;
    cell.classList.add("drop-target");
    // An occupied target says SWAP, so it can't read as "this one gets overwritten".
    if (cell.classList.contains("filled")) cell.classList.add("drop-swap");
  };

  const makeGhost = (cell) => {
    const r = cell.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.width = `${r.width}px`;
    ghost.style.height = `${r.height}px`;
    // `.note` sizes itself at 82% of its parent and reads `--note-font` (declared
    // on `.grid-track`, and re-declared per bar count) — a clone lifted to body
    // level inherits neither, so carry the box and the type vars across by hand.
    const cs = getComputedStyle(cell);
    for (const v of ["--note-font", "--numeral", "--numeral-var"]) {
      ghost.style.setProperty(v, cs.getPropertyValue(v));
    }
    const note = cell.querySelector(".note");
    if (note) ghost.appendChild(note.cloneNode(true)); // keeps thumb/finger dome + glyph
    document.body.appendChild(ghost);
    return ghost;
  };

  const moveGhost = (ghost, x, y) => {
    ghost.style.transform =
      `translate(${x}px, ${y}px) translate(-50%, -50%) translateY(${-GHOST_LIFT}px)`;
  };

  const endDrag = () => {
    if (!drag) return;
    drag.cell.classList.remove("dragging");
    drag.ghost?.remove();
    setHover(null);
    drag = null;
  };

  el("grid").addEventListener("pointerdown", (e) => {
    dragCommitted = false; // clear any stale flag from a click that never arrived
    if (!state.editing) return;
    const cell = e.target.closest(".cell.filled"); // only a note can be dragged
    if (!cell) return;
    drag = { cell, x: e.clientX, y: e.clientY, moved: false, ghost: null };
    try { cell.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
  });
  el("grid").addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x) <= DRAG_PX && Math.abs(e.clientY - drag.y) <= DRAG_PX) return;
      drag.moved = true;               // past the threshold: this is a drag, not a tap
      drag.cell.classList.add("dragging");
      drag.ghost = makeGhost(drag.cell);
    }
    moveGhost(drag.ghost, e.clientX, e.clientY);
    // Hit-test from the FINGER, not the lifted ghost: the drop is computed the same
    // way on pointerup, so the ring always marks exactly where it will land.
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".cell");
    setHover(over && over !== drag.cell ? over : null);
  });
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const started = drag;
    endDrag();
    if (!started.moved) return; // never left the cell — a tap; let click toggle it
    dragCommitted = true;       // a real drag — swallow the click that follows
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".cell");
    if (!target || target === started.cell) return; // dropped on itself or off-grid
    const next = moveNote(state.pattern, cellRef(started.cell), cellRef(target));
    if (next === state.pattern) return; // nothing actually moved
    state.pattern = next;
    playPlace();
    state.unsavedEdits = true;
    markDirty();
    render();
  });

  // Tap a cell to toggle a note. A short pattern repeating across a longer
  // progression shares one cell, so editing any repeat edits them all.
  el("grid").addEventListener("click", (e) => {
    if (dragCommitted) { dragCommitted = false; return; } // a drag already handled this press
    if (!state.editing) return;
    const cell = e.target.closest(".cell");
    if (!cell) return;
    state.pattern = toggleNote(state.pattern, cellRef(cell));
    // A felt-on-board "thock" on every place/delete, so editing has the same
    // tactile confirmation the rest of the app does. Grid cells are excluded from
    // pressStrength(), so this is their only voice. It sounds during a take too
    // (session 47) — same reversal as the button ka-chunk below.
    playPlace();
    state.unsavedEdits = true;
    markDirty();
    render();
  });

  // Save / Load sheets
  el("open-save").addEventListener("click", () => openSheet("save"));
  el("open-load").addEventListener("click", () => openSheet("load"));
  el("library-menu-btn").addEventListener("click", () => {
    el("library-menu").hidden = !el("library-menu").hidden;
  });
  el("export-btn").addEventListener("click", () => {
    if (el("export-btn").hasAttribute("data-tier-locked")) {
      showUnlockSheet("Exporting writes your whole library to a file you can keep or move to another device.");
      return;
    }
    exportLibrary();
  });
  el("import-btn").addEventListener("click", () => {
    if (el("import-btn").hasAttribute("data-tier-locked")) {
      showUnlockSheet("Importing merges a library file into this one — nothing is ever overwritten.");
      return;
    }
    el("import-file").click();
  });
  el("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // clear so re-importing the same file still fires change
    if (file) importLibrary(file);
  });
  el("restore-builtins-btn").addEventListener("click", () => {
    const n = restoreMissingBuiltins();
    el("import-hint").textContent = n
      ? `Restored ${n} built-in pattern${n === 1 ? "" : "s"}.`
      : "Nothing to restore — every built-in pattern is already in your library.";
    renderSavedList();
    refreshSavedCount();
  });
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
    window.visualViewport.addEventListener("resize", scheduleSheetSync);
    window.visualViewport.addEventListener("scroll", syncSheetToViewport);
  }
  // …and start tracking as soon as the field takes focus, not only once the
  // keyboard has finished animating. Both entry points go through
  // scheduleSheetSync rather than a single snapshot — see its note for why one
  // sync can never be taken at the right moment.
  document.addEventListener("focusin", scheduleSheetSync);

  // UN-PAN AFTER THE KEYBOARD SHOVES THE VIEW (session 47, his report: opening
  // Save "pushes the entire background up"). Focusing the name field makes iOS
  // move the whole app up — grid included — to reveal the field.
  //
  // ⚠️ IT IS A VISUAL-VIEWPORT PAN, NOT A DOCUMENT SCROLL, and knowing that is
  // what stops the next three wrong fixes. Instrumented on his phone, `scrollY`
  // and `visualViewport.offsetTop` moved in LOCKSTEP on every single event
  // (390/390, 0/0, never once apart): `scrollY` is mirroring the pan. It was
  // chased first as document overflow — `body { min-height: 100dvh }` really
  // does stand the shell 852 tall inside a 462 viewport with the keyboard up —
  // but removing that overflow two different ways (an `--app-h` clamp, then a
  // `position: fixed` body, the latter verified to leave scrollHeight ===
  // clientHeight) changed the measurement by exactly nothing. Both were backed
  // out. `overflow: hidden` doesn't help either: a UA scroll-into-view overrides
  // it. There is no CSS that prevents a user-agent pan.
  //
  // So this stays, and it is the only thing that does work: `scrollTo(0, 0)`
  // resets the pan, which is what leaves the app correctly placed while typing.
  // With it disabled, the app sat 390px up for as long as the keyboard was open.
  //
  // KNOWN AND ACCEPTED (his call): because a `scroll` event only fires after iOS
  // has painted the panned frame, undoing it is visible as a one-frame flash.
  // iOS pans on stale geometry — at the moment it decides, the sheet is still
  // laid out for the full-height viewport — and we cannot reflow before the
  // keyboard exists. Pre-empting it by remembering the keyboard's height and
  // clamping at `pointerdown` was costed and deferred; it trades the flash for a
  // heuristic and a possible jump at touch-down.
  window.addEventListener("scroll", () => {
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  }, { passive: true });
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
  // End the take AND hand the audio category back — a backgrounded app shouldn't
  // keep overriding the silent switch or block another app's music (platform.js).
  onHidden: () => { stopTransport(); audioSession.setPlayback(false); },
  // Repair the audio the backgrounding may have broken, then re-take the category
  // so button thocks sound again the moment you're back in the foreground.
  onShown: () => { metronome.recoverAudio(); syncAudioCategory(); },
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
  // FIRST, before initControls — which calls syncProgressionOptions() on its own
  // last line, so anything later (restorePrefs included) is already too late and
  // a saved progression would be missing from the menu on the first paint.
  registerCustomProgressions();
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
  // Validated against the live list, same as every restored select (tones are
  // data and could change between releases); anything unrecognised falls back
  // to the default rather than reaching the synth.
  if (!TONES.some((t) => t.id === audioPrefs.tone)) audioPrefs.tone = DEFAULT_TONE;
  el("tone").value = audioPrefs.tone;
  metronome.setClickEnabled(audioPrefs.click);
  metronome.setPatternEnabled(audioPrefs.pattern);
  metronome.setCountInEnabled(audioPrefs.countIn);
  metronome.setTone(audioPrefs.tone);
  applySwing();
  setUiSoundEnabled(audioPrefs.ui);
  attach();
  // Hold the screen awake for as long as the app is up — a screen lock ends
  // practice mid-take. Re-acquired on every return to foreground (platform.js).
  wakeLock.start();
  playbackGuard.start();
  // Claim the silent-switch override up front IF the Buttons lamp wants it, so a
  // thock sounds through a silenced ring switch before the first Play. Gated, so
  // Buttons-off launches leave another app's audio alone — see syncAudioCategory.
  syncAudioCategory();
  await generate(); // roll one immediately so the grid is never empty
  seedNewBuiltins(); // one-time per id; a delete sticks across relaunches
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
