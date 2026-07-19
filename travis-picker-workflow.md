# Travis Picker — Build Workflow

Your step-by-step to-do list, from empty MacBook to app on your phone. Pair this with `travis-picker-spec.md`.

## Phase 0 — Setup (~10 min, one time)

- [ ] Install the Claude Desktop app on the MacBook (claude.com/download) and sign in with your **personal Claude account**, not the firm's Team login.
- [ ] Click the **Code** tab (upper left). No terminal, Node.js, or CLI install needed — Claude Code is built in.
- [ ] Make a project folder (Finder is fine): `~/Projects/travis-picker`, and drop `travis-picker-spec.md` and this file into it.
- [ ] In the Code tab: new session → **Local** → Select folder → choose that folder.
- [ ] Sanity check: ask *"initialize a git repository here and commit the spec files."* If macOS pops an "install command line developer tools" prompt, click Install and re-ask.
- [ ] A GitHub account/repo is needed later for phone hosting — fine to defer to Phase 3.

## Phase 1 — Generator + grid (session 1)

- [ ] Open the Code tab, resume your travis-picker session (or start a new one on that folder).
- [ ] Opening prompt, roughly: *"Read travis-picker-spec.md. Build v1 item 1: the pattern generator (pure function, relative/absolute data model) and the grid display with the Fret/PIMA label toggle. Mobile-first layout. Ask me anything ambiguous before writing code."*
- [ ] Tip: use the **plan mode** option in the session controls for the first big build — Claude proposes an approach before touching files. Review, approve, let it build.
- [ ] Test using the app's **live preview** panel (or ask Claude to open it in your browser). Mash Generate 20 times. Check: thumb stays on strings 6–5–4, beats vs "&" columns look right, PIMA toggle works. Narrow the preview window to phone width.
- [ ] Ask Claude to commit (or approve the commit it proposes). The diff viewer is worth a skim even if you don't read code — you'll absorb the project's shape over time.

## Phase 2 — Favorites + editor (session 2)

- [ ] Prompt: *"Build v1 items 2 and 3: save/load favorites in localStorage, and edit mode on the grid with the relative/absolute save dialog per the spec."*
- [ ] Test the tricky path deliberately: draw a pattern over C including a string-6 bass note, save as relative — you should get the flag/choice dialog, not silence.
- [ ] Drop a relative pattern into progression mode; confirm bass follows the chords.
- [ ] Commit.

## Phase 3 — Metronome + PWA + phone (session 3)

- [ ] Prompt: *"Build v1 item 4 (metronome with Tone.start() on first tap for iOS) and PWA packaging: manifest, icons, service worker for offline."*
- [ ] Get it on your phone — easiest path is GitHub Pages:
  - [ ] Ask Claude: *"create a GitHub repo for this project, push it, and enable GitHub Pages."* It may hand you a couple of one-time auth steps (signing into GitHub) — just follow along.
  - [ ] Open the Pages URL in Safari on your iPhone → Share → **Add to Home Screen**.
- [ ] Phone checklist: cells comfortably tappable, metronome audible after first tap, works in airplane mode, favorites survive closing the app.
- [ ] Note: updates you push take effect after the service worker refreshes — force-quit and reopen the app if changes don't appear.

## Phase 4 — Play it (the real test)

- [ ] Guitar in hand: generate on Tame over a C chord. Is it playable? Musical?
- [ ] Crank to Chaos + Full Random. Roll until something surprises you. Save it.
- [ ] Keep a running list (paper, Obsidian, wherever) of friction: "grid too small," "want a re-roll-one-bar button," "chaos too chaotic."
- [ ] Feed the list back: `claude` → paste the list → iterate. This loop is the whole game now.

## Later (when v1 feels lived-in)

- Remaining thumb modes (dead thumb, root–fifth, walking, custom locked) — spec'd as data additions
- Pattern audio playback
- "Mutate this favorite" — small random perturbations of a saved pattern
- Syncopation, 16ths
- Custom constraint panel

## Habits worth keeping

- **One feature per session, commit when it works.** Cheap save points; if a session goes sideways, ask Claude to *"revert to the last commit"* — plain English is fine.
- **Have Claude maintain a CLAUDE.md** — after Phase 1, ask it to *"create a CLAUDE.md summarizing this project's architecture and conventions"* so future sessions start with context.
- **Push back in plain English.** "The circles are too small on my phone" is a perfectly good prompt.
- If it goes down a bad path mid-task, hit stop and redirect — don't wait it out.
- The integrated terminal is there if you ever want it, but nothing in this project requires touching it.
