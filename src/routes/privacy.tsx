import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Wipp" },
      {
        name: "description",
        content: "Politique de confidentialité de l’application et du service Wipp.",
      },
    ],
  }),
});

function PrivacyPage() {
  const updated = "22 septembre 2026";
  return (
    <SiteShell pill="Confidentialité">
      <article className="site-prose">
        <p className="connect-kicker">Légal</p>
        <h1>Politique de confidentialité</h1>
        <p className="site-meta">Dernière mise à jour : {updated}</p>

        <p>
          Wipp (« nous ») édite une messagerie sociale accessible via l’application mobile et le
          site web. Cette page explique quelles données nous traitons et pourquoi.
        </p>

        <h2>1. Données que nous collectons</h2>
        <ul>
          <li>
            <strong>Compte</strong> : @username, nom d’affichage, mot de passe (stocké sous forme
            hachée), éventuellement numéro de téléphone lors de l’authentification SMS (Firebase).
          </li>
          <li>
            <strong>Messages</strong> : contenu des conversations que tu envoies, horodatage,
            destinataires.
          </li>
          <li>
            <strong>Appareil / session</strong> : jetons de session, codes de liaison web↔app,
            informations techniques basiques (type d’appareil, journaux d’erreur).
          </li>
          <li>
            <strong>Usage</strong> : données agrégées pour stabiliser le service (pannes, charge).
          </li>
        </ul>

        <h2>2. Finalités</h2>
        <ul>
          <li>Fournir la messagerie, les profils et la liaison multi-appareils.</li>
          <li>Sécuriser les comptes (connexion, sessions, prévention d’abus).</li>
          <li>Améliorer la fiabilité et corriger les bugs.</li>
          <li>Respecter nos obligations légales.</li>
        </ul>

        <h2>3. Bases légales</h2>
        <p>
          Selon ta localisation : exécution du contrat (fourniture du service), intérêt légitime
          (sécurité, anti-abus), et consentement lorsque requis (ex. notifications push).
        </p>

        <h2>4. Sous-traitants</h2>
        <ul>
          <li>Hébergement base de données : Supabase / Postgres.</li>
          <li>Hébergement application / API : Vercel (ou équivalent).</li>
          <li>Auth SMS (à venir) : Firebase Phone Auth.</li>
          <li>Mises à jour de l’app : Expo / EAS Update.</li>
        </ul>

        <h2>5. Conservation</h2>
        <p>
          Les données de compte et messages sont conservées tant que le compte est actif. Tu peux
          demander la suppression de ton compte via le support. Les journaux techniques sont
          conservés pour une durée limitée.
        </p>

        <h2>6. Tes droits</h2>
        <p>
          Selon la loi applicable (ex. RGPD) : accès, rectification, suppression, limitation,
          opposition, portabilité. Contact : voir la page Support.
        </p>

        <h2>7. Mineurs</h2>
        <p>
          Wipp n’est pas destiné aux enfants de moins de 13 ans (ou l’âge minimum local). Si tu
          penses qu’un compte mineur a été créé, contacte le support.
        </p>

        <h2>8. Contact</h2>
        <p>
          Pour toute question vie privée : utilise la page{" "}
          <a href="/support">Support</a> ou l’adresse indiquée une fois le domaine public branché.
        </p>
      </article>
    </SiteShell>
  );
}
