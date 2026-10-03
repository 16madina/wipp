import { Clock3, Gift, Images, PartyPopper, type LucideIcon } from "lucide-react-native";

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
  enter: "pop",
  durationMs: 10_000,
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
    art: "fx/surprise/anims/amour-pluie-cristal.png",
    anim: "fx/surprise/anims/amour-pluie-cristal.webp",
    enter: "pop",
    durationMs: 7042,
  },
  {
    id: "amour-fusion",
    label: "Fusion",
    art: "fx/surprise/anims/amour-fusion.png",
    anim: "fx/surprise/anims/amour-fusion.webp",
    enter: "pop",
    durationMs: 6200,
  },
  {
    id: "amour-bisous",
    label: "Bisous",
    art: "fx/surprise/anims/amour-bisous.png",
    anim: "fx/surprise/anims/amour-bisous.webp",
    enter: "bottom",
    durationMs: 3200,
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
  {
    id: "bonjour-bonne-journee",
    label: "Bonne journée",
    art: "fx/surprise/anims/bonjour-bonne-journee-poster.png",
    anim: "fx/surprise/anims/bonjour-bonne-journee.webp",
    enter: "pop",
    durationMs: 10_000,
  },
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
];

const retablissementAnimations: SurpriseAnimationItem[] = [
  clip("retablissement-soupe", "Soupe"),
  clip("retablissement-nounours", "Câlin"),
  clip("retablissement-bouquet", "Bouquet"),
  clip("retablissement-nuage", "Après la pluie"),
  clip("retablissement-coeur", "Cœur pansé"),
  clip("retablissement-cadre", "Cadre"),
  clip("retablissement-bulle", "Bulle"),
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

export const surpriseAnimationCategories: SurpriseAnimationCategory[] = [
  { id: "bonjour", label: "Bonjour", art: "fx/surprise/anims/bonjour-bonne-journee-poster.png", collection: "bonjour" },
  {
    id: "anniversaire",
    label: "Anniversaire",
    art: "fx/surprise/anims/anniversaire-gateau-poster.png",
    collection: "anniversaire",
  },
  { id: "amour", label: "Amour", art: "fx/surprise/anims/animation-amour.jpg", collection: "amour" },
  {
    id: "bon-retablissement",
    label: "Bon rétablissement",
    art: "fx/surprise/anims/retablissement-bouquet-poster.png",
    collection: "bon-retablissement",
  },
  { id: "beaute", label: "Beauté", art: "fx/surprise/anims/animation-beaute.jpg" },
  { id: "bonne-journee", label: "Bonne journée", art: "fx/surprise/anims/animation-journee.jpg", collection: "bonne-journee" },
  { id: "bonne-nuit", label: "Bonne nuit", art: "fx/surprise/anims/animation-nuit.jpg", collection: "bonne-nuit" },
  { id: "voyage", label: "Voyage", art: "fx/surprise/anims/animation-voyage.jpg" },
  { id: "amitie", label: "Amitié", art: "fx/surprise/anims/animation-amitie.jpg" },
];

export const animationCollections: Record<string, SurpriseAnimationItem[]> = {
  bonjour: bonjourAnimations,
  anniversaire: anniversaireAnimations,
  amour: amourAnimations,
  "bon-retablissement": retablissementAnimations,
  "bonne-journee": journeeAnimations,
  "bonne-nuit": nuitAnimations,
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
