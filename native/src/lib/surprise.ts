import { Clock3, Gift, Images, PartyPopper, type LucideIcon } from "lucide-react-native";
import { ANIM_MS } from "../generated/anim-durations";

export type SurpriseType = "scratch" | "countdown" | "gift" | "confetti";
export type SurpriseOptions = { countdown?: { seconds: number } };
export type Surprise = {
  id: string;
  message: string;
  surpriseType: SurpriseType;
  designId: string | null;
  animationId: string | null;
  surpriseOptions: SurpriseOptions;
  time: string;
  mine: boolean;
};

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
};
export type SurpriseAnimationCategory = SurpriseAnimationItem & { collection?: string };

export const designPicker: Record<SurpriseType, { label: string; icon: LucideIcon }> = {
  scratch: { label: "Choisir la carte à gratter", icon: Images },
  countdown: { label: "Choisir le compte à rebours", icon: Clock3 },
  gift: { label: "Choisir le cadeau", icon: Gift },
  confetti: { label: "Choisir les confettis", icon: PartyPopper },
};

const SCRATCH_CARDS: SurpriseDesignItem[] = [
  { id: "amour", label: "Amour", mark: "♥", art: "fx/surprise/cards/wipp-amour.jpg" },
  { id: "rose", label: "Rose", mark: "♡", art: "fx/surprise/cards/wipp-rose.jpg" },
  { id: "gold", label: "Or", mark: "✦", art: "fx/surprise/cards/wipp-gold.jpg" },
  { id: "mood", label: "Mood", mark: "☾", art: "fx/surprise/cards/wipp-mood.jpg" },
  { id: "voyage", label: "Voyage", mark: "✈", art: "fx/surprise/cards/wipp-voyage.jpg" },
  { id: "bff", label: "Amitié", mark: "♡", art: "fx/surprise/cards/wipp-bff.jpg" },
  { id: "crew", label: "Crew", mark: "★", art: "fx/surprise/cards/wipp-crew.jpg" },
  { id: "fete", label: "Fête", mark: "✦", art: "fx/surprise/cards/wipp-fete.jpg" },
  { id: "marbre", label: "Marbre", mark: "◇", art: "fx/surprise/cards/wipp-marbre.jpg" },
  { id: "prestige", label: "Prestige", mark: "♛", art: "fx/surprise/cards/wipp-prestige.jpg" },
  { id: "vip", label: "VIP", mark: "♔", art: "fx/surprise/cards/wipp-vip.jpg" },
];

const LEGACY_SCRATCH: SurpriseDesignItem[] = [
  { id: "heart", label: "Cœur", mark: "♥", art: "fx/surprise/cards/wipp-amour.jpg" },
  { id: "stars", label: "Étoiles", mark: "✦", art: "fx/surprise/cards/wipp-gold.jpg" },
  { id: "crown", label: "Couronne", mark: "♛", art: "fx/surprise/cards/wipp-prestige.jpg" },
  { id: "neon", label: "Néon", mark: "♡", art: "fx/surprise/cards/wipp-rose.jpg" },
];

export const surpriseDesigns: Record<SurpriseType, SurpriseDesignItem[]> = {
  scratch: SCRATCH_CARDS,
  countdown: [],
  gift: [],
  confetti: [],
};

export const countdownChoices = [
  { seconds: 10, label: "10 secondes" },
  { seconds: 60, label: "1 minute" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 3600, label: "1 heure" },
];

const clip = (id: string, label: string): SurpriseAnimationItem => ({
  id,
  label,
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
    label: "Pluie d’amour",
    art: "fx/surprise/anims/amour-pluie-cristal-poster.png",
    anim: "fx/surprise/anims/amour-pluie-cristal.webp",
    enter: "pop",
    durationMs: ANIM_MS["amour-pluie-cristal"],
  },
  {
    id: "amour-fusion",
    label: "Fusion",
    art: "fx/surprise/anims/amour-fusion-poster.png",
    anim: "fx/surprise/anims/amour-fusion.webp",
    enter: "pop",
    durationMs: ANIM_MS["amour-fusion"],
  },
  {
    id: "amour-bisous",
    label: "Bisous",
    art: "fx/surprise/anims/amour-bisous-poster.png",
    anim: "fx/surprise/anims/amour-bisous.webp",
    enter: "bottom",
    durationMs: ANIM_MS["amour-bisous"],
  },
  { id: "amour-monstre", label: "Petit monstre", art: "fx/surprise/anims/amour-monstre.png", enter: "pop" },
  { id: "love-hearts", label: "Cœurs", art: "fx/love/love_hearts.png", enter: "bottom" },
  { id: "love-balloons", label: "Ballons", art: "fx/love/love_balloons.png" },
  { id: "love-bouquet", label: "Bouquet", art: "fx/love/love_bouquet.png" },
  { id: "love-envelope", label: "Enveloppe", art: "fx/love/love_envelope.png" },
  { id: "love-fireworks", label: "Feu d’artifice", art: "fx/love/love_fireworks.png" },
  { id: "love-gift", label: "Cadeau", art: "fx/love/love_gift.png" },
  { id: "love-petals", label: "Pétales", art: "fx/love/love_petals.png" },
  { id: "love-rain", label: "Pluie de cœurs", art: "fx/love/love_rain.png" },
  { id: "love-teddy", label: "Ourson", art: "fx/love/love_teddy.png" },
  { id: "love-toast", label: "Toast", art: "fx/love/love_toast.png" },
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
  { id: "day-sun", label: "Soleil", art: "fx/jour/day_sun.png" },
  { id: "day-sunrise", label: "Aube", art: "fx/jour/day_sunrise.png" },
  { id: "day-coffee", label: "Café", art: "fx/jour/day_coffee.png" },
  { id: "day-bird", label: "Oiseau", art: "fx/jour/day_bird.png" },
  { id: "day-butterflies", label: "Papillons", art: "fx/jour/day_butterflies.png" },
  { id: "day-cloud-heart", label: "Nuage cœur", art: "fx/jour/day_cloud_heart.png" },
  { id: "day-flower-arch", label: "Arche de fleurs", art: "fx/jour/day_flower_arch.png" },
  { id: "day-hummingbird", label: "Colibri", art: "fx/jour/day_hummingbird.png" },
  { id: "day-orange", label: "Orange", art: "fx/jour/day_orange.png" },
  { id: "day-sunflowers", label: "Tournesols", art: "fx/jour/day_sunflowers.png" },
  { id: "day-balloons", label: "Ballons", art: "fx/jour/day_balloons.png" },
  { id: "day-alarm", label: "Réveil", art: "fx/jour/day_alarm.png" },
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
  clip("anniversaire-dechirure", "Surprise"),
  clip("anniversaire-ecran", "Écran brisé"),
  clip("anniversaire-ecran-2", "Écran brisé 2"),
  clip("anniversaire-voeu", "Fais un vœu"),
  clip("anniversaire-pinata", "Piñata"),
  clip("anniversaire-surprise", "Surprise"),
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
  { id: "night-moon", label: "Lune", art: "fx/nuit/night_moon.png" },
  { id: "night-galaxy", label: "Galaxie", art: "fx/nuit/night_galaxy.png" },
  { id: "night-lantern", label: "Lanterne", art: "fx/nuit/night_lantern.png" },
  { id: "night-shooting-stars", label: "Étoiles filantes", art: "fx/nuit/night_shooting_stars.png" },
  { id: "night-sky-lanterns", label: "Lanternes célestes", art: "fx/nuit/night_sky_lanterns.png" },
  { id: "night-sleeping-bear", label: "Ours endormi", art: "fx/nuit/night_sleeping_bear.png" },
  { id: "night-sleepy-cloud", label: "Nuage", art: "fx/nuit/night_sleepy_cloud.png" },
  { id: "night-star-balloons", label: "Ballons d’étoiles", art: "fx/nuit/night_star_balloons.png" },
  { id: "night-star-cloud", label: "Nuage d’étoiles", art: "fx/nuit/night_star_cloud.png" },
  { id: "night-star-jar", label: "Bocal d’étoiles", art: "fx/nuit/night_star_jar.png" },
  { id: "night-window", label: "Fenêtre", art: "fx/nuit/night_window.png" },
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
  { id: "halloween", label: "Halloween" },
  { id: "noel", label: "Noël" },
  { id: "nouvel-an", label: "Bonne année" },
  { id: "saint-valentin", label: "Saint-Valentin" },
  { id: "paques", label: "Pâques" },
  { id: "fete-meres", label: "Fête des mères" },
  { id: "fete-peres", label: "Fête des pères" },
  { id: "action-de-grace", label: "Action de grâce" },
  { id: "aid", label: "Aïd" },
  { id: "felicitations", label: "Félicitations" },
];
const eventClip = (group: string, id: string, label: string): SurpriseAnimationItem => ({ ...clip(id, label), group });
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
  { id: "bonjour", label: "Bonjour", art: "fx/surprise/anims/cat-bonjour.jpg", collection: "bonjour" },
  {
    id: "anniversaire",
    label: "Anniversaire",
    art: "fx/surprise/anims/cat-anniversaire.jpg",
    collection: "anniversaire",
  },
  { id: "amour", label: "Amour", art: "fx/surprise/anims/cat-amour.jpg", collection: "amour" },
  {
    id: "bon-retablissement",
    label: "Bon rétablissement",
    art: "fx/surprise/anims/cat-retablissement.jpg",
    collection: "bon-retablissement",
  },
  { id: "beaute", label: "Beauté", art: "fx/surprise/anims/cat-beaute.jpg", collection: "beaute" },
  // Fêtes et temps forts de l'année (Halloween, Saint-Valentin, Noël, Action de grâce…).
  { id: "evenements", label: "Événements", art: "fx/surprise/anims/cat-evenements.jpg", collection: "evenements" },
  { id: "bonne-nuit", label: "Bonne nuit", art: "fx/surprise/anims/cat-nuit.jpg", collection: "bonne-nuit" },
  { id: "voyage", label: "Voyage", art: "fx/surprise/anims/cat-voyage.jpg", collection: "voyage" },
  { id: "amitie", label: "Amitié", art: "fx/surprise/anims/cat-amitie.jpg", collection: "amitie" },
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
