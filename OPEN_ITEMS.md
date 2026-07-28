# Open items — Travis Picker

A standing list of everything open, to think over between sessions. Rewritten at
the end of session 17 (2026-07-27, v2.11.1) — completed items moved out, the rest
renumbered. **`NEXT_SESSION.md` was folded in here in session 19**; the docs are
now three: `CLAUDE.md` (architecture + invariants), `CHANGELOG.md` (the
session-by-session history), and this file (what's next).

**How to read this:** each item says how big it is, what's already decided, and
what (if anything) needs your call before it can be built. Items are grouped by
size, not priority — the priority call is yours.

Status legend: **OPEN** = not started · **NEEDS A CALL** = blocked on a decision ·
**ON THE PHONE** = built, waiting on your test · **DECIDED** = settled, recorded
so it isn't re-litigated.

---

## On the phone right now (v2.13.4) — HELP MODE

**The Guide is gone; the `?` is a mode now.** Tap it and it latches in like the
Edit pencil, and from then on tapping anything on screen tells you what it does
instead of doing it. The gear still opens Options, its page tabs still switch and
the ✕ still closes — everything else, Play and the die included, explains itself.
Tap `?` again to leave.

**What to poke at on the phone:**
- **Does it read as a mode?** The `?` presses in and lights, and a card opens
  anchored to it saying what's happening. That card is also where the version
  number lives now.
- **The cards are anchored to what you tapped** and flip above it near the bottom
  of the screen. Worth checking they never land somewhere silly under a thumb —
  that's the one thing the dev box can't judge.
- **Tap the greyed-out Load pill.** It works: a disabled button normally emits no
  click at all, which would have made it a dead tap for exactly the person most
  likely to be reading help (an empty library is the first-run state).
- **The transport is deliberately left alone** — arm help mid-take and it keeps
  playing, and Play explains itself rather than stopping. Two taps to actually
  stop. Say if that's wrong in practice.
- **Nothing you tap can change anything.** Verified across every control, both
  Options pages, and a real slider drag.

**Costs nothing in layout** — the card is an overlay, so at 375×553 with 4 bars
the geometry is identical armed or not (clearance still 11.06px, no overflow).

**Known open questions on it, none blocking:**
- **Card placement under a thumb** — the only thing the dev box genuinely can't
  judge. Cards anchor below what you tapped and flip above near the bottom edge.
- **Wording and length.** Every entry is 2–3 sentences by rule, since it's a card
  floating over a 375px screen. All of it is one map (`HELP` in `data.js`), so
  any rewrite is a data edit — cheap, and no code moves.
- **Coverage.** 29 things are annotated. If something you tapped said nothing,
  that's a missing `data-help` + entry, also a data edit.
- **Whether the die and Play should be exempt** like the gear is. Currently they
  explain themselves, which is the rule as you specified it.

**Next session is dedicated to adjusting this interface**, so bring whatever the
drilling turns up.

---

## Session 19, part 1 — the docs

**No app file changed in this part.**
CLAUDE.md was **1,982 lines and half changelog**; it's now **867 lines of
architecture and invariants**, with the session-by-session history moved to a new
**`CHANGELOG.md`** (newest first, with markers where a later session overturned
an entry). `NEXT_SESSION.md` is gone — its durable lessons merged into CLAUDE.md's
"Working with this user", the rest into this file.

The split wasn't a straight cut: a set of still-load-bearing facts lived **only**
in session notes and would have stopped being loaded each session. Those were
promoted into CLAUDE.md — `ui-sound.js` / `modal.js` / `dropdown.js` (missing
from the file map entirely, along with `sw.js`, the manifest, `icons/` and
`tools/`), both deploy footguns, the dev-box limits, the lamp-colour convention,
the design-language statement, and `platform.js`'s four integrations. Six stale
numbers were corrected against the code, and **the height-budget table was
re-measured live** rather than carried forward: at 375×553 with 4 bars the grid
is 384.8px, chrome 168.2px, and **11.1px of clearance under the grid** — no
overflow. 69/69 green at that point (72/72 after help mode).

---

## Previously on the phone (v2.13.3)

Four things off your v2.11.x notes. Nothing here touched the generator.

- **The "Chaos" menu is now "Fingers"**, sitting beside Thumb — the two layers,
  named. Its sections are **Complexity** (Tame / Loose / Unruly) and
  **Experimental** (Wild Card, formerly Chaos). Saved patterns are unaffected;
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
- **Swing** (v2.13.2) — one smooth 50–75% slider on the Setup page, swinging the
  **&s** only. 67% is set. See item 3.
- **Labels** (v2.13.3) — the sheet's first page is **Setup** (was "Generation")
  and its chord-mode legend is **Format** (was "Chords").

**Swing is done and settled** (v2.13.2) — see item 3. Nothing outstanding on it.

**Two things only the phone can answer**, from the capo tag: whether the arrow
reads as "shapes → sounding pitch" without being told, and whether having the
*shape* key above the grid (`I–V–vi–IV · E`) and the *sounding* key up top
(`CAPO 2 → F♯`) is ever confusing. The arrow is the whole thing carrying that
distinction.

*(The Guide rewrite that was "next up" here is done — it became help mode,
v2.13.4. See the top of this file and item 6.)*

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

### 3. Swing — DONE (v2.13.2)
One **SWING** slider on the Generation page, 50–75%, smooth like the Tempo one.
Straight is the off switch. It swings the **&s** — the beats never move, so your
thumb stays metronomic. 67% is your setting.

**Cut along the way, recorded so it isn't re-proposed:** the `2 & 4` resolution
(swings the thumb; a real feel, but not Travis picking — your call), and the five
named detents (Straight/Light/Medium/Hard/Triplet — you preferred the smooth
slider). Both are in git history if the argument ever changes. Also not doing:
bidirectional swing (sub-50 pre-delay), and any generator change.

**Nothing owed on it** — the Guide line about the `2 & 4` feel is moot now that
the feel is gone.

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

### 6. Revisit the Guide — DONE (v2.13.4), as help mode

Your call, and a better answer than the rewrite this item was expecting: instead
of a block of instruction-manual text, the `?` arms a mode in which tapping
anything explains it. See the top of this file for what to test.

The reason it beats a rewrite: the Guide's problem was never length, it was
*distance*. The pills are icon-only and the ABS/MIX chips are cryptic on purpose,
and a manual is the worst possible place to explain a glyph, because it's the one
place you can't compare the glyph to the thing. It also gave the old Guide's
indicator legend a home — inert things like the caution chip, the capo tag and
the readout are tappable in help mode, and they had nowhere else to live.

**Copy is data now** (`HELP` in `data.js`), which is the direct fix for how the
Guide went stale: it was prose buried in a DOM-building function, and was still
calling the Fingers menu "Chaos" three versions after you renamed it. A test
checks every control has copy and every entry is reachable, so that can't recur.

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
  **What genuinely did need it was the docs** — **done, session 19.** CLAUDE.md
  went 1,982 → 867 lines; the history is in `CHANGELOG.md`. The code cleanup
  itself is still deferred to whatever session next touches those files.
- **"Chaos" is not a UI word any more** (v2.12.0) — the setting is **Fingers**
  and the off-curve tier is **Wild Card**, under an **Experimental** heading that
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
