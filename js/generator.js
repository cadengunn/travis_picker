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

// ---- finger (treble) generation for one bar ---------------------------------
// Returns a list of treble events for offbeats (and downbeat pinches) obeying
// the active chaos flags. Never touches thumb rows (domain crossing off in v1).
function generateTrebleForBar(flags, thumbBeatSlots, rng) {
  const events = [];

  // Decide how many offbeats to fill, within [min,max].
  const span = flags.maxOffbeats - flags.minOffbeats;
  const count = flags.minOffbeats + Math.floor(rng() * (span + 1));
  const chosenOffbeats = shuffled(OFFBEAT_SLOTS, rng).slice(0, count).sort((a, b) => a - b);

  let prevString = null; // for noRepeatTrebleString across consecutive filled offbeats
  for (const slot of chosenOffbeats) {
    let candidates = FINGER_STRINGS.slice();
    if (flags.noRepeatTrebleString && prevString != null) {
      const filtered = candidates.filter((s) => s !== prevString);
      if (filtered.length) candidates = filtered;
    }

    // How many notes in this slot: single, or a double/triple stop if allowed.
    let notesHere = 1;
    if (flags.allowDoubleStops && !flags.favorSingleOffbeats) {
      // ~35% double, ~10% triple when double stops are permitted
      const r = rng();
      if (r > 0.9) notesHere = 3;
      else if (r > 0.55) notesHere = 2;
    } else if (flags.allowDoubleStops && flags.favorSingleOffbeats) {
      if (rng() > 0.85) notesHere = 2; // rare double stop
    }
    notesHere = Math.min(notesHere, candidates.length);

    const strings = shuffled(candidates, rng).slice(0, notesHere);
    for (const string of strings) {
      events.push({ slot, finger: STRING_FINGER[string], string });
    }
    prevString = strings[0];
  }

  // Pinches: finger notes sounding together with the thumb on a downbeat.
  // (Offbeat notes are already handled above; "pinches anywhere" just means the
  // downbeat pinch is allowed regardless of the pinchesDownbeatsOnly flag.)
  const pinchChance = flags.pinchesDownbeatsOnly ? 0.35 : 0.25;
  for (const slot of thumbBeatSlots) {
    if (rng() < pinchChance) {
      const string = pick(FINGER_STRINGS, rng);
      events.push({ slot, finger: STRING_FINGER[string], string });
    }
  }

  return events;
}

// ---- one bar ----------------------------------------------------------------
function generateBar(chordId, preset, flags, rng) {
  const events = [];

  // Thumb skeleton: one quarter-note per beat on slots 1,3,5,7.
  preset.beats.forEach((entry, i) => {
    const slot = BEAT_SLOTS[i];
    const t = resolveThumbEntry(entry, chordId, rng);
    events.push({ slot, ...t });
  });

  // Treble.
  const treble = generateTrebleForBar(flags, BEAT_SLOTS, rng);
  for (const ev of treble) events.push(ev);

  // Hard rule: never two events on the same string in the same slot.
  return enforceHardRule(events);
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
  const bars = [];
  for (let i = 0; i < n; i++) {
    bars.push(generateBar(chordId, preset, flags, rng));
  }

  // Relative unless any thumb entry is absolute (integers or "random").
  const isAbsolute = preset.beats.some(
    (e) => typeof e === "number" || e === "random"
  );

  return {
    type: isAbsolute ? "absolute" : "relative",
    chord: chordId,
    bass,
    chaos,
    patternBars: n,
    bars,
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
