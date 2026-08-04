# Chord reference — every chord the app supports

A cross-check sheet, not a source — the truth is `OPEN_CHORDS` + `BARRE_TEMPLATES`
in `js/data.js`. **The tables below are GENERATED, not hand-typed**, which is
the fix for how this doc rotted once already: ~25 of the 120 chords were
revoiced across session 35 alone and the hand-written tables silently fell out
of sync with what the app actually plays. Never hand-edit anything between the
`GENERATED:START` / `GENERATED:END` markers — regenerate it instead:

1. Serve the repo over HTTP (`python3 serve.py` — ES modules need it, see
   `CLAUDE.md`'s "Running it").
2. Open `tools/gen_chord_reference.html`. It imports `js/data.js` directly and
   renders the same two tables you see below into a textarea.
3. Select all, copy, and paste over everything between the markers.

The commentary outside the markers (this intro, "How to read it", "Worth your
eye") is hand-written and stays hand-written — it's reasoning and judgment
calls, not derivable from the data. Session-by-session narrative (whose call a
voicing was, what it replaced) belongs in `CHANGELOG.md`, not here, so this
file only ever has to say what's true *now*.

## How to read it

- **Tab** is `6 5 4 3 2 1` — low E string first, `x` = not played. Numbers are
  frets, `0` = open. **Capo is not included** — these are shape frets, exactly
  what the grid shows you.
- **Notes** are the sounding pitches of that shape, same string order.
- **Intervals** are those notes relative to the chord's root: `R 3 5 ♭7 △7 6 9 4`.
  A `·` is a muted string.
- **Thumb: root ↔ alt** is the alternating bass the generator uses — the two
  notes your thumb rocks between, with the string each sits on. **Fifth** is
  the third bass role (used by the Travis and Root–Fifth presets).
- **Max fret** is the highest fretted note. Most of the library stays ≤ 8;
  **`Cm6` and `C♯m6` are a deliberate, named exception** (his call, session 33 —
  he supplied these exact frets to play the E-shape min6 template at its higher
  position rather than the auto-picked lower one), reaching 10 and 11. The
  library's general ceiling is 12.

Two conventions worth knowing before you flag something as wrong:

1. **A full barre is assumed**, so the low string counts as an available bass
   note even where a textbook voicing mutes it (this is why B7 frets string 6,
   and why the barre chords all show a note there).
2. **Open-position voicings are hand-declared** (the shapes you'd actually
   play); everything else is derived from an E-shape or A-shape template,
   *whichever barres lower*.

---

## Worth your eye — durable judgment calls, not fret trivia

These are standing facts about the library's design, current as of whatever
`js/data.js` says right now (that's what the generator reads). If a shape
below ever looks off against one of these, trust the table, not this list —
and it means this section needs an update, not the table.

- **sus2 alternates root ↔ 9th, not root ↔ fifth,** wherever the open voicing
  leaves no fifth on a bass string — `Csus2` walks C ↔ D, `Gsus2` walks G ↔ A.
  sus2 has no third, so the open bass string gives the 2nd instead. Musically
  fine, but it's an unusual thumb pattern worth knowing about before you hear
  it and wonder.
- **maj7 and m7 don't behave the same way on an E-shape barre root**, even
  though they're siblings in the template. maj7 puts the major 7th on the
  alt-bass string, so those roots alternate root ↔ 7 — the same trade dom7
  makes. **m7 does not** (session 35b, his call on the voicing): it keeps a
  plain root ↔ octave bass, with the ♭7 sounding only as a finger colour. Check
  a specific chord's own row for which it does — the point of this note is
  that "maj7 and m7 sound similar" is not a safe assumption here.
- **The A family is uniform**: `A`, `Am`, `A7`, and every other A-quality chord
  all sound the open low E string as their fifth. They didn't always — three of
  them used to mute string 6 while declaring it as a bass role, a genuine
  contradiction between the shape and what the thumb played. A test now forbids
  any chord in the library from doing that.
- **`Csus4` is a single full 6-string barre**, not two disconnected partial
  barres. The tempting "take open C and bump the 3rd to a 4th" voicing forces
  two separate partial-barre clusters that don't touch — the specific kind of
  hard he flagged, distinct from an ordinary full barre, which he's fine with.
  Falling through to the general A-shape template gives the one coherent barre
  instead.
- **The moving finger is data, not geometry**, and it's a short, closed list:
  **`C`, `C7`, `C6`, `B7`** — that's all of it (`MOVING` in `data.js`). The
  obvious geometric rule (two bass-role notes, adjacent strings, same fret)
  fires on 82 of the 120 chords and is wrong on most of them — an ordinary F
  barre has exactly that shape and nothing moves, you just hold both notes with
  ring and pinky. What actually forces a finger to travel is a hand-fact (the
  standard shape already commits every finger before the low bass note is
  added), which is why it has to be declared per chord rather than derived.
  `F♯6` and `E♭add9` both had an entry here through earlier revoicings and lost
  it when a later voicing pass replaced them with shapes that hold every note
  as a static barre — **worth confirming on the guitar**, since dropping a
  moving-finger technique changes what your hand actually does, not just what
  the diagram shows.
- **Nothing in the current library needs more than a 4-fret stretch.** The
  widest shapes are `B♭add9` and `Badd9`, both span 4; everything else is 3 or
  less. That weren't always true — an earlier voicing pass had several 5-fret
  spans (`G♯sus2`, `F♯sus2`, `Fsus2`, `C♯add9` among them) that a later
  playability pass (session 35) replaced with tighter, full-barre shapes. If
  you ever hit a shape that feels like a real stretch, it's worth flagging —
  the library isn't supposed to have one left.

---

<!-- GENERATED:START — regenerate via tools/gen_chord_reference.html, see the intro above. Do not hand-edit below this line. -->

## The 10 qualities

| Reel section | Quality | Suffix | Formula |
|---|---|---|---|
| Triads | Major | *(none)* | R 3 5 |
| Triads | Minor | `m` | R ♭3 5 |
| Sevenths | 7 | `7` | R 3 5 ♭7 |
| Sevenths | maj7 | `maj7` | R 3 5 △7 |
| Sevenths | m7 | `m7` | R ♭3 5 ♭7 |
| Sixths | 6 | `6` | R 3 5 6 |
| Sixths | m6 | `m6` | R ♭3 5 6 |
| Suspended | sus2 | `sus2` | R 9 5 |
| Suspended | sus4 | `sus4` | R 4 5 |
| Added | add9 | `add9` | R 3 5 9 |

*(dim7 is deliberately absent — no perfect fifth means no natural alternating-bass
target, and it's the least idiomatic for this style.)*

---

## Every chord, by root

### C

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **C** | `3 3 2 0 1 0` | G C E G C E | 5 R 3 5 R 3 | C (s5) ↔ E (s4) | G (s6) | 3 |
| **Cm** | `3 3 5 5 4 3` | G C G C E♭ G | 5 R 5 R ♭3 5 | C (s5) ↔ G (s4) | G (s6) | 5 |
| **C7** | `3 3 2 3 1 0` | G C E B♭ C E | 5 R 3 ♭7 R 3 | C (s5) ↔ E (s4) | G (s6) | 3 |
| **Cmaj7** | `3 3 2 0 0 0` | G C E G B E | 5 R 3 5 △7 3 | C (s5) ↔ E (s4) | G (s6) | 3 |
| **Cm7** | `3 3 5 3 4 3` | G C G B♭ E♭ G | 5 R 5 ♭7 ♭3 5 | C (s5) ↔ G (s4) | G (s6) | 5 |
| **C6** | `3 3 2 2 1 0` | G C E A C E | 5 R 3 6 R 3 | C (s5) ↔ E (s4) | G (s6) | 3 |
| **Cm6** | `8 10 10 8 10 8` | C G C E♭ A C | R 5 R ♭3 6 R | C (s6) ↔ C (s4) | G (s5) | 10 |
| **Csus2** | `3 3 0 0 3 3` | G C D G D G | 5 R 9 5 9 5 | C (s5) ↔ D (s4) | G (s6) | 3 |
| **Csus4** | `3 3 5 5 6 3` | G C G C F G | 5 R 5 R 4 5 | C (s5) ↔ G (s4) | G (s6) | 6 |
| **Cadd9** | `3 3 2 0 3 0` | G C E G D E | 5 R 3 5 9 3 | C (s5) ↔ E (s4) | G (s6) | 3 |

### C♯

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **C♯** | `4 4 6 6 6 4` | G♯ C♯ G♯ C♯ F G♯ | 5 R 5 R 3 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯m** | `4 4 6 6 5 4` | G♯ C♯ G♯ C♯ E G♯ | 5 R 5 R ♭3 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯7** | `4 4 6 4 6 4` | G♯ C♯ G♯ B F G♯ | 5 R 5 ♭7 3 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯maj7** | `4 4 6 5 6 4` | G♯ C♯ G♯ C F G♯ | 5 R 5 △7 3 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯m7** | `4 4 6 4 5 4` | G♯ C♯ G♯ B E G♯ | 5 R 5 ♭7 ♭3 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯6** | `4 4 6 6 6 6` | G♯ C♯ G♯ C♯ F B♭ | 5 R 5 R 3 6 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯m6** | `9 11 11 9 11 9` | C♯ G♯ C♯ E B♭ C♯ | R 5 R ♭3 6 R | C♯ (s6) ↔ C♯ (s4) | G♯ (s5) | 11 |
| **C♯sus2** | `4 4 6 6 4 4` | G♯ C♯ G♯ C♯ E♭ G♯ | 5 R 5 R 9 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯sus4** | `4 4 6 6 7 4` | G♯ C♯ G♯ C♯ F♯ G♯ | 5 R 5 R 4 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 7 |
| **C♯add9** | `1 4 1 1 4 1` | F C♯ E♭ G♯ E♭ F | 3 R 9 5 9 3 | C♯ (s5) ↔ F (s6) | G♯ (s3) | 4 |

### D

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **D** | `x 0 0 2 3 2` | x A D A D F♯ | · 5 R 5 R 3 | D (s4) ↔ A (s3) | A (s5) | 3 |
| **Dm** | `x 0 0 2 3 1` | x A D A D F | · 5 R 5 R ♭3 | D (s4) ↔ A (s3) | A (s5) | 3 |
| **D7** | `x 0 0 2 1 2` | x A D A C F♯ | · 5 R 5 ♭7 3 | D (s4) ↔ A (s3) | A (s5) | 2 |
| **Dmaj7** | `x 0 0 2 2 2` | x A D A C♯ F♯ | · 5 R 5 △7 3 | D (s4) ↔ A (s3) | A (s5) | 2 |
| **Dm7** | `x 0 0 2 1 1` | x A D A C F | · 5 R 5 ♭7 ♭3 | D (s4) ↔ A (s3) | A (s5) | 2 |
| **D6** | `x 0 0 2 0 2` | x A D A B F♯ | · 5 R 5 6 3 | D (s4) ↔ A (s3) | A (s5) | 2 |
| **Dm6** | `x 0 0 2 0 1` | x A D A B F | · 5 R 5 6 ♭3 | D (s4) ↔ A (s3) | A (s5) | 2 |
| **Dsus2** | `x 0 0 2 3 0` | x A D A D E | · 5 R 5 R 9 | D (s4) ↔ A (s3) | A (s5) | 3 |
| **Dsus4** | `x 0 0 2 3 3` | x A D A D G | · 5 R 5 R 4 | D (s4) ↔ A (s3) | A (s5) | 3 |
| **Dadd9** | `2 5 2 2 5 2` | F♯ D E A E F♯ | 3 R 9 5 9 3 | D (s5) ↔ F♯ (s6) | A (s3) | 5 |

### E♭

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **E♭** | `6 6 8 8 8 6` | B♭ E♭ B♭ E♭ G B♭ | 5 R 5 R 3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭m** | `6 6 8 8 7 6` | B♭ E♭ B♭ E♭ F♯ B♭ | 5 R 5 R ♭3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭7** | `6 6 8 6 8 6` | B♭ E♭ B♭ C♯ G B♭ | 5 R 5 ♭7 3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭maj7** | `6 6 8 7 8 6` | B♭ E♭ B♭ D G B♭ | 5 R 5 △7 3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭m7** | `6 6 8 6 7 6` | B♭ E♭ B♭ C♯ F♯ B♭ | 5 R 5 ♭7 ♭3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭6** | `6 6 8 8 8 8` | B♭ E♭ B♭ E♭ G C | 5 R 5 R 3 6 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭m6** | `11 9 8 8 11 8` | E♭ F♯ B♭ E♭ B♭ C | R ♭3 5 R 5 6 | E♭ (s6) ↔ F♯ (s5) | B♭ (s4) | 11 |
| **E♭sus2** | `6 6 8 8 6 6` | B♭ E♭ B♭ E♭ F B♭ | 5 R 5 R 9 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭sus4** | `6 6 8 8 9 6` | B♭ E♭ B♭ E♭ G♯ B♭ | 5 R 5 R 4 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 9 |
| **E♭add9** | `3 6 3 3 6 3` | G E♭ F B♭ F G | 3 R 9 5 9 3 | E♭ (s5) ↔ G (s6) | B♭ (s3) | 6 |

### E

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **E** | `0 2 2 1 0 0` | E B E G♯ B E | R 5 R 3 5 R | E (s6) ↔ E (s4) | B (s5) | 2 |
| **Em** | `0 2 2 0 0 0` | E B E G B E | R 5 R ♭3 5 R | E (s6) ↔ E (s4) | B (s5) | 2 |
| **E7** | `0 2 2 1 3 0` | E B E G♯ D E | R 5 R 3 ♭7 R | E (s6) ↔ E (s4) | B (s5) | 3 |
| **Emaj7** | `0 2 1 1 0 0` | E B E♭ G♯ B E | R 5 △7 3 5 R | E (s6) ↔ E♭ (s4) | B (s5) | 2 |
| **Em7** | `0 2 2 0 3 0` | E B E G D E | R 5 R ♭3 ♭7 R | E (s6) ↔ E (s4) | B (s5) | 3 |
| **E6** | `0 2 2 1 2 0` | E B E G♯ C♯ E | R 5 R 3 6 R | E (s6) ↔ E (s4) | B (s5) | 2 |
| **Em6** | `0 2 2 0 2 0` | E B E G C♯ E | R 5 R ♭3 6 R | E (s6) ↔ E (s4) | B (s5) | 2 |
| **Esus2** | `0 2 2 4 0 2` | E B E B B F♯ | R 5 R 5 5 9 | E (s6) ↔ E (s4) | B (s5) | 4 |
| **Esus4** | `0 2 2 2 0 0` | E B E A B E | R 5 R 4 5 R | E (s6) ↔ E (s4) | B (s5) | 2 |
| **Eadd9** | `0 2 2 1 0 2` | E B E G♯ B F♯ | R 5 R 3 5 9 | E (s6) ↔ E (s4) | B (s5) | 2 |

### F

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **F** | `1 3 3 2 1 1` | F C F A C F | R 5 R 3 5 R | F (s6) ↔ F (s4) | C (s5) | 3 |
| **Fm** | `1 3 3 1 1 1` | F C F G♯ C F | R 5 R ♭3 5 R | F (s6) ↔ F (s4) | C (s5) | 3 |
| **F7** | `1 3 1 2 1 1` | F C E♭ A C F | R 5 ♭7 3 5 R | F (s6) ↔ E♭ (s4) | C (s5) | 3 |
| **Fmaj7** | `1 3 2 2 1 1` | F C E A C F | R 5 △7 3 5 R | F (s6) ↔ E (s4) | C (s5) | 3 |
| **Fm7** | `1 3 3 1 4 1` | F C F G♯ E♭ F | R 5 R ♭3 ♭7 R | F (s6) ↔ F (s4) | C (s5) | 4 |
| **F6** | `8 8 10 10 10 10` | C F C F A D | 5 R 5 R 3 6 | F (s5) ↔ C (s4) | C (s6) | 10 |
| **Fm6** | `1 3 3 1 3 1` | F C F G♯ D F | R 5 R ♭3 6 R | F (s6) ↔ F (s4) | C (s5) | 3 |
| **Fsus2** | `8 8 10 10 8 8` | C F C F G C | 5 R 5 R 9 5 | F (s5) ↔ C (s4) | C (s6) | 10 |
| **Fsus4** | `1 3 3 3 1 1` | F C F B♭ C F | R 5 R 4 5 R | F (s6) ↔ F (s4) | C (s5) | 3 |
| **Fadd9** | `5 8 5 5 8 5` | A F G C G A | 3 R 9 5 9 3 | F (s5) ↔ A (s6) | C (s3) | 8 |

### F♯

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **F♯** | `2 4 4 3 2 2` | F♯ C♯ F♯ B♭ C♯ F♯ | R 5 R 3 5 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯m** | `2 4 4 2 2 2` | F♯ C♯ F♯ A C♯ F♯ | R 5 R ♭3 5 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯7** | `2 4 2 3 2 2` | F♯ C♯ E B♭ C♯ F♯ | R 5 ♭7 3 5 R | F♯ (s6) ↔ E (s4) | C♯ (s5) | 4 |
| **F♯maj7** | `2 4 3 3 2 2` | F♯ C♯ F B♭ C♯ F♯ | R 5 △7 3 5 R | F♯ (s6) ↔ F (s4) | C♯ (s5) | 4 |
| **F♯m7** | `2 4 4 2 5 2` | F♯ C♯ F♯ A E F♯ | R 5 R ♭3 ♭7 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 5 |
| **F♯6** | `9 9 11 11 11 11` | C♯ F♯ C♯ F♯ B♭ E♭ | 5 R 5 R 3 6 | F♯ (s5) ↔ C♯ (s4) | C♯ (s6) | 11 |
| **F♯m6** | `2 4 4 2 4 2` | F♯ C♯ F♯ A E♭ F♯ | R 5 R ♭3 6 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯sus2** | `9 9 11 11 9 9` | C♯ F♯ C♯ F♯ G♯ C♯ | 5 R 5 R 9 5 | F♯ (s5) ↔ C♯ (s4) | C♯ (s6) | 11 |
| **F♯sus4** | `2 4 4 4 2 2` | F♯ C♯ F♯ B C♯ F♯ | R 5 R 4 5 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯add9** | `6 9 6 6 9 6` | B♭ F♯ G♯ C♯ G♯ B♭ | 3 R 9 5 9 3 | F♯ (s5) ↔ B♭ (s6) | C♯ (s3) | 9 |

### G

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **G** | `3 2 0 0 0 3` | G B D G B G | R 3 5 R 3 R | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gm** | `3 5 5 3 3 3` | G D G B♭ D G | R 5 R ♭3 5 R | G (s6) ↔ G (s4) | D (s5) | 5 |
| **G7** | `3 2 0 0 0 1` | G B D G B F | R 3 5 R 3 ♭7 | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gmaj7** | `3 2 0 0 0 2` | G B D G B F♯ | R 3 5 R 3 △7 | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gm7** | `3 5 5 3 6 3` | G D G B♭ F G | R 5 R ♭3 ♭7 R | G (s6) ↔ G (s4) | D (s5) | 6 |
| **G6** | `3 2 0 0 0 0` | G B D G B E | R 3 5 R 3 6 | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gm6** | `3 5 5 3 5 3` | G D G B♭ E G | R 5 R ♭3 6 R | G (s6) ↔ G (s4) | D (s5) | 5 |
| **Gsus2** | `3 0 0 0 3 3` | G A D G D G | R 9 5 R 5 R | G (s6) ↔ A (s5) | D (s4) | 3 |
| **Gsus4** | `3 5 5 5 3 3` | G D G C D G | R 5 R 4 5 R | G (s6) ↔ G (s4) | D (s5) | 5 |
| **Gadd9** | `3 0 0 2 0 3` | G A D A B G | R 9 5 9 3 R | G (s6) ↔ A (s5) | D (s4) | 3 |

### G♯

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **G♯** | `4 6 6 5 4 4` | G♯ E♭ G♯ C E♭ G♯ | R 5 R 3 5 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯m** | `4 6 6 4 4 4` | G♯ E♭ G♯ B E♭ G♯ | R 5 R ♭3 5 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯7** | `4 6 4 5 4 4` | G♯ E♭ F♯ C E♭ G♯ | R 5 ♭7 3 5 R | G♯ (s6) ↔ F♯ (s4) | E♭ (s5) | 6 |
| **G♯maj7** | `4 6 5 5 4 4` | G♯ E♭ G C E♭ G♯ | R 5 △7 3 5 R | G♯ (s6) ↔ G (s4) | E♭ (s5) | 6 |
| **G♯m7** | `4 6 6 4 7 4` | G♯ E♭ G♯ B F♯ G♯ | R 5 R ♭3 ♭7 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 7 |
| **G♯6** | `4 3 1 1 1 1` | G♯ C E♭ G♯ C F | R 3 5 R 3 6 | G♯ (s6) ↔ C (s5) | E♭ (s4) | 4 |
| **G♯m6** | `4 6 6 4 6 4` | G♯ E♭ G♯ B F G♯ | R 5 R ♭3 6 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯sus2** | `4 1 1 1 4 4` | G♯ B♭ E♭ G♯ E♭ G♯ | R 9 5 R 5 R | G♯ (s6) ↔ B♭ (s5) | E♭ (s4) | 4 |
| **G♯sus4** | `4 6 6 6 4 4` | G♯ E♭ G♯ C♯ E♭ G♯ | R 5 R 4 5 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯add9** | `4 1 1 3 1 4` | G♯ B♭ E♭ B♭ C G♯ | R 9 5 9 3 R | G♯ (s6) ↔ B♭ (s5) | E♭ (s4) | 4 |

### A

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **A** | `0 0 2 2 2 0` | E A E A C♯ E | 5 R 5 R 3 5 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **Am** | `0 0 2 2 1 0` | E A E A C E | 5 R 5 R ♭3 5 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **A7** | `0 0 2 0 2 0` | E A E G C♯ E | 5 R 5 ♭7 3 5 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **Amaj7** | `0 0 2 1 2 0` | E A E G♯ C♯ E | 5 R 5 △7 3 5 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **Am7** | `0 0 2 0 1 0` | E A E G C E | 5 R 5 ♭7 ♭3 5 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **A6** | `0 0 2 2 2 2` | E A E A C♯ F♯ | 5 R 5 R 3 6 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **Am6** | `0 0 2 2 1 2` | E A E A C F♯ | 5 R 5 R ♭3 6 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **Asus2** | `0 0 2 2 0 0` | E A E A B E | 5 R 5 R 9 5 | A (s5) ↔ E (s4) | E (s6) | 2 |
| **Asus4** | `0 0 2 2 3 0` | E A E A D E | 5 R 5 R 4 5 | A (s5) ↔ E (s4) | E (s6) | 3 |
| **Aadd9** | `0 0 2 4 2 0` | E A E B C♯ E | 5 R 5 9 3 5 | A (s5) ↔ E (s4) | E (s6) | 4 |

### B♭

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **B♭** | `1 1 3 3 3 1` | F B♭ F B♭ D F | 5 R 5 R 3 5 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
| **B♭m** | `1 1 3 3 2 1` | F B♭ F B♭ C♯ F | 5 R 5 R ♭3 5 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
| **B♭7** | `1 1 3 1 3 1` | F B♭ F G♯ D F | 5 R 5 ♭7 3 5 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
| **B♭maj7** | `1 1 3 2 3 1` | F B♭ F A D F | 5 R 5 △7 3 5 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
| **B♭m7** | `1 1 3 1 2 1` | F B♭ F G♯ C♯ F | 5 R 5 ♭7 ♭3 5 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
| **B♭6** | `1 1 3 3 3 3` | F B♭ F B♭ D G | 5 R 5 R 3 6 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
| **B♭m6** | `6 8 8 6 8 6` | B♭ F B♭ C♯ G B♭ | R 5 R ♭3 6 R | B♭ (s6) ↔ B♭ (s4) | F (s5) | 8 |
| **B♭sus2** | `1 1 3 3 1 1` | F B♭ F B♭ C F | 5 R 5 R 9 5 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
| **B♭sus4** | `1 1 3 3 4 1` | F B♭ F B♭ E♭ F | 5 R 5 R 4 5 | B♭ (s5) ↔ F (s4) | F (s6) | 4 |
| **B♭add9** | `1 1 3 5 3 1` | F B♭ F C D F | 5 R 5 9 3 5 | B♭ (s5) ↔ F (s4) | F (s6) | 5 |

### B

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **B** | `2 2 4 4 4 2` | F♯ B F♯ B E♭ F♯ | 5 R 5 R 3 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **Bm** | `2 2 4 4 3 2` | F♯ B F♯ B D F♯ | 5 R 5 R ♭3 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **B7** | `2 2 1 2 0 2` | F♯ B E♭ A B F♯ | 5 R 3 ♭7 R 5 | B (s5) ↔ E♭ (s4) | F♯ (s6) | 2 |
| **Bmaj7** | `2 2 4 3 4 2` | F♯ B F♯ B♭ E♭ F♯ | 5 R 5 △7 3 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **Bm7** | `2 2 4 2 3 2` | F♯ B F♯ A D F♯ | 5 R 5 ♭7 ♭3 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **B6** | `2 2 4 4 4 4` | F♯ B F♯ B E♭ G♯ | 5 R 5 R 3 6 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **Bm6** | `7 9 9 7 9 7` | B F♯ B D G♯ B | R 5 R ♭3 6 R | B (s6) ↔ B (s4) | F♯ (s5) | 9 |
| **Bsus2** | `2 2 4 4 2 2` | F♯ B F♯ B C♯ F♯ | 5 R 5 R 9 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **Bsus4** | `2 2 4 4 5 2` | F♯ B F♯ B E F♯ | 5 R 5 R 4 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 5 |
| **Badd9** | `2 2 4 6 4 2` | F♯ B F♯ C♯ E♭ F♯ | 5 R 5 9 3 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 6 |

<!-- GENERATED:END -->
