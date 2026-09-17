Travis Picker — new session. **v3.21.0 is live and pushed, 175/175 green.**
Read `CLAUDE.md` first; it's a hub, so follow its pointers rather than reading
everything.

## He is arriving with NEW TESTING NOTES

He said so closing session 47. Work them. Group them, surface the genuine forks
before coding, and expect that some of the reports will not be caused by the
thing they appear to be about — three of six were not, last session.

## Three things are already queued, and they are the pre-promote gate

These are HIS list, from session 47, deliberately left until last. None of them
need his phone, so they can be worked whenever there's room:

1. **Help-copy pass** — review `HELP` in `data.js` against `HELP_COPY.md`. Some
   may be outdated or too wordy (his words).
2. **Scoped cleanup pass** — stale comments and dead code. **Scope it tightly.**
   `OPEN_ITEMS.md` records "no cleanup for its own sake"; his ask is the trigger,
   but the status note says the pre-ship pass worth doing is **robustness, not
   tidiness**. Fold in the flaky `sustainTilt` check (below).
3. **Security review before he promotes the URL.** Public repo, PWA, localStorage.
   This is the one with real consequences — do it properly, not as a skim.

## Open, with a specific next step each

- **Play goes dead after help mode.** Narrowed, not solved. It shows the **STOP
  SQUARE**, so `start()` returned true and the transport thinks it's running —
  NOT the session-32 interrupted-context family. The next observation that splits
  it: **does the playhead keep moving?** Lighting cells = scheduler fine, audio
  output dead. Frozen = the scheduler or its rAF loop died with `running` true.
- **UI sound during a take** — shipped (reverses v2.8.2) but he hasn't been able
  to test whether it actually feels right in practice. Ask.
- **`sustainTilt` is intermittently flaky** — failed once at 0.00560 vs 0.00593,
  passed on re-run. Offline-render measurement, load-sensitive.
- **Item 18, monetization** — still the only thing in `OPEN_ITEMS.md`. The paywall
  is built and signed off; what's unbuilt is how money changes hands. His
  constraint: payment must be instant and automatic. Leaning PWA + license keys.

## ⚠️ Read this before touching the Save sheet or anything viewport-shaped

Session 47 spent FOUR ROUNDS on one keyboard bug and shipped three wrong fixes.
The long note at the scroll guard in `app.js` has the detail. The short version:

- **`scrollY` mirrors `visualViewport.offsetTop` on iOS.** They moved in lockstep
  on every measured event. What looked like a document scroll was a **visual-
  viewport pan**, which is a user-agent behaviour **no CSS prevents** —
  `overflow: hidden` included, since a UA scroll-into-view overrides it.
- Two fixes that removed the document overflow (an `--app-h` clamp, and a
  `position: fixed` body verified to leave `scrollHeight === clientHeight`)
  changed the measurement by **exactly nothing** and were backed out. The
  overflow is real — `100dvh` isn't keyboard-aware — but it is inert.
- **The remaining one-frame flash is ACCEPTED, his call.** Don't re-fix it.
  Pre-empting it (remember the keyboard height, clamp at `pointerdown`) was
  costed and deferred.
- **iOS fires the scroll BEFORE the viewport resize**, so anything reactive
  arrives a frame late by construction.

## Dev-box limits — these have now cost two sessions, so read them

- ⚠️ **THE DEV BOX IS CHROMIUM; HIS PHONE IS WEBKIT.** No soft keyboard, no
  safe-area insets, no visual-viewport panning, `vh == dvh == svh == lvh`. **If a
  bug only reproduces on his phone, INSTRUMENT IT EARLY.** Session 46 learned
  this; session 47 relearned it the same way — the readout that settled the
  keyboard bug in one round should have been the first move, not the fourth.
- ⚠️ **Programmatic `.focus()` fires no focus events while the preview pane is
  hidden** (the document isn't focused). Dispatch a synthetic `focusin` instead.
- ⚠️ **The dev box is always `display-mode: browser`**, so a plain 375×553 budget
  reads the TAB branch: **55.09 / 384.84 / clearance 19.53**, overflow 0. The
  documented STANDALONE clearance is 11.06 and needs the
  `@media (display-mode: browser)` block neutralised to measure.
- `tests.html` stalls in a hidden tab — poll with a bounded `await` loop that
  forces layout; never nudge it with a screenshot mid-run (that closes
  `.dd-panel` and fails the wheel checks). A full run needs ~30–60s of polling.
- The preview server can't read `~/Desktop`, so it serves an rsync mirror wired
  up in `.claude/launch.json` (untracked, and it points at a SESSION-SPECIFIC
  scratchpad path — repoint it). **Re-sync after every edit.**

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess.
- **Measure, don't theorise**, and say plainly what was and wasn't verified.
- **A new test must be verified to FAIL without its fix.** Several last session
  were; one was rewritten twice because the first two drafts passed for the wrong
  reason (one tripped the drift backstop, one counted count-in entries).
- **When a change contradicts a documented decision, say so and keep the old
  rationale.** v2.8.2's silent-phone rule was reversed this way.
- **Don't keep a fix that didn't fix anything** — two were backed out last
  session on exactly that rule.
- **Tests stay green**; run `tests.html` and say the count. It's **175/175**.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push.**
  Doc-only pushes need neither. GitHub noreply identity only; the repo is public.
- **Don't push without asking** — he'll say when.
