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

## On the phone right now (v3.2.4) — Cm6 / C♯m6 moved, one thing still open

**`Cm6` and `C♯m6` are now at your exact frets** — `8 10 10 8 10 8` and
`9 11 11 9 11 9`, the E-shape template's higher position instead of the
auto-picked lower one. Verified against your tabs exactly: same chord tones,
one clean full barre (not a stack), matching the diagrams you sent. The bass
alternation is unchanged either way (root ↔ 5th, same as before) — only the
neck position moved.

**Still waiting on you: F6 or F♯6?** Your tab (`1 0 0 2 1 1`) spells natural F
major 6th (F, A, C, D) — not F♯6 (which needs F♯, A♯, C♯, D♯). Since we'd been
discussing F♯6 all session, I want to check which you meant before touching
anything: F♯6 wasn't fixed by this shape (it has open strings that don't
transpose to F♯ without becoming a different shape), and F6 wasn't one of your
original four. Let me know and I'll wire in whichever you actually want.

**Budget untouched** — 55.09 / 384.84 / 11.06 / no overflow. 104/104 green.

---

## Previously on the phone (v3.2.3) — E♭add9 again, the die, and four more chords

**`E♭add9` is now `6 6 5 0 6 6`** — your fix. String 6 sounds (no more muting it),
and you don't need a partial barre: one finger moves between string 6 and string 1
(both fret 6) as needed, the same way a finger comes on and off string 6 for the
low bass note some players add under an open C. It's not just easier — B♭ (the
5th) now has a real bass-string home, so **Root–Fifth alternates E♭ ↔ B♭
properly** instead of going root-only, which the previous version couldn't do.

**The chord die can be tapped while its own wheel is open.** It sits right next
to the chord field, so the wheel's outside-tap catcher used to swallow the first
press — you had to tap twice to actually roll (once to close the wheel, once
more to hit the die). One tap now does both.

**The four chords you flagged — I got the read wrong on the first pass, then
corrected it.** You caught it: *"barres aren't a total deal breaker, especially a
standard all the way across type,"* and the muted, sparse alternatives I first
proposed were worse than what they replaced. Checked the shapes properly instead
of guessing again:

- **`C♯m6`, `Cm6`, `F♯6` are UNCHANGED.** All three are already the app's own
  movable barre-chord template — a full index barre across every string, with
  3–4 fingers layered on top in a tight window. That's exactly the "standard,
  all the way across" shape you said is fine, and it's what every other m6/6
  chord in the library already uses.
- **`Csus4` was the real outlier**, and it wasn't a template shape at all — a
  leftover hand-voicing from taking open C and bumping its 3rd to a 4th, which
  forces two disconnected partial barres (open C's own bass-string cluster and
  treble-string cluster don't touch). That's genuinely the thing you flagged.
  It's now `3 3 5 5 6 3` — one full barre, same family as the other three.
  Bonus: the bass improves too, root ↔ 5th instead of root ↔ 4th.

**Worth a look on the phone:** the new Csus4 shape (it used to ring an open G
string; that's gone now, traded for the cleaner single barre), and the E♭add9
diagram, which now shows two separate dots at fret 6 rather than a barre — check
that reads clearly and doesn't look like a smudge.

**Budget untouched** — 55.09 / 384.84 / 11.06 / no overflow. 104/104 green.

---

## Previously on the phone (v3.2.1) — your chord verdicts, actioned

**You were right and my ranking was wrong.** I'd sorted the awkward chords by fret
span, which put `G♯sus2` at the top and `Dadd9` well down the list — the opposite
of what you found. What actually makes a shape hard is a **low-fret note stranded
on the far side of a high-fret one**, forcing a finger back past the pinky. Your
partial-barre trick works precisely where the two same-fret notes are adjacent
(the sus2 shapes) and can't help where they straddle a higher note (the add9s).

- **`E♭add9` is revoiced to `x 6 5 0 6 6`** — your pick. One fret of reach. One
  trade to know: B♭ has no home on a bass string there, so **Root–Fifth and Dead
  Thumb play root-only on this one chord**. Travis and Alternating are unchanged,
  still E♭ ↔ G exactly as before.
- **`Dadd9` untouched**, per your fingering.
- **All six wide sus2/add9 barres kept**, per your call.
- **`A`, `Am`, `A7` now sound the open low E.** The diagram caught a real
  contradiction: all three muted string 6 but the thumb played it anyway as their
  fifth. Harmless to hear — it's A's fifth and every other A chord already sounded
  it — but the box was drawing an × over a string you can hear. There's now a test
  forbidding any chord from playing a string its own shape mutes.

**Worth a quick look on the phone:** the new E♭add9 in the wheel (it's the first
shape that sits up at fret 5–6 with an open string in it), and whether root-only
bass on that one chord bothers you under Root–Fifth.

---

## Previously on the phone (v3.2.0) — the chord-shape diagram

**The wheel draws the shape now.** Spin to a chord and the left-hand fingering
appears under the two drums — and the two dots your **thumb alternates between**
are in the grid's thumb colour, with everything else in the finger colour. That
marking is the reason it beats a diagram out of any chord book, and it's the
"root ↔ alt" column of `CHORD_REFERENCE.md` shown where you're actually choosing.

- It's in **both** chord pickers (the Options field and every per-bar chip), since
  they open the same panel. Key × Progression correctly grows no diagram.
- It **redraws when the wheel settles**, not on every detent, so nothing flickers
  while you spin.
- **What only the phone can judge: is it big enough?** It's 104px wide in a 237px
  panel. That's one number, and the panel's height follows it, so "bigger" is a
  one-line change.
- One thing to look at specifically: a **barre chord whose root sits under the
  bar** (G♯sus2, F, E♭). The bar is drawn in the finger colour with the bass dot
  on top of it — check that reads clearly rather than looking like a smudge.

### Your chord audit is 12 chords, not 120

I measured the library rather than guessing. 108 of the 120 are ordinary shapes
(span ≤ 3). **Eight of the ten qualities top out at a normal 3-fret barre** — all
the awkwardness is in the two you shipped last, plus sus4.

**Play these six first (5-fret spans):**
```
G#sus2   4 6 6 8 4 6   frets 4-8    ← the one I'd bet on failing
C#add9   4 4 6 8 6 4   frets 4-8
F#sus2   2 4 4 6 2 4   frets 2-6
Fsus2    1 3 3 5 1 3   frets 1-5
Badd9    2 2 4 6 4 2   frets 2-6
Bbadd9   1 1 3 5 3 1   frets 1-5
```
**Then these six (4-fret):** `C♯sus4`, `Bsus4`, `B♭sus4`, `E♭sus4`, `Dadd9`,
`E♭add9`.

**A different question, not a stretch:** the nine **E♭ shapes all sit at frets
6–8**, the highest in the library. Normal spans — it's about whether that
position is comfortable.

If any play badly, the fix is a hand-voiced form for those roots — a data edit,
the same shape as the `Dadd9` and `E♭add9` outliers already in there.

**Budget untouched** — 55.09 / 384.84 / 11.06 / no overflow. The panel is
237×342 at 375×553 with 194px to spare.

---

## Previously on the phone (v3.1.0) — the four deferred small fixes

All four items from your `NEXT_SESSION_PROMPT.md`. Nothing here is a new feature
except persistence.

**1. The app remembers your settings now.** Chord mode, chord, key, capo,
progression, thumb, fingers, pattern length, note labels **and BPM** come back on
relaunch. Loading a saved pattern also updates those defaults, so it genuinely
reopens how you left it. The capo persisting as a session default is separate
from the capo stored *inside* a saved pattern — that one still wins on load.

**2. The landscape bug is fixed, and landscape stays usable in a tab** (your
call). The cause was worth finding: the code that lifts a sheet above the iOS
keyboard was writing an inline height/top box on every viewport event and never
taking it off — so a box measured mid-rotation (when iOS briefly reports wrong
numbers) outlived the rotation, and a sheet closed during a turn carried a
landscape box into portrait. It now only pins while the keyboard is actually up
and clears the box otherwise, which means rotating self-corrects and there's no
orientation code anywhere.

**3. The Play bug has a real mechanism, and it explains your workaround.** iOS
has an "interrupted" audio state (a call, Siri, another app taking audio) where
`resume()` can hang forever or fail — and the flag that says "we're playing" was
set *after* that call, so the transport never started, the button sat on STOP,
and every later press retried the same dead path. Leaving and returning worked
because **iOS** clears the interruption, not because the app did anything. Now:
the resume can't hang (it's timed out), a context that won't wake is thrown away
and rebuilt, a failed start springs the button back to ▶ instead of lying, and
coming back to the app repairs the audio automatically — which is your workaround,
done for you.
- **What to watch for:** if it ever happens again, the tell is now different — the
  button should bounce back to ▶ rather than sit on ■. If you see *that*, tell me;
  it means the rebuild failed too, which is a different problem. If Play just
  works from now on, that's the fix.
- I could not reproduce the interruption on the dev box, so this is a mechanism
  that fits your symptoms exactly, not an observed cure. Your phone is the test.

**4. The dead-code list was half wrong.** Only three of the nine were actually
dead (`romanize`, `romanDegrees`, `modalOpen`) — deleted. The other six are live
and just over-exported, and we left them alone per your call.

**Budget untouched** — 375×553, 4 bars, progression, capo 4, hand-edited Custom
progression: 55.09 / 384.84 / 11.06 / no overflow. 96/96 green.

**Still open from that prompt's "also outstanding" list:** pre-loaded patterns
(needs you to pick them), the G♯sus2 stretch, and whether the key drum keeps its
MAJOR/MINOR headers.

---

## Previously on the phone (v3.0.1) — one chord fix

**`Dadd9` was D major** — it had no 9th in it at all. Fixed to `xx0252`. Found while
generating `CHORD_REFERENCE.md` for you, not by a test, so there's now a test that
checks every chord actually spells its quality (all 120).

**Two documents for you:**
- **`CHORD_REFERENCE.md`** — every chord with tab, notes, intervals, the thumb's
  root↔alt bass and max fret. It has a **"worth your eye"** section at the top
  listing the judgment calls I'd most expect you to overrule.
- **`NEXT_SESSION_PROMPT.md`** — the deferred small fixes (landscape, persisting
  settings, the intermittent Play bug) ready to paste into a new session.

---

## Previously on the phone (v3.0.0) — sus2 + add9, and the roll to V3

**The last two qualities are in: sus2 and add9** — and the version rolls to **V3**
to mark the finished chords + progressions revamp (your call). That finishes your
requested quality set (dim7 stays out). Library is now 120 chords; the quality reel
groups into Triads / Sevenths / Sixths / Suspended / Added.

- **What to judge on the guitar:** the **G♯sus2** stretch. sus2's movable E-shape
  keeps string 3 a real chord tone rather than muting it, which costs a 4-fret
  span; on G♯ that's frets 4–8. If it plays badly, the fix is a hand-voiced form
  for those few roots — a small follow-up.
- **The outliers you might glance at:** Dadd9 (its open, xx0232) and E♭add9 (a
  compact low form), both voiced to stay on the neck since the normal add9 barre
  would go past fret 8.
- Everything else — the reel grouping, the capo tag, the degree readout (Csus2 →
  Isus2, Gadd9 → Vadd9) — came for free from the session-30 parser work.

---

## Previously on the phone (v2.14.14) — new chord qualities (clean 5)

**Five new qualities are in: m7, maj7, 6, m6, sus4.** Your scope call — the clean,
idiomatic ones first for a guitar test; sus2/add9 next; dim7 dropped. The library
is now 96 chords, and the quality reel is grouped (Triads / Sevenths / Sixths /
Suspended).

- **What to play on the guitar:** the shapes are standard (open Cmaj7, Am7, Dm7,
  C6, Dsus4, etc.; barres for the rest). The one thing to listen for is the
  **maj7/m7 alternating bass**: on the E-shape roots (E, F, F♯, G, G♯…) the 7 sits
  on the alt-bass string, so the thumb alternates root ↔ 7 — the same trade dom7
  already makes. On the A-shape roots and the open forms it's the clean root ↔
  fifth. Tell me if the root↔7 bass bothers you on any of them; it's a one-line
  template flip per quality.
- **E♭sus4** is a special hand-voicing (the normal barre would need fret 9). Worth
  a glance that it's playable.
- **The capo tag and degree readout now handle the new suffixes** (Cmaj7 → Imaj7,
  Am7 → vi7). They were silently mis-parsing before this.
- **Not yet done:** sus2 and add9 (fiddlier to voice — held back per your "clean 5
  first"). Say when you want them.

---

## Previously on the phone (v2.14.13) — style names on the drum

**Category text is engraved on the progression drum, your design B.** After the
A/B/C render, you picked the non-selectable header row riding the barrel. Each
style (Foundations, Folk & Roots, Classic Country, Ragtime / Piedmont, Modern
Pop/Acoustic, Classic Standards) now prints as an engraved Jost-caps row above its
progressions, foreshortening with the barrel like any facet. The ungrouped Custom
keeps its plain groove (no name to engrave).

- **The key drum names its sections too** — MAJOR / MINOR — which fell out of
  building it generally. It reads well, but say if you'd rather the key drum stay
  just a groove and keep names to the progression drum only.
- **What only the phone can judge:** legibility of the 8.5px caps at arm's length
  (the barrel is narrow, so the longest name `Modern Pop/Acoustic` fits with only
  4.4px to spare — bigger would clip), and whether a header eating one of the five
  visible slots feels worth the naming when you're spinning. Font size and tracking
  are two easy dials if it wants to be bigger.
- **A drag begun on a header still spins the barrel**, and tapping a header does
  nothing (it's not a choice) — both by design, but touch is the one thing the dev
  box can't confirm.

---

## Previously on the phone (v2.14.12) — the progression revamp

**The chord-progression set is rebuilt to your master list.** Your scope call:
replace, but keep the two Classic Standards (I–IV–ii–V, I–vi–ii–V). It's **18
progressions** now (12 major + 6 minor), in your styles.

- **New this pass:** `I–II7–V`, the two ragtime loops **`I–VI7–II7–V7`** and
  **`I–III7–IV–V7`**, `I–IV–vi–V`, plus the minor `i–VII–VI–V7`, `i–iv–V7`,
  `i–iv–i–V7`, `i–VI–III–VII`, `i–III–VII–VI`. `I–V` now plays **two bars each**
  (`I I V V`) rather than alternating.
- **What to listen for on the guitar:** the ragtime `I–VI7–II7–V7` (C–A7–D7–G7) is
  the biggest character addition — a circle-of-fifths chain of dominant 7ths. And
  the minor blues / modern-minor loops are new territory for the app.
- **Dropped (10):** I–IV, I–IV–V, I–II–V (→ became I–II7–V), both I–♭VII folk
  loops, vi–IV–I–V, and the two short minor ideas i–VII / i–VII–VI. Say if you
  miss any and want it rescued like the Standards.
- Verified here: 89/89 green, the longer ragtime labels clip nowhere (drum, field,
  header all fit), and the height budget is untouched (11.06px clearance).

**Deferred to next, your ask: category text engraved on the progression drum.**
Non-selectable style captions on the barrel, in place of or alongside the divider
grooves. It's a wheel-mechanism change with a legibility judgment only the phone
can settle, so I'm holding it for a focused visual pass — the grooves stay as they
are for now.

---

## Previously on the phone (v2.14.11) — the polish pass, plus four of your notes

**Two sound-logic fixes (v2.14.11):**

- **Closing a dropdown by tapping its trigger sounds now.** You had it right — the
  invisible catcher that closes the menu sits on top of the button, so the close was
  landing on it, not the button. Now a tap that hits the trigger sounds the ka-chunk;
  a tap anywhere else off it still closes silently.
- **The tabs and Single/Progression only sound the popped-out one.** Pressing the
  one that's already in does nothing, so it's silent now — same as the capo at an
  end-stop.

**Two follow-ups off your v2.14.9 read (v2.14.10):**

- **The faders slide now, they don't push in.** The cap kept a pressed-in look while
  dragging; a fader glides, so that's gone. It just travels.
- **Edit mode has a "thock."** Placing or deleting a dot plays a felt-bottomed
  chess-piece sound — your image exactly. It follows the same rules as the other
  feedback: off when the Buttons lamp is off, silent during a take. Judge whether the
  felt/wood balance is right on the phone (it's two numbers to tune if not).

---

**The v2.14.9 pass, off your "take a full picky visual pass and recommend" ask.**
Audited every surface; three things were the last non-hardware elements, and you
took all of them.

- **The two sliders are FADERS now.** BPM (on the transport) and Swing (in its well)
  are a machined slot with the traveled portion filled in the accent and a raised
  cap with a centre groove — instead of the old flat track + round thumb. This is
  the biggest visual change; judge the feel and the cap size on the phone. The drag
  still works (checked here — a track tap drove BPM to 239).
- **The Sound toggles are LATCHING KEYS.** On = seated (pressed in, jewel lit,
  bright label); off = proud (raised, jewel dark, muted). Your flag was right — they
  were the one toggle that never moved. Now "on" reads as pressed in, like the page
  tabs.
- **Save / Load / confirm are CARVED accent keys.** Same accent as before (and still
  theme-driven, not literal gold — your note), but dished + chamfered like a real
  key rather than a flat painted slab. Rename/Delete got the carved finish too, so
  the Load sheet reads as one family. The red delete-confirm is carved to match.

**Your item-3 question (dropdowns as buttons) — discussed, left as wells.** A
dropdown holds a standing value, so it belongs with the well family, and this pass
makes the whole sheet a bank of wells; raising them would pull the transport's
strike-it material into the settings panel. Say if you want to see a raised version
anyway.

**Budget untouched** — 375×553, 4 bars, progression, capo 2: header 55.09 / grid
384.84 / no overflow. All of it was inside existing chrome.

---

## Previously on the phone (v2.14.8) — the materials pass, and act-on-release

- **The control-materials pass is built (you picked C).** The **die** is now a
  carved key in a recessed well, and **single/progression** is two carved keys in a
  well — both in the capo language, so the whole Options sheet is one family of
  recessed wells. Format seats with bright text and **no lamp** (the lamp stays the
  page tabs' signature, and the capo it's matching has none either). The one trade,
  which you accepted in the mockup: the options die now differs from the proud cream
  Generate die on the transport. Judge the seated read on the phone — is "which mode
  is on" clear enough without the gold?
- **The setup/preferences tabs act on release now, not on press.** You were right —
  the pointerdown fix killed the flash but committed on press, so the page flipped
  under your finger. They switch on *pointerup*, which holds while pressed and acts
  on release like every button, and still no flash. **Single/Progression works the
  same way** now (it's a seated key too). Confirm the flash is still gone and the
  release feel is right.

**A note on why C, not the mockup you approved:** the mockup gave Format a lit lamp,
but I hadn't shown it next to the page tabs — and a seated key + lamp *is* the tabs'
language, which you'd deliberately separated Format from in v2.14.5. So I rendered
A/B/C with the tabs alongside and you picked the no-lamp one. That keeps the lamp
meaning "page tab" and nothing else.

**Still open for discussion (item 3): dropdowns as buttons.** You wondered whether
the dropdowns, since they click in, should look like buttons too. My read: keep them
wells — a dropdown holds a standing value, and this pass makes the whole sheet a bank
of recessed wells, so raising the dropdowns would pull the transport's strike-it
material into the settings panel. No action taken; say if you want to see a raised
version.

---

## Previously on the phone (v2.14.6) — your v2.14.5 notes

All four done.

- **The tab flash is fixed, and you were right that we'd seen it before** — the die
  already carries the same eased shadow for the same "flicker on pop-out". But there
  was a second cause specific to a latching key: the tapped tab showed one frame of
  the *raised* state between the press and the latch. Pressing one of these keys is
  seating it, so those are one look now and there's no frame to see.
- **All five list menus wear the drums' material**, and the selected row is an
  aperture rather than a lit slab — hairlines above and below, glass lit, bled to the
  housing walls. That last part is the bit worth judging: the old accent capsule was
  the same object a pressed button wears, so it said "the one you just hit" instead
  of "the one in the window". Thanks for the correction on the count — Note Labels
  makes five.
- **The Options die is a tilted six**, same pips and same angle as the transport's,
  keeping its own engraved-on-a-flat-key form factor.
- **The "Custom is a readout" sentence is out** of the Key and Progression card.

Riding along, since it was the one caption left speaking in the wrong voice: the
section headers inside a list (COMPLEXITY / EXPERIMENTAL) are silkscreened now
rather than serif.

**Budget untouched** — 375×553, 4 bars, worst case: 55.09 / 384.84 / 11.06 / no
overflow. Sheet 330.5px in both chord modes.

---

## Previously on the phone (v2.14.5) — the second drum, and the page tabs

**Key × Progression is a drum picker now**, and your reframing is why: read as
*style* × progression the axes have holes, but key × progression is the thought you
actually have, and it's total within a mode. So progression mode wears the same
split field as single mode and opens the same 237px housing — two drums, key on the
left, progression on the right.

- **The style groups survive as engraved grooves**, your idea. One at each style
  change, one before Custom, and one on the key drum between the major and minor
  keys.
- **Crossing major/minor re-cuts the progression drum** — that's the one hole in
  the product, and it's the same boundary where the app already resets to that
  mode's first progression.
- **Custom behaves exactly as you spec'd, and needed no code**: picking it leaves
  the grid alone, and editing a bar chord puts the drum on it next time you open.
  Both were already true; I verified rather than assumed.

**The page tabs are a latching key pair** — C with B's flavour, as you asked. Narrow
engraved keys in the silkscreen font, each with a jewel; the current page is held in
with its lamp lit, the other stands proud and dark. The seated look needed more
contrast than my first pass gave it (at 10px it only reads once the cap highlight is
removed), so judge it on the phone. The sheet came out 2.5px shorter as a side
effect.

**What only the phone can judge:** whether the key drum's 72px face feels cramped
next to the progression's 124px, whether the groove is visible enough at arm's
length, and whether the tab keys read as pressable now.

**Budget untouched** — 375×553, 4 bars, worst case: 55.09 / 384.84 / 11.06 / no
overflow. Both chord modes measure pixel-identically.

---

## Previously on the phone (v2.14.4) — your v2.14.3 notes

Four of the five actioned; the two you weren't ready to commit on are further down
as **item 13**, untouched.

- **Both chord modes are one width now.** Key + Progression sum to exactly what the
  chord field occupies, so the wells line up when you switch. The split is 90 / 139
  because the Progression menu's longest value (`I–♭VII–IV`) needs 111px of well and
  its legend needs 87px; it clears by ~28px.
- **The die is back beside the chord**, the whole group is centred, and the group is
  pixel-identical in both modes (42 → 333, die 287 → 333, both ways).
- **The capo is right-aligned**, done by moving the row's empty slot into the middle
  — which keeps its legend over its own stepper instead of floating left of it.
- **BPM can't be long-pressed and copied.** It was a readout, so it was in neither
  touch list.
- **No page scroll, no rubber-band, no pinch or double-tap zoom.** This reverses the
  old decision to leave the viewport zoomable, so it's recorded as a reversal.
  Deliberately `touch-action: pan-y` and not `none`: `none` would also kill panning
  in the wheel's reels, the dropdown panels, the saved list, and the grid's own
  overflow valve on a very small screen.

**What only the phone can tell us:** pinch, double-tap and long-press — the dev box
has no touch at all. Verified here instead: the BPM slider still drags 90 → 240
under a real drag, the reels and list panels still scroll, and the document doesn't.
One fact worth knowing if pinch still works in a Safari tab: iOS has ignored
`user-scalable=no` in tabs since iOS 10 and only honours it in the installed app.

**A bug the refactor exposed:** the die had `width: 100%`, which only worked because
a grid track was feeding it. Turning the row into a flex group collapsed it to 21px.
Fixed at 46px with a test asserting ≥ 44.

**Budget untouched** — 375×553, 4 bars, worst case: 55.09 / 384.84 / 11.06 / no
overflow.

---

## Previously on the phone (v2.14.3) — two of your UI notes

**The chord field is the size of the wheel it opens.** 289px → 237px, and not by
hard-coding it twice: the drum geometry is one set of `:root` values that both the
panel and the field derive from. Two things fell out of it — the field's halves
are now the two barrels (88 / 108) rather than a guessed ratio, and because a
panel anchors to its trigger's left edge, each barrel opens exactly over its own
half. Also fixed while measuring: each legend was sitting 10px left of the well it
names.

**Format spells "Progression" out.** The dead third slot gave up its slack;
the capo stepper keeps exactly the width it had.

**One thing to know**, because it nearly shipped: naming that row `.context`
collided with the grid readout's `.context` rule, which doubled both its legends
and grew the row 13px. The screenshot looked right; the row height didn't. Renamed,
and there's a test comparing legend heights across rows now.

**The height budget is untouched** — re-measured at 375×553, worst case: 55.09 /
384.84 / 11.06 / no overflow, identical to v2.14.2. The sheet is 333px in both
chord modes, same as before.

**The help cards are back to how they were.** "Count-In" and Wild Card's
off-the-curve line are both out again and marked SETTLED so they stop coming
back. The one copy change that stayed is the Format card, which had to stop
saying "Prog.".

**The wheel is SIGNED OFF** (v2.14.4, your call): the detent's voice, the feel of
the spin, the roundness, the die rolling all 36, and the **F7 / F♯7 / G♯7 root ↔ ♭7
bass** are all good as is and not to be revisited unless you raise them.

---

## Previously on the phone (v2.14.2) — THE CHORD WHEEL

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

Everything that was riding alongside it is now closed: the two help-copy reversions
(built, then reverted on your read — settled), the wheel's feel and the F7 bass
question (signed off), and Wild Card / Unruly (keep). What's left needing you is
**the patterns**, plus the two discussion items in item 13 and the two still-open
opinions in item 1 (more qualities) and item 9 (the chord-shape diagram).

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

**More qualities — DONE (v2.14.14 + v2.14.15).** The clean 5 (m7, maj7, 6, m6,
sus4) shipped in v2.14.14; sus2 + add9 followed in v2.14.15. **dim7 dropped** by
your call (no perfect fifth ⇒ no alternating-bass target). The requested set is
complete — library is 120 chords (12 × 10). Only open thread here is *if* the
G♯sus2 stretch plays badly on the guitar, hand-voice those few roots.

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

### 7. Unruly density — CLOSED (v2.14.4, your call)
"Keep it." Everything is still numbers in `CHAOS_PRESETS` (`maxRestrikes` 1 for
milder, 3 for spicier) if it ever bothers you again.

### 8. Chaos "stops sounding like Travis picking" (Elliott) — CLOSED (v2.14.4, your call)
"Keep it." Wild Card stays the off-the-curve discovery setting. Elliott's
observation was an accurate description of what it is, not a bug.

### 9. Chord shape diagram (Elliott) — DONE (v3.2.0)

Built in session 33, in the wheel exactly as this item argued. The trigger
condition written here — "revisit if and only if the library grows unfamiliar
shapes" — was met at 120 chords, 75 of them barres. It marks the thumb's
alternating pair, which is the part a generic chord chart can't do. See the top
of this file.
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

### 13. Drums elsewhere, and the page tabs — BOTH ANSWERED (v2.14.5)

**The tabs are done** — a latching key pair, your C-with-B's-flavour. See the top.

**Drums elsewhere is mostly answered too**, by your own reframing. The rule that
came out of it: a drum earns its place where the axes are a **cross-product you'd
say out loud** ("an E major", "a 1-4-5 in C"), and loses to a list where the values
are unrelated words you scan. Both cross-products are now drums. What's left:

- **Thumb, Fingers, Pattern, Theme** stay lists. They're short unordered sets; a
  barrel would be ceremony.
- **The materials now match — DONE (v2.14.6, your call).** All five list panels wear
  the housing, with the selected row in an aperture. See the top.
- **A correction to what I told you earlier:** I said Key was a good drum candidate
  because it's 12 roots × a mode axis. It isn't today — there are only 7 curated
  keys — and the key drum you now have is a 7-name reel with one groove in it. It
  becomes a genuine two-axis picker only if item 12 (all 12 keys) ships, at which
  point root × mode is 12 × 2. **So item 12 and a Key×mode drum are one job or
  neither.**

**The button-forms question is ANSWERED and BUILT (v2.14.8, your call: C).** The
list *panels* joined the drums in v2.14.6; the *controls* now join the capo. The two
outliers — the **die** (was a proud raised key) and the **single/progression** active
cell (was a flat gold slab) — are both carved keys in recessed wells now, so the
whole Options sheet is one family. You picked **C** (seated, no lamp) over the
mockup's B (seated + lamp), because a lit lamp is the page tabs' signature and the
capo has none. The one accepted trade: the options die diverges from the proud
Generate die on the transport. On the phone for your read of the seated look.

**What's still an open discussion (item 3): the dropdowns.** Wells or buttons? My
argument for wells is at the top and in the CHANGELOG; no action taken.

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
  went 1,982 → 867 lines; the history is in `CHANGELOG.md`.
  **The code cleanup rode along in session 32, and the list above was half wrong:**
  only `romanize`, `romanDegrees` and `modalOpen` were genuinely unreferenced
  (deleted). The other six are all live *internally* and merely exported
  unnecessarily — left alone by his call, since dropping an `export` keyword is
  churn on working code for no gain.
- **BPM persists across launches** (session 32, his call) — which **reverses** the
  earlier rule that tempo is too volatile to remember, unlike swing. It lives in
  the new `tp-prefs` store with the rest of the set-once-and-keep controls.
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
