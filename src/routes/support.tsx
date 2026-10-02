import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Support — Wipp" },
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
        <h1>Support Wipp</h1>
        <p>
          Besoin d’aide pour le compte, la liaison web, ou un problème dans l’app ? Voici les
          chemins rapides.
        </p>

        <h2>Liens utiles</h2>
        <ul>
          <li>
            <Link to="/connect" search={{ code: undefined }}>Lier le web à ton téléphone</Link>
          </li>
          <li>
            <Link to="/privacy">Politique de confidentialité</Link>
          </li>
          <li>
            <Link to="/terms">Conditions d’utilisation</Link>
          </li>
          <li>
            <Link to="/site">Présentation du produit</Link>
          </li>
        </ul>

        {import.meta.env.DEV ? (
          <>
            <h2>Compte démo (développement)</h2>
            <p>Comptes locaux de développement uniquement. Ils ne sont pas proposés en production.</p>
          </>
        ) : null}

        <h2>Nous écrire</h2>
        <p>
          Email : <a href="mailto:support@wippapp.com">support@wippapp.com</a>
        </p>

        <div className="site-store-box">
          <h2>Pour les stores</h2>
          <p>
            URL Support App Store / Play :{" "}
            <a href="https://wippapp.com/support">https://wippapp.com/support</a>
          </p>
        </div>
      </article>
    </SiteShell>
  );
}
