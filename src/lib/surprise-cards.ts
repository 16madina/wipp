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
    scratch_zone: { x: 16, y: 27, w: 64, h: 46 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_bff",
    card_name: "WIPP BFF",
    card_name_en: "WIPP BFF",
    asset_url: "/fx/surprise/cards/wipp-bff.jpg",
    scratch_zone: { x: 31, y: 24, w: 56, h: 47 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_rose",
    card_name: "WIPP Rose",
    card_name_en: "WIPP Rose",
    asset_url: "/fx/surprise/cards/wipp-rose.jpg",
    scratch_zone: { x: 27, y: 25, w: 58, h: 48 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_amour",
    card_name: "WIPP Amour",
    card_name_en: "WIPP Love",
    asset_url: "/fx/surprise/cards/wipp-amour.jpg",
    scratch_zone: { x: 36, y: 23, w: 52, h: 48 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_voyage",
    card_name: "WIPP Voyage",
    card_name_en: "WIPP Travel",
    asset_url: "/fx/surprise/cards/wipp-voyage.jpg",
    scratch_zone: { x: 32, y: 22, w: 52, h: 50 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_fete",
    card_name: "WIPP Fête",
    card_name_en: "WIPP Party",
    asset_url: "/fx/surprise/cards/wipp-fete.jpg",
    scratch_zone: { x: 26, y: 29, w: 58, h: 44 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_marbre",
    card_name: "WIPP Marbre",
    card_name_en: "WIPP Marble",
    asset_url: "/fx/surprise/cards/wipp-marbre.jpg",
    scratch_zone: { x: 30, y: 30, w: 50, h: 44 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_vip",
    card_name: "WIPP VIP",
    card_name_en: "WIPP VIP",
    asset_url: "/fx/surprise/cards/wipp-vip.jpg",
    scratch_zone: { x: 32, y: 28, w: 54, h: 40 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
  {
    card_id: "wipp_prestige",
    card_name: "WIPP Prestige",
    card_name_en: "WIPP Prestige",
    asset_url: "/fx/surprise/cards/wipp-prestige.jpg",
    scratch_zone: { x: 32, y: 25, w: 53, h: 45 },
    scratch_material: "gold",
    scratch_color: "#e7c56a",
  },
];

export function surpriseCardById(id: string | null | undefined) {
  if (!id) return SURPRISE_CARD_CATALOG[0] ?? null;
  return SURPRISE_CARD_CATALOG.find((c) => c.card_id === id) ?? SURPRISE_CARD_CATALOG[0] ?? null;
}

export const DEFAULT_SURPRISE_CARD_ID = "wipp_gold";
