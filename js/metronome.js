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

// If the page is frozen — a locked screen, a backgrounded tab, a sleeping
// laptop — setTimeout stops firing while the audio clock keeps running, so
// nextSlotTime falls behind ctx.currentTime. Web Audio plays anything scheduled
// in the PAST immediately, so the plain catch-up loop below would dump every
// missed slot at once (the disjointed burst on unlock). Past this much drift we
// drop the missed slots and resume from where the clock actually is. app.js
// stops the transport on the way out (platform.js's playback guard); this is the
// backstop for a freeze nothing tells us about.
export const MAX_DRIFT = 0.25;                            // seconds, ≈2 8ths at the top tempo
export const hasDrifted = (nextSlotTime, now) => now - nextSlotTime > MAX_DRIFT;

// --- pure helpers (unit-tested) ---
export const secondsPerSlot = (bpm) => 30 / bpm;          // an 8th = half a beat
export const isBeatSlot = (slotInBar) => slotInBar % 2 === 0; // 0,2,4,6 -> beats 1..4

// --- swing ---
// A percentage: how much of each PAIR the first half gets. 50 = straight (both
// halves equal, i.e. swing off), 66.7 = triplet swing, 75 = extreme.
export const SWING_MIN = 50;
export const SWING_MAX = 75;
export const DEFAULT_SWING = SWING_MIN;
export const clampSwing = (n) => Math.min(SWING_MAX, Math.max(SWING_MIN, Math.round(Number(n) || SWING_MIN)));

// WHAT gets paired long-short, in slots. Two feels, being trialled side by side:
//   2 ("8ths")  — pairs each beat with its "&". The &s move late and beats 1-4
//                 stay put, so the THUMB stays metronomic: the classic shuffle.
//   4 ("beats") — pairs beat 1 with beat 2 and beat 3 with beat 4. Beats 2 and 4
//                 move late, so the thumb itself swings. This is the feel the
//                 user described ("2 moves further from 1 and closer to 3").
// Both divide 8 evenly, so the grouping never straddles a bar line.
export const SWING_UNITS = { eighths: 2, beats: 4 };
export const DEFAULT_SWING_UNIT = SWING_UNITS.eighths;

// How long slot `slotInBar` (0-7) lasts. The whole model is one line: a group of
// `unit` slots is split long-short, the first half taking `ratio` of it.
//
// The bar's TOTAL is invariant — each group sums to `unit * secondsPerSlot`
// whatever the ratio — which is what keeps BPM meaning exactly what it means
// with swing off, and leaves the count-in a full bar. A test asserts it.
export function slotSeconds(slotInBar, bpm, swing = DEFAULT_SWING, unit = DEFAULT_SWING_UNIT) {
  const ratio = clampSwing(swing) / 100;
  const inGroup = ((slotInBar % unit) + unit) % unit;
  const firstHalf = inGroup < unit / 2;
  return 2 * secondsPerSlot(bpm) * (firstHalf ? ratio : 1 - ratio);
}

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
  let countInOn = true;    // one bar of count-in before the loop starts
  let swing = DEFAULT_SWING;
  let swingUnit = DEFAULT_SWING_UNIT;

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
    // Resync rather than replay a backlog into the past (see hasDrifted above).
    // The queued playhead positions are stale too, so they go with it.
    if (hasDrifted(nextSlotTime, ctx.currentTime)) {
      nextSlotTime = ctx.currentTime + 0.02;
      queue.length = 0;
    }
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

      // Swing lives HERE and nowhere else: the slot's length depends on where it
      // sits in its group. Everything downstream is already time-driven — the
      // notes are scheduled at `nextSlotTime`, and the playhead reads the audio
      // clock — so the whole app follows for free. The count-in swings too,
      // which is right: it should tell you the feel you're counting into.
      nextSlotTime += slotSeconds(slotInBar, bpm, swing, swingUnit);
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
    setCountInEnabled(on) {
      countInOn = !!on;
    },

    // Takes effect on the next scheduled slot, so you can dial it while playing
    // and hear the change within the lookahead window (~0.2s) rather than having
    // to stop and restart. That's the point of a feel control you're hunting for.
    setSwing(pct, unit) {
      swing = clampSwing(pct);
      if (unit) swingUnit = unit;
      return swing;
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
      countRemaining = countInOn ? SLOTS_PER_BAR : 0; // one bar of count-in, if enabled
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
