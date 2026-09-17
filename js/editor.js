// editor.js — pure logic for the manual (tap-to-edit) grid.
//
// Kept free of DOM so it stays testable: app.js translates a tapped cell into
// { cellIndex, slot, string, chordId } and this decides what that means
// musically. Editing only enforces the hard rule (which the grid gives us for
// free — one cell IS one string+slot); the thumb skeleton and hand domains are
// guidance here, not walls, per the spec.

import { CHORDS, BEAT_SLOTS, THUMB_STRINGS, STRING_FINGER } from "./data.js";
import { mergeBar } from "./generator.js";

// Which role (if any) a string occupies for a chord.
export function roleFor(string, chordId) {
  const c = CHORDS[chordId];
  if (!c) return null;
  if (string === c.root) return "root";
  if (string === c.alt) return "alt_bass";
  if (string === c.fifth) return "fifth";
  return null;
}

// Which hand plays a tapped cell. Thumb strings (6/5/4) are always the thumb.
// On an OVERLAP string — finger-domain (3/2/1) but also a bass role for this
// chord, e.g. string 3 on D — it's the thumb on beats and a finger off-beat.
export function inferFinger(string, slot, chordId) {
  if (THUMB_STRINGS.includes(string)) return "p";
  const isOverlap = roleFor(string, chordId) !== null;
  if (isOverlap && BEAT_SLOTS.includes(slot)) return "p";
  return STRING_FINGER[string];
}

// The string a stored thumb event actually sounds on for a given chord.
export function resolvedThumbString(ev, chordId) {
  if (ev.role && !ev.absolute) {
    const c = CHORDS[chordId];
    return { root: c.root, alt_bass: c.alt, fifth: c.fifth }[ev.role];
  }
  return ev.string;
}

// A pattern is relative while every bass note is a role, absolute when none
// are, and mixed in between — which is legal (spec: mixed patterns allowed,
// flagged rather than silently guessed).
export function deriveType(thumbBars) {
  const events = thumbBars.flat();
  if (!events.length) return "relative";
  const relative = events.filter((e) => e.role && !e.absolute).length;
  if (relative === events.length) return "relative";
  if (relative === 0) return "absolute";
  return "mixed";
}

// The event sounding at a cell (slot + guitar string under a chord), or null —
// a thumb event whose RESOLVED string matches, or a treble event on that string.
// Returns the event object itself so callers can remove it by reference, which
// is what keeps a same-bar move (source and destination in one shared array)
// from invalidating an index mid-splice.
function findEvent(thumb, treble, slot, string, chordId) {
  const t = thumb.find((e) => e.slot === slot && resolvedThumbString(e, chordId) === string);
  if (t) return t;
  return treble.find((e) => e.slot === slot && e.string === string) || null;
}

// Create the event for a note placed at slot + string under a chord, pushing it
// into the right layer. A note IS its position here — hand and role are inferred
// fresh, never carried — so this is the one placement rule, shared by a tap and
// a drag's landing.
function placeAt(thumb, treble, slot, string, chordId) {
  const finger = inferFinger(string, slot, chordId);
  if (finger === "p") {
    // Relative when the string is one of this chord's roles, so the note follows
    // a progression; otherwise an absolute bass note (surfaced by the type
    // indicator). `string` is stored even for a relative note (resolveBar
    // recomputes it per chord) — without it the hard-rule dedupe key is
    // "slot:undefined", which silently swallowed a second bass note in a slot.
    const role = roleFor(string, chordId);
    thumb.push(
      role
        ? { slot, finger: "p", role, string, absolute: false }
        : { slot, finger: "p", string, absolute: true }
    );
  } else {
    treble.push({ slot, finger, string });
  }
}

const rebuild = (pattern, thumbBars, trebleBars) => ({
  ...pattern,
  thumbBars,
  trebleBars,
  bars: thumbBars.map((t, i) => mergeBar(t, trebleBars[i])),
  type: deriveType(thumbBars),
  edited: true,
});

// Toggle the note at one cell. `cellIndex` is the index into the pattern's
// DISTINCT bars — a short pattern repeating across a longer progression shares
// one cell, so editing any repeat edits them all.
export function toggleNote(pattern, { cellIndex, slot, string, chordId }) {
  const thumbBars = pattern.thumbBars.map((b) => b.slice());
  const trebleBars = pattern.trebleBars.map((b) => b.slice());
  const thumb = thumbBars[cellIndex];
  const treble = trebleBars[cellIndex];

  const existing = findEvent(thumb, treble, slot, string, chordId);
  if (existing) {
    thumbBars[cellIndex] = thumb.filter((e) => e !== existing);
    trebleBars[cellIndex] = treble.filter((e) => e !== existing);
  } else {
    placeAt(thumb, treble, slot, string, chordId);
  }

  return rebuild(pattern, thumbBars, trebleBars);
}

// Drag a note from one cell to another (Move + Swap — his call, session 48).
// A grab of an empty cell is a no-op, so the gesture layer can call this without
// first checking what's under the finger. If the destination already holds a
// note the two SWAP; otherwise the note simply moves. Both landing cells RE-INFER
// hand/role from their new position (a note is its position here, nothing is
// carried), and — like every edit — this changes the one shared bar across all
// its on-screen repeats.
export function moveNote(pattern, from, to) {
  if (from.cellIndex === to.cellIndex && from.slot === to.slot && from.string === to.string) {
    return pattern; // same cell — not a move (a tap toggles instead)
  }
  const thumbBars = pattern.thumbBars.map((b) => b.slice());
  const trebleBars = pattern.trebleBars.map((b) => b.slice());

  const src = findEvent(thumbBars[from.cellIndex], trebleBars[from.cellIndex], from.slot, from.string, from.chordId);
  if (!src) return pattern; // grabbed an empty cell
  const dst = findEvent(thumbBars[to.cellIndex], trebleBars[to.cellIndex], to.slot, to.string, to.chordId);

  // Remove the grabbed note and (on a swap) the displaced one BY REFERENCE, so a
  // same-bar move — source and destination sharing one array — can't shift an
  // index out from under the second removal.
  const drop = (arr) => arr.filter((e) => e !== src && e !== dst);
  thumbBars[from.cellIndex] = drop(thumbBars[from.cellIndex]);
  trebleBars[from.cellIndex] = drop(trebleBars[from.cellIndex]);
  if (to.cellIndex !== from.cellIndex) {
    thumbBars[to.cellIndex] = drop(thumbBars[to.cellIndex]);
    trebleBars[to.cellIndex] = drop(trebleBars[to.cellIndex]);
  }

  placeAt(thumbBars[to.cellIndex], trebleBars[to.cellIndex], to.slot, to.string, to.chordId);
  if (dst) placeAt(thumbBars[from.cellIndex], trebleBars[from.cellIndex], from.slot, from.string, from.chordId);

  return rebuild(pattern, thumbBars, trebleBars);
}
