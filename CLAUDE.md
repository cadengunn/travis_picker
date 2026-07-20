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
python3 serve.py          # port 8137
```

- App:   http://localhost:8137/index.html
- Tests: http://localhost:8137/tests.html  (prints ✓/✗ per check)

Narrow the browser to phone width — this is a phone-first app.

Use `serve.py`, not `python3 -m http.server`: it adds `Cache-Control: no-store`.
Browsers cache ES modules aggressively **and** a cache-busting query on the page
does not propagate to its imports, so with a plain server you keep testing stale
code. (If you do use the stdlib server, hard-refresh with Cmd+Shift+R.)

## Architecture

The generator is a **pure function fully decoupled from rendering**. Musical
"content" (bass presets, chords, chaos levels) is **data, not code** — adding a
preset or chord never touches generator logic.

```
index.html        app shell: controls + grid container
tests.html        loads js/tests.js, renders pass/fail
serve.py          no-store dev server (see above)
themes.json       UI themes as data (5 color roles each) — edit here, not in CSS
css/styles.css    mobile-first; colors are CSS vars set by js/theme.js
js/data.js        pure data tables + small pure helpers (no generation logic)
js/generator.js   pure generatePattern() + resolveBar/resolvePattern/resolvePhrase
js/grid.js        renderGrid() — resolved phrase -> DOM only
js/theme.js       loads themes.json, applies a theme as CSS custom properties
js/app.js         the ONLY stateful/DOM-glue file: controls -> generator -> grid
js/tests.js       browser-run unit checks
```

Data flow: `app.js` reads controls → `generatePattern(chord, options)` produces
a relative/absolute Pattern → `resolvePhrase(pattern, chords)` expands the cell
across the phrase and fills string+fret **per bar** → `renderGrid()` draws it.
Changing a **chord** only re-resolves (relative patterns follow the chord);
**Generate** and the generation inputs re-roll.

**Chord modes** (`state.chordMode`): `single` applies one chord to every bar;
`progression` assigns a chord per bar. Per-bar edits are handled by one
delegated `change` listener on `#grid`, so they survive re-renders. Absolute
patterns (Full Random) keep literal bass strings across the progression and
show the "bass won't follow chords" indicator.

**Nashville numbers:** progressions are stored as scale **degrees**
(`PROGRESSIONS`, e.g. `[1,5,6,4]`), and the selected **key** (`KEYS`) resolves
them to chords. So `1–5–6–4` is C-G-Am-F in C and E-B-C#m-A in E. Changing key
transposes by degree — including hand-edited bars (`degreeOf`), with unknown
chords left alone. `detectProgression()` re-identifies the current bars after
any edit and the selector falls back to **Custom** when they stop matching a
preset. Degree 7 (diminished) is intentionally absent.

**Themes:** `themes.json` is the source of truth — each theme is 5 roles
(`bg`, `surface`, `accent`, `active`, `label`). `theme.js` sets those as CSS
custom properties and *derives* the rest (`--line`, `--muted`, `--beat-tint`,
`--row-thumb`, `--control`) by blending hexes into opaque colors, so the CSS
needs no alpha math and adding a theme is a pure data edit. Choice persists in
`localStorage`. Note circles: thumb = `--active`, fingers = `--accent` (keeps
the hand-domain read; verified legible in all themes incl. light-mode
Elizabeth). `styles.css` carries the "merle" values as a fallback if the fetch
fails.

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
- **Chord library** is 14 chords covering degrees 1–6 in the keys C/G/D/A/E. Barre chords assume a *full* barre, so the low string is available as a bass note even where the textbook voicing mutes it — the same convention C already used (its fifth is string 6 fret 3). A test asserts every chord's role strings are covered by its shape.
- **Phrase length** is 1, 2, or 4 bars (8 was too wide for a phone). The generator clamps the loop cell to the phrase, so a 2-bar loop inside a 1-bar phrase collapses to 1.

## Conventions

- Keep `generatePattern`/`resolvePattern` pure and side-effect-free. RNG is injectable (`options.rng`) so tests are deterministic (mulberry32 seed in `tests.js`).
- No dependencies, no build tooling. Vanilla ES modules only.
- Tests live in the browser (`tests.html`). Add a check for any new invariant. Run them before committing.
- Commit after each working feature; skim the diff. Commit messages end with the `Co-Authored-By` trailer.

## Status & roadmap (v1 build order)

1. **DONE** — pattern generator + grid with Fret/PIMA toggle, relative/absolute model, full generator controls.
1b. **DONE** — progression mode (per-bar chords) with the Nashville number system + key selector; 14-chord library; UI themes from `themes.json`. Pulled forward ahead of favorites.
2. **NEXT** — save favorites: name + save to `localStorage`, list view, reload. Should persist the chord mode + progression alongside the pattern.
3. Manual editor: tapping toggles cells on the grid, with the relative/absolute save dialog (incl. the "bass note matches no role" flag).
4. Metronome/tempo: Tone.js click, BPM 40–160, count-in. iOS: call `Tone.start()` on first user gesture or Safari stays silent.

v2+: remaining bass presets in the UI + custom 4-slot builder; pattern audio playback; syncopation/16ths; PWA packaging (manifest, icons, service worker) for phone install via GitHub Pages.

## Deferred implementation notes

- **Editor tap-inference (item 3):** on an overlap string (finger-domain AND a chord bass role, e.g. string 3 on D), infer a tapped note as thumb on beat slots and finger on offbeat slots. Label always comes from the stored `finger`, never re-inferred from the row. (Stub comment already in `data.js`.)
