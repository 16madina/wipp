/**
 * Notification texts are written in French where they are sent. A phone set to English gets
 * the English text from here; an unknown text is sent as it is.
 */
const EXACT: Record<string, string> = {
  "Nouveau message": "New message",
  "Nouveau message professionnel": "New business message",
  Groupe: "Group",
  "Demande de connexion": "Connection request",
  "Quelqu’un veut se connecter près de toi": "Someone nearby wants to connect",
  "Votre connexion éphémère expire bientôt.": "Your temporary connection expires soon.",
  "Demande depuis À proximité": "Request from Nearby",
  "Demande depuis À proximité · mode Invisible": "Request from Nearby · Invisible mode",
  "Tu es invité(e) à un événement en ligne WIPP": "You’re invited to an online WIPP event",
  "C’est en direct ! Rejoins l’événement.": "It’s live! Join the event.",
  "Ton direct est terminé": "Your live has ended",
  "Ton direct va s’arrêter": "Your live is about to stop",
  "Tu as laissé un direct en cours": "You left a live running",
  "Ton direct WIPP a lieu dans 3 jours.": "Your WIPP live is in 3 days.",
  "Ton direct WIPP a lieu aujourd’hui. Pense à le démarrer à l’heure !": "Your WIPP live is today. Remember to start it on time!",
  "Ton direct commence dans 30 minutes : prépare-toi à le démarrer.": "Your live starts in 30 minutes: get ready to start it.",
  "C’est dans 3 jours ! Tu es inscrit(e) à ce direct WIPP.": "It’s in 3 days! You’re registered for this WIPP live.",
  "C’est aujourd’hui ! Rendez-vous sur WIPP pour le direct.": "It’s today! See you on WIPP for the live.",
  "Le direct commence dans 30 minutes.": "The live starts in 30 minutes.",
  "Appel manqué": "Missed call",
  "Appel accepté": "Call accepted",
  "Appel refusé": "Call declined",
  "Appel annulé": "Call cancelled",
  "Appel terminé": "Call ended",
  "Appel de groupe terminé": "Group call ended",
};

const PATTERNS: [RegExp, string][] = [
  [/^(.*) : Nouveau message$/, "$1: New message"],
  [/^(.*) souhaite garder votre contact$/, "$1 would like to keep in touch"],
  [/^« (.*) » a été arrêté automatiquement après 5 minutes sans toi\.$/, "“$1” was stopped automatically after 5 minutes without you."],
  [/^Reviens dans « (.*) » : il s’arrête automatiquement dans 1 minute\.$/, "Come back to “$1”: it stops automatically in 1 minute."],
  [/^Reviens dans « (.*) » : il s’arrête automatiquement dans (\d+) minutes\.$/, "Come back to “$1”: it stops automatically in $2 minutes."],
  [/^Touche pour reprendre « (.*) »\. Sinon il s’arrêtera automatiquement dans (\d+) minutes\.$/, "Tap to resume “$1”. Otherwise it will stop automatically in $2 minutes."],
  [/^(.*) vous appelle · Appel vidéo WIPP$/, "$1 is calling you · WIPP video call"],
  [/^(.*) vous appelle · Appel audio WIPP$/, "$1 is calling you · WIPP audio call"],
  [/^(.*) · Appel vidéo de groupe$/, "$1 · Group video call"],
  [/^(.*) · Appel audio de groupe$/, "$1 · Group audio call"],
];

export function pushEn(text: string): string {
  const exact = EXACT[text];
  if (exact) return exact;
  for (const [re, en] of PATTERNS) if (re.test(text)) return text.replace(re, en);
  return text;
}

/** Splits phone addresses by language; rows without one are French. */
export function byLang<T extends { lang?: string | null }>(tokens: T[]) {
  return { fr: tokens.filter((t) => t.lang !== "en"), en: tokens.filter((t) => t.lang === "en") };
}
