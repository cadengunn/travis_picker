# CHANGELOG — Travis Picker

The session-by-session record, newest first. **Architecture, invariants and the
rules that still bind live in `CLAUDE.md`**; this file is history — why things
are the way they are, what was tried, and what was deliberately cut.

Entries are the original session notes, moved here verbatim in session 19. Where
a later session overturned something an entry states as present-tense fact, a
**⟶ SUPERSEDED** line marks it — the original text is left standing, because the
reasoning that led to it is usually still the useful part.

| session | versions | what it was |
|---|---|---|
| [34b](#where-things-stand-session-34b--v330-2026-08-03) | **v3.3.0** | the chord diagram shows the MOVING FINGER as a hollow dot (no established symbol exists; this borrows the fingerstyle "alternate bass" ring). Root-only accent replaces marking the thumb's whole pair. B7 added; G#6 revoiced to his fingering |
| [34](#where-things-stand-session-34--docs--tests-2026-08-03) | *(no version)* | adversarial review: CLAUDE.md became a hub and `DESIGN.md` was split out (1,570 → 990 lines, 18.2k → 11.0k words); the four sleeping tests stopped waiting on the wall clock, and the wheel "flake" turned out to be the screenshot resizing the pane |
| [33g](#where-things-stand-session-33g--v326-2026-08-03) | **v3.2.6** | real bug caught by ear: F#6's alt===fifth collapsed Travis's bass to one repeated note; fixed + a new library-wide guard test; plus two audits answering "anything else like this?" |
| [33f](#where-things-stand-session-33f--v325-2026-08-03) | **v3.2.5** | F#6 revoiced to his tabs, a moving-finger root/5th bass (same technique as Ebadd9) that reads as four static positions but plays as the ordinary thumb+3-fingers |
| [33e](#where-things-stand-session-33e--v324-2026-08-03) | **v3.2.4** | Cm6/C#m6 moved to the E-shape template's higher position (his exact tabs), fret ceiling raised to 12 as a named exception; F6-vs-F#6 mapping caught and held pending his answer |
| [33d](#where-things-stand-session-33d--v323-2026-08-03) | **v3.2.3** | four more chords flagged too hard, corrected: full barres are fine, only Csus4's two-disconnected-partial-barres was real, revoiced to a single standard barre |
| [33c](#where-things-stand-session-33c--v322-2026-08-03) | **v3.2.2** | E♭add9 revoiced again (string 6 sounds now, no partial barre — Root–Fifth alternates properly); the chord die can be tapped while its own wheel is open |
| [33b](#where-things-stand-session-33b--v321-2026-08-03) | **v3.2.1** | he played the chords: span was the wrong difficulty metric — `E♭add9` revoiced, `Dadd9` and the six wide barres kept, `A`/`Am`/`A7` now sound string 6 (the chord box exposed it), plus two guards |
| [33](#where-things-stand-session-33-2026-08-03) | **v3.2.0** | the chord-shape diagram under the wheel's drums, marking the thumb's alternating pair (item 9's revisit condition finally fired at 120 chords / 75 barres); plus the measurement that cut his playability audit from 120 chords to 12 |
| [32](#where-things-stand-session-32-2026-08-02) | **v3.1.0** | the four deferred small fixes: settings persist (`tp-prefs`, BPM included — a reversal); the intermittent dead Play traced to an iOS `"interrupted"` AudioContext and hardened; the landscape sheet bug fixed at the cause (a stale inline viewport box); 3 of 9 "dead" symbols actually dead |
| [31](#where-things-stand-session-31-2026-08-02) | **v3.0.0** → v3.0.1 | the last two qualities — sus2 + add9; completes the requested set (dim7 stays out); library now 120 chords. **V3 marks the finished chords + progressions revamp (sessions 29–31).** Then v3.0.1: Dadd9 was D major — fixed, plus a chord-tone test |
| [30](#where-things-stand-session-30-2026-08-02) | v2.14.14 | new chord qualities — the clean 5 (m7, maj7, 6, m6, sus4); quality reel grouped; id parsers unified through splitChordId |
| [29](#where-things-stand-session-29-2026-08-02) | v2.14.12 → v2.14.13 | the progression revamp (ragtime/Piedmont secondary dominants, minor blues, modern minor); then engraved style-name headers on the drum (his design B) |
| [28](#where-things-stand-session-28-2026-07-30) | v2.14.9 → v2.14.11 | a full hardware-polish pass (faders, latching Sound toggles, carved accent keys); then the fader slides + an edit "thock"; then two sound-logic fixes (dropdown close, no-op latch) |
| [27](#where-things-stand-session-27-2026-07-30) | v2.14.8 | the control-materials pass built (die + Format → wells); the tabs act on release, not on press |
| [26](#where-things-stand-session-26-2026-07-30) | v2.14.7 | the tab flash (pointerdown, for real this time); the Play press de-weighted; a consistency mockup |
| [25](#where-things-stand-session-25-2026-07-29) | v2.14.6 | the list panels joined the drums' language; the tab flash; the Options die |
| [24](#where-things-stand-session-24-2026-07-29) | v2.14.5 | Key × Progression became the second drum picker; the page tabs became a latching key pair |
| [23](#where-things-stand-session-23-2026-07-29) | v2.14.4 | his v2.14.3 notes: one width for both chord modes, the die back beside the chord, the document locked |
| [22](#where-things-stand-session-22-2026-07-29) | v2.14.3 | two of his UI notes: the chord field cut to the wheel, and "Progression" spelled out |
| [21](#where-things-stand-session-21-2026-07-29) | v2.14.0 → v2.14.2 | the chord wheel: two cylinders, and the library became the full 12 × 3 matrix |
| [20](#where-things-stand-session-20-2026-07-28) | v2.13.5 → v2.13.6 | help mode adjusted against his drilling, then his copy revision: 30 cards → 28 |
| [19](#where-things-stand-session-19-2026-07-28) | v2.13.4 | the docs split into CLAUDE.md + this file; the Guide became help mode |
| [18](#where-things-stand-session-18-2026-07-27) | v2.12.0 → v2.13.3 | naming (Fingers / Wild Card), capo tag, swing — trialled, spec'd, cut back |
| [17](#where-things-stand-session-17-2026-07-27) | v2.10.4 → v2.11.1 | the stale-precache bug; the typography pass (Jost) |
| [16](#where-things-stand-session-16-2026-07-26) | v2.9.3 → v2.10.3 | background-audio pile-up; the capo; the two-page Options sheet |
| [15](#where-things-stand-session-15-2026-07-26) | v2.9.0 → v2.9.2 | the app icon: drawn artwork, and Jerry as the default theme |
| [14](#where-things-stand-session-14-2026-07-26) | v2.8.0 → v2.8.2 | `platform.js` — wake lock, audio session, auto-update; icon-only pills |
| [13](#where-things-stand-session-13-2026-07-24) | v2.7.0 → v2.7.5 | the musical-content pass: keys, tokens, dom7 chords, grouped menus |
| [12](#where-things-stand-session-12-2026-07-24) | v2.5.4 → v2.6.3 | the Guide; Roman numerals; the two-phase button sound |
| [11](#where-things-stand-session-11-2026-07-23) | v2.5.0 → v2.5.2 | our own modals + dropdowns; button sound; note domes |
| [10](#where-things-stand-session-10-2026-07-23) | v2.4.2 → v2.4.5 | the A3 generation fix; the hardware-details pass (lamps) |
| [9](#where-things-stand-end-of-session-9-2026-07-23) | v2.2 → v2.3 | the seven-theme colour pass |
| [8](#where-things-stand-end-of-session-8-2026-07-22) | v2.1 | the visual-identity pass: the tweed faceplate, Fraunces |
| [7](#where-things-stand-end-of-session-7-2026-07-22) | v2.0 | pattern audio playback (Karplus-Strong, palm-muted bass) |
| [6](#where-things-stand-end-of-session-6-2026-07-21) | v1.2 → v1.6 | the difficulty model, tuned over five rounds on a real guitar |
| [5](#where-things-stand-end-of-session-5-2026-07-21) | v1.0 → v1.1 | all seven bass presets; the first chaos redesign |
| [4](#where-things-stand-end-of-session-4-2026-07-20) | v1.0 | PWA packaging, GitHub Pages, first hardware test |

Sessions 1–3 predate these notes: the generator and grid, progression mode, the
Saved library, the manual editor and the metronome. `travis-picker-workflow.md`
has the original build order.

---

## Where things stand (session 34b — v3.3.0, 2026-08-03)

**His ask:** on a chord like open C, where a left-hand finger switches what it's
fretting back and forth along with the bass, show it. He floated a box or a
double-headed arrow, and asked the right question with it — *"not sure if there
is a symbolic convention for this already."*

**There isn't one.** Chord-box notation is static-shape notation; movement lives
in tab. The two nearest real practices are the same fingering NUMBER printed on
two dots, and a **hollow or dashed dot for an optional/alternate bass note**,
which turns up in folk and fingerstyle method books for exactly this
Travis-picking case. So he landed on hollow himself mid-discussion, and it
borrows rather than invents. **He then cut the dashes I'd paired with it** —
"dashed may not read at small size" — and he's right: at r=4.6 a dashed stroke
reads as a rendering artifact.

**Which forced a second change, and it's the one that makes the symbol work:**
the open-string markers are **filled discs** now, where they were rings. Hollow
has to mean exactly one thing. Position already says "open" (nothing else is
drawn above the nut but × and ○), so the ring was free to be reassigned.

### Root-only accent — a REVERSAL, his call

The box accented the thumb's whole alternating pair (root + alt), and CLAUDE.md
justified that as "the one thing a chord chart out of any book cannot tell you
and the reason it earns space." He reversed it: root-only is what an ordinary
chord chart marks, and **"thumb is implicit in which string it's on anyway"** —
strings 6/5/4 are its domain, so the second accented dot was spending colour on
what the layout says for free. Flagged the trade before building it; he'd already
reasoned past it. The `cb-thumb`/`cb-finger` classes became lies under the new
rule and are `cb-root`/`cb-note`.

### It has to be DATA, and that was measured

The obvious rule — two bass-role strings at the same fret on adjacent strings —
**fires on 82 of the 120 chords, and is wrong on most of them.** The counterexample
that kills it is the plain barre: in `F` the fifth (string 5) and the alt bass
(string 4) are adjacent at the same fret, but ring and pinky hold both and nothing
moves. In an A-shape barre they're both under the index. What makes C different
isn't geometry, it's fingering — the low bass note is an EXTRA beyond the standard
three-finger shape, so you either add a pinky or shift a finger you're using. No
shape can say that, so `MOVING` in `data.js` is declared per chord.

He took "I propose, you check" for the content. Filtering the 82 down produced
**exactly one addition, B7**, which he confirmed: the open B7 you actually play
(`x21202`) commits all four fingers, and we fret string 6 at 2 so the fifth role
has a note — so the middle finger moves off the root onto the low F♯, exactly like
C. Everything else was ruled out by group (template barres hold both notes; the
E/A/D/G open families hold theirs with two fingers).

Declared set: the open **C family**, **B7**, **E♭add9** (strings 6↔1), **F♯6**.

### G♯6 revoiced to his fingering

`4 6 6 5 6 4` (auto-derived E-shape barre) → **`4 3 1 1 1 1`**, an index barre
across strings 4–1 at fret 1 with ring on 5 and pinky on 6. It spells G♯, C, D♯,
G♯, C, F.

**The roles swap with the shape, and that's the real gain:** string 4 now carries
the true 5th (D♯) and string 5 the 3rd (C), so `fifth: 4`, `alt: 5`. Root–Fifth
alternates G♯ ↔ D♯ properly, and Travis walks G♯–C–D♯–C — three distinct notes
instead of the root-and-octave the E-shape gave. "Walk to the 3rd" for the alt is
the convention Gadd9 and F♯6 already use.

### Verification

The replaced test is worth noting: `chordbox: the thumb's alternating pair is
marked, and only that pair` asserted the OPPOSITE of the new rule, so it was
replaced rather than adjusted — the surviving half (a root under a barre must
still show, the G♯sus2 case) is kept. The new moving-finger check was **verified
to fail without the fix** ("C: exactly one dot may be hollow, got 0") rather than
pass vacuously. Both new chords' notes, roles, Travis and Root–Fifth walks were
read out of the running app rather than reasoned about. 106/106 green, budget
unchanged at 55.09 / 384.84 / 11.06.

---

## Where things stand (session 34 — docs + tests, 2026-08-03)

**An adversarial review, not a feature session** — his framing: "go in looking
for what should change, not for reasons it's fine." Three foci, and the answers
came out uneven: one was a bigger win than expected, one had a false premise, and
one was a genuine "leave it alone".

### 1. The docs — CLAUDE.md is a HUB now, and `DESIGN.md` exists

CLAUDE.md had grown 867 → 1,570 lines since session 19's cut, and it's the one
doc auto-loaded every session, so it's the actual lever on token usage.
Architecture alone was **72% of the file**.

The first pass trimmed it to ~1,240 by cutting reaching-it narrative — the
tab-flash saga, Csus4, E♭add9, the retarget bug, the aperture pass — every one of
which was checked against this file before deletion. **The rule applied to every
cut: keep the invariant + one sentence of why + a "(session N)" pointer.**

That plateaued around 1,240, well short of the ~850 he'd picked, because what
remained was genuinely dense. **His idea is what unlocked the rest:** *"CLAUDE.md
can be more of a hub that points to any lengthy details. No reason to read over
all the visual stuff if we're only worried about generation."* So the visual
material — the faceplate, the four material families, type, themes, touch
hygiene, and the geometry of the Options sheet and the drum pickers — moved to a
new **`DESIGN.md`**, read on demand.

**The boundary rule, which is the part worth keeping:** does this constrain work
that *isn't* visual? Then it stays in the hub. Does it only matter once you're
already editing appearance? Then it moves. So the height budget, "no scrolling
ever", the pinned `line-height` on accidentals and "adding a font means precaching
it" all stayed — those bite someone working on the generator.

Final: **CLAUDE.md 1,570 → 990 lines, 18,168 → 10,986 words (-40%)**, plus a
352-line `DESIGN.md`.

**A second rule earned its place: file-local mechanics stay in the file.** The
wheel's mask ramp, the reel step/facet split and the `.seg-tabs` specificity trap
are all commented in `wheel.js`/`styles.css` at the line that does them — and the
copies in CLAUDE.md had already drifted. CLAUDE.md said the mask was 8/92; the
stylesheet says 6/94. Documented the *rule* in the doc, the *mechanism* in the
code.

**Five stale facts found and fixed against the code** while cutting:
- the chord library read "FULL 12 × 3 MATRIX — 36 chords" (it's 12 × 10 = 120)
  and "14 hand-declared / 22 derived" (it's 34 / 86)
- three of the six progression styles listed no longer exist (they were replaced
  in session 29)
- the lamp-colour rule still said "the Guide" explains the indicators; the Guide
  became help mode in v2.13.4
- a dangling half-sentence about `infoModal`'s `render(bodyEl)`
- the dev-box limits said "three real limits" over a list of four

### 2. The tests — the premise was half wrong, and there was a live problem

He asked whether 105 tests is too many, flagging the layout/wheel ones as "the
heaviest and slowest". **Measured per-check rather than assuming, and the layout
tests are 10–27ms each** — the real-stylesheet iframe is cheap. They were never
the cost.

**The cost was four checks that sleep on the wall clock:** the three wheel ones
(7.1s / 12.0s / ~10s) and the metronome's "resume that NEVER settles" (7.7s) —
~35s of a run that is otherwise near-instant, and enough to stall the whole page
in a throttled tab. `SETTLE_MS` and `RESUME_TIMEOUT_MS` are injectable now;
defaults untouched, so the shipped app behaves identically. The metronome check
went 7,711ms → 2,579ms *in the throttled tab*.

**The "flaky wheel test" was not a wheel bug, and finding that out mattered more
than the speedup.** An open `.dd-panel` closes on any window `resize`
(dropdown.js's `reflow`) — and taking a screenshot resizes the Browser pane. That
closed the panel mid-test, after which the test went on driving a **detached**
panel and failed somewhere downstream with a misleading message. Two consequences
recorded in CLAUDE.md's dev-box limits: `tests.html` makes no progress at all in a
hidden tab until something forces frames, and a screenshot taken *during* a run
perturbs it.

**On the count itself: nothing was cut.** Going through all 105, none turned out
to be pinning a signed-off decision that couldn't silently break. 105 is
defensible for a no-build app whose real target is a phone the dev box can't
reach.

### 3. Chord/progression code — leave it, and this is the reasoned version

- **`data.js`'s hand-declared chords: per-chord commentary is right.** The four
  overrides override "whichever barres lower" for four *unrelated* reasons (a
  bass-role bug, a technique note, a stale voicing, a neck-position preference).
  There's no shared shape to extract — a common abstraction would have to be
  "reason: string", which is what the comment already is. And `data.js` isn't
  auto-loaded, so its verbosity costs nothing per session.
- **`chordbox.js`'s model/render split held up.** The three real bugs that ran
  through it in session 33 (barre-vs-bass-role colour, the open-string-with-high-
  frets anchor, mute-vs-open) all landed in `chordBoxModel` and were all testable
  there without touching SVG.
- **`app.js` at 1,562 lines stays one file.** It's sectioned, it's the one
  stateful file by design, and splitting it is churn that re-opens verified
  layout for no measured gain.

**No behaviour changed anywhere this session.** Two app files were touched
(`wheel.js`, `metronome.js`) purely to add injectable test seams at unchanged
defaults, so there is nothing to check on the phone and nothing was deployed.

---

## Where things stand (session 33g — v3.2.6, 2026-08-03)

**He caught a real bug by ear within minutes of v3.2.5 shipping:** "something
strange with the F♯6 Travis bass pattern." No test flagged it, and it wasn't
visible on the guitar box diagram — only audible.

**The cause: `alt` and `fifth` both pointed at string 6.** That was the
previous session's own choice — "the moving note IS the 5th," so both roles
were set to the same string. Reasonable-sounding, but Travis's cycle is
`root-alt-fifth-alt`, and `alt === fifth` collapses three of the four beats
onto the identical note. F♯6 was playing **F♯, C♯, C♯, C♯** — one note, then
silence-in-disguise, not a walking bass.

**The fix separates the two roles properly.** `fifth` stays string 6 (the
genuine 5th, still correct for the Root–Fifth preset, still the "moving
finger" note he described). `alt` moves to string 4 — the 3rd (B♭), which is
already fretted as half of the existing strings-4/3 partial barre, so it costs
the hand nothing new. This is the same "walk to the 3rd" convention `Gadd9`
already uses. Travis now plays **F♯, B♭, C♯, B♭** — three distinct notes, a
real walking bass. Root–Fifth is unaffected (it never used `alt`); simple_alt
now alternates root ↔ 3rd instead of the silently-broken root ↔ 5th.

**A new test closes the whole class of bug**, not just this one instance:
`alt !== fifth` is now asserted across all 120 chords. Verified against the
pre-fix data before writing it — the check returned exactly `["F#6"]`, nothing
else, confirming both that the bug was real and scoped, and that the test
would have caught it on sight.

**He also asked the right follow-up: are there other chords with the same
problems we just fixed?** Two separate questions, two separate audits:

- **Csus4's exact structural issue** (an open string sitting between two
  disconnected partial-barre clusters, forcing two independent barres with
  nothing linking them) — **swept all 120 chords, zero other matches.** An
  early pass of the detector flagged `C6` too, but that was a false positive:
  `C6`'s clusters are directly adjacent with no gap between them (a smooth
  descending staircase, the easy classic open-C6 shape), not the same problem
  at all. Refining the detector to require a genuine open/muted gap between
  clusters — and cross-checking against `chordbox.js`'s own already-tested
  barre logic, rather than a new ad hoc heuristic — cleared that false
  positive and confirmed the sweep.
- **Cm6/C♯m6/F♯6's "which template position" choice** — computed both the
  E-shape and A-shape barre position (and the *actual* max fret each one
  reaches, not just the barre fret) for all 24 maj6/min6 chords. The reason
  these three specifically needed a second look isn't arbitrary: E-shape and
  A-shape barres are always a fixed distance apart on the neck, and only for
  roots around C/C♯/D/F♯ do *both* options land in a comparably moderate
  range (roughly frets 4–11). For every other root, the auto-picked position
  is already low (max fret 2–6) and the alternate is meaningfully higher
  (7–13, sometimes exceeding the fret-12 ceiling entirely) — not a real choice,
  just a worse option. **Nothing else in the family is a genuine toss-up the
  way these three were.**

105/105 green (104 → 105 with the new guard test). Budget re-measured,
unchanged: 55.09 / 384.84 / 11.06 / no overflow.

---

## Where things stand (session 33f — v3.2.5, 2026-08-03)

**F♯6 got its own shape too, a day and a "maybe?" after Cm6/C♯m6.** His tab:
`9 9 8 8 11 9`. Notes checked out immediately — C♯,F♯,B♭,E♭ is exactly F♯6's
formula — but the fingering was worth a second look before committing it.

**A structural read almost held this one back for the wrong reason.** Read as
a static, all-simultaneous shape, this needs four separate fret/string
contacts across a 4-fret span (a 2-string barre at fret 8 on strings 4/3, plus
three more individual positions at frets 9/9/11) — objectively more contact
points and a wider span than the shape it replaces. Flagged that before
applying anything. **His answer reframed the whole question:** *"This is one
of those where you move the finger back and forth for the bass like on C."*
The root (string 5) and the 5th (string 6) sit at the *same* fret (9) on
*adjacent* strings — for fingerpicking, the thumb only ever needs one of them
at a time, so one fingertip relocates between the two rather than holding both.
That drops the real requirement back to the ordinary thumb + 3 fingers every
other chord in this app already assumes; the "four simultaneous points" framing
was analyzing it as a strummed chord, which this app doesn't do.

**Same technique as `E♭add9`,** which is what made the reframe immediate
rather than a fresh puzzle: the app doesn't model *how* a string gets fretted,
only *what* sounds, so the data is just the plain shape — `alt` and `fifth`
both point at string 6, since the moving note is the 5th, and Travis/
Root–Fifth alternate F♯ ↔ C♯ exactly as the old shape did.

`F♯6` joins `Cm6`/`C♯m6` as a named exception to "whichever barres lower" —
now three chords, not two, all justified by the same raised (and still
scoped) 12-fret ceiling from v3.2.4.

104/104 green. Budget re-measured, unchanged: 55.09 / 384.84 / 11.06 / no
overflow.

---

## Where things stand (session 33e — v3.2.4, 2026-08-03)

**He sent three chord-diagram photos and exact tabs for the two he still wanted
moved.** `Cm6` → `8 10 10 8 10 8`, `C♯m6` → `9 11 11 9 11 9` — both the E-shape
min6 template's *other* position (the app's own "whichever barres lower" rule
had auto-picked the lower A-shape barre, frets 3/4, which v3.2.3 had just
confirmed as "no change needed"). His explicit note: *"I'm allowing frets higher
up the neck for these... anything up to fret 12 acceptable."* Both verified
against his tabs exactly — same four chord tones, full single barre spanning
all six strings (not a stack), position markers 8 and 9.

**A mapping check paid off before anything was applied.** His first message
gave three tabs, one labelled "F6" rather than "F♯6" — and the frets (`1 0 0 2
1 1`) spell natural F major 6th (F, A, C, D), not F♯6 (F♯, A♯, C♯, D♯). Applying
it to F♯6 would have been a real musical bug, not a style quibble, so that one
is held pending which chord he actually meant — the shape also has open strings
that don't transpose cleanly to F♯ without becoming a different, fretted shape
entirely.

**The library's fret ceiling moved from 8 to 12, but only as a named
exception.** A test sweeps every chord in the library asserting nothing exceeds
a practical fret — it was 8, tied to "whichever barres lower." Raising it
blindly would have silently allowed anything up to 12 for ALL 120 chords, so
instead: the two new shapes were proven to fail the OLD ceiling first (a quick
sweep confirmed exactly `Cm6`/`C♯m6` and nothing else exceeded 8), the ceiling
was raised to 12 with a comment naming these two as the deliberate exception,
and a THIRD chord drifting past 8 without a reason still fails loudly.

**One correction to the record:** the alternating bass claim in an earlier draft
of this entry was wrong and caught before it shipped — both the OLD (A-shape)
and NEW (E-shape) `Cm6`/`C♯m6` voicings already alternate root ↔ 5th; only the
neck position changed, not the bass pattern. (That's different from `Csus4`
last round, which genuinely did improve its bass on the same kind of edit —
worth being precise about which chords actually changed which property.)

104/104 green. Budget re-measured, unchanged: 55.09 / 384.84 / 11.06 / no
overflow.

---

## Where things stand (session 33d — v3.2.3, 2026-08-03)

**He flagged four more chords as too hard: `C♯m6`, `Csus4`, `F♯6`, `Cm6`.**
"Avoid any partial barres if at all possible." The first pass guessed wrong —
worth recording exactly how, since the correction is a real rule.

**What went wrong.** Read "avoid barres" too broadly and searched for fully
barre-free candidates for all four, favouring low finger counts and minimal
reach — the same search approach that worked for `E♭add9`. He caught it before
anything was applied: *"Better than the muted strings in those options... barres
aren't a total deal breaker, especially a standard all the way across type."*
The candidates were sparse (2–3 muted strings each) specifically to avoid ANY
shared fret, and that sparseness was worse than a full, familiar barre.

**Checking the shapes' own topology settled it.** `C♯m6`, `Cm6` and `F♯6` were
never hand-declared — they come straight from the movable A-/E-shape TEMPLATES,
which always barre the full width (index across every string, with 3–4 fingers
layered on top in a small window above it). That's exactly the "standard, all
the way across" family he says is fine, and it's the same shape every other
maj6/min6/maj7/etc. barre chord in the library already uses. **None of the three
needed to change.**

**`Csus4` was the one genuine outlier**, and it wasn't template-derived at all —
a leftover hand-declaration from the session-30 "C/D/G-family open forms" pass
(`x33011`, open C with each 3rd bumped to a 4th). Open C's own shape already has
a gap — a fret-3 cluster on the bass strings, a fret-0/1 cluster on the treble
strings, nothing linking them — and sus4 needs to fret BOTH clusters at once,
producing genuinely **two disconnected partial barres** rather than one full
one. That's precisely what he'd flagged as hard, and precisely what's different
from the other three. Removing the hand-declaration lets the general A-shape
template take over: `3 3 5 5 6 3`, one coherent 6-string barre at fret 3 with
three fingers above it. Bonus, not just comfort: the alternating bass improves
too — root ↔ 5th (C ↔ G) instead of root ↔ 4th, since the open G string that
constrained the old voicing is gone.

**The lesson, on top of "playability is not span" from earlier this session:**
a barre and a partial barre are different things, and "avoid barres" needs to be
read as "avoid the ones that don't reach all the way across" unless told
otherwise. Checking a shape's actual barre topology (which strings sound the low
fret, and whether that spans the full width) before proposing a fix would have
caught this on the first pass.

104/104 green. Budget re-measured, unchanged: 55.09 / 384.84 / 11.06 / no
overflow.

---

## Where things stand (session 33c — v3.2.2, 2026-08-03)

Two more of his notes off the same guitar session, both shipped. 103/103 green
(chordbox tests unaffected — no new test needed for the die fix beyond the
source-level one, since it's app.js glue exercised live).

**`E♭add9` revoiced again, and it's a genuine upgrade.** He pointed out string 6
doesn't need to stay muted and doesn't need a partial barre either: one finger
moves between string 6 and string 1 (both fret 6) as the pattern needs them, the
same way a finger comes on and off string 6 for the low bass note some players
add under an open C — the app doesn't model *how* a string gets fretted, only
*what* sounds, so this is simply `6 6 5 0 6 6`. The win isn't just comfort: B♭
(the 5th) now has a real bass-string home, so **Root–Fifth alternates E♭ ↔ B♭
properly** instead of going root-only, which v3.2.1's version couldn't do.

**The chord die can now be tapped while its own wheel is open.** The die sits
right beside the chord field, so the wheel's full-screen outside-tap catcher
covered it too — confirmed live before touching anything (`elementFromPoint` at
the die's centre returned `.dd-catcher`, not the button). A tap there used to be
a dead first press that only closed the wheel; rolling took two taps. Fixed the
same way the codebase already fixes this class of bug (`overOpenTrigger`,
session 28): a rect check against the die, wired to fire on the bubble *after*
the catcher's own listener has closed the panel, so the roll always lands clean.
Verified with a real driven click, not a synthetic one — a synthetic
`dispatchEvent` on the catcher initially looked like it wasn't working, which
turned out to be a different, unrelated red herring (the page had booted into
progression mode from a leftover `tp-prefs` value, so the "before/after" check
was reading `#chord`, a field the die doesn't touch in that mode). Cleared
storage and re-verified: `E → Gadd9` in one tap, panel closed, 2 oscillator
starts (the normal ka-chunk).

---

## Where things stand (session 33b — v3.2.1, 2026-08-03)

**He played the chords, and the ranking I'd given him was wrong.** Two real fixes
came out of it, plus a lesson worth keeping. 103/103 green.

### Span was the wrong measure

v3.2.0 ranked awkwardness by **fret span** and told him the audit was twelve
chords, worst-first: `G♯sus2` (span 5) at the top, `Dadd9` (span 4) well down.
On the guitar he reported the opposite shape of problem: the sus2 barres were
"somewhat playable… not super beginner friendly" once you use **one finger across
two adjacent strings**, while `Dadd9` and `E♭add9` were flatly unplayable — "unless
I was to grow a sixth finger".

Finger COUNT didn't explain it either; all of them come out at four. What actually
makes a shape hard is **a low-fret note stranded on the far side of a high-fret
one**, forcing a finger back past the pinky:

```
Fsus2   1 3 3 5 1 3   fret 3 on strings 5+4 — ADJACENT, so one finger covers both  ✓
Badd9   2 2 4 6 4 2   fret 4 on strings 4 and 2, straddling string 3 at fret 6     ✗
```

A model built on that (crossing, with a ≥2-fret gap) reproduces his verdicts and
correctly clears the everyday crossings it must not flag — `C`, `C7`, `C6`,
`Csus4`, `Dm`, `Esus2`, `G7`, `Aadd9` all pass.

### What changed, and what deliberately didn't

- **`E♭add9` revoiced** `x 1 1 0 4 1` → **`x 6 5 0 6 6`** (his pick from four
  candidates rendered as chord boxes). One fret of reach. The trade he accepted:
  B♭ has no home on a bass string there, so `fifth` doubles the root — **Root–Fifth
  and Dead Thumb play root-only on this chord**; Travis and Alternating are
  untouched, still E♭ ↔ G, exactly as the old voicing.
- **`Dadd9` KEPT.** He found the fingering himself — barre the 2s, pinky on 5.
- **All six wide sus2/add9 barres KEPT**, his call: playable with a partial barre.
- **`A` / `Am` / `A7` now sound string 6.** The chord box exposed a genuine
  contradiction: all three muted it while declaring `fifth: 6`, so the thumb played
  it anyway — the picture drew an × over a string you can hear. Harmless musically
  (E is A's fifth, and every other A chord already sounded it), which is precisely
  why it survived this long.

### Two guards, both proven to fail first

- **No chord may play a string its own shape mutes.** Verified against the pre-fix
  data: `A (travis): plays string 6, which its shape mutes`. It is scoped to
  RELATIVE patterns — the first run flagged `D (climb)`, which is the absolute
  presets doing their documented job of ignoring the chord, not a bug. Worth
  knowing: a resolver asked for a muted string falls back to **fret 0** and sounds
  it open, silently.
- **A chord box with an open string AND notes past fret 5 anchors by position.**
  Caught on screen while auditioning candidates — `x 6 5 0 6 6` drew its dots
  outside the grid. No shipped chord mixes those, so the library sweep couldn't
  find it; pinned now with a synthetic shape.

**The lesson, recorded because I got it wrong in front of him:** a metric that
sorts plausibly is not a metric that's right. Span *correlated* with difficulty
well enough to look convincing, and it inverted the actual answer on the two
chords that mattered.

---

## Where things stand (session 33, 2026-08-03)

**v3.2.0 — the chord-shape diagram, under the wheel's drums.** His v3.1.0 phone
tests all came back good, and the question was what's next; the answer came out of
his own remark that he still had to test playability across all the chords.

### The audit turned out to be 12 chords, not 120

Before building anything, the live library was measured rather than eyeballed.
Span histogram across all 120: **12 chords at span 1, 22 at 2, 74 at 3, 6 at 4,
6 at 5** — so 108 are ordinary shapes. 75 are barres, 45 have open strings, and
nothing exceeds fret 8.

**The trouble is concentrated in the two qualities shipped last.** Eight of the
ten qualities top out at a 3-fret span (avg 2.5–2.8, i.e. a normal barre chord).
Only `sus2` and `add9` reach span 5, and only `sus4` reaches 4:

- **span 5:** `G♯sus2` (4-8), `C♯add9` (4-8), `F♯sus2` (2-6), `Fsus2` (1-5),
  `Badd9` (2-6), `B♭add9` (1-5)
- **span 4:** `C♯sus4`, `Bsus4`, `B♭sus4`, `E♭sus4`, `Dadd9`, `E♭add9`
- **position, not stretch:** the nine E♭ shapes all sit at frets 6-8, the highest
  in the library, but at normal spans

This confirms `CHORD_REFERENCE.md`'s prediction that `G♯sus2` is the one he'd
most likely overrule, and gives the guitar session a target list.

### Item 9 finally earned it

The chord-shape diagram was rejected in an earlier session, and correctly: while
every chord was one he already knew, the grid's fret numbers told him everything.
The condition recorded at the time was "revisit if and only if the library grows
unfamiliar shapes" — and 75 barre chords is that. The grid says which frets the
notes you *pick* sit on, which is not the same as knowing where to put your left
hand for E♭m.

**Two calls were his**, both taken as recommended:

- **It marks the thumb's alternating pair**, in the grid's own colours, rather
  than being a plain chord box. That's the "root ↔ alt" column of
  `CHORD_REFERENCE.md`, shown at the moment you're choosing — and it's the one
  thing a diagram from any chord book can't tell you.
- **It redraws on settle**, the same instant the wheel commits, not per detent. A
  chart flickering under a spinning barrel is motion under a mechanism that's
  already moving.

**One structural constraint decided the placement, and wasn't a fork:** the
panel's width is pinned to the Options field (`--wheel-w`, his v2.14.3 call), so
the diagram had to go BELOW the drums. Beside them would have widened the one
object both are cut from, and broken its test. `.wheel-shape` is
`width: var(--drums-w)` so it can never drive the hug wider.

**A bug the build exposed, worth recording because it's a rule not a typo:** the
first pass coloured the whole barre by its lowest string's role, so `G♯sus2` —
whose root sits *under* its barre at fret 4 — drew the entire five-string bar in
the thumb colour. A bar is one finger across five strings, most of which aren't
bass notes. The bar is now always the finger colour, and a bass role beneath it
gets its own rimmed dot on top, so the pair stays visible without the bar lying.

**It cost the panel's height cap.** `.dd-panel` caps at `52vh` and scrolls the
overflow; a mechanism must not scroll, so the wheel took
`max-height: min(78vh, 430px)`. At 52vh (287px on an SE) the diagram was simply
clipped off — caught on screen, not in a test.

### Verified here vs. left for the phone

Panel measures **237×342** at 375×553 with 194px of viewport to spare, and the
width is unchanged at 237 in **both** pickers (Key × Progression correctly grows
no diagram). Redraw-on-settle was proved by driving a spin and reading the
diagram mid-spin (unchanged) and after (changed). The per-bar chip entry point
gets the diagram for free, confirmed. A contact sheet of twelve representative
shapes was rendered and read: nut bars for open shapes, position numerals for
`E♭` and `G♯sus2`, barres, and ×/○ markers all correct.

**Left for the phone:** whether the diagram is legible at arm's length —
`.chordbox { width }` is the single dial, and the panel's height follows it.

---

## Where things stand (session 32, 2026-08-02)

**v3.1.0 — the four deferred small fixes off his notes.** No new features beyond
persistence; this was a session of causes, not symptoms. 96/96 green (was 91).

### 1. Landscape — the cause, not the symptom

His report: rotate to landscape and back, and the Options sheet opens
mis-positioned ("at the top of the sheet"). His instinct was to disable landscape
outright.

**The cause was `syncSheetToViewport()`.** It exists for one reason — iOS puts
`position: fixed` against the LAYOUT viewport, so a bottom-anchored sheet sits
*behind* the on-screen keyboard when the Save-name field is focused — and it does
its job by writing **inline** `height`/`top`/`bottom` over `.sheet { inset: 0 }`
on every `visualViewport` event. Two facts made it the culprit: **nothing ever
removed those inline styles**, and the loop **skipped hidden sheets**. iOS reports
transitional viewport numbers for a frame or two mid-rotation, so a box captured
during a turn outlived the turn; and a sheet closed during a rotation kept a
landscape box into portrait, where the panel then bottom-anchored inside the wrong
box. Exactly the reported symptom, and permanent until some later event happened
to re-fire the sync.

**The fix is a subtraction.** With no keyboard the visual viewport *equals* the
layout viewport, so the pin was only ever a no-op in that case — so it now applies
**only while the keyboard is actually up** and **clears the inline box otherwise**,
hidden sheets included. The stylesheet is right at every orientation, so rotating
self-corrects and there is **no orientation handling anywhere in the app**. A
`resize`/`orientationchange` scroll-to-top patch would have hidden this rather
than fixed it.

**Landscape is NOT blocked in a Safari tab** (his call). The manifest's
`"orientation": "portrait"` already covers the installed PWA, and a CSS lockout
would need a `max-height` guard or it fires on a desktop browser too — real
maintenance for a case the fix above already makes harmless.

### 2. Settings persist — a third store, `tp-prefs`

Chord mode, chord, key, capo, progression, thumb, fingers, pattern length, note
labels **and BPM** now survive a relaunch. Four decisions, all his:

- **BPM is in.** This **reverses** the documented rule that tempo is too volatile
  to remember (unlike swing, which you settle on and keep). Asked, and he changed
  his mind: *"Everything including BPM."* Recorded as a reversal rather than
  quietly dropping the old line.
- **Loading a saved pattern updates the defaults too** — "reopen how you left it".
  That falls out for free, because `savePrefs()` is called from **`render()`**, the
  one funnel every persisted control already passes through (`loadSaved` included).
  A per-handler call would have needed ten call sites and would silently miss the
  eleventh.
- **A third store, not an extension of `tp-audio`**, which stays the four sound
  toggles + swing. Swing was deliberately not moved; migrating it would strand
  real settings for nothing.
- **The capo persists as a SESSION DEFAULT**, which is a different thing from the
  capo inside a saved item's `context` (musical content). The saved one still
  wins — `loadSaved` runs long after boot's restore.

Two things that had to be got right: **`restorePrefs` runs before `generate()`**,
or the session's first pattern is rolled against the default chord and then
re-chorded underneath; and **every restored value is validated against its
select's live options**, because chords/keys/progressions are data and do change
between releases — a stale id must be ignored, not forced into a control whose
menu no longer contains it. There is **no seeded default blob**: it reads the raw
stored object and applies only the keys present, which handles the documented
"a blob seeded with defaults can never tell you *unset*" footgun by construction.

### 3. The intermittent dead Play — a real mechanism

He couldn't reproduce it and asked for hardening over a guessed one-liner. The
trace found something better: a mechanism that explains **both halves** of his
report, including why leaving the app and coming back was the cure.

iOS has a third AudioContext state beyond running/suspended — **`"interrupted"`**
(a call, Siri, another app taking the audio session) — and `resume()` on one of
those may reject **or never settle at all**. `running = true` sat *after* that
await in `start()`, and `togglePlay` branches on `running`, so the transport never
started and **every later press re-entered the same start path**. `stopTransport`
early-returned on `running` too, so it could never clean up; the button sat
showing STOP over a silent app with the audio category still claimed. And nothing
anywhere repaired audio on the way back to foreground — his workaround worked
because **iOS** clears the interruption on foreground, not because the app did
anything.

Four changes: the resume is caught **and raced against a 1.5s timeout**; a context
that still isn't running is **thrown away and rebuilt** (the synth goes with it —
its buffer cache is bound to that context); **`start()` returns a boolean and
never throws**, so `app.js` can pay back its optimistic button flip
(`releasePlayback()`, deliberately *not* gated on `metronome.running` — that gate
is what made the old failure unrecoverable); and **`recoverAudio()` runs on every
return to foreground**, via a new `onShown` on the playback guard, which is the
automated version of his workaround.

**Verified against the pre-fix code**, not reasoned about: a stub context whose
`resume()` rejects made `start()` **throw**, with one context built and none
closed; a stub whose `resume()` hangs made `start()` **never resolve at all** —
it hung the whole test page. Both now return a verdict.

*What is still unproven:* the phone. The interruption can't be provoked on the dev
box, so the evidence that this was his bug is mechanistic, not observed.

### 4. Dead code — the list was half wrong

`OPEN_ITEMS.md` named nine symbols as "referenced nowhere". Only **three** were:
`romanize`, `romanDegrees` (which only `romanize` fed) and `modalOpen`. Deleted.
The other six — `roleFor`, `SAVED_KEY`, `SCHEMA_VERSION`, `getTheme`,
`savedThemeId`, `resolveMergedBar` — are all **live internally** and merely
exported unnecessarily; dropping an `export` keyword is churn on working code for
no gain, and he agreed to leave them.

### Verified here vs. left for the phone

Measured live at 375×553, 4 bars, progression, capo 4, a hand-edited Custom
progression: **55.09 / 384.84 / 11.06 / no overflow** — pixel-identical to the
standing budget. Persistence was verified by round-tripping a real reload twice
(single mode, then progression mode with a hand-edited Custom progression), and
the restored dropdown *trigger faces* were checked too, since those repaint off
the wrapped `value` setter rather than the select. The sheet's viewport pin was
driven both ways by faking the keyboard. Play/stop was driven with a real click.
**Left for the phone:** the actual rotate, and whether Play ever goes dead again.

---

## Where things stand (session 31, 2026-08-02)

**v3.0.1 — `Dadd9` was D major.** Found while generating `CHORD_REFERENCE.md` for
his manual cross-check: the hand-declared outlier shipped as `x00232`, which
contains no 9th at all (it's the ordinary D major shape). Now **`x00252`** — strings
4/3 are forced to D/A, so the 3rd and the 9th both have to come off strings 2/1, and
E at fret 5 + F♯ at fret 2 is the only pair that stays low.

**The gap that let it through, now closed:** nothing checked what NOTES a voicing
produces. The role-coverage and ≤fret-8 tests only look at string numbers and fret
numbers, so a shape can be entirely legal and still be the wrong chord. The new
check computes each chord's sounded pitch classes from its shape and requires them
to **equal** the quality's interval formula — catching both a missing colour tone
and a foreign note, across all 120. **91/91.**

Also added this session: **`CHORD_REFERENCE.md`** (every chord with tab, sounding
notes, intervals, the thumb's root↔alt bass and max fret, generated from the live
library) and **`NEXT_SESSION_PROMPT.md`**. The reference flags the deliberate
judgment calls for his review — sus2's root↔9 bass on Csus2/Gsus2, Gadd9's and
E♭add9's walk-to-the-3rd alt bass, the E-shape maj7/m7 root↔7 trade, the A family's
inconsistent string 6, and the wide stretches (G♯sus2 4–8 the worst).

---

**v3.0.0 — sus2 and add9, completing the quality set — and the version rolls to
V3.** His call: "let's say V3 since we just revamped all the chords and
progressions." V3 marks the finished revamp arc of sessions 29–31 — the
progression master list (secondary dominants, minor blues/modern minor), the
engraved style headers on the drums, and the full chord-quality set (three
qualities → ten). The number is a milestone marker; the CACHE counter stays its own
monotonic sequence (v80).

The two qualities held back from session 30 as the fiddlier voicings. Library is
now **12 × 10 = 120 chords**; dim7 stays out. Same as before, it's data only —
generator/synth/grid untouched.

- **The fiddliness was voicing, not the bass model** (both keep a normal root/fifth
  alternating bass). Two hard constraints drove the shapes: every finger string
  (1/2/3) must be a *chord tone* (a null string returns fret 0 = open and would
  clash), and the `≤ fret 8` invariant must hold for all 12 roots.
- **sus2 — both templates, all 12 ≤ fret 8.** The E-shape keeps string 3 a chord
  tone (the 5th, at +4) instead of muting the 3rd — a 4-fret stretch, so only
  E-barre roots ≤ barre 4 (E,F,F#,G,G#) use it (top fret 8). The A-shape (x02200,
  +2) takes the rest. C/D/G opens hand-declared. **G#sus2 is the stretchiest (frets
  4–8)** — the one thing to judge on the guitar.
- **add9 — both templates + two outliers.** E-shape (Eadd9 022102, +2) and A-shape
  (Aadd9 x02420, 9 on string 3 at +4). The +4 puts D and E♭ over the neck via the
  A-shape, so **Dadd9** takes its open (xx0232) and **E♭add9** a compact hand-voice
  (frets ≤ 4). C/G opens hand-declared too.
- **Reel + parsers were free.** sus2 joins the Suspended group, add9 gets a new
  **Added** group (reel: Triads / Sevenths / Sixths / Suspended / Added, 10
  qualities). `splitChordId` handles the 4-char suffixes (no collision with sus4);
  `soundingName`/`romanInKey` decorate for free (`Csus2`→`Isus2`, `Gadd9`→`Vadd9`).
- **90/90** green. The parameterized library tests (≤ fret 8, role coverage, count,
  round-trip, spelling) auto-covered the new 24 chords — those are the real proof
  the outlier voicings are valid. Verified live: quality reel shows the five
  sections and ten qualities; G#sus2 tops at fret 8, E♭add9 at 4, D add9 at 3;
  Gadd9 renders root↔fifth with the 9 on a finger string.

**The requested quality set is now complete.**

---

## Where things stand (session 30, 2026-08-02)

**v2.14.14 — new chord qualities, the clean 5.** Off his v2.14.12 list (m7, maj7,
sus2, sus4, add9, 6, m6, dim7). His scope call: the clean five first — **m7, maj7,
6, m6, sus4** — for a guitar test, then sus2/add9 next; **dim7 dropped** (no
perfect fifth ⇒ no natural alternating-bass target, and least idiomatic here).
Library is now 12 × 8 = **96 chords**.

- **It's almost entirely voicings.** The generator, synth and grid only read a
  chord's fret shape and role strings, never its quality — so a quality is a data
  add. Each new one has an E-shape and A-shape movable template plus the C/D/G-
  family open forms you actually play (Cmaj7 x32000, Dm7 xx0211, C6 x32210, Dsus4
  xx0233, G6 320000…). The E/A families come from the templates (which reproduce
  their own open forms and give a low root/fifth bass). Verified live: Cmaj7
  resolves to root C (5/3) ↔ fifth G (6/3) with the maj7 (B) on the open 2nd
  string, a finger note — the colour sounds, the bass alternates cleanly.
- **maj7/m7 put the 7 on the alt-bass string** (E-shape roots), exactly as dom7
  already does — same playable-shape trade, so those roots alternate root ↔ 7.
  6 / m6 / sus4 keep the octave alt bass.
- **E♭sus4 is hand-voiced.** The A-shape sus4 (4th at barre+3) lands on fret 9 for
  the E♭ family, off the practical neck; a D-shape at fret 1 keeps it low. It's the
  only chord the "≤ fret 8" invariant would otherwise break — everything else
  derives ≤ 8.
- **The id parsers are unified through `splitChordId`.** `soundingName` (capo tag)
  and `romanInKey` (degree readout) used to strip `7` then `m`, which read `Cmaj7`
  as a dom7 and `C6`/`Csus4` as bare triads — silently wrong. Both now read the
  quality's own suffix. `romanInKey` decorates by quality (`Cmaj7`→`Imaj7`,
  `Am7`→`vi7`, `Fsus4`→`IVsus4`). Dead `chordRootPc` removed.
- **The quality reel is grouped** with engraved headers — Triads / Sevenths /
  Sixths / Suspended — reusing session 29's header mechanism (widest, SUSPENDED at
  61px, clears the 108px quality barrel easily). Root reel stays ungrouped.
- **90/90** green. The parameterized library tests (count, existence, round-trip,
  spelling, ≤ fret 8, role coverage) auto-extended to 96 chords; added a new-
  qualities parser/readout check; the single-chord randomiser's coverage sample
  was raised 600 → 2500 because covering 95 others is a coupon-collect and 600
  left ~one uncovered by chance.

**Next in this thread:** sus2 and add9 (the two fiddlier qualities held back).

---

## Where things stand (session 29, 2026-08-02)

**v2.14.13 — category text on the drum, his design B.** Off his v2.14.12 note
("category text as non-selectable engravings on the drum? in place of or in
addition to the divider lines?"), rendered A/B/C mockups at true size and he
picked **B — a non-selectable header facet riding the barrel**. (A, caps engraved
on the divider line, was killed by the render: at 124px the caps collide with the
names and distort on the rotating face.)

- **The mechanism now separates ROWS from OPTIONS.** `buildDrum` builds a `rows`
  array (headers interleaved with options) that drives the barrel's facets, while
  `list` stays the pure options 1:1 with the `<select>` — so index/commit/`list()`
  and the mode-recut are unchanged. A NAMED optgroup prints a header before its
  first option; the UNNAMED break (ungrouped `Custom`) keeps the older machined
  groove, since there's no name to engrave. Headers are `.reel-head` **divs**
  (not `.reel-item` buttons): `scroll-snap-align: none` so the reel never rests on
  one, `pointer-events: none` so a drag begun on a header still spins the barrel.
  `nearestOpt()` rescues the transient mid-drag / keyboard case; arrow keys skip
  headers.
- **Both drums name their sections.** The progression drum gets all six styles;
  the key drum gets **MAJOR / MINOR** (fell out of building it generally — reads
  well, flagged for his opinion).
- **Type: 8.5px / 0.12em Jost caps, not the 10px faceplate legend.** The barrel is
  only `--drum-prog` (124px) and the longest style (`Modern Pop/Acoustic`)
  measures **119.6px** at these values — a 4.4px margin, measured live with an
  inline-block probe (`scrollWidth` clamps to the block and can't see the
  overflow). Bigger or wider-tracked clips it. It's the legend voice (Jost caps),
  distinct from the serif a value wears — a section name is what the machine
  *calls* a place.
- **Costs nothing in layout** — the wheel is a body-level overlay and the panel
  height is fixed at 5 × `--reel-item`; header rows scroll inside it. **89/89**
  green (the reel test updated: header positions shift the fixture's option rows,
  and the groove assertions became header assertions).

---

## Where things stand (session 29 — v2.14.12, 2026-08-02)

**v2.14.12 — the chord-progression revamp, from his curated master list.** The
progression set was rebuilt to his "Travis Picking 4-Bar Loop Master List (App
Version)". His call on scope: **replace, but rescue the two Classic Standards**
(I–IV–ii–V, I–vi–ii–V). Net set is **18 progressions** (12 major + 6 minor),
regrouped into his styles.

- **Six new realizations / loops.** Major: `I–II7–V`, the ragtime **`I–VI7–II7–V7`**
  and **`I–III7–IV–V7`**, and `I–IV–vi–V`. Minor: `i–VII–VI–V7`, `i–iv–V7`
  (`i i iv V7`), `i–iv–i–V7`, `i–VI–III–VII`, `i–III–VII–VI`. `I–V` was re-realized
  from `I V I V` → **`I I V V`** (two bars each), per his list.
- **Four new harmonic tokens** — the secondary dominants **`II7` / `III7` / `VI7`**
  (major) and **`V7`** (both modes) — added to every `KEYS` map of their mode.
  `romanInKey` already spelled all of them from interval + a `7` suffix (A7 in C
  reads `VI7`), so this was a `KEYS` edit only; no numeral-map or `degreeLabel`
  change. `II` and `♭VII` stay in the map for hand-edit robustness though no
  shipped progression uses them now (same as `v`).
- **Styles** are now Foundations / Folk & Roots / Classic Country / Ragtime &
  Piedmont / Modern Pop/Acoustic / Classic Standards (major) and Minor Descends /
  Minor Blues / Modern Minor (minor). The dropped set (10): `I–IV`, `I–IV–V`,
  `I–II–V` (→ superseded by `I–II7–V`), both `I–♭VII` folk loops, `vi–IV–I–V`, and
  the two minor 2/3-bar ideas `i–VII` / `i–VII–VI`.
- **Width was the one real risk and it's clear.** The ragtime labels are longer
  than the old widest (`I–♭VII–IV`): `I–VI7–II7–V7` measures **101.5px** in the
  reel's 17px serif against the **124px** aperture, and rendered live it clips
  nowhere — reel face, field trigger well (15px), and the 22px header readout
  (`I–VI7–II7–V7 · C`) all fit with slack. So the drum geometry (`--drum-prog`)
  was **not** touched.
- **Height budget re-measured** at 375×553, 4 bars, progression: **55.09 / 384.84
  / 11.06 / no overflow** — pixel-identical to v2.14.2 onward. **89/89** checks
  green (the flaky key×prog reel test passed here too). Tests updated: the token
  meaning / leak / concise-idea checks now exercise the new secondary dominants
  instead of the dropped `I–II–V` / `I–♭VII–IV`.

**Deferred (his ask, next):** category text as **non-selectable engravings on the
progression drum** (in place of or alongside the divider grooves) — a `wheel.js`
mechanism change with a legibility call only the phone can settle; the grooves
stay as-is for now. Also noted but out of this session's scope: landscape lock,
persist-settings-on-reopen, the intermittent Play bug, and the new chord
qualities (item 1's open half).

---

## Where things stand (session 28, 2026-07-30)

**v2.14.11 — two sound-logic fixes off his read (below v2.14.10 / v2.14.9).**
89/89 green. Both are `app.js` glue verified by counting oscillator starts.

- **Closing a dropdown by tapping its trigger sounds now.** It didn't, and he
  diagnosed it right: the outside-tap catcher (`inset: 0`) sits on top of the
  trigger, so the closing tap lands on a bare `<div>`, not the `.dd-trigger` —
  `pressStrength` saw no button. `dropdown.js` now exports `openDropdownTrigger()`,
  and the sound handler sounds a catcher tap that falls within its rect. A bare
  outside tap (off the trigger) still lands on the catcher away from it and stays
  silent, which is what he wanted. Verified: 2+2 on the trigger, 0 off it.
- **A no-op press on a latching toggle stays silent, like the capo.** Pressing the
  already-seated page tab or Format value does nothing, so only the popped-out one
  sounds now (`pressNoop`, decided at pointerdown and held for the pair — by
  pointerup the press has already moved `.active` onto the key you hit, so a
  pointerup recompute would wrongly silence the chunk of the key you just seated).
  The capo case already worked (its end-stop button is `disabled`). Verified: 0 on
  the seated key, 2+2 on the popped-out one.

---

**v2.14.10 — two follow-ups off his v2.14.9 read (below the v2.14.9 pass).**
89/89 green.

- **The faders SLIDE, they don't push in.** My fader gave the cap an `:active`
  inset (it looked like it seated while dragging); a fader glides, so that rule is
  gone and the cap keeps its raised look the whole travel. His note.
- **Edit mode has a "thock."** Placing or deleting a dot now plays a felt-bottomed
  chess-piece sound (his image), so editing has the same tactile confirmation the
  rest of the app does. A new `playPlace()` in `ui-sound.js`: the woody `body` of a
  click, but the contact is low and low-Q — a muffled felt cushion, not the bright
  plastic tick. One sound for both place and delete. Fired from the grid edit-click
  handler, gated like the buttons (silent while the transport runs, and off when the
  ui-sound lamp is off — grid cells are excluded from `pressStrength`, so it's their
  only voice). Verified by counting starts: one `body` + one `tick` per tap, zero
  when the lamp is off.

---

**v2.14.9 — a picky visual pass across every surface, then the last non-hardware
elements brought into the language.** 89/89 green. He asked for a full audit and
recommendations "be picky and detailed," picked all of it, and settled two forks.

### The audit

Drove every screen/popup/menu at 375×553 and read the CSS behind each. The
vocabulary was already tight (raised carved keys for the transport, recessed wells
for values, the latching page tabs, the brass wheel, the domes, the REC lamp). Three
surfaces stuck out as the last things not speaking hardware, and one taste caveat:

1. **The sliders (BPM, Swing)** — bare native ranges (flat track + round thumb),
   `accent-color`. The biggest "not gear" element, and BPM sits front-and-centre on
   the transport.
2. **The Sound toggles** (his flag) — flat plates whose on/off showed ONLY in the
   jewel and label colour; the tile never seated. The one toggle that didn't move.
3. **The gold slabs** (Save / the saved-row Load / modal confirm) — the *exact*
   flat-gold material Format had just abandoned, now the last slabs in the app.

### What shipped

- **Faders.** Both ranges are `appearance: none` and styled via each engine's
  pseudo-elements into a machined slot + a raised cap with a centre groove; the
  traveled portion fills in `--active`. WebKit has no `::-moz-range-progress`, so the
  fill is a `--pct` custom property the track gradient reads, set by a new
  `paintSlider()` on every `input` and at init (Firefox uses the progress pseudo).
  Verified the native drag survives: a track click drove BPM to 239 and the fill
  tracked to 99.5%. `height: 24px` (the touch target) is unchanged.
- **Sound toggles → latching keys.** `.lamp:has(input:checked)` seats the tile (the
  page-tabs seat), OFF stands proud; the jewel + bright label still track `:checked`.
  `:has()` (iOS 15.4+) degrades to a proud lit key if unsupported. A test pins that
  the on tile is inset and differs from an off twin.
- **Primary buttons → carved accent keys.** `.btn-primary` and the saved-row Load are
  a dished + three-stop (`--accent-hi`/`--accent`/`--accent-deep`) + chamfer accent
  key now, not a flat slab. His caveat, taken: the accent is **theme-derived, not
  always gold**, so it re-tints per theme. The danger-confirm red is carved to match
  (the one carved key with literal hexes, since red is a fixed convention). The
  Rename/Delete secondaries got the carved chamfer too.

### The dropdowns question (his item 3), discussed, no change

He wondered whether the dropdowns, since they click in, should look like buttons. Left
as wells: a dropdown holds a *standing value*, and this pass makes the whole sheet a
bank of recessed wells — raising them would drag the transport's strike-it material
into the settings panel. The press-in on tap is universal tactile feedback, not a
claim it's an action button.

### A test-writing bug worth remembering

The new Sound-lamp test failed in the harness while passing in a manual repro. Cause:
it read the LIVE `getComputedStyle` declarations but only accessed `.boxShadow` AFTER
`frame.remove()` — a detached element reports `""` for everything, so both read equal.
The tab test reads before removing. Fix: capture the values as strings before
`frame.remove()`. (Chased `:has()` timing and a stylesheet race first; both were red
herrings.) Budget re-measured identical: 375×553, 4 bars, progression, capo 2 —
header 55.09 / grid 384.84 / no overflow. BPM slider still 24px.

---

## Where things stand (session 27, 2026-07-30)

**v2.14.8 — the consistency fork got built, and the tabs learned to act on
release.** Three UI notes off his read of v2.14.7. 88/88 green.

### The control-materials pass (his item-13 call: "get the die and format in line with the capo")

The v2.14.7 mockup offered current vs. everything-in-the-capo-language. He picked
it — but the mockup didn't show the page tabs, and applied for real the approved
Format treatment (**seated key + lit lamp**) is the exact language of the tabs,
which in v2.14.5 he'd *deliberately* separated from Format ("looks too similar to
single/progression"). There's even a test pinning "the active tab and the active
Format value must not share a fill." So the mockup partly re-collides them.

I flagged it and rendered three options against the real stylesheet with the tabs
shown: **A** current gold slab, **B** seated + lamp (the mockup), **C** seated, no
lamp. He chose **C**, which is also the truest reading of "in line with the *capo*
selector" — the capo has no lamp; the lamp was my addition, and it's the tabs'
signature. So:

- **The die is a carved key sunk into a recessed well** (`.die-well` + `.die-btn`),
  identical material to a capo stepper key, sinking straight in on press. The well
  is the sized 46px element; the key fills it. This **diverges from the proud cream
  Generate die** on the transport on purpose — two dice, two treatments, because
  this one sits among wells. He accepted that trade in approving the mockup.
- **Format (single/progression) is two carved keys in one well**, no lamp: the
  selected key seats with bright text, the other stands proud. It replaced the flat
  gold slab, the last non-well material in the sheet besides the die.
- **The test that pinned "must not share a fill" was rewritten**: both seat now, so
  that's no longer the distinction. The differentiators are the Jost/serif voice
  (kept) and **the lit jewel being the tabs' alone** — the Format value carries no
  lamp, so a lit jewel means "page tab."

The die and Format wells cost nothing in layout (all inside the overlay sheet):
375×553, 4 bars, progression, capo 2 — grid 384.84, header 55.09, no overflow,
identical to v2.14.7. The 1px divider I added between the Format keys trims the
second button, so the "Progression on one line" test still guards the fit (it
passed).

### The tabs act on RELEASE now (his note)

His v2.14.7 pointerdown fix killed the flash but committed on *press* — the page
flipped under your finger. A latching key should hold while pressed and act on
release, like every other button. **Switched to `pointerup`** (+ `click` for the
keyboard). That keeps *both* properties: release-activation, and no flash — because
adding `.active` in the pointerup handler runs synchronously within the same
release, before any paint, so `.active` is present the instant `:active` drops. The
click path's flash was precisely those being two *separate* events with a paintable
gap; pointerup collapses it to one. Verified on the DOM: a lone pointerdown leaves
the page unchanged, pointerup switches it. The flash itself is still his phone's to
judge (the dev box can't paint a hidden tab).

**Format got the identical treatment**, because C makes it a seated key
(pressed == selected) with the same flash risk: `:active`/`.active` one rule, commit
on pointerup, guarded to the actual mode change so the trailing click is a no-op.

**Help mode needed one line:** pointerup is an activation edge now, so a non-nav
seated-key control (Format) would switch state in help mode. The single
event-type-generic `swallow` handler now also listens on `pointerup` — nav (the
tabs) through, everything else neutralised.

### Dropdowns as wells vs buttons (his item-3 discussion, no action)

My argument for keeping them wells: the bevel language is *recessed = holds a
standing value* (grid, selects, capo), *raised = things you strike mid-play*
(transport). A dropdown shows a persistent value, so it's a well; the press-in on
tap is universal tactile feedback, not a claim it's an action button. And this
session *reinforces* wells — once the die and Format become keys-in-wells, the whole
sheet is one bank of recessed wells, and raising the dropdowns would drag the
transport's material into the settings panel. Left as-is pending his read.

---

## Where things stand (session 26, 2026-07-30)

**v2.14.7 — two fixes off his v2.14.6 look, plus a design fork teed up.**
88/88 green.

### The tab flash, take two

He still saw it. My v2.14.6 fix (one shared `:active`/`.active` rule + eased shadow)
was necessary but not sufficient, and the reason is a good lesson: **a shared rule
only helps while `.active` is present.** The page switched on `click`, and between
the browser dropping `:active` at pointerup and `click` firing, the pressed tab has
*neither* class and paints its raised state for one frame — the flash.

Fixed by switching the page on **`pointerdown`** (`switchTab` wired to both
pointerdown and click — pointerdown for the flashless pointer path, click for the
keyboard, which emits no pointerdown). `.active` lands while the finger is still
down, overlapping `:active` the whole time, so there's no bare frame. Verified on the
DOM: a lone `pointerdown` on Preferences moves `.active` immediately, before any
click. Safe with help mode — the tabs are on its `NAV_SELECTOR`, so its capture-phase
pointerdown swallow already skips them. A source-level test asserts the wiring,
because the regression is silent (it still switches, it just flashes) and app.js glue
isn't imported by tests.js; confirmed to fail against a click-only mirror.

### The Play button's pressed-in shadow

His note: "too heavy on top… we did that to make it look pushed in but it's not
working." Correct — the latched state stacked a dark top-radial (`at 50% 6%`) *plus*
two top-weighted insets, so everything piled at the top edge and read as a bar, not a
recess. It's one clean top inset (`inset 0 2px 5px`) plus a hairline of bottom bounce
(`inset 0 -1px 0`) now — near wall in shadow, far wall catching light, which is what
actually says "in" — with the radial gentler and centred so the lit colour still
shows through. The stepper key's press was the reference. Set live via aria-pressed
and eyeballed at 375; his phone is the judge of the feel.

### The consistency fork — mocked, not built

His bigger note: the Options controls speak in several materials — the segmented is a
flat lit slab, the capo (his favourite) is a recessed well with carved keys, the die
is a raised proud key, and the dropdowns/slider are recessed wells. He asked to "get
that hardware feel" and named the capo form as the one he likes.

The investigation: the recessed-well family (stepper, dropdowns, slider) is *already*
consistent — three controls. The two outliers are the **die** (proud) and the
**segmented's active cell** (lit slab). So a unified world is: die → a carved key
sunk into a well; single/progression → two carved keys in one well, the selected one
seated with its lamp lit (the well form of the latch the page tabs now use).

Built a mockup (current vs. proposed, capo unchanged as the anchor) rather than
shipping it, because it's a genuine fork and he asked to discuss. The one real trade
flagged in it: the recessed options die diverges from the proud cream **Generate**
die on the transport — two dice, two treatments. Defensible (different context; the
options die sits among wells), but his call. **Nothing committed to the app.**

---

## Where things stand (session 25, 2026-07-29)

**v2.14.6 — four notes off his v2.14.5 pass.** 88/88 green. All four small; two of
them have reasoning worth keeping.

### "A little flash upon release of the setup and preferences buttons"

He added: *"We had something similar on other buttons in the past."* He was right,
and the precedent was findable — `.btn-roll` carries `transition: box-shadow 0.07s
ease` with the comment *"so the raised state doesn't SNAP back on release — the snap
read as a flicker on pop-out."* My new tabs had no transition, so that was half of
it.

The other half was worse and specific to a latching key: the tapped tab went
`:active` (deep inset) → **one frame of neither `:active` nor `.active`** →
`.active`. That raised frame was the flash. Pressing a latching key *is* seating it,
so the two states are one rule now and there's no frame to see. The test asserts the
**shared selector** rather than the computed values, because two rules agreeing today
isn't the same thing as being one rule.

### The list panels join the drums' language

His call, and he corrected my count: it's **five**, not four — Note Labels is a
dropdown too. Thumb, Fingers, Pattern, Note Labels, Theme.

They stay lists (short unordered sets; a barrel would be ceremony) but the material
matches now, and **the selected row became an aperture** rather than a lit accent
slab. That was the substantive part: the accent capsule is the same object a
*pressed button* wears, so it read as "the one you just hit" instead of "the one in
the window", which is what a drum's aperture says.

Three things the implementation turned on:
- **The shading goes on the panel even though the panel is the scroll container.**
  An element's own background and inset shadows paint against its padding box and
  don't travel with scrolled content — so the housing stays put while the names move
  through it. Same reason the drum's machining is on `.drum` and not `.reel`.
- **`width: auto` doesn't bleed a row to the walls, because `.dd-option` is a
  `<button>`** and a button shrink-to-fits its content. Measured: a 77px row in a
  123px panel. It's `calc(100% + var(--dd-pad) * 2)` with the panel's padding named,
  so the bleed and the padding can't drift apart.
- **Framing the row must not change its height.** 42px either way, or every row
  below the selection shifts by 2px.

Riding along: `.dd-group` is silkscreened now. It was the one caption left in the
app still set in the serif, and a caption naming values from outside them is exactly
the legend voice's job.

### The Options die

Now a **tilted six** — the same pip layout and the same −13deg as the transport's
die, so the two read as one object. Only the form factor stays this button's own: an
engraved outline on a flat key, not the cream Bakelite face. Note the press stays a
1px translate here; `.btn-roll` had to sink straight in because the tilted die *is*
that button's face, whereas this is a rectangular key with a die drawn on it.

### Help copy

The "Custom at the end is a readout…" sentence is out of the Key and Progression
card, as asked.

### Verification

Two new asserts, both confirmed against a broken mirror: *the tabs' pressed and
seated looks must be ONE rule*, and *the selected row must bleed to both walls
(walls 1–159, row 1–149)*. One of my own asserts was wrong first time — it compared
the row against the panel's **border** box when the walls are the padding box, which
is a reminder that a failing new test needs reading before it's believed.

Budget re-measured at 375×553 worst case: **55.09 / 384.84 / 11.06 / no overflow**,
document still unscrollable, sheet 330.5px in both chord modes, and all three
remaining Setup lists frame their selection without shifting a row.

---

## Where things stand (session 24, 2026-07-29)

**v2.14.5 — the second drum picker, and the page tabs stopped pretending to be a
control.** 87/87 green.

### His reframing is the whole session

I had looked at "progression as a barrel" and rejected it on the grounds that it
isn't a cross-product: the five styles hold 4/3/2/3/2 progressions, so a Style reel
plus a Progression reel means the second one's contents depend on the first, and
that's a cascading menu wearing a drum costume. He replied that I had the axes
wrong: *"I see Key and Progression as a cross product similar to Chord and Quality.
'Let's play an E Major', 'Let's play a 1-4-5 in C'. Both very common guitar
thoughts."* Which is correct, and it's the thought a player actually has —
**key × progression is total within a mode**, and the style groups were never an
axis at all.

That collapsed two items into one. There is no standalone progression drum; the
progression reel is the right-hand cylinder of a key×progression picker, and his
"engraved divisions" idea is how the style groups survive on it.

### What it took

**One field over two selects** is the only structural difference from the chord
wheel, and it's the part worth remembering: chord's two reels write one composite
id, so `commit` reaches everything. Here `#key` and `#progression` are independent,
so `#key` carries `dd-native data-dd="1"` (enhanceAll skips it), the single trigger
belongs to `#progression`, and the key reel writes through a `commitKey` handed to
the renderer. `enhanceSelect` gained a **`watch`** option because the trigger's face
shows both halves and a transpose, a load or a die roll sets `#key` with no `change`
event — which is the same reason its value-setter wrap exists in the first place.

**`--drums-w` became the primary constant.** It used to be computed from
`--drum-root + --drum-quality`; now it's 217px and each pair names its first face
and derives the second (88 ⇒ 108, and 72 ⇒ 124). Without that inversion the two
pickers could open different-width housings, and the field would change width
between chord modes — the exact thing v2.14.4 was about. The 72/124 split is
measured: `I–♭VII–IV` is the widest label on any drum, ~87px at the reel's 17px.

**The grooves ride the FACE, absolutely positioned**, for two independent reasons:
the face is what carries the cylinder's `rotateX`, so the groove foreshortens with
the surface it's cut into; and anything that altered `.reel-item`'s geometry would
move its own scroll-snap detent (the v2.14.0 lesson). A `border-top` was the obvious
implementation and it would have pushed the line of type down 1px.

**Custom needed no code.** His spec — picking it leaves the grid alone, and editing
a bar chord makes the drum sit on it — was already the behaviour:
`applyProgressionPreset` returns early for Custom ("a readout, not a choice") and
`syncProgressionSelect` sets the select after any edit, which the drum reads on
open. Verified both halves live rather than assumed.

### The page tabs

Three mockups went out (plain words / engraved / silkscreened-with-a-jewel); he
picked the third and asked for B's flavour back: *"everything else pressable very
clearly reads as a button… maybe a more narrow rectangular button to suit the font.
You press one, it pops in, light comes on. The other pops out and light off."*

So they're narrow engraved keys in the legend voice, each with a jewel, and the
current page is held in with its lamp lit. Two notes: the seated state needed more
contrast than the first pass gave it — at 10px it only reads once the cap highlight
is *removed*, the fill goes darker than the plate, and a hairline of bounce sits
along the bottom edge — and the test deliberately pins the two things that make
these a different *kind* of object (Jost where the Format control is serif; pressed
in where a value is lit up) rather than any particular shade.

The sheet came out 2.5px shorter (333 → 330.5). A gain, not a cost.

### Verification

Two new tests, and one existing one rewritten for the merged field. All three new
asserts confirmed against a deliberately broken mirror: `the key drum grooves at
the major/minor boundary, got false,false,false`; `the progression drum must be
re-cut for the new mode, got I–V,I–IV,Custom`; and `the tabs must speak in the
legend face, got Fraunces…`.

Also worth recording, because it nearly produced a false pass: the wheel test stubs
`scrollTop` (the tests page has no stylesheet, so the reels have no height). The
existing stub was a fixed data property, which **shadowed** the reel's own
`scrollTo` — so when the re-cut called it, the reel silently kept the scroll
position of the previous, longer list and the test failed for the wrong reason. It's
a real accessor with `scrollTo` wired to it now.

Driven live end to end: prog spin → bars C,G,Am,F; key → Am re-cuts to the 4 minor
entries and lands on i–VII; a minor spin; key → G re-cuts back to 15. Budget
re-measured at 375×553 worst case: **55.09 / 384.84 / 11.06 / no overflow**, and
both chord modes measure identically (field 42→279, die 287→333, sheet 330.5).

### Cleaned up on the way

`#field-key` / `#field-prog`'s width rules and `--key-w` went with the merged field.
Worth noting they'd have gone on passing their test vacuously — the harness built
the old ids, so it was measuring dead CSS.

---

## Where things stand (session 23, 2026-07-29)

**v2.14.4 — his v2.14.3 notes, four of the five actioned.** 85/85 green. Two
discussion items left open at his request, and a batch of items closed on his call.

### What he asked for

**"The drums match the button now, but the buttons don't match between single and
progression mode."** Correct, and it was v2.14.3's own doing: shrinking the chord
field to 237px left progression mode's Key + Progression at 289. They're now cut
from the same `--wheel-w`, split 90 / 139 (`--key-w` plus a calc, so they can't
stop summing). The split is measured, not chosen: the Progression menu's longest
value `I–♭VII–IV` needs 77px of type plus 34px of well chrome, and its legend needs
87.1px, so 139 clears it by ~28px.

**"Put dice back adjacent to chord / quality. Center the group. Right align capo
button (not label). Same on progression mode so nothing moves."** The die's row was
a 3-slot grid, which had pinned the die at the right edge — 60px from the field it
re-rolls. It's a centred flex group now: `237 + 8 + 46 = 291` in 327px of track,
identical in both modes (measured: the group spans 42 → 333 and the die 287 → 333
in single, progression and back again). The capo is right-aligned by moving the
row's *empty* slot from the right edge into the middle — one HTML move, and it
keeps the capo's legend over its own stepper rather than floating left of it, which
is what "not label" asks for.

**"BPM still able to be copied on long press."** `.bpm-readout` was in neither
touch-hygiene list, because it isn't a control. Added, and CLAUDE.md now says any
new readout needs the same.

**"Generally disable scrolling and double tap / pinch to zoom across the board."**
Done, and it **reverses** the earlier decision to scope `touch-action` to controls
and leave the viewport zoomable — recorded as a reversal rather than a tweak.
`html, body { overflow: hidden; overscroll-behavior: none; touch-action: pan-y }`
plus `user-scalable=no, maximum-scale=1`.

The one thing worth knowing here: **`pan-y`, not `none`.** `none` reads as the
stronger version of the same instruction and silently forbids panning in every
descendant that is supposed to scroll — the wheel's reels, a dropdown panel, the
saved list, and `main`, which is the valve that lets the grid scroll inside its own
box at 320×454. `pan-y` still rules out pinch *and* double-tap zoom, since both are
only offered for `auto`/`manipulation`. A test asserts `pan-y` and asserts the
absence of `none`.

### What only the phone can judge

Pinch, double-tap and long-press are all invisible on the dev box — no touch. What
*was* verified here: the BPM slider still drags 90 → 240 under a real pointer drag
(the `touch-action` restriction could plausibly have broken a range input), the
reels still scroll 0 → 418, a list panel still scrolls, and the document itself
doesn't. Also worth knowing: iOS Safari has ignored `user-scalable=no` in a browser
*tab* since iOS 10 but honours it in a standalone install, so in a tab it's
`touch-action` doing the work.

### The bug that came free with the refactor

`.die-btn` had `width: 100%`, which only ever worked because the row was a grid
handing it a 46px track. The moment the row became a centred flex group the slot
was content-sized and the die **collapsed to 21px** — under any tap target. Caught
by measuring the row after the change rather than by looking at the screenshot,
which is the second time in two sessions that measuring a row caught what a picture
didn't. Explicit `width: 46px`, and the test asserts ≥ 44.

### Verification

Two new tests, four asserts, each confirmed to fail against a deliberately broken
mirror: `the die is 2px wide — under a 44px tap target`, `the group moves between
modes: single 42→333, progression 36.5→338.5`, `html/body must set touch-action:
pan-y`, and `the BPM readout is selectable (user-select: auto) — a long-press copies
it`.

Height budget re-measured at 375×553, worst case (4 bars, progression, capo 2,
`I–♭VII–IV · C`): **55.09 / 384.84 / 11.06 / no overflow**, and the document itself
now reports zero scrollable overflow. The Options sheet stayed 333px and the die's
row 57.75px through all of it.

### Closed on his call

The wheel is signed off — the detent's voice, the feel of the spin, the roundness,
the die rolling all 36, and the **F7 / F♯7 / G♯7 root ↔ ♭7 bass** are all "good as
is", not to be revisited unless he raises them. **Wild Card stays as it is** (the
off-the-curve discovery setting; Elliott's objection is a description of what it is,
not a bug) and **Unruly's density stays** — both closed.

### Left open at his request

Two he explicitly isn't ready to commit on, so nothing was built: whether the
drum/cylinder selector should replace other dropdowns, and how to stop the
Setup/Preferences tabs reading as the same object as the Single/Progression
segmented control.

---

## Where things stand (session 22, 2026-07-29)

**v2.14.3 — two small UI notes of his, and a third thing that only measurement
found.** 83/83 green. No generator change, no new data, nothing outside the
Options sheet.

### The two notes

**"The chord/quality button should be the same size as the drum."** It was 289px
against a 237px panel. Rather than hard-code 237 twice, the drum geometry moved
into `:root` and both the panel and the field now derive from it — and it lands on
one number because the field's well contributes the same 9px padding + 1px border
per side that the housing contributes around the drums. Two things came free:
the field's halves are now the two *barrels* (88 / 108) instead of a `1fr 1.3fr`
guess, and because `position()` anchors a panel to the trigger's left edge, each
barrel opens exactly over its own half. Measured: panel and trigger both
`16 → 253`, drums and halves both `26/88` and `135/108`.

**"We have negative space to the right of capo, so spell out Progression."**
Right — the dead third slot was holding the slack. The row is content-sized now
(189.7 / 109 / 28.3), with the capo deliberately still `1fr` so its stepper keeps
the width it had. "Progression" measures 82.5px in a 93.8px button, i.e. ~11px of
air. `white-space: nowrap` went on the segmented buttons because those buttons
have no horizontal padding at all — the button *is* the text box — and a wrap in
this row wouldn't clip, it would lift the whole bottom-anchored sheet.

### What measurement caught that looking didn't

**Naming the row `.control-row.context` collided with `.context`**, the chord/
progression readout above the grid — which pins `line-height: 26px`,
`text-align: center` and `top: -4px`. The row inherited all three: both legends
doubled to 26px and the row grew **59px → 72px**, pushing the sheet up with it.
The screenshot looked fine; the row height didn't. Renamed `.format-capo`, and
there's now a test comparing that row's legend height against a row with no class
of its own, which is a guard against the whole class of mistake rather than this
instance of it.

**And each split legend sat 10px left of the well it names** (CHORD at `16→104`
over a root well at `26→114`), because the legends row is outside the well and
wasn't inset by its padding. Fixed, and pinned by comparing centres.

### Verification

Three new tests, all confirmed to fail without their fixes by breaking the
stylesheet in the preview mirror and re-running: the field/panel/legend width
chain (`the chord field (289px) must be the width of the wheel it opens (237px)`,
then `the Chord legend is -10.0px off the well it names`), and the Format control
(`"Progression" needs 82.5px in a 82px button`, then `the Format legend is 26px
against 13px elsewhere`).

Worth recording about that second one: **with `nowrap` the live failure mode is
overflow, not wrapping.** The test keeps both asserts, because they cover the two
different ways it can break — remove `nowrap` and it wraps, keep it and it
overflows — and a line-box count is the only thing that catches the first
(`scrollWidth <= clientWidth` reports a wrapped box as fitting, because it does).

Height budget re-measured at 375×553, worst case (4 bars, progression, capo 2,
`I–♭VII–IV · C`): **55.09 / 384.84 / 11.06 / no overflow** — identical to v2.14.2.
The Options sheet measured 333px in both chord modes, before and after.

### Also this session

**The two help-copy reversions were built and then reverted, and that's now
settled.** "Count-In" and Wild Card's off-the-curve line had been flagged open
since v2.13.7; both went in, he read them and said *"I was happy with the help
cards before"*, so both are back out with a **SETTLED** note in `data.js` so
they don't get re-proposed a third time. The only surviving copy change is the
one the button forced: the Format card had to stop saying "Prog.".

---

## Where things stand (session 21, 2026-07-29)

**v2.14.0 — the chord picker became two cylinders, and the library became the
full 12 × 3 matrix.** 80/80 green. His design, brought whole: two wheels with the
names printed on the side, "as opposed to a clock face type wheel", because a
barrel "feels more mechanical and thus fits the general feel of the app". All 12
tones on the root reel; Major / Minor / 7 on the quality reel, stopping there
deliberately so the *shape* can be judged before more qualities ride on it. Both
chord pickers use it — the Options sheet's and the per-bar ones in progression
mode — for consistency, his call.

### What the session actually turned on

The framing question in `OPEN_ITEMS` item 1 was "richer harmony or a chord
dictionary", and it was the wrong axis. Reading the code first turned up three
things that changed the shape of the work:

- **The picker was already the problem, independent of the library.** 21 chords
  in 4 groups is ~1,000px of list in a panel capped at 52vh — about 3.5
  panel-heights of scrolling to reach `G#m`.
- **The generator never sees quality.** A chord reaches it as three role strings
  and a fret shape, so adding qualities is a left-hand and audio feature, not a
  right-hand one. Worth being blunt about, since it's the whole cost/benefit.
- **"Whichever barres lower" was already the convention**, just written out
  longhand: E-shape vs A-shape by lowest barre reproduces all eight hand-declared
  barre chords exactly. That turned "22 more hand-written entries" into six
  templates, and the eight became the test fixture.

### The five calls he made

Spelling (**align** `PC_NAME` to the wheel, so a pitch isn't `C♯` on one screen
and `D♭` on another); **commit on settle, panel stays open**; the die **rolls all
36** now, not just the open chords; **a detent tick, definitely**; and the
grouped chord menus retire. He also lifted the saved-pattern compatibility
constraint — nobody has a library yet — which as it happened cost nothing, since
ids were already `root + suffix` and the only new root is `Eb`.

### What the dev box caught that reasoning wouldn't have

- **`.dd-wheel { position: relative }` silently un-fixed the panel.** `.dd-panel`
  is `position: fixed`; my rule sat later in the file at equal specificity and
  won on source order, so the wheel opened 350px down the page. Found by
  measuring the rect against `style.top`, which disagreed.
- **The `rotateX` moved each name's own detent.** A scroll-snap area is the
  element's *transformed* border box, so the reel snapped half a name off
  (scrollTop 171.5 where 152 was correct). Fixed by splitting the step from the
  facet: `.reel-item` never transforms, `.reel-face` inside it does.
- **The mask ate the outer names.** 26/74 and 14/86 both left three legible names
  and two ghosts; the stops have to be cut to the step grid, and 8/92 reads as
  five.
- **`.reel-item` is a `<button>`,** so it was picking up the delegated ka-chunk on
  top of the tick — and on the first frame of a drag. Excluded in
  `pressStrength()`.

Two limits of the box showed up again: smooth scrolling doesn't animate in a
hidden tab (so tap-a-neighbour can't be verified here, only dragged behaviour
can), and two of the mask screenshots were **stale frames** — the computed style
said 8% while the picture still showed the old ramp. Believed the DOM.

### One deviation, flagged rather than buried

Inside an E-shape barre the ♭7 has only two homes: string 4 at the barre (the
everyday `131211` F7) or string 2 three frets up, which is a four-finger stretch
nobody plays. Taking the playable one puts the ♭7 on the alt-bass string, so
**F7 / F♯7 / G♯7 alternate root ↔ ♭7** rather than root ↔ octave — a real ragtime
bass, but a departure from "dominant 7ths keep the parent major's bass". The
alternative is a high A-shape barre (G♯7 at 11). One line in `BARRE_TEMPLATES`
either way.


### Round two, off his first look (v2.14.1)

Three notes, two visual and one a real bug.

**The two reels became two DRUMS.** "Imagine two cylinders mounted on an axel,
right next to each other but spinning freely" — so each gets its own housing,
its own aperture and its own legend, with a hairline axle between them. The
first build had one window spanning both, which read as one list with a rule
down it. The Options field is split to match: CHORD and QUALITY legends over two
wells with a division line, each half carrying its own caret. The per-bar chip
stays a single name — no room to say it twice on a bar.

**The barrel got rounder, and the fix was a subtraction.** The housing now
carries the curve (shadowed shoulders, a specular band, fine machining lines),
but the thing that actually made it read as a cylinder was **deleting the
`translateZ`**. The scroll already places each name; standing the facets off the
axis moved them *again*, and under `perspective` that projection magnified the
whole reel ~16% about its centre — a 38px step rendered as 59px, and the outer
names were pushed clean out of the housing. That's why three sessions of mask
tuning (26/74, 14/86, 8/92) never got five names on screen: the mask was never
the problem. Rotation alone foreshortens each face by cos θ, which is what a
barrel's surface does anyway.

**The bug: in progression mode you got one change per opening.** Picking a chord
re-renders the grid, which rebuilds the per-bar `<select>` — so the open panel
was left writing to a detached element. The panel stayed up, the reels still
turned and ticked, and nothing happened. Fixed by making the renderer commit
through a `commit` handed to it rather than a captured element, plus
`retargetOpenPanel()`, which app.js calls after each render to point an open
panel at the replacement select. Scroll positions and DOM are untouched; only
the target moves. The test drives two consecutive picks through a rebuild and,
without the fix, reproduces the reported symptom exactly (first pick lands,
second doesn't).

### Round three, and the session closed (v2.14.2)

Two nits, both subtractions. **The captions came out of the panel** — the
Options field already names both halves directly above the trigger, and on a bar
chip two drums need no explaining; the reels keep their `aria-label`s, so the
naming survives where it has to. And **the panel now sizes to its drums**
(`data-hug`): `position()` hands a panel the trigger's width as a min-width,
which is right for a list lining up under its field and wrong for a mechanism —
the 289px chord field left the drums swimming in housing while the 164px bar
chip looked correct, which is exactly what he spotted. Both entry points now
open the same 237px object.

### Measured

Height budget at 375×553, 4 bars, progression mode: `.app-head` 55.09px, grid
384.84px, clearance **11.06px**, no overflow — identical to the v2.13.3 baseline.
The wheel is a body-level overlay, and the 40px chord readout already pins its
`line-height`, so `C♯m` and `E♭7` don't move the grid either (`gridTop` 166.45
across six chords).

---

## Where things stand (session 20, 2026-07-28)

Three parts: the adjustments off his drilling (v2.13.5), his revision pass over
the copy itself (v2.13.6), then the title convention and reaching help mode from
inside the Options sheet (v2.13.7).

### Part 3 — v2.13.7, titles, and the "?" above the scrim

**77/77 green (+1).**

**Titles now follow the shape of the phrase**, his rule: title-like is Title
Case, sentence-like stays sentence case. Five changed (Help Mode, Pattern Name,
Bass Warning, Pattern Length, Note Labels); the two sentence-shaped ones stayed
("What you're playing over", "The grid is your right hand") and the twenty-one
single words are unaffected either way. **"Count-in" keeps its lowercase
particle** — that *is* title case for a hyphenated compound, and it matches the
lamp's own label. The convention is recorded in `data.js` with the house rules.

**Help mode is now reachable while the Options sheet is open.** His report:
you had to close the sheet, arm, and reopen it to get cards for the controls in
there — which is backwards, since **half the controls worth explaining live in
that sheet**. The `?` now stays out of the scrim, visually and functionally.

The scrim is `.sheet` at z-index 20 covering the whole screen, so the pill was
both dimmed and untappable. It gets **z-index 30**: above the sheet, below
`.dd-panel` (40), the modals (60) and the help card (70) — so a dropdown opened
from the sheet still covers the pill, which is the one thing that should.

**The fragile part is worth naming.** A plain z-index only lifts the pill
because *nothing* between it and the root creates a stacking context; the whole
chain was checked (`.grid-actions`, `.ctx-row`, `.app-head`, `main`, `body` —
no z-index, transform, opacity, filter, isolation or containment on any). Add a
`transform` to `.app-head` some day and the rule dies silently with the computed
z-index still reading 30. **So the test hit-tests with `elementFromPoint`
instead of reading the value** — it asserts the scrim wins without the class and
the pill wins with it, which is what a thumb actually experiences. Verified to
fail with the rule deleted.

**One place, not three.** The sheet was opened and closed by three bare
`hidden = ...` assignments (gear, ✕/backdrop, Escape); a body class tracking only
two of them would strand a lifted pill above a closed sheet. They now all go
through `setOptionsOpen()`.

The shadow is the pill's own with the outer cast deepened, restated in full
rather than added to (box-shadow doesn't accumulate), so it reads as floating
*on* the scrim rather than punched through it. Latched, it keeps the pressed-in
face — a latched key isn't floating.

**Verified with real taps, not synthetic clicks**: gear → sheet opens with the
`?` bright above the scrim while Edit/Save/Load dim behind it; tap `?` → latches,
sheet stays open; tap the Fingers menu → its card appears and the menu does not
open; tabs still switch, ✕ still closes and clears the class.

*Dev-box note for next time:* the preview tab runs `visibilityState: "hidden"`,
so `computer{screenshot}` can return a **stale frame** — three screenshots showed
a closed sheet while the DOM reported it open. Driving with real `computer`
clicks produced live frames; a JS-only state change did not. Add it to the list
of things this box can't be trusted on.

### Part 2 — v2.13.6, his copy revision

He rewrote all 30 cards and handed back a marked-up sheet. **76/76 green (+2).**
The rewrite is his, verbatim; what follows is what it cost in code, because
three of his edits weren't copy changes at all.

**The house rules came with it**, and they're now in `data.js` above the map so
the next edit sees them rather than re-deriving them: say what it does plus
anything that would surprise you, then stop; cut anything visible on screen,
anything explaining *why* the app works that way, and anything you'd discover in
one tap; **assume a guitar player** (Nashville numbers, alternating bass, i/m/a
and "whole step down" all pass unexplained — only app-specific behaviour gets
spelled out); no em dashes; two lines is the ceiling, and where one runs long
the length is the signal that the thing itself is fiddly. The result is **30
entries → 28** and roughly half the words.

**Two entries were dropped, and neither was a pure data edit.**

**The beat lamp** is gone. His argument: it's a jewel blinking beside a number
marked BPM, and its one non-obvious job (counting you in) is Play's card. He
flagged the trap himself — the annotation has to come off the element too, or
the test fails on an annotated control with no copy — and asked for the tap to
fall through to Tempo "if that's cheap". It was free: the lamp already sits
inside `.slider-wrap`, which is what carries `data-help="bpm"`, so removing the
attribute makes `closest()` walk up to exactly the right card. Confirmed in the
app (lamp → "Tempo", ring on `.slider-wrap`), and the trap he named was
confirmed caught: leaving the attribute in place fails the coverage check with
*"controls point at missing help copy: beat-lamp"*.

**The bar chord** he rolled into the grid's card — which **undoes part 1 of this
same session**, and is right. The v2.13.4 fall-through was a bug because the
grid's copy said nothing about chords; his revision adds a second paragraph that
does ("In progression mode, the chords are indicated above each bar. These can
be edited manually."), so the fall-through becomes the correct behaviour and the
separate entry becomes redundant. The `data-help` comes back off `grid.js`, and
the coverage test's scan of that file goes with it. **The dependency is now
pinned by a test** (`HELP.grid.body` must mention chords), because the two
halves are only correct together and nothing else on screen says so.

**One structural change: a blank line in a `body` now starts a new paragraph.**
His grid entry is two paragraphs, and a single `<p>` collapses them into one run
of prose. Rendered as real `<p>`s rather than `white-space: pre-line`, which
would open a full blank line where the card only has room for paragraph spacing
(8px). Single-paragraph bodies are unchanged.

**Checked, because the house rules touch things the project already has rules
about:** his Format card uses curly quotes, and **Fraunces has “ ” and ’** —
measured by glyph-width against a monospace fallback, with ♭/♯ as the control
(they correctly report as falling back, which is what validates the method). So
no fallback font, no line-box growth, and the pinned-`line-height` rule doesn't
come into play. No new copy contains ♭ or ♯.

**Both new tests verified to fail without their fix**: stripping the chord
paragraph from the grid entry fails *"the grid card must mention the per-bar
chords"*, and reverting to the single-`<p>` renderer fails *"the grid card
should render 2 paragraphs, got 1"*.

**Layout unchanged again** — 375×553, 4 bars, armed / grid card up / disarmed:
head 55.09px, grid 384.84px, clearance 11.06px, no overflow. The two-paragraph
card is 300×188.7, still an overlay, still zero cost.

**Two mismatches between his notes and his copy, resolved toward the copy** (the
copy is the deliverable; the notes were commentary on an earlier draft):
his house-rules note lists Thumb and Fingers among the four that "run long", but
in the actual copy he cut both to two short sentences — that drops the preset
descriptions and Wild Card's off-the-curve status from the cards, which is
consistent with his own "you'd discover it in one tap" rule since both menus are
grouped and labelled. And his note says "Tempo now carries the blink" while the
Tempo copy he wrote doesn't mention blinking; read as "the lamp now lands on the
Tempo card", which is what the rest of that note describes. Titles were
normalised to sentence case — he Title-Cased only the entries he happened to
retype, and the other 26 were already sentence case.

### Part 1 — v2.13.5, adjustments off his drilling

**74/74 green (+2)** at this point. His verdict on the mode itself was "working
well", and the three
open questions from session 19 came back answered: **Play's behaviour is fine as
is** (arming mid-take leaves the take running, and Play explains rather than
stops), and **Save and Load stay non-enterable** — their contents are words, not
glyphs, so they read for themselves. That closes both, and the allowlist is
unchanged: the gear, the two page tabs, `[data-close]`, the `?`, the card.

**Three changes.**

**1. The highlight was sized for the wrong mode — his bug, and the good kind.**
The `#chord-head` slot reserves a full-width 28px box so the grid can't move
when you switch chord modes, and what actually sits in it is either a 40px chord
glyph *overflowing the slot upward* or a text-width run of Roman numerals inside
it. `data-help` was on the container, so the ring drew the same wide, short box
either way. Measured at 375×553: the ring was `351×28` while the chord it
claimed to point at was `25.3×40` — in single mode the outline was mostly empty
space *below* the chord.

The fix splits the two jobs the anchor was doing. `data-help` says which copy;
a new optional **`data-help-ring`** selector says which box to outline and hang
the card off, taking **the first matching child that is actually rendered**.
Since the two children are mutually exclusive (`hidden`), that picks the right
one with no mode flag reaching `help.js` at all — one explanation, two shapes,
as he asked. Now `25.3×40` on the chord and `67.9×26` on the numerals.

**2. The per-bar chord picker had a card, and it was the wrong one.** Tapping a
bar's chord in progression mode showed *"The grid is your right hand"* — the
only control I found whose card was actively misleading rather than merely
absent, and it matters because that picker is how a progression becomes Custom.
The cause is structural: `dropdown.js` hides the native `<select>` and overlays
a **sibling** `.dd-trigger`, so an annotation on the select is never an ancestor
of the tap and `closest()` walked past it to `#grid`. The key therefore goes on
the bar **header**, in `grid.js`.

It needed no `data-help-ring` in the end — I wrote one, measured it, and took it
out: the numeral chip is positioned absolutely, so the header's box and the
picker's are *the same box* (both `164.5×28.8` at 4 bars) and the ring landed on
the picker regardless. Shipping an attribute that does nothing would have been a
comment I hadn't measured.

This is also the **first `data-help` set in JS rather than in markup**, so the
coverage test now scans `js/grid.js` beside `index.html`. Without that it
reported the new entry as unreachable copy — which is exactly the failure the
test is for, so it earned its keep on the way in.

**3. Tapping the same control again dismisses its card** (his call). Every
control is now its own toggle. The card still has no ✕; it goes away when you
tap it, tap bare faceplate, or tap the thing it's about, and the last is the one
your finger is already on. Compared by *key*, so tapping a **different** control
still swaps the card rather than closing it.

**All three tests were verified to fail without their fix**, individually,
against a mutated copy of the tree: the ring test failed on *"single mode must
ring the chord, not the slot around it"*, the dismiss test on *"tapping the same
control again closes it"*, and the coverage test on *"help copy nothing can
reach: bar-chord"*.

**Zero layout cost holds.** Re-measured at 375×553, 4 bars, progression mode,
across five states — help off, armed, a card on the readout, a card on a bar
chord, disarmed again: `.app-head` 55.09px, grid 384.84px, **clearance 11.06px,
no overflow, identical in every one**. Same numbers as v2.13.4.

**New doc: `HELP_COPY.md`** — all 30 cards' text in one place, grouped by where
the control sits on screen, so the wording can be reviewed without hunting
through `data.js`. It's a review sheet, not a source; `HELP` in `data.js` stays
the source of truth. Verified verbatim against the live map (30 entries, 30
quoted bodies, nothing missing, nothing stray) rather than transcribed by hand.

---

## Where things stand (session 19, 2026-07-28)

Two pieces: the docs, then the Guide. **72/72 green** (+3 net: three help-mode
checks and a disabled-control check in, one dead `infoModal` check out).

**Part 1 — the docs split, no app file touched.** CLAUDE.md was **1,982 lines and
half changelog**, and it's the file every session loads first, so its bloat cost
time on every future session. It's now **867 lines of architecture and
invariants**; the session-by-session history is this file, newest first, with
markers where a later session overturned an entry. `NEXT_SESSION.md` was folded
away — durable lessons into "Working with this user", the rest into
`OPEN_ITEMS.md` — leaving three docs, each with one job.

- **It wasn't a straight cut.** A set of still-load-bearing facts lived ONLY in
  session notes and would have stopped being loaded each session: `ui-sound.js` /
  `modal.js` / `dropdown.js` were **missing from the file map entirely** (with
  `sw.js`, the manifest, `icons/` and `tools/`), as were both deploy footguns,
  the dev-box limits, the lamp-colour convention, the design-language statement,
  and `platform.js`'s four integrations. All promoted.
- **Six stale numbers corrected against the code**, not the old notes:
  `CONTEXT_BASE_PX` was documented as 16px and is **22**; `.stage`
  `padding-bottom` 28 → **24**; `confirm()` → `confirmModal()`; the saved
  context's **`capo`** field; Click/Pattern are labelled **Metronome/Melody**;
  the `:root` fallbacks are **Jerry's**, not Merle's.
- **The height-budget table was re-measured live** rather than carried forward:
  375×553, 4 bars, progression mode — grid **384.8px**, chrome **168.2px**,
  `.app-head` **55.1px**, clearance **11.1px**, no overflow. The session-8
  figures held.

**Part 2 — v2.13.4: the Guide became HELP MODE** (`CACHE` v61). His design, and
a better one than a rewrite: tap the `?`, it latches like the Edit pencil, and
from then on tapping anything explains it instead of doing it. Full design in
CLAUDE.md's "Help mode"; what's worth keeping here is what the build turned up.

- **Why it's the right shape, specifically.** The Guide's problem was never
  length, it was *distance*: the pills are icon-only and the ABS/MIX chips are
  cryptic on purpose, and a manual explains those worst of all, because a list of
  glyphs on another screen is the one place you can't compare the glyph to the
  thing. It also lets **inert elements** carry help — the caution chip, the capo
  tag, the readout, the grid — which is where the old Guide's legend section
  went, and it had no other home.
- **Three forks, all decided before coding:** an anchored popover (over a fixed
  band or a modal per item) because it costs **zero layout**, which is what makes
  it affordable against an 11px clearance; the manual **replaced entirely**; and
  the **transport left alone**, with Play explaining itself.
- **`click` capture is not enough, and I only half-verified that at first.** I
  told him a capture-phase click listener wouldn't stop the sliders, then wrote a
  test using synthetic PointerEvents — which **cannot drive a native range drag
  at all**, so the assertion would have passed with no interception whatsoever.
  Caught it by sabotaging the fix and finding the test still green. Re-measured
  with a **real drag**: click-capture alone, help armed, BPM ran **90 → 240**.
  The test now asserts the actual mechanism (`pointerdown.defaultPrevented`),
  which does fail without the fix.
- **The bug the build was worth doing for: a DISABLED control emits no click**,
  so it's a dead tap — and **the Load pill is disabled exactly when the library
  is empty**, the first-run state, i.e. the person most likely to be in help
  mode. Found in-browser (tapping Load showed the *previous* card), not reasoned
  about. Help mode already guarantees nothing acts, so `disabled` has no job
  while armed: lift it, keep `aria-disabled` truthful, restore on exit.
- **Two smaller ones, both found by looking rather than thinking.** A screenshot
  showed the ✕ leaving a "Theme" card floating over the grid pointing at a
  now-hidden control — navigation dismisses the card now. And the
  mutual-exclusion guard I put in the Edit handler was **unreachable**: the
  pencil isn't on the allowlist, so in help mode it explains itself and the
  handler never runs. Removed, with a comment saying why.
- **A test that fails must not cascade.** The sabotage run revealed that my own
  help test left the controller **armed** when an assert threw, and its
  document-level capture listeners then swallowed every later test's clicks —
  one failure took the whole suite to 0/0. Both help tests now tear down in a
  `finally`.
- **Copy is data** (`HELP` in `data.js`, keyed to `data-help`), with a test in
  both directions. This is the direct fix for how the Guide rotted: it was prose
  inside `renderHelp()` and still called the Fingers menu "Chaos" three versions
  after the rename.
- Riding along: `infoModal` + `buildInfo` + the `.tp-help-*` CSS are **deleted**,
  dead with the modal they served, and `APP_VERSION` moved to help mode's own
  entry card.

## Where things stand (session 18, 2026-07-27)

**v2.12.0** (`CACHE` v55) — four items off his v2.11.x phone notes. 66/66 green
(+1). Nothing here changed the generator or the musical model; three of the four
were naming and fit.

- **The empty name row is signed off** — a fresh generation shows no name, and
  the blank reserved line reads fine. Closed; no placeholder.
- **"Chaos" the setting became "Fingers", and Chaos the tier became "Wild
  card"** — see the Fingers note under "Key rules" for the reasoning and the
  group table. His call on all three words; "Fingers" (rather than
  "Complexity", which is where we started) is the better one because it pairs
  with Thumb and names the layer instead of the axis.
- **Long-press no longer selects control text.** `-webkit-user-select: none` +
  `-webkit-touch-callout: none`, alongside the `touch-action`/tap-highlight rule
  those controls already share. **`input` is deliberately NOT in the new list** —
  the save-name field needs selection and paste — which is why it's a second
  rule rather than an addition to the first. Prose stays selectable.
  Device-only to judge; the dev box can only confirm the computed property.
- **The "sounds in" readout left the Options sheet for the header tag**, which
  now reads `CAPO 2 → F♯`. It was one fact split across two screens. The **arrow,
  not the words**, because the words don't fit: measured at 375, the four pills
  leave the tag **156.3px**, and `WHOLE STEP DOWN · SOUNDS IN B♭m` needs
  **210.6px**. The worst string the app can actually produce is
  `WHOLE STEP DOWN → F♯m` (single mode on G♯m, capo −2) at **151.2px** — it fits,
  with 14.1px to the pills, but that's thin enough that `.capo-tag` went
  `flex: 0 0 auto` → `0 1 auto` with an ellipsis, so a longer future string
  degrades instead of shoving the pills off the row. **Verified across capo
  −2…+5 in both modes: `.app-head` stays 55.09px and the grid top never moves.**
  The freed sheet slot is left empty (the row keeps its fixed 3-slot geometry).
  - **`.capo-tag` gained a pinned `line-height`** because it can now hold ♭/♯.
    Measured: unpinned, `CAPO 2 → F♯` takes the tag's box **13px → 14.5px**. That
    doesn't currently move anything — the pills are taller and set the row height
    — so the pin is **insurance, not a fix for an observed bug**. It's there
    because the house rule says so, and because the day this row stops being
    pills-driven is not the day to rediscover it.
- **Three Thumb values were being clipped, not one.** He reported "Dead Thumb";
  the label box was 75px and `Dead Thumb` needs **94**, `Alternating` **84**,
  `Root–Fifth` **78**. The row was three equal thirds while `Pattern`'s longest
  value ("4 bars") needs only 44.7. `.control-row.layers` splits it by measured
  content instead — **133 / 108 / 86** of 327px of track, every menu with 4–7px
  of slack, nothing clipped. Note the rename moved the binding constraint: "Wild
  card" (70.1) is longer than "Unruly" and clipped by 1px under the first split,
  which is why the numbers are content-derived rather than eyeballed.
- Riding along: the saved-pattern list showed the raw tier **id** (`chaos`), so
  it now disagreed with the menu — it prints `CHAOS_PRESETS[id].name` instead.

**v2.12.1** — "Wild Card" capitalised, his call. Not free, and worth the note: the
capital C is **2.7px** wider, which took the Fingers column from 3.9px of slack
to **1.2px**, so the layers row rebalanced 133/108/86 → **133/111/83** (the spare
came from Pattern). Same lesson as the rename right before it — *check whether
the fix moved the constraint*; one capital letter did.

**v2.13.0 — swing, both feels, for a guitar trial** (`CACHE` v57). 69/69 green
(+3). The design and the measured verification are in the Swing note under the
Metronome section; what matters at this level:
- **He described a feel that isn't standard swing**, precisely: "2 moves further
  from 1 and closer to 3 … 4 closer to 1". That's the *beats* swinging, not the
  8ths — which in Travis picking means **the thumb itself swings**, where the
  usual shuffle keeps the thumb metronomic and lilts only the fingers. Both were
  put to him with the slot positions written out; his call was to **trial both on
  the guitar** rather than pick from a description.
- **That's affordable only because they're one parameter apart.** `slotSeconds()`
  is a single expression; `unit: 2` vs `unit: 4` is the whole difference. Delete
  the loser and its half of the Feel toggle.
- **A correction I had to make to him mid-thread:** I'd said the click needed no
  decision because it only sounds on beat slots. True for the 8ths feel — but
  under the beats feel the click sits on beats 2 and 4, so **it shuffles too**.
- **The control is a slider, not named stops** — he wants to hunt for the number
  by ear ("might take some trial and error with the guitar"), which is the
  argument that beat my earlier segmented-stops recommendation. It's on the
  **Setup** page (called "Generation" until v2.13.3): swing is part of what
  you're *playing*, not how the app
  behaves. Not in the die's row — the die doesn't roll it.
- **Sheet cost measured:** the panel goes 266 → **333px** at 375×553, leaving
  220px of headroom, and the tab-to-tab jump stays 0 (Setup is now the
  taller page, and the shared grid cell handles it).

**v2.13.1 → v2.13.2 — the swing verdict, arrived at by playing it.** The end
state is in the Swing note under the Metronome section; what matters here is that
**two of the three things v2.13.1 shipped were cut two days later, and both cuts
were right.** He asked for a second resolution and named detents, used them, and
reversed himself on both — which is the argument for building the cheap version
of a fork rather than debating it.
- **The `2 & 4` resolution is gone.** He kept it in v2.13.1 on the grounds that
  he keeps hearing that feel in tunes he plays, then cut it: *"I don't think it
  fits the theme of the app ultimately."* It swings the thumb, and the thumb not
  moving is the technique. **The test asserting beats never move is the guard
  that keeps it out** — it's aimed at a real thing that was once in the code, not
  at a hypothetical.
- **The five named detents are gone**, back to a smooth 50–75 slider "similar to
  how Tempo already works". The detent argument (a free slider lets you miss the
  value by 2%) was sound in the abstract and just didn't survive use.
- **What survived from his spec:** one `SWING` heading, Straight as the off
  switch reading "Straight" rather than "50%", and swing as a feel setting in
  `tp-audio` rather than pattern content.
- **A bug class worth remembering, found by testing the migration:** `audioPrefs`
  is seeded with defaults, so `audioPrefs.x ?? fallback` can *never* detect "the
  user has no setting" — it only sees the default. A trial value was silently
  dropped until `loadAudioPrefs()` started **returning the raw stored blob** for
  the migration to read. Both swing migrations since have used that.
- **A layout bug only the SCREENSHOT caught:** the readout wrapped to two lines
  inside a fixed 42px well, and `scrollWidth <= clientWidth` came back clean
  because a wrapped box *does* fit. Fixed with `white-space: nowrap` and a width
  measured off the rendered element — canvas under-reads, because it doesn't
  apply `tabular-nums`. **Take a screenshot; fit maths can lie.**

**v2.13.3 — two label changes, his call.** The sheet's first page is **Setup**
(was "Generation") and the chord-mode legend on it is **Format** (was "Chords").
The ids were renamed with them (`tab-setup`/`page-setup`) so the code doesn't
disagree with the screen; the Guide's own copy naming the two pages was updated
too, which is the kind of thing a rename quietly leaves stale.

**Next in his order after this: the Guide rewrite** — still blocked on him saying
*what* bothers him about it (stale / too long / wrong shape / hard to find pull
in different directions). He also asked when to do a code-cleanup session; the
answer recorded in `OPEN_ITEMS.md` is "not on its own" — the code is clean, the
docs are what need it.

## Where things stand (session 17, 2026-07-27)

**v2.10.4** (`CACHE` v52) — **the installed app could precache a stale deploy,
permanently.** 63/63 green (+1). His report: the site had updated but the
home-screen app still showed the previous version, and force-quitting didn't
help. It was a real bug, and *not* in the update detection that v2.8.0 fixed.

**The mechanism, and why force-quitting couldn't help.** `updateViaCache: "none"`
makes the browser fetch **`sw.js`** from the network, which is why a new deploy
is *detected* — but the files that `sw.js` then precaches go through the ordinary
HTTP cache, and GitHub Pages serves them `max-age=600`. Two deploys inside ten
minutes (v2.10.2 → v2.10.3 were **11 minutes apart**, plus ~a minute of Pages
build) and the new worker installs correctly under the new cache name while
filling it with the **previous** deploy's bytes. After that there is nothing left
to install and nothing ever re-fetches, because the cache is only written at
install: an up-to-date worker serving stale code, for good.
- **Fix:** `install` fetches each entry as `new Request(path, { cache: "reload" })`
  and `cache.put`s it, replacing `cache.addAll`. A non-`ok` response now throws,
  so a partial precache fails the install and the old worker keeps serving rather
  than a half-updated shell reaching `skipWaiting`.
- **Measured, not theorised** (the diagnosis was otherwise circumstantial): a
  scratchpad endpoint serving `Cache-Control: max-age=600` with a server-side hit
  counter showed three default-mode fetches leaving the counter at **1** — the
  browser answering from its own cache — and a `{ cache: "reload" }` fetch taking
  it to **2**. That is exactly what `addAll` was doing to the app shell.
- **Verified the replacement actually installs** (a typo here breaks offline,
  which is worse than the bug): registered by hand against the mirror, the worker
  reached `activated` and controlling, with all **23** entries present and the
  cached `js/app.js` carrying the new `APP_VERSION`.
- **`registerServiceWorker()` moved OUT of `boot()`** — it now runs at module
  scope before it, and falls back to calling `start()` directly if `readyState`
  is already `complete`. Anything throwing earlier in `boot` used to take the
  registration with it, and an app that can't check for updates **can't ship its
  own fix** — that failure mode ends in "delete and re-add the icon". The updater
  is the one thing that must survive a broken build.
- **Test:** `sw.js` source must not contain `.addAll(`, must contain
  `cache: "reload"`, and must check `res.ok`. Source-level, because the invariant
  is invisible from inside the app and its failure is silent.
- **Bootstrap caveat, same as v2.8.0's:** the fix only starts protecting the next
  deploy, since the fixed worker is the one that has to install. His stuck phone
  self-heals on this deploy — the worker script itself was always fetched fresh,
  so v52 is detected normally and its install is the fixed one.

**v2.11.0** (`CACHE` v53) — **the typography pass.** 64/64 green (+2). It started
from his note that "something seems a little off" about the fonts in the Options
sheet, with sizes and placements inconsistent between its two pages. **The
typefaces were never the problem** — the sheet had *two label systems* and a few
orphans. Measured before proposing anything (see the Type note above for the rule
that came out of it):

| what | was | now |
|---|---|---|
| group caption vs field label | 9px/0.22em, x=18 | **one tier**: 10px/0.16em, x=16 |
| the two Options pages | opened with different-looking objects | both open with the same legend |
| capo value | inherited `0.16em` + caps from `.field` | resets both — a value, not a label |
| sheet `✕` | U+2715 → **Arial** | drawn SVG |
| stepper `−`/`+` | rounded sans 19px | serif 18px (inside a control) |
| "Appearance" caption | a caption that looked like the labels under it | **gone** (~14px back) |

- **The legend face is Jost, bundled** — his call after asking the right question
  ("is Futura actually free?"). It isn't: Futura, Copperplate, Helvetica Neue and
  Gill Sans are all commercial, and *referencing* one by name is free only while
  every user is on Apple hardware. Jost is the OFL Futura-alike; 26,588 bytes,
  latin subset, variable 400–600.
- **The choice was made against a true-size mockup**, not a description — six
  era-appropriate faces in a 375px replica of the sheet with the real values and
  the real Fraunces, published as an artifact so he could judge on the phone
  (several candidates are iOS system faces the dev box renders differently or not
  at all). Keep that trick for any future type question.
- **The Guide `?` became the fourth header pill** and **the name moved back to its
  own row** — see "Where controls live". Both his calls, and the second one is
  what makes the fourth pill free: the name had been down to 35px.
- Building the mockup surfaced a cascade collision worth remembering: a row
  modifier `.row.die` and the die button `.die` shared a class, so the row
  inherited the button's box. The measured geometry caught it; the screenshot
  alone did not.

**v2.11.1** (`CACHE` v54) — two v2.11.0 bugs from his phone, both mine, both the
same lesson: **a layout claim has to be measured in the state that actually
ships.** 65/65 green (+1).
- **The grid jumped when a name appeared.** An empty `.loaded-name` is a 0-height
  inline box, so `.name-row` collapsed to 1px and `.app-head` swung **33 ↔ 55px**.
  I had "verified" this by measuring the no-name case with placeholder text in the
  element — which is not the no-name case. The fix is
  `.loaded-name::before { content: "\200B" }`: the reservation comes from the
  name's OWN font metrics, so it can't drift out of step with a future size
  change the way a hard-coded `min-height` would.
  **There is now a test** (`layout: the name row reserves its height when empty`),
  which renders the header + real stylesheet in an **iframe** — tests.html carries
  no stylesheet, and booting the real app inside the harness would touch the
  user's localStorage. Verified it fails without the fix (`got 1px`), so it guards
  rather than passes vacuously.
- **Edit mode's dashed outline cut through the progression readout.** `outline` is
  drawn OUTSIDE the box, so its **reach = `outline-offset` + `outline-width`** —
  5+2 = 7px, into a readout whose line box sat flush with the grid's top edge with
  2px of slack above it. Single mode never showed it only because `.c` is lifted
  9px. Fixed at both ends: offset 5 → **3px** (reach 7 → 5) and `.context` lifted
  **4px** by `position: relative; top` — never a `transform`, which would promote a
  compositing layer and re-open the iOS lingering-label bug. Side benefit: at 4
  bars on 375×553 the outline had come within **4px** of the transport, now 6px.

## Where things stand (session 16, 2026-07-26)

**v2.9.3** (`CACHE` v47) — **locking the phone mid-take no longer leaves audio
running in bursts.** 61/61 green (+2). Reported from the phone: lock the screen
while playing and the sound "continues in a sort of disjointed way".

**The cause is two of our own features meeting.** The transport holds the
**`playback` audio category** (v2.8.0's silent-switch fix), which is precisely
what tells iOS to keep our audio alive in the background like a music app —
while the **`setTimeout` driving the lookahead scheduler is frozen or throttled**
by the same backgrounding. The audio clock keeps running, so `nextSlotTime` falls
behind `ctx.currentTime`; the next time the timer fires, every missed slot is
scheduled at a time **already in the past**, and Web Audio plays those
immediately. The backlog comes out as one burst. So it isn't drifting playback —
it's a pile-up, and it got possible the moment we started claiming a background
audio category.

Two changes, a fix and a backstop:
- **`createPlaybackGuard()` in `platform.js` (integration 4)** — stop the
  transport when the page stops being visible. `visibilitychange` is the only
  signal the web offers, and it **cannot distinguish a screen lock from an app
  switch or a pulled-down notification shade**, so all of those end the take too;
  that's right anyway, since none of them leave you looking at the grid. `pagehide`
  covers the exits that never report a visibility change (bfcache, termination).
  Same shape as the other three integrations: injected `doc`/`win`, tested with
  stubs.
- **`hasDrifted()` / `MAX_DRIFT` in `metronome.js`** — past 0.25s behind (≈2 8ths
  at the top tempo), the scheduler **drops the missed slots and resyncs** instead
  of replaying them, and clears the stale playhead queue with them. The guard
  above is the fix; this is what protects a freeze nothing tells us about (a
  slept laptop, an OS audio interruption).
- **`stopTransport()` in `app.js`** is now the single stop path, extracted out of
  `togglePlay` — handing the audio category back matters as much as killing the
  scheduler, since `playback` is what keeps iOS sounding us in the background.
  The guard calls the same function the Play button does, so nothing can drift out
  of sync.

**Verified in-browser** by probing `OscillatorNode.start`/`AudioBufferSourceNode.start`
per second rather than by eye: playing schedules ~1.5 clicks/sec at 90bpm (with
plucks starting after the 2.7s count-in, as they should), and after a
`visibilitychange` **not one further sound is scheduled** — counters frozen across
the next 1.2s, Play un-latched to ▶︎. `pagehide` behaves identically, and the
transport restarts cleanly afterwards. **Not verifiable off-device:** the actual
iOS lock behaviour — a real screen lock is what the report came from.

**v2.10.0** (`CACHE` v48) — **the Options sheet became two pages, and the capo
lives in the room that made.** 62/62 green (+1). His call on all four design
forks; the two-page idea was his, and it's better than the three placements I
offered.

> **⟶ SUPERSEDED (v2.13.3):** page 1 is called **Setup**, not "Generation", and
> its chord-mode legend is **Format**. The ids are `tab-setup`/`page-setup`.

**The Options sheet is TWO PAGES now — Generation / Preferences.** Everything on
one page measured **460px of a 486.6px cap** at 375×553: ~27px spare, i.e. room
for **zero** new control rows (a row is 58px). That ceiling had already exiled
the version tag into the sheet header and put the die on a section-header line,
and it's why the capo had nowhere to go. Split on the natural seam — what the
**pattern** is, vs how the **app** behaves — each page now measures **311px and
329px**, leaving ~160–176px, i.e. room for three more rows each.
- **The tab row REPLACES the old "Generation" caption** (the tab says it), so the
  split costs page 1 nothing — the capo row is already inside that 311px.
- The **die rides the tab row** and goes `visibility: hidden` on Preferences —
  **not** the `hidden` attribute, which let the tabs stretch and made the pair
  change width between pages. A jumping control panel is a specific past complaint.
- Page 1 = chord format, chord/key+progression, thumb, fingers, pattern length,
  capo, swing.
  Page 2 = the Sound lamp bank, note labels, theme, guide *(⟶ the Guide left for
  the header as a fourth pill in v2.11.0)*. **The gear always opens
  on Generation** — muscle memory beats remembering where you were, and
  Preferences is set far more rarely.
- **Known cost, his call:** Metronome/Melody are now a tap away, and those are the
  most mid-practice controls in the sheet. Worth feeling out on the phone.

**The capo is SHAPE-FIRST** (`CAPO_MIN`/`CAPO_MAX`/`clampCapo`/`soundingName` in
`data.js`): you pick the shape and where the capo is, and the concert key is
derived. That's what makes it cheap — **the grid never changes and the generator
never sees it**, because the frets on screen are shape frets, which is exactly
what your fingers do. It's a label plus one addend in `midiOf(event, capo)`.
- **Range −2 to 5.** Negative is a **down-tuned guitar** — a physical capo can't
  go below the nut, but it's the identical transform and it's what he actually
  does. The top is 5 because that's where real capos live; one constant if a 7
  ever comes up. `capoLabel()` in `data.js` decides how it's SAID: **"half-step
  down" / "whole step down"** (his wording), never "capo −1", which is a thing you
  can't do. One helper drives the on-screen tag, the saved-list metadata and the
  default save name.
- **A hardware stepper**, not a dropdown (his pick): one recessed well with two
  carved keys sunk into its ends, end-stops disabled at the limits.
- **Invisible at capo 0**, also his call — at 0 the readout says "Concert pitch"
  and no on-screen indicator exists, so the default screen is the app exactly as
  it was. *(v2.12.0: the sheet's readout is gone entirely — the tag carries the
  sounding key now, and the tag still doesn't exist at capo 0, so the rule holds.
  The tag also moved top-left in v2.10.2. See session 18.)* Set one and a tag
  appears at the **right end of the NAME row**, the same
  place in both chord modes (v2.10.1 — it first rode the context in progression
  mode and the chord head in single mode, so it moved down the screen when you
  switched). **Costs zero layout**: the name row's height is reserved whether or
  not it's used, so a capo can never move the grid. Measured: `.app-head` 63px and
  grid top identical at capo 0, capo 5 and −2, in both modes, no overflow at 4 bars.
- **Why the name row and not beside the context:** `"whole step down"` is ~124px.
  Sharing row 1 with the readout left it **63px**, which drove `fitContext` to its
  10.5px floor and **truncated the numerals** — measured, on a preset readout, not
  just the exotic worst case. On the name row the worst-case readout stays at the
  full 14px with any capo set. Long saved names ellipsize and the tag stays whole,
  which is the right precedence.
- **Concert spelling is flat-preferred except F♯** — "capo 3 with G shapes sounds
  in B♭", the way a guitarist says it. Quality suffixes survive (`Am`+2 → `Bm`,
  `C7`+3 → `E♭7`). Those are real ♭/♯ glyphs, so whatever displays them needs a
  pinned `line-height` — that was `.sounds-readout` here; since v2.12.0 it's
  **`.capo-tag`**, and `.sounds-readout` no longer exists.
- **Capo is musical CONTENT**, so it joins the saved item's context (absent on
  pre-capo saves ⇒ `clampCapo(undefined)` = 0, which is what they were) and shows
  in the saved-list metadata, where two saves differing only by capo would
  otherwise be indistinguishable. The **randomiser deliberately does not roll it**
  — being told to move a physical clamp every roll is hostile.

**Verified in-browser, measured rather than eyeballed:**
- **The audio genuinely transposes.** Karplus-Strong output is periodic at its
  fundamental, so the pitches were recovered from the rendered `AudioBuffer`s by
  period detection: capo 0 sounded `[40,42,44,45,45,49,49,52,52,54,56]` and capo 3
  sounded **exactly that set +3**. (A first attempt compared cached buffer
  identity and was inconclusive — a +2 shift can land on a pitch that was already
  in the set.)
- Worst-case context readout (`♯iii – ♯vi – I7 – ♭II · Am`) still sits at the full
  **14px at capo 0** (196/196px), and drops to **12.2px** with a capo — well clear
  of the 10.5px floor, so `fitContext` absorbs it as designed.
- Save→reset→load restores the capo and both readouts; the custom dropdowns still
  work on the initially-hidden Preferences page (the `<select>` source-of-truth
  contract holds); tabs hold a constant 293px width across pages.
- **Not verified off-device:** how the two-page split actually feels mid-practice,
  and the stepper's tap targets under a thumb.

**v2.10.1** (`CACHE` v49) — seven refinements off his phone test of v2.10.0.
62/62 green (+1 assertion set). Every one was a real defect, not a preference:
1. **The sheet jumped when switching pages** (311 vs 329px). Both pages now sit in
   one CSS grid cell (`.sheet-pages { display: grid }`, `.sheet-page { grid-area:
   1/1 }`), inactive one hidden by `visibility`, so the panel is always the
   height of the taller page — no magic numbers, and it stays true if the content
   changes. Measured 285/285.
2. **The tabs moved onto the sheet's title line**, beside "Options", which makes
   the split free in height, and **the version tag moved to the foot of the
   Guide** to pay for the room. The version now lives in `APP_VERSION` in
   `app.js` — **the deploy dance changed: bump that, not a span in index.html.**
3. **`capoLabel()`** — see the capo notes above.
4. **The capo tag moved to the name row** — see the capo notes above.
5. **Rapid capo taps triggered iOS double-tap zoom.** The buttons already had
   `touch-action: manipulation`; the hole was the **container**. At an end-stop
   the button under your finger goes `disabled`, the tap falls through to the
   `.stepper` well behind it, and an untagged element gets the zoom gesture.
   `.stepper` and `.segmented` joined that rule.
6. **The "Sounding" caption is gone** *(⟶ and in v2.12.0 the readout itself left
   the sheet — the header tag says `CAPO 2 → F♯`, and the sheet slot is empty)* —
   it only restated the "Capo" label next to
   it. The readout stands alone and quiets down (13px, muted) at capo 0, where it
   is reporting that nothing is happening.
7. **The die's scope now reads from its position.** It sits in the row holding
   the chord (single) or key + progression (progression) and **nothing else** —
   `.control-row.with-die` gives its last slot to the die (`1fr 1fr 46px`) instead
   of a third control, and the Single/Prog toggle moved up to join the capo in a
   "context" row. His suggestion, and the only thing that actually communicates
   scope; the die had read as "randomise everything in Generation" on the tab row.
   Note this moves the mode-swapping fields to **row 2** — both alternatives still
   fill the same two slots, so the invariant (nothing below ever shifts) holds.

**v2.10.2** (`CACHE` v50) — the last two placement calls from his phone test, and
the session's wrap. 62/62 green.
- **The capo readout moved top-LEFT** of the header, where the context used to be
  — the position it wanted all along. It could only go there once the context
  left: sharing that row, "whole step down" (~124px) took the readout to 63px and
  truncated the numerals (v2.10.1's measurement).
- **The progression/key indicator moved above the grid**, into the same slot as
  the single-mode chord, "to be consistent with the chord indicator in
  single-chord mode" — his framing, and right: they're the same piece of
  information and it shouldn't move when the mode does.
- **How the room was found.** The stage had **0px** spare at 4 bars in
  progression mode (`.stage::before`, the capped-growth gap, was already
  collapsed to 0), so a reserved slot above the grid had to be paid for. Two
  candidates were measured: shaving `.stage`'s 28px `padding-bottom` left **1px**
  of margin and squeezed the grid against the transport, while **collapsing the
  two-row header to one** freed 31px and kept the bottom breathing room. Header
  63 → 32px, and the grid gained ~30px of clearance above the controls.
- Note the readout sits ~14px higher in progression mode, because the track it
  sits above is taller there (the per-bar chord headers). **What the stage's
  `::before` gap actually pins is the grid's BOTTOM** — measured 28px above the
  transport in both modes — not its top and not the first cell row (which differ
  by 7px between modes). Worth knowing before you "fix" a top alignment.

**v2.10.3** (`CACHE` v51) — **the above-grid readout grew 16px → 22px**, with the
slot at 28px. He was right that it had room; the interesting part is which limit
binds. **Width doesn't** — even the four-accidental worst case needs only 305px
of the stage's 351px at 26px type, and `fitContext` would absorb anything longer.
**Height does**, and only barely: at 375×553 with 4 bars the stage's shrinkable
`::before` gap was down to **8px**, so every px of type came out of it. 22px left
**2px**, which is no margin at all, so `.stage`'s `padding-bottom` went 28 → 24 to
buy it back — **6px of slack now, and still a 28px gap to the transport.**
Anything larger needs a different trade, not just a bigger number.
- **320×454 (iPhone 5/SE-1 class) already overflows by 18px at the OLD 16px** —
  it's outside the documented budget either way, and 22px takes it to 24px. If
  that viewport ever matters, it's its own piece of work.
- `CONTEXT_BASE_PX` (app.js) and `.context`'s `font-size` must stay in step —
  `fitContext` writes the size inline, so the CSS value is only the resting state.

## Where things stand (session 15, 2026-07-26)

**Session 15 shipped the app-icon revamp — v2.9.0** (`CACHE` v44). 59/59 green;
no app code changed, so nothing on screen moved (the version label is the same
character count — no 375×553 re-measure needed).

**The mark: a thumbs-up wearing a thumbpick**, cream on a rust disc over the
faceplate brown. His idea, and a good one — it's a pun that's also literally
true (the app is about your right hand, and the thumb leads), and a thumbpick
alone would have been unrecognisable to anyone who doesn't own one.

- **The icon is now DRAWN ARTWORK, not generated shapes.** `tools/make_icons.py`
  was rewritten: it used to *draw* the mark (circles, then a full SDF renderer
  with capsules, smooth unions and bevel lighting); it now **frames and resamples
  `tools/icon-master.png`** (640×640, downscaled from a 1254² original). The SDF
  attempt is worth knowing about so it isn't repeated: the toolkit is good at
  geometric marks and bad at organic ones, because every curve has to be
  hand-specified as primitives — three passes produced a cartoon hand with two
  red bandages, and the user called it (correctly) before I did.
- **Style was chosen by MEASUREMENT.** Six candidate treatments were downscaled
  to the real 32px and compared side by side. The engraved and brass-monochrome
  versions are the handsomest at full size and the worst small (hatching averages
  to gray; a same-value pick vanishes into the hand). The winner is flat-graphic
  — **three values and a silhouette**, which is what survives a favicon. Rendered
  volume and fine linework do not. Keep that test in the loop for any future mark.
- **The safe zone is enforced by the tool, not by eye.** The master's cream
  artwork reached **r=0.421** against the 0.40 maskable safe radius (the wrist
  dipped past), so `FIT = 0.93` insets it and pads with `BORDER = #36271a` —
  sampled from the master's own edge, which measured **flat to within 5/255**
  across 64k border pixels, so the padding is seamless. `main()` re-measures the
  finished 512 and **aborts rather than writing** if the art drifts back outside.
  Verified after generation: r=0.392, and simulated iOS-squircle and circular
  masks both keep the whole hand.
- **Still dependency-free**: the script now decodes PNGs as well as encoding them
  (stdlib `zlib`/`struct`, all five scanline filters) and resamples with an exact
  area filter via **summed-area tables** — O(1) per output pixel, which is what
  makes a 32px icon (~400 source pixels averaged each) affordable in pure Python.
  Whole run is ~3s. Icons are written as **opaque colour-type-2** PNGs: iOS
  composites black behind any alpha in a home-screen icon.
- **No frame, no rounded corners** — every platform masks its own. An early
  candidate had a gold border; under a circular mask its corners become four
  disconnected arcs. The recessed-panel feel comes from the art's vignette, which
  survives any crop.
- **`theme_color`/`background_color` stay merle `#33241a`** — they drive the
  splash and browser chrome, and the app behind them is dark. The icon being
  green while the app defaults to brown is deliberate: the icon is a brand mark,
  not a preview of the UI.

**v2.9.1 — the palette fix, and the metric that drives it** (`CACHE` v45). The
shipped v2.9.0 icon had the pick "disappear against the background", which
measured at a **contrast of 1.08:1** — the pick body `#6d3e19` and the disc
`#673918` were the same colour. The whole icon was two browns at 1.49:1 covering
77% of the pixels.
- **The pick sits across BOTH the disc and the cream thumb, so the metric is the
  WEAKEST of its three contrast pairs**, not the flashiest. This is the trap that
  caught the obvious repaints: bright-gold-pick variants (Chet 4.43, Doc 3.82,
  paper 4.10 against the disc) score *worse overall* than the muted ones, because
  the same bright pick then merges into the cream hand (1.25 / 1.37 / **1.01** —
  identical value, held apart only by the drawn outline). Judge by the weakest
  link or you just move the problem.
- **Shipped: Jerry tuned** — ground `#14241b`, disc `#24402f`, pick `#d24b30`,
  hand cream unchanged. Weakest link **2.59:1**, against a **theoretical ceiling
  of 2.86:1** for a hand this light over a dark ground (solved by equalising the
  two ratios). The coral is close to the real thumbpick sampled off the user's
  photo (`#b9544a`); green is complementary so the red does maximum work.
- **How the variants were made:** the master was recoloured **by region**, not by
  a global hue shift — flood fills seeded inside the outer background, the disc
  and the pick, each tested against the SEED colour so a fill can't cascade past
  a boundary. The pick and disc are within a colour distance of 8, so the gold
  keyline is the only thing separating them; mask coverage is printed as the leak
  check (outer 27%, disc 42%, pick 2.15% — no leak). Recolouring preserves each
  pixel's luminance ratio to its region mean, so vignette and paper grain survive.
  Verified at 7× magnification: outlines and keylines intact, no fringing.
**v2.9.2 — JERRY IS THE DEFAULT THEME, and the icon is built from its values**
(`CACHE` v46). The user's call: Jerry has more character than Merle and is his
favourite (player and theme), so the icon should correspond to the default rather
than the other way round.
- **The icon's every colour is now a Jerry role**, no invented hexes: ground =
  `bg`, disc = `surface` (the muddy bank), hand = **`--accent-hi`** `#eeddb8`,
  pick = **`--active-deep`** `#62a596`, keylines = `hardware` bronze, outline
  cores = `label`. The `-hi`/`-deep` values are the ones **`theme.js` itself
  derives**, so they're real app values, not approximations. Measured on the
  finished 512: pick `#63a494`, hand `#eeddb8`, disc `#493c28` — each on its
  theme value. Weakest contrast pair **2.16:1**.
  - The pick's target is written as `#5d9d8f`, NOT `#62a596`: the shading step
    multiplies by each pixel's luminance ratio to its reference, and the pick's
    pixels sit ~5% above theirs, so a literal target renders 5% light. It's
    pre-divided so the **finished icon** lands on the theme value.
  - **Teal is the right colour for a reason**, not just taste: in the app the
    thumb notes are `--active`, and the pick goes on the thumb. (The coral it
    replaced was mine, sampled from the reference photo — the user's wife said it
    looked like a pepperoni, which is fair.)
- **Recolouring is by CLASSIFICATION, not flood fill** (`scratchpad/jerryfy.py`
  approach). This fixed a real shipped bug: the original art's outer background
  and the hand's **dark outlines are the same colour to within 21**, so the
  v2.9.1 flood fill — tolerance 18, tight enough to spare the outlines — left
  every outline brown against the new green. Every pixel is now assigned to one
  of six k-means references (`#683918` rust, `#36271a` dark, `#e6c899` cream,
  `#bb823b` gold, `#876034` antialias, `#2e2116` outline core) and mapped; there
  is no "unassigned" case, so nothing can be left behind. Disc vs pick is the one
  split classification can't make (same source colour) — that stays a flood fill.
- **`BORDER` in `make_icons.py` must match the master's own border colour.** It
  was still the brown `#36271a` after the repaint, so the `FIT` padding band
  around the art stayed brown — a second source of stray warmth, caught by
  sampling the finished icon rather than by eye.
- **Chrome colours followed the default**: `theme-color` (index.html) and the
  manifest's `theme_color`/`background_color` are now `#17291e`, and
  **`styles.css`'s `:root` fallbacks are Jerry's**, read out of the live app via
  `getComputedStyle` rather than hand-computed, so a failed `themes.json` fetch
  lands on exactly what a successful one produces.
- **A saved theme preference still wins** (`travis-picker:theme`) — changing the
  default only affects someone who has never picked a theme. Worth knowing when
  testing: the dev browser looked unchanged until that key was cleared.
- **Still open for a future pass** (offered, not done): **full bleed** — let the
  disc colour run edge to edge instead of sitting as a circle on a background
  band. It buys ~20–25% more hand at the same safe margin and retires the one
  contrast pair that couldn't be fixed (disc vs outer background, still 1.57).
  The hand is currently 46% of the tile width.
- **Expect to delete and re-add the home-screen app** to see the new icon: iOS
  caches the installed PWA's icon and the auto-updater (v2.8.0) does not touch it.

## Where things stand (session 14, 2026-07-26)

**Session 14 shipped the "behave like a native app" batch — v2.8.0** (`CACHE`
v41), off the user's v2.7.5 guitar notes plus a friend's (Elliott's) feedback.
59/59 green (+3). One new module, **`js/platform.js`**, holding three OS
integrations that the musical model knows nothing about. **All three are
device-only to judge** — see the verification note below.

**The module's shape:** every integration is **feature-detected and degrades to a
silent no-op** (these are young or WebKit-only APIs, and a practice tool must not
break because a browser lacks one), and each takes injected **`nav`/`doc`** — the
same trick `storage.js` uses for its store — so the *logic* is unit-tested with
stubs and only the physical behaviour needs a phone.

- **`createAppUpdater()` — the app now picks up a deploy on launch.** The user's
  report was "the home-screen app doesn't update without opening the GitHub site
  first", and the cause was in the registration: no `updateViaCache`, so **`sw.js`
  itself came from the HTTP cache** and a standalone launch could never see a new
  worker (visiting the site in Safari was what forced the revalidation). Three
  parts, all needed: `updateViaCache: "none"`, an `update()` on load **and on
  every return to foreground** (a standalone app is resumed far more often than
  cold-launched), and a **reload when the new worker takes control** — sw.js
  already calls `skipWaiting` + `clients.claim`, so the caches swap under a page
  built from the OLD ones, which is exactly why the force-quit was needed. Two
  guards on that reload: **never on first install** (no previous controller ⇒
  nothing on screen is stale — without this, a first visit reloads itself), and
  never when `canReload()` is false (`state.unsavedEdits` or a running transport;
  reloading would destroy hand-drawn work or cut a take in half). Skipping is
  safe — the worker is already active, so the next ordinary launch is current.
  **⚠️ Bootstrap caveat: the deploy that ships this still needs the old
  force-quit**, since the fix arrives inside the update.
- **`createAudioSession()` — sound through the iOS silent switch.** Web Audio on
  iOS obeys the ring switch by default, which is wrong for audio the user
  explicitly asked for. `navigator.audioSession.type = "playback"` is the opt-out.
  **The category is per-DOCUMENT, and that decides the policy:** iOS convention
  splits on who asked for the sound — requested media (music, a metronome)
  ignores the switch, incidental UI feedback (keyboard clicks) respects it. So the
  app takes `playback` **only while the transport runs** and hands the previous
  category back on stop. Silenced phone + not playing ⇒ a completely quiet app,
  button thocks included; press play ⇒ music, and the thocks ride along for the
  duration, as they would in a native app holding a playback session. Set
  **before** `metronome.start()` so the AudioContext is created under it.
  **Uncertain:** the API is WebKit-only and recent. If his iOS lacks it, the
  fallback is the fragile `<audio>`/`MediaStreamAudioDestinationNode` hack —
  discuss before taking that on rather than carrying it silently.
- **`createWakeLock()` — the screen stays awake the whole time the app is up**
  (the user's call: not just while playing — you read the grid between takes as
  much as during them). No toggle; add one only if battery cost bites. Two things
  make it actually work: the OS drops the lock whenever the page is hidden and
  does NOT restore it, so re-acquiring on `visibilitychange` is mandatory; and on
  hide we **forget the sentinel rather than trusting its `release` event**,
  because a missing event would leave us holding a dead lock and never
  re-acquiring — the exact failure the feature exists to prevent. Some browsers
  also refuse the first request without transient activation, so there's a retry
  on the first `pointerdown` (`acquire()` no-ops once held, making it cheap).

**What was and wasn't verified.** In-browser (mirror at :8147): 59/59 green, clean
boot with no console errors, transport start/stop unaffected with the audio-session
calls in place, and the no-op paths genuinely exercised (Chrome has no
`audioSession`; the hidden preview tab makes the wake-lock request decline without
throwing). **Not verifiable off-device, by construction:** the wake lock (a hidden
tab can't hold one), the silent switch (no such concept on the dev box), and the
SW flow (registration is skipped on localhost on purpose).

**v2.8.1 — icon-only pills** (`CACHE` v42), same session, after the user's phone
test of v2.8.0. Details in "Where controls live" above. Two decisions recorded
alongside it, both the user's:
- **Haptics are not an option on iOS web at all**: Safari has never shipped the
  Vibration API, and the only reported alternative is a narrow iOS 17.4
  `<input type="checkbox" switch>` trick that can't reach an arbitrary button.
  Revisit only if this ever becomes a native app.
- **Phone-test verdicts on v2.8.0: all three confirmed working** — silent-mode
  audio, wake lock, and (after the v2.8.1 deploy) **auto-update**, which came up
  new without a trip to the site first.

**v2.8.2 — the silent-switch policy for BUTTON sounds** (`CACHE` v43). The user
found the v2.8.0 behaviour inconsistent: buttons were silent on a silenced phone
when stopped but audible *during* playback (the audio category is per-document,
so holding "playback" for the transport swept the UI sounds along — an earlier
theory that the UI context kept its birth category was **wrong**; the category
does reach the already-created context). He wanted it one way or the other, and
chose "buttons never sound in silent mode".
- **The rule: no button sound while the transport is running** — implemented in
  `app.js`'s delegated pointer listeners, not in `ui-sound.js`, because it's a
  transport-dependent policy and `app.js` is the glue. **The web cannot read the
  ring switch**, so this is the only way to honour it: playback is the sole window
  in which we hold the category that overrides the switch, so muting buttons there
  means a silenced phone never hears them at all, while the metronome and melody —
  audio you explicitly asked for — still come through. Ringer-ON side effect,
  accepted: buttons also stay quiet during a take (thocks over your own picking
  are noise).
- **The decision is taken once per press and held for the pair** (`pressSilenced`),
  so the button that starts or stops the transport gets a matched ka-chunk rather
  than half a press.
- **Rejected alternative:** holding the playback category permanently so nothing
  respects silent mode. Simpler model, but that category doesn't mix with other
  apps — a stray button tap would then interrupt background music/podcasts, where
  today the app only takes over the audio when you press Play.
- **Verified empirically in-browser**, not theorised: patching `AudioContext` +
  `OscillatorNode.start` to count sounds *per context* shows 2 UI-context starts
  per press while stopped, **0** while running (metronome unaffected), and 2 again
  after stopping. Note this is app.js glue, which `tests.js` doesn't import, so
  there is no unit test for it — the probe is the evidence.

**Also from this round of notes, not built:** the **open list moved to
`OPEN_ITEMS.md`** — a standing quick-reference the user reads between sessions,
with each item's size, what's decided and what needs his call. New entries from
Elliott: a **chord-library expansion + Root × Quality picker** (the framing
question is "richer harmony to drill" vs "a chord dictionary"; the latter needs a
movable-shape-template refactor of `data.js` — 12 roots × 7 qualities is 84
hand-written entries otherwise), a **chord-shape diagram** (deferred; it stops
being redundant with fret labels only if the library grows, and then it belongs in
the *picker*, never near the grid), and **Chaos "stops sounding like Travis
picking"** (accurate description of a deliberate design — Chaos is off the
difficulty curve). One finding worth keeping: **closed jazz voicings need no
generator change** — a chord declaring `root`/`alt`/`fifth` on the same
string/fret makes the Travis preset alternate between identical notes, i.e. the
thumb-on-root-only behaviour the user proposed, as pure data. Still open and
unstarted: the **capo system** (forks were put to him: shape-first vs sound-first,
audio transposition, control placement given ~29px of sheet headroom, and
"invisible at capo 0"), and an **app-icon revamp** (a thumbpick, via the
stdlib-only `tools/make_icons.py`).

## Where things stand (session 13, 2026-07-24)

**Session 13 shipped the musical-content pass — C1–C3, keys & progressions —
v2.7.0 → v2.7.5** (`CACHE` v40). All data-driven; **generator untouched**. 56/56
green, verified in-browser (tests + the grouped menus, mode filter, dom7 frets).
**Pending the user's weekend guitar/phone test.** The design was agreed up front
against a written spec the user brought (see the discussion) before any code.

**The model rework** — see the rewritten "Nashville numbers (token model)" note
above. Progressions became harmonic **tokens** instead of bare 1–6 degrees so
`II`/`♭VII`/`I7` are expressible; each key gained a `mode` + token→chord map.

**What shipped, by the user's three threads:**
- **C1 keys.** Added minor keys **Am + Em** (natural-minor ladder, major-V
  cadence — `i–VII–VI–V` = Am–G–F–E). Kept majors at C/G/D/A/E. **No Major/Minor
  toggle** (user's call): both live in one key dropdown, and the *selected key's
  mode filters the progression list*. Switching a key across the mode line lands
  on that mode's first preset (agreed default).
- **C1 chords.** 21 total now (was 14): dom7 `C7/G7/D7/A7/E7`, `F#` (E's II),
  `Bb` (C's ♭VII). Dom7 bass = parent major (see the Chord-library note; E7 =
  `020130`). **E7 voicing signed off** by the user. `Dm` was later moved into the
  single-picker's Open chords group (v2.7.2).
- **C2 progressions.** Replaced the old 7 with the user's curated set, grouped by
  **style** (Foundations / Classic Country / Traditional Folk / Modern Acoustic /
  **Classic Standards** / Minor). **All are 4-bar** (shorter ideas padded — 2-chord
  repeats, 3-chord holds the last); a concise **`label`** drives the menu/readout.
- **C3 menus.** `dropdown.js` now renders `<optgroup>` **section headers**. Keys
  grouped Major/Minor, progressions by style, single-chord picker **Open chords
  first** (`SINGLE_CHORD_GROUPS`), per-bar picker by quality (`CHORD_GROUPS`).
- **Smart custom readout (v2.7.3).** A hand-edited non-diatonic bar now reads as a
  computed numeral (`♯iv`, `♭ii`, `VI7`) instead of `?` — `romanInKey`/`degreeLabel`
  in `data.js`; see the Nashville note. Tritone spells `♯IV` (user-approved
  convention). Contained follow-on the user asked for at end of session.
- **Header fit + chord randomiser (v2.7.4 → v2.7.5).** The richer numerals
  overflowed the header. v2.7.4 swapped name/context rows; the user then asked to
  keep the context **top-left** and shrink the type instead, so **v2.7.5 restored
  the original row order and added `fitContext()`** — full reasoning and the
  measured numbers in "Where controls live". The version tag stays in the Options
  sheet (that trim is what makes the fit work at 14px for most readouts). A third
  header row was offered and rejected: the SE grid budget has ~0 spare.
- **The ♭/♯ line-height bug (v2.7.5).** Picking a `♭VII` progression made the
  Options sheet "expand slightly upward" — the glyph falls back off Fraunces to a
  taller font, growing the trigger +4px. Fixed with fixed `line-height`; see
  "Where controls live". **Reproduced and re-measured both ways in-browser**, not
  theorised.
- Also in v2.7.4: a **chord randomiser** die
  (`#randomize-chords`) on the Options **"Generation" section header line** —
  progression mode rolls a key + a progression of that key's mode, single mode
  rolls an open chord. It rode the header line rather than taking a control row
  because the sheet only had **~45px headroom at 375×553** (a row is ~64px); after
  the die it was 458/487. *(v2.10.0 split the sheet into two pages and the die
  moved to the tab row; the headroom problem that forced this is gone.)* Pure helpers `randomKeyProgression`/`randomChord` in
  `data.js`, rng injectable. **Two-stage sampling — key first, then a progression
  within it** — because flat sampling over (key, progression) pairs would bury the
  minor keys at ~8% of rolls (2 keys × 3 progressions against 5 × 14); a test
  asserts the ~2/7 minor share. Neither roll ever returns what's already on
  screen, and neither touches the pattern, so hand-drawn edits survive (no discard
  confirm — unlike Generate).

**Decisions worth knowing:**
- **Deferred (user's call):** the whole **capo system** (shape vs concert key) —
  its own session; all-12-keys; sharp minor keys (Bm/F#m/C#m would pull in new
  barre majors). "Curate first, expand later."
- **Menu labels are the concise idea, not the 4-bar padding** (v2.7.2, user's
  call) — `I–IV–V`, not `I–IV–V–V`. Custom (hand-edited) progressions still show
  literal per-bar degrees.
- Progression IDs (`maj_1_5`…) are opaque; saved items store resolved chord
  arrays, so ID/label changes never break the library.
- **Nothing tracked leaks the username** — checked when the user asked to scrub
  it: `.claude/launch.json` (the local mirror path) is gitignored/untracked; the
  only `CSG` in the repo is the reverted serial-plate line in this file.

**Still open (see `NEXT_SESSION.md`, folded into `OPEN_ITEMS.md` in session 19):** E1 Unruly density, G1 swing, G2 pre-loaded
patterns, the deferred capo system, JSON export/import.

## Where things stand (session 12, 2026-07-24)

**Session 12 — v2.5.4** (`CACHE` v30), a small refinement batch off the user's
v2.5.3 phone notes. 47/47 green (+1 test). All deployed, pending his phone test
of the feel/sound items.
- **Button sound fires on RELEASE** — the delegated listener moved
  `pointerdown` → `pointerup` (`app.js`). A real momentary switch actuates on
  lift: press-and-hold is now silent, the thock lands on release, alongside the
  action (which was already on click). The CSS push-in (`:active`) still shows on
  press, so you see it go in and hear it let go.
- **Click sound more mechanical** (`ui-sound.js`) — the body is a tighter,
  shorter, higher "clack" (less woody glide) and the contact tick is brighter +
  a touch louder (bandpass 2600→3400 Hz). Device-only to judge; user flagged it
  as minor.
- **Die pop-out flicker** — `.btn-roll` got a fast `box-shadow 0.07s ease` so the
  raised shadow eases back instead of snapping (the snap read as a flicker on
  release). The straight-in sink (no transform) from v2.5.1 is unchanged.
- **Duplicate save names** — `storage.js` `save()` now de-dupes Finder-style via
  `uniqueName()`: the original keeps its plain name, later saves of the same name
  become `Name (2)`, `Name (3)`, … (blanks fall back to `Untitled`, then
  `Untitled (2)`). Was the user's call ("should they get a (1)?"). Test added.
- **Empty-Load copy** shortened to **"Saved patterns will appear here."** — the
  old line wrapped "it" to a second row. Verified single-line at 375px. (Note:
  the empty state only shows if you delete your last item with the Load sheet
  open — the Load button is disabled at zero saves.)
- **Signed off from v2.5.3:** the chord-label repaint fix (#5) and dome
  legibility at 4-bar. **PIMA stays lowercase** (classical `p i m a` convention)
  unless the user asks for caps — recommendation given, not changed.
**v2.6.0 — D3 Help / guide surface** (`CACHE` v31), same session. A read-only
guide in the app's own tweed language, built on `modal.js`.
- **`infoModal({ title, closeText, render })`** added to `modal.js` — a scrollable
  info card with a single close button, no cancel/input. `render(bodyEl)` fills
  the body (content lives in the caller, so `modal.js` stays generic). `present()`
  now guards a null `cancel`. Resolves (void) on button / backdrop / Escape.
> **⟶ SUPERSEDED (v2.11.0):** the Guide is now the **fourth header pill**, not a
> key in the sheet, and the "Appearance" caption is gone. The reasoning below —
> what the Guide *says*, and why the legend explains the cryptic indicators — is
> unchanged; only its entry point moved.

- **Entry: a carved "?" key in the Options sheet**, bottom-right of the Appearance
  row (user's placement call). Note labels dropped from `span-2` to `span-1` so
  the row is Note labels · Theme · Guide "?" in the fixed 3-slot grid. The "?" is
  RAISED (it's an action) not a recessed well. `#open-help` → `infoModal`.
- **Content (`renderHelp` in `app.js`): short how-to + the indicator legend.**
  Six headings (grid = your right hand / roll a pattern / play & sound / chords &
  keys / edit-save-load / indicators). The legend gives the cryptic bits a real
  explanation, not just a hover `title`: amber **ABS**/**MIX** chips (fixed-amber,
  the caution-lamp convention), a red **REC** dot (armed Edit), a green **save**
  dot — a fixed-width marker column aligns their text. All built as DOM (house
  style), theme-styled `.tp-help-*` in `styles.css`, body scrolls inside the card.
- Verified in-browser: 48/48 green (+1 info-modal test), Appearance row clean at
  375px, modal opens/scrolls/closes and leaves the Options sheet open under it.
- **PIMA still lowercase** — the caps question was answered "keep lowercase" as a
  recommendation, not changed.

**v2.6.1** (`CACHE` v32) — phone-test fixes on the v2.6.0 pass:
- **Help copy: note rows by POSITION, not colour.** "amber/cream" only held on
  Merle (note colours are theme-driven: thumb `--active`, fingers `--accent`);
  now "bottom rows / top rows". The fixed ABS/MIX/REC/save legend colours stay.
- **Progression numbering is Roman numerals** (was Arabic). `romanize()` /
  `romanDegrees()` in `data.js` — case encodes quality in the major key
  (I/IV/V major, ii/iii/vi minor). Applied to the context readout, the
  progression dropdown labels, the save-name placeholder (`describeCurrent`) and
  the saved-item metadata line (`summarize`). Pure display — degrees are still
  the stored model. (If the user wants all-caps instead, it's the `ROMAN` map.)
- **Save/Load sheet text unified to `--serif`** (Fraunces, like the modals) —
  `.save-hint`, `.saved-sub`, `.saved-empty` were `--numeral`; bumped ~1px for
  small-serif legibility.
- **Play latch strengthened** — the lit colour was flattening the "pressed-in"
  read. Now darkest at the top (rim shading the sunken face), deeper
  `translateY(2px)` + a stronger inset shadow, so the sink beats the glow.
- Play button still lit while playing; Edit-armed unchanged.

**v2.6.2** (`CACHE` v33) — **tap-highlight "halo" fix.** On Elizabeth (the one
light theme) the Play button flashed a blue "halo" on press. Cause: WebKit's
default `-webkit-tap-highlight-color` (`rgba(51,181,229,0.4)` — Android/WebKit
blue) painting over the tapped shape; invisible on dark faceplates, obvious on
Elizabeth's near-white one. **Touch-device only — never shows with a desktop
mouse, so the dev box couldn't reveal it** (found by reading the computed
property, not by eye). Fix: `-webkit-tap-highlight-color: transparent` on the
interactive controls (added to the existing `touch-action` rule, `.lamp` folded
in), since we already draw our own push-in + click feedback. Affected every
control, not just Play — Play was just the most-pressed on the lightest surface.

**v2.6.3** (`CACHE` v34) — **two-phase "ka-chunk" button sound.** The single
release thock became a tape-deck transport key: a light, bright **"ka"** on
pointer-DOWN (the key travelling in) and a deeper, fuller **"chunk"** on pointer-
UP (the spring seating). `ui-sound.js` refactored into `body()`/`tick()` helpers
and exports **`playPress`** (ka: higher f0 ~250, thin/short, bright tick 3900 Hz)
+ **`playRelease`** (chunk: low f0 ~150, fuller, longer, duller tick 2200 Hz);
`playClick` removed. `app.js` fires `playPress` on the delegated pointerdown and
`playRelease` on pointerup (shared `pressStrength()` matcher, same excludes).
Both halves share the `enabled` flag + lazy iOS-safe AudioContext. Tune by ear on
the phone — all knobs are the two objects passed to `body`/`tick`. This supersedes
the v2.5.4 "sound on release only" note. Device-only to judge.

## Where things stand (session 11, 2026-07-23)

**Session 11 shipped a UI-feel + design-language batch — v2.5.0** (`CACHE` v26).
Four things, all deployed; **pending the user's phone test** (the two you can only
judge on a device — button feel and the press sound — plus the modals/dropdowns).
46/46 checks green (added 2). New files: `js/ui-sound.js`, `js/modal.js`,
`js/dropdown.js` — all precached; the deploy footgun (bump `CACHE`) still applies.

- **Press-in on every button** — the carved `translateY(1px)` + inset-shadow press
  that Edit had is now on the segmented Single/Prog toggle, the sheet ✕, the
  saved-item Load/Rename/Delete, `.btn-primary`, and the new dropdown
  triggers/options. Transport + pills already had it.
- **Button press sound** (`ui-sound.js`) — a short mechanical *thock* (low triangle
  body + band-passed noise "tick"), dependency-free raw Web Audio like
  synth/metronome (no library — keeps the offline PWA clean). Fires on
  **pointerdown** (matches the push-in the instant the finger lands), via ONE
  delegated listener in app.js over `button, .lamp, .dd-trigger, .dd-option`;
  bigger controls (`.btn-roll`) thock a touch deeper. Slider / text inputs / grid
  cells are excluded. Own on/off — **"Button clicks"** lamp in a new *Interface*
  Options section, persisted in the `tp-audio` blob (`audioPrefs.ui`). iOS unlocks
  audio inside the gesture, so the lazily-created AudioContext resumes on first
  tap; muted never opens a context.
- **Native iOS popups → our language.** Two components, both dependency-free:
  - **`modal.js`** — Promise-based `confirmModal()` / `promptModal()` replacing
    `confirm()`/`prompt()` (delete, rename, discard-edits). Tweed card, serif
    title, recessed input, Cancel pill + primary confirm. Destructive actions wear
    the app's **fixed red** confirm (`.tp-modal-danger`, same convention as the REC
    lamp). Callers became `async` (generate/loadSaved/bass+chaos-change,
    delete/rename); `confirmDiscardEdits` now returns a Promise; `boot()` awaits
    the first `generate()`. Escape/backdrop cancel; capture-phase Escape +
    stopPropagation so it doesn't also close the sheet underneath.
  - **`dropdown.js`** — custom tweed dropdowns replacing the native `<select>` open
    picker (iOS always draws that as the OS wheel, outside our language). **KEY
    INVARIANT: the native `<select>` stays in the DOM (`display:none`) as the
    source of truth** — value, options, and the `change` event are unchanged, so
    every existing app.js wiring and the `#grid` change-delegation keep working
    untouched. We overlay a `.dd-trigger` button + a body-level `.dd-panel`
    listbox; a pick writes `select.value` and dispatches a bubbling `change`.
    Programmatic value sets (loadSaved, key transpose, syncProgressionSelect, the
    re-roll reverts) don't fire `change`, so `enhanceSelect` **wraps the element's
    `value` setter** to also refresh the trigger label — no scattered refresh
    calls. `enhanceAll()` runs after `initControls` (theme fills later and syncs
    via its value-set) and again after each render for the per-bar `.bar-chord`
    selects (idempotent per element via `data-dd`). Panel flips up near the bottom
    edge, clamps into the viewport, closes on outside-tap (`.dd-catcher`) / Escape
    / external scroll — but NOT on its own open-time `scrollIntoView` (the reflow
    handler ignores scroll events originating inside the panel; that was a real
    bug for a mid-list selection). Two contexts styled: `.field .dd-trigger`
    (recessed well) and `.dd-trigger.bar-chord` (grid picker).
- **B1 single-chord box height** — the grid is now PINNED to the same vertical
  position in both chord modes (`.stage` top-aligned via a single capped-growth
  `::before` gap that's the only shrinkable item, so it collapses on a short
  screen and the grid never overflows). The big single-mode chord label
  (`#chord-head`) FLOATS with zero flow height (`height:0; overflow:visible;
  align-items:flex-end`), so showing/hiding it never moves the grid. Verified:
  grid top identical single vs progression; SE (375×553) 4-bar has no overflow.
  Known minor edge: SE + 4-bar **single** + a long loaded name can let the
  floating label reach into the name row (default 1-bar/unsaved is clear).

**Docs/tests:** two new checks — the dropdown source-of-truth contract (pick
writes value + fires exactly one bubbling change; programmatic set syncs label
without a change) and the modal resolve behaviour. Both run in `tests.html`
(they use the DOM). The precache-coverage check now also guards the three new
modules.

**Refinement rounds from the phone test — v2.5.1 → v2.5.2** (`CACHE` v28):
- **Die press no longer "slides".** The tilted, light Bakelite die read the
  generic 1px translate as lateral motion; `.btn-roll:active` now sinks straight
  IN (inset shadow only, `transform:none`).
- **Note tokens are 3D DOMES.** A poker-chip (flat face + extruded edge) was
  tried in v2.5.1 and the user preferred the dome, so v2.5.2 reverted to it:
  top-lit radial fill from the per-theme `hi`/`deep` derivations + inset
  rim-light/under-shadow. Fret numeral stays centred/legible even at 4-bar size.
  (`.cell.playing .note` swaps in the glow, so a sounding note loses the dome
  momentarily — fine.) Don't re-propose the chip; dome is the signed-off look.
- **Options sheet reorganised into three clean groups — Generation / Sound /
  Appearance** (v2.5.2). *(⟶ SUPERSEDED: v2.10.0 split the sheet into two PAGES,
  Setup / Preferences, because one page had ~27px spare at 375×553 and nothing
  new could be added. The 2×2 lamp bank described here survives, on page 2.)* The Sound section is a **2×2 lamp bank**
  (`.lamp-row` = `grid` 2col), laid out `Metronome | Melody` over
  `Count-in | Buttons` so the metronome pair shares the left column:
  **Metronome** (was Click / `click-toggle`) · **Melody** (was Notes /
  `pattern-toggle`) · **Count-in** · **Buttons**. The
  toggle **ids are unchanged**, only the visible labels — user's framing was that
  count-in is a musical sound like the rest, so all four sit together. The old
  separate "Playback"/"Interface" headers are gone; "Preferences" → **Appearance**
  (Note labels + Theme). (v2.5.1's interim compact-wrapping lamps were ragged /
  unequal-width — the 2×2 grid fixed the alignment.)
- **Count-in is a toggle** (`metronome.setCountInEnabled`, persisted in
  `tp-audio.countIn`; off ⇒ `countRemaining=0`, loop starts immediately). And the
  **Play button no longer flashes the count-in digits** — that fought the hardware
  feel; the dimmed grid + the blinking beat lamp carry the count now, Play just
  holds the stop glyph. `showCountIn` rewritten accordingly.
- **Play latches IN when playing** — `.btn-play[aria-pressed="true"]` gained
  `translateY(1px)` + inset, so it presses in like armed Edit (still lit).
- **Lingering single-mode chord label** (stayed visible until the Options sheet
  closed): an iOS repaint bug — content behind the sheet's translucent backdrop
  isn't repainted on change, worsened by the label's `transform` compositing
  layer. Fix: the label's lift is now `position:relative;top` (no layer), plus a
  `forceRepaint()` opacity-blip on the stage after a mode switch. **Phone-only to
  verify** (desktop repaints fine).

## Where things stand (session 10, 2026-07-23)

Two threads: a generation bug fix, then the **hardware-details pass** (functional
lamps + button physicality — the user's favourite kind of work).

**v2.4.2 — A3 fix + small polish.** Fingers now generate free of the thumb and
the two layers re-merge PER CHORD (`resolveMergedBar`), so a shared cell keeps
its string-3 fingers in every bar and only D/Dm's alt bass overwrites them — see
the "Two independent layers" and re-strike notes above. Re-strike is redefined as
**same-FINGER only** (thumb-then-finger on string 3 is legit picking, user call).
Also A1 (save-name input 15→16px, kills iOS focus-zoom) and D1 (Play-sound toggle
"Pattern"→"Notes").

**v2.4.3 / v2.4.4 — hardware pass.** Every new lamp is the same glassy jewel body
as the Click/Notes lamps (radial-gradient + rim + inset), so they read as one
family. **Lamp-colour convention:** the beat lamp is theme-driven (`--lamp-*`);
the others are **deliberate fixed hues** like real indicators — **red = REC/armed,
amber = caution, green = save-OK** — NOT the theme accent. Shipped:
- **F1 beat lamp** (`#beat-lamp`, by BPM) — see the metronome note above. Blinks
  are a **pure flash**: constant size + rim, only the glass brightens and an outer
  glow blooms/fades. NO `transform: scale()` (that read as a button moving
  in/out — the user caught it).
- **F2 armed Edit lamp** — a **red** REC jewel on the pencil pill; the pill itself
  is now a **pressed-in latching button** (accent ring, no flat amber fill) when
  armed, which also avoids red-on-amber clash.
- **F3 absolute/mixed caution lamp** — replaced the wordy `type-indicator` text
  with a fixed-**amber** caution jewel + short label (`ABS`/`MIX`); full
  explanation stays on the `title`. Absorbs the old D2 "tag feels out of place".
- **F4 save-confirmation lamp** (`#save-lamp` by the save hint) — one **green**
  flash when a save lands (`blinkSaveLamp()`), the machine acknowledging the write.
- **Button physicality:** Edit/Save/Load pills got the transport's raised/carved
  bevel language (they were the last flat "software" chips).
- **F5 serial plate REVERTED:** shipped an engraved "No. CSG-2.4.2" brass plate,
  then reverted — the filled tag pulled the eye off the grid (grid stays hero).

**Preview limitation (important for verifying):** the Browser-pane preview tab is
`document.visibilityState === "hidden"`, so **`requestAnimationFrame` is paused** —
which freezes BOTH the playhead and the beat lamp. Audio contexts still run, but
onStep/onCountIn never fire in-preview, so the beat lamp's blink (and playhead)
can only be confirmed on a real foreground device. Static/aria-driven lamps
(armed, caution) and one-shot CSS blinks (save) ARE verifiable in-preview.

**v2.4.5 — refinements from the phone test + a rename feature.**
- **Edit armed** dropped the accent ring — the pressed-in latch + red REC lamp
  carry the state (user: "not sure it still needs the outline").
- **Caution indicator moved** out of the header to **bottom-right, above the
  gear** (`.type-indicator` is now `position:absolute` inside `.controls`, which
  is `position:relative`). Frees the header's name row for the pattern name
  alone. Verified it clears the grid even at 375×553 4-bar (13px gap).
- **Descender clipping fixed** — `.loaded-name`/`.saved-name` had a too-tight
  `line-height` under `overflow:hidden`, clipping g/j/q/p/y tails; bumped to 1.3
  + 1px pad. SE budget still fits (measured).
- **Rename in the Load menu** — each saved item is now Load / Rename / Delete.
  New `store.rename(id, name)` (trims, ignores blanks, keeps pattern/id/savedAt);
  the on-screen loaded name syncs if you rename the loaded pattern. Uses
  `prompt()` (consistent with the existing `confirm()` UX). Test added → 44/44.
  Tradeoff: three buttons narrow the name column, so long names ellipsize sooner.

**Pending the user's phone test of v2.4.4 + v2.4.5.** Still open on the list
(`NEXT_SESSION.md`, folded into `OPEN_ITEMS.md` in session 19): B1 (single-chord box height), C1–C3 (keys/progressions),
E1 (Unruly density?), D3 (Help surface), G1/G2 (swing, pre-loaded patterns).
Idea if names ellipsize too much: saved-item icon buttons or a two-row layout.

## Where things stand (end of session 9, 2026-07-23)

**Session 9 shipped the seven-theme color pass — v2.2** (`CACHE` v15), the
second half of the visual-identity arc. 43/43 checks green; all seven themes
eyeballed in-browser at 375px. **Pending the user's phone test** — expect a
nitpick round.

**The structural insight that drove it:** the v2.1 stylesheet had a hidden
"Merle assumption" — `--grid-line`, `--band-thumb`, the beat wash, the idle
play/gear glyph `#cdb894`, the brass literals (`#b98f3f`, `#8a5a20`, `--gold`)
and the amber lamp glow were all **fixed warm-brown values**, which is why
Merle looked finished and every other theme looked like Merle wearing a
different shirt (Elizabeth's "concrete band" and disabled-looking Play button
were this). All of it moved into `theme.js` as per-theme derivations — see the
rewritten Themes note above. The jewel lamps now glow in each theme's `active`
(Jerry's pilot lamps glow teal — the identity moment of the pass).

> **⟶ SUPERSEDED (v2.9.2):** **Jerry is the default theme**, not Merle — the app
> icon is built from Jerry's own role values, so the two match. Merle is still
> the anchor this pass was tuned against, and `styles.css`'s `:root` fallbacks
> are Jerry's now.

**Role edits, per theme** (all in `themes.json`): Merle untouched (the anchor).
Chet: real Gretsch-gold thumb `#f2a93c` (was peach `#ffd9a0`, nearly identical
to the cream fingers — the hand-domain read had vanished), bg/surface one step
deeper. Jerry: darker swamp water bg `#17291e`; bronze hardware. Doc: honey
thumb `#e4b268` (was flat tan — "nothing glowed"), nickel hardware. Elizabeth:
warm-paper surface `#fffcf4` (was clinical white); copper hardware; everything
else was the derivation layer's fault, now fixed. Tommy: fingers deepened from
butter `#ffe9a8` to stage gold `#f5d67b` (value separation from the white
spotlight thumb). Buster: bg/surface one step toward velvet (was reading
synthwave against the tweed).

**Phone review + refinement round (same session, `CACHE` v16):** the user
reviewed all seven on hardware — verdict "fantastic", no role changes asked.
Two refinements from the review:
- **Per-theme `playhead` override** (second optional role, like `hardware`):
  the default `mix(surface, active, 0.4)` desaturates to gray when surface and
  active are near-complements. Doc got lifted denim `#6f8dad` (blue+amber is
  the worst case), Tommy warm brass gel `#7d6f4a` (a stage light, not a gray
  pillar — note his playhead-GLOW stays white, so the note lights white inside
  a warm column), Buster lit lavender `#7569b0` (was mauve mud). Merle, Chet
  (burnished copper — the standout), Jerry (sage) and Elizabeth keep the
  derived blend, which genuinely lands for them.
- **The die is per-theme now:** pips fill `var(--bg)` (fixed brown went
  invisible on Elizabeth's chocolate die; now navy pips on Doc's ivory, cherry
  on Chet's cream, cream on Elizabeth's chocolate) and the bottom edge is
  derived `--accent-deep` instead of a fixed tan smudge.
Buster's beat-column stripes (previous nit) passed the phone review — leave.
- **Gradient caps derived** (`CACHE` v17, user nit: Doc/Buster dice "looked
  multicolored"): the raised-button top highlight was still a fixed warm cream
  `#f6ecd6`, i.e. a warm cap on a cool body. Now `--accent-hi`/`--active-hi` =
  the hue pulled 60% toward white — the die/segmented/primary/load buttons and
  the lit Play are each ONE material, lighter where the light hits. Merle's
  ivory die is visually unchanged (its cream cap was already ~its accent+white).

**Tagged v2.3** (`CACHE` v18) — the visual identity arc (v2.1 structure + this
session's color pass) is complete and signed off on hardware. Version label
bumped to v2.3; no code change from v2.2's last commit beyond the label + cache.

**Dev-environment note:** the Browser-pane preview server can't read
`~/Desktop` (macOS TCC), so in-browser verification ran against an rsync mirror
of the repo in the session scratchpad (`.claude/launch.json` entry
`travis-picker-8141`). Re-sync the mirror after edits before re-checking; the
phone workflow (`serve.py --lan`) is unaffected.

## Where things stand (end of session 8, 2026-07-22)

**Session 8 shipped the visual-identity pass — v2.1** (`CACHE` v13), the first
half of the deferred "visual identity" work. **Structure/"physical" design only;
colour is still deferred** (all seven themes untouched — that's the next
sub-session). Iterated entirely in a throwaway phone-frame mockup before touching
the app; deployed to Pages, **43/43 checks green**, height budget re-measured (SE
still fits, no overflow — see the height-budget note above).

**The design language: the whole screen is one warm tweed "faceplate" — a piece
of gear.** Mood board the user brought: 60s/70s RCA Victor country (Jerry Reed,
Chet Atkins), Gretsch walnut-and-gold, tweed amp grille cloth, Arhoolie folk
(Elizabeth Cotten). The governing rule the user set: **this is a practical
workhorse practice tool — the right-hand pattern grid is ALWAYS the hero; the
chord just labels it. Craftsmanship should surround the tool, never overshadow
it.** (An early "chord as hero" pass with a giant watermark letter was explicitly
rejected for hurting grid legibility.)

- **Serif voice: Fraunces**, bundled at `fonts/fraunces-latin.woff2` (Latin
  subset, full variable axes wght/opsz/SOFT/WONK, ~118KB, **OFL 1.1** — license at
  `fonts/OFL.txt`). No font CDN (offline PWA), so it's precached in `sw.js` +
  a CACHE bump. `--serif` is Fraunces (chords, name, buttons, headers, BPM);
  **`--numeral` stays a geometric rounded stack for fret numbers inside note
  circles** — high-contrast serif hairlines go mushy small. A deliberate
  serif/geometric pairing reads more "designed" than serif everywhere.
- **Faceplate = `body` background:** fixed tweed weave (two crosshatch
  gradients) + a top sheen + an edge vignette, over a new **`--faceplate`** tone
  (derived in `theme.js` as `mix(bg, surface, 0.42)`). The weave/sheen/vignette
  are **fixed rgba (texture, not hue)** so they ride every theme; the colour pass
  tunes the roles, not this. `main` + `.controls` are transparent so it's one
  continuous surface.
- **The grid is RECESSED into the faceplate** (`.grid-track` gets the inset
  shadow + surface fill), the transport buttons are **RAISED + carved** (dished
  radial + chamfer bevel + a debossed/intaglio glyph), and the Options selects
  are **recessed wells** (inset, inverse of the buttons). One consistent
  bevel language.
- **Grid legibility:** killed every per-cell border; strings now read from quiet
  **horizontal lines** (`--grid-line`) + **thumb-row banding** (`--band-thumb` on
  `.domain-thumb`) + the stronger divider under string 3. Only downbeats get a
  faint wash (`.cell.beat::before`). Notes dominate. **Row order confirmed against
  `grid.js` (strings 1→6 top-to-bottom): fingers/cream on top, thumb/amber at the
  bottom** — the mockups initially had this flipped; fixed.
- **Header restructure (two rows)** *(⟶ the header has been rebuilt three times
  since: v2.10.2 collapsed it to ONE 32px row to buy the readout a slot above the
  grid, v2.11.0 brought the name back to its own row for the fourth pill, and the
  pills are icon-only since v2.8.1. Current state is in CLAUDE.md.)* *(the version tag moved to the Options sheet
  in v2.7.4, and the context auto-shrinks to fit since v2.7.5 — see "Where
  controls live" above; row order is otherwise still as described here)*
  **:** row 1 = version + musical **context**
  (`#context`: Nashville degrees + key, e.g. `1 – 5 – 6 – 4 · E`, sized to sit
  quietly by the pills — **progression mode only**) + Edit/Save/Load pills; row 2
  = the pattern **name**, which owns a full row so a long saved name can't stretch
  the buttons (a real bug found mid-session). Name is **always visible** now —
  unsaved reads a muted italic **"Untitled"** (`renderLoadedName`). Single mode
  hides the context row and shows the one chord big above the grid
  (`#chord-head`, modest — the grid is the hero). `renderContext()` in `app.js`
  drives both.
- **Numeral chips:** `grid.js` `buildHeader` now leads with a small numbered chip
  when >1 bar is on screen (fixes 2×2 reading order); in single mode the per-bar
  header is empty (the big chord-head carries it) and collapses via
  `.bar-header:empty`.
- **Hardware transport:** play kept as the standard glyph (it still shows
  count-in digits, so it can't be pure SVG) but dished; **Generate is a tilted,
  stamped cream Bakelite die** and **Options an engraved gear** (inline SVG). BPM
  readout **moved under a full-width slider** (more travel = more precise).
- **Options sheet = the same tweed object lifted forward**, gold hairline lip,
  serif header, section captions. **Click/Pattern are amp "jewel lamps"** — a
  native checkbox (visually hidden, still the control) drives a jewel that glows
  amber when on (`.lamp input:checked ~ .jewel`); off-state is dark glass. User's
  favourite moment.

**Signed off as V2.1 pending the user's real-phone test.** The user expects
possible **subtle refinements** after drilling on it. Everything is structure —
when the colour sub-session happens, it's a `themes.json` edit plus tuning the
fixed texture-overlay opacities if needed. **Still to do in the visual arc:** the
seven-theme colour/legibility pass (deferred here), then pre-loaded patterns.

## Where things stand (end of session 7, 2026-07-22)

**Session 7 shipped pattern audio playback and tagged v2.0** (`CACHE` v12).
You can now *hear* a generated pattern, not just see it + the metronome. The
raw-Web-Audio-vs-synth-library question is **settled: dependency-free
Karplus-Strong** sounds like a string, so no library (see the Pattern-playback
note under the Metronome section for the full design). Deployed to Pages, 43/43
checks green.

- **Rides the existing scheduler**, no second clock (as planned). Two independent
  **Click / Pattern** toggles in Options, both default on, persisted; count-in
  always clicks. Play stays a plain start/stop transport.
- **Bass is palm-muted** — this was the guitar-test feedback loop this session:
  first pass rang out too long (KS rings ~4× longer on low strings), shortened
  the tail, then the user wanted the classic palm-muted thumb *thump*. Added a
  `brightness` knob (in-loop low-pass + pre-smoothed attack) and tuned by ear to
  **`brightness: 0.37`**. All voice knobs are numbers in `synth.js`.
- **UX answers from the user:** Play output = **independent Click + Pattern
  toggles** (not one combined button); bass **slightly louder** than fingers.
- **Verified in-browser** (couldn't hear it from the dev box): plucks schedule
  through the synth, toggles gate correctly, offline render confirmed the muted
  bass is measurably darker + shorter than the bright voice. **Sound quality was
  the user's call on the phone** — that's what drove the brightness tuning.
- Open thread: pattern playback and the metronome click can mask each other at
  some tempos; fine so far, but the per-note `gain`s in `synth.js` are where to
  balance if the pattern gets lost under the click.

> **⟶ Since done:** the visual identity pass shipped in sessions 8 (structure)
> and 9 (colour). Pre-loaded patterns and the custom bass builder are still open —
> see `OPEN_ITEMS.md`.

**NEXT SESSION — visual identity pass** (now that audio is done). In suggested
order:
- **Visual identity pass** (expanded from the old "theme colour pass" at the
  user's request): overall appearance — **fonts and general visual style, "make
  it feel more my own"** — with dialing in the seven themes as a subsection. Do
  it **against a real phone screen**. Relaxes the old "themes.json only" rule:
  fonts touch `styles.css`, and a bundled font file needs `sw.js` precache + a
  CACHE bump. Dependency-free + offline PWA → system font stacks or a bundled
  .woff2, no font CDN. (User may bring a visual reference.)
- **Pre-loaded patterns** (user wants this): ship as *data* — a read-only
  "Built-in" section in the Load sheet with "save a copy", NOT seeded into
  localStorage (survives reinstalls, never pollutes the real library, updates
  can add more). Fits the "favorites as a folder within Saved" design note.
- **Custom 4-slot bass builder** — *pending a real need.* What it adds over the
  manual editor: a custom bass is a reusable GENERATION input (re-roll fingers
  over it endlessly via the layer system), relative-by-construction (follows
  progressions), persistent in the Thumb selector. The open question posed to
  the user: do they ever want a bass line outside the seven presets? If that
  itch never comes, drop it like 16ths.
- Smaller: JSON export/import of the Saved library (insurance against iOS's
  ~7-day localStorage eviction), grid-bar crowding if long names bite.

**DROPPED: syncopation/16ths** (user call, this session): at real Travis-picking
tempos the 8-slot grid is already all you can fit — 16ths would generate
patterns nobody drills. Don't resurrect without a musical reason.

## Where things stand (end of session 6, 2026-07-21)

> **⟶ NAMING (v2.12.0):** everything below calls the setting "chaos" and its
> outlier tier "Chaos". In the UI the setting is now **Fingers** and the tier is
> **Wild Card**, under an **Experimental** heading. **The internal ids are
> unchanged** (`chaos`, `CHAOS_PRESETS`, `state.chaos`) — saved patterns store
> them — so every code reference below still resolves.

Session 6 acted on the session-5 guitar test and **redesigned the chaos difficulty
model** around what the user showed with two worked grid images: difficulty is
**strike-times + finger independence, not note count**. See the rewritten Chaos
note under "Key rules." Round 1 deployed as **v1.2** (`CACHE` v7); the user
tested it on guitar the same day, which produced **round 2** below.

- **The reframe, in the user's words:** a full three-finger pinch is *easy* (fingers
  move together); five scattered attacks with a lone finger here and a different
  pair there is *hard* (independence). Two images made the point — image 1 (9 dots,
  3 synchronized rake-strikes) = Tame; image 2 (fewer dots, 5 independent attacks)
  = Loose.
- **What changed in code:**
  - `js/data.js` `CHAOS_PRESETS` rebuilt: added `syncFingers` + `groupSizeOdds`,
    dropped `allowDoubleStops`. Tame = `syncFingers:true` (one consistent group,
    2–3 strike-times); Loose/Unruly/Chaos independent, floors raised (Loose
    `minOffbeats` 2→3, Chaos 0→1). **Triples allowed in every tier.**
  - `js/generator.js` `generateTrebleLoop`: sync path (pick one group, strike it
    everywhere, clamp per column) + a **hard no-blank guard** (every bar ≥1 finger
    note — the rule the user asked for).
  - `js/tests.js`: retooled the tier tests (Tame synchronization %, no-blank across
    all tiers, triples-any-tier), and made the shared-cell editor test robust to
    RNG drift (it had assumed an empty cell).
- **Measured after the change** (300 seeds/tier): Tame 2.6 strike-times / 100%
  one-finger-set; Loose 4.6 / 1%; Unruly 4.9 (denser, adjacency off); Chaos ranges
  sparse→full. Matches the two images.
- **Decisions from the session's questions:** pinches stay **uniform** across beats
  (the "2 and 4" was just an example — could as easily be 1 and 3); Tame's group is
  **any consistent size 1–3**, not fixed at three ("don't get hung up on the
  3-finger thing — strike-times is the key").

**Round 2 (same day, after the round-1 phone test).** The user sent two more Tame
examples that round 1's strict synchronization could NOT generate (a lone finger +
a repeated pair; three different sets in three strikes) — proving **independence
emerges from density and shouldn't be enforced**. Changes, all deployed as v1.3
(`CACHE` v8), 41/41 green:
- **`syncFingers`/`groupSizeOdds` removed** (lived one round). All tiers roll
  finger-sets per column; Tame is Tame because its strike budget is 2–3.
- **Strike budget is now TOTAL columns** (`min/maxStrikes` replacing
  `min/maxOffbeats`): pinches count against it, not on top — found empirically,
  a "Tame" bar had rolled 6 attack columns via pinch stacking.
- **`allSinglesOdds` added** (user: "decent percentage should be all single
  fingers" — was too rare): per-pattern roll, Tame 0.45 / Loose 0.30 / Unruly
  0.10; measured all-singles rates 57/39/9%.
- **Chaos = fully random, off the difficulty curve** (user's call, matches the
  original spec's "novelty over playability"): uniform 1–8 strikes, uniform
  column shape, coin-flip pinches. Only the no-blank guard survives.

**Round 3 (2026-07-22, deployed as v1.4, `CACHE` v9).** The round-2 build "feels
very good" — two tweaks only: **Unruly's floor raised** (`minStrikes` 4→5,
`allSinglesOdds` 0.10→0.05; occasional rolls read too easy for the tier) and the
**startup chord is now E** (`DEFAULT_CHORD` in `data.js` — what the user actually
drills; taste, not musical logic).

**Round 4 (2026-07-22, deployed as v1.5, `CACHE` v10) — pinch allocation
unified.** The user asked why pinches were a separate mechanism at all; answer:
mostly vestigial (the old offbeats-are-the-dial model), except for one musical
fact worth keeping — a pinch rides the thumb's existing attack moment while an
offbeat strike creates a new one (the syncopation skill). So the two-phase
allocator (roll pinches, spend the rest on offbeats — which structurally
preferred offbeats and caused Unruly's budget shortfall) became **one weighted
roll per budgeted strike**: `pinchOdds` is now the per-strike chance of landing
on a beat, with fallback to whichever side has room. User calls: all-pinch bars
**rare but possible** (measured: Tame ~3%, Loose ~0.6%). Results: Unruly is a
true 5–6, Chaos's strike spread is genuinely uniform 1–8 (the old cap starved
7–8), and pinch counts in busy tiers rose to their natural rate (Unruly ~2.2/bar
from ~1.4).

**Round 5 (2026-07-22, deployed as v1.6, `CACHE` v11) — re-strikes rationed.**
Round 4 verdict: offbeat preference gone (good), but Unruly "a little too much"
— the user proposed capping adjacency rather than lowering density, which is
the right call (re-strikes are the spec's "hardest thing", and unlimited
adjacency + the true strike floor averaged ~3.5 pairs/bar, tail to 11). The
`noAdjacentSameString` boolean became **`maxRestrikes`** — a per-bar re-strike
budget (0 clean / 2 Unruly / Infinity Chaos), each audible adjacent pair
charged to the bar placing it. Unruly now rolls 0–2 pairs/bar (avg ~1.9);
Tame/Loose/Chaos measurably unchanged. New test asserts the loop-wide cap.

**Round 5 CONFIRMED on guitar — generation tuning is SIGNED OFF** (user:
"more playable while still clearly the most challenging tier"; "we'll call this
good for now on the generation tweaking"). All four tiers are guitar-approved.
If feel ever drifts, everything is numbers in `CHAOS_PRESETS` — `maxRestrikes`
1/3 for milder/spicier Unruly, etc.

## Where things stand (end of session 5, 2026-07-21)

> **⟶ NAMING (v2.12.0):** "Chaos" the tier is **Wild Card** in the UI, and the
> setting is **Fingers**. Internal ids unchanged — see the session 6 note.

Session 5 shipped four things, all deployed to Pages (`CACHE` now at **v5**) and
**40/40 checks green**. Everything below is deployed but **only the iOS zoom fix
is confirmed on the phone** — the bass presets and the whole chaos redesign are
**pending the user's guitar test that night**. Expect tuning feedback.

1. **iOS double-tap-zoom fix** *(confirmed on hardware)* — fast double-taps on 🎲
   were triggering Safari's double-tap-to-zoom. Fix: `touch-action: manipulation`
   on `button, select, input, .cell` in `styles.css`. Scoped to controls, not the
   viewport, so pinch-zoom still works.
2. **`v1.0` version tag**, top-left of the grid-bar (`.app-version`) — low-profile
   muted label riding the existing 36px row (no vertical cost). Bump by hand at
   release points. *(It moved to the Options sheet header in v2.7.4 and to the
   foot of the Guide in v2.10.1, where it's `APP_VERSION` in `app.js`. Each move
   was to give the width back to a readout beside it.)*
3. **All seven bass presets surfaced** (see the Bass-presets note above). Dropped
   the `V1_BASS_IDS` filter. Absolute Climb/Descend correctly ignore the chord.
4. **Chaos redesign** (see the expanded Chaos note under "Key rules") — the big
   one. Was a user-authored spec brought in from another session; done in two
   deploys: **step 1** = 4 tiers (Tame/Loose/**Unruly**/Chaos) + all density
   moved into `CHAOS_PRESETS`; **step 2** = circular whole-loop generation
   (`generateTrebleLoop`) fixing the loop-point re-strike. Measured density curve
   (finger notes/bar): Tame ~2.1, Loose ~4.2, Unruly ~6.0, Chaos ~7.7.

**Decisions worth knowing before you tune:**
- Tier feel is **all in `CHAOS_PRESETS`** — numbers only, no generator changes
  needed. That's where any "too busy / too sparse / wrong gap" feedback goes.
- **Hard adjacency for Tame/Loose** was a deliberate spec-alignment call: the
  clean tiers now genuinely never re-strike, at the cost of occasionally dropping
  an offbeat below the target count. If the user finds Tame/Loose too thin, that
  tradeoff (or the offbeat range) is the first knob.
- Naming: **"Unruly"** was the user's pick (candidates were Rowdy/Frayed/Feral).
- `favorSingleOffbeats` was removed (redundant once odds are explicit).

## Where things stand (end of session 4, 2026-07-20)

**v1 is complete and has now run on real hardware** (iPhone XS Max, Safari, over
`serve.py --lan`). 30/30 checks green; the tree is clean; nothing in progress.

**First phone session — confirmed on hardware:**
- **Metronome audio works** on iOS Safari, on every theme and across the tempo
  range. The big unknown (was the AudioContext create/resume in the Play handler
  enough for iOS?) is answered: yes.
- **Tap targets** are big enough to hit in edit mode with all 4 bars showing.
- The 2×2 grid is **legible at arm's length**; fret numbers are small but
  readable at 4-bar size, fine at 1-bar. Themes render **differently on the phone
  than the laptop** — still the deferred colour pass (below), not a regression.
- One-handed operation is fine.

**Fixed this session (all from the phone test):**
- **Playhead didn't light the bass rows.** Two bugs. (1) A CSS specificity miss
  let the thumb-row domain tint outrank `.cell.playing`. (2) Even fixed, a note
  circle covers 82% of its cell, so on a beat the tint was hidden behind the
  thumb note — the playhead looked like it skipped the bass. Now a sounding cell
  also lifts + haloes its note (`--playhead-glow`); user likes the halo.
- **Layout overflowed.** The 4-bar grid was clipped (5px on the XS Max, up to
  142px on an SE-class screen) because chrome was 361px. Cut to ~101px *(⟶ the v2.1
  identity pass grew it back to ~169px on purpose, and v2.10.2 collapsed the
  header again; the live numbers are in CLAUDE.md's height-budget table)*: dropped
  the app bar, moved generation inputs into an **⚙ Options sheet**, made Generate
  a **🎲 button**. Permanent strip is now just Play / BPM / 🎲 / ⚙. See "Where
  controls live" and "The height budget is the constraint" above — **re-measure
  the two viewports in that table after any chrome change.**
- **BPM ceiling 160 → 240** (160 was too slow for real fingerstyle). Widened the
  scheduler lookahead to 0.2s so a fast 8th still schedules in time.
- **"relative" type indicator hidden** — it now shows only as an absolute/mixed
  "bass won't follow the chords" warning; the normal case was just noise.

**Open threads — worth raising before building on top of them:**
- **Themes need a dedicated pass.** *(⟶ done, session 9.)* They read differently on the phone than the
  laptop — all seven are a reasonable first cut, none is finished. The user wants
  a whole session on colour and legibility, deliberately deferred behind
  functionality. Do it against a real phone screen; `themes.json` is the only
  file that should change.
- **iOS may evict `localStorage` after ~7 days of not opening the app** (Safari's
  storage cap on script-writable data). Save/Load persistence across a full
  Safari quit-and-reopen is now **verified on hardware** — favourites survive.
  But the 7-day eviction is a real risk for a tool used intermittently;
  installing as a home-screen PWA is the main mitigation, another reason Phase 3
  matters. If saved patterns ever vanish for a user, this is the first suspect.
- **Grid bar crowding.** *(⟶ addressed: icon-only pills in v2.8.1, and the name
  got its own full-width row again in v2.11.0.)* The slim bar above the grid holds the pattern name, the
  type indicator and three pills (Edit/Save/Load). Fits at 375px, but a long
  saved-pattern name will squeeze. Options if it bites: truncate harder, or drop
  "Edit" to just the pencil glyph.
- **No save-time relative/absolute dialog.** The spec asked for one; drawing
  instead keeps role-matching bass relative, marks off-role bass absolute, and
  reports `relative`/`mixed`/`absolute` live. Revisit only if a save-time choice
  ("snap to nearest role" vs "keep absolute") is actually wanted.
- Chord voicings, including the barre shapes, were checked on a real guitar and
  confirmed good. The G Travis bass walks 6–4–5–4 (G–D–B–D); string 5 fret 2 is
  the B from the open G shape, chosen for playability over the literal fifth.

**Session 4 — Phase 3 DONE: PWA packaging + hosted on GitHub Pages. Verified on
hardware** (iPhone XS Max): installed to the home screen, launches standalone,
works in **airplane mode**, saved patterns persist offline. 32/32 checks green.

- **Live at https://cadengunn.github.io/travis_picker/** — public repo
  `cadengunn/travis_picker`, Pages deploys from `main` / root.
- **PWA files added** (dependency-free, no-build like the rest):
  - `manifest.webmanifest` — standalone, portrait, merle colours, 192/512 icons
    (`any maskable`). **Relative `start_url`/`scope` (`./`)** so it survives the
    `/travis_picker/` project subpath; all app paths were already relative.
  - `index.html` — manifest link + iOS `apple-*` tags and `apple-touch-icon`
    (iOS ignores the manifest for the home-screen icon; those tags are what make
    the standalone install + icon work), plus a favicon.
  - `sw.js` — cache-first app-shell precache for true offline; deletes old caches
    on activate; `skipWaiting` + `clients.claim`.
  - `icons/` — generated by `tools/make_icons.py`, a **pure-Python (stdlib-only,
    no PIL) PNG codec + resampler** (this Mac has no PIL/ImageMagick/Node). Since
    session 15 it frames and downscales the drawn `tools/icon-master.png` (the
    thumbs-up-with-a-thumbpick mark) rather than drawing shapes itself, keeping
    the art in the maskable safe zone so one piece serves every mask. Re-run it if
    the mark changes; it's an authoring tool, nothing imports it at runtime.
  - `tests.js` — two async PWA checks: manifest validity, and **precache
    coverage** (every runtime module cached, `tests.js` excluded, all entries
    resolve). The coverage check catches "added a module, forgot to precache it →
    offline silently breaks."
- **⚠️ THE DEPLOY FOOTGUN — do this on every deploy that changes app files:**
  bump `CACHE` in `sw.js` (`travis-picker-v1` → `-v2` …) or installed users get
  stale code until a new SW activates. Doc-only pushes (CLAUDE.md/spec/workflow/
  tests aren't precached) don't need a bump. If a change doesn't show on the
  phone: force-quit and reopen so the waiting SW takes over.
- **⚠️ THE SECOND FOOTGUN, found in session 17: the precache MUST bypass the
  HTTP cache.** GitHub Pages serves app files `max-age=600`, and `cache.addAll`
  fetches through that cache — so a worker installing within ten minutes of the
  PREVIOUS deploy fills the NEW cache with the OLD bytes. The state is permanent
  and silent (the cache is written only at install, so nothing re-fetches; the
  app runs stale code under a current worker and force-quitting can't shake it
  loose). `install` now fetches each entry with `{ cache: "reload" }`. Measured,
  not theorised: against a `max-age=600` response, three default-mode fetches
  never reached the server and a `reload` fetch did. `updateViaCache: "none"`
  only exempts `sw.js` itself — it does nothing for the files `sw.js` fetches.
- **The SW only registers on the real HTTPS origin** — `app.js` skips
  `localhost`/`127.0.0.1` so it never fights `serve.py`'s no-store while
  developing (and a plain-http `--lan` origin can't register a SW anyway). So the
  SW can only be exercised on the live Pages URL, not locally — by design.
- **Deploy loop:** edit → (bump `CACHE` if app files changed) → `git push`
  (token is cached in the keychain) → Pages rebuilds in a minute → force-quit +
  reopen on the phone. Live content-types verified correct (sw.js as
  `application/javascript`, manifest as `application/manifest+json`).
- **Privacy — the repo is public.** Before the first push, commit history was
  rewritten (`git filter-branch`) to `cadengunn
  <cadengunn@users.noreply.github.com>`, removing the real name and laptop
  hostname; repo-local `user.name`/`user.email` are set to that identity, so
  **future commits must not reintroduce the real name/email.** One workplace
  reference in the workflow doc was reworded out. No secrets/keys in the repo
  (there's nothing to leak — it's a static app).
- The **localStorage ~7-day eviction risk** (open thread above) is now mitigated
  by the home-screen install, its main defence.
