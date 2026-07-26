# Carry-forward — Travis Picker (after session 14, 2026-07-26)

**The standing open list lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is the session
hand-off only.

## Shipped this session — v2.8.0 → v2.8.2 (`CACHE` v43)
The "behave like a native app" batch, off the user's v2.7.5 guitar notes plus a
friend's (Elliott's) feedback. 59/59 green (+3). Full detail in CLAUDE.md "Where
things stand (session 14)".

- **v2.8.0 — three OS integrations** in one new module, **`js/platform.js`**: SW
  auto-update, iOS audio-session category, screen wake lock. Each is
  feature-detected (silent no-op where unsupported) and takes injected
  `nav`/`doc` — the `storage.js` trick — so the logic is unit-tested with stubs
  while only the physical behaviour needs a phone. **All three confirmed working
  on his phone**, auto-update included (v2.8.1 arrived without a trip to the site
  first — that was its first real test, since the fix ships inside the update).
- **v2.8.1 — Edit/Save/Load are icon-only pills** (pencil/floppy/folder, engraved
  like the gear and die). The group went **199px → 146px**, handing the context
  readout **143px → 196px**, so every readout — the 171px worst case included —
  now sits at the full 14px and `fitContext()` never shrinks anything; it stays as
  insurance. The saved count moved to `title`/`aria-label` (writing `textContent`
  would wipe the `<svg>`).
- **v2.8.2 — the silent-switch rule for button sounds:** no button sound while the
  transport is running. The web can't read the ring switch, and playback is the
  only window where buttons could override it, so this is what makes them silent
  on a silenced phone while the metronome/melody still come through. Verified by
  probe (per-context oscillator counts), not by eye — there's no unit test, since
  it's `app.js` glue that `tests.js` doesn't import.

## Next session — the app icon (his call, and he has a plan)
He wants the **icon revamp** next, in a fresh session, and is bringing **his own
idea plus a reference photo** — so **wait for the reference before proposing
art.** What the next session needs to know:

- **`tools/make_icons.py` is the only path** — this Mac has no PIL/ImageMagick/
  Node, so it hand-encodes PNGs (stdlib `zlib` + `struct`). It renders by
  **point-sampling analytic shapes at 4×4 supersampling** in normalized [0,1]
  coords: today just a list of circles painted in order over a flat background.
  Extending it to rings, ellipses, rotated capsules/blades or gradients is
  straightforward maths in the same loop — no new dependency, just more predicate
  functions. 512×512 at SS=4 is ~4M samples in pure Python: seconds, not minutes.
- **Four outputs, one piece of art:** `apple-touch-icon.png` (180, the iOS
  home-screen icon), `icon-192.png` + `icon-512.png` (manifest, `any maskable`),
  `favicon-32.png`. The art must stay in the **maskable safe zone** (the tool
  keeps everything inside the central 80%) and must still read at **32px**.
- **Deploy notes specific to icons:** the icon files are precached in `sw.js`, so
  a new icon needs a **`CACHE` bump** like any app file. And expect that **iOS
  keeps the old home-screen icon for an already-installed PWA** — he may have to
  delete and re-add the app to see it, which is worth telling him up front rather
  than debugging.
- Tests to keep green: the PWA checks assert the manifest is valid and every
  declared icon resolves. If the mark's colours change, consider whether
  `manifest.webmanifest`'s `theme_color`/`background_color` should follow.

After the icon, the two big unstarted design items remain: **capo** (his answers
to shape-first / "invisible at capo 0" are still outstanding) and the
**chord-library fork** (richer harmony to drill vs a full chord dictionary — the
latter needs a movable-shape-template refactor of `data.js`). Both written up in
`OPEN_ITEMS.md`.

## How this user likes to work
- **Agree the design against his spec BEFORE coding.** Surface genuine forks,
  don't guess; several of the best decisions came from one well-framed question.
- He **tests on a real guitar and a real phone between sessions**, and brings
  written notes — stop at checkpoints and say what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth.
- **Report what was and wasn't verified**, and prefer reproducing/probing a
  behaviour to theorising about it — one wrong theory this session (the audio
  category *does* reach an already-created AudioContext) was caught that way.
- Deploys are public — keep the GitHub noreply identity.
