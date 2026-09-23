import { useEffect, useRef } from "react";
import { Cake, ChevronRight, Heart, HeartCrack, Moon, Plane, Play, Smile, Sun, TreePine, Users } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BIRTHDAY, BirthdayThumb, type BirthdayId } from "@/components/fx-birthday";
import { NIGHT, NightThumb, type NightId } from "@/components/fx-night";
import { DAY, DayThumb, type DayId } from "@/components/fx-day";

export const AMOUR = [
  { id: "love_hearts", fr: "Cœurs", en: "Hearts", ms: 4000 },
  { id: "love_bouquet", fr: "Bouquet", en: "Bouquet", ms: 4000 },
  { id: "love_teddy", fr: "Nounours", en: "Teddy", ms: 4000 },
  { id: "love_balloons", fr: "Ballons", en: "Balloons", ms: 4000 },
  { id: "love_gift", fr: "Cadeau", en: "Gift", ms: 4000 },
  { id: "love_petals", fr: "Cœur de pétales", en: "Petal heart", ms: 4000 },
  { id: "love_toast", fr: "Champagne", en: "Champagne", ms: 4000 },
  { id: "love_fireworks", fr: "Feux d’artifice", en: "Fireworks", ms: 4000 },
  { id: "love_rain", fr: "Pluie de cœurs", en: "Heart rain", ms: 4000 },
  { id: "love_envelope", fr: "Enveloppe", en: "Envelope", ms: 4000 },
] as const;

export type AmourId = (typeof AMOUR)[number]["id"];

function soundOn() {
  const a11y = useWgoStore.getState().a11y;
  return a11y?.reduceMotion !== true && a11y?.stickerSound !== false;
}

let sharedCtx: AudioContext | null = null;

function tone(freq: number, dur = 0.12, gain = 0.03) {
  if (!soundOn()) return;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctor();
  const ctx = sharedCtx;
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
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

export function amourSrc(id: string) {
  return `/fx/love/${id}.png`;
}

export function amourLabel(id: string, lang: "fr" | "en") {
  const row = AMOUR.find((a) => a.id === id);
  if (!row) return id;
  return lang === "fr" ? row.fr : row.en;
}

export function AmourFx({ id, onDone }: { id: string; onDone: () => void }) {
  const row = AMOUR.find((a) => a.id === id) ?? AMOUR[0];
  const reduce = useWgoStore((s) => s.a11y?.reduceMotion);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (reduce) {
      done.current();
      return;
    }
    if (row.id === "love_hearts" || row.id === "love_gift") haptic("tap");
    if (row.id === "love_toast") window.setTimeout(() => tone(990, 0.1, 0.035), 500);
    if (row.id === "love_fireworks") window.setTimeout(() => tone(880, 0.16, 0.03), 400);
    if (row.id === "love_envelope") window.setTimeout(() => tone(520, 0.08, 0.04), 500);
    const timer = window.setTimeout(() => done.current(), row.ms);
    return () => window.clearTimeout(timer);
  }, [row.id, row.ms, reduce]);

  if (reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[96] overflow-hidden" aria-hidden>
      <i className="bd-cake-halo" />
      <div className={`bd-cake-stage bd-go-${row.id}`}>
        <img src={amourSrc(row.id)} alt="" draggable={false} decoding="async" className="bd-cake-img" />
      </div>
    </div>
  );
}

function Fly() {
  return (
    <>
      <span className="fx-beat">♥</span>
      {Array.from({ length: 11 }, (_, i) => (
        <span
          key={i}
          className="fx-rise"
          style={{
            left: `${8 + ((i * 19) % 84)}%`,
            fontSize: 12 + (i % 4) * 6,
            animationDelay: `${0.35 + i * 0.08}s`,
            animationDuration: `${1.8 + (i % 3) * 0.3}s`,
          }}
        >
          ♥
        </span>
      ))}
    </>
  );
}

function Petals() {
  return (
    <>
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          className="fx-petal"
          style={{
            left: `${(i * 13) % 100}%`,
            animationDelay: `${(i % 8) * 0.18}s`,
            animationDuration: `${2.2 + (i % 5) * 0.25}s`,
            background: i % 3 === 0 ? "#ff4d6d" : i % 3 === 1 ? "#c9184a" : "#ff8fa3",
          }}
        />
      ))}
    </>
  );
}

function Rose() {
  return (
    <div className="fx-rose">
      <i className="fx-petal-layer" />
      <i className="fx-petal-layer fx-petal-b" />
      <i className="fx-petal-layer fx-petal-c" />
      <i className="fx-rose-core" />
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className="fx-rose-fly" style={{ animationDelay: `${1.5 + i * 0.08}s`, left: `${40 + i * 6}%` }} />
      ))}
    </div>
  );
}

function Meet() {
  return (
    <>
      <span className="fx-from-left">♥</span>
      <span className="fx-from-right">♥</span>
      <span className="fx-heart-ring" />
    </>
  );
}

function Draw() {
  return (
    <svg className="fx-draw" viewBox="0 0 120 110">
      <path
        className="fx-draw-path"
        d="M60 96 C20 62 8 28 36 22 C50 18 58 32 60 40 C62 32 70 18 84 22 C112 28 100 62 60 96 Z"
      />
    </svg>
  );
}

function Envelope() {
  return (
    <div className="fx-env">
      <div className="fx-env-body" />
      <div className="fx-flap" />
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="fx-env-heart" style={{ left: `${30 + (i % 4) * 12}%`, animationDelay: `${0.7 + i * 0.08}s` }}>
          ♥
        </span>
      ))}
    </div>
  );
}

function Balloons() {
  const colors = ["#ff2d55", "#ff5a7a", "#ffd84d", "#ff8fab", "#c9184a"];
  return (
    <>
      {colors.map((c, i) => (
        <span key={c} className="fx-balloon" style={{ background: c, animationDelay: `${i * 0.05}s`, left: `${28 + i * 9}%` }} />
      ))}
    </>
  );
}

function Hands() {
  return (
    <>
      <span className="fx-hand fx-hand-l">✋</span>
      <span className="fx-hand fx-hand-r">✋</span>
      <span className="fx-hand-heart">♥</span>
    </>
  );
}

function Globe() {
  return (
    <div className="fx-globe">
      <span className="fx-globe-heart">♥</span>
      <i className="fx-globe-wave" />
    </div>
  );
}

function Infinity() {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="fx-inf" style={{ animationDelay: `${i * 0.12}s`, fontSize: 10 + (i % 3) * 4 }}>
          ♥
        </span>
      ))}
    </>
  );
}

function Thumb({ id }: { id: AmourId }) {
  return <img src={amourSrc(id)} alt="" draggable={false} decoding="async" className="bd-thumb-img" />;
}

export function EffectStudio({
  screen,
  selected,
  onClose,
  onAmour,
  onAnniv,
  onNight,
  onDay,
  onBack,
  onPick,
  onPreview,
  onAr,
}: {
  screen: "cats" | "amour" | "anniv" | "night" | "day";
  selected: string | null;
  onClose: () => void;
  onAmour: () => void;
  onAnniv: () => void;
  onNight: () => void;
  onDay: () => void;
  onBack: () => void;
  onPick: (id: string) => void;
  onPreview: (id: string) => void;
  onAr?: (id: string) => void;
}) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const cats = [
    { id: "amour", icon: Heart, label: t("fxAmour"), tint: "text-[#ff4d8d]", ready: true },
    { id: "anniv", icon: Cake, label: lang === "fr" ? "Anniversaire" : "Birthday", tint: "text-[#c084fc]", ready: true },
    { id: "night", icon: Moon, label: lang === "fr" ? "Bonne nuit" : "Good night", tint: "text-[#7dd3fc]", ready: true },
    { id: "day", icon: Sun, label: lang === "fr" ? "Bonne journée" : "Good day", tint: "text-[#fbbf24]", ready: true },
    { id: "fete", icon: TreePine, label: lang === "fr" ? "Fêtes" : "Holidays", tint: "text-[#4ade80]", ready: false },
    { id: "soutien", icon: HeartCrack, label: lang === "fr" ? "Soutien" : "Support", tint: "text-[#93c5fd]", ready: false },
    { id: "amitie", icon: Users, label: lang === "fr" ? "Amitié" : "Friendship", tint: "text-[#c4b5fd]", ready: false },
    { id: "humour", icon: Smile, label: "Humour", tint: "text-[#fbbf24]", ready: false },
    { id: "voyage", icon: Plane, label: lang === "fr" ? "Voyage" : "Travel", tint: "text-[#38bdf8]", ready: false },
  ];

  return (
    <div className="absolute inset-0 z-[55]">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label={t("back")} onClick={onClose} />
      <aside className={cn("fx-drawer absolute inset-y-0 right-0 flex flex-col bg-[#070b14] shadow-[-8px_0_32px_rgb(0_0_0/0.45)]", screen === "cats" ? "w-[86%] max-w-[340px]" : "w-full")}>
        <div className="flex items-center gap-2 px-3 pb-2 pt-4">
          <button type="button" className="flex size-10 items-center justify-center" onClick={screen === "cats" ? onClose : onBack} aria-label={t("back")}>
            <ChevronRight className="size-5 rotate-180" />
          </button>
          <div>
            <p className="text-[16px] font-bold">{screen === "amour" ? t("fxAmour") : screen === "anniv" ? (lang === "fr" ? "Anniversaire" : "Birthday") : screen === "night" ? (lang === "fr" ? "Bonne nuit" : "Good night") : screen === "day" ? (lang === "fr" ? "Bonne journée" : "Good day") : t("fxTitle")}</p>
            <p className="text-[12px] text-muted">{screen === "cats" ? t("fxHint") : screen === "day" ? (lang === "fr" ? "12 animations. Aucun texte." : "12 animations. No text.") : screen === "night" ? (lang === "fr" ? "11 animations. Aucun texte." : "11 animations. No text.") : lang === "fr" ? "10 animations. Aucun texte." : "10 animations. No text."}</p>
          </div>
        </div>
        {screen === "cats" ? (
          <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cn(
                  "mb-2 flex h-14 w-full items-center gap-3 rounded-2xl bg-[#10182a] px-3 text-left ring-1 ring-white/10",
                  c.ready && "ring-[#ff4d8d]",
                  !c.ready && "opacity-70",
                )}
                onClick={() => {
                  if (!c.ready) return;
                  if (c.id === "anniv") onAnniv();
                  else if (c.id === "night") onNight();
                  else if (c.id === "day") onDay();
                  else onAmour();
                }}
              >
                <c.icon className={cn("size-5", c.tint)} />
                <span className="flex-1 text-[15px] font-semibold">{c.label}</span>
                {c.ready ? <ChevronRight className="size-4 text-muted" /> : <span className="text-[11px] text-muted">{t("fxSoon")}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="no-scrollbar grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-3 pb-6">
            {screen === "anniv"
              ? BIRTHDAY.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    className={cn("relative h-36 overflow-hidden rounded-2xl bg-black text-left ring-1", selected === a.id ? "ring-[#ffd84d]" : "ring-white/10")}
                    onClick={() => onPick(a.id)}
                  >
                    <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/50 text-[11px] font-bold">{i + 1}</span>
                    <BirthdayThumb id={a.id as BirthdayId} />
                    <span className="absolute inset-x-2 bottom-10 z-10 text-[12px] font-semibold">{lang === "fr" ? a.fr : a.en}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(a.id);
                      }}
                    >
                      <Play className="size-3.5 fill-white text-white" />
                    </span>
                    {onAr ? (
                      <span
                        role="button"
                        tabIndex={0}
                        className="absolute bottom-2 left-2 z-10 flex h-8 items-center rounded-full bg-[#ffd84d] px-2 text-[11px] font-bold text-[#0b1220]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAr(a.id);
                        }}
                      >
                        RA
                      </span>
                    ) : null}
                  </button>
                ))
              : screen === "night"
                ? NIGHT.map((a, i) => (
                    <button
                      key={a.id}
                      type="button"
                      className={cn("relative h-36 overflow-hidden rounded-2xl bg-[#070b18] text-left ring-1", selected === a.id ? "ring-[#7dd3fc]" : "ring-white/10")}
                      onClick={() => onPick(a.id)}
                    >
                      <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/50 text-[11px] font-bold">{i + 1}</span>
                      <NightThumb id={a.id as NightId} />
                      <span className="absolute inset-x-2 bottom-10 z-10 text-[12px] font-semibold">{lang === "fr" ? a.fr : a.en}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(a.id);
                        }}
                      >
                        <Play className="size-3.5 fill-white text-white" />
                      </span>
                      {onAr ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="absolute bottom-2 left-2 z-10 flex h-8 items-center rounded-full bg-[#ffd84d] px-2 text-[11px] font-bold text-[#0b1220]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAr(a.id);
                          }}
                        >
                          RA
                        </span>
                      ) : null}
                    </button>
                  ))
              : screen === "day"
                ? DAY.map((a, i) => (
                    <button
                      key={a.id}
                      type="button"
                      className={cn("relative h-36 overflow-hidden rounded-2xl bg-[#141006] text-left ring-1", selected === a.id ? "ring-[#ffd84d]" : "ring-white/10")}
                      onClick={() => onPick(a.id)}
                    >
                      <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/50 text-[11px] font-bold">{i + 1}</span>
                      <DayThumb id={a.id as DayId} />
                      <span className="absolute inset-x-2 bottom-10 z-10 text-[12px] font-semibold">{lang === "fr" ? a.fr : a.en}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(a.id);
                        }}
                      >
                        <Play className="size-3.5 fill-white text-white" />
                      </span>
                      {onAr ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="absolute bottom-2 left-2 z-10 flex h-8 items-center rounded-full bg-[#ffd84d] px-2 text-[11px] font-bold text-[#0b1220]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAr(a.id);
                          }}
                        >
                          RA
                        </span>
                      ) : null}
                    </button>
                  ))
              : AMOUR.map((a, i) => (
              <button
                key={a.id}
                type="button"
                className={cn(
                  "relative h-36 overflow-hidden rounded-2xl bg-[#140810] text-left ring-1",
                  selected === a.id ? "ring-[#ff4d8d]" : "ring-white/10",
                )}
                onClick={() => onPick(a.id)}
              >
                <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/50 text-[11px] font-bold">{i + 1}</span>
                <Thumb id={a.id} />
                <span className="absolute inset-x-2 bottom-10 text-[12px] font-semibold">{lang === "fr" ? a.fr : a.en}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(a.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      onPreview(a.id);
                    }
                  }}
                >
                  <Play className="size-3.5 fill-white text-white" />
                </span>
                {onAr ? (
                  <span
                    role="button"
                    tabIndex={0}
                    className="absolute bottom-2 left-2 z-10 flex h-8 items-center rounded-full bg-[#ffd84d] px-2 text-[11px] font-bold text-[#0b1220]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAr(a.id);
                    }}
                  >
                    RA
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
