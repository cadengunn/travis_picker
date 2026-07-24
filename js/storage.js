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

// Finder-style de-duplication: the original keeps its name, and a later save of
// the same name becomes "Name (2)", "Name (3)", … so the Load list never shows
// two identical labels you can't tell apart.
function uniqueName(base, existingNames) {
  if (!existingNames.includes(base)) return base;
  let n = 2;
  while (existingNames.includes(`${base} (${n})`)) n++;
  return `${base} (${n})`;
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
      const items = readAll();
      const base = (name || "").trim() || "Untitled";
      const item = {
        v: SCHEMA_VERSION,
        id: newId(),
        name: uniqueName(base, items.map((i) => i.name)),
        savedAt: new Date().toISOString(),
        source,
        pattern,
        context,
      };
      items.push(item);
      return writeAll(items) ? item : null;
    },

    remove(id) {
      const items = readAll();
      const next = items.filter((i) => i.id !== id);
      if (next.length === items.length) return false;
      return writeAll(next);
    },

    // Rename in place; keeps everything else (pattern, context, savedAt, id). A
    // blank/whitespace name is ignored so an item can't lose its name.
    rename(id, name) {
      const clean = (name || "").trim();
      if (!clean) return false;
      const items = readAll();
      const item = items.find((i) => i.id === id);
      if (!item) return false;
      item.name = clean;
      return writeAll(items);
    },

    count() {
      return readAll().length;
    },
  };
}

export const savedStore = createStore();
