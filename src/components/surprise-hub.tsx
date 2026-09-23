import { ChevronRight, Sparkles, Wand2 } from "lucide-react";
import { useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export type SurpriseCat =
  | "amour"
  | "anniv"
  | "night"
  | "day"
  | "fetes"
  | "cadeaux"
  | "confettis"
  | "timer";

type CatCard = {
  id: SurpriseCat;
  title: string;
  sub: string;
  img: string;
  tint: string;
  ready: boolean;
};

export function SurpriseHub({
  onBack,
  onScratch,
  onCategory,
  onSeeAll,
}: {
  onBack: () => void;
  onScratch: () => void;
  onCategory: (id: Extract<SurpriseCat, "amour" | "anniv" | "night" | "day">) => void;
  onSeeAll?: () => void;
}) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);

  const cats: CatCard[] = [
    {
      id: "amour",
      title: t("fxAmour"),
      sub: t("catAmourSub"),
      img: "/fx/love/love_hearts.png",
      tint: "from-[#3a0a18] via-[#5a1028] to-[#1a0610]",
      ready: true,
    },
    {
      id: "anniv",
      title: lang === "fr" ? "Anniversaire" : "Birthday",
      sub: t("catAnnivSub"),
      img: "/fx/anniv/birthday_cake.png",
      tint: "from-[#2a1448] via-[#3d1d6b] to-[#140a28]",
      ready: true,
    },
    {
      id: "night",
      title: lang === "fr" ? "Bonne nuit" : "Good night",
      sub: t("catNightSub"),
      img: "/fx/nuit/night_moon.png",
      tint: "from-[#0a1a38] via-[#123058] to-[#060e1c]",
      ready: true,
    },
    {
      id: "day",
      title: lang === "fr" ? "Bonne journée" : "Good day",
      sub: t("catDaySub"),
      img: "/fx/jour/day_sun.png",
      tint: "from-[#3a2808] via-[#5a3c0c] to-[#1c1404]",
      ready: true,
    },
    {
      id: "fetes",
      title: t("catFetes"),
      sub: t("catFetesSub"),
      img: "/fx/anniv/birthday_gift_rain.png",
      tint: "from-[#3a1010] via-[#5a1818] to-[#180808]",
      ready: false,
    },
    {
      id: "cadeaux",
      title: t("catGifts"),
      sub: t("catGiftsSub"),
      img: "/fx/love/love_gift.png",
      tint: "from-[#1a1608] via-[#2a220c] to-[#0c0a04]",
      ready: false,
    },
    {
      id: "confettis",
      title: t("catConfetti"),
      sub: t("catConfettiSub"),
      img: "/fx/anniv/birthday_confetti.png",
      tint: "from-[#1a1428] via-[#241c38] to-[#0c0a14]",
      ready: false,
    },
    {
      id: "timer",
      title: t("catTimer"),
      sub: t("catTimerSub"),
      img: "/fx/nuit/night_star_jar.png",
      tint: "from-[#101820] via-[#182430] to-[#080c10]",
      ready: false,
    },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#05070e]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_50%_at_50%_-10%,rgb(255_216_77/0.12),transparent_55%)]" />
      <header className="relative z-10 flex items-start gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          type="button"
          className="press mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          aria-label={t("back")}
          onClick={onBack}
        >
          <ChevronRight className="size-5 rotate-180 text-white/90" />
        </button>
        <div className="min-w-0 flex-1 pr-2 pt-1 text-center">
          <p className="text-[18px] font-bold tracking-tight text-white">🎁 {t("surpriseStudio")}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-white/55">{t("surpriseStudioSub")}</p>
        </div>
        <span className="size-10 shrink-0" aria-hidden />
      </header>

      <div className="relative z-10 no-scrollbar flex-1 overflow-y-auto px-4 pb-8">
        <div className="surprise-hero relative mt-1 overflow-hidden rounded-[22px] ring-1 ring-[#ffd84d]/35">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,#120e08_0%,#1a140a_42%,#0a0806_100%)]" />
          <div className="absolute -right-6 -top-8 size-40 rounded-full bg-[#ffd84d]/18 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-28 w-36 bg-[radial-gradient(circle_at_70%_60%,rgb(255_80_110/0.35),transparent_65%)]" />
          <div className="relative grid grid-cols-[1.15fr_0.95fr] gap-2 px-4 py-4">
            <div className="flex flex-col justify-center pr-1">
              <p className="font-serif text-[22px] font-bold leading-[1.15] tracking-tight text-[#f0d56a]">
                {t("surpriseHeroTitle")}
              </p>
              <p className="mt-2 text-[12px] leading-snug text-white/65">{t("surpriseHeroSub")}</p>
            </div>
            <div className="relative flex min-h-[118px] items-end justify-center">
              <img
                src="/fx/love/love_gift.png"
                alt=""
                draggable={false}
                decoding="async"
                className="surprise-hero-art relative z-[1] h-[112px] w-auto max-w-[140px] object-contain drop-shadow-[0_12px_28px_rgb(255_216_77/0.35)]"
              />
              <img
                src="/fx/love/love_hearts.png"
                alt=""
                draggable={false}
                decoding="async"
                className="pointer-events-none absolute -right-1 top-1 h-12 w-12 animate-pulse object-contain opacity-90"
              />
              <span className="pointer-events-none absolute left-2 top-3 text-[22px] drop-shadow">😍</span>
              <span className="pointer-events-none absolute bottom-10 left-0 text-[14px] opacity-80">✨</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="press mt-3 flex h-12 w-full items-center justify-between gap-2 rounded-full bg-[#ffd84d] px-4 text-[#0b1220] shadow-[0_10px_28px_rgb(255_216_77/0.28)]"
          onClick={onScratch}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Wand2 className="size-4 shrink-0" strokeWidth={2.4} />
            <span className="truncate text-[14px] font-bold">{t("scratchCreateCta")}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 opacity-70" />
        </button>

        <div className="mt-5 mb-3 flex items-end justify-between">
          <h2 className="text-[17px] font-bold text-white">{t("surpriseCategories")}</h2>
          <button
            type="button"
            className="press flex items-center gap-0.5 text-[12px] font-medium text-white/50"
            onClick={onSeeAll ?? (() => onCategory("amour"))}
          >
            {t("surpriseSeeAll")}
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cats.map((cat) => (
            <button
              key={cat.id}
              type="button"
              disabled={!cat.ready}
              className={cn(
                "group relative aspect-[0.92] overflow-hidden rounded-[20px] text-left ring-1 ring-white/10",
                cat.ready ? "press" : "opacity-90",
              )}
              onClick={() => {
                if (!cat.ready) return;
                onCategory(cat.id as "amour" | "anniv" | "night" | "day");
              }}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br", cat.tint)} />
              <img
                src={cat.img}
                alt=""
                draggable={false}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-screen transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgb(0_0_0/0.78)_100%)]" />
              {!cat.ready ? (
                <span className="absolute right-2 top-2 z-10 rounded-full bg-[#ffd84d] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0b1220]">
                  {t("surpriseSoon")}
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 z-10 p-3">
                <p className="text-[15px] font-bold leading-tight text-white">{cat.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/65">{cat.sub}</p>
              </div>
              {cat.ready ? (
                <span className="absolute bottom-3 right-3 z-10 flex size-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                  <ChevronRight className="size-3.5 text-white" />
                </span>
              ) : (
                <span className="absolute bottom-3 right-3 z-10 flex size-7 items-center justify-center rounded-full bg-black/35 ring-1 ring-white/10">
                  <Sparkles className="size-3 text-[#ffd84d]/70" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
