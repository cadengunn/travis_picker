// ui-sound.js — the mechanical click of a hardware button, so the controls feel
// like real switches to match their carved/push-in look.
//
// TWO-PHASE, like an old tape-deck transport key: a lighter, brighter "ka" as
// the button travels in (playPress, on pointer-down) and a deeper "chunk" as the
// spring seats on release (playRelease, on pointer-up). They're two halves of one
// action — same materials, different weight — so a quick tap reads as "ka-chunk".
//
// Dependency-free raw Web Audio, same house style as synth.js/metronome.js (no
// library — this is an offline PWA). Each half is a short low triangle "body"
// plus a band-passed noise "tick" (the contact), rendered live — no samples to
// precache.
//
// iOS unlocks audio only inside a user gesture; a button press IS one, so the
// lazily-created AudioContext resumes fine on the first tap. Off is honoured
// before any context is created, so a muted app never opens an AudioContext.

let ctx = null;
let enabled = true;
let noiseBuf = null; // cached white-noise buffer for the contact "tick"

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function noise(ac) {
  if (noiseBuf) return noiseBuf;
  const n = Math.floor(ac.sampleRate * 0.03); // 30ms is plenty for a tick
  noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

export function setUiSoundEnabled(on) {
  enabled = !!on;
}

// The low triangle "body" of a click — a fast-decaying pulse whose pitch drops
// slightly for a woody, un-electronic knock.
function body(ac, t, { f0, drop, level, attack, dur }) {
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(f0 + drop, t);
  osc.frequency.exponentialRampToValueAtTime(f0, t + dur * 0.6);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// The band-passed noise "tick" — the plastic-on-plastic contact riding the body.
function tick(ac, t, { freq, q, level, dur }) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + dur + 0.005);
}

// `strength` (0..1) lets a big button (Generate) hit a touch harder than a small
// pill — a subtle size cue, all one material.

// "Ka" — the down-stroke. Light, bright and quick: the key breaking free and
// starting to travel. Higher pitched and thinner than the release.
export function playPress(strength = 1) {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const t = ac.currentTime;
  const s = 0.11 * strength;
  body(ac, t, { f0: 250 - 40 * strength, drop: 140, level: s * 0.7, attack: 0.0015, dur: 0.026 });
  tick(ac, t, { freq: 3900, q: 1.3, level: s * 0.95, dur: 0.011 });
}

// "Tick" — a DETENT, not a button: the chord wheel's barrel indexing as each
// name passes through the window. Same materials, much less of them — a third
// the level of a press, a shorter body and a drier contact, because a detent is
// a sprung ball dropping into a notch, not a key travelling. It fires several
// times a second during a spin, so anything with a tail would smear.
export function playTick() {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const t = ac.currentTime;
  body(ac, t, { f0: 320, drop: 160, level: 0.035, attack: 0.001, dur: 0.014 });
  tick(ac, t, { freq: 5200, q: 2.2, level: 0.05, dur: 0.007 });
}

// "Chunk" — the release. Deeper, fuller and a hair longer: the spring seating the
// mechanism home. This is the satisfying half.
export function playRelease(strength = 1) {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const t = ac.currentTime;
  const s = 0.13 * strength;
  body(ac, t, { f0: 150 - 30 * strength, drop: 90, level: s, attack: 0.003, dur: 0.05 });
  tick(ac, t, { freq: 2200, q: 0.9, level: s * 0.55, dur: 0.02 });
}
