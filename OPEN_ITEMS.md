# Open items — Travis Picker

A standing list of everything open, to think over between sessions. Rewritten at
the end of session 17 (2026-07-27, v2.11.1) — completed items moved out, the rest
renumbered. **`NEXT_SESSION.md` was folded in here in session 19**; the docs are
now three: `CLAUDE.md` (architecture + invariants), `CHANGELOG.md` (the
session-by-session history), and this file (what's next).

**How to read this:** each item says how big it is, what's already decided, and
what (if anything) needs your call before it can be built. Items are grouped by
size, not priority — the priority call is yours.

Status legend: **OPEN** = not started · **NEEDS A CALL** = blocked on a decision ·
**ON THE PHONE** = built, waiting on your test · **DECIDED** = settled, recorded
so it isn't re-litigated.

---

## On the phone right now (v2.14.2) — THE CHORD WHEEL

**Two cylinders, root × quality, in both chord pickers.** All 12 tones on the
left drum; Major / Minor / 7 on the right. It commits as it settles and stays
open, so you can spin one drum, hear it, then spin the other. Each is a real
scroll container, so it has iOS momentum and rubber-banding — a flick spins the
barrel and it coasts.

**Your notes are in.** The drums are physically separated — each has its own
housing and window, with an axle line between them — and the Options field is
split to match (CHORD and QUALITY over two wells with a division line, each with
its own caret). The panel itself carries no captions and sizes to the drums
rather than to the control that opened it, so the Options and bar-chip cases now
open the identical 237px object. The per-bar chip stays a single name.

**The barrel is rounder, and the fix was a subtraction.** The housing carries the
curve now, but what actually made it read as a cylinder was deleting a
`translateZ` that was magnifying the whole reel about its centre: a 38px step was
rendering as 59px, which pushed the outermost names clean out of the housing.
That's why it only ever showed three names. It shows five now.

**The progression bug is fixed and it was exactly what you described.** Picking a
chord re-renders the grid, which rebuilds the per-bar control — so the open wheel
was left writing to an element that no longer existed. One change, then nothing.
You can now spin root and quality as many times as you like from one opening.

**The library is now 36 chords**, the full matrix. 14 open-position voicings are
hand-written; the other 22 are derived from two movable templates (E-shape and
A-shape, whichever barres lower). That rule reproduces all eight barre chords the
library used to hand-declare, which is now the test fixture. Nothing lands above
fret 8.

**What only the phone can judge:**
- **The detent.** It ticks as each name passes the window, and it's a new voice —
  lighter and drier than the button ka-chunk, no tail, since it fires several
  times a second in a spin. Too loud, too quiet, or wrong material?
- **The feel of the spin.** Five names visible, 38px a step, and the snap is the
  browser's own. Tapping a name one or two above the window steps to it.
- **Whether it's round enough.** The curve is three things you can each dial
  independently: how far a name turns per step, the housing's shading, and how
  fast the faces dim as they go. Say which way it wants to go.
- **The die rolls all 36 now.** You may find you want the open chords back.

**One deviation I took and want you to know about.** Inside an E-shape barre the
♭7 has only two homes: string 4 at the barre (the everyday `131211` F7) or string
2 three frets up, which is a stretch nobody plays. I took the playable one, which
puts the ♭7 on the alt-bass string — so **F7, F♯7 and G♯7 alternate root ↔ ♭7**
rather than root ↔ octave. It's a real ragtime bass and the shape is the one
you'd actually fret, but it does break "dominant 7ths keep the parent major's
bass". The alternative is a high A-shape barre (G♯7 at fret 11). One line either
way — say which you'd rather hear.

**Spelling is now single-source**: the wheel, every chord name and the capo tag
all read one table, so a pitch can't be `C♯` in one place and `D♭` in another.
Flats for E♭/B♭, sharps for C♯/F♯/G♯.

**Costs nothing in layout** — re-measured at 375×553 with 4 bars: header 55.09px,
grid 384.84px, clearance 11.06px, no overflow. Identical to before.

---

## Next session — the shortlist

**Item 2, pre-loaded patterns, is still the best-value thing on the list** and
the only big-ish one with nothing blocking it. Design is settled (read-only
"Built-in" data in the Load sheet, "save a copy", never seeded into
localStorage). The one thing it needs from you is **the patterns themselves** —
either a handful you've saved and like, or a nod for me to pick a spread across
the tiers. It now inherits the 36-chord library and the capo field for free.

Riding along, cheap, whenever you want them:
- The two help-copy reversions you flagged in v2.13.7 (Wild Card's
  off-the-curve line, and "Count-In").
- Anything off drilling with the wheel — the detent's voice, the curve, the
  die's pool, and the F7 / F♯7 / G♯7 bass question above.

---

## Previously on the phone (v2.13.7) — HELP MODE, adjusted + your copy

**Two more off your last note.**

- **Titles follow the shape of the phrase now** — Title Case for the title-like
  ones (Help Mode, Pattern Name, Bass Warning, Pattern Length, Note Labels),
  sentence case for the sentence-like ones (What you're playing over, The grid is
  your right hand). Most are single words and unaffected. "Count-in" keeps its
  lowercase particle, which is the standard for a hyphenated compound and matches
  the lamp's label — say if you'd rather see "Count-In".
- **You can arm help mode with Options already open.** The `?` stays out of the
  scrim, bright and tappable, while everything else dims behind it; the sheet
  stays open, and tapping any control in it explains that control. Tabs still
  switch, ✕ still closes.

---

**Your revision pass is in, verbatim.** 30 cards → 28, and the house rules you
wrote with it now sit in `data.js` above the map so the next edit reads them
instead of re-deriving them. `HELP_COPY.md` is regenerated to match.

Three of your edits weren't copy changes, so they're worth knowing:
- **The beat lamp's card is gone and a tap on it lands on Tempo.** Free, as you
  hoped: the lamp already sits inside the tempo control. And the trap you called
  out is real and caught — leaving the annotation behind fails the test with
  *"controls point at missing help copy: beat-lamp"*.
- **Rolling the bar chord into the grid card undoes part of what I did earlier
  this session, and you're right.** The v2.13.4 fall-through was only a bug
  because the grid card said nothing about chords; your second paragraph fixes
  that, so the fall-through becomes correct and the separate card redundant.
  There's now a test pinning the two together, since they're only right as a pair.
- **A blank line in a card is a real paragraph now** — your grid entry is the
  only one that uses it.

**Two places your notes and your copy disagreed**, both resolved toward the copy:
you list Thumb and Fingers among the cards that "run long", but you actually cut
both to two short sentences (which drops Wild Card's off-the-curve status from
the card — consistent with your own "you'd discover it in one tap" rule, since
the menu groups it under Experimental, but say if you want it back). And "Tempo
now carries the blink" — your Tempo copy doesn't mention blinking, so I read
that as "the lamp lands on the Tempo card".

---

### The v2.13.5 adjustments, still unsigned-off

**Your verdict on v2.13.4 was "working well", and three things came out of it.**

- **The highlight is now sized per mode.** It was drawing the reserved
  full-width slot in both — `351×28` around a chord that's actually `25.3×40`,
  i.e. mostly empty space *below* the letter in single mode. It now rings
  whichever of the two is showing (the chord, or the numerals), sharing the one
  explanation as you asked.
- **The per-bar chord picker has its own card.** It was showing the *grid's*
  card — the one place a card was actively wrong rather than just missing.
- **Tapping the same thing again puts its card away**, so every control is its
  own toggle.

**Answered and closed:** Play stays as it is (a take keeps running; Play
explains rather than stops), and Save/Load stay non-enterable in help mode.

**Still only the phone can judge:** card placement under a thumb, and the
wording — which is what `HELP_COPY.md` is for. All 30 cards' text is in that one
file, grouped by where the control sits, and every rewrite is a data edit in
`HELP` with no code moves and no layout to re-measure.

**Still costs nothing in layout** — re-measured across five states (off, armed,
card on the readout, card on a bar chord, disarmed): clearance 11.06px, no
overflow, identical every time.

<details>
<summary>What v2.13.4 shipped, kept for reference</summary>

### HELP MODE (v2.13.4)

**The Guide is gone; the `?` is a mode now.** Tap it and it latches in like the
Edit pencil, and from then on tapping anything on screen tells you what it does
instead of doing it. The gear still opens Options, its page tabs still switch and
the ✕ still closes — everything else, Play and the die included, explains itself.
Tap `?` again to leave.

**What to poke at on the phone:**
- **Does it read as a mode?** The `?` presses in and lights, and a card opens
  anchored to it saying what's happening. That card is also where the version
  number lives now.
- **The cards are anchored to what you tapped** and flip above it near the bottom
  of the screen. Worth checking they never land somewhere silly under a thumb —
  that's the one thing the dev box can't judge.
- **Tap the greyed-out Load pill.** It works: a disabled button normally emits no
  click at all, which would have made it a dead tap for exactly the person most
  likely to be reading help (an empty library is the first-run state).
- **The transport is deliberately left alone** — arm help mid-take and it keeps
  playing, and Play explains itself rather than stopping. Two taps to actually
  stop. Say if that's wrong in practice.
- **Nothing you tap can change anything.** Verified across every control, both
  Options pages, and a real slider drag.

**Costs nothing in layout** — the card is an overlay, so at 375×553 with 4 bars
the geometry is identical armed or not (clearance still 11.06px, no overflow).

**Known open questions on it, none blocking:**
- **Card placement under a thumb** — the only thing the dev box genuinely can't
  judge. Cards anchor below what you tapped and flip above near the bottom edge.
- **Wording and length.** Every entry is 2–3 sentences by rule, since it's a card
  floating over a 375px screen. All of it is one map (`HELP` in `data.js`), so
  any rewrite is a data edit — cheap, and no code moves.
- **Coverage.** 29 things are annotated. If something you tapped said nothing,
  that's a missing `data-help` + entry, also a data edit.
- **Whether the die and Play should be exempt** like the gear is. Currently they
  explain themselves, which is the rule as you specified it.

</details>

---

## Session 19, part 1 — the docs

**No app file changed in this part.**
CLAUDE.md was **1,982 lines and half changelog**; it's now **867 lines of
architecture and invariants**, with the session-by-session history moved to a new
**`CHANGELOG.md`** (newest first, with markers where a later session overturned
an entry). `NEXT_SESSION.md` is gone — its durable lessons merged into CLAUDE.md's
"Working with this user", the rest into this file.

The split wasn't a straight cut: a set of still-load-bearing facts lived **only**
in session notes and would have stopped being loaded each session. Those were
promoted into CLAUDE.md — `ui-sound.js` / `modal.js` / `dropdown.js` (missing
from the file map entirely, along with `sw.js`, the manifest, `icons/` and
`tools/`), both deploy footguns, the dev-box limits, the lamp-colour convention,
the design-language statement, and `platform.js`'s four integrations. Six stale
numbers were corrected against the code, and **the height-budget table was
re-measured live** rather than carried forward: at 375×553 with 4 bars the grid
is 384.8px, chrome 168.2px, and **11.1px of clearance under the grid** — no
overflow. 69/69 green at that point (72/72 after help mode).

---

## Previously on the phone (v2.13.3)

Four things off your v2.11.x notes. Nothing here touched the generator.

- **The "Chaos" menu is now "Fingers"**, sitting beside Thumb — the two layers,
  named. Its sections are **Complexity** (Tame / Loose / Unruly) and
  **Experimental** (Wild Card, formerly Chaos). Saved patterns are unaffected;
  only the words changed. Worth checking the grouped menu reads clearly at a
  glance mid-practice.
- **Long-pressing a control no longer selects its text.** The save-name field is
  deliberately exempt, so paste still works there.
- **`CAPO 2 → F♯` in the header**, and the "sounds in" readout is gone from the
  Options sheet — its slot is free for later. The arrow rather than the words is
  a fit decision: the words needed 210.6px of the 156.3px the pills leave.
  Two things to sanity-check on the phone: whether the arrow reads as
  "shapes → sounding pitch" without being told, and whether having the *shape*
  key above the grid and the *sounding* key up top is ever confusing.
- **Three Thumb values were clipping, not just "Dead Thumb"** — "Alternating"
  and "Root–Fifth" too. The row's three slots are sized by content now; nothing
  clips in any of the three menus.
- **Swing** (v2.13.2) — one smooth 50–75% slider on the Setup page, swinging the
  **&s** only. 67% is set. See item 3.
- **Labels** (v2.13.3) — the sheet's first page is **Setup** (was "Generation")
  and its chord-mode legend is **Format** (was "Chords").

**Swing is done and settled** (v2.13.2) — see item 3. Nothing outstanding on it.

**Two things only the phone can answer**, from the capo tag: whether the arrow
reads as "shapes → sounding pitch" without being told, and whether having the
*shape* key above the grid (`I–V–vi–IV · E`) and the *sounding* key up top
(`CAPO 2 → F♯`) is ever confusing. The arrow is the whole thing carrying that
distinction.

*(The Guide rewrite that was "next up" here is done — it became help mode,
v2.13.4. See the top of this file and item 6.)*

---

## Previously on the phone (v2.11.1) — signed off

The empty name row is **settled: no placeholder**. The rest of the typography
pass stands as shipped.

<details>
<summary>v2.11.1 detail, kept for reference</summary>

**The typography pass (v2.11.0 → v2.11.1).**
- **Panel legends are Jost** — the OFL Futura you chose, bundled (26.6KB) rather
  than referencing the system Futura, which is commercial and only free while
  every user is on Apple hardware. The rule now: **serif for what a control
  *says*, Jost for what the machine *calls* it, rounded only for fret digits.**
- **One label tier.** The Options sheet had two that looked nearly identical, with
  the *smaller* type on the caption that outranked the labels beneath it — which
  is why the two pages didn't feel like the same object. "Appearance" is gone.
- **The Guide "?" is the fourth header pill**, and **the name has its own row**
  under the capo, with the full width in every state (it was down to 35px with a
  capo set). At 375×553 the clearance under the grid goes 28px → 11px; on your
  phone the second row is invisible.
- **The two bugs you caught are fixed** — the grid no longer jumps when a name
  appears (the empty row was collapsing to 1px; it now reserves its height from
  the name's own font metrics, and there's a test that fails without the fix),
  and edit mode's dashed outline no longer crosses the progression readout
  (`outline` draws *outside* the box, so its reach was 7px into a readout sitting
  flush with the grid; the outline now reaches 5px and the readout is lifted 4px).
- Riding along: the capo value no longer inherits the label's letter-spacing, the
  sheet's ✕ is drawn rather than rendering in Arial, and the stepper's −/+ join
  the serif like every other typed glyph.

</details>

**Older items still worth an opinion once you've drilled with them:**
- **The Sound lamps are one tap further away** since the sheet became two pages.
  Metronome / Melody are the most mid-practice controls in there. Moving them to
  page 1 is a small change.
- **Buttons don't click while the transport is running** (v2.8.2) — which is what
  keeps them silent on a silenced phone. Side effect with the ringer on: you also
  lose the click during a take.
- **The progression list** — fine so far, but you expect to revisit which
  progressions are curated. Add/drop/reorder is a one-line data edit each.

---

## Big — design session first

### 1. Chord library + picker — THE PICKER IS DONE (v2.14.0); MORE QUALITIES IS THE OPEN HALF

**Done:** the root × quality picker, as two cylinders, and the library expanded to
the full 12 roots × Major/Minor/7. The templates refactor that item 1 called "a
real architecture change" turned out to be six templates and a rule, because
"whichever barres lower" was already the convention the hand-written barre chords
followed — see this session's CHANGELOG entry.

**Still open: more qualities.** Elliott's list was m7, maj7, ♭5, diminished,
augmented. Deliberately not started — your call was to see how three feels first,
and the wheel is built so a fourth quality is a template plus any open voicing,
applied to all 12 roots at once. Nothing structural.

Two things to weigh when you come back to it:
- **The generator never sees quality.** A chord reaches it as three role strings
  and a fret shape, so this is a left-hand and audio feature, not a right-hand
  one. Elliott hedged himself here ("maybe unnecessary, this is really a right
  hand exercise") and he had a point.
- **For this idiom, `sus2`/`sus4` and `add9` probably earn a slot before
  `maj7`/`m7`,** and `dim`/`aug` earn it least — they're also the only two with a
  model wrinkle (no perfect fifth, so the `fifth` role points at a ♭5/♯5 or
  collapses to root-only).

**Already answered:** your closed-voicing worry has a clean solution *in the
existing model, with no generator change* — a chord that declares root, alt and
fifth on the same string/fret makes the Travis preset alternate between identical
notes, i.e. exactly the thumb-on-root-only behaviour you proposed. So the jazz
shapes are a data convention, not new code.

**One thing the parsers will need first.** `chordRootPc` reads an id by stripping
`7` then `m`, which survives all 36 of today's chords. `Cmaj7` breaks it (strips
to `Cmaj`, no pitch class ⇒ the numeral reads `?` and the capo tag blanks), and
`Am7` breaks it silently (the suffix regex sees the `7` first, so capo 2 reports
`B7`). The fix is small and contained: chords already carry `rootId` and
`quality`, so those two functions read the fields instead of re-parsing the id.

---

## Medium

### 2. Pre-loaded patterns — OPEN, design already settled
Ship a set of good starting patterns as **read-only "Built-in" data** in the Load
sheet, with "save a copy" — *not* seeded into localStorage. That way they survive
reinstalls, never pollute your real library, and updates can add more. Fits the
"favourites as a folder within Saved" idea, and it inherits the capo context
field for free.

**Probably the best-value item on the list**, and the only big-ish one with no
decision blocking it. The one thing I'd want from you is the *patterns* — either
a handful you've saved and like, or a nod to pick a spread across the tiers.

### 3. Swing — DONE (v2.13.2)
One **SWING** slider on the Generation page, 50–75%, smooth like the Tempo one.
Straight is the off switch. It swings the **&s** — the beats never move, so your
thumb stays metronomic. 67% is your setting.

**Cut along the way, recorded so it isn't re-proposed:** the `2 & 4` resolution
(swings the thumb; a real feel, but not Travis picking — your call), and the five
named detents (Straight/Light/Medium/Hard/Triplet — you preferred the smooth
slider). Both are in git history if the argument ever changes. Also not doing:
bidirectional swing (sub-50 pre-delay), and any generator change.

**Nothing owed on it** — the Guide line about the `2 & 4` feel is moot now that
the feel is gone.

### 4. JSON export/import of the Saved library — OPEN
Insurance against iOS evicting localStorage after ~7 days of not opening the app.
The home-screen install is the main defence; this is the belt-and-braces one, and
it's the most *defensive* item on the list.

### 5. App icon: full bleed — OPEN, needs regenerated art
The icon is done and signed off (v2.9.2, built from Jerry's own theme values).
The remaining option: letting the disc colour run **edge to edge** instead of
sitting as a circle on a background band would buy ~20–25% more hand at the same
safe margin, and retire the last weak contrast pair (disc vs background, 1.57:1).
The hand is only 46% of the tile today. Needs new art, not a recolour.

---

## Small — numbers, copy, or a single decision

### 6. Revisit the Guide — DONE (v2.13.4), as help mode

Your call, and a better answer than the rewrite this item was expecting: instead
of a block of instruction-manual text, the `?` arms a mode in which tapping
anything explains it. See the top of this file for what to test.

The reason it beats a rewrite: the Guide's problem was never length, it was
*distance*. The pills are icon-only and the ABS/MIX chips are cryptic on purpose,
and a manual is the worst possible place to explain a glyph, because it's the one
place you can't compare the glyph to the thing. It also gave the old Guide's
indicator legend a home — inert things like the caution chip, the capo tag and
the readout are tappable in help mode, and they had nowhere else to live.

**Copy is data now** (`HELP` in `data.js`), which is the direct fix for how the
Guide went stale: it was prose buried in a DOM-building function, and was still
calling the Fingers menu "Chaos" three versions after you renamed it. A test
checks every control has copy and every entry is reachable, so that can't recur.

### 7. Unruly density — OPEN, only if the drilling says so
You once felt Unruly is occasionally "too much". Everything is numbers in
`CHAOS_PRESETS` (`maxRestrikes` 1 for milder, 3 for spicier). Generation was
signed off on guitar, so this only reopens if it bothers you again.

### 8. Chaos "stops sounding like Travis picking" (Elliott) — NEEDS A CALL
An accurate observation of what Chaos *is*: deliberately off the difficulty curve,
the novelty/discovery setting, per the spec and your session-6 call. Not a bug.
**Only worth reopening if you agree it's more useless than fun** — in which case
the fix is constraints on its column shapes, and it becomes "Unruly+" instead of
"random".

### 9. Chord shape diagram (Elliott) — ITS TRIGGER HAS FIRED (v2.14.0)
You called it redundant given the fret-number labels, and I agreed — *while every
chord was one you already knew*. The condition I wrote was "revisit if and only if
the library grows unfamiliar shapes", and it just grew 22 barre chords: the grid
tells you which frets the notes you *pick* are on, which is not the same as
knowing where to put your left hand for E♭m.

Not urgent, and not obviously worth the height — but it belongs in the **wheel**
(where you're choosing), never near the grid, and the wheel's panel is a
body-level overlay, so a small diagram beside the two reels costs nothing in
layout. Worth a look once you've drilled with the new chords and know whether you
actually reach for the unfamiliar ones.

### 10. Saved-name crowding — OPEN, only if it bites
Three buttons per saved item (Load / Rename / Delete) narrow the name column, so
long names ellipsize early. Fix if it annoys you: icon buttons, or a two-row
layout. (Note the *header* name is no longer cramped — that was v2.11.0.)

### 11. "Add to Home Screen" hint — OPEN, cheap
Elliott still reaches for it in Safari rather than the installed icon. If that's
common for people you share it with, a dismissible hint is a small piece of work —
and the home-screen install is also what protects saved patterns from iOS's
storage eviction, so it's not purely cosmetic.

### 12. More keys — DEFERRED by your call
All 12 keys, and sharp minor keys (Bm / F♯m / C♯m — these pull in new barre
majors). "Curate first, expand later."

---

## Decided — recorded so we don't re-litigate

- **16ths / syncopation: dropped.** At real Travis tempos the 8-slot grid is all
  you can fit; 16ths would generate patterns nobody drills.
- **Chaos sits off the difficulty curve** (Tame → Loose → Unruly is the curve).
- **PIMA stays lowercase** (classical convention).
- **No Major/Minor toggle** — the selected key's mode filters the progressions.
- **Pattern length is the only length dial**; bars on screen are derived.
- **Shared-cell editing** — editing a repeated bar edits all its repeats; raise
  pattern length to make one bar differ.
- **Note tokens are domes**, not chips (v2.5.2).
- **Menu labels show the concise idea** (`I–IV–V`), not the padded 4-bar literal.
- **Capo is shape-first** — you pick the shape and the capo, the concert key is
  derived. Sound-first ("I need B♭, what capo?") has no unique answer, so it
  would be a lookup helper on top, not a different model.
- **Buttons never sound on a silenced phone** (v2.8.2). The web can't read the
  ring switch, so the rule is "no button sound while the transport is running" —
  playback is the only window where they could punch through. Haptics can't
  substitute: iOS Safari has never shipped the Vibration API. Revisit both only
  if this ever becomes a real App Store app.
- **Bundled OFL faces, not system ones** (v2.11.0). Referencing a commercial
  system face is free only while every user is on Apple hardware, and you want
  this commercialisable.
- **No standalone "cleanup" session** (asked, session 18). The code isn't dirty:
  nine modules, all small, and a scan found only ~9 exports referenced nowhere
  (`romanize`, `romanDegrees`, `roleFor`, `modalOpen`, `SAVED_KEY`,
  `SCHEMA_VERSION`, `getTheme`, `savedThemeId`, plus `resolveMergedBar`, which is
  live but needlessly exported). A cleanup pass with no trigger is churn — it
  re-touches working code and re-opens verified layout. Instead: fold dead-code
  removal into whatever session next touches those files, and do the real
  structural tidy **attached to** the chord-library refactor, which is the change
  that would rewrite `data.js` anyway.
  **What genuinely did need it was the docs** — **done, session 19.** CLAUDE.md
  went 1,982 → 867 lines; the history is in `CHANGELOG.md`. The code cleanup
  itself is still deferred to whatever session next touches those files.
- **The chord picker is two cylinders, not a grid** (v2.14.0, your call) — a
  barrel that rolls under the thumb reads as part of the instrument; a grid of
  cells reads as a menu. Both chord pickers use it, so they can't diverge.
- **One spelling per pitch, app-wide** (v2.14.0) — flats for E♭/B♭, sharps for
  C♯/F♯/G♯, from one table that the wheel, the chord names and the capo tag all
  read.
- **The die rolls the whole library** (v2.14.0) — it used to roll open chords
  only. A picker that offers all 36 with equal ceremony should have a die that
  does the same.
- **"Chaos" is not a UI word any more** (v2.12.0) — the setting is **Fingers**
  and the off-curve tier is **Wild Card**, under an **Experimental** heading that
  future off-curve ideas can join. The internal ids stay `chaos` because saved
  patterns store them.

---

## Ground rules that constrain any of the above

- **The grid is the hero.** Re-measure **375×553** before shipping any chrome
  growth. The Options sheet is no longer the bottleneck (two pages, ~150px spare
  each; a control row is 58px). The **header is tight**: it's two rows / 55px
  since v2.11.0, and the clearance under the grid at 4 bars is down to 11px.
- **Keys / chords / progressions are data in `data.js`** — the generator stays
  untouched.
- **Three type voices, and the rule is *where the words sit***: serif inside a
  control, Jost above it, rounded only for fret digits. Adding a font means
  precaching it and bumping `CACHE`; two tests guard that.
- **Any new text that can contain ♭ or ♯ needs a pinned `line-height`** (those
  glyphs fall back off Fraunces to a taller font and grow the line box).
- **Tests stay green and grow with anything new** (`tests.html`). Layout
  invariants can be tested too — see the name-row check, which renders the real
  stylesheet in an iframe.
- **Deploy dance:** bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push,
  then check on the phone. Since v2.10.4 the precache forces the network, so a
  deploy can no longer install stale bytes.
- **The repo is public** — keep the GitHub noreply identity, never a real
  name/email.
