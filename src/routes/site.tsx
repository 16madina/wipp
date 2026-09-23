import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/site")({
  component: SiteLandingPage,
  head: () => ({
    meta: [
      { title: "Wipp — Connecte ta vie." },
      {
        name: "description",
        content:
          "Connecte ta vie. Messagerie par @username et QR — jamais un numéro. Approchez vos téléphones et commencez à discuter.",
      },
    ],
  }),
});

/** Copy tirée textuellement de src/lib/i18n.ts (fr onboarding). */
const SCENES = [
  {
    id: "tap",
    image: "/onboarding/hero-tap.webp?v=2",
    imageFallback: "/onboarding/hero-tap.jpg?v=2",
    title: "Connectez-vous en",
    accent: "un instant.",
    body: "Approchez vos téléphones, échangez vos codes Wipp et commencez à discuter immédiatement — sans numéro de téléphone.",
    pills: ["Rapide", "Simple", "Sans numéro"],
  },
  {
    id: "globe",
    image: "/onboarding/hero-globe.webp?v=2",
    imageFallback: "/onboarding/hero-globe.jpg?v=2",
    title: "Les personnes sont plus proches que",
    accent: "vous ne pensez.",
    body: "Trouvez quelqu’un près de vous ou à l’autre bout du monde grâce au QR code, au pseudo ou aux fonctions de proximité.",
    pills: ["Montréal", "Abidjan", "Paris", "New York"],
  },
  {
    id: "privacy",
    image: "/onboarding/hero-privacy.webp?v=2",
    imageFallback: "/onboarding/hero-privacy.jpg?v=2",
    title: "Votre numéro reste",
    accent: "votre affaire.",
    body: "Connectez-vous avec votre Wipp, votre QR code ou votre @username. Vous décidez ce que vous partagez.",
    pills: ["@username", "Numéro privé", "À toi de choisir"],
  },
  {
    id: "together",
    image: "/onboarding/hero-together.webp?v=2",
    imageFallback: "/onboarding/hero-together.jpg?v=2",
    title: "Des connexions qui vont",
    accent: "plus loin.",
    body: "Approchez vos téléphones, échangez vos codes Wipp et créez de nouvelles connexions — en un instant.",
    pills: ["Un simple contact", "Échangez vos codes", "Commencez à discuter"],
  },
] as const;

function SiteLandingPage() {
  return (
    <SiteShell pill="Discute  ·  Partage  ·  Découvre" wide>
      <section className="site-app-hero">
        <div className="site-app-hero-copy site-rise">
          <p className="site-app-kicker">wipp</p>
          <h1>
            Connecte ta vie<span className="site-app-dot">.</span>
          </h1>
          <p className="site-app-lead">
            Messagerie par <strong>@username</strong> et QR — jamais un numéro. Approchez vos
            téléphones, échangez vos codes Wipp et commencez à discuter immédiatement.
          </p>
          <div className="site-app-actions">
            <Link to="/" className="connect-cta">
              Ouvrir Wipp
            </Link>
            <Link to="/connect" className="site-btn-ghost">
              Lier le web
            </Link>
          </div>
        </div>
        <div className="site-app-hero-visual site-rise site-rise-2" aria-hidden>
          <picture>
            <source srcSet="/onboarding/hero-tap.webp?v=2" type="image/webp" />
            <img
              src="/onboarding/hero-tap.jpg?v=2"
              alt=""
              className="site-app-hero-img"
              width={720}
              height={900}
            />
          </picture>
          <div className="site-app-hero-glow" />
        </div>
      </section>

      <p className="site-app-brandline site-rise site-rise-3">Discute · Partage · Découvre</p>

      {SCENES.map((scene, i) => (
        <section
          key={scene.id}
          className={`site-app-scene ${i % 2 === 1 ? "is-flip" : ""} site-rise`}
          style={{ animationDelay: `${0.08 + i * 0.06}s` }}
        >
          <div className="site-app-scene-media">
            <picture>
              <source srcSet={scene.image} type="image/webp" />
              <img src={scene.imageFallback} alt="" width={640} height={800} />
            </picture>
          </div>
          <div className="site-app-scene-copy">
            <h2>
              {scene.title} <span>{scene.accent}</span>
            </h2>
            <p>{scene.body}</p>
            <ul className="site-app-pills">
              {scene.pills.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="site-app-close site-rise">
        <h2>
          Connexion réussie<span className="site-app-dot">!</span>
        </h2>
        <p>Vous êtes maintenant connectés — sur téléphone et sur le web.</p>
        <div className="site-app-actions">
          <Link to="/" className="connect-cta">
            Commencer
          </Link>
          <a className="site-btn-ghost" href="https://wippapp.com/privacy">
            Confidentialité
          </a>
        </div>
      </section>
    </SiteShell>
  );
}
