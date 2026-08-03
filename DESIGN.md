# DESIGN.md — Travis Picker: how it looks and feels

**Read this when you're changing appearance** — the faceplate, a control's
material, type, colour, touch behaviour, or the geometry of the Options sheet and
the drum pickers. Split out of `CLAUDE.md` in session 34, which stays the hub: it
keeps the rules that constrain *non-visual* work (the height budget, "no
scrolling ever", the pinned `line-height` on accidentals, precaching a new font)
and points here for the rest.

**Everything in here was measured on a 375×553 viewport**, not eyeballed. Where a
number appears, it came off the live app. Re-measure before you change it — and
see `CLAUDE.md`'s height-budget table first, because the clearance under the grid
is 11px and any chrome you grow comes out of it.

**One standing rule about where these facts live:** mechanics that only matter at
the line that implements them are commented **in `styles.css` / `wheel.js`**, not
here — the mask ramp, the reel step/facet split, the `.seg-tabs` specificity
trap. Copies drift (this file's ancestor said the mask was 8/92 while the
stylesheet said 6/94). Document the *rule* here, the *mechanism* there.

## The governing rule

**The whole screen is one warm tweed "faceplate" — a piece of gear** (session 8).
The mood board was 60s/70s RCA Victor country (Jerry Reed, Chet Atkins), Gretsch
walnut-and-gold, tweed amp grille cloth, Arhoolie folk (Elizabeth Cotten).

**His rule, and it settles most arguments: this is a practical workhorse practice
tool — the right-hand pattern grid is ALWAYS the hero; the chord just labels it.
Craftsmanship should surround the tool, never overshadow it.** A "chord as hero"
pass with a giant watermark letter was rejected for hurting grid legibility, and
an engraved brass serial plate shipped and was then reverted for pulling the eye
off the grid.

The faceplate is the `body` background — fixed tweed weave + sheen + edge
vignette over `--faceplate`, all in **fixed rgba because it's texture, not hue**,
so it rides every theme.

## Materials

- **One consistent bevel language:** the grid is **recessed** into the faceplate,
  transport buttons and pills are **raised + carved** (dished radial + chamfer
  bevel + a debossed intaglio glyph), and the whole **Options sheet is a bank of
  recessed wells** — some plain value-displays you tap to open, some holding
  carved keys you press. The raised/proud material is reserved for the strike-it
  transport (Play, the Generate die). Everything presses in on `:active`; keys in
  a well **sink straight IN** via a deeper inset (`transform: none`), because a
  lateral 1px translate read as sliding.
- **Four families cover everything** (session 28 closed the last outliers):
  **(1) raised carved keys** = strike-it actions; **(2) recessed wells** =
  standing values; **(3) latching key + lamp** = toggles — the page tabs AND the
  Sound lamps (`.lamp:has(input:checked)` seats when on, proud when off, so "on"
  reads as pressed in); **(4) faders** = the two sliders. The one accent-coloured
  surface is the **primary-action key** (`.btn-primary` / the saved-row Load), a
  CARVED accent key rather than a flat slab — the accent is theme-derived, never
  literal gold, because a primary action *should* pull the eye where a value
  should not.
- **A latched/pressed-in look is ONE clean top-weighted inset plus a hairline of
  BOTTOM bounce**, not a stack of top shadows (his note, v2.14.7 — a pile of top
  shadows reads as a heavy bar, not a recess). The near wall in shadow and the far
  wall catching light is what says "in"; the stepper key is the reference.
- **Sliders / faders** (session 28): both ranges are `appearance: none`, styled
  via each engine's pseudo-elements into a **machined slot + raised cap**, one
  shared rule set. The **traveled portion fills in `--active`** — WebKit has no
  `::-moz-range-progress`, so the fill is a `--pct` custom property the track
  gradient reads, set by `paintSlider()` on every `input` and once at init
  (Firefox uses the progress pseudo and ignores `--pct`). `height: 24px` stays for
  the touch target; the native drag is untouched (a test drags BPM to 239 and
  reads the fill). **The cap has NO `:active` press-in** (his note) — a fader
  SLIDES, it doesn't seat like a button, so it keeps its raised look the whole
  travel.
- **Note tokens are 3D DOMES**, not chips — a poker-chip treatment (flat face +
  extruded edge) was built, tried and rejected. Signed off; don't re-propose.
- **Grid legibility beats decoration:** no per-cell borders. Strings read from
  quiet horizontal lines + thumb-row banding + a stronger divider under string 3,
  and only downbeats get a faint wash. **Rows run strings 1→6 top to bottom**, so
  fingers are on top and the thumb at the bottom.
- **Lamp colours are a convention, and it is NOT the theme accent.** The jewel
  body is shared (radial-gradient + rim + inset) so they read as one family, but
  the beat lamp is theme-driven (`--lamp-*`) while the indicators use
  **deliberate fixed hues, like real hardware: red = REC/armed, amber = caution
  (the ABS/MIX chips), green = save-OK.** A blink is a **pure flash** — constant
  size and rim, only the glass brightens; never a `transform: scale()`, which
  reads as a button moving. Help mode is what explains those to the user, and
  giving those cryptic-by-design indicators somewhere to be explained is a large
  part of why it exists.
- **Anything typed that isn't in a bundled face must be DRAWN.** The sheet's `✕`
  was U+2715 and rendered in Arial — the one system-font element in the app.
- **Prefer `position: relative; top` over `transform` for small lifts.** A
  `transform` promotes a compositing layer, and content behind the Options
  sheet's translucent backdrop then doesn't repaint on iOS — that was a real
  lingering-label bug.

## Type — the panel speaks in THREE voices

Session 17, and the rule that decides which is *where the words sit*, not what
they mean:

- **`--serif` (Fraunces)** — what a control **says**: values, names, prose, and
  any word or typed glyph **inside** a control (a dropdown's value, a lamp's
  name, a segmented button, the capo stepper's `−`/`+`).
- **`--legend` (Jost)** — what the machine **calls** a thing: the small tracked
  caps **above** a control, silkscreened on the faceplate. One tier only —
  10px / 0.16em / 500 (`--legend-size`/`-track`/`-weight`). A group caption
  (`.sheet-sec`) is the *same object* as a field label, same left edge.
- **`--numeral` (rounded geometric)** — fret digits in note circles, the bar-num
  chip, ruler ticks, BPM. A **legibility exception**, not a third opinion.

**Jost is bundled (OFL 1.1), not the system Futura it resembles** — referencing a
commercial system face is free only while every user is on Apple hardware, and an
OFL face is ours to embed, renders identically everywhere, and stays free if this
is ever sold. Same footing as Fraunces. **Adding any font means adding it to
`sw.js` PRECACHE and bumping `CACHE`**; two tests guard it (every `fonts/*.woff2`
is precached; every bundled file has an `@font-face`, and `--legend` never falls
back to the rounded stack).

**Accidentals need a FIXED `line-height` wherever they appear** — this one is in
`CLAUDE.md` too, because it bites anyone adding text anywhere. `♭`/`♯`
(U+266D/U+266F) aren't in Fraunces, so they render from a fallback whose taller
ascent/descent grows the line box: picking a `♭VII` progression grew its dropdown
trigger **+4px** and pushed the bottom-anchored Options sheet up 3.75px (measured
both ways).

## Themes

`themes.json` is the source of truth (**default: `jerry`** — the app icon is built
from Jerry's roles, so the two match). Each theme is 5 roles (`bg`, `surface`,
`accent`, `active`, `label`) plus an **optional `hardware`** role (the metal
fittings: sheet lip, die/primary borders, jewel rim; defaults to the house brass,
with Doc nickel, Jerry bronze, Elizabeth copper).

`theme.js` sets those as CSS custom properties and *derives* everything else by
blending hexes (`--line`, `--muted`, `--grid-line`, `--beat-wash`, `--glyph`, the
jewel-lamp family, `--recess-shadow` via a surface-luminance check for light
themes, and the `-hi`/`-deep` gradient caps — the hue pulled toward white/black,
so a raised control is ONE material lit from above, not a warm cap on a cool
body). **Only `--beat-wash` and `--lamp-glow` stay translucent**, since they layer
over other derived fills; the rest are opaque so CSS needs no alpha math.

**Nothing theme-dependent is hardcoded in `styles.css`** — its fixed rgba is
limited to true texture — so adding a theme is a pure data edit. `playhead` is a
second optional role (the derived mix desaturates to gray when surface and active
are near-complements). Choice persists in `localStorage` and **a saved preference
wins over the default**, so changing `jerry` only affects someone who has never
picked one (clear `travis-picker:theme` when testing). `styles.css`'s `:root`
fallbacks, used if the fetch fails, are **Jerry's**, read out of the live app.

Note circles: thumb = `--active`, fingers = `--accent`, which keeps the
hand-domain read and is the convention `chordbox.js` reuses.

## The control surfaces

The placement policy — what goes on the transport, what goes in the sheet — is in
`CLAUDE.md`, because it's a product decision that constrains features. This is how
those surfaces are *drawn*.

- **The pills are ICON-ONLY** (`.pill-icon`, v2.8.1): pencil / floppy / folder /
  **`?`**. They were the last text controls in an app that otherwise speaks in
  glyphs, and the words cost width the readout needed (**199px → 146px, handing
  the readout 143px → 196px**); the words live on in `title`/`aria-label`. All
  four wear the transport's intaglio so a generic glyph reads as part of the
  faceplate — **the clever move is the treatment, not the metaphor**, since a
  metaphor has to survive at 18px. The `?` is a real letter, so its intaglio is a
  `text-shadow` pair rather than the SVG `drop-shadow` filter. The **saved count
  lives in the label** — writing `textContent` on the Load pill would wipe its
  `<svg>`, so `refreshSavedCount()` sets `title`/`aria-label` and leans on the
  disabled state to say "nothing to load". The REC lamp rides the Edit pill (hence
  `display: inline-flex`).
- **The context AUTO-SHRINKS to fit** (`fitContext()`, v2.7.5): 14px base, 10.5px
  floor, one measure-and-set pass. Roman numerals with accidentals run long and
  ellipsizing hid the very information the readout exists to give. **Since the
  icon pills left it 196px, every realistic readout including the worst case sits
  at the full 14px and nothing shrinks** — `fitContext` is now insurance that makes
  a longer future readout safe. Re-fits on `document.fonts.ready` (Fraunces loads
  async and is wider than the fallback) and on resize.
- **The capo tag is width-critical.** It says both halves of the fact
  (`CAPO 2 → F♯`), the pills leave it 156.3px, and its worst string needs 151.2px
  — so it's shrink-and-ellipsize, not fixed. Re-measure if the pills or the
  wording change.

### The Options sheet

Six rules hold it together, each fixing something measured (sessions 18, 24–27):

- **The tabs ride the sheet's TITLE line**, so the two-page split costs no height,
  and **both pages live in one CSS grid cell** with the inactive one hidden by
  `visibility` — the panel is always the taller page's height, so switching tabs
  can't make the bottom-anchored sheet jump.
- **The chord row is one centred flex group, and both chord modes are cut to the
  same total.** Key + Progression sum to exactly `--wheel-w` (90 / 139, from
  `--key-w`; the split is set by `I–♭VII–IV` at 77px + 34px of well chrome), so
  switching modes moves nothing — measured, the group spans 42 → 333 and the die
  287 → 333 in *both*. A test pins that. `.die-well` carries an explicit
  `width: 46px`; `width: 100%` on the key collapsed it to 21px when the row
  stopped being a grid.
- **The die sits beside the chord and nowhere else** — that adjacency is the only
  thing saying what its scope is. It wears the transport die's tilted six (same
  pips, −13deg) but is a **carved key in a recessed well**, not the proud cream
  Bakelite: two dice, two treatments, because this one sits among wells.
- **The Format control is two carved keys in one recessed well** — values
  `Single` / `Progression`, selected key **seated with bright text**, and **no
  lamp** (the lit jewel is the page tabs' signature, and the capo it matches has
  none). The segmented buttons have **no horizontal padding, so the button IS the
  text box**; a wrap here doesn't clip, it lifts the sheet, so a test guards the
  fit.
- **The tabs are a LATCHING KEY PAIR, not a segmented control** (v2.14.5, his call
  after three mockups): narrow engraved keys in the **legend voice** (a page name
  is what the machine *calls* a place, not a value you set), current page held in
  with its lamp lit. What the test pins is that they're a different *kind* of
  object — Jost face where Format's is the serif, and **the lit jewel is theirs
  alone**. It took more contrast than the first pass gave it: at 10px the seated
  key needs its cap highlight *removed*, a fill darker than the plate, and a
  hairline of bounce along the bottom edge.
- **Seated keys commit on `pointerup`, and `:active`/`.active` are ONE RULE.** Both
  are anti-flash fixes and both are needed: a separate `.active` rule left one
  frame of the raised state between them, and switching on `click` left a paintable
  gap after the browser drops `:active`. Pointerup collapses that gap and still
  acts on release. A **source-level test** asserts the wiring, because the
  regression is silent and app.js glue isn't imported by `tests.js`. The
  specificity trap and the exact shadow stops are commented in `styles.css` where
  they're declared.

**That row must not be called `.context`** — it was, for one build, and silently
inherited the grid readout's `.context` rule (26px `line-height`, centred,
`top: -4px`): both legends doubled in height and the row grew 59px → 72px. A test
compares its legend's height against a row with no class of its own.

### List panels

**A LIST PANEL IS A HOUSING TOO** (`.dd-list`, v2.14.6, his call). The five list
menus (Thumb, Fingers, Pattern, Note Labels, Theme) **stay lists** — short
unordered sets, where a barrel would be ceremony — but wear the drums' material,
and **the selected row is an aperture, not a lit accent slab** (the accent capsule
is what a *pressed button* wears, so it said "the one you just hit" rather than
"the one in the window"). Three things to know before touching it: the shading
goes on `.dd-panel` **even though the panel is the scroll container**, because an
element's background and inset shadows paint against its padding box and don't
travel with scrolled content (same reason the drum's machining is on `.drum`, not
`.reel`); the bleed is `calc(100% + var(--dd-pad) * 2)` and **not `width: auto`**,
because `.dd-option` is a `<button>` and shrink-to-fits; and framing the row must
not change its height (42px either way) or every row below it shifts. `.dd-list`
is added by `renderList`, so none of it lands on `.dd-wheel`.

### The drum pickers

The wheel's *behaviour* — renderers over hidden `<select>`s, commit on settle,
re-cut on a mode change — is in `CLAUDE.md`. This is the mechanism's look and
geometry.

- **TWO DRUMS ON AN AXLE, physically separated** — each cylinder gets its own
  housing and aperture, with a hairline axle line between. One aperture spanning
  both was the first build and read as one list with a rule down it. In the
  Options sheet the field is split to match (two legends over two wells, each with
  its own caret) via a `label` renderer on `enhanceSelect`; the per-bar chip keeps
  the single name (`C♯m`), since there's no room to say it twice on a bar.
- **Nothing but the mechanism inside the housing** (his call) — no captions in the
  panel. The reels keep their `aria-label`s, which is the only place that naming
  survives, and a test pins both halves. A curated list's sections are **engraved
  grooves, not captions**, drawn on `.reel-face` (so they foreshorten with the
  surface) and **absolutely positioned** — anything altering `.reel-item`'s
  geometry moves its own scroll-snap detent, and a `border-top` would push its line
  of type down 1px. The progression drum also engraves its **style names** as
  non-selectable header facets (session 29, his design B).
- **THE PANEL AND THE OPTIONS FIELD ARE ONE OBJECT, cut from `:root`** (`data-hug`
  + `--drums-w`, v2.14.2–.3, his call: "the chord/quality button should be the same
  size as the drum"). A panel normally takes its trigger's width as a min-width —
  right for a list, wrong for a mechanism — so the wheel opts out and sizes to its
  drums, and the FIELD then follows it. **`--drums-w` (217px) is the primary
  constant**; each pair names its first face and *derives* the second
  (`--drum-root` 88 ⇒ quality 108; `--drum-key` 72 ⇒ prog 124; `--wheel-w` 237).
  That inversion is what lets both pickers open the identical housing — and they
  must, or the field would change width between chord modes. The 72/124 split is
  measured: `I–♭VII–IV` is the widest label on any drum (~87px in the reel's 17px
  serif). Because `position()` anchors to the trigger's **left** edge, each barrel
  opens exactly over its own half — measured, panel and trigger both `16 → 253`,
  drums and halves both `26/88` and `135/108`. The **legends row sits outside the
  well and must be inset by 10px**, or each caption starts left of the barrel it
  names. Three tests cover this (field == panel, half == drum, legend == half).
- **It's a real scroll container with CSS scroll-snap, not a hand-rolled drag**:
  that buys iOS momentum, rubber-banding and detents for free, and it's physically
  right (a flick spins the barrel and it coasts). **The facets ROTATE ONLY — never
  `translateZ`**, which under `perspective` magnifies the whole reel about its
  centre and pushes the outer names out of the housing (a 38px step rendered as
  59px, which is why the drum only ever showed three of its five).
- **The cylinder's own mechanics are commented where they live** — the
  step-vs-facet split (`.reel-item` > `.reel-face`, because a scroll-snap area is
  the element's *transformed* border box), the `position` note on `.dd-wheel`, and
  the mask ramp cut to the step grid are all in `wheel.js` and `styles.css` at the
  line that does it.

(The drum's *voice* — `playTick()` per name through the window — is with the rest
of `ui-sound.js` in `CLAUDE.md`, since the rules about when it's silent are
policy, not appearance.)

### The chord-shape diagram

`chordbox.js`, session 33. Why it exists and what it marks is in `CLAUDE.md`
(it's a musical statement — the thumb's alternating pair — as much as a drawing).
Its geometry:

- **BELOW the drums, never beside.** The panel's width is the Options field's
  width, so widening it would break the one object both are cut from — and its
  test. `.wheel-shape` is `width: var(--drums-w)`, so the diagram can't drive the
  hug wider whatever it contains.
- **ONLY THE ROOT is accented** (`--active`), which is what an ordinary chord
  chart marks; everything else sounded is `--accent`. This replaced accenting the
  thumb's whole root↔alt pair in session 34, his call: the thumb is already
  implicit in which string a note is on. **The BARRE is never accented** (one
  finger across five strings, mostly not the root); a root beneath a bar gets its
  own rimmed dot on top rather than being swallowed by it. `G♯sus2`, whose root
  sits under its barre, is what exposed that.
- **HOLLOW MEANS "you move a finger here", and it means nothing else.** The moving
  finger (`MOVING` in `data.js`) is drawn as an outlined dot on the string you move
  TO; the home note stays filled. There is **no established symbol for this** in
  chord-box notation — movement normally lives in tab — but a hollow "alternate
  bass" dot is the nearest existing practice, so this borrows rather than invents.
  Two consequences: **dashes were tried in the design and dropped** (at r=4.6 a
  dashed stroke reads as a rendering artifact, not a symbol), and **the open-string
  markers are filled discs**, where they used to be rings. Position already says
  "open" — nothing else is drawn above the nut but × and ○ — so the ring was free
  to be reassigned, and hollow stays unambiguous.
- **It cost the panel's height cap.** `.dd-panel` caps panels at `52vh` and scrolls
  the overflow, but a mechanism must not scroll, so the wheel got
  `max-height: min(78vh, 430px)` — at 52vh the diagram was clipped off. That rule
  must stay *after* `.dd-panel`; it wins on source order. The panel measures
  **237×342** at 375×553.
- `.chordbox { width }` is the single dial if it wants to be bigger; the panel's
  height follows it. **Waiting on his phone: whether it's legible at arm's length.**

## Touch and viewport hygiene

- **THE DOCUMENT IS LOCKED** (v2.14.4, his call), which **reverses** the earlier
  decision to leave the viewport zoomable:
  `html, body { overflow: hidden; overscroll-behavior: none; touch-action: pan-y }`
  plus `user-scalable=no, maximum-scale=1` on the viewport meta.
  **`pan-y`, never `none`** — `none` looks like the stronger version of the same
  idea and silently forbids panning in every descendant that is *supposed* to
  scroll: the wheel's reels, a dropdown panel, the saved list, and `main`, the
  safety valve that lets the grid scroll inside its own box at 320×454. `pan-y`
  still rules out pinch **and** double-tap zoom, since both are only offered for
  `auto`/`manipulation`. A test asserts `pan-y` and the absence of `none`. Note
  iOS Safari has ignored `user-scalable=no` in a browser *tab* since iOS 10 but
  honours it in a standalone install, so `touch-action` carries the tab case.
- **THE SHEET'S VIEWPORT PIN ONLY APPLIES WHILE THE KEYBOARD IS UP** (session 32 —
  this was the landscape bug). `syncSheetToViewport()` writes **inline**
  `height`/`top`/`bottom` over `.sheet { position: fixed; inset: 0 }` so a
  bottom-anchored sheet rides above the iOS keyboard rather than behind it. With no
  keyboard the visual viewport EQUALS the layout viewport, so the pin is a no-op
  then — which is why it must **clear the inline box** rather than write a no-op
  snapshot, hidden sheets included. Writing it unconditionally let a box captured
  mid-rotation (iOS reports transitional numbers for a frame or two) outlive the
  turn, so a sheet closed in landscape opened bottom-anchored inside the wrong box
  in portrait. The stylesheet is correct at every orientation, so **no orientation
  handling exists anywhere** and rotating self-corrects. Landscape is deliberately
  NOT blocked in a Safari tab (his call): the manifest's `"orientation":
  "portrait"` covers the installed PWA, and a CSS lockout would need a `max-height`
  guard or it would fire on a desktop browser too.
- **A READOUT needs the same `user-select: none` a control does.** `.bpm-readout`
  was in neither touch list — it isn't a button — so a long-press on "90 BPM"
  selected it and raised the callout (v2.14.4, his note). Any new readout too.
- **Touch hygiene, all learned from real bugs:** `touch-action: manipulation` and
  `-webkit-tap-highlight-color: transparent` on every interactive control (we draw
  our own feedback), plus `-webkit-user-select` / `-webkit-touch-callout: none` —
  **but not on `input`**, which needs selection and paste. **Tag the containers
  too:** at an end-stop the capo button goes `disabled` and the tap falls through
  to the `.stepper` behind it, which is how iOS double-tap zoom got back in.
