// sw.js — offline app-shell cache for the Travis Picker PWA.
//
// The app is fully static, so the strategy is cache-first: once installed it
// runs with no network at all (airplane mode, dead Wi-Fi — the point of a
// practice tool). In dev, `serve.py` sends no-store so you always get fresh
// code; this SW only ever registers on the real HTTPS origin (see app.js), so
// it never fights that.
//
// ⚠️ THE ONE FOOTGUN: browsers serve these cached files until a NEW service
// worker activates. Bump CACHE on every deploy or users get stale code. The old
// cache is deleted in `activate`. (If a pushed change doesn't show on the phone:
// force-quit the app and reopen so the waiting SW can take over.)
const CACHE = "travis-picker-v9";

// App shell — everything needed to boot offline. Relative paths resolve against
// this script's location, so the whole set is subpath-safe under GitHub Pages
// (…github.io/travis_picker/). Note: tests.js is intentionally absent (dev only).
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "themes.json",
  "css/styles.css",
  "js/app.js",
  "js/data.js",
  "js/generator.js",
  "js/grid.js",
  "js/theme.js",
  "js/storage.js",
  "js/editor.js",
  "js/metronome.js",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
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
