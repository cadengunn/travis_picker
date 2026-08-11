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

// TWO TONES OVER ONE ENGINE (session 44). His report: the shipped sound is "a
// bit twangy, almost harpsichord like in some cases" — which is an accurate
// description of canonical Karplus-Strong, and the treble voice was exactly
// that: no `brightness` key at all, so it ran at 1 (the open, metallic end).
// `TONES` in data.js is the menu; these are the knobs.
//
// In both tones the BASS is palm-muted — the classic Travis thumb sound, a
// short dark thump rather than a ringing note. `brightness` is the mute knob
// (lower = darker; 1 = canonical KS), `decay`/`seconds` set how short the
// thump is, and `gain` is nudged up as a voice darkens because darker and
// shorter both read quieter.
//
// NYLON vs STEEL is three coordinated moves, not one: a nylon string has far
// less high-harmonic content (lower `brightness`), less sustain (lower
// `decay`, shorter `seconds`), and a softer attack — the last one comes free,
// since `ksBuffer` pre-smooths the excitation in proportion to `1 - brightness`.
// Tune by ear on a phone; nothing here is derived from anything.
const VOICES = {
  steel: {
    bass:   { decay: 0.986, seconds: 0.55, gain: 0.38, brightness: 0.37 },
    treble: { decay: 0.996, seconds: 0.80, gain: 0.24 },
  },
  nylon: {
    // Treble: brightness 0.60 puts two smoothing passes on the attack and rolls
    // the harmonics off well below steel's canonical 1, without going as dead as
    // the palm-muted bass at 0.37. Shorter decay/seconds because nylon simply
    // doesn't ring as long; gain up to 0.30 to pay for the lost highs.
    bass:   { decay: 0.984, seconds: 0.52, gain: 0.40, brightness: 0.33 },
    treble: { decay: 0.991, seconds: 0.70, gain: 0.30, brightness: 0.60 },
  },
};

export const DEFAULT_TONE = "steel";

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

  // THE TONE IS PART OF THE CACHE KEY, and that is not optional: the cache is
  // what makes this cheap (a few dozen distinct pitches, each rendered once),
  // so keying only on pitch would hand back the steel buffer forever after a
  // switch to nylon and the toggle would look broken for every note already
  // played. A test drives exactly this.
  const cache = new Map(); // `${round(freq)}:${bass}:${tone}` -> AudioBuffer
  let tone = DEFAULT_TONE;

  const voiceFor = (bass) => (VOICES[tone] || VOICES[DEFAULT_TONE])[bass ? "bass" : "treble"];

  function bufferFor(freq, bass) {
    const key = `${Math.round(freq)}:${bass ? 1 : 0}:${tone}`;
    let buf = cache.get(key);
    if (!buf) {
      buf = ksBuffer(ctx, freq, voiceFor(bass));
      cache.set(key, buf);
    }
    return buf;
  }

  return {
    // Swap timbre. Cheap and safe mid-take: buffers already rendered stay in the
    // cache under their own key, and notes already SCHEDULED keep the sound they
    // were scheduled with — the change lands on the next slot the lookahead
    // scheduler fills, exactly like `setSwing`.
    setTone(next) {
      if (VOICES[next]) tone = next;
    },
    // Schedule one pluck at an exact audio-clock `time`. Called from the
    // metronome's lookahead scheduler alongside the clicks.
    pluck(freq, time, { bass = false } = {}) {
      if (!Number.isFinite(freq) || freq <= 0) return; // skip malformed events
      const src = ctx.createBufferSource();
      src.buffer = bufferFor(freq, bass);
      const g = ctx.createGain();
      g.gain.value = voiceFor(bass).gain;
      src.connect(g);
      g.connect(bus);
      src.start(time);
    },
  };
}
