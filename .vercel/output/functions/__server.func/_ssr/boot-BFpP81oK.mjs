import { i as __toESM } from "../_runtime.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-DBkaDyPc.js
var fr = {
	appName: "Wipp",
	tagline: "Connecte ta vie.",
	start: "Commencer",
	skip: "Passer",
	continue: "Continuer",
	back: "Retour",
	next: "Suivant",
	cancel: "Annuler",
	save: "Enregistrer",
	share: "Partager",
	copy: "Copier",
	copied: "Copié",
	search: "Rechercher",
	done: "OK",
	later: "Plus tard",
	openDemo: "Ouvrir la démo",
	introTapSound: "Toucher pour le son",
	onb1Title: "Connectez-vous en",
	onb1Accent: "un instant.",
	onb1Body: "Approchez vos téléphones, échangez vos codes Wipp et commencez à discuter immédiatement — sans numéro de téléphone.",
	onb2Title: "Votre numéro reste",
	onb2Accent: "votre affaire.",
	onb2Body: "Connectez-vous avec votre Wipp, votre QR code ou votre @username. Vous décidez ce que vous partagez.",
	onb3Title: "Les personnes sont plus proches que",
	onb3Accent: "vous ne pensez.",
	onb3Body: "Trouvez quelqu’un près de vous ou à l’autre bout du monde grâce au QR code, au pseudo ou aux fonctions de proximité.",
	onb4Title: "Des connexions qui vont",
	onb4Accent: "plus loin.",
	onb4Body: "Approchez vos téléphones, échangez vos codes Wipp et créez de nouvelles connexions — en un instant.",
	onbBrand: "Discute  ·  Partage  ·  Découvre",
	onbTapLeft: "Approche ton téléphone et connecte !",
	onbTapRight: "Tap & Connect",
	onbFast: "Rapide",
	onbSimple: "Simple",
	onbNoNumber: "Sans numéro",
	onbConnected: "Connecté",
	onbWherever: "Peu importe où tu es…",
	onbWorldChat: "Le monde à portée de chat",
	onbNewMeetings: "De nouvelles rencontres",
	onbCityMtl: "Montréal",
	onbCityAbj: "Abidjan",
	onbCityPar: "Paris",
	onbCityNyc: "New York",
	onbYourId: "Ton identité, ton contrôle",
	onbPrivacyFirst: "Ta vie privée d'abord",
	onbCardUser: "@username",
	onbCardUserHint: "Visible par tous",
	onbCardPhone: "Numéro privé",
	onbCardPhoneHint: "Toujours protégé",
	onbCardPlace: "À toi de choisir",
	onbCardPlaceHint: "Partage ta localisation si tu veux",
	onbRealMeet: "De vraies rencontres",
	onbJustWipp: "Just Wipp !",
	onbConnOk: "Connexion réussie !",
	onbConnOkHint: "Vous êtes maintenant connectés.",
	onbOneTap: "Un simple contact",
	onbExchange: "Échangez vos codes",
	onbStartChat: "Commencez à discuter",
	signupTitle: "Créer un compte",
	signupSub: "Votre numéro sert à sécuriser le compte. Il n’est pas visible.",
	firstName: "Prénom",
	lastName: "Nom",
	country: "Pays",
	phone: "Numéro de téléphone",
	email: "Email (facultatif)",
	birthday: "Date de naissance",
	otpTitle: "Vérification",
	otpBody: "Entrez le code envoyé au",
	otpHint: "Code de démo : 1234",
	otpError: "Code incorrect. Essayez 1234.",
	setupTitle: "Votre profil Wipp",
	setupSub: "C’est comme ça que les autres vous trouveront.",
	displayName: "Nom affiché",
	username: "Nom d’utilisateur",
	bio: "Bio courte (facultative)",
	discoverTitle: "Qui peut trouver mon profil ?",
	everyone: "Tout le monde",
	contacts: "Mes contacts",
	nobody: "Personne",
	usernameTaken: "Ce @username est déjà pris.",
	usernameOk: "Disponible",
	usernameHint: "3 à 20 caractères, lettres et chiffres.",
	tabChats: "Chats",
	tabCalls: "Appels",
	tabConnect: "WIPP",
	tabExplore: "Explorer",
	tabMe: "Moi",
	wippConnectTitle: "WIPP Connect",
	wippConnectSub: "Comment veux-tu te connecter ?",
	wippTouchBadge: "La façon la plus rapide",
	wippTouchCard: "WIPP Touch",
	wippTouchCardHint: "Rapproche vos téléphones",
	wippTouchCardBody: "Connectez-vous instantanément sans échanger vos numéros.",
	wippScanCard: "Scanner un QR",
	wippScanCardHint: "Scanne le WIPP de quelqu’un",
	wippMyQrCard: "Mon QR",
	wippMyQrCardHint: "Affiche et partage ton WIPP",
	wippSearchCard: "Rechercher",
	wippSearchCardHint: "Recherche un @username",
	wippNearbyCard: "À proximité",
	wippNearbyCardHint: "Découvre des WIPP autour de toi",
	wippConnectFoot: "Plus besoin de demander un numéro.",
	wippConnectFootEm: "Demande son WIPP.",
	chatsEmpty: "Aucune conversation pour le moment.",
	chatsEmptySub: "Trouvez quelqu’un grâce à son Wipp.",
	connectCta: "Se connecter",
	newChat: "Nouvelle conversation",
	requests: "Demandes",
	archive: "Archiver",
	delete: "Supprimer",
	mute: "Silencieux",
	unmute: "Rétablir",
	markRead: "Lu",
	markUnread: "Non lu",
	silent: "Silencieux",
	searchPeople: "Nom ou @username",
	scanQr: "Scanner un QR code",
	shareMyWgo: "Partager mon Wipp",
	wgoContacts: "Contacts Wipp",
	createGroup: "Créer un groupe",
	newCommunity: "Nouvelle communauté",
	nearbyPeople: "Personnes à proximité",
	connectTitle: "Comment voulez-vous vous connecter ?",
	scan: "Scanner",
	scanSub: "Scannez un QR Wipp.",
	myQr: "Mon WIPP",
	myQrSub: "Affichez votre carte et votre QR.",
	searchCard: "Rechercher",
	searchCardSub: "Recherchez quelqu’un par @username.",
	nearby: "À proximité",
	nearbySub: "Uniquement avec consentement.",
	wgoTouch: "Wipp Touch",
	wgoTouchSub: "Rapprochez vos téléphones.",
	comingSoon: "Bientôt",
	visible5: "Visible 5 min",
	visible15: "Visible 15 min",
	invisible: "Invisible",
	nearbyOff: "Vous êtes invisible.",
	nearbyOn: "Visible à proximité",
	nearbyHint: "Aucune personne n’apparaît sans avoir activé la visibilité.",
	meters: "m",
	scanHint: "Pointez vers un QR Wipp",
	scanAction: "Simuler un scan",
	foundTitle: "Profil trouvé",
	connectWith: "Se connecter",
	message: "Message",
	connected: "Connecté",
	requestSent: "Demande envoyée",
	commonContacts: "contacts en commun",
	wantsToConnect: "souhaite se connecter avec vous.",
	accept: "Accepter",
	decline: "Refuser",
	ignore: "Ignorer",
	block: "Bloquer",
	report: "Signaler",
	wantsToMessage: "souhaite vous envoyer un message.",
	typeMessage: "Message",
	reply: "Répondre",
	react: "Réagir",
	copyMsg: "Copier",
	forward: "Transférer",
	edit: "Modifier",
	deleteMe: "Supprimer pour moi",
	deleteAll: "Supprimer pour tout le monde",
	pin: "Épingler",
	translate: "Traduire",
	transcribe: "Transcrire",
	summarize: "Résumer",
	summarized: "Résumé Wipp",
	slideCancel: "Glisser pour annuler",
	lockedRec: "Enregistrement verrouillé",
	listen: "Écouter",
	send: "Envoyer",
	receiptSending: "Envoi en cours",
	receiptSent: "Envoyé",
	receiptDelivered: "Reçu",
	receiptRead: "Lu",
	receiptFailed: "Échec. Touchez pour réessayer.",
	online: "en ligne",
	members: "membres",
	you: "Vous",
	photo: "Photo",
	video: "Vidéo",
	voice: "Vocal",
	document: "Document",
	contact: "Contact",
	location: "Localisation",
	stickers: "Stickers",
	stickerPack: "Stickers Wipp",
	stickerTagline: "Exprime-toi en mode WIPP !",
	stickerPackElle: "Elle",
	stickerPackLui: "Lui",
	stickerPackFun: "Fun",
	stickerSameVibe: "Same vibe. Different people.",
	sticker: "Sticker",
	stickerEmoji: "Emoji",
	stickerRecentEmpty: "Les stickers et emojis que tu envoies apparaissent ici.",
	callsTitle: "Appels",
	all: "Tous",
	missed: "Manqués",
	createCallLink: "Créer un lien d’appel",
	incoming: "Entrant",
	outgoing: "Sortant",
	callAgain: "Rappeler",
	muteMic: "Micro",
	speaker: "Haut-parleur",
	addPerson: "Ajouter",
	hangup: "Raccrocher",
	camera: "Caméra",
	flip: "Caméra",
	connecting: "Connexion…",
	ringing: "Appel…",
	inCall: "En appel",
	callEnded: "Appel terminé",
	videoCall: "Appel vidéo",
	audioCall: "Appel audio",
	answer: "Répondre",
	declineCall: "Refuser",
	incomingFrom: "vous appelle",
	wgoCall: "Appel Wipp",
	cameraOff: "Caméra coupée",
	flipCam: "Retourner",
	permDenied: "Caméra ou micro indisponible. L’appel continue sans.",
	newCall: "Nouvel appel",
	joinCall: "Rejoindre",
	callLinkBody: "Ils rejoignent sans numéro. C’est un appel Wipp.",
	receiveCall: "Recevoir un appel",
	callMinimize: "Réduire",
	returnToCall: "Revenir à l’appel",
	callPipHint: "Glisse vers le bas pour réduire l’appel",
	callInProgress: "Appel en cours",
	deleteCall: "Supprimer",
	yourStory: "Votre story",
	stories: "Stories",
	listings: "Petites annonces",
	contactOnWgo: "Contacter sur Wipp",
	talkingAbout: "Vous discutez à propos de",
	categoryAuto: "Voitures",
	categoryHome: "Maisons",
	categoryJobs: "Emplois",
	categoryGoods: "Objets",
	categoryServices: "Services",
	shareWgo: "Partager mon Wipp",
	account: "Compte",
	privacy: "Confidentialité",
	security: "Sécurité",
	notifications: "Notifications",
	chatsSettings: "Chats",
	callsSettings: "Appels",
	appearance: "Apparence",
	language: "Langue",
	accessibility: "Accessibilité",
	accessibilityHint: "Le doigt confirme ce que l’œil voit. Vibration, cibles plus larges, texte plus lisible.",
	hapticLang: "Langage tactile",
	hapticTap: "Toucher",
	hapticSend: "Envoi",
	hapticConnect: "Connexion",
	haptics: "Retour haptique",
	hapticsHint: "Le téléphone vibre pour un tap, un envoi ou une connexion WIPP Touch.",
	hapticsTest: "Tester la vibration",
	hapticsTestDone: "Trois impulsions — c’est le rythme WIPP.",
	hapticsUnavailable: "Pas de vibreur ici — le flash doré montre le rythme.",
	largeTouch: "Grandes cibles",
	largeTouchHint: "Boutons, onglets et interrupteurs plus larges, plus faciles à viser.",
	largeText: "Texte plus grand",
	largeTextHint: "Agrandit les titres, les messages et les libellés.",
	reduceMotion: "Réduire les animations",
	reduceMotionHint: "Coupe les mouvements de l’écran. Plus calme, plus lisible.",
	a11yOn: "Activé",
	a11yOff: "Désactivé",
	close: "Fermer",
	wgoAi: "Wipp AI",
	devices: "Appareils connectés",
	storage: "Stockage",
	help: "Aide",
	invite: "Inviter des amis",
	signOut: "Déconnexion",
	resetDemo: "Réinitialiser la démo",
	whoPhoto: "Qui peut voir ma photo ?",
	whoBio: "Qui peut voir ma bio ?",
	whoLast: "Qui peut voir ma dernière connexion ?",
	whoOnline: "Qui peut voir si je suis en ligne ?",
	whoCall: "Qui peut m’appeler ?",
	whoRequest: "Qui peut m’envoyer une demande ?",
	whoGroup: "Qui peut m’ajouter dans un groupe ?",
	whoStories: "Qui peut voir mes stories ?",
	whoPhone: "Qui peut me trouver avec mon numéro ?",
	whoUser: "Qui peut me trouver avec mon @username ?",
	nearbyVis: "Visibilité à proximité",
	pinCode: "Code PIN",
	biometrics: "Face ID / Touch ID",
	twoFa: "Authentification deux facteurs",
	sessions: "Sessions actives",
	remoteLogout: "Déconnexion à distance",
	ephemeral: "Messages éphémères",
	ephemeralPerChat: "Par conversation",
	ephemeralPerChatHint: "Dans un chat, ouvre le menu puis Messages éphémères : 24 h ou 7 jours. Un chat WIPP Touch disparaît tout seul.",
	ephemeralCalls: "Appels éphémères",
	ephemeralCallsHint: "L’appel ne s’écrit pas dans l’historique. Rien à effacer après.",
	ephemeralCallOn: "Éphémère",
	ephemeralCallOff: "Garder l’appel",
	ephemeralCallHint: "Cet appel ne restera pas dans Appels.",
	ephemeralCallForced: "Conversation éphémère : l’appel ne sera pas enregistré.",
	viewOnce: "Vue unique",
	viewOnceHint: "La photo ou la vidéo s’ouvre une fois, puis disparaît.",
	viewOnceOpen: "Toucher pour voir",
	viewOnceOpened: "Ouvert",
	e2e: "Chiffrement de bout en bout",
	e2eAlways: "Toujours activé",
	e2eBanner: "Les messages et les appels sont chiffrés de bout en bout. Touchez pour en savoir plus.",
	e2eInfoTitle: "Chiffrement",
	e2eInfoBody: "Seul toi et cette conversation avez les clés. Wipp ne peut pas ouvrir le contenu. Chaque message est scellé avec AES-256-GCM.",
	e2eSafety: "Numéro de sécurité",
	e2eSafetyHint: "Comparez-le en personne. S’il est identique, personne ne s’est glissé au milieu.",
	e2eVerify: "Marquer comme vérifié",
	e2eVerified: "Vérifié",
	e2eUnverify: "Retirer la vérification",
	e2eIdentity: "Clé d’identité",
	e2eRotate: "Nouvelle clé d’identité",
	e2eRotateBody: "Les messages déjà chiffrés ne pourront plus s’ouvrir. Sans l’ancienne clé, le contenu n’existe plus. C’est le bout en bout.",
	e2eRotateConfirm: "Changer la clé",
	e2eShowCipher: "Afficher le chiffré",
	e2eShowCipherHint: "Ce qui est réellement stocké — pas le texte clair.",
	e2eCipher: "Contenu chiffré",
	e2eCopyCipher: "Copier le chiffré",
	e2eFailed: "Impossible de déchiffrer",
	e2eFailedBody: "La clé a changé. Le message reste illisible.",
	e2eLocked: "Message chiffré",
	e2eCall: "Appel chiffré",
	e2eAlg: "AES-256-GCM · ECDH P-256",
	e2eOn: "Chiffré de bout en bout",
	e2eContacts: "Contacts vérifiés",
	e2eNoVerified: "Aucun contact vérifié pour l’instant.",
	e2ePlaceholder: "Message chiffré",
	e2eHow: "Comment ça marche",
	e2eHow1: "Chaque appareil a une clé d’identité P-256.",
	e2eHow2: "Une clé de conversation est dérivée par ECDH. Wipp ne la voit pas.",
	e2eHow3: "Chaque message est scellé en AES-256-GCM avant d’être stocké.",
	e2eKeyChanged: "Clé renouvelée. Les anciens messages sont illisibles.",
	e2eCompare: "Numéro de sécurité",
	e2eBody: "Les conversations privées sont conçues pour un chiffrement de bout en bout.",
	themeLight: "Clair",
	themeDark: "Sombre",
	themeSystem: "Système",
	french: "Français",
	english: "English",
	searchGlobal: "Rechercher sur Wipp",
	searchHint: "Contacts, @username, messages, groupes, annonces",
	noResults: "Aucun résultat",
	groupName: "Nom du groupe",
	groupDesc: "Description",
	participants: "Participants",
	create: "Créer",
	blocked: "Bloqué",
	reported: "Signalement envoyé",
	ignored: "Demande ignorée",
	unreadN: "nouveaux messages",
	storyReply: "Répondre à la story",
	addStory: "Ajouter une story",
	storyText: "Texte",
	publish: "Publier",
	privacyStory: "Qui peut voir",
	storyMusic: "Musique",
	storyAddMusic: "Ajouter une musique",
	storyMusicSearch: "Titre ou artiste",
	storyNoMusic: "Aucun morceau pour cette recherche.",
	storyMusicForYou: "Pour toi",
	storyMusicTrending: "Tendances",
	storyMusicChill: "Chill",
	storyMusicParty: "Party",
	storyMusicAfro: "Afro",
	storyMusicLofi: "Lo-fi",
	storyMusicRnb: "R&B",
	storyChangeMusic: "Changer",
	storyRemoveMusic: "Retirer la musique",
	aboutWgo: "Wipp remplace le numéro de téléphone. Donnez votre Wipp, pas votre 06.",
	liveCode: "Code Wipp",
	liveCodeSub: "60 s pour se connecter. Le chat s’efface ensuite.",
	oneTimeQr: "QR unique",
	oneTimeQrSub: "Un scan, puis il s’efface.",
	myCode: "Mon code",
	enterCode: "Entrer un code",
	codeExpires: "Expire dans",
	codeExpired: "Code expiré",
	regenerate: "Nouveau code",
	codeHint: "Le code vit 60 secondes. Le chat, lui, expire après. Aucun @ n’est révélé.",
	codeOwn: "C’est votre propre code.",
	codeNotFound: "Aucun code correspondant.",
	codeUsed: "Ce QR a déjà été utilisé.",
	qrExpired: "Ce QR a expiré.",
	simulateEntered: "Simuler : quelqu’un a tapé ton code",
	demoCodeLea: "Utiliser le code de Léa",
	onceTitle: "QR à usage unique",
	onceBody: "Un seul scan. Ensuite il ne vaut plus rien. Votre @ n’est pas gravé dessus.",
	eventTitle: "QR d’événement",
	eventBody: "Valable jusqu’à l’heure choisie. Soirée, match, immeuble.",
	createOnce: "Créer un QR unique",
	createEvent: "Créer un QR d’événement",
	eventName: "Nom de l’événement",
	exp2h: "2 heures",
	expTonight: "Ce soir",
	exp24h: "24 heures",
	onceBadge: "1 scan",
	eventBadge: "Événement",
	qrBurned: "Utilisé",
	introduce: "Présenter",
	introduceTitle: "Présenter quelqu’un",
	introduceSub: "La personne ne verra pas le @ tant qu’elle n’a pas accepté.",
	pickPerson: "Qui présenter ?",
	introNote: "Note (facultative)",
	sendIntro: "Envoyer l’introduction",
	introSent: "Introduction envoyée",
	introBy: "Présenté par",
	someone: "Quelqu’un",
	usernameHidden: "@username caché jusqu’à acceptation",
	intros: "Présentations",
	acceptIntro: "Accepter et révéler",
	introAccepted: "Vous êtes connectés. Aucun numéro n’a été échangé.",
	groupQr: "QR du groupe",
	groupQrBody: "Scannez, copiez le lien ou envoyez le QR. Jamais un numéro.",
	groupInfo: "Groupe",
	joinByQr: "Entrée par QR ou lien Wipp",
	noPhoneGroup: "Aucun numéro n’est visible dans ce groupe.",
	noInviteLink: "Le lien ouvre Wipp — pas WhatsApp, pas un numéro.",
	joinedViaQr: "Vous avez rejoint via un lien Wipp. Aucun numéro n’a été partagé.",
	scanOnce: "QR unique",
	scanGroup: "QR de groupe",
	scanProfile: "QR profil",
	noPhoneListing: "Sans numéro",
	contactWgoOnly: "Contact uniquement sur Wipp",
	sellerPrivate: "Le vendeur ne partage pas son numéro.",
	phoneHiddenForever: "Wipp n’affiche jamais de numéro sur une annonce.",
	joinThisGroup: "Rejoindre le groupe",
	alreadyMember: "Déjà membre",
	youOnly: "visible seulement par vous",
	foundViaCode: "Trouvé via un code Wipp",
	foundViaQr: "Trouvé via un QR unique",
	foundViaIntro: "Présenté par un contact",
	foundViaNearby: "Trouvé à proximité",
	foundViaTouch: "Trouvé par Wipp Touch",
	createdGroupQr: "Groupe créé. Partagez le QR ou le lien — jamais un numéro.",
	membersHiddenPhone: "Les membres voient un @, jamais un 06.",
	introNoteSeed: "On s’est croisés au café près du métro. Vous allez bien vous entendre.",
	copyLink: "Copier le lien",
	shareGroupQr: "Envoyer le QR",
	shareGroup: "Partager le groupe",
	openInWipp: "Ouvrir dans Wipp ?",
	openInWippBody: "Ce QR ou ce lien ouvre le groupe dans Wipp, au bon endroit. Aucun numéro n’est demandé.",
	openWipp: "Ouvrir Wipp",
	holdQrHint: "Maintenez le QR — Wipp propose de l’ouvrir.",
	groupInviteTitle: "Invitation au groupe",
	groupInviteBody: "Quelqu’un vous a envoyé ce groupe. Aucun numéro n’est demandé.",
	groupLinkHint: "Collez ce lien dans WhatsApp, Messages ou Mail.",
	addGroupPhoto: "Ajouter une photo",
	changeGroupPhoto: "Changer la photo du groupe",
	linkInvalid: "Ce lien ne mène plus à un groupe.",
	joinedViaLink: "Vous avez rejoint via un lien Wipp. Aucun numéro n’a été partagé.",
	myGroups: "Mes groupes",
	groupsEmpty: "Aucun groupe pour l’instant.",
	groupsEmptySub: "Créez-en un. On y entre par QR ou lien, jamais un numéro.",
	openGroup: "Ouvrir le groupe",
	chatTtl: "Durée du chat",
	ttl15: "15 min",
	ttl1h: "1 heure",
	ttl24h: "24 heures",
	codeVsPerm: "Permanent : votre QR @. Éphémère : ce code.",
	tempChat: "Chat temporaire",
	tempChatEnded: "Conversation terminée",
	tempBanner: "Pas de @, pas de numéro.",
	tempExpires: "Expire dans",
	revealWgo: "Révéler mon Wipp",
	simulateExpire: "Simuler la fin du chat",
	sealedTitle: "Plus aucun accès",
	sealedBody: "Cette personne n’a plus votre @, ni votre numéro, ni votre photo, ni l’historique. Il ne lui reste rien d’identifiable.",
	sealedKeeps: "Il lui reste",
	sealedKeepsNone: "Rien. Pas de @, pas de numéro, pas de moyen de vous retrouver.",
	sealedLost: "Elle n’a plus",
	sealedLostList: "@username · numéro · photo · messages",
	firstNameOnly: "Prénom seulement",
	notAContact: "Pas un contact",
	revealedWgo: "Vous avez révélé votre Wipp. C’est maintenant un contact.",
	tempOpened: "Chat temporaire. Aucun @ n’est visible. Le chat s’efface à l’heure dite.",
	keepForever: "Garder comme contact",
	touchHint: "Rapprochez vos téléphones. Pas de numéro, pas de @ à dicter.",
	touchSearching: "Un Wipp tout près…",
	touchContact: "Wipp",
	touchReveal: "Deux Wipp se sont trouvés.",
	touchCta: "Rapprocher",
	touchHold: "Maintenez les téléphones proches",
	touchVsPerm: "Vous n’êtes détectable que pendant Wipp Touch.",
	touchHello: "Salut. On s’est croisés.",
	touchOpened: "Vous vous êtes croisés. Prénom seulement. Le chat s’efface à l’heure dite.",
	touchLive: "Prêt",
	myCardHint: "Rapprochez votre téléphone ou faites scanner votre QR.",
	touchPermTitle: "Détecter les Wipp à proximité ?",
	touchPermBody: "Wipp Touch ne s’allume que lorsque vous l’ouvrez. Personne ne peut vous chercher en arrière-plan.",
	touchAllow: "Autoriser",
	touchNeedBt: "Wipp Touch a besoin de détecter les personnes proches.",
	touchEnable: "Activer",
	touchDetected: "Wipp détecté",
	touchWantsShare: "souhaite partager son Wipp avec vous.",
	touchRefuse: "Refuser",
	touchWaiting: "En attente de l’autre personne…",
	touchConnected: "Connecté !",
	touchAdded: "fait maintenant partie de vos contacts Wipp.",
	touchBothOk: "Les deux ont accepté. Aucun numéro n’a été échangé.",
	write: "Écrire",
	viewProfile: "Voir le profil",
	touchFail: "Impossible de détecter l’appareil.",
	touchScanQr: "Scanner son QR",
	touchShowQr: "Afficher mon QR",
	touchPick: "Plusieurs Wipp tout près. Choisissez.",
	touchVisible: "Détectable tant que cet écran est ouvert.",
	exploreTitle: "Explorer",
	tabListings: "Annonces",
	tabUtilities: "Utilitaires",
	utilitiesHint: "Des services autour de vous. Pas des personnes.",
	locateMe: "Me localiser",
	locating: "Localisation…",
	locatedAround: "Autour de",
	locateFallback: "Position estimée depuis votre ville.",
	locateDenied: "Localisation refusée. On utilise votre ville.",
	locateHint: "Votre position ne quitte pas l’appareil. Elle sert seulement à trier.",
	pharmaciesDuty: "Pharmacies de garde",
	pharmaciesDutyOnly: "De garde",
	pharmaciesAll: "Toutes",
	onDuty: "De garde",
	onDutyUntil: "De garde jusqu’à",
	open24h: "Ouverte 24 h",
	closedNow: "Fermée",
	openUntil: "Ouverte jusqu’à",
	pharmacyPhone: "Standard de la pharmacie",
	directions: "Itinéraire",
	callPharmacy: "Appeler",
	noDutyNearby: "Aucune pharmacie de garde autour de vous.",
	civicNote: "C’est un service, pas un contact. Aucun @ n’est exposé.",
	locatedGps: "Position actuelle",
	tabUtile: "Utile",
	tabShops: "Boutique",
	tabLifestyle: "Lifestyle",
	shopsHint: "Des commerces sur Wipp. Vous écrivez au @ de la boutique — jamais un numéro.",
	searchShops: "Onglerie, coiffure, restaurant…",
	shopCatAll: "Toutes",
	shopCatBakery: "Boulangerie",
	shopCatCafe: "Café",
	shopCatJewelry: "Bijoux",
	shopCatBeauty: "Beauté",
	shopCatHome: "Maison",
	shopCatServices: "Services",
	shopCatNails: "Onglerie",
	shopCatHair: "Coiffure",
	shopCatRestaurant: "Restaurant",
	shopCatPlumbing: "Plomberie",
	shopCatRealty: "Immobilier",
	onWgo: "Sur Wipp",
	featured: "À la une",
	noShops: "Aucune boutique pour cette recherche.",
	createShop: "Créer ma boutique",
	myShop: "Ma boutique",
	shopPlan: "Formule",
	planStarter: "2 $ / mois",
	planVitrine: "5 $ / mois",
	planPlus: "10 $ / mois",
	planStarterSub: "Votre nom apparaît dans la recherche.",
	planVitrineSub: "Photo, horaires, adresse. Toujours sans numéro.",
	planPlusSub: "À la une. Les gens vous voient en premier.",
	shopName: "Nom de la boutique",
	shopBio: "Petite description",
	shopAddress: "Adresse complète",
	shopHours: "Horaires",
	publishShop: "Publier sur Wipp",
	shopPublished: "Boutique en ligne. Les gens vous écrivent sur Wipp.",
	messageShop: "Écrire sur Wipp",
	shopNoPhone: "Le standard n’est pas affiché. Un message suffit.",
	shopHoursLabel: "Horaires",
	talkingToShop: "Vous écrivez à la boutique sur Wipp. Aucun numéro n’est échangé.",
	youOwnShop: "C’est votre boutique.",
	lifestyleHint: "Soirées, concerts, promos. Du plus proche au plus loin. Contact par Wipp.",
	lifestyleEvent: "Événement",
	lifestyleSpot: "Spot",
	lifestyleParty: "Soirée",
	lifestyleConcert: "Concert",
	lifestylePromo: "Promo",
	lifestyleAll: "Tout",
	lifestyleNearFirst: "Du plus proche au plus loin",
	noLifestyle: "Rien autour pour ce filtre.",
	lifestyleDeal: "Offre",
	messageHost: "Écrire à l’hôte",
	noHost: "Pas d’hôte Wipp — c’est un lieu public.",
	createCard: "Créer ma carte de visite",
	myCard: "Ma carte de visite",
	cardHint: "Carte professionnelle publique. Un @ pro, un QR, un lien. Une seule messagerie.",
	shopCode: "Code boutique",
	shopCodeHint: "À montrer ou à partager.",
	addBanner: "Photo ou logo",
	addPhotos: "Photos",
	photosHint: "Jusqu’à 4, facultatif.",
	editCard: "Modifier la carte",
	copyCode: "Copier le lien",
	shopHandle: "Pseudo Wipp professionnel",
	shopPhone: "Téléphone de la boutique",
	shopCountry: "Pays",
	shopCity: "Ville",
	shopProNote: "Les clients voient cette identité, pas votre profil personnel. Votre numéro perso reste caché.",
	viewCard: "Voir la carte",
	shopContext: "Boutique",
	contactingShop: "Vous contactez",
	chatsAll: "Tous",
	chatsPersonal: "Personnel",
	chatsShops: "Boutiques",
	chatsGroups: "Groupes",
	shareCard: "Partager",
	shopLink: "Lien Wipp",
	scanShop: "Carte boutique",
	callShop: "Appeler",
	scanToWrite: "Scanner pour nous écrire sur Wipp",
	shareMyCard: "Partager ma carte",
	saveCard: "Enregistrer",
	savedCard: "Enregistré",
	aboutTab: "À propos",
	reviewsTab: "Avis",
	shopServicesTab: "Services",
	shopEventsTab: "Événements",
	morePhotos: "Photos",
	noReviews: "Pas encore d’avis.",
	createLifestyle: "Créer un événement",
	eventHint: "Catégorie, lieu, gratuit ou payant. L’hôte, c’est vous. Contact par Wipp.",
	lsTitle: "Titre",
	eventWhen: "Quand",
	eventPlace: "Lieu",
	eventPaid: "Payant",
	eventFree: "Gratuit",
	eventPrice: "Prix",
	eventNote: "En une phrase",
	publishEvent: "Publier",
	pickImage: "Image",
	noBanner: "Sans image",
	youHostEvent: "C’est vous qui organisez.",
	exploreAsk: "Que cherchez-vous aujourd’hui ?",
	exploreSplit: "Wipp, c’est pour écrire. Ici, vous découvrez ce qui existe autour de vous.",
	hubListings: "Petites annonces",
	hubListingsSub: "Acheter, vendre, trouver.",
	hubServices: "Services",
	hubServicesSub: "Tout ce qui est utile autour de vous.",
	hubShops: "Boutiques",
	hubShopsSub: "Découvrez les commerces près de chez vous.",
	hubEvents: "Événements",
	hubEventsSub: "Découvrez ce qui se passe autour de vous.",
	nearYou: "Près de vous",
	popularToday: "Populaire aujourd’hui",
	newEvents: "Nouveaux événements",
	recommendedShops: "Boutiques recommandées",
	searchNoResults: "Rien pour cette recherche autour de vous.",
	seeAll: "Voir tout",
	resultsListings: "Petites annonces",
	resultsServices: "Services",
	resultsShops: "Boutiques",
	resultsEvents: "Événements",
	changePhoto: "Changer la photo",
	gallery: "Galerie",
	recents: "Récents",
	fromDevice: "Depuis l’appareil",
	newPhotoStory: "Nouvelle photo de profil",
	viewedBy: "Vu par",
	viewedByN: "vues",
	noViews: "Personne n’a vu cette story pour l’instant.",
	storyLeft: "restantes",
	addPhotoStory: "Photo",
	addVideoStory: "Vidéo",
	storyModeText: "Texte",
	storyVideoMax: "1 min max",
	storyVideoTooLong: "La vidéo dépasse 1 minute.",
	storyVideoFail: "Impossible d’ouvrir cette vidéo.",
	pickVideo: "Choisir une vidéo",
	storyTtl: "Disparaît après",
	story24h: "24 h",
	story48h: "48 h",
	disappearing: "Messages éphémères",
	disappearingOff: "Désactivés",
	disappearing24h: "24 heures",
	disappearing7d: "7 jours",
	disappearingOn: "Activés",
	disappearingBanner: "Les nouveaux messages disparaîtront de cette conversation.",
	disappearingHint: "Les messages déjà envoyés restent. Seuls les nouveaux s’effacent.",
	disappearOffSys: "Les messages éphémères sont désactivés.",
	disappear24hSys: "Les messages disparaîtront après 24 heures.",
	disappear7dSys: "Les messages disparaîtront après 7 jours.",
	readReceipts: "Accusés de lecture",
	readReceiptsHint: "Si vous les désactivez, vous n’envoyez plus de double coche — et vous ne voyez plus celles des autres.",
	photoPublished: "Photo publiée en story",
	pickPhoto: "Choisir une photo",
	usePhoto: "Utiliser cette photo",
	storyExpired: "Cette story a disparu.",
	views: "Vues",
	editProfile: "Modifier le profil",
	myActivity: "Mon activité",
	myCardSub: "Partage ton WIPP",
	myListings: "Mes annonces",
	myListingsSub: "Gère tes annonces",
	myEvents: "Mes événements",
	myEventsSub: "Crée et gère",
	saved: "Enregistrés",
	savedSub: "Tes favoris",
	myWipp: "Mon WIPP",
	preferences: "Préférences",
	devicesHelp: "Appareils & assistance",
	goodVibes: "Good Vibes Only",
	footerTagline: "Plus proches, partout.",
	appVersion: "Version 1.0.0",
	inviteReward: "Gagne des récompenses",
	statContacts: "Contacts",
	statGroups: "Groupes",
	statEvents: "Événements",
	statListings: "Annonces",
	noListings: "Aucune annonce pour l’instant.",
	noEvents: "Aucun événement pour l’instant.",
	noSaved: "Rien d’enregistré pour l’instant.",
	city: "Ville",
	termsOfUse: "Conditions d’utilisation",
	privacyPolicy: "Politique de confidentialité",
	legalAcceptLead: "J’ai lu et j’accepte les",
	legalAnd: "et la",
	legalAcceptAge: "Je confirme avoir l’âge requis dans mon territoire.",
	legalNeedAccept: "Cochez pour créer le compte.",
	legalTooYoung: "WIPP n’est pas destiné aux moins de 13 ans.",
	legalUpdated: "Mise à jour",
	legalContact: "Questions :",
	legalCloseHint: "Fermez pour revenir à l’inscription.",
	authTagline: "Discute · Partage · Découvre",
	signupHeroTitle: "Crée ton",
	signupHeroBody: "Un seul compte pour communiquer, partager et découvrir tout ce qui t’importe.",
	alreadyAccount: "Déjà un compte ?",
	signIn: "Se connecter",
	or: "ou",
	loginHero: "Content de te revoir",
	loginSub: "Entre ton numéro pour retrouver ton WIPP.",
	signupGiveWipp: "Donne-moi ton WIPP",
	stepAccount: "Ton compte",
	stepIdentity: "Ton identité WIPP",
	phonePrivate: "Ton numéro reste privé sur WIPP. Il sert uniquement à sécuriser ton compte.",
	legalAcceptShort: "J’ai lu et j’accepte les",
	legalOfWipp: "de WIPP.",
	trustSecure: "Sécurisé",
	trustPrivate: "Numéro privé",
	trustOne: "Une seule connexion",
	joinCommunity: "Rejoins une communauté qui te ressemble.",
	setupHeroTitle: "Personnalise",
	setupHeroYou: "ton",
	setupHeroBody: "Ajoute une photo, un nom d’utilisateur et quelques infos pour te faire découvrir.",
	profilePhoto: "Photo de profil",
	usernameWipp: "Nom d’utilisateur WIPP",
	usernameHintSetup: "C’est ainsi que les autres te trouveront sur WIPP. Tu pourras le modifier plus tard.",
	bioOptional: "Bio (facultatif)",
	genderOptional: "Genre (facultatif)",
	genderUnspecified: "Je préfère ne pas préciser",
	genderWoman: "Femme",
	genderMan: "Homme",
	genderNb: "Non binaire",
	createMyWipp: "Créer mon WIPP",
	authFootChat: "Discute sans limites",
	authFootConnect: "Connecte avec des gens géniaux",
	authFootExplore: "Explore des opportunités",
	authCloser: "Le monde est plus proche sur WIPP",
	otpHero: "Vérifie ton numéro",
	reportTitle: "Signaler",
	reportBody: "Pourquoi signales-tu ça ? WIPP examine chaque signalement.",
	reportSpam: "Spam",
	reportHarass: "Harcèlement ou intimidation",
	reportHate: "Haine ou discrimination",
	reportFake: "Usurpation d’identité / faux compte",
	reportScam: "Arnaque ou fraude",
	reportSexual: "Contenu sexuel non consenti",
	reportUnderage: "Personne mineure en danger",
	reportOther: "Autre",
	reportSend: "Envoyer le signalement",
	reportThanks: "Merci. Notre équipe de confiance va examiner ça.",
	blockConfirm: "Bloquer cette personne ? Elle ne pourra plus t’écrire ni te trouver.",
	blockNow: "Bloquer",
	unblock: "Débloquer",
	blockedList: "Comptes bloqués",
	blockedEmpty: "Personne n’est bloqué.",
	signOutConfirm: "Tu pourras te reconnecter avec ton numéro.",
	deleteAccount: "Supprimer mon compte",
	deleteAccountBody: "Cette action est permanente. Ton profil, tes messages sur cet appareil, tes annonces et tes Stories seront supprimés. Les copies déjà reçues par d’autres personnes peuvent rester chez elles.",
	deleteAccountWarn: "Tape SUPPRIMER pour confirmer.",
	deleteWord: "SUPPRIMER",
	deleteAccountCta: "Supprimer définitivement",
	deleteNeedWord: "Le mot ne correspond pas.",
	downloadData: "Télécharger mes données",
	downloadDataHint: "Une copie JSON de ton profil et de tes réglages (Loi 25 / Apple / Google Play).",
	pushMaster: "Notifications push",
	pushMasterHint: "Messages, appels et demandes. Tu peux refuser ; WIPP fonctionne sans.",
	pushDenied: "Refusé dans les réglages de l’appareil.",
	pushOn: "Activées",
	pushOff: "Désactivées",
	pushPreview: "WIPP · Notifications activées",
	biometricsHint: "Verrouille WIPP quand tu quittes l’app. Face ID, Touch ID ou empreinte selon l’appareil.",
	biometricsUnlock: "Touche pour déverrouiller",
	biometricsUnlocking: "Reconnaissance…",
	lockTitle: "WIPP est verrouillé",
	communityRules: "Règles de la communauté",
	childSafety: "Sécurité des mineurs",
	childSafetyBody: "WIPP n’est pas pour les moins de 13 ans. Signale tout contenu impliquant un mineur. Nous coopérons avec les autorités lorsque la loi l’exige.",
	supportMail: "Écrire au support",
	webDelete: "Supprimer le compte depuis le web",
	reportAlsoBlock: "Bloquer aussi cette personne",
	reportUnderageHint: "Si un mineur est en danger, contacte aussi les services locaux. WIPP transmet le signalement à l’équipe de confiance.",
	testLock: "Tester le verrouillage",
	agePolicy: "Âge minimum",
	agePolicyBody: "WIPP est réservé aux 13 ans et plus. Au Québec, le consentement parental peut s’appliquer jusqu’à 14 ans. Les faux âges entraînent la suppression du compte.",
	communityRulesBody: "Pas de harcèlement, haine, spam, arnaques, nudité non consentie, ni contenu impliquant des mineurs. Signale. Bloque. On examine chaque signalement et on peut retirer un compte.",
	guidelinesContact: "Pour un signalement urgent :",
	hiddenReported: "Ce contenu a été masqué après ton signalement."
};
var en = {
	appName: "Wipp",
	tagline: "Connect your life.",
	start: "Get started",
	skip: "Skip",
	continue: "Continue",
	back: "Back",
	next: "Next",
	cancel: "Cancel",
	save: "Save",
	share: "Share",
	copy: "Copy",
	copied: "Copied",
	search: "Search",
	done: "Done",
	later: "Later",
	openDemo: "Open the demo",
	introTapSound: "Tap for sound",
	onb1Title: "Connect in",
	onb1Accent: "an instant.",
	onb1Body: "Bring your phones together, exchange Wipp codes and start chatting right away — no phone number needed.",
	onb2Title: "Your number stays",
	onb2Accent: "your business.",
	onb2Body: "Connect with your Wipp, your QR code, or your @username. You decide what you share.",
	onb3Title: "People are closer than",
	onb3Accent: "you think.",
	onb3Body: "Find someone nearby or across the world with a QR code, a username, or proximity.",
	onb4Title: "Connections that go",
	onb4Accent: "further.",
	onb4Body: "Bring your phones together, exchange Wipp codes and make a new connection — in an instant.",
	onbBrand: "Chat  ·  Share  ·  Discover",
	onbTapLeft: "Bring your phones close and connect!",
	onbTapRight: "Tap & Connect",
	onbFast: "Fast",
	onbSimple: "Simple",
	onbNoNumber: "No number",
	onbConnected: "Connected",
	onbWherever: "Wherever you are…",
	onbWorldChat: "The world within chat",
	onbNewMeetings: "New encounters",
	onbCityMtl: "Montreal",
	onbCityAbj: "Abidjan",
	onbCityPar: "Paris",
	onbCityNyc: "New York",
	onbYourId: "Your identity, your control",
	onbPrivacyFirst: "Privacy first",
	onbCardUser: "@username",
	onbCardUserHint: "Visible to everyone",
	onbCardPhone: "Private number",
	onbCardPhoneHint: "Always protected",
	onbCardPlace: "Your call",
	onbCardPlaceHint: "Share your location if you want",
	onbRealMeet: "Real encounters",
	onbJustWipp: "Just Wipp!",
	onbConnOk: "You're connected!",
	onbConnOkHint: "You can start chatting now.",
	onbOneTap: "A simple tap",
	onbExchange: "Exchange codes",
	onbStartChat: "Start chatting",
	signupTitle: "Create an account",
	signupSub: "Your number secures the account. It stays hidden.",
	firstName: "First name",
	lastName: "Last name",
	country: "Country",
	phone: "Phone number",
	email: "Email (optional)",
	birthday: "Date of birth",
	otpTitle: "Verification",
	otpBody: "Enter the code sent to",
	otpHint: "Demo code: 1234",
	otpError: "Incorrect code. Try 1234.",
	setupTitle: "Your Wipp profile",
	setupSub: "This is how people will find you.",
	displayName: "Display name",
	username: "Username",
	bio: "Short bio (optional)",
	discoverTitle: "Who can find my profile?",
	everyone: "Everyone",
	contacts: "My contacts",
	nobody: "Nobody",
	usernameTaken: "This @username is taken.",
	usernameOk: "Available",
	usernameHint: "3–20 characters, letters and numbers.",
	tabChats: "Chats",
	tabCalls: "Calls",
	tabConnect: "WIPP",
	tabExplore: "Explore",
	tabMe: "Me",
	wippConnectTitle: "WIPP Connect",
	wippConnectSub: "How do you want to connect?",
	wippTouchBadge: "The fastest way",
	wippTouchCard: "WIPP Touch",
	wippTouchCardHint: "Bring your phones together",
	wippTouchCardBody: "Connect instantly without sharing numbers.",
	wippScanCard: "Scan a QR",
	wippScanCardHint: "Scan someone’s WIPP",
	wippMyQrCard: "My QR",
	wippMyQrCardHint: "Show and share your WIPP",
	wippSearchCard: "Search",
	wippSearchCardHint: "Search an @username",
	wippNearbyCard: "Nearby",
	wippNearbyCardHint: "Discover WIPP around you",
	wippConnectFoot: "No need to ask for a number.",
	wippConnectFootEm: "Ask for their WIPP.",
	chatsEmpty: "No conversations yet.",
	chatsEmptySub: "Find someone with their Wipp.",
	connectCta: "Connect",
	newChat: "New conversation",
	requests: "Requests",
	archive: "Archive",
	delete: "Delete",
	mute: "Mute",
	unmute: "Unmute",
	markRead: "Read",
	markUnread: "Unread",
	silent: "Muted",
	searchPeople: "Name or @username",
	scanQr: "Scan a QR code",
	shareMyWgo: "Share my Wipp",
	wgoContacts: "Wipp contacts",
	createGroup: "Create a group",
	newCommunity: "New community",
	nearbyPeople: "People nearby",
	connectTitle: "How do you want to connect?",
	scan: "Scan",
	scanSub: "Scan a Wipp QR.",
	myQr: "My WIPP",
	myQrSub: "Show your card and QR.",
	searchCard: "Search",
	searchCardSub: "Search someone by @username.",
	nearby: "Nearby",
	nearbySub: "Only with consent.",
	wgoTouch: "Wipp Touch",
	wgoTouchSub: "Bring your phones close.",
	comingSoon: "Soon",
	visible5: "Visible 5 min",
	visible15: "Visible 15 min",
	invisible: "Invisible",
	nearbyOff: "You are invisible.",
	nearbyOn: "Visible nearby",
	nearbyHint: "Nobody appears unless they turned visibility on.",
	meters: "m",
	scanHint: "Point at a Wipp QR",
	scanAction: "Simulate a scan",
	foundTitle: "Profile found",
	connectWith: "Connect",
	message: "Message",
	connected: "Connected",
	requestSent: "Request sent",
	commonContacts: "mutual contacts",
	wantsToConnect: "wants to connect with you.",
	accept: "Accept",
	decline: "Decline",
	ignore: "Ignore",
	block: "Block",
	report: "Report",
	wantsToMessage: "wants to send you a message.",
	typeMessage: "Message",
	reply: "Reply",
	react: "React",
	copyMsg: "Copy",
	forward: "Forward",
	edit: "Edit",
	deleteMe: "Delete for me",
	deleteAll: "Delete for everyone",
	pin: "Pin",
	translate: "Translate",
	transcribe: "Transcribe",
	summarize: "Summarize",
	summarized: "Wipp summary",
	slideCancel: "Slide to cancel",
	lockedRec: "Recording locked",
	listen: "Listen",
	send: "Send",
	receiptSending: "Sending",
	receiptSent: "Sent",
	receiptDelivered: "Delivered",
	receiptRead: "Read",
	receiptFailed: "Failed. Tap to retry.",
	online: "online",
	members: "members",
	you: "You",
	photo: "Photo",
	video: "Video",
	voice: "Voice",
	document: "Document",
	contact: "Contact",
	location: "Location",
	stickers: "Stickers",
	stickerPack: "Wipp stickers",
	stickerTagline: "Express yourself the WIPP way!",
	stickerPackElle: "Her",
	stickerPackLui: "Him",
	stickerPackFun: "Fun",
	stickerSameVibe: "Same vibe. Different people.",
	sticker: "Sticker",
	stickerEmoji: "Emoji",
	stickerRecentEmpty: "Stickers and emoji you send show up here.",
	callsTitle: "Calls",
	all: "All",
	missed: "Missed",
	createCallLink: "Create a call link",
	incoming: "Incoming",
	outgoing: "Outgoing",
	callAgain: "Call back",
	muteMic: "Mic",
	speaker: "Speaker",
	addPerson: "Add",
	hangup: "End",
	camera: "Camera",
	flip: "Flip",
	connecting: "Connecting…",
	ringing: "Ringing…",
	inCall: "In call",
	callEnded: "Call ended",
	videoCall: "Video call",
	audioCall: "Voice call",
	answer: "Answer",
	declineCall: "Decline",
	incomingFrom: "is calling",
	wgoCall: "Wipp call",
	cameraOff: "Camera off",
	flipCam: "Flip",
	permDenied: "Camera or mic unavailable. The call continues without it.",
	newCall: "New call",
	joinCall: "Join",
	callLinkBody: "They join without a number. It’s a Wipp call.",
	receiveCall: "Receive a call",
	callMinimize: "Minimize",
	returnToCall: "Return to call",
	callPipHint: "Swipe down to shrink the call",
	callInProgress: "Call in progress",
	deleteCall: "Delete",
	yourStory: "Your story",
	stories: "Stories",
	listings: "Listings",
	contactOnWgo: "Message on Wipp",
	talkingAbout: "You’re talking about",
	categoryAuto: "Cars",
	categoryHome: "Homes",
	categoryJobs: "Jobs",
	categoryGoods: "Goods",
	categoryServices: "Services",
	shareWgo: "Share my Wipp",
	account: "Account",
	privacy: "Privacy",
	security: "Security",
	notifications: "Notifications",
	chatsSettings: "Chats",
	callsSettings: "Calls",
	appearance: "Appearance",
	language: "Language",
	accessibility: "Accessibility",
	accessibilityHint: "The finger confirms what the eye sees. Haptics, larger targets, bigger type.",
	hapticLang: "Tactile language",
	hapticTap: "Tap",
	hapticSend: "Send",
	hapticConnect: "Connect",
	haptics: "Haptic feedback",
	hapticsHint: "The phone vibrates for a tap, a send, or a WIPP Touch connection.",
	hapticsTest: "Test vibration",
	hapticsTestDone: "Three pulses — that’s the WIPP rhythm.",
	hapticsUnavailable: "No vibrator here — the gold flash shows the rhythm.",
	largeTouch: "Larger targets",
	largeTouchHint: "Bigger buttons, tabs and switches — easier to hit.",
	largeText: "Larger text",
	largeTextHint: "Enlarges titles, messages and labels.",
	reduceMotion: "Reduce motion",
	reduceMotionHint: "Turns off interface movement. Calmer, easier to read.",
	a11yOn: "On",
	a11yOff: "Off",
	close: "Close",
	wgoAi: "Wipp AI",
	devices: "Linked devices",
	storage: "Storage",
	help: "Help",
	invite: "Invite friends",
	signOut: "Sign out",
	resetDemo: "Reset demo",
	whoPhoto: "Who can see my photo?",
	whoBio: "Who can see my bio?",
	whoLast: "Who can see my last seen?",
	whoOnline: "Who can see when I’m online?",
	whoCall: "Who can call me?",
	whoRequest: "Who can send me a request?",
	whoGroup: "Who can add me to a group?",
	whoStories: "Who can see my stories?",
	whoPhone: "Who can find me by number?",
	whoUser: "Who can find me by @username?",
	nearbyVis: "Nearby visibility",
	pinCode: "PIN code",
	biometrics: "Face ID / Touch ID",
	twoFa: "Two-factor authentication",
	sessions: "Active sessions",
	remoteLogout: "Sign out remotely",
	ephemeral: "Disappearing messages",
	ephemeralPerChat: "Per chat",
	ephemeralPerChatHint: "In a chat, open the menu then Disappearing messages: 24 h or 7 days. A WIPP Touch chat vanishes on its own.",
	ephemeralCalls: "Ephemeral calls",
	ephemeralCallsHint: "The call is not written to history. Nothing to delete afterwards.",
	ephemeralCallOn: "Ephemeral",
	ephemeralCallOff: "Keep the call",
	ephemeralCallHint: "This call will not stay in Calls.",
	ephemeralCallForced: "Ephemeral chat: this call will not be saved.",
	viewOnce: "View once",
	viewOnceHint: "The photo or video opens once, then disappears.",
	viewOnceOpen: "Tap to view",
	viewOnceOpened: "Opened",
	e2e: "End-to-end encryption",
	e2eAlways: "Always on",
	e2eBanner: "Messages and calls are end-to-end encrypted. Tap to learn more.",
	e2eInfoTitle: "Encryption",
	e2eInfoBody: "Only you and this conversation have the keys. Wipp cannot open the content. Each message is sealed with AES-256-GCM.",
	e2eSafety: "Safety number",
	e2eSafetyHint: "Compare it in person. If it matches, nobody is in the middle.",
	e2eVerify: "Mark as verified",
	e2eVerified: "Verified",
	e2eUnverify: "Remove verification",
	e2eIdentity: "Identity key",
	e2eRotate: "New identity key",
	e2eRotateBody: "Messages already encrypted can no longer be opened. Without the old key, the content is gone. That's end-to-end.",
	e2eRotateConfirm: "Change key",
	e2eShowCipher: "Show ciphertext",
	e2eShowCipherHint: "What's actually stored — not the clear text.",
	e2eCipher: "Ciphertext",
	e2eCopyCipher: "Copy ciphertext",
	e2eFailed: "Can't decrypt",
	e2eFailedBody: "The key changed. The message stays unreadable.",
	e2eLocked: "Encrypted message",
	e2eCall: "Encrypted call",
	e2eAlg: "AES-256-GCM · ECDH P-256",
	e2eOn: "End-to-end encrypted",
	e2eContacts: "Verified contacts",
	e2eNoVerified: "No verified contacts yet.",
	e2ePlaceholder: "Encrypted message",
	e2eHow: "How it works",
	e2eHow1: "Each device has a P-256 identity key.",
	e2eHow2: "A conversation key is derived with ECDH. Wipp never sees it.",
	e2eHow3: "Each message is sealed with AES-256-GCM before it's stored.",
	e2eKeyChanged: "Key renewed. Older messages are unreadable.",
	e2eCompare: "Safety number",
	e2eBody: "Private chats are designed for end-to-end encryption.",
	themeLight: "Light",
	themeDark: "Dark",
	themeSystem: "System",
	french: "Français",
	english: "English",
	searchGlobal: "Search Wipp",
	searchHint: "Contacts, @username, messages, groups, listings",
	noResults: "No results",
	groupName: "Group name",
	groupDesc: "Description",
	participants: "Participants",
	create: "Create",
	blocked: "Blocked",
	reported: "Report sent",
	ignored: "Request ignored",
	unreadN: "new messages",
	storyReply: "Reply to story",
	addStory: "Add a story",
	storyText: "Text",
	publish: "Publish",
	privacyStory: "Who can see this",
	storyMusic: "Music",
	storyAddMusic: "Add music",
	storyMusicSearch: "Title or artist",
	storyNoMusic: "No tracks match that search.",
	storyMusicForYou: "For you",
	storyMusicTrending: "Trending",
	storyMusicChill: "Chill",
	storyMusicParty: "Party",
	storyMusicAfro: "Afro",
	storyMusicLofi: "Lo-fi",
	storyMusicRnb: "R&B",
	storyChangeMusic: "Change",
	storyRemoveMusic: "Remove music",
	aboutWgo: "Wipp replaces the phone number. Give your Wipp, not your number.",
	liveCode: "Wipp code",
	liveCodeSub: "60s to connect. Then the chat disappears.",
	oneTimeQr: "One-time QR",
	oneTimeQrSub: "One scan, then it burns.",
	myCode: "My code",
	enterCode: "Enter a code",
	codeExpires: "Expires in",
	codeExpired: "Code expired",
	regenerate: "New code",
	codeHint: "The code lasts 60 seconds. The chat expires later. No @ is revealed.",
	codeOwn: "That’s your own code.",
	codeNotFound: "No matching code.",
	codeUsed: "This QR was already used.",
	qrExpired: "This QR has expired.",
	simulateEntered: "Simulate: someone typed your code",
	demoCodeLea: "Use Léa’s code",
	onceTitle: "One-time QR",
	onceBody: "A single scan. Then it’s worthless. Your @ isn’t printed on it.",
	eventTitle: "Event QR",
	eventBody: "Valid until the time you choose. Night out, match, building.",
	createOnce: "Create a one-time QR",
	createEvent: "Create an event QR",
	eventName: "Event name",
	exp2h: "2 hours",
	expTonight: "Tonight",
	exp24h: "24 hours",
	onceBadge: "1 scan",
	eventBadge: "Event",
	qrBurned: "Used",
	introduce: "Introduce",
	introduceTitle: "Introduce someone",
	introduceSub: "They won’t see the @ until they accept.",
	pickPerson: "Who should I introduce?",
	introNote: "Note (optional)",
	sendIntro: "Send introduction",
	introSent: "Introduction sent",
	introBy: "Introduced by",
	someone: "Someone",
	usernameHidden: "@username hidden until accepted",
	intros: "Introductions",
	acceptIntro: "Accept and reveal",
	introAccepted: "You’re connected. No numbers were exchanged.",
	groupQr: "Group QR",
	groupQrBody: "Scan, copy the link, or send the QR. Never a number.",
	groupInfo: "Group",
	joinByQr: "Join by QR or Wipp link",
	noPhoneGroup: "No phone numbers are visible in this group.",
	noInviteLink: "The link opens Wipp — not WhatsApp, not a number.",
	joinedViaQr: "You joined via a Wipp link. No number was shared.",
	scanOnce: "One-time QR",
	scanGroup: "Group QR",
	scanProfile: "Profile QR",
	noPhoneListing: "No number",
	contactWgoOnly: "Contact on Wipp only",
	sellerPrivate: "The seller does not share a phone number.",
	phoneHiddenForever: "Wipp never shows a phone number on a listing.",
	joinThisGroup: "Join group",
	alreadyMember: "Already a member",
	youOnly: "visible only to you",
	foundViaCode: "Found via a Wipp code",
	foundViaQr: "Found via a one-time QR",
	foundViaIntro: "Introduced by a contact",
	foundViaNearby: "Found nearby",
	foundViaTouch: "Found with Wipp Touch",
	createdGroupQr: "Group created. Share the QR or the link — never a number.",
	membersHiddenPhone: "Members see an @, never a phone number.",
	introNoteSeed: "We ran into each other at the café by the metro. I think you’ll get along.",
	copyLink: "Copy link",
	shareGroupQr: "Send the QR",
	shareGroup: "Share group",
	openInWipp: "Open in Wipp?",
	openInWippBody: "This QR or link opens the group in Wipp, in the right place. No number is asked.",
	openWipp: "Open Wipp",
	holdQrHint: "Hold the QR — Wipp offers to open it.",
	groupInviteTitle: "Group invite",
	groupInviteBody: "Someone sent you this group. No number is asked.",
	groupLinkHint: "Paste this link in WhatsApp, Messages or Mail.",
	addGroupPhoto: "Add a photo",
	changeGroupPhoto: "Change group photo",
	linkInvalid: "This link no longer leads to a group.",
	joinedViaLink: "You joined via a Wipp link. No number was shared.",
	myGroups: "My groups",
	groupsEmpty: "No groups yet.",
	groupsEmptySub: "Create one. People join by QR or link — never a number.",
	openGroup: "Open group",
	chatTtl: "Chat length",
	ttl15: "15 min",
	ttl1h: "1 hour",
	ttl24h: "24 hours",
	codeVsPerm: "Permanent: your @ QR. Ephemeral: this code.",
	tempChat: "Temporary chat",
	tempChatEnded: "Chat ended",
	tempBanner: "No @, no number.",
	tempExpires: "Expires in",
	revealWgo: "Reveal my Wipp",
	simulateExpire: "Simulate chat ending",
	sealedTitle: "No access left",
	sealedBody: "This person no longer has your @, number, photo, or history. Nothing identifiable remains.",
	sealedKeeps: "They still have",
	sealedKeepsNone: "Nothing. No @, no number, no way to find you again.",
	sealedLost: "They no longer have",
	sealedLostList: "@username · number · photo · messages",
	firstNameOnly: "First name only",
	notAContact: "Not a contact",
	revealedWgo: "You revealed your Wipp. They’re a contact now.",
	tempOpened: "Temporary chat. No @ is visible. The thread disappears at the set time.",
	keepForever: "Keep as a contact",
	touchHint: "Bring the phones close. No number, no @ to spell out.",
	touchSearching: "A Wipp nearby…",
	touchContact: "Wipp",
	touchReveal: "Two Wipps found each other.",
	touchCta: "Bring close",
	touchHold: "Hold the phones together",
	touchVsPerm: "You’re only detectable while Wipp Touch is open.",
	touchHello: "Hey. We just crossed paths.",
	touchOpened: "You crossed paths. First name only. The thread disappears at the set time.",
	touchLive: "Ready",
	myCardHint: "Bring your phone close, or have them scan your QR.",
	touchPermTitle: "Detect nearby Wipps?",
	touchPermBody: "Wipp Touch only turns on when you open it. Nobody can look for you in the background.",
	touchAllow: "Allow",
	touchNeedBt: "Wipp Touch needs to detect people nearby.",
	touchEnable: "Turn on",
	touchDetected: "Wipp detected",
	touchWantsShare: "wants to share their Wipp with you.",
	touchRefuse: "Decline",
	touchWaiting: "Waiting for the other person…",
	touchConnected: "Connected!",
	touchAdded: "is now in your Wipp contacts.",
	touchBothOk: "You both accepted. No number was exchanged.",
	write: "Message",
	viewProfile: "View profile",
	touchFail: "Couldn’t detect the other phone.",
	touchScanQr: "Scan their QR",
	touchShowQr: "Show my QR",
	touchPick: "Several Wipps nearby. Choose one.",
	touchVisible: "Detectable while this screen is open.",
	exploreTitle: "Explore",
	tabListings: "Listings",
	tabUtilities: "Utilities",
	utilitiesHint: "Services around you. Not people.",
	locateMe: "Locate me",
	locating: "Locating…",
	locatedAround: "Around",
	locateFallback: "Estimated from your city.",
	locateDenied: "Location denied. Using your city.",
	locateHint: "Your location stays on device. It only sorts the list.",
	pharmaciesDuty: "On-duty pharmacies",
	pharmaciesDutyOnly: "On duty",
	pharmaciesAll: "All",
	onDuty: "On duty",
	onDutyUntil: "On duty until",
	open24h: "Open 24 hours",
	closedNow: "Closed",
	openUntil: "Open until",
	pharmacyPhone: "Pharmacy desk",
	directions: "Directions",
	callPharmacy: "Call",
	noDutyNearby: "No on-duty pharmacy around you.",
	civicNote: "This is a service, not a contact. No @ is shown.",
	locatedGps: "Current location",
	tabUtile: "Utility",
	tabShops: "Shops",
	tabLifestyle: "Lifestyle",
	shopsHint: "Businesses on Wipp. You message the shop’s @ — never a number.",
	searchShops: "Bakery, jeweller, café…",
	shopCatAll: "All",
	shopCatBakery: "Bakery",
	shopCatCafe: "Café",
	shopCatJewelry: "Jewelry",
	shopCatBeauty: "Beauty",
	shopCatHome: "Home",
	shopCatServices: "Services",
	shopCatNails: "Nails",
	shopCatHair: "Hair",
	shopCatRestaurant: "Restaurant",
	shopCatPlumbing: "Plumbing",
	shopCatRealty: "Real estate",
	onWgo: "On Wipp",
	featured: "Featured",
	noShops: "No shops for this search.",
	createShop: "Create my shop",
	myShop: "My shop",
	shopPlan: "Plan",
	planStarter: "$2 / month",
	planVitrine: "$5 / month",
	planPlus: "$10 / month",
	planStarterSub: "Your name shows up in search.",
	planVitrineSub: "Photo, hours, address. Still no phone number.",
	planPlusSub: "Featured. People see you first.",
	shopName: "Shop name",
	shopBio: "Short description",
	shopAddress: "Full address",
	shopHours: "Hours",
	publishShop: "Publish on Wipp",
	shopPublished: "Shop is live. People message you on Wipp.",
	messageShop: "Message on Wipp",
	shopNoPhone: "No front desk number. A message is enough.",
	shopHoursLabel: "Hours",
	talkingToShop: "You’re writing to the shop on Wipp. No number is exchanged.",
	youOwnShop: "This is your shop.",
	lifestyleHint: "Nights, concerts, promos. Nearest first. Contact over Wipp.",
	lifestyleEvent: "Event",
	lifestyleSpot: "Spot",
	lifestyleParty: "Night out",
	lifestyleConcert: "Concert",
	lifestylePromo: "Promo",
	lifestyleAll: "All",
	lifestyleNearFirst: "Nearest first",
	noLifestyle: "Nothing around for this filter.",
	lifestyleDeal: "Deal",
	messageHost: "Message the host",
	noHost: "No Wipp host — it’s a public place.",
	createCard: "Create my business card",
	myCard: "My business card",
	cardHint: "Public professional card. A pro @, a QR, a link. One inbox.",
	shopCode: "Shop code",
	shopCodeHint: "Show it or share it.",
	addBanner: "Photo or logo",
	addPhotos: "Photos",
	photosHint: "Up to 4, optional.",
	editCard: "Edit card",
	copyCode: "Copy link",
	shopHandle: "Professional Wipp handle",
	shopPhone: "Shop phone",
	shopCountry: "Country",
	shopCity: "City",
	shopProNote: "Clients see this identity, not your personal profile. Your personal number stays hidden.",
	viewCard: "View card",
	shopContext: "Shop",
	contactingShop: "You’re contacting",
	chatsAll: "All",
	chatsPersonal: "Personal",
	chatsShops: "Shops",
	chatsGroups: "Groups",
	shareCard: "Share",
	shopLink: "Wipp link",
	scanShop: "Shop card",
	callShop: "Call",
	scanToWrite: "Scan to message us on Wipp",
	shareMyCard: "Share my card",
	saveCard: "Save",
	savedCard: "Saved",
	aboutTab: "About",
	reviewsTab: "Reviews",
	shopServicesTab: "Services",
	shopEventsTab: "Events",
	morePhotos: "Photos",
	noReviews: "No reviews yet.",
	createLifestyle: "Create an event",
	eventHint: "Category, place, free or paid. You’re the host. Contact over Wipp.",
	lsTitle: "Title",
	eventWhen: "When",
	eventPlace: "Place",
	eventPaid: "Paid",
	eventFree: "Free",
	eventPrice: "Price",
	eventNote: "In one line",
	publishEvent: "Publish",
	pickImage: "Image",
	noBanner: "No image",
	youHostEvent: "You’re hosting this.",
	exploreAsk: "What are you looking for today?",
	exploreSplit: "Wipp is for writing. Here you discover what’s around you.",
	hubListings: "Classifieds",
	hubListingsSub: "Buy, sell, find.",
	hubServices: "Services",
	hubServicesSub: "What’s useful around you.",
	hubShops: "Shops",
	hubShopsSub: "Businesses near you.",
	hubEvents: "Events",
	hubEventsSub: "What’s on around you.",
	nearYou: "Near you",
	popularToday: "Popular today",
	newEvents: "New events",
	recommendedShops: "Recommended shops",
	searchNoResults: "Nothing around you for this search.",
	seeAll: "See all",
	resultsListings: "Classifieds",
	resultsServices: "Services",
	resultsShops: "Shops",
	resultsEvents: "Events",
	changePhoto: "Change photo",
	gallery: "Gallery",
	recents: "Recents",
	fromDevice: "From device",
	newPhotoStory: "New profile photo",
	viewedBy: "Viewed by",
	viewedByN: "views",
	noViews: "Nobody has seen this story yet.",
	storyLeft: "left",
	addPhotoStory: "Photo",
	addVideoStory: "Video",
	storyModeText: "Text",
	storyVideoMax: "1 min max",
	storyVideoTooLong: "That video is over 1 minute.",
	storyVideoFail: "Couldn’t open that video.",
	pickVideo: "Choose a video",
	storyTtl: "Disappears after",
	story24h: "24 h",
	story48h: "48 h",
	disappearing: "Disappearing messages",
	disappearingOff: "Off",
	disappearing24h: "24 hours",
	disappearing7d: "7 days",
	disappearingOn: "On",
	disappearingBanner: "New messages will disappear from this chat.",
	disappearingHint: "Messages already sent stay. Only new ones fade away.",
	disappearOffSys: "Disappearing messages are off.",
	disappear24hSys: "Messages will disappear after 24 hours.",
	disappear7dSys: "Messages will disappear after 7 days.",
	readReceipts: "Read receipts",
	readReceiptsHint: "Turn them off and you won’t send blue ticks — or see anyone else’s.",
	photoPublished: "Photo posted to your story",
	pickPhoto: "Choose a photo",
	usePhoto: "Use this photo",
	storyExpired: "This story has disappeared.",
	views: "Views",
	editProfile: "Edit profile",
	myActivity: "My activity",
	myCardSub: "Share your WIPP",
	myListings: "My listings",
	myListingsSub: "Manage your ads",
	myEvents: "My events",
	myEventsSub: "Create and manage",
	saved: "Saved",
	savedSub: "Your favorites",
	myWipp: "My WIPP",
	preferences: "Preferences",
	devicesHelp: "Devices & help",
	goodVibes: "Good Vibes Only",
	footerTagline: "Closer, everywhere.",
	appVersion: "Version 1.0.0",
	inviteReward: "Earn rewards",
	statContacts: "Contacts",
	statGroups: "Groups",
	statEvents: "Events",
	statListings: "Listings",
	noListings: "No listings yet.",
	noEvents: "No events yet.",
	noSaved: "Nothing saved yet.",
	city: "City",
	termsOfUse: "Terms of Use",
	privacyPolicy: "Privacy Policy",
	legalAcceptLead: "I have read and accept the",
	legalAnd: "and the",
	legalAcceptAge: "I confirm I am old enough in my territory.",
	legalNeedAccept: "Check the box to create an account.",
	legalTooYoung: "WIPP is not for children under 13.",
	legalUpdated: "Updated",
	legalContact: "Questions:",
	legalCloseHint: "Close to return to sign-up.",
	authTagline: "Chat · Share · Discover",
	signupHeroTitle: "Create your",
	signupHeroBody: "One account to talk, share and discover everything that matters to you.",
	alreadyAccount: "Already have an account?",
	signIn: "Log in",
	or: "or",
	loginHero: "Welcome back",
	loginSub: "Enter your number to open your WIPP.",
	signupGiveWipp: "Give me your WIPP",
	stepAccount: "Your account",
	stepIdentity: "Your WIPP identity",
	phonePrivate: "Your number stays private on WIPP. It only secures your account.",
	legalAcceptShort: "I have read and accept the",
	legalOfWipp: "of WIPP.",
	trustSecure: "Secure",
	trustPrivate: "Private number",
	trustOne: "One connection",
	joinCommunity: "Join a community that feels like you.",
	setupHeroTitle: "Personalize",
	setupHeroYou: "your",
	setupHeroBody: "Add a photo, a username and a few details so people can find you.",
	profilePhoto: "Profile photo",
	usernameWipp: "WIPP username",
	usernameHintSetup: "This is how people will find you on WIPP. You can change it later.",
	bioOptional: "Bio (optional)",
	genderOptional: "Gender (optional)",
	genderUnspecified: "Prefer not to say",
	genderWoman: "Woman",
	genderMan: "Man",
	genderNb: "Non-binary",
	createMyWipp: "Create my WIPP",
	authFootChat: "Chat without limits",
	authFootConnect: "Connect with great people",
	authFootExplore: "Explore opportunities",
	authCloser: "The world is closer on WIPP",
	otpHero: "Verify your number",
	reportTitle: "Report",
	reportBody: "Why are you reporting this? WIPP reviews every report.",
	reportSpam: "Spam",
	reportHarass: "Harassment or bullying",
	reportHate: "Hate or discrimination",
	reportFake: "Impersonation / fake account",
	reportScam: "Scam or fraud",
	reportSexual: "Non-consensual sexual content",
	reportUnderage: "Minor at risk",
	reportOther: "Other",
	reportSend: "Submit report",
	reportThanks: "Thanks. Our trust team will review this.",
	blockConfirm: "Block this person? They won’t be able to message or find you.",
	blockNow: "Block",
	unblock: "Unblock",
	blockedList: "Blocked accounts",
	blockedEmpty: "Nobody is blocked.",
	signOutConfirm: "You can sign back in with your number.",
	deleteAccount: "Delete my account",
	deleteAccountBody: "This is permanent. Your profile, messages on this device, listings and Stories will be deleted. Copies already received by others may remain with them.",
	deleteAccountWarn: "Type DELETE to confirm.",
	deleteWord: "DELETE",
	deleteAccountCta: "Delete permanently",
	deleteNeedWord: "The word doesn’t match.",
	downloadData: "Download my data",
	downloadDataHint: "A JSON copy of your profile and settings (Law 25 / Apple / Google Play).",
	pushMaster: "Push notifications",
	pushMasterHint: "Messages, calls and requests. You can refuse; WIPP still works.",
	pushDenied: "Denied in device settings.",
	pushOn: "On",
	pushOff: "Off",
	pushPreview: "WIPP · Notifications on",
	biometricsHint: "Lock WIPP when you leave the app. Face ID, Touch ID or fingerprint, depending on the device.",
	biometricsUnlock: "Tap to unlock",
	biometricsUnlocking: "Recognizing…",
	lockTitle: "WIPP is locked",
	communityRules: "Community guidelines",
	childSafety: "Child safety",
	childSafetyBody: "WIPP is not for children under 13. Report any content involving a minor. We cooperate with authorities when the law requires it.",
	supportMail: "Email support",
	webDelete: "Delete account on the web",
	reportAlsoBlock: "Also block this person",
	reportUnderageHint: "If a minor is at risk, also contact local services. WIPP forwards the report to the trust team.",
	testLock: "Try lock screen",
	agePolicy: "Minimum age",
	agePolicyBody: "WIPP is for ages 13 and up. In Québec, parental consent may apply until 14. Fake ages lead to account deletion.",
	communityRulesBody: "No harassment, hate, spam, scams, non-consensual nudity, or content involving minors. Report. Block. We review every report and can remove an account.",
	guidelinesContact: "For an urgent report:",
	hiddenReported: "This content was hidden after your report."
};
var SHOP_CAT_KEYS = {
	nails: "shopCatNails",
	hair: "shopCatHair",
	beauty: "shopCatBeauty",
	restaurant: "shopCatRestaurant",
	plumbing: "shopCatPlumbing",
	realty: "shopCatRealty",
	bakery: "shopCatBakery",
	cafe: "shopCatCafe",
	jewelry: "shopCatJewelry",
	home: "shopCatHome",
	services: "shopCatServices"
};
var dict = {
	fr,
	en
};
function t(lang, key) {
	return dict[lang][key];
}
var LEGAL_VERSION = "2026-09-21";
var LEGAL_CONTACT = "lazoneclient@gmail.com";
var DOCS = {
	fr: {
		privacy: {
			title: "Politique de confidentialité",
			updated: "21 septembre 2026",
			intro: "Cette politique explique comment WIPP, exploité au Canada par DeeDigital et, pour les activités concernées en Afrique, par Dee Digital Group, recueille, utilise, communique, conserve et supprime vos renseignements personnels. Contact : lazoneclient@gmail.com.",
			sections: [
				{
					title: "1. Principes",
					paragraphs: ["Nous limitons la collecte à ce qui est nécessaire. Les paramètres de confidentialité sont, lorsque la loi l’exige, au niveau le plus élevé par défaut. Caméra, micro, photos, localisation, contacts, Bluetooth et notifications ne sont demandés qu’au moment où une fonction en a besoin. Vous pouvez refuser ou retirer une permission dans les réglages de l’appareil."]
				},
				{
					title: "2. Renseignements que nous pouvons traiter",
					paragraphs: [
						"Compte : nom, prénom, date de naissance, nom d’utilisateur, numéro de téléphone, courriel, pays, ville, photo, biographie.",
						"Sécurité : identifiants techniques, jetons de session, appareils, journaux de connexion et mesures anti-fraude.",
						"Communications : messages, pièces jointes, stickers, réactions, appels audio/vidéo et métadonnées d’acheminement (heure, durée, appels manqués). Lorsque le chiffrement de bout en bout s’applique, le contenu n’est lisible que par les participants autorisés.",
						"Social : Stories (photos et vidéos d’au plus une minute, y compris une musique superposée), groupes, demandes de connexion, QR, liens d’invitation.",
						"Explorer : annonces, cartes Boutiques, événements, avis, photos et informations volontairement publiées.",
						"Localisation, contacts et carnet d’adresses uniquement si vous activez la fonction concernée.",
						"Stockage local : certains réglages, clés de chiffrement et brouillons peuvent rester sur votre appareil.",
						"Signalements et assistance : le contenu que vous nous transmettez pour un litige, un abus ou le support."
					]
				},
				{
					title: "3. Finalités",
					paragraphs: ["Créer et sécuriser le compte; fournir messagerie, appels, groupes et Stories; permettre les connexions par @username, QR, lien ou WIPP Touch; afficher Explorer; envoyer les notifications que vous autorisez; prévenir fraude, spam, harcèlement et usurpation; traiter les signalements; diagnostiquer les pannes; respecter la loi; améliorer la fiabilité du service.", "Un consentement distinct est demandé pour toute finalité non essentielle, notamment une publicité ciblée — que WIPP n’active pas à ce jour."]
				},
				{
					title: "4. Chiffrement de bout en bout — et ses limites",
					paragraphs: [
						"Les conversations privées prises en charge par le système E2EE de WIPP sont chiffrées. WIPP ne conserve pas les clés privées de manière à lire ces messages.",
						"Le E2EE ne couvre pas : profils publics, Stories publiques, annonces, Boutiques, événements, listes de membres de groupe, métadonnées techniques, ni un contenu que vous copiez, transférez ou capturez.",
						"Une capture d’écran, un enregistrement d’écran, un mini-lecteur système (PiP) ou un appareil compromis peut révéler un contenu autrement chiffré. Les messages éphémères disparaissent de WIPP selon le délai choisi; ils ne empêchent pas un destinataire de les photographier.",
						"Si vous signalez un message, les éléments nécessaires à l’examen peuvent être transmis à WIPP."
					]
				},
				{
					title: "5. Appels, caméra, micro et mini-lecteur",
					paragraphs: [
						"Un appel utilise caméra et/ou microphone avec votre permission. WIPP et son fournisseur d’appels (LiveKit) traitent le flux technique nécessaire à l’acheminement. WIPP n’enregistre pas vos appels.",
						"Si vous quittez l’application pendant un appel, le système d’exploitation peut afficher un mini-lecteur ou un indicateur (point vert, pastille). Cela fait partie de l’appareil, pas d’une publication WIPP.",
						"Il est interdit d’enregistrer un appel ou de le diffuser sans le consentement requis par la loi applicable."
					]
				},
				{
					title: "6. WIPP Touch, QR, groupes et liens",
					paragraphs: [
						"WIPP Touch privilégie des jetons temporaires. La proximité de deux téléphones n’est jamais un consentement : chaque personne accepte ou refuse.",
						"Un QR ou un lien de groupe peut être partagé hors de WIPP. Quiconque le reçoit peut tenter de rejoindre le groupe. L’administrateur est responsable des invitations qu’il diffuse.",
						"La découvrabilité Bluetooth s’arrête lorsque vous quittez la fonction, sous réserve des capacités de l’appareil."
					]
				},
				{
					title: "7. Localisation, cartes et Google Maps",
					paragraphs: ["À proximité, Services, pharmacies, itinéraires et cartes peuvent utiliser une position approximative ou précise, seulement après autorisation. Google Maps Platform peut traiter des données techniques selon ses propres politiques. WIPP n’est pas un service d’urgence."]
				},
				{
					title: "8. Contacts",
					paragraphs: ["L’accès au carnet d’adresses est facultatif et séparé. Le refus n’empêche pas le reste de WIPP. Les numéros ne sont utilisés que pour retrouver ou inviter, pas pour les vendre ni pour du démarchage WIPP."]
				},
				{
					title: "9. Informations publiques",
					paragraphs: ["Ce que vous publiez (photo, bio, @username, Story, annonce, Boutique, événement) peut être vu selon vos réglages, y compris par des personnes hors de vos contacts. Ne publiez pas ce que vous voulez garder secret."]
				},
				{
					title: "10. Fournisseurs",
					paragraphs: [
						"Supabase : compte, base de données, stockage, temps réel.",
						"LiveKit : appels audio/vidéo.",
						"Google Maps Platform : cartes et lieux.",
						"Magasins d’applications Apple et Google : distribution, achats éventuels, notifications.",
						"Musique superposée aux Stories : le fournisseur de licences musicales, le cas échéant, peut recevoir des identifiants techniques d’écoute in-app. Cette musique n’est pas téléchargeable ni réutilisable hors WIPP.",
						"WIPP ne vend pas vos renseignements. Pas de publicité ciblée tierce à ce jour. Un changement important sera annoncé et, si la loi l’exige, soumis à un nouveau consentement."
					]
				},
				{
					title: "11. Transferts, conservation, suppression",
					paragraphs: [
						"Des fournisseurs peuvent traiter des données hors du Québec, du Canada ou de votre pays. Lorsque la loi l’exige, WIPP met en place des mesures contractuelles et techniques avant ces transferts.",
						"Conservation limitée aux finalités, à la sécurité, aux litiges et aux obligations légales. Exemples indicatifs : compte tant qu’il est actif; Stories selon la durée choisie (24 h ou 48 h); messages éphémères selon le délai du chat; journaux de sécurité jusqu’à 12 mois; signalements le temps de l’examen.",
						"Vous pouvez supprimer le compte depuis Moi > Compte > Supprimer mon compte. Une ressource Web sera aussi offerte pour les exigences Apple et Google Play. Une désactivation n’équivaut pas à une suppression."
					]
				},
				{
					title: "12. Vos droits",
					paragraphs: ["Selon votre territoire : accès, rectification, suppression, retrait de consentement, portabilité lorsque le droit le permet, et plainte. Au Québec : Commission d’accès à l’information. Au Canada : Commissariat à la protection de la vie privée. Courriel : lazoneclient@gmail.com. Nous pouvons vérifier votre identité avant de répondre."]
				},
				{
					title: "13. Mineurs",
					paragraphs: ["WIPP n’est pas destiné aux enfants de moins de 13 ans. Au Québec, les renseignements d’un mineur de moins de 14 ans ne sont pas recueillis auprès de lui sans le titulaire de l’autorité parentale, sauf exception légale. Un compte créé en violation de ces règles peut être supprimé."]
				},
				{
					title: "14. Sécurité, modération, modifications",
					paragraphs: [
						"Mesures raisonnables : contrôle d’accès, chiffrement, sessions, détection d’abus. Aucun service n’est infaillible. En cas d’incident, WIPP évalue, réduit les risques et notifie selon la loi (Loi 25 / PIPEDA).",
						"WIPP n’effectue pas de profilage publicitaire ni de décision automatisée produisant des effets juridiques à votre égard, hors filtres anti-spam et anti-abus.",
						"Les mises à jour importantes de cette politique seront indiquées dans l’application. Version 2026-09-21."
					]
				}
			]
		},
		terms: {
			title: "Conditions d’utilisation",
			updated: "21 septembre 2026",
			intro: "En créant un compte WIPP, vous acceptez ces Conditions et reconnaissez avoir lu la Politique de confidentialité. Exploitants : DeeDigital (Canada) et Dee Digital Group (activités concernées en Afrique). Contact : lazoneclient@gmail.com.",
			sections: [
				{
					title: "1. Le service",
					paragraphs: ["WIPP est une plateforme de messagerie, d’appels, de groupes, de Stories, de stickers et de découverte (annonces, Boutiques, Services, événements). Des fonctions peuvent être ajoutées ou retirées."]
				},
				{
					title: "2. Admissibilité",
					paragraphs: ["Vous déclarez avoir l’âge légal requis dans votre territoire, et au moins 13 ans. Au Québec, un mineur de moins de 14 ans ne s’inscrit pas sans le titulaire de l’autorité parentale. Un compte, une personne. Informations exactes. Vous protégez l’accès à votre appareil."]
				},
				{
					title: "3. Compte et interdictions",
					paragraphs: ["Interdit : usurper une identité (personne, boutique, organisation); vendre un compte; contourner la sécurité; extraire, scraper ou automatiser WIPP; harceler, menacer, doxxer; spam; fraude; malware; contenu sexuel impliquant un mineur; discours haineux; arme, drogue, bien volé ou contrefait; non-consensual intimate imagery; enregistrement d’un appel sans consentement légal."]
				},
				{
					title: "4. Communications, E2EE, éphémère",
					paragraphs: ["Les chats privés supportés par l’E2EE sont chiffrés. Vous ne contournez pas la crypto. Les espaces publics ne sont pas E2EE.", "Un message qui « disparaît » n’est pas une garantie d’oubli chez le destinataire (captures, appareils, sauvegardes). Vous restez responsable de ce que vous envoyez."]
				},
				{
					title: "5. Votre contenu",
					paragraphs: ["Vous gardez vos droits. Vous accordez à WIPP une licence mondiale, non exclusive, sans redevance, limitée à l’hébergement, l’affichage et la transmission selon vos réglages. Pas de transfert de propriété. La licence cesse à la suppression, sous réserve des copies déjà reçues par d’autres, des sauvegardes techniques et de la loi.", "Vous garantissez avoir le droit de publier chaque photo, vidéo, musique, logo et texte — y compris le droit à l’image des personnes filmées ou photographiées."]
				},
				{
					title: "6. Stickers, musique, création",
					paragraphs: ["Les stickers, animations, logo et identité WIPP appartiennent à WIPP ou à ses concédants. Pas de revente, extraction ni usage hors de l’app sans autorisation.", "La musique dans une Story est licenciée pour une diffusion in-app seulement. Pas de téléchargement, de remix commercial ni de republication hors WIPP."]
				},
				{
					title: "7. Groupes, QR et WIPP Touch",
					paragraphs: ["L’admin d’un groupe est responsable des membres qu’il invite et des liens/QR qu’il partage. La proximité n’est pas un consentement. Interdit d’utiliser Touch, QR ou la localisation pour suivre ou harceler quelqu’un."]
				},
				{
					title: "8. Annonces, Boutiques, événements — WIPP n’est pas partie",
					paragraphs: [
						"Sauf mention contraire, WIPP est un outil de mise en relation. Nous ne sommes ni vendeur, ni acheteur, ni mandataire, ni séquestre, ni organisateur, ni assureur. Pas de paiement, d’escrow ni de garantie d’état des biens dans WIPP à ce jour.",
						"Vous vérifiez avant de rencontrer quelqu’un, de payer ou de vous déplacer. Les professionnels sont responsables de leurs permis, taxes, mentions légales et offres.",
						"Une fiche Boutique n’est pas une certification WIPP. Usurper une entreprise est interdit.",
						"Pharmacies, horaires et infos locales peuvent être inexactes. En urgence, composez les services officiels — jamais WIPP."
					]
				},
				{
					title: "9. Appels et disponibilité",
					paragraphs: ["La qualité d’un appel dépend du réseau et de l’appareil. WIPP ne garantit pas une ligne d’urgence, ni une disponibilité continue. Maintenance, pannes et cas de force majeure peuvent interrompre le service.", "Le service est fourni « tel quel », dans la mesure permise par la loi. Rien ici n’enlève les droits impératifs d’un consommateur, notamment au Québec (LPC)."]
				},
				{
					title: "10. Modération",
					paragraphs: ["Vous pouvez signaler et bloquer. WIPP peut retirer un contenu, limiter une fonction ou fermer un compte en cas de violation, de risque ou d’obligation légale. Un réexamen peut être demandé à lazoneclient@gmail.com, sauf urgence ou illégalité manifeste."]
				},
				{
					title: "11. Responsabilité, indemnisation, litiges",
					paragraphs: [
						"Vous êtes responsable de vos interactions. WIPP n’est pas responsable des actes d’un autre utilisateur, dans la mesure permise par la loi.",
						"Un utilisateur professionnel peut, si la loi le permet, indemniser WIPP des réclamations liées à ses offres. Cette clause ne s’applique pas au consommateur lorsqu’elle lui est inopposable.",
						"Lois impératives de votre territoire d’abord. Pour DeeDigital, droit du Québec et du Canada, tribunaux compétents du Québec, sans priver un consommateur de son for légal. La version française prévaut en cas de divergence pour les utilisateurs au Québec."
					]
				},
				{
					title: "12. Divers",
					paragraphs: [
						"WIPP peut modifier ces Conditions. Les changements importants seront présentés dans l’app; une nouvelle acceptation sera demandée si la loi l’exige.",
						"Si une clause est invalide, le reste demeure. Les clauses de propriété intellectuelle, limitation, indemnisation et litiges survivent à la fermeture du compte.",
						"Pas de cession de votre compte. WIPP peut céder le service à une entité du même groupe ou à un successeur, avec information si la loi l’exige.",
						"Version 2026-09-21."
					]
				}
			]
		}
	},
	en: {
		privacy: {
			title: "Privacy Policy",
			updated: "21 September 2026",
			intro: "This policy explains how WIPP — operated in Canada by DeeDigital and, for relevant activities in Africa, by Dee Digital Group — collects, uses, shares, keeps and deletes personal information. Contact: lazoneclient@gmail.com.",
			sections: [
				{
					title: "1. Principles",
					paragraphs: ["We collect only what we need. Privacy settings default to the highest level where the law requires it. Camera, mic, photos, location, contacts, Bluetooth and notifications are requested only when a feature needs them. You can refuse or revoke them in device settings."]
				},
				{
					title: "2. Information we may process",
					paragraphs: [
						"Account: name, birthday, username, phone, email, country, city, photo, bio.",
						"Security: technical IDs, session tokens, devices, sign-in logs, anti-fraud signals.",
						"Communications: messages, attachments, stickers, reactions, audio/video calls and routing metadata (time, duration, missed calls). Where end-to-end encryption applies, content is readable only by authorised participants.",
						"Social: Stories (photos and videos up to one minute, including overlay music), groups, connection requests, QR codes, invite links.",
						"Explorer: listings, shop cards, events, reviews and anything you choose to publish.",
						"Location and address book only if you turn the related feature on.",
						"On-device storage: settings, encryption keys and drafts may stay on your phone.",
						"Reports and support: what you send us about abuse or help requests."
					]
				},
				{
					title: "3. Purposes",
					paragraphs: ["Create and secure the account; provide chat, calls, groups and Stories; connect people via @username, QR, link or WIPP Touch; run Explorer; send notifications you allow; prevent fraud, spam, harassment and impersonation; handle reports; diagnose outages; comply with law; keep the service reliable.", "A separate consent is required for any non-essential purpose, including targeted ads — which WIPP does not run today."]
				},
				{
					title: "4. End-to-end encryption — and its limits",
					paragraphs: [
						"Private chats covered by WIPP’s E2EE are encrypted. WIPP does not keep private keys in a way that lets it read those messages.",
						"E2EE does not cover public profiles, public Stories, listings, shops, events, group member lists, technical metadata, or content you copy, forward or screenshot.",
						"A screenshot, screen recording, system picture-in-picture tile or a compromised device can reveal otherwise encrypted content. Disappearing messages leave WIPP after the delay you set; they do not stop someone from photographing them.",
						"If you report a message, the pieces needed to review it may be sent to WIPP."
					]
				},
				{
					title: "5. Calls, camera, mic and mini player",
					paragraphs: [
						"A call uses camera and/or microphone with your permission. WIPP and its call provider (LiveKit) handle the technical stream. WIPP does not record your calls.",
						"If you leave the app during a call, the operating system may show a mini player or a status indicator. That is the device, not a WIPP post.",
						"Recording or broadcasting a call without the consent required by law is prohibited."
					]
				},
				{
					title: "6. WIPP Touch, QR, groups and links",
					paragraphs: [
						"WIPP Touch prefers short-lived tokens. Two phones being close is never consent — each person accepts or declines.",
						"A group QR or link can be shared outside WIPP. Anyone who gets it may try to join. Admins are responsible for the invites they spread.",
						"Bluetooth discoverability stops when you leave the feature, subject to the device."
					]
				},
				{
					title: "7. Location, maps and Google Maps",
					paragraphs: ["Nearby, Services, pharmacies, directions and maps may use approximate or precise location after permission. Google Maps Platform may process technical data under its own policies. WIPP is not emergency services."]
				},
				{
					title: "8. Contacts",
					paragraphs: ["Address-book access is optional and separate. Refusing it does not block the rest of WIPP. Numbers are only used to find or invite people — not sold, not used for WIPP cold outreach."]
				},
				{
					title: "9. Public information",
					paragraphs: ["What you publish (photo, bio, @username, Story, listing, shop, event) may be seen according to your settings, including by people who are not your contacts. Do not publish what you want to keep private."]
				},
				{
					title: "10. Providers",
					paragraphs: [
						"Supabase: account, database, storage, realtime.",
						"LiveKit: audio/video calls.",
						"Google Maps Platform: maps and places.",
						"Apple and Google app stores: distribution, future purchases, notifications.",
						"Story music: a licensing provider may receive in-app playback technical IDs. That music is not downloadable or reusable outside WIPP.",
						"WIPP does not sell your information. No third-party targeted ads today. A material change will be announced and, if required, a new consent will be collected."
					]
				},
				{
					title: "11. Transfers, retention, deletion",
					paragraphs: [
						"Providers may process data outside Québec, Canada or your country. Where the law requires it, WIPP puts contractual and technical safeguards in place first.",
						"We keep data only for the stated purposes, security, disputes and legal duties. Indicative periods: account while active; Stories for the duration you choose (24 h or 48 h); disappearing messages per the chat timer; security logs up to 12 months; reports for the time needed to review them.",
						"You can delete your account in Me > Account > Delete my account. A web path will also be offered for Apple and Google Play rules. Deactivation is not deletion."
					]
				},
				{
					title: "12. Your rights",
					paragraphs: ["Depending on where you live: access, correction, deletion, withdrawing consent, portability where the law allows, and the right to complain. Québec: Commission d’accès à l’information. Canada: Office of the Privacy Commissioner. Email: lazoneclient@gmail.com. We may verify your identity first."]
				},
				{
					title: "13. Minors",
					paragraphs: ["WIPP is not for children under 13. In Québec, personal information of a minor under 14 is not collected from them without the holder of parental authority, except as the law allows. An account that breaks these rules may be deleted."]
				},
				{
					title: "14. Security, moderation, changes",
					paragraphs: [
						"Reasonable measures: access control, encryption, sessions, abuse detection. No service is unbreakable. After an incident, WIPP assesses, reduces harm and notifies as required (Law 25 / PIPEDA).",
						"WIPP does not run advertising profiling or automated decisions with legal effects about you, aside from spam and abuse filters.",
						"Material updates to this policy will appear in the app. Version 2026-09-21."
					]
				}
			]
		},
		terms: {
			title: "Terms of Use",
			updated: "21 September 2026",
			intro: "By creating a WIPP account you accept these Terms and confirm you have read the Privacy Policy. Operators: DeeDigital (Canada) and Dee Digital Group (relevant activities in Africa). Contact: lazoneclient@gmail.com.",
			sections: [
				{
					title: "1. The service",
					paragraphs: ["WIPP is a platform for messaging, calls, groups, Stories, stickers and discovery (listings, shops, services, events). Features may be added or removed."]
				},
				{
					title: "2. Eligibility",
					paragraphs: ["You state that you are old enough in your territory, and at least 13. In Québec, a minor under 14 does not sign up without the holder of parental authority. One person, one account. Accurate information. You keep your device secure."]
				},
				{
					title: "3. Account and prohibited uses",
					paragraphs: ["You may not: impersonate a person, shop or organisation; sell an account; bypass security; scrape or automate WIPP; harass, threaten or doxx; spam; defraud; distribute malware; share sexual content involving a minor; hate speech; weapons, drugs, stolen or counterfeit goods; non-consensual intimate imagery; record a call without legally required consent."]
				},
				{
					title: "4. Communications, E2EE, disappearing messages",
					paragraphs: ["Private chats covered by E2EE are encrypted. You do not bypass the crypto. Public spaces are not E2EE.", "A message that “disappears” is not a promise it is gone from the recipient’s world (screenshots, devices, backups). You remain responsible for what you send."]
				},
				{
					title: "5. Your content",
					paragraphs: ["You keep your rights. You grant WIPP a worldwide, non-exclusive, royalty-free licence limited to hosting, displaying and transmitting according to your settings. No transfer of ownership. The licence ends on deletion, subject to copies already received by others, technical backups and the law.", "You warrant you have the rights to every photo, video, track, logo and text you post — including image rights of people you film or photograph."]
				},
				{
					title: "6. Stickers, music, creative tools",
					paragraphs: ["WIPP stickers, animations, logo and identity belong to WIPP or its licensors. No resale, extraction or out-of-app use without permission.", "Music on a Story is licensed for in-app playback only. No download, commercial remix or reposting outside WIPP."]
				},
				{
					title: "7. Groups, QR and WIPP Touch",
					paragraphs: ["A group admin is responsible for the members they invite and the links/QR they share. Proximity is not consent. You may not use Touch, QR or location to stalk or harass anyone."]
				},
				{
					title: "8. Listings, shops, events — WIPP is not a party",
					paragraphs: [
						"Unless we say otherwise, WIPP is a matching tool. We are not the seller, buyer, agent, escrow, organiser or insurer. No in-app payments, escrow or condition guarantee for goods today.",
						"You check before you meet, pay or travel. Professionals are responsible for their permits, taxes, legal notices and offers.",
						"A shop card is not a WIPP certification. Impersonating a business is forbidden.",
						"Pharmacies, hours and local info can be wrong. In an emergency, call official services — never WIPP."
					]
				},
				{
					title: "9. Calls and availability",
					paragraphs: ["Call quality depends on the network and the device. WIPP is not an emergency line and does not promise uninterrupted service. Maintenance, outages and force majeure may interrupt it.", "The service is provided “as is”, to the extent the law allows. Nothing here takes away mandatory consumer rights, including in Québec (CPA)."]
				},
				{
					title: "10. Moderation",
					paragraphs: ["You can report and block. WIPP may remove content, limit a feature or close an account for a breach, a safety risk or a legal duty. You may ask for a review at lazoneclient@gmail.com, except in emergencies or clear illegality."]
				},
				{
					title: "11. Liability, indemnity, disputes",
					paragraphs: [
						"You are responsible for your interactions. WIPP is not liable for another user’s acts, to the extent the law allows.",
						"A professional user may, if the law allows, indemnify WIPP for claims tied to their offers. That clause does not apply to a consumer where it would be unenforceable.",
						"Mandatory local law first. For DeeDigital: laws of Québec and Canada, courts of Québec, without stripping a consumer of their legal forum. The French version prevails for users in Québec if the texts diverge."
					]
				},
				{
					title: "12. Other",
					paragraphs: [
						"WIPP may update these Terms. Material changes will appear in the app; a new acceptance will be requested if the law requires it.",
						"If one clause is invalid, the rest stays. IP, limitation, indemnity and dispute clauses survive account closure.",
						"You may not assign your account. WIPP may assign the service to a group entity or a successor, with notice if the law requires it.",
						"Version 2026-09-21."
					]
				}
			]
		}
	}
};
function legalDoc(lang, id) {
	return DOCS[lang][id];
}
function yearsOld(isoDate) {
	if (!isoDate) return 0;
	const born = new Date(isoDate);
	if (Number.isNaN(born.getTime())) return 0;
	const now = /* @__PURE__ */ new Date();
	let age = now.getFullYear() - born.getFullYear();
	const m = now.getMonth() - born.getMonth();
	if (m < 0 || m === 0 && now.getDate() < born.getDate()) age -= 1;
	return age;
}
var FR = "fr-CA";
var EN = "en-US";
function loc(lang) {
	return lang === "fr" ? FR : EN;
}
function startOfDay(ts) {
	const d = new Date(ts);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}
function isToday(ts, now = Date.now()) {
	return startOfDay(ts) === startOfDay(now);
}
function isYesterday(ts, now = Date.now()) {
	return startOfDay(ts) === startOfDay(now) - 864e5;
}
function isThisWeek(ts, now = Date.now()) {
	const day = (new Date(now).getDay() + 6) % 7;
	const monday = startOfDay(now) - day * 864e5;
	const t = startOfDay(ts);
	return t >= monday && t < monday + 6048e5;
}
function pad(n) {
	return n.toString().padStart(2, "0");
}
function formatClock(ts) {
	const d = new Date(ts);
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function weekday(ts, lang) {
	return new Intl.DateTimeFormat(loc(lang), { weekday: "short" }).format(new Date(ts));
}
function dayMonth(ts, lang, month) {
	return new Intl.DateTimeFormat(loc(lang), {
		day: "numeric",
		month
	}).format(new Date(ts));
}
function formatChatTime(ts, lang) {
	if (isToday(ts)) return formatClock(ts);
	if (isYesterday(ts)) return lang === "fr" ? "Hier" : "Yesterday";
	if (isThisWeek(ts)) return weekday(ts, lang);
	return dayMonth(ts, lang, "short");
}
function formatLastSeen(ts, online, lang) {
	if (online) return lang === "fr" ? "en ligne" : "online";
	if (!ts) return lang === "fr" ? "vu récemment" : "last seen recently";
	if (isToday(ts)) return lang === "fr" ? `vu aujourd'hui à ${formatClock(ts)}` : `last seen today at ${formatClock(ts)}`;
	if (isYesterday(ts)) return lang === "fr" ? `vu hier à ${formatClock(ts)}` : `last seen yesterday at ${formatClock(ts)}`;
	return lang === "fr" ? `vu ${dayMonth(ts, lang, "short")}` : `last seen ${dayMonth(ts, lang, "short")}`;
}
function formatDuration(seconds) {
	const t = Math.max(0, seconds);
	return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
}
function formatRelativeShort(ts, lang) {
	const diff = Date.now() - ts;
	const min = Math.floor(diff / 6e4);
	if (min < 1) return lang === "fr" ? "à l'instant" : "now";
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	if (h < 24) return `${h} h`;
	return `${Math.floor(h / 24)} d`;
}
function formatRemain(expiresAt, now = Date.now()) {
	const s = Math.max(0, Math.ceil((expiresAt - now) / 1e3));
	const h = Math.floor(s / 3600);
	const m = Math.floor(s % 3600 / 60);
	const sec = s % 60;
	if (h > 0) return `${h} h ${m.toString().padStart(2, "0")}`;
	return `${m}:${sec.toString().padStart(2, "0")}`;
}
function formatRemainShort(expiresAt, now = Date.now()) {
	const s = Math.max(0, Math.ceil((expiresAt - now) / 1e3));
	if (s < 60) return `${s} s`;
	const m = Math.ceil(s / 60);
	if (m < 60) return `${m} min`;
	const h = Math.floor(m / 60);
	const rest = m % 60;
	return rest ? `${h} h ${rest}` : `${h} h`;
}
function metersBetween(a, b) {
	const toRad = (d) => d * Math.PI / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 12742e3 * Math.asin(Math.min(1, Math.sqrt(s)));
}
function formatMeters(meters, lang) {
	if (meters < 950) return `${Math.max(10, Math.round(meters / 10) * 10)}\u00a0m`;
	const km = meters / 1e3;
	if (km < 10) {
		const n = km.toFixed(1);
		return `${lang === "fr" ? n.replace(".", ",") : n}\u00a0km`;
	}
	return `${Math.round(km)}\u00a0km`;
}
var defaultA11y = {
	haptics: true,
	largeTouch: false,
	largeText: false,
	reduceMotion: false
};
var STORY_TTL_24H = 864e5;
var STORY_TTL_48H = 1728e5;
var STORY_VIDEO_MAX_MS = 6e4;
var DISAPPEAR_24H = 864e5;
var DISAPPEAR_7D = 6048e5;
function storyTtlMs(story) {
	return story.ttlMs ?? 864e5;
}
function isStoryLive(story, now = Date.now()) {
	return now - story.createdAt < storyTtlMs(story);
}
var STORY_MUSIC = [
	{
		id: "gold-hour",
		title: "Gold Hour",
		artist: "Sol",
		mood: "trending",
		durationMs: 1e4,
		src: "/music/gold-hour.mp3",
		color: "#FFD84D"
	},
	{
		id: "afterglow",
		title: "Afterglow",
		artist: "Mira",
		mood: "rnb",
		durationMs: 1e4,
		src: "/music/afterglow.mp3",
		color: "#c4a574"
	},
	{
		id: "terrasse",
		title: "Terrasse",
		artist: "Kori",
		mood: "afro",
		durationMs: 1e4,
		src: "/music/terrasse.mp3",
		color: "#e8a23a"
	},
	{
		id: "ralenti",
		title: "Ralenti",
		artist: "Lune",
		mood: "lofi",
		durationMs: 1e4,
		src: "/music/ralenti.mp3",
		color: "#8b93a7"
	},
	{
		id: "heatwave",
		title: "Heatwave",
		artist: "Atlas",
		mood: "party",
		durationMs: 1e4,
		src: "/music/heatwave.mp3",
		color: "#e85d4c"
	},
	{
		id: "ville-calme",
		title: "Ville calme",
		artist: "Vesper",
		mood: "chill",
		durationMs: 1e4,
		src: "/music/ville-calme.mp3",
		color: "#5ec8f0"
	},
	{
		id: "pulse",
		title: "Pulse",
		artist: "Juno",
		mood: "party",
		durationMs: 1e4,
		src: "/music/pulse.mp3",
		color: "#c4b5fd"
	},
	{
		id: "minuit",
		title: "Minuit",
		artist: "Nia K.",
		mood: "chill",
		durationMs: 1e4,
		src: "/music/minuit.mp3",
		color: "#1a2a4a"
	}
];
var MUSIC_MOODS = [
	"trending",
	"chill",
	"party",
	"afro",
	"lofi",
	"rnb"
];
var STORY_VIEW_MS = 4200;
function storyViewMs(item) {
	if (item.type === "video") return Math.min(item.durationMs ?? 8e3, STORY_VIDEO_MAX_MS);
	if (item.music) return item.music.durationMs;
	return STORY_VIEW_MS;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function uid(prefix = "id") {
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
function sixDigit() {
	return String(1e5 + Math.floor(Math.random() * 9e5));
}
function qrToken(kind) {
	return `${kind}-${Math.random().toString(36).slice(2, 8)}`;
}
var APP_HOST = "wipp.me";
var now = Date.now();
var m = (n) => now - n * 6e4;
var h = (n) => now - n * 36e5;
var d = (n) => now - n * 864e5;
var TAKEN_USERNAMES = /* @__PURE__ */ new Set([
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
function demoMe() {
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
function u(partial) {
	return {
		city: "Longueuil",
		connected: true,
		...partial
	};
}
function seedUsers() {
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
function msg(id, chatId, fromId, text, createdAt, extra = {}) {
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
function seedChats() {
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
function seedMessages() {
	return {
		"c-alex": [
			msg("m1", "c-alex", "me", "Tu es sur Wipp ?", d(2), { status: "read" }),
			msg("m2", "c-alex", "alex", "Oui. Ajoute-moi : @alex", d(2) + 4e4),
			msg("m3", "c-alex", "me", "C’est ça toute la différence.", d(1)),
			msg("m4", "c-alex", "alex", "On se capte au café près du métro ?", h(5)),
			msg("m5", "c-alex", "me", "Parfait. J’apporte le QR du groupe.", h(5) + 12e4),
			msg("m6", "c-alex", "alex", "On se voit à Longueuil demain ?", m(4), { status: "delivered" }),
			msg("m7", "c-alex", "alex", "Vers 18h, ça te va ?", m(3), { status: "delivered" }),
			msg("m-sticker-1", "c-alex", "alex", "Ça WIPP !", m(2), {
				type: "sticker",
				stickerId: "ca-wipp",
				status: "delivered"
			})
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
function seedStories() {
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
			durationMs: 1e4,
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
			music: STORY_MUSIC[0]
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
function seedCalls() {
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
function seedListings() {
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
function seedRequests() {
	return [{
		id: "req-karim",
		fromId: "karim",
		preview: "Salut, on s’est croisés au marché. Tu es sur Wipp ?",
		createdAt: h(6),
		status: "pending"
	}];
}
function seedCodes() {
	return [{
		code: sixDigit(),
		expiresAt: Date.now() + 6e4,
		ownerId: "lea",
		chatTtlMs: 36e5
	}];
}
function seedOneTimeQrs() {
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
function seedIntros() {
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
var defaultPrivacy = {
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
var defaultNotifs = {
	messages: true,
	requests: true,
	calls: true,
	stories: true,
	groups: true,
	mentions: true,
	reactions: true,
	security: true
};
var REPLIES = {
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
var SHOP_OWNER_REPLIES = [
	"Oui, dites-moi le créneau qui vous arrange.",
	"C’est noté. On confirme ici, pas par SMS.",
	"Merci. Je vous reviens dès que c’est libre."
];
var SHOP_CLIENT_REPLIES = [
	"Parfait, merci !",
	"Samedi 14 h, ça vous va ?",
	"Super, je vous écris ici."
];
var TRANSLATIONS = {
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
var HOME_GEO = {
	lat: 45.5312,
	lng: -73.5185,
	label: "Longueuil"
};
function seedPharmacies() {
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
function seedShops() {
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
function seedLifestyle() {
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
var NEARBY = [
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
var SEED_GROUP_META = {
	"c-famille": {
		inviteToken: "famille-diallo",
		avatar: "/media/food.jpg"
	},
	"c-soccer": {
		inviteToken: "soccer-longueuil",
		avatar: "/media/soccer.jpg"
	},
	"c-quartier": {
		inviteToken: "vieux-longueuil",
		avatar: "/media/river.jpg"
	},
	"c-soiree": {
		inviteToken: "soiree-samedi",
		avatar: "/media/coffee.jpg"
	}
};
function withGroupMeta(chats) {
	return chats.map((c) => {
		const meta = SEED_GROUP_META[c.id];
		if (!meta || c.type !== "group") return c;
		return {
			...c,
			inviteToken: c.inviteToken ?? meta.inviteToken,
			avatar: c.avatar ?? meta.avatar
		};
	});
}
var te = new TextEncoder();
var td = new TextDecoder();
function asBuf(bytes) {
	return bytes;
}
var ECDH = {
	name: "ECDH",
	namedCurve: "P-256"
};
var aesCache = /* @__PURE__ */ new Map();
function clearKeyCache() {
	aesCache.clear();
}
function b64(bytes) {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}
function unb64(value) {
	const bin = atob(value);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}
function formatSafety(digits) {
	return digits.match(/.{1,5}/g)?.join(" ") ?? digits;
}
function shortFp(digits) {
	if (digits.length < 12) return digits;
	return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}
async function generateBundle() {
	const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
	return {
		publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
		privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey)
	};
}
async function importPriv(jwk) {
	return crypto.subtle.importKey("jwk", jwk, ECDH, false, ["deriveBits"]);
}
async function importPub(jwk) {
	return crypto.subtle.importKey("jwk", jwk, ECDH, false, []);
}
async function digitsFrom(bytes, n = 60) {
	let acc = "";
	let h = bytes;
	while (acc.length < n) {
		for (const b of h) acc += (b % 10).toString();
		h = new Uint8Array(await crypto.subtle.digest("SHA-256", asBuf(h)));
	}
	return acc.slice(0, n);
}
async function fingerprintOf(jwk) {
	const raw = te.encode(`${jwk.crv ?? ""}|${jwk.x ?? ""}|${jwk.y ?? ""}`);
	return digitsFrom(new Uint8Array(await crypto.subtle.digest("SHA-256", asBuf(raw))), 60);
}
async function safetyNumber(a, b) {
	const [fa, fb] = await Promise.all([fingerprintOf(a), fingerprintOf(b)]);
	const [x, y] = fa < fb ? [fa, fb] : [fb, fa];
	return digitsFrom(new Uint8Array(await crypto.subtle.digest("SHA-256", asBuf(te.encode(x + y)))), 60);
}
async function groupSafety(jwk, chatId) {
	const fp = await fingerprintOf(jwk);
	return digitsFrom(new Uint8Array(await crypto.subtle.digest("SHA-256", asBuf(te.encode(`${fp}|${chatId}`)))), 60);
}
async function deriveChatKey(my, peer, chatId) {
	const hit = aesCache.get(chatId);
	if (hit) return hit;
	const priv = await importPriv(my.privateJwk);
	const pub = await importPub(peer.publicJwk);
	const bits = await crypto.subtle.deriveBits({
		name: "ECDH",
		public: pub
	}, priv, 256);
	const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
	const key = await crypto.subtle.deriveKey({
		name: "HKDF",
		hash: "SHA-256",
		salt: asBuf(te.encode(chatId)),
		info: asBuf(te.encode("wgo-e2e-v1"))
	}, hkdf, {
		name: "AES-GCM",
		length: 256
	}, false, ["encrypt", "decrypt"]);
	aesCache.set(chatId, key);
	return key;
}
async function deriveGroupKey(my, chatId) {
	const hit = aesCache.get(chatId);
	if (hit) return hit;
	const raw = te.encode(`${my.privateJwk.d ?? ""}|${chatId}|wgo-group-v1`);
	const hash = await crypto.subtle.digest("SHA-256", asBuf(raw));
	const key = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
	aesCache.set(chatId, key);
	return key;
}
async function encryptText(key, plaintext) {
	const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12));
	const ct = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: asBuf(iv)
	}, key, asBuf(te.encode(plaintext)));
	return {
		v: 1,
		alg: "AES-GCM",
		iv: b64(iv),
		ct: b64(new Uint8Array(ct))
	};
}
async function decryptText(key, blob) {
	const pt = await crypto.subtle.decrypt({
		name: "AES-GCM",
		iv: asBuf(unb64(blob.iv))
	}, key, asBuf(unb64(blob.ct)));
	return td.decode(pt);
}
function isEncryptable(type) {
	return type === "text" || type === "voice" || type === "image";
}
function groupInviteHref(token) {
	return `https://${APP_HOST}/g/${token}`;
}
function groupInviteLabel(token) {
	return `${APP_HOST}/g/${token}`;
}
function parseGroupInviteToken(raw) {
	const s = raw.trim();
	const fromPath = (path) => {
		return path.match(/\/g\/([A-Za-z0-9_-]+)/)?.[1];
	};
	try {
		const tok = fromPath(new URL(s.includes("://") ? s : `https://${s}`).pathname);
		if (tok) return tok;
	} catch {}
	const m = s.match(/(?:^|\/)g\/([A-Za-z0-9_-]+)/);
	if (m?.[1]) return m[1];
	return s.replace(/^\/+/, "");
}
function findChatByInvite(chats, qrs, raw) {
	const token = parseGroupInviteToken(raw);
	const byInvite = chats.find((c) => c.type === "group" && c.inviteToken === token);
	if (byInvite) return byInvite;
	const qr = qrs.find((q) => q.token === token && q.target.type === "group");
	if (qr && qr.target.type === "group") {
		const chatId = qr.target.chatId;
		return chats.find((c) => c.id === chatId);
	}
}
function inviteSlug(name) {
	return `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "groupe"}-${Math.random().toString(36).slice(2, 6)}`;
}
function isEmojiSticker(id) {
	return Boolean(id?.startsWith("e:") && id.length > 2);
}
function emojiFromStickerId(id) {
	return isEmojiSticker(id) ? id.slice(2) : "";
}
function stickerIdFromEmoji(emoji) {
	return `e:${emoji}`;
}
var EMOJI_CATS = [
	{
		id: "smileys",
		icon: "😀",
		labelFr: "Smileys",
		labelEn: "Smileys",
		emojis: [
			"😀",
			"😃",
			"😄",
			"😁",
			"😆",
			"😅",
			"😂",
			"🤣",
			"😊",
			"😇",
			"🙂",
			"🙃",
			"😉",
			"😌",
			"😍",
			"🥰",
			"😘",
			"😗",
			"😙",
			"😚",
			"😋",
			"😛",
			"😝",
			"😜",
			"🤪",
			"🤨",
			"🧐",
			"🤓",
			"😎",
			"🤩",
			"🥳",
			"😏",
			"😒",
			"😞",
			"😔",
			"😟",
			"😕",
			"🙁",
			"😣",
			"😖",
			"😫",
			"😩",
			"🥺",
			"😢",
			"😭",
			"😤",
			"😠",
			"😡",
			"🤬",
			"🤯",
			"😳",
			"🥵",
			"🥶",
			"😱",
			"😨",
			"😰",
			"😥",
			"😓",
			"🤗",
			"🤔",
			"🤭",
			"🤫",
			"🤥",
			"😶",
			"😐",
			"😑",
			"😬",
			"🙄",
			"😯",
			"😦",
			"😧",
			"😮",
			"😲",
			"🥱",
			"😴",
			"🤤",
			"😪",
			"😵",
			"🤐",
			"🥴",
			"🤢",
			"🤮",
			"🤧",
			"😷",
			"🤒",
			"🤕",
			"🤑",
			"🤠",
			"😈",
			"👿",
			"💀",
			"👻",
			"💩",
			"🤡",
			"👹",
			"👺",
			"🤖",
			"👽"
		]
	},
	{
		id: "gestes",
		icon: "👍",
		labelFr: "Gestes",
		labelEn: "Gestures",
		emojis: [
			"👋",
			"🤚",
			"🖐",
			"✋",
			"🖖",
			"👌",
			"🤌",
			"🤏",
			"✌️",
			"🤞",
			"🤟",
			"🤘",
			"🤙",
			"👈",
			"👉",
			"👆",
			"🖕",
			"👇",
			"☝️",
			"👍",
			"👎",
			"✊",
			"👊",
			"🤛",
			"🤜",
			"👏",
			"🙌",
			"🫶",
			"👐",
			"🤲",
			"🤝",
			"🙏",
			"💪",
			"🦾",
			"💅",
			"🤳",
			"💃",
			"🕺",
			"👯",
			"🫶"
		]
	},
	{
		id: "coeurs",
		icon: "❤️",
		labelFr: "Cœurs",
		labelEn: "Hearts",
		emojis: [
			"❤️",
			"🧡",
			"💛",
			"💚",
			"💙",
			"💜",
			"🖤",
			"🤍",
			"🤎",
			"💔",
			"❣️",
			"💕",
			"💞",
			"💓",
			"💗",
			"💖",
			"💘",
			"💝",
			"💟",
			"🔥",
			"✨",
			"⭐",
			"🌟",
			"💫",
			"💥",
			"💯",
			"✅",
			"❌",
			"💢",
			"💨",
			"💤",
			"🕳️"
		]
	},
	{
		id: "animaux",
		icon: "🐶",
		labelFr: "Animaux",
		labelEn: "Animals",
		emojis: [
			"🐶",
			"🐱",
			"🐭",
			"🐹",
			"🐰",
			"🦊",
			"🐻",
			"🐼",
			"🐨",
			"🐯",
			"🦁",
			"🐮",
			"🐷",
			"🐸",
			"🐵",
			"🙈",
			"🙉",
			"🙊",
			"🐔",
			"🐧",
			"🐦",
			"🐤",
			"🐣",
			"🐥",
			"🦆",
			"🦅",
			"🦉",
			"🦇",
			"🐺",
			"🐗",
			"🐴",
			"🦄",
			"🐝",
			"🪱",
			"🐛",
			"🦋",
			"🐌",
			"🐞",
			"🐜",
			"🪲",
			"🐢",
			"🐍",
			"🦎",
			"🐙",
			"🦑",
			"🦐",
			"🦞",
			"🦀",
			"🐡",
			"🐠",
			"🐟",
			"🐬",
			"🐳",
			"🐋",
			"🦈"
		]
	},
	{
		id: "food",
		icon: "🍕",
		labelFr: "Bouffe",
		labelEn: "Food",
		emojis: [
			"🍏",
			"🍎",
			"🍐",
			"🍊",
			"🍋",
			"🍌",
			"🍉",
			"🍇",
			"🍓",
			"🫐",
			"🍈",
			"🍒",
			"🍑",
			"🥭",
			"🍍",
			"🥥",
			"🥝",
			"🍅",
			"🍆",
			"🥑",
			"🥦",
			"🥬",
			"🥒",
			"🌶",
			"🫑",
			"🌽",
			"🥕",
			"🫒",
			"🧄",
			"🧅",
			"🥔",
			"🍠",
			"🥐",
			"🥯",
			"🍞",
			"🥖",
			"🥨",
			"🧀",
			"🥚",
			"🍳",
			"🥞",
			"🧇",
			"🥓",
			"🥩",
			"🍗",
			"🍖",
			"🌭",
			"🍔",
			"🍟",
			"🍕",
			"🫓",
			"🥪",
			"🥙",
			"🧆",
			"🌮",
			"🌯",
			"🫔",
			"🥗",
			"🍝",
			"🍜",
			"🍲",
			"🍛",
			"🍣",
			"🍱",
			"🥟",
			"🦪",
			"🍧",
			"🍨",
			"🍦",
			"🥧",
			"🧁",
			"🍰",
			"🎂",
			"🍮",
			"🍭",
			"🍬",
			"🍫",
			"🍿",
			"🍩",
			"🍪",
			"☕️",
			"🍵",
			"🧋",
			"🥤",
			"🍺",
			"🍻",
			"🥂",
			"🍷"
		]
	},
	{
		id: "activity",
		icon: "⚽",
		labelFr: "Activité",
		labelEn: "Activity",
		emojis: [
			"⚽️",
			"🏀",
			"🏈",
			"⚾️",
			"🎾",
			"🏐",
			"🏉",
			"🥏",
			"🎱",
			"🪀",
			"🏓",
			"🏸",
			"🏒",
			"🥅",
			"⛳️",
			"🪁",
			"🏹",
			"🎣",
			"🤿",
			"🥊",
			"🥋",
			"🎽",
			"🛹",
			"🛼",
			"🛷",
			"⛸",
			"🎿",
			"⛷",
			"🏂",
			"🪂",
			"🏋️",
			"🤸",
			"⛹️",
			"🤾",
			"🏌️",
			"🏇",
			"🧘",
			"🏄",
			"🏊",
			"🤽",
			"🚴",
			"🏆",
			"🥇",
			"🥈",
			"🥉",
			"🎯",
			"🎮",
			"🕹️",
			"🎲",
			"🧩",
			"♟️",
			"🎭",
			"🎨",
			"🎬",
			"🎤",
			"🎧",
			"🎼",
			"🎹",
			"🥁",
			"🎷",
			"🎺",
			"🎸",
			"🪕",
			"🎻"
		]
	},
	{
		id: "travel",
		icon: "✈️",
		labelFr: "Voyage",
		labelEn: "Travel",
		emojis: [
			"🚗",
			"🚕",
			"🚙",
			"🚌",
			"🚎",
			"🏎️",
			"🚓",
			"🚑",
			"🚒",
			"🚐",
			"🛻",
			"🚚",
			"🚛",
			"🚜",
			"🛵",
			"🏍️",
			"🚲",
			"🛴",
			"🚨",
			"🚔",
			"🚍",
			"🚘",
			"🚖",
			"🚡",
			"🚠",
			"🚟",
			"🚃",
			"🚋",
			"🚞",
			"🚝",
			"🚄",
			"🚅",
			"🚈",
			"🚂",
			"🚆",
			"🚇",
			"🚊",
			"🚉",
			"✈️",
			"🛫",
			"🛬",
			"🛩️",
			"💺",
			"🛰️",
			"🚀",
			"🛸",
			"🚁",
			"🛶",
			"⛵️",
			"🚤",
			"🛥️",
			"🛳️",
			"⛴️",
			"🚢",
			"⚓️",
			"🪝",
			"🚧",
			"🚦",
			"🚥",
			"🗺️",
			"🗽",
			"🗼",
			"🏰",
			"🏯",
			"🏟️",
			"🎡",
			"🎢",
			"🎠",
			"⛲️",
			"⛱️",
			"🏖️",
			"🏝️",
			"🏜️",
			"🌋",
			"⛰️",
			"🏔️",
			"🗻",
			"🏕️",
			"⛺️",
			"🛖"
		]
	},
	{
		id: "objects",
		icon: "💡",
		labelFr: "Objets",
		labelEn: "Objects",
		emojis: [
			"⌚️",
			"📱",
			"💻",
			"⌨️",
			"🖥️",
			"🖨️",
			"🖱️",
			"🖲️",
			"🕹",
			"🗜",
			"💾",
			"💿",
			"📷",
			"📸",
			"📹",
			"🎥",
			"📞",
			"☎️",
			"📺",
			"📻",
			"⏰",
			"⏳",
			"💡",
			"🔦",
			"🕯️",
			"💰",
			"💵",
			"💴",
			"💶",
			"💷",
			"💳",
			"💎",
			"⚖️",
			"🧰",
			"🔧",
			"🔨",
			"⚙️",
			"🔫",
			"💣",
			"🔪",
			"🗝️",
			"🔑",
			"🚪",
			"🪑",
			"🛏️",
			"🛋️",
			"🚽",
			"🚿",
			"🛁",
			"🧴",
			"🧷",
			"🧹",
			"🧺",
			"🧻",
			"🧸",
			"🎁",
			"🎈",
			"🎉",
			"🎊",
			"🎀",
			"✉️",
			"📦",
			"📫",
			"📝",
			"📓",
			"📚",
			"📌",
			"📍",
			"✂️",
			"🔒",
			"🔓"
		]
	},
	{
		id: "symbols",
		icon: "✅",
		labelFr: "Symboles",
		labelEn: "Symbols",
		emojis: [
			"✅",
			"❌",
			"❓",
			"❗",
			"‼️",
			"⁉️",
			"🔴",
			"🟠",
			"🟡",
			"🟢",
			"🔵",
			"🟣",
			"⚫️",
			"⚪️",
			"🟤",
			"🔺",
			"🔻",
			"💠",
			"🔘",
			"🔳",
			"🔷",
			"🔶",
			"♠️",
			"♥️",
			"♦️",
			"♣️",
			"🃏",
			"🎴",
			"🀄️",
			"🕐",
			"💬",
			"💭",
			"🗯️",
			"♠️",
			"☮️",
			"✝️",
			"☪️",
			"🕉️",
			"☸️",
			"✡️",
			"🔯",
			"🕎",
			"☯️",
			"☦️",
			"🛐",
			"⛎",
			"♈️",
			"♉️",
			"♊️",
			"♋️",
			"♌️",
			"♍️",
			"♎️",
			"♏️",
			"♐️",
			"♑️",
			"♒️",
			"♓️"
		]
	}
];
var ELLE = [
	{
		id: "wippe-moi",
		pack: "elle",
		src: "/stickers/wippe-moi.webp",
		anim: "/stickers/wippe-moi.mp4?v=3",
		labelFr: "Wippe-moi !",
		labelEn: "Wipp me!"
	},
	{
		id: "ca-wipp",
		pack: "elle",
		src: "/stickers/ca-wipp.webp",
		anim: "/stickers/ca-wipp.mp4?v=3",
		labelFr: "Ça WIPP !",
		labelEn: "That’s WIPP!"
	},
	{
		id: "merci",
		pack: "elle",
		src: "/stickers/merci.webp",
		anim: "/stickers/merci.mp4?v=3",
		loopSoft: true,
		labelFr: "Merci",
		labelEn: "Thanks"
	},
	{
		id: "on-se-capte",
		pack: "elle",
		src: "/stickers/on-se-capte.webp",
		anim: "/stickers/on-se-capte.mp4?v=3",
		labelFr: "On se capte !",
		labelEn: "Catch you!"
	},
	{
		id: "mdr",
		pack: "elle",
		src: "/stickers/mdr.webp",
		anim: "/stickers/mdr.mp4?v=3",
		labelFr: "MDR !",
		labelEn: "LOL!"
	},
	{
		id: "hmm",
		pack: "elle",
		src: "/stickers/hmm.webp",
		anim: "/stickers/hmm.mp4?v=3",
		labelFr: "Hmm…",
		labelEn: "Hmm…"
	},
	{
		id: "no-way",
		pack: "elle",
		src: "/stickers/no-way.webp",
		anim: "/stickers/no-way.mp4?v=3",
		labelFr: "No way !",
		labelEn: "No way!"
	},
	{
		id: "valide",
		pack: "elle",
		src: "/stickers/valide.webp",
		anim: "/stickers/valide.mp4?v=3",
		labelFr: "C’est validé !",
		labelEn: "Approved!"
	},
	{
		id: "j-arrive",
		pack: "elle",
		src: "/stickers/j-arrive.webp",
		anim: "/stickers/j-arrive.mp4?v=3",
		labelFr: "J’arrive !",
		labelEn: "On my way!"
	},
	{
		id: "bonne-nuit",
		pack: "elle",
		src: "/stickers/bonne-nuit.webp",
		anim: "/stickers/bonne-nuit.mp4?v=3",
		loopSoft: true,
		labelFr: "Bonne nuit",
		labelEn: "Good night"
	},
	{
		id: "bon-matin",
		pack: "elle",
		src: "/stickers/bon-matin.webp",
		anim: "/stickers/bon-matin.mp4?v=3",
		loopSoft: true,
		labelFr: "Bon matin !",
		labelEn: "Good morning!"
	},
	{
		id: "appelle-moi",
		pack: "elle",
		src: "/stickers/appelle-moi.webp",
		anim: "/stickers/appelle-moi.mp4?v=3",
		labelFr: "Appelle-moi !",
		labelEn: "Call me!"
	},
	{
		id: "bisous",
		pack: "elle",
		src: "/stickers/bisous.webp",
		anim: "/stickers/bisous.mp4?v=3",
		loopSoft: true,
		labelFr: "Bisous",
		labelEn: "Kisses"
	},
	{
		id: "bravo",
		pack: "elle",
		src: "/stickers/bravo.webp",
		anim: "/stickers/bravo.mp4?v=3",
		labelFr: "Bravo !",
		labelEn: "Bravo!"
	},
	{
		id: "laisse-tomber",
		pack: "elle",
		src: "/stickers/laisse-tomber.webp",
		anim: "/stickers/laisse-tomber.mp4?v=3",
		labelFr: "Laisse tomber !",
		labelEn: "Never mind!"
	},
	{
		id: "connecte",
		pack: "elle",
		src: "/stickers/connecte.webp",
		anim: "/stickers/connecte.mp4?v=3",
		labelFr: "Connecté !",
		labelEn: "Connected!"
	}
];
var LUI = [
	{
		id: "lui-wippe-moi",
		pack: "lui",
		src: "/stickers/lui/wippe-moi.webp",
		anim: "/stickers/lui/wippe-moi.mp4?v=1",
		labelFr: "Wippe-moi !",
		labelEn: "Wipp me!"
	},
	{
		id: "lui-ca-wipp",
		pack: "lui",
		src: "/stickers/lui/ca-wipp.webp",
		anim: "/stickers/lui/ca-wipp.mp4?v=1",
		labelFr: "Ça WIPP !",
		labelEn: "That’s WIPP!"
	},
	{
		id: "lui-bonne-nuit",
		pack: "lui",
		src: "/stickers/lui/bonne-nuit.webp",
		anim: "/stickers/lui/bonne-nuit.mp4?v=1",
		loopSoft: true,
		labelFr: "Bonne nuit !",
		labelEn: "Good night"
	},
	{
		id: "lui-valide",
		pack: "lui",
		src: "/stickers/lui/valide.webp",
		anim: "/stickers/lui/valide.mp4?v=1",
		labelFr: "C’est validé !",
		labelEn: "Approved!"
	},
	{
		id: "lui-mdr",
		pack: "lui",
		src: "/stickers/lui/mdr.webp",
		anim: "/stickers/lui/mdr.mp4?v=1",
		labelFr: "MDR !",
		labelEn: "LOL!"
	},
	{
		id: "lui-hmm",
		pack: "lui",
		src: "/stickers/lui/hmm.webp",
		anim: "/stickers/lui/hmm.mp4?v=1",
		labelFr: "Hmm…",
		labelEn: "Hmm…"
	},
	{
		id: "lui-no-way",
		pack: "lui",
		src: "/stickers/lui/no-way.webp",
		anim: "/stickers/lui/no-way.mp4?v=1",
		labelFr: "No way !",
		labelEn: "No way!"
	},
	{
		id: "lui-on-se-capte",
		pack: "lui",
		src: "/stickers/lui/on-se-capte.webp",
		anim: "/stickers/lui/on-se-capte.mp4?v=1",
		labelFr: "On se capte !",
		labelEn: "Catch you!"
	},
	{
		id: "lui-j-arrive",
		pack: "lui",
		src: "/stickers/lui/j-arrive.webp",
		anim: "/stickers/lui/j-arrive.mp4?v=1",
		labelFr: "J’arrive !",
		labelEn: "On my way!"
	},
	{
		id: "lui-bisous",
		pack: "lui",
		src: "/stickers/lui/bisous.webp",
		anim: "/stickers/lui/bisous.mp4?v=1",
		loopSoft: true,
		labelFr: "Bisous !",
		labelEn: "Kisses"
	},
	{
		id: "lui-bon-matin",
		pack: "lui",
		src: "/stickers/lui/bon-matin.webp",
		anim: "/stickers/lui/bon-matin.mp4?v=1",
		loopSoft: true,
		labelFr: "Bon matin !",
		labelEn: "Good morning!"
	},
	{
		id: "lui-appelle-moi",
		pack: "lui",
		src: "/stickers/lui/appelle-moi.webp",
		anim: "/stickers/lui/appelle-moi.mp4?v=1",
		labelFr: "Appelle-moi !",
		labelEn: "Call me!"
	},
	{
		id: "lui-laisse-tomber",
		pack: "lui",
		src: "/stickers/lui/laisse-tomber.webp",
		anim: "/stickers/lui/laisse-tomber.mp4?v=1",
		labelFr: "Laisse tomber !",
		labelEn: "Never mind!"
	},
	{
		id: "lui-bravo",
		pack: "lui",
		src: "/stickers/lui/bravo.webp",
		anim: "/stickers/lui/bravo.mp4?v=1",
		labelFr: "Bravo !",
		labelEn: "Bravo!"
	},
	{
		id: "lui-respect",
		pack: "lui",
		src: "/stickers/lui/respect.webp",
		anim: "/stickers/lui/respect.mp4?v=1",
		labelFr: "Respect !",
		labelEn: "Respect!"
	},
	{
		id: "lui-connecte",
		pack: "lui",
		src: "/stickers/lui/connecte.webp",
		anim: "/stickers/lui/connecte.mp4?v=1",
		labelFr: "Connecté !",
		labelEn: "Connected!"
	}
];
var FUN = [
	{
		id: "fun-va-la-bas",
		pack: "fun",
		src: "/stickers/fun/va-la-bas.webp",
		anim: "/stickers/fun/va-la-bas.mp4?v=1",
		labelFr: "Va là-bas !",
		labelEn: "Go over there!"
	},
	{
		id: "fun-stop",
		pack: "fun",
		src: "/stickers/fun/stop.webp",
		anim: "/stickers/fun/stop.mp4?v=1",
		labelFr: "Stop !",
		labelEn: "Stop!"
	},
	{
		id: "fun-hahaha",
		pack: "fun",
		src: "/stickers/fun/hahaha.webp",
		anim: "/stickers/fun/hahaha.mp4?v=1",
		labelFr: "HAHAHA !",
		labelEn: "HAHAHA!"
	},
	{
		id: "fun-pas-aujourdhui",
		pack: "fun",
		src: "/stickers/fun/pas-aujourdhui.webp",
		anim: "/stickers/fun/pas-aujourdhui.mp4?v=1",
		loopSoft: true,
		labelFr: "Pas aujourd’hui !",
		labelEn: "Not today!"
	},
	{
		id: "fun-le-boss",
		pack: "fun",
		src: "/stickers/fun/le-boss.webp",
		anim: "/stickers/fun/le-boss.mp4?v=1",
		labelFr: "Le boss !",
		labelEn: "The boss!"
	},
	{
		id: "fun-trop-tot",
		pack: "fun",
		src: "/stickers/fun/trop-tot.webp",
		anim: "/stickers/fun/trop-tot.mp4?v=1",
		loopSoft: true,
		labelFr: "Trop tôt !",
		labelEn: "Too early!"
	},
	{
		id: "fun-ca-marche",
		pack: "fun",
		src: "/stickers/fun/ca-marche.webp",
		anim: "/stickers/fun/ca-marche.mp4?v=1",
		labelFr: "Ça marche !",
		labelEn: "It works!"
	},
	{
		id: "fun-valide",
		pack: "fun",
		src: "/stickers/fun/valide.webp",
		anim: "/stickers/fun/valide.mp4?v=1",
		labelFr: "Validé !",
		labelEn: "Approved!"
	},
	{
		id: "fun-bisousss",
		pack: "fun",
		src: "/stickers/fun/bisousss.webp",
		anim: "/stickers/fun/bisousss.mp4?v=1",
		loopSoft: true,
		labelFr: "Bisousss !",
		labelEn: "Kisses!"
	},
	{
		id: "fun-nimporte-quoi",
		pack: "fun",
		src: "/stickers/fun/nimporte-quoi.webp",
		anim: "/stickers/fun/nimporte-quoi.mp4?v=1",
		labelFr: "N’importe quoi !",
		labelEn: "Whatever!"
	},
	{
		id: "fun-bien-joue",
		pack: "fun",
		src: "/stickers/fun/bien-joue.webp",
		anim: "/stickers/fun/bien-joue.mp4?v=1",
		labelFr: "Bien joué !",
		labelEn: "Nice one!"
	},
	{
		id: "fun-ecoute-bien",
		pack: "fun",
		src: "/stickers/fun/ecoute-bien.webp",
		anim: "/stickers/fun/ecoute-bien.mp4?v=1",
		labelFr: "Écoute bien !",
		labelEn: "Listen up!"
	},
	{
		id: "fun-laisse-moi",
		pack: "fun",
		src: "/stickers/fun/laisse-moi.webp",
		anim: "/stickers/fun/laisse-moi.mp4?v=1",
		labelFr: "Laisse-moi !",
		labelEn: "Leave me!"
	},
	{
		id: "fun-cool",
		pack: "fun",
		src: "/stickers/fun/cool.webp",
		anim: "/stickers/fun/cool.mp4?v=1",
		labelFr: "Cool !",
		labelEn: "Cool!"
	},
	{
		id: "fun-vraiment",
		pack: "fun",
		src: "/stickers/fun/vraiment.webp",
		anim: "/stickers/fun/vraiment.mp4?v=1",
		labelFr: "Vraiment ?!",
		labelEn: "Really?!"
	},
	{
		id: "fun-oh-non",
		pack: "fun",
		src: "/stickers/fun/oh-non.webp",
		anim: "/stickers/fun/oh-non.mp4?v=1",
		labelFr: "Oh non…",
		labelEn: "Oh no…"
	},
	{
		id: "fun-yesss",
		pack: "fun",
		src: "/stickers/fun/yesss.webp",
		anim: "/stickers/fun/yesss.mp4?v=1",
		labelFr: "Yessss !",
		labelEn: "Yessss!"
	},
	{
		id: "fun-dodo",
		pack: "fun",
		src: "/stickers/fun/dodo.webp",
		anim: "/stickers/fun/dodo.mp4?v=1",
		loopSoft: true,
		labelFr: "Dodo…",
		labelEn: "Night night…"
	},
	{
		id: "fun-tchip",
		pack: "fun",
		src: "/stickers/fun/tchip.webp",
		anim: "/stickers/fun/tchip.mp4?v=1",
		labelFr: "Tchip !",
		labelEn: "Tchip!"
	},
	{
		id: "fun-focus",
		pack: "fun",
		src: "/stickers/fun/focus.webp",
		anim: "/stickers/fun/focus.mp4?v=1",
		labelFr: "Focus !",
		labelEn: "Focus!"
	}
];
var FUN2 = [
	{
		id: "fun2-toi-la",
		pack: "fun2",
		src: "/stickers/fun2/toi-la.webp",
		anim: "/stickers/fun2/toi-la.mp4?v=1",
		labelFr: "Toi là !",
		labelEn: "You there!"
	},
	{
		id: "fun2-cours",
		pack: "fun2",
		src: "/stickers/fun2/cours.webp",
		anim: "/stickers/fun2/cours.mp4?v=1",
		labelFr: "Cours !!!",
		labelEn: "Run!!!"
	},
	{
		id: "fun2-hahaha",
		pack: "fun2",
		src: "/stickers/fun2/hahaha.webp",
		anim: "/stickers/fun2/hahaha.mp4?v=1",
		labelFr: "Hahaha !",
		labelEn: "Hahaha!"
	},
	{
		id: "fun2-pas-mon-probleme",
		pack: "fun2",
		src: "/stickers/fun2/pas-mon-probleme.webp",
		anim: "/stickers/fun2/pas-mon-probleme.mp4?v=1",
		labelFr: "Pas mon problème !",
		labelEn: "Not my problem!"
	},
	{
		id: "fun2-nananana",
		pack: "fun2",
		src: "/stickers/fun2/nananana.webp",
		anim: "/stickers/fun2/nananana.mp4?v=1",
		labelFr: "Nananana !",
		labelEn: "Nananana!"
	},
	{
		id: "fun2-hum",
		pack: "fun2",
		src: "/stickers/fun2/hum.webp",
		anim: "/stickers/fun2/hum.mp4?v=1",
		labelFr: "Hum !",
		labelEn: "Hum!"
	},
	{
		id: "fun2-mdr",
		pack: "fun2",
		src: "/stickers/fun2/mdr.webp",
		anim: "/stickers/fun2/mdr.mp4?v=1",
		labelFr: "MDR !",
		labelEn: "LOL!"
	},
	{
		id: "fun2-je-suis-ko",
		pack: "fun2",
		src: "/stickers/fun2/je-suis-ko.webp",
		anim: "/stickers/fun2/je-suis-ko.mp4?v=1",
		labelFr: "Je suis KO !",
		labelEn: "I’m KO!"
	},
	{
		id: "fun2-bye-bye",
		pack: "fun2",
		src: "/stickers/fun2/bye-bye.webp",
		anim: "/stickers/fun2/bye-bye.mp4?v=1",
		labelFr: "Bye bye !",
		labelEn: "Bye bye!"
	},
	{
		id: "fun2-je-vais-taper",
		pack: "fun2",
		src: "/stickers/fun2/je-vais-taper.webp",
		anim: "/stickers/fun2/je-vais-taper.mp4?v=1",
		labelFr: "Je vais taper !",
		labelEn: "I’m gonna hit!"
	},
	{
		id: "fun2-tu-parles-trop",
		pack: "fun2",
		src: "/stickers/fun2/tu-parles-trop.webp",
		anim: "/stickers/fun2/tu-parles-trop.mp4?v=1",
		labelFr: "Tu parles trop !",
		labelEn: "You talk too much!"
	},
	{
		id: "fun2-oh-mon-dieu",
		pack: "fun2",
		src: "/stickers/fun2/oh-mon-dieu.webp",
		anim: "/stickers/fun2/oh-mon-dieu.mp4?v=1",
		labelFr: "Oh mon Dieu !",
		labelEn: "Oh my God!"
	},
	{
		id: "fun2-je-te-vois",
		pack: "fun2",
		src: "/stickers/fun2/je-te-vois.webp",
		anim: "/stickers/fun2/je-te-vois.mp4?v=1",
		labelFr: "Je te vois !",
		labelEn: "I see you!"
	},
	{
		id: "fun2-argent-dabord",
		pack: "fun2",
		src: "/stickers/fun2/argent-dabord.webp",
		anim: "/stickers/fun2/argent-dabord.mp4?v=1",
		labelFr: "Argent d’abord !",
		labelEn: "Money first!"
	},
	{
		id: "fun2-degage",
		pack: "fun2",
		src: "/stickers/fun2/degage.webp",
		anim: "/stickers/fun2/degage.mp4?v=1",
		labelFr: "Dégage !",
		labelEn: "Get out!"
	},
	{
		id: "fun2-cest-bon-hein",
		pack: "fun2",
		src: "/stickers/fun2/cest-bon-hein.webp",
		anim: "/stickers/fun2/cest-bon-hein.mp4?v=1",
		labelFr: "C’est bon hein !",
		labelEn: "This slaps!"
	},
	{
		id: "fun2-trop-mange",
		pack: "fun2",
		src: "/stickers/fun2/trop-mange.webp",
		anim: "/stickers/fun2/trop-mange.mp4?v=1",
		labelFr: "Trop mangé !",
		labelEn: "Too full!"
	},
	{
		id: "fun2-wesh",
		pack: "fun2",
		src: "/stickers/fun2/wesh.webp",
		anim: "/stickers/fun2/wesh.mp4?v=1",
		labelFr: "Wesh ?!",
		labelEn: "Wesh?!"
	},
	{
		id: "fun2-ecoutez-moi-bien",
		pack: "fun2",
		src: "/stickers/fun2/ecoutez-moi-bien.webp",
		anim: "/stickers/fun2/ecoutez-moi-bien.mp4?v=1",
		labelFr: "Écoutez-moi bien !",
		labelEn: "Listen up!"
	},
	{
		id: "fun2-je-ne-sais-pas",
		pack: "fun2",
		src: "/stickers/fun2/je-ne-sais-pas.webp",
		anim: "/stickers/fun2/je-ne-sais-pas.mp4?v=1",
		labelFr: "Je ne sais pas !",
		labelEn: "I don’t know!"
	}
];
var STICKER_PACKS = {
	elle: {
		id: "elle",
		labelFr: "Elle",
		labelEn: "Her",
		stickers: ELLE
	},
	lui: {
		id: "lui",
		labelFr: "Lui",
		labelEn: "Him",
		stickers: LUI
	},
	fun: {
		id: "fun",
		labelFr: "Fun",
		labelEn: "Fun",
		stickers: FUN
	},
	fun2: {
		id: "fun2",
		labelFr: "#2",
		labelEn: "#2",
		stickers: FUN2
	}
};
var WIPP_STICKERS = [
	...ELLE,
	...LUI,
	...FUN,
	...FUN2
];
function isStickerId(id) {
	if (isEmojiSticker(id)) return true;
	return Boolean(id && WIPP_STICKERS.some((s) => s.id === id));
}
function stickerById(id) {
	return WIPP_STICKERS.find((s) => s.id === id);
}
function stickersInPack(pack) {
	return STICKER_PACKS[pack].stickers;
}
function stickerLabel(id, lang) {
	if (isEmojiSticker(id) && id) return emojiFromStickerId(id);
	const row = stickerById(id);
	if (!row) return "Sticker";
	return lang === "fr" ? row.labelFr : row.labelEn;
}
var TAB = [
	"chats",
	"calls",
	"connect",
	"explore",
	"me"
];
var CODE_TTL = 6e4;
function isChatSealed(chat, now = Date.now()) {
	if (!chat.ephemeral) return false;
	if (chat.sealed) return true;
	return Boolean(chat.expiresAt && chat.expiresAt <= now);
}
function previewOf(message, lang = "fr") {
	if (message.viewOnce) return lang === "fr" ? "Vue unique" : "View once";
	if (message.encFailed) return lang === "fr" ? "Message chiffré" : "Encrypted message";
	if (message.type === "voice") return `Vocal · ${formatDur(message.duration ?? 0)}`;
	if (message.type === "image") return "Photo";
	if (message.type === "video") return lang === "fr" ? "Vidéo" : "Video";
	if (message.type === "sticker") return stickerLabel(message.stickerId, lang);
	if (message.type === "listing") return message.text ?? "Annonce";
	if (message.type === "shop") return message.text ?? "Boutique";
	return message.text ?? "";
}
function persistMessages(messages) {
	return Object.fromEntries(Object.entries(messages).map(([id, list]) => [id, list.map((m) => m.enc ? {
		...m,
		text: void 0,
		translated: void 0
	} : m)]));
}
function formatDur(seconds) {
	return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}
function fresh() {
	return {
		onboarded: false,
		theme: "dark",
		language: "fr",
		a11y: { ...defaultA11y },
		stack: [{ name: "splash" }],
		me: demoMe(),
		users: seedUsers(),
		chats: withGroupMeta(seedChats()),
		messages: seedMessages(),
		stories: seedStories(),
		viewedStories: {},
		calls: seedCalls(),
		listings: seedListings(),
		requests: seedRequests(),
		blockedIds: [],
		sentRequestIds: [],
		privacy: { ...defaultPrivacy },
		notifs: { ...defaultNotifs },
		nearby: 0,
		nearbyUntil: 0,
		pendingSignup: {},
		typing: {},
		codes: seedCodes(),
		oneTimeQrs: seedOneTimeQrs(),
		intros: seedIntros(),
		codeChatTtl: 36e5,
		shops: seedShops(),
		lifestyle: seedLifestyle(),
		geo: {
			lat: HOME_GEO.lat,
			lng: HOME_GEO.lng,
			label: HOME_GEO.label,
			source: "city"
		},
		locateStatus: "idle",
		identity: null,
		deviceKeys: {},
		myFingerprint: "",
		verifiedIds: [],
		showCiphertext: false,
		cryptoReady: false,
		keyRotatedAt: 0,
		savedListingIds: ["l-civic", "l-apt"],
		savedEventIds: ["ls-slow", "ls-soccer"],
		touchAllowed: false,
		recentStickerIds: [],
		liveCall: null,
		callsSeenAt: 0,
		legalAcceptedAt: 0,
		legalVersion: "",
		reports: [],
		biometricsOn: false,
		appLocked: false,
		pushMaster: false,
		pushGranted: false
	};
}
async function aesFor(get, chatId) {
	const st = get();
	if (!st.identity) return null;
	const chat = st.chats.find((c) => c.id === chatId);
	if (!chat) return null;
	if (chat.type === "group") return deriveGroupKey(st.identity, chatId);
	const peerId = chat.participantIds.find((id) => id !== "me");
	if (!peerId) return null;
	let peer = st.deviceKeys[peerId];
	if (!peer) {
		peer = await generateBundle();
		useWgoStore.setState({ deviceKeys: {
			...useWgoStore.getState().deviceKeys,
			[peerId]: peer
		} });
	}
	return deriveChatKey(st.identity, peer, chatId);
}
function pumpReceipt(set, get, chatId, messageId) {
	window.setTimeout(() => {
		const current = get().chats.find((c) => c.id === chatId);
		if (!current || isChatSealed(current)) return;
		const offline = typeof navigator !== "undefined" && navigator.onLine === false;
		set((st) => ({ messages: {
			...st.messages,
			[chatId]: (st.messages[chatId] ?? []).map((x) => x.id === messageId && x.status === "sending" ? {
				...x,
				status: offline ? "failed" : "sent"
			} : x)
		} }));
		if (offline) return;
		window.setTimeout(() => {
			const chat = get().chats.find((c) => c.id === chatId);
			if (!chat || isChatSealed(chat)) return;
			set((st) => ({ messages: {
				...st.messages,
				[chatId]: (st.messages[chatId] ?? []).map((x) => x.id === messageId && x.status === "sent" ? {
					...x,
					status: "delivered"
				} : x)
			} }));
			window.setTimeout(() => {
				const list = get().messages[chatId] ?? [];
				const mine = list.find((x) => x.id === messageId);
				if (!mine || mine.status !== "delivered" || get().privacy.readReceipts === false) return;
				if (!list.some((m) => m.fromId !== "me" && m.fromId !== "wgo" && m.createdAt >= mine.createdAt)) return;
				set((st) => ({ messages: {
					...st.messages,
					[chatId]: (st.messages[chatId] ?? []).map((x) => x.id === messageId && x.status === "delivered" ? {
						...x,
						status: "read"
					} : x)
				} }));
			}, 560);
		}, 680);
	}, 420);
}
var useWgoStore = create()(persist((set, get) => ({
	...fresh(),
	screen: () => get().stack.at(-1) ?? { name: "splash" },
	push: (s) => set((st) => ({ stack: [...st.stack, s] })),
	pop: () => set((st) => ({ stack: st.stack.length > 1 ? st.stack.slice(0, -1) : st.stack })),
	goTab: (name) => set({ stack: [{ name }] }),
	replace: (s) => set((st) => ({ stack: [...st.stack.slice(0, -1), s] })),
	openDemo: () => {
		set({
			onboarded: true,
			me: demoMe(),
			stack: [{ name: "chats" }]
		});
		get().ensureCrypto();
	},
	acceptLegal: () => set({
		legalAcceptedAt: Date.now(),
		legalVersion: LEGAL_VERSION
	}),
	saveSignup: (data) => set((st) => ({
		pendingSignup: {
			...st.pendingSignup,
			...data
		},
		stack: [...st.stack, { name: "otp" }]
	})),
	completeSetup: (data) => {
		set((st) => ({
			onboarded: true,
			me: {
				...st.me,
				...st.pendingSignup,
				...data,
				id: "me",
				online: true
			},
			stack: [{ name: "chats" }]
		}));
		get().ensureCrypto();
	},
	updateMe: (data) => set((st) => ({ me: {
		...st.me,
		...data
	} })),
	setTheme: (theme) => set({ theme }),
	setLanguage: (language) => set({ language }),
	setA11y: (patch) => set((st) => ({ a11y: {
		...defaultA11y,
		...st.a11y,
		...patch
	} })),
	setPrivacy: (key, value) => set((st) => ({ privacy: {
		...st.privacy,
		[key]: value
	} })),
	setReadReceipts: (on) => set((st) => ({ privacy: {
		...st.privacy,
		readReceipts: on
	} })),
	setEphemeralCalls: (on) => set((st) => ({ privacy: {
		...st.privacy,
		ephemeralCalls: on
	} })),
	setNotif: (key, value) => set((st) => ({ notifs: {
		...st.notifs,
		[key]: value
	} })),
	setNearby: (mode) => set({
		nearby: mode,
		nearbyUntil: mode === 0 ? 0 : Date.now() + mode * 6e4
	}),
	setShowCiphertext: (value) => set({ showCiphertext: value }),
	toggleVerified: (userId) => set((st) => ({ verifiedIds: st.verifiedIds.includes(userId) ? st.verifiedIds.filter((id) => id !== userId) : [...st.verifiedIds, userId] })),
	safetyNumberFor: async (chatId) => {
		const st = get();
		if (!st.identity) return "";
		const chat = st.chats.find((c) => c.id === chatId);
		if (!chat) return "";
		if (chat.type === "group") return groupSafety(st.identity.publicJwk, chatId);
		const peerId = chat.participantIds.find((id) => id !== "me");
		if (!peerId) return "";
		let peer = st.deviceKeys[peerId];
		if (!peer) {
			peer = await generateBundle();
			set((s) => ({ deviceKeys: {
				...s.deviceKeys,
				[peerId]: peer
			} }));
		}
		return safetyNumber(st.identity.publicJwk, peer.publicJwk);
	},
	sealMessage: async (chatId, messageId) => {
		const msg = (get().messages[chatId] ?? []).find((m) => m.id === messageId);
		if (!msg?.text || msg.enc || !isEncryptable(msg.type)) return;
		const key = await aesFor(get, chatId);
		if (!key) return;
		try {
			const enc = await encryptText(key, msg.text);
			set((st) => ({ messages: {
				...st.messages,
				[chatId]: (st.messages[chatId] ?? []).map((m) => m.id === messageId ? {
					...m,
					enc,
					encFailed: false
				} : m)
			} }));
		} catch {}
	},
	unlockAll: async () => {
		const st = get();
		if (!st.identity) return;
		const next = {};
		for (const [chatId, list] of Object.entries(st.messages)) {
			const key = await aesFor(get, chatId);
			next[chatId] = [];
			for (const m of list) {
				if (!m.enc) {
					next[chatId].push(m);
					continue;
				}
				if (!key) {
					next[chatId].push({
						...m,
						text: void 0,
						encFailed: true
					});
					continue;
				}
				try {
					const text = await decryptText(key, m.enc);
					next[chatId].push({
						...m,
						text,
						encFailed: false
					});
				} catch {
					next[chatId].push({
						...m,
						text: void 0,
						encFailed: true
					});
				}
			}
		}
		const lang = get().language;
		set({
			messages: next,
			chats: get().chats.map((c) => {
				const last = next[c.id]?.at(-1);
				return last ? {
					...c,
					preview: previewOf(last, lang)
				} : c;
			})
		});
	},
	ensureCrypto: async () => {
		if (typeof crypto === "undefined" || !crypto.subtle) {
			set({ cryptoReady: true });
			return;
		}
		let identity = get().identity;
		const deviceKeys = { ...get().deviceKeys };
		let changed = false;
		if (!identity) {
			identity = await generateBundle();
			changed = true;
		}
		for (const id of Object.keys(get().users)) if (!deviceKeys[id]) {
			deviceKeys[id] = await generateBundle();
			changed = true;
		}
		const myFingerprint = !changed && get().myFingerprint ? get().myFingerprint : await fingerprintOf(identity.publicJwk);
		set({
			identity,
			deviceKeys,
			myFingerprint,
			cryptoReady: true
		});
		const st = get();
		for (const [chatId, list] of Object.entries(st.messages)) for (const m of list) if (m.text && !m.enc && isEncryptable(m.type)) await get().sealMessage(chatId, m.id);
		await get().unlockAll();
	},
	rotateIdentity: async () => {
		clearKeyCache();
		const identity = await generateBundle();
		set({
			identity,
			myFingerprint: await fingerprintOf(identity.publicJwk),
			verifiedIds: [],
			keyRotatedAt: Date.now()
		});
		await get().unlockAll();
	},
	sendMessage: (chatId, data) => {
		const existingChat = get().chats.find((c) => c.id === chatId);
		if (existingChat && isChatSealed(existingChat)) return;
		const message = {
			id: uid("m"),
			chatId,
			fromId: "me",
			type: data.type ?? "text",
			text: data.text,
			createdAt: Date.now(),
			status: "sending",
			reactions: [],
			duration: data.duration,
			imageUrl: data.imageUrl,
			videoUrl: data.videoUrl,
			viewOnce: data.viewOnce || void 0,
			stickerId: data.stickerId,
			listingId: data.listingId,
			shopId: data.shopId ?? existingChat?.shopId,
			replyTo: data.replyTo,
			expiresAt: existingChat?.disappearAfterMs ? Date.now() + existingChat.disappearAfterMs : void 0
		};
		set((st) => {
			const recent = message.type === "sticker" && message.stickerId ? [message.stickerId, ...(st.recentStickerIds ?? []).filter((id) => id !== message.stickerId)].slice(0, 32) : st.recentStickerIds;
			return {
				messages: {
					...st.messages,
					[chatId]: [...st.messages[chatId] ?? [], message]
				},
				recentStickerIds: recent,
				chats: st.chats.map((c) => c.id === chatId ? {
					...c,
					preview: previewOf(message),
					lastAt: message.createdAt,
					unread: 0,
					isRequest: false
				} : c)
			};
		});
		get().sealMessage(chatId, message.id);
		pumpReceipt(set, get, chatId, message.id);
		const chat = get().chats.find((c) => c.id === chatId);
		const other = chat?.participantIds.find((id) => id !== "me");
		if (!chat || chat.type !== "dm" || !other || get().blockedIds.includes(other)) return;
		const shop = chat.shopId ? get().shops.find((s) => s.id === chat.shopId) : void 0;
		const lines = shop ? shop.ownerId === "me" ? SHOP_CLIENT_REPLIES : SHOP_OWNER_REPLIES : REPLIES[other];
		if (!lines?.length) return;
		window.setTimeout(() => {
			const current = get().chats.find((c) => c.id === chatId);
			if (!current || isChatSealed(current)) return;
			set((st) => ({ typing: {
				...st.typing,
				[chatId]: true
			} }));
		}, 700);
		window.setTimeout(() => {
			const current = get().chats.find((c) => c.id === chatId);
			if (!current || isChatSealed(current)) return;
			const reply = {
				id: uid("m"),
				chatId,
				fromId: other,
				type: "text",
				text: lines[Math.floor(Math.random() * lines.length)],
				createdAt: Date.now(),
				status: "delivered",
				reactions: [],
				shopId: chat.shopId,
				expiresAt: current.disappearAfterMs ? Date.now() + current.disappearAfterMs : void 0
			};
			set((st) => {
				const onChat = st.stack.at(-1)?.name === "conversation" && st.stack.at(-1).chatId === chatId;
				return {
					typing: {
						...st.typing,
						[chatId]: false
					},
					messages: {
						...st.messages,
						[chatId]: [...(st.messages[chatId] ?? []).map((m) => m.fromId === "me" && st.privacy.readReceipts !== false && (m.status === "sent" || m.status === "delivered") ? {
							...m,
							status: "read"
						} : m), reply]
					},
					chats: st.chats.map((c) => c.id === chatId ? {
						...c,
						preview: reply.text ?? "",
						lastAt: reply.createdAt,
						unread: onChat ? 0 : c.unread + 1
					} : c)
				};
			});
			get().sealMessage(chatId, reply.id);
		}, 1600 + Math.random() * 900);
	},
	retryMessage: (chatId, messageId) => {
		const msg = (get().messages[chatId] ?? []).find((m) => m.id === messageId);
		if (!msg || msg.status !== "failed") return;
		set((st) => ({ messages: {
			...st.messages,
			[chatId]: (st.messages[chatId] ?? []).map((m) => m.id === messageId ? {
				...m,
				status: "sending"
			} : m)
		} }));
		pumpReceipt(set, get, chatId, messageId);
	},
	addReaction: (chatId, messageId, emoji) => set((st) => ({ messages: {
		...st.messages,
		[chatId]: (st.messages[chatId] ?? []).map((m) => {
			if (m.id !== messageId) return m;
			const mine = m.reactions.find((r) => r.userId === "me");
			const rest = m.reactions.filter((r) => r.userId !== "me");
			if (mine?.emoji === emoji) return {
				...m,
				reactions: rest
			};
			return {
				...m,
				reactions: [...rest, {
					emoji,
					userId: "me"
				}]
			};
		})
	} })),
	deleteMessage: (chatId, messageId) => set((st) => ({ messages: {
		...st.messages,
		[chatId]: (st.messages[chatId] ?? []).filter((m) => m.id !== messageId)
	} })),
	translateMessage: (chatId, messageId) => set((st) => ({ messages: {
		...st.messages,
		[chatId]: (st.messages[chatId] ?? []).map((m) => {
			if (m.id !== messageId || !m.text) return m;
			if (m.translated) return {
				...m,
				translated: void 0
			};
			const pair = TRANSLATIONS[m.text];
			const lang = st.language;
			const translated = pair ? lang === "fr" ? pair.fr === m.text ? pair.en : pair.fr : pair.en === m.text ? pair.fr : pair.en : lang === "fr" ? "Traduction : " + m.text : "Translation: " + m.text;
			return {
				...m,
				translated
			};
		})
	} })),
	markRead: (chatId) => set((st) => ({
		chats: st.chats.map((c) => c.id === chatId ? {
			...c,
			unread: 0
		} : c),
		messages: st.privacy.readReceipts !== false ? {
			...st.messages,
			[chatId]: (st.messages[chatId] ?? []).map((m) => m.fromId !== "me" ? m : {
				...m,
				status: "read"
			})
		} : st.messages
	})),
	toggleMute: (chatId) => set((st) => ({ chats: st.chats.map((c) => c.id === chatId ? {
		...c,
		muted: !c.muted
	} : c) })),
	archiveChat: (chatId) => set((st) => ({ chats: st.chats.map((c) => c.id === chatId ? {
		...c,
		archived: true
	} : c) })),
	deleteChat: (chatId) => set((st) => ({ chats: st.chats.filter((c) => c.id !== chatId) })),
	toggleUnread: (chatId) => set((st) => ({ chats: st.chats.map((c) => c.id === chatId ? {
		...c,
		unread: c.unread ? 0 : 1
	} : c) })),
	openOrCreateDm: (userId, asRequest = false) => {
		const existing = get().chats.find((c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral);
		if (existing) {
			if (asRequest === false && existing.isRequest) set((st) => ({ chats: st.chats.map((c) => c.id === existing.id ? {
				...c,
				isRequest: false
			} : c) }));
			get().push({
				name: "conversation",
				chatId: existing.id
			});
			get().markRead(existing.id);
			return existing.id;
		}
		const chat = {
			id: uid("c"),
			type: "dm",
			participantIds: ["me", userId],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: Boolean(asRequest),
			preview: "",
			lastAt: Date.now()
		};
		set((st) => ({
			chats: [chat, ...st.chats],
			messages: {
				...st.messages,
				[chat.id]: []
			},
			users: {
				...st.users,
				[userId]: st.users[userId] ? {
					...st.users[userId],
					connected: true
				} : st.users[userId]
			}
		}));
		get().push({
			name: "conversation",
			chatId: chat.id
		});
		return chat.id;
	},
	connectWith: (userId) => {
		const user = get().users[userId];
		if (!user) return;
		if (user.connected) {
			get().openOrCreateDm(userId);
			return;
		}
		if (get().sentRequestIds.includes(userId)) return;
		set((st) => ({ sentRequestIds: [...st.sentRequestIds, userId] }));
	},
	acceptRequest: (id) => {
		const req = get().requests.find((r) => r.id === id);
		if (!req) return;
		set((st) => ({
			requests: st.requests.map((r) => r.id === id ? {
				...r,
				status: "accepted"
			} : r),
			users: {
				...st.users,
				[req.fromId]: st.users[req.fromId] ? {
					...st.users[req.fromId],
					connected: true
				} : st.users[req.fromId]
			}
		}));
		const chatId = get().openOrCreateDm(req.fromId);
		get().sendMessage(chatId, {
			text: get().language === "fr" ? "Demande acceptée." : "Request accepted.",
			type: "system"
		});
	},
	ignoreRequest: (id) => set((st) => ({ requests: st.requests.map((r) => r.id === id ? {
		...r,
		status: "ignored"
	} : r) })),
	blockUser: (userId) => set((st) => ({
		blockedIds: [.../* @__PURE__ */ new Set([...st.blockedIds, userId])],
		chats: st.chats.filter((c) => !(c.type === "dm" && c.participantIds.includes(userId))),
		requests: st.requests.map((r) => r.fromId === userId ? {
			...r,
			status: "ignored"
		} : r)
	})),
	unblockUser: (userId) => set((st) => ({ blockedIds: st.blockedIds.filter((id) => id !== userId) })),
	reportTarget: ({ kind, targetId, reason }) => set((st) => ({ reports: [{
		id: `r-${Date.now()}`,
		kind,
		targetId,
		reason,
		at: Date.now()
	}, ...st.reports ?? []] })),
	signOut: () => set({
		onboarded: false,
		stack: [{ name: "onboarding" }],
		liveCall: null,
		appLocked: false
	}),
	deleteAccount: () => {
		set({
			...fresh(),
			stack: [{ name: "signup" }]
		});
		get().ensureCrypto();
	},
	setBiometrics: (on) => set({
		biometricsOn: on,
		appLocked: on
	}),
	lockApp: () => {
		if (get().biometricsOn) set({ appLocked: true });
	},
	unlockApp: () => set({ appLocked: false }),
	setPushMaster: (on) => set({ pushMaster: on }),
	setPushGranted: (on) => set({ pushGranted: on }),
	startCall: (userId, kind, dir = "out") => {
		const live = get().liveCall;
		if (live) {
			if (live.userId === userId) set({ liveCall: {
				...live,
				kind,
				dir: live.dir,
				pip: false
			} });
			else set({ liveCall: {
				...live,
				pip: false
			} });
			return;
		}
		const ephemeral = get().privacy.ephemeralCalls === true || get().chats.some((c) => c.ephemeral && !isChatSealed(c) && c.participantIds.includes(userId) && c.participantIds.includes("me"));
		set({ liveCall: {
			userId,
			kind,
			dir,
			pip: false,
			startedAt: Date.now(),
			ephemeral
		} });
	},
	minimizeCall: () => set((st) => st.liveCall ? { liveCall: {
		...st.liveCall,
		pip: true
	} } : st),
	expandCall: () => set((st) => st.liveCall ? { liveCall: {
		...st.liveCall,
		pip: false
	} } : st),
	endCall: (duration) => {
		const live = get().liveCall;
		if (!live) return;
		const incoming = live.dir === "in";
		const missed = incoming && duration < 1.5;
		const entry = {
			id: uid("call"),
			userId: live.userId,
			kind: live.kind,
			direction: incoming ? "in" : "out",
			missed,
			at: Date.now(),
			duration: !missed && duration >= 1.5 ? Math.round(duration) : void 0
		};
		set((st) => ({
			liveCall: null,
			calls: live.ephemeral ? st.calls : [entry, ...st.calls],
			stack: st.stack[st.stack.length - 1]?.name === "active-call" ? st.stack.slice(0, -1) : st.stack
		}));
	},
	setCallEphemeral: (on) => set((st) => st.liveCall ? { liveCall: {
		...st.liveCall,
		ephemeral: on
	} } : st),
	deleteCalls: (ids) => {
		const drop = new Set(ids);
		set((st) => ({ calls: st.calls.filter((c) => !drop.has(c.id)) }));
	},
	markCallsSeen: () => set({ callsSeenAt: Date.now() }),
	viewStory: (userId) => set((st) => {
		const now = Date.now();
		const viewedStories = {
			...st.viewedStories,
			[userId]: now
		};
		if (userId === "me") return { viewedStories };
		return {
			viewedStories,
			stories: st.stories.map((s) => {
				if (s.userId !== userId || !isStoryLive(s, now)) return s;
				const viewers = s.viewers ?? [];
				if (viewers.some((v) => v.userId === "me")) return s;
				return {
					...s,
					viewers: [...viewers, {
						userId: "me",
						at: now
					}]
				};
			})
		};
	}),
	addStory: (item) => {
		const id = uid("s");
		const createdAt = Date.now();
		set((st) => ({ stories: [{
			id,
			userId: "me",
			type: item.type,
			text: item.text,
			bg: item.bg,
			imageUrl: item.imageUrl,
			videoUrl: item.videoUrl,
			durationMs: item.durationMs,
			createdAt,
			viewers: [],
			kind: item.kind ?? "status",
			ttlMs: item.ttlMs ?? 864e5,
			music: item.music
		}, ...st.stories] }));
		Object.values(get().users).filter((u) => u.connected).slice(0, 5).forEach((u, i) => {
			window.setTimeout(() => {
				set((st) => ({ stories: st.stories.map((s) => s.id !== id || (s.viewers ?? []).some((v) => v.userId === u.id) ? s : {
					...s,
					viewers: [...s.viewers ?? [], {
						userId: u.id,
						at: Date.now()
					}]
				}) }));
			}, 900 + i * 1400);
		});
	},
	changeAvatar: (url) => {
		set((st) => ({ me: {
			...st.me,
			avatar: url
		} }));
		get().addStory({
			type: "image",
			imageUrl: url,
			kind: "profile"
		});
	},
	setDisappear: (chatId, ms) => {
		const lang = get().language;
		const label = !ms ? t(lang, "disappearOffSys") : ms >= 6048e5 ? t(lang, "disappear7dSys") : t(lang, "disappear24hSys");
		const sys = {
			id: uid("m"),
			chatId,
			fromId: "wgo",
			type: "system",
			text: label,
			createdAt: Date.now(),
			status: "read",
			reactions: []
		};
		set((st) => ({
			chats: st.chats.map((c) => c.id === chatId ? {
				...c,
				disappearAfterMs: ms || void 0
			} : c),
			messages: {
				...st.messages,
				[chatId]: [...st.messages[chatId] ?? [], sys]
			}
		}));
	},
	burnViewOnce: (chatId, messageId) => set((st) => ({ messages: {
		...st.messages,
		[chatId]: (st.messages[chatId] ?? []).map((m) => m.id === messageId ? {
			...m,
			viewed: true,
			imageUrl: void 0,
			videoUrl: void 0,
			text: void 0
		} : m)
	} })),
	createGroup: (name, participantIds, avatar) => {
		const created = get().language === "fr" ? `Vous avez créé le groupe ${name}. Partagez le QR ou le lien — jamais un numéro.` : `You created the group ${name}. Share the QR or the link — never a number.`;
		const chat = {
			id: uid("g"),
			type: "group",
			name,
			avatar,
			inviteToken: inviteSlug(name),
			participantIds: ["me", ...participantIds],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: created,
			lastAt: Date.now(),
			joinBy: "qr"
		};
		set((st) => ({
			chats: [chat, ...st.chats],
			messages: {
				...st.messages,
				[chat.id]: [{
					id: uid("m"),
					chatId: chat.id,
					fromId: "me",
					type: "system",
					text: created,
					createdAt: Date.now(),
					status: "read",
					reactions: []
				}]
			},
			stack: [
				{ name: "chats" },
				{
					name: "conversation",
					chatId: chat.id
				},
				{
					name: "group-qr",
					chatId: chat.id
				}
			]
		}));
		return chat.id;
	},
	setGroupAvatar: (chatId, url) => set((st) => ({ chats: st.chats.map((c) => c.id === chatId ? {
		...c,
		avatar: url
	} : c) })),
	ensureGroupInvite: (chatId) => {
		const chat = get().chats.find((c) => c.id === chatId);
		if (!chat) return "";
		if (chat.inviteToken) return chat.inviteToken;
		const token = inviteSlug(chat.name ?? "groupe");
		set((st) => ({ chats: st.chats.map((c) => c.id === chatId ? {
			...c,
			inviteToken: token
		} : c) }));
		return token;
	},
	openGroupInvite: (raw) => {
		const token = parseGroupInviteToken(raw);
		const chat = findChatByInvite(get().chats, get().oneTimeQrs, token);
		if (chat && !chat.inviteToken) get().ensureGroupInvite(chat.id);
		get().push({
			name: "group-invite",
			token: chat?.inviteToken ?? token
		});
	},
	startListingChat: (listing) => {
		const chatId = get().openOrCreateDm(listing.sellerId);
		if (!(get().messages[chatId] ?? []).some((m) => m.listingId === listing.id)) {
			const system = {
				id: uid("m"),
				chatId,
				fromId: "me",
				type: "listing",
				text: listing.title,
				listingId: listing.id,
				imageUrl: listing.image,
				createdAt: Date.now(),
				status: "read",
				reactions: []
			};
			set((st) => ({
				messages: {
					...st.messages,
					[chatId]: [...st.messages[chatId] ?? [], system]
				},
				chats: st.chats.map((c) => c.id === chatId ? {
					...c,
					preview: listing.title,
					lastAt: system.createdAt
				} : c)
			}));
		}
		return chatId;
	},
	resetDemo: () => {
		set({
			...fresh(),
			stack: [{ name: "splash" }]
		});
		get().ensureCrypto();
	},
	ensureMyCode: () => {
		const existing = get().codes.find((c) => c.ownerId === "me" && c.expiresAt > Date.now());
		if (existing) return existing;
		return get().regenerateMyCode();
	},
	regenerateMyCode: () => {
		const next = {
			code: sixDigit(),
			expiresAt: Date.now() + CODE_TTL,
			ownerId: "me",
			chatTtlMs: get().codeChatTtl
		};
		set((st) => ({ codes: [next, ...st.codes.filter((c) => c.ownerId !== "me")] }));
		return next;
	},
	ensurePeerCode: (userId) => {
		const existing = get().codes.find((c) => c.ownerId === userId && c.expiresAt > Date.now());
		if (existing) return existing;
		const next = {
			code: sixDigit(),
			expiresAt: Date.now() + CODE_TTL,
			ownerId: userId,
			chatTtlMs: 36e5
		};
		set((st) => ({ codes: [next, ...st.codes.filter((c) => c.ownerId !== userId)] }));
		return next;
	},
	redeemCode: (raw) => {
		const code = raw.replace(/\s/g, "");
		const rows = get().codes.filter((c) => c.code === code);
		if (!rows.length) return {
			ok: false,
			reason: "missing"
		};
		const live = rows.find((c) => c.expiresAt > Date.now());
		if (!live) return {
			ok: false,
			reason: "expired"
		};
		if (live.ownerId === "me") return {
			ok: false,
			reason: "own"
		};
		set((st) => ({ codes: st.codes.filter((c) => c.ownerId !== live.ownerId) }));
		get().openEphemeralChat(live.ownerId, live.chatTtlMs);
		return {
			ok: true,
			kind: "profile",
			userId: live.ownerId,
			via: "code"
		};
	},
	simulateCodeEntered: (fromUserId = "ines") => {
		if (!get().users[fromUserId]) return;
		get().openEphemeralChat(fromUserId, get().codeChatTtl);
	},
	createOneTimeQr: ({ kind, label, hours, target }) => {
		const qr = {
			id: uid("qr"),
			token: qrToken(kind),
			kind,
			label,
			expiresAt: Date.now() + hours * 36e5,
			used: false,
			ownerId: "me",
			target: target ?? {
				type: "profile",
				userId: "me"
			}
		};
		set((st) => ({ oneTimeQrs: [qr, ...st.oneTimeQrs] }));
		return qr;
	},
	redeemQr: (token) => {
		const raw = token.replace(/^https?:\/\//, "").replace(/^wgo\.me\/b\//, "");
		const shopHit = get().shops.find((s) => s.qrToken === token || s.qrToken === raw || s.handle === raw.replace(/^@/, ""));
		if (shopHit) {
			get().replace({
				name: "shop",
				shopId: shopHit.id
			});
			return {
				ok: true,
				kind: "shop",
				shopId: shopHit.id
			};
		}
		const qr = get().oneTimeQrs.find((q) => q.token === token || q.id === token);
		if (!qr) return {
			ok: false,
			reason: "missing"
		};
		if (qr.expiresAt < Date.now()) return {
			ok: false,
			reason: "expired"
		};
		if (qr.kind === "once" && qr.used) return {
			ok: false,
			reason: "used"
		};
		if (qr.ownerId === "me" && qr.target.type === "profile" && qr.target.userId === "me") return {
			ok: false,
			reason: "own"
		};
		if (qr.kind === "once") set((st) => ({ oneTimeQrs: st.oneTimeQrs.map((q) => q.id === qr.id ? {
			...q,
			used: true
		} : q) }));
		if (qr.target.type === "group") {
			get().joinGroup(qr.target.chatId);
			return {
				ok: true,
				kind: "group",
				chatId: qr.target.chatId
			};
		}
		get().openEphemeralChat(qr.target.userId);
		return {
			ok: true,
			kind: "profile",
			userId: qr.target.userId,
			via: "qr"
		};
	},
	sendIntro: (toUserId, subjectId, note) => {
		const intro = {
			id: uid("intro"),
			introducerId: "me",
			recipientId: toUserId,
			subjectId,
			note,
			createdAt: Date.now(),
			status: "pending"
		};
		set((st) => ({ intros: [intro, ...st.intros] }));
		const existing = get().chats.find((c) => c.type === "dm" && c.participantIds.includes(toUserId));
		if (existing) {
			const subject = get().users[subjectId];
			const text = get().language === "fr" ? `Vous avez présenté ${subject?.displayName ?? "quelqu’un"} à ${get().users[toUserId]?.displayName ?? ""}. Le @ reste caché jusqu’à acceptation.` : `You introduced ${subject?.displayName ?? "someone"} to ${get().users[toUserId]?.displayName ?? ""}. The @ stays hidden until they accept.`;
			const message = {
				id: uid("m"),
				chatId: existing.id,
				fromId: "me",
				type: "system",
				text,
				createdAt: Date.now(),
				status: "read",
				reactions: []
			};
			set((st) => ({
				messages: {
					...st.messages,
					[existing.id]: [...st.messages[existing.id] ?? [], message]
				},
				chats: st.chats.map((c) => c.id === existing.id ? {
					...c,
					preview: text,
					lastAt: message.createdAt
				} : c)
			}));
		}
		return intro.id;
	},
	acceptIntro: (id) => {
		const intro = get().intros.find((x) => x.id === id);
		if (!intro || intro.status !== "pending") return;
		const subjectId = intro.subjectId;
		set((st) => ({
			intros: st.intros.map((x) => x.id === id ? {
				...x,
				status: "accepted"
			} : x),
			users: {
				...st.users,
				[subjectId]: st.users[subjectId] ? {
					...st.users[subjectId],
					connected: true
				} : st.users[subjectId],
				[intro.introducerId]: st.users[intro.introducerId] ? {
					...st.users[intro.introducerId],
					connected: true
				} : st.users[intro.introducerId]
			}
		}));
		const chatId = get().openOrCreateDm(subjectId);
		const introducer = get().users[intro.introducerId];
		get().sendMessage(chatId, {
			type: "system",
			text: get().language === "fr" ? `${introducer?.displayName ?? "Un contact"} vous a présentés. Aucun numéro n’a été échangé.` : `${introducer?.displayName ?? "A contact"} introduced you. No numbers were exchanged.`
		});
	},
	declineIntro: (id) => set((st) => ({ intros: st.intros.map((x) => x.id === id ? {
		...x,
		status: "declined"
	} : x) })),
	joinGroup: (chatId) => {
		const chat = get().chats.find((c) => c.id === chatId);
		if (!chat) return;
		if (!chat.participantIds.includes("me")) {
			const text = get().language === "fr" ? "Vous avez rejoint via un lien Wipp. Aucun numéro n’a été partagé." : "You joined via a Wipp link. No number was shared.";
			const message = {
				id: uid("m"),
				chatId,
				fromId: "me",
				type: "system",
				text,
				createdAt: Date.now(),
				status: "read",
				reactions: []
			};
			set((st) => ({
				chats: st.chats.map((c) => c.id === chatId ? {
					...c,
					participantIds: [...c.participantIds, "me"],
					preview: text,
					lastAt: message.createdAt,
					unread: 0
				} : c),
				messages: {
					...st.messages,
					[chatId]: [...st.messages[chatId] ?? [], message]
				}
			}));
		}
		get().replace({
			name: "conversation",
			chatId
		});
		get().markRead(chatId);
	},
	setCodeChatTtl: (ms) => set((st) => ({
		codeChatTtl: ms,
		codes: st.codes.map((c) => c.ownerId === "me" && c.expiresAt > Date.now() ? {
			...c,
			chatTtlMs: ms
		} : c)
	})),
	openEphemeralChat: (userId, ttlMs, via) => {
		get().sealExpired();
		const ttl = ttlMs ?? get().codeChatTtl;
		const permanent = get().chats.find((c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral);
		if (permanent) {
			get().replace({
				name: "conversation",
				chatId: permanent.id
			});
			get().markRead(permanent.id);
			return permanent.id;
		}
		const existing = get().chats.find((c) => c.type === "dm" && c.participantIds.includes(userId) && c.ephemeral && !isChatSealed(c));
		if (existing) {
			if (via === "touch") {
				const crossed = get().language === "fr" ? "Vous vous êtes croisés. Prénom seulement." : "You crossed paths. First name only.";
				const note = {
					id: uid("m"),
					chatId: existing.id,
					fromId: "me",
					type: "system",
					text: crossed,
					createdAt: Date.now(),
					status: "read",
					reactions: []
				};
				set((st) => ({
					messages: {
						...st.messages,
						[existing.id]: [...st.messages[existing.id] ?? [], note]
					},
					chats: st.chats.map((c) => c.id === existing.id ? {
						...c,
						preview: crossed,
						lastAt: note.createdAt,
						unread: 0
					} : c)
				}));
			}
			get().replace({
				name: "conversation",
				chatId: existing.id
			});
			get().markRead(existing.id);
			return existing.id;
		}
		const fr = get().language === "fr";
		const opened = via === "touch" ? fr ? "Vous vous êtes croisés. Prénom seulement. Le chat s’efface à l’heure dite." : "You crossed paths. First name only. The thread disappears at the set time." : fr ? "Chat temporaire. Aucun @ n’est visible. Le chat s’efface à l’heure dite." : "Temporary chat. No @ is visible. The thread disappears at the set time.";
		const hello = via === "touch" ? fr ? "Salut. On s’est croisés." : "Hey. We just crossed paths." : null;
		const chat = {
			id: uid("c"),
			type: "dm",
			participantIds: ["me", userId],
			unread: hello ? 1 : 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: hello ?? opened,
			lastAt: Date.now(),
			ephemeral: true,
			expiresAt: Date.now() + ttl,
			sealed: false
		};
		const system = {
			id: uid("m"),
			chatId: chat.id,
			fromId: "me",
			type: "system",
			text: opened,
			createdAt: Date.now(),
			status: "read",
			reactions: []
		};
		const peerMsg = hello ? {
			id: uid("m"),
			chatId: chat.id,
			fromId: userId,
			type: "text",
			text: hello,
			createdAt: Date.now() + 1,
			status: "delivered",
			reactions: []
		} : null;
		set((st) => ({
			chats: [chat, ...st.chats],
			messages: {
				...st.messages,
				[chat.id]: peerMsg ? [system, peerMsg] : [system]
			}
		}));
		const top = get().stack.at(-1)?.name;
		if (top === "live-code" || top === "scanner" || top === "one-time-qr" || top === "wgo-touch") get().replace({
			name: "conversation",
			chatId: chat.id
		});
		else get().push({
			name: "conversation",
			chatId: chat.id
		});
		return chat.id;
	},
	setTouchAllowed: (on) => set({ touchAllowed: on }),
	completeTouch: (userId) => {
		if (!get().users[userId]) return;
		const now = Date.now();
		const existing = get().chats.find((c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral);
		const sysText = get().language === "fr" ? "Connectés sur Wipp. Aucun numéro n’a été échangé." : "Connected on Wipp. No number was exchanged.";
		const note = (chatId) => ({
			id: uid("m"),
			chatId,
			fromId: "wgo",
			type: "system",
			text: sysText,
			createdAt: now,
			status: "read",
			reactions: []
		});
		set((st) => {
			const users = {
				...st.users,
				[userId]: st.users[userId] ? {
					...st.users[userId],
					connected: true
				} : st.users[userId]
			};
			if (existing) return {
				users,
				messages: {
					...st.messages,
					[existing.id]: [...st.messages[existing.id] ?? [], note(existing.id)]
				},
				chats: st.chats.map((c) => c.id === existing.id ? {
					...c,
					preview: sysText,
					lastAt: now
				} : c)
			};
			const chat = {
				id: uid("c"),
				type: "dm",
				participantIds: ["me", userId],
				unread: 0,
				muted: false,
				pinned: false,
				archived: false,
				isRequest: false,
				preview: sysText,
				lastAt: now
			};
			return {
				users,
				chats: [chat, ...st.chats],
				messages: {
					...st.messages,
					[chat.id]: [note(chat.id)]
				}
			};
		});
	},
	sealChat: (chatId) => {
		const ended = get().language === "fr" ? "Conversation terminée. Plus aucun accès." : "Chat ended. No access left.";
		set((st) => ({
			chats: st.chats.map((c) => c.id === chatId ? {
				...c,
				sealed: true,
				preview: ended,
				unread: 0,
				lastAt: Date.now()
			} : c),
			messages: {
				...st.messages,
				[chatId]: [{
					id: uid("m"),
					chatId,
					fromId: "me",
					type: "system",
					text: ended,
					createdAt: Date.now(),
					status: "read",
					reactions: []
				}]
			}
		}));
	},
	keepContact: (chatId) => {
		const other = get().chats.find((c) => c.id === chatId)?.participantIds.find((id) => id !== "me");
		const text = get().language === "fr" ? "Vous avez révélé votre Wgo. C’est maintenant un contact." : "You revealed your Wgo. They’re a contact now.";
		set((st) => ({
			chats: st.chats.map((c) => c.id === chatId ? {
				...c,
				ephemeral: false,
				sealed: false,
				expiresAt: void 0,
				preview: text
			} : c),
			users: other && st.users[other] ? {
				...st.users,
				[other]: {
					...st.users[other],
					connected: true
				}
			} : st.users
		}));
		get().sendMessage(chatId, {
			type: "system",
			text
		});
	},
	sealExpired: () => {
		const now = Date.now();
		get().chats.filter((c) => c.ephemeral && !c.sealed && c.expiresAt && c.expiresAt <= now).forEach((c) => get().sealChat(c.id));
		set((st) => {
			let dirty = false;
			const messages = { ...st.messages };
			const chats = st.chats.map((c) => {
				const list = messages[c.id];
				if (!list) return c;
				const kept = list.filter((m) => !m.expiresAt || m.expiresAt > now);
				if (kept.length === list.length) return c;
				dirty = true;
				messages[c.id] = kept;
				const last = [...kept].reverse().find((m) => m.type !== "system");
				return {
					...c,
					preview: last ? previewOf(last, st.language) : "",
					lastAt: last?.createdAt ?? c.lastAt
				};
			});
			const stories = st.stories.filter((s) => isStoryLive(s, now));
			if (stories.length !== st.stories.length) dirty = true;
			if (!dirty) return st;
			return {
				messages,
				chats,
				stories
			};
		});
	},
	locateMe: () => {
		const cityLabel = get().me.city || HOME_GEO.label;
		const apply = (lat, lng, source) => {
			const far = metersBetween({
				lat,
				lng
			}, HOME_GEO) > 8e4;
			if (source === "gps" && far) {
				set({
					geo: {
						lat: HOME_GEO.lat,
						lng: HOME_GEO.lng,
						label: cityLabel,
						source: "city"
					},
					locateStatus: "done"
				});
				return;
			}
			set({
				geo: {
					lat,
					lng,
					label: source === "city" ? cityLabel : cityLabel,
					source
				},
				locateStatus: source === "gps" ? "done" : "denied"
			});
		};
		set({ locateStatus: "locating" });
		if (!navigator.geolocation) {
			apply(HOME_GEO.lat, HOME_GEO.lng, "city");
			return;
		}
		navigator.geolocation.getCurrentPosition((pos) => apply(pos.coords.latitude, pos.coords.longitude, "gps"), () => apply(HOME_GEO.lat, HOME_GEO.lng, "city"), {
			enableHighAccuracy: false,
			timeout: 1600,
			maximumAge: 12e4
		});
	},
	createShop: (data) => {
		const handle = data.handle.replace(/^@/, "").trim().toLowerCase() || "boutique";
		const existing = get().shops.find((s) => s.ownerId === "me");
		if (existing) {
			set((st) => ({ shops: st.shops.map((s) => s.id === existing.id ? {
				...s,
				name: data.name,
				category: data.category,
				bio: data.bio,
				address: data.address,
				city: data.city,
				country: data.country,
				phone: data.phone,
				handle,
				hours: data.hours,
				image: data.image,
				photos: data.photos
			} : s) }));
			get().replace({
				name: "shop",
				shopId: existing.id
			});
			return existing.id;
		}
		let code = sixDigit();
		while (get().shops.some((s) => s.code === code)) code = sixDigit();
		const shop = {
			id: uid("shop"),
			name: data.name,
			category: data.category,
			ownerId: "me",
			handle,
			bio: data.bio,
			address: data.address,
			city: data.city || get().me.city || HOME_GEO.label,
			country: data.country || "Canada",
			phone: data.phone,
			lat: get().geo.lat,
			lng: get().geo.lng,
			hours: data.hours,
			plan: "vitrine",
			image: data.image,
			photos: data.photos,
			code,
			qrToken: qrToken("shop")
		};
		set((st) => ({ shops: [shop, ...st.shops] }));
		get().replace({
			name: "shop",
			shopId: shop.id
		});
		return shop.id;
	},
	openShopChat: (shopId) => {
		const shop = get().shops.find((s) => s.id === shopId);
		if (!shop) return "";
		if (shop.ownerId === "me") {
			get().push({
				name: "shop",
				shopId
			});
			return "";
		}
		const existing = get().chats.find((c) => c.type === "dm" && c.shopId === shopId && c.participantIds.includes("me"));
		if (existing) {
			get().markRead(existing.id);
			set({ stack: [{ name: "chats" }, {
				name: "conversation",
				chatId: existing.id
			}] });
			return existing.id;
		}
		const chat = {
			id: uid("c"),
			type: "dm",
			participantIds: ["me", shop.ownerId],
			unread: 0,
			muted: false,
			pinned: false,
			archived: false,
			isRequest: false,
			preview: shop.name,
			lastAt: Date.now(),
			shopId: shop.id
		};
		const card = {
			id: uid("m"),
			chatId: chat.id,
			fromId: "me",
			type: "shop",
			text: shop.name,
			shopId: shop.id,
			createdAt: Date.now(),
			status: "read",
			reactions: []
		};
		set((st) => ({
			chats: [chat, ...st.chats],
			messages: {
				...st.messages,
				[chat.id]: [card]
			},
			users: {
				...st.users,
				[shop.ownerId]: st.users[shop.ownerId] ? {
					...st.users[shop.ownerId],
					connected: true
				} : st.users[shop.ownerId]
			},
			stack: [{ name: "chats" }, {
				name: "conversation",
				chatId: chat.id
			}]
		}));
		return chat.id;
	},
	createLifestyle: (data) => {
		const geo = get().geo;
		const item = {
			id: uid("ls"),
			kind: data.kind,
			title: data.title,
			when: data.when,
			place: data.place,
			city: get().me.city || HOME_GEO.label,
			lat: geo.lat,
			lng: geo.lng,
			hostId: "me",
			image: data.image,
			note: data.note,
			deal: data.deal,
			paid: data.paid,
			price: data.price
		};
		set((st) => ({ lifestyle: [item, ...st.lifestyle] }));
		get().replace({
			name: "lifestyle",
			itemId: item.id
		});
		return item.id;
	},
	toggleSavedListing: (id) => set((st) => {
		const cur = st.savedListingIds ?? [];
		return { savedListingIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
	}),
	toggleSavedEvent: (id) => set((st) => {
		const cur = st.savedEventIds ?? [];
		return { savedEventIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
	})
}), {
	name: "wgo-store-v14",
	skipHydration: true,
	partialize: (s) => ({
		onboarded: s.onboarded,
		theme: s.theme,
		language: s.language,
		a11y: s.a11y ?? defaultA11y,
		me: s.me,
		users: s.users,
		chats: s.chats,
		messages: persistMessages(s.messages),
		stories: s.stories,
		viewedStories: s.viewedStories,
		calls: s.calls,
		callsSeenAt: s.callsSeenAt,
		requests: s.requests,
		blockedIds: s.blockedIds,
		sentRequestIds: s.sentRequestIds,
		privacy: s.privacy,
		notifs: s.notifs,
		nearby: s.nearby,
		nearbyUntil: s.nearbyUntil,
		codes: s.codes,
		oneTimeQrs: s.oneTimeQrs,
		intros: s.intros,
		codeChatTtl: s.codeChatTtl,
		shops: s.shops,
		lifestyle: s.lifestyle,
		identity: s.identity,
		deviceKeys: s.deviceKeys,
		myFingerprint: s.myFingerprint,
		verifiedIds: s.verifiedIds,
		showCiphertext: s.showCiphertext,
		keyRotatedAt: s.keyRotatedAt,
		savedListingIds: s.savedListingIds,
		savedEventIds: s.savedEventIds,
		touchAllowed: s.touchAllowed,
		recentStickerIds: s.recentStickerIds ?? [],
		legalAcceptedAt: s.legalAcceptedAt ?? 0,
		legalVersion: s.legalVersion ?? "",
		reports: s.reports ?? [],
		biometricsOn: s.biometricsOn ?? false,
		pushMaster: s.pushMaster ?? false,
		pushGranted: s.pushGranted ?? false
	})
}));
function useT() {
	const language = useWgoStore((s) => s.language);
	return (key) => t(language, key);
}
function isTabScreen(name) {
	return TAB.includes(name);
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/boot-BFpP81oK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function HapticFlash() {
	const [kind, setKind] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const on = (e) => {
			const detail = e.detail;
			setKind(detail);
		};
		window.addEventListener("wipp-haptic", on);
		return () => window.removeEventListener("wipp-haptic", on);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!kind) return;
		const id = window.setTimeout(() => setKind(null), 520);
		return () => window.clearTimeout(id);
	}, [kind]);
	if (!kind) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "haptic-flash",
		"data-kind": kind,
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
		]
	});
}
function PhoneShell({ children, intro }) {
	const theme = useWgoStore((s) => s.theme);
	const a11y = useWgoStore((s) => s.a11y) ?? defaultA11y;
	const [systemDark, setSystemDark] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const apply = () => setSystemDark(mq.matches);
		apply();
		mq.addEventListener("change", apply);
		return () => mq.removeEventListener("change", apply);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "phone-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: intro ? "device is-intro" : "device",
			"data-theme": theme === "system" ? systemDark ? "dark" : "light" : theme,
			"data-large-touch": a11y.largeTouch ? "1" : void 0,
			"data-large-text": a11y.largeText ? "1" : void 0,
			"data-reduce-motion": a11y.reduceMotion ? "1" : void 0,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "island" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "device-app",
					children
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HapticFlash, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "wipp-live",
					className: "sr-only",
					"aria-live": "polite",
					"aria-atomic": "true"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "home-bar" })
			]
		})
	});
}
var INTRO_SRC = "/brand/wipp-boot.mp4";
var INTRO_POSTER = "/brand/wipp-boot.webp";
var INTRO_BG = "#02081e";
function IntroSplash({ onDone }) {
	const t = useT();
	const videoRef = (0, import_react.useRef)(null);
	const finished = (0, import_react.useRef)(false);
	const [needsTap, setNeedsTap] = (0, import_react.useState)(false);
	const finish = () => {
		if (finished.current) return;
		finished.current = true;
		onDone();
	};
	(0, import_react.useEffect)(() => {
		const video = videoRef.current;
		if (!video) return;
		video.muted = false;
		video.volume = 1;
		video.playsInline = true;
		const playWithSound = () => {
			video.muted = false;
			video.volume = 1;
			return video.play();
		};
		playWithSound().then(() => setNeedsTap(false), () => {
			video.pause();
			setNeedsTap(true);
		});
		const unlock = () => {
			if (finished.current) return;
			if (!video.paused && !video.muted) return;
			video.currentTime = 0;
			playWithSound().then(() => setNeedsTap(false), () => {});
		};
		window.addEventListener("pointerdown", unlock);
		window.addEventListener("keydown", unlock);
		const failSafe = window.setTimeout(finish, 4800);
		return () => {
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
			window.clearTimeout(failSafe);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: "relative flex h-full w-full items-end justify-center overflow-hidden",
		style: { background: INTRO_BG },
		"aria-label": "Wipp",
		onClick: () => {
			const video = videoRef.current;
			if (!video || finished.current) return;
			video.muted = false;
			video.volume = 1;
			video.currentTime = 0;
			video.play().then(() => setNeedsTap(false));
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
			ref: videoRef,
			className: "pointer-events-none absolute inset-0 size-full object-cover",
			src: INTRO_SRC,
			poster: INTRO_POSTER,
			playsInline: true,
			preload: "auto",
			onEnded: finish,
			onError: finish
		}), needsTap ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "relative z-10 mb-16 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg",
			children: t("introTapSound")
		}) : null]
	});
}
var AUTH = /* @__PURE__ */ new Set([
	"splash",
	"onboarding",
	"signup",
	"login",
	"otp",
	"setup"
]);
var WgoApp = (0, import_react.lazy)(() => import("./app-CnfuwP9N.mjs").then((n) => n.t).then((m) => ({ default: m.WgoApp })));
function BootedApp({ pendingGroupToken }) {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [introDone, setIntroDone] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		Promise.resolve(useWgoStore.persist.rehydrate()).then(() => {
			const s = useWgoStore.getState();
			useWgoStore.setState({ chats: withGroupMeta(s.chats) });
			if (s.onboarded) {
				const top = s.stack.at(-1)?.name;
				if (!top || AUTH.has(top)) useWgoStore.setState({ stack: [{ name: "chats" }] });
			} else if (!s.stack.length || s.stack.at(-1)?.name === "splash") useWgoStore.setState({ stack: [{ name: "onboarding" }] });
			if (pendingGroupToken) {
				if (!useWgoStore.getState().onboarded) useWgoStore.getState().openDemo();
				useWgoStore.getState().openGroupInvite(pendingGroupToken);
			}
			setReady(true);
			useWgoStore.getState().ensureCrypto();
		});
	}, [pendingGroupToken]);
	(0, import_react.useEffect)(() => {
		import("./app-CnfuwP9N.mjs").then((n) => n.t);
	}, []);
	if (!introDone) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneShell, {
		intro: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntroSplash, { onDone: () => setIntroDone(true) })
	});
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneShell, {
		intro: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-full w-full",
			style: { background: "#02081e" }
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
		fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full bg-bg" }) }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WgoApp, {})
	});
}
//#endregion
export { formatRemainShort as A, metersBetween as B, formatChatTime as C, formatMeters as D, formatLastSeen as E, isEmojiSticker as F, stickerLabel as G, shortFp as H, isStickerId as I, storyViewMs as J, stickersInPack as K, isStoryLive as L, groupInviteHref as M, groupInviteLabel as N, formatRelativeShort as O, isChatSealed as P, isTabScreen as R, findChatByInvite as S, formatDuration as T, stickerById as U, seedPharmacies as V, stickerIdFromEmoji as W, useWgoStore as X, useT as Y, yearsOld as Z, STORY_VIDEO_MAX_MS as _, DISAPPEAR_24H as a, defaultA11y as b, LEGAL_CONTACT as c, NEARBY as d, SHOP_CAT_KEYS as f, STORY_TTL_48H as g, STORY_TTL_24H as h, APP_HOST as i, formatSafety as j, formatRemain as k, LEGAL_VERSION as l, STORY_MUSIC as m, IntroSplash as n, DISAPPEAR_7D as o, STICKER_PACKS as p, storyTtlMs as q, PhoneShell as r, EMOJI_CATS as s, BootedApp as t, MUSIC_MOODS as u, TAKEN_USERNAMES as v, formatClock as w, emojiFromStickerId as x, cn as y, legalDoc as z };
