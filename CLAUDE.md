# CLAUDE.md — Travis Picker

Practice tool that generates random, playable Travis-picking (alternating-bass
fingerstyle) right-hand patterns and shows them on a drum-machine grid.
Mobile-first, no build step, no server dependency, no accounts. Runs entirely in
the browser.

**This file is the HUB: architecture and the invariants that constrain any work,
whatever you're touching.** It is the one doc loaded automatically every session,
so anything that only matters while you're inside a particular area lives in its
own doc and is read on demand:

| file | read it when |
|---|---|
| `DESIGN.md` | you're changing how it **looks or feels** — materials, type, colour, the geometry of the sheet and the drum pickers, touch behaviour |
| `CHANGELOG.md` | you want to know **why** a decision was made, or whether an idea has already been tried and rejected — session by session, newest first |
| `OPEN_ITEMS.md` | you want the standing **open** list: each item's size, what's decided, what needs his call |
| `HELP_COPY.md` | you're reviewing help-card **wording** — a review sheet, not a source; `HELP` in `data.js` is the source |
| `travis-picker-spec.md` | you need the source of truth for the **musical model** |
| `travis-picker-workflow.md` | you want the original build order (complete) |

**Two rules keep the hub from rotting**, both learned the hard way in session 34:
a **"(session N)"** attribution here is a pointer into `CHANGELOG.md`, not a
summary of it — don't re-import the narrative; and a fact that only matters *at
the line that implements it* belongs in that file's comments, not in any doc.
Copies drift: this file once said the wheel's mask ramp was 8/92 while the
stylesheet said 6/94.

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

**What the dev box CANNOT tell you** — each of these has produced a wrong
"verified" before:
- **`requestAnimationFrame` is paused in a hidden preview tab**, which freezes
  both the playhead and the beat lamp, so their blink can only be confirmed on a
  real, foreground device. `document.fonts.ready` can hang there too — force
  layout with `offsetHeight` instead of awaiting frames.
- **The Browser-pane preview server can't read `~/Desktop`** (macOS TCC), so
  in-browser verification runs against an **rsync mirror** of the repo in the
  session scratchpad, wired up in `.claude/launch.json` (untracked). **Re-sync
  after every edit** before re-checking, or you're testing the previous copy.
- **`computer{screenshot}` can return a STALE FRAME.** The preview tab runs
  `visibilityState: "hidden"`, so the compositor may not repaint: three
  screenshots in session 20 showed a closed Options sheet while the DOM reported
  it open. Driving the page with **real `computer` clicks** produced live frames;
  a JS-only state change did not. If a screenshot disagrees with a DOM read,
  believe the DOM and re-drive with clicks.
- **No touch, no ring switch, no lock screen.** The tap-highlight halo (v2.6.2),
  long-press selection, silent-mode audio and the wake lock are all invisible
  here; the most the dev box can do is read the computed property.
- **`tests.html` STALLS in a hidden tab and a screenshot PERTURBS it** (session
  34). Timers are throttled to the point that the run makes no progress at all
  until something forces frames — so the suite has to be nudged with `computer`
  actions, and a run that "hangs" here is the tab, not the code. But a
  screenshot resizes the pane, and a `resize` closes any open `.dd-panel`
  (dropdown.js's `reflow`), which is what made the wheel checks look flaky.
  Screenshot *between* runs, not during one.

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
                  imports it at runtime. Pure stdlib (no PIL on this Mac), and it
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
js/modal.js       confirm / prompt modals in the app's own language
js/dropdown.js    custom dropdowns OVER the native <select> — read the invariant
js/wheel.js       the two drum pickers (root × quality, key × progression). A
                  dropdown.js panel RENDERER, not a control of its own
js/chordbox.js    the left-hand shape as a chord box, under the chord wheel's
                  drums. Pure model + an SVG renderer; no deps but data.js
js/help.js        help mode: the "?" latches and every tap explains instead of acting
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
harmonic **tokens** (`PROGRESSIONS[].tokens`, e.g. `["I","V","vi","IV"]`), and the
selected **key** (`KEYS`) maps each token to a chord (`KEYS[k].chords`). Tokens —
not bare 1–6 scale numbers — because the curated set needs harmony a plain degree
can't express: a **major `II`** (distinct from the diatonic minor `ii`), the
flat-seven major **`♭VII`**, a dominant-7th tonic **`I7`**, and the secondary
dominants the ragtime loops are built from. Each key carries a **`mode`**
(`major`/`minor`), and a key's mode decides which progressions are offered — there
is **no separate Major/Minor toggle**, the key selector holds both. Changing key
**within a mode** transposes by token (`degreeOf` → `KEYS[newKey].chords[token]`),
hand-edited bars included, unknown chords left alone; changing key **across** the
mode line resets to that mode's first preset, because the token sets differ.
`detectProgression()` re-identifies the bars after any edit (in-mode only,
preferring an exact-length match so `I–IV–V–I` isn't read as the shorter
`I–IV–V`) and falls back to **Custom**. Degree 7 (diminished) is still absent.

**Every progression is a 4-bar phrase** (`tokens.length === 4`): a 2-chord idea
repeats, a 3-chord idea holds its last chord. A separate **`label`** field carries
the concise idea (`I–V`, `I–♭VII–IV`) shown in the menu and the header readout;
`tokens` is the literal realization. A hand-edited (Custom) progression shows its
per-bar degrees instead — via **`degreeLabel(chord, key)`**, which prefers the
curated key token and falls back to **`romanInKey`**: the numeral computed from
the chord root's interval to the tonic + its quality, so a non-diatonic bar reads
as a real numeral (`♯iv`, `♭ii`, `VI7`) rather than `?`. The computed value
reproduces the map token for diatonic chords, and the tritone spells `♯IV` by
convention. Menus group by data — keys by `KEYS[].mode`, progressions by
`PROGRESSIONS[].style` — and `dropdown.js` renders `<optgroup>` labels as section
headers. **Chords have no grouped menu**: both chord pickers are the wheel, so
`CHORD_GROUPS`/`SINGLE_CHORD_GROUPS` are gone.

**No scrolling, ever:** every bar must be visible at once — you're holding a
guitar and can't swipe mid-pattern. `grid.js` sets `data-bars` on the track and
CSS sizes cells as a fraction of available width (square via `aspect-ratio`),
wrapping 4 bars to a 2×2 on a phone. Don't reintroduce a fixed `--cell` px size
or an `overflow-x` scroller.

**Where controls live** — the organising question is *"could you use this with a
guitar in your hands?"*, because vertical space is the scarcest resource. This is
the placement policy; **how these surfaces are drawn is `DESIGN.md`.**
- **Bottom strip (always visible), one row:** Play, BPM, 🎲 Generate, ⚙ Options.
  Only things you reach for mid-practice. 44px tap targets — don't shrink them to
  buy slider width.
- **Slim bar above the grid: TWO rows** since v2.11.0 — capo state (left) + the
  **four pills** (right: Edit, Save, Load, `?`), then the pattern **name** on its
  own line, which is what gives the name the full width in every state.
  **`.app-head` is 55px**, and that second row is the whole reason the clearance
  under the grid is 11px rather than 28px. The name row is **reserved even when
  empty** (a fresh generation shows no name at all — no "Untitled" placeholder),
  so saving or loading never shifts the grid.
- **ONE readout above the grid says what you're playing over** (`#chord-head`), in
  both chord modes: the single chord big, or the progression's Roman numerals +
  key. They used to sit in different places — chord above the grid, progression up
  in the header — so the information moved when you switched modes. The slot's
  **height is reserved (22px)** so the grid can't shift; the 40px single-mode
  chord overflows it upward, exactly as it did when the box was zero-height.
- **⚙ Options sheet: TWO PAGES** since v2.10.0 — **Setup** (Format + capo, then
  the chord / key+progression row, then Thumb/Fingers/Pattern length, then Swing)
  and **Preferences** (the Sound lamp bank, note labels, theme). You set all of it
  sitting down, between takes; the gear always opens on Setup. The split exists to
  buy height — one page had ~27px spare at 375×553. Ids are
  `tab-setup`/`page-setup`; "Generation" was page 1's name until v2.13.3 and
  survives only in older `CHANGELOG.md` entries.
- **There is no app bar.** A title told you nothing the home-screen icon doesn't,
  and its 53px was the difference between the 4-bar grid fitting and not.
- **Accidentals need a FIXED `line-height`** wherever they appear (`.context`,
  `.dd-trigger`, `.dd-option`). `♭`/`♯` (U+266D/U+266F) aren't in Fraunces, so
  they render from a fallback whose taller ascent/descent grows the line box —
  picking a `♭VII` progression grew its dropdown trigger +4px and pushed the
  bottom-anchored Options sheet up 3.75px. **This one is here rather than in
  `DESIGN.md` because it bites anyone adding text anywhere**, not just someone
  working on appearance.

**The height budget is the constraint.** Cells are square and sized from screen
*width*, so grid height is fixed by how wide the phone is and can only be bought
back from chrome. Measured live at **375×553** — SE-class, 4 bars, progression
mode, capo set, the worst case:

| what | measured |
|---|---|
| `.app-head` | 55.09px |
| grid track | 384.84px |
| **clearance under the grid** | **11.06px** |
| `main` overflow | 0 — it fits |

**That 11px is the entire remaining budget, and it is the number to protect.**
Those exact figures have held unchanged from v2.13.3 through v3.2.x, across the
chord wheel, the chord diagram and every Options-sheet change — because all of
those are **body-level overlays or live inside the sheet**, and the 40px chord
readout pins its own `line-height` so a `C♯m` can't grow its box.
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
  key `"slot:undefined"`, which silently swallowed a second drawn bass note in the
  same slot — 17 of 48 cells refused a note. There's a regression test.
- Edits set `pattern.edited`, which saves the item with `source: "drawn"`, and
  `state.unsavedEdits` guards the destructive paths (Generate, Load, a
  Thumb/Fingers change all `confirmModal()` first, and declining reverts the
  control). Hand-drawn work is the only thing here that can't be re-rolled back.

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
  `onStep`/`onCountIn` loop — no second clock. It blinks on beats (downbeat a
  bigger pulse), so it's a **silent visual metronome** when the click is off. The
  count-in reports each digit twice (beat + offbeat 8th), so app.js pulses only
  when the count advances. rAF is paused in a hidden tab, so this and the playhead
  can only be confirmed on a real foreground device.
- One bar of **count-in** (grid dims, button counts 1–4). `onCountIn(null)` only
  fires on stop, so the **first real step clears the count-in state** — that's
  why `onStep` calls `showCountIn(null)`.
- `start()` creates/resumes the `AudioContext` **inside the click handler**, or
  iOS Safari stays silent. BPM 40–240, clamped in `setBpm`.
- **THE AUDIO CONTEXT CAN GO BAD, AND `resume()` IS NOT TO BE TRUSTED**
  (session 32 — this was the intermittent dead-Play bug). iOS has a third context
  state beyond running/suspended: **`"interrupted"`** (a call, Siri, another app
  taking the audio session), and `resume()` on one may reject **or never settle at
  all**. `running = true` sat after that await, so the transport never started and
  every later press re-entered the same dead path. Four rules now hold:
  - the resume is caught **and raced against `RESUME_TIMEOUT_MS`** (injectable for
    tests, session 34), so a click handler is never left on a promise that won't
    settle;
  - if the context still isn't running it is **thrown away and rebuilt** — an
    interrupted context often can't be revived, only replaced. `dropContext` nulls
    the **synth** with it: its buffer cache holds `AudioBuffer`s made by that
    context and useless to any other;
  - **`start()` returns a boolean and never throws.** A failed start has to be
    reportable, or the Play button lies about the state of the app — which was
    half the bug. `app.js` flips the button optimistically and **always pays that
    optimism back** via `releasePlayback()`, deliberately *not* gated on
    `metronome.running` (that gate is what made the old failure unrecoverable);
  - **`recoverAudio()` runs on every return to foreground** (the playback guard's
    `onShown`) — the automated version of the user's own leave-and-come-back fix.
  Verified by driving a stub context that rejects, and one that hangs: pre-fix,
  `start()` threw on the first and **never resolved** on the second.

**Swing** (`slotSeconds()` in `metronome.js`, session 18): the whole feature is
one pure function saying how long slot 0–7 lasts. Each beat is paired with its
`&` and the pair split long–short, the beat taking `ratio` of it.
- **The `&`s move late and BEATS 1–4 NEVER MOVE**, so the thumb stays
  metronomic — which is the technique this app exists for. The metronome click
  only sounds on beat slots, so it never moves either: you always have a straight
  quarter pulse to practise against. **A test asserts the beats don't move**, and
  it's there as a guard, not a formality (see the cut feature below).
- **A second resolution was built, trialled and CUT** (v2.13.0–.2). It moved beats
  2 and 4, so the *thumb itself* swung — a real feel, but **not Travis picking**,
  which is why he cut it after playing with it. Git history has the
  implementation; don't rebuild it without that argument changing.
- **The control is a smooth slider, 50–75 in whole percent.** Five named detents
  were built, tried and rejected in favour of the smooth one (his call), so
  `snapSwing`/`SWING_STEPS` are gone. **50 is Straight and doubles as the off
  switch**; the readout says "Straight", since the number behind an off position
  isn't information. **67% is his setting** — the reachable value closest to true
  triplet swing (1.7ms off at 120bpm).
- **The bar's total length is invariant** at any amount (each pair sums back to
  two plain 8ths), which keeps BPM meaning what it means and leaves the count-in a
  full bar. Asserted in tests.
- **It lives only in the scheduler's slot advance.** Everything downstream is
  already time-driven — notes are scheduled at `nextSlotTime`, the playhead reads
  the audio clock — so the app follows for free, and `setSwing` takes effect on
  the next scheduled slot, so you can drag it mid-loop and hear it move. The
  count-in swings too, which is right: it tells you the feel you're counting into.
- **Swing is a FEEL setting, not pattern content** — it persists in `tp-audio`
  alongside the sound toggles and is deliberately not part of a saved pattern's
  context. (BPM is the same class of thing: also not saved with a pattern, though
  since session 32 it *does* persist across launches — see "Session preferences".)

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
  raw-Web-Audio-vs-library question: a plucked string is a noise burst through a
  short delay line with an averaging low-pass in the feedback path, and it sounds
  like a string, so **no library** (keeps the offline PWA clean). Each pluck is
  rendered **offline into an `AudioBuffer`** and played via a `BufferSource` — no
  `AudioWorklet`, no deprecated `ScriptProcessor`, iOS-safe. Buffers are **cached
  per (pitch, voice)**; all voices share one `DynamicsCompressor` bus so a triple
  stop + thumb can't clip. A ~50ms tail fade prevents truncation clicks (a fixed
  `seconds` cuts a low note mid-ring — KS rings ~4× longer on a low string).
- **Two voices, all knobs in `synth.js` (`BASS_VOICE`/`TREBLE_VOICE`).** Bass is
  **palm-muted** — the classic Travis thumb sound, a short dark thump. The
  `brightness` knob (1 = canonical KS, lower = darker) is the mute: an in-loop
  one-pole low-pass leaves the fundamental but eats the harmonics, and below
  ~0.375 the excitation is pre-smoothed for a duller attack. Guitar-tuned to
  `0.37`; treble stays bright. Tune by ear on a phone: `brightness` for mute
  amount, `decay`/`seconds` for length, `gain` for level.

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

**Session preferences** (`tp-prefs`, in `app.js`, session 32): the controls you
**set once and keep**, restored on the next launch — chord mode, chord, key,
capo, progression, thumb, fingers, pattern length, note labels and **BPM**.
- **It's a THIRD store, not an extension of `tp-audio`**, which stays what it is
  (the four sound toggles + swing). Swing was **not** moved — migrating it would
  strand real settings for no gain. **BPM persisting REVERSES a documented
  decision** (his call, asked; the old rule was that tempo is too volatile to
  remember).
- **`savePrefs()` is called from `render()`**, the one funnel every one of those
  controls already passes through, so it can't miss one the way a per-handler call
  would. BPM doesn't render, so it saves from the fader's `input` handler. That
  funnel includes `loadSaved()`, which is what makes "reopen how you left it" true
  of a loaded pattern too (his call). The capo persists here as a **session
  default** — distinct from the capo inside a saved item's context, which is
  musical content and still wins, since `loadSaved` runs after the restore.
- **`restorePrefs()` runs inside `boot()` after `initControls`/`enhanceAll` and
  BEFORE `generate()`** — the menus have to exist (the wrapped `value` setter is
  what repaints the triggers) and the first roll has to be made against the
  restored chord. Calling `setChordMode` that early is safe **only because
  `render()` no-ops while `state.pattern` is null**, and it must come last in the
  restore or it overwrites the restored progression with the key's first preset.
- **Every restored value is validated against its select's live options** (chords
  against `CHORDS`), because chords, keys and progressions are data and do change
  between releases. There is **no seeded default blob**: it reads the raw stored
  object and applies only the keys actually present, which handles the "a pref blob
  seeded with defaults can never tell you unset" footgun by construction.

**UI components — we draw our own, because iOS draws the OS's** (session 11).
Four dependency-free modules, all precached:
- **The five list menus (Thumb, Fingers, Pattern, Note Labels, Theme) stay
  LISTS** — short unordered sets, where a barrel would be ceremony. They wear
  the drums' material (`.dd-list`, added by `renderList` so none of it lands on
  `.dd-wheel`); the material rules are in `DESIGN.md`.
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
  **The PANEL is pluggable** (session 21): `enhanceSelect(select, { render })`
  takes a renderer and the scrolling list is simply the default one — everything
  around the panel (trigger, value-setter wrap, one-panel-at-a-time, catcher,
  Escape, close-on-reflow) is the same job whatever is drawn inside, which is what
  let the wheel exist without a second copy of it. A renderer may return
  `{ onKey, afterOpen, cleanup }`; **`afterOpen` is called synchronously, not in a
  `rAF`**, because a hidden tab never runs rAF and the wheel sets its scroll
  positions there.
  **A renderer MUST commit through the `commit` it is handed**, never through a
  captured element — and `retargetOpenPanel(find)` is why. The per-bar chord
  selects are rebuilt by every `render()`, and picking a chord *is* a render, so
  an open panel's target was destroyed by its own first pick: the panel stayed up,
  the reels still turned and ticked, and nothing happened. `app.js` retargets right
  after the post-render `enhanceAll`, matching a bar select by its `data-bar`; the
  panel's DOM and scroll positions are untouched, and a `find` that comes back
  empty closes rather than leaving a live-looking panel wired to nothing. A test
  drives two consecutive picks through a rebuild and fails without it.
- **`wheel.js` — TWO DRUM PICKERS over one mechanism.** Chord = root × quality
  (session 21) and **Key × Progression** (v2.14.5). Both are his calls, and the
  rule that decides where a drum belongs is his reframing: **a drum earns its
  place where the axes are a cross-product you'd say out loud** ("an E major", "a
  1-4-5 in C"). Read as *style* × progression the axes have holes and it was
  rightly rejected; key × progression is total **within a mode**. Both are
  **renderers, not controls**: the hidden `<select>`s stay the source of truth and
  a settle calls `commit()`, so app.js's wiring and the `#grid` delegation never
  learn they exist. Every chord picker uses the wheel — the Options sheet's and
  every per-bar one — which is why the grouped chord menus are gone.
  - **ONE FIELD OVER TWO SELECTS is the only structural difference.** Chord's two
    reels write one composite id; Key × Progression writes two independent
    selects, so `#key` carries `dd-native data-dd="1"` (enhanceAll **skips** it),
    the single trigger is owned by `#progression`, and the key reel writes through
    a `commitKey` handed to the renderer. `enhanceSelect`'s **`watch`** option
    exists for this: the trigger's face shows both halves, and a transpose, a load
    or a die roll sets `#key` programmatically with no `change` event.
  - **Crossing the major/minor line RE-CUTS the progression reel.** It's the one
    hole in the product, and the same boundary at which app.js already resets to
    that mode's first preset. The renderer re-reads the select after committing a
    key and rebuilds the reel only if the option set actually changed. A test
    drives a cross both ways.
  - **`Custom` rides the end of the progression drum and is a READOUT, not a
    choice** (his call): picking it leaves the grid's chords exactly as they are,
    which is already what `applyProgressionPreset` does. Editing a bar chord makes
    `syncProgressionSelect` set the select to Custom, so the drum opens on it.
  - **THE LEFT-HAND SHAPE RIDES UNDER THE DRUMS** (`chordbox.js`, session 33 —
    OPEN_ITEMS item 9, whose revisit condition fired at 120 chords / 75 barres).
    Two things it marks, both his calls and both **changed in session 34**:
    - **Only the ROOT is accented** (`--active`). It used to accent the thumb's
      whole alternating pair (root + alt), on the argument that no chord chart can
      tell you which two notes the thumb rocks between. **He reversed it**: root-only
      is what an ordinary chord chart marks, and the thumb is already implicit in
      which string a note is on, since 6/5/4 are its domain.
    - **THE MOVING FINGER, drawn HOLLOW** — where one left-hand finger covers two
      strings by moving between them rather than holding both (the open-C ring
      finger rocking onto the low bass note as the thumb alternates). **Which
      chords have one is DATA** (`MOVING` in `data.js`) and cannot be derived: the
      geometric rule fires on 82 of 120 and is wrong on every plain barre, where
      both notes are simply held. See the note above that table.
    - **A BARRE GOES ALL THE WAY ACROSS, AND A SHAPE CAN HAVE TWO** (his call,
      session 35). Drawing, not data — a barred string carrying a higher note
      still sounds the higher note, so no frets moved. **A run of ≥4 adjacent
      strings at one fret is also a bar; 3 is three fingers** — he set both ends
      (35b), and open A's fret-2 trio is the anchor. Geometry in `DESIGN.md`.
    - **Hollow is a WARNING, so it's used only where a finger genuinely must
      move** (35b) — `MOVING` in `data.js`, cut to C / C7 / C6 / B7.
    It **redraws on SETTLE, not per detent** (his call): a diagram flickering under
    a spinning barrel is motion under a mechanism that's already moving. Only the
    **chord** wheel gets one — Key × Progression has no shape — and both entry
    points get it free, since they open the same panel. Its geometry, and why the
    open-string markers are filled discs, are in `DESIGN.md`.
  - **The mechanism's look and geometry are `DESIGN.md`** — the two housings, the
    engraved grooves, and the fact that **the panel and the Options field are one
    object cut from `:root`** (which is why the field can't change width between
    chord modes, and why widening the panel breaks a test). Facts that only matter
    at the line that implements them — the reel's step/facet split, the mask ramp,
    `.dd-wheel`'s `position` — are commented in `wheel.js` and `styles.css`.
  - **It commits on SETTLE and the panel stays open** (his call): every root ×
    quality is a real chord, so there's no half-set state to guard, and you can
    spin one reel, hear it, then spin the other. `SETTLE_MS` is the quiet time
    after the last scroll event — **injectable, for the tests only** (session 34);
    110ms is the feel and the app never passes anything.
  - **Its voice is the detent, not the button** — `playTick()` per name through
    the window, and `pressStrength()` in app.js explicitly excludes `.reel-item`
    so a tap doesn't ka-chunk over the tick or click on the first frame of a drag.
- **`modal.js`** — Promise-based `confirmModal()` / `promptModal()`, replacing
  `confirm()`/`prompt()`, so callers are `async`. (An `infoModal` existed only for
  the Guide and went with it in v2.13.4.) Destructive actions wear the app's fixed
  red (`.tp-modal-danger`, the same convention as the REC lamp). Escape/backdrop
  cancel, with a capture-phase Escape + `stopPropagation` so it doesn't also close
  the Options sheet underneath.
- **`ui-sound.js` — four voices, all synthesised here, all knobs in the two
  objects passed to `body`/`tick`.** The transport key is TWO-PHASE: a light,
  bright **`playPress`** ("ka") on `pointerdown` as the key travels in, and a
  deeper **`playRelease`** ("chunk") on `pointerup` as the spring seats. Fired by
  ONE delegated listener pair in `app.js` over `button, .lamp, .dd-trigger,
  .dd-option`; sliders, text inputs, grid cells and **the chord wheel's names**
  are excluded. **`playTick`** is the wheel's DETENT — same materials, a third the
  level, **no tail** (it fires several times a second in a spin and a tail would
  smear). **`playPlace`** is edit mode's **"thock"** (his image: a felt-bottomed
  chess piece set down) — same woody `body`, but the contact `tick` is LOW and
  low-Q, because felt damps the strike; it fires on every place AND delete, and
  grid cells are excluded from `pressStrength` so nothing doubles it. Own on/off
  lamp, persisted in `tp-audio`. Three rules decide *when* a press is silent, and
  all three live in `app.js`, not here — this is glue `tests.js` doesn't import,
  so each was verified by counting oscillator starts per `AudioContext`:
  - **No button sound while the transport is running** (v2.8.2). The web can't
    read the iOS ring switch, and playback is the only window in which we hold the
    audio category that overrides it — so muting buttons there is what makes a
    silenced phone genuinely silent while the metronome and melody (audio you
    asked for) still come through. Accepted side effect with the ringer on: no
    clicks during a take. Decided once per press and held for the pair
    (`pressSilenced`), so the button that starts or stops gets a matched ka-chunk.
  - **A NO-OP press stays silent, like the capo at an end-stop** (his note). Also
    held for the pair (`pressNoop`), because by pointerup the state has changed:
    an already-**seated** latching key (the current page tab or Format value)
    makes no change when re-pressed, so only the popped-out one sounds.
  - **A tap on an open dropdown's TRIGGER, or on the DIE beside it, still sounds
    AND still acts** (his notes, sessions 28 and 33). The outside-tap catcher
    (`inset: 0`) lies on top of both, so those taps land on a bare `<div>`:
    `pressStrength` saw no button, and the die was a dead first press that only
    closed the wheel. `overOpenTrigger()`/`overOpenDie()` in `app.js` rect-check
    the catcher tap against `openDropdownTrigger()` and `#randomize-chords`. The
    die's handler fires on the BUBBLE, after the catcher has already closed the
    panel, so the roll lands on a clean sheet rather than on stale reels. A bare
    outside tap stays silent, which is correct.

**Platform integrations** (`platform.js`) — four OS behaviours the musical model
knows nothing about. **Every one is feature-detected and degrades to a silent
no-op** (these APIs are young or WebKit-only, and a practice tool must not break
because a browser lacks one), and each takes injected `nav`/`doc`/`win` — the same
trick `storage.js` uses for its store — so the logic is unit-tested with stubs and
only the physical behaviour needs a phone.
- **`createAppUpdater()`** — picks up a deploy on launch. Three parts, all needed:
  `updateViaCache: "none"`, an `update()` on load **and on every return to
  foreground** (a standalone app is resumed far more often than cold-launched),
  and a **reload when the new worker takes control** — `sw.js` calls `skipWaiting`
  + `clients.claim`, so the caches swap under a page built from the old ones. Two
  guards on that reload: **never on first install** (without it a first visit
  reloads itself), and never when `canReload()` is false (`state.unsavedEdits` or
  a running transport). Skipping is safe — the worker is already active, so the
  next ordinary launch is current.
- **`createAudioSession()`** — `navigator.audioSession.type = "playback"` is the
  opt-out from the iOS silent switch. **The category is per-DOCUMENT**, and that
  decides the policy: the app takes `playback` **only while the transport runs**
  and hands the previous category back on stop. Set it **before**
  `metronome.start()` so the AudioContext is created under it. Holding it
  permanently was rejected — that category doesn't mix with other apps, so a stray
  button tap would interrupt background music.
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
  visible. It exists *because* of the audio session: `playback` is what keeps iOS
  sounding us in the background, while the same backgrounding freezes the
  scheduler's `setTimeout` — so on the next fire every missed slot is scheduled at
  a time already past and Web Audio plays them at once. The symptom is a **burst,
  not drift**. `visibilitychange` **cannot distinguish a screen lock from an app
  switch or a notification shade**, but ending the take on all of them is right
  anyway; `pagehide` covers the exits that report no visibility change (bfcache,
  termination). It owns the **return trip** too (`onShown`), calling
  `metronome.recoverAudio()` — backgrounding is exactly what leaves the audio
  session interrupted, so it rides the same listener rather than a second one
  racing it. **`stopTransport()` in `app.js` is the single stop path**, so the
  guard and the Play button can't drift apart. The backstop for a freeze nothing
  tells us about is `hasDrifted()` / `MAX_DRIFT`: past 0.25s behind (≈2 8ths at
  the top tempo) the scheduler **drops** the missed slots and resyncs.

**The design language — the tweed faceplate, the four material families, type,
themes, touch hygiene, and the geometry of the sheet and the drums — is
`DESIGN.md`.** The one rule from it that governs everything else, and the reason
most design arguments resolve the way they do (his): **this is a practical
workhorse practice tool. The right-hand pattern grid is ALWAYS the hero; the
chord just labels it. Craftsmanship should surround the tool, never overshadow
it.**

**Help mode — the app explains itself in place** (`help.js`, v2.13.4). Tap the
`?` and it latches in like the Edit pencil; from then on, tapping anything shows
a short card about it **instead of** doing what it normally does. It replaced a
scrolling instruction-manual modal, and the argument is specific: **the four
header pills are icon-only and the ABS/MIX chips and REC/save lamps are
deliberately cryptic hardware indicators**, which is exactly what a manual
explains worst — a list of glyphs on another screen is the one place you can't
compare the glyph to the thing.
- **NAVIGATION SURVIVES, and the allowlist IS the spec** (`NAV_SELECTOR`): the
  gear, the two page tabs, the sheet's `[data-close]`, the `?` itself, and the
  card. Nothing else. Half the controls worth explaining live in the Options
  sheet and would otherwise be unreachable. Save and Load **explain rather than
  open**, because everything inside those sheets is a state-changing action;
  dropdowns explain rather than opening inert. The `?` needs no exit
  special-case — its tap reaches its own handler, which disarms.
- **The card is an OVERLAY and costs zero layout.** Measured at 375×553 with 4
  bars, identical before arming, while armed and with a card up. That's what
  makes the design affordable; anything reserving a strip was unshippable against
  an 11px budget.
- **`click` capture is NOT enough — `pointerdown` is the one that matters.**
  Measured with a real drag: with click-capture alone and help armed, the BPM
  slider still ran **90 → 240**. Capture-phase click *does* stop a `<label>`
  toggling its hidden checkbox (the Sound lamps) and does *not* stop a native
  range drag. `keydown` is intercepted too, and **`pointerup` since session 27** —
  it became an activation edge when the tabs and Format started committing on
  release. The one `swallow` handler is event-type-generic, so adding an edge is
  one line.
- **A DISABLED control emits no click at all**, so it would be a dead tap — and
  it's not a corner case: **the Load pill is disabled whenever the library is
  empty**, i.e. the first-run state, i.e. exactly the person reading help. Help
  already guarantees nothing acts, so `liftDisabled` removes it while armed
  (leaving `aria-disabled` truthful) and `restoreDisabled` puts it back.
- **Navigation dismisses the open card** (the sheet moves or hides whatever it
  was anchored to), and **tapping the same control again dismisses it** (his
  call), so every control is its own toggle. Compared by *key*, so a different
  control swaps the card rather than closing it. The card has no ✕.
- **The card's ring and its entry are separate jobs** (`data-help-ring`).
  `data-help` says which copy; an optional `data-help-ring` selector says which
  box to outline, picking **the first matching child that's actually rendered**.
  `#chord-head` is why it exists: it reserves a full-width 28px slot so the grid
  can't move, but what you *see* is either a 40px chord glyph overflowing it
  upward or a run of numerals inside it — one entry, two shapes, and no mode flag
  reaches `help.js`.
- **Two things have NO card and fall through to their parent, on purpose** (his
  call) — the **beat lamp** → Tempo, and a bar's **chord picker** and **number
  chip** → the grid. Both are one DOM move from being dead taps in a mode whose
  promise is "tap anything", so **a test pins each fall-through**. The picker's is
  correct *only because the grid's copy covers chords*, hence the test asserting
  `HELP.grid.body` mentions them. Note the picker is an overlay button that is a
  **sibling** of the hidden `<select>`, so annotating the select does nothing.
- **The `?` stays above the Options sheet's scrim** (`body.options-open`), since
  arming help from inside the sheet is the common case. z-index **30**: clears
  `.sheet` (20), under `.dd-panel` (40), the modals (60) and the card (70).
  **A plain z-index only works because nothing between the pill and the root
  creates a stacking context** — the whole chain was checked. Add a `transform`
  to any of them and this dies silently, so **the test hit-tests with
  `elementFromPoint`** rather than reading the z-index. The body class is set by
  `setOptionsOpen()` — one place, because three bare `hidden =` assignments used
  to open and close that sheet.
- **The copy is DATA** (`HELP` in `data.js`, keyed to `data-help`), the direct fix
  for how the Guide rotted — it was prose inside `renderHelp()` and still called
  the Fingers menu "Chaos" three versions after the rename. **A test checks both
  directions**: a control pointing at missing copy is a silent dead tap, and an
  unreachable entry is dead copy. A blank line in a `body` becomes a real `<p>`
  (only the grid's card uses it). **The copy's HOUSE RULES are his and live in
  `data.js` above the map** so the next edit sees them.
- **Help and Edit are mutually exclusive, but only one guard is needed** —
  arming help disarms edit; the reverse is unreachable, since the pencil isn't on
  the allowlist. **The transport is left alone** (his call): arming mid-take keeps
  it playing and Play explains itself rather than stopping.
- **The mode announces itself** with a card anchored to the `?` that armed it,
  which is also where **`APP_VERSION`** lives (every earlier home cost width a
  readout beside it needed).

**Type, themes and the whole visual language live in `DESIGN.md`.** Two rules
from it reach outside appearance and are repeated above: accidentals need a
pinned `line-height`, and **adding a font means adding it to `sw.js` PRECACHE and
bumping `CACHE`** (two tests guard that).

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
  its outlier tier is **"Wild Card"**, not "Chaos" — the word was naming both the
  whole setting and its one off-curve member, implying a ranking that doesn't
  exist. `Fingers` pairs with `Thumb`, which is literally what the two layers are.
  Grouped by `CHAOS_GROUPS` into **Complexity** (Tame/Loose/Unruly) and
  **Experimental** (Wild Card), which leaves room for future off-curve ideas.
  **All internal ids are unchanged** (`chaos`, `CHAOS_PRESETS`, `state.chaos`):
  saved patterns store the id, so renaming it would break the library. A test
  asserts `CHAOS_GROUPS` partitions `CHAOS_IDS`.
- **Chaos** is built as **presets over independent flags** (`CHAOS_PRESETS`),
  not branching code. The generator reads these numbers and **never branches on
  preset name** — tune feel by editing `CHAOS_PRESETS` only. The **difficulty
  curve is Tame → Loose → Unruly; Chaos sits OFF the curve** — it's the fully
  random discovery setting ("novelty over playability", per the spec), not
  "harder than Unruly" (session 6 round 2, user call).
  - **Difficulty model (session 6, refined against his worked examples).**
    Difficulty is **STRIKE-TIMES** — how many distinct columns the *fingers*
    attack in, thumb aside — **not note count**: a full three-finger rake is easy.
    **Pinched beats count against the strike budget, not on top of it.** Finger
    independence matters but **emerges from density**, so it isn't enforced
    separately (a one-group synchronization rule for Tame was tried and dropped —
    his real Tame examples mix a lone finger with a repeated pair). Stack
    thickness is a side effect, not an axis; **triples are legal in every tier**.
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
  - **Tier numbers** (measured over 500 seeds/tier): **Tame** 2–3 strikes, ~57%
    all-singles, clean; **Loose** 4–5 strikes, still clean; **Unruly** 5–6 strikes
    (~7% of bars drop to 4 when the re-strike budget blocks a column), re-strikes
    0–2/bar avg ~1.9, ~4% all-singles, ≥1 stack per bar on stacked rolls;
    **Chaos** genuinely uniform 1–8 strikes, uniform column shapes, unlimited
    re-strikes.
  - **Hard no-blank rule:** every bar gets **≥1 finger note** — the generator
    forces a legal offbeat rather than ship a bare-thumb bar. Asserted in tests.
  - **Re-strikes are rationed, not binary.** `maxRestrikes` charges each adjacent
    same-FINGER-string pair against its bar's budget (a string colliding with BOTH
    neighbours costs 2), so total finger pairs never exceed bars × maxRestrikes —
    asserted on `trebleBars`, since the bass overwriting a finger is not a
    re-strike. **The strike count is a best-effort floor and a hard ceiling**: if
    avoiding a re-strike leaves no legal finger string, the generator **drops the
    column rather than re-strike**.
  - Treble is generated for the **whole loop as one circular N = 8×bars slot
    sequence** (`generateTrebleLoop`), not bar-by-bar, so a re-strike straddling
    the **loop point** is caught like any interior pair — a per-bar generator
    couldn't see it.
  - Latent flag kept but unread: `domainCrossing`. Removed along the way:
    `allowDoubleStops`, `favorSingleOffbeats`, `syncFingers`/`groupSizeOdds`.
- **Bass presets** are data (`BASS_PRESETS`), and **all seven are surfaced** in
  the Thumb selector (session 5): `travis` (default, root-alt-fifth-alt),
  `simple_alt`, `dead_thumb`, `root_fifth` (relative, follow the chord), `climb`
  and `descend` (absolute integer walks that ignore the chord — texture tools,
  show the "absolute bass" indicator), and `full_random`.
- **Chord library is the FULL 12 × 10 MATRIX** — 120 chords, every root in
  Major / Minor / 7 / maj7 / m7 / 6 / m6 / sus2 / sus4 / add9 (sessions 21, 30,
  31; `dim7` is deliberately out — no perfect fifth means no alternating-bass
  target). **The matrix has to be dense because the picker is two wheels**: a
  cell you can spin to that isn't a chord would be a lie, and a test pins it.
  - **Ids are `root + suffix`** (`C`, `C#m`, `Eb7`) — what a saved pattern stores,
    and what `chordIdFor`/`splitChordId` convert to and from the two reel
    positions. `name` is what's PRINTED and comes from `PC_NAME`.
  - **34 voicings are hand-declared; the other 86 are derived** from two movable
    templates (E-shape and A-shape × the ten qualities). Open chords can't be
    templated (open strings only exist at the nut) and they're the voicings you
    actually play. **The rule is "whichever barres lower", and it isn't a new
    convention: it reproduces every barre chord the library used to hand-declare**
    — F@1, F♯@2, Gm@3, G♯m@4, B♭@1, B@2, Bm@2, C♯m@4, frozen in a test as the
    fixture, so a wrong template fails against voicings played on a real guitar.
  - **Every hand-declaration is an override with its own reason, and the reason
    lives beside it in `data.js`** — an open voicing, a template landing off the
    practical neck, or one of his own guitar verdicts (sessions 33's `E♭add9`,
    `F♯6`, `Cm6`/`C♯m6`, `Csus4`). Read those comments before touching a shape;
    they are not decoration, and two of them record corrections to *my* reasoning.
  - **PLAYABILITY IS NOT SPAN** (session 33, learned by getting it wrong). What
    makes a shape hard is **a low-fret note stranded on the far side of a
    high-fret one**, forcing a finger back past the pinky — not the distance
    between frets. And **a full barre is not a partial barre**: a standard
    all-the-way-across barre is fine by him, so "avoid partial barres" must not
    be read as "avoid barres", which cost a round of guessing. The wide sus2/add9
    barres are deliberately KEPT.
  - **One exception to the dom7 bass rule, flagged in the data.** The open 7ths
    keep the parent major's bass (the ♭7 on a *finger* string; E7 is `020130`
    precisely so its alt bass stays E). Inside an **E-shape** barre the ♭7 has
    only two homes — string 4 at the barre (the everyday `131211` F7) or string 2
    three frets up (a stretch nobody plays) — so **F7 / F♯7 / G♯7 alternate root ↔
    ♭7** rather than root ↔ octave. Playable shape over tidy rule; one line to
    flip. **maj7** makes the same trade on E-shape roots; **m7 no longer does** —
    session 35b revoiced Em7 to `0 2 2 0 3 0` (his call, on the voicing), which
    puts the octave back on string 4 and the ♭7 on string 2 as a finger colour, so
    the m7 family's bass is now root ↔ octave like the rest of the template.
  - Barre chords assume a *full* barre, so the low string is available as a bass
    note even where the textbook voicing mutes it — the same convention C already
    used (its fifth is string 6 fret 3). B7 is hand-voiced (`x21202`) with string
    6 fretted at 2 for the same reason.
  - **`PC_NAME` is the single source for how a pitch is SPELLED** — the wheel's
    root reel, every chord name and the capo tag all read it, so a pitch can't be
    `C♯` on the wheel and `D♭` in the header (it was, before the wheel). Which
    spelling per pitch is a guitarist's habit: flats for E♭/B♭, sharps for
    C♯/F♯/G♯. A test pins it.
  - **Four tests guard the library as data**, and each caught something real:
    every chord's role strings are covered by its shape; **no chord plays a string
    its own shape mutes** (the chord box exposed `A`/`Am`/`A7` doing exactly that
    — and a resolver asked for a muted string falls back to fret 0 and sounds it
    *silently*, which is what makes the class worth pinning); every voicing
    **spells its quality** (`Dadd9` shipped as plain D major for one build); and
    **`alt` never equals `fifth`** (with them equal, Travis's root-alt-fifth-alt
    collapses three of four beats onto one note — the F♯6 bug he heard). The
    muted-string check is scoped to **relative** patterns: climb / descend / full
    random walk literal strings and ignore the chord by design, which is what the
    ABS indicator warns about.
  - **🎲 rolls the whole library** (his call, with the wheel) — a picker that
    offers every chord with equal ceremony should have a die that does the same.
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

**v3.4.2, 106/106 green.** The chord library and the progression revamp are
finished (sessions 29–33): 120 chords, the drum pickers, and the chord-shape
diagram under the wheel. Sessions 32–33 also landed `tp-prefs`, the diagnosed
dead-Play bug, the landscape sheet fix, and four rounds of his guitar verdicts on
chord voicings. Session 35 applied his 14-chord playability spec and made barres
draw the way a hand makes them. Per-session detail is in `CHANGELOG.md`; what each
of those left open is in `OPEN_ITEMS.md`.

**Signed off, don't revisit unless he raises it:** the wheel (v2.14.0–.2 — the
detent, the spin, the curve, the die's pool, the F7/F♯7/G♯7 ♭7 bass), Wild Card
and Unruly, and the app as a whole on the guitar as of v2.13.3. The build order in
`travis-picker-workflow.md` is complete.

**Waiting on his phone:** whether the chord diagram is legible at arm's length
(`.chordbox { width }` is the dial), the real landscape rotate, and whether Play
ever goes dead again. **And on his guitar (session 35):** `F♯6` and `E♭add9` both
dropped the moving-finger technique for static barres, and `E♭sus4` moved back up
to frets 6–9 — each replaces a voicing reasoned out only a session or two before.

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
