# Carry-forward — Travis Picker (after session 15, 2026-07-26)

> **v2.9.1 → v2.9.2 (`CACHE` v46)** — two rounds off his phone test.
> v2.9.1 repainted the icon (the pick measured **1.08:1** against its disc);
> **v2.9.2 rebuilt every colour from Jerry's own theme roles and made JERRY THE
> DEFAULT THEME**, his call. Three things worth carrying forward:
> - **Judge the pick by the WEAKEST of its three contrast pairs.** It crosses both
>   the disc and the hand, so the bright-gold repaints — best against the disc —
>   were worst overall, merging into the hand instead (one pair hit 1.01:1).
> - **Recolour by classifying every pixel, never by flood fill.** The art's
>   background and its outlines are the same colour to within 21, so v2.9.1's fill
>   left every outline brown against the new green — the stray colour he spotted.
> - **`BORDER` in `make_icons.py` must track the master's border colour**, or the
>   `FIT` padding band keeps the old one. Caught by sampling the output.
>
> Weakest pair now 2.16:1. **Offered and not done:** full bleed, worth ~20–25%
> more hand and the last weak pair (disc vs background, 1.34:1).


**The standing open list lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is the session
hand-off only.

## Shipped this session — v2.9.0 (`CACHE` v44)
The **app-icon revamp**: a thumbs-up wearing a thumbpick, cream on a rust disc
over the faceplate brown. 59/59 green. No app code changed. Full detail in
CLAUDE.md "Where things stand (session 15)".

- **The icon is drawn artwork now.** `tools/make_icons.py` used to *draw* the
  mark; it now frames and resamples `tools/icon-master.png`. Worth not repeating:
  an SDF renderer (capsules, smooth unions, bevel lighting) was built and
  abandoned after three passes — the toolkit is good at geometric marks and bad
  at organic ones. The user called it before I did.
- **Style was picked by measurement.** Six candidates downscaled to a real 32px:
  engraving and brass monochrome are the best-looking at full size and the worst
  small. Flat graphic — three values and a silhouette — is what survives.
- **The safe zone is enforced in code.** The master reached r=0.421 against the
  0.40 maskable radius, so `FIT` insets it and pads with the master's own border
  colour (flat to within 5/255, so seamless). The tool re-measures and aborts
  rather than shipping art that drifts outside. Final: r=0.392.
- **Tell him:** iOS caches an installed PWA's icon, so he'll likely need to
  delete and re-add the home-screen app to see the new one. Auto-update won't do
  it.

## Next session — his call
Nothing is half-finished. The standing list, in the order I'd argue for:

- **Pre-loaded patterns** — the best-value smaller item, and the design is
  already settled (read-only "Built-in" data in the Load sheet with "save a
  copy", never seeded into localStorage).
- **Capo** — the biggest design win, but still blocked on two answers from him:
  does shape-first match how he thinks when he clamps one on, and is "invisible
  at capo 0" right, or does he want concert key on screen always?
- **Chord-library fork** — also blocked on a framing question: richer harmony to
  drill (a dozen curated additions) vs a chord dictionary (all roots × qualities,
  which needs a movable-shape-template refactor of `data.js`).
- Smaller: swing, JSON export/import, Unruly density.

## How this user likes to work
- **Agree the design against his spec BEFORE coding.** Surface genuine forks,
  don't guess; several of the best decisions came from one well-framed question.
- He **tests on a real guitar and a real phone between sessions**, and brings
  written notes — stop at checkpoints and say what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth.
- **Report what was and wasn't verified**, and prefer reproducing/measuring a
  behaviour to theorising about it. This session that meant downscaling six
  candidates rather than arguing about which would read small.
- **Say when an approach isn't working** rather than grinding — he'd rather
  redirect early, and did.
- Deploys are public — keep the GitHub noreply identity.
