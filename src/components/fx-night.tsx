import { useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";
import { useWgoStore } from "@/lib/store";

export const NIGHT = [
  { id: "night_moon", fr: "Lune dorée", en: "Golden moon", ms: 4500 },
  { id: "night_sleeping_bear", fr: "Nounours endormi", en: "Sleeping teddy", ms: 5000 },
  { id: "night_star_cloud", fr: "Nuage d’étoiles", en: "Star cloud", ms: 5000 },
  { id: "night_lantern", fr: "Lanterne", en: "Lantern", ms: 5000 },
  { id: "night_window", fr: "Fenêtre", en: "Moon window", ms: 6000 },
  { id: "night_shooting_stars", fr: "Étoiles filantes", en: "Shooting stars", ms: 4000 },
  { id: "night_star_jar", fr: "Bocal d’étoiles", en: "Star jar", ms: 5000 },
  { id: "night_sleepy_cloud", fr: "Planète", en: "Planet", ms: 5000 },
  { id: "night_star_balloons", fr: "Ballons étoilés", en: "Star balloons", ms: 5000 },
  { id: "night_sky_lanterns", fr: "Lanternes", en: "Sky lanterns", ms: 6000 },
  { id: "night_galaxy", fr: "Galaxie", en: "Galaxy", ms: 6000 },
] as const;

export type NightId = (typeof NIGHT)[number]["id"];

export function nightSrc(id: string) {
  return `/fx/nuit/${id}.png`;
}

export function nightLabel(id: string, lang: "fr" | "en") {
  const row = NIGHT.find((a) => a.id === id);
  if (!row) return id;
  return lang === "fr" ? row.fr : row.en;
}

const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  i,
  left: 3 + ((i * 17) % 94),
  top: 6 + ((i * 23) % 78),
  delay: (i % 9) * 0.22,
  dur: 2.6 + (i % 4) * 0.4,
  size: 5 + (i % 4) * 3,
}));

const LANTERNS = [
  { left: 10, size: 15, delay: 0, dur: 6, drift: 16, op: 0.5 },
  { left: 24, size: 26, delay: 0.3, dur: 5.6, drift: -12, op: 1 },
  { left: 40, size: 13, delay: 0.7, dur: 6.3, drift: 20, op: 0.62 },
  { left: 54, size: 22, delay: 0.15, dur: 5.8, drift: -8, op: 0.92 },
  { left: 70, size: 12, delay: 0.95, dur: 6.1, drift: 14, op: 0.48 },
  { left: 32, size: 18, delay: 1.15, dur: 5.5, drift: 6, op: 0.78 },
  { left: 82, size: 20, delay: 0.45, dur: 5.9, drift: -16, op: 0.85 },
  { left: 62, size: 11, delay: 1.4, dur: 6.4, drift: 10, op: 0.4 },
];

const SHOOTS_IMG = [
  { top: 8, size: 20, delay: 0.05, dur: 1.7, rot: 26 },
  { top: 24, size: 14, delay: 0.4, dur: 1.45, rot: 20 },
  { top: 38, size: 18, delay: 0.75, dur: 1.6, rot: 32 },
  { top: 52, size: 12, delay: 1.1, dur: 1.35, rot: 18 },
  { top: 66, size: 16, delay: 1.45, dur: 1.55, rot: 28 },
  { top: 16, size: 11, delay: 1.9, dur: 1.4, rot: 24 },
  { top: 46, size: 15, delay: 2.3, dur: 1.5, rot: 22 },
];

const HERO: Record<string, number> = {
  night_moon: 30,
  night_sleeping_bear: 36,
  night_star_cloud: 32,
  night_lantern: 26,
  night_window: 34,
  night_star_jar: 28,
  night_sleepy_cloud: 34,
  night_star_balloons: 30,
  night_galaxy: 38,
};

export function NightFx({ id, onDone }: { id: string; onDone: () => void }) {
  const row = NIGHT.find((a) => a.id === id);
  const reduce = useWgoStore((s) => s.a11y?.reduceMotion);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!row || reduce) {
      done.current();
      return;
    }
    const tap = window.setTimeout(() => haptic("tap"), 280);
    const end = window.setTimeout(() => done.current(), row.ms);
    return () => {
      window.clearTimeout(tap);
      window.clearTimeout(end);
    };
  }, [row, reduce]);

  if (!row || reduce) return null;
  const copies = row.id === "night_sky_lanterns" || row.id === "night_shooting_stars";
  const hang = row.id === "night_star_cloud";

  return (
    <div className="pointer-events-none absolute inset-0 z-[96] overflow-visible" aria-hidden>
      <i className="nt-glow" />
      {SPARKS.map((p) => (
        <i
          key={p.i}
          className={hang ? "nt-spark nt-spark-hang" : "nt-spark"}
          style={{
            left: hang ? `${38 + (p.i % 6) * 5}%` : `${p.left}%`,
            top: hang ? `${46 + (p.i % 5) * 6}%` : `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${hang ? p.dur + 1 : p.dur}s`,
          }}
        />
      ))}
      {row.id === "night_sky_lanterns"
        ? LANTERNS.map((c, i) => (
            <img
              key={i}
              src={nightSrc(row.id)}
              alt=""
              draggable={false}
              decoding="async"
              className="nt-copy nt-copy-up"
              style={{
                left: `${c.left}%`,
                width: `${c.size}vw`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
                ["--drift" as string]: `${c.drift}px`,
                ["--op" as string]: c.op,
              }}
            />
          ))
        : null}
      {row.id === "night_shooting_stars"
        ? SHOOTS_IMG.map((s, i) => (
            <img
              key={i}
              src={nightSrc(row.id)}
              alt=""
              draggable={false}
              decoding="async"
              className="nt-copy nt-copy-shoot"
              style={{
                top: `${s.top}%`,
                width: `${s.size}vw`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
                ["--rot" as string]: `${s.rot}deg`,
              }}
            />
          ))
        : null}
      {!copies ? (
        <img
          src={nightSrc(row.id)}
          alt=""
          draggable={false}
          decoding="async"
          className={`nt-hero nt-hero-${row.id}`}
          style={{ width: `${HERO[row.id] ?? 36}vw`, animationDuration: `${row.ms}ms` }}
        />
      ) : null}
    </div>
  );
}

export function NightThumb({ id }: { id: NightId }) {
  return <img src={nightSrc(id)} alt="" draggable={false} decoding="async" className="bd-thumb-img" />;
}
