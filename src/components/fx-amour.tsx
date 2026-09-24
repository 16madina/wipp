import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cake,
  Grid2X2,
  Heart,
  Moon,
  PartyPopper,
  Play,
  Search,
  Sun,
  X,
} from "lucide-react";
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

  const extras =
    row.id === "love_rain" ? <Fly />
    : row.id === "love_petals" ? <Petals />
    : row.id === "love_balloons" ? <Balloons />
    : row.id === "love_envelope" ? <Envelope />
    : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[96] overflow-visible fx-stage fx-stage-love" aria-hidden>
      <i className="fx-veil fx-veil-love" />
      <i className="bd-cake-halo fx-halo-love" />
      <i className="fx-bloom fx-bloom-love" />
      {Array.from({ length: 12 }, (_, i) => (
        <i
          key={i}
          className="fx-sparkle fx-sparkle-love"
          style={{
            left: `${6 + ((i * 17) % 88)}%`,
            top: `${10 + ((i * 23) % 72)}%`,
            animationDelay: `${0.12 + (i % 7) * 0.16}s`,
            animationDuration: `${2.2 + (i % 4) * 0.32}s`,
            width: 3 + (i % 3) * 2,
            height: 3 + (i % 3) * 2,
          }}
        />
      ))}
      <div className={`bd-cake-stage bd-go-${row.id}`}>
        <img src={amourSrc(row.id)} alt="" draggable={false} decoding="async" className="bd-cake-img fx-hero-img" />
      </div>
      {extras}
    </div>
  );
}

function Fly() {
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="fx-rise"
          style={{
            left: `${5 + ((i * 17) % 90)}%`,
            fontSize: 11 + (i % 5) * 5,
            animationDelay: `${0.28 + i * 0.07}s`,
            animationDuration: `${1.9 + (i % 4) * 0.28}s`,
            opacity: 0.85,
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
      {Array.from({ length: 22 }, (_, i) => (
        <i
          key={i}
          className="fx-petal"
          style={{
            left: `${(i * 11) % 100}%`,
            animationDelay: `${0.2 + (i % 8) * 0.14}s`,
            animationDuration: `${2.4 + (i % 5) * 0.22}s`,
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
    <div className="fx-env fx-env-overlay">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="fx-env-heart"
          style={{
            left: `${22 + (i % 5) * 12}%`,
            animationDelay: `${0.55 + i * 0.07}s`,
            fontSize: 12 + (i % 3) * 3,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}

function Balloons() {
  const colors = ["#ff2d55", "#ff5a7a", "#ffd84d", "#ff8fab", "#c9184a", "#ff6b9d"];
  return (
    <>
      {colors.map((c, i) => (
        <span
          key={c}
          className="fx-balloon"
          style={{
            background: c,
            animationDelay: `${0.15 + i * 0.06}s`,
            left: `${18 + i * 11}%`,
            width: 18 + (i % 3) * 4,
            height: 24 + (i % 3) * 5,
          }}
        />
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
  const initial =
    screen === "anniv" ? "anniv"
    : screen === "night" ? "night"
    : screen === "day" ? "day"
    : "amour";
  const [cat, setCat] = useState<"amour" | "anniv" | "day" | "night" | "fetes" | "autres">(initial);
  const [q, setQ] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  // keep API callbacks available for callers that still switch screens
  void onAmour;
  void onAnniv;
  void onNight;
  void onDay;
  void onBack;

  useEffect(() => {
    setCat(initial);
  }, [initial]);

  const cats = [
    { id: "amour" as const, icon: Heart, label: t("fxAmour"), emoji: "❤️", sub: t("catAmourSub"), ready: true },
    { id: "anniv" as const, icon: Cake, label: lang === "fr" ? "Anniversaire" : "Birthday", emoji: "🎂", sub: t("catAnnivSub"), ready: true },
    { id: "day" as const, icon: Sun, label: lang === "fr" ? "Bonne journée" : "Good day", emoji: "☀️", sub: t("catDaySub"), ready: true },
    { id: "night" as const, icon: Moon, label: lang === "fr" ? "Bonne nuit" : "Good night", emoji: "🌙", sub: t("catNightSub"), ready: true },
    { id: "fetes" as const, icon: PartyPopper, label: t("catFetes"), emoji: "🎉", sub: t("catFetesSub"), ready: false },
    { id: "autres" as const, icon: Grid2X2, label: t("fxOthers"), emoji: "✨", sub: t("fxOthersSub"), ready: false },
  ];

  const query = q.trim().toLowerCase();

  const sections = useMemo(() => {
    const all = [
      {
        id: "amour" as const,
        title: `${t("fxAmour")} ❤️`,
        sub: t("catAmourSub"),
        items: AMOUR.map((a) => ({
          id: a.id,
          label: lang === "fr" ? a.fr : a.en,
          thumb: <Thumb id={a.id} />,
        })),
      },
      {
        id: "anniv" as const,
        title: `${lang === "fr" ? "Anniversaire" : "Birthday"} 🎂`,
        sub: t("catAnnivSub"),
        items: BIRTHDAY.map((a) => ({
          id: a.id,
          label: lang === "fr" ? a.fr : a.en,
          thumb: <BirthdayThumb id={a.id as BirthdayId} />,
        })),
      },
      {
        id: "day" as const,
        title: `${lang === "fr" ? "Bonne journée" : "Good day"} ☀️`,
        sub: t("catDaySub"),
        items: DAY.map((a) => ({
          id: a.id,
          label: lang === "fr" ? a.fr : a.en,
          thumb: <DayThumb id={a.id as DayId} />,
        })),
      },
      {
        id: "night" as const,
        title: `${lang === "fr" ? "Bonne nuit" : "Good night"} 🌙`,
        sub: t("catNightSub"),
        items: NIGHT.map((a) => ({
          id: a.id,
          label: lang === "fr" ? a.fr : a.en,
          thumb: <NightThumb id={a.id as NightId} />,
        })),
      },
    ];
    return all
      .map((sec) => ({
        ...sec,
        items: query
          ? sec.items.filter((it) => it.label.toLowerCase().includes(query) || it.id.toLowerCase().includes(query))
          : sec.items,
      }))
      .filter((sec) => (query ? sec.items.length > 0 : true));
  }, [lang, query, t]);

  const visible = query ? sections : sections.filter((s) => s.id === cat);

  return (
    <div className="absolute inset-0 z-[80]">
      <button type="button" className="absolute inset-0 bg-black/55" aria-label={t("back")} onClick={onClose} />
      <aside className="fx-drawer absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-[#070b14] shadow-[-12px_0_40px_rgb(0_0_0/0.5)]">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15" />
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0">
            <p className="text-[20px] font-bold text-white">{t("fxAddTitle")}</p>
            <p className="mt-0.5 text-[12px] text-white/55">{t("fxAddHint")}</p>
          </div>
          <button
            type="button"
            className="press flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
            aria-label={t("cancel")}
            onClick={onClose}
          >
            <X className="size-4 text-white/80" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <label className="flex h-11 items-center gap-2 rounded-2xl bg-[#10182a] px-3 ring-1 ring-white/10">
            <Search className="size-4 shrink-0 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("fxSearch")}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
            />
          </label>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="no-scrollbar flex w-[84px] shrink-0 flex-col gap-2 overflow-y-auto px-2 pb-6">
            {cats.map((c) => {
              const on = cat === c.id && !query;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!c.ready}
                  className={cn(
                    "press relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-center",
                    on && "bg-[#15120a] ring-1 ring-[#ffd84d] shadow-[0_0_18px_rgb(255_216_77/0.22)]",
                    !on && c.ready && "bg-transparent",
                    !c.ready && "opacity-45",
                  )}
                  onClick={() => {
                    if (!c.ready) return;
                    setQ("");
                    setCat(c.id);
                    scroller.current?.scrollTo({ top: 0 });
                  }}
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full",
                      on ? "bg-[#ffd84d]/15 text-[#ffd84d]" : "bg-white/5 text-white/70",
                    )}
                  >
                    <c.icon className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className={cn("text-[10px] font-semibold leading-tight", on ? "text-[#ffd84d]" : "text-white/65")}>
                    {c.label}
                  </span>
                  {!c.ready ? (
                    <span className="text-[8px] font-bold uppercase tracking-wide text-[#ffd84d]/80">{t("fxSoon")}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div ref={scroller} className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-3 pb-8">
            {visible.length === 0 ? (
              <p className="mt-8 text-center text-[13px] text-white/45">{t("fxNoResults")}</p>
            ) : (
              visible.map((sec) => (
                <section key={sec.id} className="mb-6">
                  <h2 className="text-[17px] font-bold text-white">{sec.title}</h2>
                  <p className="mb-3 text-[12px] text-white/50">{sec.sub}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {sec.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "group relative aspect-square overflow-hidden rounded-2xl bg-[#0c1018] text-left ring-1",
                          selected === item.id ? "ring-[#ffd84d]" : "ring-white/10",
                        )}
                        onClick={() => onPick(item.id)}
                      >
                        <span className="absolute inset-0">{item.thumb}</span>
                        <span className="absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2 pb-2 pt-8">
                          <span className="block truncate text-[11px] font-semibold text-white">{item.label}</span>
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="absolute bottom-2 right-2 z-[2] flex size-8 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/15"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(item.id);
                          }}
                        >
                          <Play className="size-3.5 fill-white text-white" />
                        </span>
                        {onAr ? (
                          <span
                            role="button"
                            tabIndex={0}
                            className="absolute left-2 top-2 z-[2] flex h-7 items-center rounded-full bg-[#ffd84d] px-2 text-[10px] font-bold text-[#0b1220]"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAr(item.id);
                            }}
                          >
                            RA
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
