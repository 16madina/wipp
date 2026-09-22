import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const LINKS = [
  { to: "/site" as const, label: "Produit" },
  { to: "/connect" as const, label: "Connexion" },
  { to: "/privacy" as const, label: "Confidentialité" },
  { to: "/terms" as const, label: "Conditions" },
  { to: "/support" as const, label: "Support" },
];

export function SiteShell({
  pill,
  children,
}: {
  pill: string;
  children: ReactNode;
}) {
  return (
    <div className="connect-page site-legal">
      <div className="connect-bg" aria-hidden />
      <header className="connect-top">
        <Link to="/site" className="connect-brand">
          wipp
        </Link>
        <span className="connect-pill">{pill}</span>
      </header>
      <main className="site-legal-main">{children}</main>
      <footer className="site-legal-foot">
        <nav aria-label="Liens légaux">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} Wipp · Messagerie par @username</p>
      </footer>
    </div>
  );
}
