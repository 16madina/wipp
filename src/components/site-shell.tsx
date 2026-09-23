import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const LINKS = [
  { to: "/site" as const, label: "Produit" },
  { to: "/" as const, label: "App" },
  { to: "/connect" as const, label: "Connexion" },
  { to: "/privacy" as const, label: "Confidentialité" },
  { to: "/delete-account" as const, label: "Supprimer mon compte" },
  { to: "/terms" as const, label: "Conditions" },
  { to: "/support" as const, label: "Support" },
];

export function SiteShell({
  pill,
  children,
  wide = false,
}: {
  pill: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`connect-page site-legal${wide ? " is-wide" : ""}`}>
      <div className="connect-bg" aria-hidden />
      <header className="connect-top">
        <Link to="/site" className="connect-brand">
          wipp
        </Link>
        <span className="connect-pill">{pill}</span>
      </header>
      <main className={`site-legal-main${wide ? " is-wide" : ""}`}>{children}</main>
      <footer className="site-legal-foot">
        <nav aria-label="Liens du site">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} Wipp · Connecte ta vie.</p>
      </footer>
    </div>
  );
}
