# CLAUDE.md — Travis Picker

Practice tool that generates random, playable Travis-picking (alternating-bass
fingerstyle) right-hand patterns and shows them on a drum-machine grid.
Mobile-first, no build step, no server dependency, no accounts. Runs entirely in
the browser.

**This file is architecture and invariants — the things that must stay true.**
The other docs:

| file | what it's for |
|---|---|
| `CHANGELOG.md` | session-by-session history, newest first — *why* things are the way they are, what was tried, what was cut |
| `OPEN_ITEMS.md` | the standing open list: each item's size, what's decided, what needs his call |
| `travis-picker-spec.md` | source of truth for the **musical model** |
| `travis-picker-workflow.md` | the original build order (complete) |

Reach for `CHANGELOG.md` when you want to know why a decision was made, or
whether an idea has already been tried and rejected. Everything still
load-bearing has been promoted into this file; a **"(session N)"** attribution
below is a pointer into that file's entry for N.

**What's in here:** Running it · Deploying · Architecture (file map, data flow,
chord modes, Nashville tokens, layout & the height budget, the manual editor,
metronome & swing, pattern playback, the Saved library, UI components, platform
integrations, the design language, type, themes) · Core data model · Key rules ·
Conventions · Status · Working with this user.

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

**What the dev box CANNOT tell you** — three real limits, each of which has
produced a wrong "verified" before:
- **`requestAnimationFrame` is paused in a hidden preview tab**, which freezes
  both the playhead and the beat lamp, so their blink can only be confirmed on a
  real, foreground device. `document.fonts.ready` can hang there too — force
  layout with `offsetHeight` instead of awaiting frames.
- **The Browser-pane preview server can't read `~/Desktop`** (macOS TCC), so
  in-browser verification runs against an **rsync mirror** of the repo in the
  session scratchpad, wired up in `.claude/launch.json` (untracked). **Re-sync
  after every edit** before re-checking, or you're testing the previous copy.
- **No touch, no ring switch, no lock screen.** The tap-highlight halo (v2.6.2),
  long-press selection, silent-mode audio and the wake lock are all invisible
  here; the most the dev box can do is read the computed property.

Prefer **probing over eyeballing**: pitches have been recovered from rendered
`AudioBuffer`s by period detection, scheduled slot times read off the audio
clock, and sounds counted per-`AudioContext` by patching `start()`. And when the
question is layout, **take a screenshot** — a readout once wrapped to two lines
inside a fixed-height well and `scrollWidth <= clientWidth` reported it as
fitting, because a wrapped box does fit.

## Deploying

Live at **https://cadengunn.github.io/travis_picker/** — public repo
`cadengunn/travis_picker`, GitHub Pages from `main` / root. The loop:

1. Edit, and run the tests.
2. If any **app** file changed, **bump `CACHE` in `sw.js`** (`travis-picker-v60`
   → `-v61`) **and `APP_VERSION` in `js/app.js`**. Doc-only pushes need neither —
   the markdown files and `tests.js` aren't precached.
3. `git push` (token is in the keychain). Pages rebuilds in ~a minute.
4. He force-quits and reopens on the phone.

**⚠️ Footgun 1 — bump `CACHE`.** Installed users keep running the old code until
a new service worker activates, and the worker only swaps when the cache name
changes.

**⚠️ Footgun 2 — the precache MUST bypass the HTTP cache.** Fixed in v2.10.4 and
guarded by a test, but understand it before touching `sw.js`: Pages serves app
files `max-age=600`, and `cache.addAll` fetches *through* that cache — so a
worker installing within ten minutes of the previous deploy fills the NEW cache
with the OLD bytes. The state is permanent and silent (the cache is written only
at install, so nothing ever re-fetches) and force-quitting can't shake it loose.
`install` therefore fetches each entry with `{ cache: "reload" }` and throws on a
non-`ok` response, so a partial precache fails the install and the old worker
keeps serving. **`updateViaCache: "none"` only exempts `sw.js` itself** — it does
nothing for the files `sw.js` fetches. Both facts were measured against a real
`max-age=600` endpoint, not reasoned about.

**Adding a module or a font means adding it to `PRECACHE`.** Two tests guard it
(every runtime module cached; every `fonts/*.woff2` cached), because the failure
mode is "works locally, silently broken offline".

**The SW only registers on the real HTTPS origin** — `app.js` skips
`localhost`/`127.0.0.1` so it never fights `serve.py`'s no-store, and a plain-HTTP
`--lan` origin can't register one anyway. So the service worker can only be
exercised on the live Pages URL, by design. `registerServiceWorker()` runs at
**module scope, before `boot()`**: anything throwing earlier in boot used to take
the registration with it, and an app that can't check for updates can't ship its
own fix.

**Privacy — the repo is public.** History was rewritten before the first push to
`cadengunn <cadengunn@users.noreply.github.com>`, and repo-local
`user.name`/`user.email` are set to that identity. **Never reintroduce a real
name, email or hostname.**

## Architecture

The generator is a **pure function fully decoupled from rendering**. Musical
"content" (bass presets, chords, chaos levels) is **data, not code** — adding a
preset or chord never touches generator logic.

```
index.html        app shell: controls + grid container
tests.html        loads js/tests.js, renders pass/fail
serve.py          no-store dev server (see above)
manifest.webmanifest  PWA install: standalone, portrait, RELATIVE start_url/scope
                  (`./`) so it survives the /travis_picker/ project subpath
sw.js             cache-first app-shell precache — see "Deploying" before editing
themes.json       UI themes as data (5 color roles each) — edit here, not in CSS
fonts/            bundled Fraunces (serif voice) + Jost (panel legends), both
                  .woff2 + their OFL licenses — precached, see "Type" below
icons/            PWA + favicon PNGs, GENERATED — never hand-edit
tools/            make_icons.py + icon-master.png; authoring only, nothing
                  imports it at runtime. Pure stdlib (no PIL on this Mac): it
                  decodes/encodes PNG and area-resamples the drawn master, and
                  ABORTS rather than writing if the art drifts outside the
                  maskable safe zone. Icons are opaque colour-type-2 — iOS
                  composites black behind any alpha in a home-screen icon.
css/styles.css    mobile-first "tweed faceplate" (v2.1); colors are CSS vars set by js/theme.js
js/data.js        pure data tables + small pure helpers (no generation logic)
js/generator.js   pure generatePattern() + resolveBar/resolvePattern/resolvePhrase
js/grid.js        renderGrid() — resolved phrase -> DOM only
js/theme.js       loads themes.json, applies a theme as CSS custom properties
js/storage.js     the Saved library (localStorage); store is injectable for tests
js/editor.js      pure tap-to-edit logic (toggleNote, hand inference) — no DOM
js/metronome.js   Web Audio click + pattern playback + playhead scheduling (no deps)
js/synth.js       Karplus-Strong plucked-string voice (no deps) — pattern audio
js/ui-sound.js    the two-phase button "ka-chunk" (no deps) — see UI components
js/modal.js       confirm / prompt / info modals in the app's own language
js/dropdown.js    custom dropdowns OVER the native <select> — read the invariant
js/platform.js    OS integrations: wake lock, iOS audio session, SW auto-update,
                  playback guard
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
  + the **four pills** (right), then the pattern **name** on its own line. The
  capo tag says both halves of the fact since v2.12.0 (`CAPO 2 → F♯`), so it is
  now **width-critical**: the pills leave it 156.3px and its worst string needs
  151.2px. It's shrink-and-ellipsize, not fixed, for exactly that reason —
  re-measure it if the pills or the wording change.
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
  so **the worst-case readout now renders at 22px** (`CONTEXT_BASE_PX`, which the
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
- **⚙ Options sheet: TWO PAGES** since v2.10.0 — **Setup** (chord format + capo,
  then the chord/key+progression row, then Thumb/Fingers/Pattern length — that
  one is `.control-row.layers`, whose three slots are UNEVEN because its menus'
  longest values are; see CHANGELOG session 18 — then the Swing slider) and
  **Preferences** (the Sound lamp bank, note labels,
  theme). You set all of it sitting down, between takes. **The pages are `Setup`
  and `Preferences` as of v2.13.3** — "Generation" was the original name and
  survives in the older notes in `CHANGELOG.md`; the ids are `tab-setup`/`page-setup`
  to match. The chord-mode legend on page 1 is **`Format`**, not "Chords".
  The split exists to buy height: one page had ~27px spare at 375×553, so
  nothing new could be added. The gear always opens on
  Setup. Three rules hold it together, each fixing something measured:
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
back from chrome. **Re-measured live at v2.13.3** (session 19) at 375×553 —
SE-class, 4 bars, progression mode, the worst case:

| what | measured |
|---|---|
| grid track | 384.8px |
| chrome (everything else) | 168.2px |
| `.app-head` | 55.1px |
| **clearance under the grid** | **11.1px** |
| `main` overflow | 0 — it fits |

**That 11px is the entire remaining budget, and it is the number to protect.**
Any further chrome must be measured at 375×553 before shipping. `main` has
`overflow: auto`, so the failure mode is **silent** — the grid scrolls inside its
own box rather than anything visibly breaking, and the laptop will not show you
the problem. The 1-bar single view is far smaller (~322px grid) and is never the
constraint. `.stage { justify-content: center; padding-bottom: 24px }` biases the
grid slightly UP (focal points want to sit a touch above centre, and it keeps the
top of the pattern clear when the Options sheet slides up); it was 28px until
v2.10.3 traded 4px of it to grow the readout above the grid from 16px to 22px.
**320×454 (iPhone 5 / SE-1 class) already overflows** and is outside the
documented budget — if it ever matters it's its own piece of work.

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
  Thumb/Fingers change all `confirmModal()` first, and declining reverts the
  control.
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

**Swing** (`slotSeconds()` in `metronome.js`, session 18): the whole feature is
one pure function saying how long slot 0–7 lasts. Each beat is paired with its
`&` and the pair split long–short, the beat taking `ratio` of it.
- **The `&`s move late and BEATS 1–4 NEVER MOVE**, so the thumb stays
  metronomic — which is the technique this app exists for. The metronome click
  only sounds on beat slots, so it never moves either: you always have a straight
  quarter pulse to practise against. **A test asserts the beats don't move**, and
  it's there as a guard, not a formality (see the cut feature below).
- **A second resolution was built, trialled and CUT.** It paired beat 1 with 2
  and beat 3 with 4, so beats 2 and 4 moved and the *thumb itself* swung
  (v2.13.0–.1, removed in v2.13.2). It worked and it's a real feel — a
  shuffle / laid-back backbeat, the thing you hear in St. James Infirmary — but
  **it isn't Travis picking**, and that's why he cut it after playing with it:
  *"I don't think it fits the theme of the app ultimately."* The git history has
  the implementation. Don't rebuild it without that argument changing.
- **The control is a smooth slider, 50–75 in whole percent**, matching the BPM
  slider it sits below. Five named detents (Straight/Light/Medium/Hard/Triplet on
  an index-valued slider) were also built and tried, and he preferred the smooth
  one — so the names and `snapSwing`/`SWING_STEPS` are gone too. **50 is Straight
  and doubles as the off switch**; the readout says "Straight" rather than "50%",
  since the number behind the off position isn't information.
- **The bar's total length is invariant** at any amount (each pair sums back to
  two plain 8ths), which is what keeps BPM meaning what it means and leaves the
  count-in a full bar. Asserted in tests.
- **It lives only in the scheduler's slot advance.** Everything downstream is
  already time-driven — notes are scheduled at `nextSlotTime`, the playhead reads
  the audio clock — so the app follows for free. The count-in swings too, which
  is right: it should tell you the feel you're counting into.
- **`setSwing` takes effect on the next scheduled slot**, so you can drag the
  slider while the loop runs and hear it move within the ~0.2s lookahead. That's
  the point of a feel control you hunt for by ear.
- **67% is the reachable setting closest to true triplet swing** (2:1); the
  rounding error is 1.7ms at 120bpm. It's the user's own sweet spot — "classic
  Jerry Reed feel at a high tempo".
- **Verified by probing scheduled audio times**, not by reading the math: at
  90bpm and 67%, the clicks stay evenly spaced at 0.667s while the plucks go
  0.447/0.22.
- **Swing is a FEEL setting, not pattern content** — it persists in `tp-audio`
  alongside the sound toggles and is deliberately not part of a saved pattern's
  context (same class as BPM, which isn't saved either).

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
  `setPatternEnabled` — **labelled Metronome and Melody** in the Options sheet's
  2×2 lamp bank, alongside Count-in and Buttons; the ids are unchanged. All
  default on, persisted in `localStorage` under `tp-audio`). The **count-in always clicks** regardless, so
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
`{ pattern, context: { chordMode, chord, key, capo, progression } }` plus a name,
id and timestamp. **The capo is in there because it's musical content** — what
the pattern sounds like, not a preference; items saved before it existed have no
`capo` and read back as 0, which is what they were. **Never store UI settings** (theme, label mode) with it; a test
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
Load / Rename / Delete. `save()` de-dupes names Finder-style via `uniqueName()`:
the original keeps its plain name, later saves become `Name (2)`, `Name (3)`.

**UI components — we draw our own, because iOS draws the OS's** (session 11).
Three dependency-free modules, all precached:
- **`dropdown.js` — KEY INVARIANT: the native `<select>` stays in the DOM
  (`display: none`) as the source of truth.** Value, options and the `change`
  event are unchanged, so every `app.js` wiring and the `#grid` change-delegation
  keep working untouched; we only overlay a `.dd-trigger` button and a body-level
  `.dd-panel` listbox, and a pick writes `select.value` then dispatches a bubbling
  `change`. Programmatic value sets (load, key transpose, a re-roll revert) don't
  fire `change`, so `enhanceSelect` **wraps the element's `value` setter** to
  refresh the trigger label — don't add scattered refresh calls instead.
  `enhanceAll()` runs after `initControls` and again after each render for the
  per-bar `.bar-chord` selects (idempotent per element via `data-dd`). It renders
  `<optgroup>` labels as section headers, which is how every grouped menu in the
  app gets its captions. The panel flips up near the bottom edge, clamps into the
  viewport, and closes on outside-tap / Escape / external scroll — but **not** on
  its own open-time `scrollIntoView`. A test guards the contract.
- **`modal.js`** — Promise-based `confirmModal()` / `promptModal()` /
  `infoModal({ title, closeText, render })`, replacing `confirm()`/`prompt()`, so
  callers are `async`. Destructive actions wear the app's fixed red
  (`.tp-modal-danger`, the same convention as the REC lamp). Escape/backdrop
  cancel, with a capture-phase Escape + `stopPropagation` so it doesn't also close
  the Options sheet underneath. `render(bodyEl)` fills the info card, so content
  lives in the caller and `modal.js` stays generic — the Guide is built that way
  (`renderHelp` in `app.js`).
- **`ui-sound.js`** — a two-phase tape-deck transport key: a light, bright
  **`playPress`** ("ka") on `pointerdown` as the key travels in, and a deeper
  **`playRelease`** ("chunk") on `pointerup` as the spring seats. Fired by ONE
  delegated listener pair in `app.js` over `button, .lamp, .dd-trigger,
  .dd-option`; sliders, text inputs and grid cells are excluded. Own on/off lamp,
  persisted in `tp-audio`. All knobs are the two objects passed to `body`/`tick`.
  - **The silent-switch policy lives in `app.js`, not here** (v2.8.2): **no button
    sound while the transport is running.** The web cannot read the iOS ring
    switch, and playback is the only window in which we hold the audio category
    that overrides it — so muting buttons there is what makes a silenced phone
    genuinely silent, while the metronome and melody (audio you asked for) still
    come through. Accepted side effect with the ringer on: no clicks during a
    take. The decision is taken once per press and held for the pair
    (`pressSilenced`) so the button that starts or stops the transport gets a
    matched ka-chunk rather than half a press. This is glue, which `tests.js`
    doesn't import — it was verified by counting oscillator starts per
    `AudioContext` (2 per press while stopped, 0 while running).

**Platform integrations** (`platform.js`) — four OS behaviours the musical model
knows nothing about. **Every one is feature-detected and degrades to a silent
no-op** (these APIs are young or WebKit-only, and a practice tool must not break
because a browser lacks one), and each takes injected `nav`/`doc`/`win` — the same
trick `storage.js` uses for its store — so the logic is unit-tested with stubs and
only the physical behaviour needs a phone.
- **`createAppUpdater()`** — picks up a deploy on launch. Three parts, all
  needed: `updateViaCache: "none"`, an `update()` on load **and on every return to
  foreground** (a standalone app is resumed far more often than cold-launched),
  and a **reload when the new worker takes control** — `sw.js` calls `skipWaiting`
  + `clients.claim`, so the caches swap under a page built from the old ones. Two
  guards on that reload: **never on first install** (no previous controller ⇒
  nothing on screen is stale; without this a first visit reloads itself), and
  never when `canReload()` is false (`state.unsavedEdits` or a running transport —
  reloading would destroy hand-drawn work or cut a take in half). Skipping is
  safe: the worker is already active, so the next ordinary launch is current.
- **`createAudioSession()`** — `navigator.audioSession.type = "playback"` is the
  opt-out from the iOS silent switch, which by default silences audio the user
  explicitly asked for. **The category is per-DOCUMENT**, and that decides the
  policy: the app takes `playback` **only while the transport runs** and hands the
  previous category back on stop. Set it **before** `metronome.start()` so the
  AudioContext is created under it. Holding it permanently was rejected — that
  category doesn't mix with other apps, so a stray button tap would interrupt
  background music.
- **`createWakeLock()`** — the screen stays awake the whole time the app is up,
  not just while playing (you read the grid between takes as much as during them).
  No toggle; add one only if battery cost bites. Two things make it actually work:
  the OS drops the lock whenever the page is hidden and does **not** restore it,
  so re-acquiring on `visibilitychange` is mandatory; and on hide we **forget the
  sentinel rather than trust its `release` event**, because a missing event would
  leave us holding a dead lock and never re-acquiring — the exact failure the
  feature exists to prevent. Some browsers refuse the first request without
  transient activation, hence a retry on the first `pointerdown` (`acquire()`
  no-ops once held, making it cheap).
- **`createPlaybackGuard()`** — stops the transport when the page stops being
  visible. It exists *because* of the audio session: `playback` is precisely what
  keeps iOS sounding us in the background, while the same backgrounding freezes
  the scheduler's `setTimeout` — so on the next fire every missed slot is
  scheduled at a time already in the past and Web Audio plays them immediately.
  The symptom is a **burst, not drift**. `visibilitychange` is the only signal the
  web offers and **cannot distinguish a screen lock from an app switch or a
  pulled-down notification shade**; ending the take on all of them is right
  anyway, since none leaves you looking at the grid. `pagehide` covers the exits
  that never report a visibility change (bfcache, termination). **`stopTransport()`
  in `app.js` is the single stop path**, so the guard and the Play button can't
  drift apart — handing the audio category back matters as much as killing the
  scheduler. The backstop for a freeze nothing tells us about (a slept laptop, an
  OS audio interruption) is `hasDrifted()` / `MAX_DRIFT` in `metronome.js`: past
  0.25s behind (≈2 8ths at the top tempo) the scheduler **drops** the missed slots
  and resyncs, clearing the stale playhead queue with them.

**The design language: the whole screen is one warm tweed "faceplate" — a piece
of gear** (session 8). The mood board was 60s/70s RCA Victor country (Jerry Reed,
Chet Atkins), Gretsch walnut-and-gold, tweed amp grille cloth, Arhoolie folk
(Elizabeth Cotten). **The governing rule, his: this is a practical workhorse
practice tool — the right-hand pattern grid is ALWAYS the hero; the chord just
labels it. Craftsmanship should surround the tool, never overshadow it.** A
"chord as hero" pass with a giant watermark letter was rejected for hurting grid
legibility, and an engraved brass serial plate shipped and was then reverted for
pulling the eye off the grid. The faceplate itself is the `body` background —
fixed tweed weave + sheen + edge vignette over `--faceplate`, all in **fixed
rgba because it's texture, not hue**, so it rides every theme.
- **One consistent bevel language:** the grid is **recessed** into the faceplate,
  transport buttons and pills are **raised + carved** (dished radial + chamfer
  bevel + a debossed intaglio glyph), Options selects are **recessed wells**.
  Everything presses in on `:active`; the tilted Bakelite die sinks straight IN
  (`transform: none`), because a lateral 1px translate read as sliding.
- **Note tokens are 3D DOMES**, not chips — a poker-chip treatment (flat face +
  extruded edge) was built, tried and rejected. Signed off; don't re-propose.
- **Grid legibility beats decoration:** no per-cell borders. Strings read from
  quiet horizontal lines + thumb-row banding + a stronger divider under string 3,
  and only downbeats get a faint wash. **Rows run strings 1→6 top to bottom**, so
  fingers are on top and the thumb at the bottom.
- **Lamp colours are a convention, and it is NOT the theme accent.** The jewel
  body is shared (radial-gradient + rim + inset) so they read as one family, but
  the beat lamp is theme-driven (`--lamp-*`) while the indicators use
  **deliberate fixed hues, like real hardware: red = REC/armed, amber = caution
  (the ABS/MIX chips), green = save-OK.** A blink is a **pure flash** — constant
  size and rim, only the glass brightens; never a `transform: scale()`, which
  reads as a button moving. The Guide's legend is what explains those to the
  user, which is a large part of why the Guide is load-bearing now that the pills
  are icon-only.
- **Anything typed that isn't in a bundled face must be DRAWN.** The sheet's `✕`
  was U+2715 and rendered in Arial — the one system-font element in the app.
- **Touch hygiene, all learned from real bugs:** `touch-action: manipulation` and
  `-webkit-tap-highlight-color: transparent` on every interactive control (we
  draw our own feedback; WebKit's default blue halo was invisible on dark
  faceplates and obvious on Elizabeth), plus `-webkit-user-select` /
  `-webkit-touch-callout: none` — **but not on `input`**, which needs selection
  and paste. **Tag the containers too:** at an end-stop the capo button goes
  `disabled` and the tap falls through to the `.stepper` behind it, which is how
  iOS double-tap zoom got back in.
- **Prefer `position: relative; top` over `transform` for small lifts.** A
  `transform` promotes a compositing layer, and content behind the Options
  sheet's translucent backdrop then doesn't repaint on iOS — that was a real
  lingering-label bug.

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
is a pure data edit. Choice persists in `localStorage` — **and a saved preference
wins over the default**, so changing `jerry` only affects someone who has never
picked a theme (clear `travis-picker:theme` when testing). Note circles: thumb =
`--active`, fingers = `--accent` (keeps the hand-domain read). `styles.css`'s
`:root` fallbacks, used if the fetch fails, are **Jerry's**, read out of the live
app rather than hand-computed. Two optional per-theme roles exist beside
`hardware`: **`playhead`** (the derived `mix(surface, active, 0.4)` desaturates to
gray when surface and active are near-complements — Doc, Tommy and Buster
override it) and the derived `-hi`/`-deep` gradient caps, which are the hue pulled
toward white/black so a raised control is ONE material lit from above, not a warm
cap on a cool body.

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
- **The finger-density setting is called "Fingers" in the UI** (session 18), and
  its outlier tier is **"Wild Card"**, not "Chaos". The word was doing two jobs —
  naming the whole setting *and* its one off-curve member, which implied a
  ranking that doesn't exist. The legend is `Fingers` because it sits beside
  `Thumb` and those are literally the two layers the generator keeps separate.
  The menu is grouped by `CHAOS_GROUPS`: **Complexity** (Tame/Loose/Unruly) and
  **Experimental** (Wild Card) — a caption states what a bare divider could only
  imply, and "Experimental" leaves room for future off-curve generation ideas.
  **All internal ids are unchanged** (`chaos`, `CHAOS_PRESETS`, `state.chaos`):
  saved patterns store the id, so renaming it would break the library. A test
  asserts `CHAOS_GROUPS` partitions `CHAOS_IDS`.
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
- **Layout invariants can be tested too.** The name-row check renders the header
  and the **real stylesheet in an iframe** — `tests.html` carries no stylesheet,
  and booting the real app inside the harness would touch the user's
  localStorage. It was verified to **fail without its fix** rather than pass
  vacuously; do that for any new layout test.
- **Source-level tests are legitimate** when an invariant is invisible from
  inside the app and its failure is silent — `sw.js` is asserted not to contain
  `.addAll(`, and to contain `cache: "reload"` and an `res.ok` check.
- **A pref blob seeded with defaults can never tell you "unset".**
  `audioPrefs.x ?? fallback` only ever sees the default, which silently dropped a
  stored swing value; `loadAudioPrefs()` returns the **raw stored blob** so a
  migration can read it. Every future pref migration hits this.
- Commit after each working feature; skim the diff. Commit messages end with the `Co-Authored-By` trailer.

## Status

**v2.13.3 is live and signed off**, 69/69 checks green, tree clean. The build
order in `travis-picker-workflow.md` is complete: generator + grid, progression
mode, the Saved library, the manual editor, the metronome, PWA packaging,
pattern audio, the visual identity (structure then colour), keys / chords /
progressions, the platform integrations, the capo, and swing.

- **What changed and why, session by session** → `CHANGELOG.md` (newest first).
- **What's open, what's decided, what needs his call** → `OPEN_ITEMS.md`.

Three things deliberately dropped, recorded here so they aren't re-proposed:
**syncopation / 16ths** (at real Travis tempos the 8-slot grid is already all you
can fit); the **swing resolution that moves beats 2 and 4** (a real feel, but it
swings the thumb, and the thumb not moving is the technique); and the spec's
**save-time relative/absolute dialog** (drawing already keeps role-matching bass
relative and marks off-role bass absolute, and the type indicator reports
`relative`/`mixed`/`absolute` live).

## Working with this user

- **Agree the design BEFORE coding.** Surface genuine forks, don't guess — he
  says so explicitly and he means it. Several of the best decisions in this app
  came from one well-framed question (the chord-aware thumb domain, shared-cell
  editing, merging Loop + Phrase length). Don't ask about things with an obvious
  default.
- **Ask before deviating from the spec** — it's a maintained document, and
  deviations (Web Audio over Tone.js, no save dialog) get recorded in it.
- **He improves the option you hand him.** "Complexity" came back as **Fingers**,
  which is better because it pairs with Thumb and names the *layer* rather than
  the axis; "Experimental" came back as the group name explicitly so future
  off-curve ideas have somewhere to live; a swing verdict came back as a written
  spec tighter than anything I'd have proposed. Offer the menu, don't defend it.
- **He asks the question you should have asked.** "Is Futura actually free?" (it
  isn't) is why the legend face is bundled Jost.
- **Build the cheap version of a fork instead of debating it — he decides by
  playing.** Swing's two resolutions were one parameter apart inside one pure
  function, so both shipped for a guitar trial. He kept the unusual one, spec'd it
  in detail, and two days later cut it *and* the detents he'd specified. Three
  rounds, all correct, none of which a conversation would have reached.
- **He tests on a real guitar and a real phone between sessions** and brings
  written notes. Stop at natural checkpoints and say what's worth trying.
- **Report what was and wasn't verified**, and prefer measuring to theorising.
  Correct yourself plainly when you need to: I once told him the metronome click
  needed no decision because it only sounds on beat slots — true of the swing
  resolution that survived, and not of the one that moved beats 2 and 4, where
  the click shuffled too. He'd have heard it on the guitar and wondered.
- **Don't write a comment you haven't measured.** A claim that an unpinned
  `.capo-tag` "pushed the grid down" was simply wrong — the tag's own box does
  grow with a sharp, but the pills are taller and set the row height, so nothing
  propagates. The pin is right; the justification had to be corrected to say it's
  insurance.
- **Check whether your fix moved the constraint.** Renaming Chaos → "Wild Card"
  made it the *longest* value in a column that had been sized minutes earlier, so
  it clipped by 1px. And the one truncated Thumb value he reported was actually
  three — the reported symptom is rarely the whole set.
- **His favourite kind of work is functional hardware detail** — lamps, button
  feel, the capo stepper.
- **The pattern grid is always the hero**, and the deploys are public — keep the
  GitHub noreply identity.

## Deferred implementation notes

- **Editor tap-inference (item 3):** on an overlap string (finger-domain AND a chord bass role, e.g. string 3 on D), infer a tapped note as thumb on beat slots and finger on offbeat slots. Label always comes from the stored `finger`, never re-inferred from the row. (Stub comment already in `data.js`.)
