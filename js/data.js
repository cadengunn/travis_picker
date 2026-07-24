// data.js — pure data tables. No logic lives here.
// Everything the generator and grid need that could vary by "content" (chords,
// bass presets, chaos flags) is data, so new presets/chords are drop-in edits.

// ----- Hand domains (spec: thumb owns 6-5-4, fingers own 3-2-1) -----
export const THUMB_STRINGS = [6, 5, 4];
export const FINGER_STRINGS = [3, 2, 1];

// Default finger -> string assignment (i->3, m->2, a->1).
export const FINGER_STRING = { i: 3, m: 2, a: 1 };
export const STRING_FINGER = { 3: "i", 2: "m", 1: "a" };

export const BEAT_SLOTS = [1, 3, 5, 7]; // quarter-note downbeats
export const OFFBEAT_SLOTS = [2, 4, 6, 8]; // the "&"s

// ----- Tuning: open-string MIDI note for each string, standard EADGBe -----
// String 6 (low E) = E2 = 40, up to string 1 (high e) = E4 = 64. A fretted
// note is just the open note plus the fret, so pitch is derivable from any
// resolved event's { string, fret } — this is what the audio synth plays.
export const OPEN_STRING_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

// Pure: resolved event -> MIDI note number. Undefined string yields NaN, which
// the synth skips (a malformed event never makes a sound rather than a wrong one).
export function midiOf({ string, fret = 0 }) {
  const open = OPEN_STRING_MIDI[string];
  return open == null ? NaN : open + fret;
}

// ----- Bass engine presets (verbatim from the spec) -----
// An entry is a role ("root"|"alt"|"fifth"), an absolute string (6/5/4), or
// "random". A preset of only roles is fully relative/portable.
export const BASS_PRESETS = [
  { id: "travis",      name: "Travis",              beats: ["root", "alt", "fifth", "alt"], default: true },
  { id: "simple_alt",  name: "Alternating",         beats: ["root", "alt", "root", "alt"] },
  { id: "dead_thumb",  name: "Dead Thumb",          beats: ["root", "root", "root", "root"] },
  { id: "root_fifth",  name: "Root–Fifth",          beats: ["root", "fifth", "root", "fifth"] },
  { id: "climb",       name: "Climb",               beats: [6, 5, 4, 5] },
  { id: "descend",     name: "Descend",             beats: [4, 5, 6, 5] },
  { id: "full_random", name: "Random",              beats: ["random", "random", "random", "random"] },
];

// All seven presets are surfaced in the Thumb selector (session 5). The two
// absolute ones (Climb, Descend) ignore the chord by design — texture tools.
export function getBassPreset(id) {
  return BASS_PRESETS.find((p) => p.id === id) || BASS_PRESETS[0];
}

// ----- Chord library (role resolution) -----
// Each role points at a string; `fifthFret` overrides the shape fret for the
// fifth when the open shape doesn't cover it (spec: C's fifth = string 6 fret 3).
// Bass roles per chord. Barre chords assume a full barre, so the low string is
// available as a bass note even where the "textbook" voicing mutes it (the same
// convention C already uses: its fifth is string 6 fret 3).
export const CHORDS = {
  // --- majors ---
  C:    { name: "C",   root: 5, alt: 4, fifth: 6, fifthFret: 3 },
  G:    { name: "G",   root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  D:    { name: "D",   root: 4, alt: 3, fifth: 5, fifthFret: 0 },
  A:    { name: "A",   root: 5, alt: 4, fifth: 6, fifthFret: 0 },
  E:    { name: "E",   root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  F:    { name: "F",   root: 6, alt: 4, fifth: 5, fifthFret: 3 },
  "F#": { name: "F#",  root: 6, alt: 4, fifth: 5, fifthFret: 4 }, // E-shape barre @2 (the II of E)
  Bb:   { name: "Bb",  root: 5, alt: 4, fifth: 6, fifthFret: 1 }, // A-shape barre @1 (the ♭VII of C)
  B:    { name: "B",   root: 5, alt: 4, fifth: 6, fifthFret: 2 },
  // --- dominant 7ths (the I7 of each major key) ---
  // Bass roles are identical to the parent major; the b7 lives on a FINGER string
  // in every shape, so the alternating bass is unchanged and the 7th sounds as a
  // finger colour. (E7 uses the 020130 voicing precisely to keep this true — the
  // common 020100 shape would drop the b7 onto string 4, the alt-bass string.)
  C7:   { name: "C7",  root: 5, alt: 4, fifth: 6, fifthFret: 3 },
  G7:   { name: "G7",  root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  D7:   { name: "D7",  root: 4, alt: 3, fifth: 5, fifthFret: 0 },
  A7:   { name: "A7",  root: 5, alt: 4, fifth: 6, fifthFret: 0 },
  E7:   { name: "E7",  root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  // --- minors ---
  Am:   { name: "Am",  root: 5, alt: 4, fifth: 6, fifthFret: 0 },
  Em:   { name: "Em",  root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  Bm:   { name: "Bm",  root: 5, alt: 4, fifth: 6, fifthFret: 2 },
  Dm:   { name: "Dm",  root: 4, alt: 3, fifth: 5, fifthFret: 0 },
  "F#m": { name: "F#m", root: 6, alt: 4, fifth: 5, fifthFret: 4 },
  "C#m": { name: "C#m", root: 5, alt: 4, fifth: 6, fifthFret: 4 },
  "G#m": { name: "G#m", root: 6, alt: 4, fifth: 5, fifthFret: 6 },
};

export const CHORD_IDS = Object.keys(CHORDS);

// Startup chord for single-chord mode. E because that's what the user actually
// drills on — a taste default, not a musical constraint.
export const DEFAULT_CHORD = "E";

// Chord-aware thumb domain: {6,5,4} UNION the current chord's role strings.
// (e.g. D's alt role sits on string 3, so 3 is thumb-legal on D specifically.)
// Fingers always own 3/2/1; overlap strings are legal for both hands and the
// hard rule resolves any same-string collision.
export function thumbLegalStrings(chordId) {
  const c = CHORDS[chordId];
  const set = new Set(THUMB_STRINGS);
  if (c) [c.root, c.alt, c.fifth].forEach((s) => set.add(s));
  return set;
}

// Editor inference (built with item 3, the tap editor — noted here for later):
// on an overlap string (finger-domain AND a chord bass role, e.g. string 3 on
// D), a tapped note is inferred as thumb on beat slots (1,3,5,7) and finger on
// offbeat slots. Labels always come from each note's stored `finger` field,
// never re-inferred from the grid row.

// ----- Open chord shapes: string(6..1) -> fret. null = string not fretted in
// this shape (still playable open; Fret mode shows 0). -----
export const CHORD_SHAPES = {
  //          6        5     4     3     2     1
  C:     { 6: 3,    5: 3, 4: 2, 3: 0, 2: 1, 1: 0 },
  G:     { 6: 3,    5: 2, 4: 0, 3: 0, 2: 0, 1: 3 },
  D:     { 6: null, 5: 0, 4: 0, 3: 2, 2: 3, 1: 2 },
  A:     { 6: null, 5: 0, 4: 2, 3: 2, 2: 2, 1: 0 },
  E:     { 6: 0,    5: 2, 4: 2, 3: 1, 2: 0, 1: 0 },
  F:     { 6: 1,    5: 3, 4: 3, 3: 2, 2: 1, 1: 1 },
  "F#":  { 6: 2,    5: 4, 4: 4, 3: 3, 2: 2, 1: 2 }, // E-shape barre @2
  Bb:    { 6: 1,    5: 1, 4: 3, 3: 3, 2: 3, 1: 1 }, // A-shape barre @1
  B:     { 6: 2,    5: 2, 4: 4, 3: 4, 2: 4, 1: 2 }, // barre @2
  // dominant 7ths: b7 on a finger string, bass unchanged from the parent major
  C7:    { 6: 3,    5: 3, 4: 2, 3: 3, 2: 1, 1: 0 }, // b7 (Bb) on string 3
  G7:    { 6: 3,    5: 2, 4: 0, 3: 0, 2: 0, 1: 1 }, // b7 (F) on string 1
  D7:    { 6: null, 5: 0, 4: 0, 3: 2, 2: 1, 1: 2 }, // b7 (C) on string 2
  A7:    { 6: null, 5: 0, 4: 2, 3: 0, 2: 2, 1: 0 }, // b7 (G) on string 3
  E7:    { 6: 0,    5: 2, 4: 2, 3: 1, 2: 3, 1: 0 }, // 020130 — b7 (D) on string 2, alt bass stays E
  Am:    { 6: null, 5: 0, 4: 2, 3: 2, 2: 1, 1: 0 },
  Em:    { 6: 0,    5: 2, 4: 2, 3: 0, 2: 0, 1: 0 },
  Bm:    { 6: 2,    5: 2, 4: 4, 3: 4, 2: 3, 1: 2 }, // barre @2
  Dm:    { 6: null, 5: 0, 4: 0, 3: 2, 2: 3, 1: 1 },
  "F#m": { 6: 2,    5: 4, 4: 4, 3: 2, 2: 2, 1: 2 }, // barre @2
  "C#m": { 6: 4,    5: 4, 4: 6, 3: 6, 2: 5, 1: 4 }, // barre @4
  "G#m": { 6: 4,    5: 6, 4: 6, 3: 4, 2: 4, 1: 4 }, // barre @4
};

// Fret for a string in a chord shape. Falls back to 0 (open) when the shape
// doesn't specify the string. Thumb "fifth" role uses the chord's fifthFret.
export function fretFor(chordId, string) {
  const shape = CHORD_SHAPES[chordId] || {};
  const f = shape[string];
  return f == null ? 0 : f;
}

// ----- Chaos presets: independent constraint flags. The tiers are just presets
// over these flags (leaves room for a future custom panel). Difficulty runs
// Tame → Loose → Unruly; **Chaos sits OFF that curve** — it's the fully random
// discovery setting ("novelty over playability", per the spec), not "harder
// than Unruly" (session 6 round 2 decision).
//
// DIFFICULTY MODEL (session 6, refined round 2 against worked examples).
// The hard part of a pattern is NOT how many notes are on the board — a full
// three-finger pinch is easy. It's STRIKE-TIMES: how many distinct columns the
// fingers attack in. Finger independence (varied finger-sets) matters, but it
// emerges from density — at 2–3 strike-times even wandering singles or a lone
// finger followed by a rake stays easy, so it isn't enforced separately. (A
// strict one-group synchronization rule for Tame was tried and dropped: real
// Tame examples from the guitar test mix a lone finger with a repeated pair,
// or three different finger-sets in three strikes.)
//
// ALL density lives here, not in the generator. The knobs:
//   - min/maxStrikes   — the strike-time budget per bar: the TOTAL number of
//     columns the fingers attack in, pinched beats included (they count
//     against the budget, not on top of it).
//   - pinchOdds        — per-STRIKE placement weight: the chance a budgeted
//     strike lands on a beat (a pinch, fingers riding the thumb's timing)
//     rather than an offbeat (a new attack moment — the syncopation skill).
//     A full side falls back to the other, so the budget is a true floor;
//     all-pinch bars are possible but rare (~pinchOdds^budget).
//   - allSinglesOdds   — per-PATTERN chance the whole generation uses single
//     finger notes only (no stacks; suppresses minDoubleStops). Keeps genuinely
//     simple all-singles rolls a real species on the lower tiers.
//   - doubleStopOdds   — per-column 2-/3-note odds on non-singles rolls.
//   - minDoubleStops   — per-BAR stack floor (Unruly's texture guarantee).
//   - maxRestrikes     — per-BAR budget of same-string re-strikes on adjacent
//     8ths (thumb included), replacing the old noAdjacentSameString boolean:
//     0 = clean (drop the column rather than re-strike), a small number =
//     rationed spice (Unruly), Infinity = anything goes (Chaos). Each audible
//     adjacent pair costs 1 from the budget of the bar placing it.
// The generator reads these numbers and never branches on preset name. Two hard
// rules live in the generator: no same-(slot,string) collision, and no blank
// bars (every bar gets ≥1 finger note).
export const CHAOS_PRESETS = {
  tame: {
    id: "tame",
    name: "Tame",
    maxRestrikes: 0, // clean: no string sounds on two adjacent 8th slots
    minStrikes: 2, // few strike-times — the tier's defining trait
    maxStrikes: 3,
    allSinglesOdds: 0.45, // near half the rolls: wandering single notes only
    doubleStopOdds: { double: 0.30, triple: 0.15 }, // otherwise mixed, rakes included
    minDoubleStops: 0,
    pinchOdds: 0.18,
    domainCrossing: false,
  },
  loose: {
    id: "loose",
    name: "Loose",
    maxRestrikes: 0, // still clean (no re-strikes)
    minStrikes: 4, // more strike-times than Tame — the actual difficulty jump
    maxStrikes: 5,
    allSinglesOdds: 0.30,
    doubleStopOdds: { double: 0.30, triple: 0.10 },
    minDoubleStops: 0,
    pinchOdds: 0.30,
    domainCrossing: false,
  },
  unruly: {
    id: "unruly",
    name: "Unruly",
    maxRestrikes: 2, // re-strikes rationed, not unlimited: a couple of spicy
    // moments per bar (unlimited adjacency averaged ~3.5 pairs/bar with a tail
    // to 11 once the strike floor became real — round 5's "too much")
    minStrikes: 5, // floor raised from 4 (round 3): 4-strike rolls read too easy for the tier
    maxStrikes: 6,
    allSinglesOdds: 0.05, // rare — an easy all-singles roll undercuts "unruly"
    doubleStopOdds: { double: 0.50, triple: 0.18 },
    minDoubleStops: 1, // per BAR on non-singles rolls: keep some stacked texture
    pinchOdds: 0.35,
    domainCrossing: false,
  },
  chaos: {
    id: "chaos",
    name: "Chaos",
    maxRestrikes: Infinity, // fully random: anything goes
    minStrikes: 1, // fully random: uniform 1–8 total strike-times
    maxStrikes: 8,
    allSinglesOdds: 0,
    doubleStopOdds: { double: 1 / 3, triple: 1 / 3 }, // column shape uniform over 1/2/3 notes
    minDoubleStops: 0,
    pinchOdds: 0.5, // coin-flip pinches
    domainCrossing: false, // stays off even here, per spec
  },
};

export const CHAOS_IDS = ["tame", "loose", "unruly", "chaos"];

// `pinchesDownbeatsOnly` is intentionally NOT a per-tier flag: with the standard
// Travis thumb striking only beats 1-4, a pinch can only land on a downbeat
// anyway, so it would never shape preset output. It only matters if the thumb is
// hand-edited onto an offbeat, so it's left out until an editor path needs it.

// What's printed inside each note circle. All three are pure transforms of the
// same events (fret = event.fret, pima = event.finger, none = dot only).
export const LABEL_MODES = [
  { id: "fret", name: "Fret" },
  { id: "pima", name: "PIMA" },
  { id: "none", name: "No labels" },
];

// How many DISTINCT bars of right-hand pattern before it repeats. This is the
// only length dial: in single-chord mode the grid shows exactly this many bars;
// in progression mode the progression sets the bar count and the pattern cycles
// across it. (Replaces the old separate Loop + Length pair, whose useful
// combinations were always "displayed bars == distinct bars".)
export const PATTERN_LENGTHS = [1, 2, 4];
export const DEFAULT_PATTERN_BARS = 1;

// ----- Nashville number system -----
// Progressions are stored as HARMONIC TOKENS (Roman numerals), and the selected
// KEY resolves each token to an actual chord. Tokens — not bare 1–6 scale numbers
// — because the curated progressions need harmony a plain degree can't express:
//   • II   — a MAJOR two chord (secondary-dominant colour), distinct from the
//            diatonic minor ii. E.g. I–II–V is C–D–G, not C–Dm–G.
//   • ♭VII — the flat-seven MAJOR (a chromatic, non-diatonic degree): C–Bb.
//   • I7   — a dominant-7th tonic (the classic country/blues pull to IV).
// A token is already its own display string, so romanize() is essentially the
// identity here (the integer map below is only a legacy fallback).
//
// Each key carries a `mode` (major/minor) and a token→chord map. A key's mode
// also decides which PROGRESSIONS are offered (major keys see the major styles,
// minor keys the minor set) — the app filters by it, so there's no separate
// Major/Minor toggle. Degree 7 (diminished) is intentionally absent throughout.
//
// Minor keys use the natural-minor ladder (i, III, iv, VI, VII) with a MAJOR V
// for the dramatic cadence (harmonic minor) — i–VII–VI–V is Am–G–F–E. `v` (the
// natural minor five) is defined too for hand-editing/transpose robustness even
// though the shipped progressions use the major V.
export const KEYS = {
  // --- major keys ---
  C:  { name: "C",  mode: "major", chords: { I: "C",  ii: "Dm",  iii: "Em",  IV: "F", V: "G", vi: "Am",  II: "D",  "♭VII": "Bb", I7: "C7" } },
  G:  { name: "G",  mode: "major", chords: { I: "G",  ii: "Am",  iii: "Bm",  IV: "C", V: "D", vi: "Em",  II: "A",  "♭VII": "F",  I7: "G7" } },
  D:  { name: "D",  mode: "major", chords: { I: "D",  ii: "Em",  iii: "F#m", IV: "G", V: "A", vi: "Bm",  II: "E",  "♭VII": "C",  I7: "D7" } },
  A:  { name: "A",  mode: "major", chords: { I: "A",  ii: "Bm",  iii: "C#m", IV: "D", V: "E", vi: "F#m", II: "B",  "♭VII": "G",  I7: "A7" } },
  E:  { name: "E",  mode: "major", chords: { I: "E",  ii: "F#m", iii: "G#m", IV: "A", V: "B", vi: "C#m", II: "F#", "♭VII": "D",  I7: "E7" } },
  // --- minor keys ---
  Am: { name: "Am", mode: "minor", chords: { i: "Am", III: "C", iv: "Dm", v: "Em", V: "E", VI: "F", VII: "G" } },
  Em: { name: "Em", mode: "minor", chords: { i: "Em", III: "G", iv: "Am", v: "Bm", V: "B", VI: "C", VII: "D" } },
};

export const KEY_IDS = Object.keys(KEYS);
export const DEFAULT_KEY = "C";

// Key selector, grouped by mode (Major then Minor) — the dropdown shows headers.
export const KEY_GROUPS = [
  { label: "Major", ids: KEY_IDS.filter((k) => KEYS[k].mode === "major") },
  { label: "Minor", ids: KEY_IDS.filter((k) => KEYS[k].mode === "minor") },
];

// Chord selector grouped by family — the per-bar picker in progression mode,
// where you reach for a chord by its harmonic role. Every CHORD_ID is in exactly
// one group (a test asserts the partition).
export const CHORD_GROUPS = [
  { label: "Major",       ids: ["C", "G", "D", "A", "E", "F", "F#", "Bb", "B"] },
  { label: "Dominant 7",  ids: ["C7", "G7", "D7", "A7", "E7"] },
  { label: "Minor",       ids: ["Am", "Em", "Bm", "Dm", "F#m", "C#m", "G#m"] },
];

// The SINGLE-chord picker leads with the core seven open-position "campfire"
// chords — what you actually drill — and files the barre chords, dominant 7ths
// and rarer minors below under a "more" section. Also a full partition of the
// library.
export const SINGLE_CHORD_GROUPS = [
  { label: "Open chords", ids: ["C", "G", "D", "A", "E", "Am", "Em", "Dm"] },
  { label: "More majors", ids: ["F", "F#", "Bb", "B"] },
  { label: "Dominant 7",  ids: ["C7", "G7", "D7", "A7", "E7"] },
  { label: "More minors", ids: ["Bm", "F#m", "C#m", "G#m"] },
];

// Preset progressions, curated by STYLE (the value a fingerstyle player actually
// reaches for), so the dropdown groups them under those headers. EVERY preset is
// four bars — a shorter idea is padded to fill the phrase: a 2-chord progression
// repeats (I–V → I–V–I–V), a 3-chord one holds its last chord (I–IV–V → I–IV–V–V,
// I–♭VII–IV → I–♭VII–IV–IV). Hand-edit any bar; if the result stops matching a
// preset the selector reads "Custom". `label` is the concise idea shown in the
// menu / readout (I–V, I–IV–V, I–♭VII–IV); `tokens` is its 4-bar realization.
export const PROGRESSIONS = [
  // --- major ---
  { id: "maj_1_5",      mode: "major", style: "Foundations",       label: "I–V",        tokens: ["I", "V", "I", "V"] },
  { id: "maj_1_4",      mode: "major", style: "Foundations",       label: "I–IV",       tokens: ["I", "IV", "I", "IV"] },
  { id: "maj_1_4_5",    mode: "major", style: "Foundations",       label: "I–IV–V",     tokens: ["I", "IV", "V", "V"] },
  { id: "maj_1_4_1_5",  mode: "major", style: "Foundations",       label: "I–IV–I–V",   tokens: ["I", "IV", "I", "V"] },
  { id: "maj_1_7_4_1",  mode: "major", style: "Classic Country",   label: "I–I7–IV–I",  tokens: ["I", "I7", "IV", "I"] },
  { id: "maj_1_2_5",    mode: "major", style: "Classic Country",   label: "I–II–V",     tokens: ["I", "II", "V", "V"] },
  { id: "maj_1_4_5_1",  mode: "major", style: "Classic Country",   label: "I–IV–V–I",   tokens: ["I", "IV", "V", "I"] },
  { id: "maj_1_b7_4",   mode: "major", style: "Traditional Folk",  label: "I–♭VII–IV",  tokens: ["I", "♭VII", "IV", "IV"] },
  { id: "maj_1_b7_1",   mode: "major", style: "Traditional Folk",  label: "I–♭VII–I",   tokens: ["I", "♭VII", "I", "I"] },
  { id: "maj_1_5_6_4",  mode: "major", style: "Modern Acoustic",   label: "I–V–vi–IV",  tokens: ["I", "V", "vi", "IV"] },
  { id: "maj_1_6_4_5",  mode: "major", style: "Modern Acoustic",   label: "I–vi–IV–V",  tokens: ["I", "vi", "IV", "V"] },
  { id: "maj_6_4_1_5",  mode: "major", style: "Modern Acoustic",   label: "vi–IV–I–V",  tokens: ["vi", "IV", "I", "V"] },
  { id: "maj_1_4_2_5",  mode: "major", style: "Classic Standards", label: "I–IV–ii–V",  tokens: ["I", "IV", "ii", "V"] },
  { id: "maj_1_6_2_5",  mode: "major", style: "Classic Standards", label: "I–vi–ii–V",  tokens: ["I", "vi", "ii", "V"] },
  // --- minor ---
  { id: "min_1_7",      mode: "minor", style: "Minor",             label: "i–VII",      tokens: ["i", "VII", "i", "VII"] },
  { id: "min_1_7_6",    mode: "minor", style: "Minor",             label: "i–VII–VI",   tokens: ["i", "VII", "VI", "VI"] },
  { id: "min_1_7_6_5",  mode: "minor", style: "Minor",             label: "i–VII–VI–V", tokens: ["i", "VII", "VI", "V"] },
];

export const CUSTOM_PROGRESSION_ID = "custom";

// Progression options for a mode, grouped by style — [{ label, items:[{value,label}] }].
// The label is the token sequence itself (I–IV–V, I–♭VII–IV, i–VII–VI–V …).
export function progressionGroups(mode) {
  const groups = [];
  for (const p of PROGRESSIONS) {
    if (p.mode !== mode) continue;
    let g = groups[groups.length - 1];
    if (!g || g.label !== p.style) { g = { label: p.style, items: [] }; groups.push(g); }
    g.items.push({ value: p.id, label: p.label });
  }
  return groups;
}

// Roman-numeral display. Tokens are already Roman numerals so this is the
// identity for them; the integer map is a legacy fallback (nothing passes ints now).
const ROMAN = { 1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°" };
export function romanize(token) {
  if (token == null) return "?";
  return ROMAN[token] ?? String(token);
}
export function romanDegrees(tokens, sep = " – ") {
  return tokens.map(romanize).join(sep);
}

// Cycle a list to exactly n entries (repeat if shorter, trim if longer).
export function fitProgression(chords, n, fallback = CHORD_IDS[0]) {
  const src = chords && chords.length ? chords : [fallback];
  return Array.from({ length: n }, (_, i) => src[i % src.length]);
}

// Resolve a progression's tokens to chord ids in the given key. Returns [] if the
// key's mode doesn't match the progression (its tokens won't be in the key map) —
// callers only ever resolve progressions of the key's own mode.
export function progressionChords(progressionId, keyId) {
  const p = PROGRESSIONS.find((x) => x.id === progressionId);
  const key = KEYS[keyId] || KEYS[DEFAULT_KEY];
  if (!p) return [];
  return p.tokens.map((t) => key.chords[t]).filter(Boolean);
}

// Which token (if any) a chord occupies in a key — used to transpose custom
// progressions when the key changes, and to label the per-bar context readout.
// Each key maps every token to a distinct chord, so the inverse is unambiguous.
export function degreeOf(chordId, keyId) {
  const key = KEYS[keyId] || KEYS[DEFAULT_KEY];
  const hit = Object.entries(key.chords).find(([, c]) => c === chordId);
  return hit ? hit[0] : null;
}

// Identify the current per-bar chords: a preset id if they cycle-match one in
// this key (its own mode only), otherwise "custom".
export function detectProgression(chords, keyId) {
  if (!chords || !chords.length) return CUSTOM_PROGRESSION_ID;
  const key = KEYS[keyId];
  let cycled = null; // a match that only fits by repeating (shorter than the input)
  for (const p of PROGRESSIONS) {
    if (key && p.mode !== key.mode) continue;
    const resolved = progressionChords(p.id, keyId);
    if (!resolved.length) continue;
    const expanded = fitProgression(resolved, chords.length);
    if (expanded.join("|") !== chords.join("|")) continue;
    // Prefer a preset whose OWN length matches the bar count, so I–IV–V–I isn't
    // read as the shorter I–IV–V (which cycles to the same four bars).
    if (resolved.length === chords.length) return p.id;
    if (cycled == null) cycled = p.id;
  }
  return cycled ?? CUSTOM_PROGRESSION_ID;
}
