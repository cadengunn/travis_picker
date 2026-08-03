// chordbox.js — the left-hand shape, drawn as a chord box for the wheel.
//
// WHY THIS EXISTS (OPEN_ITEMS item 9, his call session 33). It was rejected once,
// correctly: while every chord in the library was one you already knew, the grid's
// fret numbers told you everything and a diagram was redundant. The condition
// written down at the time was "revisit if and only if the library grows
// unfamiliar shapes" — and it has: 120 chords, 75 of them barres, most of which
// nobody knows by name. The grid tells you which frets the notes you PICK are on,
// which is not the same as knowing where to put your left hand for E♭m.
//
// It belongs in the WHEEL, where you're choosing — never near the grid, which is
// the hero and has no room. The wheel's panel is a body-level overlay, so this
// costs nothing in the height budget.
//
// TWO PARTS, and the split is the point: `chordBoxModel()` is pure and decides
// everything (which frets the window shows, whether there's a nut or a position
// number, where the barre is, which dots are the thumb's). `renderChordBox()` only
// turns that model into SVG. The model is what the tests reason about — the
// drawing is not where the mistakes live.
//
// MARKING THE THUMB'S TWO BASS NOTES is the whole reason this beats a chord chart
// out of any book (his call). A generic diagram can't tell you which two notes
// your thumb rocks between; that's the "root ↔ alt" column of CHORD_REFERENCE.md,
// shown at the moment you're picking. It reuses the grid's own convention —
// thumb = --active, fingers = --accent — so the colours already mean this.

import { CHORDS, CHORD_SHAPES } from "./data.js";

export const BOX_FRETS = 5;      // fret rows in the window — the library's widest span
const STRINGS = [6, 5, 4, 3, 2, 1]; // low to high, drawn left to right

// A pure description of how to draw `chordId`. Returns null for an unknown chord
// (a stale saved id, say) so the caller can simply draw nothing.
export function chordBoxModel(chordId) {
  const shape = CHORD_SHAPES[chordId];
  const chord = CHORDS[chordId];
  if (!shape || !chord) return null;

  // `undefined` is a muted string; 0 is open. Keep them distinct — a chord box
  // says × and ○ above the nut and they are not the same statement.
  const at = STRINGS.map((s) => (s in shape ? shape[s] : null));
  const fretted = at.filter((f) => f != null && f > 0);
  const anyOpen = at.some((f) => f === 0);
  const low = fretted.length ? Math.min(...fretted) : 0;
  const high = fretted.length ? Math.max(...fretted) : 0;

  // WHERE THE WINDOW STARTS. An open shape is anchored at the nut, because the
  // open strings only mean anything against it. Everything else slides up the
  // neck and prints its position instead — which is exactly how a chord chart
  // does it, and why the box needs no more than five rows for a library whose
  // widest span is five (G♯sus2, frets 4-8).
  //
  // ...but only if the fretted notes actually FIT there. A shape that mixes an
  // open string with notes above the 5th fret can't be anchored at the nut — the
  // dots would land outside the grid. No shipped chord does this, so the library
  // test can't catch it; a candidate voicing being auditioned did, which is
  // exactly when it would have bitten. Such a shape anchors by position and keeps
  // its ○ markers, since those strings are still genuinely open.
  const atNut = (anyOpen || low <= 1 || !fretted.length) && high <= BOX_FRETS;
  const first = atNut ? 1 : low;

  // A BARRE, not merely a repeated fret: one finger lies across several strings,
  // so there must be no open string in the way, the lowest fret has to appear on
  // at least two strings, and something must sit above it — otherwise it's an
  // ordinary two-finger shape and drawing a bar across it would be a lie.
  let barre = null;
  if (!anyOpen && high > low) {
    const idx = at.map((f, i) => (f === low ? i : -1)).filter((i) => i >= 0);
    if (idx.length >= 2) barre = { fret: low, from: idx[0], to: idx[idx.length - 1] };
  }

  // The thumb's alternating pair. Every other sounded note belongs to the
  // fingers. (The `fifth` role is deliberately not marked: root ↔ alt is the pair
  // the thumb actually rocks between, and a third colour would muddy the read.)
  const thumbStrings = new Set([chord.root, chord.alt]);
  const dots = [];
  const marks = []; // above the nut: × muted, ○ open
  at.forEach((fret, i) => {
    const thumb = thumbStrings.has(STRINGS[i]);
    const role = thumb ? "thumb" : "finger";
    if (fret == null) { marks.push({ index: i, kind: "muted", role: null }); return; }
    if (fret === 0) { marks.push({ index: i, kind: "open", role }); return; }
    const underBarre = barre && fret === barre.fret && i >= barre.from && i <= barre.to;
    // A note under the barre needs no dot of its own — the bar is already saying
    // "one finger lies across here". THE EXCEPTION IS A BASS ROLE: the two notes
    // the thumb alternates between are the whole reason this diagram exists, so
    // they're drawn on top of the bar rather than swallowed by it. (Colouring the
    // BAR instead would be wrong — it covers five strings that mostly aren't bass
    // notes, and G♯sus2, whose root sits under its barre, showed exactly that.)
    if (!underBarre || thumb) dots.push({ index: i, fret, role, onBarre: !!underBarre });
  });

  return {
    id: chordId,
    name: chord.name,
    strings: STRINGS,
    first,
    frets: BOX_FRETS,
    nut: atNut,
    // The number printed beside the top row. Null at the nut, where the nut
    // itself says where you are.
    position: atNut ? null : first,
    // The bar is always the FINGER colour: it's an index finger lying across, and
    // any bass role beneath it is marked by its own dot on top (see above).
    barre: barre ? { ...barre, role: "finger" } : null,
    dots,
    marks,
    low,
    high,
    span: fretted.length ? high - low + 1 : 0,
  };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

// Geometry, in the SVG's own units — the element is scaled by CSS, so these are
// proportions, not pixels.
const PAD_X = 13;    // room for the position numeral on the left
const PAD_TOP = 13;  // room for the ×/○ row above the nut
const GAP_X = 15;    // string spacing
const GAP_Y = 16;    // fret spacing
const W = PAD_X * 2 + GAP_X * 5;
const H = PAD_TOP + GAP_Y * BOX_FRETS + 5;

export function renderChordBox(chordId) {
  const m = chordBoxModel(chordId);
  const svg = el("svg", {
    class: "chordbox", viewBox: `0 0 ${W} ${H}`, width: W, height: H,
    role: "img", "aria-label": m ? describeShape(m) : "",
  });
  if (!m) return svg;

  const x = (i) => PAD_X + i * GAP_X;
  const y = (row) => PAD_TOP + row * GAP_Y;          // row 0 = the nut/top line
  const dotY = (fret) => y(fret - m.first) + GAP_Y / 2; // dots sit BETWEEN wires

  // Frets, then strings, so the strings lie over them like real wire.
  for (let r = 0; r <= m.frets; r++) {
    svg.appendChild(el("line", {
      class: r === 0 && m.nut ? "cb-nut" : "cb-fret",
      x1: x(0), y1: y(r), x2: x(5), y2: y(r),
    }));
  }
  for (let i = 0; i < 6; i++) {
    svg.appendChild(el("line", { class: "cb-string", x1: x(i), y1: y(0), x2: x(i), y2: y(m.frets) }));
  }

  // The position numeral, where there's no nut to say it.
  if (m.position != null) {
    const t = el("text", { class: "cb-pos", x: PAD_X - 5, y: dotY(m.first) + 3, "text-anchor": "end" });
    t.textContent = String(m.position);
    svg.appendChild(t);
  }

  // × and ○ above the nut. DRAWN, not typed: the house rule is that any glyph
  // outside the two bundled faces has to be drawn, and these would otherwise
  // come from whatever system font happened to have them.
  for (const mk of m.marks) {
    const cx = x(mk.index);
    const cy = PAD_TOP - 7;
    if (mk.kind === "open") {
      svg.appendChild(el("circle", { class: `cb-open cb-${mk.role}`, cx, cy, r: 3.1 }));
    } else {
      svg.appendChild(el("line", { class: "cb-mute", x1: cx - 2.8, y1: cy - 2.8, x2: cx + 2.8, y2: cy + 2.8 }));
      svg.appendChild(el("line", { class: "cb-mute", x1: cx + 2.8, y1: cy - 2.8, x2: cx - 2.8, y2: cy + 2.8 }));
    }
  }

  // The barre, as one finger lying across — a rounded bar, not a row of dots.
  if (m.barre) {
    svg.appendChild(el("rect", {
      class: `cb-barre cb-${m.barre.role}`,
      x: x(m.barre.from) - 5, y: dotY(m.barre.fret) - 5,
      width: (m.barre.to - m.barre.from) * GAP_X + 10, height: 10, rx: 5,
    }));
  }

  for (const d of m.dots) {
    // A dot sitting ON the bar needs a rim, or a thumb dot in --active against a
    // bar in --accent is two similar warm tones touching with no edge.
    svg.appendChild(el("circle", {
      class: `cb-dot cb-${d.role}${d.onBarre ? " cb-on-barre" : ""}`,
      cx: x(d.index), cy: dotY(d.fret), r: 4.6,
    }));
  }
  return svg;
}

// What a screen reader gets instead of the picture.
export function describeShape(m) {
  const per = m.strings.map((s, i) => {
    const mk = m.marks.find((k) => k.index === i);
    if (mk) return `string ${s} ${mk.kind === "open" ? "open" : "muted"}`;
    const d = m.dots.find((k) => k.index === i);
    if (d) return `string ${s} fret ${d.fret}`;
    if (m.barre && i >= m.barre.from && i <= m.barre.to) return `string ${s} fret ${m.barre.fret}`;
    return `string ${s}`;
  });
  return `${m.name}: ${per.join(", ")}`;
}
