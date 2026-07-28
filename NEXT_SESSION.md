# Carry-forward — Travis Picker (after session 18, 2026-07-27)

**The standing open list lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is the session
hand-off only.

## Shipped this session — v2.12.0 (`CACHE` v55)

66/66 green (+1). Tree clean, nothing half-finished. Four items off his v2.11.x
phone notes; **the generator and the musical model were not touched**. Full
detail in CLAUDE.md "Where things stand (session 18)".

1. **The empty name row is signed off** — closed, no placeholder.
2. **"Chaos" left the UI.** The setting is **Fingers** (beside Thumb — the two
   layers, named) and the outlier tier is **Wild Card**, in a grouped menu:
   **Complexity** (Tame/Loose/Unruly) · **Experimental** (Wild Card). Internal
   ids unchanged — saved patterns store them.
3. **Long-press no longer selects control text** — `user-select: none` +
   `touch-callout: none`, with `input` deliberately excluded so the save-name
   field still pastes.
4. **The "sounds in" readout moved from the Options sheet into the header tag**,
   which now reads `CAPO 2 → F♯`.
5. **Three clipped Thumb values fixed** by sizing that row's slots to content.

## Four things worth carrying forward

1. **He improves the option you hand him — twice this session.** I proposed
   "Complexity" as the setting name; he came back with **"Fingers"**, which is
   better because it pairs with Thumb and names the *layer* rather than the axis.
   Then "Experimental" as the group, explicitly so future off-curve generation
   ideas have somewhere to live. Offer the menu, don't defend it.
2. **Check whether the fix moved the constraint.** Renaming Chaos → "Wild Card"
   made it the *longest* Fingers value (70.1px vs "Unruly" 66), so the column
   split I'd sized minutes earlier clipped it by 1px. Caught by re-measuring
   after the rename, not before. Same class of thing: he reported one truncated
   Thumb value and there were three.
3. **Don't write a comment you haven't measured.** I wrote that an unpinned
   `.capo-tag` "grew this row and pushed the grid down". It doesn't — the tag's
   own box does grow 13 → 14.5px with a sharp, but the pills are taller and set
   the row height, so nothing propagates. The pin is right; the justification had
   to be corrected to say it's insurance. Measure, then write the comment.
4. **Width is a first-class constraint in that header now.** The capo tag's worst
   reachable string (`WHOLE STEP DOWN → F♯m`, single mode on G♯m at capo −2) is
   151.2px of the 156.3px the four pills leave. It's shrink-and-ellipsize rather
   than fixed so a longer future string degrades instead of shoving the pills off
   the row — but anything that widens the pills or the wording needs re-measuring.

## Tell him, if it comes up

- **Two things on v2.12.0 are only judgeable on the phone:** whether the arrow
  reads as "shapes → sounding pitch" unprompted, and whether long-press feels
  right now that controls don't select. The dev box can confirm the computed
  property but not the gesture.
- **A possible confusion to watch for:** with a capo set there are now two key
  names on screen meaning different things — the *shape* key above the grid
  (`I–V–vi–IV · E`) and the *sounding* key up top (`CAPO 2 → F♯`). The arrow is
  what's carrying that distinction.
- The **dev-box caveat is unchanged**: rAF is paused in the hidden preview tab,
  which freezes the playhead and the beat lamp, and `document.fonts.ready` can
  hang there — force layout with `offsetHeight` instead of awaiting frames.

## Next session — he has already chosen

**Swing first, then the Guide rewrite.**

- **Swing** — two of its three forks are answered by the code and recorded in
  `OPEN_ITEMS.md` item 3: the click only sounds on beat slots (so the metronome
  stays a straight quarter pulse for free), and bar length is invariant if each
  beat/offbeat pair sums to two slots (so BPM keeps its meaning and the count-in
  is untouched). The open call is **toggle vs percentage vs named stops** — my
  argument is named stops in a segmented control — plus whether swing saves with
  a pattern (I'd say no, it's a feel setting like BPM).
- **The Guide rewrite** — still blocked on him saying *what* bothers him about
  it. Stale / too long / wrong shape / hard to find pull in different directions.
- He also asked when to do a **code-cleanup session**; the answer is recorded in
  `OPEN_ITEMS.md` under Decided — not on its own, because the code is clean and
  the *docs* are what need it. The offered cheap win is splitting CLAUDE.md into
  architecture + a CHANGELOG.

## How this user likes to work

- **Agree the design BEFORE coding.** Surface genuine forks, don't guess. He says
  so explicitly and he means it.
- **He will improve your options** — see carry-forward 1.
- **He asks the question you should have asked** ("is Futura actually free?").
- He **tests on a real guitar and a real phone between sessions** and brings
  written notes — stop at checkpoints and say what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel,
  the capo stepper).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth.
- **Report what was and wasn't verified**, and prefer measuring to theorising.
- Deploys are public — keep the GitHub noreply identity.
