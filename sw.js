// sw.js — offline app-shell cache for the Travis Picker PWA.
//
// The app is fully static, so the strategy is cache-first: once installed it
// runs with no network at all (airplane mode, dead Wi-Fi — the point of a
// practice tool). In dev, `serve.py` sends no-store so you always get fresh
// code; this SW only ever registers on the real HTTPS origin (see app.js), so
// it never fights that.
//
// ⚠️ THE DEPLOY FOOTGUN: browsers serve these cached files until a NEW service
// worker activates. Bump CACHE on every deploy or users get stale code. The old
// cache is deleted in `activate`. (If a pushed change doesn't show on the phone:
// force-quit the app and reopen so the waiting SW can take over.)
const CACHE = "travis-picker-v70";

// App shell — everything needed to boot offline. Relative paths resolve against
// this script's location, so the whole set is subpath-safe under GitHub Pages
// (…github.io/travis_picker/). Note: tests.js is intentionally absent (dev only).
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "themes.json",
  "css/styles.css",
  "fonts/fraunces-latin.woff2",
  "fonts/jost-latin.woff2",
  "js/app.js",
  "js/data.js",
  "js/generator.js",
  "js/grid.js",
  "js/theme.js",
  "js/storage.js",
  "js/editor.js",
  "js/metronome.js",
  "js/synth.js",
  "js/ui-sound.js",
  "js/modal.js",
  "js/dropdown.js",
  "js/wheel.js",
  "js/platform.js",
  "js/help.js",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/favicon-32.png",
];

// ⚠️ THE SECOND FOOTGUN, and the one that actually bit (session 17): the
// precache MUST bypass the HTTP cache. `cache.addAll` fetches through it, and
// GitHub Pages serves app files `max-age=600` — so a worker installing within
// ten minutes of the PREVIOUS deploy fills the NEW cache with the OLD bytes.
// That state is permanent and silent: the cache is only ever written here, so
// there is nothing left to install, the app runs stale code under an up-to-date
// worker, and force-quitting can't shake it loose. `cache: "reload"` forces
// every precache request to the network. (`updateViaCache: "none"` in app.js
// only exempts sw.js itself — it does nothing for the files sw.js fetches.)
async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(PRECACHE.map(async (path) => {
    const res = await fetch(new Request(path, { cache: "reload" }));
    // A partial precache is worse than none: fail the install and let the old
    // worker keep serving, rather than shipping a half-updated app shell.
    if (!res.ok) throw new Error(`precache failed for ${path} (${res.status})`);
    await cache.put(path, res);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only same-origin GETs are ours; everything else goes straight to network.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          // Cache successful basic responses so first-visit assets survive later
          // offline sessions too (covers anything not in the precache list).
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline and uncached: for a page navigation, fall back to the shell.
          if (req.mode === "navigate") return caches.match("index.html");
          return Response.error();
        });
    })
  );
});
