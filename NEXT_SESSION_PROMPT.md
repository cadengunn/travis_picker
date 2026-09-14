Travis Picker — new session. **v3.19.0 is live and pushed, 173/173 green.**
Read `CLAUDE.md` first; it's a hub, so follow its pointers rather than reading
everything.

## He is arriving with ONE OF TWO THINGS — ask which

He said so explicitly at the end of session 46: **either a decision about
monetization, or more notes from testing.** Don't assume. If it's testing notes,
just work them; if it's the decision, `MONETIZATION.md` is the doc.

## The state: the paywall is BUILT and CONFIRMED

Sessions 46b–46g built the whole thing and he signed off each round on his phone:
locked-but-visible with a **lock icon on every locked face** (headers carry
nothing), free = **major / minor / dom7** plus 3 progression families, **3 save
slots** (built-ins exempt), the unlock sheet, the die restricted to what you can
select, and a purchase that lands you on the chord you spun to.

**What is NOT built is how money changes hands.** That is the open decision, and
nothing else is blocked on it.

## If it's the monetization decision

`MONETIZATION.md` has five routes with real numbers. **Do not re-derive them.**
The two facts that matter more than the fee percentages:

- **Only "free + donations" and "free, no money" throw the paywall away.** If
  either wins, **rip the gating out** — don't leave it dormant. Fifteen tests and
  an entitlement layer maintained for a feature earning nothing is exactly the rot
  this repo warns about, and git has it if he reverses.
- **Only the App Store is hard to reverse.** The other four are hours apart.

**His constraint: payment must be instant and automatic.** Hand-issued keys are
out. He was leaning PWA + license keys, with the App Store still tempting him on
ease of installation — the counter already put to him is that **install friction
is fixable in a PWA (item 11) but App Store search isn't**, and that the store is
a bet placed before the evidence.

**The one design trap, already documented in §1.1:** the paste is the PRIMARY path
on iOS, not a fallback. A redirect-back-with-the-key-in-the-URL cannot work,
because a link tapped from a standalone PWA opens Safari and **iOS gives the
installed app its own storage partition** — measured in session 46i.

## Dev-box limits — these cost most of session 46, so read them

- ⚠️ **THE DEV BOX IS CHROMIUM; HIS PHONE IS WEBKIT, AND THEY DISAGREE.** Three
  CSS fixes for the tweed's bottom edge each measured fine here and each failed
  there. **If a rendering bug only reproduces on his phone, instrument it and ask
  his device — do not reason about it from here.** Two marker builds answered in
  minutes what four rounds of theorising hadn't.
- ⚠️ **No safe-area insets here** (measured: top 0, bottom 0), and
  `vh == dvh == svh == lvh`. Anything involving viewport units or insets is
  invisible on this machine.
- ⚠️ **The dev box is always `display-mode: browser`**, so a plain 375×553 budget
  measurement reads the TAB branch (clearance 19.53). The documented standalone
  budget is **55.09 / 384.84 / 11.06** and you must neutralise the
  `@media (display-mode: browser)` block to measure it.
- `tests.html` stalls in a hidden tab — poll it with a bounded `await` loop rather
  than nudging with screenshots; a screenshot mid-run closes `.dd-panel` and fails
  the wheel checks.
- The preview server can't read `~/Desktop`, so it serves an rsync mirror wired up
  in `.claude/launch.json` (untracked). **Re-sync after every edit.**

## Ground rules

- **Agree the design before coding**, surface genuine forks, don't guess. Several
  of session 46's best calls were his corrections to a proposal.
- **Measure, don't theorise.** The single biggest lesson of session 46: every one
  of my wrong answers was a plausible theory I hadn't checked, and two "findings"
  were bad experiments read as evidence.
- **A new test must be verified to FAIL without its fix.** Several this session
  were; two that weren't turned out to be pinning a spelling rather than a claim,
  and a third had a regex that could never match.
- **When a change contradicts a documented decision, say so and keep the old
  rationale.** The lock-placement rule was overturned twice and its test now
  carries that history on purpose.
- **Tests stay green**; run `tests.html` and say the count. It's **173/173**.
- **Deploy = bump `CACHE` in `sw.js` + `APP_VERSION` in `js/app.js`, push.**
  GitHub noreply identity only; the repo is public.
- **Don't push without asking** — he'll say when.

## Loose ends, none blocking

- **Item 11, "Add to Home Screen" hint** — now more relevant than it was, since
  install friction is the App Store's best remaining argument and this is the
  cheap counter to it. In `OPEN_ITEMS.md`, folded under item 18.
- **The full-bleed app icon** (old item 5) — only matters if the store wins.
- **The 44px flat band** is unavoidable in a PWA; it sits at the status bar now,
  which is where every iOS app has one. `theme-color` keeps it matching. If it
  ever reads as a seam, the lift is one number in `theme.js`.
