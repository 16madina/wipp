import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/c/$token")({ component: CallLinkLanding });

type Peek =
  | { status: "ok"; kind: "audio" | "video"; expiresAt: number; owner: { username: string; displayName: string } | null; participants: number }
  | { status: "invalid" | "expired" | "revoked" };

/**
 * https://wippapp.com/c/CODE — WIPP call link.
 * App installed: the Universal Link opens WIPP directly (this page is not even shown).
 * Otherwise: who is calling, then « Ouvrir dans WIPP » / store links.
 */
function CallLinkLanding() {
  const { token } = Route.useParams();
  const code = token.replace(/[^A-Za-z0-9_-]/g, "");
  const [peek, setPeek] = useState<Peek | null>(null);
  const [failed, setFailed] = useState(false);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/wipp/calls/links/peek/${encodeURIComponent(code)}`)
      .then((r) => r.json() as Promise<Peek>)
      .then((p) => !cancelled && setPeek(p))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const playUrl = "https://play.google.com/store/apps/details?id=com.wipp.app";
  const appStoreUrl = "https://apps.apple.com/app/wipp/id0000000000"; // placeholder until App Store id
  const ok = peek?.status === "ok" ? peek : null;
  const who = ok?.owner ? `@${ok.owner.username}` : "un utilisateur WIPP";

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#020a22",
        color: "#f7f9fc",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        gap: 12,
      }}
    >
      <p style={{ letterSpacing: 3, fontSize: 12, color: "#ffd84d", fontWeight: 700 }}>LIEN D’APPEL WIPP</p>
      {!peek && !failed ? <p style={{ color: "#8b93a7" }}>Vérification du lien…</p> : null}
      {ok ? (
        <>
          <h1 style={{ fontSize: 26, margin: 0, fontWeight: 700, maxWidth: 340 }}>
            {ok.kind === "video" ? "Appel vidéo" : "Appel audio"} de {ok.owner?.displayName || who}
          </h1>
          <p style={{ color: "#8b93a7", margin: 0 }}>{who}</p>
          <p style={{ color: "#8b93a7", maxWidth: 320 }}>
            {ok.participants > 0 ? `${ok.participants} personne${ok.participants > 1 ? "s" : ""} dans l’appel. ` : ""}
            Ouvre WIPP pour rejoindre l’appel.
          </p>
          <a
            href={`wipp://c/${code}`}
            style={{ marginTop: 8, display: "inline-block", background: "#ffd84d", color: "#0b1220", fontWeight: 700, padding: "14px 22px", borderRadius: 14, textDecoration: "none" }}
          >
            Ouvrir dans WIPP
          </a>
          <p style={{ color: "#8b93a7", fontSize: 13, marginTop: 16 }}>Pas encore WIPP ?</p>
          {isIOS || !isAndroid ? (
            <a href={appStoreUrl} style={{ color: "#ffd84d" }}>
              Télécharger sur l’App Store
            </a>
          ) : null}
          {isAndroid || !isIOS ? (
            <a href={playUrl} style={{ color: "#ffd84d" }}>
              Télécharger sur Google Play
            </a>
          ) : null}
        </>
      ) : null}
      {failed || (peek && peek.status !== "ok") ? (
        <>
          <h1 style={{ fontSize: 24, margin: 0 }}>Lien d’appel indisponible</h1>
          <p style={{ color: "#f87171" }}>
            {peek?.status === "expired" ? "Ce lien a expiré." : peek?.status === "revoked" ? "Ce lien a été annulé." : "Lien invalide."}
          </p>
          <Link to="/" style={{ color: "#ffd84d" }}>
            Aller sur WIPP
          </Link>
        </>
      ) : null}
    </main>
  );
}
