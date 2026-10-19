import { TR_EN } from "../generated/tr-en";

/**
 * Texts written in French in the screens: `tr("Annuler")` gives « Cancel » when WIPP is in English.
 * The French text is the key, so a text without translation simply stays in French.
 * `tr("Envoyer à {0}", name)` fills the numbered places.
 * A plain function (no hook): the app is redrawn from the top when the language changes.
 */
let english = false;

export function setTrLanguage(lang: string) {
  english = lang === "en";
}

/** "fr" or "en": what the phone tells the server, so notifications arrive in the same language. */
export function trLang(): "fr" | "en" {
  return english ? "en" : "fr";
}

export function tr(fr: string, ...values: unknown[]): string {
  const text = english ? (TR_EN[fr] ?? fr) : fr;
  return values.length ? text.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)] ?? "")) : text;
}

/**
 * Catalogues (themes, surprise cards…) are built once, before the language is known: their `label`
 * becomes a reader that follows the current language. Entries that already read it are left alone.
 */
export function trLabels<T extends { label: string }>(items: readonly T[]): readonly T[] {
  for (const item of items) {
    if (Object.getOwnPropertyDescriptor(item, "label")?.get) continue;
    const fr = item.label;
    Object.defineProperty(item, "label", { get: () => tr(fr), enumerable: true, configurable: true });
  }
  return items;
}

/** Locale for dates and numbers shown to the user. */
export function trLocale() {
  return english ? "en-CA" : "fr-FR";
}

/** Group notices are written once by the server, in French, for every member: read them in English here. */
const SYSTEM_EN: [RegExp, string][] = [
  [/^(.*) a créé le groupe$/, "$1 created the group"],
  [/^(.*) a été ajouté$/, "$1 was added"],
  [/^(.*) est maintenant admin$/, "$1 is now an admin"],
  [/^(.*) n’est plus admin$/, "$1 is no longer an admin"],
  [/^(.*) a rejoint$/, "$1 joined"],
  [/^(.*) a quitté le groupe$/, "$1 left the group"],
  [/^(.*) a été retiré$/, "$1 was removed"],
  [/^La description du groupe a été modifiée$/, "The group description was changed"],
  [/^La photo du groupe a été supprimée$/, "The group photo was removed"],
  [/^La photo du groupe a été modifiée$/, "The group photo was changed"],
  [/^Le nom du groupe a été modifié$/, "The group name was changed"],
  [/^Le nom du groupe est maintenant « (.*) »$/, "The group is now called “$1”"],
  [/^Les paramètres du groupe ont été modifiés$/, "The group settings were changed"],
];
export function trSystem(text: string, exact = true): string {
  if (!english || !text) return text;
  for (const [re, en] of SYSTEM_EN) {
    if (re.test(text)) return text.replace(re, en).replace(/^(Quelqu’un|Un membre) /, (_, who) => (who === "Un membre" ? "A member " : "Someone "));
  }
  return exact ? (TR_EN[text] ?? text) : text;
}
