// platform.js — the OS integrations that make an installed PWA behave like a
// native app. Three of them, none of which the app's musical model knows about:
//
//   1. createWakeLock()   — keep the screen on while you're playing guitar.
//   2. createAudioSession() — let the transport sound through iOS's silent switch.
//   3. createAppUpdater() — pick up a new deploy on launch instead of needing a
//      force-quit (or a trip to the site in Safari first).
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
// The category is per-DOCUMENT, so we can't hold two at once — and that decides
// the policy. iOS convention splits on who asked for the sound: requested media
// (music, video, a metronome) ignores the switch; incidental UI feedback
// (keyboard clicks, tap sounds) respects it. So we take "playback" only while the
// TRANSPORT is running and hand it back on stop. Silenced phone, not playing =>
// a completely quiet app, button thocks included. Press play => you get music,
// and the thocks ride along for the duration, exactly as they would in a native
// app holding a playback session.
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
          s.type = previous ?? "auto";
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
