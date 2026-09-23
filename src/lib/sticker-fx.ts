import { useWgoStore } from "@/lib/store";

export type StickerFx =
  | "hearts"
  | "confetti"
  | "disco"
  | "shake"
  | "flame"
  | "flash"
  | "heartwave"
  | "rays"
  | "notes"
  | "crown"
  | "steam"
  | "ring"
  | "moment-bravo"
  | "moment-alert"
  | "moment-love"
  | "moment-wipp";
export type StickerSound =
  | "whoosh"
  | "mwah"
  | "laugh"
  | "dundun"
  | "bling"
  | "alarm"
  | "beat"
  | "jingle"
  | "hiss"
  | "party"
  | "clap"
  | "bonk"
  | "zip"
  | "ching"
  | "pop"
  | "crystal"
  | "boss"
  | "charge"
  | "notes"
  | "ding"
  | "arcade"
  | "tada"
  | "siren"
  | "clack"
  | "heart"
  | "film"
  | "ting";

let ctx: AudioContext | null = null;

function ac() {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ||= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, t: number, dur: number, type: OscillatorType, gain = 0.08) {
  const audio = ac();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(t: number, dur: number, gain = 0.05) {
  const audio = ac();
  if (!audio) return;
  const n = Math.floor(audio.sampleRate * dur);
  const buf = audio.createBuffer(1, n, audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = audio.createBufferSource();
  src.buffer = buf;
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 800;
  const g = audio.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(audio.destination);
  src.start(t);
}

function playSound(kind: StickerSound) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime;
  if (kind === "whoosh") {
    noise(t, 0.28, 0.06);
    return;
  }
  if (kind === "mwah") {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(640, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.22);
    return;
  }
  if (kind === "laugh") {
    tone(420, t, 0.08, "triangle", 0.06);
    tone(360, t + 0.1, 0.08, "triangle", 0.05);
    tone(480, t + 0.2, 0.1, "triangle", 0.05);
    return;
  }
  if (kind === "dundun") {
    tone(140, t, 0.16, "sine", 0.1);
    tone(98, t + 0.18, 0.22, "sine", 0.1);
    return;
  }
  if (kind === "bling") {
    tone(880, t, 0.12, "sine", 0.06);
    tone(1320, t + 0.08, 0.16, "triangle", 0.05);
    return;
  }
  if (kind === "alarm") {
    tone(740, t, 0.08, "square", 0.04);
    tone(560, t + 0.1, 0.08, "square", 0.04);
    tone(740, t + 0.2, 0.08, "square", 0.03);
    return;
  }
  if (kind === "beat") {
    tone(90, t, 0.1, "sine", 0.1);
    tone(180, t + 0.22, 0.06, "triangle", 0.04);
    tone(90, t + 0.44, 0.1, "sine", 0.08);
    return;
  }
  if (kind === "hiss") {
    noise(t, 0.35, 0.07);
    return;
  }
  if (kind === "party") {
    tone(660, t, 0.08, "square", 0.04);
    tone(880, t + 0.09, 0.1, "triangle", 0.05);
    noise(t + 0.05, 0.12, 0.04);
    return;
  }
  if (kind === "clap") {
    noise(t, 0.05, 0.08);
    noise(t + 0.12, 0.05, 0.07);
    noise(t + 0.24, 0.06, 0.08);
    return;
  }
  if (kind === "bonk") {
    tone(180, t, 0.08, "sine", 0.09);
    tone(90, t + 0.06, 0.12, "triangle", 0.05);
    return;
  }
  if (kind === "zip") {
    noise(t, 0.16, 0.05);
    tone(1400, t, 0.12, "sawtooth", 0.02);
    return;
  }
  if (kind === "ching") {
    tone(988, t, 0.08, "sine", 0.06);
    tone(1318, t + 0.06, 0.14, "triangle", 0.05);
    tone(1976, t + 0.1, 0.12, "sine", 0.03);
    return;
  }
  if (kind === "pop") {
    tone(220, t, 0.06, "sine", 0.08);
    tone(880, t + 0.05, 0.1, "triangle", 0.05);
    noise(t + 0.04, 0.08, 0.05);
    return;
  }
  if (kind === "crystal") {
    tone(1568, t, 0.08, "sine", 0.04);
    tone(2093, t + 0.06, 0.12, "triangle", 0.03);
    return;
  }
  if (kind === "boss") {
    tone(196, t, 0.1, "square", 0.05);
    tone(392, t + 0.08, 0.12, "triangle", 0.04);
    return;
  }
  if (kind === "charge") {
    tone(220, t, 0.16, "sine", 0.04);
    tone(440, t + 0.12, 0.16, "sine", 0.04);
    tone(880, t + 0.26, 0.14, "triangle", 0.04);
    return;
  }
  if (kind === "notes") {
    tone(523, t, 0.1, "triangle", 0.05);
    tone(659, t + 0.12, 0.14, "sine", 0.04);
    return;
  }
  if (kind === "ding") {
    tone(1174, t, 0.14, "sine", 0.06);
    return;
  }
  if (kind === "arcade") {
    tone(440, t, 0.06, "square", 0.03);
    tone(554, t + 0.07, 0.06, "square", 0.03);
    tone(659, t + 0.14, 0.1, "square", 0.03);
    return;
  }
  if (kind === "tada") {
    tone(523, t, 0.1, "triangle", 0.05);
    tone(784, t + 0.1, 0.16, "sine", 0.05);
    return;
  }
  if (kind === "siren") {
    tone(620, t, 0.16, "sawtooth", 0.03);
    tone(880, t + 0.16, 0.16, "sawtooth", 0.03);
    tone(620, t + 0.32, 0.16, "sawtooth", 0.025);
    return;
  }
  if (kind === "clack") {
    tone(180, t, 0.05, "square", 0.05);
    noise(t, 0.06, 0.04);
    return;
  }
  if (kind === "heart") {
    tone(90, t, 0.12, "sine", 0.08);
    tone(90, t + 0.28, 0.14, "sine", 0.06);
    return;
  }
  if (kind === "film") {
    noise(t, 0.05, 0.08);
    noise(t + 0.08, 0.04, 0.05);
    return;
  }
  if (kind === "ting") {
    tone(1318, t, 0.16, "sine", 0.035);
    return;
  }
  tone(523, t, 0.12, "triangle", 0.06);
  tone(659, t + 0.12, 0.12, "triangle", 0.05);
  tone(784, t + 0.24, 0.16, "sine", 0.05);
  tone(1046, t + 0.4, 0.2, "sine", 0.04);
}

export function playStickerCue(
  row: { fx?: StickerFx; sound?: StickerSound; moment?: "bravo" | "alert" | "love" | "wipp" },
  loud: boolean,
) {
  const a11y = useWgoStore.getState().a11y;
  if (a11y?.reduceMotion) return;
  const fx = row.moment ? (`moment-${row.moment}` as StickerFx) : row.fx;
  if (loud && fx) {
    window.dispatchEvent(new CustomEvent("wipp-sticker-fx", { detail: fx }));
  }
  if (loud && row.sound && a11y?.stickerSound !== false) playSound(row.sound);
}
