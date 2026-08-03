# Next session — adversarial review / clean house

Copy everything below the line into a new session.

---

Travis Picker — new session. **v3.2.6 is live and pushed**, and the chord
library work from sessions 29–33 is done (all 120 chords, the progression
revamp, the chord-shape diagram, the four hard-chord reworks). Read `CLAUDE.md`
and `OPEN_ITEMS.md` first.

**This session is different in kind from the recent ones: an adversarial code
review, not a feature session.** He wants critical scrutiny of what's
accumulated, not a confirmation pass — go in looking for what should change,
not for reasons it's fine. Three explicit foci, all his framing:

## 1. Trim the docs — `CLAUDE.md` specifically

It's **1,570 lines**, up from the 867 it was cut to in session 19. `CLAUDE.md`
is the one doc auto-loaded every session (`CHANGELOG.md` and `OPEN_ITEMS.md`
are read on demand), so it's the actual lever for token usage — trimming those
two matters much less.

The session-19 split worked once: move session-specific narrative and
blow-by-blow reasoning into `CHANGELOG.md` (which already exists for exactly
this), and keep `CLAUDE.md` to durable architecture and invariants — the
things that have to stay true, not the story of how they got that way. A
"(session N)" pointer into `CHANGELOG.md` is enough where the reasoning
matters but doesn't need to be reloaded every time.

Candidates likely bloating it: the wheel/Options-sheet sections have dense
session-by-session prose (v2.14.2 through v2.14.8 blow-by-blow); the chord
qualities and progression sections grew heavily in sessions 29–33 and may
restate what's now also in `CHANGELOG.md` and `CHORD_REFERENCE.md`. Read it
fresh and decide what's actually load-bearing versus what's history wearing
architecture's clothes.

## 2. Are 105 tests too many?

Current count and the heaviest ones, so you don't have to re-derive it:

```
105 checks total (check + acheck)
144 lines — wheel: key × progression drives two selects, and re-cuts on a mode change
 89 lines — layout: the page tabs don't read as the Format control
 76 lines — wheel: two reels write one chord id, and the panel stays open
 72 lines — help: arming intercepts input; disarming gives every control back
 68 lines — layout: the chord field is cut to the wheel it opens
 67 lines — layout: the Format control spells "Progression" on one line
 62 lines — wheel: a pick that rebuilds the select keeps the panel working
 62 lines — layout: the die's row is the same geometry in both chord modes
```

The layout/wheel tests are the heaviest AND the slowest (real-DOM iframe
rendering, the async checks CLAUDE.md already warns take 1–2 min in the
throttled preview tab). Worth asking, per test: does this still guard
something that could silently break, or is it pinning a decision that's long
since settled and stable (v2.14.0's wheel was signed off as "good as is, don't
revisit" back in that session)? A stale invariant test and dead code are the
same problem — coverage that costs more to carry than it protects. Don't cut
blind, though: several of these tests exist because a real regression bugged
him first (the retarget-on-rebuild bug, the tab-flash bug, the pointerdown vs
pointerup wiring) — check what each one actually guards before touching it.

## 3. Chord/progression code — refactor or leave it?

Sessions 29–33 touched `data.js` (now 950 lines) and `app.js` (1,562 lines)
heavily, plus added `chordbox.js` fresh this session. A quick dead-export scan
found nothing new — the six symbols flagged unused-outside-file back in
session 32 (`roleFor`, `SAVED_KEY`, `SCHEMA_VERSION`, `getTheme`,
`savedThemeId`, `resolveMergedBar`) are still the whole list, and he already
said to leave those alone. So this isn't really a dead-code hunt — it's a
structural one: does `data.js`'s hand-declared-chord section (now `Csus4`,
`Cm6`, `C♯m6`, `F♯6` all overriding "whichever barres lower" for different,
individually-commented reasons) want a clearer shared shape, or is inline
per-chord commentary still the right call given each override has a genuinely
different story? Does `chordbox.js`'s model/render split hold up now that it's
had a few real bugs run through it (the barre-vs-dot-on-barre fix, the
open-string-past-fret-5 anchor fix)? Look with real skepticism, not just at
whether it currently works.

## Ground rules (unchanged)

- **Agree the design before any big restructuring** — this is exactly the kind
  of session where "cleaner" can quietly become "different," and he wants to
  see the plan, not just the diff.
- Tests must stay green throughout, and **don't let "fewer tests" become "less
  coverage" by accident** — if you cut a test, say what invariant it was
  protecting and whether anything now protects it.
- Any chrome change still needs the 375×553 re-measure (55.09 / 384.84 / 11.06
  is the number to protect).
- Dev box limits are unchanged (rsync mirror, no `~/Desktop` access, stale
  screenshots on a hidden tab — see `CLAUDE.md`'s "Running it" section).
- Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push, he
  checks on the phone. Repo is public — GitHub noreply identity only.
- This is a review/cleanup session, not new features — if you find yourself
  wanting to add or change behavior (not just structure), stop and ask first.

## Also outstanding (not this session unless he says so)

- **Pre-loaded patterns** (`OPEN_ITEMS.md` item 2) — still the best-value big
  feature item, blocked on him picking the patterns.
- Whether the key drum should keep its MAJOR/MINOR headers.
