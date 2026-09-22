import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/site")({
  component: SiteLandingPage,
  head: () => ({
    meta: [
      { title: "Wipp — Messagerie par @username" },
      {
        name: "description",
        content:
          "Wipp connecte tes proches par @username et QR — jamais un numéro. Disponible sur iOS et Android.",
      },
    ],
  }),
});

function SiteLandingPage() {
  return (
    <SiteShell pill="Site officiel">
      <section className="site-hero">
        <p className="connect-kicker">Messagerie sociale</p>
        <h1>
          wipp
        </h1>
        <p className="site-hero-lead">
          Connecte ta vie. Discute par <strong>@username</strong> et QR — jamais un numéro de
          téléphone affiché. Pensé pour iOS et Android.
        </p>
        <div className="site-hero-actions">
          <Link to="/connect" className="connect-cta">
            Lier le web
          </Link>
          <Link to="/support" className="site-btn-ghost">
            Support
          </Link>
        </div>
      </section>

      <section className="site-grid">
        <article>
          <h2>Sans numéro public</h2>
          <p>Tu es joignable via ton @username ou un QR — pas via un annuaire de numéros.</p>
        </article>
        <article>
          <h2>Web + téléphone</h2>
          <p>Lie ton compte avec un code : même identité sur le site et dans l’app native.</p>
        </article>
        <article>
          <h2>Stores ready</h2>
          <p>
            Politique de confidentialité et conditions publiques — exigées par Apple et Google.
          </p>
        </article>
      </section>

      <section className="site-store-box">
        <h2>Pour App Store & Play Store</h2>
        <ul>
          <li>
            Confidentialité : <code>/privacy</code>
          </li>
          <li>
            Conditions : <code>/terms</code>
          </li>
          <li>
            Support : <code>/support</code>
          </li>
        </ul>
        <p>
          Dès que ton domaine est branché (ex. <strong>wipp.me</strong>), ces URLs deviennent{" "}
          <code>https://ton-domaine/privacy</code>, etc.
        </p>
      </section>
    </SiteShell>
  );
}
