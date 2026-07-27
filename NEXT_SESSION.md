# Carry-forward — Travis Picker (after session 16, 2026-07-26)

**The standing open list lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is the session
hand-off only.

## Shipped this session — v2.9.3 → v2.10.1 (`CACHE` v49)

62/62 green. Tree clean, everything deployed, nothing half-finished. Full detail
in CLAUDE.md "Where things stand (session 16)".

### v2.9.3 — locking the phone no longer leaves audio running in bursts
His report, from the phone. **The cause was two of our own features meeting:**
the transport holds the iOS **`playback` audio category** (v2.8.0's silent-switch
fix), which is exactly what keeps our sound alive in the background — while the
**`setTimeout` driving the lookahead scheduler is frozen** by that same
backgrounding. The audio clock keeps running, `nextSlotTime` falls behind, and
the next timer tick schedules every missed slot at a time already in the past.
Web Audio plays those immediately, so the backlog comes out as one burst.

- `createPlaybackGuard()` in `platform.js` (a fourth integration, same injected-
  `doc`/`win` shape as the others): stop on `visibilitychange` → hidden, and on
  `pagehide`. **The web can't tell a screen lock from an app switch**, so both end
  the take — right anyway, since neither leaves you looking at the grid.
- `hasDrifted()`/`MAX_DRIFT` in `metronome.js`: past 0.25s behind, drop the missed
  slots and resync rather than replay them. The backstop for a freeze nothing
  tells us about.
- `stopTransport()` in `app.js` is now the single stop path, so the guard hands
  the audio category back exactly as the Play button does.

### v2.10.0 — the Options sheet became two pages, and the capo lives in that room
**The two-page split was HIS idea**, offered in place of the three capo
placements I'd put to him, and it's better than all of them: it dissolves the
constraint instead of working around it. One page measured **460px of a 486.6px
cap** at 375×553 — room for *zero* new control rows. Generation / Preferences now
measure **311px and 329px**.

The capo is **shape-first**, **−2 to 5** (negative = a down-tuned guitar, reading
"half-step down" / "whole step down"), a **hardware stepper**, and **invisible at
capo 0** — all his calls. The grid never changes and the generator never sees it.

### v2.10.1 — seven fixes off his phone test of v2.10.0
Every one a real defect, not a preference. Full list in CLAUDE.md; the three
worth remembering:
- **The sheet jumped between pages** (311 vs 329px). Both pages now share one CSS
  grid cell with the inactive one hidden by `visibility`, so the panel is always
  the taller page's height — no magic numbers, still true if the content changes.
- **Rapid capo taps triggered iOS double-tap zoom** even though the buttons had
  `touch-action: manipulation`. The hole was the CONTAINER: at an end-stop the
  button under your finger goes `disabled` and the tap falls through to the well
  behind it. `.stepper` and `.segmented` joined the rule.
- **The die now sits in the chord row and nothing else** (his suggestion) —
  position is the only thing that communicates its scope. The Single/Prog toggle
  moved up to join the capo in a "context" row to make that possible.

**The deploy dance changed:** the version is `APP_VERSION` in `js/app.js` now,
not a span in `index.html`. It moved to the foot of the Guide to free the room
that put the tabs on the sheet's title line.

### Five things worth carrying forward
1. **Measure the constraint before proposing a workaround.** Three sessions of
   decisions had been distorted by the sheet's ~27px of headroom — the version tag
   exiled into the header, the die on a caption line, and every capo placement I
   offered. He asked the better question, which was why the sheet held everything
   at once.
2. **Shape-first is what makes a capo cheap.** The grid's frets are shape frets,
   so nothing on screen changes: a label plus one addend in `midiOf`. If a future
   feature wants sound-first, it's a lookup helper on top, not a different model.
3. **Judge audio changes by recovering the pitches, not by trusting the code.**
   Karplus-Strong output is periodic at its fundamental, so period detection on
   the rendered buffers proved capo 3 = capo 0 + 3 semitones exactly. A first
   attempt compared cached buffer identity and was inconclusive — a +2 shift can
   land on a pitch that was already sounding.
4. **`visibility: hidden`, not the `hidden` attribute**, whenever an element
   shares a flex/grid track with something that would otherwise take its space.
   It fixed both the tabs resizing between pages and the sheet jumping — the
   jumping-control complaint showing up twice in one session.
5. **Zero-layout-cost hosts are the way to add on-screen state, but check what
   they cost their NEIGHBOURS.** The capo tag beside the context cost the grid
   nothing and still had to move: "whole step down" left the readout 63px and
   truncated the numerals. The name row had the width to spare.

### Tell him, if it comes up
- **The Sound lamps are one tap further away now.** Metronome/Melody are the most
  mid-practice controls in the sheet; that's the real cost of the split and the
  thing to feel out. Moving them back to page 1 is a small change.
- v2.9.3's fix means **switching apps also stops playback**, not just locking.

## Next session — his call

From `OPEN_ITEMS.md`, in the order I'd argue for:

- **Pre-loaded patterns** — now the best-value item on the list, design already
  settled (read-only "Built-in" data in the Load sheet with "save a copy", never
  seeded into localStorage). It also inherits the capo field for free, which is
  why capo went first.
- **Chord-library fork** — still blocked on the framing question: richer harmony
  to drill (a dozen curated additions) vs a chord dictionary (all roots ×
  qualities, which needs a movable-shape-template refactor of `data.js`). The
  Options sheet now has room for a root × quality picker, which it didn't before.
- **Icon full bleed** — needs regenerated art, not a recolour.
- Smaller: swing, JSON export/import, Unruly density.

## How this user likes to work
- **Agree the design BEFORE coding.** Surface genuine forks, don't guess. This
  session that produced four decisions in two questions — and one better idea
  from him than anything on the menu.
- **He will improve your options.** When he answers a multiple choice with a
  fifth option, take it seriously; the two-page split was exactly that.
- He **tests on a real guitar and a real phone between sessions** and brings
  written notes — stop at checkpoints and say what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel,
  and now the capo stepper).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth. The header is still tight; the Options sheet no longer is.
- **Report what was and wasn't verified**, and prefer measuring to theorising.
- Deploys are public — keep the GitHub noreply identity.
