import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/$handle")({ component: ProfileLinkLanding });

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.wipp.app";
const APP_STORE_URL = "https://apps.apple.com/app/wipp/id0000000000"; // placeholder until App Store id

/**
 * Landing for a shared profile QR: https://wippapp.com/@username
 * - App installed: the Universal Link / App Link opens WIPP before this page loads;
 *   if not, we try the wipp:// scheme once.
 * - App missing: store buttons.
 */
function ProfileLinkLanding() {
  const { handle } = Route.useParams();
  const isProfile = handle.startsWith("@") && /^@[a-zA-Z0-9._-]{2,40}$/.test(handle);
  const username = isProfile ? handle.slice(1) : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const deep = `wipp://@${username}`;

  useEffect(() => {
    if (!isProfile || (!isIOS && !isAndroid)) return;
    const id = window.setTimeout(() => {
      window.location.href = deep;
    }, 400);
    return () => window.clearTimeout(id);
  }, [deep, isProfile, isIOS, isAndroid]);

  const page = {
    minHeight: "100dvh",
    background: "#0b1220",
    color: "#f7f9fc",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    textAlign: "center" as const,
    gap: 12,
  };

  if (!isProfile) {
    return (
      <main style={page}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Page introuvable</h1>
        <a href="/" style={{ color: "#ffd84d" }}>Retour à WIPP</a>
      </main>
    );
  }

  return (
    <main style={page}>
      <p style={{ letterSpacing: 3, fontSize: 12, color: "#ffd84d", fontWeight: 700 }}>WIPP</p>
      <h1 style={{ fontSize: 28, margin: 0, fontWeight: 700 }}>@{username}</h1>
      <p style={{ color: "#8b93a7", maxWidth: 320 }}>t’invite à discuter sur WIPP.</p>
      <a
        href={deep}
        style={{ marginTop: 8, background: "#ffd84d", color: "#0b1220", fontWeight: 700, padding: "14px 22px", borderRadius: 14, textDecoration: "none" }}
      >
        Ouvrir dans WIPP
      </a>
      <p style={{ color: "#8b93a7", fontSize: 13, marginTop: 16 }}>Pas encore WIPP ?</p>
      {isIOS || !isAndroid ? <a href={APP_STORE_URL} style={{ color: "#ffd84d" }}>Télécharger sur l’App Store</a> : null}
      {isAndroid || !isIOS ? <a href={PLAY_URL} style={{ color: "#ffd84d" }}>Télécharger sur Google Play</a> : null}
    </main>
  );
}
