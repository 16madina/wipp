import type {
  CallLog,
  Chat,
  ConnectRequest,
  Introduction,
  LifestyleItem,
  Listing,
  LiveCode,
  MeProfile,
  Message,
  NotifSettings,
  OneTimeQr,
  Pharmacy,
  PrivacySettings,
  Shop,
  StoryItem,
  User,
} from "./types";
import { STORY_MUSIC } from "./story-music";
import { sixDigit } from "./utils";

const now = Date.now();
const m = (n: number) => now - n * 6e4;
const h = (n: number) => now - n * 36e5;
const d = (n: number) => now - n * 864e5;
export const TAKEN_USERNAMES: ReadonlySet<string> = new Set([
	"deena",
	"deenabeauty",
	"nailsbysarah",
	"alex",
	"maya",
	"jln",
	"samira",
	"noah",
	"lea",
	"karim",
	"ines",
	"aisha",
	"adama",
	"malik",
	"sofia"
]);
export function demoMe(): MeProfile {
	return {
		id: "me",
		firstName: "Deena",
		lastName: "Diallo",
		displayName: "Deena",
		username: "deena",
		bio: "Connecter. Inspirer. Créer des opportunités.",
		avatar: "/avatars/deena.jpg",
		online: true,
		city: "Longueuil",
		connected: true,
		email: "deena@wipp.me",
		phone: "+1 514 555 0148",
		country: "CA",
		birthday: "1999-04-12",
		discoverability: "everyone"
	};
}
function u(partial: Omit<User, "city" | "connected"> & Partial<User>): User {
	return {
		city: "Longueuil",
		connected: true,
		...partial
	};
}
export function seedUsers(): Record<string, User> {
	return {
		alex: u({
			id: "alex",
			firstName: "Alex",
			lastName: "Moreau",
			displayName: "Alex",
			username: "alex",
			bio: "Produit · café · vélo",
			avatar: "/avatars/alex.jpg",
			online: true
		}),
		maya: u({
			id: "maya",
			firstName: "Maya",
			lastName: "Chen",
			displayName: "Maya",
			username: "maya",
			bio: "Design. Quiet luxury.",
			avatar: "/avatars/maya.jpg",
			online: false,
			lastSeen: m(38)
		}),
		julien: u({
			id: "julien",
			firstName: "Julien",
			lastName: "Gagnon",
			displayName: "Julien",
			username: "jln",
			bio: "Soccer Longueuil · dimanche 10h",
			avatar: "/avatars/julien.jpg",
			online: false,
			lastSeen: h(3)
		}),
		samira: u({
			id: "samira",
			firstName: "Samira",
			lastName: "Benali",
			displayName: "Samira",
			username: "samira",
			bio: "Cuisine, famille, Slow Sundays",
			avatar: "/avatars/samira.jpg",
			online: true
		}),
		noah: u({
			id: "noah",
			firstName: "Noah",
			lastName: "Williams",
			displayName: "Noah",
			username: "noah",
			bio: "Études · beats · Wipp > numéro",
			avatar: "/avatars/noah.jpg",
			online: false,
			lastSeen: h(1)
		}),
		lea: u({
			id: "lea",
			firstName: "Léa",
			lastName: "Martin",
			displayName: "Léa",
			username: "lea",
			bio: "Café, photo, rives du Saint-Laurent",
			avatar: "/avatars/lea.jpg",
			online: true,
			connected: false,
			city: "Brossard"
		}),
		karim: u({
			id: "karim",
			firstName: "Karim",
			lastName: "Haddad",
			displayName: "Karim",
			username: "karim",
			bio: "Marché · vintage · Longueuil",
			avatar: "/avatars/karim.jpg",
			online: false,
			lastSeen: d(1),
			connected: false
		}),
		ines: u({
			id: "ines",
			firstName: "Inès",
			lastName: "Roy",
			displayName: "Inès",
			username: "ines",
			bio: "Visible à proximité, 5 min.",
			avatar: "/avatars/ines.jpg",
			online: true,
			connected: false,
			city: "Longueuil"
		}),
		aisha: u({
			id: "aisha",
			firstName: "Aïsha",
			lastName: "Diallo",
			displayName: "Maman",
			username: "aisha",
			bio: "Famille d’abord.",
			avatar: "/avatars/aisha.jpg",
			online: false,
			lastSeen: m(80)
		}),
		adama: u({
			id: "adama",
			firstName: "Adama",
			lastName: "Diallo",
			displayName: "Papa",
			username: "adama",
			bio: "",
			avatar: "/avatars/adama.jpg",
			online: false,
			lastSeen: h(5)
		}),
		malik: u({
			id: "malik",
			firstName: "Malik",
			lastName: "Santos",
			displayName: "Malik",
			username: "malik",
			bio: "Ailier gauche",
			avatar: "/avatars/malik.jpg",
			online: true
		}),
		sofia: u({
			id: "sofia",
			firstName: "Sofia",
			lastName: "Ndiaye",
			displayName: "Sofia",
			username: "sofia",
			bio: "Café, design, Longueuil.",
			avatar: "/avatars/sofia.jpg",
			online: true,
			connected: false
		})
	};
}
function msg(id: string, chatId: string, fromId: string, text: string, createdAt: number, extra: Partial<Message> = {}): Message {
	return {
		id,
		chatId,
		fromId,
		type: "text",
		text,
		createdAt,
		status: "read",
		reactions: [],
		...extra
	};
}
export function seedChats(): Chat[] {
	return [
		{
			id: "c-alex",
			type: "dm",
			participantIds: ["me", "alex"],
			unread: 2,
			muted: false,
			pinned: true,
			archived: false,
			isRequest: false,
			preview: "Ça WIPP !",
			lastAt: m(2)
		},
		{
			id: "c-maya",
			type: "dm",
			participantIds: ["me", "maya"],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "How are you?",
			lastAt: m(42)
		},
		{
			id: "c-famille",
			type: "group",
			name: "Famille Diallo",
			avatar: "/media/food.jpg",
			inviteToken: "famille-diallo",
			participantIds: [
				"me",
				"aisha",
				"adama",
				"samira"
			],
			unread: 3,
			muted: false,
			pinned: true,
			archived: false,
			isRequest: false,
			preview: "Maman : N’oublie pas le riz",
			lastAt: m(18),
			joinBy: "qr"
		},
		{
			id: "c-julien",
			type: "dm",
			participantIds: ["me", "julien"],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Vocal · 0:12",
			lastAt: h(2)
		},
		{
			id: "c-samira",
			type: "dm",
			participantIds: ["me", "samira"],
			unread: 1,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Photo",
			lastAt: h(5)
		},
		{
			id: "c-soccer",
			type: "group",
			name: "Soccer Longueuil",
			avatar: "/media/soccer.jpg",
			inviteToken: "soccer-longueuil",
			participantIds: [
				"me",
				"julien",
				"malik",
				"noah"
			],
			unread: 0,
			muted: true,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Malik : Terrain 3, 10h pile",
			lastAt: h(8),
			joinBy: "qr"
		},
		{
			id: "c-noah",
			type: "dm",
			participantIds: ["me", "noah"],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Donne-moi ton Wipp, pas ton numéro.",
			lastAt: d(1)
		},
		{
			id: "c-ines-temp",
			type: "dm",
			participantIds: ["me", "ines"],
			unread: 1,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Je suis juste à côté.",
			lastAt: m(2),
			ephemeral: true,
			expiresAt: Date.now() + 72e4
		},
		{
			id: "c-quartier",
			type: "group",
			name: "Vieux-Longueuil",
			avatar: "/media/river.jpg",
			inviteToken: "vieux-longueuil",
			participantIds: [
				"me",
				"julien",
				"karim"
			],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Julien : Poubelles demain 7h",
			lastAt: h(12),
			joinBy: "qr"
		},
		{
			id: "c-soiree",
			type: "group",
			name: "Soirée samedi",
			avatar: "/media/coffee.jpg",
			inviteToken: "soiree-samedi",
			participantIds: [
				"lea",
				"maya",
				"noah"
			],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Léa : Amenez un vin.",
			lastAt: h(3),
			joinBy: "qr"
		},
		{
			id: "c-shop-deena",
			type: "dm",
			participantIds: ["me", "lea"],
			unread: 1,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: "Bonjour, un rendez-vous samedi ?",
			lastAt: m(9),
			shopId: "shop-deena"
		}
	];
}
export function seedMessages(): Record<string, Message[]> {
	return {
		"c-alex": [
			msg("m1", "c-alex", "me", "Tu es sur Wipp ?", d(2), { status: "read" }),
			msg("m2", "c-alex", "alex", "Oui. Ajoute-moi : @alex", d(2) + 4e4),
			msg("m3", "c-alex", "me", "C’est ça toute la différence.", d(1)),
			msg("m4", "c-alex", "alex", "On se capte au café près du métro ?", h(5)),
			msg("m5", "c-alex", "me", "Parfait. J’apporte le QR du groupe.", h(5) + 12e4),
			msg("m6", "c-alex", "alex", "On se voit à Longueuil demain ?", m(4), { status: "delivered" }),
			msg("m7", "c-alex", "alex", "Vers 18h, ça te va ?", m(3), { status: "delivered" }),
			msg("m-sticker-1", "c-alex", "alex", "Ça WIPP !", m(2), { type: "sticker", stickerId: "ca-wipp", status: "delivered" }),
		],
		"c-maya": [
			msg("m8", "c-maya", "maya", "Je t’ai envoyé le QR du groupe design.", h(9)),
			msg("m9", "c-maya", "me", "Reçu, je scanne ça ce soir.", h(8)),
			msg("m10", "c-maya", "maya", "How are you?", m(42))
		],
		"c-famille": [
			msg("m11", "c-famille", "adama", "Je passe au marché demain matin.", h(6)),
			msg("m12", "c-famille", "samira", "Je peux prendre le poisson.", h(5)),
			msg("m13", "c-famille", "me", "Dites-moi si vous avez besoin d’un coup de main.", h(4)),
			msg("m14", "c-famille", "aisha", "N’oublie pas le riz", m(18), { status: "delivered" }),
			msg("m15", "c-famille", "aisha", "Et le lait de coco.", m(17), { status: "delivered" }),
			msg("m16", "c-famille", "aisha", "Dimanche on mange ensemble.", m(16), { status: "delivered" })
		],
		"c-julien": [
			msg("m17", "c-julien", "julien", "Match dimanche, tu joues ?", h(6)),
			msg("m18", "c-julien", "me", "Oui. Je prends Malik en chemin.", h(5)),
			msg("m19", "c-julien", "julien", "", h(2), {
				type: "voice",
				duration: 12,
				text: "Vocal"
			})
		],
		"c-samira": [msg("m20", "c-samira", "me", "Le thieboudienne est prêt quand tu veux.", h(7)), msg("m21", "c-samira", "samira", "", h(5), {
			type: "image",
			imageUrl: "/media/food.jpg",
			text: "J’ai commencé le mien aussi.",
			status: "delivered"
		})],
		"c-soccer": [
			msg("m22", "c-soccer", "julien", "Rappel : dimanche 10h, parc Laurier.", h(10)),
			msg("m23", "c-soccer", "noah", "Je ramène les chasubles.", h(9)),
			msg("m24", "c-soccer", "malik", "Terrain 3, 10h pile", h(8))
		],
		"c-noah": [
			msg("m25", "c-noah", "noah", "Tu es sur Wipp ?", d(2)),
			msg("m26", "c-noah", "me", "Oui. @deena", d(2) + 6e4),
			msg("m27", "c-noah", "noah", "Donne-moi ton Wipp, pas ton numéro.", d(1))
		],
		"c-ines-temp": [
			msg("m34", "c-ines-temp", "me", "Code éphémère — tu n’as pas mon @.", m(6)),
			msg("m35", "c-ines-temp", "ines", "Parfait. Juste le chat, puis ça s’efface.", m(4)),
			msg("m36", "c-ines-temp", "ines", "Je suis juste à côté.", m(2), { status: "delivered" })
		],
		"c-quartier": [
			msg("m28", "c-quartier", "julien", "Entrée par QR uniquement — pas de lien.", h(14)),
			msg("m29", "c-quartier", "karim", "Parfait. Mon numéro reste privé.", h(13)),
			msg("m30", "c-quartier", "julien", "Poubelles demain 7h", h(12))
		],
		"c-soiree": [
			msg("m31", "c-soiree", "lea", "QR à l’entrée. Pas de liste de numéros.", h(4)),
			msg("m32", "c-soiree", "maya", "J’amène Maya + 1 si le QR tient encore.", h(3) + 6e4),
			msg("m33", "c-soiree", "lea", "Amenez un vin.", h(3))
		],
		"c-shop-deena": [msg("m-shop-1", "c-shop-deena", "lea", "Deena Beauty", m(10), {
			type: "shop",
			shopId: "shop-deena"
		}), msg("m-shop-2", "c-shop-deena", "lea", "Bonjour, un rendez-vous samedi ?", m(9), { status: "delivered" })]
	};
}
export function seedStories(): StoryItem[] {
	return [
		{
			id: "s-me",
			userId: "me",
			type: "image",
			imageUrl: "/media/river.jpg",
			kind: "status",
			createdAt: h(3),
			viewers: [
				{
					userId: "maya",
					at: h(2)
				},
				{
					userId: "alex",
					at: h(1)
				},
				{
					userId: "samira",
					at: m(40)
				}
			]
		},
		{
			id: "s-samira",
			userId: "samira",
			type: "image",
			imageUrl: "/media/food.jpg",
			createdAt: m(50),
			viewers: []
		},
		{
			id: "s-julien",
			userId: "julien",
			type: "video",
			videoUrl: "/stories/soccer.mp4",
			imageUrl: "/media/soccer.jpg",
			durationMs: 10_000,
			createdAt: h(2),
			viewers: []
		},
		{
			id: "s-maya",
			userId: "maya",
			type: "image",
			imageUrl: "/media/river.jpg",
			createdAt: h(6),
			viewers: [],
			music: STORY_MUSIC[0],
		},
		{
			id: "s-alex",
			userId: "alex",
			type: "image",
			imageUrl: "/media/coffee.jpg",
			createdAt: h(9),
			viewers: []
		},
		{
			id: "s-noah",
			userId: "noah",
			type: "text",
			text: "Donne-moi ton Wipp.",
			bg: "#0B1220",
			createdAt: h(20),
			viewers: []
		}
	];
}
export function seedCalls(): CallLog[] {
	return [
		{
			id: "call1",
			userId: "julien",
			kind: "audio",
			direction: "in",
			missed: true,
			at: m(70)
		},
		{
			id: "call2",
			userId: "maya",
			kind: "video",
			direction: "out",
			missed: false,
			at: h(4),
			duration: 842
		},
		{
			id: "call3",
			userId: "alex",
			kind: "audio",
			direction: "out",
			missed: false,
			at: d(1),
			duration: 315
		},
		{
			id: "call4",
			userId: "samira",
			kind: "audio",
			direction: "in",
			missed: false,
			at: d(2),
			duration: 96
		}
	];
}
export function seedListings(): Listing[] {
	return [
		{
			id: "l-civic",
			title: "Honda Civic 2024",
			price: "26 500 $",
			city: "Longueuil",
			distance: "2,4 km",
			sellerId: "alex",
			category: "auto",
			image: "/media/civic.jpg",
			description: "Un propriétaire, entretien à jour, pneus d’hiver inclus. Contact uniquement sur Wipp — le numéro n’apparaît nulle part."
		},
		{
			id: "l-corolla",
			title: "Toyota Corolla 2019",
			price: "14 900 $",
			city: "Longueuil",
			distance: "3,2 km",
			sellerId: "malik",
			category: "auto",
			image: "/media/civic.jpg",
			description: "Automatique, 118 000 km, carnet. Contact par @malik — aucun numéro sur l’annonce."
		},
		{
			id: "l-apt",
			title: "4 ½ lumineux près du métro",
			price: "1 650 $ / mois",
			city: "Longueuil",
			distance: "1,1 km",
			sellerId: "maya",
			category: "home",
			image: "/media/apt.jpg",
			description: "Deux chambres, grand salon, dispo 1er octobre. Visite à arranger sur Wipp. Aucun 514 affiché."
		},
		{
			id: "l-chair",
			title: "Fauteuil cuir vintage",
			price: "280 $",
			city: "Brossard",
			distance: "6,8 km",
			sellerId: "karim",
			category: "goods",
			image: "/media/chair.jpg",
			description: "Cognac, très bon état. Remise en main propre, contact par @karim uniquement."
		},
		{
			id: "l-me-desk",
			title: "Bureau chêne massif",
			price: "220 $",
			city: "Longueuil",
			distance: "0,4 km",
			sellerId: "me",
			category: "goods",
			image: "/media/chair.jpg",
			description: "Solide, quelques traces d’usage. Remise en main propre — contact par @deena."
		},
		{
			id: "l-me-cater",
			title: "Traiteur weekend · 8 pers.",
			price: "180 $",
			city: "Longueuil",
			distance: "0,4 km",
			sellerId: "me",
			category: "services",
			image: "/media/food.jpg",
			description: "Menu du soir, livraison Longueuil. On s’écrit sur Wipp, pas par SMS."
		}
	];
}
export function seedRequests(): ConnectRequest[] {
	return [{
		id: "req-karim",
		fromId: "karim",
		preview: "Salut, on s’est croisés au marché. Tu es sur Wipp ?",
		createdAt: h(6),
		status: "pending"
	}];
}
export function seedCodes(): LiveCode[] {
	return [{
		code: sixDigit(),
		expiresAt: Date.now() + 6e4,
		ownerId: "lea",
		chatTtlMs: 36e5
	}];
}
export function seedOneTimeQrs(): OneTimeQr[] {
	return [{
		id: "qr-lea-once",
		token: "once-lea-cafe",
		kind: "once",
		label: "Café Longueuil",
		expiresAt: Date.now() + 864e5,
		used: false,
		ownerId: "lea",
		target: {
			type: "profile",
			userId: "lea"
		}
	}, {
		id: "qr-soiree",
		token: "event-soiree-sam",
		kind: "event",
		label: "Soirée samedi",
		expiresAt: Date.now() + 648e5,
		used: false,
		ownerId: "lea",
		target: {
			type: "group",
			chatId: "c-soiree"
		}
	}];
}
export function seedIntros(): Introduction[] {
	return [{
		id: "intro-sofia",
		introducerId: "alex",
		recipientId: "me",
		subjectId: "sofia",
		note: "On s’est croisés au café près du métro. Je pense que vous allez bien vous entendre.",
		createdAt: m(50),
		status: "pending"
	}];
}
export const defaultPrivacy: PrivacySettings = {
	photo: "everyone",
	bio: "everyone",
	lastSeen: "contacts",
	online: "contacts",
	calls: "contacts",
	requests: "everyone",
	groups: "contacts",
	stories: "contacts",
	findByPhone: "nobody",
	findByUsername: "everyone",
	readReceipts: true,
	ephemeralCalls: false
};
export const defaultNotifs: NotifSettings = {
	messages: true,
	requests: true,
	calls: true,
	stories: true,
	groups: true,
	mentions: true,
	reactions: true,
	security: true
};
export const REPLIES: Record<string, string[]> = {
	alex: [
		"Carrément.",
		"Je te retrouve là-bas.",
		"Envoie-moi ton Wipp si jamais.",
		"Parfait, à demain."
	],
	maya: [
		"Noted.",
		"Je te l’envoie.",
		"How are you doing on your side?"
	],
	julien: [
		"OK coach.",
		"Je préviens Malik.",
		"Dimanche on gagne."
	],
	samira: [
		"J’arrive.",
		"Ça sent trop bon.",
		"Je passe après le travail."
	],
	noah: ["Wipp > numéro. Toujours.", "Scan mon QR quand tu veux."],
	aisha: ["Merci ma fille.", "N’oublie pas de manger."],
	adama: ["D’accord.", "Je m’en occupe."],
	malik: ["Je suis chaud.", "Terrain 3."],
	lea: ["Enchantée.", "On se capte autour d’un café ?"],
	ines: [
		"Salut. Je suis juste à côté.",
		"Prénom seulement, ça me va.",
		"On se parle, et ça s’efface."
	],
	karim: ["Merci d’avoir accepté.", "Le fauteuil est encore dispo."],
	sofia: ["Merci de m’avoir acceptée.", "Alex avait raison."]
};
export const SHOP_OWNER_REPLIES: string[] = [
	"Oui, dites-moi le créneau qui vous arrange.",
	"C’est noté. On confirme ici, pas par SMS.",
	"Merci. Je vous reviens dès que c’est libre."
];
export const SHOP_CLIENT_REPLIES: string[] = [
	"Parfait, merci !",
	"Samedi 14 h, ça vous va ?",
	"Super, je vous écris ici."
];
export const TRANSLATIONS: Record<string, { fr: string; en: string }> = {
	"How are you?": {
		fr: "Comment vas-tu ?",
		en: "How are you?"
	},
	"How are you doing on your side?": {
		fr: "Comment ça va de ton côté ?",
		en: "How are you doing on your side?"
	},
	Noted: {
		fr: "C’est noté.",
		en: "Noted."
	},
	"Je te l’envoie.": {
		fr: "Je te l’envoie.",
		en: "I’ll send it to you."
	},
	"Tu es sur Wipp ?": {
		fr: "Tu es sur Wipp ?",
		en: "Are you on Wipp?"
	},
	"On se voit à Longueuil demain ?": {
		fr: "On se voit à Longueuil demain ?",
		en: "See you in Longueuil tomorrow?"
	},
	"Vers 18h, ça te va ?": {
		fr: "Vers 18h, ça te va ?",
		en: "Around 6pm, does that work?"
	},
	"N’oublie pas le riz": {
		fr: "N’oublie pas le riz",
		en: "Don’t forget the rice"
	},
	"Donne-moi ton Wipp, pas ton numéro.": {
		fr: "Donne-moi ton Wipp, pas ton numéro.",
		en: "Give me your Wipp, not your number."
	}
};
export const HOME_GEO: { lat: number; lng: number; label: string } = {
	lat: 45.5312,
	lng: -73.5185,
	label: "Longueuil"
};
export function seedPharmacies(): Pharmacy[] {
	return [
		{
			id: "ph-coutu-chambly",
			name: "Jean Coutu",
			chain: "Jean Coutu",
			address: "220 chemin de Chambly",
			city: "Longueuil",
			lat: 45.5366,
			lng: -73.5064,
			phone: "+1 450 679 2211",
			onDuty: true,
			until: "23:00"
		},
		{
			id: "ph-pharmaprix-place",
			name: "Pharmaprix",
			chain: "Pharmaprix",
			address: "825 rue Saint-Laurent Ouest",
			city: "Longueuil",
			lat: 45.5248,
			lng: -73.4676,
			phone: "+1 450 646 8800",
			onDuty: true,
			until: "24h"
		},
		{
			id: "ph-familiprix-brossard",
			name: "Familiprix",
			chain: "Familiprix",
			address: "7000 boulevard Taschereau",
			city: "Brossard",
			lat: 45.4732,
			lng: -73.4508,
			phone: "+1 450 466 1010",
			onDuty: true,
			until: "22:00"
		},
		{
			id: "ph-uniprix-sl",
			name: "Uniprix",
			chain: "Uniprix",
			address: "165 rue Saint-Denis",
			city: "Saint-Lambert",
			lat: 45.5072,
			lng: -73.5084,
			phone: "+1 450 671 3344",
			onDuty: false,
			until: "18:00"
		},
		{
			id: "ph-brunet-gfp",
			name: "Brunet",
			chain: "Brunet",
			address: "3990 boulevard Taschereau",
			city: "Greenfield Park",
			lat: 45.4921,
			lng: -73.4862,
			phone: "+1 450 465 7700",
			onDuty: false,
			until: "21:00"
		},
		{
			id: "ph-coutu-boucherville",
			name: "Jean Coutu",
			chain: "Jean Coutu",
			address: "999 boulevard de Montarville",
			city: "Boucherville",
			lat: 45.5914,
			lng: -73.4502,
			phone: "+1 450 655 0909",
			onDuty: false,
			until: "18:00"
		}
	];
}
export function seedShops(): Shop[] {
	return [
		{
			id: "shop-nails",
			name: "Nails by Sarah",
			category: "nails",
			ownerId: "ines",
			handle: "nailsbysarah",
			bio: "Onglerie, manucure, nail art. Sur rendez-vous.",
			address: "1234 boulevard Taschereau",
			city: "Longueuil",
			country: "Canada",
			phone: "+1 514 555 0142",
			lat: 45.5374,
			lng: -73.5108,
			hours: "Mar–Sam 10 h–19 h",
			plan: "plus",
			image: "/media/shop-nails-hero.jpg",
			logo: "/media/shop-nails-logo.jpg",
			photos: [
				"/media/shop-nails-hero.jpg",
				"/media/shop-nails-art.jpg",
				"/media/shop-nails-lounge.jpg",
				"/media/shop-nails-polish.jpg"
			],
			code: "604218",
			qrToken: "shop-nails",
			tags: [
				"Onglerie",
				"Nail art",
				"Rendez-vous"
			],
			quote: "Vos mains, notre atelier."
		},
		{
			id: "shop-deena",
			name: "Deena Beauty",
			category: "beauty",
			ownerId: "me",
			handle: "deenabeauty",
			bio: "Soins, teint, rendez-vous. Les clients voient @deenabeauty, pas le profil perso.",
			address: "88 chemin de Chambly",
			city: "Longueuil",
			country: "Canada",
			phone: "+1 450 555 0199",
			lat: 45.5318,
			lng: -73.5114,
			hours: "Mar–Sam 10 h–18 h",
			plan: "vitrine",
			image: "/avatars/deena.jpg",
			photos: ["/media/chair.jpg"],
			code: "331904",
			qrToken: "shop-deena"
		},
		{
			id: "shop-mie",
			name: "La Mie Dorée",
			category: "bakery",
			ownerId: "samira",
			handle: "lamiadoree",
			bio: "Pain au levain, viennoiseries. Commande du matin sur Wipp.",
			address: "214 rue Saint-Charles",
			city: "Longueuil",
			country: "Canada",
			phone: "+1 450 555 0188",
			lat: 45.5402,
			lng: -73.5088,
			hours: "Mar–Dim 7 h–18 h",
			plan: "vitrine",
			image: "/media/food.jpg",
			photos: ["/media/food.jpg", "/media/coffee.jpg"],
			code: "482910",
			qrToken: "shop-mie"
		},
		{
			id: "shop-atlas",
			name: "Bijouterie Atlas",
			category: "jewelry",
			ownerId: "sofia",
			handle: "atlas",
			bio: "Or, argent, réparations. Sur rendez-vous via Wipp.",
			address: "90 chemin de Chambly",
			city: "Longueuil",
			country: "Canada",
			phone: "+1 450 555 0170",
			lat: 45.5341,
			lng: -73.5102,
			hours: "Mar–Sam 10 h–17 h",
			plan: "plus",
			image: "",
			photos: [],
			code: "719304",
			qrToken: "shop-atlas"
		},
		{
			id: "shop-chen",
			name: "Café Chen",
			category: "cafe",
			ownerId: "maya",
			handle: "cafechen",
			bio: "Café, design, silence. Table du fond sur Wipp.",
			address: "12 place Charles-Le Moyne",
			city: "Longueuil",
			country: "Canada",
			phone: "+1 450 555 0112",
			lat: 45.5249,
			lng: -73.5214,
			hours: "Tous les jours 8 h–20 h",
			plan: "plus",
			image: "/media/shop-chen-hero.jpg",
			logo: "/media/shop-chen-logo.jpg",
			photos: [
				"/media/shop-chen-latte.jpg",
				"/media/shop-chen-corner.jpg",
				"/media/shop-chen-hero.jpg",
				"/media/coffee.jpg"
			],
			code: "265188",
			qrToken: "shop-chen",
			tags: [
				"Café",
				"Pâtisseries",
				"Espace de travail"
			],
			quote: "Bien plus qu’un café, un moment pour soi."
		},
		{
			id: "shop-haddad",
			name: "Haddad Vintage",
			category: "home",
			ownerId: "karim",
			handle: "haddadvintage",
			bio: "Meubles, lampes, trouvailles. Visite à arranger sur Wipp.",
			address: "4100 boulevard Taschereau",
			city: "Greenfield Park",
			country: "Canada",
			phone: "+1 450 555 0166",
			lat: 45.4944,
			lng: -73.4871,
			hours: "Jeu–Dim 11 h–17 h",
			plan: "starter",
			image: "/media/apt.jpg",
			photos: ["/media/apt.jpg", "/media/chair.jpg"],
			code: "830441",
			qrToken: "shop-haddad"
		},
		{
			id: "shop-lea",
			name: "Studio Martin",
			category: "services",
			ownerId: "lea",
			handle: "studiomartin",
			bio: "Photo, portraits, rives du Saint-Laurent. Booking sur Wipp.",
			address: "Rives / Brossard",
			city: "Brossard",
			country: "Canada",
			phone: "+1 450 555 0133",
			lat: 45.4678,
			lng: -73.4689,
			hours: "Sur rendez-vous",
			plan: "vitrine",
			image: "/media/river.jpg",
			photos: ["/media/river.jpg"],
			code: "551027",
			qrToken: "shop-lea"
		}
	];
}
export function seedLifestyle(): LifestyleItem[] {
	return [
		{
			id: "ls-slow",
			kind: "spot",
			title: "Slow Sunday",
			when: "Samedi · 16 h",
			place: "Café Chen",
			city: "Longueuil",
			lat: 45.5249,
			lng: -73.5214,
			hostId: "maya",
			image: "/media/coffee.jpg",
			note: "Une table, pas de bruit. Maya prend les réservations sur Wipp.",
			paid: false
		},
		{
			id: "ls-promo-atlas",
			kind: "promo",
			title: "Nettoyage de bijoux offert",
			when: "Jusqu’à samedi",
			place: "Bijouterie Atlas",
			city: "Longueuil",
			lat: 45.5341,
			lng: -73.5102,
			hostId: "sofia",
			image: "",
			note: "Dépôt le matin, prêt le soir. Message à @sofia — pas de 450 sur l’offre.",
			deal: "Offert",
			paid: false
		},
		{
			id: "ls-soccer",
			kind: "event",
			title: "Match du dimanche",
			when: "Dimanche · 10 h",
			place: "Terrain 3",
			city: "Longueuil",
			lat: 45.536,
			lng: -73.512,
			hostId: "julien",
			image: "/media/soccer.jpg",
			note: "Soccer Longueuil. Julien organise. Contact par @jln, jamais un 06.",
			paid: false
		},
		{
			id: "ls-promo-mie",
			kind: "promo",
			title: "Pain du jour −30 %",
			when: "Aujourd’hui jusqu’à 11 h",
			place: "La Mie Dorée",
			city: "Longueuil",
			lat: 45.5402,
			lng: -73.5088,
			hostId: "samira",
			image: "/media/food.jpg",
			note: "Les invendus du four. Commande sur Wipp, ramassage au comptoir.",
			deal: "−30 %",
			paid: false
		},
		{
			id: "ls-party-roof",
			kind: "party",
			title: "Rooftop Saint-Charles",
			when: "Samedi · 21 h",
			place: "Vieux-Longueuil",
			city: "Longueuil",
			lat: 45.5388,
			lng: -73.509,
			hostId: "noah",
			image: "/media/river.jpg",
			note: "Musique, vue sur le fleuve. Entrée par QR Wipp. Aucun numéro sur l’invite.",
			paid: true,
			price: "15 $"
		},
		{
			id: "ls-marche",
			kind: "event",
			title: "Marché Vieux-Longueuil",
			when: "Dimanche · 9 h",
			place: "rue Saint-Charles",
			city: "Longueuil",
			lat: 45.5402,
			lng: -73.5088,
			image: "/media/food.jpg",
			note: "Producteurs, pain, fleurs. L’affiche n’a pas de numéro — Wipp si vous voulez parler au stand.",
			paid: false
		},
		{
			id: "ls-concert-parc",
			kind: "concert",
			title: "Jazz au parc",
			when: "Vendredi · 19 h 30",
			place: "Parc Marie-Victorin",
			city: "Longueuil",
			lat: 45.527,
			lng: -73.5,
			hostId: "lea",
			image: "",
			note: "Trio, pelouse, lumière douce. Léa a les places restantes sur Wipp.",
			paid: true,
			price: "20 $"
		},
		{
			id: "ls-concert-samedi",
			kind: "concert",
			title: "Concert samedi",
			when: "Samedi · 20 h",
			place: "Vieux-Longueuil",
			city: "Longueuil",
			lat: 45.5392,
			lng: -73.5084,
			hostId: "noah",
			image: "/media/river.jpg",
			note: "Scene ouverte, entrée par Wipp. Aucun numéro sur l’affiche.",
			paid: true,
			price: "12 $"
		},
		{
			id: "ls-promo-chen",
			kind: "promo",
			title: "2e café offert",
			when: "Lundi–mercredi",
			place: "Café Chen",
			city: "Longueuil",
			lat: 45.5249,
			lng: -73.5214,
			hostId: "maya",
			image: "/media/coffee.jpg",
			note: "Sur présentation du Wipp. Maya valide à la table.",
			deal: "2e offert",
			paid: false
		},
		{
			id: "ls-party-soiree",
			kind: "party",
			title: "Soirée samedi",
			when: "Samedi · 22 h",
			place: "Loft Taschereau",
			city: "Greenfield Park",
			lat: 45.492,
			lng: -73.486,
			hostId: "malik",
			image: "",
			note: "QR à usage unique à la porte. Malik gère la liste sur Wipp.",
			paid: true,
			price: "10 $"
		},
		{
			id: "ls-concert-place",
			kind: "concert",
			title: "Live Place Longueuil",
			when: "Jeudi · 20 h",
			place: "Place Longueuil",
			city: "Longueuil",
			lat: 45.5248,
			lng: -73.4676,
			hostId: "alex",
			image: "",
			note: "Auteur-compositeur, petite salle. Places par @alex.",
			paid: true,
			price: "25 $"
		},
		{
			id: "ls-promo-haddad",
			kind: "promo",
			title: "Lampes vintage −20 %",
			when: "Ce week-end",
			place: "Haddad Vintage",
			city: "Greenfield Park",
			lat: 45.4944,
			lng: -73.4871,
			hostId: "karim",
			image: "/media/apt.jpg",
			note: "Sur Wipp avant de passer. Karim confirme le stock.",
			deal: "−20 %",
			paid: false
		},
		{
			id: "ls-rives",
			kind: "spot",
			title: "Rives du Saint-Laurent",
			when: "Tous les soirs",
			place: "Promenade",
			city: "Brossard",
			lat: 45.4678,
			lng: -73.4689,
			hostId: "lea",
			image: "/media/river.jpg",
			note: "Marche, lumière, photo. Léa partage le spot — pas son numéro.",
			paid: false
		},
		{
			id: "ls-party-brossard",
			kind: "party",
			title: "House Brossard",
			when: "Vendredi · 23 h",
			place: "Secteur Taschereau",
			city: "Brossard",
			lat: 45.46,
			lng: -73.45,
			hostId: "ines",
			image: "",
			note: "Petite soirée. Inès envoie le QR une fois, puis il meurt.",
			paid: false
		},
		{
			id: "ls-me-gold",
			kind: "event",
			title: "Sunset rooftop",
			when: "Samedi · 19 h",
			place: "Terrasse Chambly",
			city: "Longueuil",
			lat: 45.5318,
			lng: -73.5114,
			hostId: "me",
			image: "/media/river.jpg",
			note: "Une vingtaine de personnes. L’entrée se fait avec un QR Wipp.",
			paid: false
		}
	];
}
export const NEARBY: { id: string; meters: number }[] = [
	{
		id: "ines",
		meters: 4
	},
	{
		id: "maya",
		meters: 9
	},
	{
		id: "julien",
		meters: 340
	}
];

export const SEED_GROUP_META: Record<string, { inviteToken: string; avatar: string }> = {
  "c-famille": { inviteToken: "famille-diallo", avatar: "/media/food.jpg" },
  "c-soccer": { inviteToken: "soccer-longueuil", avatar: "/media/soccer.jpg" },
  "c-quartier": { inviteToken: "vieux-longueuil", avatar: "/media/river.jpg" },
  "c-soiree": { inviteToken: "soiree-samedi", avatar: "/media/coffee.jpg" },
};

export function withGroupMeta(chats: Chat[]): Chat[] {
  return chats.map((c) => {
    const meta = SEED_GROUP_META[c.id];
    if (!meta || c.type !== "group") return c;
    return {
      ...c,
      inviteToken: c.inviteToken ?? meta.inviteToken,
      avatar: c.avatar ?? meta.avatar,
    };
  });
}
