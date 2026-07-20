// storage.js — the Saved library (localStorage).
//
// A saved item is MUSICAL CONTENT ONLY: the pattern plus the chord/key/
// progression it was written against. UI preferences (theme, label mode) are
// deliberately NOT saved here — they're independent app settings.
//
// The store is injectable so tests can use an in-memory stub rather than
// touching the user's real library.

export const SAVED_KEY = "travis-picker:saved";
export const SCHEMA_VERSION = 1;

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// storage only needs getItem/setItem, so a plain object stub works in tests.
export function createStore(key = SAVED_KEY, storage = globalThis.localStorage) {
  function readAll() {
    try {
      const raw = storage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // unreadable/corrupt — behave like an empty library
    }
  }

  function writeAll(items) {
    try {
      storage.setItem(key, JSON.stringify(items));
      return true;
    } catch {
      return false; // quota or private mode
    }
  }

  return {
    // Newest first. Ties (two saves in the same millisecond) fall back to
    // insertion order, so the ordering is always deterministic.
    list() {
      return readAll()
        .map((item, i) => ({ item, i }))
        .sort((a, b) =>
          (b.item.savedAt || "").localeCompare(a.item.savedAt || "") || b.i - a.i)
        .map(({ item }) => item);
    },

    get(id) {
      return readAll().find((i) => i.id === id) || null;
    },

    // { name, pattern, context, source } -> the stored item
    save({ name, pattern, context, source = "generated" }) {
      const item = {
        v: SCHEMA_VERSION,
        id: newId(),
        name: (name || "").trim() || "Untitled",
        savedAt: new Date().toISOString(),
        source,
        pattern,
        context,
      };
      const items = readAll();
      items.push(item);
      return writeAll(items) ? item : null;
    },

    remove(id) {
      const items = readAll();
      const next = items.filter((i) => i.id !== id);
      if (next.length === items.length) return false;
      return writeAll(next);
    },

    count() {
      return readAll().length;
    },
  };
}

export const savedStore = createStore();
