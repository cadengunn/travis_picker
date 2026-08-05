# Next session — Load screen UI improvements

Copy everything below the line into a new session.

---

Travis Picker — new session. **v3.9.0 is live and pushed, 126/126 green.**
Read `CLAUDE.md` first; it's a hub, so follow its pointers rather than
reading everything.

**Nothing is half-built, and everything from the last three sessions is
confirmed working on his phone** — including the folder system, the
Built-in patterns, and the Restore button, all tested together in one pass.
This session has no queued work of its own: **he has a handful of UI
comments about the Load screen ready to give you** — ask for them directly
rather than guessing, and don't propose fixes before you've heard the actual
list. Given the file, don't re-derive its layout from scratch first — the
summary below is what's there right now.

## What the Load screen looks like right now

Shipped across sessions 40–42, all in `js/app.js` unless noted:

- **Title line** (`#saved-sheet`'s `.sheet-head`): "Load", then three
  one-shot text buttons — **Export**, **Import**, **Restore** — then the ✕
  close. Restore disables itself once nothing built-in is missing.
- **The list** (`renderSavedList()`) groups by folder: one header per real
  folder in use (alphabetical), a trailing "Unfiled" group for anything
  without one. Headers wear `.dd-group`'s engraved-legend look (same as a
  drum's `<optgroup>`); a real folder's header has Rename/Delete, revealed on
  tap, not always visible.
- **Every item** (`appendSavedRow()`) is Load / Rename / Delete on its main
  row, then its own row underneath for a folder-assign `<select>`
  (`.folder-select`, `dropdown.js`-enhanced) — Unfiled, every folder in use,
  then "+ New Folder…".
- **Built-in patterns** (`builtin-patterns.js`, his five: Beginner 1,
  Beginner 2, Fine Enough, Clawin', Stumped) seed once into the real library
  on boot, filed into a folder literally named "Built-in" — from then on
  they're ordinary items, no special-case rendering left at all. An invisible
  `builtinId` tag survives rename/move and is what Restore uses to tell
  "edited" from "actually deleted."

Full detail, including the seed-vs-restore split and why it's two separate
questions, is in `CLAUDE.md`'s "Saved library" section.

## Still unverified on the guitar, from session 35

Carried forward again — nothing since has touched left-hand voicings:

- `F♯6` and `E♭add9` both dropped the moving-finger technique for static
  barres, and `E♭sus4` moved back up to frets 6–9. Each replaced a voicing
  reasoned out only a session or two earlier.
- The **m7 family's Travis bass is now root ↔ octave** (E, E, B, E) after the
  Em7 revoicing — his call, consistent with the E-shape major, but it's the
  same class of thing he caught by ear on F♯6.

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess.
  Session 42 is the freshest example: the first pre-loaded-patterns design
  (read-only + "save a copy") shipped, and only his actual use of it surfaced
  that it cost two library entries for one thing — worth asking "how does
  this feel once you're using it," not just "does this match the spec,"
  before calling something done.
- **Tests stay green**; add one for any new invariant. Run `tests.html` in
  the browser and say the count. It's **126/126** now.
- **Any chrome change to the MAIN app view needs the 375×553 re-measure** —
  55.09 / 384.84 / 11.06, clearance against `main.bottom`. The Load/Options
  sheets are body-level overlays and exempt from that specific budget, but
  still deserve a screenshot sanity check for overflow/wrapping — the Load
  sheet in particular now has real width pressure (Load/Rename/Delete plus a
  folder-select row per item), worth checking again if this session touches
  its layout.
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
