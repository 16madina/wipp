import { raster } from "../generated/raster";

function rasterPath(url: string) {
  return url.replace(/^\//, "").split("?")[0];
}

function hasRaster(url: string) {
  return Boolean((raster as Record<string, number>)[rasterPath(url)]);
}

export type StickerDef = {
  id: string;
  pack: "femme" | "homme" | "comique" | "moji" | "ani" | "emo";
  src: string;
  anim?: string;
  loopSoft?: boolean;
  labelFr: string;
  labelEn: string;
  motion?: string;
  fx?: "hearts" | "confetti" | "disco" | "shake" | "flame" | "flash" | "heartwave" | "rays" | "notes" | "crown" | "steam" | "ring";
  sound?: "whoosh" | "mwah" | "laugh" | "dundun" | "bling" | "alarm" | "beat" | "jingle" | "hiss" | "party" | "clap" | "bonk" | "zip" | "ching" | "pop" | "crystal" | "boss" | "charge" | "notes" | "ding" | "arcade" | "tada" | "siren" | "clack" | "heart" | "film" | "ting";
  bubble?: "flame" | "glow" | "shake" | "crown";
  /** Full-screen moment. Plays once on arrival, again on tap. */
  moment?: "bravo" | "alert" | "love" | "wipp";
  /** WIPP Moment: overlay length before it leaves the chat. */
  playMs?: number;
};

const ELLE: StickerDef[] = [
  { id: "wippe-moi", pack: "femme", src: "/stickers/wippe-moi.webp", anim: "/stickers/wippe-moi.mp4?v=3", labelFr: "Wippe-moi !", labelEn: "Wipp me!" },
  { id: "ca-wipp", pack: "femme", src: "/stickers/ca-wipp.webp", anim: "/stickers/ca-wipp.mp4?v=3", labelFr: "Ça WIPP !", labelEn: "That’s WIPP!" },
  { id: "merci", pack: "femme", src: "/stickers/merci.webp", anim: "/stickers/merci.mp4?v=3", loopSoft: true, labelFr: "Merci", labelEn: "Thanks" },
  { id: "on-se-capte", pack: "femme", src: "/stickers/on-se-capte.webp", anim: "/stickers/on-se-capte.mp4?v=3", labelFr: "On se capte !", labelEn: "Catch you!" },
  { id: "mdr", pack: "femme", src: "/stickers/mdr.webp", anim: "/stickers/mdr.mp4?v=3", labelFr: "MDR !", labelEn: "LOL!" },
  { id: "hmm", pack: "femme", src: "/stickers/hmm.webp", anim: "/stickers/hmm.mp4?v=3", labelFr: "Hmm…", labelEn: "Hmm…" },
  { id: "no-way", pack: "femme", src: "/stickers/no-way.webp", anim: "/stickers/no-way.mp4?v=3", labelFr: "No way !", labelEn: "No way!" },
  { id: "valide", pack: "femme", src: "/stickers/valide.webp", anim: "/stickers/valide.mp4?v=3", labelFr: "C’est validé !", labelEn: "Approved!" },
  { id: "j-arrive", pack: "femme", src: "/stickers/j-arrive.webp", anim: "/stickers/j-arrive.mp4?v=3", labelFr: "J’arrive !", labelEn: "On my way!" },
  { id: "bonne-nuit", pack: "femme", src: "/stickers/bonne-nuit.webp", anim: "/stickers/bonne-nuit.mp4?v=3", loopSoft: true, labelFr: "Bonne nuit", labelEn: "Good night" },
  { id: "bon-matin", pack: "femme", src: "/stickers/bon-matin.webp", anim: "/stickers/bon-matin.mp4?v=3", loopSoft: true, labelFr: "Bon matin !", labelEn: "Good morning!" },
  { id: "appelle-moi", pack: "femme", src: "/stickers/appelle-moi.webp", anim: "/stickers/appelle-moi.mp4?v=3", labelFr: "Appelle-moi !", labelEn: "Call me!" },
  { id: "bisous", pack: "femme", src: "/stickers/bisous.webp", anim: "/stickers/bisous.mp4?v=3", loopSoft: true, labelFr: "Bisous", labelEn: "Kisses" },
  { id: "bravo", pack: "femme", src: "/stickers/bravo.webp", anim: "/stickers/bravo.mp4?v=3", labelFr: "Bravo !", labelEn: "Bravo!" },
  { id: "laisse-tomber", pack: "femme", src: "/stickers/laisse-tomber.webp", anim: "/stickers/laisse-tomber.mp4?v=3", labelFr: "Laisse tomber !", labelEn: "Never mind!" },
  { id: "connecte", pack: "femme", src: "/stickers/connecte.webp", anim: "/stickers/connecte.mp4?v=3", labelFr: "Connecté !", labelEn: "Connected!" },
];

const LUI: StickerDef[] = [
  { id: "lui-wippe-moi", pack: "homme", src: "/stickers/lui/wippe-moi.webp", anim: "/stickers/lui/wippe-moi.mp4?v=1", labelFr: "Wippe-moi !", labelEn: "Wipp me!" },
  { id: "lui-ca-wipp", pack: "homme", src: "/stickers/lui/ca-wipp.webp", anim: "/stickers/lui/ca-wipp.mp4?v=1", labelFr: "Ça WIPP !", labelEn: "That’s WIPP!" },
  { id: "lui-bonne-nuit", pack: "homme", src: "/stickers/lui/bonne-nuit.webp", anim: "/stickers/lui/bonne-nuit.mp4?v=1", loopSoft: true, labelFr: "Bonne nuit !", labelEn: "Good night" },
  { id: "lui-valide", pack: "homme", src: "/stickers/lui/valide.webp", anim: "/stickers/lui/valide.mp4?v=1", labelFr: "C’est validé !", labelEn: "Approved!" },
  { id: "lui-mdr", pack: "homme", src: "/stickers/lui/mdr.webp", anim: "/stickers/lui/mdr.mp4?v=1", labelFr: "MDR !", labelEn: "LOL!" },
  { id: "lui-hmm", pack: "homme", src: "/stickers/lui/hmm.webp", anim: "/stickers/lui/hmm.mp4?v=1", labelFr: "Hmm…", labelEn: "Hmm…" },
  { id: "lui-no-way", pack: "homme", src: "/stickers/lui/no-way.webp", anim: "/stickers/lui/no-way.mp4?v=1", labelFr: "No way !", labelEn: "No way!" },
  { id: "lui-on-se-capte", pack: "homme", src: "/stickers/lui/on-se-capte.webp", anim: "/stickers/lui/on-se-capte.mp4?v=1", labelFr: "On se capte !", labelEn: "Catch you!" },
  { id: "lui-j-arrive", pack: "homme", src: "/stickers/lui/j-arrive.webp", anim: "/stickers/lui/j-arrive.mp4?v=1", labelFr: "J’arrive !", labelEn: "On my way!" },
  { id: "lui-bisous", pack: "homme", src: "/stickers/lui/bisous.webp", anim: "/stickers/lui/bisous.mp4?v=1", loopSoft: true, labelFr: "Bisous !", labelEn: "Kisses" },
  { id: "lui-bon-matin", pack: "homme", src: "/stickers/lui/bon-matin.webp", anim: "/stickers/lui/bon-matin.mp4?v=1", loopSoft: true, labelFr: "Bon matin !", labelEn: "Good morning!" },
  { id: "lui-appelle-moi", pack: "homme", src: "/stickers/lui/appelle-moi.webp", anim: "/stickers/lui/appelle-moi.mp4?v=1", labelFr: "Appelle-moi !", labelEn: "Call me!" },
  { id: "lui-laisse-tomber", pack: "homme", src: "/stickers/lui/laisse-tomber.webp", anim: "/stickers/lui/laisse-tomber.mp4?v=1", labelFr: "Laisse tomber !", labelEn: "Never mind!" },
  { id: "lui-bravo", pack: "homme", src: "/stickers/lui/bravo.webp", anim: "/stickers/lui/bravo.mp4?v=1", labelFr: "Bravo !", labelEn: "Bravo!" },
  { id: "lui-respect", pack: "homme", src: "/stickers/lui/respect.webp", anim: "/stickers/lui/respect.mp4?v=1", labelFr: "Respect !", labelEn: "Respect!" },
  { id: "lui-connecte", pack: "homme", src: "/stickers/lui/connecte.webp", anim: "/stickers/lui/connecte.mp4?v=1", labelFr: "Connecté !", labelEn: "Connected!" },
];

const FUN: StickerDef[] = [
  { id: "fun-va-la-bas", pack: "comique", src: "/stickers/fun/va-la-bas.webp", anim: "/stickers/fun/va-la-bas.mp4?v=1", labelFr: "Va là-bas !", labelEn: "Go over there!" },
  { id: "fun-stop", pack: "comique", src: "/stickers/fun/stop.webp", anim: "/stickers/fun/stop.mp4?v=1", labelFr: "Stop !", labelEn: "Stop!" },
  { id: "fun-hahaha", pack: "comique", src: "/stickers/fun/hahaha.webp", anim: "/stickers/fun/hahaha.mp4?v=1", labelFr: "HAHAHA !", labelEn: "HAHAHA!" },
  { id: "fun-pas-aujourdhui", pack: "comique", src: "/stickers/fun/pas-aujourdhui.webp", anim: "/stickers/fun/pas-aujourdhui.mp4?v=1", loopSoft: true, labelFr: "Pas aujourd’hui !", labelEn: "Not today!" },
  { id: "fun-le-boss", pack: "comique", src: "/stickers/fun/le-boss.webp", anim: "/stickers/fun/le-boss.mp4?v=1", labelFr: "Le boss !", labelEn: "The boss!" },
  { id: "fun-trop-tot", pack: "comique", src: "/stickers/fun/trop-tot.webp", anim: "/stickers/fun/trop-tot.mp4?v=1", loopSoft: true, labelFr: "Trop tôt !", labelEn: "Too early!" },
  { id: "fun-ca-marche", pack: "comique", src: "/stickers/fun/ca-marche.webp", anim: "/stickers/fun/ca-marche.mp4?v=1", labelFr: "Ça marche !", labelEn: "It works!" },
  { id: "fun-valide", pack: "comique", src: "/stickers/fun/valide.webp", anim: "/stickers/fun/valide.mp4?v=1", labelFr: "Validé !", labelEn: "Approved!" },
  { id: "fun-bisousss", pack: "comique", src: "/stickers/fun/bisousss.webp", anim: "/stickers/fun/bisousss.mp4?v=1", loopSoft: true, labelFr: "Bisousss !", labelEn: "Kisses!" },
  { id: "fun-nimporte-quoi", pack: "comique", src: "/stickers/fun/nimporte-quoi.webp", anim: "/stickers/fun/nimporte-quoi.mp4?v=1", labelFr: "N’importe quoi !", labelEn: "Whatever!" },
  { id: "fun-bien-joue", pack: "comique", src: "/stickers/fun/bien-joue.webp", anim: "/stickers/fun/bien-joue.mp4?v=1", labelFr: "Bien joué !", labelEn: "Nice one!" },
  { id: "fun-ecoute-bien", pack: "comique", src: "/stickers/fun/ecoute-bien.webp", anim: "/stickers/fun/ecoute-bien.mp4?v=1", labelFr: "Écoute bien !", labelEn: "Listen up!" },
  { id: "fun-laisse-moi", pack: "comique", src: "/stickers/fun/laisse-moi.webp", anim: "/stickers/fun/laisse-moi.mp4?v=1", labelFr: "Laisse-moi !", labelEn: "Leave me!" },
  { id: "fun-cool", pack: "comique", src: "/stickers/fun/cool.webp", anim: "/stickers/fun/cool.mp4?v=1", labelFr: "Cool !", labelEn: "Cool!" },
  { id: "fun-vraiment", pack: "comique", src: "/stickers/fun/vraiment.webp", anim: "/stickers/fun/vraiment.mp4?v=1", labelFr: "Vraiment ?!", labelEn: "Really?!" },
  { id: "fun-oh-non", pack: "comique", src: "/stickers/fun/oh-non.webp", anim: "/stickers/fun/oh-non.mp4?v=1", labelFr: "Oh non…", labelEn: "Oh no…" },
  { id: "fun-yesss", pack: "comique", src: "/stickers/fun/yesss.webp", anim: "/stickers/fun/yesss.mp4?v=1", labelFr: "Yessss !", labelEn: "Yessss!" },
  { id: "fun-dodo", pack: "comique", src: "/stickers/fun/dodo.webp", anim: "/stickers/fun/dodo.mp4?v=1", loopSoft: true, labelFr: "Dodo…", labelEn: "Night night…" },
  { id: "fun-tchip", pack: "comique", src: "/stickers/fun/tchip.webp", anim: "/stickers/fun/tchip.mp4?v=1", labelFr: "Tchip !", labelEn: "Tchip!" },
  { id: "fun-focus", pack: "comique", src: "/stickers/fun/focus.webp", anim: "/stickers/fun/focus.mp4?v=1", labelFr: "Focus !", labelEn: "Focus!" },
];

const FUN2: StickerDef[] = [
  { id: "fun2-toi-la", pack: "comique", src: "/stickers/fun2/toi-la.webp", anim: "/stickers/fun2/toi-la.mp4?v=1", labelFr: "Toi là !", labelEn: "You there!" },
  { id: "fun2-cours", pack: "comique", src: "/stickers/fun2/cours.webp", anim: "/stickers/fun2/cours.mp4?v=1", labelFr: "Cours !!!", labelEn: "Run!!!" },
  { id: "fun2-hahaha", pack: "comique", src: "/stickers/fun2/hahaha.webp", anim: "/stickers/fun2/hahaha.mp4?v=1", labelFr: "Hahaha !", labelEn: "Hahaha!" },
  { id: "fun2-pas-mon-probleme", pack: "comique", src: "/stickers/fun2/pas-mon-probleme.webp", anim: "/stickers/fun2/pas-mon-probleme.mp4?v=1", labelFr: "Pas mon problème !", labelEn: "Not my problem!" },
  { id: "fun2-nananana", pack: "comique", src: "/stickers/fun2/nananana.webp", anim: "/stickers/fun2/nananana.mp4?v=1", labelFr: "Nananana !", labelEn: "Nananana!" },
  { id: "fun2-hum", pack: "comique", src: "/stickers/fun2/hum.webp", anim: "/stickers/fun2/hum.mp4?v=1", labelFr: "Hum !", labelEn: "Hum!" },
  { id: "fun2-mdr", pack: "comique", src: "/stickers/fun2/mdr.webp", anim: "/stickers/fun2/mdr.mp4?v=1", labelFr: "MDR !", labelEn: "LOL!" },
  { id: "fun2-je-suis-ko", pack: "comique", src: "/stickers/fun2/je-suis-ko.webp", anim: "/stickers/fun2/je-suis-ko.mp4?v=1", labelFr: "Je suis KO !", labelEn: "I’m KO!" },
  { id: "fun2-bye-bye", pack: "comique", src: "/stickers/fun2/bye-bye.webp", anim: "/stickers/fun2/bye-bye.mp4?v=1", labelFr: "Bye bye !", labelEn: "Bye bye!" },
  { id: "fun2-je-vais-taper", pack: "comique", src: "/stickers/fun2/je-vais-taper.webp", anim: "/stickers/fun2/je-vais-taper.mp4?v=1", labelFr: "Je vais taper !", labelEn: "I’m gonna hit!" },
  { id: "fun2-tu-parles-trop", pack: "comique", src: "/stickers/fun2/tu-parles-trop.webp", anim: "/stickers/fun2/tu-parles-trop.mp4?v=1", labelFr: "Tu parles trop !", labelEn: "You talk too much!" },
  { id: "fun2-oh-mon-dieu", pack: "comique", src: "/stickers/fun2/oh-mon-dieu.webp", anim: "/stickers/fun2/oh-mon-dieu.mp4?v=1", labelFr: "Oh mon Dieu !", labelEn: "Oh my God!" },
  { id: "fun2-je-te-vois", pack: "comique", src: "/stickers/fun2/je-te-vois.webp", anim: "/stickers/fun2/je-te-vois.mp4?v=1", labelFr: "Je te vois !", labelEn: "I see you!" },
  { id: "fun2-argent-dabord", pack: "comique", src: "/stickers/fun2/argent-dabord.webp", anim: "/stickers/fun2/argent-dabord.mp4?v=1", labelFr: "Argent d’abord !", labelEn: "Money first!" },
  { id: "fun2-degage", pack: "comique", src: "/stickers/fun2/degage.webp", anim: "/stickers/fun2/degage.mp4?v=1", labelFr: "Dégage !", labelEn: "Get out!" },
  { id: "fun2-cest-bon-hein", pack: "comique", src: "/stickers/fun2/cest-bon-hein.webp", anim: "/stickers/fun2/cest-bon-hein.mp4?v=1", labelFr: "C’est bon hein !", labelEn: "This slaps!" },
  { id: "fun2-trop-mange", pack: "comique", src: "/stickers/fun2/trop-mange.webp", anim: "/stickers/fun2/trop-mange.mp4?v=1", labelFr: "Trop mangé !", labelEn: "Too full!" },
  { id: "fun2-wesh", pack: "comique", src: "/stickers/fun2/wesh.webp", anim: "/stickers/fun2/wesh.mp4?v=1", labelFr: "Wesh ?!", labelEn: "Wesh?!" },
  { id: "fun2-ecoutez-moi-bien", pack: "comique", src: "/stickers/fun2/ecoutez-moi-bien.webp", anim: "/stickers/fun2/ecoutez-moi-bien.mp4?v=1", labelFr: "Écoutez-moi bien !", labelEn: "Listen up!" },
  { id: "fun2-je-ne-sais-pas", pack: "comique", src: "/stickers/fun2/je-ne-sais-pas.webp", anim: "/stickers/fun2/je-ne-sais-pas.mp4?v=1", labelFr: "Je ne sais pas !", labelEn: "I don’t know!" },
];

const SIG: StickerDef[] = [
  { id: "sig-jarrive", pack: "comique", src: "/stickers/sig/sig-jarrive.png", motion: "arrive", sound: "whoosh", labelFr: "J’arrive !", labelEn: "On my way!" },
  { id: "sig-coucou", pack: "comique", src: "/stickers/sig/sig-coucou.png", motion: "coucou", labelFr: "Coucou !", labelEn: "Hey!" },
  { id: "sig-tes-la", pack: "comique", src: "/stickers/sig/sig-tes-la.png", motion: "peek", labelFr: "T’es là ?", labelEn: "You there?" },
  { id: "sig-bonne-idee", pack: "comique", src: "/stickers/sig/sig-bonne-idee.png", motion: "idea", labelFr: "Bonne idée !", labelEn: "Good idea!" },
  { id: "sig-cafe", pack: "comique", src: "/stickers/sig/sig-cafe.png", motion: "cafe", labelFr: "Café ?", labelEn: "Coffee?" },
  { id: "sig-bisous", pack: "comique", src: "/stickers/sig/sig-bisous.png", motion: "bisous", fx: "hearts", sound: "mwah", labelFr: "Bisous !", labelEn: "Kisses!" },
  { id: "sig-mdrrr", pack: "comique", src: "/stickers/sig/sig-mdrrr.png", motion: "mdr", fx: "shake", sound: "laugh", labelFr: "MDRRR", labelEn: "LOL" },
  { id: "sig-tu-mens", pack: "comique", src: "/stickers/sig/sig-tu-mens.png", motion: "mens", sound: "dundun", labelFr: "Tu mens !", labelEn: "You’re lying!" },
  { id: "sig-waaah", pack: "comique", src: "/stickers/sig/sig-waaah.png", motion: "waah", labelFr: "Waaah !", labelEn: "Whoa!" },
  { id: "sig-valide", pack: "comique", src: "/stickers/sig/sig-valide.png", motion: "valide", fx: "confetti", sound: "bling", labelFr: "C’est validé !", labelEn: "Approved!" },
  { id: "sig-on-se-capte", pack: "comique", src: "/stickers/sig/sig-on-se-capte.png", motion: "capte", labelFr: "On se capte !", labelEn: "Catch you!" },
  { id: "sig-self-care", pack: "comique", src: "/stickers/sig/sig-self-care.png", motion: "care", labelFr: "Self care", labelEn: "Self care" },
  { id: "sig-je-regarde", pack: "comique", src: "/stickers/sig/sig-je-regarde.png", motion: "eyes", labelFr: "Je te regarde…", labelEn: "I’m watching…" },
  { id: "sig-en-route", pack: "comique", src: "/stickers/sig/sig-en-route.png", motion: "route", labelFr: "En route !", labelEn: "On the way!" },
  { id: "sig-bonne-nuit", pack: "comique", src: "/stickers/sig/sig-bonne-nuit.png", motion: "nuit", labelFr: "Bonne nuit", labelEn: "Good night" },
  { id: "sig-debout", pack: "comique", src: "/stickers/sig/sig-debout.png", motion: "debout", sound: "alarm", labelFr: "Debout !", labelEn: "Wake up!" },
  { id: "sig-on-regarde", pack: "comique", src: "/stickers/sig/sig-on-regarde.png", motion: "popcorn", labelFr: "On regarde ?", labelEn: "Wanna watch?" },
  { id: "sig-laisse-tomber", pack: "comique", src: "/stickers/sig/sig-laisse-tomber.png", motion: "crack", labelFr: "Laisse tomber…", labelEn: "Never mind…" },
  { id: "sig-hmm", pack: "comique", src: "/stickers/sig/sig-hmm.png", motion: "hmm", labelFr: "Hmm…", labelEn: "Hmm…" },
  { id: "sig-shopping", pack: "comique", src: "/stickers/sig/sig-shopping.png", motion: "shop", labelFr: "Shopping ?", labelEn: "Shopping?" },
  { id: "sig-voyage", pack: "comique", src: "/stickers/sig/sig-voyage.png", motion: "voyage", labelFr: "Voyage ?", labelEn: "Trip?" },
  { id: "sig-ma-vibe", pack: "comique", src: "/stickers/sig/sig-ma-vibe.png", motion: "vibe", sound: "beat", labelFr: "Ma vibe", labelEn: "My vibe" },
  { id: "sig-motive", pack: "comique", src: "/stickers/sig/sig-motive.png", motion: "motive", labelFr: "Motivé(e) !", labelEn: "Motivated!" },
  { id: "sig-appelle", pack: "comique", src: "/stickers/sig/sig-appelle.png", motion: "call", labelFr: "Appelle-moi !", labelEn: "Call me!" },
  { id: "sig-faim", pack: "comique", src: "/stickers/sig/sig-faim.png", motion: "faim", labelFr: "J’ai faim !", labelEn: "I’m hungry!" },
  { id: "sig-ca-paye", pack: "comique", src: "/stickers/sig/sig-ca-paye.png", motion: "paye", labelFr: "Ça paye !", labelEn: "It pays!" },
  { id: "sig-chill", pack: "comique", src: "/stickers/sig/sig-chill.png", motion: "chill", labelFr: "Chill…", labelEn: "Chill…" },
  { id: "sig-toujours", pack: "comique", src: "/stickers/sig/sig-toujours.png", motion: "toujours", labelFr: "Toujours là !", labelEn: "Still here!" },
  { id: "sig-ca-wipp", pack: "comique", src: "/stickers/sig/sig-ca-wipp.png", motion: "disco", fx: "disco", sound: "jingle", moment: "wipp", labelFr: "Ça WIPP !", labelEn: "That’s WIPP!" },
  { id: "sig-raconte", pack: "comique", src: "/stickers/sig/sig-raconte.png", motion: "raconte", labelFr: "Raconte !", labelEn: "Tell me!" },
];

const MOJI: StickerDef[] = [
  { id: "moji-01", pack: "moji", src: "/stickers/moji-v/moji-01.webp", labelFr: "Fou rire", labelEn: "Laughing" },
  { id: "moji-02", pack: "moji", src: "/stickers/moji-v/moji-02.webp", labelFr: "Mort de rire", labelEn: "Tears of joy" },
  { id: "moji-03", pack: "moji", src: "/stickers/moji-v/moji-03.webp", labelFr: "Amoureux", labelEn: "In love" },
  { id: "moji-04", pack: "moji", src: "/stickers/moji-v/moji-04.webp", labelFr: "Bisou", labelEn: "Kiss" },
  { id: "moji-05", pack: "moji", src: "/stickers/moji-v/moji-05.webp", labelFr: "Cool", labelEn: "Cool" },
  { id: "moji-06", pack: "moji", src: "/stickers/moji-v/moji-06.webp", labelFr: "Cœur WIPP", labelEn: "WIPP heart" },
  { id: "moji-07", pack: "moji", src: "/stickers/moji-v/moji-07.webp", labelFr: "Gros chagrin", labelEn: "Big tears" },
  { id: "moji-08", pack: "moji", src: "/stickers/moji-v/moji-08.webp", labelFr: "Choqué", labelEn: "Shocked" },
  { id: "moji-09", pack: "moji", src: "/stickers/moji-v/moji-09.webp", labelFr: "Furieux", labelEn: "Furious" },
  { id: "moji-10", pack: "moji", src: "/stickers/moji-v/moji-10.webp", labelFr: "Merci", labelEn: "Please" },
  { id: "moji-11", pack: "moji", src: "/stickers/moji-v/moji-11.webp", labelFr: "Oh non…", labelEn: "Oh no…" },
  { id: "moji-12", pack: "moji", src: "/stickers/moji-v/moji-12.webp", labelFr: "Le roi", labelEn: "The king" },
  { id: "moji-13", pack: "moji", src: "/stickers/moji-v/moji-13.webp", labelFr: "En feu", labelEn: "On fire" },
  { id: "moji-14", pack: "moji", src: "/stickers/moji-v/moji-14.webp", labelFr: "Étoiles", labelEn: "Starry" },
  { id: "moji-15", pack: "moji", src: "/stickers/moji-v/moji-15.webp", labelFr: "Blague", labelEn: "Silly" },
  { id: "moji-16", pack: "moji", src: "/stickers/moji-v/moji-16.webp", labelFr: "Chut", labelEn: "Zip it" },
  { id: "moji-17", pack: "moji", src: "/stickers/moji-v/moji-17.webp", labelFr: "Méfiant", labelEn: "Side-eye" },
  { id: "moji-18", pack: "moji", src: "/stickers/moji-v/moji-18.webp", labelFr: "Hein ?", labelEn: "Huh?" },
  { id: "moji-19", pack: "moji", src: "/stickers/moji-v/moji-19.webp", labelFr: "Mon cœur", labelEn: "My heart" },
  { id: "moji-20", pack: "moji", src: "/stickers/moji-v/moji-20.webp", labelFr: "Je dors", labelEn: "Sleepy" },
  { id: "moji-21", pack: "moji", src: "/stickers/moji-v/moji-21.webp", labelFr: "Fête", labelEn: "Party" },
  { id: "moji-22", pack: "moji", src: "/stickers/moji-v/moji-22.webp", labelFr: "Bof", labelEn: "Meh" },
  { id: "moji-23", pack: "moji", src: "/stickers/moji-v/moji-23.webp", labelFr: "Frais", labelEn: "Sipping" },
  { id: "moji-24", pack: "moji", src: "/stickers/moji-v/moji-24.webp", labelFr: "Pouce", labelEn: "Thumbs up" },
  { id: "moji-25", pack: "moji", src: "/stickers/moji-v/moji-25.webp", labelFr: "Riche", labelEn: "Money" },
  { id: "moji-26", pack: "moji", src: "/stickers/moji-v/moji-26.webp", labelFr: "Boum", labelEn: "Mind blown" },
  { id: "moji-27", pack: "moji", src: "/stickers/moji-v/moji-27.webp", labelFr: "Cœur mains", labelEn: "Heart hands" },
  { id: "moji-28", pack: "moji", src: "/stickers/moji-v/moji-28.webp", labelFr: "Sprint", labelEn: "Sprint" },
  { id: "moji-29", pack: "moji", src: "/stickers/moji-v/moji-29.webp", labelFr: "Couronne", labelEn: "Crowned" },
  { id: "moji-30", pack: "moji", src: "/stickers/moji-v/moji-30.webp", labelFr: "Pluie de cœurs", labelEn: "Heart shower" },
  { id: "moji-31", pack: "moji", src: "/stickers/moji-v/moji-31.webp", labelFr: "Coup de cœur", labelEn: "Heart eyes" },
  { id: "moji-32", pack: "moji", src: "/stickers/moji-v/moji-32.webp", labelFr: "C’est moi", labelEn: "That’s me" },
  { id: "moji-33", pack: "moji", src: "/stickers/moji-v/moji-33.webp", labelFr: "Rock", labelEn: "Rock on" },
  { id: "moji-34", pack: "moji", src: "/stickers/moji-v/moji-34.webp", labelFr: "Je réfléchis", labelEn: "Thinking" },
  { id: "moji-35", pack: "moji", src: "/stickers/moji-v/moji-35.webp", labelFr: "Timide", labelEn: "Shy" },
  { id: "moji-36", pack: "moji", src: "/stickers/moji-v/moji-36.webp", labelFr: "Gros câlin", labelEn: "Big hug" },
  { id: "moji-37", pack: "moji", src: "/stickers/moji-v/moji-37.webp", labelFr: "Motus", labelEn: "Shh" },
  { id: "moji-38", pack: "moji", src: "/stickers/moji-v/moji-38.webp", labelFr: "Youpi", labelEn: "Let’s party" },
  { id: "moji-39", pack: "moji", src: "/stickers/moji-v/moji-39.webp", labelFr: "Trop mignon", labelEn: "So cute" },
  { id: "moji-40", pack: "moji", src: "/stickers/moji-v/moji-40.webp", labelFr: "Inquiet", labelEn: "Worried" },
  { id: "moji-41", pack: "moji", src: "/stickers/moji-v/moji-41.webp", labelFr: "Sieste", labelEn: "Nap" },
  { id: "moji-42", pack: "moji", src: "/stickers/moji-v/moji-42.webp", labelFr: "Rage", labelEn: "Rage" },
  { id: "moji-43", pack: "moji", src: "/stickers/moji-v/moji-43.webp", labelFr: "Pluie d’argent", labelEn: "Cash rain" },
  { id: "moji-44", pack: "moji", src: "/stickers/moji-v/moji-44.webp", labelFr: "Princesse", labelEn: "Princess" },
  { id: "moji-45", pack: "moji", src: "/stickers/moji-v/moji-45.webp", labelFr: "Casque", labelEn: "Headphones" },
  { id: "moji-46", pack: "moji", src: "/stickers/moji-v/moji-46.webp", labelFr: "Émerveillé", labelEn: "Starstruck" },
  { id: "moji-47", pack: "moji", src: "/stickers/moji-v/moji-47.webp", labelFr: "Laptop", labelEn: "Laptop" },
  { id: "moji-48", pack: "moji", src: "/stickers/moji-v/moji-48.webp", labelFr: "Bouquet", labelEn: "Bouquet" },
  { id: "moji-49", pack: "moji", src: "/stickers/moji-v/moji-49.webp", labelFr: "Spa", labelEn: "Spa" },
  { id: "moji-50", pack: "moji", src: "/stickers/moji-v/moji-50.webp", labelFr: "Ange", labelEn: "Angel" },
  { id: "moji-51", pack: "moji", src: "/stickers/moji-v/moji-51.webp", labelFr: "Café", labelEn: "Coffee" },
  { id: "moji-52", pack: "moji", src: "/stickers/moji-v/moji-52.webp", labelFr: "Shopping", labelEn: "Shopping" },
];

const SCENE: StickerDef[] = [
  { id: "scene-01", pack: "comique", src: "/stickers/scene/scene-01.png", motion: "sc-parfait", fx: "ring", sound: "crystal", labelFr: "Parfait !", labelEn: "Perfect!" },
  { id: "scene-02", pack: "comique", src: "/stickers/scene/scene-02.png", motion: "sc-boss", fx: "crown", sound: "boss", bubble: "crown", labelFr: "T’es un boss !", labelEn: "You’re the boss!" },
  { id: "scene-03", pack: "comique", src: "/stickers/scene/scene-03.png", motion: "sc-mood", labelFr: "Mood…", labelEn: "Mood…" },
  { id: "scene-04", pack: "comique", src: "/stickers/scene/scene-04.png", motion: "sc-merci", fx: "hearts", labelFr: "Merci !", labelEn: "Thanks!" },
  { id: "scene-05", pack: "comique", src: "/stickers/scene/scene-05.png", motion: "sc-charge", sound: "charge", labelFr: "Je recharge", labelEn: "Recharging" },
  { id: "scene-06", pack: "comique", src: "/stickers/scene/scene-06.png", motion: "sc-aie", fx: "shake", sound: "laugh", labelFr: "Aïe aïe aïe !", labelEn: "Ouch ouch ouch!" },
  { id: "scene-07", pack: "comique", src: "/stickers/scene/scene-07.png", motion: "sc-shrug", labelFr: "Pas mon problème !", labelEn: "Not my problem!" },
  { id: "scene-08", pack: "comique", src: "/stickers/scene/scene-08.png", motion: "sc-sun", fx: "rays", sound: "notes", labelFr: "Bonne journée !", labelEn: "Good day!" },
  { id: "scene-09", pack: "comique", src: "/stickers/scene/scene-09.png", motion: "sc-kiss", fx: "hearts", sound: "mwah", labelFr: "Gros bisous !", labelEn: "Big kisses!" },
  { id: "scene-10", pack: "comique", src: "/stickers/scene/scene-10.png", motion: "sc-sleep", labelFr: "Dors bien !", labelEn: "Sleep well!" },
  { id: "scene-11", pack: "comique", src: "/stickers/scene/scene-11.png", motion: "sc-music", fx: "notes", sound: "beat", labelFr: "Bonne musique !", labelEn: "Good music!" },
  { id: "scene-12", pack: "comique", src: "/stickers/scene/scene-12.png", motion: "sc-rose", labelFr: "Pour toi !", labelEn: "For you!" },
  { id: "scene-13", pack: "comique", src: "/stickers/scene/scene-13.png", motion: "sc-bravo", sound: "clap", moment: "bravo", labelFr: "Bravo !", labelEn: "Bravo!" },
  { id: "scene-14", pack: "comique", src: "/stickers/scene/scene-14.png", motion: "sc-hot", fx: "steam", sound: "hiss", labelFr: "C’est chaud là !", labelEn: "It’s hot in here!" },
  { id: "scene-15", pack: "comique", src: "/stickers/scene/scene-15.png", motion: "sc-learn", sound: "ding", labelFr: "On apprend toujours !", labelEn: "Always learning!" },
  { id: "scene-16", pack: "comique", src: "/stickers/scene/scene-16.png", motion: "sc-adore", sound: "pop", moment: "love", labelFr: "J’adore !", labelEn: "I love it!" },
  { id: "scene-17", pack: "comique", src: "/stickers/scene/scene-17.png", motion: "sc-go", sound: "whoosh", labelFr: "Allons-y !", labelEn: "Let’s go!" },
  { id: "scene-18", pack: "comique", src: "/stickers/scene/scene-18.png", motion: "sc-nope", sound: "bonk", bubble: "shake", labelFr: "Nope !", labelEn: "Nope!" },
  { id: "scene-19", pack: "comique", src: "/stickers/scene/scene-19.png", motion: "sc-later", labelFr: "À plus tard !", labelEn: "See you later!" },
  { id: "scene-20", pack: "comique", src: "/stickers/scene/scene-20.png", motion: "sc-play", sound: "arcade", labelFr: "On joue ?", labelEn: "Wanna play?" },
  { id: "scene-21", pack: "comique", src: "/stickers/scene/scene-21.png", motion: "sc-fly", labelFr: "On va loin !", labelEn: "We’re going far!" },
  { id: "scene-22", pack: "comique", src: "/stickers/scene/scene-22.png", motion: "sc-plane", labelFr: "See you soon !", labelEn: "See you soon!" },
  { id: "scene-23", pack: "comique", src: "/stickers/scene/scene-23.png", motion: "sc-target", fx: "ring", sound: "ding", labelFr: "Objectif !", labelEn: "On target!" },
  { id: "scene-24", pack: "comique", src: "/stickers/scene/scene-24.png", motion: "sc-bot", labelFr: "Toujours à ton service !", labelEn: "At your service!" },
  { id: "scene-25", pack: "comique", src: "/stickers/scene/scene-25.png", motion: "sc-food", sound: "tada", labelFr: "Bon appétit !", labelEn: "Enjoy!" },
  { id: "scene-26", pack: "comique", src: "/stickers/scene/scene-26.png", motion: "sc-alert", sound: "siren", moment: "alert", labelFr: "Alerte WIPP !", labelEn: "WIPP alert!" },
  { id: "scene-27", pack: "comique", src: "/stickers/scene/scene-27.png", motion: "sc-lock", sound: "clack", labelFr: "C’est confidentiel !", labelEn: "Confidential!" },
  { id: "scene-28", pack: "comique", src: "/stickers/scene/scene-28.png", motion: "sc-heal", sound: "heart", bubble: "glow", labelFr: "Ça va aller !", labelEn: "It’ll be okay!" },
  { id: "scene-29", pack: "comique", src: "/stickers/scene/scene-29.png", motion: "sc-film", sound: "film", labelFr: "C’est une histoire de ouf !", labelEn: "What a story!" },
  { id: "scene-30", pack: "comique", src: "/stickers/scene/scene-30.png", motion: "sc-care", fx: "heartwave", sound: "ting", labelFr: "Prends soin de toi !", labelEn: "Take care!" },
];

const SCENE_FACE = new Set(["scene-14"]);
const SCENE_FEMME = new Set(["scene-01", "scene-09", "scene-15", "scene-28"]);
const SCENE_HOMME = new Set(["scene-02", "scene-10"]);
for (const s of SCENE) {
  if (SCENE_FACE.has(s.id)) s.pack = "moji";
  else if (SCENE_FEMME.has(s.id)) s.pack = "femme";
  else if (SCENE_HOMME.has(s.id)) s.pack = "homme";
}

const ANI: StickerDef[] = [
  { id: "ani-stop", pack: "ani", src: "/stickers/aniwipp/stop-full.png", labelFr: "Stop !", labelEn: "Stop!" },
  { id: "ani-bisou", pack: "ani", src: "/stickers/aniwipp/bisou-poster.png", anim: "/stickers/aniwipp/bisou-green.mp4", labelFr: "Bisou", labelEn: "Kiss" },
  { id: "moment-01", pack: "ani", src: "/stickers/moments/moment-01-poster.png", anim: "/stickers/moments/moment-01.webp", playMs: 6040, labelFr: "Salut", labelEn: "Hey" },
  { id: "moment-02", pack: "ani", src: "/stickers/moments/moment-02-poster.png", anim: "/stickers/moments/moment-02.webp", playMs: 6040, labelFr: "MDR", labelEn: "LOL" },
  { id: "moment-03", pack: "ani", src: "/stickers/moments/moment-03-poster.png", anim: "/stickers/moments/moment-03.webp", playMs: 6040, labelFr: "Cœurs", labelEn: "Hearts" },
  { id: "moment-04", pack: "ani", src: "/stickers/moments/moment-04-poster.png", anim: "/stickers/moments/moment-04.webp", playMs: 6040, labelFr: "Pluie de cœurs", labelEn: "Heart rain" },
  { id: "moment-05", pack: "ani", src: "/stickers/moments/moment-05-poster.png", anim: "/stickers/moments/moment-05.webp", playMs: 6040, labelFr: "Cupidon", labelEn: "Cupid" },
  { id: "moment-06", pack: "ani", src: "/stickers/moments/moment-06-poster.png", anim: "/stickers/moments/moment-06.webp", playMs: 6040, labelFr: "Coup de cœur", labelEn: "Crush" },
  { id: "moment-07", pack: "ani", src: "/stickers/moments/moment-07-poster.png", anim: "/stickers/moments/moment-07.webp", playMs: 6040, labelFr: "Câlin", labelEn: "Hug" },
  { id: "moment-08", pack: "ani", src: "/stickers/moments/moment-08-poster.png", anim: "/stickers/moments/moment-08.webp", playMs: 6040, labelFr: "Cinéma", labelEn: "Movie" },
  { id: "moment-09", pack: "ani", src: "/stickers/moments/moment-09-poster.png", anim: "/stickers/moments/moment-09.webp", playMs: 6040, labelFr: "Quoi ?!", labelEn: "What?!" },
  { id: "moment-10", pack: "ani", src: "/stickers/moments/moment-10-poster.png", anim: "/stickers/moments/moment-10.webp", playMs: 6040, labelFr: "Café", labelEn: "Coffee" },
  { id: "moment-11", pack: "ani", src: "/stickers/moments/moment-11-poster.png", anim: "/stickers/moments/moment-11.webp", playMs: 6040, labelFr: "Alerte", labelEn: "Alert" },
  { id: "moment-12", pack: "ani", src: "/stickers/moments/moment-12-poster.png", anim: "/stickers/moments/moment-12.webp", playMs: 6040, labelFr: "Méfiante", labelEn: "Suspicious" },
  { id: "moment-13", pack: "ani", src: "/stickers/moments/moment-13-poster.png", anim: "/stickers/moments/moment-13.webp", playMs: 6040, labelFr: "Panique", labelEn: "Panic" },
  { id: "moment-14", pack: "ani", src: "/stickers/moments/moment-14-poster.png", anim: "/stickers/moments/moment-14.webp", playMs: 6040, labelFr: "Miam", labelEn: "Yum" },
  { id: "moment-15", pack: "ani", src: "/stickers/moments/moment-15-poster.png", anim: "/stickers/moments/moment-15.webp", playMs: 6040, labelFr: "Trop chaud", labelEn: "Too hot" },
  { id: "moment-16", pack: "ani", src: "/stickers/moments/moment-16-poster.png", anim: "/stickers/moments/moment-16.webp", playMs: 6040, labelFr: "Boum", labelEn: "Boom" },
  { id: "moment-17", pack: "ani", src: "/stickers/moments/moment-17-poster.png", anim: "/stickers/moments/moment-17.webp", playMs: 6040, labelFr: "Action", labelEn: "Action" },
  { id: "moment-18", pack: "ani", src: "/stickers/moments/moment-18-poster.png", anim: "/stickers/moments/moment-18.webp", playMs: 6040, labelFr: "Pas fan", labelEn: "Not a fan" },
  { id: "moment-19", pack: "ani", src: "/stickers/moments/moment-19-poster.png", anim: "/stickers/moments/moment-19.webp", playMs: 6040, labelFr: "Jackpot", labelEn: "Jackpot" },
  { id: "moment-20", pack: "ani", src: "/stickers/moments/moment-20-poster.png", anim: "/stickers/moments/moment-20.webp", playMs: 6040, labelFr: "Mallette", labelEn: "Briefcase" },
  { id: "moment-21", pack: "ani", src: "/stickers/moments/moment-21-poster.png", anim: "/stickers/moments/moment-21.webp", playMs: 6040, labelFr: "Billets", labelEn: "Cash" },
  { id: "moment-22", pack: "ani", src: "/stickers/moments/moment-22-poster.png", anim: "/stickers/moments/moment-22.webp", playMs: 6040, labelFr: "Gros sac", labelEn: "Money bag" },
  { id: "moment-23", pack: "ani", src: "/stickers/moments/moment-23-poster.png", anim: "/stickers/moments/moment-23.webp", playMs: 6040, labelFr: "Riche", labelEn: "Rich" },
  { id: "moment-24", pack: "ani", src: "/stickers/moments/moment-24-poster.png", anim: "/stickers/moments/moment-24.webp", playMs: 6040, labelFr: "Oops", labelEn: "Oops" },
  { id: "moment-25", pack: "ani", src: "/stickers/moments/moment-25-poster.png", anim: "/stickers/moments/moment-25.webp", playMs: 6040, labelFr: "Mouchoirs", labelEn: "Tissues" },
  { id: "moment-26", pack: "ani", src: "/stickers/moments/moment-26-poster.png", anim: "/stickers/moments/moment-26.webp", playMs: 6040, labelFr: "Oignon", labelEn: "Onion" },
  { id: "moment-27", pack: "ani", src: "/stickers/moments/moment-27-poster.png", anim: "/stickers/moments/moment-27.webp", playMs: 6040, labelFr: "Sac nuage", labelEn: "Cloud bag" },
  { id: "moment-28", pack: "ani", src: "/stickers/moments/moment-28-poster.png", anim: "/stickers/moments/moment-28.webp", playMs: 6040, labelFr: "Gros cœur", labelEn: "Big heart" },
  { id: "moment-29", pack: "ani", src: "/stickers/moments/moment-29-poster.png", anim: "/stickers/moments/moment-29.webp", playMs: 6040, labelFr: "Averse", labelEn: "Downpour" },
  { id: "moment-30", pack: "ani", src: "/stickers/moments/moment-30-poster.png", anim: "/stickers/moments/moment-30.webp", playMs: 6040, labelFr: "Ça passe", labelEn: "It's okay" },
  { id: "moment-31", pack: "ani", src: "/stickers/moments/moment-31-poster.png", anim: "/stickers/moments/moment-31.webp", playMs: 6040, labelFr: "Savage", labelEn: "Savage" },
  { id: "moment-32", pack: "ani", src: "/stickers/moments/moment-32-poster.png", anim: "/stickers/moments/moment-32.webp", playMs: 6040, labelFr: "Roast", labelEn: "Roast" },
  { id: "moment-33", pack: "ani", src: "/stickers/moments/moment-33-poster.png", anim: "/stickers/moments/moment-33.webp", playMs: 6040, labelFr: "En feu", labelEn: "On fire" },
  { id: "moment-34", pack: "ani", src: "/stickers/moments/moment-34-poster.png", anim: "/stickers/moments/moment-34.webp", playMs: 6040, labelFr: "Majeur", labelEn: "Middle finger" },
  { id: "moment-35", pack: "ani", src: "/stickers/moments/moment-35-poster.png", anim: "/stickers/moments/moment-35.webp", playMs: 6040, labelFr: "Yo", labelEn: "Yo" },
  { id: "moment-36", pack: "ani", src: "/stickers/moments/moment-36-poster.png", anim: "/stickers/moments/moment-36.webp", playMs: 6040, labelFr: "Jonglage", labelEn: "Juggle" },
  { id: "moment-37", pack: "ani", src: "/stickers/moments/moment-37-poster.png", anim: "/stickers/moments/moment-37.webp", playMs: 6040, labelFr: "Fortune", labelEn: "Fortune" },
  { id: "moment-38", pack: "ani", src: "/stickers/moments/moment-38-poster.png", anim: "/stickers/moments/moment-38.webp", playMs: 6040, labelFr: "Roi", labelEn: "King" },
  { id: "moment-39", pack: "ani", src: "/stickers/moments/moment-39-poster.png", anim: "/stickers/moments/moment-39.webp", playMs: 6040, labelFr: "Boss", labelEn: "Boss" },
  { id: "moment-40", pack: "ani", src: "/stickers/moments/moment-40-poster.png", anim: "/stickers/moments/moment-40.webp", playMs: 6040, labelFr: "Magie", labelEn: "Magic" },
  { id: "moment-41", pack: "ani", src: "/stickers/moments/moment-41-poster.png", anim: "/stickers/moments/moment-41.webp", playMs: 6040, labelFr: "Reine", labelEn: "Queen" },
  { id: "moment-42", pack: "ani", src: "/stickers/moments/moment-42-poster.png", anim: "/stickers/moments/moment-42.webp", playMs: 6040, labelFr: "Moves", labelEn: "Moves" },
];

const EMO: StickerDef[] = [
  { id: "emo-01", pack: "emo", src: "/stickers/emo/emo-01.webp", playMs: 3984, labelFr: "Champion", labelEn: "Champion" },
  { id: "emo-02", pack: "emo", src: "/stickers/emo/emo-02.webp", playMs: 6059, labelFr: "Shopping", labelEn: "Shopping" },
  { id: "emo-03", pack: "emo", src: "/stickers/emo/emo-03.webp", playMs: 6059, labelFr: "Je te vois", labelEn: "I see you" },
  { id: "emo-04", pack: "emo", src: "/stickers/emo/emo-04.webp", playMs: 6059, labelFr: "Pop-corn", labelEn: "Popcorn" },
  { id: "emo-05", pack: "emo", src: "/stickers/emo/emo-05.webp", playMs: 6059, labelFr: "Banane", labelEn: "Banana" },
  { id: "emo-06", pack: "emo", src: "/stickers/emo/emo-06.webp", playMs: 6059, labelFr: "Ménage", labelEn: "Cleaning" },
  { id: "emo-07", pack: "emo", src: "/stickers/emo/emo-07.webp", playMs: 6059, labelFr: "L'heure", labelEn: "The time" },
  { id: "emo-08", pack: "emo", src: "/stickers/emo/emo-08.webp", playMs: 6059, labelFr: "Valise", labelEn: "Suitcase" },
  { id: "emo-09", pack: "emo", src: "/stickers/emo/emo-09.webp", playMs: 6059, labelFr: "Loupe", labelEn: "Magnifier" },
  { id: "emo-10", pack: "emo", src: "/stickers/emo/emo-10.webp", playMs: 6059, labelFr: "Cachée", labelEn: "Hiding" },
];

export const STICKER_PACKS = {
  moji: { id: "moji" as const, labelFr: "Wippmoji", labelEn: "Wippmoji", stickers: [...MOJI, ...SCENE.filter((s) => s.pack === "moji")] },
  femme: { id: "femme" as const, labelFr: "Wippie Elle", labelEn: "Wippie Elle", stickers: [...ELLE, ...SCENE.filter((s) => s.pack === "femme")] },
  homme: { id: "homme" as const, labelFr: "Wippie Lui", labelEn: "Wippie Lui", stickers: [...LUI, ...SCENE.filter((s) => s.pack === "homme")] },
  comique: {
    id: "comique" as const,
    labelFr: "Wippie Comique",
    labelEn: "Wippie Comique",
    stickers: [...FUN, ...FUN2, ...SIG, ...SCENE.filter((s) => s.pack === "comique")],
  },
  emo: { id: "emo" as const, labelFr: "WippEMO", labelEn: "WippEMO", stickers: EMO },
  ani: { id: "ani" as const, labelFr: "WIPP Moments", labelEn: "WIPP Moments", stickers: ANI },
};

// CDN pointers are local project assets; existing assets keep their original paths.
const resolveAsset = (url: string) => rasterPath(url);
export const WIPP_STICKERS = [...ELLE, ...LUI, ...FUN, ...FUN2, ...SIG, ...MOJI, ...SCENE, ...ANI, ...EMO].map((row) => ({
  ...row, src: resolveAsset(row.src), anim: row.anim ? resolveAsset(row.anim) : undefined,
}));
// Resolve the same objects in picker packs so the thumbnail and sent message match.
for (const pack of Object.values(STICKER_PACKS)) {
  pack.stickers = pack.stickers.map((row) => WIPP_STICKERS.find((item) => item.id === row.id) ?? row);
}

/** Noms de stickers (FR/EN) : sert à réparer les stickers devenus du texte à cause d'une ancienne synchro. */
export const STICKER_LABELS = new Set(WIPP_STICKERS.flatMap((s) => [s.labelFr, s.labelEn]));

export type StickerId = string;
export type StickerPackId = keyof typeof STICKER_PACKS;

export const STICKER_PLAY_S = 3.05;

export function isStickerId(id: string | undefined): id is StickerId {
  return Boolean(id && WIPP_STICKERS.some((s) => s.id === id));
}

export function stickerById(id: string | undefined) {
  return WIPP_STICKERS.find((s) => s.id === id);
}

export function stickersInPack(pack: StickerPackId) {
  return STICKER_PACKS[pack].stickers;
}

const WIPPIE_SUBS = ["femme", "homme", "comique"] as const;

/** All Wippie characters, one row per id. Does not include Wippmoji, EMO (own tab) or WIPP Moments. */
export function wippieStickers(sub: "tous" | (typeof WIPPIE_SUBS)[number]) {
  if (sub !== "tous") return STICKER_PACKS[sub].stickers;
  const seen = new Set<string>();
  const rows = [];
  for (const id of WIPPIE_SUBS) {
    for (const s of STICKER_PACKS[id].stickers) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      rows.push(s);
    }
  }
  return rows;
}

export function stickerLabel(id: string | undefined, lang: "fr" | "en") {
  const row = stickerById(id);
  if (!row) return "Sticker";
  return lang === "fr" ? row.labelFr : row.labelEn;
}

export function stickerHasArt(src: string) {
  return hasRaster(src);
}
