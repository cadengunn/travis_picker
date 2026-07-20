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
} from "./data.js";
import { generatePattern, resolvePattern, resolvePhrase } from "./generator.js";

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
const ALL_CHAOS = ["tame", "loose", "chaos"];
const ALL_PATTERN_BARS = [1, 2, 4];

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

// 5) Tame constraints: 2-4 offbeats/bar, no identical treble string on
//    consecutive offbeat slots.
check("Tame: 2-4 offbeats per bar, no repeated treble string on consecutive offbeats", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const p = generatePattern("C", { bass: "simple_alt", chaos: "tame", rng: seeded(seed) });
    const bar = p.bars[0];
    // count distinct offbeat slots that have any finger note
    const filled = OFFBEAT_SLOTS.filter((s) => bar.some((e) => e.slot === s && e.finger !== "p"));
    assert(filled.length >= 2 && filled.length <= 4,
      `Tame offbeats should be 2-4, got ${filled.length} (seed ${seed})`);

    // no identical treble string on consecutive FILLED offbeats
    let prev = null;
    for (const s of filled) {
      const strings = bar.filter((e) => e.slot === s && e.finger !== "p").map((e) => e.string);
      if (prev != null) {
        for (const st of strings) {
          assert(st !== prev, `Tame repeated treble string ${st} on consecutive offbeats (seed ${seed})`);
        }
      }
      prev = strings[0];
    }
  }
});

// ---- render report ----
export function runTests(mount) {
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
