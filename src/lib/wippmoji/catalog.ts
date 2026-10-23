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
/** The two Wippmoji packs: 5 or 10 stickers. */
export const PACK_SIZES = [5, 10];

/** One sticker = one short video starting from the reference image, on a green background the app removes. */
/** The words are drawn by WIPP over the clip (always readable, never cut): the video itself has no text. */
export function expressionPrompt(style: WippmojiStyle, e: WippmojiExpression, _words: string | null = null) {
  return [
    "Use ONLY the attached image as the starting frame and only subject. Exactly one person in the whole video, never duplicated.",
    `${WIPPMOJI_STYLES[style].video} The person ${e.motion}.`,
    "No text at all: no letters, no words, no numbers, no signs anywhere in the video.",
    "Keep the same face, hair, clothes and white sticker outline. The person is there from the very first frame and stays centered and fully inside the frame with a wide margin on every side; hands are never cut by the edges. Smooth continuous motion. Static camera.",
    "The background must stay a perfectly flat, solid, uniform pure green (#00FF00) for the entire video: no shadows, no floor, no glow, no gradient, no green on the person.",
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
export const WIPPPOP_SECONDS = 6;

export type WippPopAnimation = { id: string; fr: string; en: string; action: string };

export const WIPPPOP_ANIMATIONS: WippPopAnimation[] = [
  { id: "coucou", fr: "Coucou !", en: "Hey!", action: "waves hello with a huge smile and a playful wink, bouncing happily on the spot" },
  { id: "bisous", fr: "Bisous", en: "Kisses", action: "blows a big kiss toward the viewer and many small red hearts fly toward the camera and fill the screen" },
  { id: "bravo", fr: "Bravo !", en: "Bravo!", action: "claps enthusiastically, then throws both arms up in victory while colorful confetti bursts around" },
  { id: "je-taime", fr: "Je t’aime", en: "Love you", action: "holds a giant red heart, hugs it tenderly, then the heart bursts into many little hearts that float up" },
  { id: "anniversaire", fr: "Joyeux anniversaire !", en: "Happy birthday!", action: "holds a birthday cake with lit candles, blows the candles out, and balloons float up around" },
  { id: "bonne-nuit", fr: "Bonne nuit", en: "Good night", action: "yawns, a crescent moon appears behind, waves sleepily and falls asleep standing while small stars twinkle around" },
  { id: "bonjour", fr: "Bonjour !", en: "Good morning!", action: "holds a steaming cup of coffee, stretches happily and a smiling sun rises behind" },
  { id: "merci", fr: "Merci !", en: "Thank you!", action: "holds out a bouquet of flowers to the viewer with a little bow and a warm smile" },
  { id: "mdr", fr: "MDR !", en: "LOL!", action: "laughs so hard, bends over holding the belly, tears of joy flying" },
  { id: "felicitations", fr: "Félicitations !", en: "Congrats!", action: "pops a party popper toward the camera, streamers fly everywhere, then dances a little victory dance on the spot" },
  { id: "tu-me-manques", fr: "Tu me manques", en: "Miss you", action: "hugs a big pillow, looks at the viewer with sad tender eyes, then opens the arms for a hug" },
  { id: "jarrive", fr: "J’arrive !", en: "On my way!", action: "sits on a small scooter in the center, revs it, waves excitedly and bounces as if ready to go" },
];

/** Same look as the WIPP Moments: a 3D chibi doll (big head, big eyes, small body), full body, on green. */
export function popReferencePrompt() {
  return [
    "Turn the person in the attached photo into a cute premium 3D chibi doll character, Pixar quality, exactly like a collectible toy figure: big head, big shiny expressive eyes, small body, full body from head to sneakers.",
    "Keep their real likeness so they are instantly recognizable: same face shape, skin tone, hairstyle and hair color, same kind of outfit in bright colors.",
    "Standing, friendly smile, centered, small in a square frame with lots of empty space around. Perfectly flat solid pure green background (#00FF00), no shadow, no floor, no green on the character. No text.",
  ].join(" ");
}

/** WippPop: one character, there from the first image, no text (WIPP draws the words). Built to work with Grok Lite too. */
export function popPrompt(a: WippPopAnimation, _words: string | null = null) {
  return [
    "Use ONLY the attached image as the first frame: the video starts exactly on this image, with the character already in place, centered.",
    "There is exactly ONE character in the whole video: the same one as in the image. Never duplicate it: no second character, no clone, no ghost, no transparency, no fade in, no cross-fade, no reflection, no other people or animals.",
    "Premium 3D Pixar-quality chibi animation, cute and joyful, smooth continuous motion with no cuts and no jumps.",
    `The character ${a.action}. A few small colorful effects (hearts, stars, confetti, sparkles) may appear around, never green.`,
    "No text at all: no letters, no words, no numbers, no signs anywhere in the video.",
    "The character stays centered and fully inside the square frame for the whole video. Keep the same face, hair and clothes.",
    "The background stays a perfectly flat, solid, uniform pure green (#00FF00) the whole time: no shadows, no floor, no glow, no gradient, no vignette. Static camera.",
  ].join(" ");
}
