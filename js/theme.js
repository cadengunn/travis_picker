// theme.js — loads themes.json and applies a theme as CSS custom properties.
//
// themes.json defines 5 roles per theme:
//   bg      app background (carries theme identity)
//   surface empty grid cells / panels
//   accent  beat-column highlights, buttons, headers (also the text color)
//   active  filled note circles (thumb)
//   label   text inside note circles
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
  r.setProperty("--row-thumb", mix(t.surface, t.accent, 0.05));
  r.setProperty("--control", mix(t.surface, t.bg, 0.25));
  // playhead column — reads clearly against `surface` in light and dark themes
  r.setProperty("--playhead", mix(t.surface, t.active, 0.4));

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
