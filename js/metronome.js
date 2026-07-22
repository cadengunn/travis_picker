// metronome.js — click track + pattern playback + playhead, on raw Web Audio.
//
// Timing uses the standard lookahead scheduler: a coarse setTimeout wakes up
// often and schedules the next slice of events at *exact* audio-clock times.
// setTimeout alone is far too jittery to keep a beat.
//
// Pattern playback rides the SAME scheduler: at each 8th-note slot it schedules
// the plucked-string notes for that step (from a step->notes table set via
// setNotes) alongside the click, so there's one clock, not two. The click and
// the pattern are independent on/off toggles (setClickEnabled/setPatternEnabled)
// — the count-in always clicks so you get an audible 1-2-3-4 even pattern-only.
//
// The visual playhead is driven off the audio clock in a rAF loop rather than
// from the scheduler callback — the scheduler runs ~120ms ahead of what you
// hear, so highlighting there would run visibly early.

import { createStringSynth, midiToFreq } from "./synth.js";

const LOOKAHEAD_MS = 25;      // how often the scheduler wakes
// Seconds of audio queued in advance. Must stay comfortably longer than one
// 8th note at the fastest tempo (0.125s at 240bpm) or a hiccup in setTimeout
// lands a click late; the playhead reads the audio clock, so a wider window
// costs nothing visually — only how fast a BPM change takes effect.
const SCHEDULE_AHEAD = 0.2;
const SLOTS_PER_BAR = 8;      // 8th notes

export const BPM_MIN = 40;
// 240 because Travis/fingerstyle repertoire runs fast — 160 topped out well
// short of the tunes this is for practising.
export const BPM_MAX = 240;
export const DEFAULT_BPM = 90;

// --- pure helpers (unit-tested) ---
export const secondsPerSlot = (bpm) => 30 / bpm;          // an 8th = half a beat
export const isBeatSlot = (slotInBar) => slotInBar % 2 === 0; // 0,2,4,6 -> beats 1..4

// step (a global 8th counter) -> where the playhead sits
export function stepToPosition(step) {
  return { bar: Math.floor(step / SLOTS_PER_BAR), slot: (step % SLOTS_PER_BAR) + 1 };
}

export function createMetronome({ onStep = () => {}, onCountIn = () => {} } = {}) {
  let ctx = null;
  let timer = null;
  let raf = null;
  let running = false;

  let synth = null;        // plucked-string voice, created with the ctx

  let bpm = DEFAULT_BPM;
  let bars = 1;
  let step = 0;            // 8th index into the loop
  let countRemaining = 0;  // count-in 8ths left
  let nextSlotTime = 0;
  const queue = [];        // {time, step|null, count}

  let notes = [];          // step -> [{ midi, bass }] for pattern playback
  let clickOn = true;      // emit the metronome click on beats
  let patternOn = true;    // emit the plucked pattern notes

  const slotsTotal = () => bars * SLOTS_PER_BAR;

  // Short percussive blip. Accent (beat 1) and count-in are pitched up so you
  // can hear where you are without looking.
  function click(time, { accent = false, countIn = false } = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = countIn ? 1250 : accent ? 1000 : 720;
    const peak = countIn ? 0.35 : accent ? 0.5 : 0.3;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  function scheduler() {
    while (nextSlotTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const inCountIn = countRemaining > 0;
      const slotInBar = inCountIn ? SLOTS_PER_BAR - countRemaining : step % SLOTS_PER_BAR;

      // Count-in always clicks (the audible 1-2-3-4); the running beat click is
      // gated by the toggle so pattern-only playback is silent between notes.
      if (isBeatSlot(slotInBar) && (inCountIn || clickOn)) {
        click(nextSlotTime, { accent: slotInBar === 0, countIn: inCountIn });
      }
      // Pattern notes for this step, scheduled at the same exact audio time as
      // the click. Stacked events (pinches/double stops) share one slot and so
      // sound together. Never during the count-in.
      if (!inCountIn && patternOn && synth) {
        for (const note of notes[step] || []) {
          synth.pluck(midiToFreq(note.midi), nextSlotTime, { bass: note.bass });
        }
      }
      queue.push({
        time: nextSlotTime,
        step: inCountIn ? null : step,
        count: inCountIn ? Math.floor(slotInBar / 2) + 1 : null,
      });

      nextSlotTime += secondsPerSlot(bpm);
      if (inCountIn) countRemaining--;
      else step = (step + 1) % slotsTotal();
    }
    timer = setTimeout(scheduler, LOOKAHEAD_MS);
  }

  // Report the most recent slot whose audio time has actually arrived.
  function frame() {
    if (!running) return;
    const now = ctx.currentTime;
    let current = null;
    while (queue.length && queue[0].time <= now) current = queue.shift();
    if (current) {
      if (current.step === null) onCountIn(current.count);
      else onStep(stepToPosition(current.step));
    }
    raf = requestAnimationFrame(frame);
  }

  return {
    get running() { return running; },
    get bpm() { return bpm; },

    setBpm(next) {
      bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(next)));
      return bpm;
    },

    // Called when the number of bars on screen changes.
    setBars(n) {
      bars = Math.max(1, n);
      if (step >= slotsTotal()) step = 0;
    },

    // step -> [{ midi, bass }]. Rebuilt by the app on every render, so edits,
    // re-rolls and chord changes are reflected without touching the transport.
    setNotes(table) {
      notes = table || [];
    },
    setClickEnabled(on) {
      clickOn = !!on;
    },
    setPatternEnabled(on) {
      patternOn = !!on;
    },

    async start(barCount) {
      if (running) return;
      // Created/resumed inside the click handler — iOS Safari stays silent
      // otherwise.
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state !== "running") await ctx.resume();
      synth = synth || createStringSynth(ctx); // lazy: needs the unlocked ctx

      bars = Math.max(1, barCount);
      step = 0;
      countRemaining = SLOTS_PER_BAR; // one bar of count-in
      queue.length = 0;
      nextSlotTime = ctx.currentTime + 0.08;
      running = true;
      scheduler();
      raf = requestAnimationFrame(frame);
    },

    stop() {
      running = false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      queue.length = 0;
      onStep(null);
      onCountIn(null);
    },
  };
}
