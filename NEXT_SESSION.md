# Carry-forward — Travis Picker (after session 18, 2026-07-27)

**The standing open list lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is the session
hand-off only.

## Shipped this session — v2.12.0 → v2.13.1 (`CACHE` v58)

70/70 green (+5). Tree clean, nothing half-finished. Four items off his v2.11.x
phone notes, then swing — trialled, then built to a spec he wrote. Full detail in CLAUDE.md "Where things stand
(session 18)".

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
6. **v2.12.1** — "Wild Card" capitalised, which cost 2.7px and forced the same
   row to rebalance again (133/108/86 → 133/111/83).
7. **v2.13.0 — swing, both resolutions, for a guitar trial.** One pure function
   (`slotSeconds`) covers both: `unit: 2` (the &s move, thumb steady — the
   classic shuffle) and `unit: 4` (beats 2 and 4 move, the thumb itself swings).
8. **v2.13.1 — the verdict, and the control it earned.** He kept **both** and
   wrote the spec himself: one SWING heading over amount + resolution, five named
   detents on a snapping slider, `&s` / `2 & 4` labels, resolution hidden at
   Straight, per-resolution memory with no conversion between them. `&s` at Hard
   is his keeper ("classic Jerry Reed at a high tempo"); `2 & 4` stays because he
   keeps hearing it in tunes he plays. **Fence it, don't hide it.**

## Worth carrying forward

1. **When he describes something unusual, work out whether he means it — and
   show him, don't tell him.** His swing description ("2 moves further from 1 and
   closer to 3") was precise and *not* standard swing: it swings the beats, which
   in Travis picking means the thumb stops being a metronome. Writing the eight
   slot positions out as a diagram for both readings is what let him decide, and
   his answer was "trial both". Which was affordable only because they're one
   parameter apart in one pure function — **check whether a fork is actually
   expensive before making him choose.**
2. **I had to correct myself mid-thread and it mattered.** I'd told him the
   metronome click needed no decision because it only sounds on beat slots. True
   of the 8ths feel; under the beats feel the click sits on beats 2 and 4 and
   shuffles with them. Say it plainly and move on — but do say it, because he'd
   have heard it on the guitar and wondered.
3. **He improves the option you hand him — three times this session.** I proposed
   "Complexity" as the setting name; he came back with **"Fingers"**, which is
   better because it pairs with Thumb and names the *layer* rather than the axis.
   Then "Experimental" as the group, explicitly so future off-curve generation
   ideas have somewhere to live. And when the swing verdict came back it came as
   a written spec that was better than anything I'd have proposed — one heading
   instead of two, named detents instead of a free slider, `&s`/`2 & 4` instead
   of "Beats". Offer the menu, don't defend it.
4. **Check whether the fix moved the constraint.** Renaming Chaos → "Wild Card"
   made it the *longest* Fingers value (70.1px vs "Unruly" 66), so the column
   split I'd sized minutes earlier clipped it by 1px. Caught by re-measuring
   after the rename, not before. Same class of thing: he reported one truncated
   Thumb value and there were three.
5. **Don't write a comment you haven't measured.** I wrote that an unpinned
   `.capo-tag` "grew this row and pushed the grid down". It doesn't — the tag's
   own box does grow 13 → 14.5px with a sharp, but the pills are taller and set
   the row height, so nothing propagates. The pin is right; the justification had
   to be corrected to say it's insurance. Measure, then write the comment.
7. **Two bug classes worth remembering, both caught only because they were
   tested for.** (a) `audioPrefs` is seeded with defaults, so
   `audioPrefs.x ?? fallback` can never detect "the user has no setting" — the
   swing migration silently dropped his trial value until `loadAudioPrefs()`
   returned the raw stored blob. Any future pref migration hits this. (b) A
   readout **wrapped to two lines** inside a fixed-height well, and
   `scrollWidth <= clientWidth` reported it as fitting, because a wrapped box
   does fit. **Only the screenshot caught it.** Take one.
6. **Width is a first-class constraint in that header now.** The capo tag's worst
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

## Next session

**The Guide rewrite** is next, and it now carries an owed line: the `2 & 4` swing
sits outside Travis technique (Chet's thumb doesn't move) — name the shuffle /
laid-back-backbeat character, and **don't invoke cumbia or "in 2"**. It's still
blocked on him saying *what* bothers him about it: stale / too long /
wrong shape / hard to find pull in different directions.
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
