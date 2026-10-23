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

export type WippmojiExpression = { id: string; fr: string; en: string; motion: string; cat?: string };

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


/** More choices: Ivorian (nouchi) words, love, moods. `cat` groups them in the app. */
const MORE_EXPRESSIONS: WippmojiExpression[] = [
  { id: "on-dit-quoi", fr: "On dit quoi ?", en: "What’s up?", cat: "ivoirien", motion: "tilts the head with a cool smile and raises the chin as a greeting, one hand open" },
  { id: "yako", fr: "Yako", en: "Yako", cat: "ivoirien", motion: "puts a hand on the heart with a gentle sympathetic face and nods slowly, comforting" },
  { id: "cest-gate", fr: "C’est gâté !", en: "It’s ruined!", cat: "ivoirien", motion: "puts both hands on the head in dramatic despair, then shrugs and laughs" },
  { id: "ya-foyi", fr: "Ya foyi", en: "No worries", cat: "ivoirien", motion: "waves a hand casually, relaxed big smile, totally chill" },
  { id: "enjailler", fr: "On va s’enjailler !", en: "Let’s party!", cat: "ivoirien", motion: "dances happily with both arms up, shoulders bouncing to the beat" },
  { id: "moisi", fr: "Je suis moisi", en: "I’m broke", cat: "ivoirien", motion: "turns the empty pockets inside out with a funny sad face" },
  { id: "dans-drap", fr: "Je suis dans drap", en: "I’m in trouble", cat: "ivoirien", motion: "bites the nails nervously, eyes wide, looking left and right" },
  { id: "je-science", fr: "Je science…", en: "Thinking…", cat: "ivoirien", motion: "rubs the chin, looks up thinking hard, one eyebrow raised" },
  { id: "garba", fr: "Garba !", en: "Garba!", cat: "ivoirien", motion: "rubs the belly with a hungry delighted face and licks the lips" },
  { id: "ma-go", fr: "Ma go", en: "My girl", cat: "ivoirien", motion: "points at the viewer with a charming wink and a big smile" },
  { id: "mon-mogo", fr: "Mon mogo", en: "My bro", cat: "ivoirien", motion: "does a friendly fist bump toward the camera with a big grin" },
  { id: "goumin", fr: "Goumin…", en: "Heartbroken…", cat: "ivoirien", motion: "holds the heart with both hands, sad puppy eyes, a small tear" },
  { id: "kpakpato", fr: "Kpakpato", en: "Gossip", cat: "ivoirien", motion: "leans in and covers the mouth with one hand as if whispering a juicy secret, eyes sparkling" },
  { id: "boucantier", fr: "Boucantier", en: "Show-off", cat: "ivoirien", motion: "adjusts imaginary sunglasses and poses proudly, chin up, very stylish" },
  { id: "sapee", fr: "Sapé(e) !", en: "Looking sharp!", cat: "ivoirien", motion: "spins around proudly showing off the outfit, then strikes a pose" },
  { id: "toi-la", fr: "Toi là !", en: "You there!", cat: "ivoirien", motion: "points at the viewer with a mock-serious face, then laughs" },
  { id: "tchip", fr: "Tchip !", en: "Tsk!", cat: "ivoirien", motion: "sucks the teeth, rolls the eyes and turns the head away, annoyed" },
  { id: "bon-appetit", fr: "Bon appétit !", en: "Enjoy your meal!", motion: "holds a fork and knife happily, mouth watering" },
  { id: "bonne-journee", fr: "Bonne journée !", en: "Have a nice day!", cat: "salut", motion: "waves cheerfully with a radiant smile, bright and energetic" },
  { id: "bon-matin", fr: "Bon matin !", en: "Good morning!", cat: "salut", motion: "stretches the arms up, yawns a little and smiles brightly" },
  { id: "on-se-capte", fr: "On se capte !", en: "Talk soon!", cat: "salut", motion: "makes a phone sign with the hand next to the ear and winks" },
  { id: "tes-la", fr: "T’es là ?", en: "You there?", cat: "salut", motion: "peeks forward curiously and knocks on an invisible door" },
  { id: "gros-bisous", fr: "Gros bisous !", en: "Big kisses!", cat: "amour", motion: "blows several kisses with both hands, little hearts appearing" },
  { id: "trop-mignon", fr: "Trop mignon !", en: "So cute!", cat: "amour", motion: "clasps the hands next to the cheek, melting with an adoring smile" },
  { id: "jadore", fr: "J’adore !", en: "Love it!", cat: "amour", motion: "makes heart eyes and claps the hands excitedly" },
  { id: "respect", fr: "Respect !", en: "Respect!", cat: "humeur", motion: "puts a fist on the chest and nods with respect" },
  { id: "le-boss", fr: "Le boss !", en: "The boss!", cat: "humeur", motion: "crosses the arms confidently with a proud smirk" },
  { id: "serieusement", fr: "Sérieusement ?!", en: "Seriously?!", cat: "humeur", motion: "raises one eyebrow, unimpressed, arms crossed" },
  { id: "laisse-tomber", fr: "Laisse tomber !", en: "Forget it!", cat: "humeur", motion: "waves both hands dismissively and turns the head away" },
  { id: "grosse-fatigue", fr: "Grosse fatigue !", en: "So tired!", cat: "humeur", motion: "slumps the shoulders, droopy eyes, a big exhausted sigh" },
  { id: "jai-faim", fr: "J’ai faim !", en: "I’m hungry!", cat: "humeur", motion: "holds the belly, which growls, with a pleading face" },
];

WIPPMOJI_EXPRESSIONS.push(...MORE_EXPRESSIONS);

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

export type WippPopAnimation = { id: string; fr: string; en: string; action: string; cat?: string };

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

const MORE_POPS: WippPopAnimation[] = [
  { id: "on-dit-quoi", fr: "On dit quoi ?", en: "What’s up?", cat: "ivoirien", action: "tilts the head with a cool smile, raises the chin as a greeting and does a little dance step" },
  { id: "enjailler", fr: "On va s’enjailler !", en: "Let’s party!", cat: "ivoirien", action: "dances joyfully with both arms up while colorful disco lights and confetti swirl around" },
  { id: "cest-gate", fr: "C’est gâté !", en: "It’s ruined!", cat: "ivoirien", action: "puts both hands on the head in dramatic despair, then bursts out laughing" },
  { id: "garba", fr: "Garba !", en: "Garba!", cat: "ivoirien", action: "holds a steaming plate of attiéké with fried fish, sniffs it happily and rubs the belly" },
  { id: "moisi", fr: "Je suis moisi", en: "I’m broke", cat: "ivoirien", action: "turns the empty pockets inside out, a single moth flies out, funny sad face" },
  { id: "yako", fr: "Yako", en: "Yako", cat: "ivoirien", action: "puts a hand on the heart with a gentle face, small soft hearts float around" },
  { id: "sapee", fr: "Sapé(e) !", en: "Looking sharp!", cat: "ivoirien", action: "spins around proudly showing off the outfit, sparkles burst, then strikes a pose" },
  { id: "kpakpato", fr: "Kpakpato", en: "Gossip", cat: "ivoirien", action: "leans in whispering a juicy secret with a hand by the mouth, little speech bubbles pop around" },
  { id: "ya-foyi", fr: "Ya foyi", en: "No worries", cat: "ivoirien", action: "relaxes with a big chill smile, waves a hand casually, little music notes float" },
  { id: "bonne-journee", fr: "Bonne journée !", en: "Have a nice day!", cat: "salut", action: "waves cheerfully while a smiling sun shines and flowers pop around" },
  { id: "bon-courage", fr: "Bon courage !", en: "Good luck!", action: "flexes both arms like a champion with a determined smile, stars burst around" },
  { id: "pardon", fr: "Pardon…", en: "Sorry…", cat: "amour", action: "holds out a small bouquet with puppy eyes and an apologetic smile" },
  { id: "gros-bisous", fr: "Gros bisous !", en: "Big kisses!", cat: "amour", action: "blows many kisses with both hands, big red hearts fly toward the camera" },
  { id: "le-boss", fr: "Le boss !", en: "The boss!", action: "puts on sunglasses, a golden crown appears on the head, crosses the arms proudly" },
];

WIPPPOP_ANIMATIONS.push(...MORE_POPS);

/** How WIPP moves a WippPop across the screen (the clip itself stays centered): way in, way out. */
export type PopSide = "left" | "right" | "top" | "bottom" | "zoom" | "none";
export const POP_PATHS: Record<string, { enter: PopSide; exit: PopSide }> = {
  coucou: { enter: "left", exit: "right" },
  bisous: { enter: "bottom", exit: "top" },
  bravo: { enter: "bottom", exit: "bottom" },
  "je-taime": { enter: "zoom", exit: "zoom" },
  anniversaire: { enter: "bottom", exit: "top" },
  "bonne-nuit": { enter: "top", exit: "bottom" },
  bonjour: { enter: "bottom", exit: "top" },
  merci: { enter: "right", exit: "left" },
  mdr: { enter: "left", exit: "right" },
  felicitations: { enter: "zoom", exit: "top" },
  "tu-me-manques": { enter: "right", exit: "left" },
  jarrive: { enter: "left", exit: "right" },
  "on-dit-quoi": { enter: "right", exit: "left" },
  enjailler: { enter: "bottom", exit: "bottom" },
  "cest-gate": { enter: "top", exit: "bottom" },
  garba: { enter: "top", exit: "bottom" },
  moisi: { enter: "left", exit: "left" },
  yako: { enter: "zoom", exit: "zoom" },
  sapee: { enter: "right", exit: "left" },
  kpakpato: { enter: "left", exit: "right" },
  "ya-foyi": { enter: "bottom", exit: "bottom" },
  "bonne-journee": { enter: "left", exit: "right" },
  "bon-courage": { enter: "bottom", exit: "top" },
  pardon: { enter: "right", exit: "right" },
  "gros-bisous": { enter: "bottom", exit: "top" },
  "le-boss": { enter: "zoom", exit: "zoom" },
};

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
