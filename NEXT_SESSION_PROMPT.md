# Next session — the deferred small fixes

Copy everything below the line into a new session.

---

Travis Picker — new session. **V3 (v3.0.0) is live and pushed.** Read `CLAUDE.md`
and `OPEN_ITEMS.md` first; `CHANGELOG.md` sessions 29–31 have the recent reasoning
(the progression revamp, the engraved style headers on the drums, and the chord
qualities going 3 → 10 / 36 → 120 chords).

**This session is the small deferred fixes from my notes** — no big features. Three
items, all from my `V2.14.12 notes`, plus one cleanup I know about. Agree the
approach on each before coding, and tell me which ones you can actually verify on
the dev box vs which need my phone.

## 1. Landscape (bug + a decision)

Going to landscape and back to portrait leaves **Options opening at the top of the
sheet** (wrong scroll/anchor position). My instinct is **landscape should probably
be disabled entirely** — this is a phone-portrait practice tool and the manifest
already says `"orientation": "portrait"`.

Two things to work out:
- The manifest's `orientation` is only honoured in an installed PWA, not a Safari
  tab, so decide what (if anything) to do for the tab case — a CSS
  `@media (orientation: landscape)` treatment, or accept it.
- **Fix the underlying bug regardless**, since a rotate can happen before any lock
  applies. Worth understanding *why* the sheet lands mis-positioned — it's likely
  the bottom-anchored sheet plus a stale viewport height, and the fix should be the
  cause, not a scroll-to-top patch.

## 2. Persist settings across launches

Right now **only** `tp-audio` (Metronome / Melody / Count-in / Buttons + swing),
the theme, and the saved library survive a relaunch. Everything else resets:
**capo, Thumb, Fingers, Pattern length, chord, key, progression, Single/Progression
mode, and Note Labels** (that last one is the odd one out — it sits next to theme in
Preferences but isn't saved).

I want the things I *set once and keep* to persist. Points to settle with me:
- **Which ones.** My note said "capo, fingers complexity, swing, etc." Capo is
  interesting because `CLAUDE.md` calls it *musical content* (it's saved inside a
  pattern's context) — persisting it as a session default is a different thing from
  that, so don't break the saved-pattern behaviour.
- **BPM is deliberately not persisted** (documented: you move tempo constantly,
  unlike swing). Keep that unless I say otherwise.
- **What happens on Load** — a saved pattern restores its own chord/key/capo
  context, which must still win over any persisted defaults.
- Note the documented footgun in `CLAUDE.md`: *a pref blob seeded with defaults can
  never tell you "unset"* — `loadAudioPrefs()` returns the raw stored blob for
  exactly this reason. Any new pref store needs the same discipline.

## 3. The intermittent Play bug

Occasionally **Play doesn't work** and I have to leave the app and come back (not a
full quit). I don't know what triggers it. Likely suspects, all in `platform.js` /
`metronome.js`: the playback guard stopping the transport on `visibilitychange`, the
iOS audio-session category handoff, a suspended `AudioContext` that never resumes,
or the wake-lock retry path. Since it's intermittent and I can't reproduce on
demand, I'd rather you **instrument or harden the resume path** than guess at a
one-line fix — e.g. always attempt `ctx.resume()` on the Play handler and on
foreground, and make sure `stopTransport()` can't leave state that blocks a restart.
Tell me what you find and what you changed, so I know what to watch for.

## 4. Cleanup that's now earned

`CLAUDE.md` says the dead-code pass should ride along with whatever session next
touches those files. Sessions 29–31 rewrote a lot of `data.js`, so: `romanize` /
`romanDegrees` / `roleFor` / `modalOpen` / `SAVED_KEY` / `SCHEMA_VERSION` /
`getTheme` / `savedThemeId` were listed as referenced nowhere, and
`resolveMergedBar` is live but needlessly exported. Confirm before deleting.

## Ground rules (unchanged)

- The **grid is the hero**; re-measure **375×553** before shipping any chrome
  growth (the budget is ~11px clearance under a 4-bar grid).
- Keys / chords / progressions are **data** in `data.js`; the generator stays
  untouched.
- **Agree the design before coding** and surface real forks.
- Tests stay green and grow with any new invariant (`tests.html`).
- Dev box: the preview server can't read `~/Desktop`, so work against the rsync
  mirror in `.claude/launch.json` — re-sync after every edit. Believe the DOM over
  screenshots (hidden tab). The test page's async checks are **slow** in the
  throttled preview tab (~1–2 min); the key×progression reel test can flake there
  and reproduces on known-good code.
- Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push, I check on
  the phone. Repo is public — keep the GitHub noreply identity.

## Also outstanding (not this session unless you say so)

- **Pre-loaded patterns** (`OPEN_ITEMS.md` item 2) — still the best-value big item;
  it needs me to pick the patterns.
- **G♯sus2 stretch** — if it plays badly on the guitar (frets 4–8, a 5-fret span),
  hand-voice those roots.
- Whether the **key drum** should keep its MAJOR/MINOR headers or go back to a plain
  groove.
