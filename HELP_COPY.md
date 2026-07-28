# Help card copy — every item, in one place

A review sheet for the text help mode shows. **The source of truth is `HELP` in
`js/data.js`** — this file is a readable snapshot of it, grouped by where the
thing actually sits on screen rather than by key order. A test asserts every
annotated control has copy and every entry is reachable, so the *list* can't
drift; the wording here is checked against the live map by hand.

Snapshot: **v2.13.5**, 30 entries.

**How to edit:** change the `body` in `js/data.js` — no code moves, no layout to
re-measure. Keep each one to two or three sentences: it's a card floating over a
375px screen, and longer than that is the instruction manual this replaced.

---

## The mode itself

### Help mode
*Tap: the `?` pill — this is the card that opens the moment you arm it.*

> Tap anything on the screen to find out what it does — nothing you tap will change your pattern or your settings. The gear still opens Options so you can reach the controls in there. Tap ? again to leave.

*(This card also carries the version number.)*

---

## The header

### Edit
*Tap: the pencil pill.*

> Arms manual editing: the grid goes dashed and a red lamp lights on this button, and then tapping a cell adds or removes a note. It's off by default so a stray tap can't nudge a pattern while you're playing. Editing a bar that repeats changes every repeat — raise Pattern length first if you want one bar to differ.

### Save
*Tap: the floppy pill.*

> Names the current pattern and keeps it in your library on this device, along with its chords, key and capo. Nothing leaves the phone and there's no account.

### Load
*Tap: the folder pill. Works even when it's greyed out.*

> Opens your saved patterns. Each one can be loaded, renamed or deleted. Loading brings back the pattern and the chords it was written over — it never re-rolls anything.

### Capo
*Tap: the `CAPO 2 → F♯` tag, top left. Only on screen when a capo is set.*

> Only appears when you've set a capo. It reads "CAPO 2 → F♯": the shapes on the grid are still the ones you play, and the arrow points at what they actually sound like. "Whole step down" instead means a down-tuned guitar.

### Pattern name
*Tap: the name line under the pills. Tappable even when it's blank.*

> The saved pattern currently on screen. Blank means this one is unsaved — the line is held open either way so the grid never shifts when you save or load.

---

## Above the grid

### What you're playing over
*Tap: the big chord (Single) or the Roman numerals (Progression). One card, two shapes — the highlight wraps whichever is showing.*

> The chord in Single mode, or the progression's Nashville numbers and key in Progression mode. With a capo set, this is the shape key — the sounding key is the tag at the top of the screen.

---

## The grid

### The grid is your right hand
*Tap: anywhere on the grid.*

> Each column is an eighth note and each row is a string, read left to right. The notes on the bottom rows are your thumb — the alternating bass — and the ones on the top rows are your fingers: i, m, a on strings 3, 2 and 1. Notes stacked in one column are struck together.

### Bar chord — **new in v2.13.5**
*Tap: a bar's chord picker, or the small number chip beside it. Progression mode only.*

> Changes the chord for this one bar without touching the others, and the thumb's bass follows it there. Doing that makes the progression stop matching a preset, so the readout above the grid reads Custom and shows the bars' own numbers. The chip beside it is the bar's position in the phrase.

---

## The bottom strip

### Play
*Tap: the ▶ button. Explains rather than stops — a running take keeps running.*

> Runs the loop after a one-bar count-in, and the button stays pressed in while it plays. What you hear — the metronome click, the picked notes, the count-in — is set by the lamps on the Preferences page.

### Tempo
*Tap: the BPM slider.*

> 40 to 240 beats per minute. The lamp beside the number blinks on every beat, with a bigger pulse on the downbeat, so it works as a silent metronome when the click is off.

### Beat lamp
*Tap: the small jewel left of the BPM number.*

> Blinks on each beat while the transport runs — a bigger pulse on the downbeat — so you can keep time by eye with the click turned off. It also counts you in.

### Generate
*Tap: the die.*

> Rolls a fresh pattern using the Thumb and Fingers settings in Options. This is the one control that re-rolls everything, so it asks first if you have unsaved hand-drawn edits.

### Bass warning
*Tap: the ABS / MIX chip above the gear. Only on screen when it applies.*

> Appears only when the bass won't follow your chords. ABS means the whole bass line is fixed to literal strings (Full Random, Climb and Descend do this); MIX means some notes follow the chords and some don't. Fine in Single mode, worth knowing in a progression.

---

## Options → Setup

### Format
*Tap: the Single / Prog. segmented control.*

> Single drills one chord for the whole loop. Prog. gives you a chord per bar, written as Nashville numbers in a key, so the same progression transposes anywhere.

### Capo
*Tap: the capo stepper. Its −/+ work even at an end stop.*

> Shifts what the shapes sound like. The grid doesn't change, because the fret numbers on it are shape frets — which is what your fingers actually do — so only the pitch you hear and the readout at the top move. Negative values are a guitar tuned down instead.

### Chord
*Tap: the Chord menu. Single mode only.*

> The one chord the whole pattern is played over. Open chords are listed first. The thumb's bass notes follow whichever chord you pick.

### Key
*Tap: the Key menu. Progression mode only.*

> The key the progression's numbers are realised in. Changing key inside major or inside minor transposes what you already have, including bars you edited by hand; crossing between major and minor starts you on that side's first progression, because the two don't share numbers.

### Progression
*Tap: the Progression menu. Progression mode only.*

> A chord per bar, grouped by style. Every one is four bars: a two-chord idea repeats and a three-chord idea holds its last chord. Change a single bar's chord on the grid and this reads Custom.

### Random chords
*Tap: the small die in the chord row.*

> Rolls a new key and progression, or a new chord in Single mode. It only touches what's in this row — your pattern, your capo and your settings are left alone, so hand-drawn work is safe.

### Thumb
*Tap: the Thumb menu.*

> The bass line your thumb plays. Travis alternates root–alt–fifth–alt; Dead Thumb stays on one string; Climb and Descend walk the strings and ignore the chord. Changing this re-rolls only the bass and keeps your finger part exactly as it is.

### Fingers
*Tap: the Fingers menu.*

> How busy and how hard the finger part is. Tame → Loose → Unruly is the difficulty curve, measured in how many separate times your fingers attack in a bar. Wild Card sits off the curve on purpose — it's fully random, for finding ideas rather than for drilling. Changing this re-rolls only the fingers.

### Pattern length
*Tap: the Pattern menu.*

> How many bars of picking are actually different before the pattern repeats. Growing it copies what you have rather than re-rolling, so hand-drawn work survives — and it's what you raise when you want one bar of a progression to differ from the rest.

### Swing
*Tap: the Swing slider.*

> Delays the "&"s between the beats, from straight up to a triplet feel. The beats themselves never move, so your thumb stays metronomic and the click keeps giving you a straight quarter pulse to play against. Drag it while the loop runs and you'll hear it change.

---

## Options → Preferences

### Metronome
*Tap: the Metronome lamp.*

> The click on every beat. Independent of the picked notes, so you can practise against the click alone.

### Melody
*Tap: the Melody lamp.*

> Hear the pattern itself played back, so you can check what a roll sounds like before you try it.

### Count-in
*Tap: the Count-in lamp.*

> One bar of counting before the loop starts, with the grid dimmed. The count-in always clicks even with the metronome off, so you get an audible 1-2-3-4.

### Buttons
*Tap: the Buttons lamp.*

> The mechanical click when you press a control. It stays silent while the transport is running, which is also what keeps the app quiet on a silenced phone.

### Note labels
*Tap: the Note labels menu.*

> What's written inside each note: the fret number, the picking finger (p, i, m, a) or nothing at all.

### Theme
*Tap: the Theme menu.*

> The instrument's colours. Each one is named for a player, and the choice is remembered.

---

## Not annotated, on purpose

These stay navigational while help mode is armed, so you can reach the controls
inside the Options sheet — they explain themselves by working:

- the **gear** (opens Options)
- the **Setup / Preferences** page tabs
- the sheet's **✕** and its backdrop
- the **`?`** itself (which is how you leave)
- the **card** (tap it to put it away)

The **Save** and **Load** sheets are deliberately not enterable in help mode —
the pills explain instead of opening, because their contents are words rather
than glyphs and read for themselves.
