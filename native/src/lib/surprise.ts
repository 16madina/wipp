import { tr } from "./tr";
import { Clock3, Gift, Images, PartyPopper, type LucideIcon } from "lucide-react-native";
import { ANIM_MS } from "../generated/anim-durations";

export type SurpriseType = "scratch" | "countdown" | "gift" | "confetti";
/** `seconds` after the message was sent; `at` (a chosen date) is turned into seconds when the surprise is sent. */
export type SurpriseOptions = { countdown?: { seconds: number; at?: number } };
export type Surprise = {
  id: string;
  message: string;
  surpriseType: SurpriseType;
  designId: string | null;
  animationId: string | null;
  surpriseOptions: SurpriseOptions;
  time: string;
  mine: boolean;
  /** When the message was sent: a countdown runs on the real clock from there, app open or not. */
  sentAt?: number;
  /** Already opened once on this phone. */
  opened?: boolean;
  /** A confetti rain falls when the message is revealed. */
  confetti?: boolean;
};

const KIND_IDS: SurpriseType[] = ["scratch", "countdown", "gift", "confetti"];
/**
 * What travels in the message: the base kind, plus « +confetti » when the rain is on. The lock (countdown)
 * travels apart, as a number of seconds — so one surprise can be a card, locked, with confetti.
 */
export const surpriseKindWire = (surprise: Pick<Surprise, "surpriseType" | "confetti">) =>
  surprise.confetti && surprise.surpriseType !== "confetti" ? `${surprise.surpriseType}+confetti` : surprise.surpriseType;
export function parseSurpriseKind(wire: string | undefined | null): { surpriseType: SurpriseType; confetti: boolean } {
  const parts = (wire ?? "scratch").split("+");
  const base = KIND_IDS.includes(parts[0] as SurpriseType) ? (parts[0] as SurpriseType) : "scratch";
  return { surpriseType: base, confetti: base === "confetti" || parts.includes("confetti") };
}

export type SurpriseDesignItem = { id: string; label: string; mark: string; art?: string };
export type SurpriseEnter = "bottom" | "left" | "right" | "pop";
export type SurpriseAnimationItem = {
  id: string;
  label: string;
  art: string;
  /** Transparent full-screen animation, played like a WIPP Moment. */
  anim?: string;
  enter?: SurpriseEnter;
  durationMs?: number;
  /** Soundtrack played with the animation (can be muted). */
  sound?: string;
  /** Tab inside a category (Événements: halloween, noel…). */
  group?: string;
  /**
   * The clip opens on a sheet (wrapping paper…) that must hide the whole screen: `w`/`h` are the part of
   * the frame it takes; the clip starts zoomed on it, then eases back to its normal size after `ms`.
   */
  opening?: { w: number; h: number; ms: number };
};
export type SurpriseAnimationCategory = SurpriseAnimationItem & { collection?: string };

export const designPicker: Record<SurpriseType, { label: string; icon: LucideIcon }> = {
  scratch: { get label() { return tr("Choisir la carte à gratter"); }, icon: Images },
  countdown: { get label() { return tr("Choisir le moment"); }, icon: Clock3 },
  gift: { get label() { return tr("Choisir le cadeau"); }, icon: Gift },
  confetti: { get label() { return tr("Choisir les confettis"); }, icon: PartyPopper },
};

const SCRATCH_CARDS: SurpriseDesignItem[] = [
  { id: "amour", get label() { return tr("Amour"); }, mark: "♥", art: "fx/surprise/cards/wipp-amour.jpg" },
  { id: "rose", get label() { return tr("Rose"); }, mark: "♡", art: "fx/surprise/cards/wipp-rose.jpg" },
  { id: "gold", get label() { return tr("Or"); }, mark: "✦", art: "fx/surprise/cards/wipp-gold.jpg" },
  { id: "mood", get label() { return tr("Mood"); }, mark: "☾", art: "fx/surprise/cards/wipp-mood.jpg" },
  { id: "voyage", get label() { return tr("Voyage"); }, mark: "✈", art: "fx/surprise/cards/wipp-voyage.jpg" },
  { id: "bff", get label() { return tr("Amitié"); }, mark: "♡", art: "fx/surprise/cards/wipp-bff.jpg" },
  { id: "crew", get label() { return tr("Crew"); }, mark: "★", art: "fx/surprise/cards/wipp-crew.jpg" },
  { id: "fete", get label() { return tr("Fête"); }, mark: "✦", art: "fx/surprise/cards/wipp-fete.jpg" },
  { id: "marbre", get label() { return tr("Marbre"); }, mark: "◇", art: "fx/surprise/cards/wipp-marbre.jpg" },
  { id: "prestige", get label() { return tr("Prestige"); }, mark: "♛", art: "fx/surprise/cards/wipp-prestige.jpg" },
  { id: "vip", get label() { return tr("VIP"); }, mark: "♔", art: "fx/surprise/cards/wipp-vip.jpg" },
];

const LEGACY_SCRATCH: SurpriseDesignItem[] = [
  { id: "heart", get label() { return tr("Cœur"); }, mark: "♥", art: "fx/surprise/cards/wipp-amour.jpg" },
  { id: "stars", get label() { return tr("Étoiles"); }, mark: "✦", art: "fx/surprise/cards/wipp-gold.jpg" },
  { id: "crown", get label() { return tr("Couronne"); }, mark: "♛", art: "fx/surprise/cards/wipp-prestige.jpg" },
  { id: "neon", get label() { return tr("Néon"); }, mark: "♡", art: "fx/surprise/cards/wipp-rose.jpg" },
];

export const surpriseDesigns: Record<SurpriseType, SurpriseDesignItem[]> = {
  scratch: SCRATCH_CARDS,
  countdown: [],
  gift: [],
  confetti: [],
};

export const countdownChoices = [
  { seconds: 60, get label() { return tr("1 minute"); } },
  { seconds: 3600, get label() { return tr("1 heure"); } },
  { seconds: 86_400, get label() { return tr("24 heures"); } },
];

/** Built-in full-screen confetti rain (not a file): played by SurpriseAnimOverlay. */
export const CONFETTI_ANIMATION_ID = "wipp-confetti";
export const CONFETTI_MS = 2600;

/** « 2 j 03:15:00 », « 1:05:09 », « 0:42 ». */
export function countdownText(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const two = (n: number) => String(n).padStart(2, "0");
  const tail = `${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  if (d > 0) return `${d} j ${two(h)}:${tail}`;
  return h > 0 ? `${h}:${tail}` : `${Math.floor(s / 60)}:${two(s % 60)}`;
}

const clip = (id: string, label: string): SurpriseAnimationItem => ({
  id,
  get label() {
    return tr(label);
  },
  art: `fx/surprise/anims/${id}-poster.png`,
  anim: `fx/surprise/anims/${id}.webp`,
  sound: `fx/surprise/anims/${id}.m4a`,
  enter: "pop",
  durationMs: ANIM_MS[id] ?? 10_000,
});

export const amourAnimations: SurpriseAnimationItem[] = [
  clip("amour-je-taime", "Je t’aime"),
  clip("amour-nounours", "Nounours"),
  clip("amour-rose", "Rose"),
  clip("amour-lettre", "Lettre d’amour"),
  clip("amour-montgolfiere", "Je pense à toi"),
  clip("amour-bisou", "Mon amour"),
  clip("amour-buee", "Buée"),
  clip("amour-mains-coeur", "Mains cœur"),
  {
    id: "amour-pluie-cristal",
    get label() { return tr("Pluie d’amour"); },
    art: "fx/surprise/anims/amour-pluie-cristal-poster.png",
    anim: "fx/surprise/anims/amour-pluie-cristal.webp",
    enter: "pop",
    durationMs: ANIM_MS["amour-pluie-cristal"],
  },
  {
    id: "amour-fusion",
    get label() { return tr("Fusion"); },
    art: "fx/surprise/anims/amour-fusion-poster.png",
    anim: "fx/surprise/anims/amour-fusion.webp",
    enter: "pop",
    durationMs: ANIM_MS["amour-fusion"],
  },
  {
    id: "amour-bisous",
    get label() { return tr("Bisous"); },
    art: "fx/surprise/anims/amour-bisous-poster.png",
    anim: "fx/surprise/anims/amour-bisous.webp",
    enter: "bottom",
    durationMs: ANIM_MS["amour-bisous"],
  },
  { id: "amour-monstre", get label() { return tr("Petit monstre"); }, art: "fx/surprise/anims/amour-monstre.png", enter: "pop" },
  { id: "love-hearts", get label() { return tr("Cœurs"); }, art: "fx/love/love_hearts.png", enter: "bottom" },
  { id: "love-balloons", get label() { return tr("Ballons"); }, art: "fx/love/love_balloons.png" },
  { id: "love-bouquet", get label() { return tr("Bouquet"); }, art: "fx/love/love_bouquet.png" },
  { id: "love-envelope", get label() { return tr("Enveloppe"); }, art: "fx/love/love_envelope.png" },
  { id: "love-fireworks", get label() { return tr("Feu d’artifice"); }, art: "fx/love/love_fireworks.png" },
  { id: "love-gift", get label() { return tr("Cadeau"); }, art: "fx/love/love_gift.png" },
  { id: "love-petals", get label() { return tr("Pétales"); }, art: "fx/love/love_petals.png" },
  { id: "love-rain", get label() { return tr("Pluie de cœurs"); }, art: "fx/love/love_rain.png" },
  { id: "love-teddy", get label() { return tr("Ourson"); }, art: "fx/love/love_teddy.png" },
  { id: "love-toast", get label() { return tr("Toast"); }, art: "fx/love/love_toast.png" },
  clip("amour-moitie", "Ma moitié"),
  clip("amour-cle", "La clé de mon cœur"),
  clip("amour-pingouin", "Mon préféré"),
  clip("amour-folie", "À la folie"),
  clip("amour-ampoule", "Tu illumines ma vie"),
  clip("amour-planer", "Tu me fais planer"),
  clip("amour-aimants", "Inséparables"),
  clip("amour-bague", "Pour toujours"),
  clip("amour-pigeon", "Je t’aime"),
  clip("amour-maison", "Mon chez-moi, c’est toi"),
];

const journeeAnimations: SurpriseAnimationItem[] = [
  { id: "day-sun", get label() { return tr("Soleil"); }, art: "fx/jour/day_sun.png" },
  { id: "day-sunrise", get label() { return tr("Aube"); }, art: "fx/jour/day_sunrise.png" },
  { id: "day-coffee", get label() { return tr("Café"); }, art: "fx/jour/day_coffee.png" },
  { id: "day-bird", get label() { return tr("Oiseau"); }, art: "fx/jour/day_bird.png" },
  { id: "day-butterflies", get label() { return tr("Papillons"); }, art: "fx/jour/day_butterflies.png" },
  { id: "day-cloud-heart", get label() { return tr("Nuage cœur"); }, art: "fx/jour/day_cloud_heart.png" },
  { id: "day-flower-arch", get label() { return tr("Arche de fleurs"); }, art: "fx/jour/day_flower_arch.png" },
  { id: "day-hummingbird", get label() { return tr("Colibri"); }, art: "fx/jour/day_hummingbird.png" },
  { id: "day-orange", get label() { return tr("Orange"); }, art: "fx/jour/day_orange.png" },
  { id: "day-sunflowers", get label() { return tr("Tournesols"); }, art: "fx/jour/day_sunflowers.png" },
  { id: "day-balloons", get label() { return tr("Ballons"); }, art: "fx/jour/day_balloons.png" },
  { id: "day-alarm", get label() { return tr("Réveil"); }, art: "fx/jour/day_alarm.png" },
];

const bonjourAnimations: SurpriseAnimationItem[] = [
  clip("bonjour-bonne-journee", "Bonne journée"),
  clip("bonjour-reveil", "Réveil"),
  clip("bonjour-soleil", "Soleil"),
  clip("bonjour-croissant", "Petit-déj"),
  clip("bonjour-tournesol", "Tournesol"),
  clip("bonjour-avion", "Avion en papier"),
  clip("bonjour-coucou", "Coucou"),
  clip("bonjour-couette", "Debout !"),
];

const anniversaireAnimations: SurpriseAnimationItem[] = [
  clip("anniversaire-gateau", "Gâteau"),
  clip("anniversaire-cadeau", "Cadeau"),
  clip("anniversaire-ballons", "Ballons"),
  clip("anniversaire-cupcake", "Cupcake"),
  clip("anniversaire-feux", "Feu d’artifice"),
  { ...clip("anniversaire-dechirure", "Surprise"), opening: { w: 179 / 270, h: 351 / 480, ms: 4200 } },
  clip("anniversaire-ecran", "Écran brisé"),
  clip("anniversaire-ecran-2", "Écran brisé 2"),
  clip("anniversaire-voeu", "Fais un vœu"),
  clip("anniversaire-pinata", "Piñata"),
  clip("anniversaire-surprise", "Petit chiot"),
  clip("anniversaire-dj", "C’est ta journée"),
  clip("anniversaire-dino", "Joyeux anniv’"),
  clip("anniversaire-hourra", "Hip hip hip, hourra"),
  clip("anniversaire-tortue", "Toujours aussi jeune"),
  clip("anniversaire-fanfare", "Happy Birthday"),
  clip("anniversaire-genie", "Que tous tes vœux se réalisent"),
  clip("anniversaire-fusee", "Bonne fête !"),
];

const retablissementAnimations: SurpriseAnimationItem[] = [
  clip("retablissement-soupe", "Soupe"),
  clip("retablissement-nounours", "Câlin"),
  clip("retablissement-bouquet", "Bouquet"),
  clip("retablissement-nuage", "Après la pluie"),
  clip("retablissement-coeur", "Cœur pansé"),
  clip("retablissement-cadre", "Pousse"),
  clip("retablissement-bulle", "Bulle"),
  clip("retab-ours", "Guéris vite"),
  clip("retab-microbes", "Bye bye microbes"),
  clip("retab-tournesol", "Remets-toi vite"),
  clip("retab-soupe", "Prends soin de toi"),
  clip("retab-vitamines", "Plein d’énergie"),
  clip("retab-couverture", "Repose-toi bien"),
  clip("retab-pansement", "Courage !"),
  clip("retab-the", "Un petit remontant"),
  clip("retab-calin", "Gros câlin"),
  clip("retab-thermo", "Get well soon"),
];

const nuitAnimations: SurpriseAnimationItem[] = [
  { id: "night-moon", get label() { return tr("Lune"); }, art: "fx/nuit/night_moon.png" },
  { id: "night-galaxy", get label() { return tr("Galaxie"); }, art: "fx/nuit/night_galaxy.png" },
  { id: "night-lantern", get label() { return tr("Lanterne"); }, art: "fx/nuit/night_lantern.png" },
  { id: "night-shooting-stars", get label() { return tr("Étoiles filantes"); }, art: "fx/nuit/night_shooting_stars.png" },
  { id: "night-sky-lanterns", get label() { return tr("Lanternes célestes"); }, art: "fx/nuit/night_sky_lanterns.png" },
  { id: "night-sleeping-bear", get label() { return tr("Ours endormi"); }, art: "fx/nuit/night_sleeping_bear.png" },
  { id: "night-sleepy-cloud", get label() { return tr("Nuage"); }, art: "fx/nuit/night_sleepy_cloud.png" },
  { id: "night-star-balloons", get label() { return tr("Ballons d’étoiles"); }, art: "fx/nuit/night_star_balloons.png" },
  { id: "night-star-cloud", get label() { return tr("Nuage d’étoiles"); }, art: "fx/nuit/night_star_cloud.png" },
  { id: "night-star-jar", get label() { return tr("Bocal d’étoiles"); }, art: "fx/nuit/night_star_jar.png" },
  { id: "night-window", get label() { return tr("Fenêtre"); }, art: "fx/nuit/night_window.png" },
];

const amitieAnimations: SurpriseAnimationItem[] = [
  clip("amitie-puzzle", "On se complète"),
  clip("amitie-heros", "Mon héros"),
  clip("amitie-loin", "Loin des yeux"),
  clip("amitie-meilleurs-amis", "Meilleurs amis"),
  clip("amitie-calin", "Gros câlin"),
  clip("amitie-parapluie", "Toujours là pour toi"),
  clip("amitie-telephone", "Tu me manques"),
  clip("amitie-soiree", "Soirée entre amis"),
  clip("amitie-bracelet", "Amis pour la vie"),
  clip("amitie-ballons", "Merci d’être là"),
];

const voyageAnimations: SurpriseAnimationItem[] = [
  clip("voyage-valise", "Bon voyage"),
  clip("voyage-passeport", "C’est parti"),
  clip("voyage-vacances", "Bonnes vacances"),
  clip("voyage-route", "Bonne route"),
  clip("voyage-montgolfiere", "Profite bien"),
  clip("voyage-globe", "Où que tu sois"),
  clip("voyage-carte", "Je pense à toi"),
  clip("voyage-train", "Rentre bien"),
  clip("voyage-aventure", "À l’aventure"),
  clip("voyage-arrivee", "Bonne arrivée"),
];

/** Bonne nuit: real animations (Grok videos), added as they are made. */
const nuitClips: SurpriseAnimationItem[] = [
  clip("nuit-mouton", "Mouton"),
  clip("nuit-ours", "Beaux rêves"),
  clip("nuit-etoile", "Douce nuit"),
  clip("nuit-hibou", "Hibou"),
  clip("nuit-chaton", "Dors bien"),
  clip("nuit-reveil", "À demain"),
  clip("nuit-peche", "Pêche aux étoiles"),
  clip("nuit-tisane", "Tisane"),
  clip("nuit-nuage", "Au lit !"),
  clip("nuit-lune", "Lune et étoiles"),
];

const beauteAnimations: SurpriseAnimationItem[] = [
  clip("beaute-rouge", "Tu es magnifique"),
  clip("beaute-miroir", "La plus belle, c’est toi"),
  clip("beaute-couronne", "Reine du jour"),
  clip("beaute-vernis", "Trop stylée"),
  clip("beaute-parfum", "Tu rayonnes"),
  clip("beaute-classe", "Quelle classe"),
  clip("beaute-spa", "Prends soin de toi"),
  clip("beaute-talons", "Sublime"),
  clip("beaute-papillon", "Tu es unique"),
  clip("beaute-look", "Wow, ce look"),
];

/** Événements: filled as the seasonal animations are made (Halloween, Saint-Valentin, Noël…). */
/** Tabs of the « Événements » category, in display order. A tab only shows once it has animations. */
export const eventGroups: { id: string; label: string }[] = [
  { id: "halloween", get label() { return tr("Halloween"); } },
  { id: "noel", get label() { return tr("Noël"); } },
  { id: "nouvel-an", get label() { return tr("Bonne année"); } },
  { id: "saint-valentin", get label() { return tr("Saint-Valentin"); } },
  { id: "paques", get label() { return tr("Pâques"); } },
  { id: "fete-meres", get label() { return tr("Fête des mères"); } },
  { id: "fete-peres", get label() { return tr("Fête des pères"); } },
  { id: "action-de-grace", get label() { return tr("Action de grâce"); } },
  { id: "aid", get label() { return tr("Aïd"); } },
  { id: "felicitations", get label() { return tr("Félicitations"); } },
];
const eventClip = (group: string, id: string, label: string): SurpriseAnimationItem => Object.assign(clip(id, label), { group });
const evenementsAnimations: SurpriseAnimationItem[] = [
  eventClip("halloween", "event-halloween", "Citrouille"),
  eventClip("halloween", "event-halloween-sorciere", "Sorcière"),
  eventClip("halloween", "event-halloween-araignee", "Araignée"),
  eventClip("halloween", "event-halloween-monstre", "Petit monstre"),
  eventClip("halloween", "event-halloween-chaudron", "Chaudron"),
  eventClip("halloween", "event-halloween-fantomes", "Fantômes"),
  eventClip("halloween", "event-halloween-vampire", "Vampire"),
  eventClip("halloween", "event-halloween-momie", "Momie"),
  eventClip("halloween", "event-halloween-bonbons", "Bonbons"),
  eventClip("halloween", "event-halloween-squelette", "Squelette"),
  eventClip("noel", "event-noel", "Sapin"),
  eventClip("noel", "event-noel-renne", "Merry Christmas"),
  eventClip("noel", "event-noel-pere", "Ho ho ho !"),
  eventClip("noel", "event-noel-bonhomme", "Joyeux Noël"),
  eventClip("noel", "event-noel-epices", "Miam, c’est Noël"),
  eventClip("noel", "event-noel-lutins", "Joyeuses fêtes"),
  eventClip("noel", "event-noel-chiot", "Surprise de Noël"),
  eventClip("noel", "event-noel-luge", "Vive le vent"),
  eventClip("noel", "event-noel-souris", "Petit Papa Noël"),
  eventClip("noel", "event-noel-etoile", "Paix et joie"),
  eventClip("nouvel-an", "event-nouvel-an", "Champagne"),
  eventClip("nouvel-an", "event-nouvel-an-horloge", "Bonne année"),
  eventClip("nouvel-an", "event-nouvel-an-feux", "Happy New Year"),
  eventClip("nouvel-an", "event-nouvel-an-resolutions", "Bonnes résolutions"),
  eventClip("nouvel-an", "event-nouvel-an-decompte", "3, 2, 1… Bonne année !"),
  eventClip("nouvel-an", "event-nouvel-an-calendrier", "Nouveau départ"),
  eventClip("nouvel-an", "event-nouvel-an-cotillons", "Que la fête commence"),
  eventClip("nouvel-an", "event-nouvel-an-chance", "Santé, bonheur, prospérité"),
  eventClip("nouvel-an", "event-nouvel-an-coq", "Une belle année commence"),
  eventClip("nouvel-an", "event-nouvel-an-hibou", "Meilleurs vœux"),
  eventClip("saint-valentin", "event-saint-valentin", "Cupidon"),
  eventClip("saint-valentin", "event-saint-valentin-chocolats", "Sois ma Valentine"),
  eventClip("saint-valentin", "event-saint-valentin-herisson", "Joyeuse Saint-Valentin"),
  eventClip("saint-valentin", "event-saint-valentin-lettre", "Be my Valentine"),
  eventClip("saint-valentin", "event-saint-valentin-flamants", "Toi + moi"),
  eventClip("saint-valentin", "event-saint-valentin-grenouille", "Je craque pour toi"),
  eventClip("saint-valentin", "event-saint-valentin-fraise", "Tu me fais fondre"),
  eventClip("saint-valentin", "event-saint-valentin-robot", "Mon cœur bat pour toi"),
  eventClip("saint-valentin", "event-saint-valentin-bonbons", "XOXO"),
  eventClip("saint-valentin", "event-saint-valentin-ourson", "Mon Valentin"),
  eventClip("paques", "event-paques", "Poussin"),
  eventClip("fete-meres", "event-fete-meres", "Bouquet géant"),
  eventClip("fete-peres", "event-fete-peres", "Trophée"),
  eventClip("action-de-grace", "event-action-de-grace", "Dinde"),
  eventClip("aid", "event-aid", "Lanternes"),
  eventClip("felicitations", "event-felicitations", "Diplôme"),
];

export const surpriseAnimationCategories: SurpriseAnimationCategory[] = [
  { id: "bonjour", get label() { return tr("Bonjour"); }, art: "fx/surprise/anims/cat-bonjour.jpg", collection: "bonjour" },
  {
    id: "anniversaire",
    get label() { return tr("Anniversaire"); },
    art: "fx/surprise/anims/cat-anniversaire.jpg",
    collection: "anniversaire",
  },
  { id: "amour", get label() { return tr("Amour"); }, art: "fx/surprise/anims/cat-amour.jpg", collection: "amour" },
  {
    id: "bon-retablissement",
    get label() { return tr("Bon rétablissement"); },
    art: "fx/surprise/anims/cat-retablissement.jpg",
    collection: "bon-retablissement",
  },
  { id: "beaute", get label() { return tr("Beauté"); }, art: "fx/surprise/anims/cat-beaute.jpg", collection: "beaute" },
  // Fêtes et temps forts de l'année (Halloween, Saint-Valentin, Noël, Action de grâce…).
  { id: "evenements", get label() { return tr("Événements"); }, art: "fx/surprise/anims/cat-evenements.jpg", collection: "evenements" },
  { id: "bonne-nuit", get label() { return tr("Bonne nuit"); }, art: "fx/surprise/anims/cat-nuit.jpg", collection: "bonne-nuit" },
  { id: "voyage", get label() { return tr("Voyage"); }, art: "fx/surprise/anims/cat-voyage.jpg", collection: "voyage" },
  { id: "amitie", get label() { return tr("Amitié"); }, art: "fx/surprise/anims/cat-amitie.jpg", collection: "amitie" },
];

/** Only real animations are offered: a still picture never appears in the picker. */
// Withdrawn from the picker (poor background); kept in the lists so surprises already sent still play.
const retired = new Set([
  "amour-pluie-cristal",
  "amour-bisous",
  "amour-buee",
  "amour-fusion",
  "anniversaire-ecran",
  "anniversaire-ecran-2",
  "anniversaire-ballons",
]);
const moving = (items: SurpriseAnimationItem[]) => items.filter((item) => Boolean(item.anim) && !retired.has(item.id));

// The old still pictures (day_*, love_*, night_*) stay in `surpriseAnimations`, so surprises already sent
// with them still show — they are just no longer offered.
export const animationCollections: Record<string, SurpriseAnimationItem[]> = {
  bonjour: moving(bonjourAnimations),
  anniversaire: moving(anniversaireAnimations),
  amour: moving(amourAnimations),
  "bon-retablissement": moving(retablissementAnimations),
  evenements: moving(evenementsAnimations),
  "bonne-nuit": moving(nuitClips),
  voyage: moving(voyageAnimations),
  amitie: moving(amitieAnimations),
  beaute: moving(beauteAnimations),
};

export const surpriseKindArt: Record<SurpriseType, string> = {
  scratch: "fx/surprise/hero-scratch.jpg",
  countdown: "fx/surprise/timer.jpg",
  gift: "fx/surprise/cadeau.jpg",
  confetti: "fx/surprise/confetti.jpg",
};

export const surpriseAnimations: SurpriseAnimationItem[] = [
  ...bonjourAnimations,
  ...anniversaireAnimations,
  ...amourAnimations,
  ...retablissementAnimations,
  ...journeeAnimations,
  ...nuitAnimations,
  ...nuitClips,
  ...evenementsAnimations,
  ...amitieAnimations,
  ...voyageAnimations,
  ...beauteAnimations,
  ...surpriseAnimationCategories.filter((item) => !item.collection),
];

export const SURPRISE_ANIMATION_MS = 3200;
export const SURPRISE_REVEAL_PAUSE_MS = 620;

export const findAnimation = (id: string | null) => surpriseAnimations.find((a) => a.id === id) ?? null;
export const findDesign = (type: SurpriseType, id: string | null) =>
  [...surpriseDesigns[type], ...(type === "scratch" ? LEGACY_SCRATCH : [])].find((item) => item.id === id) ?? null;
export const defaultDesign = (type: SurpriseType) => surpriseDesigns[type][0]?.id ?? null;
export const defaultOptions = (type: SurpriseType): SurpriseOptions =>
  type === "countdown" ? { countdown: { seconds: countdownChoices[0]!.seconds } } : {};
