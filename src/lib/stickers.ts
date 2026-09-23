import { emojiFromStickerId, isEmojiSticker } from "./emoji";

type StickerDef = {
  id: string;
  pack: "elle" | "lui" | "fun" | "fun2" | "sig" | "moji" | "scene";
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

const SIG: StickerDef[] = [
  { id: "sig-jarrive", pack: "sig", src: "/stickers/sig/sig-jarrive.png", motion: "arrive", sound: "whoosh", labelFr: "J’arrive !", labelEn: "On my way!" },
  { id: "sig-coucou", pack: "sig", src: "/stickers/sig/sig-coucou.png", motion: "coucou", labelFr: "Coucou !", labelEn: "Hey!" },
  { id: "sig-tes-la", pack: "sig", src: "/stickers/sig/sig-tes-la.png", motion: "peek", labelFr: "T’es là ?", labelEn: "You there?" },
  { id: "sig-bonne-idee", pack: "sig", src: "/stickers/sig/sig-bonne-idee.png", motion: "idea", labelFr: "Bonne idée !", labelEn: "Good idea!" },
  { id: "sig-cafe", pack: "sig", src: "/stickers/sig/sig-cafe.png", motion: "cafe", labelFr: "Café ?", labelEn: "Coffee?" },
  { id: "sig-bisous", pack: "sig", src: "/stickers/sig/sig-bisous.png", motion: "bisous", fx: "hearts", sound: "mwah", labelFr: "Bisous !", labelEn: "Kisses!" },
  { id: "sig-mdrrr", pack: "sig", src: "/stickers/sig/sig-mdrrr.png", motion: "mdr", fx: "shake", sound: "laugh", labelFr: "MDRRR", labelEn: "LOL" },
  { id: "sig-tu-mens", pack: "sig", src: "/stickers/sig/sig-tu-mens.png", motion: "mens", sound: "dundun", labelFr: "Tu mens !", labelEn: "You’re lying!" },
  { id: "sig-waaah", pack: "sig", src: "/stickers/sig/sig-waaah.png", motion: "waah", labelFr: "Waaah !", labelEn: "Whoa!" },
  { id: "sig-valide", pack: "sig", src: "/stickers/sig/sig-valide.png", motion: "valide", fx: "confetti", sound: "bling", labelFr: "C’est validé !", labelEn: "Approved!" },
  { id: "sig-on-se-capte", pack: "sig", src: "/stickers/sig/sig-on-se-capte.png", motion: "capte", labelFr: "On se capte !", labelEn: "Catch you!" },
  { id: "sig-self-care", pack: "sig", src: "/stickers/sig/sig-self-care.png", motion: "care", labelFr: "Self care", labelEn: "Self care" },
  { id: "sig-je-regarde", pack: "sig", src: "/stickers/sig/sig-je-regarde.png", motion: "eyes", labelFr: "Je te regarde…", labelEn: "I’m watching…" },
  { id: "sig-en-route", pack: "sig", src: "/stickers/sig/sig-en-route.png", motion: "route", labelFr: "En route !", labelEn: "On the way!" },
  { id: "sig-bonne-nuit", pack: "sig", src: "/stickers/sig/sig-bonne-nuit.png", motion: "nuit", labelFr: "Bonne nuit", labelEn: "Good night" },
  { id: "sig-debout", pack: "sig", src: "/stickers/sig/sig-debout.png", motion: "debout", sound: "alarm", labelFr: "Debout !", labelEn: "Wake up!" },
  { id: "sig-on-regarde", pack: "sig", src: "/stickers/sig/sig-on-regarde.png", motion: "popcorn", labelFr: "On regarde ?", labelEn: "Wanna watch?" },
  { id: "sig-laisse-tomber", pack: "sig", src: "/stickers/sig/sig-laisse-tomber.png", motion: "crack", labelFr: "Laisse tomber…", labelEn: "Never mind…" },
  { id: "sig-hmm", pack: "sig", src: "/stickers/sig/sig-hmm.png", motion: "hmm", labelFr: "Hmm…", labelEn: "Hmm…" },
  { id: "sig-shopping", pack: "sig", src: "/stickers/sig/sig-shopping.png", motion: "shop", labelFr: "Shopping ?", labelEn: "Shopping?" },
  { id: "sig-voyage", pack: "sig", src: "/stickers/sig/sig-voyage.png", motion: "voyage", labelFr: "Voyage ?", labelEn: "Trip?" },
  { id: "sig-ma-vibe", pack: "sig", src: "/stickers/sig/sig-ma-vibe.png", motion: "vibe", sound: "beat", labelFr: "Ma vibe", labelEn: "My vibe" },
  { id: "sig-motive", pack: "sig", src: "/stickers/sig/sig-motive.png", motion: "motive", labelFr: "Motivé(e) !", labelEn: "Motivated!" },
  { id: "sig-appelle", pack: "sig", src: "/stickers/sig/sig-appelle.png", motion: "call", labelFr: "Appelle-moi !", labelEn: "Call me!" },
  { id: "sig-faim", pack: "sig", src: "/stickers/sig/sig-faim.png", motion: "faim", labelFr: "J’ai faim !", labelEn: "I’m hungry!" },
  { id: "sig-ca-paye", pack: "sig", src: "/stickers/sig/sig-ca-paye.png", motion: "paye", labelFr: "Ça paye !", labelEn: "It pays!" },
  { id: "sig-chill", pack: "sig", src: "/stickers/sig/sig-chill.png", motion: "chill", labelFr: "Chill…", labelEn: "Chill…" },
  { id: "sig-toujours", pack: "sig", src: "/stickers/sig/sig-toujours.png", motion: "toujours", labelFr: "Toujours là !", labelEn: "Still here!" },
  { id: "sig-ca-wipp", pack: "sig", src: "/stickers/sig/sig-ca-wipp.png", motion: "disco", fx: "disco", sound: "jingle", moment: "wipp", labelFr: "Ça WIPP !", labelEn: "That’s WIPP!" },
  { id: "sig-raconte", pack: "sig", src: "/stickers/sig/sig-raconte.png", motion: "raconte", labelFr: "Raconte !", labelEn: "Tell me!" },
];

const MOJI: StickerDef[] = [
  { id: "moji-01", pack: "moji", src: "/stickers/moji/moji-01.png", motion: "laugh", fx: "shake", sound: "laugh", bubble: "shake", labelFr: "Fou rire", labelEn: "Laughing" },
  { id: "moji-02", pack: "moji", src: "/stickers/moji/moji-02.png", motion: "love", labelFr: "Amoureux", labelEn: "In love" },
  { id: "moji-03", pack: "moji", src: "/stickers/moji/moji-03.png", motion: "kiss", fx: "hearts", sound: "mwah", labelFr: "Bisou", labelEn: "Kiss" },
  { id: "moji-04", pack: "moji", src: "/stickers/moji/moji-04.png", motion: "cool", sound: "bling", labelFr: "Cool", labelEn: "Cool" },
  { id: "moji-05", pack: "moji", src: "/stickers/moji/moji-05.png", motion: "hug", bubble: "glow", labelFr: "Cœur WIPP", labelEn: "WIPP heart" },
  { id: "moji-06", pack: "moji", src: "/stickers/moji/moji-06.png", motion: "cry", labelFr: "Gros chagrin", labelEn: "Big tears" },
  { id: "moji-07", pack: "moji", src: "/stickers/moji/moji-07.png", motion: "rage", sound: "hiss", labelFr: "Furieux", labelEn: "Furious" },
  { id: "moji-08", pack: "moji", src: "/stickers/moji/moji-08.png", motion: "shock", labelFr: "Choqué", labelEn: "Shocked" },
  { id: "moji-09", pack: "moji", src: "/stickers/moji/moji-09.png", motion: "judge", labelFr: "Je te juge", labelEn: "Judging" },
  { id: "moji-10", pack: "moji", src: "/stickers/moji/moji-10.png", motion: "hmm", labelFr: "Hmm…", labelEn: "Hmm…" },
  { id: "moji-11", pack: "moji", src: "/stickers/moji/moji-11.png", motion: "sleep", labelFr: "Dodo", labelEn: "Sleepy" },
  { id: "moji-12", pack: "moji", src: "/stickers/moji/moji-12.png", motion: "party", fx: "confetti", sound: "party", labelFr: "Fête", labelEn: "Party" },
  { id: "moji-13", pack: "moji", src: "/stickers/moji/moji-13.png", motion: "hands", labelFr: "Amour", labelEn: "Love" },
  { id: "moji-14", pack: "moji", src: "/stickers/moji/moji-14.png", motion: "yes", labelFr: "Validé", labelEn: "Yes" },
  { id: "moji-15", pack: "moji", src: "/stickers/moji/moji-15.png", motion: "nope", labelFr: "Nope", labelEn: "Nope" },
  { id: "moji-16", pack: "moji", src: "/stickers/moji/moji-16.png", motion: "clap", sound: "clap", labelFr: "Bravo", labelEn: "Clap" },
  { id: "moji-17", pack: "moji", src: "/stickers/moji/moji-17.png", motion: "pray", labelFr: "Merci", labelEn: "Please" },
  { id: "moji-18", pack: "moji", src: "/stickers/moji/moji-18.png", motion: "palm", sound: "bonk", labelFr: "Facepalm", labelEn: "Facepalm" },
  { id: "moji-19", pack: "moji", src: "/stickers/moji/moji-19.png", motion: "crown", labelFr: "King", labelEn: "King" },
  { id: "moji-20", pack: "moji", src: "/stickers/moji/moji-20.png", motion: "fire", fx: "flame", bubble: "flame", labelFr: "C’est chaud", labelEn: "On fire" },
  { id: "moji-21", pack: "moji", src: "/stickers/moji/moji-21.png", motion: "plead", labelFr: "Please", labelEn: "Please" },
  { id: "moji-22", pack: "moji", src: "/stickers/moji/moji-22.png", motion: "silly", labelFr: "Foufou", labelEn: "Silly" },
  { id: "moji-23", pack: "moji", src: "/stickers/moji/moji-23.png", motion: "zip", sound: "zip", labelFr: "Secret", labelEn: "Secret" },
  { id: "moji-24", pack: "moji", src: "/stickers/moji/moji-24.png", motion: "side", labelFr: "Pas convaincu", labelEn: "Unconvinced" },
  { id: "moji-25", pack: "moji", src: "/stickers/moji/moji-25.png", motion: "sip", labelFr: "Chill", labelEn: "Chill" },
  { id: "moji-26", pack: "moji", src: "/stickers/moji/moji-26.png", motion: "money", sound: "ching", labelFr: "Money", labelEn: "Money" },
  { id: "moji-27", pack: "moji", src: "/stickers/moji/moji-27.png", motion: "boom", fx: "flash", sound: "pop", labelFr: "Mind blown", labelEn: "Mind blown" },
  { id: "moji-28", pack: "moji", src: "/stickers/moji/moji-28.png", motion: "wlove", fx: "heartwave", bubble: "glow", labelFr: "WIPP Love", labelEn: "WIPP love" },
  { id: "moji-29", pack: "moji", src: "/stickers/moji/moji-29.png", motion: "run", sound: "whoosh", labelFr: "J’arrive", labelEn: "On my way" },
  { id: "moji-30", pack: "moji", src: "/stickers/moji/moji-30.png", motion: "peace", labelFr: "Peace", labelEn: "Peace" },
];

const SCENE: StickerDef[] = [
  { id: "scene-01", pack: "scene", src: "/stickers/scene/scene-01.png", motion: "sc-parfait", fx: "ring", sound: "crystal", labelFr: "Parfait !", labelEn: "Perfect!" },
  { id: "scene-02", pack: "scene", src: "/stickers/scene/scene-02.png", motion: "sc-boss", fx: "crown", sound: "boss", bubble: "crown", labelFr: "T’es un boss !", labelEn: "You’re the boss!" },
  { id: "scene-03", pack: "scene", src: "/stickers/scene/scene-03.png", motion: "sc-mood", labelFr: "Mood…", labelEn: "Mood…" },
  { id: "scene-04", pack: "scene", src: "/stickers/scene/scene-04.png", motion: "sc-merci", fx: "hearts", labelFr: "Merci !", labelEn: "Thanks!" },
  { id: "scene-05", pack: "scene", src: "/stickers/scene/scene-05.png", motion: "sc-charge", sound: "charge", labelFr: "Je recharge", labelEn: "Recharging" },
  { id: "scene-06", pack: "scene", src: "/stickers/scene/scene-06.png", motion: "sc-aie", fx: "shake", sound: "laugh", labelFr: "Aïe aïe aïe !", labelEn: "Ouch ouch ouch!" },
  { id: "scene-07", pack: "scene", src: "/stickers/scene/scene-07.png", motion: "sc-shrug", labelFr: "Pas mon problème !", labelEn: "Not my problem!" },
  { id: "scene-08", pack: "scene", src: "/stickers/scene/scene-08.png", motion: "sc-sun", fx: "rays", sound: "notes", labelFr: "Bonne journée !", labelEn: "Good day!" },
  { id: "scene-09", pack: "scene", src: "/stickers/scene/scene-09.png", motion: "sc-kiss", fx: "hearts", sound: "mwah", labelFr: "Gros bisous !", labelEn: "Big kisses!" },
  { id: "scene-10", pack: "scene", src: "/stickers/scene/scene-10.png", motion: "sc-sleep", labelFr: "Dors bien !", labelEn: "Sleep well!" },
  { id: "scene-11", pack: "scene", src: "/stickers/scene/scene-11.png", motion: "sc-music", fx: "notes", sound: "beat", labelFr: "Bonne musique !", labelEn: "Good music!" },
  { id: "scene-12", pack: "scene", src: "/stickers/scene/scene-12.png", motion: "sc-rose", labelFr: "Pour toi !", labelEn: "For you!" },
  { id: "scene-13", pack: "scene", src: "/stickers/scene/scene-13.png", motion: "sc-bravo", sound: "clap", moment: "bravo", labelFr: "Bravo !", labelEn: "Bravo!" },
  { id: "scene-14", pack: "scene", src: "/stickers/scene/scene-14.png", motion: "sc-hot", fx: "steam", sound: "hiss", labelFr: "C’est chaud là !", labelEn: "It’s hot in here!" },
  { id: "scene-15", pack: "scene", src: "/stickers/scene/scene-15.png", motion: "sc-learn", sound: "ding", labelFr: "On apprend toujours !", labelEn: "Always learning!" },
  { id: "scene-16", pack: "scene", src: "/stickers/scene/scene-16.png", motion: "sc-adore", sound: "pop", moment: "love", labelFr: "J’adore !", labelEn: "I love it!" },
  { id: "scene-17", pack: "scene", src: "/stickers/scene/scene-17.png", motion: "sc-go", sound: "whoosh", labelFr: "Allons-y !", labelEn: "Let’s go!" },
  { id: "scene-18", pack: "scene", src: "/stickers/scene/scene-18.png", motion: "sc-nope", sound: "bonk", bubble: "shake", labelFr: "Nope !", labelEn: "Nope!" },
  { id: "scene-19", pack: "scene", src: "/stickers/scene/scene-19.png", motion: "sc-later", labelFr: "À plus tard !", labelEn: "See you later!" },
  { id: "scene-20", pack: "scene", src: "/stickers/scene/scene-20.png", motion: "sc-play", sound: "arcade", labelFr: "On joue ?", labelEn: "Wanna play?" },
  { id: "scene-21", pack: "scene", src: "/stickers/scene/scene-21.png", motion: "sc-fly", labelFr: "On va loin !", labelEn: "We’re going far!" },
  { id: "scene-22", pack: "scene", src: "/stickers/scene/scene-22.png", motion: "sc-plane", labelFr: "See you soon !", labelEn: "See you soon!" },
  { id: "scene-23", pack: "scene", src: "/stickers/scene/scene-23.png", motion: "sc-target", fx: "ring", sound: "ding", labelFr: "Objectif !", labelEn: "On target!" },
  { id: "scene-24", pack: "scene", src: "/stickers/scene/scene-24.png", motion: "sc-bot", labelFr: "Toujours à ton service !", labelEn: "At your service!" },
  { id: "scene-25", pack: "scene", src: "/stickers/scene/scene-25.png", motion: "sc-food", sound: "tada", labelFr: "Bon appétit !", labelEn: "Enjoy!" },
  { id: "scene-26", pack: "scene", src: "/stickers/scene/scene-26.png", motion: "sc-alert", sound: "siren", moment: "alert", labelFr: "Alerte WIPP !", labelEn: "WIPP alert!" },
  { id: "scene-27", pack: "scene", src: "/stickers/scene/scene-27.png", motion: "sc-lock", sound: "clack", labelFr: "C’est confidentiel !", labelEn: "Confidential!" },
  { id: "scene-28", pack: "scene", src: "/stickers/scene/scene-28.png", motion: "sc-heal", sound: "heart", bubble: "glow", labelFr: "Ça va aller !", labelEn: "It’ll be okay!" },
  { id: "scene-29", pack: "scene", src: "/stickers/scene/scene-29.png", motion: "sc-film", sound: "film", labelFr: "C’est une histoire de ouf !", labelEn: "What a story!" },
  { id: "scene-30", pack: "scene", src: "/stickers/scene/scene-30.png", motion: "sc-care", fx: "heartwave", sound: "ting", labelFr: "Prends soin de toi !", labelEn: "Take care!" },
];

export const STICKER_PACKS = {
  elle: { id: "elle" as const, labelFr: "Elle", labelEn: "Her", stickers: ELLE },
  lui: { id: "lui" as const, labelFr: "Lui", labelEn: "Him", stickers: LUI },
  fun: { id: "fun" as const, labelFr: "Fun", labelEn: "Fun", stickers: FUN },
  fun2: { id: "fun2" as const, labelFr: "#2", labelEn: "#2", stickers: FUN2 },
  sig: { id: "sig" as const, labelFr: "WIPP", labelEn: "WIPP", stickers: SIG },
  moji: { id: "moji" as const, labelFr: "Emoji", labelEn: "Emoji", stickers: MOJI },
  scene: { id: "scene" as const, labelFr: "Scènes", labelEn: "Scenes", stickers: SCENE },
};

export const WIPP_STICKERS = [...ELLE, ...LUI, ...FUN, ...FUN2, ...SIG, ...MOJI, ...SCENE];

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
