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
  { id: "travis",      name: "Travis (default)",    beats: ["root", "alt", "fifth", "alt"], default: true },
  { id: "simple_alt",  name: "Simple alternating",  beats: ["root", "alt", "root", "alt"] },
  { id: "dead_thumb",  name: "Dead Thumb",          beats: ["root", "root", "root", "root"] },
  { id: "root_fifth",  name: "Root–Fifth",          beats: ["root", "fifth", "root", "fifth"] },
  { id: "climb",       name: "Climb",               beats: [6, 5, 4, 5] },
  { id: "descend",     name: "Descend",             beats: [4, 5, 6, 5] },
  { id: "full_random", name: "Full Random",         beats: ["random", "random", "random", "random"] },
];

// Presets surfaced in the UI this session; the rest ship as data for later.
// Travis needs the fifth role, so it's in the v1 set alongside the others.
export const V1_BASS_IDS = ["travis", "simple_alt", "full_random"];

export function getBassPreset(id) {
  return BASS_PRESETS.find((p) => p.id === id) || BASS_PRESETS[0];
}

// ----- Chord library (role resolution) -----
// Each role points at a string; `fifthFret` overrides the shape fret for the
// fifth when the open shape doesn't cover it (spec: C's fifth = string 6 fret 3).
export const CHORDS = {
  C:  { name: "C",  root: 5, alt: 4, fifth: 6, fifthFret: 3 },
  G:  { name: "G",  root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  D:  { name: "D",  root: 4, alt: 3, fifth: 5, fifthFret: 0 },
  E:  { name: "E",  root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  A:  { name: "A",  root: 5, alt: 4, fifth: 6, fifthFret: 0 },
  Em: { name: "Em", root: 6, alt: 4, fifth: 5, fifthFret: 2 },
  Am: { name: "Am", root: 5, alt: 4, fifth: 6, fifthFret: 0 },
  F:  { name: "F",  root: 6, alt: 4, fifth: 5, fifthFret: 3 },
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
  //        6     5     4     3     2     1
  C:  { 6: 3, 5: 3, 4: 2, 3: 0, 2: 1, 1: 0 },
  G:  { 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 },
  D:  { 6: null, 5: 0, 4: 0, 3: 2, 2: 3, 1: 2 },
  E:  { 6: 0, 5: 2, 4: 2, 3: 1, 2: 0, 1: 0 },
  A:  { 6: null, 5: 0, 4: 2, 3: 2, 2: 2, 1: 0 },
  Em: { 6: 0, 5: 2, 4: 2, 3: 0, 2: 0, 1: 0 },
  Am: { 6: null, 5: 0, 4: 2, 3: 2, 2: 1, 1: 0 },
  F:  { 6: 1, 5: 3, 4: 3, 3: 2, 2: 1, 1: 1 },
};

// Fret for a string in a chord shape. Falls back to 0 (open) when the shape
// doesn't specify the string. Thumb "fifth" role uses the chord's fifthFret.
export function fretFor(chordId, string) {
  const shape = CHORD_SHAPES[chordId] || {};
  const f = shape[string];
  return f == null ? 0 : f;
}

// ----- Chaos presets: independent constraint flags. Tame/Loose/Chaos are just
// presets over these flags (leaves room for a future custom panel). -----
export const CHAOS_PRESETS = {
  tame: {
    id: "tame",
    name: "Tame",
    noRepeatTrebleString: true, // no identical treble string on consecutive offbeats
    minOffbeats: 2,
    maxOffbeats: 4,
    pinchesDownbeatsOnly: true, // pinches only land with the thumb on beats
    favorSingleOffbeats: true,  // single-note offbeats favored over double stops
    allowDoubleStops: false,
    domainCrossing: false,
  },
  loose: {
    id: "loose",
    name: "Loose",
    noRepeatTrebleString: false,
    minOffbeats: 1,
    maxOffbeats: 4,
    pinchesDownbeatsOnly: false, // pinches anywhere
    favorSingleOffbeats: false,
    allowDoubleStops: true,      // double stops occasionally
    domainCrossing: false,
  },
  chaos: {
    id: "chaos",
    name: "Chaos",
    noRepeatTrebleString: false,
    minOffbeats: 0,
    maxOffbeats: 4,
    pinchesDownbeatsOnly: false,
    favorSingleOffbeats: false,
    allowDoubleStops: true,
    domainCrossing: false, // stays off even in Chaos, per spec
  },
};

export const CHAOS_IDS = ["tame", "loose", "chaos"];

export const LOOP_OPTIONS = [
  { id: "1bar", name: "1-bar loop" },
  { id: "2bar", name: "2-bar loop" },
  { id: "through", name: "Through-composed" },
];

export const PHRASE_LENGTHS = [4, 8];

// Preset progressions (Progression mode). Any length — they cycle to fill the
// phrase (a 3-chord progression over 8 bars repeats). All chords must exist in
// CHORDS. Users can also hand-edit any bar's chord in the grid header.
export const PROGRESSIONS = [
  { id: "c_am_f_g", name: "C–Am–F–G", chords: ["C", "Am", "F", "G"] },
  { id: "g_em_c_d", name: "G–Em–C–D", chords: ["G", "Em", "C", "D"] },
  { id: "c_g_am_f", name: "C–G–Am–F", chords: ["C", "G", "Am", "F"] },
  { id: "am_f_c_g", name: "Am–F–C–G", chords: ["Am", "F", "C", "G"] },
  { id: "g_c_d",    name: "G–C–D",    chords: ["G", "C", "D"] },
];

// Cycle a chord list to exactly n bars (repeat if shorter, trim if longer).
export function fitProgression(chords, n, fallback = CHORD_IDS[0]) {
  const src = chords && chords.length ? chords : [fallback];
  return Array.from({ length: n }, (_, i) => src[i % src.length]);
}
