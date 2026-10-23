/**
 * Wippmoji Studio — catalogue of expressions (10 are chosen for a pack) and character styles.
 * `motion` is the action given to the video model; `fr` / `en` are the optional words on the sticker.
 */
export type WippmojiStyle = "cartoon" | "realistic";

export const WIPPMOJI_STYLES: Record<WippmojiStyle, { reference: string; video: string }> = {
  cartoon: {
    reference:
      "Turn the person in the attached photo into a premium 3D animated-emoji style character for a sticker pack, Pixar-quality. Keep their real likeness so they are instantly recognizable: same face shape, eyes, nose and lips, same skin tone, same hairstyle and hair color.",
    video: "Premium 3D animated sticker, Pixar-quality, big expressive cartoon acting, exaggerated squash-and-stretch.",
  },
  realistic: {
    reference:
      "Keep the person in the attached photo fully photorealistic, exactly as they are: real face, skin, hair and expression, no cartoon, no 3D, no beauty filter.",
    video: "Photorealistic animated sticker: natural, believable movements, real skin and hair, no cartoon effect.",
  },
};

export type WippmojiExpression = { id: string; fr: string; en: string; motion: string };

export const WIPPMOJI_EXPRESSIONS: WippmojiExpression[] = [
  { id: "mdr", fr: "MDR !", en: "LOL!", motion: "bursts into a huge uncontrollable laugh, throws the head back, eyes squeezed shut, shoulders shaking, one hand on the belly" },
  { id: "bisous", fr: "Bisous", en: "Kisses", motion: "kisses the palm of the hand and blows a kiss toward the viewer, a small red heart floats out" },
  { id: "je-taime", fr: "Je t’aime", en: "Love you", motion: "makes a heart shape with both hands in front of the chest and smiles tenderly, a red heart pops above" },
  { id: "coucou", fr: "Coucou !", en: "Hey!", motion: "raises one hand and waves hello cheerfully, tilts the head with a big bright smile and a playful wink" },
  { id: "merci", fr: "Merci", en: "Thank you", motion: "joins both hands in a grateful prayer gesture, bows the head slightly with a warm smile" },
  { id: "bravo", fr: "Bravo !", en: "Bravo!", motion: "claps the hands enthusiastically with a proud, delighted smile" },
  { id: "pfff", fr: "Pfff…", en: "Ugh…", motion: "rolls the eyes up to the sky, sighs and shrugs, totally unimpressed" },
  { id: "oh-non", fr: "Oh non !", en: "Oh no!", motion: "puts both hands on the cheeks, mouth open in dismay, disappointed eyes" },
  { id: "bonne-nuit", fr: "Bonne nuit", en: "Good night", motion: "yawns, rests the head on joined hands like a pillow and falls asleep peacefully, small zzz above" },
  { id: "waouh", fr: "Waouh !", en: "Wow!", motion: "eyes wide open and jaw dropped in amazement, leans back in surprise" },
  { id: "desole", fr: "Désolé(e)", en: "Sorry", motion: "looks down with puppy eyes, hands together, apologetic little smile" },
  { id: "ok", fr: "OK !", en: "OK!", motion: "gives a confident thumbs up and a nod with a smile" },
  { id: "non", fr: "Non !", en: "No!", motion: "shakes the head firmly and wags a finger, arms crossed" },
  { id: "a-bientot", fr: "À bientôt", en: "See you", motion: "waves goodbye with a soft smile, turning slightly away" },
  { id: "felicitations", fr: "Félicitations !", en: "Congrats!", motion: "jumps for joy with both fists in the air, a few gold confetti pieces fall" },
  { id: "tu-me-manques", fr: "Tu me manques", en: "Miss you", motion: "stretches both arms toward the viewer for a hug, sad tender eyes" },
  { id: "jarrive", fr: "J’arrive !", en: "On my way!", motion: "runs in place energetically toward the viewer, waving one hand" },
  { id: "stop", fr: "Stop !", en: "Stop!", motion: "raises one open hand toward the camera in a firm stop gesture" },
  { id: "trop-drole", fr: "Trop drôle", en: "So funny", motion: "laughs so hard that tears of joy fly, slaps the knee" },
  { id: "merci-beaucoup", fr: "Merci beaucoup", en: "Thanks a lot", motion: "sends many small hearts with both hands, beaming smile" },
];

export const PACK_SIZE = 10;

/** One sticker = one short video starting from the reference image, on a green background the app removes. */
export function expressionPrompt(style: WippmojiStyle, e: WippmojiExpression, words: string | null) {
  const text = words
    ? `The words "${words}" pop in below in big bold glossy yellow letters with a black outline, centered and fully visible with a wide margin from every edge (never cut off); the spelling never changes and stays sharp and readable.`
    : "No text and no letters anywhere.";
  return [
    "Use ONLY the attached image as the starting frame and only subject.",
    `${WIPPMOJI_STYLES[style].video} The person ${e.motion}.`,
    text,
    "Keep the same face, hair, clothes and white sticker outline. The whole sticker, hands and text included, stays centered and fully inside the frame with a wide margin on every side; nothing is ever cut by the edges. Static camera.",
    "The background must stay a perfectly flat, solid pure green (#00FF00) for the entire video: no shadows, no glow, no gradient, no particles, no green on the person.",
  ].join(" ");
}

export type WippmojiFraming = "face" | "bust" | "full";
const FRAMING: Record<WippmojiFraming, string> = {
  face: "Show the head and shoulders, like the photo.",
  bust: "Show them from the waist up, like the photo.",
  full: "Show the whole body from head to feet, with the same outfit and shoes as the photo.",
};

export function referencePrompt(style: WippmojiStyle, framing: WippmojiFraming = "bust") {
  return [
    WIPPMOJI_STYLES[style].reference,
    `${FRAMING[framing]} Facing the camera with a warm smile. Thick clean white sticker outline around the whole person. No text and no letters anywhere.`,
    "Centered and fully inside the frame with margin. Perfectly flat, solid pure green background (#00FF00): no shadow, no glow, no gradient, and no green on the person or the clothes.",
  ].join(" ");
}

/* ——— WippPop: full-screen animations with your own cartoon character (played over the chat, black is removed). ——— */

/** The two WippPop packs: 3 or 7 animations. */
export const WIPPPOP_SIZES = [3, 7];
export const WIPPPOP_SIZE = WIPPPOP_SIZES[0];
export const WIPPPOP_SECONDS = 8;

export type WippPopAnimation = { id: string; fr: string; en: string; action: string };

export const WIPPPOP_ANIMATIONS: WippPopAnimation[] = [
  { id: "coucou", fr: "Coucou !", en: "Hey!", action: "runs in from the left edge of the screen, stops in the center, waves hello with a huge smile and a playful wink" },
  { id: "bisous", fr: "Bisous", en: "Kisses", action: "walks in from the right edge, blows a big kiss toward the viewer and many small red hearts fly toward the camera and fill the screen" },
  { id: "bravo", fr: "Bravo !", en: "Bravo!", action: "jumps in from the bottom of the screen, claps enthusiastically, then throws both arms up in victory while colorful confetti bursts around" },
  { id: "je-taime", fr: "Je t’aime", en: "Love you", action: "slides in holding a giant red heart, hugs it tenderly, then the heart bursts into many little hearts that float up" },
  { id: "anniversaire", fr: "Joyeux anniversaire !", en: "Happy birthday!", action: "walks in carrying a birthday cake with lit candles, blows the candles out, and balloons float up from the bottom" },
  { id: "bonne-nuit", fr: "Bonne nuit", en: "Good night", action: "floats in sitting on a crescent moon, yawns, waves sleepily and falls asleep while small stars twinkle around" },
  { id: "bonjour", fr: "Bonjour !", en: "Good morning!", action: "pops up from the bottom holding a steaming cup of coffee, stretches happily and a smiling sun rises behind" },
  { id: "merci", fr: "Merci !", en: "Thank you!", action: "runs in holding a bouquet of flowers, offers it to the viewer with a little bow and a warm smile" },
  { id: "mdr", fr: "MDR !", en: "LOL!", action: "rolls in laughing so hard, falls on the floor holding the belly, legs kicking, tears of joy flying" },
  { id: "felicitations", fr: "Félicitations !", en: "Congrats!", action: "pops a party popper toward the camera, streamers fly everywhere, then dances a little victory dance" },
  { id: "tu-me-manques", fr: "Tu me manques", en: "Miss you", action: "walks in slowly hugging a big pillow, looks at the viewer with sad tender eyes, then opens the arms for a hug" },
  { id: "jarrive", fr: "J’arrive !", en: "On my way!", action: "zooms in riding a small scooter from the left, brakes in the center, waves, then zooms out to the right" },
];

export function popReferencePrompt() {
  return [
    WIPPMOJI_STYLES.cartoon.reference,
    "Full body from head to feet, standing, friendly smile, centered and small in the frame with lots of empty space around. Vertical 9:16 composition.",
    "Perfectly flat pure black background (#000000), no shadow, no floor, no outline. Bright, colorful clothes (no black clothing). No text.",
  ].join(" ");
}

export function popPrompt(a: WippPopAnimation, words: string | null) {
  return [
    "Use ONLY the attached image as the starting frame and only subject.",
    "Premium 3D Pixar-quality cartoon animation, joyful, lots of movement across the whole vertical 9:16 screen.",
    `The character ${a.action}.`,
    words ? `Then the big bold glossy words "${words}" with a white outline bounce in, centered and fully visible with a wide margin from every edge; the spelling never changes.` : "No text and no letters anywhere.",
    "Keep the same face, hair and clothes. The background stays perfectly flat pure black (#000000) the whole time: no floor, no glow, no gradient. Static camera.",
  ].join(" ");
}
