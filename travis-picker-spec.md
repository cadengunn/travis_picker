# Travis Picker — Project Spec

A personal practice tool that randomly generates playable 4- or 8-bar Travis picking (alternating-bass fingerstyle) right-hand patterns and renders them as guitar tab.

## Tech stack

- **Mobile-first PWA** (progressive web app): single-page web app installable via "Add to Home Screen" on iOS/Android. Include a web app manifest, appropriate icons, and a service worker for offline use. Fullscreen standalone display mode.
- Design for a phone screen first (portrait, thumb-reachable controls); desktop layout is the afterthought, not the other way around.
- Vanilla JS or lightweight framework if justified. No build step required for v1.
- **Rendering: custom drum-machine-style grid** (HTML/CSS grid or canvas — prefer HTML/CSS for tappability). No notation library. This is not a tablature/sheet-music tool.
- Persistence: `localStorage` for saved patterns (generated favorites and hand-drawn).
- Audio (later phase): **Tone.js** for metronome click and pattern playback.
- Runs locally in the browser. No server, no accounts.

## Musical model

### Time and rhythm
- 4/4 time. Grid of 8 slots per bar (straight 8th notes: 1 & 2 & 3 & 4 &).
- No syncopation, ties, or 16ths in v1. (Planned for v2.)

### Hand domains (core principle)
The right hand splits the guitar in half: **thumb (p) owns strings 6–5–4; fingers own strings 3–2–1** with default assignment **i→string 3, m→string 2, a→string 1**. All generation respects these domains. A separate **"domain crossing"** toggle (off by default, even in Chaos) lets fingers reach into string 4 or the thumb wander above the bass strings for experimental sessions.

### Thumb (the skeleton — never randomized away)
- Plays quarter notes on beats 1, 2, 3, 4 (slots 1, 3, 5, 7).
- The thumb is a **pluggable bass engine**: every mode is a data preset, not code. See "Bass engine presets" below for the full definitions.
- v1 must ship with at least Alternating + Full random; the preset format makes the rest drop-in additions.

### Fingers (where the variety lives)
- i, m, a on strings 3, 2, 1 respectively (per hand domains above).
- Occupy offbeat slots (the "&"s: slots 2, 4, 6, 8) — any subset may be filled or rest.
- **Pinches always allowed**: on any beat, finger note(s) may sound together with the thumb.
- **Double stops always allowed**: two or three finger notes may sound in the same slot, on any slot.

### Constraints — one hard rule, everything else is a dial
**Hard rule (always enforced):** no two simultaneous notes on the same string. That's physics, not taste.

Everything else is governed by a **Chaos** setting:
- **Tame**: no identical treble string on consecutive 8th slots; 2–4 filled offbeats per bar; pinches on downbeats only; single-note offbeats favored.
- **Loose**: repeat-string allowed; any density; pinches anywhere; double stops occasionally.
- **Chaos**: no stylistic constraints at all — any legal combination of thumb + fingers in any slot. Novelty over playability; the point is discovering patterns.

Implement each stylistic constraint as an independent flag internally; Tame/Loose/Chaos are just presets over those flags (leaves room for a future "custom" panel).

### Pattern structure (this is what makes it musical, not random)
- Generate a **1-bar or 2-bar cell**, then repeat it across the phrase. Real Travis playing grooves on a repeating pattern.
- Options: "1-bar loop", "2-bar loop", "through-composed" (fully random each bar — advanced mode).
- Phrase length: 4 or 8 bars, user toggle.

## Bass engine presets (data spec — ready to implement)

Each preset is a 4-entry array, one entry per beat. An entry is either a **role** (`"root"`, `"alt"`, `"fifth"`) resolved through the chord table, or an **absolute string number** (6/5/4). A preset containing only roles is fully relative (portable across progressions); any integer entry makes those beats absolute. `"random"` as an entry means "pick from 6/5/4 each roll."

```json
[
  { "id": "alternating", "name": "Alternating",  "beats": ["root", "alt", "root", "alt"], "default": true },
  { "id": "dead_thumb",  "name": "Dead Thumb",   "beats": ["root", "root", "root", "root"] },
  { "id": "root_fifth",  "name": "Root–Fifth",   "beats": ["root", "fifth", "root", "fifth"] },
  { "id": "triangle",    "name": "Triangle Walk","beats": ["root", "fifth", "alt", "fifth"] },
  { "id": "climb",       "name": "Climb",        "beats": [6, 5, 4, 5] },
  { "id": "descend",     "name": "Descend",      "beats": [4, 5, 6, 5] },
  { "id": "full_random", "name": "Full Random",  "beats": ["random", "random", "random", "random"] }
]
```

Notes for implementation:
- The generator consumes `beats` and resolves each entry to `{string, fret}` via the chord table — adding a preset must never touch generator code.
- Users can define **custom locked patterns** in the UI later (v2): a simple 4-slot picker where each slot is root / alt / fifth / 6 / 5 / 4 / random, saved into this same list.
- Absolute presets (Climb, Descend) ignore the chord's root — they're texture tools, closer to chaos territory. Fine.
- Playability caveat: the `fifth` role sometimes requires fretting a string the open shape doesn't (C's fifth lives at string 6, fret 3). The grid should show that fret number in Fret mode so it's visible, not surprising.

## Chord library (v1)

Used by role resolution (`root`, `alt`, `fifth`). Absolute and random entries ignore this table.

| Chord | Root string | Alt string | Fifth string (fret) |
|-------|-------------|------------|---------------------|
| C     | 5           | 4          | 6 (fret 3)          |
| G     | 6           | 4          | 4 (open)            |
| D     | 4           | 3          | 5 (open)            |
| E / Em| 6           | 4          | 5 (fret 2)          |
| A / Am| 5           | 4          | 6 (open)            |
| F (small barre or Fmaj7 shape) | 6 (or 4 for Fmaj7) | 4 (or 3) | 5 (fret 3) |

Note G's alt and fifth are both string 4 — Root–Fifth and Alternating coincide on G. That's correct, not a bug.

Tab shows fretted notes from standard open chord shapes (define shapes as string→fret maps in a data file so they're easy to extend).

## Display: the grid (one component for everything)

A step-sequencer / drum-machine style grid is the single display AND editor:
- 6 rows (strings, low E at bottom) × 8 columns per bar (8th-note slots), bars laid side by side or swipeable.
- Active notes render as **filled circles inside cells**; inactive cells are empty boxes.
- Thumb-domain rows (6/5/4) and finger rows (3/2/1) get subtle visual separation (color or divider) to reinforce hand domains.
- Beat columns (1, 2, 3, 4) visually distinguished from "&" columns.
- **Label mode toggle** (what's printed inside each circle):
  - **Fret mode**: fret number from the current chord shape.
  - **PIMA mode**: p / i / m / a, chord-agnostic, for pure right-hand drilling.
- The same grid component handles playback display, browsing favorites, and editing — edit mode simply enables tapping.

## Pattern data model: relative vs. absolute

Every pattern is tagged `"type": "relative"` or `"type": "absolute"`:
- **Relative**: bass notes stored as roles (`root`, `alt_bass`), treble notes as finger/string within the treble domain. Portable — progression mode re-derives actual strings per chord from the chord table. Produced by chord-aware thumb modes.
- **Absolute**: literal string numbers. Produced by Full Random mode; the default for anything drawn as-is.
- Progression mode: relative patterns re-map per chord (the point of the feature); absolute patterns apply literally with a small "absolute — bass won't follow chords" indicator, never an error.

### Saving hand-drawn patterns as relative
- Drawing always happens against the currently selected reference chord.
- On save, ask: **absolute or relative?**
- Relative conversion: the bass note on the reference chord's root string → `root`; on its alternate string → `alt_bass`; treble notes map by string/finger directly.
- Bass notes that match neither role (e.g., string 6 drawn over a C chord) are flagged in the save dialog with a choice: snap to nearest role, or keep just those notes absolute (mixed pattern, allowed). No silent guessing.

## Manual pattern editor

Editing = the grid with tapping enabled:
- Tapping a cell toggles a note; the app infers p/i/m/a from the string row (per hand domains).
- Enforce only the hard rule (no impossible simultaneities); warn softly on domain crossings rather than block.
- Hand-drawn patterns save to the same library as generated favorites, tagged "drawn" vs "generated" and "relative" vs "absolute".
- Editing a saved/generated pattern opens the same grid — this doubles as a "tweak a generated pattern" feature.
- Cells must be comfortably tappable on a phone screen.

## Modes (toggleable)

1. **Single-chord drill**: pick one chord, generate a pattern, loop it. Pure right-hand focus.
2. **Progression mode**: user selects a progression (presets like C–Am–F–G, G–Em–C–D, plus custom entry). The same right-hand cell is applied across the progression, with thumb strings re-mapped per chord — exactly how a real player moves a pattern through changes.

## Feature priorities

**v1 (build in this order):**
1. Pattern generator + grid display (fret/PIMA label toggle) — "Generate" button re-rolls. Relative/absolute data model in place from the start.
2. Save favorites — name and save patterns to localStorage; list view; reload.
3. Manual editor (tapping on the grid) with the relative/absolute save dialog.
4. Metronome / tempo control — click track, BPM slider (40–160), count-in. NOTE (iOS): Web Audio requires a user gesture — call `Tone.start()` (or resume the AudioContext) on first tap or nothing will sound in Safari.

**v2:**
5. Remaining bass presets beyond Alternating + Full Random (Dead Thumb, Root–Fifth, Triangle Walk, Climb, Descend) — already fully spec'd as data above; plus the custom 4-slot pattern builder UI.
6. Audio playback of the pattern itself (Tone.js, simple plucked synth or samples).
7. Syncopation: allow held/tied treble notes across the beat.
8. 16th-note fills, hammer-on/pull-off annotations.
9. Custom constraint panel (individual toggles behind the Tame/Loose/Chaos presets).

## UI sketch

Phone-first, portrait. Controls in a bottom sheet or collapsible top bar: chord/progression, thumb mode, chaos level (Tame/Loose/Chaos), label mode (Fret/PIMA), phrase length (4/8), BPM.
Main area: the grid (bars side by side or swipeable).
Primary actions as large tappable buttons: Generate • Draw • Save • Favorites.
Keep it minimal — this is a practice tool, not a product.

## Conventions for Claude Code

- Keep the pattern generator as a pure function: `generatePattern(chord, options) → PatternData`, separate from rendering. Testable in isolation.
- Thumb modes are strategy objects/configs consumed by the generator — adding a new locked bass pattern must never require touching generator logic.
- Chaos levels are presets over individual constraint flags, not branching code paths.
- Represent a pattern as JSON with a top-level `type: "relative"|"absolute"` and a slots array (`{slot, finger: "p"|"i"|"m"|"a", role?: "root"|"alt_bass", string?, fret?}`). Both grid label modes and both pattern types are pure transforms of this one structure.
- Write unit-style checks for: the hard rule (no simultaneous same-string notes), domain assignments, and round-tripping relative↔resolved patterns across the chord table.
- Initialize git and commit after each working feature.
