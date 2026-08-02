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

// Pure: resolved event -> MIDI note number, plus the capo (see below). Undefined
// string yields NaN, which the synth skips (a malformed event never makes a
// sound rather than a wrong one).
export function midiOf({ string, fret = 0 }, capo = 0) {
  const open = OPEN_STRING_MIDI[string];
  return open == null ? NaN : open + fret + capo;
}

// ----- Capo -----
// SHAPE-FIRST: you pick the shape you play and where the capo is, and the
// concert key is derived. Everything already on screen stays literally true —
// the grid's frets are SHAPE frets, which is exactly what your fingers do — so
// the capo is a label plus one addend in the audio. The generator never sees it.
//
// NEGATIVE values are a down-tuned guitar (half or whole step). A physical capo
// can't go below the nut, but it's the identical transform and it's what you
// actually do, so the range runs both ways. The top is 5 because that's where
// real capos live; it's one constant if a 7 ever comes up.
export const CAPO_MIN = -2;
export const CAPO_MAX = 5;
export const clampCapo = (n) => Math.min(CAPO_MAX, Math.max(CAPO_MIN, Math.round(Number(n) || 0)));

// How a capo setting is SAID. Negatives get the tuning phrase a guitarist uses
// rather than a number of semitones — "half-step down", not "down 1" (and
// certainly not "capo −1", which is a thing you can't do). Null at 0, where
// there's nothing to report.
export function capoLabel(capo) {
  if (!capo) return null;
  if (capo > 0) return `capo ${capo}`;
  return capo === -1 ? "half-step down" : capo === -2 ? "whole step down" : `${-capo} semitones down`;
}

// Pitch class -> the name a guitarist would say. ONE spelling per pitch, used
// everywhere a note is printed: the chord wheel's root reel, every chord's
// display name, and the capo tag. That single-source rule is the whole point —
// before the wheel this table said "D♭" while the library said "C#", so with a
// capo the same pitch could be spelled two ways on one screen.
// WHICH spelling per pitch is a guitarist's habit, not a rule: flats for E♭/B♭,
// sharps for C♯/F♯/G♯ (nobody says "D♭ minor" or "A♭ shapes" on a guitar).
// The pretty glyphs match the Roman numerals' ♭/♯, so anywhere these are shown
// needs a pinned line-height (they fall back off Fraunces).
const PC_NAME = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];

// Transpose a chord or key id by `capo` semitones and return it spelled for
// display, keeping the quality suffixes (Am + 2 -> "Bm", C7 + 3 -> "E♭7").
// Returns null for anything whose root we can't read, so callers can fall back.
export function soundingName(id, capo = 0) {
  if (!id) return null;
  const suffix = /m$/.test(id) ? "m" : /7$/.test(id) ? "7" : "";
  const pc = chordRootPc(id);
  if (pc == null) return null;
  return PC_NAME[(((pc + capo) % 12) + 12) % 12] + suffix;
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

// ----- Chord library: the full ROOT × QUALITY matrix -----
// The picker is two wheels (root, quality), so the library has to be DENSE — a
// wheel with dead cells would be a lie. That's 12 roots × 3 qualities = 36
// chords, and it's why the barre chords are derived from movable templates
// below instead of being hand-written 22 more times.
//
// An id is literally root + quality suffix ("C", "C#m", "Eb7"), which is what a
// saved pattern stores; `name` is what's PRINTED, spelled from PC_NAME so the
// wheel, the chord readout and the capo tag never disagree about a pitch.
const ROOT_ID = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
export const ROOTS = ROOT_ID.map((id, pc) => ({ id, pc, name: PC_NAME[pc] }));

// The quality reel. Ordered as it reads on the wheel. Adding a fourth quality
// means adding its templates below and a shape for any open-position voicing —
// deliberately NOT done yet: three is enough to judge the wheel by.
export const QUALITIES = [
  { id: "major", suffix: "",  name: "Major" },
  { id: "minor", suffix: "m", name: "Minor" },
  { id: "dom7",  suffix: "7", name: "7" },
];

export const chordIdFor = (rootId, qualityId) =>
  rootId + (QUALITIES.find((q) => q.id === qualityId)?.suffix ?? "");

// Chord id -> { root, quality } for the wheel to point its two reels at. Reads
// the LONGEST matching suffix first so "m" and "7" can't be confused with a root.
export function splitChordId(id) {
  for (const q of [...QUALITIES].sort((a, b) => b.suffix.length - a.suffix.length)) {
    if (q.suffix && id.endsWith(q.suffix)) {
      const root = id.slice(0, -q.suffix.length);
      if (ROOT_ID.includes(root)) return { root, quality: q.id };
    }
  }
  return ROOT_ID.includes(id) ? { root: id, quality: "major" } : null;
}

// ----- Open-position chords: hand-declared, because they're VOICINGS -----
// These are the shapes you actually play in first position, and no template
// produces them (open strings only exist at the nut). Everything else is derived.
// Each role points at a string; `fifthFret` gives the fret for the fifth role,
// which can sit on a string the shape doesn't fret (C's fifth is string 6 fret 3).
const OPEN_CHORDS = {
  // --- majors ---
  C:  { root: 5, alt: 4, fifth: 6, fifthFret: 3, shape: { 6: 3,    5: 3, 4: 2, 3: 0, 2: 1, 1: 0 } },
  D:  { root: 4, alt: 3, fifth: 5, fifthFret: 0, shape: { 6: null, 5: 0, 4: 0, 3: 2, 2: 3, 1: 2 } },
  E:  { root: 6, alt: 4, fifth: 5, fifthFret: 2, shape: { 6: 0,    5: 2, 4: 2, 3: 1, 2: 0, 1: 0 } },
  G:  { root: 6, alt: 4, fifth: 5, fifthFret: 2, shape: { 6: 3,    5: 2, 4: 0, 3: 0, 2: 0, 1: 3 } },
  A:  { root: 5, alt: 4, fifth: 6, fifthFret: 0, shape: { 6: null, 5: 0, 4: 2, 3: 2, 2: 2, 1: 0 } },
  // --- minors ---
  Am: { root: 5, alt: 4, fifth: 6, fifthFret: 0, shape: { 6: null, 5: 0, 4: 2, 3: 2, 2: 1, 1: 0 } },
  Dm: { root: 4, alt: 3, fifth: 5, fifthFret: 0, shape: { 6: null, 5: 0, 4: 0, 3: 2, 2: 3, 1: 1 } },
  Em: { root: 6, alt: 4, fifth: 5, fifthFret: 2, shape: { 6: 0,    5: 2, 4: 2, 3: 0, 2: 0, 1: 0 } },
  // --- dominant 7ths ---
  // These five keep the parent major's bass exactly: the ♭7 sits on a FINGER
  // string in every one of these voicings, so the alternating bass is unchanged
  // and the 7th sounds as a finger colour. E7 uses 020130 precisely to keep that
  // true — the common 020100 drops the ♭7 onto string 4, the alt-bass string.
  C7: { root: 5, alt: 4, fifth: 6, fifthFret: 3, shape: { 6: 3,    5: 3, 4: 2, 3: 3, 2: 1, 1: 0 } }, // ♭7 on 3
  D7: { root: 4, alt: 3, fifth: 5, fifthFret: 0, shape: { 6: null, 5: 0, 4: 0, 3: 2, 2: 1, 1: 2 } }, // ♭7 on 2
  E7: { root: 6, alt: 4, fifth: 5, fifthFret: 2, shape: { 6: 0,    5: 2, 4: 2, 3: 1, 2: 3, 1: 0 } }, // ♭7 on 2
  G7: { root: 6, alt: 4, fifth: 5, fifthFret: 2, shape: { 6: 3,    5: 2, 4: 0, 3: 0, 2: 0, 1: 1 } }, // ♭7 on 1
  A7: { root: 5, alt: 4, fifth: 6, fifthFret: 0, shape: { 6: null, 5: 0, 4: 2, 3: 0, 2: 2, 1: 0 } }, // ♭7 on 3
  // B7 is the open x21202 rather than an A-shape barre at 2: it's the chord you
  // actually play, and its ♭7 (A) is on string 3, a finger string. String 6 is
  // fretted at 2 (F♯) so the fifth role has its note — the same "the low string
  // is available as a bass note even where the textbook voicing mutes it"
  // convention the barre chords use.
  B7: { root: 5, alt: 4, fifth: 6, fifthFret: 2, shape: { 6: 2,    5: 2, 4: 1, 3: 2, 2: 0, 1: 2 } },
};

// ----- Movable barre templates: one shape slid up the neck -----
// A barre chord is a fixed hand shape at a fret, so BOTH the frets and the bass
// roles are constant relative to the barre. That's what lets two templates cover
// all twelve roots — and it isn't a new convention: "E-shape or A-shape,
// whichever barres lower" reproduces every barre chord the library used to hand-
// declare (F@1, F♯@2, Gm@3, G♯m@4, B♭@1, B@2, Bm@2, C♯m@4), which a test pins.
//
// Frets are OFFSETS from the barre fret; string 6 is always the barre itself in
// the A-shapes, per that same available-low-string convention.
//
// ⚠️ The E-shape dominant 7th is the one place a derived chord's bass differs
// from its parent major: the ♭7 has only two homes inside an E-shape — string 4
// at the barre (the everyday 131211 F7) or string 2 three frets up (a four-
// finger stretch nobody plays). Taking the playable one puts the ♭7 on the
// ALT-BASS string, so F7 / F♯7 / G♯7 alternate root ↔ ♭7 rather than root ↔
// octave. It's a real ragtime bass and the shape is the one you'd actually
// fret; flipping it is a one-line change to this template.
const BARRE_TEMPLATES = {
  E: {
    rootPc: 4, root: 6, alt: 4, fifth: 5,
    shapes: {
      major: { 6: 0, 5: 2, 4: 2, 3: 1, 2: 0, 1: 0 },
      minor: { 6: 0, 5: 2, 4: 2, 3: 0, 2: 0, 1: 0 },
      dom7:  { 6: 0, 5: 2, 4: 0, 3: 1, 2: 0, 1: 0 }, // ♭7 on string 4 — see above
    },
  },
  A: {
    rootPc: 9, root: 5, alt: 4, fifth: 6,
    shapes: {
      major: { 6: 0, 5: 0, 4: 2, 3: 2, 2: 2, 1: 0 },
      minor: { 6: 0, 5: 0, 4: 2, 3: 2, 2: 1, 1: 0 },
      dom7:  { 6: 0, 5: 0, 4: 2, 3: 0, 2: 2, 1: 0 }, // ♭7 on string 3, a finger string
    },
  },
};

// Where a template's barre lands for a root. The two are always 5 semitones
// apart, so they never tie.
const barreFret = (template, pc) => (((pc - template.rootPc) % 12) + 12) % 12;

// Derive one barre chord: pick the template that barres LOWER (the shape a
// player would actually reach for), then slide it.
function deriveBarreChord(root, quality) {
  const t = barreFret(BARRE_TEMPLATES.E, root.pc) <= barreFret(BARRE_TEMPLATES.A, root.pc)
    ? BARRE_TEMPLATES.E
    : BARRE_TEMPLATES.A;
  const at = barreFret(t, root.pc);
  const shape = {};
  for (const [string, offset] of Object.entries(t.shapes[quality.id])) shape[string] = at + offset;
  return { root: t.root, alt: t.alt, fifth: t.fifth, fifthFret: shape[t.fifth], shape };
}

// The library, built root by root so CHORD_IDS is in wheel order (C, Cm, C7,
// C♯, C♯m, C♯7, …). An open voicing wins wherever one exists.
export const CHORDS = {};
export const CHORD_SHAPES = {};
for (const root of ROOTS) {
  for (const quality of QUALITIES) {
    const id = root.id + quality.suffix;
    // NOTE `root`/`alt`/`fifth` on a chord are STRING NUMBERS, not notes — the
    // root NOTE is `rootId`. Two different senses of the word, and the generator
    // means the string.
    const { shape, ...chord } = OPEN_CHORDS[id] || deriveBarreChord(root, quality);
    CHORDS[id] = { name: root.name + quality.suffix, rootId: root.id, quality: quality.id, ...chord };
    CHORD_SHAPES[id] = shape;
  }
}

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
    // Named "Wild Card", not "Chaos" — the word was doing two jobs. This tier is
    // deliberately OFF the difficulty curve (session 6, user's call), so calling
    // both the setting and its outlier by the same name implied a ranking that
    // doesn't exist. The ID stays `chaos`: saved patterns store it.
    name: "Wild Card",
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

// Menu sections for the Fingers selector, same idiom as KEY_GROUPS.
// The split is the point: Tame → Loose → Unruly is a curve you climb, and Wild
// card isn't on it. A bare divider would only imply that; the caption says it,
// and "Experimental" leaves room for future off-curve generation ideas.
// A test asserts these partition CHAOS_IDS.
export const CHAOS_GROUPS = [
  { label: "Complexity",   ids: ["tame", "loose", "unruly"] },
  { label: "Experimental", ids: ["chaos"] },
];

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
//   • II7 / III7 / VI7 — SECONDARY DOMINANTS (session 29): the ragtime/Piedmont
//            circle-of-fifths chain (I–VI7–II7–V7 is C–A7–D7–G7) and the
//            III7 turnaround (I–III7–IV–V7). Each is a dom7 built on that degree.
//   • V7   — a dominant-7th five, in both modes (the V7 cadence: …–V7–I / …–V7–i).
// `romanInKey` already spells all of these from interval + a "7" suffix (A7 in C
// reads VI7), so adding a token is a KEYS edit only — no numeral-map change.
//   • II and ♭VII are kept in the map for hand-edit/transpose robustness even
//     though no shipped progression uses them now (same as `v` below).
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
  C:  { name: "C",  mode: "major", chords: { I: "C",  ii: "Dm",  iii: "Em",  IV: "F", V: "G", vi: "Am",  II: "D",  "♭VII": "Bb", I7: "C7", II7: "D7",  III7: "E7",  VI7: "A7",  V7: "G7" } },
  G:  { name: "G",  mode: "major", chords: { I: "G",  ii: "Am",  iii: "Bm",  IV: "C", V: "D", vi: "Em",  II: "A",  "♭VII": "F",  I7: "G7", II7: "A7",  III7: "B7",  VI7: "E7",  V7: "D7" } },
  D:  { name: "D",  mode: "major", chords: { I: "D",  ii: "Em",  iii: "F#m", IV: "G", V: "A", vi: "Bm",  II: "E",  "♭VII": "C",  I7: "D7", II7: "E7",  III7: "F#7", VI7: "B7",  V7: "A7" } },
  A:  { name: "A",  mode: "major", chords: { I: "A",  ii: "Bm",  iii: "C#m", IV: "D", V: "E", vi: "F#m", II: "B",  "♭VII": "G",  I7: "A7", II7: "B7",  III7: "C#7", VI7: "F#7", V7: "E7" } },
  E:  { name: "E",  mode: "major", chords: { I: "E",  ii: "F#m", iii: "G#m", IV: "A", V: "B", vi: "C#m", II: "F#", "♭VII": "D",  I7: "E7", II7: "F#7", III7: "G#7", VI7: "C#7", V7: "B7" } },
  // --- minor keys ---
  Am: { name: "Am", mode: "minor", chords: { i: "Am", III: "C", iv: "Dm", v: "Em", V: "E", VI: "F", VII: "G", V7: "E7" } },
  Em: { name: "Em", mode: "minor", chords: { i: "Em", III: "G", iv: "Am", v: "Bm", V: "B", VI: "C", VII: "D", V7: "B7" } },
};

export const KEY_IDS = Object.keys(KEYS);
export const DEFAULT_KEY = "C";

// Key selector, grouped by mode (Major then Minor) — the dropdown shows headers.
export const KEY_GROUPS = [
  { label: "Major", ids: KEY_IDS.filter((k) => KEYS[k].mode === "major") },
  { label: "Minor", ids: KEY_IDS.filter((k) => KEYS[k].mode === "minor") },
];

// (There were two grouped chord menus here — "Open chords / More majors /
// Dominant 7 / More minors" for the single picker and a Major/Dom7/Minor
// partition for the per-bar one. Both existed to make a 21-item list findable.
// Root × quality IS the organisation now, and it's the same two wheels in both
// places, so the groups went with the lists.)

// Preset progressions, curated by STYLE (the value a fingerstyle player actually
// reaches for), so the dropdown groups them under those headers. EVERY preset is
// four bars — a shorter idea fills the phrase in whatever way sits best under an
// alternating thumb: two bars each (I–V → I I V V), a held last chord (I–II7–V →
// I II7 V V), or a front-doubled tonic (i–iv–V7 → i i iv V7). Hand-edit any bar;
// if the result stops matching a preset the selector reads "Custom". `label` is
// the concise idea shown in the menu / readout (I–V, I–II7–V, i–iv–V7); `tokens`
// is its literal 4-bar realization.
//
// Revamped session 29 to the curated master list: styles are Foundations / Folk &
// Roots / Classic Country / Ragtime & Piedmont (secondary dominants) / Modern
// Pop/Acoustic / Classic Standards (major), and Minor Descends / Minor Blues /
// Modern Minor (minor). On-drum style captions are a follow-up (his ask) — the
// wheel still cuts an engraved groove at each style change.
export const PROGRESSIONS = [
  // --- major ---
  { id: "maj_1_5",        mode: "major", style: "Foundations",        label: "I–V",          tokens: ["I", "I", "V", "V"] },
  { id: "maj_1_4_1_5",    mode: "major", style: "Foundations",        label: "I–IV–I–V",     tokens: ["I", "IV", "I", "V"] },
  { id: "maj_1_4_5_1",    mode: "major", style: "Folk & Roots",       label: "I–IV–V–I",     tokens: ["I", "IV", "V", "I"] },
  { id: "maj_1_6_4_5",    mode: "major", style: "Folk & Roots",       label: "I–vi–IV–V",    tokens: ["I", "vi", "IV", "V"] },
  { id: "maj_1_7_4_1",    mode: "major", style: "Classic Country",    label: "I–I7–IV–I",    tokens: ["I", "I7", "IV", "I"] },
  { id: "maj_1_27_5",     mode: "major", style: "Classic Country",    label: "I–II7–V",      tokens: ["I", "II7", "V", "V"] },
  { id: "maj_1_67_27_57", mode: "major", style: "Ragtime / Piedmont", label: "I–VI7–II7–V7", tokens: ["I", "VI7", "II7", "V7"] },
  { id: "maj_1_37_4_57",  mode: "major", style: "Ragtime / Piedmont", label: "I–III7–IV–V7", tokens: ["I", "III7", "IV", "V7"] },
  { id: "maj_1_5_6_4",    mode: "major", style: "Modern Pop/Acoustic", label: "I–V–vi–IV",   tokens: ["I", "V", "vi", "IV"] },
  { id: "maj_1_4_6_5",    mode: "major", style: "Modern Pop/Acoustic", label: "I–IV–vi–V",   tokens: ["I", "IV", "vi", "V"] },
  { id: "maj_1_4_2_5",    mode: "major", style: "Classic Standards",  label: "I–IV–ii–V",    tokens: ["I", "IV", "ii", "V"] },
  { id: "maj_1_6_2_5",    mode: "major", style: "Classic Standards",  label: "I–vi–ii–V",    tokens: ["I", "vi", "ii", "V"] },
  // --- minor ---
  { id: "min_1_7_6_5",    mode: "minor", style: "Minor Descends",     label: "i–VII–VI–V",   tokens: ["i", "VII", "VI", "V"] },
  { id: "min_1_7_6_57",   mode: "minor", style: "Minor Descends",     label: "i–VII–VI–V7",  tokens: ["i", "VII", "VI", "V7"] },
  { id: "min_1_4_57",     mode: "minor", style: "Minor Blues",        label: "i–iv–V7",      tokens: ["i", "i", "iv", "V7"] },
  { id: "min_1_4_1_57",   mode: "minor", style: "Minor Blues",        label: "i–iv–i–V7",    tokens: ["i", "iv", "i", "V7"] },
  { id: "min_1_6_3_7",    mode: "minor", style: "Modern Minor",       label: "i–VI–III–VII", tokens: ["i", "VI", "III", "VII"] },
  { id: "min_1_3_7_6",    mode: "minor", style: "Modern Minor",       label: "i–III–VII–VI", tokens: ["i", "III", "VII", "VI"] },
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

// Pitch class of every note name we can see in a chord id (0 = C … 11 = B).
const NOTE_PC = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

// Root pitch class of a chord id (strip a dom7 "7" and a minor "m").
function chordRootPc(chordId) {
  return NOTE_PC[chordId.replace(/7$/, "").replace(/m$/, "")];
}

// Semitone-from-tonic → uppercase Roman numeral, spelled naturally for each mode
// (a minor key's III/VI/VII are diatonic; a major key's are ♭III/♭VI/♭VII). The
// tritone is ♯IV by convention. Case + a "7" suffix are applied per chord quality.
const MAJOR_ROMAN = ["I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII"];
const MINOR_ROMAN = ["I", "♭II", "II", "III", "♯III", "IV", "♯IV", "V", "VI", "♯VI", "VII", "♯VII"];

// Roman numeral for ANY library chord relative to a key, computed from the
// interval + quality — so a hand-edited (non-diatonic) bar reads as e.g. "♯iv"
// instead of "?". Reproduces the curated KEYS token for diatonic chords, so the
// readout is consistent whether the chord is in the key's map or not.
export function romanInKey(chordId, keyId) {
  const key = KEYS[keyId];
  if (!key) return "?";
  const rootPc = chordRootPc(chordId);
  const tonicPc = NOTE_PC[key.name.replace(/m$/, "")];
  if (rootPc == null || tonicPc == null) return "?";
  const interval = (rootPc - tonicPc + 12) % 12;
  let num = (key.mode === "minor" ? MINOR_ROMAN : MAJOR_ROMAN)[interval];
  if (/m$/.test(chordId)) num = num.toLowerCase(); // minor quality → lowercase
  if (/7$/.test(chordId)) num += "7";              // dominant 7th
  return num;
}

// Display numeral for a bar: the curated key token if the chord is in the key's
// map, otherwise the computed numeral (never "?" for a library chord).
export function degreeLabel(chordId, keyId) {
  return degreeOf(chordId, keyId) ?? romanInKey(chordId, keyId);
}

// ----- randomisers (pure; rng injectable so tests are deterministic) -----
// "Give me something new to drill." Both avoid handing back what's already on
// screen — a die that can roll the same face reads as broken — by resampling a
// bounded number of times, then falling back to any valid answer.
function pickDifferent(options, isSame, rng, tries = 24) {
  if (!options.length) return null;
  for (let i = 0; i < tries; i++) {
    const choice = options[Math.floor(rng() * options.length)];
    if (!isSame(choice)) return choice;
  }
  return options.find((o) => !isSame(o)) ?? options[0];
}

// A random key + a preset progression valid in that key's mode.
// Sampled in TWO STAGES — key uniformly, then a progression within it — rather
// than uniformly over all (key, progression) pairs. Flat pair-sampling would make
// minor keys ~8% of rolls (2 keys × 3 progressions against 5 × 14), so you'd
// almost never land in Am/Em; two-stage gives every key an equal 1-in-7 turn.
export function randomKeyProgression(currentKey, currentProgId, rng = Math.random) {
  const progsFor = (key) => PROGRESSIONS.filter((p) => p.mode === KEYS[key].mode);
  const isCurrent = (x) => x.key === currentKey && x.progression === currentProgId;
  for (let i = 0; i < 24; i++) {
    const key = KEY_IDS[Math.floor(rng() * KEY_IDS.length)];
    const progs = progsFor(key);
    if (!progs.length) continue;
    const roll = { key, progression: progs[Math.floor(rng() * progs.length)].id };
    if (!isCurrent(roll)) return roll;
  }
  // Exhausted the retries (vanishingly unlikely): hand back any valid non-current pair.
  for (const key of KEY_IDS) {
    for (const p of progsFor(key)) {
      const roll = { key, progression: p.id };
      if (!isCurrent(roll)) return roll;
    }
  }
  return null;
}

// A random single chord, from the WHOLE library (his call, with the wheel): the
// die used to roll only the open "campfire" chords, but a picker that offers all
// 36 with equal ceremony should have a die that does the same.
export function randomChord(currentChord, rng = Math.random, pool = CHORD_IDS) {
  return pickDifferent(pool, (c) => c === currentChord, rng);
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

// ----- Help mode content -----
//
// Every explanation in the app, as DATA — the same rule chords, themes and
// progressions follow, and for the same reason: the copy is the thing that
// changes, and it shouldn't live in DOM-building code. The old Guide modal was
// prose inside `renderHelp()` in app.js, which is exactly why it went stale
// (it was still calling the Fingers menu "Chaos" three versions after the
// rename).
//
// A key here is matched to a `data-help="<key>"` attribute in index.html.
// `tests.js` asserts the two sides agree in BOTH directions — an unreachable
// entry is dead copy, and a control pointing at a missing entry is a tap that
// does nothing, which is worse in help mode than anywhere else.
//
// THE HOUSE RULES, his, from the v2.13.6 revision pass — these are what keep a
// card a card instead of the manual this replaced:
//
//   * Say what it does, plus anything that would surprise you. Stop.
//   * Cut anything visible on screen, anything explaining WHY the app works
//     that way, and anything you'd discover in one tap.
//   * Assume a guitar player. Nashville numbers, alternating bass, i/m/a and
//     "whole step down" all pass without explanation; only app-specific
//     behaviour gets spelled out.
//   * No em dashes.
//   * Two lines is the ceiling. Where one runs long the length is the signal
//     that the thing itself is fiddly.
//
// TITLES follow the shape of the phrase, not one blanket rule (v2.13.7, his
// call): a title-like one is Title Case ("Help Mode", "Pattern Length", "Bass
// Warning"), a sentence-like one stays sentence case ("What you're playing
// over", "The grid is your right hand"). Single words are unaffected either
// way, which is most of them. "Count-in" keeps its lowercase particle — that's
// title case for a hyphenated compound, and it matches the lamp's own label.
// SETTLED, v2.14.3: this was flagged as an open reversion from v2.13.7 through
// v2.14.2, changed to "Count-In", and reverted the same session on his read —
// "I was happy with the help cards before". The copy stands as it is.
//
// A blank line in a `body` starts a new paragraph (`help.js` splits on it).
// `HELP_COPY.md` is the same content laid out for review; it is generated from
// this map, never the other way round.
export const HELP = {
  // The mode announcing itself. Shown anchored to the "?" the moment you arm
  // help mode, so you're never looking at a changed screen with no explanation
  // of what changed. It carries the version, which used to sit at the foot of
  // the Guide this replaced.
  "help-mode": {
    title: "Help Mode",
    body: "Tap anything to find out what it does. Nothing you tap will change. The gear still opens Options. Tap ? again to leave.",
  },

  // --- header ---
  "edit-toggle": {
    title: "Edit",
    body: "Tapping a cell adds or removes a note. Editing a bar that repeats changes every repeat, so raise Pattern length first if you want one to differ.",
  },
  "open-save": {
    title: "Save",
    body: "Names the current pattern and saves it to this device, along with its chords, key and capo.",
  },
  "open-load": {
    title: "Load",
    body: "Your saved patterns. Load, rename or delete any of them. Loading brings back the chords it was written over.",
  },
  "capo-tag": {
    title: "Capo",
    body: "The grid still shows the shapes you play. The arrow points at what they actually sound like.",
  },
  "loaded-name": {
    title: "Pattern Name",
    body: "The saved pattern currently on screen.",
  },

  // --- the stage ---
  "chord-head": {
    title: "What you're playing over",
    body: "The chord in Single mode, or the progression's numbers and key in Progression mode.",
  },
  // Two paragraphs, and the second is load-bearing: the per-bar chord pickers
  // sit inside the grid and have no card of their own, so a tap on one falls
  // through to here (v2.13.6, his call). They briefly had a separate entry —
  // see CHANGELOG session 20.
  grid: {
    title: "The grid is your right hand",
    body:
      "Each column is an eighth note, each row a string. The bottom rows are your thumb, the bass. The top rows are your fingers: i, m, a on strings 3, 2 and 1.\n\n" +
      "In progression mode, the chords are indicated above each bar. These can be edited manually.",
  },

  // --- transport ---
  play: {
    title: "Play",
    body: "Runs the loop after a one-bar count-in. What you hear is set on the Preferences page.",
  },
  // The beat lamp is deliberately NOT annotated: it's nested inside this
  // control, so a tap on it lands here. It's a jewel blinking beside a number
  // marked BPM, and its one non-obvious job (counting you in) is Play's card.
  bpm: {
    title: "Tempo",
    body: "Drag to set the tempo, 40 to 240 bpm.",
  },
  generate: {
    title: "Generate",
    body: "Rolls a fresh pattern using the Thumb and Fingers settings in Options. It asks first if you have unsaved edits.",
  },
  "type-indicator": {
    title: "Bass Warning",
    body: "The bass isn't following your chords. ABS means it's fixed to literal strings (Full Random, Climb, Descend). MIX means some notes follow and some don't.",
  },

  // --- Options: Setup ---
  "chord-mode": {
    title: "Format",
    body: "\u201CSingle\u201D drills one chord for the whole loop. \u201CProgression\u201D gives you a chord per bar.",
  },
  capo: {
    title: "Capo",
    body: "Changes the sounding key, like putting on a capo or tuning down.",
  },
  "field-chord": {
    title: "Chord",
    body: "The one chord the whole pattern is played over. Every root has a major, a minor and a 7.",
  },
  // ONE card for the merged field (v2.14.5): key and progression are two drums
  // behind one trigger, so there is one tap target and it has to cover both.
  "field-keyprog": {
    title: "Key and Progression",
    body: "Two drums: the key on the left, the progression on the right. Every progression is four bars, so a two-chord idea repeats and a three-chord idea holds its last chord.\n\nChanging key within major or within minor transposes what you have, edited bars included. Crossing between major and minor resets to that mode's first progression.",
  },
  "randomize-chords": {
    title: "Randomize",
    body: "Rolls a new key and progression, or a new chord in Single mode. Your pattern and settings are left alone.",
  },
  bass: {
    title: "Thumb",
    body: "The bass line your thumb plays. Changing this re-rolls only the bass.",
  },
  chaos: {
    title: "Fingers",
    // SETTLED, v2.14.3: Wild Card's off-the-curve line stays OUT. It was flagged
    // as an open reversion since v2.13.7, restored, and he cut it again on
    // reading it — "I was happy with the help cards before". His own v2.13.6 rule
    // covers it: the menu groups Wild Card under Experimental, so you'd discover
    // it in one tap. Don't re-propose.
    body: "How busy and how hard the finger part is. Changing this re-rolls only the fingers.",
  },
  pattern: {
    title: "Pattern Length",
    body: "How many bars are different before the pattern repeats. Growing it copies what you have rather than re-rolling, so raise it when you want one bar to differ from the rest.",
  },
  swing: {
    title: "Swing",
    body: "Delays the &s between the beats. Drag it while the loop runs and you'll hear it change.",
  },

  // --- Options: Preferences ---
  "click-toggle": { title: "Metronome", body: "The click on every beat." },
  "pattern-toggle": { title: "Melody", body: "Hear the pattern played back." },
  "count-in-toggle": { title: "Count-in", body: "One bar of counting before the loop starts." },
  "ui-sound-toggle": { title: "Buttons", body: "The mechanical click when you press a control. It stays quiet while the transport runs." },
  "label-mode": { title: "Note Labels", body: "What's written inside each note: fret number, picking finger, or nothing." },
  theme: { title: "Theme", body: "The instrument's colours." },
};

export const HELP_KEYS = Object.keys(HELP);
