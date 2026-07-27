# Carry-forward — Travis Picker (after session 15, 2026-07-26)

**The standing open list lives in `OPEN_ITEMS.md`** — every open item with its
size, what's decided and what needs the user's call. This file is the session
hand-off only.

## Shipped this session — v2.9.0 → v2.9.2 (`CACHE` v46)

**The app-icon revamp**, plus a theme default change that came out of it. 59/59
green. Full detail in CLAUDE.md "Where things stand (session 15)". Nothing is
half-finished; the tree is clean and everything is deployed.

**The mark: a thumbs-up wearing a thumbpick** — his idea, from his own photo. Now
in the Jerry palette on a bank-brown disc over dark water.

- **v2.9.0** — the icon became **drawn artwork**. `tools/make_icons.py` used to
  *draw* the mark; it now frames and resamples `tools/icon-master.png`. Worth not
  repeating: an SDF renderer (capsules, smooth unions, bevel lighting) was built
  for it and abandoned after three passes — the toolkit is good at geometric
  marks and bad at organic ones. **He called it before I did.**
- **v2.9.1** — repainted after his phone test: the pick "disappeared against the
  background", which measured at **1.08:1**.
- **v2.9.2** — every colour rebuilt from **Jerry's own theme roles**, and **Jerry
  is now the default theme** (his call — more character than Merle, and his
  favourite both as a player and as a theme). Weakest contrast pair 2.16:1.

### Five things worth carrying forward
1. **Style was picked by measurement.** Six candidate treatments were downscaled
   to a real 32px and compared. Engraving and brass monochrome look best at full
   size and worst small. Flat graphic — three values and a silhouette — survives.
   Keep that test in the loop for any future mark; it caught two things.
2. **Judge a mark by the WEAKEST of its contrast pairs.** The pick crosses both
   the disc and the hand, so the bright-gold repaints — best against the disc —
   were the worst overall, merging into the hand instead (one pair hit 1.01:1).
3. **Recolour by classifying every pixel, never by flood fill.** The art's
   background and its outlines are the same colour to within 21, so v2.9.1's fill
   left every outline brown against the new green — the stray colour he spotted.
   Classification has no unassigned case.
4. **`BORDER` in `make_icons.py` must track the master's border colour**, or the
   `FIT` padding band keeps the old one. Found by sampling the output, not by eye.
5. **The maskable safe zone is enforced in code** — the tool measures the finished
   512 and aborts rather than writing art outside r=0.40. Currently r=0.392.

### Tell him, if it comes up
- **iOS caches an installed PWA's icon**; auto-update won't replace it. Delete and
  re-add the home-screen app to see a new one.
- **A saved theme preference beats the default** (`travis-picker:theme`), so the
  Jerry default only affects someone who never picked a theme. This bit me while
  testing — the dev browser looked unchanged until the key was cleared.

## Next session — his call

He said "we may do another pass some time in the future" on the icon. The one
concrete thing left there is **full bleed**: let the disc colour run edge to edge
instead of sitting as a circle on a background band. Worth ~20–25% more hand and
it retires the last weak pair (disc vs background, 1.34:1). It needs **regenerated
art**, not a recolour — and if new art arrives, the k-means references used for
recolouring are specific to the old artwork and would need re-deriving.

Otherwise, from `OPEN_ITEMS.md`, in the order I'd argue for:

- **Pre-loaded patterns** — best-value smaller item, design already settled
  (read-only "Built-in" data in the Load sheet with "save a copy", never seeded
  into localStorage).
- **Capo** — the biggest design win, still blocked on two answers: does
  shape-first match how he thinks when he clamps one on, and is "invisible at
  capo 0" right, or does he want concert key on screen always?
- **Chord-library fork** — blocked on a framing question: richer harmony to drill
  (a dozen curated additions) vs a chord dictionary (all roots × qualities, which
  needs a movable-shape-template refactor of `data.js`).
- Smaller: swing, JSON export/import, Unruly density.

## How this user likes to work
- **Agree the design BEFORE coding.** Surface genuine forks, don't guess; several
  of the best decisions came from one well-framed question.
- He **tests on a real guitar and a real phone between sessions** and brings
  written notes — stop at checkpoints and say what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth.
- **Report what was and wasn't verified**, and prefer measuring to theorising.
  This session that meant downscaling six candidates rather than arguing about
  which would read small, and sampling the shipped icon rather than trusting it.
- **Say when an approach isn't working** rather than grinding — he'd rather
  redirect early, and did exactly that on the SDF renderer.
- He brings his own art and references, and has a good eye — he spotted both the
  invisible pick and the stray outline colour from a phone screen.
- Deploys are public — keep the GitHub noreply identity.
