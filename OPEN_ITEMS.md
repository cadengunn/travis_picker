# Open items — Travis Picker

**This file is what's OPEN.** History lives in `CHANGELOG.md`, which indexes
every version from v2.4.2 to now with a session-by-session write-up.

Rewritten in **session 44**: this file had grown to 1,493 lines, ~71% of it
spent "previously on the phone" sections whose questions had all been
answered and signed off — a second changelog, duplicating the real one. His
call to cut it. Nothing was lost: every deleted section covered a version
`CHANGELOG.md` already documents in more detail, and git history has the
exact text if it's ever wanted.

The docs are four:

| file | read it when |
|---|---|
| `CLAUDE.md` | the hub — architecture + the invariants that constrain any work |
| `DESIGN.md` | you're changing how it looks or feels |
| `CHANGELOG.md` | you want the history, or whether an idea was already tried |
| this file | you want what's actually open |

Status legend: **OPEN** = not started · **NEEDS A CALL** = blocked on a
decision · **ON THE PHONE** = built, waiting on his test · **ANSWERED** =
investigated, no work needed unless he wants a change.

**On the phone now (v3.12.1):** the numeral voice moved to Fraunces and the
PIMA optical fix (item 14), the Nylon / Steel tone toggle and its high-note
sustain fix (item 16), v3.10.2's eleven rewritten Travis bass patterns, and
the transport's play/stop icons redrawn as SVG at the gear's 22px (his
observation that the stop square looked small — it was, by half, and had
been for months). The bass and tone work is audible-only; the type and the
transport icons are the ones to judge with your eyes, at arm's length.

---

## The order (his call, session 44)

**16 → 14 → 17 → 18.** Items 16 and 14 are both shipped and on his phone;
**17 (save custom progressions) is next**, and it needs a design call from
him before any code — see the two shapes below. The App Store becomes a
checklist doc whenever he wants it; nothing about the current app has to
change to keep that option open.

---

## Item 16 — the guitar sound is too twangy **ON THE PHONE (v3.11.1)**

**Round 2.** The toggle stays, per your call. Your sustain note was right,
and it was worse than it sounded: nylon's high notes were bleeding badly.

**Measured** — mean audible level half a second in, as a fraction of steel
at the same pitch (24 renders per point, since the pluck is random):

```
         G3    B3    E4    A4    C5    E5
before  0.44  0.40  0.30  0.26  0.18  0.11
after   0.72  0.79  0.96  0.98  1.26  1.56
```

**The deficit grew with pitch**, which is the tell. It's structural, not a
tuning slip: the filter that darkens the tone has a fixed cutoff, so a low
note passes under it while a high note's own fundamental sits in its path
and gets eaten on every pass. The darker the voice, the worse it gets —
which is why steel never showed it.

**My original error was treating "less bright" and "less sustain" as the
same thing.** I'd shortened nylon's decay on the theory that nylon rings
less. A real nylon treble sustains fine; what it lacks is high harmonics.
There's a new knob (`sustainTilt`) that keeps those two independent, so the
brightness setting you liked is untouched.

**What to judge, since the dev box has no ear:**
- **Do the high notes hold up now?** They measure at 0.96–1.56x steel where
  they were 0.11–0.30x. If it's still short up top, the tilt goes higher.
- **Is it now too much?** C5/E5 ring slightly *longer* than steel. If that
  reads unnatural, the same dial comes back down.
- **Is nylon actually better, or just different?** Still the real question.
  If it wins outright we can drop steel and the toggle — but you've said
  keep the toggle, so that's parked unless you change your mind.
- **Does it hold up under a full three-finger rake at tempo**, not just on
  single notes — that's where the brightness was doing some work.
- **The bass is untouched** in both tones (the tilt is a no-op down there by
  design). If the nylon *treble* now sits oddly against it, that's next.

<details>
<summary>The original item 16 write-up, kept for the record</summary>


His words: twangy, "almost harpsichord like in some cases." That points at
something specific and fixable. Karplus-Strong with a high `decay` and
near-1 `brightness` is exactly the plucked-metal end of the algorithm, and
**the treble voice is the bright one**: `TREBLE_VOICE = { decay: 0.996,
seconds: 0.8, gain: 0.24 }` — no `brightness` key at all, so it runs
canonical, i.e. brightest. The bass voice already got the palm-mute
treatment (`brightness: 0.37`) and isn't what he's hearing.

- **A nylon-ish voice needs no new engine.** Nylon's signature is a duller
  attack and faster harmonic decay, both of which are knobs `synth.js`
  already has: lower the treble `brightness` (the same in-loop one-pole
  low-pass the bass mute uses), soften the excitation, shorten `decay`.
- **The fork is toggle vs. retune.** A toggle costs a Preferences lamp, a
  `tp-audio` key, and a second cache line (the buffer cache is already keyed
  per voice, so that part is cheap). A retune costs no UI at all — and per
  his own standing rule that this is a practical workhorse, a better single
  sound may beat a choice.
- **Recommended: build both cheaply and let him play them.** This is the
  swing-resolution situation exactly — a few numbers in one pure module,
  where a guitar trial settles in one pass what a conversation won't.
- **The dev box cannot judge this at all.** Tone is his ear, on a phone.

</details>

## Item 14 — the fret-numeral / PIMA face **DONE (v3.12.0), on the phone**

**Your question closed this better than my plan did.** I was about to spend
39KB bundling Nunito as a third face; you asked whether we'd considered the
two we already ship. We had not, and one of them does the job.

**The stated reason a third voice existed turned out to be wrong.**
`DESIGN.md` justified it as "serif hairlines and tracked caps both go mushy
at 11px in a 30px circle" — reasoned, never measured. Rendered side by side
in the real dome at the real size, Fraunces holds up completely. Two things
had been missed: it's a *variable* font, so `opsz` 9 is a genuine small-size
cut with thicker hairlines and opener counters, and its **`SOFT` axis rounds
the terminals** — which is the rounded quality the third voice existed for
in the first place.

**So the fret digits, ruler, BPM and chord-box digit are Fraunces now.**
Zero new bytes, no third license, and the app is down to two type voices.
It also closed the real gap: the old stack was a *system* one, free only
while every user is on Apple hardware — off it, `system-ui` isn't rounded at
all and the design intent silently vanished. That's the same trap that made
the legend bundled Jost instead of system Futura; the numeral voice had just
never been held to it. A test now asserts every voice leads with a bundled
face.

**PIMA got its optical fix too.** A dome centres the line box, not the ink,
so `p`'s descender dragged it low and `i`'s dot rode high — measured at
0.23em of drift across p/i/m/a versus 0.01em across the digits, which reads
as the letters hopping when you scan a column. p/m/a are nudged; digits and
`i` needed nothing.

**What to check on the phone:**
- **Do the digits read as well as before at arm's length?** This is the
  one thing the dev box can't settle. Fraunces has more stroke contrast than
  the old rounded face — if it costs you legibility on the grid, Jost is the
  fallback (monoline, also already bundled, also zero bytes).
- **Do the PIMA letters sit level now** when you scan down a column?
- **The ruler and BPM readout changed face too** — they're the same voice.

Budget re-measured and untouched: 55.09 / 384.84 / 11.06, no overflow.

## Item 17 — save custom progressions **OPEN, medium; needs a design call**

Already half-built by accident: progression mode can hand-edit any bar's
chord, `detectProgression()` reads the result back and falls to Custom, and
a saved pattern already stores a full `context` (key, progression, capo, ×2,
swing, bpm). So a custom progression is *already* durable — but welded to
one pattern, not reusable across patterns, which is the ask.

- **His bloat worry is the right one**, and it's specifically a Load-sheet
  worry: a second library of a different kind of object needs somewhere to
  live, and that sheet was redesigned twice in session 43.
- **The cheap shape to consider first:** `PROGRESSIONS` is plain data read
  through `progressionGroups()`, and the wheel's progression reel is built
  from it with `Custom` riding the end. A saved custom progression could be a
  user entry in that same list (its own `style` group, so the drum's existing
  engraved section headers do the work) — a `storage.js` store plus a data
  merge, **with no new surface in the Load sheet at all**.
- **The expensive version** is the one with its own manage/rename/delete UI.
  That's the one that risks the bloat he's flagging.

**Needs his call before any code:** which of those two shapes.

## Item 18 — App Store **OPEN, large; its own project**

His read that this is "its own whole new project in a way" is right, and
it's the one item that isn't a code task first. **Items 5 (app icon full
bleed) and 11 (Add to Home Screen hint) were folded in here in session 44,
his call** — both fit the store process better than they fit standalone
work. Detail on each kept below so it isn't lost:

- **The app icon, full bleed** (was item 5): the icon is done and signed off
  (v2.9.2, built from Jerry's own theme values). The remaining option is
  letting the disc colour run edge to edge instead of sitting as a circle on
  a background band — worth ~20–25% more hand at the same safe margin, and
  it retires the last weak contrast pair (disc vs background, 1.57:1). The
  hand is only 46% of the tile today. **Needs new art, not a recolour.**
- **"Add to Home Screen" hint** (was item 11): Elliott still reaches for it
  in Safari rather than the installed icon. Not purely cosmetic — the
  home-screen install is also what protects saved patterns from iOS storage
  eviction, which makes it doubly relevant next to a paid app.

The shape of the work itself, stated so the discussion has something to push
against — no action taken:

- **This is a no-build vanilla-ES-modules PWA.** Shipping means a native
  wrapper (realistically Capacitor or a hand-rolled `WKWebView` shell), an
  Apple Developer account, and App Review. **Apple rejects thin web wrappers
  under rule 4.2** ("minimum functionality"); the usual answer is that it
  must work fully offline and use real native capability. Offline is already
  true — the service worker precaches everything, and there's a test.
- **His model — free demo, one-time unlock, no subscription, no ads — is a
  Non-Consumable In-App Purchase.** Simplest StoreKit product type, but it
  still means StoreKit integration, a restore-purchases path (Apple
  *requires* one), entitlement checking, and a sandbox test pass.
- **The feature gating has to be designed, not just coded.** Which features
  are free vs. paid touches almost every surface, and this app's own rules
  (the 11px height budget, "no dead chrome") mean a locked control can't
  just be greyed in place without thought.
- **Two things to decide early because they're expensive later:** whether the
  free PWA stays live on GitHub Pages alongside a paid build (it currently
  undercuts the paid version), and whether the identity stays the GitHub
  noreply persona — an App Store listing requires a real legal identity,
  which reverses a standing privacy rule in `CLAUDE.md`.
- **Recommended first step:** a checklist doc of its own (his instinct), not
  code.

---

## Closed — the ledger for items 1–15

Kept as one-liners so the numbering stays legible and nothing settled gets
re-opened. Detail for every one of these is in `CHANGELOG.md`.

| # | item | outcome |
|---|---|---|
| 1 | Chord library + picker | **DONE.** The wheel (v2.14.0) + all 10 qualities, 120 chords. Its last open thread — the G♯sus2 stretch — closed in v3.2.1: all six wide sus2/add9 barres kept, his call |
| 2 | Pre-loaded patterns | **DONE** (v3.9.0, redesigned from v3.8.0; confirmed on his phone session 43) |
| 3 | Swing | **DONE** (v2.13.2) — smooth 50–75% slider, swings the &s only, 67% is his setting |
| 4 | JSON export/import | **DONE** (v3.6.0), plus per-item export in v3.10.0 |
| 4b | Saved-library folders | **DONE** (v3.8.0) |
| 5 | App icon: full bleed | **FOLDED INTO ITEM 18** (session 44, his call) |
| 6 | Revisit the Guide | **DONE** (v2.13.4) — became help mode, not a rewrite |
| 7 | Unruly density | **CLOSED** (v2.14.4, his call: keep) |
| 8 | Chaos "stops sounding like Travis" | **CLOSED** (v2.14.4, his call: keep — an accurate description, not a bug) |
| 9 | Chord shape diagram | **DONE** (v3.2.0) — under the wheel's drums |
| 10 | Saved-name crowding | **RESOLVED** by session 43's Load-screen redesign, which removed the Load button and moved Rename/Export/Delete behind a "..." — the name now has the full row |
| 11 | "Add to Home Screen" hint | **FOLDED INTO ITEM 18** (session 44, his call) |
| 12 | More keys (all 12 + sharp minors) | **CLOSED** (session 44, his call): "I'm fine with the selection we have now. These are pretty much the typical keys you would call for guitar music." Note if ever revisited: item 12 and a Key×mode drum are one job or neither |
| 13 | Drums elsewhere / page tabs / dropdowns | **CLOSED.** Tabs done (v2.14.5), drums answered by his cross-product rule, materials matched (v2.14.6/.8). The last sub-question — dropdowns as wells or buttons — closed session 44, his call: "dropdowns feel good as is" |
| 15 | Is MIX real? | **ANSWERED** (session 44), no work needed. It's functional, not a holdover, but only hand-editing can produce it: `patternType()` in `generator.js` returns only `relative`/`absolute`, while `deriveType()` in `editor.js` returns `mixed` when drawn bass notes are partly role-matched and partly absolute. Doing exactly the job the spec asked for |

---

## Decided — recorded so we don't re-litigate

- **16ths / syncopation: dropped.** At real Travis tempos the 8-slot grid is all
  you can fit; 16ths would generate patterns nobody drills.
- **Chaos sits off the difficulty curve** (Tame → Loose → Unruly is the curve).
- **PIMA stays lowercase** (classical convention).
- **No Major/Minor toggle** — the selected key's mode filters the progressions.
- **Pattern length is GONE (session 36, superseded)** — his real-guitar testing
  found the picking pattern repeats every bar even in complex material, so
  `generatePattern` now always makes exactly one distinct bar. ×2 mode replaced it.
- **Shared-cell editing is now PERMANENT** — every bar is the same one distinct
  pattern, so editing any bar edits all of them and there is no dial left to
  make one differ. A deliberate tradeoff of removing Pattern length, not a bug.
- **Note tokens are domes**, not chips (v2.5.2).
- **Menu labels show the concise idea** (`I–IV–V`), not the padded 4-bar literal.
- **Capo is shape-first** — you pick the shape and the capo, the concert key is
  derived. Sound-first ("I need B♭, what capo?") has no unique answer, so it
  would be a lookup helper on top, not a different model.
- **Buttons never sound on a silenced phone** (v2.8.2). The web can't read the
  ring switch, so the rule is "no button sound while the transport is running" —
  playback is the only window where they could punch through. Haptics can't
  substitute: iOS Safari has never shipped the Vibration API. **Revisit both only
  if this ever becomes a real App Store app** — i.e. item 18.
- **Bundled OFL faces, not system ones** (v2.11.0). Referencing a commercial
  system face is free only while every user is on Apple hardware, and he wants
  this commercialisable. (Note item 14: `--numeral` is the one that never got
  this treatment.)
- **No standalone "cleanup" session** (asked, session 18). The code isn't dirty.
  A cleanup pass with no trigger is churn — it re-touches working code and
  re-opens verified layout. **The code cleanup rode along in session 32, and the
  original dead-list was half wrong:** only `romanize`, `romanDegrees` and
  `modalOpen` were genuinely unreferenced (deleted). The other six are live
  internally and merely exported unnecessarily — left alone by his call, since
  dropping an `export` keyword is churn on working code for no gain.
- **BPM persists across launches** (session 32, his call) — which **reverses** the
  earlier rule that tempo is too volatile to remember. It lives in `tp-prefs`
  with the rest of the set-once-and-keep controls.
- **The chord picker is two cylinders, not a grid** (v2.14.0, his call) — a
  barrel that rolls under the thumb reads as part of the instrument; a grid of
  cells reads as a menu. Both chord pickers use it, so they can't diverge.
- **One spelling per pitch, app-wide** (v2.14.0) — flats for E♭/B♭, sharps for
  C♯/F♯/G♯, from one table the wheel, the chord names and the capo tag all read.
- **The die rolls the whole library** (v2.14.0). A picker that offers every chord
  with equal ceremony should have a die that does the same.
- **"Chaos" is not a UI word any more** (v2.12.0) — the setting is **Fingers**
  and the off-curve tier is **Wild Card**, under an **Experimental** heading that
  future off-curve ideas can join. Internal ids stay `chaos` because saved
  patterns store them.
- **Travis bass roles follow the root's ordinary convention** (session 44, his
  call: "picking pattern consistency takes precedence"). The "walk to a
  reachable colour tone" idea — swapping `alt`/`fifth` off the A-shape
  (5/4/6) or E-shape (6/4/5) default to reach a 3rd, 9th or 2nd — is gone
  from every chord that had it. Where a colour tone isn't reachable on a bass
  string at all, repeating the root or 5th is accepted (F♯6 plays F♯, C♯, C♯,
  C♯) and is a different, already-signed-off trade.

---

## Ground rules that constrain any of the above

- **The grid is the hero.** Re-measure **375×553** before shipping any chrome
  growth. The Options sheet is no longer the bottleneck (two pages, ~150px spare
  each; a control row is 58px). The **header is tight**: two rows / 55px since
  v2.11.0, and the clearance under the grid at 4 bars is down to 11px.
- **Keys / chords / progressions are data in `data.js`** — the generator stays
  untouched.
- **TWO type voices, and the rule is *where the words sit***: serif inside a
  control, Jost above it. Fret digits are the serif too since session 44d
  (Fraunces cut small via `opsz`/`SOFT`), so there is no third face. Adding a
  font means precaching it and bumping `CACHE`; two tests guard that, and one
  now also asserts no voice falls back to a system face.
- **Any new text that can contain ♭ or ♯ needs a pinned `line-height`** (those
  glyphs fall back off Fraunces to a taller font and grow the line box).
- **Tests stay green and grow with anything new** (`tests.html`). Layout
  invariants can be tested too — see the name-row check, which renders the real
  stylesheet in an iframe.
- **Deploy dance:** bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push,
  then check on the phone. Since v2.10.4 the precache forces the network, so a
  deploy can no longer install stale bytes.
- **The repo is public** — keep the GitHub noreply identity, never a real
  name/email. (Item 18 is where this rule finally gets tested.)
