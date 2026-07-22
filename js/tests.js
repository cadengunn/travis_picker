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
  PROGRESSIONS,
  CUSTOM_PROGRESSION_ID,
  CHORD_SHAPES,
  progressionChords,
  detectProgression,
  fitProgression,
  midiOf,
  OPEN_STRING_MIDI,
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
  BPM_MIN,
  BPM_MAX,
} from "./metronome.js";

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, msg: e.message });
  }
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
check("progression: relative bass re-maps per bar, right hand unchanged", () => {
  const p = generatePattern("C", { bass: "travis", chaos: "tame", patternBars: 1, rng: seeded(9) });
  const chords = ["C", "G", "D", "Am"];
  const phrase = resolvePhrase(p, chords);

  assert(phrase.length === 4, `expected 4 bars, got ${phrase.length}`);

  phrase.forEach(({ chord, bar }, i) => {
    assert(chord === chords[i], `bar ${i} should carry chord ${chords[i]}`);
    const c = CHORDS[chord];
    const thumbs = bar.filter((e) => e.finger === "p");
    // travis = root, alt, fifth, alt
    const expected = [c.root, c.alt, c.fifth, c.alt];
    const got = thumbs.map((e) => e.string);
    assert(JSON.stringify(got) === JSON.stringify(expected),
      `bar ${i} (${chord}) bass should be ${expected.join("-")}, got ${got.join("-")}`);
  });

  // right hand identical across bars (same cell, 1-bar loop)
  const fingerSig = (bar) =>
    JSON.stringify(bar.filter((e) => e.finger !== "p").map((e) => [e.slot, e.finger]));
  const sig0 = fingerSig(phrase[0].bar);
  for (let i = 1; i < phrase.length; i++) {
    assert(fingerSig(phrase[i].bar) === sig0, `bar ${i} right hand should match bar 0`);
  }
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

// 7) Nashville: every key resolves degrees 1-6 to a real chord.
check("keys: all degrees 1-6 resolve to chords in the library", () => {
  for (const k of KEY_IDS) {
    for (let d = 1; d <= 6; d++) {
      const chord = KEYS[k].degrees[d];
      assert(chord, `key ${k} has no chord for degree ${d}`);
      assert(CHORDS[chord], `key ${k} degree ${d} -> "${chord}" not in CHORDS`);
    }
  }
});

// 7b) Every preset progression resolves in every key.
check("progressions: every preset resolves in every key", () => {
  for (const k of KEY_IDS) {
    for (const p of PROGRESSIONS) {
      const chords = progressionChords(p.id, k);
      assert(chords.length === p.degrees.length,
        `${p.name} in key ${k} resolved ${chords.length}/${p.degrees.length} chords`);
      chords.forEach((c) => assert(CHORDS[c], `${p.name} in ${k} produced unknown chord ${c}`));
    }
  }
});

// 7c) detectProgression round-trips presets and reports custom edits.
check("detectProgression: matches presets, falls back to Custom", () => {
  for (const k of KEY_IDS) {
    for (const p of PROGRESSIONS) {
      const bars = fitProgression(progressionChords(p.id, k), 4);
      assert(detectProgression(bars, k) === p.id,
        `expected ${p.id} in key ${k}, got ${detectProgression(bars, k)}`);
    }
  }
  // a hand-edited bar that breaks the pattern reads as custom
  const bars = fitProgression(progressionChords("1_5_6_4", "C"), 4); // C G Am F
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
check("Tame: ≤3 total finger strike-times, no same string on adjacent 8th slots", () => {
  for (const chord of CHORD_IDS) {
    for (let seed = 1; seed <= 12; seed++) {
      for (const bass of ["travis", "simple_alt"]) {
        const p = generatePattern(chord, { bass, chaos: "tame", rng: seeded(seed * 31) });
        const bar = p.bars[0];

        // maxStrikes is a hard ceiling (3) on ALL columns with a finger note —
        // offbeats AND pinched beats; the floor is best-effort (adjacency can
        // drop a column rather than re-strike), so we only assert the ceiling.
        const filled = new Set(bar.filter((e) => e.finger !== "p").map((e) => e.slot));
        assert(filled.size <= 3,
          `Tame strike-times should be ≤3, got ${filled.size} (${chord}/${bass} seed ${seed})`);

        // adjacency across ALL slots, thumb included
        const stringsAt = (slot) => new Set(bar.filter((e) => e.slot === slot).map((e) => e.string));
        for (let slot = 1; slot < 8; slot++) {
          const a = stringsAt(slot), b = stringsAt(slot + 1);
          for (const s of a) {
            assert(!b.has(s),
              `Tame: string ${s} sounds on adjacent slots ${slot}/${slot + 1} (${chord}/${bass} seed ${seed})`);
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
        for (const bar of p.bars) {
          const byCol = {};
          for (const e of bar) if (e.finger !== "p") (byCol[e.slot] ??= []).push(e.string);
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
      const stacksPerBar = p.bars.map((bar) => {
        let stacks = 0;
        for (const slot of ALL_SLOTS_T) {
          if (bar.filter((e) => e.slot === slot && e.finger !== "p").length >= 2) stacks++;
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
    const N = p.bars.length * 8;
    const at = (gi) => {
      const bar = Math.floor(gi / 8), slot = (gi % 8) + 1;
      return new Set(p.bars[bar].filter((e) => e.slot === slot).map((e) => e.string));
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
    return new Set(p.bars[bar].filter((e) => e.slot === slot).map((e) => e.string));
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
  const context = { chordMode: "progression", chord: "C", key: "G", progression: ["G", "C", "D", "G"] };

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
  for (const banned of ["theme", "labelMode", "merle", "elizabeth", "pima"]) {
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

  // Equal temperament: A4 (MIDI 69) is 440Hz, and an octave doubles frequency.
  assert(Math.abs(midiToFreq(69) - 440) < 1e-6, "MIDI 69 -> 440Hz");
  assert(Math.abs(midiToFreq(81) - 880) < 1e-6, "an octave up doubles to 880Hz");
  assert(midiToFreq(64) > 0, "a real note has a positive frequency");
});

// ---- async PWA checks ----
// The sync `check()`s above run at import time; these need fetch(), so they run
// (awaited) inside runTests before the report renders. Served by serve.py.
const asyncChecks = [];
function acheck(name, fn) {
  asyncChecks.push({ name, fn });
}

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

  // Every precached path must actually resolve (catches a typo'd entry).
  for (const p of listed) {
    const r = await fetch(p);
    assert(r.ok, `precache entry "${p}" does not resolve (${r.status})`);
  }
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
