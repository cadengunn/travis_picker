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
// WHAT IT MARKS, and both of these changed in session 34 on his call:
//
// THE ROOT, in --active, and nothing else. It used to accent the thumb's whole
// alternating pair (root + alt), on the argument that no chord chart out of a
// book can tell you which two notes the thumb rocks between. He reversed it:
// root-only is what an ordinary chord chart marks, and **the thumb is already
// implicit in which string a note is on** — strings 6/5/4 are its domain — so the
// second accented dot was spending colour to say something the layout says free.
//
// THE MOVING FINGER, as a HOLLOW dot. Where one left-hand finger covers two
// strings by moving between them rather than holding both — the open-C ring
// finger rocking onto the low bass note as the thumb alternates — the note you
// move TO is drawn as an outline. There is no established symbol for this in
// chord-box notation (movement normally lives in tab), but a hollow "alternate
// bass" dot is the nearest existing practice, so this borrows rather than invents.
// Dashes were considered and dropped: at r=4.6 they read as a rendering artifact.
// This is why the OPEN-string markers are filled discs — hollow now means "you
// move here", and it can only mean one thing.
//
// Which chords have one is DATA (`MOVING` in data.js), not derivable — see the
// note there for the measurement that settled it.

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
  // widest span is five — B♭add9 (frets 1-5) and Badd9 (2-6), the A-shape add9's
  // 4-fret reach on string 3. That title has moved twice as his playability
  // passes landed: G♯sus2 held it, then C♯add9, and both were revoiced away
  // (sessions 35 / 35b). The two that hold it now sit low on the neck, where the
  // same stretch is easy.
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
  //
  // A BARRE GOES ALL THE WAY ACROSS (his call, session 35). It used to be drawn
  // only from the first to the last string AT the barre fret, which drew F♯6's
  // index finger as a stub over strings 6-5. That's not what the hand does: the
  // index lies flat across every string it can reach, and a string carrying a
  // HIGHER note is still barred underneath — the higher finger simply wins. So
  // the bar extends outward from the low-fret strings through every neighbouring
  // string that's fretted at all, stopping only at an open or muted one (which a
  // finger genuinely can't lie over). In this library that means every barre
  // chord bars all six.
  //
  // AND THERE CAN BE MORE THAN ONE (same call). His F♯6: "one finger all the way
  // across on fret 9, another finger covering the 4 strings at fret 11." So any
  // run of adjacent strings sharing one fret can be a second finger lying flat.
  //
  // FOUR IS THE THRESHOLD, and he set it from both sides (session 35b). THREE in
  // a row is NOT a bar — "the A-shape family double barre, I usually just play
  // those with three fingers", which also covers the sus4s and, decisively, keeps
  // the barre chords consistent with open A (0 0 2 2 2 0), whose identical
  // fret-2 trio he'd already seen drawn as three dots. FOUR in a row IS one —
  // "A6 should just have a barre across the 4 high strings".
  //
  // A6 is also why this run is judged INDEPENDENTLY of the index barre above: it
  // has open strings, so it gets no index bar at all, and nothing above fret 2
  // either. The rule can't be "a run above the barre" — it's just a finger lying
  // across four strings, which is true with or without a barre elsewhere.
  const RUN_IS_A_BAR = 4;
  const barres = [];
  if (!anyOpen && high > low) {
    const idx = at.map((f, i) => (f === low ? i : -1)).filter((i) => i >= 0);
    if (idx.length >= 2) {
      let from = idx[0];
      let to = idx[idx.length - 1];
      while (from > 0 && at[from - 1] != null && at[from - 1] > 0) from--;
      while (to < 5 && at[to + 1] != null && at[to + 1] > 0) to++;
      barres.push({ fret: low, from, to });
    }
  }
  // Skip a run at the index bar's own fret — that bar is wider and already says
  // it (the E-shape m7s are `1 3 1 1 1 1`, four in a row under a full barre).
  const indexFret = barres.length ? barres[0].fret : null;
  for (let i = 0; i < 6; ) {
    const f = at[i];
    if (f == null || f === 0) { i++; continue; }
    let j = i;
    while (j + 1 < 6 && at[j + 1] === f) j++;
    if (j - i + 1 >= RUN_IS_A_BAR && f !== indexFret) barres.push({ fret: f, from: i, to: j });
    i = j + 1;
  }
  barres.sort((a, b) => a.fret - b.fret);
  // A string is under a bar only at that bar's OWN fret: a higher note on a
  // barred string is played by the finger on top, and still needs its dot.
  const barredAt = (i, fret) => barres.some((b) => b.fret === fret && i >= b.from && i <= b.to);

  // ONLY THE ROOT is accented (his call, session 34), which is what an ordinary
  // chord chart marks. This REPLACED marking the thumb's whole alternating pair
  // (root + alt): his argument is that the thumb is already implicit in which
  // string a note is on, since strings 6/5/4 are its domain, so a second accented
  // dot spent colour on something the layout says for free.
  const rootString = chord.root;
  // The moving finger, if this chord has one: `moving: [from, to]` in data.js.
  // Only the `to` note is drawn hollow — the one you reach for.
  const movingTo = chord.moving ? chord.moving[1] : null;
  const dots = [];
  const marks = []; // above the nut: × muted, ○ open
  at.forEach((fret, i) => {
    const string = STRINGS[i];
    const role = string === rootString ? "root" : "note";
    const moving = string === movingTo;
    if (fret == null) { marks.push({ index: i, kind: "muted", role: null }); return; }
    if (fret === 0) { marks.push({ index: i, kind: "open", role }); return; }
    const underBarre = barredAt(i, fret);
    // A note under the barre needs no dot of its own — the bar is already saying
    // "one finger lies across here". TWO EXCEPTIONS get drawn on top of it: the
    // ROOT (G♯sus2's OLD shape, before its session 35 revoicing, is what exposed
    // that — its root sat under its own barre),
    // and a MOVING note, whose whole point is that it isn't held down with the
    // rest. Colouring the BAR instead would be wrong — it covers five strings
    // that mostly aren't the root.
    if (!underBarre || role === "root" || moving) {
      dots.push({ index: i, fret, role, moving, onBarre: !!underBarre });
    }
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
    // A bar is never accented: it's one finger lying across several strings, and
    // a root beneath it is marked by its own dot on top (see above). Ordered low
    // fret first, so the index barre draws before anything stacked over it.
    barres: barres.map((b) => ({ ...b, role: "note" })),
    dots,
    marks,
    // The pair one finger covers, carried through so a future treatment (a tie
    // between them, say) needs no new data — only the `to` is drawn today.
    moving: chord.moving || null,
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

  // Each barre, as one finger lying across — a rounded bar, not a row of dots.
  for (const b of m.barres) {
    svg.appendChild(el("rect", {
      class: `cb-barre cb-${b.role}`,
      x: x(b.from) - 5, y: dotY(b.fret) - 5,
      width: (b.to - b.from) * GAP_X + 10, height: 10, rx: 5,
    }));
  }

  for (const d of m.dots) {
    // A dot sitting ON the bar needs a rim, or a root dot in --active against a
    // bar in --accent is two similar warm tones touching with no edge.
    svg.appendChild(el("circle", {
      class: `cb-dot cb-${d.role}${d.moving ? " cb-moving" : ""}${d.onBarre ? " cb-on-barre" : ""}`,
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
    // Not drawn as a dot, so it's sounding under a bar — name the highest one
    // covering it, since a higher bar lies over a lower one.
    const b = m.barres.filter((k) => i >= k.from && i <= k.to).pop();
    if (b) return `string ${s} fret ${b.fret}`;
    return `string ${s}`;
  });
  return `${m.name}: ${per.join(", ")}`;
}
