// entitlement.js — what this copy of the app is allowed to reach.
//
// A STUB, deliberately. The real answer will come from the native StoreKit
// bridge (`APP_STORE.md` section 3), which does not exist yet and is blocked on
// a build machine. Until then the tier is read from an injected store, so the
// ENTIRE paywall can be built, tested and judged on a real phone before a line
// of Swift is written — which is exactly why the gating work was moved ahead of
// the wrapper in the sequence.
//
// Pure: no DOM, no browser API of its own. The store is injected the same way
// `storage.js` takes one, so tests never touch the real thing.
//
// ⚠️ THE TIER SPLIT IS THE ENGRAVED GROUP, NOT A LIST OF IDS. Both drums already
// print section headers off these very fields (`QUALITIES[].group`,
// `PROGRESSIONS[].style`), so the tier boundary IS the section boundary the user
// already sees — which is what lets one lock ride a header instead of a mark on
// every face. It also means a chord or progression added later inherits its
// family's tier for free, with no list here to keep in sync.

export const FREE_QUALITY_GROUPS = ["Triads", "Sevenths"];
export const FREE_PROGRESSION_STYLES = ["Foundations", "Folk & Roots", "Minor Descends"];

// Saving works in the free tier and stops at 3 (his call) — a far better demo
// than no saving at all. BUILT-INS ARE EXEMPT: `seedNewBuiltins()` puts five real
// items in the library at boot, so counting them would start a free user at 5 of
// 3, unable to save anything. Exempting by `builtinId` also keeps Restore honest.
export const FREE_SAVE_SLOTS = 3;

// Whole features behind the unlock, keyed by the name the UI passes. Kept here
// rather than scattered through app.js so the paid surface can be read in one
// place — and so the unlock sheet can name them.
export const PAID_FEATURES = ["x2", "customProgressions", "folders", "exportImport", "restore"];

export const STORE_KEY = "tp-tier";

// What the unlock sheet says you get. Names the FAMILIES, not "premium
// features" — "adds Ragtime / Piedmont and Classic Country" is a real pitch and
// a greyed control is not. Order is roughly by how much a player would want it.
export const UNLOCK_BENEFITS = [
  "All 120 chords — 6, m6, sus2, sus4 and add9 on every root",
  "All 18 progressions — Ragtime / Piedmont, Classic Country, Classic Standards, Modern Pop, Minor Blues, Modern Minor",
  "Save your own progressions in any key",
  "×2 mode — let each chord ring for two bars",
  "An unlimited pattern library, with folders",
  "Export and import your whole library",
];

const isFn = (f) => typeof f === "function";

// A localStorage-shaped store that degrades to nothing, same posture as
// storage.js: a refused read/write must never throw into a caller.
function safeStore(store) {
  return {
    get() {
      try { return store && isFn(store.getItem) ? store.getItem(STORE_KEY) : null; }
      catch { return null; }
    },
    set(v) {
      try { if (store && isFn(store.setItem)) store.setItem(STORE_KEY, v); }
      catch { /* quota / private mode — the session value still stands */ }
    },
  };
}

/**
 * @param store   localStorage-like; omit for a memory-only entitlement.
 * @param search  a URL query string ("?tier=free"). TEST HOOK AND HIS PHONE:
 *                visiting with ?tier=free or ?tier=paid sets and PERSISTS the
 *                tier, so the paywall can be A/B'd on a real device with zero
 *                added chrome and nothing to remove later. Costs no layout,
 *                which matters against an 11px budget.
 */
export function createEntitlement({ store = null, search = "" } = {}) {
  const backing = safeStore(store);

  // DEFAULT IS UNLOCKED, ON PURPOSE. The live PWA is the full app today, and a
  // deploy that silently took features away from him mid-testing would be a bug,
  // not a preview. Free tier is opt-in until the native bridge is the source.
  let paid = true;

  const stored = backing.get();
  if (stored === "free") paid = false;
  else if (stored === "paid") paid = true;

  const m = /[?&]tier=(free|paid)/.exec(search || "");
  if (m) {
    paid = m[1] === "paid";
    backing.set(m[1]);
  }

  const api = {
    unlocked: () => paid,

    setUnlocked(next) {
      paid = !!next;
      backing.set(paid ? "paid" : "free");
      return paid;
    },

    // --- the two drums, gated by their engraved section ---
    qualityGroupLocked: (group) => !paid && !FREE_QUALITY_GROUPS.includes(group),
    progressionStyleLocked: (style) => !paid && !FREE_PROGRESSION_STYLES.includes(style),

    // --- whole features ---
    featureLocked: (name) => !paid && PAID_FEATURES.includes(name),

    // --- the library ---
    // Counts only what the user actually saved: an item carrying a `builtinId`
    // was seeded by the app, not chosen by them, so it can't consume a slot.
    countsAgainstSlots: (item) => !!item && !item.builtinId,
    usedSlots(items = []) {
      return items.filter((it) => api.countsAgainstSlots(it)).length;
    },
    slotsLeft(items = []) {
      return paid ? Infinity : Math.max(0, FREE_SAVE_SLOTS - api.usedSlots(items));
    },
    // `id` lets an OVERWRITE of an existing item through even at the cap — it
    // consumes no new slot, and refusing it would strand a free user who wants to
    // revise one of their three.
    canSave(items = [], id = null) {
      if (paid) return true;
      if (id && items.some((it) => it.id === id)) return true;
      return api.slotsLeft(items) > 0;
    },
  };

  return api;
}
