import { ChevronRight, Wand2 } from "lucide-react";
import { useT } from "@/lib/store";

type SoonId = "carte" | "timer" | "confettis" | "cadeau";

export function SurpriseHub({
  onBack,
  onScratch,
}: {
  onBack: () => void;
  onScratch: () => void;
}) {
  const t = useT();

  const soon: { id: SoonId; title: string; img: string }[] = [
    { id: "carte", title: t("scratchCardTitle"), img: "/fx/surprise/carte.jpg" },
    { id: "timer", title: t("catTimer"), img: "/fx/surprise/timer.jpg" },
    { id: "confettis", title: t("catConfetti"), img: "/fx/surprise/confetti.jpg" },
    { id: "cadeau", title: t("catGiftShort"), img: "/fx/surprise/cadeau.jpg" },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#05070e]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_45%_at_50%_-8%,rgb(255_216_77/0.10),transparent_55%)]" />

      <header className="relative z-10 flex items-start gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          type="button"
          className="press mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          aria-label={t("back")}
          onClick={onBack}
        >
          <ChevronRight className="size-5 rotate-180 text-white/90" />
        </button>
        <div className="min-w-0 flex-1 pt-1 text-center">
          <p className="text-[18px] font-bold tracking-tight text-white">🎁 {t("surpriseStudio")}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-white/55">{t("surpriseStudioSub")}</p>
        </div>
        <span className="size-10 shrink-0" aria-hidden />
      </header>

      <div className="relative z-10 no-scrollbar flex-1 overflow-y-auto px-4 pb-8">
        <div className="mt-1 overflow-hidden rounded-[22px] bg-[#0a0c12] ring-1 ring-[#ffd84d]/55 shadow-[0_0_28px_rgb(255_216_77/0.12)]">
          <div className="relative aspect-[16/11] overflow-hidden">
            <img
              src="/fx/surprise/hero-scratch.jpg"
              alt=""
              draggable={false}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
          <div className="px-4 pb-4 pt-3">
            <p className="text-[18px] font-bold text-white">{t("scratchName")}</p>
            <p className="mt-1 text-[13px] leading-snug text-white/60">{t("scratchLead")}</p>
            <button
              type="button"
              className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ffd84d] text-[15px] font-bold text-[#0b1220] shadow-[0_10px_24px_rgb(255_216_77/0.28)]"
              onClick={onScratch}
            >
              <Wand2 className="size-4" strokeWidth={2.4} />
              {t("scratchCreate")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {soon.map((item) => (
            <div
              key={item.id}
              role="img"
              aria-label={`${item.title} — ${t("surpriseSoon")}`}
              className="relative aspect-[0.95] overflow-hidden rounded-[20px] ring-1 ring-white/10"
            >
              <img
                src={item.img}
                alt=""
                draggable={false}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
