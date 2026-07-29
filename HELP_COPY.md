# Help card copy — every item, in one place

A review sheet for the text help mode shows. **The source of truth is `HELP` in
`js/data.js`** — this file is a readable snapshot of it, grouped by where the
thing actually sits on screen rather than by key order. A test asserts every
annotated control has copy and every entry is reachable, so the *list* can't
drift; the wording here is verified verbatim against the live map.

Snapshot: **v2.14.2**, 28 entries (was 30 — Beat lamp folded into Tempo, Bar
chord into the Grid).

## The house rules

His, from the v2.13.6 revision pass. They're also copied into `data.js` above
the map, so the next edit sees them:

- Say what it does, plus anything that would surprise you. Stop.
- Cut anything visible on screen, anything that explains *why* the app works
  that way, and anything you'd discover in one tap.
- Assume a guitar player. Nashville numbers, alternating bass, i/m/a and
  "whole step down" all pass without explanation. Only app-specific behaviour
  gets spelled out.
- No em dashes.
- Two lines is the ceiling. Where one runs long, the length is the signal that
  the thing itself is fiddly.

**Titles follow the shape of the phrase:** a title-like one is Title Case
("Help Mode", "Pattern Length", "Bass Warning"), a sentence-like one stays
sentence case ("What you're playing over", "The grid is your right hand").
Single words — most of them — are unaffected either way. "Count-in" keeps its
lowercase particle, which is title case for a hyphenated compound and also
matches the lamp's own label.

**How to edit:** change the `body` in `js/data.js` — no code moves, no layout to
re-measure. A blank line starts a new paragraph.

---

## The mode itself

### Help Mode
*Tap: the `?` pill — this is the card that opens the moment you arm it.*

> Tap anything to find out what it does. Nothing you tap will change. The gear still opens Options. Tap ? again to leave.

*(This card also carries the version number.)*

---

## The header

### Edit
*Tap: the pencil pill.*

> Tapping a cell adds or removes a note. Editing a bar that repeats changes every repeat, so raise Pattern length first if you want one to differ.

### Save
*Tap: the floppy pill.*

> Names the current pattern and saves it to this device, along with its chords, key and capo.

### Load
*Tap: the folder pill. Works even when it's greyed out.*

> Your saved patterns. Load, rename or delete any of them. Loading brings back the chords it was written over.

### Capo
*Tap: the `CAPO 2 → F♯` tag, top left. Only on screen when a capo is set.*

> The grid still shows the shapes you play. The arrow points at what they actually sound like.

### Pattern Name
*Tap: the name line under the pills. Tappable even when it's blank.*

> The saved pattern currently on screen.

---

## Above the grid

### What you're playing over
*Tap: the big chord (Single) or the numerals (Progression). One card, two shapes — the highlight wraps whichever is showing.*

> The chord in Single mode, or the progression's numbers and key in Progression mode.

---

## The grid

### The grid is your right hand
*Tap: anywhere on the grid — including a bar's chord picker and the small number chip, which have no card of their own and land here.*

> Each column is an eighth note, each row a string. The bottom rows are your thumb, the bass. The top rows are your fingers: i, m, a on strings 3, 2 and 1.
>
> In progression mode, the chords are indicated above each bar. These can be edited manually.

*The only two-paragraph card. A test asserts this one mentions the chords, because the pickers fall through to it — that fall-through was a bug in v2.13.4 and is correct only because this copy covers them.*

---

## The bottom strip

### Play
*Tap: the ▶ button. Explains rather than stops — a running take keeps running.*

> Runs the loop after a one-bar count-in. What you hear is set on the Preferences page.

### Tempo
*Tap: the BPM slider, the number, or the beat lamp beside it — the lamp has no card of its own and lands here.*

> Drag to set the tempo, 40 to 240 bpm.

### Generate
*Tap: the die.*

> Rolls a fresh pattern using the Thumb and Fingers settings in Options. It asks first if you have unsaved edits.

### Bass Warning
*Tap: the ABS / MIX chip above the gear. Only on screen when it applies.*

> The bass isn't following your chords. ABS means it's fixed to literal strings (Full Random, Climb, Descend). MIX means some notes follow and some don't.

---

## Options → Setup

### Format
*Tap: the Single / Progression segmented control.*

> “Single” drills one chord for the whole loop. “Progression” gives you a chord per bar.

### Capo
*Tap: the capo stepper. Its −/+ work even at an end stop.*

> Changes the sounding key, like putting on a capo or tuning down.

### Chord
*Tap: the Chord / Quality wheel. Single mode only.*

> The one chord the whole pattern is played over. Every root has a major, a minor and a 7.

### Key
*Tap: the Key menu. Progression mode only.*

> The key the progression is played in. Changing key within major or within minor transposes what you have, edited bars included. Changing from major to minor resets to the default progression.

### Progression
*Tap: the Progression menu. Progression mode only.*

> A chord per bar, grouped by style. Every one is four bars: a two-chord idea repeats, a three-chord idea holds its last chord.

### Randomize
*Tap: the small die in the chord row.*

> Rolls a new key and progression, or a new chord in Single mode. Your pattern and settings are left alone.

### Thumb
*Tap: the Thumb menu.*

> The bass line your thumb plays. Changing this re-rolls only the bass.

### Fingers
*Tap: the Fingers menu.*

> How busy and how hard the finger part is. Changing this re-rolls only the fingers.

### Pattern Length
*Tap: the Pattern menu.*

> How many bars are different before the pattern repeats. Growing it copies what you have rather than re-rolling, so raise it when you want one bar to differ from the rest.

### Swing
*Tap: the Swing slider.*

> Delays the &s between the beats. Drag it while the loop runs and you'll hear it change.

---

## Options → Preferences

### Metronome
*Tap: the Metronome lamp.*

> The click on every beat.

### Melody
*Tap: the Melody lamp.*

> Hear the pattern played back.

### Count-in
*Tap: the Count-in lamp.*

> One bar of counting before the loop starts.

### Buttons
*Tap: the Buttons lamp.*

> The mechanical click when you press a control. It stays quiet while the transport runs.

### Note Labels
*Tap: the Note labels menu.*

> What's written inside each note: fret number, picking finger, or nothing.

### Theme
*Tap: the Theme menu.*

> The instrument's colours.

---

## Not annotated, on purpose

**Still navigational** while help mode is armed — they explain themselves by
working:

- the **gear** (opens Options)
- the **Setup / Preferences** page tabs
- the sheet's **✕** and its backdrop
- the **`?`** itself (which is how you leave)
- the **card** (tap it to put it away)

**No card, and they fall through to their parent** — a tap still explains
something, it just isn't its own entry:

- the **beat lamp** → Tempo
- a bar's **chord picker** and its **number chip** → the grid

Save and Load explain rather than open, so nothing inside those sheets is
reachable in help mode. Their contents are words rather than glyphs and read for
themselves.
