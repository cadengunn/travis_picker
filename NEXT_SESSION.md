# Carry-forward — Travis Picker (after session 11, 2026-07-23)

Everything shipped this session is live and **pending the user's guitar/phone
test**. He tests between sessions, so start by asking how the batch felt.
Deploy dance every push: bump `CACHE` in `sw.js`, bump the version label in
`index.html`, `git push` (Pages auto-deploys), force-quit + reopen on the phone.
In-browser verification runs against a scratchpad rsync mirror (`serve_dev.py`,
reads `PORT` env; `.claude/launch.json` → `travis-picker-mirror`) because the
preview can't read `~/Desktop`; re-sync after edits. **Preview caveat:** rAF is
paused when the preview tab is hidden, so the beat lamp / playhead blink is
phone-only.

## Shipped this session (v2.5.0, `CACHE` v26) — a UI-feel + design-language batch
- **Press-in on every button** — the carved press Edit had, now uniform (segmented
  toggle, sheet ✕, saved-item buttons, primary, dropdown triggers/options).
- **Button press sound** (`js/ui-sound.js`) — dependency-free Web Audio *thock* on
  pointerdown; own "Button clicks" toggle in a new *Interface* Options section
  (persisted in `tp-audio.ui`). **Device-only to actually hear.**
- **Native popups → our language:**
  - `js/modal.js` — Promise-based confirm/prompt modals (delete, rename,
    discard-edits) in tweed; destructive = fixed-red confirm. Callers went async.
  - `js/dropdown.js` — custom tweed dropdowns for every `<select>` incl. the
    per-bar chord picker. **Native select stays the source of truth** (hidden, still
    fires `change`); trigger label kept honest by wrapping the `value` setter.
- **B1 single-chord box height** — grid PINNED to the same position in both modes;
  the big chord label floats with zero flow height. SE-safe (no overflow).

See CLAUDE.md "Where things stand (session 11)" for the architecture details and
the two new tests. 46/46 green.

## What still needs the user's hands
- The **push-in feel** and the **press sound** — device-only.
- The **modals + dropdowns** on a real phone (open/close ergonomics, panel
  positioning over the grid, the per-bar chord picker under the thumb).
- B1 edge to watch: SE-class screen + 4-bar **single** mode + a long loaded name
  can let the floating label reach into the name row. Default 1-bar/unsaved clear.

## Open list (carry-forward), roughly by size
- **C1–C3 — musical content pass.** Add more keys; review which chord
  progressions ship; sort/group the chord & progression menus. (Needs the user's
  musical calls.) NOTE: menus are now custom dropdowns — grouping/ordering is
  easy to style now if wanted.
- **E1 — Unruly density.** User once felt it's occasionally "too much." Reopen
  the `CHAOS_PRESETS` numbers, or leave it — his call. Generation was signed off.
- **D3 — Help / manual surface.** A "?" that explains ABS/MIX etc. Would host the
  caution-lamp explanation now on the `title`. (A themed modal is available now.)
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
