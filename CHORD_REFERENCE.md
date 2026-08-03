# Chord reference — every chord the app supports

Generated from the live library at **v3.0.0**, A-family rows updated at **v3.2.1** (12 roots × 10 qualities = **120
chords**). This is a cross-check sheet, not a source: the truth is `OPEN_CHORDS` +
`BARRE_TEMPLATES` in `js/data.js`.

## How to read it

- **Tab** is `6 5 4 3 2 1` — low E string first, `x` = not played. Numbers are
  frets, `0` = open. **Capo is not included** — these are shape frets, exactly what
  the grid shows you.
- **Notes** are the sounding pitches of that shape, same string order.
- **Intervals** are those notes relative to the chord's root: `R 3 5 ♭7 △7 6 9 4`.
  A `·` is a muted string.
- **Thumb: root ↔ alt** is the alternating bass the generator uses — the two notes
  your thumb rocks between, with the string each sits on. **Fifth** is the third
  bass role (used by the Travis and Root–Fifth presets).
- **Max fret** is the highest fretted note; everything stays ≤ 8 by design.

Two conventions worth knowing before you flag something as wrong:

1. **A full barre is assumed**, so the low string counts as an available bass note
   even where a textbook voicing mutes it (this is why B7 frets string 6, and why
   the barre chords all show a note there).
2. **Open-position voicings are hand-declared** (the shapes you'd actually play);
   everything else is derived from an E-shape or A-shape template, *whichever
   barres lower*.

---

## ⚠️ Worth your eye — judgment calls and one bug I just fixed

**A real bug, found while generating this and fixed before writing it:**

- **`Dadd9` was D major.** It shipped as `x00232`, which contains no 9th at all —
  the E is simply absent. It's now **`x00252`** (D A E F♯). Strings 4/3 are forced
  to D/A, so the 3rd and the 9th both have to come off strings 2/1, and E at fret 5
  + F♯ at fret 2 is the only pair that stays low. **There is now a test** that
  computes each chord's sounded pitch classes and requires them to equal the
  quality's formula — it would have caught this, and it guards all 120.

**Judgment calls you may want to overrule (all deliberate, none broken):**

- **sus2 alternates root ↔ 9th** where the voicing leaves no fifth on a bass
  string: `Csus2` is C↔D, `Gsus2` is G↔A. sus2 has no third, so the open bass
  string gives the 2nd. Musically fine, but it's an unusual thumb.
- **`Gadd9` alternates G ↔ B** (the 3rd) rather than G↔D like the other G chords,
  because its shape puts B on string 5. A "walk to the 3rd" bass — common in
  fingerstyle, but inconsistent with its neighbours.
- **`E♭add9` is now `6 6 5 0 6 6`** (v3.2.2, your note). It went through two
  revisions: `x 1 1 0 4 1` (unplayable — a finger stranded past the pinky) →
  `x 6 5 0 6 6` (v3.2.1, muted string 6) → this. You pointed out string 6 doesn't
  need to go unplayed and doesn't need a partial barre either — one finger moves
  between string 6 and string 1 (both fret 6) as needed, the same way a finger
  comes on and off string 6 for the low bass note some players add under an open
  C. That gives B♭ (the 5th) a real bass-string home, so **Root–Fifth now
  alternates E♭ ↔ B♭ properly**, like every other chord — no longer root-only.
  Travis/Alternating are unchanged, still E♭ ↔ G (the 3rd).
- **maj7 / m7 on E-shape roots alternate root ↔ 7** (`Emaj7` is E↔E♭, `Em7` is
  E↔D, `F♯maj7` is F♯↔F). This is the deliberate trade documented for dom7 — the
  7th's only playable home inside an E-shape is the alt-bass string. A-shape roots
  and the open forms keep a clean root↔fifth.
- **The A family is uniform as of v3.2.1.** `A`, `Am` and `A7` used to mute
  string 6 while `Amaj7`, `Am7`, `A6`, `Am6`, `Asus2`, `Asus4` and `Aadd9`
  sounded the open low E. That was harmless musically (E is A's fifth) but it was
  a genuine contradiction: all three declared `fifth: 6`, so **the thumb played
  string 6 anyway** — the shape said mute, the app picked it. The chord box made
  it visible by drawing an × over a string you hear. All ten now sound it, and a
  test forbids any chord from playing a string its own shape mutes.
- **`Csus4` is no longer hand-declared** (v3.2.3, his note). The old `x33011`
  took open C's own shape and bumped each 3rd up to a 4th — which sounds simple,
  but open C already has a gap between its bass-string cluster (frets 3/3 near
  the root) and its treble-string cluster (frets 0/1), and sus4 forces BOTH
  clusters to fret at once: a 3-string partial barre *and* a 2-string partial
  barre, with nothing linking them. That's the specific thing he flagged as
  hard — distinct from a single full barre, which he says is fine. Removing the
  hand-declaration lets the general A-shape template take over: one coherent
  6-string index barre at fret 3, `3 3 5 5 6 3`, with three fingers layered on
  top in a 3-fret window — the same family every other barre chord in this
  library already uses. Bonus: the alternating bass improves too, root ↔ 5th
  (C ↔ G) instead of root ↔ 4th, since the open G string is gone.
- **`Cm6` and `C♯m6` moved up the neck (v3.2.4, his call).** Both were the
  auto-picked A-shape barre — technically "whichever barres lower," the app's
  own default rule, and what shipped in v3.2.3 as "no change needed." He
  supplied the E-shape min6 template's *other* position instead: `8 10 10 8
  10 8` and `9 11 11 9 11 9`. Same shape family, same full-barre-plus-three-
  fingers pattern the app already uses everywhere — just the position he
  prefers to play it at. His note: *"I'm allowing frets higher up the neck for
  these... anything up to fret 12 acceptable."* The library's general fret
  ceiling stays 8; these two are a named, deliberate exception in the test.
  The alternating bass is unaffected — both the old and new shapes give root ↔
  5th (C ↔ G / C♯ ↔ G♯); only the position on the neck changed.
- **`F♯6` is now `9 9 8 8 11 9`** (v3.2.5, his tabs from a photo). It replaces
  the auto-derived E-shape barre (`2 4 4 3 4 2`, a full 6-string index barre)
  with a genuinely different shape: only strings 4/3 share a fret (a small
  2-string barre at fret 8), and the root (string 5) and the 5th (string 6) sit
  on *adjacent* strings at the same fret (9) rather than both under one barre.
  His note: **"you move the finger back and forth for the bass like on C"** —
  the same technique `E♭add9` uses. One fingertip relocates between strings 6
  and 5 rather than holding both, so the fretting hand never needs more than
  thumb + 3 fingers at any single moment, even though the shape has four
  distinct fret/string positions on paper. `alt` and `fifth` both point at
  string 6, since the moving note *is* the 5th — Travis/Root–Fifth now
  alternate F♯ ↔ C♯ exactly as before, just via a different physical shape.
- **Wide stretches** (5-fret spans): `F♯sus2` (2–6), `G♯sus2` (4–8), `Fsus2` (1–5),
  `C♯add9` (4–8), `B♭add9` (1–5), `Badd9` (2–6). **All six were played and kept**
  (v3.2.1). The three sus2 need a partial barre — one finger across strings 5+4 —
  on top of the main barre: doable, but not beginner-friendly. The three add9 need
  a genuine finger-crossing and are the harder half. Span alone was the wrong
  measure here; what makes a shape hard is a *low-fret note stranded on the far
  side of a high-fret one*, which is why `Dadd9` and `E♭add9` (span 4, not 5) were
  the two that actually had to be dealt with.

---

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
| **Cm6** | `8 10 10 8 10 8` | C G C E♭ A C | R 5 R ♭3 6 R | C (s6) ↔ G (s5) | G (s5) | 10 |
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
| **C♯m6** | `9 11 11 9 11 9` | C♯ G♯ C♯ E B♭ C♯ | R 5 R ♭3 6 R | C♯ (s6) ↔ G♯ (s5) | G♯ (s5) | 11 |
| **C♯sus2** | `4 4 6 6 4 4` | G♯ C♯ G♯ C♯ E♭ G♯ | 5 R 5 R 9 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 6 |
| **C♯sus4** | `4 4 6 6 7 4` | G♯ C♯ G♯ C♯ F♯ G♯ | 5 R 5 R 4 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 7 |
| **C♯add9** | `4 4 6 8 6 4` | G♯ C♯ G♯ E♭ F G♯ | 5 R 5 9 3 5 | C♯ (s5) ↔ G♯ (s4) | G♯ (s6) | 8 |

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
| **Dadd9** | `x 0 0 2 5 2` | x A D A E F♯ | · 5 R 5 9 3 | D (s4) ↔ A (s3) | A (s5) | 5 |

### E♭

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **E♭** | `6 6 8 8 8 6` | B♭ E♭ B♭ E♭ G B♭ | 5 R 5 R 3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭m** | `6 6 8 8 7 6` | B♭ E♭ B♭ E♭ F♯ B♭ | 5 R 5 R ♭3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭7** | `6 6 8 6 8 6` | B♭ E♭ B♭ C♯ G B♭ | 5 R 5 ♭7 3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭maj7** | `6 6 8 7 8 6` | B♭ E♭ B♭ D G B♭ | 5 R 5 △7 3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭m7** | `6 6 8 6 7 6` | B♭ E♭ B♭ C♯ F♯ B♭ | 5 R 5 ♭7 ♭3 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭6** | `6 6 8 8 8 8` | B♭ E♭ B♭ E♭ G C | 5 R 5 R 3 6 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭m6** | `6 6 8 8 7 8` | B♭ E♭ B♭ E♭ F♯ C | 5 R 5 R ♭3 6 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭sus2** | `6 6 8 8 6 6` | B♭ E♭ B♭ E♭ F B♭ | 5 R 5 R 9 5 | E♭ (s5) ↔ B♭ (s4) | B♭ (s6) | 8 |
| **E♭sus4** | `x 1 1 3 4 4` | x B♭ E♭ B♭ E♭ G♯ | · 5 R 5 R 4 | E♭ (s4) ↔ B♭ (s5) | B♭ (s3) | 4 |
| **E♭add9** | `6 6 5 0 6 6` | B♭ E♭ G G F B♭ | 5 R 3 3 9 5 | E♭ (s5) ↔ G (s4) | B♭ (s6) | 6 |

### E

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **E** | `0 2 2 1 0 0` | E B E G♯ B E | R 5 R 3 5 R | E (s6) ↔ E (s4) | B (s5) | 2 |
| **Em** | `0 2 2 0 0 0` | E B E G B E | R 5 R ♭3 5 R | E (s6) ↔ E (s4) | B (s5) | 2 |
| **E7** | `0 2 2 1 3 0` | E B E G♯ D E | R 5 R 3 ♭7 R | E (s6) ↔ E (s4) | B (s5) | 3 |
| **Emaj7** | `0 2 1 1 0 0` | E B E♭ G♯ B E | R 5 △7 3 5 R | E (s6) ↔ E♭ (s4) | B (s5) | 2 |
| **Em7** | `0 2 0 0 0 0` | E B D G B E | R 5 ♭7 ♭3 5 R | E (s6) ↔ D (s4) | B (s5) | 2 |
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
| **Fm7** | `1 3 1 1 1 1` | F C E♭ G♯ C F | R 5 ♭7 ♭3 5 R | F (s6) ↔ E♭ (s4) | C (s5) | 3 |
| **F6** | `1 3 3 2 3 1` | F C F A D F | R 5 R 3 6 R | F (s6) ↔ F (s4) | C (s5) | 3 |
| **Fm6** | `1 3 3 1 3 1` | F C F G♯ D F | R 5 R ♭3 6 R | F (s6) ↔ F (s4) | C (s5) | 3 |
| **Fsus2** | `1 3 3 5 1 3` | F C F C C G | R 5 R 5 5 9 | F (s6) ↔ F (s4) | C (s5) | 5 |
| **Fsus4** | `1 3 3 3 1 1` | F C F B♭ C F | R 5 R 4 5 R | F (s6) ↔ F (s4) | C (s5) | 3 |
| **Fadd9** | `1 3 3 2 1 3` | F C F A C G | R 5 R 3 5 9 | F (s6) ↔ F (s4) | C (s5) | 3 |

### F♯

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **F♯** | `2 4 4 3 2 2` | F♯ C♯ F♯ B♭ C♯ F♯ | R 5 R 3 5 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯m** | `2 4 4 2 2 2` | F♯ C♯ F♯ A C♯ F♯ | R 5 R ♭3 5 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯7** | `2 4 2 3 2 2` | F♯ C♯ E B♭ C♯ F♯ | R 5 ♭7 3 5 R | F♯ (s6) ↔ E (s4) | C♯ (s5) | 4 |
| **F♯maj7** | `2 4 3 3 2 2` | F♯ C♯ F B♭ C♯ F♯ | R 5 △7 3 5 R | F♯ (s6) ↔ F (s4) | C♯ (s5) | 4 |
| **F♯m7** | `2 4 2 2 2 2` | F♯ C♯ E A C♯ F♯ | R 5 ♭7 ♭3 5 R | F♯ (s6) ↔ E (s4) | C♯ (s5) | 4 |
| **F♯6** | `9 9 8 8 11 9` | C♯ F♯ B♭ E♭ B♭ C♯ | 5 R 3 6 3 5 | F♯ (s5) ↔ C♯ (s6) | C♯ (s6) | 11 |
| **F♯m6** | `2 4 4 2 4 2` | F♯ C♯ F♯ A E♭ F♯ | R 5 R ♭3 6 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯sus2** | `2 4 4 6 2 4` | F♯ C♯ F♯ C♯ C♯ G♯ | R 5 R 5 5 9 | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 6 |
| **F♯sus4** | `2 4 4 4 2 2` | F♯ C♯ F♯ B C♯ F♯ | R 5 R 4 5 R | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |
| **F♯add9** | `2 4 4 3 2 4` | F♯ C♯ F♯ B♭ C♯ G♯ | R 5 R 3 5 9 | F♯ (s6) ↔ F♯ (s4) | C♯ (s5) | 4 |

### G

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **G** | `3 2 0 0 0 3` | G B D G B G | R 3 5 R 3 R | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gm** | `3 5 5 3 3 3` | G D G B♭ D G | R 5 R ♭3 5 R | G (s6) ↔ G (s4) | D (s5) | 5 |
| **G7** | `3 2 0 0 0 1` | G B D G B F | R 3 5 R 3 ♭7 | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gmaj7** | `3 2 0 0 0 2` | G B D G B F♯ | R 3 5 R 3 △7 | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gm7** | `3 5 3 3 3 3` | G D F B♭ D G | R 5 ♭7 ♭3 5 R | G (s6) ↔ F (s4) | D (s5) | 5 |
| **G6** | `3 2 0 0 0 0` | G B D G B E | R 3 5 R 3 6 | G (s6) ↔ D (s4) | B (s5) | 3 |
| **Gm6** | `3 5 5 3 5 3` | G D G B♭ E G | R 5 R ♭3 6 R | G (s6) ↔ G (s4) | D (s5) | 5 |
| **Gsus2** | `3 0 0 0 3 3` | G A D G D G | R 9 5 R 5 R | G (s6) ↔ A (s5) | D (s4) | 3 |
| **Gsus4** | `3 5 5 5 3 3` | G D G C D G | R 5 R 4 5 R | G (s6) ↔ G (s4) | D (s5) | 5 |
| **Gadd9** | `3 2 0 2 0 3` | G B D A B G | R 3 5 9 3 R | G (s6) ↔ B (s5) | D (s4) | 3 |

### G♯

| Chord | Tab (6→1) | Notes (6→1) | Intervals | Thumb: root ↔ alt | Fifth | Max fret |
|---|---|---|---|---|---|---|
| **G♯** | `4 6 6 5 4 4` | G♯ E♭ G♯ C E♭ G♯ | R 5 R 3 5 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯m** | `4 6 6 4 4 4` | G♯ E♭ G♯ B E♭ G♯ | R 5 R ♭3 5 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯7** | `4 6 4 5 4 4` | G♯ E♭ F♯ C E♭ G♯ | R 5 ♭7 3 5 R | G♯ (s6) ↔ F♯ (s4) | E♭ (s5) | 6 |
| **G♯maj7** | `4 6 5 5 4 4` | G♯ E♭ G C E♭ G♯ | R 5 △7 3 5 R | G♯ (s6) ↔ G (s4) | E♭ (s5) | 6 |
| **G♯m7** | `4 6 4 4 4 4` | G♯ E♭ F♯ B E♭ G♯ | R 5 ♭7 ♭3 5 R | G♯ (s6) ↔ F♯ (s4) | E♭ (s5) | 6 |
| **G♯6** | `4 6 6 5 6 4` | G♯ E♭ G♯ C F G♯ | R 5 R 3 6 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯m6** | `4 6 6 4 6 4` | G♯ E♭ G♯ B F G♯ | R 5 R ♭3 6 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯sus2** | `4 6 6 8 4 6` | G♯ E♭ G♯ E♭ E♭ B♭ | R 5 R 5 5 9 | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 8 |
| **G♯sus4** | `4 6 6 6 4 4` | G♯ E♭ G♯ C♯ E♭ G♯ | R 5 R 4 5 R | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |
| **G♯add9** | `4 6 6 5 4 6` | G♯ E♭ G♯ C E♭ B♭ | R 5 R 3 5 9 | G♯ (s6) ↔ G♯ (s4) | E♭ (s5) | 6 |

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
| **B♭m6** | `1 1 3 3 2 3` | F B♭ F B♭ C♯ G | 5 R 5 R ♭3 6 | B♭ (s5) ↔ F (s4) | F (s6) | 3 |
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
| **Bm6** | `2 2 4 4 3 4` | F♯ B F♯ B D G♯ | 5 R 5 R ♭3 6 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **Bsus2** | `2 2 4 4 2 2` | F♯ B F♯ B C♯ F♯ | 5 R 5 R 9 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 4 |
| **Bsus4** | `2 2 4 4 5 2` | F♯ B F♯ B E F♯ | 5 R 5 R 4 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 5 |
| **Badd9** | `2 2 4 6 4 2` | F♯ B F♯ C♯ E♭ F♯ | 5 R 5 9 3 5 | B (s5) ↔ F♯ (s4) | F♯ (s6) | 6 |

---

*Regenerate this after any voicing change: the tables are derived from
`CHORDS` / `CHORD_SHAPES` in `js/data.js`.*
