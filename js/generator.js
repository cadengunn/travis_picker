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

// ---- thumb layer: one quarter-note per beat (slots 1,3,5,7) -----------------
function generateThumbBar(chordId, preset, rng) {
  return preset.beats.map((entry, i) => ({
    slot: BEAT_SLOTS[i],
    ...resolveThumbEntry(entry, chordId, rng),
  }));
}

const SLOTS_PER_BAR = 8;

// ---- treble (finger) layer for the WHOLE loop -------------------------------
// The pattern is always a loop, so the finger layer is generated as ONE circular
// sequence of N = 8 × bars 8th-note slots rather than bar-by-bar. Adjacency
// (`noAdjacentSameString`) treats it as continuous: every slot checks its two
// neighbours, interior bar seams (slot 8↔9 …) are ordinary adjacencies, and the
// single wrap is the last 8th back to the first. That's what closes the
// loop-point re-strike a per-bar generator can't see.
//
// Walking the sequence in order is enough to catch every adjacent pair: for any
// two neighbours the later-placed one sees the earlier, and for the wrap pair
// the last slot (placed last) sees the first (placed first). Thumb strings are
// seeded up front, so a slot also avoids re-striking the thumb on either side.
//
// Difficulty is driven by strike-times: how many columns get a finger note
// (min/maxOffbeats + pinchOdds). Column thickness comes from doubleStopOdds,
// except on an all-singles roll (`allSinglesOdds`, decided once per pattern)
// where the whole loop uses single finger notes — keeping genuinely simple
// wandering-singles generations a real species on the lower tiers.
//
// Returns per-bar treble arrays, so the rest of the app keeps its bar structure.
function generateTrebleLoop(flags, thumbBars, rng) {
  const bars = thumbBars.length;
  const N = bars * SLOTS_PER_BAR;
  const barOf = (gi) => Math.floor(gi / SLOTS_PER_BAR);
  const localSlot = (gi) => (gi % SLOTS_PER_BAR) + 1; // 1..8
  const globalIndex = (bar, slot) => bar * SLOTS_PER_BAR + (slot - 1);

  // gi -> Set(strings) already sounding. Seed with the thumb across the loop.
  const occupied = new Map();
  const add = (gi, s) => {
    if (!occupied.has(gi)) occupied.set(gi, new Set());
    occupied.get(gi).add(s);
  };
  for (let b = 0; b < bars; b++) {
    for (const ev of thumbBars[b]) add(globalIndex(b, ev.slot), ev.string);
  }

  // Which global slots want a finger note. Strike-times are THE difficulty
  // dial, so the budget is the TOTAL finger columns per bar — and placement is
  // ONE weighted roll per strike, not separate pinch/offbeat phases (the old
  // two-phase allocator preferred offbeats structurally and could fall short
  // of the budget when few pinches rolled). `pinchOdds` is the chance a strike
  // lands on a beat — a pinch, fingers riding the thumb's existing attack
  // moment — rather than an offbeat, which creates a NEW attack moment between
  // thumb hits (the syncopation skill). A full side falls back to the other,
  // so the budget is a true floor. All-pinch bars are possible but rare
  // (~pinchOdds^budget).
  const active = new Set();
  for (let b = 0; b < bars; b++) {
    const span = flags.maxStrikes - flags.minStrikes;
    const budget = flags.minStrikes + Math.floor(rng() * (span + 1));
    const beats = shuffled(BEAT_SLOTS, rng);
    const offs = shuffled(OFFBEAT_SLOTS, rng);
    for (let k = 0; k < budget && (beats.length || offs.length); k++) {
      const onBeat = rng() < flags.pinchOdds;
      const slot = (onBeat ? beats : offs).pop() ?? (onBeat ? offs : beats).pop();
      active.add(globalIndex(b, slot));
    }
  }

  // Legal finger strings at a global slot: not already sounding (hard rule) and,
  // when noAdjacentSameString is on, not on either circular neighbour. HARD for
  // the clean tiers (Tame, Loose): a double stop plus the thumb can block all
  // three finger strings on the next 8th (e.g. D's alt bass on string 3), and a
  // quietly-dropped offbeat beats an audible same-string re-strike.
  const legalAt = (gi) => {
    let c = FINGER_STRINGS.filter((s) => !occupied.get(gi)?.has(s));
    if (flags.noAdjacentSameString) {
      const prev = occupied.get((gi - 1 + N) % N);
      const next = occupied.get((gi + 1) % N);
      c = c.filter((s) => !(prev?.has(s) || next?.has(s)));
    }
    return c;
  };

  // One roll up front: an all-singles generation. The whole loop uses single
  // finger notes only — no stacks, and the minDoubleStops floor is suppressed.
  const singlesOnly = rng() < (flags.allSinglesOdds || 0);

  // Walk the whole loop in order and place notes.
  const placed = new Map(); // gi -> [strings]
  for (let gi = 0; gi < N; gi++) {
    if (!active.has(gi)) continue;
    const candidates = legalAt(gi);
    if (!candidates.length) continue;

    // Single, or a double/triple stop by the preset's odds. Roll once.
    let notesHere = 1;
    if (!singlesOnly) {
      const { double = 0, triple = 0 } = flags.doubleStopOdds || {};
      const r = rng();
      if (r < triple) notesHere = 3;
      else if (r < triple + double) notesHere = 2;
    }
    notesHere = Math.min(notesHere, candidates.length);

    const strings = shuffled(candidates, rng).slice(0, notesHere);
    for (const s of strings) add(gi, s);
    placed.set(gi, strings);
  }

  // Per-BAR double-stop floor (Unruly): odds alone can roll a whole bar of
  // singles, making it read like Loose. Promote single-note slots to doubles
  // until each bar hits `minDoubleStops`. Skipped on an all-singles roll —
  // that roll's whole point is no stacks.
  if (flags.minDoubleStops > 0 && !singlesOnly) {
    for (let b = 0; b < bars; b++) {
      const slots = Array.from({ length: SLOTS_PER_BAR }, (_, k) => b * SLOTS_PER_BAR + k);
      let doubles = slots.filter((gi) => (placed.get(gi)?.length || 0) >= 2).length;
      const singles = shuffled(slots.filter((gi) => (placed.get(gi)?.length || 0) === 1), rng);
      for (const gi of singles) {
        if (doubles >= flags.minDoubleStops) break;
        const pool = legalAt(gi); // excludes the string already placed here
        if (!pool.length) continue;
        const s = pick(pool, rng);
        add(gi, s);
        placed.get(gi).push(s);
        doubles++;
      }
    }
  }

  // Hard no-blank rule: every bar must have at least one finger note. Adjacency
  // drops (or a low offbeat roll) can leave a bar bare — force one legal offbeat
  // rather than ship an all-thumb bar.
  for (let b = 0; b < bars; b++) {
    const slots = Array.from({ length: SLOTS_PER_BAR }, (_, k) => b * SLOTS_PER_BAR + k);
    if (slots.some((gi) => placed.get(gi)?.length)) continue;
    for (const slot of shuffled(OFFBEAT_SLOTS, rng)) {
      const gi = b * SLOTS_PER_BAR + (slot - 1);
      const pool = legalAt(gi);
      if (!pool.length) continue;
      const s = pick(pool, rng);
      add(gi, s);
      placed.set(gi, [s]);
      break;
    }
  }

  // Split the global finger notes back into per-bar event arrays.
  const trebleBars = Array.from({ length: bars }, () => []);
  for (const [gi, strings] of placed) {
    for (const s of strings) {
      trebleBars[barOf(gi)].push({ slot: localSlot(gi), finger: STRING_FINGER[s], string: s });
    }
  }
  return trebleBars;
}

// Merge the two layers into the flat event list everything downstream uses.
export function mergeBar(thumbBar, trebleBar) {
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
  // Thumb is deterministic per preset+chord (no adjacency logic), so it's built
  // bar-by-bar; the finger layer is then generated across the WHOLE loop so
  // adjacency wraps at the loop point instead of only within each bar.
  const thumbBars = Array.from({ length: n }, () => generateThumbBar(chordId, preset, rng));
  const trebleBars = generateTrebleLoop(flags, thumbBars, rng);
  const bars = thumbBars.map((thumb, i) => mergeBar(thumb, trebleBars[i]));

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

// Change how many distinct bars the pattern has WITHOUT re-rolling: growing
// duplicates the existing bars (cycling), shrinking keeps the first n. Bars are
// copied deeply enough that the new ones can then be edited independently.
// This is what the Pattern control uses, so hand-drawn work survives when you
// realise you need more room.
export function setPatternBars(pattern, n) {
  const size = Math.max(1, n);
  const copy = (bars) =>
    Array.from({ length: size }, (_, i) => bars[i % bars.length].map((e) => ({ ...e })));
  const thumbBars = copy(pattern.thumbBars);
  const trebleBars = copy(pattern.trebleBars);
  return {
    ...pattern,
    patternBars: size,
    thumbBars,
    trebleBars,
    bars: thumbBars.map((t, i) => mergeBar(t, trebleBars[i])),
  };
}

// Re-roll the fingers (and re-apply chaos constraints) over the same bass.
// Uses the whole-loop generator too, so a re-rolled finger part is loop-clean.
export function regenerateTreble(pattern, chaosId, rng = Math.random) {
  const flags = CHAOS_PRESETS[chaosId] || CHAOS_PRESETS.tame;
  const trebleBars = generateTrebleLoop(flags, pattern.thumbBars, rng);
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
