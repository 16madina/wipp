#!/usr/bin/env node
/**
 * Original 10s loops for Wipp story music — not commercial tracks.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const SR = 22050;
const SECONDS = 10;
const N = SR * SECONDS;
const OUT = "/workspace/public/music";

function freq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
function clamp(x) {
  return Math.max(-1, Math.min(1, x));
}
function env(t, a, d, s, r, dur) {
  if (t < 0 || t > dur) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  return s * Math.max(0, 1 - (t - (dur - r)) / r);
}
function noise() {
  return Math.random() * 2 - 1;
}

function render(spec) {
  const L = new Float32Array(N);
  const beat = 60 / spec.bpm;
  const bar = beat * 4;

  const kickAt = [];
  const snareAt = [];
  const hatAt = [];
  for (let t = 0; t < SECONDS; t += beat / spec.hatDiv) {
    hatAt.push(t + (spec.swing && Math.round(t / (beat / spec.hatDiv)) % 2 ? beat * 0.04 : 0));
  }
  for (let i = 0; i < SECONDS / beat; i++) {
    const t = i * beat;
    if (spec.kick.includes(i % 4) || (spec.kickOff && spec.kickOff.includes(+(i % 4).toFixed(2)))) kickAt.push(t);
    if (spec.snare.includes(i % 4)) snareAt.push(t);
  }
  if (spec.kickOff) {
    for (let t = 0; t < SECONDS; t += beat) {
      for (const off of spec.kickOff) kickAt.push(t + off * beat);
    }
  }

  function addKick(t0) {
    const dur = 0.18;
    const a0 = Math.floor(t0 * SR);
    for (let i = 0; i < dur * SR; i++) {
      const t = i / SR;
      const f = 148 * Math.exp(-t * 22) + 42;
      const s = Math.sin(2 * Math.PI * f * t) * env(t, 0.002, 0.04, 0.35, 0.1, dur);
      const j = a0 + i;
      if (j < N) L[j] += s * 0.95;
    }
  }
  function addSnare(t0) {
    const dur = 0.16;
    const a0 = Math.floor(t0 * SR);
    for (let i = 0; i < dur * SR; i++) {
      const t = i / SR;
      const s =
        (noise() * 0.72 + Math.sin(2 * Math.PI * 190 * t) * 0.28) * env(t, 0.001, 0.03, 0.25, 0.08, dur);
      const j = a0 + i;
      if (j < N) L[j] += s * spec.snareGain;
    }
  }
  function addHat(t0, open) {
    const dur = open ? 0.12 : 0.045;
    const a0 = Math.floor(t0 * SR);
    for (let i = 0; i < dur * SR; i++) {
      const t = i / SR;
      const s = noise() * env(t, 0.001, 0.01, 0.15, open ? 0.08 : 0.02, dur);
      const j = a0 + i;
      if (j < N) L[j] += s * spec.hatGain;
    }
  }

  for (const t of kickAt) if (t < SECONDS - 0.05) addKick(t);
  for (const t of snareAt) if (t < SECONDS - 0.05) addSnare(t);
  hatAt.forEach((t, i) => {
    if (t < SECONDS - 0.04) addHat(t, spec.openHats && i % 8 === 7);
  });

  // chords + bass
  for (let b = 0; b < SECONDS / bar; b++) {
    const chord = spec.chords[b % spec.chords.length];
    const t0 = b * bar;
    const a0 = Math.floor(t0 * SR);
    const samples = Math.floor(bar * SR);
    for (let i = 0; i < samples; i++) {
      const t = i / SR;
      const e = env(t, 0.02, 0.18, 0.7, 0.2, bar);
      let s = 0;
      for (const m of chord) {
        const f = freq(m);
        s += Math.sin(2 * Math.PI * f * t) * 0.22;
        s += Math.sin(2 * Math.PI * (f * 1.003) * t) * 0.1;
      }
      const bassF = freq(chord[0] - 12);
      const bassE = env(t % beat, 0.01, 0.08, 0.55, 0.12, beat);
      s += Math.sin(2 * Math.PI * bassF * t) * 0.42 * bassE;
      const j = a0 + i;
      if (j < N) L[j] += s * e * spec.padGain;
    }
    // melody
    if (spec.melody) {
      const notes = spec.melody[b % spec.melody.length];
      const step = bar / notes.length;
      notes.forEach((m, ni) => {
        if (m == null) return;
        const start = t0 + ni * step;
        const dur = step * 0.85;
        const a1 = Math.floor(start * SR);
        for (let i = 0; i < dur * SR; i++) {
          const t = i / SR;
          const f = freq(m);
          const s =
            (Math.sin(2 * Math.PI * f * t) * 0.55 + Math.sin(2 * Math.PI * f * 2 * t) * 0.12) *
            env(t, 0.01, 0.05, 0.6, 0.08, dur);
          const j = a1 + i;
          if (j < N) L[j] += s * spec.leadGain;
        }
      });
    }
  }

  // fade + limiter
  const fade = Math.floor(SR * 0.08);
  let peak = 1e-6;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]));
  const g = 0.89 / peak;
  const pcm = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) {
    let x = L[i] * g;
    if (i < fade) x *= i / fade;
    if (i > N - fade) x *= (N - i) / fade;
    pcm.writeInt16LE(Math.round(clamp(x) * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const tracks = [
  {
    id: "gold-hour",
    bpm: 96,
    hatDiv: 2,
    kick: [0, 2],
    snare: [1, 3],
    snareGain: 0.38,
    hatGain: 0.12,
    padGain: 0.55,
    leadGain: 0.28,
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 67],
    ],
    melody: [
      [76, 74, 72, 74],
      [71, 72, 74, 76],
      [72, 74, 76, 79],
      [74, 72, 71, 67],
    ],
  },
  {
    id: "afterglow",
    bpm: 78,
    hatDiv: 2,
    swing: true,
    kick: [0, 2],
    kickOff: [0.75],
    snare: [1, 3],
    snareGain: 0.3,
    hatGain: 0.09,
    padGain: 0.7,
    leadGain: 0.22,
    chords: [
      [62, 65, 69],
      [58, 62, 65],
      [53, 57, 60],
      [60, 64, 67],
    ],
    melody: [
      [69, null, 72, 74],
      [72, 69, null, 65],
      [67, 69, 72, null],
      [74, 72, 69, 67],
    ],
  },
  {
    id: "terrasse",
    bpm: 108,
    hatDiv: 4,
    kick: [0, 2],
    kickOff: [0.75, 2.5],
    snare: [1, 3],
    snareGain: 0.36,
    hatGain: 0.14,
    openHats: true,
    padGain: 0.48,
    leadGain: 0.26,
    chords: [
      [66, 69, 73],
      [64, 68, 71],
      [62, 66, 69],
      [64, 68, 71],
    ],
    melody: [
      [78, 76, 73, 71],
      [73, 76, 78, 81],
      [78, 76, 73, 69],
      [71, 73, 76, 73],
    ],
  },
  {
    id: "ralenti",
    bpm: 74,
    hatDiv: 2,
    swing: true,
    kick: [0, 2],
    snare: [1, 3],
    snareGain: 0.22,
    hatGain: 0.08,
    padGain: 0.75,
    leadGain: 0.18,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
    ],
    melody: [
      [72, null, 71, 69],
      [67, 69, null, 64],
      [64, 67, 69, null],
      [71, 69, 67, 64],
    ],
  },
  {
    id: "heatwave",
    bpm: 122,
    hatDiv: 4,
    kick: [0, 1, 2, 3],
    snare: [1, 3],
    snareGain: 0.42,
    hatGain: 0.16,
    openHats: true,
    padGain: 0.4,
    leadGain: 0.3,
    chords: [
      [64, 67, 71],
      [60, 64, 67],
      [55, 59, 62],
      [62, 66, 69],
    ],
    melody: [
      [76, 79, 76, 74],
      [71, 74, 76, 79],
      [83, 79, 76, 74],
      [76, 74, 71, 67],
    ],
  },
  {
    id: "ville-calme",
    bpm: 70,
    hatDiv: 2,
    kick: [0],
    snare: [2],
    snareGain: 0.16,
    hatGain: 0.06,
    padGain: 0.85,
    leadGain: 0.16,
    chords: [
      [48, 52, 55, 59],
      [52, 55, 59, 62],
      [45, 48, 52, 55],
      [43, 47, 50, 55],
    ],
    melody: [
      [67, null, 64, null],
      [62, 64, null, 67],
      [69, null, 67, 64],
      [62, null, 59, 55],
    ],
  },
  {
    id: "pulse",
    bpm: 128,
    hatDiv: 4,
    kick: [0, 1, 2, 3],
    snare: [1, 3],
    snareGain: 0.4,
    hatGain: 0.18,
    padGain: 0.38,
    leadGain: 0.32,
    chords: [
      [57, 60, 64],
      [55, 59, 62],
      [53, 57, 60],
      [52, 56, 59],
    ],
    melody: [
      [72, 76, 79, 76],
      [74, 72, 69, 67],
      [72, 69, 72, 76],
      [71, 67, 64, 67],
    ],
  },
  {
    id: "minuit",
    bpm: 88,
    hatDiv: 2,
    kick: [0, 2],
    snare: [1, 3],
    snareGain: 0.28,
    hatGain: 0.1,
    padGain: 0.62,
    leadGain: 0.24,
    chords: [
      [50, 53, 57],
      [55, 59, 62],
      [48, 52, 55],
      [45, 48, 52],
    ],
    melody: [
      [69, 72, 74, 72],
      [67, 69, 72, 74],
      [76, 74, 72, 69],
      [67, 64, 62, 57],
    ],
  },
];

mkdirSync(OUT, { recursive: true });
for (const spec of tracks) {
  const wav = join(OUT, `${spec.id}.wav`);
  const mp3 = join(OUT, `${spec.id}.mp3`);
  writeFileSync(wav, render(spec));
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "22050", "-ac", "1", mp3],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(r.stderr);
    process.exit(1);
  }
  unlinkSync(wav);
  console.log("wrote", mp3);
}
