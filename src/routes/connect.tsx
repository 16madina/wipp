import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createWebLinkCode, pollWebLinkStatus } from "@/lib/messaging/client";
import type { WippProfile } from "@/lib/messaging/types";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const Route = createFileRoute("/connect")({
  component: ConnectPage,
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
});

function ConnectPage() {
  const { code: deepCode } = Route.useSearch();
  const [phase, setPhase] = useState<"boot" | "pending" | "claimed" | "expired" | "error">("boot");
  const [code, setCode] = useState(deepCode?.toUpperCase() ?? "");
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<WippProfile | null>(null);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);

  const qrSrc = useMemo(() => {
    if (!code) return "";
    const payload = `${typeof window !== "undefined" ? window.location.origin : ""}/connect?code=${code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=0b1220&color=ffd84d&data=${encodeURIComponent(payload)}`;
  }, [code]);

  async function startLink() {
    setError("");
    setPhase("boot");
    try {
      const link = await createWebLinkCode(window.location.origin);
      setCode(link.code);
      setToken(link.token);
      setExpiresAt(link.expiresAt);
      setPhase("pending");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer le code");
      setPhase("error");
    }
  }

  useEffect(() => {
    void startLink();
  }, []);

  useEffect(() => {
    if (phase !== "pending" || !token) return;
    const id = window.setInterval(() => {
      void pollWebLinkStatus(token)
        .then((s) => {
          if (s.status === "claimed" && s.session) {
            localStorage.setItem("wipp-server-token", s.session.token);
            localStorage.setItem("wipp-server-profile", JSON.stringify(s.session.profile));
            setProfile(s.session.profile);
            setPhase("claimed");
          } else if (s.status === "expired") {
            setPhase("expired");
          }
        })
        .catch(() => {
          /* keep polling */
        });
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, token]);

  return (
    <div className="connect-page">
      <div className="connect-bg" aria-hidden />
      <header className="connect-top">
        <Link to="/" className="connect-brand">
          wipp
        </Link>
        <span className="connect-pill">Site de connexion</span>
      </header>

      <main className="connect-main">
        <section className="connect-card">
          <p className="connect-kicker">Lie ton téléphone</p>
          <h1>Connecte WIPP au web</h1>
          <p className="connect-lead">
            Ouvre l’app sur ton téléphone, va dans <strong>Moi → Serveur</strong>, entre ce code.
            Le site et l’app partagent alors le même compte @username.
          </p>

          {phase === "pending" || phase === "boot" ? (
            <div className="connect-code-block">
              <div className="connect-qr-wrap">
                {qrSrc ? <img src={qrSrc} alt={`QR code ${code}`} width={220} height={220} /> : null}
              </div>
              <div>
                <p className="connect-code-label">Code à 8 caractères</p>
                <p className="connect-code" aria-live="polite">
                  {code ? `${code.slice(0, 4)}‑${code.slice(4)}` : "········"}
                </p>
                <p className="connect-hint">
                  Expire dans ~10 min
                  {expiresAt ? ` · ${new Date(expiresAt).toLocaleTimeString()}` : ""}
                </p>
                <button type="button" className="connect-refresh" onClick={() => void startLink()}>
                  Nouveau code
                </button>
              </div>
            </div>
          ) : null}

          {phase === "claimed" && profile ? (
            <div className="connect-success">
              <p className="connect-ok">Connecté</p>
              <h2>@{profile.username}</h2>
              <p>{profile.displayName}</p>
              <Link to="/" className="connect-cta">
                Ouvrir WIPP
              </Link>
            </div>
          ) : null}

          {phase === "expired" ? (
            <div className="connect-success">
              <p className="connect-warn">Code expiré</p>
              <button type="button" className="connect-cta" onClick={() => void startLink()}>
                Générer un nouveau code
              </button>
            </div>
          ) : null}

          {phase === "error" ? (
            <p className="connect-error">{error}</p>
          ) : null}
        </section>

        <aside className="connect-side">
          <h2>Comment ça marche</h2>
          <ol>
            <li>Garde cette page ouverte.</li>
            <li>Sur le téléphone, connecte le serveur messagerie.</li>
            <li>Saisis le code (ou scanne le QR).</li>
            <li>Le web se lie au même compte.</li>
          </ol>
          <p className="connect-meta">
            Backend cloud : <code>{SUPABASE_URL.replace("https://", "")}</code>
          </p>
          <p className="connect-meta">
            <Link to="/privacy">Confidentialité</Link>
            {" · "}
            <Link to="/terms">Conditions</Link>
            {" · "}
            <Link to="/support">Support</Link>
          </p>
        </aside>
      </main>
    </div>
  );
}
