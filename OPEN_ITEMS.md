# Open items — Travis Picker

A standing list of everything open, to think over between sessions. Rewritten at
the end of session 17 (2026-07-27, v2.11.1) — completed items moved out to
CLAUDE.md, the rest renumbered.

**How to read this:** each item says how big it is, what's already decided, and
what (if anything) needs your call before it can be built. Items are grouped by
size, not priority — the priority call is yours.

Status legend: **OPEN** = not started · **NEEDS A CALL** = blocked on a decision ·
**ON THE PHONE** = built, waiting on your test · **DECIDED** = settled, recorded
so it isn't re-litigated.

---

## On the phone right now (v2.12.0)

Four things off your v2.11.x notes. Nothing here touched the generator.

- **The "Chaos" menu is now "Fingers"**, sitting beside Thumb — the two layers,
  named. Its sections are **Complexity** (Tame / Loose / Unruly) and
  **Experimental** (Wild card, formerly Chaos). Saved patterns are unaffected;
  only the words changed. Worth checking the grouped menu reads clearly at a
  glance mid-practice.
- **Long-pressing a control no longer selects its text.** The save-name field is
  deliberately exempt, so paste still works there.
- **`CAPO 2 → F♯` in the header**, and the "sounds in" readout is gone from the
  Options sheet — its slot is free for later. The arrow rather than the words is
  a fit decision: the words needed 210.6px of the 156.3px the pills leave.
  Two things to sanity-check on the phone: whether the arrow reads as
  "shapes → sounding pitch" without being told, and whether having the *shape*
  key above the grid and the *sounding* key up top is ever confusing.
- **Three Thumb values were clipping, not just "Dead Thumb"** — "Alternating"
  and "Root–Fifth" too. The row's three slots are sized by content now; nothing
  clips in any of the three menus.

**Next up, your order:** swing, then the Guide rewrite (item 6 below — still
needs the specific thing that annoyed you).

---

## Previously on the phone (v2.11.1) — signed off

The empty name row is **settled: no placeholder**. The rest of the typography
pass stands as shipped.

<details>
<summary>v2.11.1 detail, kept for reference</summary>

**The typography pass (v2.11.0 → v2.11.1).**
- **Panel legends are Jost** — the OFL Futura you chose, bundled (26.6KB) rather
  than referencing the system Futura, which is commercial and only free while
  every user is on Apple hardware. The rule now: **serif for what a control
  *says*, Jost for what the machine *calls* it, rounded only for fret digits.**
- **One label tier.** The Options sheet had two that looked nearly identical, with
  the *smaller* type on the caption that outranked the labels beneath it — which
  is why the two pages didn't feel like the same object. "Appearance" is gone.
- **The Guide "?" is the fourth header pill**, and **the name has its own row**
  under the capo, with the full width in every state (it was down to 35px with a
  capo set). At 375×553 the clearance under the grid goes 28px → 11px; on your
  phone the second row is invisible.
- **The two bugs you caught are fixed** — the grid no longer jumps when a name
  appears (the empty row was collapsing to 1px; it now reserves its height from
  the name's own font metrics, and there's a test that fails without the fix),
  and edit mode's dashed outline no longer crosses the progression readout
  (`outline` draws *outside* the box, so its reach was 7px into a readout sitting
  flush with the grid; the outline now reaches 5px and the readout is lifted 4px).
- Riding along: the capo value no longer inherits the label's letter-spacing, the
  sheet's ✕ is drawn rather than rendering in Arial, and the stepper's −/+ join
  the serif like every other typed glyph.

</details>

**Older items still worth an opinion once you've drilled with them:**
- **The Sound lamps are one tap further away** since the sheet became two pages.
  Metronome / Melody are the most mid-practice controls in there. Moving them to
  page 1 is a small change.
- **Buttons don't click while the transport is running** (v2.8.2) — which is what
  keeps them silent on a silenced phone. Side effect with the ringer on: you also
  lose the click during a take.
- **The progression list** — fine so far, but you expect to revisit which
  progressions are curated. Add/drop/reorder is a one-line data edit each.

---

## Big — design session first

### 1. Chord library expansion + Root × Quality picker — NEEDS A CALL
Elliott: add m7, maj7, ♭5, diminished, augmented — and split the chord menu into
a **root** dropdown and a **quality** dropdown.

**Size:** the biggest thing on the list, and it's really two items.
- *The picker refactor* is worth doing on its own terms — 21 chords is already a
  long menu, and root × quality collapses it into two short ones. The Options
  sheet has room for it now that it's two pages, which it didn't before.
- *The library* is the hard half. Every chord hand-declares its bass roles and its
  shape. 12 roots × 7 qualities = 84 hand-written entries: that stops being a data
  edit and becomes a data problem. The way out is deriving chords from movable
  shape templates (CAGED-ish: template + root fret ⇒ shape and roles), which is a
  real architecture change to `data.js`.

**Already answered:** your closed-voicing worry has a clean solution *in the
existing model, with no generator change* — a chord that declares root, alt and
fifth on the same string/fret makes the Travis preset alternate between identical
notes, i.e. exactly the thumb-on-root-only behaviour you proposed. So the jazz
shapes are a data convention, not new code.

**Needs from you — the framing question:** do you want to **drill your right hand
over richer harmony** (a dozen curated additions: m7, maj7, a couple of dim/aug —
small), or do you want a **chord dictionary** (all roots × all qualities — the
templates refactor)? Elliott hedged himself here ("maybe unnecessary, this is
really a right hand exercise"), which is worth weighing.

---

## Medium

### 2. Pre-loaded patterns — OPEN, design already settled
Ship a set of good starting patterns as **read-only "Built-in" data** in the Load
sheet, with "save a copy" — *not* seeded into localStorage. That way they survive
reinstalls, never pollute your real library, and updates can add more. Fits the
"favourites as a folder within Saved" idea, and it inherits the capo context
field for free.

**Probably the best-value item on the list**, and the only big-ish one with no
decision blocking it. The one thing I'd want from you is the *patterns* — either
a handful you've saved and like, or a nod to pick a spread across the tiers.

### 3. Swing — OPEN, next up
Timing feel. The only open item that touches the scheduler rather than data.

**Two of the three forks are already answered by how the code works:**
- **The click needs no decision.** The metronome only sounds on *beat* slots
  (quarters), so swinging the 8ths leaves it a straight quarter pulse — which is
  what you want to practise against anyway.
- **Bar length stays invariant** as long as each beat/offbeat pair still sums to
  two slots. So BPM keeps meaning exactly what it means today, and the count-in
  is untouched. The playhead follows for free, since it reads the audio clock
  rather than the scheduler.

**The one real fork — toggle vs percentage.** My argument is for **neither
exactly: named stops in a segmented control** (Straight / Light / Swing, maybe a
hard fourth), matching the hardware language. Swing is conventionally quoted at a
few points anyway (50% straight, ~58% shuffle, 66.7% triplet), and a continuous
slider is fiddly under a thumb mid-practice. Costs one row on sheet page 1, which
has room. If you want the number visible, the button can carry it.

**Second, smaller call:** does swing save with a pattern? I'd say no — it's a
feel setting like BPM, which we deliberately don't store.

### 4. JSON export/import of the Saved library — OPEN
Insurance against iOS evicting localStorage after ~7 days of not opening the app.
The home-screen install is the main defence; this is the belt-and-braces one, and
it's the most *defensive* item on the list.

### 5. App icon: full bleed — OPEN, needs regenerated art
The icon is done and signed off (v2.9.2, built from Jerry's own theme values).
The remaining option: letting the disc colour run **edge to edge** instead of
sitting as a circle on a background band would buy ~20–25% more hand at the same
safe margin, and retire the last weak contrast pair (disc vs background, 1.57:1).
The hand is only 46% of the tile today. Needs new art, not a recolour.

---

## Small — numbers, copy, or a single decision

### 6. Revisit the Guide — OPEN, needs your framing
Your call, from the v2.10.x notes. It was written in one pass in v2.6.0 and
touched once since. The app has gained the **capo**, the **two-page Options
sheet**, **minor keys / tokens / dom7 chords**, **icon-only pills**, and now a
**"?" that lives in the header** — and the icon-only pills are the one thing in
the app that *needs* explaining, which makes the Guide load-bearing.

**Worth deciding what's wrong with it before rewriting:** is it *stale* (says
things that have moved), *too long* (six headings before the legend), *the wrong
shape* (reference vs a first-run tour), or *was it hard to find* (which the header
"?" may have already fixed)? Those pull in different directions — a first-run tour
is a feature, a rewrite is an afternoon of copy. Bring the specific thing that
annoyed you and it'll be obvious which.

### 7. Unruly density — OPEN, only if the drilling says so
You once felt Unruly is occasionally "too much". Everything is numbers in
`CHAOS_PRESETS` (`maxRestrikes` 1 for milder, 3 for spicier). Generation was
signed off on guitar, so this only reopens if it bothers you again.

### 8. Chaos "stops sounding like Travis picking" (Elliott) — NEEDS A CALL
An accurate observation of what Chaos *is*: deliberately off the difficulty curve,
the novelty/discovery setting, per the spec and your session-6 call. Not a bug.
**Only worth reopening if you agree it's more useless than fun** — in which case
the fix is constraints on its column shapes, and it becomes "Unruly+" instead of
"random".

### 9. Chord shape diagram (Elliott) — DEFERRED, with a trigger
You called it redundant given the fret-number labels, and I agree — *today*. It
stops being redundant the moment the chord library grows unfamiliar shapes, and
then it belongs in the **chord picker** (where you're choosing), never near the
grid. So: revisit if and only if item 1 happens.

### 10. Saved-name crowding — OPEN, only if it bites
Three buttons per saved item (Load / Rename / Delete) narrow the name column, so
long names ellipsize early. Fix if it annoys you: icon buttons, or a two-row
layout. (Note the *header* name is no longer cramped — that was v2.11.0.)

### 11. "Add to Home Screen" hint — OPEN, cheap
Elliott still reaches for it in Safari rather than the installed icon. If that's
common for people you share it with, a dismissible hint is a small piece of work —
and the home-screen install is also what protects saved patterns from iOS's
storage eviction, so it's not purely cosmetic.

### 12. More keys — DEFERRED by your call
All 12 keys, and sharp minor keys (Bm / F♯m / C♯m — these pull in new barre
majors). "Curate first, expand later."

---

## Decided — recorded so we don't re-litigate

- **16ths / syncopation: dropped.** At real Travis tempos the 8-slot grid is all
  you can fit; 16ths would generate patterns nobody drills.
- **Chaos sits off the difficulty curve** (Tame → Loose → Unruly is the curve).
- **PIMA stays lowercase** (classical convention).
- **No Major/Minor toggle** — the selected key's mode filters the progressions.
- **Pattern length is the only length dial**; bars on screen are derived.
- **Shared-cell editing** — editing a repeated bar edits all its repeats; raise
  pattern length to make one bar differ.
- **Note tokens are domes**, not chips (v2.5.2).
- **Menu labels show the concise idea** (`I–IV–V`), not the padded 4-bar literal.
- **Capo is shape-first** — you pick the shape and the capo, the concert key is
  derived. Sound-first ("I need B♭, what capo?") has no unique answer, so it
  would be a lookup helper on top, not a different model.
- **Buttons never sound on a silenced phone** (v2.8.2). The web can't read the
  ring switch, so the rule is "no button sound while the transport is running" —
  playback is the only window where they could punch through. Haptics can't
  substitute: iOS Safari has never shipped the Vibration API. Revisit both only
  if this ever becomes a real App Store app.
- **Bundled OFL faces, not system ones** (v2.11.0). Referencing a commercial
  system face is free only while every user is on Apple hardware, and you want
  this commercialisable.
- **No standalone "cleanup" session** (asked, session 18). The code isn't dirty:
  nine modules, all small, and a scan found only ~9 exports referenced nowhere
  (`romanize`, `romanDegrees`, `roleFor`, `modalOpen`, `SAVED_KEY`,
  `SCHEMA_VERSION`, `getTheme`, `savedThemeId`, plus `resolveMergedBar`, which is
  live but needlessly exported). A cleanup pass with no trigger is churn — it
  re-touches working code and re-opens verified layout. Instead: fold dead-code
  removal into whatever session next touches those files, and do the real
  structural tidy **attached to** the chord-library refactor, which is the change
  that would rewrite `data.js` anyway.
  **What genuinely does need it is the docs** — CLAUDE.md is ~1900 lines and is
  now part architecture, part changelog, and it's the file every session loads
  first, so its bloat costs time on every future session. The cheap standalone
  win is splitting it: architecture and invariants stay, the session-by-session
  history moves to a CHANGELOG. Offered, not yet done.
- **"Chaos" is not a UI word any more** (v2.12.0) — the setting is **Fingers**
  and the off-curve tier is **Wild card**, under an **Experimental** heading that
  future off-curve ideas can join. The internal ids stay `chaos` because saved
  patterns store them.

---

## Ground rules that constrain any of the above

- **The grid is the hero.** Re-measure **375×553** before shipping any chrome
  growth. The Options sheet is no longer the bottleneck (two pages, ~150px spare
  each; a control row is 58px). The **header is tight**: it's two rows / 55px
  since v2.11.0, and the clearance under the grid at 4 bars is down to 11px.
- **Keys / chords / progressions are data in `data.js`** — the generator stays
  untouched.
- **Three type voices, and the rule is *where the words sit***: serif inside a
  control, Jost above it, rounded only for fret digits. Adding a font means
  precaching it and bumping `CACHE`; two tests guard that.
- **Any new text that can contain ♭ or ♯ needs a pinned `line-height`** (those
  glyphs fall back off Fraunces to a taller font and grow the line box).
- **Tests stay green and grow with anything new** (`tests.html`). Layout
  invariants can be tested too — see the name-row check, which renders the real
  stylesheet in an iframe.
- **Deploy dance:** bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push,
  then check on the phone. Since v2.10.4 the precache forces the network, so a
  deploy can no longer install stale bytes.
- **The repo is public** — keep the GitHub noreply identity, never a real
  name/email.
