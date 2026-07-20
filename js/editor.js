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

// Toggle the note at one cell. `cellIndex` is the index into the pattern's
// DISTINCT bars — a short pattern repeating across a longer progression shares
// one cell, so editing any repeat edits them all.
export function toggleNote(pattern, { cellIndex, slot, string, chordId }) {
  const thumbBars = pattern.thumbBars.map((b) => b.slice());
  const trebleBars = pattern.trebleBars.map((b) => b.slice());
  const thumb = thumbBars[cellIndex];
  const treble = trebleBars[cellIndex];

  const thumbAt = thumb.findIndex(
    (e) => e.slot === slot && resolvedThumbString(e, chordId) === string
  );
  const trebleAt = treble.findIndex((e) => e.slot === slot && e.string === string);

  if (thumbAt >= 0) {
    thumb.splice(thumbAt, 1);
  } else if (trebleAt >= 0) {
    treble.splice(trebleAt, 1);
  } else {
    const finger = inferFinger(string, slot, chordId);
    if (finger === "p") {
      // Keep it relative when the string is one of this chord's roles, so the
      // note follows a progression. Otherwise it's an absolute bass note — the
      // "matches no role" case, surfaced by the type indicator.
      const role = roleFor(string, chordId);
      thumb.push(
        role
          ? { slot, finger: "p", role, absolute: false }
          : { slot, finger: "p", string, absolute: true }
      );
    } else {
      treble.push({ slot, finger, string });
    }
  }

  return {
    ...pattern,
    thumbBars,
    trebleBars,
    bars: thumbBars.map((t, i) => mergeBar(t, trebleBars[i])),
    type: deriveType(thumbBars),
    edited: true,
  };
}
