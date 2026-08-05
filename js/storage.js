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
const EXPORT_APP = "travis-picker";
const EXPORT_KIND = "saved-library";

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

    // { name, pattern, context, source, folder, builtinId } -> the stored
    // item. `folder` and `builtinId` are OMITTED, not written as null, when
    // absent — Finder-tag style, same "absent = unfiled" convention item.capo
    // used before it was content: a fresh save never has either until it's
    // given one, and the import path only sets them when the source item
    // actually carried them (see parseImport).
    save({ name, pattern, context, source = "generated", folder = null, builtinId = null }) {
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
      if (folder) item.folder = folder;
      // Invisible provenance tag for a pattern seeded from builtin-patterns.js
      // (item 2) — never shown in the UI, never touched by rename/move/edit.
      // It's what lets a "Restore" action tell "still here, maybe renamed or
      // moved" from "actually deleted" without depending on the item's name.
      if (builtinId) item.builtinId = builtinId;
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

    // Overwrite an existing item's content in place — same id, savedAt bumped
    // to now. The manual Save flow offers this when the typed name collides
    // with an item already in the library, so re-saving an edited pattern
    // under its own name updates it instead of spawning a uniqueName() "(2)".
    // Import is untouched by this — it still merges via save()'s de-dupe,
    // since it has no user to ask.
    update(id, { name, pattern, context, source = "generated" }) {
      const items = readAll();
      const item = items.find((i) => i.id === id);
      if (!item) return null;
      const clean = (name || "").trim();
      if (clean) item.name = clean;
      item.pattern = pattern;
      item.context = context;
      item.source = source;
      item.savedAt = new Date().toISOString();
      return writeAll(items) ? item : null;
    },

    // ----- folders (item 4b) -----
    // No separate folder table, Finder-tag style: a folder is just the
    // distinct set of `folder` strings actually in use on items right now.
    // Renaming or deleting one is therefore a bulk field-update across
    // whichever items currently carry that name, not an edit to a record of
    // its own — there's nothing else to keep in sync.

    // Assign/move/unfile one item. `folder` null or blank means Unfiled —
    // stored as an ABSENT field (not `null`), so an item's shape stays
    // exactly what save() already produces for one that's never been filed.
    setFolder(id, folder) {
      const items = readAll();
      const item = items.find((i) => i.id === id);
      if (!item) return false;
      const clean = (folder || "").trim();
      if (clean) item.folder = clean; else delete item.folder;
      return writeAll(items);
    },

    // Distinct folder names in use, alphabetical — the Load list's group
    // order and the per-item assign-select's option list both read this.
    folders() {
      const set = new Set();
      for (const i of readAll()) if (i.folder) set.add(i.folder);
      return [...set].sort((a, b) => a.localeCompare(b));
    },

    // Every item in `oldName` moves to `newName` (or merges into it, if that
    // name's already in use — Finder-tag style, there's no id to collide on).
    // A blank new name, or an old name nothing currently carries, is a no-op.
    renameFolder(oldName, newName) {
      const clean = (newName || "").trim();
      if (!clean) return false;
      const items = readAll();
      let touched = false;
      for (const i of items) {
        if (i.folder === oldName) { i.folder = clean; touched = true; }
      }
      if (!touched) return false;
      return writeAll(items);
    },

    // Un-files every item in `name` — deleting a folder can only reorganize,
    // never lose a pattern, same principle as import's merge-only behaviour.
    clearFolder(name) {
      const items = readAll();
      let touched = false;
      for (const i of items) {
        if (i.folder === name) { delete i.folder; touched = true; }
      }
      if (!touched) return false;
      return writeAll(items);
    },
  };
}

// ----- Export/import (item 4): belt-and-braces insurance against iOS
// evicting localStorage, and the way patterns move between devices/people. -----

// A single pattern and a whole library share one wrapper, so import only
// ever needs one code path. `items` is exactly what list() returns — the
// full stored shape (id/savedAt included) travels with the file for
// provenance, even though import only reads name/pattern/context/source back
// out of it (see parseImport).
export function buildExport(items) {
  return {
    app: EXPORT_APP,
    exportKind: EXPORT_KIND,
    schema: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    items: items.slice(),
  };
}

function looksLikePattern(pattern) {
  return !!pattern && typeof pattern === "object" &&
    Array.isArray(pattern.thumbBars) && Array.isArray(pattern.trebleBars);
}

// Parses and validates an imported file. NEVER THROWS — an untrusted file is
// a real system boundary, so this is the one place in the feature that
// validates shape rather than trusting it (readAll()'s "corrupt input
// degrades quietly" convention, extended to a whole file rather than one
// stored blob). Individual malformed entries are skipped rather than failing
// the whole import; only a file that isn't recognizable as a Travis Picker
// export at all is rejected outright.
export function parseImport(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  // The wrapped shape is the real format, and self-identifies via `app` — so
  // it's trusted as "items" even if every entry inside turns out unreadable
  // (that's a "skipped" result below, not a rejection: the file WAS clearly
  // ours). A bare array has no such tag, so it's only accepted as a lenient
  // alternate format when at least one entry actually looks like a pattern —
  // otherwise an unrelated JSON array (e.g. `[1,2,3]`) would silently "import"
  // as zero patterns instead of being reported as the wrong file entirely.
  const wrapped = parsed && parsed.app === EXPORT_APP && Array.isArray(parsed.items);
  const bareArray = Array.isArray(parsed) &&
    parsed.some((e) => e && typeof e === "object" && looksLikePattern(e.pattern));
  const entries = wrapped ? parsed.items : bareArray ? parsed : null;
  if (!entries) return { ok: false, error: "That doesn't look like a Travis Picker export." };

  const items = [];
  let skipped = 0;
  for (const entry of entries) {
    if (entry && typeof entry === "object" && looksLikePattern(entry.pattern)) {
      items.push({
        name: typeof entry.name === "string" ? entry.name : "",
        pattern: entry.pattern,
        context: entry.context && typeof entry.context === "object" ? entry.context : {},
        source: entry.source === "drawn" ? "drawn" : "generated",
        // Folders (item 4b) travel across export/import too — Finder-tag
        // style, so an imported item with `folder: "Practice"` just joins
        // that folder on the new device, creating the group if it's new.
        folder: typeof entry.folder === "string" ? entry.folder : null,
        // Same reasoning as folder: keeping a builtin item's provenance tag
        // across export/import is what stops it from being treated as
        // "missing" (and re-seeded as a duplicate) on the receiving device.
        builtinId: typeof entry.builtinId === "string" ? entry.builtinId : null,
      });
    } else {
      skipped++;
    }
  }
  return { ok: true, items, skipped };
}

export const savedStore = createStore();
