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

**Where controls live** — the organising question is *"could you use this with a
guitar in your hands?"*, because vertical space is the scarcest resource:
- **Bottom strip (always visible), one row:** Play, BPM, 🎲 Generate, ⚙ Options.
  Only things you reach for mid-practice. 44px tap targets — don't shrink them
  to buy slider width.
- **Slim bar above the grid:** things acting on the pattern in front of you —
  Edit / Save / Load, its name, and the relative/mixed/absolute indicator.
- **⚙ Options sheet:** *generation* inputs (chord mode, chord or key+progression,
  thumb, chaos, pattern length) and below a rule, app-wide *preferences* (note
  labels, theme). You set these sitting down, between takes.
- **There is no app bar.** A title told you nothing the home-screen icon doesn't,
  and its 53px was the difference between the 4-bar grid fitting and not.

**The height budget is the constraint.** Cells are square and sized from screen
*width*, so grid height is fixed by how wide the phone is and can only be bought
back from chrome. Measured with 4 bars on screen:

| viewport | grid needs | chrome | verdict |
|---|---|---|---|
| 414×719 (iPhone XS Max, Safari) | 403px | 101px | 255px spare |
| 375×553 (SE-class, worst case)  | 374px | 101px | 118px spare |

Chrome was 361px before this pass and the grid was clipped — 5px on the XS Max,
142px on an SE. `main` has `overflow: auto`, so the failure mode is silent: the
grid scrolls inside its own box instead of anything visibly breaking. **Re-measure
these two viewports after any chrome change** — the laptop will not show you the
problem. `.grid { margin: auto 0 }` centres it when there's slack.

**Control layout:** the Options sheet's controls are fixed 3-slot rows. Only row
1's contents swap between chord modes (single: Chord spanning 2 slots;
progression: Key + Progression), so switching modes never shifts the rows below.
Keep that invariant — a jumping control panel was a specific complaint.

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
  iOS Safari stays silent. BPM 40–240, clamped in `setBpm`.

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
- **Chaos** is built as **presets over independent flags** (`CHAOS_PRESETS`),
  not branching code. The generator reads these numbers and **never branches on
  preset name** — tune feel by editing `CHAOS_PRESETS` only. The **difficulty
  curve is Tame → Loose → Unruly; Chaos sits OFF the curve** — it's the fully
  random discovery setting ("novelty over playability", per the spec), not
  "harder than Unruly" (session 6 round 2, user call).
  - **Difficulty model (session 6, refined round 2 against worked examples).**
    Difficulty is **STRIKE-TIMES** — how many distinct columns the *fingers*
    attack in (thumb aside) — **not note count**: a full three-finger rake is
    easy. **Pinched beats count against the strike budget, not on top of it**
    (six attack columns is not Tame however they're split). Finger independence
    (varied finger-sets) matters but **emerges from density**, so it isn't
    enforced separately — a strict one-group synchronization rule for Tame was
    tried in round 1 and **dropped in round 2**: the user's real Tame examples
    mix a lone finger with a repeated pair, or three different sets in three
    strikes. Stack thickness is a side effect, not an axis; **triples are legal
    in every tier**.
  - **The knobs** (all in the preset): `min/maxStrikes` (the per-bar TOTAL
    strike-time budget — offbeats + pinched beats), `pinchOdds` (chance a beat
    also gets a finger note, capped by the budget), `allSinglesOdds` (per-PATTERN
    chance the whole generation is single notes only — keeps genuinely simple
    all-singles rolls a real species; suppresses `minDoubleStops`),
    `doubleStopOdds.{double,triple}` (per-column thickness on non-singles
    rolls), `minDoubleStops` (per-bar stack floor, Unruly's texture guarantee).
  - **Tier numbers** (measured over 400 seeds/tier): **Tame** 2–3 strikes, ~57%
    all-singles, clean adjacency; **Loose** 4–5 strikes, ~39% all-singles, still
    clean; **Unruly** 4–6 strikes, ~9% all-singles, re-strikes allowed, ≥1 stack
    per bar on stacked rolls; **Chaos** uniform 1–8 strikes, uniform column
    shapes (single/double/triple each ⅓), coin-flip pinches, no constraints.
  - **Hard no-blank rule:** every bar gets **≥1 finger note** — the generator
    forces a legal offbeat rather than ship a bare-thumb bar. Asserted in tests.
  - `noAdjacentSameString` (a string sounding on two adjacent 8ths, thumb
    included) is a **HARD** ceiling for the clean tiers (Tame, Loose): if avoiding
    a re-strike leaves no legal finger string, it **drops the column rather than
    re-strike** — so the strike-time count is a best-effort floor, a hard ceiling.
  - Treble is generated for the **whole loop as one circular N = 8×bars slot
    sequence** (`generateTrebleLoop`), not bar-by-bar: interior bar seams are
    ordinary adjacencies and the single wrap is last-8th→first, so a re-strike
    straddling the **loop point** is caught like any interior pair (a per-bar
    generator couldn't see it). Walking in order suffices — the later of any
    adjacent pair, and the last slot for the wrap, sees the other.
  - Latent flag kept but unread: `domainCrossing` (no generator path consumes
    it). Removed along the way: `allowDoubleStops`, `favorSingleOffbeats`,
    `syncFingers`/`groupSizeOdds` (round 1's synchronization mechanism).
- **Bass presets** are data (`BASS_PRESETS`), and **all seven are surfaced** in
  the Thumb selector (session 5): `travis` (default, root-alt-fifth-alt),
  `simple_alt`, `dead_thumb`, `root_fifth` (relative, follow the chord), `climb`
  and `descend` (absolute integer walks that ignore the chord — texture tools,
  show the "absolute bass" indicator), and `full_random`.
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
4. **DONE** — Metronome: Web Audio click (not Tone.js — see above), BPM 40–240, one-bar count-in, and a playhead that lights the sounding column across all bars.

**v1 is complete and shipped.** PWA packaging (manifest, icons, service worker)
is **DONE** and the app is hosted + installed on a phone (session 4, below).
Session 5 added the **remaining bass presets in the UI** and a **chaos redesign**
(4 tiers + density-in-presets + circular generation) — see session 5 below.
v2+ remaining: custom 4-slot bass builder; pattern audio playback;
syncopation/16ths; the deferred **theme colour pass**.

## Where things stand (end of session 4, 2026-07-20)

**v1 is complete and has now run on real hardware** (iPhone XS Max, Safari, over
`serve.py --lan`). 30/30 checks green; the tree is clean; nothing in progress.

**First phone session — confirmed on hardware:**
- **Metronome audio works** on iOS Safari, on every theme and across the tempo
  range. The big unknown (was the AudioContext create/resume in the Play handler
  enough for iOS?) is answered: yes.
- **Tap targets** are big enough to hit in edit mode with all 4 bars showing.
- The 2×2 grid is **legible at arm's length**; fret numbers are small but
  readable at 4-bar size, fine at 1-bar. Themes render **differently on the phone
  than the laptop** — still the deferred colour pass (below), not a regression.
- One-handed operation is fine.

**Fixed this session (all from the phone test):**
- **Playhead didn't light the bass rows.** Two bugs. (1) A CSS specificity miss
  let the thumb-row domain tint outrank `.cell.playing`. (2) Even fixed, a note
  circle covers 82% of its cell, so on a beat the tint was hidden behind the
  thumb note — the playhead looked like it skipped the bass. Now a sounding cell
  also lifts + haloes its note (`--playhead-glow`); user likes the halo.
- **Layout overflowed.** The 4-bar grid was clipped (5px on the XS Max, up to
  142px on an SE-class screen) because chrome was 361px. Cut to ~101px: dropped
  the app bar, moved generation inputs into an **⚙ Options sheet**, made Generate
  a **🎲 button**. Permanent strip is now just Play / BPM / 🎲 / ⚙. See "Where
  controls live" and "The height budget is the constraint" above — **re-measure
  the two viewports in that table after any chrome change.**
- **BPM ceiling 160 → 240** (160 was too slow for real fingerstyle). Widened the
  scheduler lookahead to 0.2s so a fast 8th still schedules in time.
- **"relative" type indicator hidden** — it now shows only as an absolute/mixed
  "bass won't follow the chords" warning; the normal case was just noise.

**Open threads — worth raising before building on top of them:**
- **Themes need a dedicated pass.** They read differently on the phone than the
  laptop — all seven are a reasonable first cut, none is finished. The user wants
  a whole session on colour and legibility, deliberately deferred behind
  functionality. Do it against a real phone screen; `themes.json` is the only
  file that should change.
- **iOS may evict `localStorage` after ~7 days of not opening the app** (Safari's
  storage cap on script-writable data). Save/Load persistence across a full
  Safari quit-and-reopen is now **verified on hardware** — favourites survive.
  But the 7-day eviction is a real risk for a tool used intermittently;
  installing as a home-screen PWA is the main mitigation, another reason Phase 3
  matters. If saved patterns ever vanish for a user, this is the first suspect.
- **Grid bar crowding.** The slim bar above the grid holds the pattern name, the
  type indicator and three pills (Edit/Save/Load). Fits at 375px, but a long
  saved-pattern name will squeeze. Options if it bites: truncate harder, or drop
  "Edit" to just the pencil glyph.
- **No save-time relative/absolute dialog.** The spec asked for one; drawing
  instead keeps role-matching bass relative, marks off-role bass absolute, and
  reports `relative`/`mixed`/`absolute` live. Revisit only if a save-time choice
  ("snap to nearest role" vs "keep absolute") is actually wanted.
- Chord voicings, including the barre shapes, were checked on a real guitar and
  confirmed good. The G Travis bass walks 6–4–5–4 (G–D–B–D); string 5 fret 2 is
  the B from the open G shape, chosen for playability over the literal fifth.

**Session 4 — Phase 3 DONE: PWA packaging + hosted on GitHub Pages. Verified on
hardware** (iPhone XS Max): installed to the home screen, launches standalone,
works in **airplane mode**, saved patterns persist offline. 32/32 checks green.

- **Live at https://cadengunn.github.io/travis_picker/** — public repo
  `cadengunn/travis_picker`, Pages deploys from `main` / root.
- **PWA files added** (dependency-free, no-build like the rest):
  - `manifest.webmanifest` — standalone, portrait, merle colours, 192/512 icons
    (`any maskable`). **Relative `start_url`/`scope` (`./`)** so it survives the
    `/travis_picker/` project subpath; all app paths were already relative.
  - `index.html` — manifest link + iOS `apple-*` tags and `apple-touch-icon`
    (iOS ignores the manifest for the home-screen icon; those tags are what make
    the standalone install + icon work), plus a favicon.
  - `sw.js` — cache-first app-shell precache for true offline; deletes old caches
    on activate; `skipWaiting` + `clients.claim`.
  - `icons/` — generated by `tools/make_icons.py`, a **pure-Python (stdlib-only,
    no PIL) PNG encoder** (this Mac has no PIL/ImageMagick/Node). Draws the app's
    own note-circle mark (orange thumb row / cream finger row) on the merle bg,
    kept in the maskable safe zone so one art serves every mask. Re-run it if the
    mark changes; it's an authoring tool, nothing imports it at runtime.
  - `tests.js` — two async PWA checks: manifest validity, and **precache
    coverage** (every runtime module cached, `tests.js` excluded, all entries
    resolve). The coverage check catches "added a module, forgot to precache it →
    offline silently breaks."
- **⚠️ THE DEPLOY FOOTGUN — do this on every deploy that changes app files:**
  bump `CACHE` in `sw.js` (`travis-picker-v1` → `-v2` …) or installed users get
  stale code until a new SW activates. Doc-only pushes (CLAUDE.md/spec/workflow/
  tests aren't precached) don't need a bump. If a change doesn't show on the
  phone: force-quit and reopen so the waiting SW takes over.
- **The SW only registers on the real HTTPS origin** — `app.js` skips
  `localhost`/`127.0.0.1` so it never fights `serve.py`'s no-store while
  developing (and a plain-http `--lan` origin can't register a SW anyway). So the
  SW can only be exercised on the live Pages URL, not locally — by design.
- **Deploy loop:** edit → (bump `CACHE` if app files changed) → `git push`
  (token is cached in the keychain) → Pages rebuilds in a minute → force-quit +
  reopen on the phone. Live content-types verified correct (sw.js as
  `application/javascript`, manifest as `application/manifest+json`).
- **Privacy — the repo is public.** Before the first push, commit history was
  rewritten (`git filter-branch`) to `cadengunn
  <cadengunn@users.noreply.github.com>`, removing the real name and laptop
  hostname; repo-local `user.name`/`user.email` are set to that identity, so
  **future commits must not reintroduce the real name/email.** One workplace
  reference in the workflow doc was reworded out. No secrets/keys in the repo
  (there's nothing to leak — it's a static app).
- The **localStorage ~7-day eviction risk** (open thread above) is now mitigated
  by the home-screen install, its main defence.

## Where things stand (end of session 5, 2026-07-21)

Session 5 shipped four things, all deployed to Pages (`CACHE` now at **v5**) and
**40/40 checks green**. Everything below is deployed but **only the iOS zoom fix
is confirmed on the phone** — the bass presets and the whole chaos redesign are
**pending the user's guitar test that night**. Expect tuning feedback.

1. **iOS double-tap-zoom fix** *(confirmed on hardware)* — fast double-taps on 🎲
   were triggering Safari's double-tap-to-zoom. Fix: `touch-action: manipulation`
   on `button, select, input, .cell` in `styles.css`. Scoped to controls, not the
   viewport, so pinch-zoom still works.
2. **`v1.0` version tag**, top-left of the grid-bar (`.app-version`) — low-profile
   muted label riding the existing 36px row (no vertical cost). Bump by hand at
   release points.
3. **All seven bass presets surfaced** (see the Bass-presets note above). Dropped
   the `V1_BASS_IDS` filter. Absolute Climb/Descend correctly ignore the chord.
4. **Chaos redesign** (see the expanded Chaos note under "Key rules") — the big
   one. Was a user-authored spec brought in from another session; done in two
   deploys: **step 1** = 4 tiers (Tame/Loose/**Unruly**/Chaos) + all density
   moved into `CHAOS_PRESETS`; **step 2** = circular whole-loop generation
   (`generateTrebleLoop`) fixing the loop-point re-strike. Measured density curve
   (finger notes/bar): Tame ~2.1, Loose ~4.2, Unruly ~6.0, Chaos ~7.7.

**Decisions worth knowing before you tune:**
- Tier feel is **all in `CHAOS_PRESETS`** — numbers only, no generator changes
  needed. That's where any "too busy / too sparse / wrong gap" feedback goes.
- **Hard adjacency for Tame/Loose** was a deliberate spec-alignment call: the
  clean tiers now genuinely never re-strike, at the cost of occasionally dropping
  an offbeat below the target count. If the user finds Tame/Loose too thin, that
  tradeoff (or the offbeat range) is the first knob.
- Naming: **"Unruly"** was the user's pick (candidates were Rowdy/Frayed/Feral).
- `favorSingleOffbeats` was removed (redundant once odds are explicit).

## Where things stand (end of session 6, 2026-07-21)

Session 6 acted on the session-5 guitar test and **redesigned the chaos difficulty
model** around what the user showed with two worked grid images: difficulty is
**strike-times + finger independence, not note count**. See the rewritten Chaos
note under "Key rules." Round 1 deployed as **v1.2** (`CACHE` v7); the user
tested it on guitar the same day, which produced **round 2** below.

- **The reframe, in the user's words:** a full three-finger pinch is *easy* (fingers
  move together); five scattered attacks with a lone finger here and a different
  pair there is *hard* (independence). Two images made the point — image 1 (9 dots,
  3 synchronized rake-strikes) = Tame; image 2 (fewer dots, 5 independent attacks)
  = Loose.
- **What changed in code:**
  - `js/data.js` `CHAOS_PRESETS` rebuilt: added `syncFingers` + `groupSizeOdds`,
    dropped `allowDoubleStops`. Tame = `syncFingers:true` (one consistent group,
    2–3 strike-times); Loose/Unruly/Chaos independent, floors raised (Loose
    `minOffbeats` 2→3, Chaos 0→1). **Triples allowed in every tier.**
  - `js/generator.js` `generateTrebleLoop`: sync path (pick one group, strike it
    everywhere, clamp per column) + a **hard no-blank guard** (every bar ≥1 finger
    note — the rule the user asked for).
  - `js/tests.js`: retooled the tier tests (Tame synchronization %, no-blank across
    all tiers, triples-any-tier), and made the shared-cell editor test robust to
    RNG drift (it had assumed an empty cell).
- **Measured after the change** (300 seeds/tier): Tame 2.6 strike-times / 100%
  one-finger-set; Loose 4.6 / 1%; Unruly 4.9 (denser, adjacency off); Chaos ranges
  sparse→full. Matches the two images.
- **Decisions from the session's questions:** pinches stay **uniform** across beats
  (the "2 and 4" was just an example — could as easily be 1 and 3); Tame's group is
  **any consistent size 1–3**, not fixed at three ("don't get hung up on the
  3-finger thing — strike-times is the key").

**Round 2 (same day, after the round-1 phone test).** The user sent two more Tame
examples that round 1's strict synchronization could NOT generate (a lone finger +
a repeated pair; three different sets in three strikes) — proving **independence
emerges from density and shouldn't be enforced**. Changes, all deployed as v1.3
(`CACHE` v8), 41/41 green:
- **`syncFingers`/`groupSizeOdds` removed** (lived one round). All tiers roll
  finger-sets per column; Tame is Tame because its strike budget is 2–3.
- **Strike budget is now TOTAL columns** (`min/maxStrikes` replacing
  `min/maxOffbeats`): pinches count against it, not on top — found empirically,
  a "Tame" bar had rolled 6 attack columns via pinch stacking.
- **`allSinglesOdds` added** (user: "decent percentage should be all single
  fingers" — was too rare): per-pattern roll, Tame 0.45 / Loose 0.30 / Unruly
  0.10; measured all-singles rates 57/39/9%.
- **Chaos = fully random, off the difficulty curve** (user's call, matches the
  original spec's "novelty over playability"): uniform 1–8 strikes, uniform
  column shape, coin-flip pinches. Only the no-blank guard survives.

**NEXT SESSION — get the round-3 guitar test** on: Tame's 2–3-strike budget,
the Loose jump (4–5 strikes), the all-singles rates, and whether fully-random
Chaos feels right; tune `CHAOS_PRESETS` numbers from the feedback (all feel
lives there). Then the **theme colour pass** (deferred behind functionality; all
seven themes are a first cut, read differently on phone vs laptop — do it
**against a real phone screen**, `themes.json` the only file that changes). Then
v2 musical work: the **custom 4-slot bass builder** (the preset format and the
density model are both ready for it), pattern audio playback, syncopation/16ths.

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
