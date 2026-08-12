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

**Nothing is on the phone. Nothing is waiting on code.** Session 45 shipped
item 17 (save custom progressions) plus three rounds of polish, and in the
same pass he signed off **everything** that had been outstanding: item 17,
item 14 (the Fraunces numeral face + the PIMA fix), item 16 (Nylon / Steel
and its sustain fix), v3.10.2's eleven rewritten Travis bass patterns, and
the SVG play/stop icons. All verified good, all closed.

**Item 18 (App Store) is the only thing left in this file.**

---

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

## Closed — the ledger for items 1–17

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
| 14 | Fret-numeral / PIMA face | **DONE** (v3.12.0), signed off session 45. His question killed a 39KB third font before it shipped — Fraunces at `opsz` 9 / `SOFT` 100 does the job, so the app is on two type voices and zero new bytes |
| 16 | Guitar sound too twangy | **DONE** (v3.11.0–.1), signed off session 45. Nylon / Steel toggle; steel stays the default. The cause was one missing `brightness` key, and round 2 added `sustainTilt` so tone and length stop fighting |
| 17 | Save custom progressions | **DONE** (v3.13.0–.2), signed off session 45. Stored as Nashville tokens so one saved idea plays in any key of its mode; three-state Save/Delete key on the die's row; entries labelled by their own numerals under a `Custom` header |
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
