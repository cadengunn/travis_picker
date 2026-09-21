// platform.js — the OS integrations that make an installed PWA behave like a
// native app. Four of them, none of which the app's musical model knows about:
//
//   1. createWakeLock()   — keep the screen on while you're playing guitar.
//   2. createAudioSession() — let the transport sound through iOS's silent switch.
//   3. createAppUpdater() — pick up a new deploy on launch instead of needing a
//      force-quit (or a trip to the site in Safari first).
//   4. createPlaybackGuard() — end playback when the page stops being visible.
//
// Every one is FEATURE-DETECTED and degrades to a silent no-op: these are all
// young or WebKit-only APIs, and a practice tool must never break because a
// browser hasn't got one. Dependencies (`nav`, `doc`) are injected exactly like
// storage.js takes its backing store, so tests drive them with stubs instead of
// the real device.

// ----- 1. Screen wake lock -----
// A screen lock ends practice mid-take, so we hold a lock the WHOLE time the app
// is up (the user's call — not just while the transport runs; you read the grid
// between takes as much as during them).
//
// The lock is dropped by the OS whenever the page stops being visible — screen
// lock, app switch, tab change — and is NOT restored on return, so re-acquiring
// on `visibilitychange` is mandatory, not defensive. Some browsers also refuse
// the first request until the page has transient activation, so we retry on the
// first pointer down too; `acquire()` is a no-op once held, making that cheap.
export function createWakeLock({ nav = navigator, doc = document } = {}) {
  let sentinel = null;
  let wanted = false;

  const supported = () => typeof nav?.wakeLock?.request === "function";

  async function acquire() {
    if (!wanted || sentinel || !supported()) return null;
    if (doc.visibilityState === "hidden") return null; // request would reject
    try {
      sentinel = await nav.wakeLock.request("screen");
      // The OS can release it on its own (low battery); forget it if so.
      sentinel?.addEventListener?.("release", () => { sentinel = null; });
      return sentinel;
    } catch {
      sentinel = null; // denied — no activation yet, battery saver, etc.
      return null;
    }
  }

  async function release() {
    const held = sentinel;
    sentinel = null;
    try { await held?.release?.(); } catch { /* already gone */ }
  }

  // Going hidden, we FORGET the sentinel rather than trusting its `release`
  // event: the OS has dropped the lock either way, and if that event doesn't
  // arrive we'd hold a dead sentinel forever and never re-acquire — the exact
  // failure this feature exists to prevent (screen sleeping mid-practice).
  const onVisible = () => {
    if (doc.visibilityState === "hidden") { sentinel = null; return; }
    acquire();
  };
  const onGesture = () => { acquire(); };

  return {
    get supported() { return supported(); },
    get held() { return !!sentinel; },
    // Start wanting the lock, and keep wanting it for the life of the page.
    start() {
      if (wanted) return Promise.resolve(null);
      wanted = true;
      doc.addEventListener("visibilitychange", onVisible);
      doc.addEventListener("pointerdown", onGesture, { passive: true });
      return acquire();
    },
    stop() {
      wanted = false;
      doc.removeEventListener("visibilitychange", onVisible);
      doc.removeEventListener("pointerdown", onGesture);
      return release();
    },
  };
}

// ----- 2. iOS audio session category -----
// On iOS, Web Audio obeys the ring/silent switch by default, so a silenced phone
// silences the metronome — which is wrong for audio the user explicitly asked
// for. `navigator.audioSession` (WebKit) sets the category; "playback" is the one
// that ignores the switch.
//
// The category is per-DOCUMENT, so we can't hold two at once — and that is the
// whole problem, because the one knob has the two things you might want at
// opposite ends: "playback" ignores the silent switch but does NOT mix (it stops
// another app's audio), while ambient/auto mixes but is silenced by the switch.
// "Clicks on a silenced phone" and "a podcast that keeps playing" are therefore
// mutually exclusive here, and no amount of tuning changes that.
//
// THE POLICY LIVES IN app.js's `syncAudioCategory()`, not here (session 48b, his
// call): we hold "playback" while the transport runs — non-negotiable, you must
// hear the click — and otherwise only while the BUTTONS LAMP is on, since making
// the UI thock audible is the only thing holding it buys outside a take. Turn
// Buttons off and the app leaves other audio alone until you press Play. The
// playback guard hands the category back on hide regardless, which bounds the
// cost to "while you're actually in the app".
//
// History, so it isn't relitigated: v3.22.0 briefly held it for the WHOLE
// foreground session, which cost a podcast on every launch; before that it was
// transport-only, which meant a silenced phone had no button sound at all. A
// momentary per-tap grab was costed and rejected — flipping categories on every
// press would interrupt the other app's audio constantly, which is worse than one
// clean stop.
//
// ⚠️ HIS USUAL CASE IS THE ONE COMBINATION THAT CANNOT WORK, and it is worth
// knowing that before anyone "fixes" this again. The ring switch is the hidden
// variable — under "playback" clicks sound either way and other audio always
// stops; under "ambient" other audio always plays and clicks are silenced only
// when the ringer is OFF. So the single unreachable cell is:
//
//     ringer OFF  +  clicks audible  +  other audio still playing
//
// which is exactly how he uses it (silent phone, wants the thocks, wants his
// podcast until he presses Play). NO ARRANGEMENT OF WEB-SIDE CONTROLS REACHES IT:
// a second toggle splitting "clicks" from "takeover" buys only the ringer-ON
// cell, so it would add a control that does nothing for the actual use case —
// proposed, costed and dropped for that reason (session 48c). Haptics would
// sidestep the audio session entirely, but iOS has no `navigator.vibrate` and the
// `<input switch>` trick is a hack he declined. The only real fix is native
// (.playback WITH .mixWithOthers, which `navigator.audioSession` doesn't expose),
// and per his call that is NOT near-term — so this compromise is the standing
// state, not a stopgap. The lamp is a "which compromise today" switch.
export function createAudioSession({ nav = navigator } = {}) {
  let previous = null; // the category we borrowed from, restored on stop

  const session = () => (nav && nav.audioSession && "type" in nav.audioSession ? nav.audioSession : null);

  return {
    get supported() { return !!session(); },
    // Returns the resulting category (or null when unsupported) so callers and
    // tests can see what happened; nothing in the app depends on it.
    setPlayback(on) {
      const s = session();
      if (!s) return null;
      try {
        if (on) {
          if (previous == null) previous = s.type;
          s.type = "playback";
        } else {
          // RELEASE TO "ambient", NOT back to what we borrowed (session 48c, his
          // phone report: another app's audio stayed stopped after we let go).
          // "ambient" declares mixable-and-silenced-by-the-switch outright, where
          // "auto" only means "browser decides" and may not actually relinquish.
          // ⚠️ MEASURED ON HIS PHONE: this does NOT make the other app resume —
          // you still have to hit play over there by hand. Kept anyway, on the
          // narrower grounds that manual resume works under it and it's the
          // accurate declaration for a released state; do NOT re-try this hoping
          // for auto-resume. The web has no `.notifyOthersOnDeactivation`, which
          // is the actual signal, so nothing here can fix it.
          // Read back and fall back, so an engine that rejects "ambient" can never
          // leave us silently still holding "playback".
          s.type = "ambient";
          if (s.type !== "ambient") s.type = previous ?? "auto";
          previous = null;
        }
        return s.type;
      } catch {
        return null; // read-only / unimplemented setter
      }
    },
  };
}

// ----- 3. Service-worker update flow -----
// THE BUG THIS FIXES: the app is a cache-first PWA, so a launch runs entirely
// from the cache — including `sw.js` itself, which the browser HTTP-caches like
// any other script. An installed home-screen app could therefore launch for days
// without ever noticing a new deploy (visiting the site in Safari was what forced
// the revalidation). Three parts, all needed:
//
//   • `updateViaCache: "none"` — the worker SCRIPT always comes from the network,
//     so a launch can actually see that a new one exists.
//   • an explicit `update()` on load and on every return to foreground — a
//     standalone app is resumed far more often than it is cold-launched.
//   • a reload when the new worker takes control — sw.js already calls
//     skipWaiting + clients.claim, so the caches swap under a page that was
//     already built from the OLD ones; without this you still need the
//     force-quit.
//
// Guards on that reload: never on first install (there was no controller, so
// nothing on screen is stale), and never when `canReload()` says no — reloading
// would throw away hand-drawn edits or interrupt a take. Skipping is safe: the
// new worker is already active, so the next ordinary launch is up to date.
export function createAppUpdater({
  nav = navigator,
  doc = document,
  reload = () => location.reload(),
  canReload = () => true,
} = {}) {
  let registration = null;
  let hadController = false;
  let reloading = false;

  function onControllerChange() {
    if (reloading || !hadController) return;
    if (!canReload()) return;
    reloading = true;
    reload();
  }

  function onVisible() {
    if (doc.visibilityState === "visible") checkForUpdate();
  }

  function checkForUpdate() {
    try {
      const p = registration?.update?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
      return p ?? null;
    } catch {
      return null; // offline, or the registration went away
    }
  }

  return {
    get supported() { return !!nav?.serviceWorker; },
    get registration() { return registration; },
    checkForUpdate,
    async start(scriptUrl = "sw.js") {
      const sw = nav?.serviceWorker;
      if (!sw) return null;
      hadController = !!sw.controller;
      sw.addEventListener("controllerchange", onControllerChange);
      doc.addEventListener("visibilitychange", onVisible);
      try {
        registration = await sw.register(scriptUrl, { updateViaCache: "none" });
        return registration;
      } catch (err) {
        console.error("Service worker registration failed.", err);
        return null;
      }
    },
  };
}

// ----- 4. Stop playback when the page goes away -----
// THE BUG THIS FIXES: lock the phone mid-take and the audio kept going, in
// bursts. Two things conspire. The transport holds the "playback" audio category
// (integration 2), which is exactly what tells iOS to keep our sound alive in the
// background like a music app — while the JS timer driving the lookahead
// scheduler is throttled or frozen. The audio clock keeps running, `nextSlotTime`
// falls behind it, and the next time the timer does fire, every missed slot is
// scheduled at a time already in the past. Web Audio plays those IMMEDIATELY, so
// they all land at once: the disjointed stutter.
//
// A backgrounded practice tool has nothing to play for, so the fix is simply to
// end the take. `visibilitychange` is the only signal the web gives us here, and
// it cannot tell a screen lock from an app switch or a pulled-down notification
// shade — so all of those stop the transport too. That's the right behaviour
// anyway: none of them leave you looking at the grid. `pagehide` covers the
// harder exits (bfcache, termination) that never report a visibility change.
//
// It owns the RETURN trip too (`onShown`, session 32). Backgrounding is exactly
// what leaves iOS's audio session interrupted, and nothing used to repair it on
// the way back — which is why "leave the app and come back" was the user's own
// fix for a dead Play button. Same event, same concern, so it belongs on the
// same listener rather than a second one racing it.
export function createPlaybackGuard({
  doc = document,
  win = window,
  onHidden = () => {},
  onShown = () => {},
} = {}) {
  let started = false;

  const onVisible = () => { (doc.visibilityState === "hidden" ? onHidden : onShown)(); };
  const onPageHide = () => { onHidden(); };

  return {
    get started() { return started; },
    start() {
      if (started) return;
      started = true;
      doc.addEventListener("visibilitychange", onVisible);
      win?.addEventListener?.("pagehide", onPageHide);
    },
    stop() {
      if (!started) return;
      started = false;
      doc.removeEventListener("visibilitychange", onVisible);
      win?.removeEventListener?.("pagehide", onPageHide);
    },
  };
}
