// grid.js — renders a resolved Pattern into the drum-machine grid.
// One component for everything (display now; editing/playback later). No
// generation logic here. Both label modes are pure transforms of the events.

import { expandToPhrase } from "./generator.js";

const STRING_ROWS = [1, 2, 3, 4, 5, 6]; // top->bottom: high E (1) ... low E (6)
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const BEAT_LABEL = { 1: "1", 3: "2", 5: "3", 7: "4", 2: "&", 4: "&", 6: "&", 8: "&" };

// Build a fast lookup: bar -> slot -> string -> event
function indexBar(bar) {
  const map = new Map();
  for (const ev of bar) {
    if (!map.has(ev.slot)) map.set(ev.slot, new Map());
    map.get(ev.slot).set(ev.string, ev);
  }
  return map;
}

function labelFor(ev, labelMode) {
  if (labelMode === "pima") return ev.finger;
  // fret mode
  return String(ev.fret ?? 0);
}

// renderGrid(container, pattern, { labelMode, chord })
export function renderGrid(container, pattern, opts = {}) {
  const labelMode = opts.labelMode || "fret";
  container.innerHTML = "";

  const track = document.createElement("div");
  track.className = "grid-track";

  const phraseBars = expandToPhrase(pattern);

  phraseBars.forEach((bar, barIdx) => {
    const barEl = document.createElement("div");
    barEl.className = "bar";
    barEl.setAttribute("role", "group");
    barEl.setAttribute("aria-label", `Bar ${barIdx + 1}`);

    const idx = indexBar(bar);

    // Rows top->bottom: strings 1..6 (low E at the bottom).
    STRING_ROWS.forEach((string) => {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      // Domain tint: thumb owns 6/5/4, fingers own 3/2/1.
      rowEl.classList.add(string >= 4 ? "domain-thumb" : "domain-finger");
      // Divider between finger domain (string 3) and thumb domain (string 4).
      if (string === 3) rowEl.classList.add("domain-divider");

      SLOTS.forEach((slot) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.classList.add(slot % 2 === 1 ? "beat" : "offbeat");

        const ev = idx.get(slot)?.get(string);
        if (ev) {
          const dot = document.createElement("span");
          dot.className = "note";
          dot.classList.add(ev.finger === "p" ? "note-thumb" : "note-finger");
          dot.textContent = labelFor(ev, labelMode);
          cell.appendChild(dot);
          cell.classList.add("filled");
        }
        rowEl.appendChild(cell);
      });

      barEl.appendChild(rowEl);
    });

    // Beat-number ruler under the bar (1 & 2 & 3 & 4 &).
    const ruler = document.createElement("div");
    ruler.className = "ruler";
    SLOTS.forEach((slot) => {
      const tick = document.createElement("div");
      tick.className = "tick";
      tick.classList.add(slot % 2 === 1 ? "beat" : "offbeat");
      tick.textContent = BEAT_LABEL[slot];
      ruler.appendChild(tick);
    });
    barEl.appendChild(ruler);

    track.appendChild(barEl);
  });

  container.appendChild(track);
}
