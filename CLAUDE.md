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
fonts/            bundled Fraunces (serif voice) + Jost (panel legends), both
                  .woff2 + their OFL licenses — precached, see "Type" below
css/styles.css    mobile-first "tweed faceplate" (v2.1); colors are CSS vars set by js/theme.js
js/data.js        pure data tables + small pure helpers (no generation logic)
js/generator.js   pure generatePattern() + resolveBar/resolvePattern/resolvePhrase
js/grid.js        renderGrid() — resolved phrase -> DOM only
js/theme.js       loads themes.json, applies a theme as CSS custom properties
js/storage.js     the Saved library (localStorage); store is injectable for tests
js/editor.js      pure tap-to-edit logic (toggleNote, hand inference) — no DOM
js/metronome.js   Web Audio click + pattern playback + playhead scheduling (no deps)
js/synth.js       Karplus-Strong plucked-string voice (no deps) — pattern audio
js/platform.js    OS integrations: wake lock, iOS audio session, SW auto-update
js/app.js         the ONLY stateful/DOM-glue file: controls -> generator -> grid
js/tests.js       browser-run unit checks
```

Data flow: `app.js` reads controls → `generatePattern(chord, options)` produces
a relative/absolute Pattern → `resolvePhrase(pattern, chords)` **re-merges the
two layers per bar** (`resolveMergedBar`) and fills string+fret → `renderGrid()`
draws it. Changing a **chord** only re-resolves (relative patterns follow the
chord); **Generate** and the generation inputs re-roll. **Resolving works from
the LAYERS (`thumbBars`/`trebleBars`), not the reference-merged `pattern.bars`**,
because a same-slot bass/finger collision is chord-specific: the finger layer is
generated free of the thumb, so a string-3 finger survives in every bar whose
chord leaves string 3 open and is overwritten only where the chord's bass lands
there (D/Dm's alt bass). `pattern.bars` is the reference-chord merge, now used
only for its `.length`; the per-chord truth is `resolveMergedBar`.

**Chord modes** (`state.chordMode`): `single` applies one chord to every bar;
`progression` assigns a chord per bar. Per-bar edits are handled by one
delegated `change` listener on `#grid`, so they survive re-renders. Absolute
patterns (Full Random) keep literal bass strings across the progression and
show the "bass won't follow chords" indicator.

**Nashville numbers (token model, session 13):** progressions are stored as
harmonic **tokens** (`PROGRESSIONS[].tokens`, e.g. `["I","V","vi","IV"]`), and
the selected **key** (`KEYS`) maps each token to a chord (`KEYS[k].chords`). Tokens
— not bare 1–6 scale numbers — because the curated set needs harmony a plain
degree can't express: a **major `II`** (distinct from the diatonic minor `ii`),
the flat-seven major **`♭VII`**, and a dominant-7th tonic **`I7`**. Each key also
carries a **`mode`** (`major`/`minor`); a key's mode decides which progressions
are offered (the app filters by it — there is **no separate Major/Minor toggle**,
the key selector holds both). Changing key **within a mode** transposes by token
(`degreeOf` → `KEYS[newKey].chords[token]`), hand-edited bars included, unknown
chords left alone; changing key **across** the mode line resets to that mode's
first preset (can't transpose — the token sets differ). `detectProgression()`
re-identifies the bars after any edit (in-mode only, preferring an exact-length
match so `I–IV–V–I` isn't read as the shorter `I–IV–V`) and falls back to
**Custom**. Degree 7 (diminished) is still absent.

**Every progression is a 4-bar phrase** (`tokens.length === 4`): a 2-chord idea
repeats (`I–V` → `I–V–I–V`), a 3-chord idea holds its last chord
(`I–IV–V` → `I–IV–V–V`). A separate **`label`** field carries the concise idea
(`I–V`, `I–♭VII–IV`) shown in the menu and the header readout; `tokens` is the
literal realization. A hand-edited (Custom) progression shows its per-bar degrees
instead — via **`degreeLabel(chord, key)`**, which prefers the curated key token
and falls back to **`romanInKey`** (v2.7.3): the numeral computed from the chord
root's interval to the tonic + its quality, so a non-diatonic bar reads as a real
numeral (`♯iv`, `♭ii`, `VI7`) rather than `?`. The computed value reproduces the
map token for diatonic chords, and the tritone spells `♯IV` by convention. Menus group by data: keys by `KEYS[].mode`, progressions by
`PROGRESSIONS[].style` (Foundations / Classic Country / Traditional Folk /
Modern Acoustic / Classic Standards / Minor), the single-chord picker by
`SINGLE_CHORD_GROUPS` (Open chords first), the per-bar picker by `CHORD_GROUPS`.
`dropdown.js` renders `<optgroup>` labels as section headers.

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
- **Slim bar above the grid: TWO rows** again since v2.11.0 — capo state (left)
  + the **four pills** (right), then the pattern **name** on its own line.
  **`.app-head` is 55px.** It was one 32px row from v2.10.2, and that collapse is
  what bought the 31px that moved the musical context above the grid; the name
  came back down when the Guide became a fourth pill and, with a capo set, left
  the name **35px** of a 351px row — an ellipsis and nothing else. It now gets
  the full width in every state. **Measured at 4 bars:** nothing overflows; at
  414×818 the second row is invisible (112px of stage slack absorbs it), at
  375×553 the clearance under the grid goes **28px → 11px**, which is the entire
  price. The name row is **reserved even when empty** (a fresh generation shows
  no name at all — no "Untitled" placeholder), so saving or loading never shifts
  the grid. Re-measure both viewports if this row's height changes.
- **ONE readout above the grid says what you're playing over** (`#chord-head`),
  in both chord modes: the single chord big, or the progression's Roman numerals
  + key. They used to sit in different places — chord above the grid, progression
  up in the header — so the information moved when you switched modes. The slot's
  **height is reserved (22px)** so the grid can't shift; the 40px single-mode
  chord still overflows it upward, exactly as it did when the box was zero-height.
  Moving the context here also gave it the stage's full width instead of ~196px,
  so **the worst-case readout now renders at 16px** (`CONTEXT_BASE_PX`, which the
  `.context` CSS must match — `fitContext` sets the size inline). `fitContext` is
  pure insurance now; nothing shrinks.
- **The pills are ICON-ONLY** (`.pill-icon`, v2.8.1): pencil / floppy /
  folder — and since v2.11.0 a **`?` Guide** (`.pill-help`), which came out of the
  Options sheet because it was the only *action* in there wearing a field label,
  and help belongs with the always-reachable actions rather than on a settings
  page. Its glyph is a real letter, so it wears the intaglio as a `text-shadow`
  pair rather than the SVG `drop-shadow` filter. All four are engraved with the
  transport's intaglio drop-shadow pair so a generic
  glyph reads as part of the faceplate (the clever move is the treatment, not the
  metaphor — a metaphor has to survive at 18px). They were the last text controls
  in an app that otherwise speaks in glyphs, and the words cost width the context
  needed: **199px → 146px, handing the readout 143px → 196px.** Words live on in
  `title`/`aria-label`. The **saved count moved into the label too** — writing
  `textContent` on the Load pill would wipe its `<svg>`, so `refreshSavedCount()`
  sets `title`/`aria-label` and leans on the disabled state to say "nothing to
  load". The REC lamp still rides the Edit pill (hence `display: inline-flex`).
- **The context AUTO-SHRINKS to fit** (`fitContext()` in `app.js`, v2.7.5). Roman
  numerals with accidentals run long — `♯iii – ♯vi – I7 – ♭II · Am` needs 171px —
  and ellipsizing hid the very information the readout exists to give. So it
  scales instead: 14px base, **10.5px floor**,
  one measure-and-set pass (the pills are `flex: 0 0 auto`, so the space the
  context gets doesn't change when its font does). **Since v2.8.1's icon pills
  left 196px, every realistic readout — the worst case included — now sits at the
  full 14px and nothing shrinks at all**; `fitContext` stays as the insurance that
  made a longer future readout safe. (Measured at 375×553 before the icons:
  presets 14px, a 4-accidental custom bar ~13.4px, the worst case ~11.7px.)
  Re-fits on `document.fonts.ready` (Fraunces loads async and is wider than the
  fallback) and on resize. Two supporting trims: the **version tag moved into the
  Options sheet header** (beside the title, free — it's shorter than the ✕; it was
  eating ~43px for information you never read mid-take), and `.context .sep`
  margins went 10px → 5px. *A third header row was considered and rejected — the
  SE grid budget has ~0 spare.*
- **Accidentals need a FIXED `line-height`** wherever they appear (`.context`,
  `.dd-trigger`, `.dd-option`). `♭`/`♯` (U+266D/U+266F) aren't in Fraunces, so
  they render from a fallback whose taller ascent/descent grows the line box:
  picking a `♭VII` progression grew its dropdown trigger **+4px** and pushed the
  bottom-anchored Options sheet up 3.75px (measured both ways). Pinning
  `line-height` makes every inline box the same height whatever font serves the
  glyph. Watch for this on any new text that can contain them.
- **⚙ Options sheet: TWO PAGES** since v2.10.0 — **Generation** (chord mode +
  capo, then the chord/key+progression row, then thumb/chaos/pattern length) and
  **Preferences** (the Sound lamp bank, note labels, theme, guide). You set all of
  it sitting down, between takes. The split exists to buy height: one page had
  ~27px spare at 375×553, so nothing new could be added. The gear always opens on
  Generation. Three rules hold it together, each fixing something measured:
  **the tabs ride the sheet's TITLE line** (so the split costs no height at all —
  the version tag moved to the Guide to make the room); **both pages live in one
  CSS grid cell** with the inactive one hidden by `visibility`, so the panel is
  always the height of the taller page and switching tabs can't make the
  bottom-anchored sheet jump; and **the die sits in the chord row and nothing
  else**, because that adjacency is the only thing that says what its scope is.
  `.segmented.seg-tabs button` is double-classed for specificity — `.segmented
  button` is defined later in the file and won on source order, leaving the tabs
  at `padding: 10px 0` with the two words butted together.
- **There is no app bar.** A title told you nothing the home-screen icon doesn't,
  and its 53px was the difference between the 4-bar grid fitting and not.

**The height budget is the constraint.** Cells are square and sized from screen
*width*, so grid height is fixed by how wide the phone is and can only be bought
back from chrome. Measured with 4 bars on screen:

Re-measured after the **v2.1 visual-identity pass** (session 8), 4 bars on screen:

| viewport | grid needs | chrome | verdict |
|---|---|---|---|
| 375×553 (SE-class, worst case) | 384px | 169px | fits, ~0 spare (no overflow) |

The v2.1 chrome grew from ~101px to ~169px on purpose — a **two-row header**
(context + actions, then the name) and the **BPM readout moved under the slider**
— and the SE case still fits with `main` not overflowing (verified in-browser).
That means the SE is now near the edge: **any further chrome must be measured at
375×553 before shipping.** `main` has `overflow: auto`, so the failure mode is
silent — the grid scrolls inside its own box rather than anything visibly
breaking; the laptop will not show you the problem. The 1-bar single view is far
smaller (~322px grid) and never the constraint. `.stage { justify-content:
center; padding-bottom: 28px }` biases the grid slightly UP (focal points want to
sit a touch above centre, and it keeps the top of the pattern clear when the
Options sheet slides up).

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
- The **beat lamp** (`#beat-lamp`, by the BPM readout) rides this SAME
  `onStep`/`onCountIn` loop — no second clock. It blinks on beats (odd 1-based
  slots; downbeat = slot 1, a bigger pulse), so it's a **silent visual metronome**
  when the click is off. The count-in reports each digit twice (beat + offbeat
  8th), so app.js pulses only when the count advances. NOTE: rAF is paused when
  the preview tab is hidden, which freezes both the playhead and this lamp — so
  the blink can only be verified on a real (foreground) device, not the dev box.
- One bar of **count-in** (grid dims, button counts 1–4). `onCountIn(null)` only
  fires on stop, so the **first real step clears the count-in state** — that's
  why `onStep` calls `showCountIn(null)`.
- `start()` creates/resumes the `AudioContext` **inside the click handler**, or
  iOS Safari stays silent. BPM 40–240, clamped in `setBpm`.

**Pattern playback** (`synth.js` + `metronome.js`, session 7): you can *hear* a
generated pattern, not just see it and the click. It **rides the same lookahead
scheduler** — no second clock. `app.js` builds a `step -> [{midi, bass}]` table
in `render()` (beside `setBars`) via `noteTable()`, so edits/re-rolls/chord
changes carry over for free; the scheduler schedules those notes at the same
exact `AudioContext` times as the clicks. Stacked events (pinches/double stops)
share a slot and so sound together. Pitch is `OPEN_STRING_MIDI[string] + fret`
(standard EADGBe, `midiOf()` in `data.js`); a malformed event yields `NaN` and
the synth skips it.
- **Click and Pattern are independent on/off toggles** (`setClickEnabled` /
  `setPatternEnabled`, Options sheet, both default on, persisted in
  `localStorage` under `tp-audio`). The **count-in always clicks** regardless, so
  you get an audible 1-2-3-4 even in pattern-only mode.
- **Synth is Karplus-Strong, dependency-free** — this settled the roadmap's
  raw-Web-Audio-vs-library question: a plucked-string voice is a noise burst
  through a short delay line with an averaging low-pass in the feedback path, and
  it sounds like a string, so **no library** (keeps the offline PWA clean). Each
  pluck is rendered **offline into an `AudioBuffer`** (plain JS filling a
  `Float32Array`) and played via a `BufferSource` — no `AudioWorklet`, no
  deprecated `ScriptProcessor`, iOS-safe. Buffers are **cached per (pitch, voice)**
  (~two dozen distinct pitches); all voices share one `DynamicsCompressor` bus so
  a triple stop + thumb can't clip. A ~50ms tail fade prevents truncation clicks
  (a fixed `seconds` can cut a low note mid-ring, since KS rings ~4× longer on a
  low string than a high one — the low delay line cycles fewer times/sec).
- **Two voices, all knobs in `synth.js` (`BASS_VOICE`/`TREBLE_VOICE`).** Bass is
  **palm-muted** — the classic Travis thumb sound: a short dark thump, not a
  ringing note. The `brightness` knob (1 = open/canonical KS; lower = darker) is
  the mute: an in-loop one-pole low-pass leaves the fundamental but eats the
  harmonics, and below ~0.375 the excitation is pre-smoothed an extra pass for a
  duller attack. Guitar-tuned to `brightness: 0.37` (session 7). Treble stays
  bright (`brightness` defaults to 1). Tune by ear on a phone: `brightness` for
  mute amount, `decay`/`seconds` for length, `gain` for level.

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
then re-renders — it never re-rolls. `rename(id, name)` (v2.4.5) updates the name
in place (trims, ignores blanks, keeps pattern/id/savedAt); each Load-menu item is
Load / Rename / Delete.

**Type — the panel speaks in THREE voices** (session 17), and the rule that
decides which is *where the words sit*, not what they mean:
- **`--serif` (Fraunces)** — what a control **says**: values, names, prose, and
  any word or typed glyph **inside** a control (a dropdown's value, a lamp's
  name, a segmented button, the capo stepper's `−`/`+`).
- **`--legend` (Jost)** — what the machine **calls** a thing: the small tracked
  caps **above** a control, silkscreened on the faceplate. One tier only —
  10px / 0.16em / 500 (`--legend-size`/`-track`/`-weight`). A group caption
  (`.sheet-sec`) is the *same object* as a field label, same left edge; it used
  to be 9px/0.22em indented 2px, i.e. smaller type on the thing that outranks.
- **`--numeral` (rounded geometric)** — fret digits in note circles, the bar-num
  chip, ruler ticks, BPM. A **legibility exception**, not a third opinion.

**Jost is bundled (OFL 1.1), not the system Futura it resembles** — referencing
a commercial system face is only free while every user is on Apple hardware, and
an OFL face is ours to embed, renders identically everywhere, and stays free if
this is ever sold. Same footing as Fraunces. Adding any font means adding it to
`sw.js` PRECACHE and bumping `CACHE`; **two tests** guard it (every `fonts/*.woff2`
is precached; every bundled file has an `@font-face`, and `--legend` never falls
back to the rounded stack). Anything typed that isn't in either face must be
**drawn** — the sheet's `✕` was U+2715 and rendered in Arial, the one system-font
element in the app.

**Themes:** `themes.json` is the source of truth (**default: `jerry`** since
v2.9.2 — the app icon is built from Jerry's roles, so the two match) — each theme is 5 roles
(`bg`, `surface`, `accent`, `active`, `label`) plus an **optional `hardware`**
role (the metal fittings: sheet lip, die/primary borders, jewel rim; defaults
to the house brass `#c9a24a` — Doc overrides to nickel, Jerry to bronze,
Elizabeth to copper). `theme.js` sets those as CSS custom properties and
*derives* everything else by blending hexes (`--line`, `--muted`, `--beat-tint`,
`--control`, and since the session-9 color pass also `--grid-line`,
`--band-thumb`, `--beat-wash`, `--glyph`, `--hardware-deep`, the jewel-lamp
family `--lamp-hot/rim/glow` + `--jewel-off*`, `--active-deep`, and
`--recess-shadow` via a surface-luminance check for light themes). **Only two
washes stay translucent** (`--beat-wash`, `--lamp-glow` — they layer over other
derived fills); the rest are opaque so CSS needs no alpha math. Nothing
theme-dependent is hardcoded in `styles.css` anymore — that file's fixed rgba
is limited to true texture (tweed weave, `--bevel-hi`, shadows). Adding a theme
is a pure data edit. Choice persists in `localStorage`. Note circles: thumb =
`--active`, fingers = `--accent` (keeps the hand-domain read). `styles.css`
carries the "merle" values as a fallback if the fetch fails.

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
- `resolvePhrase(pattern, chords)` cycles the distinct layers across however many bars are on screen and **re-merges each per its own chord** (`resolveMergedBar`) so the bass wins same-slot collisions per bar (one chord per bar).

## Key rules (from the spec — keep these invariants)

- **Hard rule (physics):** never two events on the same string in the same slot. Enforced generically in `generator.js` (`enforceHardRule`) and asserted in tests.
- **Thumb skeleton:** one quarter-note thumb on each beat (slots 1,3,5,7); never on offbeats.
- **Hand domains:** fingers own strings 3/2/1 (i→3, m→2, a→1). **Chord-aware thumb domain:** thumb-legal = `{6,5,4}` ∪ the current chord's role strings. This is why D's alt-bass legitimately lands on string 3 — see `thumbLegalStrings()` in `data.js`.
- **Two independent layers.** `thumbBars` and `trebleBars` are generated and stored separately, and the **finger layer is generated free of the thumb** (strings 1/2/3 only — the thumb is NOT seeded into the treble generator). They merge **per chord at resolve time** (`resolveMergedBar` → `enforceHardRule`, bass added first so it wins a same-slot collision). `regenerateBass()` re-rolls the thumb keeping the exact finger part, `regenerateTreble()` does the reverse — so the Thumb and Chaos controls each disturb only their own layer, and you can audition bass patterns under one right-hand part. Only Pattern-length and **Generate** re-roll everything.
  - **Fingers generate wherever they want; the bass overwrites string-3 collisions per chord** (session 10). A shared 1-bar cell over a D-key progression keeps its string-3 fingers in the G/A bars and lets D/Dm's alt bass overwrite only the D bars — before, a D reference chord seeded string 3 into the treble generator and starved every bar there. If a bar's whole finger part was string-3 pinches on a D/Dm alt-bass beat, `resolveMergedBar` rescues one finger onto a free string so no bar goes bare-thumb.
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
    strike-time budget), `pinchOdds` (per-STRIKE placement weight: the chance a
    budgeted strike lands on a beat — a pinch, fingers riding the thumb's
    existing attack moment — vs an offbeat, a NEW attack moment, i.e. the
    syncopation skill; a full side falls back to the other so the budget is a
    true floor, and all-pinch bars are possible but rare, ~`pinchOdds^budget`),
    `allSinglesOdds` (per-PATTERN chance the whole generation is single notes
    only — keeps genuinely simple all-singles rolls a real species; suppresses
    `minDoubleStops`), `doubleStopOdds.{double,triple}` (per-column thickness on
    non-singles rolls), `minDoubleStops` (per-bar stack floor, Unruly's texture
    guarantee), `maxRestrikes` (per-BAR budget of same-FINGER re-strikes on
    adjacent 8ths — replaced the old `noAdjacentSameString` boolean in round 5:
    0 = clean, 2 = Unruly's rationed spice, Infinity = Chaos). **A re-strike is
    one FINGER re-plucking a string on adjacent 8ths** (each finger owns one
    string, so it's a finger-vs-finger property); the thumb riding a finger's
    string — only string 3, on D/Dm's alt bass — is ordinary alternating picking,
    NOT a re-strike (session 10, user call). So the treble is generated with no
    thumb seeding and the budget counts finger pairs only.
  - **Tier numbers** (measured over 500 seeds/tier, round 5): **Tame** 2–3
    strikes, ~57% all-singles, ~3% all-pinch bars, clean; **Loose** 4–5
    strikes, still clean; **Unruly** 5–6 strikes (~7% of bars drop to 4 when
    the re-strike budget blocks a column), re-strikes 0–2/bar avg ~1.9 (was
    ~3.5 unlimited with a tail to 11 — round 5's "too much"), ~4% all-singles,
    ≥1 stack per bar on stacked rolls; **Chaos** genuinely uniform 1–8 strikes,
    uniform column shapes (single/double/triple each ⅓), unlimited re-strikes.
    (Unruly's strike floor was raised from 4/10% in round 3.)
  - **Hard no-blank rule:** every bar gets **≥1 finger note** — the generator
    forces a legal offbeat rather than ship a bare-thumb bar. Asserted in tests.
  - **Re-strikes are rationed, not binary** (round 5): `maxRestrikes` charges
    each adjacent same-FINGER-string pair against its bar's budget (a string
    colliding with BOTH neighbours costs 2), so total finger pairs never exceed
    bars × maxRestrikes — asserted in tests (on `trebleBars`, the finger layer,
    since the bass overwriting a finger is not a re-strike). At budget 0
    (Tame/Loose) this is
    the old hard ceiling: if avoiding a re-strike leaves no legal finger
    string, the generator **drops the column rather than re-strike** — so the
    strike-time count is a best-effort floor, a hard ceiling. The same drop now
    applies to Unruly once its budget is spent (~7% of its bars land on 4
    strikes for this reason).
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
- **Chord library** is 21 chords (session 13): the 14 open/barre majors+minors, plus the dominant-7 family `C7/G7/D7/A7/E7`, `F#` (E's II), and `Bb` (C's ♭VII). Covers every token across the major keys C/G/D/A/E and the minor keys Am/Em. **Dominant 7ths keep the parent major's bass** — the ♭7 sits on a *finger* string in every shape (E7 uses the `020130` voicing precisely so its alt bass stays E rather than dropping to the ♭7), so `I7` alternates exactly like `I` with the 7th as a finger colour. Barre chords assume a *full* barre, so the low string is available as a bass note even where the textbook voicing mutes it — the same convention C already used (its fifth is string 6 fret 3). A test asserts every chord's role strings are covered by its shape, and that `CHORD_GROUPS`/`SINGLE_CHORD_GROUPS` each partition the library.
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
Session 6 signed off the generation-difficulty tuning; **session 7 shipped
pattern audio playback** (Karplus-Strong, palm-muted bass — see below), tagged
**v2.0**. v2+ remaining: custom 4-slot bass builder; syncopation/16ths (dropped);
the deferred **visual identity / theme pass**; pre-loaded patterns.

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
    no PIL) PNG codec + resampler** (this Mac has no PIL/ImageMagick/Node). Since
    session 15 it frames and downscales the drawn `tools/icon-master.png` (the
    thumbs-up-with-a-thumbpick mark) rather than drawing shapes itself, keeping
    the art in the maskable safe zone so one piece serves every mask. Re-run it if
    the mark changes; it's an authoring tool, nothing imports it at runtime.
  - `tests.js` — two async PWA checks: manifest validity, and **precache
    coverage** (every runtime module cached, `tests.js` excluded, all entries
    resolve). The coverage check catches "added a module, forgot to precache it →
    offline silently breaks."
- **⚠️ THE DEPLOY FOOTGUN — do this on every deploy that changes app files:**
  bump `CACHE` in `sw.js` (`travis-picker-v1` → `-v2` …) or installed users get
  stale code until a new SW activates. Doc-only pushes (CLAUDE.md/spec/workflow/
  tests aren't precached) don't need a bump. If a change doesn't show on the
  phone: force-quit and reopen so the waiting SW takes over.
- **⚠️ THE SECOND FOOTGUN, found in session 17: the precache MUST bypass the
  HTTP cache.** GitHub Pages serves app files `max-age=600`, and `cache.addAll`
  fetches through that cache — so a worker installing within ten minutes of the
  PREVIOUS deploy fills the NEW cache with the OLD bytes. The state is permanent
  and silent (the cache is written only at install, so nothing re-fetches; the
  app runs stale code under a current worker and force-quitting can't shake it
  loose). `install` now fetches each entry with `{ cache: "reload" }`. Measured,
  not theorised: against a `max-age=600` response, three default-mode fetches
  never reached the server and a `reload` fetch did. `updateViaCache: "none"`
  only exempts `sw.js` itself — it does nothing for the files `sw.js` fetches.
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
   release points. *(It moved to the Options sheet header in v2.7.4 and to the
   foot of the Guide in v2.10.1, where it's `APP_VERSION` in `app.js`. Each move
   was to give the width back to a readout beside it.)*
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

**Round 3 (2026-07-22, deployed as v1.4, `CACHE` v9).** The round-2 build "feels
very good" — two tweaks only: **Unruly's floor raised** (`minStrikes` 4→5,
`allSinglesOdds` 0.10→0.05; occasional rolls read too easy for the tier) and the
**startup chord is now E** (`DEFAULT_CHORD` in `data.js` — what the user actually
drills; taste, not musical logic).

**Round 4 (2026-07-22, deployed as v1.5, `CACHE` v10) — pinch allocation
unified.** The user asked why pinches were a separate mechanism at all; answer:
mostly vestigial (the old offbeats-are-the-dial model), except for one musical
fact worth keeping — a pinch rides the thumb's existing attack moment while an
offbeat strike creates a new one (the syncopation skill). So the two-phase
allocator (roll pinches, spend the rest on offbeats — which structurally
preferred offbeats and caused Unruly's budget shortfall) became **one weighted
roll per budgeted strike**: `pinchOdds` is now the per-strike chance of landing
on a beat, with fallback to whichever side has room. User calls: all-pinch bars
**rare but possible** (measured: Tame ~3%, Loose ~0.6%). Results: Unruly is a
true 5–6, Chaos's strike spread is genuinely uniform 1–8 (the old cap starved
7–8), and pinch counts in busy tiers rose to their natural rate (Unruly ~2.2/bar
from ~1.4).

**Round 5 (2026-07-22, deployed as v1.6, `CACHE` v11) — re-strikes rationed.**
Round 4 verdict: offbeat preference gone (good), but Unruly "a little too much"
— the user proposed capping adjacency rather than lowering density, which is
the right call (re-strikes are the spec's "hardest thing", and unlimited
adjacency + the true strike floor averaged ~3.5 pairs/bar, tail to 11). The
`noAdjacentSameString` boolean became **`maxRestrikes`** — a per-bar re-strike
budget (0 clean / 2 Unruly / Infinity Chaos), each audible adjacent pair
charged to the bar placing it. Unruly now rolls 0–2 pairs/bar (avg ~1.9);
Tame/Loose/Chaos measurably unchanged. New test asserts the loop-wide cap.

**Round 5 CONFIRMED on guitar — generation tuning is SIGNED OFF** (user:
"more playable while still clearly the most challenging tier"; "we'll call this
good for now on the generation tweaking"). All four tiers are guitar-approved.
If feel ever drifts, everything is numbers in `CHAOS_PRESETS` — `maxRestrikes`
1/3 for milder/spicier Unruly, etc.

## Where things stand (end of session 7, 2026-07-22)

**Session 7 shipped pattern audio playback and tagged v2.0** (`CACHE` v12).
You can now *hear* a generated pattern, not just see it + the metronome. The
raw-Web-Audio-vs-synth-library question is **settled: dependency-free
Karplus-Strong** sounds like a string, so no library (see the Pattern-playback
note under the Metronome section for the full design). Deployed to Pages, 43/43
checks green.

- **Rides the existing scheduler**, no second clock (as planned). Two independent
  **Click / Pattern** toggles in Options, both default on, persisted; count-in
  always clicks. Play stays a plain start/stop transport.
- **Bass is palm-muted** — this was the guitar-test feedback loop this session:
  first pass rang out too long (KS rings ~4× longer on low strings), shortened
  the tail, then the user wanted the classic palm-muted thumb *thump*. Added a
  `brightness` knob (in-loop low-pass + pre-smoothed attack) and tuned by ear to
  **`brightness: 0.37`**. All voice knobs are numbers in `synth.js`.
- **UX answers from the user:** Play output = **independent Click + Pattern
  toggles** (not one combined button); bass **slightly louder** than fingers.
- **Verified in-browser** (couldn't hear it from the dev box): plucks schedule
  through the synth, toggles gate correctly, offline render confirmed the muted
  bass is measurably darker + shorter than the bright voice. **Sound quality was
  the user's call on the phone** — that's what drove the brightness tuning.
- Open thread: pattern playback and the metronome click can mask each other at
  some tempos; fine so far, but the per-note `gain`s in `synth.js` are where to
  balance if the pattern gets lost under the click.

**NEXT SESSION — visual identity pass** (now that audio is done). In suggested
order:
- **Visual identity pass** (expanded from the old "theme colour pass" at the
  user's request): overall appearance — **fonts and general visual style, "make
  it feel more my own"** — with dialing in the seven themes as a subsection. Do
  it **against a real phone screen**. Relaxes the old "themes.json only" rule:
  fonts touch `styles.css`, and a bundled font file needs `sw.js` precache + a
  CACHE bump. Dependency-free + offline PWA → system font stacks or a bundled
  .woff2, no font CDN. (User may bring a visual reference.)
- **Pre-loaded patterns** (user wants this): ship as *data* — a read-only
  "Built-in" section in the Load sheet with "save a copy", NOT seeded into
  localStorage (survives reinstalls, never pollutes the real library, updates
  can add more). Fits the "favorites as a folder within Saved" design note.
- **Custom 4-slot bass builder** — *pending a real need.* What it adds over the
  manual editor: a custom bass is a reusable GENERATION input (re-roll fingers
  over it endlessly via the layer system), relative-by-construction (follows
  progressions), persistent in the Thumb selector. The open question posed to
  the user: do they ever want a bass line outside the seven presets? If that
  itch never comes, drop it like 16ths.
- Smaller: JSON export/import of the Saved library (insurance against iOS's
  ~7-day localStorage eviction), grid-bar crowding if long names bite.

**DROPPED: syncopation/16ths** (user call, this session): at real Travis-picking
tempos the 8-slot grid is already all you can fit — 16ths would generate
patterns nobody drills. Don't resurrect without a musical reason.

## Where things stand (end of session 8, 2026-07-22)

**Session 8 shipped the visual-identity pass — v2.1** (`CACHE` v13), the first
half of the deferred "visual identity" work. **Structure/"physical" design only;
colour is still deferred** (all seven themes untouched — that's the next
sub-session). Iterated entirely in a throwaway phone-frame mockup before touching
the app; deployed to Pages, **43/43 checks green**, height budget re-measured (SE
still fits, no overflow — see the height-budget note above).

**The design language: the whole screen is one warm tweed "faceplate" — a piece
of gear.** Mood board the user brought: 60s/70s RCA Victor country (Jerry Reed,
Chet Atkins), Gretsch walnut-and-gold, tweed amp grille cloth, Arhoolie folk
(Elizabeth Cotten). The governing rule the user set: **this is a practical
workhorse practice tool — the right-hand pattern grid is ALWAYS the hero; the
chord just labels it. Craftsmanship should surround the tool, never overshadow
it.** (An early "chord as hero" pass with a giant watermark letter was explicitly
rejected for hurting grid legibility.)

- **Serif voice: Fraunces**, bundled at `fonts/fraunces-latin.woff2` (Latin
  subset, full variable axes wght/opsz/SOFT/WONK, ~118KB, **OFL 1.1** — license at
  `fonts/OFL.txt`). No font CDN (offline PWA), so it's precached in `sw.js` +
  a CACHE bump. `--serif` is Fraunces (chords, name, buttons, headers, BPM);
  **`--numeral` stays a geometric rounded stack for fret numbers inside note
  circles** — high-contrast serif hairlines go mushy small. A deliberate
  serif/geometric pairing reads more "designed" than serif everywhere.
- **Faceplate = `body` background:** fixed tweed weave (two crosshatch
  gradients) + a top sheen + an edge vignette, over a new **`--faceplate`** tone
  (derived in `theme.js` as `mix(bg, surface, 0.42)`). The weave/sheen/vignette
  are **fixed rgba (texture, not hue)** so they ride every theme; the colour pass
  tunes the roles, not this. `main` + `.controls` are transparent so it's one
  continuous surface.
- **The grid is RECESSED into the faceplate** (`.grid-track` gets the inset
  shadow + surface fill), the transport buttons are **RAISED + carved** (dished
  radial + chamfer bevel + a debossed/intaglio glyph), and the Options selects
  are **recessed wells** (inset, inverse of the buttons). One consistent
  bevel language.
- **Grid legibility:** killed every per-cell border; strings now read from quiet
  **horizontal lines** (`--grid-line`) + **thumb-row banding** (`--band-thumb` on
  `.domain-thumb`) + the stronger divider under string 3. Only downbeats get a
  faint wash (`.cell.beat::before`). Notes dominate. **Row order confirmed against
  `grid.js` (strings 1→6 top-to-bottom): fingers/cream on top, thumb/amber at the
  bottom** — the mockups initially had this flipped; fixed.
- **Header restructure (two rows)** *(the version tag moved to the Options sheet
  in v2.7.4, and the context auto-shrinks to fit since v2.7.5 — see "Where
  controls live" above; row order is otherwise still as described here)*
  **:** row 1 = version + musical **context**
  (`#context`: Nashville degrees + key, e.g. `1 – 5 – 6 – 4 · E`, sized to sit
  quietly by the pills — **progression mode only**) + Edit/Save/Load pills; row 2
  = the pattern **name**, which owns a full row so a long saved name can't stretch
  the buttons (a real bug found mid-session). Name is **always visible** now —
  unsaved reads a muted italic **"Untitled"** (`renderLoadedName`). Single mode
  hides the context row and shows the one chord big above the grid
  (`#chord-head`, modest — the grid is the hero). `renderContext()` in `app.js`
  drives both.
- **Numeral chips:** `grid.js` `buildHeader` now leads with a small numbered chip
  when >1 bar is on screen (fixes 2×2 reading order); in single mode the per-bar
  header is empty (the big chord-head carries it) and collapses via
  `.bar-header:empty`.
- **Hardware transport:** play kept as the standard glyph (it still shows
  count-in digits, so it can't be pure SVG) but dished; **Generate is a tilted,
  stamped cream Bakelite die** and **Options an engraved gear** (inline SVG). BPM
  readout **moved under a full-width slider** (more travel = more precise).
- **Options sheet = the same tweed object lifted forward**, gold hairline lip,
  serif header, section captions. **Click/Pattern are amp "jewel lamps"** — a
  native checkbox (visually hidden, still the control) drives a jewel that glows
  amber when on (`.lamp input:checked ~ .jewel`); off-state is dark glass. User's
  favourite moment.

**Signed off as V2.1 pending the user's real-phone test.** The user expects
possible **subtle refinements** after drilling on it. Everything is structure —
when the colour sub-session happens, it's a `themes.json` edit plus tuning the
fixed texture-overlay opacities if needed. **Still to do in the visual arc:** the
seven-theme colour/legibility pass (deferred here), then pre-loaded patterns.

## Where things stand (end of session 9, 2026-07-23)

**Session 9 shipped the seven-theme color pass — v2.2** (`CACHE` v15), the
second half of the visual-identity arc. 43/43 checks green; all seven themes
eyeballed in-browser at 375px. **Pending the user's phone test** — expect a
nitpick round.

**The structural insight that drove it:** the v2.1 stylesheet had a hidden
"Merle assumption" — `--grid-line`, `--band-thumb`, the beat wash, the idle
play/gear glyph `#cdb894`, the brass literals (`#b98f3f`, `#8a5a20`, `--gold`)
and the amber lamp glow were all **fixed warm-brown values**, which is why
Merle looked finished and every other theme looked like Merle wearing a
different shirt (Elizabeth's "concrete band" and disabled-looking Play button
were this). All of it moved into `theme.js` as per-theme derivations — see the
rewritten Themes note above. The jewel lamps now glow in each theme's `active`
(Jerry's pilot lamps glow teal — the identity moment of the pass).

**Role edits, per theme** (all in `themes.json`): Merle untouched (the anchor).
Chet: real Gretsch-gold thumb `#f2a93c` (was peach `#ffd9a0`, nearly identical
to the cream fingers — the hand-domain read had vanished), bg/surface one step
deeper. Jerry: darker swamp water bg `#17291e`; bronze hardware. Doc: honey
thumb `#e4b268` (was flat tan — "nothing glowed"), nickel hardware. Elizabeth:
warm-paper surface `#fffcf4` (was clinical white); copper hardware; everything
else was the derivation layer's fault, now fixed. Tommy: fingers deepened from
butter `#ffe9a8` to stage gold `#f5d67b` (value separation from the white
spotlight thumb). Buster: bg/surface one step toward velvet (was reading
synthwave against the tweed).

**Phone review + refinement round (same session, `CACHE` v16):** the user
reviewed all seven on hardware — verdict "fantastic", no role changes asked.
Two refinements from the review:
- **Per-theme `playhead` override** (second optional role, like `hardware`):
  the default `mix(surface, active, 0.4)` desaturates to gray when surface and
  active are near-complements. Doc got lifted denim `#6f8dad` (blue+amber is
  the worst case), Tommy warm brass gel `#7d6f4a` (a stage light, not a gray
  pillar — note his playhead-GLOW stays white, so the note lights white inside
  a warm column), Buster lit lavender `#7569b0` (was mauve mud). Merle, Chet
  (burnished copper — the standout), Jerry (sage) and Elizabeth keep the
  derived blend, which genuinely lands for them.
- **The die is per-theme now:** pips fill `var(--bg)` (fixed brown went
  invisible on Elizabeth's chocolate die; now navy pips on Doc's ivory, cherry
  on Chet's cream, cream on Elizabeth's chocolate) and the bottom edge is
  derived `--accent-deep` instead of a fixed tan smudge.
Buster's beat-column stripes (previous nit) passed the phone review — leave.
- **Gradient caps derived** (`CACHE` v17, user nit: Doc/Buster dice "looked
  multicolored"): the raised-button top highlight was still a fixed warm cream
  `#f6ecd6`, i.e. a warm cap on a cool body. Now `--accent-hi`/`--active-hi` =
  the hue pulled 60% toward white — the die/segmented/primary/load buttons and
  the lit Play are each ONE material, lighter where the light hits. Merle's
  ivory die is visually unchanged (its cream cap was already ~its accent+white).

**Tagged v2.3** (`CACHE` v18) — the visual identity arc (v2.1 structure + this
session's color pass) is complete and signed off on hardware. Version label
bumped to v2.3; no code change from v2.2's last commit beyond the label + cache.

**Dev-environment note:** the Browser-pane preview server can't read
`~/Desktop` (macOS TCC), so in-browser verification ran against an rsync mirror
of the repo in the session scratchpad (`.claude/launch.json` entry
`travis-picker-8141`). Re-sync the mirror after edits before re-checking; the
phone workflow (`serve.py --lan`) is unaffected.

## Where things stand (session 10, 2026-07-23)

Two threads: a generation bug fix, then the **hardware-details pass** (functional
lamps + button physicality — the user's favourite kind of work).

**v2.4.2 — A3 fix + small polish.** Fingers now generate free of the thumb and
the two layers re-merge PER CHORD (`resolveMergedBar`), so a shared cell keeps
its string-3 fingers in every bar and only D/Dm's alt bass overwrites them — see
the "Two independent layers" and re-strike notes above. Re-strike is redefined as
**same-FINGER only** (thumb-then-finger on string 3 is legit picking, user call).
Also A1 (save-name input 15→16px, kills iOS focus-zoom) and D1 (Play-sound toggle
"Pattern"→"Notes").

**v2.4.3 / v2.4.4 — hardware pass.** Every new lamp is the same glassy jewel body
as the Click/Notes lamps (radial-gradient + rim + inset), so they read as one
family. **Lamp-colour convention:** the beat lamp is theme-driven (`--lamp-*`);
the others are **deliberate fixed hues** like real indicators — **red = REC/armed,
amber = caution, green = save-OK** — NOT the theme accent. Shipped:
- **F1 beat lamp** (`#beat-lamp`, by BPM) — see the metronome note above. Blinks
  are a **pure flash**: constant size + rim, only the glass brightens and an outer
  glow blooms/fades. NO `transform: scale()` (that read as a button moving
  in/out — the user caught it).
- **F2 armed Edit lamp** — a **red** REC jewel on the pencil pill; the pill itself
  is now a **pressed-in latching button** (accent ring, no flat amber fill) when
  armed, which also avoids red-on-amber clash.
- **F3 absolute/mixed caution lamp** — replaced the wordy `type-indicator` text
  with a fixed-**amber** caution jewel + short label (`ABS`/`MIX`); full
  explanation stays on the `title`. Absorbs the old D2 "tag feels out of place".
- **F4 save-confirmation lamp** (`#save-lamp` by the save hint) — one **green**
  flash when a save lands (`blinkSaveLamp()`), the machine acknowledging the write.
- **Button physicality:** Edit/Save/Load pills got the transport's raised/carved
  bevel language (they were the last flat "software" chips).
- **F5 serial plate REVERTED:** shipped an engraved "No. CSG-2.4.2" brass plate,
  then reverted — the filled tag pulled the eye off the grid (grid stays hero).

**Preview limitation (important for verifying):** the Browser-pane preview tab is
`document.visibilityState === "hidden"`, so **`requestAnimationFrame` is paused** —
which freezes BOTH the playhead and the beat lamp. Audio contexts still run, but
onStep/onCountIn never fire in-preview, so the beat lamp's blink (and playhead)
can only be confirmed on a real foreground device. Static/aria-driven lamps
(armed, caution) and one-shot CSS blinks (save) ARE verifiable in-preview.

**v2.4.5 — refinements from the phone test + a rename feature.**
- **Edit armed** dropped the accent ring — the pressed-in latch + red REC lamp
  carry the state (user: "not sure it still needs the outline").
- **Caution indicator moved** out of the header to **bottom-right, above the
  gear** (`.type-indicator` is now `position:absolute` inside `.controls`, which
  is `position:relative`). Frees the header's name row for the pattern name
  alone. Verified it clears the grid even at 375×553 4-bar (13px gap).
- **Descender clipping fixed** — `.loaded-name`/`.saved-name` had a too-tight
  `line-height` under `overflow:hidden`, clipping g/j/q/p/y tails; bumped to 1.3
  + 1px pad. SE budget still fits (measured).
- **Rename in the Load menu** — each saved item is now Load / Rename / Delete.
  New `store.rename(id, name)` (trims, ignores blanks, keeps pattern/id/savedAt);
  the on-screen loaded name syncs if you rename the loaded pattern. Uses
  `prompt()` (consistent with the existing `confirm()` UX). Test added → 44/44.
  Tradeoff: three buttons narrow the name column, so long names ellipsize sooner.

**Pending the user's phone test of v2.4.4 + v2.4.5.** Still open on the list
(`NEXT_SESSION.md`): B1 (single-chord box height), C1–C3 (keys/progressions),
E1 (Unruly density?), D3 (Help surface), G1/G2 (swing, pre-loaded patterns).
Idea if names ellipsize too much: saved-item icon buttons or a two-row layout.

## Where things stand (session 11, 2026-07-23)

**Session 11 shipped a UI-feel + design-language batch — v2.5.0** (`CACHE` v26).
Four things, all deployed; **pending the user's phone test** (the two you can only
judge on a device — button feel and the press sound — plus the modals/dropdowns).
46/46 checks green (added 2). New files: `js/ui-sound.js`, `js/modal.js`,
`js/dropdown.js` — all precached; the deploy footgun (bump `CACHE`) still applies.

- **Press-in on every button** — the carved `translateY(1px)` + inset-shadow press
  that Edit had is now on the segmented Single/Prog toggle, the sheet ✕, the
  saved-item Load/Rename/Delete, `.btn-primary`, and the new dropdown
  triggers/options. Transport + pills already had it.
- **Button press sound** (`ui-sound.js`) — a short mechanical *thock* (low triangle
  body + band-passed noise "tick"), dependency-free raw Web Audio like
  synth/metronome (no library — keeps the offline PWA clean). Fires on
  **pointerdown** (matches the push-in the instant the finger lands), via ONE
  delegated listener in app.js over `button, .lamp, .dd-trigger, .dd-option`;
  bigger controls (`.btn-roll`) thock a touch deeper. Slider / text inputs / grid
  cells are excluded. Own on/off — **"Button clicks"** lamp in a new *Interface*
  Options section, persisted in the `tp-audio` blob (`audioPrefs.ui`). iOS unlocks
  audio inside the gesture, so the lazily-created AudioContext resumes on first
  tap; muted never opens a context.
- **Native iOS popups → our language.** Two components, both dependency-free:
  - **`modal.js`** — Promise-based `confirmModal()` / `promptModal()` replacing
    `confirm()`/`prompt()` (delete, rename, discard-edits). Tweed card, serif
    title, recessed input, Cancel pill + primary confirm. Destructive actions wear
    the app's **fixed red** confirm (`.tp-modal-danger`, same convention as the REC
    lamp). Callers became `async` (generate/loadSaved/bass+chaos-change,
    delete/rename); `confirmDiscardEdits` now returns a Promise; `boot()` awaits
    the first `generate()`. Escape/backdrop cancel; capture-phase Escape +
    stopPropagation so it doesn't also close the sheet underneath.
  - **`dropdown.js`** — custom tweed dropdowns replacing the native `<select>` open
    picker (iOS always draws that as the OS wheel, outside our language). **KEY
    INVARIANT: the native `<select>` stays in the DOM (`display:none`) as the
    source of truth** — value, options, and the `change` event are unchanged, so
    every existing app.js wiring and the `#grid` change-delegation keep working
    untouched. We overlay a `.dd-trigger` button + a body-level `.dd-panel`
    listbox; a pick writes `select.value` and dispatches a bubbling `change`.
    Programmatic value sets (loadSaved, key transpose, syncProgressionSelect, the
    re-roll reverts) don't fire `change`, so `enhanceSelect` **wraps the element's
    `value` setter** to also refresh the trigger label — no scattered refresh
    calls. `enhanceAll()` runs after `initControls` (theme fills later and syncs
    via its value-set) and again after each render for the per-bar `.bar-chord`
    selects (idempotent per element via `data-dd`). Panel flips up near the bottom
    edge, clamps into the viewport, closes on outside-tap (`.dd-catcher`) / Escape
    / external scroll — but NOT on its own open-time `scrollIntoView` (the reflow
    handler ignores scroll events originating inside the panel; that was a real
    bug for a mid-list selection). Two contexts styled: `.field .dd-trigger`
    (recessed well) and `.dd-trigger.bar-chord` (grid picker).
- **B1 single-chord box height** — the grid is now PINNED to the same vertical
  position in both chord modes (`.stage` top-aligned via a single capped-growth
  `::before` gap that's the only shrinkable item, so it collapses on a short
  screen and the grid never overflows). The big single-mode chord label
  (`#chord-head`) FLOATS with zero flow height (`height:0; overflow:visible;
  align-items:flex-end`), so showing/hiding it never moves the grid. Verified:
  grid top identical single vs progression; SE (375×553) 4-bar has no overflow.
  Known minor edge: SE + 4-bar **single** + a long loaded name can let the
  floating label reach into the name row (default 1-bar/unsaved is clear).

**Docs/tests:** two new checks — the dropdown source-of-truth contract (pick
writes value + fires exactly one bubbling change; programmatic set syncs label
without a change) and the modal resolve behaviour. Both run in `tests.html`
(they use the DOM). The precache-coverage check now also guards the three new
modules.

**Refinement rounds from the phone test — v2.5.1 → v2.5.2** (`CACHE` v28):
- **Die press no longer "slides".** The tilted, light Bakelite die read the
  generic 1px translate as lateral motion; `.btn-roll:active` now sinks straight
  IN (inset shadow only, `transform:none`).
- **Note tokens are 3D DOMES.** A poker-chip (flat face + extruded edge) was
  tried in v2.5.1 and the user preferred the dome, so v2.5.2 reverted to it:
  top-lit radial fill from the per-theme `hi`/`deep` derivations + inset
  rim-light/under-shadow. Fret numeral stays centred/legible even at 4-bar size.
  (`.cell.playing .note` swaps in the glow, so a sounding note loses the dome
  momentarily — fine.) Don't re-propose the chip; dome is the signed-off look.
- **Options sheet reorganised into three clean groups — Generation / Sound /
  Appearance** (v2.5.2). The Sound section is a **2×2 lamp bank**
  (`.lamp-row` = `grid` 2col), laid out `Metronome | Melody` over
  `Count-in | Buttons` so the metronome pair shares the left column:
  **Metronome** (was Click / `click-toggle`) · **Melody** (was Notes /
  `pattern-toggle`) · **Count-in** · **Buttons**. The
  toggle **ids are unchanged**, only the visible labels — user's framing was that
  count-in is a musical sound like the rest, so all four sit together. The old
  separate "Playback"/"Interface" headers are gone; "Preferences" → **Appearance**
  (Note labels + Theme). (v2.5.1's interim compact-wrapping lamps were ragged /
  unequal-width — the 2×2 grid fixed the alignment.)
- **Count-in is a toggle** (`metronome.setCountInEnabled`, persisted in
  `tp-audio.countIn`; off ⇒ `countRemaining=0`, loop starts immediately). And the
  **Play button no longer flashes the count-in digits** — that fought the hardware
  feel; the dimmed grid + the blinking beat lamp carry the count now, Play just
  holds the stop glyph. `showCountIn` rewritten accordingly.
- **Play latches IN when playing** — `.btn-play[aria-pressed="true"]` gained
  `translateY(1px)` + inset, so it presses in like armed Edit (still lit).
- **Lingering single-mode chord label** (stayed visible until the Options sheet
  closed): an iOS repaint bug — content behind the sheet's translucent backdrop
  isn't repainted on change, worsened by the label's `transform` compositing
  layer. Fix: the label's lift is now `position:relative;top` (no layer), plus a
  `forceRepaint()` opacity-blip on the stage after a mode switch. **Phone-only to
  verify** (desktop repaints fine).

## Where things stand (session 12, 2026-07-24)

**Session 12 — v2.5.4** (`CACHE` v30), a small refinement batch off the user's
v2.5.3 phone notes. 47/47 green (+1 test). All deployed, pending his phone test
of the feel/sound items.
- **Button sound fires on RELEASE** — the delegated listener moved
  `pointerdown` → `pointerup` (`app.js`). A real momentary switch actuates on
  lift: press-and-hold is now silent, the thock lands on release, alongside the
  action (which was already on click). The CSS push-in (`:active`) still shows on
  press, so you see it go in and hear it let go.
- **Click sound more mechanical** (`ui-sound.js`) — the body is a tighter,
  shorter, higher "clack" (less woody glide) and the contact tick is brighter +
  a touch louder (bandpass 2600→3400 Hz). Device-only to judge; user flagged it
  as minor.
- **Die pop-out flicker** — `.btn-roll` got a fast `box-shadow 0.07s ease` so the
  raised shadow eases back instead of snapping (the snap read as a flicker on
  release). The straight-in sink (no transform) from v2.5.1 is unchanged.
- **Duplicate save names** — `storage.js` `save()` now de-dupes Finder-style via
  `uniqueName()`: the original keeps its plain name, later saves of the same name
  become `Name (2)`, `Name (3)`, … (blanks fall back to `Untitled`, then
  `Untitled (2)`). Was the user's call ("should they get a (1)?"). Test added.
- **Empty-Load copy** shortened to **"Saved patterns will appear here."** — the
  old line wrapped "it" to a second row. Verified single-line at 375px. (Note:
  the empty state only shows if you delete your last item with the Load sheet
  open — the Load button is disabled at zero saves.)
- **Signed off from v2.5.3:** the chord-label repaint fix (#5) and dome
  legibility at 4-bar. **PIMA stays lowercase** (classical `p i m a` convention)
  unless the user asks for caps — recommendation given, not changed.
**v2.6.0 — D3 Help / guide surface** (`CACHE` v31), same session. A read-only
guide in the app's own tweed language, built on `modal.js`.
- **`infoModal({ title, closeText, render })`** added to `modal.js` — a scrollable
  info card with a single close button, no cancel/input. `render(bodyEl)` fills
  the body (content lives in the caller, so `modal.js` stays generic). `present()`
  now guards a null `cancel`. Resolves (void) on button / backdrop / Escape.
- **Entry: a carved "?" key in the Options sheet**, bottom-right of the Appearance
  row (user's placement call). Note labels dropped from `span-2` to `span-1` so
  the row is Note labels · Theme · Guide "?" in the fixed 3-slot grid. The "?" is
  RAISED (it's an action) not a recessed well. `#open-help` → `infoModal`.
- **Content (`renderHelp` in `app.js`): short how-to + the indicator legend.**
  Six headings (grid = your right hand / roll a pattern / play & sound / chords &
  keys / edit-save-load / indicators). The legend gives the cryptic bits a real
  explanation, not just a hover `title`: amber **ABS**/**MIX** chips (fixed-amber,
  the caution-lamp convention), a red **REC** dot (armed Edit), a green **save**
  dot — a fixed-width marker column aligns their text. All built as DOM (house
  style), theme-styled `.tp-help-*` in `styles.css`, body scrolls inside the card.
- Verified in-browser: 48/48 green (+1 info-modal test), Appearance row clean at
  375px, modal opens/scrolls/closes and leaves the Options sheet open under it.
- **PIMA still lowercase** — the caps question was answered "keep lowercase" as a
  recommendation, not changed.

**v2.6.1** (`CACHE` v32) — phone-test fixes on the v2.6.0 pass:
- **Help copy: note rows by POSITION, not colour.** "amber/cream" only held on
  Merle (note colours are theme-driven: thumb `--active`, fingers `--accent`);
  now "bottom rows / top rows". The fixed ABS/MIX/REC/save legend colours stay.
- **Progression numbering is Roman numerals** (was Arabic). `romanize()` /
  `romanDegrees()` in `data.js` — case encodes quality in the major key
  (I/IV/V major, ii/iii/vi minor). Applied to the context readout, the
  progression dropdown labels, the save-name placeholder (`describeCurrent`) and
  the saved-item metadata line (`summarize`). Pure display — degrees are still
  the stored model. (If the user wants all-caps instead, it's the `ROMAN` map.)
- **Save/Load sheet text unified to `--serif`** (Fraunces, like the modals) —
  `.save-hint`, `.saved-sub`, `.saved-empty` were `--numeral`; bumped ~1px for
  small-serif legibility.
- **Play latch strengthened** — the lit colour was flattening the "pressed-in"
  read. Now darkest at the top (rim shading the sunken face), deeper
  `translateY(2px)` + a stronger inset shadow, so the sink beats the glow.
- Play button still lit while playing; Edit-armed unchanged.

**v2.6.2** (`CACHE` v33) — **tap-highlight "halo" fix.** On Elizabeth (the one
light theme) the Play button flashed a blue "halo" on press. Cause: WebKit's
default `-webkit-tap-highlight-color` (`rgba(51,181,229,0.4)` — Android/WebKit
blue) painting over the tapped shape; invisible on dark faceplates, obvious on
Elizabeth's near-white one. **Touch-device only — never shows with a desktop
mouse, so the dev box couldn't reveal it** (found by reading the computed
property, not by eye). Fix: `-webkit-tap-highlight-color: transparent` on the
interactive controls (added to the existing `touch-action` rule, `.lamp` folded
in), since we already draw our own push-in + click feedback. Affected every
control, not just Play — Play was just the most-pressed on the lightest surface.

**v2.6.3** (`CACHE` v34) — **two-phase "ka-chunk" button sound.** The single
release thock became a tape-deck transport key: a light, bright **"ka"** on
pointer-DOWN (the key travelling in) and a deeper, fuller **"chunk"** on pointer-
UP (the spring seating). `ui-sound.js` refactored into `body()`/`tick()` helpers
and exports **`playPress`** (ka: higher f0 ~250, thin/short, bright tick 3900 Hz)
+ **`playRelease`** (chunk: low f0 ~150, fuller, longer, duller tick 2200 Hz);
`playClick` removed. `app.js` fires `playPress` on the delegated pointerdown and
`playRelease` on pointerup (shared `pressStrength()` matcher, same excludes).
Both halves share the `enabled` flag + lazy iOS-safe AudioContext. Tune by ear on
the phone — all knobs are the two objects passed to `body`/`tick`. This supersedes
the v2.5.4 "sound on release only" note. Device-only to judge.

## Where things stand (session 13, 2026-07-24)

**Session 13 shipped the musical-content pass — C1–C3, keys & progressions —
v2.7.0 → v2.7.5** (`CACHE` v40). All data-driven; **generator untouched**. 56/56
green, verified in-browser (tests + the grouped menus, mode filter, dom7 frets).
**Pending the user's weekend guitar/phone test.** The design was agreed up front
against a written spec the user brought (see the discussion) before any code.

**The model rework** — see the rewritten "Nashville numbers (token model)" note
above. Progressions became harmonic **tokens** instead of bare 1–6 degrees so
`II`/`♭VII`/`I7` are expressible; each key gained a `mode` + token→chord map.

**What shipped, by the user's three threads:**
- **C1 keys.** Added minor keys **Am + Em** (natural-minor ladder, major-V
  cadence — `i–VII–VI–V` = Am–G–F–E). Kept majors at C/G/D/A/E. **No Major/Minor
  toggle** (user's call): both live in one key dropdown, and the *selected key's
  mode filters the progression list*. Switching a key across the mode line lands
  on that mode's first preset (agreed default).
- **C1 chords.** 21 total now (was 14): dom7 `C7/G7/D7/A7/E7`, `F#` (E's II),
  `Bb` (C's ♭VII). Dom7 bass = parent major (see the Chord-library note; E7 =
  `020130`). **E7 voicing signed off** by the user. `Dm` was later moved into the
  single-picker's Open chords group (v2.7.2).
- **C2 progressions.** Replaced the old 7 with the user's curated set, grouped by
  **style** (Foundations / Classic Country / Traditional Folk / Modern Acoustic /
  **Classic Standards** / Minor). **All are 4-bar** (shorter ideas padded — 2-chord
  repeats, 3-chord holds the last); a concise **`label`** drives the menu/readout.
- **C3 menus.** `dropdown.js` now renders `<optgroup>` **section headers**. Keys
  grouped Major/Minor, progressions by style, single-chord picker **Open chords
  first** (`SINGLE_CHORD_GROUPS`), per-bar picker by quality (`CHORD_GROUPS`).
- **Smart custom readout (v2.7.3).** A hand-edited non-diatonic bar now reads as a
  computed numeral (`♯iv`, `♭ii`, `VI7`) instead of `?` — `romanInKey`/`degreeLabel`
  in `data.js`; see the Nashville note. Tritone spells `♯IV` (user-approved
  convention). Contained follow-on the user asked for at end of session.
- **Header fit + chord randomiser (v2.7.4 → v2.7.5).** The richer numerals
  overflowed the header. v2.7.4 swapped name/context rows; the user then asked to
  keep the context **top-left** and shrink the type instead, so **v2.7.5 restored
  the original row order and added `fitContext()`** — full reasoning and the
  measured numbers in "Where controls live". The version tag stays in the Options
  sheet (that trim is what makes the fit work at 14px for most readouts). A third
  header row was offered and rejected: the SE grid budget has ~0 spare.
- **The ♭/♯ line-height bug (v2.7.5).** Picking a `♭VII` progression made the
  Options sheet "expand slightly upward" — the glyph falls back off Fraunces to a
  taller font, growing the trigger +4px. Fixed with fixed `line-height`; see
  "Where controls live". **Reproduced and re-measured both ways in-browser**, not
  theorised.
- Also in v2.7.4: a **chord randomiser** die
  (`#randomize-chords`) on the Options **"Generation" section header line** —
  progression mode rolls a key + a progression of that key's mode, single mode
  rolls an open chord. It rode the header line rather than taking a control row
  because the sheet only had **~45px headroom at 375×553** (a row is ~64px); after
  the die it was 458/487. *(v2.10.0 split the sheet into two pages and the die
  moved to the tab row; the headroom problem that forced this is gone.)* Pure helpers `randomKeyProgression`/`randomChord` in
  `data.js`, rng injectable. **Two-stage sampling — key first, then a progression
  within it** — because flat sampling over (key, progression) pairs would bury the
  minor keys at ~8% of rolls (2 keys × 3 progressions against 5 × 14); a test
  asserts the ~2/7 minor share. Neither roll ever returns what's already on
  screen, and neither touches the pattern, so hand-drawn edits survive (no discard
  confirm — unlike Generate).

**Decisions worth knowing:**
- **Deferred (user's call):** the whole **capo system** (shape vs concert key) —
  its own session; all-12-keys; sharp minor keys (Bm/F#m/C#m would pull in new
  barre majors). "Curate first, expand later."
- **Menu labels are the concise idea, not the 4-bar padding** (v2.7.2, user's
  call) — `I–IV–V`, not `I–IV–V–V`. Custom (hand-edited) progressions still show
  literal per-bar degrees.
- Progression IDs (`maj_1_5`…) are opaque; saved items store resolved chord
  arrays, so ID/label changes never break the library.
- **Nothing tracked leaks the username** — checked when the user asked to scrub
  it: `.claude/launch.json` (the local mirror path) is gitignored/untracked; the
  only `CSG` in the repo is the reverted serial-plate line in this file.

**Still open (see `NEXT_SESSION.md`):** E1 Unruly density, G1 swing, G2 pre-loaded
patterns, the deferred capo system, JSON export/import.

## Where things stand (session 14, 2026-07-26)

**Session 14 shipped the "behave like a native app" batch — v2.8.0** (`CACHE`
v41), off the user's v2.7.5 guitar notes plus a friend's (Elliott's) feedback.
59/59 green (+3). One new module, **`js/platform.js`**, holding three OS
integrations that the musical model knows nothing about. **All three are
device-only to judge** — see the verification note below.

**The module's shape:** every integration is **feature-detected and degrades to a
silent no-op** (these are young or WebKit-only APIs, and a practice tool must not
break because a browser lacks one), and each takes injected **`nav`/`doc`** — the
same trick `storage.js` uses for its store — so the *logic* is unit-tested with
stubs and only the physical behaviour needs a phone.

- **`createAppUpdater()` — the app now picks up a deploy on launch.** The user's
  report was "the home-screen app doesn't update without opening the GitHub site
  first", and the cause was in the registration: no `updateViaCache`, so **`sw.js`
  itself came from the HTTP cache** and a standalone launch could never see a new
  worker (visiting the site in Safari was what forced the revalidation). Three
  parts, all needed: `updateViaCache: "none"`, an `update()` on load **and on
  every return to foreground** (a standalone app is resumed far more often than
  cold-launched), and a **reload when the new worker takes control** — sw.js
  already calls `skipWaiting` + `clients.claim`, so the caches swap under a page
  built from the OLD ones, which is exactly why the force-quit was needed. Two
  guards on that reload: **never on first install** (no previous controller ⇒
  nothing on screen is stale — without this, a first visit reloads itself), and
  never when `canReload()` is false (`state.unsavedEdits` or a running transport;
  reloading would destroy hand-drawn work or cut a take in half). Skipping is
  safe — the worker is already active, so the next ordinary launch is current.
  **⚠️ Bootstrap caveat: the deploy that ships this still needs the old
  force-quit**, since the fix arrives inside the update.
- **`createAudioSession()` — sound through the iOS silent switch.** Web Audio on
  iOS obeys the ring switch by default, which is wrong for audio the user
  explicitly asked for. `navigator.audioSession.type = "playback"` is the opt-out.
  **The category is per-DOCUMENT, and that decides the policy:** iOS convention
  splits on who asked for the sound — requested media (music, a metronome)
  ignores the switch, incidental UI feedback (keyboard clicks) respects it. So the
  app takes `playback` **only while the transport runs** and hands the previous
  category back on stop. Silenced phone + not playing ⇒ a completely quiet app,
  button thocks included; press play ⇒ music, and the thocks ride along for the
  duration, as they would in a native app holding a playback session. Set
  **before** `metronome.start()` so the AudioContext is created under it.
  **Uncertain:** the API is WebKit-only and recent. If his iOS lacks it, the
  fallback is the fragile `<audio>`/`MediaStreamAudioDestinationNode` hack —
  discuss before taking that on rather than carrying it silently.
- **`createWakeLock()` — the screen stays awake the whole time the app is up**
  (the user's call: not just while playing — you read the grid between takes as
  much as during them). No toggle; add one only if battery cost bites. Two things
  make it actually work: the OS drops the lock whenever the page is hidden and
  does NOT restore it, so re-acquiring on `visibilitychange` is mandatory; and on
  hide we **forget the sentinel rather than trusting its `release` event**,
  because a missing event would leave us holding a dead lock and never
  re-acquiring — the exact failure the feature exists to prevent. Some browsers
  also refuse the first request without transient activation, so there's a retry
  on the first `pointerdown` (`acquire()` no-ops once held, making it cheap).

**What was and wasn't verified.** In-browser (mirror at :8147): 59/59 green, clean
boot with no console errors, transport start/stop unaffected with the audio-session
calls in place, and the no-op paths genuinely exercised (Chrome has no
`audioSession`; the hidden preview tab makes the wake-lock request decline without
throwing). **Not verifiable off-device, by construction:** the wake lock (a hidden
tab can't hold one), the silent switch (no such concept on the dev box), and the
SW flow (registration is skipped on localhost on purpose).

**v2.8.1 — icon-only pills** (`CACHE` v42), same session, after the user's phone
test of v2.8.0. Details in "Where controls live" above. Two decisions recorded
alongside it, both the user's:
- **Haptics are not an option on iOS web at all**: Safari has never shipped the
  Vibration API, and the only reported alternative is a narrow iOS 17.4
  `<input type="checkbox" switch>` trick that can't reach an arbitrary button.
  Revisit only if this ever becomes a native app.
- **Phone-test verdicts on v2.8.0: all three confirmed working** — silent-mode
  audio, wake lock, and (after the v2.8.1 deploy) **auto-update**, which came up
  new without a trip to the site first.

**v2.8.2 — the silent-switch policy for BUTTON sounds** (`CACHE` v43). The user
found the v2.8.0 behaviour inconsistent: buttons were silent on a silenced phone
when stopped but audible *during* playback (the audio category is per-document,
so holding "playback" for the transport swept the UI sounds along — an earlier
theory that the UI context kept its birth category was **wrong**; the category
does reach the already-created context). He wanted it one way or the other, and
chose "buttons never sound in silent mode".
- **The rule: no button sound while the transport is running** — implemented in
  `app.js`'s delegated pointer listeners, not in `ui-sound.js`, because it's a
  transport-dependent policy and `app.js` is the glue. **The web cannot read the
  ring switch**, so this is the only way to honour it: playback is the sole window
  in which we hold the category that overrides the switch, so muting buttons there
  means a silenced phone never hears them at all, while the metronome and melody —
  audio you explicitly asked for — still come through. Ringer-ON side effect,
  accepted: buttons also stay quiet during a take (thocks over your own picking
  are noise).
- **The decision is taken once per press and held for the pair** (`pressSilenced`),
  so the button that starts or stops the transport gets a matched ka-chunk rather
  than half a press.
- **Rejected alternative:** holding the playback category permanently so nothing
  respects silent mode. Simpler model, but that category doesn't mix with other
  apps — a stray button tap would then interrupt background music/podcasts, where
  today the app only takes over the audio when you press Play.
- **Verified empirically in-browser**, not theorised: patching `AudioContext` +
  `OscillatorNode.start` to count sounds *per context* shows 2 UI-context starts
  per press while stopped, **0** while running (metronome unaffected), and 2 again
  after stopping. Note this is app.js glue, which `tests.js` doesn't import, so
  there is no unit test for it — the probe is the evidence.

**Also from this round of notes, not built:** the **open list moved to
`OPEN_ITEMS.md`** — a standing quick-reference the user reads between sessions,
with each item's size, what's decided and what needs his call. New entries from
Elliott: a **chord-library expansion + Root × Quality picker** (the framing
question is "richer harmony to drill" vs "a chord dictionary"; the latter needs a
movable-shape-template refactor of `data.js` — 12 roots × 7 qualities is 84
hand-written entries otherwise), a **chord-shape diagram** (deferred; it stops
being redundant with fret labels only if the library grows, and then it belongs in
the *picker*, never near the grid), and **Chaos "stops sounding like Travis
picking"** (accurate description of a deliberate design — Chaos is off the
difficulty curve). One finding worth keeping: **closed jazz voicings need no
generator change** — a chord declaring `root`/`alt`/`fifth` on the same
string/fret makes the Travis preset alternate between identical notes, i.e. the
thumb-on-root-only behaviour the user proposed, as pure data. Still open and
unstarted: the **capo system** (forks were put to him: shape-first vs sound-first,
audio transposition, control placement given ~29px of sheet headroom, and
"invisible at capo 0"), and an **app-icon revamp** (a thumbpick, via the
stdlib-only `tools/make_icons.py`).

## Where things stand (session 15, 2026-07-26)

**Session 15 shipped the app-icon revamp — v2.9.0** (`CACHE` v44). 59/59 green;
no app code changed, so nothing on screen moved (the version label is the same
character count — no 375×553 re-measure needed).

**The mark: a thumbs-up wearing a thumbpick**, cream on a rust disc over the
faceplate brown. His idea, and a good one — it's a pun that's also literally
true (the app is about your right hand, and the thumb leads), and a thumbpick
alone would have been unrecognisable to anyone who doesn't own one.

- **The icon is now DRAWN ARTWORK, not generated shapes.** `tools/make_icons.py`
  was rewritten: it used to *draw* the mark (circles, then a full SDF renderer
  with capsules, smooth unions and bevel lighting); it now **frames and resamples
  `tools/icon-master.png`** (640×640, downscaled from a 1254² original). The SDF
  attempt is worth knowing about so it isn't repeated: the toolkit is good at
  geometric marks and bad at organic ones, because every curve has to be
  hand-specified as primitives — three passes produced a cartoon hand with two
  red bandages, and the user called it (correctly) before I did.
- **Style was chosen by MEASUREMENT.** Six candidate treatments were downscaled
  to the real 32px and compared side by side. The engraved and brass-monochrome
  versions are the handsomest at full size and the worst small (hatching averages
  to gray; a same-value pick vanishes into the hand). The winner is flat-graphic
  — **three values and a silhouette**, which is what survives a favicon. Rendered
  volume and fine linework do not. Keep that test in the loop for any future mark.
- **The safe zone is enforced by the tool, not by eye.** The master's cream
  artwork reached **r=0.421** against the 0.40 maskable safe radius (the wrist
  dipped past), so `FIT = 0.93` insets it and pads with `BORDER = #36271a` —
  sampled from the master's own edge, which measured **flat to within 5/255**
  across 64k border pixels, so the padding is seamless. `main()` re-measures the
  finished 512 and **aborts rather than writing** if the art drifts back outside.
  Verified after generation: r=0.392, and simulated iOS-squircle and circular
  masks both keep the whole hand.
- **Still dependency-free**: the script now decodes PNGs as well as encoding them
  (stdlib `zlib`/`struct`, all five scanline filters) and resamples with an exact
  area filter via **summed-area tables** — O(1) per output pixel, which is what
  makes a 32px icon (~400 source pixels averaged each) affordable in pure Python.
  Whole run is ~3s. Icons are written as **opaque colour-type-2** PNGs: iOS
  composites black behind any alpha in a home-screen icon.
- **No frame, no rounded corners** — every platform masks its own. An early
  candidate had a gold border; under a circular mask its corners become four
  disconnected arcs. The recessed-panel feel comes from the art's vignette, which
  survives any crop.
- **`theme_color`/`background_color` stay merle `#33241a`** — they drive the
  splash and browser chrome, and the app behind them is dark. The icon being
  green while the app defaults to brown is deliberate: the icon is a brand mark,
  not a preview of the UI.

**v2.9.1 — the palette fix, and the metric that drives it** (`CACHE` v45). The
shipped v2.9.0 icon had the pick "disappear against the background", which
measured at a **contrast of 1.08:1** — the pick body `#6d3e19` and the disc
`#673918` were the same colour. The whole icon was two browns at 1.49:1 covering
77% of the pixels.
- **The pick sits across BOTH the disc and the cream thumb, so the metric is the
  WEAKEST of its three contrast pairs**, not the flashiest. This is the trap that
  caught the obvious repaints: bright-gold-pick variants (Chet 4.43, Doc 3.82,
  paper 4.10 against the disc) score *worse overall* than the muted ones, because
  the same bright pick then merges into the cream hand (1.25 / 1.37 / **1.01** —
  identical value, held apart only by the drawn outline). Judge by the weakest
  link or you just move the problem.
- **Shipped: Jerry tuned** — ground `#14241b`, disc `#24402f`, pick `#d24b30`,
  hand cream unchanged. Weakest link **2.59:1**, against a **theoretical ceiling
  of 2.86:1** for a hand this light over a dark ground (solved by equalising the
  two ratios). The coral is close to the real thumbpick sampled off the user's
  photo (`#b9544a`); green is complementary so the red does maximum work.
- **How the variants were made:** the master was recoloured **by region**, not by
  a global hue shift — flood fills seeded inside the outer background, the disc
  and the pick, each tested against the SEED colour so a fill can't cascade past
  a boundary. The pick and disc are within a colour distance of 8, so the gold
  keyline is the only thing separating them; mask coverage is printed as the leak
  check (outer 27%, disc 42%, pick 2.15% — no leak). Recolouring preserves each
  pixel's luminance ratio to its region mean, so vignette and paper grain survive.
  Verified at 7× magnification: outlines and keylines intact, no fringing.
**v2.9.2 — JERRY IS THE DEFAULT THEME, and the icon is built from its values**
(`CACHE` v46). The user's call: Jerry has more character than Merle and is his
favourite (player and theme), so the icon should correspond to the default rather
than the other way round.
- **The icon's every colour is now a Jerry role**, no invented hexes: ground =
  `bg`, disc = `surface` (the muddy bank), hand = **`--accent-hi`** `#eeddb8`,
  pick = **`--active-deep`** `#62a596`, keylines = `hardware` bronze, outline
  cores = `label`. The `-hi`/`-deep` values are the ones **`theme.js` itself
  derives**, so they're real app values, not approximations. Measured on the
  finished 512: pick `#63a494`, hand `#eeddb8`, disc `#493c28` — each on its
  theme value. Weakest contrast pair **2.16:1**.
  - The pick's target is written as `#5d9d8f`, NOT `#62a596`: the shading step
    multiplies by each pixel's luminance ratio to its reference, and the pick's
    pixels sit ~5% above theirs, so a literal target renders 5% light. It's
    pre-divided so the **finished icon** lands on the theme value.
  - **Teal is the right colour for a reason**, not just taste: in the app the
    thumb notes are `--active`, and the pick goes on the thumb. (The coral it
    replaced was mine, sampled from the reference photo — the user's wife said it
    looked like a pepperoni, which is fair.)
- **Recolouring is by CLASSIFICATION, not flood fill** (`scratchpad/jerryfy.py`
  approach). This fixed a real shipped bug: the original art's outer background
  and the hand's **dark outlines are the same colour to within 21**, so the
  v2.9.1 flood fill — tolerance 18, tight enough to spare the outlines — left
  every outline brown against the new green. Every pixel is now assigned to one
  of six k-means references (`#683918` rust, `#36271a` dark, `#e6c899` cream,
  `#bb823b` gold, `#876034` antialias, `#2e2116` outline core) and mapped; there
  is no "unassigned" case, so nothing can be left behind. Disc vs pick is the one
  split classification can't make (same source colour) — that stays a flood fill.
- **`BORDER` in `make_icons.py` must match the master's own border colour.** It
  was still the brown `#36271a` after the repaint, so the `FIT` padding band
  around the art stayed brown — a second source of stray warmth, caught by
  sampling the finished icon rather than by eye.
- **Chrome colours followed the default**: `theme-color` (index.html) and the
  manifest's `theme_color`/`background_color` are now `#17291e`, and
  **`styles.css`'s `:root` fallbacks are Jerry's**, read out of the live app via
  `getComputedStyle` rather than hand-computed, so a failed `themes.json` fetch
  lands on exactly what a successful one produces.
- **A saved theme preference still wins** (`travis-picker:theme`) — changing the
  default only affects someone who has never picked a theme. Worth knowing when
  testing: the dev browser looked unchanged until that key was cleared.
- **Still open for a future pass** (offered, not done): **full bleed** — let the
  disc colour run edge to edge instead of sitting as a circle on a background
  band. It buys ~20–25% more hand at the same safe margin and retires the one
  contrast pair that couldn't be fixed (disc vs outer background, still 1.57).
  The hand is currently 46% of the tile width.
- **Expect to delete and re-add the home-screen app** to see the new icon: iOS
  caches the installed PWA's icon and the auto-updater (v2.8.0) does not touch it.

## Where things stand (session 16, 2026-07-26)

**v2.9.3** (`CACHE` v47) — **locking the phone mid-take no longer leaves audio
running in bursts.** 61/61 green (+2). Reported from the phone: lock the screen
while playing and the sound "continues in a sort of disjointed way".

**The cause is two of our own features meeting.** The transport holds the
**`playback` audio category** (v2.8.0's silent-switch fix), which is precisely
what tells iOS to keep our audio alive in the background like a music app —
while the **`setTimeout` driving the lookahead scheduler is frozen or throttled**
by the same backgrounding. The audio clock keeps running, so `nextSlotTime` falls
behind `ctx.currentTime`; the next time the timer fires, every missed slot is
scheduled at a time **already in the past**, and Web Audio plays those
immediately. The backlog comes out as one burst. So it isn't drifting playback —
it's a pile-up, and it got possible the moment we started claiming a background
audio category.

Two changes, a fix and a backstop:
- **`createPlaybackGuard()` in `platform.js` (integration 4)** — stop the
  transport when the page stops being visible. `visibilitychange` is the only
  signal the web offers, and it **cannot distinguish a screen lock from an app
  switch or a pulled-down notification shade**, so all of those end the take too;
  that's right anyway, since none of them leave you looking at the grid. `pagehide`
  covers the exits that never report a visibility change (bfcache, termination).
  Same shape as the other three integrations: injected `doc`/`win`, tested with
  stubs.
- **`hasDrifted()` / `MAX_DRIFT` in `metronome.js`** — past 0.25s behind (≈2 8ths
  at the top tempo), the scheduler **drops the missed slots and resyncs** instead
  of replaying them, and clears the stale playhead queue with them. The guard
  above is the fix; this is what protects a freeze nothing tells us about (a
  slept laptop, an OS audio interruption).
- **`stopTransport()` in `app.js`** is now the single stop path, extracted out of
  `togglePlay` — handing the audio category back matters as much as killing the
  scheduler, since `playback` is what keeps iOS sounding us in the background.
  The guard calls the same function the Play button does, so nothing can drift out
  of sync.

**Verified in-browser** by probing `OscillatorNode.start`/`AudioBufferSourceNode.start`
per second rather than by eye: playing schedules ~1.5 clicks/sec at 90bpm (with
plucks starting after the 2.7s count-in, as they should), and after a
`visibilitychange` **not one further sound is scheduled** — counters frozen across
the next 1.2s, Play un-latched to ▶︎. `pagehide` behaves identically, and the
transport restarts cleanly afterwards. **Not verifiable off-device:** the actual
iOS lock behaviour — a real screen lock is what the report came from.

**v2.10.0** (`CACHE` v48) — **the Options sheet became two pages, and the capo
lives in the room that made.** 62/62 green (+1). His call on all four design
forks; the two-page idea was his, and it's better than the three placements I
offered.

**The Options sheet is TWO PAGES now — Generation / Preferences.** Everything on
one page measured **460px of a 486.6px cap** at 375×553: ~27px spare, i.e. room
for **zero** new control rows (a row is 58px). That ceiling had already exiled
the version tag into the sheet header and put the die on a section-header line,
and it's why the capo had nowhere to go. Split on the natural seam — what the
**pattern** is, vs how the **app** behaves — each page now measures **311px and
329px**, leaving ~160–176px, i.e. room for three more rows each.
- **The tab row REPLACES the old "Generation" caption** (the tab says it), so the
  split costs page 1 nothing — the capo row is already inside that 311px.
- The **die rides the tab row** and goes `visibility: hidden` on Preferences —
  **not** the `hidden` attribute, which let the tabs stretch and made the pair
  change width between pages. A jumping control panel is a specific past complaint.
- Page 1 = chord mode, chord/key+progression, thumb, chaos, pattern length, capo.
  Page 2 = the Sound lamp bank, note labels, theme, guide. **The gear always opens
  on Generation** — muscle memory beats remembering where you were, and
  Preferences is set far more rarely.
- **Known cost, his call:** Metronome/Melody are now a tap away, and those are the
  most mid-practice controls in the sheet. Worth feeling out on the phone.

**The capo is SHAPE-FIRST** (`CAPO_MIN`/`CAPO_MAX`/`clampCapo`/`soundingName` in
`data.js`): you pick the shape and where the capo is, and the concert key is
derived. That's what makes it cheap — **the grid never changes and the generator
never sees it**, because the frets on screen are shape frets, which is exactly
what your fingers do. It's a label plus one addend in `midiOf(event, capo)`.
- **Range −2 to 5.** Negative is a **down-tuned guitar** — a physical capo can't
  go below the nut, but it's the identical transform and it's what he actually
  does. The top is 5 because that's where real capos live; one constant if a 7
  ever comes up. `capoLabel()` in `data.js` decides how it's SAID: **"half-step
  down" / "whole step down"** (his wording), never "capo −1", which is a thing you
  can't do. One helper drives the on-screen tag, the saved-list metadata and the
  default save name.
- **A hardware stepper**, not a dropdown (his pick): one recessed well with two
  carved keys sunk into its ends, end-stops disabled at the limits.
- **Invisible at capo 0**, also his call — at 0 the readout says "Concert pitch"
  and no on-screen indicator exists, so the default screen is the app exactly as
  it was. Set one and a tag appears at the **right end of the NAME row**, the same
  place in both chord modes (v2.10.1 — it first rode the context in progression
  mode and the chord head in single mode, so it moved down the screen when you
  switched). **Costs zero layout**: the name row's height is reserved whether or
  not it's used, so a capo can never move the grid. Measured: `.app-head` 63px and
  grid top identical at capo 0, capo 5 and −2, in both modes, no overflow at 4 bars.
- **Why the name row and not beside the context:** `"whole step down"` is ~124px.
  Sharing row 1 with the readout left it **63px**, which drove `fitContext` to its
  10.5px floor and **truncated the numerals** — measured, on a preset readout, not
  just the exotic worst case. On the name row the worst-case readout stays at the
  full 14px with any capo set. Long saved names ellipsize and the tag stays whole,
  which is the right precedence.
- **Concert spelling is flat-preferred except F♯** — "capo 3 with G shapes sounds
  in B♭", the way a guitarist says it. Quality suffixes survive (`Am`+2 → `Bm`,
  `C7`+3 → `E♭7`). Those are real ♭/♯ glyphs, so **`.sounds-readout` has a pinned
  `line-height`** like everything else that can carry them.
- **Capo is musical CONTENT**, so it joins the saved item's context (absent on
  pre-capo saves ⇒ `clampCapo(undefined)` = 0, which is what they were) and shows
  in the saved-list metadata, where two saves differing only by capo would
  otherwise be indistinguishable. The **randomiser deliberately does not roll it**
  — being told to move a physical clamp every roll is hostile.

**Verified in-browser, measured rather than eyeballed:**
- **The audio genuinely transposes.** Karplus-Strong output is periodic at its
  fundamental, so the pitches were recovered from the rendered `AudioBuffer`s by
  period detection: capo 0 sounded `[40,42,44,45,45,49,49,52,52,54,56]` and capo 3
  sounded **exactly that set +3**. (A first attempt compared cached buffer
  identity and was inconclusive — a +2 shift can land on a pitch that was already
  in the set.)
- Worst-case context readout (`♯iii – ♯vi – I7 – ♭II · Am`) still sits at the full
  **14px at capo 0** (196/196px), and drops to **12.2px** with a capo — well clear
  of the 10.5px floor, so `fitContext` absorbs it as designed.
- Save→reset→load restores the capo and both readouts; the custom dropdowns still
  work on the initially-hidden Preferences page (the `<select>` source-of-truth
  contract holds); tabs hold a constant 293px width across pages.
- **Not verified off-device:** how the two-page split actually feels mid-practice,
  and the stepper's tap targets under a thumb.

**v2.10.1** (`CACHE` v49) — seven refinements off his phone test of v2.10.0.
62/62 green (+1 assertion set). Every one was a real defect, not a preference:
1. **The sheet jumped when switching pages** (311 vs 329px). Both pages now sit in
   one CSS grid cell (`.sheet-pages { display: grid }`, `.sheet-page { grid-area:
   1/1 }`), inactive one hidden by `visibility`, so the panel is always the
   height of the taller page — no magic numbers, and it stays true if the content
   changes. Measured 285/285.
2. **The tabs moved onto the sheet's title line**, beside "Options", which makes
   the split free in height, and **the version tag moved to the foot of the
   Guide** to pay for the room. The version now lives in `APP_VERSION` in
   `app.js` — **the deploy dance changed: bump that, not a span in index.html.**
3. **`capoLabel()`** — see the capo notes above.
4. **The capo tag moved to the name row** — see the capo notes above.
5. **Rapid capo taps triggered iOS double-tap zoom.** The buttons already had
   `touch-action: manipulation`; the hole was the **container**. At an end-stop
   the button under your finger goes `disabled`, the tap falls through to the
   `.stepper` well behind it, and an untagged element gets the zoom gesture.
   `.stepper` and `.segmented` joined that rule.
6. **The "Sounding" caption is gone** — it only restated the "Capo" label next to
   it. The readout stands alone and quiets down (13px, muted) at capo 0, where it
   is reporting that nothing is happening.
7. **The die's scope now reads from its position.** It sits in the row holding
   the chord (single) or key + progression (progression) and **nothing else** —
   `.control-row.with-die` gives its last slot to the die (`1fr 1fr 46px`) instead
   of a third control, and the Single/Prog toggle moved up to join the capo in a
   "context" row. His suggestion, and the only thing that actually communicates
   scope; the die had read as "randomise everything in Generation" on the tab row.
   Note this moves the mode-swapping fields to **row 2** — both alternatives still
   fill the same two slots, so the invariant (nothing below ever shifts) holds.

**v2.10.2** (`CACHE` v50) — the last two placement calls from his phone test, and
the session's wrap. 62/62 green.
- **The capo readout moved top-LEFT** of the header, where the context used to be
  — the position it wanted all along. It could only go there once the context
  left: sharing that row, "whole step down" (~124px) took the readout to 63px and
  truncated the numerals (v2.10.1's measurement).
- **The progression/key indicator moved above the grid**, into the same slot as
  the single-mode chord, "to be consistent with the chord indicator in
  single-chord mode" — his framing, and right: they're the same piece of
  information and it shouldn't move when the mode does.
- **How the room was found.** The stage had **0px** spare at 4 bars in
  progression mode (`.stage::before`, the capped-growth gap, was already
  collapsed to 0), so a reserved slot above the grid had to be paid for. Two
  candidates were measured: shaving `.stage`'s 28px `padding-bottom` left **1px**
  of margin and squeezed the grid against the transport, while **collapsing the
  two-row header to one** freed 31px and kept the bottom breathing room. Header
  63 → 32px, and the grid gained ~30px of clearance above the controls.
- Note the readout sits ~14px higher in progression mode, because the track it
  sits above is taller there (the per-bar chord headers). **What the stage's
  `::before` gap actually pins is the grid's BOTTOM** — measured 28px above the
  transport in both modes — not its top and not the first cell row (which differ
  by 7px between modes). Worth knowing before you "fix" a top alignment.

**v2.10.3** (`CACHE` v51) — **the above-grid readout grew 16px → 22px**, with the
slot at 28px. He was right that it had room; the interesting part is which limit
binds. **Width doesn't** — even the four-accidental worst case needs only 305px
of the stage's 351px at 26px type, and `fitContext` would absorb anything longer.
**Height does**, and only barely: at 375×553 with 4 bars the stage's shrinkable
`::before` gap was down to **8px**, so every px of type came out of it. 22px left
**2px**, which is no margin at all, so `.stage`'s `padding-bottom` went 28 → 24 to
buy it back — **6px of slack now, and still a 28px gap to the transport.**
Anything larger needs a different trade, not just a bigger number.
- **320×454 (iPhone 5/SE-1 class) already overflows by 18px at the OLD 16px** —
  it's outside the documented budget either way, and 22px takes it to 24px. If
  that viewport ever matters, it's its own piece of work.
- `CONTEXT_BASE_PX` (app.js) and `.context`'s `font-size` must stay in step —
  `fitContext` writes the size inline, so the CSS value is only the resting state.

## Where things stand (session 17, 2026-07-27)

**v2.10.4** (`CACHE` v52) — **the installed app could precache a stale deploy,
permanently.** 63/63 green (+1). His report: the site had updated but the
home-screen app still showed the previous version, and force-quitting didn't
help. It was a real bug, and *not* in the update detection that v2.8.0 fixed.

**The mechanism, and why force-quitting couldn't help.** `updateViaCache: "none"`
makes the browser fetch **`sw.js`** from the network, which is why a new deploy
is *detected* — but the files that `sw.js` then precaches go through the ordinary
HTTP cache, and GitHub Pages serves them `max-age=600`. Two deploys inside ten
minutes (v2.10.2 → v2.10.3 were **11 minutes apart**, plus ~a minute of Pages
build) and the new worker installs correctly under the new cache name while
filling it with the **previous** deploy's bytes. After that there is nothing left
to install and nothing ever re-fetches, because the cache is only written at
install: an up-to-date worker serving stale code, for good.
- **Fix:** `install` fetches each entry as `new Request(path, { cache: "reload" })`
  and `cache.put`s it, replacing `cache.addAll`. A non-`ok` response now throws,
  so a partial precache fails the install and the old worker keeps serving rather
  than a half-updated shell reaching `skipWaiting`.
- **Measured, not theorised** (the diagnosis was otherwise circumstantial): a
  scratchpad endpoint serving `Cache-Control: max-age=600` with a server-side hit
  counter showed three default-mode fetches leaving the counter at **1** — the
  browser answering from its own cache — and a `{ cache: "reload" }` fetch taking
  it to **2**. That is exactly what `addAll` was doing to the app shell.
- **Verified the replacement actually installs** (a typo here breaks offline,
  which is worse than the bug): registered by hand against the mirror, the worker
  reached `activated` and controlling, with all **23** entries present and the
  cached `js/app.js` carrying the new `APP_VERSION`.
- **`registerServiceWorker()` moved OUT of `boot()`** — it now runs at module
  scope before it, and falls back to calling `start()` directly if `readyState`
  is already `complete`. Anything throwing earlier in `boot` used to take the
  registration with it, and an app that can't check for updates **can't ship its
  own fix** — that failure mode ends in "delete and re-add the icon". The updater
  is the one thing that must survive a broken build.
- **Test:** `sw.js` source must not contain `.addAll(`, must contain
  `cache: "reload"`, and must check `res.ok`. Source-level, because the invariant
  is invisible from inside the app and its failure is silent.
- **Bootstrap caveat, same as v2.8.0's:** the fix only starts protecting the next
  deploy, since the fixed worker is the one that has to install. His stuck phone
  self-heals on this deploy — the worker script itself was always fetched fresh,
  so v52 is detected normally and its install is the fixed one.

**v2.11.0** (`CACHE` v53) — **the typography pass.** 64/64 green (+2). It started
from his note that "something seems a little off" about the fonts in the Options
sheet, with sizes and placements inconsistent between its two pages. **The
typefaces were never the problem** — the sheet had *two label systems* and a few
orphans. Measured before proposing anything (see the Type note above for the rule
that came out of it):

| what | was | now |
|---|---|---|
| group caption vs field label | 9px/0.22em, x=18 | **one tier**: 10px/0.16em, x=16 |
| the two Options pages | opened with different-looking objects | both open with the same legend |
| capo value | inherited `0.16em` + caps from `.field` | resets both — a value, not a label |
| sheet `✕` | U+2715 → **Arial** | drawn SVG |
| stepper `−`/`+` | rounded sans 19px | serif 18px (inside a control) |
| "Appearance" caption | a caption that looked like the labels under it | **gone** (~14px back) |

- **The legend face is Jost, bundled** — his call after asking the right question
  ("is Futura actually free?"). It isn't: Futura, Copperplate, Helvetica Neue and
  Gill Sans are all commercial, and *referencing* one by name is free only while
  every user is on Apple hardware. Jost is the OFL Futura-alike; 26,588 bytes,
  latin subset, variable 400–600.
- **The choice was made against a true-size mockup**, not a description — six
  era-appropriate faces in a 375px replica of the sheet with the real values and
  the real Fraunces, published as an artifact so he could judge on the phone
  (several candidates are iOS system faces the dev box renders differently or not
  at all). Keep that trick for any future type question.
- **The Guide `?` became the fourth header pill** and **the name moved back to its
  own row** — see "Where controls live". Both his calls, and the second one is
  what makes the fourth pill free: the name had been down to 35px.
- Building the mockup surfaced a cascade collision worth remembering: a row
  modifier `.row.die` and the die button `.die` shared a class, so the row
  inherited the button's box. The measured geometry caught it; the screenshot
  alone did not.

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
