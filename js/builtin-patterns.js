// builtin-patterns.js — read-only starter patterns, item 2 (OPEN_ITEMS.md).
//
// His own patterns, hand-picked and exported from his real library (session
// 40) rather than authored here — a title is a reference, not a
// reproduction, and the pattern itself has no field that could hold a
// specific recording's melody (only chord role strings and hand-domain
// events). Ordered by bpm, a defensible "easy to hard" spread across the
// tiers rather than an arbitrary one.
//
// NEVER SEEDED INTO localStorage — this array IS the data. The Load sheet
// renders it as its own read-only "Built-in" group; the only action on a row
// is "save a copy" into the real library via storage.js's ordinary save(),
// which is how a copy picks up a real id, a folder of its own, and Finder-
// style de-duping if saved twice. Shape matches a stored item exactly
// (name/pattern/context/source) so every existing renderer — summarize(),
// currentContext()-adjacent code — treats a row here identically to a real
// saved item wherever it only reads, never writes. `v`/`savedAt` are omitted
// on purpose: those are storage.js's own bookkeeping for a REAL save, and
// this array is never written through that path itself.
export const BUILTIN_PATTERNS = [
  {
    id: "builtin:beginner-1",
    name: "Beginner 1",
    source: "drawn",
    pattern: {
      type: "relative",
      chord: "A",
      bass: "travis",
      chaos: "tame",
      thumbBars: [
        [
          { slot: 1, finger: "p", role: "root", string: 5, absolute: false },
          { slot: 3, finger: "p", role: "alt_bass", string: 4, absolute: false },
          { slot: 5, finger: "p", role: "fifth", string: 6, absolute: false },
          { slot: 7, finger: "p", role: "alt_bass", string: 4, absolute: false },
        ],
      ],
      trebleBars: [
        [
          { slot: 3, finger: "i", string: 3 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 7, finger: "a", string: 1 },
          { slot: 7, finger: "m", string: 2 },
          { slot: 7, finger: "i", string: 3 },
        ],
      ],
      bars: [
        [
          { slot: 1, finger: "p", role: "root", string: 5, absolute: false },
          { slot: 3, finger: "p", role: "alt_bass", string: 4, absolute: false },
          { slot: 3, finger: "i", string: 3 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 5, finger: "p", role: "fifth", string: 6, absolute: false },
          { slot: 7, finger: "p", role: "alt_bass", string: 4, absolute: false },
          { slot: 7, finger: "a", string: 1 },
          { slot: 7, finger: "m", string: 2 },
          { slot: 7, finger: "i", string: 3 },
        ],
      ],
      edited: true,
    },
    context: {
      chordMode: "single",
      chord: "G",
      key: "A",
      capo: 0,
      progression: ["A", "E", "F#m", "D"],
      x2: false,
      swing: 50,
      bpm: 90,
    },
  },
  {
    id: "builtin:beginner-2",
    name: "Beginner 2",
    source: "drawn",
    pattern: {
      type: "relative",
      chord: "A",
      bass: "travis",
      chaos: "tame",
      thumbBars: [
        [
          { slot: 1, finger: "p", role: "root", string: 5, absolute: false },
          { slot: 3, finger: "p", role: "alt_bass", string: 4, absolute: false },
          { slot: 5, finger: "p", role: "fifth", string: 6, absolute: false },
          { slot: 7, finger: "p", role: "alt_bass", string: 4, absolute: false },
        ],
      ],
      trebleBars: [
        [
          { slot: 3, finger: "i", string: 3 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 6, finger: "a", string: 1 },
          { slot: 6, finger: "m", string: 2 },
          { slot: 6, finger: "i", string: 3 },
          { slot: 8, finger: "a", string: 1 },
          { slot: 8, finger: "m", string: 2 },
          { slot: 8, finger: "i", string: 3 },
        ],
      ],
      bars: [
        [
          { slot: 1, finger: "p", role: "root", string: 5, absolute: false },
          { slot: 3, finger: "p", role: "alt_bass", string: 4, absolute: false },
          { slot: 3, finger: "i", string: 3 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 5, finger: "p", role: "fifth", string: 6, absolute: false },
          { slot: 6, finger: "a", string: 1 },
          { slot: 6, finger: "m", string: 2 },
          { slot: 6, finger: "i", string: 3 },
          { slot: 7, finger: "p", role: "alt_bass", string: 4, absolute: false },
          { slot: 8, finger: "a", string: 1 },
          { slot: 8, finger: "m", string: 2 },
          { slot: 8, finger: "i", string: 3 },
        ],
      ],
      edited: true,
    },
    context: {
      chordMode: "single",
      chord: "G",
      key: "A",
      capo: 0,
      progression: ["A", "E", "F#m", "D"],
      x2: false,
      swing: 50,
      bpm: 90,
    },
  },
  {
    id: "builtin:fine-enough",
    name: "Fine Enough",
    source: "drawn",
    pattern: {
      type: "relative",
      chord: "D7",
      bass: "travis",
      chaos: "tame",
      thumbBars: [
        [
          { slot: 1, finger: "p", role: "root", string: 4, absolute: false },
          { slot: 3, finger: "p", role: "alt_bass", string: 3, absolute: false },
          { slot: 5, finger: "p", role: "fifth", string: 5, absolute: false },
          { slot: 7, finger: "p", role: "alt_bass", string: 3, absolute: false },
        ],
      ],
      trebleBars: [
        [
          { slot: 8, finger: "a", string: 1 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 5, finger: "a", string: 1 },
          { slot: 6, finger: "m", string: 2 },
          { slot: 6, finger: "i", string: 3 },
          { slot: 3, finger: "i", string: 3 },
        ],
      ],
      bars: [
        [
          { slot: 1, finger: "p", role: "root", string: 4, absolute: false },
          { slot: 3, finger: "p", role: "alt_bass", string: 3, absolute: false },
          { slot: 3, finger: "m", string: 2 },
          { slot: 5, finger: "p", role: "fifth", string: 5, absolute: false },
          { slot: 5, finger: "a", string: 1 },
          { slot: 6, finger: "m", string: 2 },
          { slot: 6, finger: "i", string: 3 },
          { slot: 7, finger: "p", role: "alt_bass", string: 3, absolute: false },
          { slot: 8, finger: "a", string: 1 },
        ],
      ],
      edited: true,
    },
    context: {
      chordMode: "progression",
      chord: "E7",
      key: "E",
      capo: 0,
      progression: ["E", "B", "C#m7", "F#7"],
      x2: false,
      swing: 67,
      bpm: 170,
    },
  },
  {
    id: "builtin:clawin",
    name: "Clawin’",
    source: "drawn",
    pattern: {
      type: "relative",
      chord: "G",
      bass: "travis",
      chaos: "tame",
      thumbBars: [
        [
          { slot: 1, finger: "p", role: "root", string: 6, absolute: false },
          { slot: 7, finger: "p", role: "fifth", string: 6, absolute: false },
          { slot: 4, finger: "p", role: "fifth", string: 6, absolute: false },
        ],
      ],
      trebleBars: [
        [
          { slot: 6, finger: "a", string: 1 },
          { slot: 2, finger: "i", string: 3 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 5, finger: "i", string: 3 },
          { slot: 6, finger: "m", string: 2 },
          { slot: 8, finger: "i", string: 3 },
        ],
      ],
      bars: [
        [
          { slot: 1, finger: "p", role: "root", string: 6, absolute: false },
          { slot: 2, finger: "i", string: 3 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 4, finger: "p", role: "fifth", string: 6, absolute: false },
          { slot: 5, finger: "i", string: 3 },
          { slot: 6, finger: "a", string: 1 },
          { slot: 6, finger: "m", string: 2 },
          { slot: 7, finger: "p", role: "fifth", string: 6, absolute: false },
          { slot: 8, finger: "i", string: 3 },
        ],
      ],
      edited: true,
    },
    context: {
      chordMode: "single",
      chord: "D7",
      key: "A",
      capo: 0,
      progression: ["A", "C#7", "D", "E7"],
      x2: false,
      swing: 67,
      bpm: 200,
    },
  },
  {
    id: "builtin:stumped",
    name: "Stumped",
    source: "drawn",
    pattern: {
      type: "relative",
      chord: "D7",
      bass: "travis",
      chaos: "tame",
      thumbBars: [
        [
          { slot: 1, finger: "p", role: "root", string: 4, absolute: false },
          { slot: 3, finger: "p", role: "alt_bass", string: 3, absolute: false },
          { slot: 5, finger: "p", role: "fifth", string: 5, absolute: false },
          { slot: 7, finger: "p", role: "alt_bass", string: 3, absolute: false },
        ],
      ],
      trebleBars: [
        [
          { slot: 8, finger: "a", string: 1 },
          { slot: 3, finger: "m", string: 2 },
          { slot: 5, finger: "a", string: 1 },
          { slot: 2, finger: "i", string: 3 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 5, finger: "m", string: 2 },
          { slot: 6, finger: "i", string: 3 },
          { slot: 8, finger: "m", string: 2 },
        ],
      ],
      bars: [
        [
          { slot: 1, finger: "p", role: "root", string: 4, absolute: false },
          { slot: 2, finger: "i", string: 3 },
          { slot: 3, finger: "p", role: "alt_bass", string: 3, absolute: false },
          { slot: 3, finger: "m", string: 2 },
          { slot: 3, finger: "a", string: 1 },
          { slot: 5, finger: "p", role: "fifth", string: 5, absolute: false },
          { slot: 5, finger: "a", string: 1 },
          { slot: 5, finger: "m", string: 2 },
          { slot: 6, finger: "i", string: 3 },
          { slot: 7, finger: "p", role: "alt_bass", string: 3, absolute: false },
          { slot: 8, finger: "a", string: 1 },
          { slot: 8, finger: "m", string: 2 },
        ],
      ],
      edited: true,
    },
    context: {
      chordMode: "single",
      chord: "C#m",
      key: "E",
      capo: 0,
      progression: ["E", "B", "C#m7", "F#7"],
      x2: false,
      swing: 62,
      bpm: 220,
    },
  },
];
