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
  B:    { name: "B",   root: 5, alt: 4, fifth: 6, fifthFret: 2 },
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
  B:     { 6: 2,    5: 2, 4: 4, 3: 4, 2: 4, 1: 2 }, // barre @2
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
//   - pinchOdds        — chance a beat also gets a finger note (a pinch).
//   - allSinglesOdds   — per-PATTERN chance the whole generation uses single
//     finger notes only (no stacks; suppresses minDoubleStops). Keeps genuinely
//     simple all-singles rolls a real species on the lower tiers.
//   - doubleStopOdds   — per-column 2-/3-note odds on non-singles rolls.
//   - minDoubleStops   — per-BAR stack floor (Unruly's texture guarantee).
// The generator reads these numbers and never branches on preset name. Two hard
// rules live in the generator: no same-(slot,string) collision, and no blank
// bars (every bar gets ≥1 finger note).
export const CHAOS_PRESETS = {
  tame: {
    id: "tame",
    name: "Tame",
    noAdjacentSameString: true, // clean: no string sounds on two adjacent 8th slots
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
    noAdjacentSameString: true, // still clean (no re-strikes)
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
    noAdjacentSameString: false, // re-strikes allowed — the top of the curve
    minStrikes: 4,
    maxStrikes: 6,
    allSinglesOdds: 0.10,
    doubleStopOdds: { double: 0.50, triple: 0.18 },
    minDoubleStops: 1, // per BAR on non-singles rolls: keep some stacked texture
    pinchOdds: 0.35,
    domainCrossing: false,
  },
  chaos: {
    id: "chaos",
    name: "Chaos",
    noAdjacentSameString: false,
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
// Progressions are stored as scale degrees; the selected KEY resolves them to
// actual chords. Degree 7 (diminished) is omitted — it isn't used in this style
// and has no chord in the library.
export const KEYS = {
  C: { name: "C", degrees: { 1: "C", 2: "Dm",  3: "Em",  4: "F", 5: "G", 6: "Am" } },
  G: { name: "G", degrees: { 1: "G", 2: "Am",  3: "Bm",  4: "C", 5: "D", 6: "Em" } },
  D: { name: "D", degrees: { 1: "D", 2: "Em",  3: "F#m", 4: "G", 5: "A", 6: "Bm" } },
  A: { name: "A", degrees: { 1: "A", 2: "Bm",  3: "C#m", 4: "D", 5: "E", 6: "F#m" } },
  E: { name: "E", degrees: { 1: "E", 2: "F#m", 3: "G#m", 4: "A", 5: "B", 6: "C#m" } },
};

export const KEY_IDS = Object.keys(KEYS);
export const DEFAULT_KEY = "C";

// Preset progressions as degree sequences. Any length — they cycle to fill the
// phrase. Users can hand-edit any bar; if the result stops matching a preset the
// selector reads "Custom".
export const PROGRESSIONS = [
  { id: "1_4_5_1", name: "1–4–5–1", degrees: [1, 4, 5, 1] },
  { id: "1_5_6_4", name: "1–5–6–4", degrees: [1, 5, 6, 4] },
  { id: "1_6_4_5", name: "1–6–4–5", degrees: [1, 6, 4, 5] },
  { id: "6_4_1_5", name: "6–4–1–5", degrees: [6, 4, 1, 5] },
  { id: "1_4_1_5", name: "1–4–1–5", degrees: [1, 4, 1, 5] },
  { id: "1_2_4_5", name: "1–2–4–5", degrees: [1, 2, 4, 5] },
  { id: "1_6_2_5", name: "1–6–2–5", degrees: [1, 6, 2, 5] },
];

export const CUSTOM_PROGRESSION_ID = "custom";

// Cycle a list to exactly n entries (repeat if shorter, trim if longer).
export function fitProgression(chords, n, fallback = CHORD_IDS[0]) {
  const src = chords && chords.length ? chords : [fallback];
  return Array.from({ length: n }, (_, i) => src[i % src.length]);
}

// Resolve a progression's degrees to chord ids in the given key.
export function progressionChords(progressionId, keyId) {
  const p = PROGRESSIONS.find((x) => x.id === progressionId);
  const key = KEYS[keyId] || KEYS[DEFAULT_KEY];
  if (!p) return [];
  return p.degrees.map((d) => key.degrees[d]).filter(Boolean);
}

// Which degree (if any) a chord occupies in a key — used to transpose custom
// progressions when the key changes.
export function degreeOf(chordId, keyId) {
  const key = KEYS[keyId] || KEYS[DEFAULT_KEY];
  const hit = Object.entries(key.degrees).find(([, c]) => c === chordId);
  return hit ? Number(hit[0]) : null;
}

// Identify the current per-bar chords: a preset id if they cycle-match one in
// this key, otherwise "custom".
export function detectProgression(chords, keyId) {
  if (!chords || !chords.length) return CUSTOM_PROGRESSION_ID;
  for (const p of PROGRESSIONS) {
    const resolved = progressionChords(p.id, keyId);
    if (!resolved.length) continue;
    const expanded = fitProgression(resolved, chords.length);
    if (expanded.join("|") === chords.join("|")) return p.id;
  }
  return CUSTOM_PROGRESSION_ID;
}
