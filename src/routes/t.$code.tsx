import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/t/$code")({ component: TouchInviteLanding });

/**
 * Deep link landing for https://wippapp.com/t/CODE
 * - Validates token server-side (peek, no PII)
 * - If app installed: Universal Link / App Link opens native invite
 * - If not: store buttons (iOS App Store / Google Play)
 */
function TouchInviteLanding() {
  const { code: raw } = Route.useParams();
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [state, setState] = useState<"loading" | "valid" | "invalid">("loading");
  const [detail, setDetail] = useState("");
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/wipp/touch/peek/${encodeURIComponent(code)}`);
        const data = (await res.json()) as {
          peek?: { valid: boolean; status: string };
          message?: string;
        };
        if (cancelled) return;
        if (res.ok && data.peek?.valid) {
          setState("valid");
          // Try to open native app (custom scheme fallback if UL not claimed yet)
          const deep = `wipp://t/${code}`;
          window.setTimeout(() => {
            try {
              window.location.href = deep;
            } catch {
              /* ignore */
            }
          }, 400);
        } else {
          setState("invalid");
          setDetail(data.peek?.status || data.message || "expired");
        }
      } catch {
        if (!cancelled) {
          setState("invalid");
          setDetail("network");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const playUrl = "https://play.google.com/store/apps/details?id=com.wipp.app";
  const appStoreUrl = "https://apps.apple.com/app/wipp/id0000000000"; // placeholder until App Store id

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0b1220",
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
      <p style={{ letterSpacing: 3, fontSize: 12, color: "#ffd84d", fontWeight: 700 }}>WIPP TOUCH</p>
      <h1 style={{ fontSize: 28, margin: 0, fontWeight: 700 }}>Invitation</h1>
      {state === "loading" ? <p style={{ color: "#8b93a7" }}>Vérification du lien…</p> : null}
      {state === "valid" ? (
        <>
          <p style={{ color: "#8b93a7", maxWidth: 320 }}>
            Invitation active. Ouvre WIPP pour accepter — aucune donnée personnelle dans ce lien.
          </p>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 22, letterSpacing: 4, color: "#ffd84d" }}>
            {code}
          </p>
          <a
            href={`wipp://t/${code}`}
            style={{
              marginTop: 8,
              display: "inline-block",
              background: "#ffd84d",
              color: "#0b1220",
              fontWeight: 700,
              padding: "14px 22px",
              borderRadius: 14,
              textDecoration: "none",
            }}
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
      {state === "invalid" ? (
        <>
          <p style={{ color: "#f87171" }}>
            Lien invalide ou expiré{detail ? ` (${detail})` : ""}.
          </p>
          <Link to="/" style={{ color: "#ffd84d" }}>
            Aller sur WIPP
          </Link>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <a href={appStoreUrl} style={{ color: "#8b93a7", fontSize: 13 }}>
              App Store
            </a>
            <a href={playUrl} style={{ color: "#8b93a7", fontSize: 13 }}>
              Play Store
            </a>
          </div>
        </>
      ) : null}
    </main>
  );
}
