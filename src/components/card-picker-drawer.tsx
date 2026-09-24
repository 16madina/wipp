import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SURPRISE_CARD_CATALOG, type SurpriseCardDef } from "@/lib/surprise-cards";
import { useT, useWgoStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CardPickerDrawer({
  selectedId,
  onClose,
  onPick,
}: {
  selectedId: string;
  onClose: () => void;
  onPick: (card: SurpriseCardDef) => void;
}) {
  const t = useT();
  const lang = useWgoStore((s) => s.language);
  const [q, setQ] = useState("");

  const cards = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return SURPRISE_CARD_CATALOG;
    return SURPRISE_CARD_CATALOG.filter(
      (c) =>
        c.card_name.toLowerCase().includes(query) ||
        c.card_name_en.toLowerCase().includes(query) ||
        c.card_id.toLowerCase().includes(query),
    );
  }, [q]);

  return (
    <div className="absolute inset-0 z-[55]">
      <button type="button" className="absolute inset-0 bg-black/55" aria-label={t("back")} onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-[#070b14] shadow-[-12px_0_40px_rgb(0_0_0/0.5)]">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15" />
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0">
            <p className="text-[20px] font-bold text-white">{t("surpriseChooseCardTitle")}</p>
            <p className="mt-0.5 text-[12px] text-white/55">{t("surpriseChooseCardHint")}</p>
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
              placeholder={t("surpriseSearchCard")}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
            />
          </label>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          {cards.length === 0 ? (
            <p className="mt-8 text-center text-[13px] text-white/45">{t("fxNoResults")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {cards.map((card) => {
                const on = selectedId === card.card_id;
                return (
                  <button
                    key={card.card_id}
                    type="button"
                    className={cn(
                      "press overflow-hidden rounded-[18px] text-left ring-1 transition",
                      on ? "ring-[#ffd84d] shadow-[0_0_20px_rgb(255_216_77/0.2)]" : "ring-white/10",
                    )}
                    onClick={() => onPick(card)}
                  >
                    <img
                      src={card.asset_url}
                      alt=""
                      draggable={false}
                      decoding="async"
                      className="block h-auto w-full object-contain"
                    />
                    <div className="flex items-center justify-between gap-2 bg-[#0c1018] px-3 py-2.5">
                      <span className="text-[14px] font-semibold text-white">
                        {lang === "fr" ? card.card_name : card.card_name_en}
                      </span>
                      {on ? (
                        <span className="rounded-full bg-[#ffd84d] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0b1220]">
                          {t("chosen")}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
