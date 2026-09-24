import type { ScratchDesign } from "@/components/scratch-card";

/** Normalized rect as % of the card asset (0–100). */
export type ScratchZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SurpriseCardDef = {
  card_id: string;
  card_name: string;
  card_name_en: string;
  asset_url: string;
  scratch_zone: ScratchZone;
  /** Foil look for the interactive scratch layer */
  scratch_material: ScratchDesign;
  /** Optional foil tint override for dust particles */
  scratch_color?: string;
};

/**
 * Official surprise card catalog.
 * Only add entries when the user provides the asset — do not invent cards.
 */
export const SURPRISE_CARD_CATALOG: SurpriseCardDef[] = [
  {
    card_id: "wipp_gold",
    card_name: "WIPP Gold",
    card_name_en: "WIPP Gold",
    asset_url: "/fx/surprise/cards/wipp-gold.jpg",
    // Central gold brushstroke — clears bow (TL) and crown (TR)
    scratch_zone: { x: 16, y: 27, w: 64, h: 46 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
];

export function surpriseCardById(id: string | null | undefined) {
  if (!id) return SURPRISE_CARD_CATALOG[0] ?? null;
  return SURPRISE_CARD_CATALOG.find((c) => c.card_id === id) ?? SURPRISE_CARD_CATALOG[0] ?? null;
}

export const DEFAULT_SURPRISE_CARD_ID = "wipp_gold";
