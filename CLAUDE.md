# CLAUDE.md — Travis Picker

Practice tool that generates random, playable Travis-picking (alternating-bass
fingerstyle) right-hand patterns and shows them on a drum-machine grid.
Mobile-first, no build step, no server dependency, no accounts. Runs entirely in
the browser.

Read `travis-picker-spec.md` (the source of truth for the musical model) and
`travis-picker-workflow.md` (the build order) alongside this file.

## Running it

ES modules require HTTP (they won't load from `file://`). From the repo root:

```
python3 -m http.server 8137
```

- App:   http://localhost:8137/index.html
- Tests: http://localhost:8137/tests.html  (prints ✓/✗ per check)

Narrow the browser to phone width — this is a phone-first app.

## Architecture

The generator is a **pure function fully decoupled from rendering**. Musical
"content" (bass presets, chords, chaos levels) is **data, not code** — adding a
preset or chord never touches generator logic.

```
index.html        app shell: controls + grid container
tests.html        loads js/tests.js, renders pass/fail
css/styles.css    mobile-first (phone portrait first; desktop via min-width query)
js/data.js        pure data tables + small pure helpers (no generation logic)
js/generator.js   pure generatePattern() + resolvePattern() + expandToPhrase()
js/grid.js        renderGrid() — Pattern -> DOM only
js/app.js         the ONLY stateful/DOM-glue file: controls -> generator -> grid
js/tests.js       browser-run unit checks
```

Data flow: `app.js` reads controls → `generatePattern(chord, options)` produces
a relative/absolute Pattern → `resolvePattern(pattern, chord)` fills
string+fret → `renderGrid()` draws it. Changing the **chord** only re-resolves
(relative patterns follow the chord); **Generate** and other controls re-roll.

## Core data model (one structure powers everything)

```js
Pattern = {
  type: "relative" | "absolute", // relative from chord-aware thumb modes; absolute from Full Random
  chord: "C",                     // reference chord id
  bass, chaos, loop, phraseBars,  // the options it was generated with
  bars: [ [ Event, ... ], ... ],  // DISTINCT bars: 1 (1-bar loop), 2 (2-bar), or phraseBars (through-composed)
}
Event = { slot: 1..8, finger: "p"|"i"|"m"|"a", role?, string?, fret? }
```

- A slot may hold multiple events (pinches = thumb+finger; double stops = 2–3 fingers).
- **Relative** thumb events store a `role` (`root`/`alt_bass`/`fifth`) and derive string; **absolute** events store the literal `string`.
- Both label modes (Fret = `event.fret`, PIMA = `event.finger`) are pure transforms of the same events.
- `expandToPhrase()` cycles the distinct `bars` across `phraseBars` for rendering.

## Key rules (from the spec — keep these invariants)

- **Hard rule (physics):** never two events on the same string in the same slot. Enforced generically in `generator.js` (`enforceHardRule`) and asserted in tests.
- **Thumb skeleton:** one quarter-note thumb on each beat (slots 1,3,5,7); never on offbeats.
- **Hand domains:** fingers own strings 3/2/1 (i→3, m→2, a→1). **Chord-aware thumb domain:** thumb-legal = `{6,5,4}` ∪ the current chord's role strings. This is why D's alt-bass legitimately lands on string 3 — see `thumbLegalStrings()` in `data.js`.
- **Chaos** (Tame/Loose/Chaos) is **presets over independent constraint flags** (`CHAOS_PRESETS`), not branching code — leaves room for a future custom panel.
- **Bass presets** are data (`BASS_PRESETS`). Default is `travis` (root-alt-fifth-alt, the standard Travis pattern). `simple_alt` and `full_random` are the other v1-surfaced presets (`V1_BASS_IDS`); the rest ship as data for later.

## Conventions

- Keep `generatePattern`/`resolvePattern` pure and side-effect-free. RNG is injectable (`options.rng`) so tests are deterministic (mulberry32 seed in `tests.js`).
- No dependencies, no build tooling. Vanilla ES modules only.
- Tests live in the browser (`tests.html`). Add a check for any new invariant. Run them before committing.
- Commit after each working feature; skim the diff. Commit messages end with the `Co-Authored-By` trailer.

## Status & roadmap (v1 build order)

1. **DONE** — pattern generator + grid with Fret/PIMA toggle, relative/absolute model, full generator controls.
2. **NEXT** — save favorites: name + save to `localStorage`, list view, reload.
3. Manual editor: tapping toggles cells on the grid, with the relative/absolute save dialog (incl. the "bass note matches no role" flag).
4. Metronome/tempo: Tone.js click, BPM 40–160, count-in. iOS: call `Tone.start()` on first user gesture or Safari stays silent.

v2+: remaining bass presets in the UI + custom 4-slot builder; pattern audio playback; syncopation/16ths; PWA packaging (manifest, icons, service worker) for phone install via GitHub Pages.

## Deferred implementation notes

- **Editor tap-inference (item 3):** on an overlap string (finger-domain AND a chord bass role, e.g. string 3 on D), infer a tapped note as thumb on beat slots and finger on offbeat slots. Label always comes from the stored `finger`, never re-inferred from the row. (Stub comment already in `data.js`.)
