# App Store — shipping checklist & decisions

**This is the working doc for item 18.** It is a planning/decision doc, not a
code task — the first real step, per the note in `OPEN_ITEMS.md`. It captures
what has to be decided, what has to be built, and the order to do it in. Nothing
here is committed to yet; the **Decisions** section is a set of open forks with
recommendations, waiting on his call.

Folded into item 18 (session 44): the full-bleed app icon (item 5) and the
"Add to Home Screen" hint (item 11).

---

## 0. Decisions — **ALL FOUR SETTLED (session 46)**

### 0.1 — The paywall line — **DECIDED: gate by GROUP, both drums**

Model: **free demo, one-time unlock, no subscription, no ads** (Non-Consumable
IAP). His model, unchanged.

**His call, and it improved the first proposal:** progression mode must be
**demoable**, not locked. The first cut gated progression mode entirely; he
asked instead for basic chords and progressions free, the advanced ones and
custom progressions paid.

**The mechanism — LOCKED BUT VISIBLE, extending the existing `data-locked`
idiom** (his call: *"All the paid options should still be visible, just greyed
out and a little pop up to unlock if you try to select them. Pretty typical for
an app like this."*).

**This is already an idiom in the app, and he specified it himself in session
36** for ×2 in single mode. `.segmented[data-locked]` is `opacity: 0.55`; the
stylesheet comment says it is *"still a live target you're meant to be able to
hit"*; the press keeps its press-in/pop-out travel; `switchX2` simply refuses the
commit; and `seatedLatch()` is **generic on `[data-locked]`**, not named after
×2. So the paywall needs **no new material language** — it extends `data-locked`,
swapping the silent no-op for an unlock sheet.

**Correction to the first cut of this doc:** an earlier draft proposed a *data
filter* on `QUALITIES`/`PROGRESSIONS` (free build ships fewer sections, reels get
shorter) on the grounds that locked cells would violate CLAUDE.md's *"a cell you
can spin to that isn't a chord would be a lie, and a test pins it."* **That
reading was wrong** — the invariant is about **holes in the matrix** (data
completeness), and a locked cell is still a real chord. His approach is therefore
*less* invasive:
- **No data filter.** `QUALITIES` and `PROGRESSIONS` stay whole in both tiers.
- **The matrix-density test needs NO change** (an earlier item, now retired).
- **Discovery is solved outright** — the shorter-reel design showed the free user
  nothing about what they'd gain, which was the one real objection to it.

**Not `QUALITIES[].weight`.** A first instinct was to reuse the die's commonness
weights to pick the free tier; the comment above that table forbids it —
*"`weight` is HOW OFTEN THE DIE HANDS YOU ONE… It is not a ranking and nothing
else reads it."* The tier split below is by `group`/`style` instead, which is
already a printed section header on each barrel.

#### The locked signal is a LOCK ICON, not greying (his call)

**Because greying already means something else.** `data-locked`'s `opacity: 0.55`
currently means *"not applicable right now"* (×2 in single mode). If the paywall
also greyed, the two states would be indistinguishable — "buy this" vs "doesn't
apply here." So:

- **grey (no lock) = not applicable in this mode** — existing behaviour, silent
  press, unchanged.
- **lock icon = purchasable** — press opens the unlock sheet.

**Precedence: mode beats tier.** In single mode ×2 is *not applicable* → grey, no
lock, silent. In progression mode on the free tier → lock, opens the sheet.
Unlocking wouldn't help in single mode, so the mode signal wins. Write a test for
this; it's exactly the kind of overlap that ships as a bug.

**On the barrels the lock rides the SECTION HEADER, not each face.** Reel faces
are text sized by `fitFace()`, which already shrinks to a 10.5px floor and
ellipsizes below it — and session 45b was specifically about the progression reel
starving for width (the key drum went 72→48px to feed it 148px). A lock glyph on
every locked *face* would eat width from labels that already ellipsize. Putting
one lock on each locked family's engraved header instead costs **zero** face
width, makes fewer and clearer marks, and matches how this app says a barrel reads:
*"an engraved caption names everything below it until the next one — there is no
'outside a section', only 'in the last one'."* **The tier boundary IS the section
boundary**, so the lock belongs on the section.

- Open: whether faces inside a locked section also take a *light* dim (lighter
  than 0.55, so long labels stay readable) or stay full-opacity with the header
  carrying the whole signal. Feel call, on the phone.
- Elsewhere (×2's segmented keys, Save/Load pills, the custom-progression save
  key, list-menu options) a small lock on the control itself is straightforward —
  those aren't width-starved.

#### Chords — free gets Triads + Sevenths (60 of 120)

| group | qualities | tier |
|---|---|---|
| Triads | major, minor | **free** |
| Sevenths | 7, maj7, m7 | **free** |
| Sixths | 6, m6 | paid |
| Suspended | sus2, sus4 | paid |
| Added | add9 | paid |

**Sevenths must be free:** Travis picking, ragtime and Piedmont blues are *built*
on dominant 7ths. Locking them would musically cripple the demo. Lands as a clean
60/60 split — 5 qualities × 12 roots each side.

#### Progressions — free gets 3 of 9 families (6 of 18)

18 progressions, 9 style families, exactly 2 per family (6 major, 3 minor).

- **Free:** Foundations (I–V, I–IV–I–V) · Folk & Roots (I–IV–V–I, I–vi–IV–V) ·
  **Minor Descends** (i–VII–VI–V, i–VII–VI–V7)
- **Paid:** Classic Country · Ragtime / Piedmont · Modern Pop/Acoustic ·
  Classic Standards · Minor Blues · Modern Minor

**A minor family MUST be free.** `KEYS[].mode` decides which progressions are
offered, so if every minor family were paid, a free user in any minor key would
face a drum where **nothing is selectable** — minor mode would be a dead mode,
which is worse than a gated one. (Under locked-but-visible the drum is never
literally *empty*, as an earlier draft of this doc said — but unusable is just as
bad.) Minor Descends chosen as the most recognizable; Minor Blues is the equally
fine alternative — low stakes, his pick.

**The style names are the sales pitch:** "adds Ragtime / Piedmont and Classic
Country" sells far better than "adds 12 progressions."

#### Also paid — **all decided**
- **Custom saved progressions** — a clean seam, it's one save key.
- **×2 mode** (his call) — a clean toggle seam, and it already has the
  `data-locked` machinery.
- **The saved library beyond 3 slots** — his call: *"I'm ok with a limited number
  of save slots under free. 3 sounds right."* So saving works in the free tier and
  stops at 3, which is a far better demo than no saving at all. Folders,
  export/import and Restore stay paid.
  - Open: what the 4th save attempt does — almost certainly the unlock sheet, with
    a "3 of 3 slots used" line. Also whether built-ins count against the 3 (they
    should **not**; see section 4).

#### Free regardless
Full generation (all thumb presets, all Fingers tiers, swing), single-chord mode,
chord diagrams, metronome + playback + both tones + count-in, tap-to-edit, capo,
note labels, themes, help, and 3 save slots.

#### One rule that falls out

**The gate is on what you can SELECT, not on what can EXIST.** A pattern arriving
as data (a built-in, an import) that references a paid-tier chord still *resolves
and sounds correctly* — it's simply not reachable from the wheel. Graceful, and it
keeps the resolver and the synth free of entitlement logic entirely.

### 0.2 — Fate of the live GitHub Pages PWA — **DECIDED**

**The PWA comes down entirely once the App Store app is live.** There is no
existing user base to speak of. No need for a reduced-tier web demo — the App
Store free tier *is* the demo.

Consequence: **marketing becomes load-bearing** (see section 8). The Pages URL
is currently the only discovery path, and it's going away.

### 0.3 — Identity — **DECIDED: individual enrollment, his own identity**

Individual enrollment under his own legal identity, for simplicity. His legal
name will be the App Store seller name.

**This knowingly reverses the GitHub-noreply privacy rule in `CLAUDE.md`** for
the store listing only. The rule still stands for the repo and its git history —
if the repo stays public, keep the noreply identity in commits.

### 0.4 — Price — **DECIDED: $7.99 one-time, all features forever**

Endorsed. It sits above impulse ($2.99) and below deliberation ($14.99) for a
focused single-purpose tool, and "no subscription, yours forever" is a real
differentiator in a subscription-saturated category.

- [ ] **Apply for the Small Business Program** — drops Apple's cut from 30% to
      **15%** for developers under $1M/yr. He qualifies; it's an application, not
      automatic. At 15% he nets ~$6.79/sale, so **~15 sales/year covers the $99
      fee**.
- Pricing is easy to *lower* later (sales, promos) and awkward to *raise*, so
  $7.99 leaves room rather than boxing him in.

---

## 1. Accounts & prerequisites

- [ ] Apple Developer Program enrollment — **$99/year** (recurring). Individual
      vs Organization per decision 0.3.
- [ ] A Mac with a current Xcode (needed for any wrapper + submission).
- [ ] App Store Connect access (comes with enrollment).
- [ ] Bundle identifier reserved (e.g. `com.<identity>.travispicker`).

## 2. The native wrapper

Apple won't accept a URL — it needs a native binary. **First departure from the
project's "no build step" ethos.**

**DECIDED (session 46): a hand-rolled WKWebView shell.** He deferred to the
recommendation.

- A small Swift app that displays the bundled web files full-screen with no
  browser chrome, plus one StoreKit bridge. Web code ships unchanged and works
  offline by definition (the files are already on the device).
- **Why, over Capacitor:** the shell we need is unusually simple — no camera,
  GPS, notifications or background sync, just "display the app" and "sell one
  unlock" — which is the case where rolling your own is least risky. And this
  project's whole character is no dependencies and no build step; Capacitor ends
  that permanently by bringing Node, npm packages and a build step into a repo
  that currently has none.
- **The honest counter-argument, recorded so it isn't lost:** Capacitor is the
  trodden path — when an iOS update breaks something, thousands of people hit the
  same wall and there are answers online. A hand-rolled shell means depending on
  someone who reads Swift. Against that: a neglected build toolchain breaking is
  at least as likely as 200 lines of Swift breaking, and there is far less of it
  to go wrong. **Revisit if the shell ever needs real native capability.**
- **iPad: shipping iPhone-only for now** (his call, session 46) — iPads run it
  scaled. A real iPad pass is separate and later. Note this decision also sets
  which screenshot sets the listing needs (section 5).
- [ ] Bundle all web assets INTO the app (not loaded from Pages) — offline + no
      dependency on the public site.
- [ ] Confirm web APIs the app relies on work inside WKWebView:
  - [ ] Web Audio (AudioContext, offline render) — pattern playback + metronome.
  - [ ] Wake Lock — WKWebView support is uneven; may need a native equivalent.
  - [ ] Audio session / silent-switch override — verify the iOS
        `navigator.audioSession` behaviour inside a wrapper.
  - [ ] localStorage persistence + iOS eviction behaviour in a wrapper.
- [ ] Service worker: verify it either no-ops cleanly or is removed in the
      wrapper build (`app.js` already skips SW off the HTTPS origin — check this
      Just Works when served from the bundle's scheme).
- [ ] Safe areas / notch / status bar handling in native standalone.
- [ ] Portrait lock (matches the manifest).

## 3. StoreKit / the unlock

- [ ] Configure the Non-Consumable IAP product in App Store Connect.
- [ ] StoreKit integration in the wrapper (StoreKit 2 preferred — on-device
      receipt validation, **no server needed**, keeps it serverless).
- [ ] **Restore Purchases path — Apple REQUIRES one for non-consumables.**
- [ ] Local persistence of unlock state + entitlement check the web app can read
      (bridge from native → JS).
- [ ] Sandbox test pass (test Apple ID, purchase + restore).

## 4. Feature-gating implementation (per decision 0.1)

**Locked but visible, with a lock icon.** No data filtering — `QUALITIES` and
`PROGRESSIONS` stay whole in both tiers; entitlement decides only what *commits*.
See 0.1.

- [ ] **Entitlement flag** — how the web app learns it's unlocked: native bridge
      sets a flag the app reads at boot, and on purchase/restore **without a
      relaunch**.
- [ ] **Extend `data-locked`** rather than inventing a treatment. It's already
      generic on `[data-locked]` (`seatedLatch`), already greys at 0.55, and
      already keeps press travel. The paywall adds: a lock icon, and an unlock
      sheet in place of the silent no-op.
- [ ] **Precedence test: mode beats tier** — ×2 in single mode is grey/silent/no
      lock even on the free tier.
- [ ] **Barrel settle behaviour — DECIDE BY PLAYING** (see 0.1): locked cells spin
      freely, settling on one opens the unlock sheet, dismissing animates the reel
      back to the previous detent. The return animation is the feel risk; build the
      cheap version and judge it on the phone.
  - The reel must not commit a locked value to the hidden `<select>` — it is the
    source of truth, and the wheel's whole contract is that the reel reflects it.
- [ ] Lock icons on the **section headers** of locked families (both barrels), not
      on each face — width (see 0.1).
- [ ] Gate `#save-progression`, `#x2-toggle`, and the library's folder /
      export-import / Restore actions.
- [ ] **3 free save slots**: 4th save attempt opens the unlock sheet with a
      "3 of 3 used" line. **Built-ins must NOT count against the 3** — they're
      seeded into the real library by `seedNewBuiltins()`, so a free user would
      start at 5 of 3 and be unable to save anything. Decide: seed fewer built-ins
      in the free tier, or exempt `builtinId`-tagged items from the count
      *(exempting is cleaner and keeps Restore honest)*.
- [ ] **Design the unlock sheet.** Name the locked families explicitly
      (Ragtime/Piedmont, Classic Country, Sixths, Suspended, Added…), not "premium
      features."
- [ ] Verify the **select-vs-exist rule**: a built-in or imported pattern using a
      paid-tier chord still resolves and sounds right in the free tier.
- [ ] Re-measure at **375×553** if any main-view chrome changes (55.09 / 384.84 /
      11.06, `main` overflow 0). A lock icon on a header or an in-sheet control
      shouldn't touch it, but measure rather than assume.

**Retired from an earlier draft:** parameterizing the matrix-density test. Not
needed — the arrays are never filtered, so the matrix stays dense in both tiers.

## 5. Assets & store metadata

- [ ] 1024×1024 App Store icon — **the full-bleed art (item 5) lands here;
      needs new art, not a recolour.**
- [ ] Screenshots for the current required iPhone sizes (Apple consolidates
      these over time — **verify the exact required set in App Store Connect at
      submission**).
- [ ] App name + subtitle + description + keywords + promotional text.
- [ ] Support URL, marketing URL (optional), **privacy policy URL (required even
      though nothing is collected)**.
- [ ] Category: Music. Age rating questionnaire.

## 6. App Review gotchas

- [ ] **Rule 4.2 (minimum functionality)** — the main thin-web-wrapper rejection.
      Mitigations: full offline (already true, SW-tested), a genuinely useful
      free tier, native StoreKit. State the offline story in review notes.
- [ ] App Privacy questionnaire — clean answer: **collects nothing** (all
      localStorage). Good selling point.
- [ ] Export compliance — HTTPS/standard crypto is normally the exempt answer;
      must still answer.
- [ ] Reviewer must be able to reach the paid features — StoreKit sandbox
      handles this; add review notes if needed.
- [ ] "Add to Home Screen" hint (item 11) — relevant to the PWA side and to
      eviction protection; decide if it survives / where it lives.

## 7. Rough sequence

1. ~~Settle decisions 0.1–0.4.~~ **Done, session 46.**
2. Enroll in the Developer Program — individual (0.3). Apply for the Small
   Business Program at the same time (0.4).
3. Pick + stand up the wrapper (section 2), get the app running natively offline.
4. Feature-gating + unlock sheet (section 4).
5. StoreKit + restore (section 3), sandbox test.
6. Full-bleed icon + screenshots + metadata (section 5).
7. Submit; handle review (section 6).
8. Launch + marketing (section 8) — **and only then take the PWA down** (0.2).

---

## 8. Marketing — **his note: "will need to be a thing once it's up"**

Not scoped yet; parked here so it isn't forgotten. It matters more than usual
because **decision 0.2 removes the only current discovery path** — when the PWA
comes down, the App Store listing is the whole funnel.

Worth noting up front:
- **App Store SEO is the cheapest lever** — name, subtitle and keywords carry
  most of the discovery weight for a niche tool. "Travis picking" is a
  low-competition, high-intent search term.
- **The audience is findable and specific:** fingerstyle/Travis-picking learners.
  r/guitarlessons, r/fingerstyle, acoustic forums, YouTube fingerstyle teachers.
- **The demo tier is the marketing** — free download, no account, works offline.
- A short screen-recording of the grid playing a pattern is the single most
  convincing asset; the app is much easier to *show* than to describe.
- Keep the PWA takedown until after launch so there's never a window with no
  working link anywhere.
