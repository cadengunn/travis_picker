# Carry-forward — Travis Picker (after session 17, 2026-07-27)

**The standing open list lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is the session
hand-off only.

## Shipped this session — v2.10.4 → v2.11.1 (`CACHE` v54)

65/65 green. Tree clean, everything deployed, nothing half-finished. Full detail
in CLAUDE.md "Where things stand (session 17)".

### v2.10.4 — the installed app could precache a STALE deploy, permanently
His report: the site had updated but the home-screen app still showed the
previous version, and force-quitting didn't help. A real bug, and **not** in the
update detection that v2.8.0 fixed.

`updateViaCache: "none"` makes the browser fetch **`sw.js`** from the network,
which is why a new deploy is *detected* — but the files `sw.js` then precaches go
through the ordinary HTTP cache, and GitHub Pages serves them `max-age=600`. Two
deploys inside ten minutes (v2.10.2 → v2.10.3 were **11 minutes apart**) and the
new worker installs correctly under the new cache name while filling it with the
**previous** deploy's bytes. Nothing re-fetches afterwards, because the cache is
only written at install: an up-to-date worker serving stale code, for good.

- Fix: `install` fetches each entry with `{ cache: "reload" }` and `cache.put`s
  it, replacing `cache.addAll`. A non-`ok` response throws, so a partial precache
  can't reach `skipWaiting`.
- **Proven, not argued:** a scratchpad endpoint serving `max-age=600` with a
  server-side hit counter showed three default-mode fetches leaving the counter
  at **1** and a `reload` fetch taking it to **2**.
- Second hole found while tracing it: `registerServiceWorker()` ran inside
  `boot()`, so anything throwing earlier took the updater down with it — and an
  app that can't check for updates can't ship its own fix.

### v2.11.0 — the typography pass
Started from "something seems a little off about the fonts" in the Options sheet.
**The typefaces were never the problem** — the sheet had *two label systems* and
a few orphans. Measured first: the group caption was 9px/0.22em at x=18 over
field labels at 10px/0.14em at x=16, i.e. *smaller type on the thing that
outranks*, and the two pages therefore opened with different-looking objects.

The rule that came out of it is about **where words sit**, not what they mean —
serif inside a control, `--legend` above it, `--numeral` only for fret digits.

**The legend face is bundled Jost (OFL 1.1, 26,588 bytes)** rather than the
system Futura it resembles. He asked exactly the right question — *is Futura
actually free?* — and it isn't: Futura, Copperplate, Helvetica Neue and Gill Sans
are all commercial, and referencing one by name is free only while every user is
on Apple hardware. He's thinking about commercialising, so an OFL face wins.

Also his two placement calls, which depend on each other: the **Guide "?" became
a fourth header pill**, and the **name moved back to its own row** — which is
what makes the fourth pill free, since with a capo set the name had been left
35px of a 351px row.

### v2.11.1 — two bugs he caught on the phone, both mine
- **The grid jumped when a name appeared.** An empty `.loaded-name` is a 0-height
  inline box, so the row collapsed to 1px and the header swung **33 ↔ 55px**. I
  had reported this verified after measuring the "no name" case *with placeholder
  text in the element*. Fixed with a zero-width-space `::before`, so the
  reservation comes from the name's own font metrics.
- **Edit mode's dashed outline crossed the progression readout.** `outline` draws
  OUTSIDE the box, so its reach is `offset + width` = 7px, into a readout sitting
  flush with the grid's top edge. Fixed at both ends: offset 5 → 3px and the
  readout lifted 4px (via `position: relative; top` — a transform would re-open
  the iOS lingering-label bug).

## Five things worth carrying forward

1. **Measure the state that actually ships.** Both v2.11.1 bugs were layout
   claims I'd "verified" in a state the user never sees — a name row with
   placeholder text in it, and a readout without edit mode armed.
2. **Reproduce the mechanism, don't infer it.** The stale-cache diagnosis was
   circumstantial until a `max-age=600` endpoint with a hit counter showed the
   browser answering `addAll` from its own cache. That took one small server and
   settled it.
3. **A layout invariant CAN have a test.** The name-row check renders the real
   stylesheet plus the header markup in an **iframe** (tests.html has no
   stylesheet, and booting the app in the harness would touch his saved
   patterns), then asserts empty and filled heights match. Verified it fails with
   the fix removed. This repo has hit grid-jump bugs repeatedly — more of these.
4. **For type or colour questions, build the real thing at true size and let him
   judge on the phone.** Six candidate faces in a 375px replica of the sheet,
   with the real values and the real Fraunces, published as an artifact. Several
   candidates are iOS system faces the dev box renders differently or not at all,
   so a laptop screenshot would have been the wrong evidence.
5. **Licensing is a real design constraint here.** He intends to keep the option
   to commercialise, so "it renders on my phone" isn't the same as "we can use
   it". Bundled OFL is the house rule now.

## Tell him, if it comes up

- **v2.11.1 is the first deploy that proves the v2.10.4 fix** — if the Guide
  reads the current version after a relaunch without a force-quit, the stale
  precache bug is settled.
- **The empty name row** is the one deliberate thing from this session he hasn't
  ruled on: a fresh generation shows no name, so that row is blank. It's reserved
  space now (nothing moves), but a muted placeholder is the alternative.
- The **dev-box caveat is unchanged**: rAF is paused in the hidden preview tab,
  which freezes the playhead and the beat lamp, and `document.fonts.ready` can
  hang there too — force layout with `offsetHeight` instead of awaiting frames.

## Next session — his call

From `OPEN_ITEMS.md`, in the order I'd argue for:

- **Pre-loaded patterns** — the best-value item on the list and the only sizeable
  one with nothing blocking it. Design settled (read-only "Built-in" data in the
  Load sheet with "save a copy", never seeded into localStorage). The one thing
  needed from him is the patterns themselves.
- **The chord-library fork** — still blocked on the framing question: richer
  harmony to drill (a dozen curated additions) vs a chord dictionary (all roots ×
  qualities, needing a movable-shape-template refactor of `data.js`).
- **The Guide rewrite** — he asked to revisit it; needs him to say *what's* wrong
  with it, since stale / too long / wrong shape pull in different directions.
- Smaller: swing, JSON export/import, icon full bleed, an "Add to Home Screen"
  hint.

## How this user likes to work

- **Agree the design BEFORE coding.** Surface genuine forks, don't guess. He says
  so explicitly ("let's discuss before making any modifications") and he means it.
- **He will improve your options.** The two-page Options sheet and the name-row
  move both came from him rejecting the menu I offered.
- **He asks the question you should have asked.** "Is Futura actually free?" was
  the whole licensing thread; it changed the answer.
- He **tests on a real guitar and a real phone between sessions** and brings
  written notes — stop at checkpoints and say what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel,
  the capo stepper).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth.
- **Report what was and wasn't verified**, and prefer measuring to theorising.
- Deploys are public — keep the GitHub noreply identity.
