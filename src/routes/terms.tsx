import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Conditions d’utilisation — Wipp" },
      {
        name: "description",
        content: "Conditions d’utilisation du service et de l’application Wipp.",
      },
    ],
  }),
});

function TermsPage() {
  const updated = "22 septembre 2026";
  return (
    <SiteShell pill="Conditions">
      <article className="site-prose">
        <p className="connect-kicker">Légal</p>
        <h1>Conditions d’utilisation</h1>
        <p className="site-meta">Dernière mise à jour : {updated}</p>

        <p>
          En utilisant Wipp (application mobile ou site), tu acceptes ces conditions. Si tu n’es
          pas d’accord, n’utilise pas le service.
        </p>

        <h2>1. Le service</h2>
        <p>
          Wipp est une messagerie sociale basée sur des @username et des QR. Des fonctionnalités
          (appels, médias, notifications) peuvent évoluer au fil du temps.
        </p>

        <h2>2. Compte</h2>
        <ul>
          <li>Tu es responsable de la confidentialité de tes identifiants et appareils liés.</li>
          <li>Tu fournis des informations exactes et à jour.</li>
          <li>Un seul compte par personne sauf autorisation écrite.</li>
        </ul>

        <h2>3. Usage acceptable</h2>
        <p>Il est interdit d’utiliser Wipp pour :</p>
        <ul>
          <li>harcèlement, menaces, ou contenus illégaux ;</li>
          <li>spam, phishing, ou extraction automatisée abusive ;</li>
          <li>contourner la sécurité ou accéder aux comptes d’autrui ;</li>
          <li>diffuser des malwares ou contenus exploitatifs.</li>
        </ul>
        <p>Nous pouvons suspendre ou supprimer un compte en cas de manquement.</p>

        <h2>4. Contenu</h2>
        <p>
          Tu restes propriétaire de ton contenu. Tu nous accordes une licence limitée pour
          l’héberger et l’afficher afin de fournir le service. Tu garanties disposer des droits
          nécessaires sur ce que tu publies.
        </p>

        <h2>5. Disponibilité</h2>
        <p>
          Nous visons une disponibilité élevée mais ne garantissons pas un service ininterrompu.
          Des maintenances ou incidents peuvent survenir.
        </p>

        <h2>6. Responsabilité</h2>
        <p>
          Dans les limites autorisées par la loi, Wipp n’est pas responsable des dommages
          indirects, perte de données côté appareil, ou contenus échangés entre utilisateurs.
        </p>

        <h2>7. Résiliation</h2>
        <p>
          Tu peux cesser d’utiliser le service à tout moment. Nous pouvons résilier l’accès en cas
          de violation des présentes conditions.
        </p>

        <h2>8. Modifications</h2>
        <p>
          Nous pouvons mettre à jour ces conditions. La date en tête de page fait foi. L’usage
          continu après publication vaut acceptation des changements matériels raisonnablement
          notifiés.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions : <a href="mailto:support@wippapp.com">support@wippapp.com</a> · page{" "}
          <a href="/support">Support</a>.
        </p>
      </article>
    </SiteShell>
  );
}
