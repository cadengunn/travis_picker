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

**Testing on a phone:** `python3 serve.py --lan` binds all interfaces and prints
a `http://192.168.x.x:8137/index.html` URL to open on a device on the same
Wi-Fi. It's opt-in because it exposes the server to the local network. Plain
HTTP is fine for testing audio, tap targets and layout; **installing as a PWA
needs HTTPS**, which is what GitHub Pages is for.

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
js/storage.js     the Saved library (localStorage); store is injectable for tests
js/editor.js      pure tap-to-edit logic (toggleNote, hand inference) — no DOM
js/metronome.js   Web Audio click + playhead scheduling (no dependencies)
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

**No scrolling, ever:** every bar must be visible at once — you're holding a
guitar and can't swipe mid-pattern. `grid.js` sets `data-bars` on the track and
CSS sizes cells as a fraction of available width (square via `aspect-ratio`),
wrapping 4 bars to a 2×2 on a phone. Don't reintroduce a fixed `--cell` px size
or an `overflow-x` scroller.

**Where controls live:** app bar = app-wide *preferences* (note labels, theme).
The slim bar above the grid = things acting on the pattern in front of you
(Edit / Save / Load, plus its name and relative/mixed/absolute indicator). The
bottom panel = *generation* inputs plus Generate. Keep that split when adding
controls.

**Control layout:** the bottom controls are fixed 3-slot rows. Only row 1's
contents swap between chord modes (single: Chord spanning 2 slots; progression:
Key + Progression), so switching modes never shifts the rows below. Keep that
invariant — a jumping control panel was a specific complaint.

**Manual editor** (`editor.js`, all pure — app.js only translates a tapped cell
into `{cellIndex, slot, string, chordId}`):
- Gated behind a **pencil toggle, off by default** — taps must never nudge a
  pattern while you're playing. Edit mode is signalled by a dashed outline.
- **Editing a repeat edits the shared cell.** A 1-bar pattern shown across a
  4-bar progression is *one* cell, so tapping bar 3 changes all four
  (`cellIndex = screenBar % bars.length`). To make one bar differ, raise Pattern
  length first. This was a deliberate choice over auto-expanding.
- **Hand inference:** strings 6/5/4 are always the thumb; 3/2/1 are fingers —
  *except* on an overlap string (a finger string that's also a bass role for
  that chord, e.g. string 3 on D), where it's the thumb on beats and a finger
  off-beat.
- **Drawn bass notes stay relative when they match a role** of the bar's chord
  (so they follow a progression); one matching no role is stored `absolute`.
  A pattern can therefore be **`mixed`** — legal per the spec, surfaced by the
  type indicator rather than silently guessed. `deriveType()` computes it.
- Editing only enforces the hard rule, which the grid gives for free (one cell
  *is* one string+slot). **Generation constraints never apply to drawing** —
  every cell must accept a note. The thumb skeleton and hand domains are
  guidance here, not walls: you can draw a thumb note on an offbeat, or stack
  three bass notes in one slot.
- Every stored thumb event carries `string`, **including relative ones**
  (`resolveBar` recomputes it per chord). Omitting it made the hard-rule dedupe
  key `"slot:undefined"`, which silently swallowed a second drawn bass note in
  the same slot — 17 of 48 cells refused a note. There's a regression test.
- Edits set `pattern.edited`, which saves the item with `source: "drawn"`.
- `state.unsavedEdits` guards the destructive paths: Generate, Load, and a
  Thumb/Chaos change all `confirm()` first, and declining reverts the control.
  Hand-drawn work is the only thing here that can't be re-rolled back.

**Metronome** (`metronome.js`): **raw Web Audio, not Tone.js** — the spec named
Tone.js, but a click is an oscillator plus a gain envelope and the dependency
would have been the project's first, complicating the v2 offline PWA. Revisit
only if v2's pattern playback actually needs a synth library.
- Timing uses the standard **lookahead scheduler**: a coarse `setTimeout` wakes
  every 25ms and schedules clicks ~120ms ahead at exact `AudioContext` times.
  `setTimeout` alone is far too jittery to hold a beat.
- The **playhead is driven from a rAF loop reading the audio clock**, never from
  the scheduler callback — the scheduler runs ahead of what you hear, so
  highlighting there would visibly lead the click. It touches cell classes
  directly instead of re-rendering (up to 8 updates/bar, and a re-render would
  fight edit mode); `render()` resets `litCells`.
- One bar of **count-in** (grid dims, button counts 1–4). `onCountIn(null)` only
  fires on stop, so the **first real step clears the count-in state** — that's
  why `onStep` calls `showCountIn(null)`.
- `start()` creates/resumes the `AudioContext` **inside the click handler**, or
  iOS Safari stays silent. BPM 40–160, clamped in `setBpm`.

**Saved library** (`storage.js`): a saved item is **musical content only** —
`{ pattern, context: { chordMode, chord, key, progression } }` plus a name, id
and timestamp. **Never store UI settings** (theme, label mode) with it; a test
asserts the serialized item contains none. Nomenclature is "Saved", not
"Favorites" (favorites may later be a folder within it). `createStore(key,
storage)` takes its backing store as an argument so tests use an in-memory stub
and never touch the user's real library — keep it that way. The store degrades
quietly: corrupt JSON reads as an empty library, and a refused write (quota /
private mode) returns `null` so the UI can report it instead of throwing. `list()`
sorts newest-first with an insertion-order tie-break, so same-millisecond saves
are still deterministic. Loading restores the pattern **and** its chord context,
then re-renders — it never re-rolls.

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
  bass, chaos, patternBars,       // the options it was generated with
  thumbBars:  [ [ Event, ... ] ], // the two layers, kept separately
  trebleBars: [ [ Event, ... ] ],
  bars: [ [ Event, ... ], ... ],  // merge of the layers; exactly `patternBars` DISTINCT bars
}
Event = { slot: 1..8, finger: "p"|"i"|"m"|"a", role?, string?, fret? }
```

- A slot may hold multiple events (pinches = thumb+finger; double stops = 2–3 fingers).
- **Relative** thumb events store a `role` (`root`/`alt_bass`/`fifth`) and derive string; **absolute** events store the literal `string`.
- All three label modes (Fret = `event.fret`, PIMA = `event.finger`, None = dot only) are pure transforms of the same events.
- `resolvePhrase(pattern, chords)` cycles the distinct `bars` across however many bars are on screen (one chord per bar).

## Key rules (from the spec — keep these invariants)

- **Hard rule (physics):** never two events on the same string in the same slot. Enforced generically in `generator.js` (`enforceHardRule`) and asserted in tests.
- **Thumb skeleton:** one quarter-note thumb on each beat (slots 1,3,5,7); never on offbeats.
- **Hand domains:** fingers own strings 3/2/1 (i→3, m→2, a→1). **Chord-aware thumb domain:** thumb-legal = `{6,5,4}` ∪ the current chord's role strings. This is why D's alt-bass legitimately lands on string 3 — see `thumbLegalStrings()` in `data.js`.
- **Two independent layers.** `thumbBars` and `trebleBars` are generated and stored separately; `bars` is their merge (`mergeBar` → `enforceHardRule`). `regenerateBass()` re-rolls the thumb keeping the exact finger part, `regenerateTreble()` does the reverse — so the Thumb and Chaos controls each disturb only their own layer, and you can audition bass patterns under one right-hand part. Only Pattern-length and **Generate** re-roll everything.
- **Chaos** (Tame/Loose/Chaos) is **presets over independent constraint flags** (`CHAOS_PRESETS`), not branching code — leaves room for a future custom panel. Tame's `noAdjacentSameString` forbids a string sounding on two **adjacent** 8th slots, thumb included — same-string re-strikes are the hardest thing for a beginner. Treble generation walks slots 1→8 in order (checking both neighbours) so this is enforced during generation, not by pruning after.
- **Bass presets** are data (`BASS_PRESETS`). Default is `travis` (root-alt-fifth-alt, the standard Travis pattern). `simple_alt` and `full_random` are the other v1-surfaced presets (`V1_BASS_IDS`); the rest ship as data for later.
- **Chord library** is 14 chords covering degrees 1–6 in the keys C/G/D/A/E. Barre chords assume a *full* barre, so the low string is available as a bass note even where the textbook voicing mutes it — the same convention C already used (its fifth is string 6 fret 3). A test asserts every chord's role strings are covered by its shape.
- **Pattern length** (`PATTERN_LENGTHS`, 1/2/4) is the *only* length dial: how many **distinct** bars of picking. Bars on screen are derived — single mode shows exactly that many; progression mode shows the progression's bars and cycles the pattern across them. Changing it **extends** rather than re-rolls (`setPatternBars`): growing duplicates the existing bars so hand-drawn work survives, and the copies are independent from then on; shrinking keeps the first n. Only **Generate** re-rolls. This replaced a separate Loop + Phrase-length pair whose only useful combinations were "displayed == distinct"; the rest just redrew the same bar. Don't reintroduce a display-length control without that reasoning changing.

## Conventions

- Keep `generatePattern`/`resolvePattern` pure and side-effect-free. RNG is injectable (`options.rng`) so tests are deterministic (mulberry32 seed in `tests.js`).
- No dependencies, no build tooling. Vanilla ES modules only.
- Tests live in the browser (`tests.html`). Add a check for any new invariant. Run them before committing.
- Commit after each working feature; skim the diff. Commit messages end with the `Co-Authored-By` trailer.

## Status & roadmap (v1 build order)

1. **DONE** — pattern generator + grid with Fret/PIMA toggle, relative/absolute model, full generator controls.
1b. **DONE** — progression mode (per-bar chords) with the Nashville number system + key selector; 14-chord library; UI themes from `themes.json`. Pulled forward ahead of favorites.
2. **DONE** — **Saved patterns**: name + save to `localStorage`, list view, load, delete. See the Saved-library notes above.
3. **DONE** — Manual editor (see the editor notes above). The spec's explicit relative/absolute *save dialog* was not built: drawing already keeps role-matching bass notes relative and marks off-role ones absolute, and the type indicator reports `relative`/`mixed`/`absolute` live. Revisit if a save-time choice ("snap to nearest role" vs "keep absolute") is actually wanted.
4. **DONE** — Metronome: Web Audio click (not Tone.js — see above), BPM 40–160, one-bar count-in, and a playhead that lights the sounding column across all bars.

**v1 is complete.** v2+: remaining bass presets in the UI + custom 4-slot builder; pattern audio playback; syncopation/16ths; PWA packaging (manifest, icons, service worker) for phone install via GitHub Pages.

## Where things stand (end of session 2, 2026-07-20)

**v1 is complete** — all four items built, 30/30 checks green in `tests.html`.
Nothing is in progress; the tree is clean.

Verified in-browser this session: the no-scroll 2×2 grid at 375px, per-bar chord
re-mapping, Save/Load round-trip, all 48 cells accepting a drawn note, pattern
length extending rather than re-rolling, unsaved-edit warnings, and playhead
timing against the audio clock.

**Open threads — worth raising before building on top of them:**
- **Nothing has ever run on a phone.** Every session so far has been on the
  laptop, so the whole mobile-first premise — tap targets, the 2×2 grid at real
  phone size, one-handed reach — is still unverified on hardware. **Walking
  through a phone test is the next session's first job.** Quickest route is
  `python3 serve.py --lan` on the same Wi-Fi; GitHub Pages comes later with the
  PWA work.
- **The metronome has never been heard.** Timing, scheduling and the playhead
  were verified programmatically, but audio output was not, and **iOS Safari was
  never tested**. If it's silent on a phone, look first at the AudioContext
  create/resume inside the Play handler. Confirm this before building more audio.
- **Grid bar crowding.** The slim bar above the grid holds the pattern name, the
  type indicator and three pills (Edit/Save/Load). It fits at 375px, but a long
  saved-pattern name will squeeze. Options if it bites: truncate harder, or drop
  "Edit" to just the pencil glyph.
- **No save-time relative/absolute dialog.** The spec asked for one; drawing
  instead keeps role-matching bass relative, marks off-role bass absolute, and
  reports `relative`/`mixed`/`absolute` live. Revisit only if a save-time choice
  ("snap to nearest role" vs "keep absolute") is actually wanted.
- Chord voicings, including the barre shapes, were checked on a real guitar and
  confirmed good. The G Travis bass walks 6–4–5–4 (G–D–B–D); string 5 fret 2 is
  the B from the open G shape, chosen for playability over the literal fifth.

**Likely next steps** (user's call): PWA packaging — manifest, icons, service
worker — to get it onto a phone home screen via GitHub Pages, which is what makes
it genuinely practice-ready; or v2 musical work (remaining bass presets in the
UI + the custom 4-slot builder, pattern audio playback, syncopation/16ths).

## Working with this user

- **Ask before deviating from the spec** — it's a maintained document, and
  deviations (Web Audio over Tone.js, no save dialog) get recorded in it.
- **Surface genuine forks rather than guessing.** Several good decisions came
  from a single well-framed question (chord-aware thumb domain, shared-cell
  editing, merging Loop+Length). Don't ask about things with an obvious default.
- They test each feature themselves on a real guitar between sessions, so
  **stop at natural checkpoints** and say what's worth trying.
- **Report what was and wasn't verified.** Several fixes came from empirically
  reproducing a bug rather than theorising — prefer that.

## Deferred implementation notes

- **Editor tap-inference (item 3):** on an overlap string (finger-domain AND a chord bass role, e.g. string 3 on D), infer a tapped note as thumb on beat slots and finger on offbeat slots. Label always comes from the stored `finger`, never re-inferred from the row. (Stub comment already in `data.js`.)
