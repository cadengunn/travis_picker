Travis Picker — new session. **v3.10.1 is live and pushed, 133/133 green.**
Read `CLAUDE.md` first; it's a hub, so follow its pointers rather than
reading everything.

**Nothing is queued, nothing is half-built.** Session 43 closed out
everything that had been carried as "on the phone" or "in progress":
sessions 40–42's work (folders, Built-in patterns, Restore) got its first
real phone test, all confirmed; a six-item Load-screen redesign followed,
off his direct UI comments; and three same-session follow-up tweaks landed
after he tried it. His words: "All working well," then "This is looking
fantastic. Let's wrap this one up." Full detail is in `CHANGELOG.md`'s
session 43 entry if you want the specifics — you shouldn't need to re-derive
any of it from the code first.

**This prompt is deliberately open-ended** — he didn't have a specific next
thing in mind when this session closed. Don't assume the next item is
pre-loaded patterns, the Load screen, or anything else from recent history;
ask what he wants to work on, or wait for him to raise it, rather than
proposing a direction. If he has nothing in particular, `OPEN_ITEMS.md` has
the standing list (grouped by size, not priority) for ideas — but that's a
last resort, not a default.

## Still unverified on the guitar, from session 35

Carried forward again — nothing since has touched left-hand voicings:

- `F♯6` and `E♭add9` both dropped the moving-finger technique for static
  barres, and `E♭sus4` moved back up to frets 6–9. Each replaces a voicing
  reasoned out only a session or two earlier.
- The **m7 family's Travis bass is now root ↔ octave** (E, E, B, E) after the
  Em7 revoicing — his call, consistent with the E-shape major, but it's the
  same class of thing he caught by ear on F♯6.

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess.
  Session 43 is a fresh example: the Load-screen redesign shipped, he tried
  it, and three of the six items came back with follow-up tweaks — "how does
  this feel once you're using it" surfaces things "does this match the
  request" doesn't.
- **Tests stay green**; add one for any new invariant. Run `tests.html` in
  the browser and say the count. It's **133/133** now.
- **Any chrome change to the MAIN app view needs the 375×553 re-measure** —
  55.09 / 384.84 / 11.06, clearance against `main.bottom`. The Load/Options
  sheets are body-level overlays and exempt from that specific budget, but
  still deserve a screenshot sanity check for overflow/wrapping.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push**,
  and he checks on the phone. GitHub noreply identity only.
- Note the dev-box limits in `CLAUDE.md`. Worth re-reading before trusting a
  green check or a screenshot:
  - **`rAF` is frozen in the preview tab**, so the playhead, the beat lamp
    and the ×2 pass lamps can only be confirmed on a real device. Say so
    plainly rather than implying you saw them run.
  - **A test that asserts markup SHAPE is not a test of BEHAVIOUR.** The pass
    lamps shipped twice completely dead while a test counting elements and
    reading their attributes passed the whole time. If a feature works by
    querying, selecting or matching something, the test has to run that
    query.
  - **Synthetic `computer`-tool clicks didn't register on some header-style
    buttons in this preview tab** (session 39) — confirmed by checking
    `element.hidden`/state via JS after the click, not by trusting a
    screenshot. A JS-dispatched `.click()` on the same element worked
    immediately. If a button seems dead in the preview, try that before
    assuming the code is broken.
  - **A `computer{coordinate}` click is in SCREENSHOT-pixel space, not
    viewport pixel space, and it goes stale the moment the page changes**
    (session 42) — a click landed nowhere because the coordinates were read
    off a screenshot taken before a reload. Prefer `read_page` + a `ref`-
    based click, or re-screenshot immediately before trusting raw
    coordinates.
