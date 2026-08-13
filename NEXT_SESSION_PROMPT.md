Travis Picker — new session. **v3.14.0 is live and pushed, 154/154 green.**
Read `CLAUDE.md` first; it's a hub, so follow its pointers rather than reading
everything. `OPEN_ITEMS.md` is 191 lines now and is the fastest way to see
what's open.

## The state of things: unusually clean

**Nothing is waiting on code, and nothing is waiting on his phone.** Session 45
shipped item 17 and three rounds of polish, and in the same pass he signed off
*everything* that had been outstanding across three sessions — items 14, 16 and
17, the eleven rewritten Travis bass patterns, and the SVG play/stop icons.
All verified good, all moved to the closed ledger.

**Item 18 (App Store) is the only open item.** Don't assume that's the work for
this session — ask. He may well arrive with guitar notes instead, and that's
where this project's best decisions have come from.

## If it IS item 18

**His own instinct is that it starts as a checklist doc, not code, and that's
right** — it's the one item that isn't a code task first. `OPEN_ITEMS.md` has
the shape of it. Two decisions are worth settling early because they're
expensive to reverse and cost nothing to make now:

- **Does the free PWA stay live on GitHub Pages alongside a paid build?** It
  currently undercuts the paid version.
- **Does the identity stay the GitHub noreply persona?** An App Store listing
  requires a real legal identity, which reverses a standing privacy rule in
  `CLAUDE.md`. **Do not act on this unilaterally in either direction.**

Also folded into 18 (session 44): the full-bleed app icon (needs new art, not a
recolour) and the "Add to Home Screen" hint.

## What session 45 established, so it isn't re-derived

- **`chordForRoman()` is the pure inverse of `romanInKey()`, and the round trip
  is total** — 840 chord × key pairs, 0 mismatches, measured. That's what makes
  a saved progression storable as numerals and playable in any key of its mode.
- **`progressionChords()` has a numeral fallback AND an explicit mode guard**,
  and both are load-bearing. Read the comment before touching it; the failure
  mode is a saved progression that silently plays the wrong chords.
- **The panel and the Options field are still one object — but the FIELD now
  leads.** It fills its row and the panel takes the trigger's width (v3.13.2,
  inverting v2.14.3). Both wheels split 48/148. Three tests pin this.
- **The die's weights are DATA** (`QUALITIES[].weight` × `ROOTS[].weight`).
  Tune by ear there, never in the roll. Every weight is > 0 on purpose.
- **Two stale numbers were found in CSS comments this session** (the die row's
  "327px of track" is really 343). Measure; don't trust a comment's arithmetic.

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess. The
  clearest win of session 45: he asked for the Save button below the header
  pills, which measures at ≥32px against 11.06px of clearance — and my own
  fallback was wrong too, because Options row 1's "empty" slot is 28.3px
  deliberately donated to Format. Both were caught by measuring, not reasoning.
- **Measure, don't theorise.** Every significant claim this session was checked
  against the live DOM or a rendered buffer, and several plausible-sounding ones
  were wrong.
- **A new test must be verified to FAIL without its fix.** Fourteen were, this
  session, across five break rounds. A test that passes vacuously is worse than
  none — see the pass lamps, which shipped dead twice.
- **When a change contradicts a documented decision, say so and keep the old
  rationale.** Three were reversed in session 45 (the flat die, the field/panel
  coupling, `setKey`'s transpose), and in each case the original reason was
  still half right and worth recording.
- **Tests stay green**; run `tests.html` in the browser and say the count.
  It's **154/154**.
- **Any chrome change to the MAIN app view needs the 375×553 re-measure** —
  55.09 / 384.84 / 11.06, clearance against `main.bottom`, `main` overflow 0.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push.**
  GitHub noreply identity only; the repo is public. He force-quits and reopens.
- **Don't push without asking** — he'll say when.

## Dev-box limits that bite

All in `CLAUDE.md`, but the two that cost time in session 45:

- **`tests.html` stalls in a hidden tab.** It makes no progress until something
  forces frames; nudge it with real `computer` screenshots/clicks. A run that
  "hangs" here is the tab, not the code.
- **A screenshot mid-run resizes the pane, which closes any open `.dd-panel`
  and fails the wheel checks.** Screenshot *between* runs, not during one. A
  wheel failure right after a screenshot is almost always that.
- The preview server can't read `~/Desktop`, so it serves an rsync mirror in the
  session scratchpad wired up in `.claude/launch.json` (untracked). **Re-sync
  after every edit**, or you're testing the previous copy.
