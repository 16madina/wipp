import type { Lang } from "./types";

export const LEGAL_VERSION = "2026-09-21";
export const LEGAL_CONTACT = "lazoneclient@gmail.com";

export type LegalDocId = "privacy" | "terms";

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const privacyFr: LegalDocument = {
  title: "Politique de confidentialité",
  updated: "21 septembre 2026",
  intro:
    "Cette politique explique comment WIPP, exploité au Canada par DeeDigital et, pour les activités concernées en Afrique, par Dee Digital Group, recueille, utilise, communique, conserve et supprime vos renseignements personnels. Contact : lazoneclient@gmail.com.",
  sections: [
    {
      title: "1. Principes",
      paragraphs: [
        "Nous limitons la collecte à ce qui est nécessaire. Les paramètres de confidentialité sont, lorsque la loi l’exige, au niveau le plus élevé par défaut. Caméra, micro, photos, localisation, contacts, Bluetooth et notifications ne sont demandés qu’au moment où une fonction en a besoin. Vous pouvez refuser ou retirer une permission dans les réglages de l’appareil.",
      ],
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
        "Signalements et assistance : le contenu que vous nous transmettez pour un litige, un abus ou le support.",
      ],
    },
    {
      title: "3. Finalités",
      paragraphs: [
        "Créer et sécuriser le compte; fournir messagerie, appels, groupes et Stories; permettre les connexions par @username, QR, lien ou WIPP Touch; afficher Explorer; envoyer les notifications que vous autorisez; prévenir fraude, spam, harcèlement et usurpation; traiter les signalements; diagnostiquer les pannes; respecter la loi; améliorer la fiabilité du service.",
        "Un consentement distinct est demandé pour toute finalité non essentielle, notamment une publicité ciblée — que WIPP n’active pas à ce jour.",
      ],
    },
    {
      title: "4. Chiffrement de bout en bout — et ses limites",
      paragraphs: [
        "Les conversations privées (DM) prises en charge par le système E2EE de WIPP sont chiffrées. WIPP ne conserve pas les clés privées de manière à lire ces messages. Les groupes et médias suivront.",
        "Le E2EE ne couvre pas encore : groupes, médias, profils publics, Stories publiques, annonces, Boutiques, événements, listes de membres, métadonnées techniques, ni un contenu que vous copiez, transférez ou capturez.",
        "Une capture d’écran, un enregistrement d’écran, un mini-lecteur système (PiP) ou un appareil compromis peut révéler un contenu autrement chiffré. Les messages éphémères disparaissent de WIPP selon le délai choisi; ils ne empêchent pas un destinataire de les photographier.",
        "Si vous signalez un message, les éléments nécessaires à l’examen peuvent être transmis à WIPP.",
      ],
    },
    {
      title: "5. Appels, caméra, micro et mini-lecteur",
      paragraphs: [
        "Un appel utilise caméra et/ou microphone avec votre permission. WIPP et son fournisseur d’appels (LiveKit) traitent le flux technique nécessaire à l’acheminement. WIPP n’enregistre pas vos appels.",
        "Si vous quittez l’application pendant un appel, le système d’exploitation peut afficher un mini-lecteur ou un indicateur (point vert, pastille). Cela fait partie de l’appareil, pas d’une publication WIPP.",
        "Il est interdit d’enregistrer un appel ou de le diffuser sans le consentement requis par la loi applicable.",
      ],
    },
    {
      title: "6. WIPP Touch, QR, groupes et liens",
      paragraphs: [
        "WIPP Touch privilégie des jetons temporaires. La proximité de deux téléphones n’est jamais un consentement : chaque personne accepte ou refuse.",
        "Un QR ou un lien de groupe peut être partagé hors de WIPP. Quiconque le reçoit peut tenter de rejoindre le groupe. L’administrateur est responsable des invitations qu’il diffuse.",
        "La découvrabilité Bluetooth s’arrête lorsque vous quittez la fonction, sous réserve des capacités de l’appareil.",
      ],
    },
    {
      title: "7. Localisation, cartes et Google Maps",
      paragraphs: [
        "À proximité, Services, pharmacies, itinéraires et cartes peuvent utiliser une position approximative ou précise, seulement après autorisation. Google Maps Platform peut traiter des données techniques selon ses propres politiques. WIPP n’est pas un service d’urgence.",
      ],
    },
    {
      title: "8. Contacts",
      paragraphs: [
        "L’accès au carnet d’adresses est facultatif et séparé. Le refus n’empêche pas le reste de WIPP. Les numéros ne sont utilisés que pour retrouver ou inviter, pas pour les vendre ni pour du démarchage WIPP.",
      ],
    },
    {
      title: "9. Informations publiques",
      paragraphs: [
        "Ce que vous publiez (photo, bio, @username, Story, annonce, Boutique, événement) peut être vu selon vos réglages, y compris par des personnes hors de vos contacts. Ne publiez pas ce que vous voulez garder secret.",
      ],
    },
    {
      title: "10. Fournisseurs",
      paragraphs: [
        "Supabase : compte, base de données, stockage, temps réel.",
        "LiveKit : appels audio/vidéo.",
        "Google Maps Platform : cartes et lieux.",
        "Magasins d’applications Apple et Google : distribution, achats éventuels, notifications.",
        "Musique superposée aux Stories : le fournisseur de licences musicales, le cas échéant, peut recevoir des identifiants techniques d’écoute in-app. Cette musique n’est pas téléchargeable ni réutilisable hors WIPP.",
        "WIPP ne vend pas vos renseignements. Pas de publicité ciblée tierce à ce jour. Un changement important sera annoncé et, si la loi l’exige, soumis à un nouveau consentement.",
      ],
    },
    {
      title: "11. Transferts, conservation, suppression",
      paragraphs: [
        "Des fournisseurs peuvent traiter des données hors du Québec, du Canada ou de votre pays. Lorsque la loi l’exige, WIPP met en place des mesures contractuelles et techniques avant ces transferts.",
        "Conservation limitée aux finalités, à la sécurité, aux litiges et aux obligations légales. Exemples indicatifs : compte tant qu’il est actif; Stories selon la durée choisie (24 h ou 48 h); messages éphémères selon le délai du chat; journaux de sécurité jusqu’à 12 mois; signalements le temps de l’examen.",
        "Vous pouvez supprimer le compte depuis Moi > Compte > Supprimer mon compte. Une ressource Web sera aussi offerte pour les exigences Apple et Google Play. Une désactivation n’équivaut pas à une suppression.",
      ],
    },
    {
      title: "12. Vos droits",
      paragraphs: [
        "Selon votre territoire : accès, rectification, suppression, retrait de consentement, portabilité lorsque le droit le permet, et plainte. Au Québec : Commission d’accès à l’information. Au Canada : Commissariat à la protection de la vie privée. Courriel : lazoneclient@gmail.com. Nous pouvons vérifier votre identité avant de répondre.",
      ],
    },
    {
      title: "13. Mineurs",
      paragraphs: [
        "WIPP n’est pas destiné aux enfants de moins de 13 ans. Au Québec, les renseignements d’un mineur de moins de 14 ans ne sont pas recueillis auprès de lui sans le titulaire de l’autorité parentale, sauf exception légale. Un compte créé en violation de ces règles peut être supprimé.",
      ],
    },
    {
      title: "14. Sécurité, modération, modifications",
      paragraphs: [
        "Mesures raisonnables : contrôle d’accès, chiffrement, sessions, détection d’abus. Aucun service n’est infaillible. En cas d’incident, WIPP évalue, réduit les risques et notifie selon la loi (Loi 25 / PIPEDA).",
        "WIPP n’effectue pas de profilage publicitaire ni de décision automatisée produisant des effets juridiques à votre égard, hors filtres anti-spam et anti-abus.",
        "Les mises à jour importantes de cette politique seront indiquées dans l’application. Version " +
          LEGAL_VERSION +
          ".",
      ],
    },
  ],
};

const termsFr: LegalDocument = {
  title: "Conditions d’utilisation",
  updated: "21 septembre 2026",
  intro:
    "En créant un compte WIPP, vous acceptez ces Conditions et reconnaissez avoir lu la Politique de confidentialité. Exploitants : DeeDigital (Canada) et Dee Digital Group (activités concernées en Afrique). Contact : lazoneclient@gmail.com.",
  sections: [
    {
      title: "1. Le service",
      paragraphs: [
        "WIPP est une plateforme de messagerie, d’appels, de groupes, de Stories, de stickers et de découverte (annonces, Boutiques, Services, événements). Des fonctions peuvent être ajoutées ou retirées.",
      ],
    },
    {
      title: "2. Admissibilité",
      paragraphs: [
        "Vous déclarez avoir l’âge légal requis dans votre territoire, et au moins 13 ans. Au Québec, un mineur de moins de 14 ans ne s’inscrit pas sans le titulaire de l’autorité parentale. Un compte, une personne. Informations exactes. Vous protégez l’accès à votre appareil.",
      ],
    },
    {
      title: "3. Compte et interdictions",
      paragraphs: [
        "Interdit : usurper une identité (personne, boutique, organisation); vendre un compte; contourner la sécurité; extraire, scraper ou automatiser WIPP; harceler, menacer, doxxer; spam; fraude; malware; contenu sexuel impliquant un mineur; discours haineux; arme, drogue, bien volé ou contrefait; non-consensual intimate imagery; enregistrement d’un appel sans consentement légal.",
      ],
    },
    {
      title: "4. Communications, E2EE, éphémère",
      paragraphs: [
        "Les chats privés supportés par l’E2EE sont chiffrés. Vous ne contournez pas la crypto. Les espaces publics ne sont pas E2EE.",
        "Un message qui « disparaît » n’est pas une garantie d’oubli chez le destinataire (captures, appareils, sauvegardes). Vous restez responsable de ce que vous envoyez.",
      ],
    },
    {
      title: "5. Votre contenu",
      paragraphs: [
        "Vous gardez vos droits. Vous accordez à WIPP une licence mondiale, non exclusive, sans redevance, limitée à l’hébergement, l’affichage et la transmission selon vos réglages. Pas de transfert de propriété. La licence cesse à la suppression, sous réserve des copies déjà reçues par d’autres, des sauvegardes techniques et de la loi.",
        "Vous garantissez avoir le droit de publier chaque photo, vidéo, musique, logo et texte — y compris le droit à l’image des personnes filmées ou photographiées.",
      ],
    },
    {
      title: "6. Stickers, musique, création",
      paragraphs: [
        "Les stickers, animations, logo et identité WIPP appartiennent à WIPP ou à ses concédants. Pas de revente, extraction ni usage hors de l’app sans autorisation.",
        "La musique dans une Story est licenciée pour une diffusion in-app seulement. Pas de téléchargement, de remix commercial ni de republication hors WIPP.",
      ],
    },
    {
      title: "7. Groupes, QR et WIPP Touch",
      paragraphs: [
        "L’admin d’un groupe est responsable des membres qu’il invite et des liens/QR qu’il partage. La proximité n’est pas un consentement. Interdit d’utiliser Touch, QR ou la localisation pour suivre ou harceler quelqu’un.",
      ],
    },
    {
      title: "8. Annonces, Boutiques, événements — WIPP n’est pas partie",
      paragraphs: [
        "Sauf mention contraire, WIPP est un outil de mise en relation. Nous ne sommes ni vendeur, ni acheteur, ni mandataire, ni séquestre, ni organisateur, ni assureur. Pas de paiement, d’escrow ni de garantie d’état des biens dans WIPP à ce jour.",
        "Vous vérifiez avant de rencontrer quelqu’un, de payer ou de vous déplacer. Les professionnels sont responsables de leurs permis, taxes, mentions légales et offres.",
        "Une fiche Boutique n’est pas une certification WIPP. Usurper une entreprise est interdit.",
        "Pharmacies, horaires et infos locales peuvent être inexactes. En urgence, composez les services officiels — jamais WIPP.",
      ],
    },
    {
      title: "9. Appels et disponibilité",
      paragraphs: [
        "La qualité d’un appel dépend du réseau et de l’appareil. WIPP ne garantit pas une ligne d’urgence, ni une disponibilité continue. Maintenance, pannes et cas de force majeure peuvent interrompre le service.",
        "Le service est fourni « tel quel », dans la mesure permise par la loi. Rien ici n’enlève les droits impératifs d’un consommateur, notamment au Québec (LPC).",
      ],
    },
    {
      title: "10. Modération",
      paragraphs: [
        "Vous pouvez signaler et bloquer. WIPP peut retirer un contenu, limiter une fonction ou fermer un compte en cas de violation, de risque ou d’obligation légale. Un réexamen peut être demandé à lazoneclient@gmail.com, sauf urgence ou illégalité manifeste.",
      ],
    },
    {
      title: "11. Responsabilité, indemnisation, litiges",
      paragraphs: [
        "Vous êtes responsable de vos interactions. WIPP n’est pas responsable des actes d’un autre utilisateur, dans la mesure permise par la loi.",
        "Un utilisateur professionnel peut, si la loi le permet, indemniser WIPP des réclamations liées à ses offres. Cette clause ne s’applique pas au consommateur lorsqu’elle lui est inopposable.",
        "Lois impératives de votre territoire d’abord. Pour DeeDigital, droit du Québec et du Canada, tribunaux compétents du Québec, sans priver un consommateur de son for légal. La version française prévaut en cas de divergence pour les utilisateurs au Québec.",
      ],
    },
    {
      title: "12. Divers",
      paragraphs: [
        "WIPP peut modifier ces Conditions. Les changements importants seront présentés dans l’app; une nouvelle acceptation sera demandée si la loi l’exige.",
        "Si une clause est invalide, le reste demeure. Les clauses de propriété intellectuelle, limitation, indemnisation et litiges survivent à la fermeture du compte.",
        "Pas de cession de votre compte. WIPP peut céder le service à une entité du même groupe ou à un successeur, avec information si la loi l’exige.",
        "Version " + LEGAL_VERSION + ".",
      ],
    },
  ],
};

const privacyEn: LegalDocument = {
  title: "Privacy Policy",
  updated: "21 September 2026",
  intro:
    "This policy explains how WIPP — operated in Canada by DeeDigital and, for relevant activities in Africa, by Dee Digital Group — collects, uses, shares, keeps and deletes personal information. Contact: lazoneclient@gmail.com.",
  sections: [
    {
      title: "1. Principles",
      paragraphs: [
        "We collect only what we need. Privacy settings default to the highest level where the law requires it. Camera, mic, photos, location, contacts, Bluetooth and notifications are requested only when a feature needs them. You can refuse or revoke them in device settings.",
      ],
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
        "Reports and support: what you send us about abuse or help requests.",
      ],
    },
    {
      title: "3. Purposes",
      paragraphs: [
        "Create and secure the account; provide chat, calls, groups and Stories; connect people via @username, QR, link or WIPP Touch; run Explorer; send notifications you allow; prevent fraud, spam, harassment and impersonation; handle reports; diagnose outages; comply with law; keep the service reliable.",
        "A separate consent is required for any non-essential purpose, including targeted ads — which WIPP does not run today.",
      ],
    },
    {
      title: "4. End-to-end encryption — and its limits",
      paragraphs: [
        "Private DMs covered by WIPP’s E2EE are encrypted. WIPP does not keep private keys in a way that lets it read those messages. Groups and media come next.",
        "E2EE does not yet cover groups, media, public profiles, public Stories, listings, shops, events, group member lists, technical metadata, or content you copy, forward or screenshot.",
        "A screenshot, screen recording, system picture-in-picture tile or a compromised device can reveal otherwise encrypted content. Disappearing messages leave WIPP after the delay you set; they do not stop someone from photographing them.",
        "If you report a message, the pieces needed to review it may be sent to WIPP.",
      ],
    },
    {
      title: "5. Calls, camera, mic and mini player",
      paragraphs: [
        "A call uses camera and/or microphone with your permission. WIPP and its call provider (LiveKit) handle the technical stream. WIPP does not record your calls.",
        "If you leave the app during a call, the operating system may show a mini player or a status indicator. That is the device, not a WIPP post.",
        "Recording or broadcasting a call without the consent required by law is prohibited.",
      ],
    },
    {
      title: "6. WIPP Touch, QR, groups and links",
      paragraphs: [
        "WIPP Touch prefers short-lived tokens. Two phones being close is never consent — each person accepts or declines.",
        "A group QR or link can be shared outside WIPP. Anyone who gets it may try to join. Admins are responsible for the invites they spread.",
        "Bluetooth discoverability stops when you leave the feature, subject to the device.",
      ],
    },
    {
      title: "7. Location, maps and Google Maps",
      paragraphs: [
        "Nearby, Services, pharmacies, directions and maps may use approximate or precise location after permission. Google Maps Platform may process technical data under its own policies. WIPP is not emergency services.",
      ],
    },
    {
      title: "8. Contacts",
      paragraphs: [
        "Address-book access is optional and separate. Refusing it does not block the rest of WIPP. Numbers are only used to find or invite people — not sold, not used for WIPP cold outreach.",
      ],
    },
    {
      title: "9. Public information",
      paragraphs: [
        "What you publish (photo, bio, @username, Story, listing, shop, event) may be seen according to your settings, including by people who are not your contacts. Do not publish what you want to keep private.",
      ],
    },
    {
      title: "10. Providers",
      paragraphs: [
        "Supabase: account, database, storage, realtime.",
        "LiveKit: audio/video calls.",
        "Google Maps Platform: maps and places.",
        "Apple and Google app stores: distribution, future purchases, notifications.",
        "Story music: a licensing provider may receive in-app playback technical IDs. That music is not downloadable or reusable outside WIPP.",
        "WIPP does not sell your information. No third-party targeted ads today. A material change will be announced and, if required, a new consent will be collected.",
      ],
    },
    {
      title: "11. Transfers, retention, deletion",
      paragraphs: [
        "Providers may process data outside Québec, Canada or your country. Where the law requires it, WIPP puts contractual and technical safeguards in place first.",
        "We keep data only for the stated purposes, security, disputes and legal duties. Indicative periods: account while active; Stories for the duration you choose (24 h or 48 h); disappearing messages per the chat timer; security logs up to 12 months; reports for the time needed to review them.",
        "You can delete your account in Me > Account > Delete my account. A web path will also be offered for Apple and Google Play rules. Deactivation is not deletion.",
      ],
    },
    {
      title: "12. Your rights",
      paragraphs: [
        "Depending on where you live: access, correction, deletion, withdrawing consent, portability where the law allows, and the right to complain. Québec: Commission d’accès à l’information. Canada: Office of the Privacy Commissioner. Email: lazoneclient@gmail.com. We may verify your identity first.",
      ],
    },
    {
      title: "13. Minors",
      paragraphs: [
        "WIPP is not for children under 13. In Québec, personal information of a minor under 14 is not collected from them without the holder of parental authority, except as the law allows. An account that breaks these rules may be deleted.",
      ],
    },
    {
      title: "14. Security, moderation, changes",
      paragraphs: [
        "Reasonable measures: access control, encryption, sessions, abuse detection. No service is unbreakable. After an incident, WIPP assesses, reduces harm and notifies as required (Law 25 / PIPEDA).",
        "WIPP does not run advertising profiling or automated decisions with legal effects about you, aside from spam and abuse filters.",
        "Material updates to this policy will appear in the app. Version " + LEGAL_VERSION + ".",
      ],
    },
  ],
};

const termsEn: LegalDocument = {
  title: "Terms of Use",
  updated: "21 September 2026",
  intro:
    "By creating a WIPP account you accept these Terms and confirm you have read the Privacy Policy. Operators: DeeDigital (Canada) and Dee Digital Group (relevant activities in Africa). Contact: lazoneclient@gmail.com.",
  sections: [
    {
      title: "1. The service",
      paragraphs: [
        "WIPP is a platform for messaging, calls, groups, Stories, stickers and discovery (listings, shops, services, events). Features may be added or removed.",
      ],
    },
    {
      title: "2. Eligibility",
      paragraphs: [
        "You state that you are old enough in your territory, and at least 13. In Québec, a minor under 14 does not sign up without the holder of parental authority. One person, one account. Accurate information. You keep your device secure.",
      ],
    },
    {
      title: "3. Account and prohibited uses",
      paragraphs: [
        "You may not: impersonate a person, shop or organisation; sell an account; bypass security; scrape or automate WIPP; harass, threaten or doxx; spam; defraud; distribute malware; share sexual content involving a minor; hate speech; weapons, drugs, stolen or counterfeit goods; non-consensual intimate imagery; record a call without legally required consent.",
      ],
    },
    {
      title: "4. Communications, E2EE, disappearing messages",
      paragraphs: [
        "Private chats covered by E2EE are encrypted. You do not bypass the crypto. Public spaces are not E2EE.",
        "A message that “disappears” is not a promise it is gone from the recipient’s world (screenshots, devices, backups). You remain responsible for what you send.",
      ],
    },
    {
      title: "5. Your content",
      paragraphs: [
        "You keep your rights. You grant WIPP a worldwide, non-exclusive, royalty-free licence limited to hosting, displaying and transmitting according to your settings. No transfer of ownership. The licence ends on deletion, subject to copies already received by others, technical backups and the law.",
        "You warrant you have the rights to every photo, video, track, logo and text you post — including image rights of people you film or photograph.",
      ],
    },
    {
      title: "6. Stickers, music, creative tools",
      paragraphs: [
        "WIPP stickers, animations, logo and identity belong to WIPP or its licensors. No resale, extraction or out-of-app use without permission.",
        "Music on a Story is licensed for in-app playback only. No download, commercial remix or reposting outside WIPP.",
      ],
    },
    {
      title: "7. Groups, QR and WIPP Touch",
      paragraphs: [
        "A group admin is responsible for the members they invite and the links/QR they share. Proximity is not consent. You may not use Touch, QR or location to stalk or harass anyone.",
      ],
    },
    {
      title: "8. Listings, shops, events — WIPP is not a party",
      paragraphs: [
        "Unless we say otherwise, WIPP is a matching tool. We are not the seller, buyer, agent, escrow, organiser or insurer. No in-app payments, escrow or condition guarantee for goods today.",
        "You check before you meet, pay or travel. Professionals are responsible for their permits, taxes, legal notices and offers.",
        "A shop card is not a WIPP certification. Impersonating a business is forbidden.",
        "Pharmacies, hours and local info can be wrong. In an emergency, call official services — never WIPP.",
      ],
    },
    {
      title: "9. Calls and availability",
      paragraphs: [
        "Call quality depends on the network and the device. WIPP is not an emergency line and does not promise uninterrupted service. Maintenance, outages and force majeure may interrupt it.",
        "The service is provided “as is”, to the extent the law allows. Nothing here takes away mandatory consumer rights, including in Québec (CPA).",
      ],
    },
    {
      title: "10. Moderation",
      paragraphs: [
        "You can report and block. WIPP may remove content, limit a feature or close an account for a breach, a safety risk or a legal duty. You may ask for a review at lazoneclient@gmail.com, except in emergencies or clear illegality.",
      ],
    },
    {
      title: "11. Liability, indemnity, disputes",
      paragraphs: [
        "You are responsible for your interactions. WIPP is not liable for another user’s acts, to the extent the law allows.",
        "A professional user may, if the law allows, indemnify WIPP for claims tied to their offers. That clause does not apply to a consumer where it would be unenforceable.",
        "Mandatory local law first. For DeeDigital: laws of Québec and Canada, courts of Québec, without stripping a consumer of their legal forum. The French version prevails for users in Québec if the texts diverge.",
      ],
    },
    {
      title: "12. Other",
      paragraphs: [
        "WIPP may update these Terms. Material changes will appear in the app; a new acceptance will be requested if the law requires it.",
        "If one clause is invalid, the rest stays. IP, limitation, indemnity and dispute clauses survive account closure.",
        "You may not assign your account. WIPP may assign the service to a group entity or a successor, with notice if the law requires it.",
        "Version " + LEGAL_VERSION + ".",
      ],
    },
  ],
};

const DOCS: Record<Lang, Record<LegalDocId, LegalDocument>> = {
  fr: { privacy: privacyFr, terms: termsFr },
  en: { privacy: privacyEn, terms: termsEn },
};

export function legalDoc(lang: Lang, id: LegalDocId): LegalDocument {
  return DOCS[lang][id];
}

export function yearsOld(isoDate: string) {
  if (!isoDate) return 0;
  const born = new Date(isoDate);
  if (Number.isNaN(born.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}
