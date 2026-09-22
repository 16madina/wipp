import { emojiFromStickerId, isEmojiSticker } from "./emoji";

type StickerDef = {
  id: string;
  pack: "elle" | "lui" | "fun" | "fun2";
  src: string;
  anim: string;
  loopSoft?: boolean;
  labelFr: string;
  labelEn: string;
};

const ELLE: StickerDef[] = [
  { id: "wippe-moi", pack: "elle", src: "/stickers/wippe-moi.webp", anim: "/stickers/wippe-moi.mp4?v=3", labelFr: "Wippe-moi !", labelEn: "Wipp me!" },
  { id: "ca-wipp", pack: "elle", src: "/stickers/ca-wipp.webp", anim: "/stickers/ca-wipp.mp4?v=3", labelFr: "Ça WIPP !", labelEn: "That’s WIPP!" },
  { id: "merci", pack: "elle", src: "/stickers/merci.webp", anim: "/stickers/merci.mp4?v=3", loopSoft: true, labelFr: "Merci", labelEn: "Thanks" },
  { id: "on-se-capte", pack: "elle", src: "/stickers/on-se-capte.webp", anim: "/stickers/on-se-capte.mp4?v=3", labelFr: "On se capte !", labelEn: "Catch you!" },
  { id: "mdr", pack: "elle", src: "/stickers/mdr.webp", anim: "/stickers/mdr.mp4?v=3", labelFr: "MDR !", labelEn: "LOL!" },
  { id: "hmm", pack: "elle", src: "/stickers/hmm.webp", anim: "/stickers/hmm.mp4?v=3", labelFr: "Hmm…", labelEn: "Hmm…" },
  { id: "no-way", pack: "elle", src: "/stickers/no-way.webp", anim: "/stickers/no-way.mp4?v=3", labelFr: "No way !", labelEn: "No way!" },
  { id: "valide", pack: "elle", src: "/stickers/valide.webp", anim: "/stickers/valide.mp4?v=3", labelFr: "C’est validé !", labelEn: "Approved!" },
  { id: "j-arrive", pack: "elle", src: "/stickers/j-arrive.webp", anim: "/stickers/j-arrive.mp4?v=3", labelFr: "J’arrive !", labelEn: "On my way!" },
  { id: "bonne-nuit", pack: "elle", src: "/stickers/bonne-nuit.webp", anim: "/stickers/bonne-nuit.mp4?v=3", loopSoft: true, labelFr: "Bonne nuit", labelEn: "Good night" },
  { id: "bon-matin", pack: "elle", src: "/stickers/bon-matin.webp", anim: "/stickers/bon-matin.mp4?v=3", loopSoft: true, labelFr: "Bon matin !", labelEn: "Good morning!" },
  { id: "appelle-moi", pack: "elle", src: "/stickers/appelle-moi.webp", anim: "/stickers/appelle-moi.mp4?v=3", labelFr: "Appelle-moi !", labelEn: "Call me!" },
  { id: "bisous", pack: "elle", src: "/stickers/bisous.webp", anim: "/stickers/bisous.mp4?v=3", loopSoft: true, labelFr: "Bisous", labelEn: "Kisses" },
  { id: "bravo", pack: "elle", src: "/stickers/bravo.webp", anim: "/stickers/bravo.mp4?v=3", labelFr: "Bravo !", labelEn: "Bravo!" },
  { id: "laisse-tomber", pack: "elle", src: "/stickers/laisse-tomber.webp", anim: "/stickers/laisse-tomber.mp4?v=3", labelFr: "Laisse tomber !", labelEn: "Never mind!" },
  { id: "connecte", pack: "elle", src: "/stickers/connecte.webp", anim: "/stickers/connecte.mp4?v=3", labelFr: "Connecté !", labelEn: "Connected!" },
];

const LUI: StickerDef[] = [
  { id: "lui-wippe-moi", pack: "lui", src: "/stickers/lui/wippe-moi.webp", anim: "/stickers/lui/wippe-moi.mp4?v=1", labelFr: "Wippe-moi !", labelEn: "Wipp me!" },
  { id: "lui-ca-wipp", pack: "lui", src: "/stickers/lui/ca-wipp.webp", anim: "/stickers/lui/ca-wipp.mp4?v=1", labelFr: "Ça WIPP !", labelEn: "That’s WIPP!" },
  { id: "lui-bonne-nuit", pack: "lui", src: "/stickers/lui/bonne-nuit.webp", anim: "/stickers/lui/bonne-nuit.mp4?v=1", loopSoft: true, labelFr: "Bonne nuit !", labelEn: "Good night" },
  { id: "lui-valide", pack: "lui", src: "/stickers/lui/valide.webp", anim: "/stickers/lui/valide.mp4?v=1", labelFr: "C’est validé !", labelEn: "Approved!" },
  { id: "lui-mdr", pack: "lui", src: "/stickers/lui/mdr.webp", anim: "/stickers/lui/mdr.mp4?v=1", labelFr: "MDR !", labelEn: "LOL!" },
  { id: "lui-hmm", pack: "lui", src: "/stickers/lui/hmm.webp", anim: "/stickers/lui/hmm.mp4?v=1", labelFr: "Hmm…", labelEn: "Hmm…" },
  { id: "lui-no-way", pack: "lui", src: "/stickers/lui/no-way.webp", anim: "/stickers/lui/no-way.mp4?v=1", labelFr: "No way !", labelEn: "No way!" },
  { id: "lui-on-se-capte", pack: "lui", src: "/stickers/lui/on-se-capte.webp", anim: "/stickers/lui/on-se-capte.mp4?v=1", labelFr: "On se capte !", labelEn: "Catch you!" },
  { id: "lui-j-arrive", pack: "lui", src: "/stickers/lui/j-arrive.webp", anim: "/stickers/lui/j-arrive.mp4?v=1", labelFr: "J’arrive !", labelEn: "On my way!" },
  { id: "lui-bisous", pack: "lui", src: "/stickers/lui/bisous.webp", anim: "/stickers/lui/bisous.mp4?v=1", loopSoft: true, labelFr: "Bisous !", labelEn: "Kisses" },
  { id: "lui-bon-matin", pack: "lui", src: "/stickers/lui/bon-matin.webp", anim: "/stickers/lui/bon-matin.mp4?v=1", loopSoft: true, labelFr: "Bon matin !", labelEn: "Good morning!" },
  { id: "lui-appelle-moi", pack: "lui", src: "/stickers/lui/appelle-moi.webp", anim: "/stickers/lui/appelle-moi.mp4?v=1", labelFr: "Appelle-moi !", labelEn: "Call me!" },
  { id: "lui-laisse-tomber", pack: "lui", src: "/stickers/lui/laisse-tomber.webp", anim: "/stickers/lui/laisse-tomber.mp4?v=1", labelFr: "Laisse tomber !", labelEn: "Never mind!" },
  { id: "lui-bravo", pack: "lui", src: "/stickers/lui/bravo.webp", anim: "/stickers/lui/bravo.mp4?v=1", labelFr: "Bravo !", labelEn: "Bravo!" },
  { id: "lui-respect", pack: "lui", src: "/stickers/lui/respect.webp", anim: "/stickers/lui/respect.mp4?v=1", labelFr: "Respect !", labelEn: "Respect!" },
  { id: "lui-connecte", pack: "lui", src: "/stickers/lui/connecte.webp", anim: "/stickers/lui/connecte.mp4?v=1", labelFr: "Connecté !", labelEn: "Connected!" },
];

const FUN: StickerDef[] = [
  { id: "fun-va-la-bas", pack: "fun", src: "/stickers/fun/va-la-bas.webp", anim: "/stickers/fun/va-la-bas.mp4?v=1", labelFr: "Va là-bas !", labelEn: "Go over there!" },
  { id: "fun-stop", pack: "fun", src: "/stickers/fun/stop.webp", anim: "/stickers/fun/stop.mp4?v=1", labelFr: "Stop !", labelEn: "Stop!" },
  { id: "fun-hahaha", pack: "fun", src: "/stickers/fun/hahaha.webp", anim: "/stickers/fun/hahaha.mp4?v=1", labelFr: "HAHAHA !", labelEn: "HAHAHA!" },
  { id: "fun-pas-aujourdhui", pack: "fun", src: "/stickers/fun/pas-aujourdhui.webp", anim: "/stickers/fun/pas-aujourdhui.mp4?v=1", loopSoft: true, labelFr: "Pas aujourd’hui !", labelEn: "Not today!" },
  { id: "fun-le-boss", pack: "fun", src: "/stickers/fun/le-boss.webp", anim: "/stickers/fun/le-boss.mp4?v=1", labelFr: "Le boss !", labelEn: "The boss!" },
  { id: "fun-trop-tot", pack: "fun", src: "/stickers/fun/trop-tot.webp", anim: "/stickers/fun/trop-tot.mp4?v=1", loopSoft: true, labelFr: "Trop tôt !", labelEn: "Too early!" },
  { id: "fun-ca-marche", pack: "fun", src: "/stickers/fun/ca-marche.webp", anim: "/stickers/fun/ca-marche.mp4?v=1", labelFr: "Ça marche !", labelEn: "It works!" },
  { id: "fun-valide", pack: "fun", src: "/stickers/fun/valide.webp", anim: "/stickers/fun/valide.mp4?v=1", labelFr: "Validé !", labelEn: "Approved!" },
  { id: "fun-bisousss", pack: "fun", src: "/stickers/fun/bisousss.webp", anim: "/stickers/fun/bisousss.mp4?v=1", loopSoft: true, labelFr: "Bisousss !", labelEn: "Kisses!" },
  { id: "fun-nimporte-quoi", pack: "fun", src: "/stickers/fun/nimporte-quoi.webp", anim: "/stickers/fun/nimporte-quoi.mp4?v=1", labelFr: "N’importe quoi !", labelEn: "Whatever!" },
  { id: "fun-bien-joue", pack: "fun", src: "/stickers/fun/bien-joue.webp", anim: "/stickers/fun/bien-joue.mp4?v=1", labelFr: "Bien joué !", labelEn: "Nice one!" },
  { id: "fun-ecoute-bien", pack: "fun", src: "/stickers/fun/ecoute-bien.webp", anim: "/stickers/fun/ecoute-bien.mp4?v=1", labelFr: "Écoute bien !", labelEn: "Listen up!" },
  { id: "fun-laisse-moi", pack: "fun", src: "/stickers/fun/laisse-moi.webp", anim: "/stickers/fun/laisse-moi.mp4?v=1", labelFr: "Laisse-moi !", labelEn: "Leave me!" },
  { id: "fun-cool", pack: "fun", src: "/stickers/fun/cool.webp", anim: "/stickers/fun/cool.mp4?v=1", labelFr: "Cool !", labelEn: "Cool!" },
  { id: "fun-vraiment", pack: "fun", src: "/stickers/fun/vraiment.webp", anim: "/stickers/fun/vraiment.mp4?v=1", labelFr: "Vraiment ?!", labelEn: "Really?!" },
  { id: "fun-oh-non", pack: "fun", src: "/stickers/fun/oh-non.webp", anim: "/stickers/fun/oh-non.mp4?v=1", labelFr: "Oh non…", labelEn: "Oh no…" },
  { id: "fun-yesss", pack: "fun", src: "/stickers/fun/yesss.webp", anim: "/stickers/fun/yesss.mp4?v=1", labelFr: "Yessss !", labelEn: "Yessss!" },
  { id: "fun-dodo", pack: "fun", src: "/stickers/fun/dodo.webp", anim: "/stickers/fun/dodo.mp4?v=1", loopSoft: true, labelFr: "Dodo…", labelEn: "Night night…" },
  { id: "fun-tchip", pack: "fun", src: "/stickers/fun/tchip.webp", anim: "/stickers/fun/tchip.mp4?v=1", labelFr: "Tchip !", labelEn: "Tchip!" },
  { id: "fun-focus", pack: "fun", src: "/stickers/fun/focus.webp", anim: "/stickers/fun/focus.mp4?v=1", labelFr: "Focus !", labelEn: "Focus!" },
];

const FUN2: StickerDef[] = [
  { id: "fun2-toi-la", pack: "fun2", src: "/stickers/fun2/toi-la.webp", anim: "/stickers/fun2/toi-la.mp4?v=1", labelFr: "Toi là !", labelEn: "You there!" },
  { id: "fun2-cours", pack: "fun2", src: "/stickers/fun2/cours.webp", anim: "/stickers/fun2/cours.mp4?v=1", labelFr: "Cours !!!", labelEn: "Run!!!" },
  { id: "fun2-hahaha", pack: "fun2", src: "/stickers/fun2/hahaha.webp", anim: "/stickers/fun2/hahaha.mp4?v=1", labelFr: "Hahaha !", labelEn: "Hahaha!" },
  { id: "fun2-pas-mon-probleme", pack: "fun2", src: "/stickers/fun2/pas-mon-probleme.webp", anim: "/stickers/fun2/pas-mon-probleme.mp4?v=1", labelFr: "Pas mon problème !", labelEn: "Not my problem!" },
  { id: "fun2-nananana", pack: "fun2", src: "/stickers/fun2/nananana.webp", anim: "/stickers/fun2/nananana.mp4?v=1", labelFr: "Nananana !", labelEn: "Nananana!" },
  { id: "fun2-hum", pack: "fun2", src: "/stickers/fun2/hum.webp", anim: "/stickers/fun2/hum.mp4?v=1", labelFr: "Hum !", labelEn: "Hum!" },
  { id: "fun2-mdr", pack: "fun2", src: "/stickers/fun2/mdr.webp", anim: "/stickers/fun2/mdr.mp4?v=1", labelFr: "MDR !", labelEn: "LOL!" },
  { id: "fun2-je-suis-ko", pack: "fun2", src: "/stickers/fun2/je-suis-ko.webp", anim: "/stickers/fun2/je-suis-ko.mp4?v=1", labelFr: "Je suis KO !", labelEn: "I’m KO!" },
  { id: "fun2-bye-bye", pack: "fun2", src: "/stickers/fun2/bye-bye.webp", anim: "/stickers/fun2/bye-bye.mp4?v=1", labelFr: "Bye bye !", labelEn: "Bye bye!" },
  { id: "fun2-je-vais-taper", pack: "fun2", src: "/stickers/fun2/je-vais-taper.webp", anim: "/stickers/fun2/je-vais-taper.mp4?v=1", labelFr: "Je vais taper !", labelEn: "I’m gonna hit!" },
  { id: "fun2-tu-parles-trop", pack: "fun2", src: "/stickers/fun2/tu-parles-trop.webp", anim: "/stickers/fun2/tu-parles-trop.mp4?v=1", labelFr: "Tu parles trop !", labelEn: "You talk too much!" },
  { id: "fun2-oh-mon-dieu", pack: "fun2", src: "/stickers/fun2/oh-mon-dieu.webp", anim: "/stickers/fun2/oh-mon-dieu.mp4?v=1", labelFr: "Oh mon Dieu !", labelEn: "Oh my God!" },
  { id: "fun2-je-te-vois", pack: "fun2", src: "/stickers/fun2/je-te-vois.webp", anim: "/stickers/fun2/je-te-vois.mp4?v=1", labelFr: "Je te vois !", labelEn: "I see you!" },
  { id: "fun2-argent-dabord", pack: "fun2", src: "/stickers/fun2/argent-dabord.webp", anim: "/stickers/fun2/argent-dabord.mp4?v=1", labelFr: "Argent d’abord !", labelEn: "Money first!" },
  { id: "fun2-degage", pack: "fun2", src: "/stickers/fun2/degage.webp", anim: "/stickers/fun2/degage.mp4?v=1", labelFr: "Dégage !", labelEn: "Get out!" },
  { id: "fun2-cest-bon-hein", pack: "fun2", src: "/stickers/fun2/cest-bon-hein.webp", anim: "/stickers/fun2/cest-bon-hein.mp4?v=1", labelFr: "C’est bon hein !", labelEn: "This slaps!" },
  { id: "fun2-trop-mange", pack: "fun2", src: "/stickers/fun2/trop-mange.webp", anim: "/stickers/fun2/trop-mange.mp4?v=1", labelFr: "Trop mangé !", labelEn: "Too full!" },
  { id: "fun2-wesh", pack: "fun2", src: "/stickers/fun2/wesh.webp", anim: "/stickers/fun2/wesh.mp4?v=1", labelFr: "Wesh ?!", labelEn: "Wesh?!" },
  { id: "fun2-ecoutez-moi-bien", pack: "fun2", src: "/stickers/fun2/ecoutez-moi-bien.webp", anim: "/stickers/fun2/ecoutez-moi-bien.mp4?v=1", labelFr: "Écoutez-moi bien !", labelEn: "Listen up!" },
  { id: "fun2-je-ne-sais-pas", pack: "fun2", src: "/stickers/fun2/je-ne-sais-pas.webp", anim: "/stickers/fun2/je-ne-sais-pas.mp4?v=1", labelFr: "Je ne sais pas !", labelEn: "I don’t know!" },
];

export const STICKER_PACKS = {
  elle: { id: "elle" as const, labelFr: "Elle", labelEn: "Her", stickers: ELLE },
  lui: { id: "lui" as const, labelFr: "Lui", labelEn: "Him", stickers: LUI },
  fun: { id: "fun" as const, labelFr: "Fun", labelEn: "Fun", stickers: FUN },
  fun2: { id: "fun2" as const, labelFr: "#2", labelEn: "#2", stickers: FUN2 },
};

export const WIPP_STICKERS = [...ELLE, ...LUI, ...FUN, ...FUN2];

export type StickerId = string;
export type StickerPackId = keyof typeof STICKER_PACKS;

export const STICKER_PLAY_S = 3.05;

export function isStickerId(id: string | undefined): id is StickerId {
  if (isEmojiSticker(id)) return true;
  return Boolean(id && WIPP_STICKERS.some((s) => s.id === id));
}

export function stickerById(id: string | undefined) {
  return WIPP_STICKERS.find((s) => s.id === id);
}

export function stickersInPack(pack: StickerPackId) {
  return STICKER_PACKS[pack].stickers;
}

export function stickerLabel(id: string | undefined, lang: "fr" | "en") {
  if (isEmojiSticker(id) && id) return emojiFromStickerId(id);
  const row = stickerById(id);
  if (!row) return "Sticker";
  return lang === "fr" ? row.labelFr : row.labelEn;
}
