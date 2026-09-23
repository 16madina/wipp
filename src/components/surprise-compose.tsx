import { useState } from "react";
import {
  ChevronRight,
  ImageIcon,
  Pencil,
  Send,
  Smile,
  Wand2,
} from "lucide-react";
import type { ScratchDesign } from "@/components/scratch-card";
import { ScratchCard } from "@/components/scratch-card";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

const DESIGNS: { id: ScratchDesign; glyph: string; labelKey: "themeGold" | "themeLove" | "themeBirthday" | "themeFun" | "themeSecret" }[] = [
  { id: "gold", glyph: "🖤", labelKey: "themeGold" },
  { id: "love", glyph: "❤️", labelKey: "themeLove" },
  { id: "birthday", glyph: "🎂", labelKey: "themeBirthday" },
  { id: "fun", glyph: "😂", labelKey: "themeFun" },
  { id: "secret", glyph: "🌙", labelKey: "themeSecret" },
];

const MAX = 200;

export function SurpriseCompose({
  text,
  design,
  animationLabel,
  onBack,
  onText,
  onDesign,
  onAnimation,
  onClearAnimation,
  onSend,
}: {
  text: string;
  design: ScratchDesign;
  animationLabel?: string | null;
  onBack: () => void;
  onText: (v: string) => void;
  onDesign: (d: ScratchDesign) => void;
  onAnimation: () => void;
  onClearAnimation?: () => void;
  onSend: () => void;
}) {
  const t = useT();
  const [live, setLive] = useState(true);
  const [pickCard, setPickCard] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#05070e]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_40%_at_50%_-8%,rgb(255_216_77/0.10),transparent_55%)]" />

      <header className="relative z-10 flex items-start gap-2 px-3 pb-1 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          type="button"
          className="press mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          aria-label={t("back")}
          onClick={onBack}
        >
          <ChevronRight className="size-5 rotate-180 text-white/90" />
        </button>
        <div className="min-w-0 flex-1 pt-1 text-center">
          <p className="text-[17px] font-bold tracking-tight text-white">🎁 {t("surpriseStudio")}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/50">{t("surpriseStudioSub")}</p>
        </div>
        <span className="size-10 shrink-0" aria-hidden />
      </header>

      <div className="relative z-10 no-scrollbar flex-1 overflow-y-auto px-4 pb-28">
        <h1 className="mt-2 text-[26px] font-bold tracking-tight text-white">{t("surpriseCreateTitle")}</h1>
        <p className="mt-1 text-[13px] text-white/55">{t("surpriseCreateSub")}</p>

        <div className="mt-4 rounded-[20px] bg-[#0c1018] p-3 ring-1 ring-white/10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
              <Pencil className="size-3.5 text-[#ffd84d]" strokeWidth={2.4} />
              {t("surpriseYourMessage")}
            </span>
            <span className="text-[11px] tabular-nums text-white/45">
              {text.length}/{MAX}
            </span>
          </div>
          <div className="relative">
            <textarea
              value={text}
              maxLength={MAX}
              rows={3}
              placeholder={t("surpriseMessagePh")}
              className="w-full resize-none rounded-2xl bg-[#070b14] px-3 py-3 pr-10 text-[15px] text-white outline-none ring-1 ring-white/10 placeholder:text-white/35"
              onChange={(e) => onText(e.target.value.slice(0, MAX))}
            />
            <span className="pointer-events-none absolute bottom-3 right-3 text-white/35">
              <Smile className="size-5" />
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className="press flex h-[52px] items-center justify-between gap-1 rounded-2xl bg-[#ffd84d] px-3 text-[#0b1220]"
            onClick={onAnimation}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Wand2 className="size-4 shrink-0" strokeWidth={2.4} />
              <span className="truncate text-left text-[12px] font-bold leading-tight">
                {animationLabel || t("fxAdd")}
              </span>
            </span>
            {animationLabel && onClearAnimation ? (
              <span
                role="button"
                tabIndex={0}
                className="shrink-0 text-[16px] leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAnimation();
                }}
              >
                ×
              </span>
            ) : (
              <ChevronRight className="size-4 shrink-0 opacity-60" />
            )}
          </button>
          <button
            type="button"
            className="press flex h-[52px] items-center justify-between gap-1 rounded-2xl bg-[#0c1018] px-3 text-white ring-1 ring-[#ffd84d]/70"
            onClick={() => setPickCard(true)}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <ImageIcon className="size-4 shrink-0 text-[#ffd84d]" />
              <span className="truncate text-left text-[12px] font-bold leading-tight">{t("surpriseChooseCard")}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-[#ffd84d]/80" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold text-white">{t("surpriseCardPreview")}</h2>
          <label className="flex items-center gap-2 text-[11px] text-white/55">
            {t("surpriseLivePreview")}
            <button
              type="button"
              role="switch"
              aria-checked={live}
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                live ? "bg-[#ffd84d]" : "bg-white/15",
              )}
              onClick={() => setLive((v) => !v)}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition",
                  live ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </label>
        </div>

        <div className="mt-3 overflow-hidden rounded-[22px] bg-[#0a0c12] ring-1 ring-white/10">
          {live ? (
            <div className="flex flex-col items-center px-4 py-5">
              <ScratchCard
                key={`${previewKey}-${design}`}
                text={text.trim() || t("scratchHere")}
                design={design}
                wait={t("scratchBrush")}
                hint={t("scratchHere")}
                found={t("scratchFound")}
                replayLabel={t("scratchReplay")}
              />
              <button
                type="button"
                className="mt-3 text-[12px] font-medium text-white/45"
                onClick={() => setPreviewKey((n) => n + 1)}
              >
                {t("scratchReset")}
              </button>
            </div>
          ) : (
            <img
              src="/fx/surprise/compose-preview.jpg"
              alt=""
              draggable={false}
              decoding="async"
              className="w-full object-cover"
            />
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#05070e] via-[#05070eef] to-transparent px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          disabled={!text.trim()}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ffd84d] text-[15px] font-bold text-[#0b1220] shadow-[0_12px_28px_rgb(255_216_77/0.28)] disabled:opacity-40"
          onClick={onSend}
        >
          <Send className="size-4" strokeWidth={2.4} />
          {t("scratchSend")}
        </button>
      </div>

      {pickCard ? (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/55">
          <button type="button" className="absolute inset-0" aria-label={t("back")} onClick={() => setPickCard(false)} />
          <div className="relative rounded-t-[24px] bg-[#0c1018] px-4 pb-8 pt-3 ring-1 ring-white/10">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-3 text-center text-[16px] font-bold text-white">{t("surpriseChooseCard")}</p>
            <div className="grid grid-cols-3 gap-2.5">
              {DESIGNS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={cn(
                    "flex flex-col items-center rounded-2xl py-3 ring-1",
                    design === d.id ? "bg-[#ffd84d] text-[#0b1220] ring-[#ffd84d]" : "bg-[#070b14] text-white ring-white/10",
                  )}
                  onClick={() => {
                    onDesign(d.id);
                    setPreviewKey((n) => n + 1);
                    setPickCard(false);
                    setLive(true);
                  }}
                >
                  <span className="text-[22px]">{d.glyph}</span>
                  <span className="mt-1 text-[12px] font-semibold">{t(d.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
