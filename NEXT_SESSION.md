# Carry-forward — Travis Picker (after session 12, 2026-07-24)

## Shipped this session (v2.6.0, `CACHE` v31) — D3 Help / guide surface
A read-only guide in the app's own tweed language (built on `modal.js`).
- **`infoModal()`** added to `modal.js` — scrollable info card, single close
  button, no cancel/input; `render(bodyEl)` fills it (content stays in the
  caller). `present()` now guards a null cancel.
- **Entry:** a carved "?" key at the **bottom-right of the Options → Appearance
  row** (Note labels shrank `span-2`→`span-1` to make room; row is now
  Note labels · Theme · Guide "?"). Raised action button, not a well.
- **Content (`renderHelp` in `app.js`):** short how-to (grid / roll / play & sound
  / chords & keys / edit-save-load) + an **indicator legend** giving ABS/MIX
  (amber chips), the red REC dot and the green save dot a real explanation.
- 48/48 green (+1 info-modal test). Verified: Appearance row clean at 375px,
  modal opens/scrolls/closes and leaves the Options sheet open under it.
- PIMA stays lowercase (recommendation given; not changed).

**v2.6.1 (`CACHE` v32)** — phone-test fixes on the v2.6.0 pass:
- Help copy describes note rows by **position** ("bottom/top rows"), not colour —
  note colours are theme-driven. Fixed legend colours (ABS/MIX/REC/save) stay.
- **Progression numbering → Roman numerals** (`romanize`/`romanDegrees` in
  `data.js`; case = quality, I/IV/V major, ii/iii/vi minor). Context readout,
  prog dropdown, save placeholder, saved-item line. Display-only. (All-caps? →
  the `ROMAN` map.)
- **Save/Load sheet text unified to Fraunces** (`--serif`), like the modals.
- **Play latch strengthened** — darkest at top + deeper sink so the pressed-in
  read beats the lit colour. Device-confirm the latch now reads while playing.
- Confirmed good on device from this pass: sounds, die-flicker gone, "?" placement,
  guide, legend, dupe names, empty-load text.

**v2.6.2 (`CACHE` v33)** — **tap-highlight halo fix.** Elizabeth (light theme)
flashed a blue "halo" on Play press = WebKit's default `-webkit-tap-highlight-
color` (blue), invisible on dark faceplates. Fixed with
`-webkit-tap-highlight-color: transparent` on the controls. **Touch-only —
can't be seen with a desktop mouse; found via the computed property.** Confirm
the halo's gone on Elizabeth on device.

**v2.6.3 (`CACHE` v34)** — **two-phase "ka-chunk" button sound** (tape-deck
transport feel): light **"ka"** on pointer-down, deeper **"chunk"** on pointer-up.
`ui-sound.js` now exports `playPress`/`playRelease` (was `playClick`); `app.js`
fires them on pointerdown/pointerup. **Device-only to judge** — tune the `body`/
`tick` numbers to taste.


Everything shipped this session is live and **pending the user's guitar/phone
test**. He tests between sessions, so start by asking how the batch felt.
Deploy dance every push: bump `CACHE` in `sw.js`, bump the version label in
`index.html`, `git push` (Pages auto-deploys), force-quit + reopen on the phone.
In-browser verification runs against a scratchpad rsync mirror (`serve.py` in a
`scratchpad/mirror/` copy) because the preview can't read `~/Desktop`; re-sync
(`rsync -a --delete --exclude .git`) after edits. **Preview caveat:** rAF is
paused when the preview tab is hidden, so the beat lamp / playhead blink is
phone-only.

## Shipped this session (v2.5.4, `CACHE` v30) — v2.5.3 phone-test refinements
Small batch off the user's v2.5.3 device notes; all deployed, 47/47 green (+1).
- **Button sound now fires on RELEASE, not press** — delegated listener moved
  `pointerdown` → `pointerup` in `app.js` (press-and-hold is silent, thock on
  lift; actions were already on click/release, so the sound lands with them).
  User wanted it to "feel more real."
- **Click sound made more mechanical** (`ui-sound.js`) — tighter/shorter/higher
  body "clack" + a brighter, slightly louder contact tick (bandpass 2600→3400).
  Device-only to judge; user called it minor.
- **Die pop-out flicker** — added a fast `box-shadow 0.07s ease` release
  transition to `.btn-roll` so the raised shadow doesn't SNAP back (read as a
  flicker). Straight-in sink (v2.5.1) kept. Phone-only to confirm.
- **Duplicate save names** get a Finder-style `(2)`, `(3)` suffix
  (`storage.js` `uniqueName`; original keeps its plain name). Test added.
- **Empty-Load copy** shortened to "Saved patterns will appear here." (the old
  line orphaned "it" onto a second row). Verified single-line at 375px.
- **Confirmed by user from v2.5.3:** chord-label repaint fix (#5) is good; domes
  legible at 4-bar. **Open question answered:** PIMA stays **lowercase** (the
  classical p-i-m-a convention) unless he asks for caps.

## Carry-forward from session 11 (v2.5.0 → v2.5.3, `CACHE` v29) — UI-feel batch

## Shipped this session (v2.5.0 → v2.5.1, `CACHE` v27) — UI-feel + design-language
v2.5.0 batch:
- **Press-in on every button** — the carved press Edit had, now uniform.
- **Button press sound** (`js/ui-sound.js`) — dependency-free Web Audio *thock* on
  pointerdown; own toggle, persisted in `tp-audio.ui`. **Device-only to hear.**
- **Native popups → our language:** `js/modal.js` (Promise confirm/prompt, tweed,
  fixed-red destructive) + `js/dropdown.js` (custom tweed dropdowns for every
  `<select>` incl. the per-bar chord picker; **native select stays the source of
  truth**, trigger kept honest by wrapping the `value` setter).
- **B1 single-chord box height** — grid PINNED to the same position in both modes;
  big chord label floats with zero flow height. SE-safe.

v2.5.1 → v2.5.3 refinements (from phone tests — see CLAUDE.md for details):
- Die press sinks straight in (no "slide"); **count-in is now a toggle** and no
  longer flashes digits on Play; **Play latches in** when playing; single-mode
  chord-label lingering-behind-sheet bug fixed (iOS repaint — **phone-only to
  verify**).
- **Note tokens are 3D DOMES** (a poker-chip was tried in v2.5.1 and rejected —
  dome is signed off, don't re-propose the chip).
- **Options reorganised into Generation / Sound / Appearance.** Sound is a 2×2
  lamp bank laid out `Metronome | Melody` over `Count-in | Buttons` (metronome
  pair in the left column): **Metronome** (was Click) · **Melody** (was Notes) ·
  **Count-in** · **Buttons** — ids unchanged, labels only. "Preferences" →
  "Appearance".

46/46 green.

## What still needs the user's hands
- **The v2.5.4 press feel** — die pop-out flicker (softened with a release
  transition; confirm it's gone) and the **sound-on-release** timing (does the
  thock-on-lift feel more like a real switch?).
- The **more-mechanical click sound** — dial the `ui-sound.js` numbers to taste.
- The **modals + dropdowns** on a real phone (open/close ergonomics, panel over
  the grid, per-bar chord picker under the thumb) — still un-verdicted on device.
- B1 edge: SE + 4-bar **single** + long loaded name can let the floating label
  reach into the name row. Default 1-bar/unsaved clear.

## Open list (carry-forward), roughly by size
- **C1–C3 — musical content pass.** Add more keys; review which chord
  progressions ship; sort/group the chord & progression menus. (Needs the user's
  musical calls.) NOTE: menus are now custom dropdowns — grouping/ordering is
  easy to style now if wanted.
- **E1 — Unruly density.** User once felt it's occasionally "too much." Reopen
  the `CHAOS_PRESETS` numbers, or leave it — his call. Generation was signed off.
- **G1 — Swing.** Timing feel; touches the metronome/synth scheduler.
- **G2 — Pre-loaded patterns.** Ship as read-only "Built-in" data in the Load
  sheet (NOT seeded into localStorage). Fits the "favorites as a folder" idea.
- **Smaller:** if saved names ellipsize too much with 3 buttons, switch saved-item
  actions to icons or a two-row layout; JSON export/import of the library.

## How this user likes to work
- Favourite kind of work is **functional hardware detail** (lamps, button feel).
  Give existing state a physical body over adding plain text.
- **Surface genuine forks, don't guess** — one well-framed question beats a guess
  (the custom-dropdown fork this session was his explicit call).
- Sharp visual instincts on hardware realism — trust the feedback loop.
- **The pattern grid is always the hero**; craftsmanship surrounds it. Re-measure
  375×553 before shipping any chrome growth.
- Deploys are public (repo is public) — keep the GitHub noreply identity, never
  reintroduce a real name/email.
