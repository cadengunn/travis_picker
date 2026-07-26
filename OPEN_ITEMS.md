# Open items — Travis Picker

A standing list of everything open, to think over between sessions. Newest input
folded in: the v2.7.5 guitar notes + Elliott's feedback (2026-07-26).

**How to read this:** each item says how big it is, what's already decided, and
what (if anything) needs your call before it can be built. Items are grouped by
size, not priority — the priority call is yours.

Status legend: **OPEN** = not started · **NEEDS A CALL** = blocked on a decision ·
**ON THE PHONE** = built, waiting on your test · **DECIDED** = settled, recorded
so it isn't re-litigated.

---

## On the phone right now (v2.8.1)

- **Icon-only Edit / Save / Load** (pencil, floppy, folder — engraved like the
  gear and die). Frees 53px of header width, which is what now keeps **every**
  readout at the full 14px, worst case included — nothing shrinks any more. Two
  small losses to check: the saved *count* moved off the Load button into its
  long-press label (the button being enabled already says there's something to
  load), and icon-only save/load is less self-evident than words — the Guide
  explains them if needed.

- **Buttons no longer click while the transport is running** (v2.8.2) — which is
  what makes them silent on a silenced phone, since that was the only window where
  they could override the switch. Worth feeling out: with the ringer on, you also
  lose the click during a take. Intended, but you may have an opinion once you've
  drilled with it.

**Confirmed working on the phone: all three v2.8.0 items** — sound through the
silent switch, screen staying awake, and auto-update (v2.8.1 arrived without a
trip to the site first).

## Still on the phone from v2.7.x

All checked and fine for now (2026-07-26): randomiser die placement (reads
slightly like it might randomise everything in Generation, but is obvious after
one press), minor keys and their progressions, barre chords F#/Bb, dom7 feel.
The context readout is no longer an issue at all after v2.8.1.

**Flagged for a later pass:** the **progression list** — fine for now, but you
expect to revisit which progressions are curated once you've had more time with
them. Add/drop/reorder is a one-line data edit each.

---

## Big — design session first

### 1. Capo system — NEEDS A CALL
Separate the chord *shape* you play from the *concert key* it sounds in
(Shape G + capo 2 = sounds A).

**Size:** a moderate session. Pure data plus a derived label, one addend in the
audio, one new control, and a save-context migration. The fiddly part is where
the control goes.

**What I'd recommend (from the last discussion):**
- **Shape-first.** You pick the shape key + capo; concert key is a derived
  readout. Everything already on screen stays literally true, since the grid's
  frets are shape frets. (Sound-first — "I need Bb, what capo?" — is a nice later
  add-on, not the model; it has no unique answer.)
- **Capo transposes the audio.** Otherwise Melody playback lies at any capo.
- **Control on the "Generation" header line** beside the die. The Options sheet is
  at 458px of a 487px budget at 375×553 — a control row is ~64px and does not fit.
  Fallbacks: move the Single/Prog toggle up to free a slot in row 1, or let the
  sheet scroll.
- **Invisible at capo 0.** Concert key lives next to the capo control in the
  sheet ("Capo 2 · sounds in A"); the header gets a small indicator only when the
  capo is on. Keeps the header-fit work from v2.7.5 completely untouched in the
  default case.
- Range 0–11; capo joins the saved item's context (missing = 0, old saves fine);
  the randomiser does **not** roll the capo (being told to move a physical clamp
  every roll is hostile).

**Needs from you:** does shape-first match how you think when you clamp one on?
And are you happy with "invisible at capo 0", or do you want concert key on
screen always, at the cost of header room?

### 2. Chord library expansion + Root × Quality picker — NEEDS A CALL
Elliott: add m7, maj7, ♭5, diminished, augmented — and split the chord menu into
a **root** dropdown and a **quality** dropdown.

**Size:** the biggest thing on the list, and it's really two items.
- *The picker refactor* is worth doing on its own terms — 21 chords is already a
  long menu, and root × quality collapses it into two short ones.
- *The library* is the hard half. Every chord currently hand-declares its bass
  roles and its shape. 12 roots × 7 qualities = 84 hand-written entries: that
  stops being a data edit and becomes a data problem. The way out is deriving
  chords from movable shape templates (CAGED-ish: template + root fret ⇒ shape
  and roles), which is a real architecture change to `data.js`.

**Already answered:** your closed-voicing worry has a clean solution *in the
existing model, with no generator change* — a chord that declares root, alt and
fifth on the same string/fret makes the Travis preset alternate between identical
notes, i.e. exactly the thumb-on-root-only behaviour you proposed. So the jazz
shapes are a data convention, not new code.

**Needs from you — the framing question:** do you want to **drill your right hand
over richer harmony** (maybe a dozen curated additions: m7, maj7, a couple of
dim/aug — small), or do you want a **chord dictionary** (all roots × all
qualities — the templates refactor)? Elliott hedged himself here ("maybe
unnecessary, this is really a right hand exercise"), which is worth weighing.

---

## Medium

### 3. Pre-loaded patterns (G2) — OPEN, design already settled
Ship a set of good starting patterns as **read-only "Built-in" data** in the Load
sheet, with "save a copy" — *not* seeded into localStorage. That way they survive
reinstalls, never pollute your real library, and updates can add more. Fits the
"favourites as a folder within Saved" idea. Probably the best-value smaller item
on the list.

### 4. App icon revamp — DONE (v2.9.0 → v2.9.2, session 15)
Your thumbs-up-with-a-thumbpick, as drawn artwork rather than generated shapes.
Six treatments were compared at the real 32px; the flat-graphic one won on
legibility, not taste. `tools/make_icons.py` frames and resamples
`tools/icon-master.png` and enforces the maskable safe zone by measurement.

Two rounds followed your notes. **v2.9.1** repainted it after you spotted the pick
vanishing — it measured 1.08:1 against the disc behind it. **v2.9.2** rebuilt every
colour from **Jerry's own theme values** (teal pick = `--active-deep`, the same
role as the thumb notes) and made **Jerry the default theme** so the icon and the
app agree. Weakest contrast pair is now 2.16:1.

**Two things to know on the phone:**
- You'll probably need to **delete and re-add** the home-screen app to see the new
  icon — iOS caches the installed one and auto-update doesn't replace it.
- **A saved theme preference still wins over the default.** If your phone already
  has one stored, the default change won't move it — pick Jerry once if so.

**Still available if you want another round:** going **full bleed** (disc colour
edge to edge, no background band) would buy ~20–25% more hand and fix the last
weak pair (disc vs background, 1.34:1) — the hand is only 46% of the tile today.
That one needs regenerated art, not a recolour.

### 5. Swing (G1) — OPEN
Timing feel. The only open item that touches the scheduler rather than data.
Worth pinning down first whether you want a swing *toggle* or a *percentage*.

### 6. JSON export/import of the Saved library — OPEN
Insurance against iOS evicting localStorage after ~7 days of not opening the app.
The home-screen install is the main defence; this is the belt-and-braces one, and
it's the most *defensive* item on the list.

---

## Small — numbers, copy, or a single decision

### 7. Unruly density (E1) — OPEN
You once felt Unruly is occasionally "too much". Everything is numbers in
`CHAOS_PRESETS` (`maxRestrikes` 1 for milder, 3 for spicier). Generation was
signed off on guitar, so this only reopens if the weekend drilling says so.

### 8. Chaos "stops sounding like Travis picking" (Elliott) — NEEDS A CALL
Accurate observation of what Chaos *is*: deliberately off the difficulty curve,
the novelty/discovery setting, per the spec and your session-6 call. Not a bug.
**Only worth reopening if you agree it's more useless than fun** — in which case
the fix is constraints on its column shapes, and it becomes "Unruly+" instead of
"random".

### 9. Chord shape diagram (Elliott) — DEFERRED, with a trigger
You called it redundant given the fret-number labels, and I agree — *today*. It
stops being redundant the moment the chord library grows unfamiliar shapes, and
then it belongs in the **chord picker** (where you're choosing), never near the
grid. So: revisit if and only if item 2 happens.

### 9b. Button sounds in silent mode — DECIDED and shipped (v2.8.2)
**Buttons never sound on a silenced phone.** Since the web can't read the ring
switch, the rule is "no button sound while the transport is running" — playback is
the only window where they could have punched through. Side effect with the ringer
ON: buttons are also quiet during a take, which is arguably a bonus. The metronome
and melody still ignore the switch, so you get the native split: requested audio
plays, incidental feedback doesn't. The Options toggle is unchanged.
Rejected: holding the playback category permanently (nothing respects silent
mode) — that category doesn't mix with other apps, so a stray button tap would
interrupt background music.
**Haptics can't substitute:** iOS Safari has never shipped the Vibration API
(Android has), and the one reported workaround is a narrow iOS 17.4 checkbox trick
that can't reach an arbitrary button. Revisit this and haptics together **only if
this ever becomes a real App Store app** — a much later road.

### 10. Saved-name crowding — OPEN, only if it bites
Three buttons per saved item (Load/Rename/Delete) narrow the name column, so long
names ellipsize early. Fix if it annoys you: icon buttons, or a two-row layout.

### 11. More keys — DEFERRED by your call
All 12 keys, and sharp minor keys (Bm/F#m/C#m — these pull in new barre majors).
"Curate first, expand later."

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
- **Elliott's "it already feels like an app"** — worth noting he still reaches for
  it in Safari rather than the home-screen icon. If that's common for people you
  share it with, an "Add to Home Screen" hint is a cheap thing to add.

---

## Ground rules that constrain any of the above

- **The grid is the hero.** Re-measure 375×553 before shipping any chrome growth.
  The Options sheet has ~29px headroom; a control row is ~64px.
- **Keys/chords/progressions are data in `data.js`** — the generator stays untouched.
- **Any new text that can contain ♭ or ♯ needs a pinned `line-height`** (those
  glyphs fall back off Fraunces to a taller font and grow the line box).
- **Tests stay green and grow with anything new** (`tests.html`).
- **Deploy dance:** bump `CACHE` in `sw.js` + the version label in `index.html`,
  push, then test on the phone. (Should get easier from v2.8.0 onward.)
- **The repo is public** — keep the GitHub noreply identity, never a real
  name/email.
