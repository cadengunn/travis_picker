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
  progressionGroups,
  progressionChords,
  detectProgression,
  degreeOf,
  degreeLabel,
  romanInKey,
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
import { midiToFreq } from "./synth.js";
import {
  generatePattern,
  resolvePattern,
  resolvePhrase,
  regenerateBass,
  regenerateTreble,
  setPatternBars,
} from "./generator.js";
import { createStore } from "./storage.js";
import { toggleNote, inferFinger, resolvedThumbString, deriveType } from "./editor.js";
import {
  createMetronome,
  secondsPerSlot,
  isBeatSlot,
  stepToPosition,
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

const ALL_BASS = BASS_PRESETS.map((p) => p.id);
const ALL_CHAOS = ["tame", "loose", "unruly", "chaos"];
const ALL_PATTERN_BARS = [1, 2, 4];
const ALL_SLOTS_T = [1, 2, 3, 4, 5, 6, 7, 8];

function everyBar(cb) {
  let n = 0;
  for (const chord of CHORD_IDS) {
    for (const bass of ALL_BASS) {
      for (const chaos of ALL_CHAOS) {
        for (const patternBars of ALL_PATTERN_BARS) {
          for (let seed = 1; seed <= 8; seed++) {
            const p = generatePattern(chord, {
              bass, chaos, patternBars, rng: seeded(seed * 97 + n),
            });
            const r = resolvePattern(p, chord);
            for (const bar of r.bars) cb(bar, { chord, bass, chaos, patternBars, seed });
            n++;
          }
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
  const p = generatePattern("C", { bass: "travis", chaos: "tame", patternBars: 1, rng: seeded(9) });
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
  const p = generatePattern("C", { bass: "full_random", chaos: "loose", patternBars: 1, rng: seeded(4) });
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
  // Playability: "whichever barres lower" is the rule, so nothing should land
  // above the 8th fret. (The worst is the A-shape at 6 — the E♭ family.)
  for (const id of CHORD_IDS) {
    for (const s of [6, 5, 4, 3, 2, 1]) {
      const fret = CHORD_SHAPES[id][s];
      assert(fret == null || fret <= 8, `${id} needs fret ${fret} on string ${s} — off the practical neck`);
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

// 7b-i) The chromatic tokens mean what they should: major II (not the diatonic
//       minor ii), the flat-7 MAJOR, and a dominant-7th tonic.
// (Every preset is padded to 4 bars — a 3-chord idea holds its last chord.)
check("tokens: II is major, ♭VII is the flat-7 major, I7 is a dominant 7th", () => {
  assert(progressionChords("maj_1_2_5", "C").join("-") === "C-D-G-G", "I–II–V in C should be C-D-G-G");
  assert(progressionChords("maj_1_2_5", "E").join("-") === "E-F#-B-B", "I–II–V in E needs the new F# chord");
  assert(progressionChords("maj_1_b7_4", "C").join("-") === "C-Bb-F-F", "I–♭VII–IV in C should be C-Bb-F-F");
  assert(progressionChords("maj_1_b7_4", "G").join("-") === "G-F-C-C", "I–♭VII–IV in G should be G-F-C-C");
  assert(progressionChords("maj_1_7_4_1", "C").join("-") === "C-C7-F-C", "I–I7–IV–I in C uses the dom7 tonic");
});

// Every shipped progression is a 4-bar phrase (padded from shorter ideas).
check("every progression is exactly four bars", () => {
  for (const p of PROGRESSIONS) {
    assert(p.tokens.length === 4, `${p.id} has ${p.tokens.length} bars, want 4`);
  }
});

// 7b-ii) Minor keys resolve their own progressions and reject major presets.
check("minor keys: progressions resolve; major presets don't leak in", () => {
  assert(progressionChords("min_1_7_6_5", "Am").join("-") === "Am-G-F-E", "i–VII–VI–V in Am should be Am-G-F-E");
  assert(progressionChords("min_1_7_6_5", "Em").join("-") === "Em-D-C-B", "i–VII–VI–V in Em should be Em-D-C-B");
  // A major preset whose tokens (I, ♭VII, IV) are none of the minor set won't
  // resolve at all in a minor key — proving the modes don't cross-populate.
  assert(progressionChords("maj_1_b7_4", "Am").length === 0,
    "a major preset should not resolve in a minor key (tokens absent)");
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
  // the menu shows the concise idea (I–♭VII–IV), not the 4-bar padding (…–IV–IV)
  const folk = progressionGroups("major").flatMap((g) => g.items).find((i) => i.value === "maj_1_b7_4");
  assert(folk && folk.label === "I–♭VII–IV", `expected "I–♭VII–IV", got "${folk && folk.label}"`);
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
    const p = PROGRESSIONS.find((x) => x.id === roll.progression);
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
  // to be the open "campfire" chords only), and never the current chord.
  const rolled = new Set();
  for (let seed = 1; seed <= 600; seed++) {
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

// 8) Pattern length produces exactly that many distinct bars, and a shorter
//    pattern cycles cleanly across a longer progression.
check("patternBars produces that many distinct bars and cycles across a phrase", () => {
  for (const n of [1, 2, 4]) {
    const p = generatePattern("C", { patternBars: n, rng: seeded(2) });
    assert(p.bars.length === n, `patternBars ${n} produced ${p.bars.length} distinct bars`);
    assert(p.patternBars === n, `pattern should record patternBars ${n}`);
  }

  // a 2-bar pattern over a 4-bar progression: bar 3 repeats bar 1, bar 4 repeats bar 2
  const p2 = generatePattern("C", { patternBars: 2, rng: seeded(6) });
  const phrase = resolvePhrase(p2, ["C", "C", "C", "C"]);
  const sig = (bar) => JSON.stringify(bar.map((e) => [e.slot, e.finger, e.string]));
  assert(sig(phrase[2].bar) === sig(phrase[0].bar), "bar 3 should repeat bar 1");
  assert(sig(phrase[3].bar) === sig(phrase[1].bar), "bar 4 should repeat bar 2");
  assert(sig(phrase[1].bar) !== sig(phrase[0].bar), "a 2-bar pattern should have two different bars");
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
        const p = generatePattern(chord, { chaos, patternBars: 2, rng: seeded(seed * 17 + 3) });
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
      const p = generatePattern(chord, { bass: "travis", chaos: "unruly", patternBars: 2, rng: seeded(seed * 71) });
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
      const p = generatePattern("C", { chaos, patternBars: 4, rng: seeded(seed * 17 + 1) });
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
    for (const patternBars of [1, 2]) {
      for (let seed = 1; seed <= 10; seed++) {
        const p = generatePattern(chord, { chaos: "unruly", patternBars, rng: seeded(seed * 43 + patternBars) });
        const pairs = pairsInLoop(p);
        assert(pairs <= 2 * patternBars,
          `Unruly rolled ${pairs} re-strike pairs, cap is ${2 * patternBars} (${chord} ${patternBars}-bar seed ${seed})`);
        if (pairs > 0) sawRestrike = true;
      }
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
//     across the ENTIRE loop — interior bar seams AND the wrap from the last 8th
//     back to the first. This is what circular generation buys over per-bar; a
//     per-bar generator can't see the loop boundary and would trip there.
check("clean tiers: no same-string re-strike across bar seams or the loop wrap", () => {
  const stringsAtGlobal = (p, gi) => {
    const bar = Math.floor(gi / 8), slot = (gi % 8) + 1;
    // fingers only: the clean-tier no-re-strike rule is same-finger, thumb aside
    return new Set(p.trebleBars[bar].filter((e) => e.slot === slot).map((e) => e.string));
  };
  for (const chaos of ["tame", "loose"]) {
    for (const chord of CHORD_IDS) {
      for (const patternBars of [1, 2, 4]) {
        for (let seed = 1; seed <= 6; seed++) {
          const p = generatePattern(chord, { chaos, patternBars, rng: seeded(seed * 29 + patternBars) });
          const N = 8 * patternBars;
          for (let gi = 0; gi < N; gi++) {
            const a = stringsAtGlobal(p, gi);
            const b = stringsAtGlobal(p, (gi + 1) % N); // circular: wraps last -> first
            for (const s of a) {
              assert(!b.has(s),
                `${chaos}: string ${s} re-strikes across global slots ${gi}->${(gi + 1) % N} ` +
                `(${chord} ${patternBars}-bar seed ${seed})`);
            }
          }
        }
      }
    }
  }
});

// 9) Layer independence: swapping the bass keeps the exact finger pattern, and
//    re-rolling the fingers keeps the exact bass.
check("regenerateBass keeps the right hand; regenerateTreble keeps the bass", () => {
  const p = generatePattern("C", { bass: "travis", chaos: "tame", patternBars: 2, rng: seeded(21) });
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
  const pattern = generatePattern("C", { bass: "travis", chaos: "tame", patternBars: 2, rng: seeded(12) });
  // The capo rides along: it's what the pattern SOUNDS like, so it's content.
  const context = { chordMode: "progression", chord: "C", key: "G", capo: 3, progression: ["G", "C", "D", "G"] };

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
  const p = generatePattern("C", { patternBars: 1, rng: seeded(31) });
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
  const p = generatePattern("C", { patternBars: 1, rng: seeded(32) });
  // C's fifth is string 6 — drawing there should stay RELATIVE (follows chords)
  const onRole = toggleNote(p, { cellIndex: 0, slot: 2, string: 6, chordId: "C" });
  const drawn = onRole.thumbBars[0].find((e) => e.slot === 2);
  assert(drawn && drawn.role === "fifth", `expected a fifth role, got ${JSON.stringify(drawn)}`);
  assert(onRole.type === "relative", `should stay relative, got ${onRole.type}`);

  // it follows the chord: on G the fifth is string 5
  assert(resolvedThumbString(drawn, "G") === 5, "a relative fifth should follow to G's string 5");
});

check("editor: a bass note matching no role goes absolute and flags the pattern mixed", () => {
  const p = generatePattern("D", { patternBars: 1, rng: seeded(33) });
  // D's roles are 4/3/5 — string 6 matches none of them
  const mixed = toggleNote(p, { cellIndex: 0, slot: 2, string: 6, chordId: "D" });
  const drawn = mixed.thumbBars[0].find((e) => e.slot === 2 && e.string === 6);
  assert(drawn && drawn.absolute === true, "an off-role bass note should be stored absolute");
  assert(mixed.type === "mixed", `pattern should read as mixed, got ${mixed.type}`);
  // absolute notes do not follow the chord
  assert(resolvedThumbString(drawn, "G") === 6, "an absolute bass note should stay on string 6");
});

check("editor: editing a shared cell changes every repeat of it", () => {
  const p = generatePattern("C", { patternBars: 1, rng: seeded(34) });
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
  let p = generatePattern("C", { patternBars: 1, rng: seeded(41) });
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

// 13) Pattern length extends instead of re-rolling, so edits survive.
check("setPatternBars duplicates existing bars and keeps them independent", () => {
  let p = generatePattern("C", { patternBars: 1, rng: seeded(42) });
  // draw a distinctive note so we can follow it
  p = toggleNote(p, { cellIndex: 0, slot: 8, string: 1, chordId: "C" });
  const sig = (bar) => JSON.stringify(bar.map((e) => [e.slot, e.finger, e.string]).sort());
  const original = sig(p.bars[0]);

  const grown = setPatternBars(p, 4);
  assert(grown.bars.length === 4, `expected 4 bars, got ${grown.bars.length}`);
  assert(grown.patternBars === 4, "patternBars should update");
  for (let i = 0; i < 4; i++) {
    assert(sig(grown.bars[i]) === original, `bar ${i} should duplicate the original`);
  }

  // the copies are independent: editing bar 2 leaves the others alone
  const edited = toggleNote(grown, { cellIndex: 1, slot: 6, string: 2, chordId: "C" });
  assert(sig(edited.bars[0]) === original, "editing bar 2 must not change bar 1");
  assert(sig(edited.bars[1]) !== original, "bar 2 should have changed");
  assert(sig(edited.bars[2]) === original, "editing bar 2 must not change bar 3");

  // shrinking keeps the first n bars
  const shrunk = setPatternBars(edited, 2);
  assert(shrunk.bars.length === 2, "shrinking should truncate");
  assert(sig(shrunk.bars[0]) === sig(edited.bars[0]), "first bar preserved on shrink");
  assert(sig(shrunk.bars[1]) === sig(edited.bars[1]), "second bar preserved on shrink");
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

  document.querySelector(".dd-catcher").click(); // close for a clean DOM
  assert(!document.querySelector(".dd-panel"), "panel closes");
  host.remove();
});

// ---- the chord wheel (DOM) ----
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
  enhanceSelect(sel, { render: createChordWheel({ tick: () => { ticks++; } }) });
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
  // detent, and the settle.
  const reel = panel.querySelector(".reel-quality");
  Object.defineProperty(reel, "scrollTop", { value: 1 * 38, writable: true }); // ITEM_H in wheel.js
  reel.dispatchEvent(new Event("scroll"));
  assert(ticks === 1, `a name passing the window ticks once, got ${ticks}`);
  await new Promise((r) => setTimeout(r, 200));
  assert(sel.value === "Em", `settling on Minor over root E should give Em, got ${sel.value}`);
  assert(changes === 1, `one bubbling change per settle, got ${changes}`);
  assert(document.querySelector(".dd-wheel"), "the panel stays open after a pick");
  assert(host.querySelector(".dd-label").textContent === "Em", "the trigger follows");
  document.querySelector(".dd-catcher").click();
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
    render: createKeyProgWheel({ keySelect: () => keySel, commitKey }),
    label: keyProgSplitLabel(() => keySel),
    watch: [keySel],
  });
  host.querySelector(".dd-trigger").click();
  const panel = document.querySelector(".dd-panel.dd-wheel");
  assert(panel, "the progression select opens the wheel, not a list");
  assert(panel.classList.contains("wheel-keyprog"), "the panel declares its variant so CSS can re-split the drums");
  assert(panel.querySelectorAll(".drum").length === 2, "two drums");

  const groove = (reelCls) => [...panel.querySelectorAll(`.reel-${reelCls} .reel-item`)]
    .map((c) => c.querySelector(".reel-face").classList.contains("group-start"));
  // ENGRAVED GROUP DIVISIONS (his call): the housing carries no captions, so a
  // curated list keeps its sections as machined grooves. Never on the first name.
  assert(groove("key").join() === "false,false,true",
    `the key drum grooves at the major/minor boundary, got ${groove("key")}`);
  assert(groove("prog").join() === "false,false,true",
    `the progression drum grooves before the ungrouped Custom, got ${groove("prog")}`);

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
    await new Promise((r) => setTimeout(r, 200));
  };

  // The progression reel writes the panel's OWN select.
  await spin("prog", 1);
  assert(progSel.value === "maj_1_4", `progression reel should set the progression, got ${progSel.value}`);
  assert(keySel.value === "C", "…and must not touch the key");

  // The key reel writes the OTHER one, through commitKey.
  await spin("key", 1);
  assert(keySel.value === "G" && keyCommits === 1, `key reel should set the key, got ${keySel.value}`);

  // Crossing into minor re-cuts the progression reel. Without that, the drum keeps
  // showing major progressions the select can no longer hold.
  await spin("key", 2);
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

  document.querySelector(".dd-catcher").click();
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
    enhanceSelect(sel, { render: createChordWheel() });
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
    await new Promise((r) => setTimeout(r, 200));
  };

  await spin(5); // E -> F
  assert(current.value === "F", `first pick should land on F, got ${current.value}`);
  await spin(7); // …and again, from the SAME open panel
  assert(current.value === "G",
    `second pick from the same panel should land on G, got ${current.value} (the panel lost its select)`);
  assert(document.querySelector(".dd-wheel"), "and the panel is still open");

  document.querySelector(".dd-catcher").click();
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
  const frag = document.createElement("div");
  frag.innerHTML =
    '<button id="open-options"></button>' +
    '<button id="tab-setup"></button><button id="tab-prefs"></button>' +
    '<button data-close></button>' +
    '<button id="open-help" data-help="help-mode">?</button>' +
    '<button id="play" data-help="play"><svg></svg></button>' +
    '<div class="help-pop"><p>x</p></div>' +
    '<button id="stray"></button>';

  for (const id of ["open-options", "tab-setup", "tab-prefs", "open-help"]) {
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
  // A disabled button emits NO click, so it would be a dead tap — and the Load
  // pill is disabled exactly when the library is empty, which is the first-run
  // state and the likeliest moment to be reading help. Found in-browser rather
  // than reasoned about: tapping Load in help mode showed the PREVIOUS card.
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:0";
  host.innerHTML =
    '<button id="open-help" data-help="help-mode">?</button>' +
    '<button id="open-load" data-help="open-load" disabled>load</button>' +
    '<div class="field" data-help="capo"><button id="cd" data-capo-step="-1" disabled>-</button></div>';
  document.body.appendChild(host);

  const helper = createHelp({ version: "vTEST" });
  const load = host.querySelector("#open-load");
  const step = host.querySelector("#cd");

  try {
    helper.arm();
    assert(!load.disabled, "a disabled control must become tappable while help mode is armed");
    assert(load.getAttribute("aria-disabled") === "true", "…but must still read as disabled to assistive tech");
    assert(!step.disabled, "a disabled control nested under a help target is lifted too");

    load.click();
    assert(helper._shownKey() === "open-load", "tapping the disabled Load pill shows ITS card");
    step.click();
    assert(helper._shownKey() === "capo", "a disabled end-stop resolves to its field's card");
  } finally {
    helper.disarm();
  }

  assert(load.disabled && step.disabled, "disabling is restored on exit, or the app forgets its own state");
  assert(!load.hasAttribute("aria-disabled"), "the aria stand-in is cleaned up too");
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
    '<div class="bar-header"><span class="bar-num">1</span>' +
    '<span class="dd"><select class="bar-chord"></select><button class="dd-trigger">C</button></span>' +
    "</div></div></div></section>";

  const lamp = helpTargetFor(frag.querySelector("#beat-lamp"));
  assert(lamp && lamp.key === "bpm", "the beat lamp must resolve to the Tempo card, not nothing");

  // The picker is reached through the OVERLAY button, never the hidden <select>:
  // dropdown.js makes the trigger a SIBLING of the select, so only the ancestors
  // of the trigger matter here.
  const picker = helpTargetFor(frag.querySelector(".dd-trigger"));
  assert(picker && picker.key === "grid", "a bar's chord picker must resolve to the grid card");
  assert(helpTargetFor(frag.querySelector(".bar-num")).key === "grid", "so must the bar number");
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
  // Pinned as the two things that make them different KINDS of object, rather than
  // as any particular shade: the tabs speak in the legend face, not the serif; and
  // the current page is HELD IN while a chosen value is LIT UP, so the two active
  // states must not share a fill.
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
  assert(tabOn.backgroundImage !== fmtOn.backgroundImage,
    "the active tab and the active Format value must not share a fill");

  // HELD IN vs standing proud: the seated key loses the cap highlight and gains a
  // deep inset, and only the active one has a lit jewel. Compared against its own
  // inactive twin, so a theme change can't make this vacuous.
  assert(tabOn.boxShadow !== tabOff.boxShadow,
    "the current page must look pressed in relative to the other one");
  assert(/inset/.test(tabOn.boxShadow), `the seated tab needs an inset shadow, got ${tabOn.boxShadow}`);
  const jewel = (id, state) => win.getComputedStyle(frame.contentDocument.getElementById(id), "::before");
  assert(jewel("t-on").backgroundImage !== "none", "the current page's jewel is lit");
  assert(jewel("t-off").backgroundImage === "none", "the other page's jewel is dark");

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
    '<span class="tl-half tl-key">C</span><span class="tl-half tl-prog">I–♭VII–IV</span>' +
    '</span></button></label>' +
    '<div class="field field-die"><button id="die" class="die-btn" type="button"></button></div>' +
    '</div></div>';
  document.body.appendChild(frame);
  await new Promise((resolve) => { frame.onload = resolve; });

  const doc = frame.contentDocument;
  const box = (sel) => { const b = doc.querySelector(sel).getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width }; };
  const chord = doc.getElementById("field-chord");
  const keyprog = doc.getElementById("field-keyprog");

  const single = { die: box("#die"), groupL: box("#field-chord").l, groupR: box("#die").r };
  const row = box(".control-row");
  chord.hidden = true; keyprog.hidden = false;
  const progression = { die: box("#die"), groupL: box("#field-keyprog").l, groupR: box("#die").r };
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
  assert(Math.abs(pair - (chordW - single.die.w - 8)) < 0.5,
    `the Key/Progression field (${pair}px) must span exactly what the chord field does`);

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

acheck("type: every bundled face is declared, and the three voices stay separate", async () => {
  const css = await (await fetch("css/styles.css")).text();

  // A @font-face for each bundled file — the pairing that actually breaks is
  // "font added to the precache, never declared", which looks fine until the
  // system fallback is compared side by side.
  const fontDir = await (await fetch("fonts/")).text();
  const files = [...fontDir.matchAll(/href="([^"?]+\.woff2)"/g)].map((x) => x[1].split("/").pop());
  for (const f of files) {
    assert(css.includes(f), `css/styles.css declares no @font-face for fonts/${f}`);
  }

  // The legend must never fall back to the ROUNDED numeral face: --numeral is a
  // legibility exception for fret digits, not a second opinion about labels.
  const legend = css.match(/--legend:\s*([^;]+);/);
  assert(legend, "--legend token is missing");
  assert(!/rounded/i.test(legend[1]), "--legend must fall back to a grotesque, not the rounded numeral stack");
  assert(/Jost/.test(legend[1]), "--legend should lead with the bundled Jost");
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
