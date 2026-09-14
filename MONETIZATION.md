# Monetization & distribution — the working doc

**Renamed from `APP_STORE.md` in session 46j.** The App Store stopped being the
assumed destination once the economics were worked through, so the file is now
about the decision rather than one branch of it.

**STATUS: the paywall is BUILT and shipping** (locks, tiers, save cap, unlock
sheet, purchase path — all live and confirmed on his phone). **What is NOT
decided is how money changes hands.** Everything below section 1 is that
decision; section 0 is settled design that survives whichever way it goes.

---

## 0. Decisions — SETTLED, and independent of how it's sold

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

### 0.2 — Fate of the live GitHub Pages PWA — **REOPENED**

The old answer was "it comes down once the App Store build is live." That was
conditional on shipping to the App Store, which is now in question — under every
option except the App Store the PWA **is** the product and stays up.

### 0.3 — Identity — **only binds if the App Store is chosen**

An App Store listing requires a real legal identity (individual enrollment, his
own name as seller). **None of the web options require it**, so the standing
GitHub-noreply privacy rule stays intact unless the store is chosen.

### 0.4 — Price — **$7.99 one-time, all features forever**

Unchanged, and it holds across every option below.

---

## 1. THE OPEN DECISION — how money changes hands

**His constraint, stated:** it must be **instant and automatic**. Hand-issuing
keys by email is ruled out — a buyer who pays on a Saturday must not wait.

**His read on the economics:** this is a niche tool, not a big earner, so a 15–30%
cut plus $99/yr plus possibly a computer doesn't pay for itself. That framing is
what reopened the whole question, and the numbers below support it.

| option | net per $7.99 | fixed costs | enforced? | needs a Mac? |
|---|---|---|---|---|
| **App Store IAP** | $5.59 (30%) / $6.79 (15%) | $99/yr + a Mac | yes | **yes** |
| **PWA + license key** (Lemon Squeezy / Paddle / Gumroad) | ~$7.09–7.19 | none | yes | no |
| **PWA + honor unlock** (Ko-fi / Stripe link) | ~$7.70 per payer | none | **no** | no |
| **Free + donate link** | ~$7.70, far fewer donors | none | n/a | no |
| **Free, no monetization** | — | none | n/a | no |

⚠️ **Rates drift — confirm before committing.** The ordering is what matters.

**Two facts that should weigh more than the fee percentages:**
- **Only the bottom two throw away the paywall.** The top three keep every line
  of the gating work; the only difference between them is what the unlock sheet's
  button does. If either of the bottom two is chosen, **rip the gating out** —
  don't leave it dormant. Fifteen tests and a whole entitlement layer maintained
  for a feature earning nothing is exactly the rot this repo warns about, and git
  has it if the decision reverses.
- **Only the App Store is hard to reverse.** The other four are hours apart from
  each other, so starting with the honor system and moving to license keys later
  (or the reverse) costs almost nothing.

### 1.1 — How the license-key route actually works

1. **Unlock** opens the service's hosted checkout (nothing to build).
2. Buyer enters **email + card**.
3. Payment clears → a **unique key is generated instantly**, shown on the success
   page *and* emailed.
4. Buyer pastes it into the app and taps Activate.
5. **One `fetch`** to the service's verify endpoint → valid → store the flag.

**Verified ONCE, not per launch.** Offline use is untouched afterwards, and if the
service ever vanished, existing users stay unlocked. Services also offer
**activation limits** (e.g. 3 devices, with deactivation), which handles casual
sharing without being hostile.

⚠️ **THE PASTE IS THE PRIMARY PATH ON iOS, NOT A FALLBACK — and this is a
consequence of something measured in session 46i.** The obvious design is to
redirect from the success page back into the app with the key in the URL, so it
self-activates. **That cannot work for the installed app**: tapping a link from a
standalone PWA opens **Safari**, so both checkout and the redirect land there —
and **iOS gives a standalone PWA its own storage partition**, separate from
Safari on the same origin (proved when a sticky `?debug=1` flag set in Safari was
invisible to the installed app). The unlock would land in the wrong place.
So: buy in Safari, return to the installed app, paste once. The email is what
makes a second device, or recovery after a storage eviction, work.

**Merchant of record matters as much as the fee.** Paddle / Lemon Squeezy /
Gumroad become the legal seller, so VAT on digital goods to EU/UK consumers is
their liability. **Stripe alone does not do this** — with raw Stripe he is the
seller of record. Worth checking against his own situation, but it is the main
reason these services exist.

### 1.2 — The alternative that owns the whole stack

Cryptographically signed keys, verified **offline** in the browser via Web Crypto
(app holds the public key, he holds the private one). No service, no network, no
outage risk, works forever. **Ruled out for now only because automating issuance
needs something listening for the payment — i.e. a small server** — and hand
issuing is ruled out. Revisit if a tiny worker ever becomes acceptable; the
verification half is genuinely elegant and fits this codebase's character.

---

## 2. If the App Store is chosen after all

Kept because the analysis was done and is still correct; **do not read it as the
plan.**

- **A Mac is required and the current one cannot do it.** Measured: the dev box is
  a `MacBookPro11,4` (mid-2015 15"), macOS 12.7 Monterey, no Xcode. Monterey is
  the last macOS that model supports and caps around Xcode 14.2, below Apple's
  floor for new submissions. It cannot be upgraded to a submittable toolchain.
  Options were a newer Mac, a rented cloud Mac, or CI-only builds; he raised
  borrowing one, with the caveat that **Mac access is RECURRING** — every bug fix
  and most review rejections need a rebuild and resubmit.
- **Wrapper: a hand-rolled WKWebView shell** (decided session 46), on the grounds
  that the shell is trivial and Capacitor would end this project's
  no-dependency/no-build-step character. **If he ever ends up on a rented or
  CI-only Mac where he cannot run the app himself, Capacitor becomes the safer
  choice** — that is the one condition that reopens it.
- **StoreKit 2**, non-consumable, on-device validation, no server. **Restore
  Purchases is required by Apple.** Xcode's local StoreKit Configuration File can
  test purchase and restore with no App Store Connect product.
- **Rule 4.2 (minimum functionality)** is the real rejection risk for a web
  wrapper. Mitigations: genuinely offline (true, and tested), a useful free tier,
  native StoreKit. State the offline story in the review notes.
- **App Privacy questionnaire is a clean answer** — collects nothing, all
  localStorage.
- **iPhone-only first**; iPads run it scaled.
- **A native wrapper would also fix the 44px flat band** at the status bar — in a
  real WKWebView you control the view's frame and it paints edge to edge. That is
  a genuine, if small, point in its favour (session 46i).

---

## 4. Feature-gating implementation (per decision 0.1)

**Locked but visible, with a lock icon.** No data filtering — `QUALITIES` and
`PROGRESSIONS` stay whole in both tiers; entitlement decides only what *commits*.
See 0.1.

- [x] **Entitlement flag** (stub — `?tier=free`/`?tier=paid`) — how the web app learns it's unlocked: native bridge
      sets a flag the app reads at boot, and on purchase/restore **without a
      relaunch**.
- [x] **Extend `data-locked`** rather than inventing a treatment. It's already
      generic on `[data-locked]` (`seatedLatch`), already greys at 0.55, and
      already keeps press travel. The paywall adds: a lock icon, and an unlock
      sheet in place of the silent no-op.
- [x] **Precedence test: mode beats tier** — ×2 in single mode is grey/silent/no
      lock even on the free tier.
- [x] **Barrel settle behaviour — BUILT, feel unjudged.** Locked families spin
      freely; settling on one is REFUSED (`onSettle` returns false), the unlock
      sheet opens, and the barrel turns back to the last accepted value. The
      refusal is verified — the hidden `<select>` never takes a locked value — but
      **the turn-back animation is unverifiable here** (`scrollTo({behavior:
      "smooth"})` needs rAF, which is paused in a hidden preview tab). His phone
      is the only place that question can be answered.
  - The reel must not commit a locked value to the hidden `<select>` — it is the
    source of truth, and the wheel's whole contract is that the reel reflects it.
- [x] Lock icons on the **section headers** of locked families (both barrels), not
      on each face — width (see 0.1).
- [x] Gate `#save-progression`, `#x2-toggle`, and the library's folder /
      export-import / Restore actions.
- [x] **3 free save slots** (built-ins exempt, overwrite allowed at the cap): 4th save attempt opens the unlock sheet with a
      "3 of 3 used" line. **Built-ins must NOT count against the 3** — they're
      seeded into the real library by `seedNewBuiltins()`, so a free user would
      start at 5 of 3 and be unable to save anything. Decide: seed fewer built-ins
      in the free tier, or exempt `builtinId`-tagged items from the count
      *(exempting is cleaner and keeps Restore honest)*.
- [x] **Design the unlock sheet.** Name the locked families explicitly
      (Ragtime/Piedmont, Classic Country, Sixths, Suspended, Added…), not "premium
      features."
- [x] Verify the **select-vs-exist rule**: a built-in or imported pattern using a
      paid-tier chord still resolves and sounds right in the free tier.
- [ ] Re-measure at **375×553** if any main-view chrome changes (55.09 / 384.84 /
      11.06, `main` overflow 0). A lock icon on a header or an in-sheet control
      shouldn't touch it, but measure rather than assume.

- [x] **The die may only roll what you can select.** `randomChord` already took a
      `pool`; `randomKeyProgression` gained an `allow` predicate. A roll you have
      to undo is worse than no roll. Tests cover both the honouring AND the
      wiring — the first pair passed while app.js supplied no pool at all.

**Retired from an earlier draft:** parameterizing the matrix-density test. Not
needed — the arrays are never filtered, so the matrix stays dense in both tiers.


---

## 5. Assets & store metadata — **only if the App Store is chosen**

- [ ] 1024×1024 App Store icon — the full-bleed art (old item 5); needs new art.
- [ ] Screenshots for the current required iPhone sizes (verify at submission).
- [ ] Name, subtitle, description, keywords; support + privacy policy URLs.
- [ ] Category: Music. Age rating questionnaire.

**Under every web option these are unnecessary** — no listing, no screenshots, no
review. That is a real part of the cost difference and easy to overlook when only
comparing percentages.

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

**Under the web options the marketing problem gets HARDER, not easier**, and it is
the strongest argument the App Store has: store search for "travis picking" is
low-competition and high-intent, and there is no web equivalent. Against that, the
audience is specific and directly reachable — r/fingerstyle, r/guitarlessons,
acoustic forums, YouTube fingerstyle teachers.
