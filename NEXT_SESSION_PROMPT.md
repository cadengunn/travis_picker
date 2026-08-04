# Next session — open, no single big feature queued

Copy everything below the line into a new session.

---

Travis Picker — new session. **v3.5.2 is live and pushed, 112/112 green.** Read
`CLAUDE.md` first; it's a hub, so follow its pointers rather than reading
everything. Which of the other docs you need depends on what we pick — see the
table at the top of `CLAUDE.md`.

**Nothing is half-built.** Session 36 finished cleanly: Pattern length removed,
×2 mode shipped, swing now saves with the pattern. Three rounds of my phone
review are folded in. So this session starts from a clean slate, and **the first
thing I owe you is what I found playing v3.5.2** — ask, don't guess, before
proposing work.

## What I'm testing between sessions (v3.5.2)

`OPEN_ITEMS.md`'s top section has the full list. The short version:

- **The ×2 pass lamps blinking in time.** They were dead in v3.5.0 *and* v3.5.1
  (a re-typed selector matched nothing) and only my report caught it — the dev
  box can't see rAF at all. My eye on the live blink is the real confirmation.
- **Whether ×2 at tempo does musically what I wanted.** That's the premise of
  the whole feature and only playing to it answers.
- **Two permanent losses I agreed to**, and whether they bite in practice:
  single mode is now always a 1-bar grid, and no bar of a progression can be
  hand-edited to differ from another (every bar is the same distinct pattern —
  editing one edits all, with no dial left to change it).

## The candidates, if I have no notes

Roughly best-value first. **Ask which I want; don't start one on your own read.**

- **Pre-loaded patterns** (`OPEN_ITEMS.md` item 2) — still the best-value item
  on the list and the only big-ish one with no decision blocking it. Design is
  settled: read-only "Built-in" data in the Load sheet, "save a copy," never
  seeded into localStorage. What it needs from me is **the patterns** — either
  a handful I've saved and like, or a nod for you to propose a spread across
  the tiers. It inherits the 120-chord library, the capo field and ×2 for free.
- **`CHORD_REFERENCE.md` is STALE and says so in a banner.** A hand-written
  cross-check sheet from v3.0.0/v3.2.1; ~25 of the 120 chords were revoiced in
  session 35. **The fix is to split the hand-written commentary from the tables
  and generate the tables from `data.js`** so it can't rot again — the prose is
  worth keeping, which is why it wasn't just deleted. Cheap, and worth doing
  before the next voicing pass.
- **JSON export/import of the Saved library** (item 4) — the most defensive
  item on the list, insurance against iOS evicting localStorage. Gains value
  the moment there are patterns in there I'd miss.
- **Small stuff, only if it bites:** saved-name crowding (item 10), an "Add to
  Home Screen" hint (item 11), the full-bleed app icon (item 5, needs new art).

## Still unverified on the guitar, from session 35

Carried forward — none of it was re-checked in session 36, which was all
right-hand and UI work:

- `F♯6` and `E♭add9` both dropped the moving-finger technique for static
  barres, and `E♭sus4` moved back up to frets 6–9. Each replaced a voicing
  reasoned out only a session or two earlier.
- The **m7 family's Travis bass is now root ↔ octave** (E, E, B, E) after the
  Em7 revoicing — my call, consistent with the E-shape major, but it's the same
  class of thing I caught by ear on F♯6.

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess. In
  session 36 that caught four real ones before a line was written (single-mode
  behaviour, legacy saves, swing's load fallback, lamp colour).
- **Tests stay green**; add one for any new invariant. Run `tests.html` in the
  browser and say the count. It's **112/112** now.
- **Any chrome change needs the 375×553 re-measure** — 55.09 / 384.84 / 11.06,
  clearance against `main.bottom`.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push**, and
  I check on the phone. GitHub noreply identity only.
- Note the dev-box limits in `CLAUDE.md`. Two earned the hard way in session 36
  and are worth re-reading before you trust a green check:
  - **`rAF` is frozen in the preview tab**, so the playhead, the beat lamp and
    the ×2 pass lamps can only be confirmed on my phone. Say so plainly rather
    than implying you saw them run.
  - **A test that asserts markup SHAPE is not a test of BEHAVIOUR.** The pass
    lamps shipped twice completely dead while a test counting elements and
    reading their attributes passed the whole time. If a feature works by
    querying, selecting or matching something, the test has to run that query.
