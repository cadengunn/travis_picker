Travis Picker — new session. **v3.12.0 is live and pushed, 137/137 green.**
Read `CLAUDE.md` first; it's a hub, so follow its pointers rather than
reading everything. `OPEN_ITEMS.md` is short now (259 lines, rewritten in
session 44) and is the fastest way to see what's actually open.

## The work for this session: ITEM 17 — save custom progressions

**Do not start coding.** This one is explicitly marked "needs a design call"
and he has not made it yet. The fork is already framed in `OPEN_ITEMS.md`;
put it to him and let him choose, or improve on it — he reliably does.

**What's already true, so it doesn't get re-derived:**
- Progression mode can already hand-edit any bar's chord, `detectProgression()`
  reads the result back and falls through to `Custom`, and a saved *pattern*
  already stores a full `context` (key, progression, capo, ×2, swing, bpm). So
  a custom progression is **already durable** — it's just welded to one
  pattern instead of being reusable across patterns. That gap is the ask.
- `PROGRESSIONS` is plain data read through `progressionGroups()`, and the
  wheel's progression reel is built from it with `Custom` riding the end.

**The two shapes:**
1. **A user entry in the existing progression list** — its own `style` group,
   so the drum's engraved section headers do the work. A `storage.js` store
   plus a data merge, **no new surface in the Load sheet at all**. This is the
   cheap one and the one I'd lead with.
2. **Its own manage / rename / delete UI.** More capable, and the version
   that risks the bloat *he himself flagged* when raising the item.

**His stated worry is bloat**, and it's specifically a Load-sheet worry — that
sheet was redesigned twice in session 43 and he likes where it landed.

## Waiting on his phone (three things, all shipped, none judged)

Ask about these before starting item 17; two are one-line reversions if
they're wrong.

- **The numeral face (item 14, v3.12.0).** Fret digits, the beat ruler, the
  BPM readout and the chord-box digit moved from a system rounded face to
  **Fraunces** cut small (`opsz` 9 / `SOFT` 100). **Only his eyes can judge
  arm's-length legibility** — Fraunces has more stroke contrast than what it
  replaced. **If it costs legibility, Jost is a one-line fallback**: monoline,
  already bundled, also zero bytes. Also: do the PIMA letters sit level now?
- **The Nylon / Steel tone toggle (item 16, v3.11.0–.1).** Round 2 fixed
  high-note sustain (nylon's E5 held 11% of steel's level at 0.5s; now
  0.96–1.56x across E4–E5). Worth asking whether it's now *too* long up top,
  and whether nylon holds up under a full three-finger rake at tempo. If
  nylon wins outright he may want to drop steel and the toggle entirely —
  he's said keep the toggle, so don't assume otherwise.
- **The eleven rewritten Travis bass patterns (v3.10.2).** add9 family, E♭m6,
  G♯6, Gsus2, G♯sus2. Audible-only; a test pins the string assignments but
  only his ear says they're the right ones.

## Also worth knowing

- **Every bundled font is now OFL 1.1 with no Reserved Font Name** (checked
  this session), so the app is clean to embed in a paid build. Item 18 will
  want the `fonts/OFL-*.txt` notices included in the app bundle, not just the
  repo.
- **Items 5 and 11 were folded into item 18** (app icon full-bleed, the
  "Add to Home Screen" hint) — both fit the App Store process better than
  they fit standalone work. Items 12 and 13 were closed by his call.

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess.
  Session 44 is the sharpest example yet: I had approval to bundle a 39KB
  third font and had already downloaded three candidates when he asked
  *"have we considered the two fonts we already are using?"* One of them did
  the job, and the documented reason a third face existed turned out to have
  been reasoned rather than measured — and wrong. **Check the premise before
  spending the bytes.**
- **Measure, don't theorise.** Session 44 settled the nylon sustain question
  with rendered buffers, the font question with real renders in the real
  dome, and the PIMA nudge with ink-extent metrics. Every one of those
  contradicted a plausible-sounding guess.
- **A new test must be verified to FAIL without its fix.** Three were, this
  session. A test that passes vacuously is worse than none — see the pass
  lamps, which shipped dead twice while a shape-based test passed.
- **Tests stay green**; run `tests.html` in the browser and say the count.
  It's **137/137**.
- **Any chrome change to the MAIN app view needs the 375×553 re-measure** —
  55.09 / 384.84 / 11.06, clearance against `main.bottom`. Worth doing even
  for a font change: `.tick` lives inside the grid track.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push.**
  GitHub noreply identity only; the repo is public.
- **Dev-box limits** are in `CLAUDE.md` and they bite. The two that cost time
  this session: `tests.html` stalls in a hidden tab and needs nudging with
  real clicks, and **a screenshot taken mid-run resizes the pane, which closes
  any open `.dd-panel` and fails the wheel test** — screenshot between runs,
  not during one. A wheel failure right after a screenshot is almost always
  that, not a regression.
