import { useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";
import { useWgoStore } from "@/lib/store";

export const BIRTHDAY = [
  { id: "birthday_cake", fr: "Gâteau", en: "Cake", ms: 4000 },
  { id: "birthday_balloons", fr: "Ballons", en: "Balloons", ms: 4000 },
  { id: "birthday_gift_explosion", fr: "Cadeau surprise", en: "Gift surprise", ms: 4000 },
  { id: "birthday_fireworks", fr: "Feux d'artifice", en: "Fireworks", ms: 4000 },
  { id: "birthday_gift_rain", fr: "Pluie de cadeaux", en: "Gift rain", ms: 4000 },
  { id: "birthday_champagne", fr: "Champagne", en: "Champagne", ms: 4000 },
  { id: "birthday_teddy", fr: "Nounours", en: "Teddy", ms: 4000 },
  { id: "birthday_star_balloons", fr: "Ballons étoiles", en: "Star balloons", ms: 4000 },
  { id: "birthday_confetti", fr: "Canon à confettis", en: "Confetti cannon", ms: 4000 },
  { id: "birthday_lanterns", fr: "Lanternes", en: "Lanterns", ms: 4000 },
] as const;

export type BirthdayId = (typeof BIRTHDAY)[number]["id"];

const COLORS = ["#ffd84d", "#ff4d8d", "#7ec8ff", "#c084fc", "#fff6d0"];

const BITS = Array.from({ length: 46 }, (_, i) => {
  const ang = (i / 46) * Math.PI * 2;
  const dist = 28 + (i % 6) * 16;
  return {
    i,
    dx: Math.cos(ang) * dist,
    dy: Math.sin(ang) * dist * 0.55 - 10,
    size: i % 7 === 0 ? 13 : i % 3 === 0 ? 8 : 5,
    color: COLORS[i % COLORS.length],
    delay: 0.9 + (i % 8) * 0.035,
    dur: 1.7 + (i % 5) * 0.16,
    rot: (i * 53) % 360,
    front: i % 5 === 0,
    star: i % 8 === 0,
  };
});

const WICKS = [
  { x: "34%", y: "19%", d: "0s", t: "0.42s" },
  { x: "43%", y: "18%", d: "0.07s", t: "0.5s" },
  { x: "51%", y: "17.5%", d: "0.14s", t: "0.38s" },
  { x: "59%", y: "18%", d: "0.04s", t: "0.46s" },
  { x: "67%", y: "19%", d: "0.11s", t: "0.52s" },
];

function soundOn() {
  const a11y = useWgoStore.getState().a11y;
  return a11y?.reduceMotion !== true && a11y?.stickerSound !== false;
}

let sharedCtx: AudioContext | null = null;

function tone(freq: number, dur = 0.12, gain = 0.03, type: OscillatorType = "sine") {
  if (!soundOn()) return;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctor();
  const ctx = sharedCtx;
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

export function birthdayLabel(id: string, lang: "fr" | "en") {
  const row = BIRTHDAY.find((a) => a.id === id);
  if (!row) return id;
  return lang === "fr" ? row.fr : row.en;
}

export function artSrc(id: string) {
  return `/fx/anniv/${id}.png`;
}

const BURST = new Set(["birthday_cake", "birthday_gift_explosion", "birthday_fireworks", "birthday_confetti"]);

export function BirthdayFx({ id, onDone }: { id: string; onDone: () => void }) {
  const row = BIRTHDAY.find((a) => a.id === id);
  const reduce = useWgoStore((s) => s.a11y?.reduceMotion);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!row || reduce) {
      done.current();
      return;
    }
    const a = window.setTimeout(() => haptic("tap"), 320);
    const b = window.setTimeout(() => {
      if (row.id === "birthday_gift_explosion" || row.id === "birthday_confetti") {
        haptic("select");
        tone(196, 0.07, 0.04, "triangle");
      }
      if (row.id === "birthday_cake" || row.id === "birthday_fireworks") {
        haptic("select");
        tone(196, 0.07, 0.035, "triangle");
        tone(1480, 0.14, 0.025);
      }
      if (row.id === "birthday_champagne") tone(990, 0.1, 0.04, "triangle");
    }, row.id === "birthday_confetti" ? 420 : 900);
    const end = window.setTimeout(() => done.current(), row.ms);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.clearTimeout(end);
    };
  }, [row, reduce]);

  if (!row || reduce) return null;
  const burst = BURST.has(row.id);

  const bit = (p: (typeof BITS)[number]) => (
    <i
      key={p.i}
      className={`bd-bit${p.star ? " bd-bit-star" : ""}${p.front ? " bd-bit-front" : ""}`}
      style={{
        width: p.size,
        height: p.star ? p.size : p.size * 1.35,
        background: p.color,
        animationDelay: `${p.delay}s`,
        animationDuration: `${p.dur}s`,
        ["--dx" as string]: `${p.dx}px`,
        ["--dy" as string]: `${p.dy}px`,
        ["--rot" as string]: `${p.rot}deg`,
      }}
    />
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[96] overflow-visible fx-stage fx-stage-bday" aria-hidden>
      <i className="fx-veil fx-veil-bday" />
      <i className="bd-cake-halo fx-halo-bday" />
      <i className="fx-bloom fx-bloom-warm" />
      {burst ? BITS.filter((p) => !p.front).map(bit) : null}
      <div className={`bd-cake-stage bd-go-${row.id}`}>
        <img src={artSrc(row.id)} alt="" draggable={false} decoding="async" className="bd-cake-img fx-hero-img" />
        {row.id === "birthday_cake"
          ? WICKS.map((w) => (
              <i key={w.x} className="bd-wick" style={{ left: w.x, top: w.y, animationDelay: w.d, animationDuration: w.t }} />
            ))
          : null}
      </div>
      {burst ? BITS.filter((p) => p.front).map(bit) : null}
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={`s${i}`}
          className="fx-sparkle fx-sparkle-warm"
          style={{
            left: `${8 + ((i * 19) % 84)}%`,
            top: `${12 + ((i * 29) % 70)}%`,
            animationDelay: `${0.18 + (i % 5) * 0.2}s`,
            animationDuration: `${2.4 + (i % 3) * 0.35}s`,
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
          }}
        />
      ))}
    </div>
  );
}

export function BirthdayThumb({ id }: { id: BirthdayId }) {
  return <img src={artSrc(id)} alt="" draggable={false} decoding="async" className="bd-thumb-img" />;
}
