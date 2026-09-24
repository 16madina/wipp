import { useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";
import { useWgoStore } from "@/lib/store";

export const DAY = [
  { id: "day_sun", fr: "Soleil", en: "Sun", ms: 4000 },
  { id: "day_coffee", fr: "Café du matin", en: "Morning coffee", ms: 4500 },
  { id: "day_sunflowers", fr: "Tournesols", en: "Sunflowers", ms: 4500 },
  { id: "day_hummingbird", fr: "Colibri", en: "Hummingbird", ms: 4000 },
  { id: "day_sunrise", fr: "Lever de soleil", en: "Sunrise", ms: 5000 },
  { id: "day_alarm", fr: "Réveil", en: "Alarm", ms: 3000 },
  { id: "day_butterflies", fr: "Papillons", en: "Butterflies", ms: 5000 },
  { id: "day_orange", fr: "Jus d’orange", en: "Orange juice", ms: 3500 },
  { id: "day_flower_arch", fr: "Portail fleuri", en: "Flower arch", ms: 5000 },
  { id: "day_cloud_heart", fr: "Cœur de nuages", en: "Cloud heart", ms: 5000 },
  { id: "day_bird", fr: "Oiseau joyeux", en: "Happy bird", ms: 4000 },
  { id: "day_balloons", fr: "Montgolfières", en: "Balloons", ms: 6000 },
] as const;

export type DayId = (typeof DAY)[number]["id"];

export function daySrc(id: string) {
  return `/fx/jour/${id}.png`;
}

export function dayLabel(id: string, lang: "fr" | "en") {
  const row = DAY.find((a) => a.id === id);
  if (!row) return id;
  return lang === "fr" ? row.fr : row.en;
}

const HERO: Record<string, number> = {
  day_sun: 46,
  day_coffee: 44,
  day_sunflowers: 46,
  day_hummingbird: 46,
  day_sunrise: 42,
  day_alarm: 44,
  day_orange: 46,
  day_flower_arch: 42,
  day_cloud_heart: 48,
  day_bird: 44,
};

const FLIES = [
  { left: 8, top: 72, size: 28, delay: 0, dur: 4.4, kind: "a" },
  { left: 78, top: 80, size: 16, delay: 0.35, dur: 4.6, kind: "b" },
  { left: 40, top: 64, size: 18, delay: 0.7, dur: 4.2, kind: "c" },
  { left: 62, top: 86, size: 13, delay: 1.05, dur: 4.5, kind: "a" },
  { left: 18, top: 58, size: 15, delay: 1.4, dur: 4.1, kind: "b" },
];

const BALLOONS = [
  { left: 8, size: 12, delay: 0.15, dur: 6.2, drift: 14, op: 0.45 },
  { left: 22, size: 18, delay: 0.55, dur: 5.8, drift: -8, op: 0.7 },
  { left: 48, size: 38, delay: 0.05, dur: 5.5, drift: 6, op: 1 },
  { left: 72, size: 15, delay: 0.85, dur: 6.1, drift: -12, op: 0.55 },
  { left: 86, size: 11, delay: 1.15, dur: 6.4, drift: 10, op: 0.4 },
];

const DOTS = Array.from({ length: 12 }, (_, i) => ({
  i,
  left: 6 + ((i * 13) % 88),
  top: 10 + ((i * 19) % 70),
  delay: (i % 6) * 0.25,
  size: 6 + (i % 3) * 4,
}));

function tone(notes: number[]) {
  const a11y = useWgoStore.getState().a11y;
  if (a11y?.stickerSound === false || a11y?.reduceMotion) return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + i * 0.14;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  });
  window.setTimeout(() => void ctx.close(), 1200);
}

export function DayFx({ id, onDone }: { id: string; onDone: () => void }) {
  const row = DAY.find((a) => a.id === id);
  const reduce = useWgoStore((s) => s.a11y?.reduceMotion);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!row || reduce) {
      done.current();
      return;
    }
    const tap = window.setTimeout(() => haptic(row.id === "day_alarm" ? "send" : "tap"), row.id === "day_alarm" ? 360 : 220);
    if (row.id === "day_alarm") tone([880, 1170]);
    if (row.id === "day_bird") tone([740, 880, 660]);
    const end = window.setTimeout(() => done.current(), row.ms);
    return () => {
      window.clearTimeout(tap);
      window.clearTimeout(end);
    };
  }, [row, reduce]);

  if (!row || reduce) return null;
  const copies = row.id === "day_butterflies" || row.id === "day_balloons";
  const petal = row.id === "day_sunflowers" || row.id === "day_flower_arch" ? (row.id === "day_flower_arch" ? "dy-petal dy-petal-white" : "dy-petal") : "";

  return (
    <div className="pointer-events-none absolute inset-0 z-[96] overflow-hidden fx-stage fx-stage-day" aria-hidden>
      <i className="fx-veil fx-veil-day" />
      <i className={`dy-glow dy-glow-${row.id}`} />
      <i className="fx-bloom fx-bloom-warm" />
      {row.id === "day_alarm"
        ? [0, 1, 2].map((i) => <i key={i} className="dy-ring" style={{ animationDelay: `${0.35 + i * 0.18}s` }} />)
        : null}
      {row.id === "day_sun" || row.id === "day_sunrise" || row.id === "day_cloud_heart"
        ? [0, 1, 2, 3, 4].map((i) => (
            <i key={i} className="dy-ray" style={{ rotate: `${i * 36}deg`, animationDelay: `${0.2 + i * 0.08}s` }} />
          ))
        : null}
      {petal
        ? DOTS.map((p) => (
            <i
              key={p.i}
              className={petal}
              style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size * 0.6, animationDelay: `${p.delay}s` }}
            />
          ))
        : null}
      {row.id === "day_coffee"
        ? DOTS.slice(0, 6).map((p) => (
            <i key={p.i} className="dy-steam" style={{ left: `${46 + (p.i % 3) * 4}%`, animationDelay: `${0.4 + p.i * 0.35}s` }} />
          ))
        : null}
      {row.id === "day_orange"
        ? DOTS.slice(0, 8).map((p) => (
            <i key={p.i} className="dy-drop" style={{ left: `${30 + (p.i * 7) % 40}%`, animationDelay: `${0.25 + p.i * 0.12}s` }} />
          ))
        : null}
      {row.id === "day_bird"
        ? [0, 1, 2, 3].map((i) => <i key={i} className="dy-note" style={{ animationDelay: `${0.35 + i * 0.28}s`, left: `${58 + i * 4}%` }} />)
        : null}
      {row.id === "day_balloons"
        ? [0, 1, 2].map((i) => (
            <i key={i} className="dy-cloud" style={{ top: `${18 + i * 16}%`, animationDelay: `${i * 0.4}s`, width: `${28 + i * 8}vw` }} />
          ))
        : null}
      {!petal && !copies && row.id !== "day_coffee" && row.id !== "day_orange" && row.id !== "day_alarm"
        ? DOTS.slice(0, 8).map((p) => (
            <i key={p.i} className="dy-spark" style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s` }} />
          ))
        : null}
      {row.id === "day_butterflies"
        ? FLIES.map((f, i) => (
            <img
              key={i}
              src={daySrc(row.id)}
              alt=""
              draggable={false}
              decoding="async"
              className={`dy-copy dy-fly-${f.kind}`}
              style={{ left: `${f.left}%`, top: `${f.top}%`, width: `${f.size}vw`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }}
            />
          ))
        : null}
      {row.id === "day_balloons"
        ? BALLOONS.map((b, i) => (
            <img
              key={i}
              src={daySrc(row.id)}
              alt=""
              draggable={false}
              decoding="async"
              className="dy-copy dy-up"
              style={{
                left: `${b.left}%`,
                width: `${b.size}vw`,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.dur}s`,
                ["--drift" as string]: `${b.drift}px`,
                ["--op" as string]: b.op,
              }}
            />
          ))
        : null}
      {!copies ? (
        <img
          src={daySrc(row.id)}
          alt=""
          draggable={false}
          decoding="async"
          className={`dy-hero dy-go-${row.id} fx-hero-img`}
          style={{ width: `${HERO[row.id] ?? 36}vw`, animationDuration: `${row.ms}ms` }}
        />
      ) : null}
    </div>
  );
}

export function DayThumb({ id }: { id: DayId }) {
  return <img src={daySrc(id)} alt="" draggable={false} decoding="async" className="bd-thumb-img" />;
}
