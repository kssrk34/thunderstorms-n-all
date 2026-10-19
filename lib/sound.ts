"use client";

import { devicePrefs } from "./device";

/**
 * Small synthesised sounds (no audio files): a soft electric zap when Aura
 * Points land, and a rising chord for level-ups. Quiet by design, and silent
 * when muted in settings.
 */
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (!devicePrefs().sound || typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, { freq, to, start, dur, gain, type = "sine" }: { freq: number; to?: number; start: number; dur: number; gain: number; type?: OscillatorType }) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** A crackle of filtered noise plus a quick upward chirp. */
export function playZap() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const len = Math.floor(a.sampleRate * 0.09);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const noise = a.createBufferSource();
  noise.buffer = buf;
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const ng = a.createGain();
  ng.gain.value = 0.05;
  noise.connect(hp).connect(ng).connect(a.destination);
  noise.start(t);
  tone(a, { freq: 520, to: 1560, start: t, dur: 0.16, gain: 0.05, type: "triangle" });
  tone(a, { freq: 1040, to: 2080, start: t + 0.05, dur: 0.12, gain: 0.025 });
}

export function playLevelUp() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(a, { freq: f, start: t + i * 0.09, dur: 0.5, gain: 0.04, type: "triangle" }));
}
