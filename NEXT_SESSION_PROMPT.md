# Next session — chord voicings from a spec

Copy everything below the line into a new session.

---

Travis Picker — new session. **v3.3.0 is live and pushed.** Read `CLAUDE.md`
first; it's a hub now, so follow its pointers rather than reading everything.
`DESIGN.md` is new (visual detail, read on demand) and you almost certainly
**don't need it this session** — this is chord-data work.

**This session: rewriting chord voicings from a spec document I've written.**
I'll paste it or point you at it. Expect it to name specific chords and give
fingerings, probably as fret strings low-to-high (`4 3 1 1 1 1` = string 6 → 1),
which is the format I've used every time so far.

## What you need to know before touching a voicing

**Chords are data.** Everything lives in `js/data.js`: `OPEN_CHORDS` for
hand-declared voicings, two movable `BARRE_TEMPLATES` for everything else, and
the rule "whichever barres lower" picking between them. A hand-declaration is an
override, and **every existing one carries its own reason in a comment beside
it** — read those before changing a shape. Several record corrections to earlier
reasoning, not just preferences.

**Changing a shape can change the ROLES, and that's the part that gets missed.**
`root` / `alt` / `fifth` are STRING NUMBERS, and they decide what the thumb
actually plays. G♯6 in v3.3.0 is the worked example: moving to my fingering put
the true 5th on string 4 and the 3rd on string 5, so `fifth` and `alt` had to
swap — which is what made Root–Fifth alternate properly and turned Travis from a
root-and-octave into a three-note walk. **Always report the resulting Travis and
Root–Fifth walks for a revoiced chord**, because that's the part I can only judge
by ear.

**Four tests guard the library, and each caught something real** — role strings
covered by the shape; no chord plays a string its own shape mutes; every voicing
spells its quality exactly; and `alt` never equals `fifth`. That last one exists
because a chord where they're equal collapses three of Travis's four beats onto
one note — I caught that by ear on F♯6 and no test had. They should all stay
green without special pleading: if a spec'd voicing trips one, **tell me** rather
than loosening the test.

**A voicing may need a `MOVING` entry.** That's the data declaring where one
finger covers two strings by moving between them along with the bass (drawn as a
hollow dot on the note you move to). It is **not derivable** — the obvious
geometric rule fires on 82 of 120 chords and is wrong on most of them, because
what makes it true is fingering, not geometry. If a new voicing has one, propose
it and I'll check it on the guitar.

## Ground rules

- **Agree the design before coding**, and surface genuine forks rather than
  guessing. If my spec is ambiguous about a chord, ask — that's what caught the
  F6-vs-F♯6 mix-up in session 33, before the wrong chord got applied.
- **Tests stay green**; add one for any new invariant. Run `tests.html` in the
  browser and say the count.
- **Any chrome change needs the 375×553 re-measure** (55.09 / 384.84 / 11.06,
  clearance measured against `main.bottom`). Chord data alone shouldn't touch it.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push**, and
  I check on the phone. GitHub noreply identity only.
- Note the dev-box limits in `CLAUDE.md` — in particular, **don't screenshot
  while `tests.html` is running**. It resizes the pane, which closes any open
  dropdown panel mid-test and produces convincing fake failures.

## Also outstanding, not this session unless I say so

- **Pre-loaded patterns** (`OPEN_ITEMS.md` item 2) — the best-value item left,
  design settled, only needs me to pick the patterns or nod for you to propose a
  spread across the tiers.
- **On the phone from v3.3.0:** whether the hollow moving-finger dot reads at
  arm's length, and whether B7's moving finger matches what my hand does.
- **Answered, don't re-ask:** the chord diagram's size and the key drum's
  MAJOR/MINOR headers are both good as is.
