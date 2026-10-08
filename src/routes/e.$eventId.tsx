import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/e/$eventId")({ component: EventLinkLanding });

/**
 * https://wippapp.com/e/ID?k=… — invitation to a WIPP online event (conference / masterclass).
 * App installed: the Universal Link opens WIPP directly. Otherwise: open / download WIPP.
 * Nothing about the event is shown here: private events stay private.
 */
function EventLinkLanding() {
  const { eventId } = Route.useParams();
  const id = eventId.replace(/[^A-Za-z0-9_-]/g, "");
  const k = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("k")?.replace(/[^A-Za-z0-9_-]/g, "") ?? "" : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const playUrl = "https://play.google.com/store/apps/details?id=com.wipp.app";
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
      <p style={{ letterSpacing: 3, fontSize: 12, color: "#ffd84d", fontWeight: 700 }}>ÉVÉNEMENT EN LIGNE WIPP</p>
      <h1 style={{ fontSize: 26, margin: 0, fontWeight: 700, maxWidth: 340 }}>Tu es invité(e) à un direct sur WIPP</h1>
      <p style={{ color: "#8b93a7", maxWidth: 320 }}>Conférence, masterclass ou atelier en direct. Ouvre WIPP pour voir l’événement et t’inscrire.</p>
      <a
        href={`wipp://e/${id}${k ? `?k=${k}` : ""}`}
        style={{ marginTop: 8, display: "inline-block", background: "#ffd84d", color: "#0b1220", fontWeight: 700, padding: "14px 22px", borderRadius: 14, textDecoration: "none" }}
      >
        Ouvrir dans WIPP
      </a>
      <p style={{ color: "#8b93a7", fontSize: 13, marginTop: 16 }}>Pas encore WIPP ?</p>
      {isAndroid || !isIOS ? (
        <a href={playUrl} style={{ color: "#ffd84d" }}>
          Télécharger sur Google Play
        </a>
      ) : null}
      {isIOS ? <p style={{ color: "#8b93a7", fontSize: 13 }}>WIPP arrive bientôt sur l’App Store.</p> : null}
    </main>
  );
}
