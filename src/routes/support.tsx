import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Support — WIPP" },
      {
        name: "description",
        content: "Aide et contact support pour l’application Wipp.",
      },
    ],
  }),
});

function SupportPage() {
  return (
    <SiteShell pill="Support">
      <article className="site-prose">
        <p className="connect-kicker">Aide</p>
        <h1>Support WIPP</h1>
        <p>
          Besoin d’aide avec ton compte ou un problème dans l’app ? Voici les réponses rapides, et
          comment nous écrire.
        </p>

        <h2>Questions fréquentes</h2>
        <h3>Je ne reçois pas le code SMS</h3>
        <p>
          Vérifie l’indicatif du pays et ton numéro, puis attends 45 secondes avant « Renvoyer le code ».
          Si rien n’arrive, écris-nous avec ton pays et ton opérateur.
        </p>
        <h3>Signaler un contenu ou bloquer quelqu’un</h3>
        <p>
          Dans une conversation, une Story, un profil, un groupe, une annonce ou une entreprise, touche
          « … » puis « Signaler » ou « Bloquer ». Un contenu signalé disparaît aussitôt pour toi ;
          l’équipe WIPP examine chaque signalement et peut retirer le contenu ou suspendre le compte.
        </p>
        <h3>Supprimer mon compte</h3>
        <p>
          Dans l’app : Moi → Sécurité → Supprimer mon compte. Ou depuis le web :{" "}
          <Link to="/delete-account">supprimer mon compte</Link>.
        </p>
        <h3>Mes messages sont-ils privés ?</h3>
        <p>
          Oui : les conversations, groupes, photos, vidéos et vocaux sont chiffrés de bout en bout. Les
          détails sont dans la <Link to="/privacy">politique de confidentialité</Link>.
        </p>

        <h2>Liens utiles</h2>
        <ul>
          <li>
            <Link to="/privacy">Politique de confidentialité</Link>
          </li>
          <li>
            <Link to="/terms">Conditions d’utilisation</Link>
          </li>
          <li>
            <Link to="/delete-account">Supprimer mon compte</Link>
          </li>
          <li>
            <Link to="/site">Présentation de WIPP</Link>
          </li>
        </ul>

        <h2>Nous écrire</h2>
        <p>
          Email : <a href="mailto:lazoneclient@gmail.com">lazoneclient@gmail.com</a>
          <br />
          Nous répondons en général sous 48 heures.
        </p>
      </article>
    </SiteShell>
  );
}
