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

import { createStringSynth, midiToFreq, DEFAULT_TONE } from "./synth.js";

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

// THE INTERMITTENT-PLAY BUG (session 32). iOS gives an AudioContext a third
// state beyond running/suspended: "interrupted" — a phone call, Siri, or another
// app taking the audio session. A context in that state can leave `resume()`
// PENDING FOREVER, and `running = true` sits after that await in start(). So the
// transport never started, and because togglePlay() branches on `running`, every
// later press re-entered the same start path: Play looked dead until the app was
// backgrounded and foregrounded, which is iOS clearing the interruption.
//
// Three defences, in order: the resume is caught, it's RACED AGAINST A TIMEOUT so
// it can never hang the click handler, and if the context still isn't running
// it's thrown away and rebuilt — an interrupted context often can't be revived at
// all, only replaced. Rebuilding is exactly what leaving and returning was doing
// by hand. start() reports success as a boolean and never throws, so the UI can
// always put the button back.
// INJECTABLE via createMetronome({ resumeTimeoutMs }) only so the tests don't
// sleep on the wall clock — the "resume that never settles" check has to wait out
// a real timeout to prove the race works. The app never passes it.
const RESUME_TIMEOUT_MS = 1500;

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

// SWING PAIRS EACH BEAT WITH ITS "&", and nothing else. The & moves late and
// beats 1-4 stay exactly where they were, so the thumb stays metronomic — which
// is the whole technique this app is for.
//
// A second resolution was built and trialled (v2.13.0-.1): pairing beat 1 with 2
// and 3 with 4, so beats 2 and 4 moved and the THUMB itself swung. It worked,
// and it's a real feel — but it's a shuffle, not Travis picking, and the user
// cut it on those grounds after playing with it. Don't rebuild it without that
// argument changing; the git history has the implementation if it ever comes up.
//
// How long slot `slotInBar` (0-7) lasts. The bar's TOTAL is invariant — each
// pair sums to two plain 8ths whatever the ratio — which is what keeps BPM
// meaning exactly what it means with swing off, and leaves the count-in a full
// bar. A test asserts it.
export function slotSeconds(slotInBar, bpm, swing = DEFAULT_SWING) {
  const ratio = clampSwing(swing) / 100;
  return 2 * secondsPerSlot(bpm) * (isBeatSlot(slotInBar) ? ratio : 1 - ratio);
}

// step (a global 8th counter) -> where the playhead sits
export function stepToPosition(step) {
  return { bar: Math.floor(step / SLOTS_PER_BAR), slot: (step % SLOTS_PER_BAR) + 1 };
}

// AUDIO-bar (this module's own bar counter, doubled under ×2 mode) -> which
// SCREEN bar that is and which pass through it (0 = first, 1 = second). Pure so
// it's testable without a real metronome; this module doesn't know ×2 exists,
// it just answers "given N audio-bars per screen-bar, where is bar B" — app.js
// is the only caller and is what decides passesPerBar.
export function splitAudioBar(bar, passesPerBar) {
  return { bar: Math.floor(bar / passesPerBar), pass: bar % passesPerBar };
}

export function createMetronome({
  onStep = () => {},
  onCountIn = () => {},
  resumeTimeoutMs = RESUME_TIMEOUT_MS,
} = {}) {
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
  // Held HERE as well as in the synth, because the synth is lazy and is thrown
  // away with a dead context (`dropContext`) — without this, recovering from an
  // interrupted audio session would silently reset the tone to the default.
  let tone = DEFAULT_TONE;

  const slotsTotal = () => bars * SLOTS_PER_BAR;

  function newContext() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return new Ctor();
  }

  // Let go of a context we can't use. The synth goes with it: its buffer cache
  // holds AudioBuffers created BY that context, which are useless to any other.
  function dropContext() {
    const dead = ctx;
    ctx = null;
    synth = null;
    try { dead?.close?.(); } catch { /* already closed, or refusing to */ }
  }

  // Resolve true only if the context is actually running by the time we give up
  // on it — a rejected resume and one that never settles are the same outcome
  // here, and both must be an answer rather than a hang (see RESUME_TIMEOUT_MS).
  async function resumeContext() {
    if (!ctx) return false;
    if (ctx.state === "running") return true;
    try {
      await Promise.race([
        ctx.resume(),
        new Promise((resolve) => setTimeout(resolve, resumeTimeoutMs)),
      ]);
    } catch { /* treated as "didn't resume" */ }
    return ctx.state === "running";
  }

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
      nextSlotTime += slotSeconds(slotInBar, bpm, swing);
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
    setSwing(pct) {
      swing = clampSwing(pct);
      return swing;
    },

    // Same "takes effect on the next scheduled slot" contract as setSwing, so
    // you can A/B nylon against steel mid-loop and hear it move.
    setTone(id) {
      tone = id;
      synth?.setTone(id);
    },

    // What the audio hardware thinks it's doing: "running", "suspended",
    // "interrupted" (iOS), or "none" before the first play. Diagnostic only —
    // nothing in the app branches on it.
    get audioState() { return ctx ? ctx.state : "none"; },

    // Called on every return to foreground. If the context went bad while we
    // were away, repair it — or discard it so the NEXT Play builds a fresh one
    // — instead of leaving the user to discover a dead button. This is the
    // automated version of "leave the app and come back".
    async recoverAudio() {
      if (running || !ctx || ctx.state === "running") return false;
      if (await resumeContext()) return true;
      dropContext();
      return false;
    },

    // Resolves TRUE if the transport actually started. It never throws and never
    // hangs: a failed start has to be reportable, or the Play button is left
    // lying about the state of the app (which is precisely the bug — see
    // RESUME_TIMEOUT_MS above).
    async start(barCount) {
      if (running) return true;
      // Created/resumed inside the click handler — iOS Safari stays silent
      // otherwise.
      ctx = ctx || newContext();
      if (!(await resumeContext())) {
        dropContext();              // unrevivable; a brand new one usually works
        ctx = newContext();
        if (!(await resumeContext())) return false;
      }
      if (!synth) {                            // lazy: needs the unlocked ctx
        synth = createStringSynth(ctx);
        synth.setTone(tone);                   // re-apply across a context rebuild
      }

      bars = Math.max(1, barCount);
      step = 0;
      countRemaining = countInOn ? SLOTS_PER_BAR : 0; // one bar of count-in, if enabled
      queue.length = 0;
      nextSlotTime = ctx.currentTime + 0.08;
      running = true;
      scheduler();
      raf = requestAnimationFrame(frame);
      return true;
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
