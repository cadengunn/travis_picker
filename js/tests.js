// tests.js — browser-run unit checks. Open tests.html to see pass/fail.
// Covers the spec's required invariants: hard rule, domain assignment, thumb
// skeleton, relative<->resolved round-trip, and Tame stylistic constraints.

import {
  CHORD_IDS,
  CHORDS,
  BASS_PRESETS,
  THUMB_STRINGS,
  FINGER_STRINGS,
  FINGER_STRING,
  BEAT_SLOTS,
  OFFBEAT_SLOTS,
  thumbLegalStrings,
  KEYS,
  KEY_IDS,
  ROOTS,
  QUALITIES,
  chordIdFor,
  splitChordId,
  CHAOS_GROUPS,
  CHAOS_IDS,
  CHAOS_PRESETS,
  PROGRESSIONS,
  CUSTOM_PROGRESSION_ID,
  CHORD_SHAPES,
  allProgressions,
  setCustomProgressions,
  progressionGroups,
  progressionChords,
  detectProgression,
  degreeOf,
  degreeLabel,
  romanInKey,
  chordForRoman,
  randomKeyProgression,
  randomChord,
  fitProgression,
  midiOf,
  OPEN_STRING_MIDI,
  clampCapo,
  capoLabel,
  soundingName,
  CAPO_MIN,
  CAPO_MAX,
  HELP,
  HELP_KEYS,
} from "./data.js";
import { midiToFreq, createStringSynth, DEFAULT_TONE, VOICES } from "./synth.js";
import {
  generatePattern,
  resolvePattern,
  resolvePhrase,
  regenerateBass,
  regenerateTreble,
} from "./generator.js";
import * as GeneratorExports from "./generator.js";
import * as DataExports from "./data.js";
import {
  createStore, buildExport, parseImport,
  createProgressionStore, CUSTOM_PROGRESSION_PREFIX,
} from "./storage.js";
import { BUILTIN_PATTERNS } from "./builtin-patterns.js";
import { toggleNote, inferFinger, resolvedThumbString, deriveType } from "./editor.js";
import { renderGrid, passLampSelector } from "./grid.js";
import {
  createMetronome,
  secondsPerSlot,
  isBeatSlot,
  stepToPosition,
  splitAudioBar,
  hasDrifted,
  MAX_DRIFT,
  BPM_MIN,
  BPM_MAX,
  slotSeconds,
  clampSwing,
  SWING_MIN,
  SWING_MAX,
  DEFAULT_SWING,
} from "./metronome.js";
import { enhanceSelect, retargetOpenPanel } from "./dropdown.js";
import { createChordWheel, createKeyProgWheel, keyProgSplitLabel } from "./wheel.js";
import { confirmModal, promptModal } from "./modal.js";
import { isNav, helpTargetFor, createHelp, NAV_SELECTOR } from "./help.js";
import { createWakeLock, createAudioSession, createAppUpdater, createPlaybackGuard } from "./platform.js";
import { chordBoxModel, renderChordBox, BOX_FRETS } from "./chordbox.js";

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, msg: e.message });
  }
}

// Checks that have to await something (fetch, or a timer the code under test
// uses). Collected here and run — awaited — by runTests before it reports.
const asyncChecks = [];
function acheck(name, fn) {
  asyncChecks.push({ name, fn });
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

// Seeded RNG (mulberry32) for deterministic runs where useful.
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stand-in AudioContext, enough of one for the metronome and the synth. Real
// Web Audio can't be put into iOS's "interrupted" state on demand, and that state
// is the whole of the intermittent-Play bug — so the tests drive it with this.
function fakeAudioContext({ state = "running", resume } = {}) {
  const param = () => ({
    value: 0,
    setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {},
  });
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra });
  const ctx = {
    state,
    currentTime: 0,
    sampleRate: 44100,
    destination: node(),
    createOscillator: () => node({ frequency: param(), start() {}, stop() {} }),
    createGain: () => node({ gain: param() }),
    createBufferSource: () => node({ buffer: null, start() {}, stop() {} }),
    createDynamicsCompressor: () => node({
      threshold: param(), ratio: param(), attack: param(), release: param(),
    }),
    createBuffer: (_ch, len) => ({ length: len, getChannelData: () => new Float32Array(len) }),
    resume: resume || (async () => { ctx.state = "running"; }),
    close: async () => {},
  };
  return ctx;
}

// Swap in a fake AudioContext constructor for the duration of `fn`. Always
// restores, so one failing check can't poison every later one.
async function withFakeAudio(make, fn) {
  const real = window.AudioContext;
  window.AudioContext = function () { return make(); };
  try {
    return await fn();
  } finally {
    window.AudioContext = real;
  }
}

const ALL_BASS = BASS_PRESETS.map((p) => p.id);
const ALL_CHAOS = ["tame", "loose", "unruly", "chaos"];
const ALL_SLOTS_T = [1, 2, 3, 4, 5, 6, 7, 8];

function everyBar(cb) {
  let n = 0;
  for (const chord of CHORD_IDS) {
    for (const bass of ALL_BASS) {
      for (const chaos of ALL_CHAOS) {
        for (let seed = 1; seed <= 8; seed++) {
          const p = generatePattern(chord, {
            bass, chaos, rng: seeded(seed * 97 + n),
          });
          const r = resolvePattern(p, chord);
          for (const bar of r.bars) cb(bar, { chord, bass, chaos, seed });
          n++;
        }
      }
    }
  }
}

// 1) Hard rule: no two events share (slot, string).
check("hard rule: no two notes on the same string in a slot", () => {
  everyBar((bar, ctx) => {
    const seen = new Set();
    for (const ev of bar) {
      const key = `${ev.slot}:${ev.string}`;
      assert(!seen.has(key), `collision at ${key} (${JSON.stringify(ctx)})`);
      seen.add(key);
    }
  });
});

// 2) Domain assignment (chord-aware): thumb stays within {6,5,4} UNION the
//    chord's role strings; fingers stay on 3/2/1 with consistent mapping.
check("domain (chord-aware): thumb within legal set, fingers on 3/2/1", () => {
  everyBar((bar, ctx) => {
    const legalThumb = thumbLegalStrings(ctx.chord);
    for (const ev of bar) {
      if (ev.finger === "p") {
        assert(legalThumb.has(ev.string),
          `thumb off-domain on string ${ev.string} for ${ctx.chord} (${JSON.stringify(ctx)})`);
      } else {
        assert(FINGER_STRINGS.includes(ev.string),
          `finger off-domain on string ${ev.string} (${JSON.stringify(ctx)})`);
        assert(FINGER_STRING[ev.finger] === ev.string,
          `finger ${ev.finger} should map to string ${FINGER_STRING[ev.finger]}, got ${ev.string}`);
      }
    }
  });
});

// 2b) The D outlier is real: on D, the alt role puts the thumb on string 3.
check("D alt-bass: simple-alt thumb reaches string 3 on D", () => {
  const p = generatePattern("D", { bass: "simple_alt", chaos: "tame", rng: seeded(3) });
  const r = resolvePattern(p, "D");
  const altThumb = r.bars[0].find((e) => e.finger === "p" && e.role === "alt_bass");
  assert(altThumb && altThumb.string === 3, `D alt bass should be string 3, got ${altThumb && altThumb.string}`);
  assert(altThumb.fret === 2, `D alt bass on string 3 should be fret 2, got ${altThumb.fret}`);
});

// 3) Thumb skeleton: exactly one thumb per beat slot; thumbs never on offbeats.
check("thumb skeleton: one thumb per beat, none on offbeats", () => {
  everyBar((bar, ctx) => {
    for (const slot of BEAT_SLOTS) {
      const thumbs = bar.filter((e) => e.finger === "p" && e.slot === slot);
      assert(thumbs.length === 1,
        `expected 1 thumb on slot ${slot}, got ${thumbs.length} (${JSON.stringify(ctx)})`);
    }
    for (const slot of OFFBEAT_SLOTS) {
      const thumbs = bar.filter((e) => e.finger === "p" && e.slot === slot);
      assert(thumbs.length === 0,
        `thumb landed on offbeat ${slot} (${JSON.stringify(ctx)})`);
    }
  });
});

// 4) Relative<->resolved round-trip: Simple alternating resolves to each
//    chord's root/alt strings, and re-resolving is stable.
check("round-trip: Simple alternating resolves to chord root/alt per table", () => {
  for (const chordId of CHORD_IDS) {
    const chord = CHORDS[chordId];
    const p = generatePattern(chordId, { bass: "simple_alt", chaos: "tame", rng: seeded(5) });
    assert(p.type === "relative", `Simple alternating should be relative, got ${p.type}`);
    const r = resolvePattern(p, chordId);
    const thumbs = r.bars[0].filter((e) => e.finger === "p").sort((a, b) => a.slot - b.slot);
    // beats: root, alt, root, alt
    assert(thumbs[0].string === chord.root, `${chordId} beat1 should be root string ${chord.root}, got ${thumbs[0].string}`);
    assert(thumbs[1].string === chord.alt,  `${chordId} beat2 should be alt string ${chord.alt}, got ${thumbs[1].string}`);
    assert(thumbs[2].string === chord.root, `${chordId} beat3 should be root`);
    assert(thumbs[3].string === chord.alt,  `${chordId} beat4 should be alt`);

    // re-resolving the same relative pattern to a DIFFERENT chord follows it
    const other = CHORD_IDS.find((c) => c !== chordId);
    const r2 = resolvePattern(p, other);
    const t2 = r2.bars[0].filter((e) => e.finger === "p").sort((a, b) => a.slot - b.slot);
    assert(t2[0].string === CHORDS[other].root, `relative pattern should follow to ${other}'s root`);

    // stability: resolving an already-resolved pattern to same chord is idempotent
    const r3 = resolvePattern(r, chordId);
    assert(JSON.stringify(r3.bars) === JSON.stringify(r.bars), "re-resolve should be stable");
  }
});

// 4c) The DEFAULT preset (Travis, root-alt-fifth-alt) is relative and its bass
//     resolves to 4-3-5-3 on D and 5-4-6-4 on C (spec point 6).
check("default preset is Travis; bass resolves 4-3-5-3 on D, 5-4-6-4 on C", () => {
  // omit `bass` so the generator's global default is exercised
  const pD = generatePattern("D", { chaos: "tame", rng: seeded(7) });
  assert(pD.bass === "travis", `default bass should be "travis", got "${pD.bass}"`);
  assert(pD.type === "relative", `Travis should be relative, got ${pD.type}`);

  const onD = resolvePattern(pD, "D").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onD) === JSON.stringify([4, 3, 5, 3]),
    `expected 4-3-5-3 on D, got ${onD.join("-")}`);

  const pC = generatePattern("C", { chaos: "tame", rng: seeded(7) });
  const onC = resolvePattern(pC, "C").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onC) === JSON.stringify([5, 4, 6, 4]),
    `expected 5-4-6-4 on C, got ${onC.join("-")}`);
});

// 4d) G's Travis bass walks 6-4-5-4 (G-D-B-D), frets 3-0-2-0.
check("G Travis bass walks strings 6-4-5-4 with frets 3-0-2-0", () => {
  const p = generatePattern("G", { chaos: "tame", rng: seeded(7) });
  const thumbs = resolvePattern(p, "G").bars[0].filter((e) => e.finger === "p");
  const strings = thumbs.map((e) => e.string);
  const frets = thumbs.map((e) => e.fret);
  assert(JSON.stringify(strings) === JSON.stringify([6, 4, 5, 4]),
    `expected strings 6-4-5-4 on G, got ${strings.join("-")}`);
  assert(JSON.stringify(frets) === JSON.stringify([3, 0, 2, 0]),
    `expected frets 3-0-2-0 on G, got ${frets.join("-")}`);
});

// 4b) Full Random is absolute and stays put across chords.
check("Full Random is absolute and bass ignores chord changes", () => {
  const p = generatePattern("C", { bass: "full_random", chaos: "loose", rng: seeded(11) });
  assert(p.type === "absolute", `Full Random should be absolute, got ${p.type}`);
  const a = resolvePattern(p, "C").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  const b = resolvePattern(p, "G").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(a) === JSON.stringify(b), "absolute bass strings must not change with chord");
});

// 4b-i) Dead Thumb: relative, root on all four beats; follows the chord.
check("Dead Thumb: relative, root on every beat, follows the chord", () => {
  const p = generatePattern("C", { bass: "dead_thumb", chaos: "tame", rng: seeded(5) });
  assert(p.type === "relative", `Dead Thumb should be relative, got ${p.type}`);
  const onC = resolvePattern(p, "C").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onC) === JSON.stringify([5, 5, 5, 5]),
    `Dead Thumb on C should be root 5-5-5-5, got ${onC.join("-")}`);
  const onG = resolvePattern(p, "G").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onG) === JSON.stringify([6, 6, 6, 6]),
    `Dead Thumb should follow to G's root 6-6-6-6, got ${onG.join("-")}`);
});

// 4b-ii) Root–Fifth: relative, alternates root/fifth; fifth carries fifthFret.
check("Root–Fifth: relative, alternates root and fifth per chord table", () => {
  const p = generatePattern("C", { bass: "root_fifth", chaos: "tame", rng: seeded(6) });
  assert(p.type === "relative", `Root–Fifth should be relative, got ${p.type}`);
  const c = CHORDS.C;
  const bar = resolvePattern(p, "C").bars[0].filter((e) => e.finger === "p");
  const strings = bar.map((e) => e.string);
  assert(JSON.stringify(strings) === JSON.stringify([c.root, c.fifth, c.root, c.fifth]),
    `Root–Fifth on C should be ${[c.root, c.fifth, c.root, c.fifth].join("-")}, got ${strings.join("-")}`);
  // C's fifth lives on string 6 fret 3 (the shape's open string doesn't cover it)
  assert(bar[1].fret === c.fifthFret, `C's fifth should be fret ${c.fifthFret}, got ${bar[1].fret}`);
});

// 4b-iii) Climb / Descend: absolute string walks that ignore the chord.
check("Climb: absolute, walks strings 6-5-4-5 regardless of chord", () => {
  const p = generatePattern("C", { bass: "climb", chaos: "tame", rng: seeded(7) });
  assert(p.type === "absolute", `Climb should be absolute, got ${p.type}`);
  const onC = resolvePattern(p, "C").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onC) === JSON.stringify([6, 5, 4, 5]), `Climb should be 6-5-4-5, got ${onC.join("-")}`);
  const onG = resolvePattern(p, "G").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onG) === JSON.stringify([6, 5, 4, 5]), `Climb must ignore the chord, got ${onG.join("-")} on G`);
});

check("Descend: absolute, walks strings 4-5-6-5 regardless of chord", () => {
  const p = generatePattern("C", { bass: "descend", chaos: "tame", rng: seeded(8) });
  assert(p.type === "absolute", `Descend should be absolute, got ${p.type}`);
  const onC = resolvePattern(p, "C").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onC) === JSON.stringify([4, 5, 6, 5]), `Descend should be 4-5-6-5, got ${onC.join("-")}`);
  const onA = resolvePattern(p, "A").bars[0].filter((e) => e.finger === "p").map((e) => e.string);
  assert(JSON.stringify(onA) === JSON.stringify([4, 5, 6, 5]), `Descend must ignore the chord, got ${onA.join("-")} on A`);
});

// 4e) Progression mode: one relative cell, per-bar chords. The bass re-maps
//     per bar while the right hand (fingers/slots) stays identical.
check("progression: relative bass re-maps per bar; fingers follow, bass overwrites string-3 collisions", () => {
  const p = generatePattern("C", { bass: "travis", chaos: "tame", rng: seeded(9) });
  const chords = ["C", "G", "D", "Am"];
  const phrase = resolvePhrase(p, chords);

  assert(phrase.length === 4, `expected 4 bars, got ${phrase.length}`);

  // The finger layer is one shared cell (1-bar loop), reused for every bar.
  const treble = p.trebleBars[0].map((e) => [e.slot, e.string]);

  phrase.forEach(({ chord, bar }, i) => {
    assert(chord === chords[i], `bar ${i} should carry chord ${chords[i]}`);
    const c = CHORDS[chord];
    const thumbs = bar.filter((e) => e.finger === "p");
    // travis = root, alt, fifth, alt
    const expected = [c.root, c.alt, c.fifth, c.alt];
    const got = thumbs.map((e) => e.string);
    assert(JSON.stringify(got) === JSON.stringify(expected),
      `bar ${i} (${chord}) bass should be ${expected.join("-")}, got ${got.join("-")}`);

    // The fingers follow the shared cell EXCEPT where the chord's bass lands on a
    // finger's string in that slot (D's alt bass on string 3): the bass wins, so
    // that one finger is overwritten. Every non-colliding finger survives.
    const bassAt = {};
    thumbs.forEach((e) => (bassAt[e.slot] ??= new Set()).add(e.string));
    const fingers = new Set(bar.filter((e) => e.finger !== "p").map((e) => `${e.slot}:${e.string}`));
    for (const [slot, string] of treble) {
      if (bassAt[slot]?.has(string)) {
        assert(!fingers.has(`${slot}:${string}`),
          `bar ${i} (${chord}): finger ${string}@${slot} should be overwritten by the bass`);
      } else {
        assert(fingers.has(`${slot}:${string}`),
          `bar ${i} (${chord}): finger ${string}@${slot} should follow the shared cell`);
      }
    }
  });
});

// 4f) Absolute patterns do NOT follow the progression (bass strings frozen).
check("progression: absolute bass strings stay put across chords", () => {
  const p = generatePattern("C", { bass: "full_random", chaos: "loose", rng: seeded(4) });
  const phrase = resolvePhrase(p, ["C", "G", "D", "Am"]);
  const bassOf = (b) => JSON.stringify(b.filter((e) => e.finger === "p").map((e) => e.string));
  const first = bassOf(phrase[0].bar);
  for (let i = 1; i < phrase.length; i++) {
    assert(bassOf(phrase[i].bar) === first,
      `absolute bass should not change on bar ${i}`);
  }
});

// 6) Chord library integrity: every chord has a shape, and every role string
//    is covered by that shape (so Fret mode never invents a note).
check("chord library: every chord has a shape covering its role strings", () => {
  for (const id of CHORD_IDS) {
    const c = CHORDS[id];
    const shape = CHORD_SHAPES[id];
    assert(shape, `chord ${id} has no shape`);
    for (const role of ["root", "alt", "fifth"]) {
      const s = c[role];
      assert(s >= 1 && s <= 6, `chord ${id} role ${role} has bad string ${s}`);
      assert(shape[s] !== undefined, `chord ${id} shape missing string ${s} (${role})`);
    }
  }
});

// 6b) THE WHEEL'S MATRIX IS DENSE. Two reels promise that every root has every
//     quality; a gap would be a cell you can spin to that isn't a chord. This
//     replaced the old "the chord groups partition the library" check, which was
//     the same guarantee for the grouped lists the wheel retired.
check("chord library: every root × quality exists, and nothing else does", () => {
  assert(ROOTS.length === 12, `expected 12 roots, got ${ROOTS.length}`);
  assert(CHORD_IDS.length === ROOTS.length * QUALITIES.length,
    `library is ${CHORD_IDS.length} chords, the matrix is ${ROOTS.length * QUALITIES.length}`);
  for (const r of ROOTS) {
    for (const q of QUALITIES) {
      const id = chordIdFor(r.id, q.id);
      assert(CHORDS[id], `no chord for ${r.name} ${q.name} (id "${id}")`);
      assert(CHORDS[id].rootId === r.id && CHORDS[id].quality === q.id,
        `${id} doesn't report itself as ${r.id}/${q.id}`);
    }
  }
  // Every reachable id round-trips back to the two reel positions that made it —
  // this is what lets the wheel open pointing at the current chord.
  for (const id of CHORD_IDS) {
    const split = splitChordId(id);
    assert(split, `splitChordId can't read "${id}"`);
    assert(chordIdFor(split.root, split.quality) === id,
      `${id} round-tripped to ${chordIdFor(split.root, split.quality)}`);
  }
  assert(splitChordId("H7") === null, "an unknown root reads as null rather than guessing");
});

// 6c) THE TEMPLATES REPRODUCE THE HAND-WRITTEN VOICINGS. The 22 barre chords are
//     derived (E-shape or A-shape, whichever barres lower) instead of being typed
//     out. These eight are the ones the library hand-declared before the wheel,
//     frozen here as the fixture: if the derivation is wrong, it's wrong against
//     voicings that were played on a real guitar.
check("chord library: movable templates reproduce the hand-declared barre chords", () => {
  const expected = {
    F:     { root: 6, alt: 4, fifth: 5, fifthFret: 3, shape: { 6: 1, 5: 3, 4: 3, 3: 2, 2: 1, 1: 1 } },
    "F#":  { root: 6, alt: 4, fifth: 5, fifthFret: 4, shape: { 6: 2, 5: 4, 4: 4, 3: 3, 2: 2, 1: 2 } },
    Bb:    { root: 5, alt: 4, fifth: 6, fifthFret: 1, shape: { 6: 1, 5: 1, 4: 3, 3: 3, 2: 3, 1: 1 } },
    B:     { root: 5, alt: 4, fifth: 6, fifthFret: 2, shape: { 6: 2, 5: 2, 4: 4, 3: 4, 2: 4, 1: 2 } },
    Bm:    { root: 5, alt: 4, fifth: 6, fifthFret: 2, shape: { 6: 2, 5: 2, 4: 4, 3: 4, 2: 3, 1: 2 } },
    "F#m": { root: 6, alt: 4, fifth: 5, fifthFret: 4, shape: { 6: 2, 5: 4, 4: 4, 3: 2, 2: 2, 1: 2 } },
    "C#m": { root: 5, alt: 4, fifth: 6, fifthFret: 4, shape: { 6: 4, 5: 4, 4: 6, 3: 6, 2: 5, 1: 4 } },
    "G#m": { root: 6, alt: 4, fifth: 5, fifthFret: 6, shape: { 6: 4, 5: 6, 4: 6, 3: 4, 2: 4, 1: 4 } },
  };
  for (const [id, want] of Object.entries(expected)) {
    const got = CHORDS[id];
    for (const role of ["root", "alt", "fifth", "fifthFret"]) {
      assert(got[role] === want[role],
        `${id}.${role}: expected ${want[role]}, derived ${got[role]}`);
    }
    for (const s of [6, 5, 4, 3, 2, 1]) {
      assert(CHORD_SHAPES[id][s] === want.shape[s],
        `${id} string ${s}: expected fret ${want.shape[s]}, derived ${CHORD_SHAPES[id][s]}`);
    }
  }
  // Playability: "whichever barres lower" is the rule, so almost nothing should
  // land above the 8th fret (the worst DEFAULT is the A-shape at 6 — the E♭
  // family). Three chords are a deliberate, named exception, all his own tabs
  // off the guitar, all trading the auto-picked lower shape for one he prefers:
  // Cm6 and C♯m6 use the E-shape min6 template's HIGHER position (barre 8/9)
  // instead of the lower A-shape one, and F♯6 uses a hand-declared shape with a
  // moving-finger bass note (see its comment in data.js) instead of its own
  // auto-derived full barre. His note: "anything up to fret 12 acceptable" for
  // these. The ceiling here is raised to 12 to match that instruction rather
  // than silently exempting them, so a FOURTH chord drifting past 8 without a
  // reason still fails loudly.
  for (const id of CHORD_IDS) {
    for (const s of [6, 5, 4, 3, 2, 1]) {
      const fret = CHORD_SHAPES[id][s];
      assert(fret == null || fret <= 12, `${id} needs fret ${fret} on string ${s} — off the practical neck`);
    }
  }
});

check("chord library: alt never equals fifth — the Travis-pattern trap", () => {
  // A real bug, caught by ear (his note: "something strange with the F♯6
  // Travis bass pattern"), not by any test — worth pinning so it can't recur
  // silently on some future chord edit. The Travis preset's cycle is
  // root-alt-fifth-alt (generator.js reads each preset's `beats` array, which
  // names these three roles). If `alt` and `fifth` point at the same string,
  // three of the four beats collapse onto the identical note — F♯6 shipped as
  // root, C♯, C♯, C♯ instead of a real walking bass, because `alt` was set to
  // match the physical "moving finger" bass technique, which happens to BE the
  // 5th here. The fix was to let `fifth` stay the genuine 5th (correct for the
  // Root–Fifth preset) and move `alt` to a different string (the 3rd) so
  // Travis actually alternates. This test would have caught it on sight.
  for (const id of CHORD_IDS) {
    const c = CHORDS[id];
    assert(c.alt !== c.fifth,
      `${id}: alt and fifth both point at string ${c.alt} — Travis's root-alt-fifth-alt cycle collapses to two notes`);
  }
});

check("chord library: hand-voiced chords don't swap alt/fifth off the root's ordinary convention", () => {
  // Audible-only bugs, caught by ear (session 44), in two rounds. Round one:
  // the five-root add9 family (C♯/D/E♭/F/F♯) had `fifth` on the finger-domain
  // string 3 ("the thumb going all the way up to the g string"), and
  // Gadd9/G♯add9 had alt/fifth swapped from a stale session-34 "walk to a
  // color tone" convention that no longer matched their shape ("walks up and
  // down" instead of alternating). Round two, once he set the rule ("picking
  // pattern consistency takes precedence"): the same swap existed on E♭m6,
  // G♯6, Gsus2 and G♯sus2 — each internally correct (not stale, verified
  // against their own shape) but still the "walk to a color tone" style he'd
  // just asked removed elsewhere, so all four were brought in line too. All
  // eleven now match the ordinary A-shape (root:5,alt:4,fifth:6) or E-shape
  // (root:6,alt:4,fifth:5) role convention every other quality on their root
  // uses — pinned the same way the F♯6 trap above is, so a future shape edit
  // can't silently drift back.
  const expected = {
    "C#add9": { root: 5, alt: 4, fifth: 6 },
    Dadd9:    { root: 5, alt: 4, fifth: 6 },
    Ebadd9:   { root: 5, alt: 4, fifth: 6 },
    Fadd9:    { root: 5, alt: 4, fifth: 6 },
    "F#add9": { root: 5, alt: 4, fifth: 6 },
    Gadd9:    { root: 6, alt: 4, fifth: 5 },
    "G#add9": { root: 6, alt: 4, fifth: 5 },
    Ebm6:     { root: 6, alt: 4, fifth: 5 },
    "G#6":    { root: 6, alt: 4, fifth: 5 },
    Gsus2:    { root: 6, alt: 4, fifth: 5 },
    "G#sus2": { root: 6, alt: 4, fifth: 5 },
  };
  for (const [id, want] of Object.entries(expected)) {
    const got = CHORDS[id];
    for (const role of ["root", "alt", "fifth"]) {
      assert(got[role] === want[role], `${id}.${role}: expected ${want[role]}, got ${got[role]}`);
    }
  }
});

// 6d) ONE spelling per pitch, everywhere. The wheel's root reel, the chord's
//     display name and the capo tag all read from PC_NAME, so a pitch can't be
//     "C♯" on the wheel and "D♭" in the header — which it was before the wheel.
check("chord names: one spelling per pitch, shared with the capo readout", () => {
  for (const r of ROOTS) {
    // Both sides read PC_NAME, so what this really pins is that the capo readout
    // can PARSE every root id the wheel can produce — a root spelled in a way
    // chordRootPc doesn't know would come back null and silently blank the tag.
    assert(soundingName(r.id, 0) === r.name,
      `${r.id}: the reel says "${r.name}", the capo readout says "${soundingName(r.id, 0)}"`);
    for (const q of QUALITIES) {
      const id = chordIdFor(r.id, q.id);
      assert(CHORDS[id].name === r.name + q.suffix,
        `${id} is displayed as "${CHORDS[id].name}", not "${r.name + q.suffix}"`);
    }
  }
  assert(CHORDS["C#m"].name === "C♯m" && CHORDS["Eb7"].name === "E♭7",
    "accidentals are printed as ♯/♭, not # and b");
});

// 6d-ii) EVERY CHORD ACTUALLY SPELLS ITS QUALITY. The shapes are hand-authored or
//     template-derived, and nothing else checks what NOTES come out — the role and
//     ≤fret-8 tests only look at strings and fret numbers. So a voicing can be a
//     perfectly legal shape of the wrong chord, which is exactly what happened:
//     Dadd9 shipped as xx0232, which is D major with no 9th at all (session 31).
//     This computes the sounded pitch classes from the shape and requires them to
//     equal the quality's formula — catching both a MISSING colour tone and a
//     FOREIGN note.
check("chord library: every voicing spells its quality exactly", () => {
  const PC_OF = { C: 0, "C#": 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, Bb: 10, B: 11 };
  // semitones above the root, per quality
  const FORMULA = {
    major: [0, 4, 7], minor: [0, 3, 7],
    dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10],
    maj6: [0, 4, 7, 9], min6: [0, 3, 7, 9],
    sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 2, 4, 7],
  };
  for (const id of CHORD_IDS) {
    const c = CHORDS[id];
    const formula = FORMULA[c.quality];
    assert(formula, `no interval formula for quality "${c.quality}" — add it here when adding a quality`);
    const rootPc = PC_OF[c.rootId];
    const want = new Set(formula.map((i) => (rootPc + i) % 12));
    const got = new Set();
    for (const s of [6, 5, 4, 3, 2, 1]) {
      const fret = CHORD_SHAPES[id][s];
      if (fret == null) continue; // a muted string sounds nothing
      got.add(midiOf({ string: s, fret }) % 12);
    }
    const fmt = (set) => [...set].sort((a, b) => a - b).join(",");
    assert(fmt(got) === fmt(want),
      `${id} (${c.quality}) sounds pitch classes {${fmt(got)}}, its formula wants {${fmt(want)}}`);
  }
});

// 6e) THE NEW QUALITIES (session 30): maj7 / m7 / 6 / m6 / sus4. The whole feature
//     is voicings — the generator/synth/grid follow — plus the id parsers, which
//     used to strip "7" then "m" and silently mis-read every new suffix. All three
//     parsers now go through splitChordId, so the capo tag and the degree readout
//     have to survive a maj7 / sus4 / 6, not just "?".
check("new qualities: parse, transpose and read as a degree", () => {
  // splitChordId round-trips every new suffix (longest-match: m7 ≠ 7, m6 ≠ 6,
  // maj7 ≠ m7 ≠ 7).
  for (const [id, root, q] of [
    ["Cmaj7", "C", "maj7"], ["Am7", "A", "min7"], ["Gm7", "G", "min7"],
    ["C6", "C", "maj6"], ["Am6", "A", "min6"], ["Fsus4", "F", "sus4"], ["C7", "C", "dom7"], ["Cm", "C", "minor"],
    // session 31: sus2 / add9 — 4-char suffixes, longest-match, no collision with sus4
    ["Csus2", "C", "sus2"], ["Gadd9", "G", "add9"], ["Ebadd9", "Eb", "add9"], ["G#sus2", "G#", "sus2"],
  ]) {
    const s = splitChordId(id);
    assert(s && s.root === root && s.quality === q, `splitChordId("${id}") = ${JSON.stringify(s)}, want ${root}/${q}`);
  }
  // soundingName (the capo tag) keeps the FULL suffix through a transpose — the
  // old regex read Cmaj7 as a dom7 and C6/Csus4 as bare triads.
  assert(soundingName("Cmaj7", 0) === "Cmaj7", `Cmaj7 at capo 0 = ${soundingName("Cmaj7", 0)}`);
  assert(soundingName("Am7", 2) === "Bm7", `Am7 up 2 = ${soundingName("Am7", 2)}`);
  assert(soundingName("C6", 2) === "D6", `C6 up 2 = ${soundingName("C6", 2)}`);
  assert(soundingName("Csus4", 3) === "E♭sus4", `Csus4 up 3 = ${soundingName("Csus4", 3)}`);
  assert(soundingName("Csus2", 2) === "Dsus2", `Csus2 up 2 = ${soundingName("Csus2", 2)}`);
  assert(soundingName("Aadd9", 1) === "B♭add9", `Aadd9 up 1 = ${soundingName("Aadd9", 1)}`);
  // romanInKey decorates the numeral by quality: case + colour tag.
  assert(romanInKey("Cmaj7", "C") === "Imaj7", `Cmaj7 in C = ${romanInKey("Cmaj7", "C")}`);
  assert(romanInKey("Am7", "C") === "vi7", `Am7 in C = ${romanInKey("Am7", "C")}`);
  assert(romanInKey("Dm7", "C") === "ii7", `Dm7 in C = ${romanInKey("Dm7", "C")}`);
  assert(romanInKey("C6", "C") === "I6", `C6 in C = ${romanInKey("C6", "C")}`);
  assert(romanInKey("Fsus4", "C") === "IVsus4", `Fsus4 in C = ${romanInKey("Fsus4", "C")}`);
  assert(romanInKey("Csus2", "C") === "Isus2", `Csus2 in C = ${romanInKey("Csus2", "C")}`);
  assert(romanInKey("Gadd9", "C") === "Vadd9", `Gadd9 in C = ${romanInKey("Gadd9", "C")}`);
  // dim7 stays OUT (his call) — no quality carries that suffix.
  assert(!QUALITIES.some((q) => q.id === "dim7" || q.suffix === "dim7"), "dim7 must not be in the library");
});

// 6c) Same contract for the Fingers menu's sections: every tier in exactly one
//     group, no strays, and every group id real. The menu is grouped so that
//     "Wild Card" reads as OFF the Tame→Loose→Unruly curve rather than as its
//     top step — if a new tier were added and left out of CHAOS_GROUPS it would
//     silently vanish from the menu while still being a legal saved value.
check("chaos groups partition the tiers exactly", () => {
  const grouped = CHAOS_GROUPS.flatMap((g) => g.ids);
  assert(grouped.length === CHAOS_IDS.length,
    `CHAOS_GROUPS lists ${grouped.length} tiers, there are ${CHAOS_IDS.length}`);
  assert(new Set(grouped).size === grouped.length, "CHAOS_GROUPS: a tier appears in two groups");
  for (const id of grouped) assert(CHAOS_PRESETS[id], `CHAOS_GROUPS references unknown tier ${id}`);
  for (const id of CHAOS_IDS) assert(grouped.includes(id), `CHAOS_GROUPS: tier ${id} is in no group`);
  for (const g of CHAOS_GROUPS) assert(g.label && g.ids.length, `CHAOS_GROUPS: empty group ${g.label}`);
});

// 7) Nashville: every token in every key resolves to a real chord, and each key
//    carries a mode. (Tokens replaced bare 1-6 degrees so II/♭VII/I7 are expressible.)
check("keys: every token in every key resolves to a chord in the library", () => {
  for (const k of KEY_IDS) {
    const key = KEYS[k];
    assert(key.mode === "major" || key.mode === "minor", `key ${k} needs a mode`);
    for (const [token, chord] of Object.entries(key.chords)) {
      assert(CHORDS[chord], `key ${k} token ${token} -> "${chord}" not in CHORDS`);
    }
  }
});

// 7b) Every preset progression resolves fully in every key OF ITS MODE (major
//     presets in major keys, minor presets in minor keys).
check("progressions: every preset resolves fully in every key of its mode", () => {
  for (const p of PROGRESSIONS) {
    const keys = KEY_IDS.filter((k) => KEYS[k].mode === p.mode);
    assert(keys.length, `no ${p.mode} keys for ${p.id}`);
    for (const k of keys) {
      const chords = progressionChords(p.id, k);
      assert(chords.length === p.tokens.length,
        `${p.id} in ${k} resolved ${chords.length}/${p.tokens.length}`);
      chords.forEach((c) => assert(CHORDS[c], `${p.id} in ${k} produced unknown chord ${c}`));
    }
  }
});

// 7b-i) The chromatic tokens mean what they should: a dominant-7th tonic (I7) and
//       the secondary dominants II7 / III7 / VI7 / V7 (session 29's ragtime set).
//       (Every preset is 4 bars — a 3-chord idea holds its last chord, and I–II7–V
//       is I II7 V V.)
check("tokens: I7 is a dom7 tonic; II7/III7/VI7/V7 are secondary dominants", () => {
  assert(progressionChords("maj_1_7_4_1", "C").join("-") === "C-C7-F-C", "I–I7–IV–I in C uses the dom7 tonic");
  // the ragtime circle-of-fifths chain resolves to real dom7 chords in every key
  assert(progressionChords("maj_1_67_27_57", "C").join("-") === "C-A7-D7-G7", "I–VI7–II7–V7 in C should be C-A7-D7-G7");
  assert(progressionChords("maj_1_67_27_57", "E").join("-") === "E-C#7-F#7-B7", "I–VI7–II7–V7 in E should be E-C#7-F#7-B7");
  assert(progressionChords("maj_1_37_4_57", "G").join("-") === "G-B7-C-D7", "I–III7–IV–V7 in G should be G-B7-C-D7");
  assert(progressionChords("maj_1_27_5", "C").join("-") === "C-D7-G-G", "I–II7–V in C should be C-D7-G-G");
  // V7 works in minor too (the dominant cadence)
  assert(progressionChords("min_1_4_57", "Am").join("-") === "Am-Am-Dm-E7", "i–iv–V7 in Am should be Am-Am-Dm-E7");
  assert(progressionChords("min_1_7_6_57", "Em").join("-") === "Em-D-C-B7", "i–VII–VI–V7 in Em should be Em-D-C-B7");
});

// Every progression is a 4-bar phrase (padded from shorter ideas). Widened in
// session 45 from PROGRESSIONS to allProgressions(): a SAVED custom goes through
// the same resolve/cycle machinery, so a 3-token entry would silently cycle into
// the wrong bars. This is the assertion the save path's length guard protects.
check("every progression is exactly four bars", () => {
  for (const p of allProgressions()) {
    assert(p.tokens.length === 4, `${p.id} has ${p.tokens.length} bars, want 4`);
  }
});

// 7b-ii) Minor keys resolve their own progressions and reject major presets.
check("minor keys: progressions resolve; major presets don't leak in", () => {
  assert(progressionChords("min_1_7_6_5", "Am").join("-") === "Am-G-F-E", "i–VII–VI–V in Am should be Am-G-F-E");
  assert(progressionChords("min_1_7_6_5", "Em").join("-") === "Em-D-C-B", "i–VII–VI–V in Em should be Em-D-C-B");
  // A major preset must not resolve in a minor key. This USED TO HOLD BY
  // ACCIDENT — its tokens (I, I7, IV) simply weren't in the minor key's map — but
  // session 45 gave progressionChords a computed fallback, and I/I7/IV all spell
  // fine against MINOR_ROMAN. So the mode contract is now an explicit guard, and
  // this line is what pins it.
  assert(progressionChords("maj_1_7_4_1", "Am").length === 0,
    "a major preset should not resolve in a minor key (mode guard)");
});

// 7b-iii) The progression menu groups exactly the presets of the requested mode,
//         in order, labelled by their CONCISE idea (not the padded 4-bar tokens).
check("progressionGroups: filters to a mode and labels by the concise idea", () => {
  for (const mode of ["major", "minor"]) {
    const groups = progressionGroups(mode);
    const ids = groups.flatMap((g) => g.items.map((i) => i.value));
    const expected = PROGRESSIONS.filter((p) => p.mode === mode).map((p) => p.id);
    assert(JSON.stringify(ids) === JSON.stringify(expected),
      `${mode} groups should list exactly the ${mode} presets in order`);
    assert(groups.every((g) => g.label && g.items.length), `${mode} groups need labels + items`);
  }
  // the menu shows the concise idea (I–II7–V), not the 4-bar padding (I II7 V V)
  const cc = progressionGroups("major").flatMap((g) => g.items).find((i) => i.value === "maj_1_27_5");
  assert(cc && cc.label === "I–II7–V", `expected "I–II7–V", got "${cc && cc.label}"`);
});

// 7b-iv) A hand-edited (non-diatonic) bar reads as a real numeral, not "?".
//        romanInKey computes it from interval + quality; degreeLabel prefers the
//        curated key token and falls back to it, and the two agree for diatonic chords.
check("romanInKey: every library chord gets a numeral; diatonic bars match the key map", () => {
  for (const k of KEY_IDS) {
    for (const id of CHORD_IDS) {
      const label = degreeLabel(id, k);
      assert(label && label !== "?", `degreeLabel(${id}, ${k}) came back "${label}"`);
      const tok = degreeOf(id, k);
      if (tok != null) assert(label === tok, `${id} in ${k}: "${label}" should equal key token "${tok}"`);
    }
  }
  // major key C — the non-diatonic cases the feature is for
  assert(romanInKey("F#m", "C") === "♯iv", `F#m in C should be ♯iv, got ${romanInKey("F#m", "C")}`);
  assert(romanInKey("F#", "C") === "♯IV", `F# in C should be ♯IV, got ${romanInKey("F#", "C")}`);
  assert(romanInKey("E", "C") === "III", `E major in C should be III, got ${romanInKey("E", "C")}`);
  assert(romanInKey("C#m", "C") === "♭ii", `C#m in C should be ♭ii, got ${romanInKey("C#m", "C")}`);
  assert(romanInKey("G#m", "C") === "♭vi", `G#m in C should be ♭vi, got ${romanInKey("G#m", "C")}`);
  assert(romanInKey("A7", "C") === "VI7", `A7 in C should be VI7, got ${romanInKey("A7", "C")}`);
  // minor key Am — natural-minor spellings, major-V cadence
  assert(romanInKey("C", "Am") === "III", `C in Am should be III, got ${romanInKey("C", "Am")}`);
  assert(romanInKey("G", "Am") === "VII", `G in Am should be VII, got ${romanInKey("G", "Am")}`);
  assert(romanInKey("F#m", "Am") === "♯vi", `F#m in Am should be ♯vi, got ${romanInKey("F#m", "Am")}`);
  assert(romanInKey("E", "Am") === "V", `E (dominant) in Am should be V, got ${romanInKey("E", "Am")}`);
});

// 7b-v) The ⚙ chord randomiser: always returns something valid and mode-matched,
//       never repeats what's already on screen, and reaches the whole pool.
check("randomisers: valid, mode-matched, and never a no-op roll", () => {
  const seenKeys = new Set(), seenProgs = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed * 13 + 5);
    const roll = randomKeyProgression("C", "maj_1_5", rng);
    assert(roll && KEYS[roll.key], `roll ${seed} produced an unknown key`);
    // allProgressions, not PROGRESSIONS: the die rolls saved customs too (his
    // call, session 45), matching the chord die's whole-library pool.
    const p = allProgressions().find((x) => x.id === roll.progression);
    assert(p, `roll ${seed} produced an unknown progression`);
    assert(p.mode === KEYS[roll.key].mode,
      `roll ${seed}: ${p.id} (${p.mode}) doesn't match key ${roll.key} (${KEYS[roll.key].mode})`);
    assert(progressionChords(p.id, roll.key).length === 4,
      `roll ${seed}: ${p.id} should fully resolve in ${roll.key}`);
    assert(!(roll.key === "C" && roll.progression === "maj_1_5"),
      `roll ${seed} handed back the current key+progression`);
    seenKeys.add(roll.key);
    seenProgs.add(roll.progression);
  }
  assert(seenKeys.size === KEY_IDS.length, `randomiser reached ${seenKeys.size}/${KEY_IDS.length} keys`);
  assert(seenProgs.size >= 12, `randomiser only reached ${seenProgs.size} progressions`);

  // Keys are sampled uniformly (two-stage), NOT flat over (key, progression)
  // pairs — flat sampling would bury the minor keys at ~8% of rolls because they
  // carry fewer progressions. Expect roughly 2/7 ≈ 29% minor.
  let minor = 0, n = 0;
  for (let seed = 1; seed <= 700; seed++) {
    const roll = randomKeyProgression(null, null, seeded(seed * 7 + 11));
    if (KEYS[roll.key].mode === "minor") minor++;
    n++;
  }
  const share = minor / n;
  assert(share > 0.18 && share < 0.42,
    `minor keys should be ~2/7 of rolls, got ${(share * 100).toFixed(1)}%`);

  // single-chord roll: the WHOLE library now (his call, with the wheel — it used
  // to be the open "campfire" chords only), and never the current chord. The
  // sample count scales with the pool: covering all N-1 others is a coupon-collect
  // (~N·lnN draws expected), so with the library now 96 chords, 600 draws left ~one
  // uncovered by chance. 2500 covers it with margin.
  const rolled = new Set();
  for (let seed = 1; seed <= 2500; seed++) {
    const c = randomChord("E", seeded(seed * 29 + 7));
    assert(CHORDS[c], `single roll produced "${c}", which isn't a chord`);
    assert(c !== "E", "single roll handed back the current chord");
    rolled.add(c);
  }
  assert(rolled.size === CHORD_IDS.length - 1,
    `single roll reached ${rolled.size}/${CHORD_IDS.length - 1} of the other chords`);
});

// 7c) detectProgression round-trips presets IN THEIR MODE and reports custom edits.
check("detectProgression: matches presets in-mode, falls back to Custom", () => {
  for (const p of PROGRESSIONS) {
    const keys = KEY_IDS.filter((k) => KEYS[k].mode === p.mode);
    for (const k of keys) {
      // Use the preset's OWN length — forcing everything to 4 bars makes the
      // 3-chord I–IV–V cycle into the 4-chord I–IV–V–I (a real ambiguity that
      // detectProgression resolves by preferring the exact-length match).
      const bars = progressionChords(p.id, k);
      assert(detectProgression(bars, k) === p.id,
        `expected ${p.id} in key ${k}, got ${detectProgression(bars, k)}`);
    }
  }
  // a hand-edited bar that breaks the pattern reads as custom
  const bars = fitProgression(progressionChords("maj_1_5_6_4", "C"), 4); // C G Am F
  const edited = [...bars];
  edited[1] = "F#m"; // not in key C at that position
  assert(detectProgression(edited, "C") === CUSTOM_PROGRESSION_ID,
    "edited progression should read as Custom");
});

// ----- 7d) Saved custom progressions (item 17, session 45) -----
//
// EVERY CHECK THAT REGISTERS CUSTOMS RESETS IN A `finally`. setCustomProgressions
// writes module-level state in data.js, and this suite is one file sharing one
// module instance — a leak here would show up as an order-dependent failure in
// the progressionGroups / detectProgression checks above, and on this dev box a
// flaky wheel test already has a known non-code cause, so a real flake would get
// misattributed.
const withCustoms = (list, fn) => {
  try { setCustomProgressions(list); return fn(); } finally { setCustomProgressions([]); }
};
const customProg = (id, mode, tokens) =>
  ({ id, mode, style: "Custom", label: tokens.join("–"), tokens });

// The storage format's central claim: a numeral round-trips back to the chord it
// came from, for EVERY chord in the library in EVERY key. If this ever fails,
// tokens are the wrong way to store a progression.
check("chordForRoman: inverts romanInKey for every chord in every key", () => {
  let pairs = 0;
  for (const k of KEY_IDS) {
    for (const c of CHORD_IDS) {
      const token = romanInKey(c, k);
      const back = chordForRoman(token, k);
      assert(back === c, `${c} in ${k} spelled "${token}" and came back as "${back}"`);
      pairs++;
    }
  }
  assert(pairs === CHORD_IDS.length * KEY_IDS.length, `only checked ${pairs} pairs`);
});

// It must REFUSE rather than guess: the save path uses a failed round trip as its
// signal that a progression can't be stored, so a permissive parse would let an
// unresolvable token into someone's library.
check("chordForRoman: returns null on anything it can't spell", () => {
  for (const junk of ["H", "Ixyz", "♭", "", "VIIdim", "i9", "II7x", "♮IV", null, undefined, 7]) {
    assert(chordForRoman(junk, "C") === null, `"${junk}" should not resolve`);
  }
  assert(chordForRoman("I", "NotAKey") === null, "an unknown key should not resolve");
});

// The storage format depends on romanInKey and degreeLabel agreeing — a saved
// progression is written with the computed numeral and READ BACK through the same
// table the readout uses. They agree today by construction; this states it as a
// contract so a future KEYS token that disagreed can't rot stored data silently.
check("romanInKey agrees with degreeLabel wherever the key map has a token", () => {
  for (const k of KEY_IDS) {
    for (const c of CHORD_IDS) {
      const mapped = degreeOf(c, k);
      if (!mapped) continue;
      assert(romanInKey(c, k) === mapped,
        `${c} in ${k}: map says "${mapped}", computed says "${romanInKey(c, k)}"`);
    }
  }
});

// THE ONE THAT MATTERS. A saved custom's tokens routinely sit OUTSIDE the curated
// KEYS map (vi7, ♯iv, Imaj7). Resolved through the map alone they'd hit undefined,
// be dropped by the filter, and hand back a SHORT array that fitProgression cycles
// into the wrong bars — a saved progression that plays something else, with
// nothing visibly broken. Revert progressionChords to `key.chords[t]` and this
// returns 2 of 4.
check("progressionChords: resolves tokens the key map doesn't carry", () => {
  const tokens = ["I", "vi7", "♯iv", "V7"];
  withCustoms([customProg("cp_x", "major", tokens)], () => {
    assert(progressionChords("cp_x", "C").join("-") === "C-Am7-F#m-G7",
      `in C, got ${progressionChords("cp_x", "C").join("-")}`);
    assert(progressionChords("cp_x", "G").join("-") === "G-Em7-C#m-D7",
      `in G, got ${progressionChords("cp_x", "G").join("-")}`);
    assert(progressionChords("cp_x", "C").length === 4, "all four bars must resolve");
  });
});

// The mode guard, from both sides. Without it a major custom resolves cheerfully
// against MINOR_ROMAN and hands back four real, wrong chords.
check("progressionChords: refuses a mode mismatch, preset or custom", () => {
  withCustoms([customProg("cp_maj", "major", ["I", "IV", "V", "I"])], () => {
    assert(progressionChords("cp_maj", "Am").length === 0,
      "a major custom must not resolve in a minor key");
    assert(progressionChords("cp_maj", "C").length === 4, "but it must resolve in its own mode");
  });
  withCustoms([customProg("cp_min", "minor", ["i", "VII", "VI", "V"])], () => {
    assert(progressionChords("cp_min", "C").length === 0,
      "a minor custom must not resolve in a major key");
    assert(progressionChords("cp_min", "Am").join("-") === "Am-G-F-E", "and must resolve in Am");
  });
});

// Saved customs arrive as ONE trailing group, leaving the presets untouched and in
// order — which is what puts them under their own engraved header on the drum
// (wheel.js renders a named optgroup as a .reel-head) while the "Unsaved" readout
// keeps its plain groove at the end.
check("progressionGroups: saved customs form one trailing Custom group", () => {
  const before = progressionGroups("major");
  withCustoms([
    customProg("cp_a", "major", ["I", "IV", "V", "I"]),
    customProg("cp_b", "major", ["I", "vi", "IV", "V"]),
    customProg("cp_c", "minor", ["i", "VII", "VI", "V"]),
  ], () => {
    const groups = progressionGroups("major");
    assert(groups.length === before.length + 1, `expected one extra group, got ${groups.length}`);
    assert(JSON.stringify(groups.slice(0, -1)) === JSON.stringify(before),
      "the preset groups must be untouched and in order");
    const last = groups[groups.length - 1];
    assert(last.label === "Custom", `trailing group is "${last.label}", want "Custom"`);
    assert(last.items.map((i) => i.value).join(",") === "cp_a,cp_b",
      "only the major customs belong in a major menu");
    assert(last.items[0].label === "I–IV–V–I", `label is "${last.items[0].label}"`);
    // the minor one is in ITS mode's menu, and nowhere else
    const minorLast = progressionGroups("minor").slice(-1)[0];
    assert(minorLast.items.map((i) => i.value).join(",") === "cp_c", "minor menu gets only cp_c");
  });
});

// Presets are walked first, so the same four bars can't report two identities
// depending on what you happen to have saved.
check("detectProgression: a preset wins over a custom that duplicates it", () => {
  const bars = progressionChords("maj_1_5_6_4", "C"); // C G Am F
  withCustoms([customProg("cp_dupe", "major", ["I", "V", "vi", "IV"])], () => {
    assert(detectProgression(bars, "C") === "maj_1_5_6_4",
      `expected the preset, got ${detectProgression(bars, "C")}`);
  });
});

// A saved custom is re-identified in every key of its mode — this is what keeps
// the drum showing YOUR progression after a transpose instead of falling to
// "Unsaved".
check("detectProgression: round-trips a saved custom in every key of its mode", () => {
  const tokens = ["I", "vi7", "♯iv", "V7"];
  withCustoms([customProg("cp_r", "major", tokens)], () => {
    for (const k of KEY_IDS.filter((x) => KEYS[x].mode === "major")) {
      const bars = progressionChords("cp_r", k);
      assert(bars.length === 4, `${k} resolved ${bars.length} bars`);
      assert(detectProgression(bars, k) === "cp_r",
        `in ${k} got ${detectProgression(bars, k)}`);
    }
  });
});

// The store. In-memory stub throughout — never the real library.
check("progression store: saves, de-dupes on (mode, tokens), removes, degrades", () => {
  const store = createProgressionStore("p", memoryStorage());
  const a = store.save({ mode: "major", tokens: ["I", "IV", "V", "I"] });
  assert(a && a.id.startsWith(CUSTOM_PROGRESSION_PREFIX), `id "${a && a.id}" needs the cp_ prefix`);
  assert(store.count() === 1, "one entry after one save");

  // The identity of a progression IS its tokens in its mode, so re-saving the
  // same one hands back what's already there rather than minting a twin.
  const again = store.save({ mode: "major", tokens: ["I", "IV", "V", "I"] });
  assert(again.id === a.id, "the same progression must not be stored twice");
  assert(store.count() === 1, `de-dupe failed: ${store.count()} entries`);
  // same tokens, other mode = a different progression
  store.save({ mode: "minor", tokens: ["I", "IV", "V", "I"] });
  assert(store.count() === 2, "mode is part of the identity");

  assert(store.remove(a.id) === true, "remove should report success");
  assert(store.count() === 1, "removed entry should be gone");
  assert(store.remove("nope") === false, "removing an unknown id reports false");
  assert(store.save({ mode: "major", tokens: [] }) === null, "empty tokens are refused");

  // corrupt JSON reads as an empty library rather than throwing
  const bad = memoryStorage();
  bad.setItem("p", "{not json");
  assert(createProgressionStore("p", bad).list().length === 0, "corrupt storage should read empty");

  // a refused write (quota / private mode) returns null so the UI can report it
  const refuses = { getItem: () => null, setItem() { throw new Error("quota"); } };
  assert(createProgressionStore("p", refuses).save({ mode: "major", tokens: ["I"] }) === null,
    "a refused write must return null, not throw");
});

// Deleting a progression can never orphan a saved PATTERN, because a pattern's
// context stores chord ids, not a progression id. That is the whole reason delete
// needs no cascade and no extra confirmation beyond its own.
check("a saved pattern's context holds chord ids, so deleting a progression can't orphan it", () => {
  const store = createStore("t", memoryStorage());
  const bars = progressionChords("maj_1_5_6_4", "C");
  const item = store.save({
    name: "P", pattern: { thumbBars: [[]], trebleBars: [[]], bars: [[]] },
    context: { chordMode: "progression", key: "C", progression: [...bars] },
  });
  const stored = JSON.stringify(store.get(item.id));
  assert(!stored.includes(CUSTOM_PROGRESSION_PREFIX) && !stored.includes('"custom"'),
    "a saved pattern must not reference a progression id");
  assert(store.get(item.id).context.progression.join("-") === bars.join("-"),
    "the chords themselves are what's stored");
});

// 8) generatePattern always makes exactly one distinct bar (session 36 — real-
//    guitar testing found the picking pattern repeats every bar, so the old
//    "how many distinct bars" dial is gone). resolvePhrase cycles that one bar
//    (mod 1, i.e. always bar 0) across however many bars are on screen.
check("generatePattern always produces exactly one distinct bar", () => {
  for (const chord of CHORD_IDS) {
    for (const bass of ALL_BASS) {
      for (const chaos of ALL_CHAOS) {
        const p = generatePattern(chord, { bass, chaos, rng: seeded(2) });
        assert(p.bars.length === 1, `${chord}/${bass}/${chaos}: expected 1 bar, got ${p.bars.length}`);
        assert(p.thumbBars.length === 1, `${chord}/${bass}/${chaos}: expected 1 thumb bar`);
        assert(p.trebleBars.length === 1, `${chord}/${bass}/${chaos}: expected 1 treble bar`);
      }
    }
  }

  // The one bar still cycles (mod 1) across however many bars are on screen —
  // every bar of a 4-bar phrase is the identical picking pattern.
  const p2 = generatePattern("C", { rng: seeded(6) });
  const phrase = resolvePhrase(p2, ["C", "C", "C", "C"]);
  const sig = (bar) => JSON.stringify(bar.map((e) => [e.slot, e.finger, e.string]));
  assert(sig(phrase[1].bar) === sig(phrase[0].bar), "every bar should share the one distinct pattern");
  assert(sig(phrase[3].bar) === sig(phrase[2].bar), "every bar should share the one distinct pattern");
});

// DIFFICULTY MODEL (session 6, round 2): difficulty is STRIKE-TIMES — how many
// columns the fingers attack in — not note count. A full three-finger rake is
// easy; independence emerges from density, so finger-sets may vary freely even
// in Tame. Triples are legal in every tier. `allSinglesOdds` makes genuinely
// all-singles generations a real species on the lower tiers. Adjacency stays
// clean for Tame/Loose; Unruly drops it. Chaos is OFF the difficulty curve —
// fully random discovery (uniform column shapes, coin-flip pinches).

// 5) Tame: few TOTAL finger strike-times — pinched beats count against the
//    budget, not on top of it — and no adjacent re-strike. (Thickness is NOT
//    capped — a 3-finger rake is exactly what Tame should allow.)
check("Tame: ≤3 total finger strike-times, no same finger re-struck on adjacent 8ths", () => {
  for (const chord of CHORD_IDS) {
    for (let seed = 1; seed <= 12; seed++) {
      for (const bass of ["travis", "simple_alt"]) {
        const p = generatePattern(chord, { bass, chaos: "tame", rng: seeded(seed * 31) });
        // Right-hand texture is a property of the FINGER layer, independent of the
        // chord's bass (which can legitimately overwrite a string-3 finger on
        // D/Dm). Assert it on trebleBars, not the reference-merged bars.
        const bar = p.trebleBars[0];

        // maxStrikes is a hard ceiling (3) on ALL columns with a finger note —
        // offbeats AND pinched beats; the floor is best-effort (adjacency can
        // drop a column rather than re-strike), so we only assert the ceiling.
        const filled = new Set(bar.map((e) => e.slot));
        assert(filled.size <= 3,
          `Tame strike-times should be ≤3, got ${filled.size} (${chord}/${bass} seed ${seed})`);

        // adjacency among FINGERS: a re-strike is the SAME finger on adjacent
        // 8ths. The thumb riding a finger's string (string 3 on D/Dm) is ordinary
        // alternating picking, not a re-strike, so it is not counted.
        const stringsAt = (slot) => new Set(bar.filter((e) => e.slot === slot).map((e) => e.string));
        for (let slot = 1; slot < 8; slot++) {
          const a = stringsAt(slot), b = stringsAt(slot + 1);
          for (const s of a) {
            assert(!b.has(s),
              `Tame: finger string ${s} re-struck on adjacent slots ${slot}/${slot + 1} (${chord}/${bass} seed ${seed})`);
          }
        }
      }
    }
  }
});

// 5b) All-singles generations are a real species (`allSinglesOdds`): a decent
//     share of lower-tier rolls use ONLY single finger notes, and stacked rolls
//     still appear too — the mix is the point.
check("lower tiers roll both all-singles and stacked patterns", () => {
  for (const chaos of ["tame", "loose"]) {
    let singles = 0, stacked = 0, n = 0;
    for (const chord of ["C", "G", "D", "Am"]) {
      for (let seed = 1; seed <= 50; seed++) {
        const p = generatePattern(chord, { chaos, rng: seeded(seed * 17 + 3) });
        let hasStack = false;
        for (const bar of p.trebleBars) {
          const byCol = {};
          for (const e of bar) (byCol[e.slot] ??= []).push(e.string);
          if (Object.values(byCol).some((a) => a.length >= 2)) hasStack = true;
        }
        n++;
        if (hasStack) stacked++; else singles++;
      }
    }
    assert(singles / n >= 0.2, `${chaos}: all-singles patterns too rare (${singles}/${n})`);
    assert(stacked / n >= 0.2, `${chaos}: stacked patterns too rare (${stacked}/${n})`);
  }
});

// 5c) Unruly keeps at least one stack (≥2 notes) per bar — its texture floor, so
//     it doesn't read like Loose — EXCEPT on an all-singles roll (allSinglesOdds),
//     where zero stacks anywhere is the roll's whole point. So: if the pattern has
//     any stack, every bar must have one; if none, it's a legitimate singles roll.
check("Unruly: every bar stacked, unless it's an all-singles roll", () => {
  let sawStackedPattern = false;
  for (const chord of CHORD_IDS) {
    for (let seed = 1; seed <= 12; seed++) {
      const p = generatePattern(chord, { bass: "travis", chaos: "unruly", rng: seeded(seed * 71) });
      const stacksPerBar = p.trebleBars.map((bar) => {
        let stacks = 0;
        for (const slot of ALL_SLOTS_T) {
          if (bar.filter((e) => e.slot === slot).length >= 2) stacks++;
        }
        return stacks;
      });
      if (stacksPerBar.some((s) => s > 0)) {
        sawStackedPattern = true;
        stacksPerBar.forEach((s, b) =>
          assert(s >= 1, `Unruly bar ${b} has no stack in a stacked pattern (${chord} seed ${seed})`));
      }
    }
  }
  assert(sawStackedPattern, "Unruly should produce stacked patterns across the sweep");
});

// 5d) Triples are no longer Chaos-exclusive: every tier can stack three across a
//     sweep — Tame via its synchronized rake (group of 3), the rest via odds.
check("triples are not Chaos-exclusive: every tier can stack three", () => {
  for (const chaos of ["tame", "loose", "unruly", "chaos"]) {
    let sawTriple = false;
    for (let seed = 1; seed <= 80 && !sawTriple; seed++) {
      const p = generatePattern("C", { chaos, rng: seeded(seed * 17 + 1) });
      for (const bar of p.bars) {
        for (const slot of ALL_SLOTS_T) {
          if (bar.filter((e) => e.slot === slot && e.finger !== "p").length >= 3) sawTriple = true;
        }
      }
    }
    assert(sawTriple, `${chaos} should produce a 3-note column across a sweep`);
  }
});

// 5e2) Re-strikes are RATIONED, not binary (round 5): `maxRestrikes` is a
//      per-bar budget, so total same-string adjacent pairs across the circular
//      loop never exceed bars × maxRestrikes (Unruly: 2/bar — spice, not a
//      wall; unlimited adjacency averaged ~3.5 pairs/bar with a tail to 11).
//      And the budget is real: Unruly still re-strikes somewhere in a sweep.
check("Unruly: re-strike pairs capped at maxRestrikes per bar, but present", () => {
  const pairsInLoop = (p) => {
    const N = p.trebleBars.length * 8;
    const at = (gi) => {
      const bar = Math.floor(gi / 8), slot = (gi % 8) + 1;
      // fingers only: a re-strike is the same finger on adjacent 8ths
      return new Set(p.trebleBars[bar].filter((e) => e.slot === slot).map((e) => e.string));
    };
    let pairs = 0;
    for (let gi = 0; gi < N; gi++) {
      const a = at(gi), b = at((gi + 1) % N);
      for (const s of a) if (b.has(s)) pairs++;
    }
    return pairs;
  };
  let sawRestrike = false;
  for (const chord of CHORD_IDS) {
    for (let seed = 1; seed <= 10; seed++) {
      const p = generatePattern(chord, { chaos: "unruly", rng: seeded(seed * 43) });
      const pairs = pairsInLoop(p);
      assert(pairs <= 2,
        `Unruly rolled ${pairs} re-strike pairs, cap is 2 (${chord} seed ${seed})`);
      if (pairs > 0) sawRestrike = true;
    }
  }
  assert(sawRestrike, "Unruly should still produce re-strikes across the sweep");
});

// 5f) Hard no-blank rule (session 6): every bar has at least one finger note.
//     Chaos used to be able to roll a bare-thumb bar; the generator now forces a
//     legal offbeat rather than ship one.
check("no blank bars: every bar has ≥1 finger note (all tiers)", () => {
  everyBar((bar, ctx) => {
    assert(bar.some((e) => e.finger !== "p"),
      `blank bar — no finger notes (${JSON.stringify(ctx)})`);
  });
});

// 5e) Whole-loop generation: for the clean tiers the adjacency ceiling holds
//     across the loop — every interior seam AND the wrap from the last 8th back
//     to the first. Session 36: with generatePattern always making exactly one
//     bar, "the loop" IS that one bar repeating indefinitely under playback, so
//     the wrap (slot 8 -> slot 1) is now the ONLY seam that exists — and it's
//     load-bearing on every single generation, not a reduced case.
check("clean tiers: no same-string re-strike across the loop wrap", () => {
  const stringsAtGlobal = (p, gi) => {
    const bar = Math.floor(gi / 8), slot = (gi % 8) + 1;
    // fingers only: the clean-tier no-re-strike rule is same-finger, thumb aside
    return new Set(p.trebleBars[bar].filter((e) => e.slot === slot).map((e) => e.string));
  };
  for (const chaos of ["tame", "loose"]) {
    for (const chord of CHORD_IDS) {
      for (let seed = 1; seed <= 6; seed++) {
        const p = generatePattern(chord, { chaos, rng: seeded(seed * 29) });
        const N = 8;
        for (let gi = 0; gi < N; gi++) {
          const a = stringsAtGlobal(p, gi);
          const b = stringsAtGlobal(p, (gi + 1) % N); // circular: wraps last -> first
          for (const s of a) {
            assert(!b.has(s),
              `${chaos}: string ${s} re-strikes across global slots ${gi}->${(gi + 1) % N} ` +
              `(${chord} seed ${seed})`);
          }
        }
      }
    }
  }
});

// 9) Layer independence: swapping the bass keeps the exact finger pattern, and
//    re-rolling the fingers keeps the exact bass.
check("regenerateBass keeps the right hand; regenerateTreble keeps the bass", () => {
  const p = generatePattern("C", { bass: "travis", chaos: "tame", rng: seeded(21) });
  const trebleSig = (pat) => JSON.stringify(pat.trebleBars);
  const thumbSig = (pat) => JSON.stringify(pat.thumbBars);

  const rebassed = regenerateBass(p, "simple_alt", "C", seeded(99));
  assert(trebleSig(rebassed) === trebleSig(p), "regenerateBass must not change the treble layer");
  assert(thumbSig(rebassed) !== thumbSig(p), "regenerateBass should change the thumb layer");
  assert(rebassed.bass === "simple_alt", "bass id should update");

  const retrebled = regenerateTreble(p, "chaos", seeded(77));
  assert(thumbSig(retrebled) === thumbSig(p), "regenerateTreble must not change the thumb layer");
  assert(retrebled.chaos === "chaos", "chaos id should update");

  // merged bars still obey the hard rule after either swap
  for (const pat of [rebassed, retrebled]) {
    for (const bar of pat.bars) {
      const seen = new Set();
      for (const ev of bar) {
        const k = `${ev.slot}:${ev.string}`;
        assert(!seen.has(k), `collision at ${k} after a layer swap`);
        seen.add(k);
      }
    }
  }
});

// 9b) Full Random -> relative preset flips the pattern type back.
check("regenerateBass updates relative/absolute type", () => {
  const p = generatePattern("C", { bass: "travis", chaos: "tame", rng: seeded(3) });
  assert(p.type === "relative", "travis should be relative");
  const abs = regenerateBass(p, "full_random", "C", seeded(4));
  assert(abs.type === "absolute", "full_random should flip type to absolute");
  const rel = regenerateBass(abs, "travis", "C", seeded(5));
  assert(rel.type === "relative", "travis should flip type back to relative");
});

// 10) Saved library: round-trips a pattern, lists newest-first, deletes, and
//     survives corrupt/unavailable storage. Uses an in-memory stub so the
//     user's real saved patterns are never touched.
function memoryStorage(initial) {
  let data = initial;
  return {
    getItem: () => (data === undefined ? null : data),
    setItem: (_k, v) => { data = v; },
  };
}

check("saved: round-trips a pattern with its chord context", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { bass: "travis", chaos: "tame", rng: seeded(12) });
  // The capo rides along: it's what the pattern SOUNDS like, so it's content.
  // ×2, swing (session 36) and bpm join it for the same reason — dual-layer
  // with a tp-prefs/tp-audio session default, but the SAVED value is musical
  // content.
  const context = {
    chordMode: "progression", chord: "C", key: "G", capo: 3, progression: ["G", "C", "D", "G"],
    x2: true, swing: 67, bpm: 76,
  };

  assert(store.count() === 0, "new store should be empty");
  const item = store.save({ name: "  Test lick  ", pattern, context });
  assert(item, "save should return the stored item");
  assert(item.name === "Test lick", `name should be trimmed, got "${item.name}"`);
  assert(item.id && item.savedAt, "item should get an id and timestamp");
  assert(store.count() === 1, "count should be 1 after save");

  const back = store.get(item.id);
  assert(JSON.stringify(back.pattern.bars) === JSON.stringify(pattern.bars), "pattern bars should round-trip");
  assert(JSON.stringify(back.pattern.thumbBars) === JSON.stringify(pattern.thumbBars), "thumb layer should round-trip");
  assert(JSON.stringify(back.pattern.trebleBars) === JSON.stringify(pattern.trebleBars), "treble layer should round-trip");
  assert(JSON.stringify(back.context) === JSON.stringify(context), "chord context should round-trip");
});

check("saved: no UI settings are stored with a pattern", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(1) });
  const item = store.save({
    name: "x",
    pattern,
    context: { chordMode: "single", chord: "C", key: "C", progression: [] },
  });
  const blob = JSON.stringify(item);
  for (const banned of ["theme", "labelMode", "merle", "jerry", "elizabeth", "pima"]) {
    assert(!blob.includes(banned), `saved item must not contain UI setting "${banned}"`);
  }
});

check("saved: lists newest first, deletes, and handles bad storage", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(2) });
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };

  const a = store.save({ name: "first", pattern, context: ctx });
  const b = store.save({ name: "second", pattern, context: ctx });
  // same-millisecond saves must still order deterministically (insertion order)
  assert(store.list()[0].id === b.id, "newest item should sort first");
  assert(store.list()[1].id === a.id, "older item should sort second");

  assert(store.remove(a.id) === true, "remove should report success");
  assert(store.count() === 1, "count should drop after remove");
  assert(store.remove("nope") === false, "removing an unknown id should report false");

  // corrupt payload behaves like an empty library rather than throwing
  const corrupt = createStore("test", memoryStorage("{not json"));
  assert(corrupt.list().length === 0, "corrupt storage should read as empty");

  // storage that refuses writes reports failure instead of throwing
  const readOnly = createStore("test", {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceeded"); },
  });
  assert(readOnly.save({ name: "x", pattern, context: ctx }) === null,
    "save should return null when storage refuses the write");
});

check("saved: rename updates the name, keeps the pattern, ignores blanks", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(3) });
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };
  const a = store.save({ name: "old name", pattern, context: ctx });

  assert(store.rename(a.id, "  new name  ") === true, "rename should report success");
  const got = store.get(a.id);
  assert(got.name === "new name", `rename should trim + update, got "${got.name}"`);
  assert(JSON.stringify(got.pattern) === JSON.stringify(a.pattern), "rename must keep the pattern");
  assert(got.id === a.id && got.savedAt === a.savedAt, "rename must keep id + savedAt");

  assert(store.rename(a.id, "   ") === false, "a blank rename should be ignored");
  assert(store.get(a.id).name === "new name", "name unchanged after a blank rename");
  assert(store.rename("nope", "x") === false, "renaming an unknown id should report false");
});

check("saved: update() overwrites content in place, keeping the id", () => {
  const store = createStore("test", memoryStorage());
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };
  const original = generatePattern("C", { rng: seeded(5) });
  const a = store.save({ name: "Lick", pattern: original, context: ctx });

  const edited = generatePattern("G", { rng: seeded(6) });
  const newCtx = { chordMode: "single", chord: "G", key: "G", progression: [] };
  const updated = store.update(a.id, { name: "Lick", pattern: edited, context: newCtx });
  assert(updated, "update should return the stored item");
  assert(updated.id === a.id, "update must keep the original id");
  assert(store.count() === 1, "update must not create a second item");
  assert(JSON.stringify(updated.pattern) === JSON.stringify(edited), "update should replace the pattern");
  assert(JSON.stringify(updated.context) === JSON.stringify(newCtx), "update should replace the context");
  assert(updated.savedAt >= a.savedAt, "update should bump savedAt to now (or tie, same tick)");

  assert(store.update("nope", { name: "x", pattern: edited, context: newCtx }) === null,
    "updating an unknown id should return null");
});

check("saved: duplicate names get a Finder-style (n) suffix", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(4) });
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };

  const a = store.save({ name: "Lick", pattern, context: ctx });
  const b = store.save({ name: "Lick", pattern, context: ctx });
  const c = store.save({ name: "Lick", pattern, context: ctx });
  assert(a.name === "Lick", `first keeps the plain name, got "${a.name}"`);
  assert(b.name === "Lick (2)", `second becomes "(2)", got "${b.name}"`);
  assert(c.name === "Lick (3)", `third becomes "(3)", got "${c.name}"`);

  // Blank names fall back to Untitled and de-dupe the same way.
  const u1 = store.save({ name: "  ", pattern, context: ctx });
  const u2 = store.save({ name: "", pattern, context: ctx });
  assert(u1.name === "Untitled", `blank -> "Untitled", got "${u1.name}"`);
  assert(u2.name === "Untitled (2)", `second blank -> "Untitled (2)", got "${u2.name}"`);
});

// 10b) Export/import (item 4): buildExport/parseImport are pure data
//      functions, so no DOM/FileReader is needed to test them — only the
//      merge itself goes through a real store, same memoryStorage stub.
check("buildExport wraps the library without mutating it", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(21) });
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };
  store.save({ name: "a", pattern, context: ctx });
  store.save({ name: "b", pattern, context: ctx });

  const items = store.list();
  const before = JSON.stringify(items);
  const payload = buildExport(items);
  assert(payload.app === "travis-picker", "export should be tagged with the app id");
  assert(Array.isArray(payload.items) && payload.items.length === 2, "export should carry every item");
  assert(typeof payload.exportedAt === "string", "export should carry a timestamp");
  assert(JSON.stringify(items) === before, "buildExport must not mutate its input");
});

check("parseImport round-trips buildExport's output", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("G", { rng: seeded(22) });
  const ctx = { chordMode: "single", chord: "G", key: "G", progression: [] };
  const saved = store.save({ name: "roundtrip", pattern, context: ctx });

  const payload = buildExport(store.list());
  const result = parseImport(JSON.stringify(payload));
  assert(result.ok, "a real export should parse as ok");
  assert(result.skipped === 0, "a real export should skip nothing");
  assert(result.items.length === 1, "should recover exactly one item");
  assert(result.items[0].name === "roundtrip", "name should round-trip");
  assert(JSON.stringify(result.items[0].pattern) === JSON.stringify(saved.pattern), "pattern should round-trip");
  assert(JSON.stringify(result.items[0].context) === JSON.stringify(ctx), "context should round-trip");
});

check("parseImport accepts a bare array, same as the wrapped shape", () => {
  const pattern = generatePattern("C", { rng: seeded(23) });
  const bare = [{ name: "x", pattern, context: {} }];
  const result = parseImport(JSON.stringify(bare));
  assert(result.ok && result.items.length === 1, "a bare array should be accepted leniently");
});

check("parseImport rejects unrelated JSON and invalid text", () => {
  for (const bad of ['"just a string"', "{}", "[1,2,3]", "not json at all"]) {
    const result = parseImport(bad);
    assert(result.ok === false, `should reject: ${bad}`);
    assert(typeof result.error === "string" && result.error.length > 0, `should explain why: ${bad}`);
  }
});

check("parseImport skips malformed entries but keeps the valid ones", () => {
  const pattern = generatePattern("C", { rng: seeded(24) });
  const payload = {
    app: "travis-picker", exportKind: "saved-library", schema: 1, exportedAt: "x",
    items: [
      { name: "good", pattern, context: {} },
      { name: "no pattern field" },
      { name: "broken pattern", pattern: { thumbBars: "not an array" }, context: {} },
      null,
    ],
  };
  const result = parseImport(JSON.stringify(payload));
  assert(result.ok, "a file with some bad entries is still a usable file");
  assert(result.items.length === 1, `should keep only the valid entry, got ${result.items.length}`);
  assert(result.skipped === 3, `should count the three bad entries, got ${result.skipped}`);
});

check("import merges into an existing library with Finder-style de-dupe", () => {
  const source = createStore("test", memoryStorage());
  const pattern = generatePattern("D", { rng: seeded(25) });
  const ctx = { chordMode: "single", chord: "D", key: "D", progression: [] };
  source.save({ name: "Lick", pattern, context: ctx });
  const payload = buildExport(source.list());

  const dest = createStore("test", memoryStorage());
  dest.save({ name: "Lick", pattern, context: ctx }); // pre-existing same-named item
  const result = parseImport(JSON.stringify(payload));
  for (const item of result.items) dest.save(item);

  assert(dest.count() === 2, "import should ADD, never replace, existing items");
  const names = dest.list().map((i) => i.name).sort();
  assert(JSON.stringify(names) === JSON.stringify(["Lick", "Lick (2)"]),
    `duplicate name on import should get the (2) suffix, got ${JSON.stringify(names)}`);
});

// 10c) Folders (item 4b): no separate table — a folder is just the distinct
// set of `folder` strings in use, so rename/delete are bulk field-updates.
check("saved: folders — setFolder, folders(), renameFolder, clearFolder", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(30) });
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };
  const a = store.save({ name: "a", pattern, context: ctx });
  const b = store.save({ name: "b", pattern, context: ctx });
  const c = store.save({ name: "c", pattern, context: ctx });

  assert(store.folders().length === 0, "a fresh library has no folders");
  assert(store.get(a.id).folder === undefined, "a fresh item has no folder field at all");

  assert(store.setFolder(a.id, "Practice") === true, "setFolder should report success");
  assert(store.setFolder(b.id, "  Practice  ") === true, "setFolder should trim");
  assert(store.get(b.id).folder === "Practice", "setFolder should trim before storing");
  assert(JSON.stringify(store.folders()) === JSON.stringify(["Practice"]),
    "folders() should list each distinct name once");
  assert(store.setFolder("nope", "Practice") === false, "setFolder on an unknown id should report false");

  store.setFolder(c.id, "Warmups");
  assert(JSON.stringify(store.folders()) === JSON.stringify(["Practice", "Warmups"]),
    "folders() should be alphabetical");

  // un-filing: blank/null clears the field back to absent, not to null
  assert(store.setFolder(a.id, "") === true);
  assert(store.get(a.id).folder === undefined, "clearing a folder should delete the field, not null it");
  assert(JSON.stringify(store.folders()) === JSON.stringify(["Practice", "Warmups"]),
    "Warmups (c) and Practice (b) still in use — a's clear shouldn't affect them");

  assert(store.renameFolder("Practice", "Session") === true, "renameFolder should report success");
  assert(store.get(b.id).folder === "Session", "renameFolder should move every item in the old name");
  assert(store.renameFolder("Nothing Here", "X") === false,
    "renameFolder on a name nothing carries should be a no-op");
  assert(store.renameFolder("Warmups", "  ") === false, "renameFolder to a blank name should be a no-op");

  assert(store.clearFolder("Session") === true, "clearFolder should report success");
  assert(store.get(b.id).folder === undefined, "clearFolder should un-file every item in it");
  assert(store.count() === 3, "clearFolder must never delete a pattern, only un-file it");
  assert(store.clearFolder("Session") === false, "clearing an already-empty folder should report false");
});

check("saved: save() only sets folder when given one; parseImport carries folder through", () => {
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(31) });
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };

  const plain = store.save({ name: "plain", pattern, context: ctx });
  assert(!("folder" in plain), "save() without a folder must not write the field at all");
  const filed = store.save({ name: "filed", pattern, context: ctx, folder: "Practice" });
  assert(filed.folder === "Practice", "save() should set folder when one is given");

  const exported = JSON.stringify(buildExport([filed]));
  const result = parseImport(exported);
  assert(result.ok && result.items.length === 1, "a real export should parse as ok");
  assert(result.items[0].folder === "Practice", "parseImport should carry folder through");

  const noFolder = parseImport(JSON.stringify(buildExport([plain])));
  assert(noFolder.items[0].folder === null, "parseImport should read a missing folder as null, not undefined");
});

check("saved: save() only sets builtinId when given one; parseImport carries it through", () => {
  // Same shape as the folder test above — builtinId (session 41) is the
  // invisible thread that survives a rename/move so a seeded builtin is
  // never mistaken for missing just because you edited it.
  const store = createStore("test", memoryStorage());
  const pattern = generatePattern("C", { rng: seeded(32) });
  const ctx = { chordMode: "single", chord: "C", key: "C", progression: [] };

  const plain = store.save({ name: "plain", pattern, context: ctx });
  assert(!("builtinId" in plain), "save() without a builtinId must not write the field at all");
  const fromBuiltin = store.save({
    name: "Beginner 1", pattern, context: ctx, folder: "Built-in", builtinId: "builtin:beginner-1",
  });
  assert(fromBuiltin.builtinId === "builtin:beginner-1", "save() should set builtinId when one is given");

  // Renaming and moving must not touch it — that's the whole point of the tag.
  store.rename(fromBuiltin.id, "My Renamed Copy");
  store.setFolder(fromBuiltin.id, "Practice");
  const after = store.get(fromBuiltin.id);
  assert(after.builtinId === "builtin:beginner-1", "rename/move must not disturb builtinId");
  assert(after.name === "My Renamed Copy" && after.folder === "Practice",
    "rename/move must still take effect normally");

  const exported = JSON.stringify(buildExport([fromBuiltin]));
  const result = parseImport(exported);
  assert(result.items[0].builtinId === "builtin:beginner-1", "parseImport should carry builtinId through");

  const noBuiltinId = parseImport(JSON.stringify(buildExport([plain])));
  assert(noBuiltinId.items[0].builtinId === null,
    "parseImport should read a missing builtinId as null, not undefined");
});

// 10d) Pre-loaded patterns (item 2): read-only starter data, never written to
// localStorage. Real data-integrity checks, not source-level ones — this file
// has no DOM/app.js dependency, so it's tested the same way js/data.js is.
check("builtin patterns: well-shaped, valid chords, and obey the hard rule", () => {
  assert(BUILTIN_PATTERNS.length > 0, "there should be at least one built-in pattern");
  const ids = new Set();
  for (const item of BUILTIN_PATTERNS) {
    assert(typeof item.id === "string" && item.id.startsWith("builtin:"),
      `builtin id should be namespaced, got "${item.id}"`);
    assert(!ids.has(item.id), `duplicate builtin id "${item.id}"`);
    ids.add(item.id);
    assert(typeof item.name === "string" && item.name.trim(), `builtin "${item.id}" needs a name`);
    assert(item.source === "drawn" || item.source === "generated",
      `builtin "${item.id}" has an invalid source`);
    assert(!("v" in item) && !("savedAt" in item) && !("folder" in item) && !("builtinId" in item),
      `builtin "${item.id}" must not carry storage.js's own bookkeeping fields`);

    const ctx = item.context;
    assert(CHORDS[ctx.chord], `builtin "${item.id}" context chord "${ctx.chord}" is not a real chord`);
    for (const c of ctx.progression || []) {
      assert(CHORDS[c], `builtin "${item.id}" progression chord "${c}" is not a real chord`);
    }
    assert(typeof ctx.bpm === "number" && ctx.bpm >= 40 && ctx.bpm <= 240,
      `builtin "${item.id}" bpm out of range`);

    // Same hard rule every generated pattern is held to (check 1): no two
    // events share (slot, string) in the merged bar these actually render.
    const seen = new Set();
    for (const ev of item.pattern.bars[0]) {
      const key = `${ev.slot}:${ev.string}`;
      assert(!seen.has(key), `builtin "${item.id}" collides at ${key}`);
      seen.add(key);
    }
  }
});

// 11) Manual editor: tap inference, add/remove, shared-cell editing, and the
//     relative/absolute consequences of drawing a bass note.
check("editor: infers thumb vs finger, including the D string-3 overlap", () => {
  // thumb strings are always the thumb
  for (const s of [6, 5, 4]) {
    assert(inferFinger(s, 2, "C") === "p", `string ${s} should be the thumb`);
  }
  // plain finger strings map to i/m/a
  assert(inferFinger(3, 2, "C") === "i", "string 3 offbeat on C should be i");
  assert(inferFinger(2, 4, "C") === "m", "string 2 should be m");
  assert(inferFinger(1, 6, "C") === "a", "string 1 should be a");
  // string 3 on C is NOT a bass role, so it stays a finger even on a beat
  assert(inferFinger(3, 1, "C") === "i", "string 3 on C is a finger even on a beat");
  // on D, string 3 IS the alt bass: thumb on beats, finger off-beat
  assert(inferFinger(3, 1, "D") === "p", "string 3 on D should be the thumb on a beat");
  assert(inferFinger(3, 2, "D") === "i", "string 3 on D should be a finger off-beat");
});

check("editor: toggling adds then removes a note", () => {
  const p = generatePattern("C", { rng: seeded(31) });
  const at = { cellIndex: 0, slot: 4, string: 2, chordId: "C" };
  const has = (pat) => pat.bars[0].some((e) => e.slot === 4 && e.string === 2);

  const cleared = has(p) ? toggleNote(p, at) : p;
  assert(!has(cleared), "cell should start empty for this check");

  const added = toggleNote(cleared, at);
  assert(has(added), "toggling an empty cell should add a note");
  assert(added.bars[0].find((e) => e.slot === 4 && e.string === 2).finger === "m",
    "string 2 should be added as m");
  assert(added.edited === true, "editing should mark the pattern as edited");

  const removed = toggleNote(added, at);
  assert(!has(removed), "toggling again should remove it");

  // the source layers stay consistent with the merged bars
  assert(removed.trebleBars[0].every((e) => !(e.slot === 4 && e.string === 2)),
    "removal should come out of the treble layer too");
});

check("editor: a drawn bass note keeps its role when it matches the chord", () => {
  const p = generatePattern("C", { rng: seeded(32) });
  // C's fifth is string 6 — drawing there should stay RELATIVE (follows chords)
  const onRole = toggleNote(p, { cellIndex: 0, slot: 2, string: 6, chordId: "C" });
  const drawn = onRole.thumbBars[0].find((e) => e.slot === 2);
  assert(drawn && drawn.role === "fifth", `expected a fifth role, got ${JSON.stringify(drawn)}`);
  assert(onRole.type === "relative", `should stay relative, got ${onRole.type}`);

  // it follows the chord: on G the fifth is string 5
  assert(resolvedThumbString(drawn, "G") === 5, "a relative fifth should follow to G's string 5");
});

check("editor: a bass note matching no role goes absolute and flags the pattern mixed", () => {
  const p = generatePattern("D", { rng: seeded(33) });
  // D's roles are 4/3/5 — string 6 matches none of them
  const mixed = toggleNote(p, { cellIndex: 0, slot: 2, string: 6, chordId: "D" });
  const drawn = mixed.thumbBars[0].find((e) => e.slot === 2 && e.string === 6);
  assert(drawn && drawn.absolute === true, "an off-role bass note should be stored absolute");
  assert(mixed.type === "mixed", `pattern should read as mixed, got ${mixed.type}`);
  // absolute notes do not follow the chord
  assert(resolvedThumbString(drawn, "G") === 6, "an absolute bass note should stay on string 6");
});

check("editor: editing a shared cell changes every repeat of it", () => {
  const p = generatePattern("C", { rng: seeded(34) });
  const chords = ["C", "F", "G", "C"]; // 1-bar pattern across a 4-bar progression
  const before = resolvePhrase(p, chords);
  assert(before.length === 4, "phrase should be 4 bars");

  // A shared cell renders identically in every bar it repeats into. (Whether the
  // generator happened to seed a note here doesn't matter — toggling flips it.)
  const noteIn = (bar) => bar.some((e) => e.slot === 6 && e.string === 1);
  const beforeState = before.map(({ bar }) => noteIn(bar));
  assert(beforeState.every((v) => v === beforeState[0]),
    "the shared cell should render identically across all four bars before editing");

  // tap in the THIRD bar; cellIndex is 2 % 1 = 0, the one shared cell
  const edited = toggleNote(p, { cellIndex: 2 % p.bars.length, slot: 6, string: 1, chordId: "G" });
  const after = resolvePhrase(edited, chords);
  const afterState = after.map(({ bar }) => noteIn(bar));
  assert(afterState.every((v) => v === afterState[0]),
    "editing the shared cell should change all four bars identically");
  assert(afterState[0] !== beforeState[0],
    "toggling the shared cell should flip it in every bar");
});

// 12) Two drawn bass notes can share a slot. Regression: relative thumb events
//     were stored without `string`, so the hard-rule dedupe key collapsed to
//     "slot:undefined" and silently swallowed the second one.
check("editor: two drawn bass notes in one slot both survive", () => {
  let p = generatePattern("C", { rng: seeded(41) });
  // clear the slot first
  for (const s of [4, 5, 6]) {
    if (p.bars[0].some((e) => e.slot === 2 && e.string === s)) {
      p = toggleNote(p, { cellIndex: 0, slot: 2, string: s, chordId: "C" });
    }
  }
  const add = (string) => (p = toggleNote(p, { cellIndex: 0, slot: 2, string, chordId: "C" }));
  add(5); add(4); add(6); // C's root, alt and fifth strings

  const at2 = p.bars[0]
    .filter((e) => e.slot === 2 && e.finger === "p")
    .map((e) => e.string)
    .sort((a, b) => a - b);
  assert(JSON.stringify(at2) === JSON.stringify([4, 5, 6]),
    `expected bass on 4,5,6 at slot 2, got ${JSON.stringify(at2)}`);
  // every stored thumb event carries a string, like generated ones do
  for (const ev of p.thumbBars[0]) {
    assert(typeof ev.string === "number", `thumb event missing string: ${JSON.stringify(ev)}`);
  }
});

// 13) Pattern length is fully removed (session 36) — a source-level test, since
// a stray import lingering unused would otherwise fail silently.
check("source: PATTERN_LENGTHS/setPatternBars are gone", () => {
  assert(!("setPatternBars" in GeneratorExports), "generator.js should no longer export setPatternBars");
  assert(!("PATTERN_LENGTHS" in DataExports), "data.js should no longer export PATTERN_LENGTHS");
  assert(!("DEFAULT_PATTERN_BARS" in DataExports), "data.js should no longer export DEFAULT_PATTERN_BARS");
});

// 13b) ×2 mode's audio-bar -> screen-bar/pass translation (app.js's
// highlightColumn), the one piece of non-trivial arithmetic in the feature —
// pure and exported from metronome.js so it's testable without a real
// metronome, mirroring stepToPosition just above it.
check("splitAudioBar: audio-bar position -> screen bar + pass", () => {
  // ×2 off (passesPerBar=1): identity, every audio bar IS the screen bar.
  for (let bar = 0; bar <= 3; bar++) {
    const got = splitAudioBar(bar, 1);
    assert(got.bar === bar && got.pass === 0,
      `passesPerBar=1: audio bar ${bar} should map to itself, pass 0, got ${JSON.stringify(got)}`);
  }
  // ×2 on (passesPerBar=2): audio bars 0..7 -> screen bars 0..3, two passes each.
  const expected = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]];
  expected.forEach(([screenBar, pass], bar) => {
    const got = splitAudioBar(bar, 2);
    assert(got.bar === screenBar && got.pass === pass,
      `audio bar ${bar} should be screen bar ${screenBar} pass ${pass}, got ${JSON.stringify(got)}`);
  });
});

// 13c) ×2's grid stays at 4 bars, never 8 (the height-budget constraint) — the
// doubled audio content lives only in app.js's playback-time transform, never
// in what's drawn. The pass lamps only exist when ×2 is on, and are omitted
// entirely (not hidden) otherwise.
check("grid: PIMA labels carry the glyph tag that optically centres them", () => {
  // The note dome centres the LINE BOX, so a descender drags `p` low and the
  // dot lifts `i` — 0.23em of drift across p/i/m/a, measured against the
  // shipping face, versus 0.01em across the digits. CSS corrects it per glyph
  // via `[data-glyph]`, so what has to hold here is that grid.js tags the
  // letters AND, just as importantly, leaves the digits alone: in Fret mode the
  // very same thumb event prints a number that must not be nudged. Keying off
  // the finger instead of the rendered label is the way to get that wrong,
  // which is why this drives both modes over one identical phrase.
  const host = document.createElement("div");
  const p = generatePattern("C", { rng: seeded(7) });
  const phrase = resolvePhrase(p, ["C", "F", "G", "C"]);

  renderGrid(host, phrase, { labelMode: "pima" });
  const pima = [...host.querySelectorAll(".note")];
  assert(pima.length > 0, "the phrase should render some notes");
  for (const n of pima) {
    assert(/^[pima]$/.test(n.textContent), `PIMA mode printed "${n.textContent}"`);
    assert(n.dataset.glyph === n.textContent,
      `a PIMA note prints "${n.textContent}" but is tagged "${n.dataset.glyph}"`);
  }

  renderGrid(host, phrase, { labelMode: "fret" });
  for (const n of host.querySelectorAll(".note")) {
    assert(/^\d+$/.test(n.textContent), `Fret mode printed "${n.textContent}"`);
    assert(n.dataset.glyph === undefined,
      `a fret digit "${n.textContent}" is tagged data-glyph="${n.dataset.glyph}" and would be nudged`);
  }

  renderGrid(host, phrase, { labelMode: "none" });
  for (const n of host.querySelectorAll(".note")) {
    assert(n.textContent === "", "No-labels mode should print nothing");
    assert(n.dataset.glyph === undefined, "an empty note must not be tagged");
  }
});

check("grid: ×2 renders exactly 4 bars with two pass lamps each; omitted when off", () => {
  const host = document.createElement("div");
  const p = generatePattern("C", { rng: seeded(50) });
  const phrase = resolvePhrase(p, ["C", "F", "G", "C"]);

  renderGrid(host, phrase, { x2: true, editableChords: true });
  assert(host.querySelectorAll(".bar").length === 4, "×2 must never grow the grid past 4 bars");
  const lampGroups = [...host.querySelectorAll(".pass-lamps")];
  assert(lampGroups.length === 4, `expected 4 pass-lamp groups, got ${lampGroups.length}`);
  lampGroups.forEach((g, i) => {
    assert(g.dataset.bar === String(i), `pass-lamps group ${i} should carry data-bar="${i}"`);
    const passes = [...g.querySelectorAll(".pass-lamp")].map((l) => l.dataset.pass);
    assert(JSON.stringify(passes) === JSON.stringify(["0", "1"]),
      `bar ${i} should have exactly a pass-0 and a pass-1 lamp, got ${JSON.stringify(passes)}`);
  });

  renderGrid(host, phrase, { x2: false, editableChords: true });
  assert(host.querySelectorAll(".pass-lamps").length === 0, "×2 off should omit the pass-lamp markup entirely");
});

// 13c2) THE QUERY IS THE CONTRACT, not the markup's shape. The check above
// passed for a whole release while the lamps never lit once: app.js looked up
// `.pass-lamp[data-bar=…][data-pass=…]`, but `data-bar` is on the CONTAINER, so
// the selector matched nothing and every lamp silently stayed dark. Counting
// elements and reading their attributes can't catch that — only running the
// real lookup against the real markup can. `passLampSelector` now lives in
// grid.js beside the markup and app.js imports it, so this pins both halves.
check("grid: passLampSelector actually finds every lamp it names", () => {
  const host = document.createElement("div");
  const p = generatePattern("C", { rng: seeded(51) });
  renderGrid(host, resolvePhrase(p, ["C", "F", "G", "C"]), { x2: true, editableChords: true });

  const seen = new Set();
  for (let bar = 0; bar < 4; bar++) {
    for (let pass = 0; pass < 2; pass++) {
      const found = host.querySelectorAll(passLampSelector(bar, pass));
      assert(found.length === 1,
        `passLampSelector(${bar}, ${pass}) matched ${found.length} elements, expected exactly 1`);
      assert(found[0].classList.contains("pass-lamp"),
        `passLampSelector(${bar}, ${pass}) matched a non-lamp element`);
      seen.add(found[0]);
    }
  }
  // …and each of the 8 lamps is addressed by exactly one (bar, pass) pair — no
  // two coordinates collapsing onto the same element.
  assert(seen.size === 8, `the 8 (bar, pass) pairs resolved to ${seen.size} distinct lamps`);
});

// 13d) Regression guard: ×2's doubled audio-chords array must never be written
// into state.progression (app.js's render() builds it fresh every call and
// discards it — see the comment there). This proves WHY that discipline
// matters: doubling pairwise (C,C,F,F,...) is not the shape fitProgression
// cycles a preset into (C,F,...,C,F,...), so detectProgression would silently
// stop recognizing a perfectly normal progression if the doubled array ever
// leaked into state.
check("detectProgression: a ×2-doubled chord array is not mistaken for its own preset", () => {
  const keyId = "C";
  const preset = PROGRESSIONS.find((p) => p.mode === KEYS[keyId].mode);
  const chords = progressionChords(preset.id, keyId);
  assert(chords.length === 4, "progressions are 4-bar phrases");
  assert(detectProgression(chords, keyId) === preset.id,
    "sanity: the plain, un-doubled progression should be recognized");

  const doubled = chords.flatMap((c) => [c, c]); // exactly app.js's audioChords
  assert(detectProgression(doubled, keyId) !== preset.id,
    "a ×2-doubled array should not read as the underlying preset");
});

// 14) Metronome timing maths (the audio itself can't be unit-tested here).
check("metronome: slot duration, beat slots and playhead position", () => {
  // an 8th note is half a beat
  assert(secondsPerSlot(120) === 0.25, `120bpm 8th should be 0.25s, got ${secondsPerSlot(120)}`);
  assert(secondsPerSlot(60) === 0.5, `60bpm 8th should be 0.5s, got ${secondsPerSlot(60)}`);
  assert(Math.abs(secondsPerSlot(90) - 1 / 3) < 1e-9, "90bpm 8th should be a third of a second");

  // clicks land on 1 & 2 & 3 & 4 & -> slots 0,2,4,6 within the bar
  assert([0, 2, 4, 6].every(isBeatSlot), "even slots are beats");
  assert([1, 3, 5, 7].every((s) => !isBeatSlot(s)), "odd slots are offbeats");

  // the playhead walks bar by bar, 8 slots each, 1-indexed slots for the grid
  assert(JSON.stringify(stepToPosition(0)) === JSON.stringify({ bar: 0, slot: 1 }), "step 0 -> bar 0 slot 1");
  assert(JSON.stringify(stepToPosition(7)) === JSON.stringify({ bar: 0, slot: 8 }), "step 7 -> bar 0 slot 8");
  assert(JSON.stringify(stepToPosition(8)) === JSON.stringify({ bar: 1, slot: 1 }), "step 8 -> bar 1 slot 1");
  assert(JSON.stringify(stepToPosition(31)) === JSON.stringify({ bar: 3, slot: 8 }), "step 31 -> bar 3 slot 8");
});

check(`metronome: bpm is clamped to the ${BPM_MIN}-${BPM_MAX} range`, () => {
  const m = createMetronome();
  assert(m.setBpm(90) === 90, "90 should pass through");
  assert(m.setBpm(10) === BPM_MIN, `below range should clamp to ${BPM_MIN}`);
  assert(m.setBpm(999) === BPM_MAX, `above range should clamp to ${BPM_MAX}`);
  assert(m.setBpm(200) === 200, "200 should pass through — the fast end is usable");
  assert(m.setBpm(97.6) === 98, "fractional bpm should round");
  // The scheduler must queue further ahead than one 8th at top speed, or a
  // delayed setTimeout lands a click late.
  assert(secondsPerSlot(BPM_MAX) < 0.2, "one 8th at max bpm must fit in the schedule-ahead window");
  assert(m.running === false, "a fresh metronome should not be running");
});

// Swing. The positions below are the whole feature — where the eight slots of a
// bar actually land — so they're asserted as absolute offsets in BEATS rather
// than as durations, which is how you'd read them off a grid.
const slotOffsetsInBeats = (bpm, swing) => {
  const beat = 60 / bpm;
  const out = [];
  let t = 0;
  for (let i = 0; i < 8; i++) { out.push(+(t / beat).toFixed(6)); t += slotSeconds(i, bpm, swing); }
  return { offsets: out, barBeats: +(t / beat).toFixed(6) };
};

check("swing: straight (50%) is exactly the un-swung grid", () => {
  assert(DEFAULT_SWING === SWING_MIN, "swing must default to OFF");
  for (let i = 0; i < 8; i++) {
    const s = slotSeconds(i, 120, 50);
    assert(Math.abs(s - secondsPerSlot(120)) < 1e-12,
      `slot ${i} at 50% should equal a plain 8th, got ${s}`);
  }
  assert(clampSwing(10) === SWING_MIN, "below range clamps to straight");
  assert(clampSwing(999) === SWING_MAX, "above range clamps");
  assert(clampSwing(undefined) === SWING_MIN, "a missing pref reads as straight");
  assert(clampSwing("62") === 62, "a string from an <input> is accepted");
  assert(clampSwing(61.4) === 61, "the slider is whole-percent, so anything else rounds");
});

check("swing: the bar's total length never changes, at any amount", () => {
  // This is what keeps BPM meaning what it means and leaves the count-in a full
  // bar — each beat/& pair is split long/short, so it sums back to itself.
  for (const pct of [50, 55, 60, 62, 66, 67, 70, 75]) {
    const { barBeats } = slotOffsetsInBeats(120, pct);
    assert(Math.abs(barBeats - 4) < 1e-9, `${pct}% should still be a 4-beat bar, got ${barBeats}`);
  }
});

check("swing: the &s move late and the BEATS never move", () => {
  // The thumb staying metronomic is the technique this app exists for, so this
  // is the invariant that says swing is still Travis picking. A second
  // resolution that moved beats 2 and 4 was trialled and cut (v2.13.2); if one
  // ever comes back, it must not come back through this function silently.
  const near = (a, b) => Math.abs(a - b) < 1e-4;
  for (const pct of [56, 62, 67, 75]) {
    const o = slotOffsetsInBeats(120, pct).offsets;
    assert([0, 1, 2, 3].every((b, k) => near(o[k * 2], b)),
      `at ${pct}% the beats must stay on 0,1,2,3 — got ${o.filter((_, i) => i % 2 === 0)}`);
    // ...and every & sits exactly `pct` of the way through its own beat.
    assert([0, 1, 2, 3].every((b, k) => near(o[k * 2 + 1], b + pct / 100)),
      `at ${pct}% each & should sit ${pct}% into its beat — got ${o.filter((_, i) => i % 2 === 1)}`);
  }
  // 67% is the reachable setting closest to true triplet swing (2:1); the
  // remaining error is 0.33% of an 8th, 1.7ms at 120bpm, inaudible.
  assert(Math.abs(slotOffsetsInBeats(120, 67).offsets[1] - 2 / 3) < 0.005,
    "67% must be within a rounding hair of true triplet swing");
});

check("metronome: a frozen page resyncs instead of replaying its backlog", () => {
  // Normal running: the scheduler always queues AHEAD of the audio clock, so
  // nothing here may ever count as drift.
  assert(!hasDrifted(10 + 0.2, 10), "a full schedule-ahead window is not drift");
  assert(!hasDrifted(10, 10), "landing exactly on the clock is not drift");
  assert(!hasDrifted(10 - 0.1, 10), "a brief timer hiccup is caught up normally, not resynced");
  // A locked screen or a slept laptop: seconds of missed slots, which the plain
  // catch-up loop would schedule in the past and Web Audio would fire at once.
  assert(hasDrifted(10 - 3, 10), "seconds behind is a freeze — drop the backlog");
  assert(MAX_DRIFT > secondsPerSlot(BPM_MAX), "the threshold must exceed one 8th at top speed");
});

check("capo: shape-first transposition names the concert key a guitarist would say", () => {
  // The everyday cases: a shape plus a capo sounds somewhere else.
  assert(soundingName("G", 2) === "A", "G shapes at capo 2 sound in A");
  assert(soundingName("G", 3) === "B♭", "capo 3 spells the flat, not A♯");
  // One spelling per pitch, and it's the guitarist's habit rather than a rule:
  // flats for E♭/B♭, sharps for C♯/F♯/G♯. Shared with the chord wheel's reel.
  assert(soundingName("E", 4) === "G♯", "pc 8 is G♯ here and on the wheel, not A♭");
  assert(soundingName("C", 1) === "C♯", "pc 1 is C♯ here and on the wheel, not D♭");
  assert(soundingName("C", 6) === "F♯", "F♯ by convention");
  assert(soundingName("G", 0) === "G", "capo 0 is the shape itself");
  // Quality suffixes survive: it's still a minor / still a dominant 7th.
  assert(soundingName("Am", 2) === "Bm", "a minor key stays minor");
  assert(soundingName("C7", 3) === "E♭7", "a dom7 stays a dom7");
  // Negatives are a down-tuned guitar, and the wrap is modular in both directions.
  assert(soundingName("E", -1) === "E♭", "tuned down a half step");
  assert(soundingName("C", -2) === "B♭", "tuned down a whole step wraps below C");
  assert(soundingName("nonsense", 1) === null, "an unreadable root reports null rather than guessing");

  // The range runs both ways: a physical capo can't go negative, but a
  // down-tuned guitar is the same transform.
  assert(CAPO_MIN < 0 && CAPO_MAX > 0, "the range spans down-tuning and real capo positions");
  assert(clampCapo(CAPO_MAX + 4) === CAPO_MAX && clampCapo(CAPO_MIN - 4) === CAPO_MIN, "out of range clamps");
  assert(clampCapo(undefined) === 0 && clampCapo(null) === 0, "an absent capo (a pre-capo save) reads as 0");
  assert(clampCapo("3") === 3 && clampCapo(2.4) === 2, "values arrive from the DOM as strings, and must be whole");

  // How it's SAID: a negative isn't a capo position, it's how the guitar is
  // tuned, so it gets the phrase a player uses.
  assert(capoLabel(0) === null, "capo 0 says nothing at all — the app looks untouched");
  assert(capoLabel(3) === "capo 3", "a real capo position");
  assert(capoLabel(-1) === "half-step down", "-1 is a half-step-down tuning, not 'capo -1'");
  assert(capoLabel(-2) === "whole step down", "-2 is a whole step down");
});

check("audio: pitch derives from string+fret in standard tuning", () => {
  // Open strings, low E (6) to high e (1).
  assert(OPEN_STRING_MIDI[6] === 40, "string 6 open is E2 (40)");
  assert(OPEN_STRING_MIDI[1] === 64, "string 1 open is E4 (64)");
  assert(midiOf({ string: 6, fret: 0 }) === 40, "6/0 -> 40");
  assert(midiOf({ string: 5, fret: 3 }) === 48, "5/3 (C) -> 48");
  assert(midiOf({ string: 1, fret: 12 }) === 76, "1/12 is an octave up -> 76");
  assert(midiOf({ string: 4 }) === 50, "missing fret defaults to open (0)");
  // A malformed event (no known string) yields NaN, which the synth skips —
  // better a silent note than a wrong pitch.
  assert(Number.isNaN(midiOf({ string: 9, fret: 0 })), "unknown string -> NaN");
  // The capo shifts pitch and nothing else — the fret in the event is the SHAPE
  // fret either way, which is what the grid draws and your fingers play.
  assert(midiOf({ string: 6, fret: 0 }, 2) === 42, "capo 2 raises the open 6th a whole step");
  assert(midiOf({ string: 5, fret: 3 }, -2) === 46, "a down-tuned guitar (capo -2) lowers it");
  assert(Number.isNaN(midiOf({ string: 9 }, 3)), "a capo can't rescue a malformed event");

  // Equal temperament: A4 (MIDI 69) is 440Hz, and an octave doubles frequency.
  assert(Math.abs(midiToFreq(69) - 440) < 1e-6, "MIDI 69 -> 440Hz");
  assert(Math.abs(midiToFreq(81) - 880) < 1e-6, "an octave up doubles to 880Hz");
  assert(midiToFreq(64) > 0, "a real note has a positive frequency");
});

check("audio: nylon and steel render different buffers, and nylon is darker", () => {
  // The tone toggle is audible-only, so this asserts the two things that could
  // silently break it. **The cache is the trap**: buffers are keyed and reused
  // per pitch, so a key that forgot the tone would hand the steel buffer back
  // forever after a switch and the toggle would do nothing for every pitch
  // already played. That's the regression this drives directly — same pitch,
  // both tones, in that order.
  const ctx = new OfflineAudioContext(1, 4410, 44100);
  const rendered = [];
  const makeSource = ctx.createBufferSource.bind(ctx);
  ctx.createBufferSource = () => {
    const src = makeSource();
    rendered.push(src);
    return src;
  };

  const synth = createStringSynth(ctx);
  synth.setTone("steel");
  synth.pluck(220, 0);
  synth.setTone("nylon");
  synth.pluck(220, 0); // SAME pitch: only the cache key's tone can separate these

  assert(rendered.length === 2, `expected 2 plucks, got ${rendered.length}`);
  const [steel, nylon] = rendered.map((s) => s.buffer.getChannelData(0));
  assert(steel.length && nylon.length, "both tones render a non-empty buffer");

  let identical = steel.length === nylon.length;
  if (identical) {
    for (let i = 0; i < steel.length; i++) {
      if (steel[i] !== nylon[i]) { identical = false; break; }
    }
  }
  assert(!identical, "nylon returned the cached steel buffer — the tone is missing from the cache key");

  // "Darker" is measurable, not a matter of opinion: mean absolute change
  // between adjacent samples is a crude high-frequency energy meter, and
  // nylon's whole point is fewer highs. Compared per-sample against each
  // voice's own peak, so the gain difference between them can't decide it.
  const brightness = (buf) => {
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    if (!peak) return 0;
    let delta = 0;
    for (let i = 1; i < buf.length; i++) delta += Math.abs(buf[i] - buf[i - 1]);
    return delta / (buf.length - 1) / peak;
  };
  assert(brightness(nylon) < brightness(steel),
    `nylon should carry less high-frequency energy (nylon ${brightness(nylon).toFixed(4)} vs steel ${brightness(steel).toFixed(4)})`);

  // An unknown id must not silently mute the app or throw mid-scheduler.
  synth.setTone("bouzouki");
  synth.pluck(220, 0);
  assert(rendered.length === 3 && rendered[2].buffer, "an unknown tone still plays, falling back rather than failing");
  assert(DEFAULT_TONE === "steel", "steel stays the default, so an upgrade doesn't change the sound underneath him");
});

check("audio: a high note still sustains on the darker tone", () => {
  // HIS EAR CAUGHT THIS AND NO TEST DID (session 44b: "maybe it lacks sustain
  // on the high notes"). It's structural, not a typo: the in-loop low-pass has
  // a FIXED cutoff, so a high note's own fundamental sits in its path and is
  // attenuated every round trip while a low note's passes underneath. The
  // darker the voice, the worse the tilt — which is why it showed up on nylon
  // and not steel. The first nylon shipped with a high A4 at 26% of steel's
  // level half a second in, and an E5 at 11%.
  //
  // Measured as AUDIBLE level (buffer RMS x the voice's own output gain), since
  // comparing bare buffers would flatter whichever voice is quieter. Averaged
  // over several renders because the pluck excitation is random per render.
  const SR = 44100, REPS = 12, AT = 0.5;
  const rmsAt = (data, t) => {
    const win = Math.round(SR * 0.02);
    const start = Math.round(t * SR);
    if (start + win > data.length) return 0;
    let s = 0;
    for (let j = 0; j < win; j++) s += data[start + j] * data[start + j];
    return Math.sqrt(s / win);
  };
  const level = (tone, freq) => {
    let sum = 0;
    for (let i = 0; i < REPS; i++) {
      const ctx = new OfflineAudioContext(1, 128, SR);
      let got = null;
      const make = ctx.createBufferSource.bind(ctx);
      ctx.createBufferSource = () => { const s = make(); got = s; return s; };
      const synth = createStringSynth(ctx);
      synth.setTone(tone);
      synth.pluck(freq, 0);
      sum += rmsAt(got.buffer.getChannelData(0), AT);
    }
    return (sum / REPS) * VOICES[tone].treble.gain;
  };

  // A4 and E5 — the top two strings, where he noticed it. The bar is 0.5x
  // steel: comfortably clear of where the tuned voice sits (~1.0–1.25x) and far
  // above where the broken one did (0.26x / 0.11x), so it fails on a real
  // regression without flagging ordinary tuning.
  for (const [name, freq] of [["A4", 440], ["E5", 659.26]]) {
    const ratio = level("nylon", freq) / level("steel", freq);
    assert(ratio > 0.5,
      `nylon ${name} holds only ${(ratio * 100).toFixed(0)}% of steel's level at ${AT}s — the darker voice is bleeding high notes`);
  }
  // And the mechanism itself: turning the tilt off must measurably shorten a
  // high note, or the knob isn't doing the job it was added for.
  const tuned = VOICES.nylon.treble.sustainTilt;
  assert(tuned > 0, "nylon's treble carries a sustain tilt");
  const withTilt = level("nylon", 659.26);
  VOICES.nylon.treble.sustainTilt = 0;
  const without = level("nylon", 659.26);
  VOICES.nylon.treble.sustainTilt = tuned;
  assert(without < withTilt,
    `sustainTilt should lengthen a high note (with ${withTilt.toFixed(5)}, without ${without.toFixed(5)})`);
});

// ---- custom dropdown (DOM; runs at import time in the test page) ----
// The invariant that makes the whole approach safe: the native <select> stays the
// source of truth. Enhancing it must not change its value semantics, and a pick
// must write select.value and fire exactly one bubbling `change` (so all the
// existing app.js wiring keeps working). A programmatic value set must sync the
// trigger label WITHOUT firing change — matching native behaviour.
check("dropdown: enhances a <select> but keeps it the source of truth", () => {
  const sel = document.createElement("select");
  for (const v of ["a", "b", "c"]) {
    const o = document.createElement("option");
    o.value = v; o.textContent = v.toUpperCase();
    sel.appendChild(o);
  }
  sel.value = "a";
  const host = document.createElement("div");
  host.appendChild(sel);
  document.body.appendChild(host);

  enhanceSelect(sel);
  const trigger = host.querySelector(".dd-trigger");
  const labelText = () => host.querySelector(".dd-label").textContent;
  assert(trigger, "a trigger is created");
  assert(labelText() === "A", "trigger shows the selected option");

  let changes = 0;
  sel.addEventListener("change", () => { changes++; });
  sel.value = "b";
  assert(labelText() === "B", "programmatic value set syncs the label");
  assert(changes === 0, "programmatic value set fires no change (like native)");

  trigger.click();
  const opts = [...document.querySelectorAll(".dd-panel .dd-option")];
  assert(opts.length === 3, "panel lists every option");
  opts.find((o) => o.textContent === "C").click();
  assert(sel.value === "c", "choosing an option writes select.value");
  assert(changes === 1, "choosing an option fires exactly one change");
  assert(labelText() === "C", "trigger updates to the chosen option");
  assert(!document.querySelector(".dd-panel"), "panel closes after a pick");
  host.remove();
});

// The grouped menus (keys, chords, progressions) rely on <optgroup> rendering as
// a non-selectable section header in the custom panel.
check("dropdown: renders optgroup section headers", () => {
  const sel = document.createElement("select");
  const og = document.createElement("optgroup");
  og.label = "Group A";
  for (const v of ["a", "b"]) {
    const o = document.createElement("option");
    o.value = v; o.textContent = v.toUpperCase();
    og.appendChild(o);
  }
  sel.appendChild(og);
  sel.value = "a";
  const host = document.createElement("div");
  host.appendChild(sel);
  document.body.appendChild(host);

  enhanceSelect(sel);
  host.querySelector(".dd-trigger").click();
  const groups = [...document.querySelectorAll(".dd-panel .dd-group")];
  assert(groups.length === 1 && groups[0].textContent === "Group A", "an optgroup renders one header");
  assert(document.querySelectorAll(".dd-panel .dd-option").length === 2, "options under the group render");

  document.querySelector(".dd-catcher")?.click(); // close for a clean DOM
  assert(!document.querySelector(".dd-panel"), "panel closes");
  host.remove();
});

// ---- the chord wheel (DOM) ----
// THESE THREE DRIVE REAL SCROLLS AND WAIT FOR REAL SETTLES, so they were the
// only expensive checks in the suite: ~19s of the run, and in a throttled tab
// (which clamps every timer) they stalled the whole page and one of them flaked
// outright — reporting a stale reel value as a failure. `settleMs` is injectable
// for exactly this; the app never passes it and 110ms is still the feel. Waiting
// a hair over the injected settle is what the test is actually waiting for, so
// the wait is derived from it rather than being a second magic number.
const WHEEL_SETTLE_MS = 1;
const afterSettle = () => new Promise((r) => setTimeout(r, WHEEL_SETTLE_MS + 15));
// It's a RENDERER over the same hidden <select>, so the contract it has to keep
// is the dropdown's contract: the select stays the source of truth and a pick
// fires exactly one bubbling `change`. What's specific to the wheel is that a
// chord is TWO positions, and that the panel deliberately stays open after a
// pick (his call — every root × quality is valid, so you can spin one reel,
// hear it, then spin the other).
acheck("wheel: two reels write one chord id, and the panel stays open", async () => {
  const sel = document.createElement("select");
  for (const id of CHORD_IDS) {
    const o = document.createElement("option");
    o.value = id; o.textContent = CHORDS[id].name;
    sel.appendChild(o);
  }
  sel.value = "E";
  const host = document.createElement("div");
  host.appendChild(sel);
  document.body.appendChild(host);

  let ticks = 0;
  enhanceSelect(sel, { render: createChordWheel({ tick: () => { ticks++; }, settleMs: WHEEL_SETTLE_MS }) });
  const trigger = host.querySelector(".dd-trigger");
  trigger.click();

  const panel = document.querySelector(".dd-panel.dd-wheel");
  assert(panel, "the chord select opens the wheel, not a list");
  const rootCells = [...panel.querySelectorAll(".reel-root .reel-item")];
  const qualityCells = [...panel.querySelectorAll(".reel-quality .reel-item")];
  assert(rootCells.length === 12, `root reel carries 12 names, got ${rootCells.length}`);
  assert(qualityCells.length === QUALITIES.length,
    `quality reel carries ${QUALITIES.length} names, got ${qualityCells.length}`);
  assert(rootCells.map((c) => c.textContent).join(" ") === ROOTS.map((r) => r.name).join(" "),
    "the root reel is printed in wheel order");
  // The quality reel is GROUPED now (session 30): one engraved header per section,
  // in QUALITIES order. The root reel is ungrouped, so it carries none.
  const qHeads = [...panel.querySelectorAll(".reel-quality .reel-head")].map((h) => h.textContent);
  const wantHeads = [...new Set(QUALITIES.map((q) => q.group))];
  assert(qHeads.join() === wantHeads.join(), `quality sections: got ${qHeads}, want ${wantHeads}`);
  assert(panel.querySelectorAll(".reel-root .reel-head").length === 0, "the root reel stays ungrouped");
  assert(!panel.querySelector(".dd-option"), "no list options are rendered alongside the reels");
  // TWO DRUMS, not one split list (his call): each cylinder gets its own
  // housing, its own aperture and its own legend, with an axle line between.
  assert(panel.querySelectorAll(".drum").length === 2, "two separate drums");
  assert(panel.querySelector(".drum-root .drum-window") && panel.querySelector(".drum-quality .drum-window"),
    "each drum has its own aperture");
  assert(panel.querySelector(".wheel-split"), "an axle line runs between them");
  // Nothing but the mechanism in the housing (his call): the Options field
  // already says Chord / Quality above the trigger. The reels keep their
  // aria-labels, which is where that naming has to survive.
  assert(!panel.textContent.includes("Quality"), "no captions inside the panel");
  assert(panel.querySelector(".reel-quality").getAttribute("aria-label") === "Quality",
    "…but the reel is still named for assistive tech");
  assert(panel.dataset.hug === "1", "the panel sizes to its drums, not to the trigger it came from");

  // A reel commits by settling, which a tap sets in motion; the test drives the
  // settle directly because a smooth scroll never completes in a hidden tab.
  let changes = 0;
  sel.addEventListener("change", () => { changes++; });
  // Drive the reel to the "Minor" detent. scrollTop is overridden rather than
  // assigned because this page carries no stylesheet (by design — see the
  // name-row check), so the reel has no height and nothing to scroll. What's
  // under test is the wheel's own logic: which name is in the window, the
  // detent, and the settle. The quality reel is GROUPED now (Triads/Sevenths/…),
  // so a "Triads" header sits at row 0 and Minor is ROW 2.
  const reel = panel.querySelector(".reel-quality");
  Object.defineProperty(reel, "scrollTop", { value: 2 * 38, writable: true }); // row 2 = Minor; ITEM_H=38
  reel.dispatchEvent(new Event("scroll"));
  assert(ticks === 1, `a name passing the window ticks once, got ${ticks}`);
  await afterSettle();
  assert(sel.value === "Em", `settling on Minor over root E should give Em, got ${sel.value}`);
  assert(changes === 1, `one bubbling change per settle, got ${changes}`);
  assert(document.querySelector(".dd-wheel"), "the panel stays open after a pick");
  assert(host.querySelector(".dd-label").textContent === "Em", "the trigger follows");
  document.querySelector(".dd-catcher")?.click();
  host.remove();
});

// KEY × PROGRESSION is the same mechanism over TWO selects (v2.14.5, his call:
// "I see Key and Progression as a cross product similar to Chord and Quality.
// 'Let's play an E Major', 'Let's play a 1-4-5 in C'"). Two things make it differ
// from the chord wheel and both are pinned here: the key reel writes to a second
// select through its own committer, and the pair is only total WITHIN a mode — so
// crossing the major/minor line has to re-cut the progression reel.
acheck("wheel: key × progression drives two selects, and re-cuts on a mode change", async () => {
  const MAJOR = [["maj_1_5", "I–V"], ["maj_1_4", "I–IV"]];
  const MINOR = [["min_1_7", "i–VII"], ["min_1_7_6", "i–VII–VI"]];
  const host = document.createElement("div");
  document.body.appendChild(host);

  const keySel = document.createElement("select");
  // grouped, so the drum can engrave a groove at the major/minor boundary
  for (const [label, ids] of [["Major", ["C", "G"]], ["Minor", ["Am"]]]) {
    const g = document.createElement("optgroup");
    g.label = label;
    for (const k of ids) {
      const o = document.createElement("option");
      o.value = k; o.textContent = k;
      g.appendChild(o);
    }
    keySel.appendChild(g);
  }
  keySel.value = "C";

  const progSel = document.createElement("select");
  const fill = (rows) => {
    const g = document.createElement("optgroup");
    g.label = "Foundations";
    progSel.replaceChildren(g);
    for (const [v, t] of rows) {
      const o = document.createElement("option");
      o.value = v; o.textContent = t;
      g.appendChild(o);
    }
    const custom = document.createElement("option");
    custom.value = "custom"; custom.textContent = "Custom";
    progSel.appendChild(custom); // ungrouped, so it gets its own groove
  };
  fill(MAJOR);
  progSel.value = "maj_1_5";
  host.append(keySel, progSel);

  // Stand in for app.js's setKey: crossing the mode line refills the progression
  // menu and lands on that mode's first preset, exactly as the real one does.
  let keyCommits = 0;
  const commitKey = (v) => {
    if (keySel.value === v) return false;
    const wasMinor = keySel.value === "Am";
    keySel.value = v;
    keyCommits++;
    const isMinor = v === "Am";
    if (isMinor !== wasMinor) {
      fill(isMinor ? MINOR : MAJOR);
      progSel.value = (isMinor ? MINOR : MAJOR)[0][0];
    }
    return true;
  };

  enhanceSelect(progSel, {
    render: createKeyProgWheel({ keySelect: () => keySel, commitKey, settleMs: WHEEL_SETTLE_MS }),
    label: keyProgSplitLabel(() => keySel),
    watch: [keySel],
  });
  host.querySelector(".dd-trigger").click();
  const panel = document.querySelector(".dd-panel.dd-wheel");
  assert(panel, "the progression select opens the wheel, not a list");
  assert(panel.classList.contains("wheel-keyprog"), "the panel declares its variant so CSS can re-split the drums");
  assert(panel.querySelectorAll(".drum").length === 2, "two drums");

  const heads = (reelCls) => [...panel.querySelectorAll(`.reel-${reelCls} .reel-head`)].map((h) => h.textContent);
  const groove = (reelCls) => [...panel.querySelectorAll(`.reel-${reelCls} .reel-item`)]
    .map((c) => c.querySelector(".reel-face").classList.contains("group-start"));
  // SECTION HEADERS ON THE DRUM (session 29, his call B): a NAMED group prints a
  // non-selectable header facet riding the barrel; the UNNAMED break (the ungrouped
  // Custom after the styles) keeps the older machined groove, since there's no name
  // to engrave.
  assert(heads("key").join() === "Major,Minor",
    `the key drum names its sections, got ${heads("key")}`);
  assert(heads("prog").join() === "Foundations",
    `the progression drum names its styles, got ${heads("prog")}`);
  assert(groove("prog").join() === "false,false,true",
    `Custom keeps a plain groove (no name to engrave), got ${groove("prog")}`);
  // Headers are NOT scroll-snap options: .reel-item stays 1:1 with the <select>, so
  // index/commit/list() are unaffected. This is the whole invariant of design B.
  assert(panel.querySelectorAll(".reel-prog .reel-item").length === 3,
    "a header must not become a selectable option");

  // This page carries no stylesheet (by design — see the name-row check), so the
  // reels have no height and nothing to scroll; scrollTop has to be stubbed. It's
  // stubbed as a real ACCESSOR with scrollTo wired to it, not as a fixed value:
  // the wheel re-cuts a reel by calling scrollTo, and a shadowing data property
  // silently swallowed that — the reel kept the scroll position of the previous,
  // longer list. What's under test is the wheel's own logic (which name is in the
  // window, the detent, the settle), so the stub has to behave like a scroller.
  const stub = (reel) => {
    let top = 0;
    Object.defineProperty(reel, "scrollTop", {
      configurable: true,
      get: () => top,
      set: (v) => { top = v; },
    });
    reel.scrollTo = ({ top: t }) => { top = t; };
  };
  for (const r of panel.querySelectorAll(".reel")) stub(r);

  const spin = async (reelCls, i) => {
    const reel = panel.querySelector(`.reel-${reelCls}`);
    reel.scrollTop = i * 38; // ITEM_H in wheel.js
    reel.dispatchEvent(new Event("scroll"));
    await afterSettle();
  };

  // The progression reel writes the panel's OWN select. Rows now interleave a
  // header, so maj_1_4 sits at ROW 2 ([H:Foundations, maj_1_5, maj_1_4, Custom]).
  await spin("prog", 2);
  assert(progSel.value === "maj_1_4", `progression reel should set the progression, got ${progSel.value}`);
  assert(keySel.value === "C", "…and must not touch the key");

  // The key reel writes the OTHER one, through commitKey. Rows are
  // [H:Major, C, G, H:Minor, Am], so G is ROW 2.
  await spin("key", 2);
  assert(keySel.value === "G" && keyCommits === 1, `key reel should set the key, got ${keySel.value}`);

  // Crossing into minor re-cuts the progression reel. Without that, the drum keeps
  // showing major progressions the select can no longer hold. Am is ROW 4.
  await spin("key", 4);
  assert(keySel.value === "Am", `key reel should reach Am, got ${keySel.value}`);
  const names = [...panel.querySelectorAll(".reel-prog .reel-item")].map((c) => c.textContent);
  assert(names.join() === "i–VII,i–VII–VI,Custom",
    `the progression drum must be re-cut for the new mode, got ${names}`);
  const inWindow = panel.querySelector(".reel-prog .reel-item.in-window");
  assert(inWindow && inWindow.textContent === "i–VII",
    `the re-cut reel sits on the new selection, got ${inWindow && inWindow.textContent}`);

  // The face shows BOTH halves, and the key one refreshes even though nothing
  // fired a `change` on it (that's what `watch` is for).
  const halves = [...host.querySelectorAll(".dd-label .tl-half")].map((h) => h.textContent);
  assert(halves.join() === "Am,i–VII", `the trigger shows both halves, got ${halves}`);

  // Teardown, not an assertion — hence the `?.`. An open panel closes on any
  // window `resize` (dropdown.js's reflow), so anything that resizes the window
  // WHILE this runs takes the catcher with it and the teardown throws a null
  // deref that reads like a wheel bug and isn't one. On the dev box that's the
  // Browser pane: taking a screenshot mid-run is enough to do it.
  document.querySelector(".dd-catcher")?.click();
  host.remove();
});

// The per-bar chord selects are rebuilt by every render(), and picking a chord
// IS a render — so the first pick from an open wheel destroyed the element the
// panel was writing to. The panel stayed up, the reels still turned and ticked,
// and nothing happened: one change, then you had to close and reopen. Exactly
// the wrong behaviour on a control whose point is spinning to the right answer.
acheck("wheel: a pick that rebuilds the select keeps the panel working", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);

  // Stand in for renderGrid: throw the select away and build a fresh one.
  const build = (value) => {
    host.replaceChildren();
    const sel = document.createElement("select");
    sel.className = "bar-chord";
    sel.dataset.bar = "1";
    for (const id of CHORD_IDS) {
      const o = document.createElement("option");
      o.value = id; o.textContent = CHORDS[id].name;
      sel.appendChild(o);
    }
    sel.value = value;
    host.appendChild(sel);
    enhanceSelect(sel, { render: createChordWheel({ settleMs: WHEEL_SETTLE_MS }) });
    // …and re-point any open panel at the replacement, the way app.js does.
    retargetOpenPanel((old) => host.querySelector(`select.bar-chord[data-bar="${old.dataset.bar}"]`));
    return sel;
  };

  let current = build("E");
  const rebuild = () => { current = build(current.value); };
  host.addEventListener("change", rebuild);

  host.querySelector(".dd-trigger").click();
  const panel = document.querySelector(".dd-panel.dd-wheel");
  const root = panel.querySelector(".reel-root");
  const spin = async (i) => {
    Object.defineProperty(root, "scrollTop", { value: i * 38, writable: true, configurable: true });
    root.dispatchEvent(new Event("scroll"));
    await afterSettle();
  };

  await spin(5); // E -> F
  assert(current.value === "F", `first pick should land on F, got ${current.value}`);
  await spin(7); // …and again, from the SAME open panel
  assert(current.value === "G",
    `second pick from the same panel should land on G, got ${current.value} (the panel lost its select)`);
  assert(document.querySelector(".dd-wheel"), "and the panel is still open");

  document.querySelector(".dd-catcher")?.click();
  host.remove();
});

// ---- platform integrations (wake lock / audio session / app updater) ----
// All three take injected `nav`/`doc` for exactly this reason: the real APIs are
// device-only (and the wake lock can't even be observed from a hidden preview
// tab), so the LOGIC is tested against stubs and only the physical behaviour
// needs a phone.
function fakeDoc(visibilityState = "visible") {
  const listeners = {};
  return {
    visibilityState,
    addEventListener(t, fn) { (listeners[t] ||= []).push(fn); },
    removeEventListener(t, fn) { listeners[t] = (listeners[t] || []).filter((f) => f !== fn); },
    fire(t) { for (const fn of listeners[t] || []) fn(); },
  };
}

check("platform: audio session claims playback only while the transport runs", () => {
  const nav = { audioSession: { type: "auto" } };
  const session = createAudioSession({ nav });
  assert(session.supported, "detects the API");
  session.setPlayback(true);
  assert(nav.audioSession.type === "playback", "playing takes the category that ignores the silent switch");
  session.setPlayback(false);
  assert(nav.audioSession.type === "auto", "stopping hands the previous category back");

  // Unsupported (every non-WebKit browser, and older Safari): a silent no-op.
  const none = createAudioSession({ nav: {} });
  assert(!none.supported && none.setPlayback(true) === null, "degrades to a no-op without the API");
});

check("platform: playback ends when the page stops being visible", () => {
  const doc = fakeDoc();
  const win = fakeDoc(); // same listener stub; only its `pagehide` is used
  let stops = 0;
  const guard = createPlaybackGuard({ doc, win, onHidden: () => { stops++; } });

  guard.start();
  guard.start(); // idempotent — must not double-subscribe
  doc.fire("visibilitychange");
  assert(stops === 0, "still visible: a visibilitychange alone must not stop a take");

  doc.visibilityState = "hidden";
  doc.fire("visibilitychange");
  assert(stops === 1, "going hidden (screen lock, app switch) stops playback exactly once");

  // The exits that never report a visibility change: bfcache, termination.
  win.fire("pagehide");
  assert(stops === 2, "pagehide stops playback too");

  guard.stop();
  doc.fire("visibilitychange");
  win.fire("pagehide");
  assert(stops === 2, "stop unsubscribes");
});

// ---- async PWA checks ----
// (`acheck` itself is declared beside `check` at the top, so an async check can
// sit next to the sync ones it belongs with — the wheel's does.)

acheck("platform: wake lock is re-acquired after the app goes to the background", async () => {
  let requests = 0;
  let denyFirst = true;
  const nav = {
    wakeLock: {
      request: async () => {
        requests++;
        if (denyFirst) { denyFirst = false; throw new Error("needs user activation"); }
        return { release: async () => {}, addEventListener() {} };
      },
    },
  };
  const doc = fakeDoc();
  const lock = createWakeLock({ nav, doc });

  await lock.start();
  assert(requests === 1 && !lock.held, "a denied first request (no activation yet) is survivable");
  doc.fire("pointerdown"); // the retry path: first tap gives us activation
  await Promise.resolve(); await Promise.resolve();
  assert(lock.held, "acquired on the first gesture");

  // Backgrounding: the OS drops the lock, so returning must take a NEW one.
  doc.visibilityState = "hidden";
  doc.fire("visibilitychange");
  assert(!lock.held, "the lock is considered gone while hidden");
  doc.visibilityState = "visible";
  doc.fire("visibilitychange");
  await Promise.resolve(); await Promise.resolve();
  assert(lock.held && requests === 3, "re-acquired on return to the foreground");

  await lock.stop();
  assert(!lock.held, "stop releases it");

  const none = createWakeLock({ nav: {}, doc: fakeDoc() });
  assert(!none.supported && (await none.start()) === null, "degrades to a no-op without the API");
});

acheck("platform: updater bypasses the HTTP cache and reloads only on a real update", async () => {
  const make = ({ controller = null, canReload = () => true } = {}) => {
    const listeners = {};
    const calls = { register: [], update: 0, reloads: 0 };
    const nav = {
      serviceWorker: {
        controller,
        addEventListener(t, fn) { (listeners[t] ||= []).push(fn); },
        register: async (url, opts) => { calls.register.push({ url, opts }); return { update: async () => { calls.update++; } }; },
      },
    };
    const doc = fakeDoc();
    const updater = createAppUpdater({ nav, doc, canReload, reload: () => { calls.reloads++; } });
    return { calls, doc, updater, fire: (t) => { for (const fn of listeners[t] || []) fn(); } };
  };

  // First install: nothing on screen is stale, so claiming control must NOT reload.
  const fresh = make();
  await fresh.updater.start("sw.js");
  assert(fresh.calls.register[0].opts.updateViaCache === "none",
    "the worker script itself must bypass the HTTP cache, or a launch never sees a new deploy");
  fresh.fire("controllerchange");
  assert(fresh.calls.reloads === 0, "first install does not reload");

  // Returning to the foreground is when a standalone app checks for a deploy.
  fresh.doc.fire("visibilitychange");
  await Promise.resolve();
  assert(fresh.calls.update === 1, "checks for an update on resume");

  // An already-controlled page whose worker was replaced IS stale: reload once.
  const stale = make({ controller: {} });
  await stale.updater.start();
  stale.fire("controllerchange");
  stale.fire("controllerchange");
  assert(stale.calls.reloads === 1, "a new worker taking over reloads exactly once");

  // ...unless reloading would destroy work or cut a take in half.
  const busy = make({ controller: {}, canReload: () => false });
  await busy.updater.start();
  busy.fire("controllerchange");
  assert(busy.calls.reloads === 0, "unsaved edits / a running transport veto the reload");
});

acheck("modal: confirm/prompt resolve to the pressed action", async () => {
  const okP = confirmModal({ message: "ok?" });
  document.querySelector(".tp-modal-ok").click();
  assert((await okP) === true, "OK resolves true");

  const cancelP = confirmModal({ message: "no?" });
  document.querySelector(".tp-modal-cancel").click();
  assert((await cancelP) === false, "Cancel resolves false");

  const namedP = promptModal({ message: "name?", value: "old" });
  const input = document.querySelector(".tp-modal-input");
  assert(input.value === "old", "prompt pre-fills the given value");
  input.value = "new";
  document.querySelector(".tp-modal-ok").click();
  assert((await namedP) === "new", "prompt returns the typed value");

  const nullP = promptModal({ message: "name?" });
  document.querySelector(".tp-modal-cancel").click();
  assert((await nullP) === null, "prompt returns null on cancel");

  assert(!document.querySelector(".tp-modal"), "no dialog left mounted");
});

// ---- help mode ----
// The mode's whole promise is "tap anything and you'll get an explanation", so
// the failure that matters is a control pointing at copy that doesn't exist:
// the tap does nothing at all, and nothing on screen says why.
acheck("help: every data-help target has copy, and every entry is reachable", async () => {
  const res = await fetch("index.html");
  assert(res.ok, "index.html should be served");
  const html = await res.text();
  // Every annotated control is in the markup again as of v2.13.6. It briefly
  // wasn't: the per-bar chord picker carried a key set in grid.js, and this
  // scan had to read that file too. If a RENDERED control is ever annotated
  // again, widen the scan or its entry reads as unreachable copy.
  const used = [...html.matchAll(/data-help="([^"]+)"/g)].map((m) => m[1]);

  assert(used.length > 20, `expected help on most controls, found ${used.length}`);
  const dupes = used.filter((k, i) => used.indexOf(k) !== i);
  assert(!dupes.length, `duplicate data-help keys: ${dupes.join(", ")}`);

  const orphanTargets = used.filter((k) => !HELP[k]);
  assert(!orphanTargets.length,
    `controls point at missing help copy (tapping them would do nothing): ${orphanTargets.join(", ")}`);

  const unusedCopy = HELP_KEYS.filter((k) => !used.includes(k));
  assert(!unusedCopy.length, `help copy nothing can reach: ${unusedCopy.join(", ")}`);

  // The mode announces itself on the "?" it was armed from.
  assert(HELP["help-mode"], "help mode needs its own entry card");
  const bad = HELP_KEYS.filter((k) => !HELP[k].title || !HELP[k].body);
  assert(!bad.length, `help entries missing title/body: ${bad.join(", ")}`);
});

check("help: navigation survives, everything else becomes educational", () => {
  // If the gear, the page tabs and the ✕ didn't keep working, every control in
  // the Options sheet — over half of them — would be unreachable to explain.
  // open-save/open-load joined this list in session 43, same reasoning: the
  // Save/Load sheet grew real content (folders, built-ins, export/import/
  // restore) worth explaining individually, so the pill is a doorway now, not
  // a terminal card, exactly like the gear.
  const frag = document.createElement("div");
  frag.innerHTML =
    '<button id="open-options"></button>' +
    '<button id="open-save"></button><button id="open-load"></button>' +
    '<button id="tab-setup"></button><button id="tab-prefs"></button>' +
    '<button data-close></button>' +
    '<button id="open-help" data-help="help-mode">?</button>' +
    '<button id="play" data-help="play"><svg></svg></button>' +
    '<div class="help-pop"><p>x</p></div>' +
    '<button id="stray"></button>';

  for (const id of ["open-options", "open-save", "open-load", "tab-setup", "tab-prefs", "open-help"]) {
    assert(isNav(frag.querySelector("#" + id)), `#${id} must keep working in help mode`);
  }
  assert(isNav(frag.querySelector("[data-close]")), "the sheet's close control must keep working");
  assert(isNav(frag.querySelector(".help-pop p")), "a tap inside the card must reach the card");
  assert(!isNav(frag.querySelector("#play")), "Play must become educational, not stay live");
  assert(!isNav(frag.querySelector("#stray")), "an unlisted control must not stay live");

  // A tap lands on the SVG inside a button; the entry belongs to the ancestor.
  const hit = helpTargetFor(frag.querySelector("#play svg"));
  assert(hit && hit.key === "play", "a tap inside a control resolves to its help entry");
  assert(hit.anchor === frag.querySelector("#play"), "the card anchors to the control, not the glyph");
  assert(helpTargetFor(frag.querySelector("#stray")) === null, "an unannotated control has no card");
});

acheck("help: arming intercepts input; disarming gives every control back", async () => {
  // Measured, not assumed: a capture-phase CLICK listener stops a <label> from
  // toggling its hidden checkbox, but does NOT stop a drag on <input
  // type="range"> — the BPM and Swing sliders moved anyway until pointerdown was
  // intercepted too. This test is that finding, frozen.
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:0";
  host.innerHTML =
    '<button id="open-help" data-help="help-mode">?</button>' +
    '<label class="lamp" data-help="click-toggle"><input id="l" type="checkbox"></label>' +
    '<input id="r" type="range" min="40" max="240" value="90" data-help="bpm">' +
    '<button id="open-options">gear</button>';
  document.body.appendChild(host);

  const helper = createHelp({ version: "vTEST" });
  const box = host.querySelector("#l");
  const range = host.querySelector("#r");
  let gearClicks = 0;
  let lampClicks = 0;
  host.querySelector("#open-options").addEventListener("click", () => { gearClicks++; });
  box.addEventListener("click", () => { lampClicks++; });

  // An armed controller holds document-level capture listeners, so a failing
  // assert must still tear it down — otherwise it swallows every later test's
  // clicks and takes the whole run down with it.
  try {
    box.click();
    assert(box.checked, "the lamp toggles normally when help mode is off");
    box.checked = false;

    helper.arm();
    assert(document.body.classList.contains("help-on"), "arming marks the body");
    assert(helper._shownKey() === "help-mode", "arming opens the mode's own card");
    assert(document.querySelector(".help-pop-version"), "the entry card carries the version");

    const before = lampClicks;
    host.querySelector("label.lamp").click();
    assert(!box.checked, "a lamp must NOT toggle while help mode is armed");
    assert(lampClicks === before, "the lamp's own handler must not run");
    assert(helper._shownKey() === "click-toggle", "tapping it shows its card instead");

    // The slider, and note WHAT is asserted. A synthetic PointerEvent cannot
    // drive a native range drag at all, so checking `range.value` here would
    // pass with no interception whatsoever — vacuous. Cancelling the pointerdown
    // is the actual mechanism that stops the drag, and that IS observable.
    // Verified against the real thing first: with click-capture alone and a real
    // drag, the BPM slider ran 90 → 240 with help mode armed.
    const pd = new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, buttons: 1,
    });
    range.dispatchEvent(pd);
    assert(pd.defaultPrevented,
      "pointerdown on a slider must be cancelled — a click-capture listener cannot stop a native range drag");

    host.querySelector("#open-options").click();
    assert(gearClicks === 1, "the gear must still open Options while help mode is armed");
    // …and navigation takes the card with it: it was anchored to something that
    // has now moved or gone. Closing the sheet used to leave a card floating
    // over the grid pointing at a hidden control.
    assert(helper._shownKey() === null, "a navigation tap must dismiss the open card");
  } finally {
    helper.disarm();
  }

  assert(!document.body.classList.contains("help-on"), "disarming clears the body class");
  assert(!document.querySelector(".help-pop"), "disarming closes the card");
  assert(!document.querySelector(".help-target"), "disarming clears the highlight");
  box.click();
  assert(box.checked, "every control works again after disarming");
  host.remove();
});

check("help: a disabled control is still explainable (the empty-library trap)", () => {
  // A disabled button emits NO click, so it would be a dead tap. Export (in
  // the Load sheet's revealed library menu) is disabled exactly when the
  // library is empty, which is the first-run state and the likeliest moment
  // to be reading help. (Until session 41 this example was the Load pill
  // itself; Built-in patterns made it almost never disabled, and session 43
  // made it nav rather than a help target at all, so Export took over as the
  // canonical case — same underlying trap, found in-browser rather than
  // reasoned about: tapping a disabled target in help mode showed the
  // PREVIOUS card.)
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:0";
  host.innerHTML =
    '<button id="open-help" data-help="help-mode">?</button>' +
    '<button id="export-btn" data-help="export-btn" disabled>export</button>' +
    '<div class="field" data-help="capo"><button id="cd" data-capo-step="-1" disabled>-</button></div>';
  document.body.appendChild(host);

  const helper = createHelp({ version: "vTEST" });
  const exportBtn = host.querySelector("#export-btn");
  const step = host.querySelector("#cd");

  try {
    helper.arm();
    assert(!exportBtn.disabled, "a disabled control must become tappable while help mode is armed");
    assert(exportBtn.getAttribute("aria-disabled") === "true", "…but must still read as disabled to assistive tech");
    assert(!step.disabled, "a disabled control nested under a help target is lifted too");

    exportBtn.click();
    assert(helper._shownKey() === "export-btn", "tapping the disabled Export button shows ITS card");
    step.click();
    assert(helper._shownKey() === "capo", "a disabled end-stop resolves to its field's card");
  } finally {
    helper.disarm();
  }

  assert(exportBtn.disabled && step.disabled, "disabling is restored on exit, or the app forgets its own state");
  assert(!exportBtn.hasAttribute("aria-disabled"), "the aria stand-in is cleaned up too");
  host.remove();
});

check("help: the highlight rings the visible child, not the reserved slot", () => {
  // #chord-head reserves a full-width 28px box so the grid can't move, and puts
  // either a 40px chord glyph (which overflows it upward) or a text-width run of
  // numerals inside it. One explanation covers both, but ringing the CONTAINER
  // outlined the same wide short box in both modes — in single mode, mostly
  // empty space under the chord it claimed to be pointing at.
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:0;width:300px";
  host.innerHTML =
    '<div id="ch" data-help="chord-head" data-help-ring=".c, #ctx" style="display:flex;height:28px">' +
    '<span class="c" style="font-size:40px">C</span>' +
    '<span id="ctx">I &ndash; V &ndash; vi &ndash; IV</span></div>' +
    '<button id="p" data-help="play"><svg></svg></button>';
  document.body.appendChild(host);

  const head = host.querySelector("#ch");
  const chord = host.querySelector(".c");
  const ctx = host.querySelector("#ctx");

  try {
    // Single mode: the numerals are hidden, so the chord glyph takes the ring.
    ctx.hidden = true;
    let hit = helpTargetFor(chord);
    assert(hit.key === "chord-head", "both children share the one explanation");
    assert(hit.anchor === chord, "single mode must ring the chord, not the slot around it");
    // A tap anywhere in the slot resolves the same way — you aim at the glyph.
    assert(helpTargetFor(head).anchor === chord, "a tap on the slot itself still rings what's showing");

    // Progression mode: the swap happens with no mode flag reaching help.js.
    ctx.hidden = false;
    chord.hidden = true;
    hit = helpTargetFor(chord.parentNode);
    assert(hit.anchor === ctx, "progression mode must ring the readout, not the slot around it");

    // An unringed control is unaffected — the anchor is the annotated element.
    assert(helpTargetFor(host.querySelector("#p svg")).anchor === host.querySelector("#p"),
      "a control with no data-help-ring still anchors to itself");

    // And a ring that matches nothing rendered falls back rather than vanishing:
    // this is the state before enhanceAll() has built a dropdown's .dd wrapper.
    head.dataset.helpRing = ".nothing-here";
    assert(helpTargetFor(chord).anchor === head, "an unmatched ring falls back to the annotated element");
  } finally {
    host.remove();
  }
});

check("help: an unannotated indicator falls through to the control it sits in", () => {
  // Two things have no card ON PURPOSE and rely on where they're nested: the
  // beat lamp resolves to Tempo, and a bar's chord picker resolves to the grid.
  // Both are one DOM move away from being dead taps in a mode whose promise is
  // "tap anything", and the old Guide's failure was exactly this kind of drift.
  const frag = document.createElement("div");
  frag.innerHTML =
    '<div class="slider-wrap" data-help="bpm"><input type="range">' +
    '<div class="bpm-readout"><span id="beat-lamp"></span><output>90</output> BPM</div></div>' +
    '<section id="grid" data-help="grid"><div class="grid-track"><div class="bar">' +
    '<div class="bar-header">' +
    '<span class="dd"><select class="bar-chord"></select><button class="dd-trigger">C</button></span>' +
    "</div></div></div></section>";

  const lamp = helpTargetFor(frag.querySelector("#beat-lamp"));
  assert(lamp && lamp.key === "bpm", "the beat lamp must resolve to the Tempo card, not nothing");

  // The picker is reached through the OVERLAY button, never the hidden <select>:
  // dropdown.js makes the trigger a SIBLING of the select, so only the ancestors
  // of the trigger matter here.
  const picker = helpTargetFor(frag.querySelector(".dd-trigger"));
  assert(picker && picker.key === "grid", "a bar's chord picker must resolve to the grid card");
  // …and the grid's copy has to actually COVER them, or this is the v2.13.4 bug
  // again: the picker fell through to a card that said nothing about chords.
  assert(/chord/i.test(HELP.grid.body),
    "the grid card must mention the per-bar chords, since they fall through to it");
});

check("help: a blank line in a body becomes a real paragraph", () => {
  // The grid's card is two paragraphs — the picking rows, then the per-bar chord
  // pickers. Rendered as one <p> the blank line collapses and they run together.
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:0";
  host.innerHTML = '<button id="open-help" data-help="help-mode">?</button>' +
    '<button id="g" data-help="grid">grid</button>' +
    '<button id="one" data-help="play">play</button>';
  document.body.appendChild(host);

  const helper = createHelp({ version: "vTEST" });
  try {
    helper.arm();
    host.querySelector("#g").click();
    const paras = [...document.querySelectorAll(".help-pop-body")].map((p) => p.textContent);
    assert(paras.length === 2, `the grid card should render 2 paragraphs, got ${paras.length}`);
    assert(paras.every((t) => t && !/^\s|\s$/.test(t)), "each paragraph is trimmed");
    assert(!paras.some((t) => t.includes("\n")), "a paragraph must not still carry its own break");

    // A single-paragraph body is unaffected — one <p>, same as before.
    host.querySelector("#one").click();
    assert(document.querySelectorAll(".help-pop-body").length === 1,
      "a one-paragraph body still renders as exactly one paragraph");
  } finally {
    helper.disarm();
  }
  host.remove();
});

check("help: tapping the same control again puts its card away", () => {
  // The card has no ✕. It goes away when you tap the faceplate, tap the card, or
  // tap the thing it's about — and the last is the one your finger is already on.
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:0";
  host.innerHTML =
    '<button id="open-help" data-help="help-mode">?</button>' +
    '<button id="a" data-help="play">play</button>' +
    '<button id="b" data-help="generate">roll</button>';
  document.body.appendChild(host);

  const helper = createHelp({ version: "vTEST" });
  const a = host.querySelector("#a");
  const b = host.querySelector("#b");

  try {
    helper.arm();
    a.click();
    assert(helper._shownKey() === "play", "first tap opens the card");
    a.click();
    assert(helper._shownKey() === null, "tapping the same control again closes it");
    assert(!document.querySelector(".help-target"), "…and clears its highlight");
    a.click();
    assert(helper._shownKey() === "play", "and a third tap opens it again — it's a toggle");
    b.click();
    assert(helper._shownKey() === "generate", "tapping a DIFFERENT control still swaps the card, not closes it");
  } finally {
    helper.disarm();
  }
  host.remove();
});

acheck("pwa: manifest is valid and installable", async () => {
  const res = await fetch("manifest.webmanifest");
  assert(res.ok, "manifest.webmanifest should be served");
  const m = await res.json();
  assert(m.name, "manifest needs a name");
  assert(m.start_url, "manifest needs a start_url");
  assert(m.display === "standalone", "display should be standalone");
  assert(Array.isArray(m.icons) && m.icons.length >= 1, "manifest needs icons");
  assert(m.icons.some((i) => /512/.test(i.sizes)), "needs a 512 icon");
  assert(m.icons.some((i) => (i.purpose || "").includes("maskable")), "needs a maskable icon");
  for (const i of m.icons) {
    const r = await fetch(i.src);
    assert(r.ok, `icon ${i.src} should exist`);
  }
});

acheck("pwa: service worker precaches every runtime module (offline stays complete)", async () => {
  const swText = await (await fetch("sw.js")).text();
  const block = swText.match(/PRECACHE\s*=\s*\[([\s\S]*?)\]/);
  assert(block, "could not find the PRECACHE list in sw.js");
  const listed = [...block[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);

  // tests.js is dev-only; caching it would ship the test harness offline.
  assert(!listed.includes("js/tests.js"), "tests.js must NOT be precached");

  // Ground truth: every module under js/ (from the dir listing) except tests.js
  // must be precached, or an added module silently breaks offline.
  const dir = await (await fetch("js/")).text();
  const modules = [...dir.matchAll(/href="([^"?]+\.js)"/g)]
    .map((x) => "js/" + x[1].split("/").pop())
    .filter((f) => f !== "js/tests.js");
  assert(modules.length > 0, "expected a js/ directory listing to check against");
  for (const f of modules) {
    assert(listed.includes(f), `sw.js PRECACHE is missing ${f} — offline would break`);
  }

  // Every BUNDLED FONT must be precached too. Same failure as a missing module,
  // and quieter: offline, the app still runs but silently falls back to system
  // faces, so the panel legends and the serif voice both change.
  const fontDir = await (await fetch("fonts/")).text();
  const fonts = [...fontDir.matchAll(/href="([^"?]+\.woff2)"/g)].map((x) => "fonts/" + x[1].split("/").pop());
  assert(fonts.length > 0, "expected a fonts/ directory listing to check against");
  for (const f of fonts) {
    assert(listed.includes(f), `sw.js PRECACHE is missing ${f} — offline would lose the face`);
  }

  // Every precached path must actually resolve (catches a typo'd entry).
  for (const p of listed) {
    const r = await fetch(p);
    assert(r.ok, `precache entry "${p}" does not resolve (${r.status})`);
  }
});

acheck("layout: the name row reserves its height when empty (or the grid jumps)", async () => {
  // A fresh generation shows NO name — deliberately, no "Untitled" placeholder —
  // and an empty inline box is 0px tall, so the header swung 33 ↔ 55px and the
  // grid moved every time you saved or loaded. Measured in an iframe: the test
  // page has no stylesheet of its own, and booting the real app here would touch
  // the user's localStorage.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:220px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<header class="app-head"><div class="ctx-row"></div>' +
    '<div class="name-row"><span id="n" class="loaded-name"></span></div></header>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  // Deliberately NOT awaiting document.fonts.ready: both measurements use
  // whatever face is loaded, so the comparison holds either way.
  const doc = frame.contentDocument;
  const row = doc.querySelector(".name-row");
  const empty = row.getBoundingClientRect().height;
  doc.getElementById("n").textContent = "Sunday morning roll in dropped D";
  const filled = row.getBoundingClientRect().height;
  frame.remove();

  assert(empty > 1, `an empty name row must still reserve its line box (got ${empty}px)`);
  assert(Math.abs(empty - filled) < 0.5,
    `the name row changes height with content (${empty}px empty vs ${filled}px filled) — the grid will jump on load/save`);
});

acheck("layout: the help ? stays above the Options scrim, and only then", async () => {
  // Half the controls worth explaining live in the Options sheet, so arming help
  // mode from inside it is the common case. The scrim covers the whole screen at
  // z-index 20, so without a lift the "?" is both dimmed and untappable and you
  // have to close the sheet, arm, and reopen it.
  //
  // Asserted with elementFromPoint rather than by reading z-index, because the
  // value is only half the story: the rule works ONLY while nothing between the
  // pill and the root creates a stacking context, and a `transform` added to
  // .app-head some day would leave the z-index reading 30 and the pill buried.
  // Hit-testing sees what a thumb sees.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:553px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<main><header class="app-head"><div class="ctx-row"><div class="grid-actions">' +
    '<button id="open-help" class="pill pill-icon pill-help">?</button>' +
    '</div></div></header></main>' +
    '<div id="options-sheet" class="sheet"><div class="sheet-backdrop" data-close></div>' +
    '<section class="sheet-panel"></section></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  const pill = doc.getElementById("open-help");
  const r = pill.getBoundingClientRect();
  const hit = () => doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  assert(r.width > 0 && r.height > 0, "the pill must actually lay out, or this test proves nothing");

  // Sheet open, no lift: the scrim wins. This is the bug, reproduced.
  const buried = hit();
  assert(buried && buried.classList.contains("sheet-backdrop"),
    `without body.options-open the scrim should cover the pill (got ${buried && buried.className})`);

  // Sheet open, lift applied: the pill is reachable.
  doc.body.classList.add("options-open");
  const lifted = hit();
  assert(lifted === pill || pill.contains(lifted),
    `body.options-open must put the "?" above the scrim (got ${lifted && lifted.className})`);

  // …and it must not outrank a dropdown panel opened FROM the sheet, which is
  // the one thing that legitimately covers it.
  const zPill = Number(frame.contentWindow.getComputedStyle(pill).zIndex);
  const css = await (await fetch("css/styles.css")).text();
  const zPanel = Number(css.match(/\.dd-panel\b[^}]*?z-index:\s*(\d+)/s)?.[1]);
  assert(Number.isFinite(zPill) && Number.isFinite(zPanel), "both z-indexes should be readable");
  assert(zPill < zPanel, `the pill (${zPill}) must stay under an open dropdown panel (${zPanel})`);

  // The Save/Load sheet needed the same lift (session 43): it's a nav target
  // in help mode too now, and half of what's worth explaining lives inside it.
  doc.body.classList.remove("options-open");
  const savedSheet = doc.createElement("div");
  savedSheet.id = "saved-sheet";
  savedSheet.className = "sheet";
  savedSheet.innerHTML = '<div class="sheet-backdrop" data-close></div><section class="sheet-panel"></section>';
  doc.body.appendChild(savedSheet);

  const buriedAgain = hit();
  assert(buriedAgain && buriedAgain.classList.contains("sheet-backdrop"),
    `without body.saved-open the scrim should cover the pill (got ${buriedAgain && buriedAgain.className})`);

  doc.body.classList.add("saved-open");
  const liftedAgain = hit();
  assert(liftedAgain === pill || pill.contains(liftedAgain),
    `body.saved-open must put the "?" above the scrim (got ${liftedAgain && liftedAgain.className})`);

  frame.remove();
});

acheck("layout: the chord field is cut to the wheel it opens", async () => {
  // His note (v2.14.3): "the chord/quality button should be the same size as the
  // drum". The field used to fill both flexible slots of its row — 289px against
  // a panel that hugs its two barrels at 237px — so a wide control opened a
  // narrow mechanism. Both are cut from the same :root geometry now, and since
  // dropdown.js anchors a panel to the trigger's LEFT edge, each barrel lands
  // directly under its own half of the field. That pairing is what this pins:
  // change --drum-root without changing the split, and it fails.
  //
  // Measured in an iframe with the real stylesheet, for the same reason the
  // name-row check is: tests.html carries no stylesheet, and booting the app here
  // would touch the user's localStorage.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:300px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="sheet-panel"><div class="control-row with-die">' +
    '<label class="field span-2 field-split" id="field-chord">' +
    '<span class="split-legends"><span>Chord</span><span>Quality</span></span>' +
    '<button class="dd-trigger" type="button"><span class="dd-label">' +
    '<span class="tl-half tl-root">C♯</span><span class="tl-half tl-quality">Major</span>' +
    '</span></button></label>' +
    '<div class="field field-die"></div></div></div>' +
    // the panel as dropdown.js builds it, minus the reels (JS owns their height,
    // and it's the WIDTH that has to agree with the field)
    '<div class="dd-panel dd-wheel"><div class="wheel-drums">' +
    '<div class="drum drum-root"></div><div class="wheel-split"></div>' +
    '<div class="drum drum-quality"></div></div></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  const field = doc.getElementById("field-chord");
  const panel = doc.querySelector(".dd-panel");
  const row = doc.querySelector(".control-row");
  const w = (el) => el.getBoundingClientRect().width;

  assert(w(panel) > 0 && w(field) > 0, "both the field and the panel must lay out, or this proves nothing");
  // The field is deliberately NARROWER than the span it sits in — if the row
  // itself had shrunk to 237px the widths would match for the wrong reason.
  assert(w(row) > w(field) + 40,
    `the field should no longer fill its row (row ${w(row)}px, field ${w(field)}px)`);
  assert(Math.abs(w(field) - w(panel)) < 0.5,
    `the chord field (${w(field)}px) must be the width of the wheel it opens (${w(panel)}px)`);

  // …and each half over its own barrel.
  const pairs = [["tl-root", "drum-root"], ["tl-quality", "drum-quality"]];
  for (const [half, drum] of pairs) {
    const a = w(doc.querySelector(`.${half}`));
    const b = w(doc.querySelector(`.${drum}`));
    assert(Math.abs(a - b) < 0.5, `.${half} (${a}px) must be as wide as .${drum} (${b}px)`);
  }

  // The legends row sits OUTSIDE the well, so it needs the well's padding added
  // back or each caption drifts left of the half it names (measured 10px).
  const legends = doc.querySelectorAll(".split-legends span");
  const halves = [doc.querySelector(".tl-root"), doc.querySelector(".tl-quality")];
  const centre = (el) => { const b = el.getBoundingClientRect(); return b.left + b.width / 2; };
  ["Chord", "Quality"].forEach((name, i) => {
    const off = centre(legends[i]) - centre(halves[i]);
    assert(Math.abs(off) < 0.5,
      `the ${name} legend is ${off.toFixed(1)}px off the well it names`);
  });

  frame.remove();
});

acheck("layout: the page tabs don't read as the Format control", async () => {
  // His note (v2.14.4): "Setup / preferences page selector sort of blends with
  // controls … looks too similar to single/progression selector maybe." They were
  // literally the same object — a second `.segmented`, same lit gold capsule, 50px
  // apart. After three mockups he picked the silkscreened one with the jewel, made
  // pressable: "a more narrow rectangular button to suit the font. You press one,
  // it pops in, light comes on. The other pops out and light off."
  //
  // Since session 27 the Format control is ALSO a seated key in a well (the capo
  // language, his call), so "held-in vs lit-up" is no longer what separates them —
  // both are held-in now. The two things that keep them from reading as the same
  // kind of object, and are pinned here: the tabs speak in the LEGEND face, the
  // Format control in the serif; and the LIT JEWEL is the tabs' signature alone —
  // the Format value carries no lamp (the capo it matches has none either).
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:200px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="sheet-panel"><header class="sheet-head"><h2>Options</h2>' +
    '<div class="segmented seg-tabs"><button id="t-on" class="active">Setup</button>' +
    '<button id="t-off">Preferences</button></div></header>' +
    '<div class="control-row format-capo"><div class="field"><span>Format</span>' +
    '<div class="segmented"><button id="f-off">Single</button>' +
    '<button id="f-on" class="active">Progression</button></div></div>' +
    '<div class="field"></div><div class="field"></div></div></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const win = frame.contentWindow;
  const cs = (id) => win.getComputedStyle(frame.contentDocument.getElementById(id));
  const tabOn = cs("t-on");
  const tabOff = cs("t-off");
  const fmtOn = cs("f-on");

  assert(/Jost/.test(tabOn.fontFamily),
    `the tabs must speak in the legend face, got ${tabOn.fontFamily}`);
  assert(!/Jost/.test(fmtOn.fontFamily),
    "…and the Format control must not, or they're the same voice again");

  // HELD IN vs standing proud: the seated key loses the cap highlight and gains a
  // deep inset. Compared against its own inactive twin, so a theme change can't
  // make this vacuous. (Both tabs and Format seat now — that's the point; they're
  // one hardware family. The jewel below is what still tells them apart.)
  assert(tabOn.boxShadow !== tabOff.boxShadow,
    "the current page must look pressed in relative to the other one");
  assert(/inset/.test(tabOn.boxShadow), `the seated tab needs an inset shadow, got ${tabOn.boxShadow}`);
  const jewel = (id) => win.getComputedStyle(frame.contentDocument.getElementById(id), "::before");
  assert(jewel("t-on").backgroundImage !== "none", "the current page's jewel is lit");
  assert(jewel("t-off").backgroundImage === "none", "the other page's jewel is dark");
  // THE LAMP IS THE TABS' ALONE — the Format value must carry none, or a seated
  // serif key with a lit jewel is just a fat tab. This is the differentiator that
  // replaced "must not share a fill" once Format started seating too.
  assert(jewel("f-on").backgroundImage === "none",
    "the active Format value must have no lamp — the lit jewel is the page tabs' signature");

  frame.remove();

  // NO FLASH ON RELEASE (his note, v2.14.6). The tapped key went `:active` (deep
  // inset) → for one frame NEITHER `:active` nor `.active` → `.active`, and that one
  // raised frame was the flash. Pressing a latching key IS seating it, so the two
  // states are declared in ONE rule and there is no frame to see. Asserted against
  // the source, because a computed style can't show you that they're the same rule
  // — only that they happen to agree right now.
  const css = await (await fetch("css/styles.css")).text();
  assert(/\.segmented\.seg-tabs button:active,\s*\.segmented\.seg-tabs button\.active\s*\{/.test(css),
    "the tabs' pressed and seated looks must be ONE rule, or a release flashes the raised state");
  const base = css.match(/\.segmented\.seg-tabs button \{[^}]*\}/s)?.[0] || "";
  assert(/transition:\s*box-shadow/.test(base),
    "ease the tabs' shadow, or the other key SNAPS back on pop-out (the .btn-roll lesson)");

  // A latching key holds while the finger is down and acts on RELEASE, like every
  // other button (his note, session 27). So the switch is on POINTERUP, not
  // pointerdown (v2.14.7, which committed on press and flipped the page under the
  // finger) and not `click` alone (v2.14.6, which flashed). Pointerup keeps both:
  // release-activation, and no flash — because adding `.active` in the pointerup
  // handler runs synchronously within the same release, before any paint, so
  // `.active` is present the instant the browser drops `:active`. The click path's
  // flash came precisely from those being two SEPARATE events with a paintable gap.
  // Asserted at the source because app.js glue isn't imported here and the
  // regression is silent — the page still switches, it just acts on the wrong edge.
  const appjs = await (await fetch("js/app.js")).text();
  const tabWiring = appjs.match(/seg-tabs[\s\S]{0,400}/)?.[0] || "";
  assert(/addEventListener\(\s*["']pointerup["']/.test(tabWiring),
    "the Options tabs must switch on pointerup — hold while pressed, act on release, and no release flash");
  assert(!/addEventListener\(\s*["']pointerdown["']/.test(tabWiring),
    "the tabs must NOT switch on pointerdown, or they commit on press instead of release");
});

acheck("layout: a Sound toggle is a latching key that seats when on", async () => {
  // His flag (session 27): the Sound toggles were flat plates whose on/off showed
  // ONLY in the jewel and label colour — the tile never moved, the one toggle in
  // the app that didn't seat. They're latching keys now (the page-tabs idiom): ON
  // seats (deep inset), OFF stands proud. Driven off the checkbox with `:has()`.
  // Pinned as: the checked tile is inset and differs from its unchecked twin, and
  // the jewel is lit only when checked.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:200px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="lamp-row">' +
    '<label class="lamp" id="on"><input type="checkbox" checked><span class="jewel"></span><span class="t">Metronome</span></label>' +
    '<label class="lamp" id="off"><input type="checkbox"><span class="jewel"></span><span class="t">Melody</span></label>' +
    '</div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  const jewel = (id) => win.getComputedStyle(doc.getElementById(id).querySelector(".jewel")).backgroundImage;
  // Read into plain strings BEFORE removing the frame — getComputedStyle returns a
  // LIVE declaration bound to the element, and a detached element reports "" for
  // everything, so both would read equal and the test would pass/fail vacuously.
  const onShadow = win.getComputedStyle(doc.getElementById("on")).boxShadow;
  const offShadow = win.getComputedStyle(doc.getElementById("off")).boxShadow;
  const onJewel = jewel("on");
  const offJewel = jewel("off");
  frame.remove();

  assert(onShadow !== offShadow,
    "an on Sound toggle must look pressed in relative to an off one — it's a latching key now");
  assert(/inset/.test(onShadow), `the seated (on) toggle needs an inset shadow, got ${onShadow}`);
  assert(onJewel !== "none", "the on toggle's jewel is lit");
  assert(offJewel !== onJewel, "the off toggle's jewel is dark");
});

acheck("layout: the transport shows exactly one icon, sized like its neighbours", async () => {
  // He spotted the stop square looked small (session 44e). It was: play/stop
  // were the last TEXT glyphs in a row of SVG icons, so their size was whatever
  // the font drew for U+25B6/U+25A0 — measured at 5.74px of ink for the square,
  // inside a 46px button, beside two 22px SVGs. They're SVG now, swapped by CSS
  // off `aria-pressed`.
  //
  // Two things have to hold and neither is visible from the markup alone, so
  // this renders the REAL stylesheet: exactly one icon shows per state (a CSS
  // typo could show both, or none, and the button would look empty), and they
  // are the same 22px as the gear rather than whatever a glyph happened to be.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:200px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="transport">' +
    '<button id="idle" class="btn-icon btn-play" aria-pressed="false">' +
      '<svg class="icon-play" viewBox="0 0 24 24"><path d="M9 5.6 18.6 12 9 18.4Z"/></svg>' +
      '<svg class="icon-stop" viewBox="0 0 24 24"><rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2"/></svg>' +
    '</button>' +
    '<button id="run" class="btn-icon btn-play" aria-pressed="true">' +
      '<svg class="icon-play" viewBox="0 0 24 24"><path d="M9 5.6 18.6 12 9 18.4Z"/></svg>' +
      '<svg class="icon-stop" viewBox="0 0 24 24"><rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2"/></svg>' +
    '</button>' +
    '<button id="gear" class="btn-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg></button>' +
    '</div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  // Read everything into plain values BEFORE detaching: a removed element
  // reports "" for every computed property, which would pass vacuously.
  const shown = (btnId, cls) =>
    win.getComputedStyle(doc.querySelector(`#${btnId} .${cls}`)).display !== "none";
  const box = (sel) => {
    const r = doc.querySelector(sel).getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  };
  const idlePlay = shown("idle", "icon-play"), idleStop = shown("idle", "icon-stop");
  const runPlay = shown("run", "icon-play"), runStop = shown("run", "icon-stop");
  const playBox = box("#idle .icon-play"), stopBox = box("#run .icon-stop"), gearBox = box("#gear svg");
  frame.remove();

  assert(idlePlay && !idleStop, `idle should show only play (play ${idlePlay}, stop ${idleStop})`);
  assert(runStop && !runPlay, `running should show only stop (play ${runPlay}, stop ${runStop})`);
  assert(playBox.w === gearBox.w && playBox.h === gearBox.h,
    `play icon ${playBox.w}x${playBox.h} should match the gear's ${gearBox.w}x${gearBox.h}`);
  assert(stopBox.w === gearBox.w && stopBox.h === gearBox.h,
    `stop icon ${stopBox.w}x${stopBox.h} should match the gear's ${gearBox.w}x${gearBox.h}`);
});

acheck("source: the transport glyphs are SVG, not font characters", async () => {
  // The size problem was a SYMPTOM of them being text at all — a font decides
  // how big U+25A0 is, and it drew a 5.74px square. This pins the cause rather
  // than the symptom, and also guards the U+FE0E hack staying retired: that
  // selector only ever existed to stop iOS drawing the text glyphs as colour
  // emoji, which an SVG cannot be.
  const html = await (await fetch("index.html")).text();
  const btn = html.match(/<button id="play"[\s\S]*?<\/button>/);
  assert(btn, "the play button is missing from index.html");
  assert(/class="icon-play"/.test(btn[0]) && /class="icon-stop"/.test(btn[0]),
    "the play button should carry both SVG icons");
  assert(!/[▶■︎]/.test(btn[0]),
    "the play button still contains a text transport glyph or a U+FE0E selector");

  const appJs = await (await fetch("js/app.js")).text();
  assert(!/GLYPH_(PLAY|STOP)/.test(appJs),
    "app.js still carries the text-glyph constants — CSS owns the swap now");
});

acheck("layout: a list panel is a housing, and the selected row is its aperture", async () => {
  // His call (v2.14.6): bring the five remaining list menus (Thumb, Fingers,
  // Pattern, Note Labels, Theme) into the drum's design language. They stay lists —
  // short unordered sets, where a barrel would be ceremony — but the panel is a
  // shaded housing now and the current value sits in an aperture rather than on a
  // lit accent slab, which is how a drum says "this is the one in the window".
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:400px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="dd-panel dd-list" style="position:static;width:160px">' +
    '<div class="dd-group">Complexity</div>' +
    '<button class="dd-option selected" id="on">Tame</button>' +
    '<button class="dd-option" id="off">Loose</button></div>' +
    // …and the wheel's panel, which must NOT pick the housing up twice
    '<div class="dd-panel dd-wheel" id="wheel" style="position:static"></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  const panel = doc.querySelector(".dd-list");
  const on = doc.getElementById("on");
  const off = doc.getElementById("off");
  const cs = (el) => win.getComputedStyle(el);

  // The aperture is CUT EDGE TO EDGE: its hairlines reach the housing walls, the
  // way the drum's do. `width: auto` doesn't do it — .dd-option is a <button>, and a
  // button shrink-to-fits (measured: a 77px row in a 123px panel).
  const pr = panel.getBoundingClientRect();
  const sr = on.getBoundingClientRect();
  // the walls are the PADDING box — inside the housing's own hardware border
  const bw = parseFloat(cs(panel).borderLeftWidth);
  const wall = { left: pr.left + bw, right: pr.right - bw };
  assert(Math.abs(sr.left - wall.left) < 0.5 && Math.abs(sr.right - wall.right) < 0.5,
    `the selected row must bleed to both walls (walls ${wall.left}–${wall.right}, row ${sr.left}–${sr.right})`);
  assert(/1px/.test(cs(on).borderTopWidth) && /1px/.test(cs(on).borderBottomWidth),
    "the aperture is framed top and bottom");
  // …and framing it must not change its height, or every row below it shifts.
  assert(Math.abs(sr.height - off.getBoundingClientRect().height) < 0.5,
    `the framed row is ${sr.height}px against ${off.getBoundingClientRect().height}px unframed — the list will jump`);

  // The housing shading goes on the panel because a scroll container's own
  // background doesn't travel with its content — but it must not land on the wheel,
  // which brings its own per-cylinder housings.
  assert(cs(panel).backgroundImage.split("gradient").length > cs(doc.getElementById("wheel")).backgroundImage.split("gradient").length,
    "the list panel wears the housing shading and the wheel's panel does not");

  // A section caption names values from outside them, which is the legend voice.
  assert(/Jost/.test(cs(doc.querySelector(".dd-group")).fontFamily),
    `an optgroup caption is silkscreened, got ${cs(doc.querySelector(".dd-group")).fontFamily}`);

  frame.remove();
});

acheck("layout: the die's row is the same geometry in both chord modes", async () => {
  // His note (v2.14.4): "put dice back adjacent to chord / quality, center chord /
  // quality / dice group in its row … same on progression mode so nothing moves
  // between the two." So the contract is that switching Single ↔ Progression moves
  // NOTHING in this row: the group's outer bounds and the die's box are identical,
  // which only holds while Key + Progression + the row gap sum to --wheel-w.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:300px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="sheet-panel"><div class="control-row with-die">' +
    '<label class="field field-split" id="field-chord">' +
    '<span class="split-legends"><span>Chord</span><span>Quality</span></span>' +
    '<button class="dd-trigger" type="button"><span class="dd-label">' +
    '<span class="tl-half tl-root">C</span><span class="tl-half tl-quality">Major</span>' +
    '</span></button></label>' +
    // progression mode is ONE split field over two selects since v2.14.5, exactly
    // like the chord field — so "both modes are the same width" is now structural
    '<label class="field field-split" id="field-keyprog" hidden>' +
    '<span class="split-legends"><span>Key</span><span>Progression</span></span>' +
    '<button class="dd-trigger" type="button"><span class="dd-label">' +
    '<span class="tl-half tl-key">C</span><span class="tl-half tl-prog">I–VI7–II7–V7</span>' +
    '</span></button></label>' +
    // The die is a key inside a recessed well since session 27 — the well is the
    // sized 46px element, so geometry is measured from `.die-well`.
    '<div class="field field-die"><div class="die-well"><button id="die" class="die-btn" type="button"></button></div></div>' +
    '</div></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  const box = (sel) => { const b = doc.querySelector(sel).getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width }; };
  const chord = doc.getElementById("field-chord");
  const keyprog = doc.getElementById("field-keyprog");

  const single = { die: box(".die-well"), groupL: box("#field-chord").l, groupR: box(".die-well").r };
  const row = box(".control-row");
  // READ the row gap rather than hardcoding it: session 45 took it 8px → 6px to
  // make room for the save-progression key, and a literal here failed for that
  // change alone even though the invariant below — the two fields span the same
  // width — never moved.
  const rowGap = parseFloat(frame.contentWindow.getComputedStyle(doc.querySelector(".control-row")).columnGap) || 0;
  chord.hidden = true; keyprog.hidden = false;
  const progression = { die: box(".die-well"), groupL: box("#field-keyprog").l, groupR: box(".die-well").r };
  const pair = box("#field-keyprog").r - box("#field-keyprog").l;
  const chordW = single.groupR - single.groupL;
  frame.remove();

  assert(single.die.w > 0, "the die must lay out, or this test proves nothing");
  // 46px was the grid track it used to be handed; `width: 100%` collapsed it to
  // 21px the moment the row stopped being a grid, which is under any tap target.
  assert(single.die.w >= 44,
    `the die is ${single.die.w}px wide — under a 44px tap target (it collapses to ~21px without an explicit width)`);
  assert(Math.abs(single.groupL - progression.groupL) < 0.5 && Math.abs(single.groupR - progression.groupR) < 0.5,
    `the group moves between modes: single ${single.groupL}→${single.groupR}, progression ${progression.groupL}→${progression.groupR}`);
  assert(Math.abs(single.die.l - progression.die.l) < 0.5,
    `the die moves between modes (${single.die.l} vs ${progression.die.l})`);
  assert(Math.abs(pair - (chordW - single.die.w - rowGap)) < 0.5,
    `the Key/Progression field (${pair}px) must span exactly what the chord field does (gap ${rowGap}px)`);

  // Centred, not left- or right-aligned: equal air either side.
  const left = single.groupL - row.l;
  const right = row.r - single.groupR;
  assert(Math.abs(left - right) < 0.5, `the group isn't centred (${left}px left, ${right}px right)`);
});

acheck("touch: the document is locked, but the things that must scroll still can", async () => {
  // His note (v2.14.4): "generally disable scrolling and double tap / pinch to zoom
  // across the board." This reverses the earlier decision to scope touch-action to
  // controls and leave the viewport zoomable.
  //
  // The trap is `touch-action: none`, which looks like the stronger version of the
  // same idea and silently kills panning in every descendant that is SUPPOSED to
  // scroll — the wheel's reels, a dropdown panel, and `main`, which is the safety
  // valve that lets the grid scroll inside its own box on a screen too small for
  // it. `pan-y` rules out pinch and double-tap zoom without taking that away.
  const css = await (await fetch("css/styles.css")).text();
  const rule = css.match(/\bhtml,\s*body\s*\{[^}]*\}/s)?.[0] || "";
  assert(/touch-action:\s*pan-y/.test(rule),
    "html/body must set touch-action: pan-y (pinch and double-tap zoom are only offered for auto/manipulation)");
  assert(!/touch-action:\s*none/.test(rule),
    "touch-action: none on html/body would also forbid panning in the reels, the dropdown panels and main");
  assert(/overflow:\s*hidden/.test(rule) && /overscroll-behavior:\s*none/.test(rule),
    "html/body must lock document scroll and rubber-banding");

  const html = await (await fetch("index.html")).text();
  const viewport = html.match(/<meta name="viewport"[^>]*>/)?.[0] || "";
  assert(/user-scalable=no/.test(viewport) && /maximum-scale=1/.test(viewport),
    `the viewport meta must opt out of scaling (got: ${viewport})`);

  // And the readout that started this: a long-press on "90 BPM" used to select it.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:120px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="bpm-readout"><output id="bpm-value" class="bpm-value">90</output> BPM</div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });
  const cs = frame.contentWindow.getComputedStyle(frame.contentDocument.getElementById("bpm-value"));
  const sel = cs.webkitUserSelect || cs.userSelect;
  frame.remove();
  assert(sel === "none", `the BPM readout is selectable (user-select: ${sel}) — a long-press copies it`);
});

acheck('layout: the Format control spells "Progression" on one line', async () => {
  // His note (v2.14.3): the empty third slot of this row was holding slack, so
  // the second mode can be spelled out instead of reading "Prog.". The segmented
  // buttons have NO horizontal padding, so the button is exactly the text box.
  //
  // TWO asserts because there are two failure modes, and running this against a
  // deliberately broken stylesheet is what showed which one is live: with
  // `white-space: nowrap` a too-narrow button OVERFLOWS (the reported failure was
  // "needs 82.5px in a 82px button"), and without it the word WRAPS, which in a
  // bottom-anchored sheet doesn't clip — it lifts the whole panel. The line-box
  // count catches the second; note that `scrollWidth <= clientWidth` would not,
  // because a wrapped box does fit.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:300px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="sheet-panel"><div class="control-row format-capo">' +
    '<div class="field"><span id="format-legend">Format</span>' +
    '<div class="segmented"><button type="button" class="active">Single</button>' +
    '<button type="button" id="prog-mode">Progression</button></div></div>' +
    '<div class="field"><span>Capo</span><div class="stepper">' +
    '<button type="button">−</button><output>0</output><button type="button">+</button>' +
    '</div></div><div class="field"></div></div>' +
    // a second row, so the legend tier can be compared against a row that never
    // had a class of its own
    '<div class="control-row layers"><label class="field">' +
    '<span id="thumb-legend">Thumb</span><select></select></label></div></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  // Fraunces is WIDER than the fallback, so measuring before it arrives would
  // pass vacuously. Ask for it explicitly (fonts.ready can hang in a hidden tab)
  // and fail loudly if it never lands, rather than measuring Georgia.
  await Promise.race([
    doc.fonts.load("600 14px Fraunces"),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  assert(doc.fonts.check("600 14px Fraunces"),
    "Fraunces did not load in the harness — this measurement would be against the fallback");

  // ONE legend tier, which is also the guard against this row's class colliding
  // with an existing one: naming it `.context` inherited the grid readout's
  // 26px line-height and centring, doubled both legends and grew the row
  // 59px → 72px, which pushes the bottom-anchored sheet up.
  const legendH = (id) => doc.getElementById(id).getBoundingClientRect().height;
  assert(Math.abs(legendH("format-legend") - legendH("thumb-legend")) < 0.5,
    `the Format legend is ${legendH("format-legend")}px against ${legendH("thumb-legend")}px elsewhere — this row's class is inheriting something`);

  const btn = doc.getElementById("prog-mode");
  const range = doc.createRange();
  range.selectNodeContents(btn);
  const lines = range.getClientRects().length;
  const textW = range.getBoundingClientRect().width;
  const boxW = btn.clientWidth;
  frame.remove();

  assert(lines === 1,
    `"Progression" wraps to ${lines} lines in a ${boxW}px button — the Options sheet will jump`);
  assert(textW < boxW,
    `"Progression" needs ${textW.toFixed(1)}px in a ${boxW}px button`);
  // Not just "fits": it has to look like a label, not a wall-to-wall word.
  assert(boxW - textW >= 8,
    `only ${(boxW - textW).toFixed(1)}px of air around "Progression" (${textW.toFixed(1)}px in ${boxW}px)`);
});

acheck("layout: the save-progression key fits the die's row", async () => {
  // Session 45. His placement call: the Save/Delete progression key rides the
  // die's row, because a row below the header pills would cost >=32px against the
  // 11.06px of clearance the grid has at 375x553.
  //
  // Two things are measured, and neither was obvious from the stylesheet — the
  // `327px of track` in the .with-die comment predates a sheet-padding change and
  // is stale. MEASURED at 375: the page track is 343, and 237 + 46 + 44 over two
  // 6px gaps is 339. At the OLD 8px gap the same three land on 345 and overflow
  // by 2, which is why this test asserts the slack rather than the widths.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:300px;border:0";
  const dieField = (extra) =>
    `<div class="field field-die"><div class="die-well ${extra}">` +
    '<button class="die-btn" type="button"><svg viewBox="0 0 24 24"></svg></button></div></div>';
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="sheet-panel"><div class="sheet-page">' +
    '<div class="control-row with-die" id="row">' +
    '<label class="field field-split" id="keyprog"><span class="split-legends"><span>Key</span>' +
    "<span>Progression</span></span><select></select></label>" +
    dieField("") + dieField("well-save-prog") +
    "</div></div></div>";
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  const row = doc.getElementById("row");
  const track = row.parentElement.clientWidth;
  const kids = [...row.children].map((k) => k.getBoundingClientRect().width);
  const gap = parseFloat(frame.contentWindow.getComputedStyle(row).columnGap) || 0;
  const used = kids.reduce((a, b) => a + b, 0) + gap * (kids.length - 1);
  const rowW = row.getBoundingClientRect().width;
  frame.remove();

  assert(kids.length === 3, `expected three members on the die's row, got ${kids.length}`);
  // The row is `flex: none` throughout precisely so nothing shrinks — a squeezed
  // well is how a progression label starts ellipsizing with nothing else looking
  // wrong — so overflow shows up as the row growing past its own track.
  assert(rowW <= track + 0.01,
    `the die's row is ${rowW.toFixed(1)}px in a ${track}px track — it overflows`);
  assert(used <= track,
    `its members need ${used.toFixed(1)}px of ${track}px (gap ${gap}px)`);
  assert(track - used >= 3,
    `only ${(track - used).toFixed(1)}px of slack on the die's row — one longer well and it clips`);
  // The save key is deliberately a HAIR narrower than the die, and that 2px is
  // what buys the slack above. At 40 it started reading as a different object.
  assert(kids[2] >= 42 && kids[2] < kids[1],
    `the save key is ${kids[2]}px against the die's ${kids[1]}px`);
});

acheck("layout: the ×2 segmented control fits its slot without wrapping or growing the row", async () => {
  // Session 36, redesigned same session (his call): ×2 is a two-key segmented
  // control — Format's family (carved keys in a well), not the Sound-toggle
  // lamp — in the same 3rd slot of .control-row.layers, alongside Thumb/
  // Fingers. Same two failure modes as the Format check above (text wrap lifts
  // a bottom-anchored sheet; a taller sibling grows the whole row).
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:300px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="sheet-panel"><div class="control-row layers">' +
    '<label class="field"><span>Thumb</span><select id="thumb-select"><option>Dead Thumb</option></select></label>' +
    '<label class="field"><span>Fingers</span><select id="fingers-select"><option>Wild Card</option></select></label>' +
    '<div class="field"><span>×2</span><div class="segmented" id="x2-well">' +
    '<button type="button" class="active" id="x2-btn1">×1</button><button type="button">×2</button>' +
    '</div></div>' +
    '</div></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  await Promise.race([
    doc.fonts.load("600 14px Fraunces"),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  assert(doc.fonts.check("600 14px Fraunces"),
    "Fraunces did not load in the harness — this measurement would be against the fallback");

  const textEl = doc.getElementById("x2-btn1");
  const range = doc.createRange();
  range.selectNodeContents(textEl);
  const lines = range.getClientRects().length;
  const textW = range.getBoundingClientRect().width;
  const boxW = textEl.clientWidth;

  const selectH = doc.getElementById("thumb-select").getBoundingClientRect().height;
  const wellH = doc.getElementById("x2-well").getBoundingClientRect().height;
  frame.remove();

  assert(lines === 1, `"×1" wraps to ${lines} lines in the ×2 well — the Options sheet will jump`);
  assert(textW < boxW, `"×1" needs ${textW.toFixed(1)}px in a ${boxW}px key`);
  assert(Math.abs(wellH - selectH) < 3,
    `the ×2 well is ${wellH.toFixed(1)}px against its Thumb/Fingers siblings' ${selectH.toFixed(1)}px — this row's height would jump`);
});

// A LOCKED key must still be able to travel (session 36c, his note). The first
// build used `disabled`, which reads fine but can NEVER match `:active` — so a
// press gave no feedback at all and the control sat dead under the finger. The
// fix is a `data-locked` wrapper with the keys left enabled, and this is the
// property that distinguishes the two: `disabled` would fail the last assert.
acheck("layout: a locked segmented key still presses in (it is not `disabled`)", async () => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:375px;height:200px;border:0";
  frame.srcdoc =
    '<link rel="stylesheet" href="css/styles.css">' +
    '<div class="sheet-panel"><div class="segmented" id="locked-well" data-locked>' +
    '<button type="button" class="active" id="k1">×1</button>' +
    '<button type="button" id="k2">×2</button>' +
    '</div><div class="segmented" id="open-well">' +
    '<button type="button" class="active">×1</button><button type="button" id="k3">×2</button>' +
    '</div></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  const k2 = doc.getElementById("k2");
  const wellCS = doc.defaultView.getComputedStyle(doc.getElementById("locked-well"));
  const openCS = doc.defaultView.getComputedStyle(doc.getElementById("open-well"));
  const dimmed = Number(wellCS.opacity) < Number(openCS.opacity);
  frame.remove();

  assert(dimmed,
    `a locked well should read as unavailable (opacity ${wellCS.opacity} vs ${openCS.opacity} unlocked)`);
  // The whole point: enabled, so `:active` can fire and the key visibly travels.
  assert(k2.disabled === false,
    "a locked key must NOT be `disabled` — a disabled button can never match :active, so it cannot press in and pop back out");
});

acheck("type: every bundled face is declared, and no voice falls back to a system font", async () => {
  const css = await (await fetch("css/styles.css")).text();

  // A @font-face for each bundled file — the pairing that actually breaks is
  // "font added to the precache, never declared", which looks fine until the
  // system fallback is compared side by side.
  const fontDir = await (await fetch("fonts/")).text();
  const files = [...fontDir.matchAll(/href="([^"?]+\.woff2)"/g)].map((x) => x[1].split("/").pop());
  for (const f of files) {
    assert(css.includes(f), `css/styles.css declares no @font-face for fonts/${f}`);
  }

  // The legend must never fall back to the numeral stack: they are different
  // jobs, and a legend that lands on a fret digit's face stops reading as
  // engraved.
  const legend = css.match(/--legend:\s*([^;]+);/);
  assert(legend, "--legend token is missing");
  assert(/Jost/.test(legend[1]), "--legend should lead with the bundled Jost");

  // EVERY VOICE LEADS WITH A BUNDLED FACE (session 44d). --numeral used to be a
  // system stack (`ui-rounded, "SF Pro Rounded", …`), which is free only while
  // every user is on Apple hardware — off it, `system-ui` is not rounded at all
  // and the design intent silently vanished. That is exactly the trap that made
  // the legend bundled Jost rather than system Futura; the numeral voice had
  // just never been held to it. This is the guard, and it fails on any future
  // token that reaches for a system face first.
  for (const token of ["--serif", "--legend", "--numeral"]) {
    const m = css.match(new RegExp(`${token}:\\s*([^;]+);`));
    assert(m, `${token} token is missing`);
    const first = m[1].split(",")[0].trim().replace(/["']/g, "");
    assert(/^(Fraunces|Jost)$/.test(first),
      `${token} leads with "${first}" — every voice must lead with a bundled face, not a system one`);
    assert(!/ui-rounded|SF Pro|-apple-system|system-ui|BlinkMacSystemFont/i.test(m[1]),
      `${token} still names a system face in its fallback chain`);
  }

  // The numeral voice is Fraunces cut for small sizes: opsz opens the counters
  // and thickens the hairlines, SOFT rounds the terminals (the quality the old
  // rounded face was reaching for). wght must stay OUT so font-weight still
  // controls it per site — naming it here would silently pin every numeral to
  // one weight.
  const varToken = css.match(/--numeral-var:\s*([^;]+);/);
  assert(varToken, "--numeral-var token is missing");
  assert(/opsz/.test(varToken[1]) && /SOFT/.test(varToken[1]),
    "--numeral-var should set both opsz and SOFT");
  assert(!/wght/.test(varToken[1]),
    "--numeral-var must not pin wght — font-weight controls it per site");
});

acheck("pwa: the precache bypasses the HTTP cache (or a deploy can install stale)", async () => {
  const swText = await (await fetch("sw.js")).text();

  // This is the session-17 bug, and it is invisible from inside the app: pages
  // are served max-age=600, so `cache.addAll` — which fetches through the HTTP
  // cache — can fill a NEW cache with the PREVIOUS deploy's bytes when two
  // deploys land within ten minutes. Nothing re-fetches afterwards, so the app
  // runs stale code permanently with an up-to-date worker on top of it.
  assert(!/\.addAll\s*\(/.test(swText),
    "sw.js must not precache with cache.addAll — it reads through the HTTP cache");
  assert(/cache:\s*["']reload["']/.test(swText),
    "precache fetches must force the network with { cache: \"reload\" }");

  // The install must still fail loudly on a bad response, so a half-filled
  // cache never gets to skipWaiting and replace a working app shell.
  assert(/res\.ok/.test(swText), "a failed precache response must abort the install");
});

check("the generator never picks a string the chord's shape mutes", () => {
  // Found in session 33 by the chord box, not by a test: A / Am / A7 muted string
  // 6 in their shape but declared `fifth: 6`, so the thumb played it anyway — the
  // diagram drew an × over a string the app picks. It was musically harmless (E is
  // A's fifth) which is exactly why it survived; the contradiction is what the
  // picture made visible. This pins the whole class, since a resolver asked for a
  // muted string falls back to FRET 0 and sounds an open string silently.
  const rng = (seed) => {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  for (const id of CHORD_IDS) {
    const shape = CHORD_SHAPES[id];
    const muted = [6, 5, 4, 3, 2, 1].filter((s) => shape[s] == null);
    if (!muted.length) continue;
    // RELATIVE patterns only. The absolute presets (climb / descend / full random)
    // walk literal string numbers and ignore the chord entirely — that's their
    // whole job, it's why they raise the ABS indicator, and on D they will happily
    // play the muted string 6. Asserting over them would be asserting against a
    // documented feature.
    for (const bass of ALL_BASS) {
      for (let seed = 1; seed <= 6; seed++) {
        const pattern = generatePattern(id, { bass, chaos: "loose", rng: rng(seed) });
        if (pattern.type !== "relative") continue;
        for (const { bar } of resolvePhrase(pattern, [id])) {
          for (const ev of bar) {
            assert(!muted.includes(ev.string),
              `${id} (${bass}): plays string ${ev.string}, which its shape mutes`);
          }
        }
      }
    }
  }
});

acheck("app: the die can be tapped while its own wheel is open", async () => {
  // The die sits right beside the field that opens the wheel, so the wheel's
  // full-screen outside-tap catcher covered it too — a tap on the die used to be
  // a dead first press that only closed the wheel, and rolling took two taps
  // (his ask, session 33). app.js glue isn't imported here (see the Play-button
  // and tab-wiring tests above for the same reasoning), so this is asserted at
  // the source, the same way those are. Verified LIVE first, not just here: a
  // real `computer` click at the die's on-screen rect while the chord wheel was
  // open both closed the panel and rolled a new chord in one tap, with the
  // normal two-oscillator ka-chunk.
  const appjs = await (await fetch("js/app.js")).text();
  assert(/const overOpenDie = \(e\) =>/.test(appjs),
    "overOpenDie must exist, mirroring overOpenTrigger's rect-check for the die");
  const dieCheck = appjs.match(/const overOpenDie[\s\S]{0,400}/)?.[0] || "";
  assert(/getElementById\("randomize-chords"\)/.test(dieCheck) || /el\("randomize-chords"\)/.test(dieCheck),
    "overOpenDie must check the die's own bounding rect");
  assert(/if \(overOpenDie\(e\)\) randomizeChords\(\);/.test(appjs),
    "a click landing on the die's rect (via the catcher) must actually roll — not just close the wheel");
  // The die must sound like every other button, not go silent just because its
  // press happened to land on the catcher.
  const pointerdown = appjs.match(/pointerdown["'][\s\S]{0,300}/)?.[0] || "";
  assert(/overOpenTrigger\(e\) \|\| overOpenDie\(e\)/.test(pointerdown),
    "the die's catcher-passthrough press must sound, alongside the trigger's");
});

// ---- the chord box (session 33) ----

check("chordbox: every chord in the library draws, and fits the 5-fret window", () => {
  // The window is why the diagram can be small: the library's widest span is 5
  // (B♭add9 frets 1-5, Badd9 2-6), so five rows always suffice. If a future
  // voicing broke that, the shape would silently draw notes outside its own box.
  for (const id of CHORD_IDS) {
    const m = chordBoxModel(id);
    assert(m, `no chord box model for ${id}`);
    assert(m.span <= BOX_FRETS, `${id} spans ${m.span} frets, more than the box shows`);
    const notes = [...m.dots, ...m.barres];
    for (const n of notes) {
      const row = n.fret - m.first;
      assert(row >= 0 && row < BOX_FRETS,
        `${id}: fret ${n.fret} falls outside the window starting at ${m.first}`);
    }
    // Six strings accounted for exactly once, as a dot, a mark, or under the barre.
    const seen = new Set();
    for (const d of m.dots) seen.add(d.index);
    for (const k of m.marks) seen.add(k.index);
    for (const b of m.barres) for (let i = b.from; i <= b.to; i++) seen.add(i);
    assert(seen.size === 6, `${id}: ${seen.size} of 6 strings drawn`);
  }
});

check("chordbox: open shapes sit at the nut, barre shapes print their position", () => {
  // A chord chart's two modes. An open shape is anchored at the nut because the
  // open strings only mean anything against it; anything up the neck says where
  // it is instead.
  const openC = chordBoxModel("C");
  assert(openC.nut === true, "C is an open shape and must be drawn at the nut");
  assert(openC.position === null, "a nut shape needs no position numeral");
  assert(openC.first === 1, "a nut shape's window starts at fret 1");

  const eb = chordBoxModel("Eb");            // 6 6 8 8 8 6 — a barre at fret 6
  assert(eb.nut === false, "E♭ is up the neck and must not draw a nut");
  assert(eb.position === 6, `E♭ should print its position 6, got ${eb.position}`);
  assert(eb.first === 6, "the window starts at the barre");

  // The widest shape in the library, and the one he's most likely to overrule —
  // which is what happened to BOTH chords that held this title before it. G♯sus2
  // spanned 4-8, then C♯add9 did; each was revoiced away (sessions 35 / 35b), so
  // this fixture is deliberately re-pointed rather than relaxed each time.
  const b9 = chordBoxModel("Badd9"); // 2 2 4 6 4 2 — the A-shape add9's reach
  assert(b9.span === 5 && b9.low === 2 && b9.high === 6,
    `Badd9 should span frets 2-6, got ${b9.low}-${b9.high}`);
  assert(b9.position === 2, "Badd9 prints position 2");
});

check("chordbox: an open string with high frets anchors by position, not the nut", () => {
  // No SHIPPED chord mixes an open string with notes above fret 5, so the
  // library sweep can't catch this — a candidate voicing being auditioned in
  // session 33 did, and its dots drew outside the grid. Pinned with a synthetic
  // shape so the guard survives whatever the library does later.
  CHORD_SHAPES.__probe = { 6: null, 5: 6, 4: 5, 3: 0, 2: 6, 1: 6 };
  CHORDS.__probe = { name: "probe", rootId: "D", quality: "add9", root: 5, alt: 4, fifth: 5 };
  try {
    const m = chordBoxModel("__probe");
    assert(m.nut === false, "a shape reaching past the window must not claim the nut");
    assert(m.first === 5, `the window must start at the lowest fretted note, got ${m.first}`);
    for (const d of m.dots) {
      const row = d.fret - m.first;
      assert(row >= 0 && row < BOX_FRETS, `fret ${d.fret} drew outside the grid`);
    }
    // The open string is still open, and still says so.
    assert(m.marks.some((k) => k.kind === "open"), "an open string keeps its ○ marker");
  } finally {
    delete CHORD_SHAPES.__probe;
    delete CHORDS.__probe;
  }
});

check("chordbox: a barre is a real barre, and it goes all the way across", () => {
  // Drawing a bar across a shape you don't barre would be a lie, so the model
  // requires no open string in the way AND something fretted above it.
  const f = chordBoxModel("F");
  assert(f.barres.length === 1, "F is a barre chord, with one bar");
  assert(f.barres[0].fret === 1 && f.barres[0].from === 0 && f.barres[0].to === 5,
    "F barres all six strings at fret 1");
  // ...and its fret-3 PAIR on strings 5/4 stays two dots — ring + pinky.
  assert(f.dots.filter((d) => d.fret === 3).length === 2,
    "F's fret-3 pair is two fingers, not a bar");

  // FOUR IN A ROW IS A BAR, THREE IS THREE FINGERS (his call, session 35b).
  // B♭'s fret-3 trio on strings 4/3/2 is the A-shape family's "double barre" he
  // rejected — "I usually just play those with three fingers" — and the clincher
  // is that it's the identical trio open A has, which was already three dots.
  const bb = chordBoxModel("Bb"); // 1 1 3 3 3 1
  assert(bb.barres.length === 1, `B♭ takes one bar, not two (got ${bb.barres.length})`);
  assert(bb.dots.filter((d) => d.fret === 3).length === 3, "B♭'s fret-3 trio is three fingers");
  const a = chordBoxModel("A"); // 0 0 2 2 2 0 — the same trio, and the reason why
  assert(a.barres.length === 0 && a.dots.filter((d) => d.fret === 2).length === 3,
    "open A's fret-2 trio is three fingers, which is what B♭ has to match");
  const fsus4 = chordBoxModel("Fsus4"); // 1 3 3 3 1 1 — "similar deal for the sus4 chords"
  assert(fsus4.barres.length === 1, "Fsus4's fret-3 trio is three fingers too");

  // A6 is the other side of the threshold, and the reason a run is judged on its
  // own rather than as "a run above the index barre": it has OPEN strings, so it
  // gets no index bar and has nothing above fret 2 — but four strings under one
  // finger is still a bar. His words: "A6 should just have a barre across the 4
  // high strings."
  const a6 = chordBoxModel("A6"); // 0 0 2 2 2 2
  assert(a6.barres.length === 1, `A6 draws its bar (got ${a6.barres.length})`);
  assert(a6.barres[0].fret === 2 && a6.barres[0].from === 2 && a6.barres[0].to === 5,
    "A6 bars the four high strings at fret 2");
  assert(a6.marks.filter((k) => k.kind === "open").length === 2,
    "A6's two open strings are still open");

  // THE INDEX BAR SPANS EVERY STRING IT CAN REACH (his call, session 35),
  // including strings carrying a higher note — the finger is still under them.
  // Before this, a bar was drawn only between the outermost strings AT its own
  // fret, so F♯6's index read as a stub across strings 6-5.
  const fs6 = chordBoxModel("F#6"); // 9 9 11 11 11 11 — his worked example
  assert(fs6.barres.length === 2, `F♯6 should draw two bars, got ${fs6.barres.length}`);
  assert(fs6.barres[0].fret === 9 && fs6.barres[0].from === 0 && fs6.barres[0].to === 5,
    "F♯6 bars all six at fret 9");
  assert(fs6.barres[1].fret === 11 && fs6.barres[1].from === 2 && fs6.barres[1].to === 5,
    "F♯6's second finger covers strings 4-1 at fret 11");

  // His other example: the low fret is scattered over non-adjacent strings, and
  // the answer is still one bar all the way across.
  const gs9 = chordBoxModel("G#add9"); // 4 1 1 3 1 4
  assert(gs9.barres.length === 1 && gs9.barres[0].from === 0 && gs9.barres[0].to === 5,
    "G♯add9 just barres all the way across at fret 1");

  for (const id of CHORD_IDS) {
    const m = chordBoxModel(id);
    if (!m.barres.length) continue;
    // Bars stack low-to-high and never share a fret.
    for (let i = 1; i < m.barres.length; i++) {
      assert(m.barres[i].fret > m.barres[i - 1].fret, `${id}: bars out of order`);
    }
    // Every bar is either the INDEX bar (which needs a note above it to be a
    // barre rather than a plain shape) or a run of ≥4 under one flat finger.
    for (const b of m.barres) {
      const isIndex = b.fret === m.low && !m.marks.length;
      const run = b.to - b.from + 1;
      assert(isIndex ? m.high > b.fret : run >= 4,
        `${id}: the fret-${b.fret} bar covers ${run} strings and isn't the index barre`);
    }
    // Every string a bar covers is fretted at or above it — a finger can't lie
    // over an open or muted string.
    const shape = CHORD_SHAPES[id];
    for (const b of m.barres) {
      for (let i = b.from; i <= b.to; i++) {
        const fret = shape[m.strings[i]];
        assert(fret != null && fret >= b.fret,
          `${id}: the fret-${b.fret} bar lies over string ${m.strings[i]}, which is ${fret}`);
      }
    }
  }
});

check("chordbox: the root is accented, and nothing else is", () => {
  // REPLACED the old "the thumb's alternating pair is marked" check in session 34
  // (his call): the box accents ONLY the root now, which is what an ordinary chord
  // chart marks, on his argument that the thumb is already implicit in which
  // string a note is on. The old test is gone rather than adjusted, because it
  // asserted the opposite — that `alt` must ALSO be accented.
  for (const id of CHORD_IDS) {
    const m = chordBoxModel(id);
    const c = CHORDS[id];
    const accented = new Set();
    for (const d of m.dots) if (d.role === "root") accented.add(m.strings[d.index]);
    for (const k of m.marks) if (k.role === "root") accented.add(m.strings[k.index]);
    // The root must always be visible as the root, INCLUDING one that lies under a
    // barre — that's the case G♯sus2 exposed, where it would be swallowed by the
    // bar. This half is what survives from the old check.
    assert(accented.has(c.root), `${id}: root string ${c.root} is not accented`);
    assert(accented.size === 1, `${id}: exactly one string may be accented, got ${[...accented]}`);
    // The BAR itself is never accented: one finger across five strings, and the
    // root beneath it gets its own dot on top.
    for (const b of m.barres) assert(b.role === "note", `${id}: a barre must not wear the root colour`);
  }
});

check("chordbox: the moving finger is one hollow dot, on a string the chord frets", () => {
  // `moving: [from, to]` says one finger covers two strings by moving between them
  // (the open-C ring finger rocking onto the low bass note). Only the `to` is drawn
  // hollow. This is DATA, not derived — the geometric rule fires on 82 of 120
  // chords and is wrong on every plain barre, where both notes are simply held.
  let declared = 0;
  for (const id of CHORD_IDS) {
    const m = chordBoxModel(id);
    const c = CHORDS[id];
    const moving = m.dots.filter((d) => d.moving);
    if (!c.moving) {
      assert(moving.length === 0, `${id}: no moving finger declared, but a dot is drawn hollow`);
      continue;
    }
    declared++;
    const [from, to] = c.moving;
    assert(from !== to, `${id}: a finger can't move between one string and itself`);
    // BOTH ends have to be real notes, or the diagram claims a move you can't make.
    for (const s of [from, to]) {
      assert(CHORD_SHAPES[id][s] != null, `${id}: moving finger touches string ${s}, which the shape mutes`);
    }
    // Exactly one hollow dot, and it's the one you reach for.
    assert(moving.length === 1, `${id}: exactly one dot may be hollow, got ${moving.length}`);
    assert(m.strings[moving[0].index] === to,
      `${id}: the hollow dot must be the 'to' string ${to}, got ${m.strings[moving[0].index]}`);
    // A moving note must never be an open string: there'd be no finger to move.
    assert(moving[0].fret > 0, `${id}: an open string can't be the moving finger`);
  }
  assert(declared >= 3, `the documented moving-finger chords should be declared, got ${declared}`);
  // HOLLOW ONLY WHEN ABSOLUTELY NECESSARY (his call, session 35b) — the symbol is
  // a warning, so a chord you can simply hold must not wear one. Cmaj7 (x32000,
  // three fretted notes), Csus2 — the one he named — and Cadd9 all lost theirs;
  // what's left is the shapes whose four fingers are committed before the low
  // bass note is even added.
  for (const id of ["Cmaj7", "Csus2", "Cadd9"]) {
    assert(!CHORDS[id].moving, `${id} holds without moving a finger — it must not be hollow`);
  }
  for (const id of ["C", "C7", "C6", "B7"]) {
    assert(CHORDS[id].moving, `${id} still needs its moving finger`);
  }
});

check("chordbox: it draws SVG and never types a glyph it doesn't own", () => {
  // The house rule: anything typed that isn't in a bundled face has to be DRAWN.
  // × and ○ would otherwise come from whatever system font happened to have them
  // — the exact bug the sheet's ✕ had. Only the position numeral is text.
  const svg = renderChordBox("Eb");
  assert(svg.tagName.toLowerCase() === "svg", "the chord box is an SVG");
  const texts = [...svg.querySelectorAll("text")];
  assert(texts.length === 1 && texts[0].textContent === "6",
    "the only text in a chord box is its position numeral");
  assert(svg.getAttribute("aria-label").startsWith("E♭"),
    "the picture needs a spoken equivalent");
  // An unknown chord draws nothing rather than throwing.
  assert(renderChordBox("nope").querySelectorAll("*").length === 0,
    "an unknown chord id must draw an empty box, not throw");
});

// ---- the intermittent-Play bug (session 32) ----
// iOS can leave an AudioContext "interrupted" (a call, Siri, another app taking
// the session), and resume() on one of those may reject OR never settle. Since
// `running = true` sits after that await, the transport silently never started —
// and togglePlay() branches on `running`, so every later press re-entered the
// same path. Play looked dead until the app was backgrounded and foregrounded.

acheck("metronome: a context that can't resume fails the start instead of hanging", async () => {
  let built = 0;
  let closed = 0;
  await withFakeAudio(
    () => {
      built++;
      const ctx = fakeAudioContext({
        state: "interrupted",
        resume: () => Promise.reject(new Error("interrupted")),
      });
      ctx.close = async () => { closed++; };
      return ctx;
    },
    async () => {
      const m = createMetronome();
      const ok = await m.start(1);
      assert(ok === false, "start() must RESOLVE false on a dead context — never throw, never hang");
      assert(m.running === false, "a failed start must leave the transport stopped");
      // One rebuild attempt: the first context is discarded and a fresh one tried.
      assert(built === 2, `an unrevivable context must be replaced once (built ${built})`);
      assert(closed === 1, "the dead context must be closed, not leaked");
      m.stop();
    }
  );
});

acheck("metronome: a resume that NEVER settles is still an answer, and the rebuild plays", async () => {
  // The nastier half of the bug: not a rejection but a promise that hangs
  // forever. Raced against a timeout, so the click handler always gets a verdict.
  //
  // This is the ONE check that has to wait out a real timeout to prove anything,
  // which is why `resumeTimeoutMs` is injectable — at the shipped 1500ms it cost
  // 7.7s of the suite on its own. The race is what's under test, not the length
  // of the fuse.
  let built = 0;
  await withFakeAudio(
    () => {
      built++;
      return built === 1
        ? fakeAudioContext({ state: "interrupted", resume: () => new Promise(() => {}) })
        : fakeAudioContext({ state: "running" });
    },
    async () => {
      const m = createMetronome({ resumeTimeoutMs: 5 });
      const ok = await m.start(1);
      assert(ok === true, "the replacement context must actually start the transport");
      assert(m.running === true, "…and leave it running");
      assert(built === 2, `exactly one rebuild (built ${built})`);
      m.stop();
    }
  );
});

acheck("metronome: recoverAudio discards a context it can't repair", async () => {
  // The automated version of the user's own workaround (leave the app, come
  // back). Runs on every return to foreground, so the NEXT Play starts from
  // something healthy rather than presenting a dead button.
  let last = null;
  let closed = 0;
  await withFakeAudio(
    () => {
      last = fakeAudioContext({ state: "running" });
      last.close = async () => { closed++; };
      return last;
    },
    async () => {
      const m = createMetronome();
      await m.start(1);
      m.stop();
      assert(m.audioState === "running", "the context should be live after a start");
      last.state = "interrupted";               // what backgrounding does on iOS
      last.resume = () => Promise.reject(new Error("interrupted"));
      const repaired = await m.recoverAudio();
      assert(repaired === false, "an unrepairable context can't report success");
      assert(closed === 1, "…it must be discarded so the next Play builds a fresh one");
      assert(m.audioState === "none", "…and the metronome must know it has no context");
    }
  );
});

check("platform: the playback guard reports the return to foreground too", () => {
  // Backgrounding is exactly what interrupts the audio session, so the trip back
  // is the moment to repair it. Same event, same concern, one listener.
  const listeners = {};
  const doc = {
    visibilityState: "visible",
    addEventListener: (t, f) => { listeners[t] = f; },
    removeEventListener: () => {},
  };
  const win = { addEventListener() {}, removeEventListener() {} };
  let hidden = 0;
  let shown = 0;
  const guard = createPlaybackGuard({
    doc, win, onHidden: () => hidden++, onShown: () => shown++,
  });
  guard.start();
  doc.visibilityState = "hidden";
  listeners.visibilitychange();
  assert(hidden === 1 && shown === 0, "going hidden must stop the transport and nothing else");
  doc.visibilityState = "visible";
  listeners.visibilitychange();
  assert(shown === 1 && hidden === 1, "coming back must fire the repair, not the stop");
  guard.stop();
});

acheck("app: a failed Play springs the button back, and settings restore before the first roll", async () => {
  // app.js glue isn't imported here, and all three of these fail SILENTLY — the
  // app still looks like it works — so they're asserted against the source, the
  // same way the sw.js precache and the tab wiring are.
  const appjs = await (await fetch("js/app.js")).text();

  // The optimistic button flip must always be paid back.
  assert(/if \(!started\) releasePlayback\(\);/.test(appjs),
    "a start that failed must put the Play button and the audio category back");
  const release = appjs.match(/function releasePlayback\(\)[\s\S]*?\n\}/)?.[0] || "";
  assert(release && !/metronome\.running/.test(release),
    "releasePlayback must NOT be gated on metronome.running — a failed start never set it");

  // Restore has to beat generate(), or the session's first pattern is rolled
  // against the default chord and then silently re-chorded underneath.
  const boot = appjs.match(/async function boot\(\)[\s\S]*?await generate\(\)/)?.[0] || "";
  assert(/restorePrefs\(loadPrefs\(\)\)/.test(boot),
    "persisted settings must be restored inside boot(), before the first generate()");

  // The landscape fix: the visual-viewport pin writes INLINE styles over
  // `.sheet { inset: 0 }`, and a box captured mid-rotation outlived the rotation
  // because nothing ever took them off again.
  const sync = appjs.match(/function syncSheetToViewport\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/style\.height = ""/.test(sync) && /style\.top = ""/.test(sync),
    "the sheet's viewport pin must CLEAR its inline box when there's no keyboard, or a rotation leaves a stale one");
});

acheck("app: bpm saves with the pattern, and overwrite is offered on a name collision", async () => {
  // Same reasoning as the Play-button test above: this is app.js glue
  // (currentContext/loadSaved read live DOM + the metronome instance;
  // saveCurrent drives a confirmModal), so it's asserted against the source.
  const appjs = await (await fetch("js/app.js")).text();

  const ctx = appjs.match(/function currentContext\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/bpm:\s*metronome\.bpm/.test(ctx),
    "currentContext() must save the current bpm, same tier as swing/x2/capo");

  const load = appjs.match(/async function loadSaved\(id\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/if \(ctx\.bpm != null\) setBpm\(ctx\.bpm\)/.test(load),
    "loadSaved() must apply a saved bpm, and only when present — same absent handling as swing, not capo");

  const save = appjs.match(/async function saveCurrent\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/savedStore\.list\(\)\.find\(/.test(save),
    "saveCurrent() must check for an existing item with the same name");
  assert(/confirmModal\(/.test(save),
    "a name collision must be confirmed before overwriting, not silently suffixed");
  assert(/if \(!overwrite\) return;/.test(save),
    "declining the overwrite must abort the save, not fall through to a duplicate");
  assert(/savedStore\.update\(existing\.id/.test(save),
    "confirming the overwrite must update the existing item in place, not create a new one");
});

acheck("app: folders render as grouped, and folder edits go through storage.js", async () => {
  // Same reasoning again: renderSavedList()/appendSavedRow()/refreshSavedCount()
  // read live DOM and drive dropdown.js/modal.js, so this is app.js glue,
  // asserted against the source. builtin-patterns.js itself has no such
  // excuse and is checked for real above ("builtin patterns: well-shaped…").
  const appjs = await (await fetch("js/app.js")).text();

  const render = appjs.match(/function renderSavedList\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/savedStore\.folders\(\)/.test(render) && /appendGroupHeader/.test(render),
    "renderSavedList() must group real items by folder, not just list them flat");
  assert(/enhanceAll\(list,/.test(render),
    "the per-item folder <select>s are rebuilt every call and must be re-enhanced, same as the per-bar chord selects");

  const row = appjs.match(/function appendSavedRow\(list, item, folders\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/savedStore\.setFolder\(/.test(row),
    "the per-item folder select must commit through storage.js's setFolder, not just move DOM around");

  const header = appjs.match(/function appendGroupHeader\(list, name, \{ folder = false \} = \{\}\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/savedStore\.renameFolder\(/.test(header) && /savedStore\.clearFolder\(/.test(header),
    "a folder's header must rename/delete through storage.js, not hand-roll its own bulk edit");
  assert(!/confirmModal/.test(header.match(/del\.addEventListener[\s\S]*?\}\);/)?.[0] || ""),
    "deleting a folder only un-files its items, never loses one, so it needs no confirmModal (same as import)");
});

acheck("app: built-ins seed into the real library once, and Restore only re-adds what's actually missing", async () => {
  // Session 41 redesign: his verdict on read-only + "save a copy" was that it
  // cost two entries for one thing. Built-ins are real saved items now, so
  // this is glue over savedStore/localStorage — same reasoning as above.
  const appjs = await (await fetch("js/app.js")).text();

  assert(/import \{ BUILTIN_PATTERNS \} from ".\/builtin-patterns\.js";/.test(appjs),
    "app.js must import the built-in patterns, not just builtin-patterns.js knowing about itself");

  const seedOne = appjs.match(/function seedBuiltin\(entry\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/folder:\s*"Built-in"/.test(seedOne) && /builtinId:\s*entry\.id/.test(seedOne),
    "a seeded builtin must land in a real \"Built-in\" folder and carry its provenance tag");

  const missing = appjs.match(/function missingBuiltins\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/i\.builtinId/.test(missing),
    "\"missing\" must be decided by builtinId, not name or folder, so a rename/move isn't mistaken for a delete");

  const seedNew = appjs.match(/function seedNewBuiltins\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/loadSeededBuiltinIds\(\)/.test(seedNew) && /seedBuiltin\(/.test(seedNew),
    "boot-time seeding must only add ids that have never been seeded before, or a delete wouldn't stick across relaunches");
  assert(!/missingBuiltins/.test(seedNew),
    "boot-time seeding must key off seed HISTORY, not current presence — that's the whole difference from Restore");

  const restore = appjs.match(/function restoreMissingBuiltins\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/missingBuiltins\(\)/.test(restore) && /seedBuiltin\(/.test(restore),
    "the Restore button must re-add whatever's actually missing right now, regardless of seed history");

  const boot = appjs.match(/async function boot\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/seedNewBuiltins\(\)/.test(boot), "boot() must seed new builtins so a fresh install has them without a tap");

  assert(/restore-builtins-btn.*addEventListener\("click"[\s\S]*?restoreMissingBuiltins\(\)/.test(appjs),
    "the Restore button must be wired to restoreMissingBuiltins()");

  const count = appjs.match(/function refreshSavedCount\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/restore-builtins-btn.*disabled\s*=\s*!missingBuiltins\(\)\.length/.test(count),
    "the Restore button must disable itself once nothing is actually missing");
  assert(/BUILTIN_PATTERNS\.length/.test(count),
    "the Load pill must stay reachable even with an empty real library, since it's the only way to reach Restore");
});

acheck("app: the library menu and its status line don't outlive the sheet (session 43)", async () => {
  // His report: "X patterns restored" lingered until the app was force-quit,
  // and showed on the SAVE card too, because nothing ever cleared it or
  // scoped it to Load mode. openSheet()/closeSheet() are app.js glue (they
  // read/write live DOM), so this is asserted against the source like the
  // rest of this file's app.js checks.
  const appjs = await (await fetch("js/app.js")).text();

  const open = appjs.match(/function openSheet\(mode\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/library-menu-btn"\)\.hidden = saving/.test(open),
    "the library menu button must only show in Load mode, not on the Save card");
  assert(/library-menu"\)\.hidden = true/.test(open),
    "opening the sheet must start with the library menu collapsed");
  assert(/import-hint"\)\.textContent = ""/.test(open),
    "opening the sheet must clear any status line left over from a previous visit");

  const close = appjs.match(/function closeSheet\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/library-menu"\)\.hidden = true/.test(close) && /import-hint"\)\.textContent = ""/.test(close),
    "closing the sheet must also clear the library menu and its status line, or reopening on Save briefly shows it");
});

acheck("app: saving/deleting a custom progression keeps the menu and the trigger honest (session 45)", async () => {
  // app.js glue, so asserted against the source like the rest of this file's
  // app.js checks. Three orderings that are invisible from outside and each
  // produce a control that lies rather than an error:
  const appjs = await (await fetch("js/app.js")).text();

  const boot = appjs.match(/async function boot\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  const regAt = boot.indexOf("registerCustomProgressions()");
  const initAt = boot.indexOf("initControls()");
  assert(regAt >= 0 && initAt >= 0 && regAt < initAt,
    "customs must be registered BEFORE initControls — it calls syncProgressionOptions() on its own last line, so anything later misses the first paint");

  const del = appjs.match(/async function deleteCurrentProgression\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  const optsAt = del.indexOf("syncProgressionOptions()");
  const selAt = del.indexOf("syncProgressionSelect()");
  assert(optsAt >= 0 && selAt > optsAt,
    "delete must re-sync the SELECTED value after rebuilding the options: the rebuild drops the deleted <option> and the browser falls back to the first one, so the trigger would read a preset while the bars are untouched");
  assert(/confirmModal\(/.test(del) && /danger:\s*true/.test(del),
    "deleting a saved progression is destructive, so it confirms first and wears the app's danger treatment");

  const save = appjs.match(/async function saveCurrentProgression\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/canSaveProgression\(\)/.test(save),
    "the save path and the key's enabled state must ask the same question, or a disabled-looking key could still save");
  const can = appjs.match(/function canSaveProgression\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/length !== 4/.test(can),
    "a progression that isn't four bars must not be storable — it would cycle into the wrong bars everywhere downstream");
  assert(/chordForRoman\(/.test(can) && /progressionTokens\(/.test(can),
    "savability must include a verified round trip, since the numeral is what gets stored");
  // …and the tokens it verifies must be the ones romanInKey computes, NOT
  // degreeLabel's map-first ones: the two agree today, but only because a test
  // says so, and this value goes into storage where a future divergence would rot
  // silently rather than fail loudly.
  assert(/const progressionTokens = [^\n]*romanInKey\(/.test(appjs),
    "progressionTokens must spell with romanInKey, so chordForRoman is exactly its inverse");
});

acheck("app: help mode can reach the Save/Load sheet's own scrim (session 43)", async () => {
  const appjs = await (await fetch("js/app.js")).text();
  const open = appjs.match(/function openSheet\(mode\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/classList\.add\("saved-open"\)/.test(open),
    "opening the Save/Load sheet must mark the body the same way the Options sheet does, or the \"?\" pill is buried under its scrim");
  const close = appjs.match(/function closeSheet\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/classList\.remove\("saved-open"\)/.test(close),
    "closing the sheet must clear the lift, or the \"?\" would float above the main screen's scrim-less content");
});

acheck("app: the library menu reveals INLINE on the title row, not a row below (his follow-up)", async () => {
  // First cut of session 43 put Export/Import/Restore on a row of their own
  // under the header; his review asked for them back on the title row, to the
  // right of "Load", same spot they held before the "..." toggle existed.
  const html = await (await fetch("index.html")).text();
  const head = html.match(/<header class="sheet-head">[\s\S]*?<\/header>/g)?.find((h) => h.includes("saved-title"));
  assert(head, "the Save/Load sheet's header must exist");
  assert(/id="library-menu-btn"[\s\S]*?id="library-menu"[\s\S]*?class="sheet-close"/.test(head),
    "the library menu must sit INSIDE the header, between the \"...\" toggle and the close button, not below it");
});

acheck("app: a saved item's folder trigger always reads \"Folder\", never the current folder name", async () => {
  // His follow-up: the group header above an item already shows which folder
  // it's in, so echoing the folder name on the trigger too was redundant —
  // and a fixed short label is what lets it fit in the Rename/Export/Delete
  // row instead of needing a row of its own.
  const appjs = await (await fetch("js/app.js")).text();
  const render = appjs.match(/function renderSavedList\(\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/folder-select/.test(render) && /labelEl\.textContent = "Folder"/.test(render),
    "the folder-select's enhanceAll() picker must fix its trigger's label at \"Folder\"");

  const row = appjs.match(/function appendSavedRow\(list, item, folders\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/actionsRow\.append\(rename, exportOne, del, sel\)/.test(row),
    "the folder select must join Rename/Export/Delete in the same row, not sit in a row of its own");
});

acheck("app: a saved item's row loads on tap; Rename/Export/Delete/folder live behind \"...\"", async () => {
  // Session 43, his call: Load as a separate button is gone (the row loads),
  // and the rest moved off the row entirely rather than just narrowing.
  const appjs = await (await fetch("js/app.js")).text();
  const row = appjs.match(/function appendSavedRow\(list, item, folders\)[\s\S]*?\n\}\n/)?.[0] || "";

  assert(/saved-main/.test(row) && /main\.addEventListener\("click", \(\) => loadSaved\(item\.id\)\)/.test(row),
    "tapping the main row (not a separate Load button) must load the pattern");
  assert(!/className = "load"/.test(row) && !/textContent = "Load"/.test(row),
    "a standalone Load button must be gone — the row itself is the tap target now");

  assert(/saved-options-btn/.test(row),
    "a per-item \"...\" toggle must reveal Rename/Export/Delete/folder");
  assert(/actions\.hidden = !actions\.hidden/.test(row),
    "the \"...\" must be a plain reveal toggle, same idiom as the folder header's Rename/Delete");
  assert(/exportOne\.addEventListener\("click", \(\) => exportItem\(item\)\)/.test(row),
    "Export must be one of the actions behind the per-item \"...\" (item 6)");
});

acheck("app: exportItem() wraps a single pattern the same shape buildExport already uses", async () => {
  const appjs = await (await fetch("js/app.js")).text();
  const fn = appjs.match(/function exportItem\(item\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(/buildExport\(\[item\]\)/.test(fn),
    "a single-pattern export must reuse buildExport() with a one-item array — the wrapper shape is the same either way, so import needs no second code path");
});

acheck("app: summarize() leads with what you're playing over, not a Thumb/Fingers preset name", async () => {
  // Old behaviour showed "Custom" for any hand-edited item, which is almost
  // the whole library now (the built-ins included) — his report. The chord
  // (Single) or key + numerals (Progression) is the useful glance, and the
  // custom NAME is already where anything else worth remembering goes.
  const appjs = await (await fetch("js/app.js")).text();
  const fn = appjs.match(/function summarize\(item\)[\s\S]*?\n\}\n/)?.[0] || "";
  assert(fn, "summarize() must exist");
  assert(!/"Custom"/.test(fn), "summarize() must not fall back to a bare \"Custom\" label anymore");
  assert(!/BASS_PRESETS\.find/.test(fn) && !/CHAOS_PRESETS\[/.test(fn),
    "summarize() must not read the Thumb/Fingers preset names — that's what read as \"Custom\" for almost every real item");
  assert(/CHORDS\[ctx\.chord\]\?\.name/.test(fn), "Single mode must show the chord's real display name");
  assert(/`\$\{.*degreeLabel\(c, ctx\.key\)\)\.join\(.–.\)\} in \$\{ctx\.key\}`/.test(fn),
    "Progression mode must read as one clause, numerals then key (\"I-V-vi-IV in E\"), not separate \"Progression\"/\"Key\" segments");
});

// ---- render report ----
export async function runTests(mount) {
  for (const { name, fn } of asyncChecks) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, msg: e.message });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const head = document.createElement("h2");
  head.textContent = `${passed}/${total} checks passed`;
  head.style.color = passed === total ? "#5bd66f" : "#ff6b6b";
  mount.appendChild(head);

  const ul = document.createElement("ul");
  for (const r of results) {
    const li = document.createElement("li");
    li.textContent = `${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : " — " + r.msg}`;
    li.style.color = r.ok ? "#cfefd4" : "#ff9b9b";
    li.style.margin = "6px 0";
    ul.appendChild(li);
  }
  mount.appendChild(ul);
}
