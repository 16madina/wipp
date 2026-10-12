/** Thème sombre (par défaut) : bleu nuit + jaune WIPP. */
const dark = {
  bg: "#070a0f",
  fg: "#f9fafb",
  muted: "#8b93a7",
  surface: "#111827",
  surface2: "#151c2c",
  navy: "#0b1220",
  accent: "#ffd84d",
  accentFg: "#0b1220",
  paper: "#f7f9fc",
  danger: "#ff5d73",
  ink: "#05070c",
  hair: "rgba(255,255,255,0.08)",
  glass: "rgba(11,18,32,0.55)",
  glassStrong: "rgba(11,18,32,0.72)",
  glassCard: "rgba(21,28,44,0.58)",
  bubbleMe: "#0b1220",
  bubbleMeFg: "#f7f9fc",
  bubbleThem: "rgba(26,34,51,0.78)",
  authInput: "#242526",
  introBg: "#020a22",
  success: "#30D158",
  surpriseInk: "#0A0B10",
  surprisePaper: "#F8F4E8",
  surpriseGold: "#F5C94F",
  surpriseGoldDeep: "#A87520",
  surpriseLine: "rgba(245,201,79,0.5)",
  shareTile: "#191B1B",
  shareTileHighlight: "#29271C",
  shareTileBorder: "rgba(215,189,112,0.22)",
  shareSubtitle: "#B3B9C4",
  surprisePanel: "#10171B",
  surpriseSecondary: "#AEB7CD",
  surpriseBright: "#FFE34F",
  // Tokens sémantiques (valeurs identiques à l'ancien code en dur, en sombre).
  chip: "rgba(255,255,255,0.08)",
  chipSoft: "rgba(255,255,255,0.05)",
  chipStrong: "rgba(255,255,255,0.14)",
  fgSoft: "rgba(247,249,252,0.6)",
  fgFaint: "rgba(247,249,252,0.35)",
  accentSoft: "rgba(255,216,77,0.14)",
  accentLine: "rgba(255,216,77,0.35)",
  dangerSoft: "rgba(255,93,115,0.15)",
  overlay: "rgba(0,0,0,0.6)",
  sheet: "#0b1220",
  onAccent: "#0b1220",
  card: "rgba(16,22,36,0.92)",
  cardDim: "rgba(11,18,32,0.8)",
  panel: "#121722",
  menu: "#1a2230",
  tray: "rgba(18,23,34,0.98)",
  dashed: "rgba(139,147,167,0.6)",
  scrim: "rgba(5,7,12,0.55)",
  imageVeil: "rgba(2,8,30,0.46)",
  tabSheet: "#0c111a",
  tabSheetRow: "#10151f",
  tabSheetTile: "#141a26",
  bubbleMeMuted: "#8b93a7",
  bubbleMeAccent: "#ffd84d",
};

export type Palette = { [K in keyof typeof dark]: string };

/** Thème clair : fond gris-blanc, cartes blanches, bleu WIPP. */
const light: Palette = {
  // Soft whites: pure white was too bright next to the pale blue background.
  bg: "#e7ecf2",
  fg: "#0f1b2d",
  muted: "#64708a",
  surface: "#f5f7fa",
  surface2: "#ebeff5",
  navy: "#f5f7fa",
  accent: "#1a6bd9",
  accentFg: "#ffffff",
  paper: "#0f1b2d",
  danger: "#e0344f",
  ink: "#ffffff",
  hair: "rgba(15,27,45,0.09)",
  glass: "rgba(245,247,250,0.72)",
  glassStrong: "rgba(243,246,250,0.9)",
  glassCard: "rgba(245,247,250,0.92)",
  bubbleMe: "#1a6bd9",
  bubbleMeFg: "#ffffff",
  bubbleThem: "#f5f7fa",
  authInput: "#f5f7fa",
  introBg: "#020a22",
  success: "#1f9d4c",
  surpriseInk: "#0A0B10",
  surprisePaper: "#F8F4E8",
  surpriseGold: "#F5C94F",
  surpriseGoldDeep: "#A87520",
  surpriseLine: "rgba(245,201,79,0.5)",
  shareTile: "#ebeff5",
  shareTileHighlight: "#e8f0fc",
  shareTileBorder: "rgba(26,107,217,0.18)",
  shareSubtitle: "#64708a",
  surprisePanel: "#10171B",
  surpriseSecondary: "#AEB7CD",
  surpriseBright: "#FFE34F",
  chip: "rgba(15,27,45,0.06)",
  chipSoft: "rgba(15,27,45,0.04)",
  chipStrong: "rgba(15,27,45,0.1)",
  fgSoft: "rgba(15,27,45,0.6)",
  fgFaint: "rgba(15,27,45,0.35)",
  accentSoft: "rgba(26,107,217,0.1)",
  accentLine: "rgba(26,107,217,0.35)",
  dangerSoft: "rgba(224,52,79,0.1)",
  overlay: "rgba(15,27,45,0.4)",
  sheet: "#f5f7fa",
  onAccent: "#ffffff",
  card: "#f5f7fa",
  cardDim: "#f5f7fa",
  panel: "#f5f7fa",
  menu: "#f5f7fa",
  tray: "rgba(245,247,250,0.98)",
  dashed: "rgba(100,112,138,0.5)",
  scrim: "rgba(15,27,45,0.35)",
  imageVeil: "rgba(255,255,255,0.66)",
  tabSheet: "#f5f7fa",
  tabSheetRow: "#ebeff5",
  tabSheetTile: "#ebeff5",
  bubbleMeMuted: "rgba(255,255,255,0.78)",
  bubbleMeAccent: "#ffffff",
};

/** Brightness of a colour set: decides the logo, the status bar, the keyboard. */
export type ThemeName = "dark" | "light";

const rgb = (hex: string) => {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
};

/** A light colour set: same structure as « Bleu clair », other tints. */
function lightSkin(o: { bg: string; fg: string; muted: string; card: string; card2: string; accent: string; highlight: string; danger?: string }): Palette {
  const f = rgb(o.fg), a = rgb(o.accent), c = rgb(o.card), d = o.danger ?? light.danger;
  return {
    ...light,
    bg: o.bg, fg: o.fg, muted: o.muted, paper: o.fg, accent: o.accent, danger: d,
    surface: o.card, navy: o.card, bubbleThem: o.card, authInput: o.card, sheet: o.card, card: o.card, cardDim: o.card, panel: o.card, menu: o.card, tabSheet: o.card,
    surface2: o.card2, shareTile: o.card2, tabSheetRow: o.card2, tabSheetTile: o.card2,
    hair: `rgba(${f},0.09)`, glass: `rgba(${c},0.72)`, glassStrong: `rgba(${c},0.9)`, glassCard: `rgba(${c},0.92)`, tray: `rgba(${c},0.98)`, imageVeil: `rgba(${c},0.66)`,
    bubbleMe: o.accent, shareTileHighlight: o.highlight, shareTileBorder: `rgba(${a},0.18)`, shareSubtitle: o.muted,
    chip: `rgba(${f},0.06)`, chipSoft: `rgba(${f},0.04)`, chipStrong: `rgba(${f},0.1)`, fgSoft: `rgba(${f},0.6)`, fgFaint: `rgba(${f},0.35)`,
    accentSoft: `rgba(${a},0.1)`, accentLine: `rgba(${a},0.35)`, dangerSoft: `rgba(${rgb(d)},0.1)`,
    overlay: `rgba(${f},0.4)`, scrim: `rgba(${f},0.35)`, dashed: `rgba(${rgb(o.muted)},0.5)`,
  };
}

/** Rose champagne: warm blush cards, deep rose accent. Alerts use a frank red so they never look like a normal button. */
const rose = lightSkin({ bg: "#f4e5e2", fg: "#2c1a21", muted: "#8b6f78", card: "#fdf5f3", card2: "#f8eae7", accent: "#d6456f", highlight: "#fbe0e6", danger: "#c62828" });
/** Bleu sarcelle: fresh teal on a pale aqua background. */
const teal = lightSkin({ bg: "#e0eff0", fg: "#0f2a2e", muted: "#5d7b80", card: "#f3fafa", card2: "#e6f3f3", accent: "#0e8e8c", highlight: "#d5efee" });

/** Bleu glacier: the night version of the blue theme (deep navy, icy blue accent). */
const glacier: Palette = {
  ...dark,
  bg: "#081321", surface: "#12233a", surface2: "#172b46", navy: "#0d1b2f", accent: "#8cc4ff", accentFg: "#0b1220", muted: "#8fa3bf",
  glass: "rgba(13,27,47,0.55)", glassStrong: "rgba(13,27,47,0.72)", glassCard: "rgba(23,43,70,0.58)",
  bubbleMe: "#17365c", bubbleThem: "rgba(27,45,72,0.78)", bubbleMeMuted: "#9fb3cf", bubbleMeAccent: "#8cc4ff",
  shareTile: "#132132", shareTileHighlight: "#1a304b", shareTileBorder: "rgba(140,196,255,0.22)",
  accentSoft: "rgba(140,196,255,0.14)", accentLine: "rgba(140,196,255,0.35)",
  sheet: "#0d1b2f", card: "rgba(17,31,52,0.92)", cardDim: "rgba(13,27,47,0.8)", panel: "#122038", menu: "#1a2c46", tray: "rgba(17,31,52,0.98)",
  tabSheet: "#0b1727", tabSheetRow: "#0f1d31", tabSheetTile: "#14253c", dashed: "rgba(143,163,191,0.6)",
};

/** The colour sets offered in Réglages › Apparence. « dark » stays the WIPP default. */
export type SkinName = "dark" | "light" | "rose" | "teal" | "glacier";
export const palettes: Record<SkinName, Palette> = { dark, light, rose, teal, glacier };
export const skinBase: Record<SkinName, ThemeName> = { dark: "dark", light: "light", rose: "light", teal: "light", glacier: "dark" };

/**
 * Palette active. Objet MUTABLE : applyTheme() le remplit, puis l'app est remontée
 * (clé sur la racine) pour que chaque style en ligne relise les couleurs.
 */
export const colors: Palette = { ...dark };
export let themeName: ThemeName = "dark";
export let skinName: SkinName = "dark";

export function applyTheme(skin: SkinName) {
  skinName = skin;
  themeName = skinBase[skin];
  Object.assign(colors, palettes[skin]);
}

/** Couleurs FIXES (identiques dans les deux thèmes) : écrans d'appel, caméra, texte sur photo/vidéo. */
export const fixed = {
  white: "#ffffff",
  paper: "#f7f9fc",
  navy: "#0b1220",
  bg: "#070a0f",
  gold: "#ffd84d",
  muted: "#8b93a7",
  hair: "rgba(255,255,255,0.08)",
} as const;

export const layout = {
  navBarHeight: 56,
  tabBarHeight: 72,
  minTouch: 44,
  phoneMaxWidth: 430,
  shareTileHeight: 120,
  composerIcon: 36,
  surpriseCardWidth: 260,
  surpriseCardHeight: 216,
  surpriseMessageLimit: 300,
  surpriseArtworkHeight: 86,
  surpriseOptionHeight: 146,
  surpriseAnimationTileHeight: 132,
};

/** Texte / traits sur le fond, avec transparence (blanc en sombre, bleu nuit en clair). */
export function fgA(a: number) {
  return themeName === "light" ? `rgba(${rgb(colors.fg)},${a})` : `rgba(247,249,252,${a})`;
}
/** Voile clair sur fond sombre (sombre sur fond clair) : puces, séparateurs, fonds de boutons. */
export function whiteA(a: number) {
  return themeName === "light" ? `rgba(${rgb(colors.fg)},${a})` : `rgba(255,255,255,${a})`;
}
/** Fond de page avec transparence (fondus sous les photos d'en-tête). */
export function bgA(a: number) {
  return skinName === "dark" ? `rgba(5,7,13,${a})` : `rgba(${rgb(colors.bg)},${a})`;
}
/** Couleur d'accent avec transparence (jaune en sombre, bleu en clair). */
export function accentA(a: number) {
  return `rgba(${rgb(colors.accent)},${a})`;
}
