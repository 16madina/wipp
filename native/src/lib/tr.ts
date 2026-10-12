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

export function tr(fr: string, ...values: unknown[]): string {
  const text = english ? (TR_EN[fr] ?? fr) : fr;
  return values.length ? text.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)] ?? "")) : text;
}

/** Locale for dates and numbers shown to the user. */
export function trLocale() {
  return english ? "en-CA" : "fr-FR";
}
