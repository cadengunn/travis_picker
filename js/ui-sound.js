// ui-sound.js — a small, satisfying "click" when you press a hardware button, so
// the controls feel like real switches to match their carved/push-in look.
//
// Dependency-free raw Web Audio, same house style as synth.js/metronome.js (no
// library — this is an offline PWA). A physical button click is two things: a
// tight high "tick" (the contact) plus a short low "thock" (the body), each a
// fast gain envelope. We render them live from an oscillator + a tiny noise
// burst — no samples to precache.
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

// A single press click. `strength` (0..1) lets a big button (Generate) thock a
// touch deeper than a small pill — a subtle size cue, all one material.
export function playClick(strength = 1) {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const t = ac.currentTime;
  const level = 0.12 * strength; // quiet on purpose — a tick, not a beep

  // Body "thock": a fast-decaying low triangle, pitch dropping slightly for a
  // woody, un-electronic feel.
  const osc = ac.createOscillator();
  osc.type = "triangle";
  const f0 = 190 - 40 * strength;
  osc.frequency.setValueAtTime(f0 + 90, t);
  osc.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(level, t + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.07);

  // Contact "tick": a very short band-passed noise burst on top of the thock.
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 0.8;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(level * 0.6, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  src.connect(bp).connect(ng).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.03);
}
