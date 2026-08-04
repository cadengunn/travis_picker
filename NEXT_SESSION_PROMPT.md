# Next session — pre-loaded patterns, and maybe folders

Copy everything below the line into a new session.

---

Travis Picker — new session. **v3.6.1 is live and pushed, 118/118 green.** Read
`CLAUDE.md` first; it's a hub, so follow its pointers rather than reading
everything.

**Nothing is half-built, and nothing is waiting on a phone verdict.**
Sessions 37–39 all shipped and were confirmed the same day they went out:
`CHORD_REFERENCE.md`'s tables are generated now, not hand-typed; JSON
export/import of the Saved library works end to end on his phone; Export/
Import moved onto the Load sheet's title line and a hand-edited pattern shows
"Custom" instead of a stale preset name. **This session has two concrete
pieces of work queued** rather than a blank slate — see below.

## What's queued this session

**1. Pre-loaded patterns** (`OPEN_ITEMS.md` item 2) — design already settled:
read-only "Built-in" data in the Load sheet, "save a copy," never seeded into
localStorage. **He's bringing the patterns himself** — an exported JSON file
(via the export button, item 4) plus which named items in it to use as the
starter set. Read the file he attaches, don't ask him to re-describe the
patterns.

**2. Folders** (`OPEN_ITEMS.md` item 4b) — "maybe," his word, so **confirm he
still wants it this session before starting**, and confirm scope: alone, or
paired with item 1. The design is already sized and agreed, not up for
re-litigation unless something about it doesn't survive contact with real
code:
- A `folder` string field per saved item (`null`/absent = unfiled) — no
  separate folder table, Finder-tag style.
- Load list grouped with a header row per folder, reusing the app's existing
  engraved-section-header idiom (the same mechanism the progression/quality
  drum menus already use).
- A per-item `<select>`, enhanced by the existing `dropdown.js`, to
  assign/move/create a folder.
- Folder rename/delete lives on the group header (delete un-files, never
  deletes a pattern).

**If both ship together, they integrate directly**: Built-in patterns (item 1)
render as their own read-only, folder-shaped group at the top of the same
grouped Load list folders (item 4b) introduces — not stored via the `folder`
field, since they're not really "his," but visually unified with real folders
rather than a separate UI. This was the whole reason folders was deferred to
pair with this item instead of shipping standalone.

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
  Session 39 caught a real one this way: whether "similar to the options
  toggle" meant promoting Export/Import to the always-visible header (real
  cost: the capo tag's ~5px margin, the 11px height budget) or restyling them
  where they already lived (no cost) — asking rather than assuming avoided
  building the expensive wrong guess.
- **Tests stay green**; add one for any new invariant. Run `tests.html` in the
  browser and say the count. It's **118/118** now.
- **Any chrome change to the MAIN app view needs the 375×553 re-measure** —
  55.09 / 384.84 / 11.06, clearance against `main.bottom`. The Load/Options
  sheets are body-level overlays and exempt from that specific budget, but
  still deserve a screenshot sanity check for overflow/wrapping.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push**,
  and he checks on the phone. GitHub noreply identity only.
- Note the dev-box limits in `CLAUDE.md`. Three earned the hard way across
  sessions 36–39, worth re-reading before trusting a green check:
  - **`rAF` is frozen in the preview tab**, so the playhead, the beat lamp and
    the ×2 pass lamps can only be confirmed on a real device. Say so plainly
    rather than implying you saw them run.
  - **A test that asserts markup SHAPE is not a test of BEHAVIOUR.** The pass
    lamps shipped twice completely dead while a test counting elements and
    reading their attributes passed the whole time. If a feature works by
    querying, selecting or matching something, the test has to run that query.
  - **Synthetic `computer`-tool clicks didn't register on some header-style
    buttons in this preview tab** (session 39) — confirmed by checking
    `element.hidden`/state via JS after the click, not by trusting a
    screenshot. A JS-dispatched `.click()` on the same element worked
    immediately and is what all of that session's verification was built on.
    If a button seems dead in the preview, try that before assuming the code
    is broken.
