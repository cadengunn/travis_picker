# Carry-forward — Travis Picker (after session 14, 2026-07-26)

**The standing open list now lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is just the
session hand-off.

## Shipped this session — v2.8.0 (`CACHE` v41), the "behave like a native app" batch
Three OS integrations, all in one new module **`js/platform.js`**, each
feature-detected (silent no-op where unsupported) and each taking injected
`nav`/`doc` — the same trick `storage.js` uses for its store — so the logic is
tested against stubs while only the physical behaviour needs a phone. 59/59 green
(+3). Full detail in CLAUDE.md "Where things stand (session 14)".

- **App auto-update** — fixes the user's "home-screen app doesn't update without
  opening the site in Safari first". Registration now sets `updateViaCache:
  "none"` (the worker script itself was coming from the HTTP cache), calls
  `update()` on load and on every return to foreground, and reloads once when a
  new worker takes control. Guarded: never on first install, never while
  `state.unsavedEdits` or the transport is running.
  **⚠️ Bootstrap caveat: this deploy still needs the manual force-quit** — the fix
  ships inside the update.
- **Silent-switch audio** — `navigator.audioSession.type = "playback"` while the
  transport runs, handed back on stop. Follows the iOS convention: requested media
  ignores the ring switch, incidental UI feedback respects it. Since the category
  is per-document, this is also what keeps the button clicks quiet on a silenced
  phone when you're not playing. **The API is WebKit-only and recent — if his iOS
  doesn't have it, the fallback is the fragile `<audio>`/MediaStream hack and is
  worth discussing before taking on.**
- **Screen wake lock**, held the whole time the app is up (his call — not just
  while playing). Re-acquired on return to foreground; the sentinel is *forgotten*
  on hide rather than trusting its `release` event, so a missing event can't leave
  a dead lock that never re-acquires. No toggle — add one only if battery bites.

## What needs the user's hands
All three of the above are **device-only** — a hidden preview tab can't hold a
wake lock, Chrome has no `audioSession`, and the SW doesn't register on localhost
by design. Verified in-browser: 59/59, clean boot, transport start/stop
unaffected, and the no-op paths exercised (Chrome lacks `audioSession`; the
hidden tab makes the wake-lock request decline without throwing).

Plus everything still pending from v2.7.x — see the "Still on the phone" section
of `OPEN_ITEMS.md`.

## Where the next session probably starts
The two big design items, both of which the user has been given the forks for and
neither of which is started: **capo** (he was mid-discussion; my F1/F4 questions
are still unanswered) and **the chord-library expansion** (new this session, from
Elliott's feedback — the framing question is "richer harmony to drill" vs "a chord
dictionary", the latter needing a movable-shape-template refactor of `data.js`).
`OPEN_ITEMS.md` has both written up.

## How this user likes to work
- **Agree the design against his spec BEFORE coding.** Surface genuine forks,
  don't guess; several of the best decisions came from one well-framed question.
- He **tests on a real guitar between sessions**, and brings written notes —
  stop at checkpoints and say what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth.
- **Report what was and wasn't verified**, and prefer reproducing a bug to
  theorising about it.
- Deploys are public — keep the GitHub noreply identity.
