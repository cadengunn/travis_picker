// synth.js — plucked-string voice, dependency-free (Karplus-Strong).
//
// Settling the roadmap's raw-Web-Audio-vs-synth-library question in favour of no
// dependency: a Karplus-Strong pluck is a noise burst run through a short delay
// line with an averaging low-pass in the feedback path, and it genuinely sounds
// like a plucked string. We render each pluck OFFLINE into an AudioBuffer (plain
// JS filling a Float32Array) and play it with a BufferSource — no AudioWorklet,
// no deprecated ScriptProcessor, works on iOS Safari.
//
// There are only a couple dozen distinct pitches across the chord library, so
// buffers are cached per (pitch, bass) and generated once, lazily. All voices
// share one DynamicsCompressor bus so a triple stop plus the thumb can't clip.

export const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Karplus-Strong render.
//   decay      per-sample feedback factor — closer to 1 rings longer.
//   seconds    how much tail to render (capped by the fade below).
//   brightness in-loop low-pass cutoff, 1..0. At 1 it's canonical KS (open, a
//              little metallic); lowering it darkens the tone and damps the
//              harmonics faster than the fundamental — which is exactly what a
//              palm resting on the strings does. This is the palm-mute knob for
//              the bass; the excitation is also pre-smoothed so the attack is
//              dull rather than a bright pluck transient.
function ksBuffer(ctx, freq, { decay, seconds, brightness = 1 }) {
  const sr = ctx.sampleRate;
  const n = Math.max(2, Math.round(sr / freq)); // delay length sets the pitch
  const len = Math.max(n + 1, Math.ceil(sr * seconds));
  const buffer = ctx.createBuffer(1, len, sr);
  const out = buffer.getChannelData(0);

  // Pluck excitation. A palm-muted note has a soft, dull attack, so for a dark
  // voice we smooth the noise burst a few times to take the bright transient
  // off the front (none of this runs for the bright default, brightness = 1).
  const line = new Float32Array(n);
  for (let i = 0; i < n; i++) line[i] = Math.random() * 2 - 1;
  for (let p = 0, passes = Math.round((1 - brightness) * 4); p < passes; p++) {
    let prev = line[n - 1];
    for (let i = 0; i < n; i++) {
      const cur = line[i];
      line[i] = (prev + cur) * 0.5;
      prev = cur;
    }
  }

  // Loop: canonical KS averaging (the string), then a one-pole low-pass whose
  // coefficient is `brightness` (1 = no extra filtering). The low-pass leaves DC
  // untouched, so the fundamental survives while the highs die — the muted thump.
  let idx = 0;
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const cur = line[idx];
    const next = line[(idx + 1) % n];
    out[i] = cur;
    const ks = (cur + next) * 0.5 * decay; // averaging low-pass + energy loss
    lp += brightness * (ks - lp);
    line[idx] = brightness < 1 ? lp : ks;
    idx = (idx + 1) % n;
  }

  // Fade the last ~50ms to zero. `decay` rings ~4x longer on a low string than
  // a high one (the low delay line cycles fewer times per second), so a fixed
  // `seconds` can cut a bass note off mid-ring — the fade keeps that truncation
  // from clicking, and lets `seconds` be set purely for how long a pluck lasts.
  const fade = Math.min(len, Math.round(sr * 0.05));
  for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;

  return buffer;
}

// Palm-muted bass — the classic Travis thumb sound: a short, dark thump, not a
// ringing note. `brightness` is the mute knob (lower = more muted/darker; raise
// toward 1 for an open, ringing bass); `decay`/`seconds` set how short the thump
// is. Gain nudged up because darker + shorter reads quieter.
const BASS_VOICE = { decay: 0.986, seconds: 0.55, gain: 0.38, brightness: 0.37 };
const TREBLE_VOICE = { decay: 0.996, seconds: 0.8, gain: 0.24 };

// Build a synth bound to one AudioContext. Created lazily by the metronome right
// after the context (inside the Play gesture, so iOS unlocks audio).
export function createStringSynth(ctx) {
  // Gentle limiter so simultaneous notes stay clean without hand-tuned mixing.
  const bus = ctx.createDynamicsCompressor();
  bus.threshold.value = -14;
  bus.ratio.value = 4;
  bus.attack.value = 0.003;
  bus.release.value = 0.25;
  bus.connect(ctx.destination);

  const cache = new Map(); // `${round(freq)}:${bass}` -> AudioBuffer

  function bufferFor(freq, bass) {
    const key = `${Math.round(freq)}:${bass ? 1 : 0}`;
    let buf = cache.get(key);
    if (!buf) {
      buf = ksBuffer(ctx, freq, bass ? BASS_VOICE : TREBLE_VOICE);
      cache.set(key, buf);
    }
    return buf;
  }

  return {
    // Schedule one pluck at an exact audio-clock `time`. Called from the
    // metronome's lookahead scheduler alongside the clicks.
    pluck(freq, time, { bass = false } = {}) {
      if (!Number.isFinite(freq) || freq <= 0) return; // skip malformed events
      const src = ctx.createBufferSource();
      src.buffer = bufferFor(freq, bass);
      const g = ctx.createGain();
      g.gain.value = bass ? BASS_VOICE.gain : TREBLE_VOICE.gain;
      src.connect(g);
      g.connect(bus);
      src.start(time);
    },
  };
}
