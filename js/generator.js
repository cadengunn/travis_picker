// generator.js — the pure heart of the app.
//
//   generatePattern(chordId, options) -> Pattern
//   resolvePattern(pattern, chordId) -> Pattern (fills string+fret)
//
// No DOM, no globals, no side effects (RNG is injectable for testable output).
// Adding a bass preset or chord never requires touching this file — it consumes
// data.js tables only.

import {
  CHORDS,
  THUMB_STRINGS,
  FINGER_STRINGS,
  FINGER_STRING,
  STRING_FINGER,
  BEAT_SLOTS,
  OFFBEAT_SLOTS,
  CHAOS_PRESETS,
  getBassPreset,
  fretFor,
} from "./data.js";

// ---- tiny RNG helpers (default Math.random, override for deterministic tests)
function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}
function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- thumb resolution -------------------------------------------------------
// Resolve one preset beat entry to a partial thumb event. Roles produce a
// relative event (role kept, string derived); integers/"random" are absolute.
function resolveThumbEntry(entry, chordId, rng) {
  const chord = CHORDS[chordId];
  if (entry === "random") {
    return { finger: "p", string: pick(THUMB_STRINGS, rng), absolute: true };
  }
  if (typeof entry === "number") {
    return { finger: "p", string: entry, absolute: true };
  }
  // role: "root" | "alt" | "fifth"
  const role = entry === "alt" ? "alt_bass" : entry; // spec model uses alt_bass
  const stringForRole = { root: chord.root, alt_bass: chord.alt, fifth: chord.fifth };
  return { finger: "p", role, string: stringForRole[role], absolute: false };
}

const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];

// ---- thumb layer: one quarter-note per beat (slots 1,3,5,7) -----------------
function generateThumbBar(chordId, preset, rng) {
  return preset.beats.map((entry, i) => ({
    slot: BEAT_SLOTS[i],
    ...resolveThumbEntry(entry, chordId, rng),
  }));
}

// ---- treble (finger) layer for one bar --------------------------------------
// Walks slots 1..8 in order so constraints can look at neighbours. Takes the
// bar's thumb events so it can honour the hard rule and — under Tame's
// noAdjacentSameString — avoid re-striking a string the thumb just used (this
// matters on chords like D whose alt bass sits on string 3).
function generateTrebleBar(flags, thumbEvents, rng) {
  // slot -> Set(strings) already sounding. Thumb is known up front, so we can
  // check the NEXT slot too, not just the previous one.
  const occupied = new Map();
  const add = (slot, s) => {
    if (!occupied.has(slot)) occupied.set(slot, new Set());
    occupied.get(slot).add(s);
  };
  for (const ev of thumbEvents) add(ev.slot, ev.string);

  // Which offbeats get filled, within [min,max].
  const span = flags.maxOffbeats - flags.minOffbeats;
  const count = flags.minOffbeats + Math.floor(rng() * (span + 1));
  const offbeats = new Set(shuffled(OFFBEAT_SLOTS, rng).slice(0, count));

  // Pinches: finger note(s) sounding together with the thumb on a downbeat.
  const pinchChance = flags.pinchesDownbeatsOnly ? 0.35 : 0.25;
  const pinches = new Set(thumbEvents.map((e) => e.slot).filter(() => rng() < pinchChance));

  const events = [];
  for (const slot of ALL_SLOTS) {
    if (!offbeats.has(slot) && !pinches.has(slot)) continue;

    // Hard rule: never a string already sounding in this slot.
    let candidates = FINGER_STRINGS.filter((s) => !occupied.get(slot)?.has(s));

    // Tame: never the same string on an adjacent 8th (either side) — that's
    // the awkward same-string re-strike a beginner shouldn't have to fight.
    if (flags.noAdjacentSameString) {
      const near = [occupied.get(slot - 1), occupied.get(slot + 1)];
      const filtered = candidates.filter((s) => !near.some((set) => set?.has(s)));
      if (filtered.length) candidates = filtered;
    }
    if (!candidates.length) continue;

    // How many notes in this slot: single, or a double/triple stop if allowed.
    let notesHere = 1;
    if (flags.allowDoubleStops && !flags.favorSingleOffbeats) {
      const r = rng();
      if (r > 0.9) notesHere = 3;
      else if (r > 0.55) notesHere = 2;
    } else if (flags.allowDoubleStops && flags.favorSingleOffbeats) {
      if (rng() > 0.85) notesHere = 2; // rare double stop
    }
    notesHere = Math.min(notesHere, candidates.length);

    for (const string of shuffled(candidates, rng).slice(0, notesHere)) {
      events.push({ slot, finger: STRING_FINGER[string], string });
      add(slot, string);
    }
  }

  return events;
}

// Merge the two layers into the flat event list everything downstream uses.
function mergeBar(thumbBar, trebleBar) {
  return enforceHardRule([...thumbBar, ...trebleBar]);
}

// Drop any event that would collide with an already-kept event on the same
// (slot, string). Thumb notes win (added first). This is physics, not taste.
function enforceHardRule(events) {
  const seen = new Set();
  const kept = [];
  for (const ev of events) {
    const key = `${ev.slot}:${ev.string}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(ev);
  }
  return kept.sort((a, b) => a.slot - b.slot);
}

// ---- public: generatePattern -----------------------------------------------
export function generatePattern(chordId, options = {}) {
  const {
    bass = "travis",
    chaos = "tame",
    patternBars = 1,
    rng = Math.random,
  } = options;

  const preset = getBassPreset(bass);
  const flags = CHAOS_PRESETS[chaos] || CHAOS_PRESETS.tame;

  // patternBars = how many DISTINCT bars of picking. The renderer cycles them
  // across however many bars are on screen (see resolvePhrase).
  const n = Math.max(1, patternBars);
  const thumbBars = [];
  const trebleBars = [];
  const bars = [];
  for (let i = 0; i < n; i++) {
    const thumb = generateThumbBar(chordId, preset, rng);
    const treble = generateTrebleBar(flags, thumb, rng);
    thumbBars.push(thumb);
    trebleBars.push(treble);
    bars.push(mergeBar(thumb, treble));
  }

  return {
    type: patternType(preset),
    chord: chordId,
    bass,
    chaos,
    patternBars: n,
    // The two layers are kept so either can be re-rolled without disturbing the
    // other (see regenerateBass / regenerateTreble). `bars` is their merge and
    // is what everything downstream reads.
    thumbBars,
    trebleBars,
    bars,
  };
}

// Relative unless any thumb entry is absolute (integers or "random").
function patternType(preset) {
  const isAbsolute = preset.beats.some((e) => typeof e === "number" || e === "random");
  return isAbsolute ? "absolute" : "relative";
}

// ---- layer-wise re-rolls ----------------------------------------------------
// Swap the bass engine while keeping the exact same right-hand pattern, so you
// can audition thumb patterns under one finger part.
export function regenerateBass(pattern, bassId, chordId = pattern.chord, rng = Math.random) {
  const preset = getBassPreset(bassId);
  const thumbBars = pattern.trebleBars.map(() => generateThumbBar(chordId, preset, rng));
  return {
    ...pattern,
    bass: bassId,
    type: patternType(preset),
    thumbBars,
    bars: thumbBars.map((thumb, i) => mergeBar(thumb, pattern.trebleBars[i])),
  };
}

// Re-roll the fingers (and re-apply chaos constraints) over the same bass.
export function regenerateTreble(pattern, chaosId, rng = Math.random) {
  const flags = CHAOS_PRESETS[chaosId] || CHAOS_PRESETS.tame;
  const trebleBars = pattern.thumbBars.map((thumb) => generateTrebleBar(flags, thumb, rng));
  return {
    ...pattern,
    chaos: chaosId,
    trebleBars,
    bars: pattern.thumbBars.map((thumb, i) => mergeBar(thumb, trebleBars[i])),
  };
}

// ---- resolve one bar against one chord --------------------------------------
// Fill string+fret on every event. Relative bass events re-derive their string
// from the chord's roles (the point of progression mode); absolute events keep
// their literal string. Fret comes from the chord shape (fifth role uses the
// chord's fifthFret override).
export function resolveBar(bar, chordId) {
  const chord = CHORDS[chordId];
  return bar.map((ev) => {
    const out = { ...ev };
    if (ev.finger === "p") {
      if (ev.role && !ev.absolute) {
        const stringForRole = { root: chord.root, alt_bass: chord.alt, fifth: chord.fifth };
        out.string = stringForRole[ev.role];
        out.fret = ev.role === "fifth" ? chord.fifthFret : fretFor(chordId, out.string);
      } else {
        // absolute bass string kept as-is
        out.fret = fretFor(chordId, out.string);
      }
    } else {
      // treble: string implied by finger (domain crossing off)
      out.string = ev.string ?? FINGER_STRING[ev.finger];
      out.fret = fretFor(chordId, out.string);
    }
    return out;
  });
}

// ---- public: resolvePattern (single chord for the whole pattern) ------------
export function resolvePattern(pattern, chordId = pattern.chord) {
  return { ...pattern, chord: chordId, bars: pattern.bars.map((bar) => resolveBar(bar, chordId)) };
}

// ---- public: resolvePhrase (per-bar chords) ---------------------------------
// `chords` is an array of chord ids, one per bar on screen. The distinct
// pattern bars cycle across them; each bar is resolved against its own chord.
// Returns [{ chord, bar }, ...] ready for rendering.
export function resolvePhrase(pattern, chords) {
  const cell = pattern.bars;
  return chords.map((chordId, i) => ({
    chord: chordId,
    bar: resolveBar(cell[i % cell.length], chordId),
  }));
}
