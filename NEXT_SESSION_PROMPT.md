# Next session — ×2 mode

Copy everything below the line into a new session.

---

Travis Picker — new session. **v3.4.2 is live and pushed, 106/106 green.** Read
`CLAUDE.md` first; it's a hub, so follow its pointers rather than reading
everything. You will need **`DESIGN.md`** this session (the grid and the Options
sheet are both visual surfaces), and the **"No scrolling, ever"** and **"The
height budget is the constraint"** sections of `CLAUDE.md` are the ones that
decide this feature.

**This session: a new "×2 mode".** Each bar plays twice — `C–F–G–C` becomes
`C–C–F–F–G–G–C–C`. It's idiomatic to the style, especially at high tempos, where
one bar per chord goes by too fast to settle into. **I'll explain what I want in
detail at the start of the session — don't build to the sketch below**, it's
there so you arrive with the problem already loaded.

## Agree the design before coding — and here the design is the whole job

Doubling a chord list is four lines. **Everything hard about this is what it does
to the grid**, so bring me the fork, don't guess it. Specifically:

**1. Eight bars will not fit, and that's the crux.** The no-scroll rule is
absolute (you're holding a guitar and can't swipe mid-pattern), and the measured
clearance under a 4-bar grid at 375×553 is **11.06px**. Cells are square and
sized from screen *width*, so 8 bars in a 2×4 stack roughly doubles grid height —
far past the budget. Laying them 4×2 keeps the height but halves cell width to
~12px, which can't carry a fret number. So "just show 8 bars" is very likely
dead, and I want to see that confirmed by measurement rather than asserted.
Which points at the alternative: **the grid keeps showing 4 bars and says "each
of these plays twice"** — a repeat sign is the obvious idiom, and music notation
already solved this exact problem. That costs zero height. Show me both.

**2. There's a real semantic fork hiding here, and it only bites above pattern
length 1.** Does ×2 double the **chord** (the pattern keeps advancing across the
pair) or repeat the **bar** verbatim?

- Double the chord, pattern length 2: `C+p1, C+p2, F+p1, F+p2, …` — each chord
  gets the whole 2-bar pattern.
- Repeat the bar, pattern length 2: `C+p1, C+p1, F+p2, F+p2, …` — the pattern
  doesn't advance within the chord.

**At pattern length 1 these are identical**, which is exactly why it's easy to
ship the wrong one and not notice. Note that "double the chord" falls out almost
free — `resolvePhrase` already cycles the pattern across however many bars it's
handed, so doubling the chord list does it. "Repeat the bar" needs its own index
maths. Don't assume I want the cheap one; ask.

**3. Smaller questions, each of which I should answer:**
- Does ×2 mean anything in **single-chord** mode? (With one chord, doubling it is
  a no-op; only "repeat the bar" would do anything, and only above length 1.)
- Is it **saved with a pattern**? By the existing rule a saved item is musical
  content only — the capo is in there, swing deliberately isn't. ×2 changes the
  harmonic rhythm, which argues for context; it's also arguably a feel setting.
  Your call, and there's a test asserting no UI settings get saved.
- **Where does the control live?** The Options sheet's rows are fixed 3-slot rows
  and row 1 already swaps between chord modes; a jumping panel was a specific
  complaint. The bottom strip is for things you reach for mid-practice only.
- **What does the playhead do** if the grid doesn't grow — how do you know you're
  on the first or second pass? (The beat lamp and the count-in both ride the same
  `onStep` loop; there's no second clock and there shouldn't be one.)
- `detectProgression()` should still identify the **un-doubled** tokens, or every
  progression reads as Custom the moment ×2 is on.

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess. This
  session that caught a barre threshold I'd have got wrong.
- **Tests stay green**; add one for any new invariant. Run `tests.html` in the
  browser and say the count. It's **106/106** now.
- **Any chrome change needs the 375×553 re-measure** — 55.09 / 384.84 / 11.06,
  clearance against `main.bottom`. This feature is the most likely thing in
  months to move those numbers, so measure early, not at the end.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push**, and I
  check on the phone. GitHub noreply identity only.
- Note the dev-box limits in `CLAUDE.md` — in particular **don't screenshot while
  `tests.html` is running** (it resizes the pane, which closes any open dropdown
  mid-test and produces convincing fake failures), and **`rAF` is frozen in the
  preview tab**, so the playhead and beat lamp can only be confirmed on my phone.

## Also outstanding

- **`CHORD_REFERENCE.md` is STALE and now says so in a banner at the top.** It's a
  hand-written cross-check sheet from v3.0.0/v3.2.1, and ~25 of the 120 chords
  were revoiced in session 35. **The fix is to split the hand-written commentary
  from the tables and generate the tables from `data.js`**, so it can't rot again
  — the prose in it is worth keeping, which is why it wasn't just deleted. Cheap,
  and worth doing before the next voicing pass.
- **Pre-loaded patterns** (`OPEN_ITEMS.md` item 2) — still the best-value item
  left. Design settled; needs me to pick the patterns, or to nod for you to
  propose a spread across the tiers.
- **On the guitar from session 35**, still unverified: `F♯6` and `E♭add9` both
  dropped the moving-finger technique for static barres, and `E♭sus4` moved back
  up to frets 6–9. Also worth an ear: the **m7 family's Travis bass is now root ↔
  octave** (E, E, B, E) after the Em7 revoicing — my call, consistent with the
  E-shape major, but it's the same class of thing I caught by ear on F♯6.
- **Answered, don't re-ask:** the chord diagram's size; the key drum's
  MAJOR/MINOR headers; the barre threshold (4 in a row is a bar, 3 is three
  fingers); hollow only where a finger must genuinely move; the m7 bass staying
  root ↔ octave; C keeping its hollow dot.
