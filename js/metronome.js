// metronome.js — click track + playhead, on raw Web Audio (no dependencies).
//
// Timing uses the standard lookahead scheduler: a coarse setTimeout wakes up
// often and schedules the next slice of clicks at *exact* audio-clock times.
// setTimeout alone is far too jittery to keep a beat.
//
// The visual playhead is driven off the audio clock in a rAF loop rather than
// from the scheduler callback — the scheduler runs ~120ms ahead of what you
// hear, so highlighting there would run visibly early.

const LOOKAHEAD_MS = 25;      // how often the scheduler wakes
const SCHEDULE_AHEAD = 0.12;  // seconds of audio queued in advance
const SLOTS_PER_BAR = 8;      // 8th notes

export const BPM_MIN = 40;
export const BPM_MAX = 160;
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

  let bpm = DEFAULT_BPM;
  let bars = 1;
  let step = 0;            // 8th index into the loop
  let countRemaining = 0;  // count-in 8ths left
  let nextSlotTime = 0;
  const queue = [];        // {time, step|null, count}

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

      if (isBeatSlot(slotInBar)) {
        click(nextSlotTime, { accent: slotInBar === 0, countIn: inCountIn });
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

    async start(barCount) {
      if (running) return;
      // Created/resumed inside the click handler — iOS Safari stays silent
      // otherwise.
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state !== "running") await ctx.resume();

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
