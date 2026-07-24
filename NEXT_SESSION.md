# Carry-forward — Travis Picker (after session 13, 2026-07-24)

## Shipped this session — keys & progressions (C1–C3), v2.7.0 → v2.7.5 (`CACHE` v40)
The musical-content pass. **All data edits in `data.js`; generator untouched.**
56/56 green, verified in-browser. **Pending the user's weekend guitar/phone test.**
Full detail in CLAUDE.md "Where things stand (session 13)" + the rewritten
"Nashville numbers (token model)" and Chord-library notes.

- **Token model.** Progressions store harmonic **tokens** (`I, ii, II, IV, V, vi,
  ♭VII, I7`, minor `i/iv/v/VI/VII`), each key maps tokens→chords and carries a
  `mode`. Lets `II` (major two), `♭VII`, `I7` (dom7 tonic) exist.
- **Minor keys Am + Em** (natural minor, major-V cadence). No Major/Minor toggle —
  the selected key's mode filters the progression list; crossing the mode line
  lands on that mode's first preset.
- **6 new chords** → 21 total: `C7 G7 D7 A7 E7` (dom7, bass = parent major; E7 =
  `020130`), `F#` (E's II), `Bb` (C's ♭VII). **E7 voicing signed off.**
- **Curated progressions**, grouped by style (Foundations / Classic Country /
  Traditional Folk / Modern Acoustic / **Classic Standards** / Minor). **All 4-bar**
  (shorter ideas padded); a concise `label` drives the menu/readout.
- **Grouped menus** via `<optgroup>` headers in `dropdown.js`. Single-chord picker
  leads with **Open chords** (incl. `Dm`, v2.7.2); per-bar picker by quality.
- **Smart custom numerals (v2.7.3)** — a hand-edited non-diatonic bar reads as
  `♯iv` / `♭ii` / `VI7`, not `?` (`romanInKey`/`degreeLabel`).
- **Header fit (v2.7.4 → v2.7.5)** — the richer numerals were truncating. v2.7.4
  swapped the name/context rows; the user preferred the context stay **top-left**
  with the type shrinking instead, so **v2.7.5 restored the original row order and
  added `fitContext()`**: 14px base, 10.5px floor, scaled only when needed
  (presets 14px, worst case ~11.7px, never truncated). The **version tag stays in
  the Options sheet header** — that trim is what keeps most readouts at full size.
  `.app-head` is still 63px. A third row was offered and rejected (SE budget).
- **♭/♯ line-height fix (v2.7.5)** — picking a `♭VII` progression made the Options
  sheet creep upward: the glyphs aren't in Fraunces and the fallback's taller
  metrics grew the dropdown trigger **+4px** (reproduced and measured both ways).
  `.context`, `.dd-trigger` and `.dd-option` now pin `line-height`. **Any new text
  that can hold ♭/♯ needs the same.**
- **Chord randomiser (v2.7.4)** — a die on the Options **"Generation" header
  line**: progression mode rolls key + progression, single mode rolls an open
  chord. Sheet had only ~45px headroom on SE, hence the header line rather than a
  control row. Pure `randomKeyProgression`/`randomChord` in `data.js`; **two-stage
  sampling** (key first) so minor keys aren't buried at ~8% of rolls.

**Deploy dance every push:** bump `CACHE` in `sw.js`, bump the version label in
`index.html`, `git push` (Pages auto-deploys), force-quit + reopen on the phone.
In-browser verification runs against a scratchpad rsync mirror (preview can't read
`~/Desktop`); re-sync (`rsync -a --delete --exclude .git`) after edits. Preview
caveat: rAF is paused when the tab is hidden, so the beat lamp / playhead blink is
phone-only.

## What needs the user's hands
Weekend test of v2.7.x on guitar/phone. Things to feel out:
- The **auto-shrinking context readout** — is ~11.7px still readable at arm's
  length on the worst-case custom progression? If not, the lever is the pills:
  dropping "Edit" to just the pencil glyph frees ~30px and raises the floor.
- The **randomiser die**'s placement on the "Generation" header line. It's scoped
  to key+progression (tooltip says so), but sitting on that header it *could* read
  as "randomise everything in Generation" — easy to move, rescope to also roll
  Thumb/Chaos/Pattern, or give its own row if the sheet is allowed to scroll.
- The new **minor keys** (Am/Em) and their progressions.
- **Barre chords** `F#` (E's `I–II–V`) and `Bb` (C's `I–♭VII` folk progressions) —
  playability.
- Whether the **curated progression list** matches what he actually drills
  (add/drop/reorder is a one-line data edit each).
- Dom7 feel in `I–I7–IV–I` (the ♭7 is a finger colour, bass unchanged).

## Open list (carry-forward), roughly by size
- **Capo system** — separate chord *shape* from *concert key* (Shape G + Capo 2 =
  sounds A). A whole new axis/control; deferred this session as its own future
  session. The user's spec sketched Shape / Capo 0–11.
- **G2 — Pre-loaded patterns.** Ship as read-only "Built-in" data in the Load
  sheet (NOT seeded into localStorage). Fits the "favorites as a folder" idea.
- **G1 — Swing.** Timing feel; touches the metronome/synth scheduler.
- **E1 — Unruly density.** User once felt it's occasionally "too much." Reopen the
  `CHAOS_PRESETS` numbers, or leave it — generation was signed off.
- **More keys later** — all-12-keys and sharp minor keys (Bm/F#m/C#m, which pull in
  new barre majors). "Curate first, expand later."
- **Smaller:** JSON export/import of the Saved library; if saved names ellipsize
  too much with 3 buttons, switch saved-item actions to icons or two rows.

## How this user likes to work
- **Agree the design against his spec BEFORE coding** — this session's whole model
  (tokens, minor-as-filtered-keys, 4-bar progressions) came from a written spec he
  brought + a short fork discussion. Surface genuine forks, don't guess.
- He **tests on a real guitar between sessions** — stop at checkpoints and say
  what's worth trying.
- Favourite kind of work is **functional hardware detail** (lamps, button feel).
- **The pattern grid is always the hero.** Re-measure 375×553 before shipping any
  chrome growth.
- Deploys are public — keep the GitHub noreply identity, never reintroduce a real
  name/email.
