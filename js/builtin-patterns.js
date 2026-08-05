// builtin-patterns.js — starter patterns, item 2 (OPEN_ITEMS.md).
//
// His own patterns, hand-picked and exported from his real library (session
// 40) rather than authored here — a title is a reference, not a
// reproduction, and the pattern itself has no field that could hold a
// specific recording's melody (only chord role strings and hand-domain
// events). Ordered by bpm, a defensible "easy to hard" spread across the
// tiers rather than an arbitrary one.
//
// THIS ARRAY IS THE SOURCE DATA, not a live view of what's in the library.
// The first design (v3.8.0) kept these read-only and unseeded, with a
// "save a copy" button — his session-41 verdict was that this cost two
// entries for what's really one thing, a needless extra step for what's
// meant to be a demo/sample. So instead, `app.js`'s `seedNewBuiltins()`
// writes each entry into the REAL library once, via the ordinary
// `savedStore.save()`, filed into a folder literally named "Built-in" —
// after that they're indistinguishable from anything hand-saved: rename,
// move, delete, whatever. `restoreMissingBuiltins()` (the Load sheet's
// "Restore" button) re-adds any whose `id` here no longer matches a
// `builtinId` on a stored item, which is how a rename or a folder move
// doesn't read as "deleted" — only an actual delete does. Both live in
// app.js because both need `savedStore`; this file stays pure data, tested
// the same way `data.js` is (see tests.js's "builtin patterns" check).
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
