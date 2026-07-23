// theme.js — loads themes.json and applies a theme as CSS custom properties.
//
// themes.json defines 5 roles per theme:
//   bg      app background (carries theme identity)
//   surface empty grid cells / panels
//   accent  beat-column highlights, buttons, headers (also the text color)
//   active  filled note circles (thumb)
//   label   text inside note circles
// plus two OPTIONAL roles:
//   hardware  the metal fittings (sheet lip, die border, jewel rim);
//             defaults to the house brass #c9a24a — override for e.g. nickel
//   playhead  the sounding-column color; defaults to mix(surface, active, 0.4),
//             override when that blend desaturates (complementary hue pairs)
//
// Everything else (borders, muted text, beat tint, domain tint) is DERIVED here
// by blending those hexes into opaque colors, so the CSS needs no alpha math and
// each theme stays a 5-value edit.

const STORAGE_KEY = "travis-picker:theme";

let themes = [];
let defaultId = null;

// ---- tiny color helpers ----
function parseHex(hex) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}
function toHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
// mix(a, b, t) — t = how much of b to blend into a
function mix(a, b, t) {
  const A = parseHex(a), B = parseHex(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}
// rgba(hex, a) — for the few derived colors that must stay translucent
// (washes that ride on top of other derived fills, glows over arbitrary bgs)
function rgba(hex, a) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
// relative luminance, 0..1 — used to pick shadow weight on light themes
function luma(hex) {
  const [r, g, b] = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function listThemes() {
  return themes.map((t) => ({ id: t.id, name: t.name }));
}

export function getTheme(id) {
  return themes.find((t) => t.id === id) || themes.find((t) => t.id === defaultId) || themes[0];
}

export function applyTheme(id) {
  const t = getTheme(id);
  if (!t) return null;
  const r = document.documentElement.style;

  // direct roles
  r.setProperty("--bg", t.bg);
  r.setProperty("--surface", t.surface);
  r.setProperty("--accent", t.accent);
  r.setProperty("--active", t.active);
  r.setProperty("--label", t.label);

  // derived (opaque blends)
  r.setProperty("--text", t.accent);
  r.setProperty("--muted", mix(t.bg, t.accent, 0.6));
  r.setProperty("--line", mix(t.surface, t.accent, 0.3));
  r.setProperty("--beat-tint", mix(t.surface, t.accent, 0.13));
  r.setProperty("--control", mix(t.surface, t.bg, 0.25));
  // the tweed faceplate tone — the whole screen's surface, between bg & surface.
  // The weave/sheen/vignette overlays that make it "tweed" are fixed rgba in the
  // CSS, so this one blend is all a theme needs to define.
  r.setProperty("--faceplate", mix(t.bg, t.surface, 0.42));
  // playhead column — reads clearly against `surface` in light and dark themes.
  // Overridable per theme: the default blend toward `active` goes muddy when
  // surface and active are complements (Doc's blue+amber cancels to gray), so
  // those themes name their own column color in themes.json.
  r.setProperty("--playhead", t.playhead || mix(t.surface, t.active, 0.4));
  // a near-pure `active`, for the glow ring around a note whose column is
  // sounding: on a beat the note circle covers the cell tint, so the note
  // itself has to react or the playhead looks like it skips the bass.
  r.setProperty("--playhead-glow", mix(t.surface, t.active, 0.9));

  // grid furniture — derived toward `accent` (the text color), which by
  // definition contrasts with `surface` in every theme, light or dark.
  // These were fixed cream/brown rgba once, which flattered merle and turned
  // elizabeth's white grid into invisible lines over a concrete band.
  r.setProperty("--grid-line", mix(t.surface, t.accent, 0.14));
  r.setProperty("--band-thumb", mix(t.surface, t.bg, 0.5));
  // downbeat wash stays TRANSLUCENT: it layers over both plain cells and the
  // thumb band, so an opaque blend would erase the band under beat columns.
  r.setProperty("--beat-wash", rgba(t.accent, 0.07));

  // hardware — the brass fittings (sheet lip, die/primary borders, jewel rim).
  // Optional 6th role in themes.json; defaults to the house brass.
  const hardware = t.hardware || "#c9a24a";
  r.setProperty("--hardware", hardware);
  r.setProperty("--hardware-deep", mix(hardware, "#000000", 0.3));

  // idle transport glyphs (play/gear/close) — was fixed cream #cdb894, which
  // vanished on light themes ("the play button looks disabled").
  r.setProperty("--glyph", mix(t.bg, t.accent, 0.76));

  // pilot-lamp jewel: hot centre / rim / glow all follow `active`, so a teal
  // theme gets a teal lamp, not an amber one. Off-state is dark control glass.
  r.setProperty("--lamp-hot", mix(t.active, "#ffffff", 0.62));
  r.setProperty("--lamp-rim", mix(t.active, "#000000", 0.45));
  r.setProperty("--lamp-glow", rgba(t.active, 0.55));
  const control = mix(t.surface, t.bg, 0.25);
  r.setProperty("--jewel-off-hi", mix(control, t.accent, 0.18));
  r.setProperty("--jewel-off", mix(control, t.bg, 0.4));

  // the lit Play button's gradient tail — `active` pulled toward black, so a
  // pressed transport reads as the same material in any hue. `accent-deep` is
  // the same idea for the die's bottom edge (was a fixed tan smudge that
  // fought the cool themes).
  r.setProperty("--active-deep", mix(t.active, "#000000", 0.22));
  r.setProperty("--accent-deep", mix(t.accent, "#000000", 0.16));

  // light surfaces can't take a 45% black recess shadow — it reads as grime.
  r.setProperty("--recess-shadow", luma(t.surface) > 0.6 ? "rgba(0, 0, 0, 0.16)" : "rgba(0, 0, 0, 0.45)");

  document.documentElement.setAttribute("data-theme", t.id);
  try { localStorage.setItem(STORAGE_KEY, t.id); } catch {}
  return t.id;
}

export function savedThemeId() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

// Load themes.json. Resolves to the id that was applied.
export async function initThemes() {
  const res = await fetch("themes.json");
  const data = await res.json();
  themes = data.themes || [];
  defaultId = data.default || (themes[0] && themes[0].id);
  const wanted = savedThemeId() || defaultId;
  return applyTheme(wanted);
}
