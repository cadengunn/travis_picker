# Carry-forward — Travis Picker (after session 13, 2026-07-24)

## Shipped this session — keys & progressions (C1–C3), v2.7.0 → v2.7.2 (`CACHE` v37)
The musical-content pass. **All data edits in `data.js`; generator untouched.**
54/54 green, verified in-browser. **Pending the user's weekend guitar/phone test.**
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

**Deploy dance every push:** bump `CACHE` in `sw.js`, bump the version label in
`index.html`, `git push` (Pages auto-deploys), force-quit + reopen on the phone.
In-browser verification runs against a scratchpad rsync mirror (preview can't read
`~/Desktop`); re-sync (`rsync -a --delete --exclude .git`) after edits. Preview
caveat: rAF is paused when the tab is hidden, so the beat lamp / playhead blink is
phone-only.

## What needs the user's hands
Weekend test of v2.7.x on guitar/phone. Things to feel out:
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
