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
  bg: "#eef2f7",
  fg: "#0f1b2d",
  muted: "#64708a",
  surface: "#ffffff",
  surface2: "#f3f6fa",
  navy: "#ffffff",
  accent: "#1a6bd9",
  accentFg: "#ffffff",
  paper: "#0f1b2d",
  danger: "#e0344f",
  ink: "#ffffff",
  hair: "rgba(15,27,45,0.09)",
  glass: "rgba(255,255,255,0.72)",
  glassStrong: "rgba(250,251,253,0.9)",
  glassCard: "rgba(255,255,255,0.92)",
  bubbleMe: "#1a6bd9",
  bubbleMeFg: "#ffffff",
  bubbleThem: "#ffffff",
  authInput: "#ffffff",
  introBg: "#020a22",
  success: "#1f9d4c",
  surpriseInk: "#0A0B10",
  surprisePaper: "#F8F4E8",
  surpriseGold: "#F5C94F",
  surpriseGoldDeep: "#A87520",
  surpriseLine: "rgba(245,201,79,0.5)",
  shareTile: "#f3f6fa",
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
  sheet: "#ffffff",
  onAccent: "#ffffff",
  card: "#ffffff",
  cardDim: "#ffffff",
  panel: "#ffffff",
  menu: "#ffffff",
  tray: "rgba(255,255,255,0.98)",
  dashed: "rgba(100,112,138,0.5)",
  scrim: "rgba(15,27,45,0.35)",
  imageVeil: "rgba(255,255,255,0.66)",
  tabSheet: "#ffffff",
  tabSheetRow: "#f3f6fa",
  tabSheetTile: "#f3f6fa",
  bubbleMeMuted: "rgba(255,255,255,0.78)",
  bubbleMeAccent: "#ffffff",
};

export type ThemeName = "dark" | "light";
export const palettes: Record<ThemeName, Palette> = { dark, light };

/**
 * Palette active. Objet MUTABLE : applyTheme() le remplit, puis l'app est remontée
 * (clé sur la racine) pour que chaque style en ligne relise les couleurs.
 */
export const colors: Palette = { ...dark };
export let themeName: ThemeName = "dark";

export function applyTheme(name: ThemeName) {
  themeName = name;
  Object.assign(colors, palettes[name]);
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
  return themeName === "light" ? `rgba(15,27,45,${a})` : `rgba(247,249,252,${a})`;
}
/** Voile clair sur fond sombre (sombre sur fond clair) : puces, séparateurs, fonds de boutons. */
export function whiteA(a: number) {
  return themeName === "light" ? `rgba(15,27,45,${a})` : `rgba(255,255,255,${a})`;
}
/** Fond de page avec transparence (fondus sous les photos d'en-tête). */
export function bgA(a: number) {
  return themeName === "light" ? `rgba(238,242,247,${a})` : `rgba(5,7,13,${a})`;
}
/** Couleur d'accent avec transparence (jaune en sombre, bleu en clair). */
export function accentA(a: number) {
  return themeName === "light" ? `rgba(26,107,217,${a})` : `rgba(255,216,77,${a})`;
}
