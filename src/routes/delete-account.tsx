import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/delete-account")({
  component: DeleteAccountPage,
  head: () => ({
    meta: [
      { title: "Supprimer mon compte — Wipp" },
      {
        name: "description",
        content:
          "Comment supprimer définitivement votre compte Wipp, quelles données sont effacées et lesquelles peuvent être conservées temporairement.",
      },
    ],
  }),
});

function DeleteAccountPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/wipp/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || data.error || `Erreur ${res.status}`);
      }
      setDone(true);
      try {
        localStorage.removeItem("wipp-server-token");
        localStorage.removeItem("wipp-server-profile");
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteShell pill="Suppression de compte">
      <article className="site-prose">
        <p className="connect-kicker">Google Play · App Store</p>
        <h1>Supprimer mon compte Wipp</h1>
        <p className="site-meta">Dernière mise à jour : 23 septembre 2026</p>

        <p>
          Cette page permet de demander la <strong>suppression définitive</strong> de votre compte
          Wipp, conformément aux exigences des stores (lien de suppression de compte).
        </p>

        <h2>Comment supprimer votre compte</h2>
        <ol>
          <li>
            Saisissez votre <strong>@username</strong> et votre mot de passe dans le formulaire
            ci-dessous.
          </li>
          <li>Confirmez la suppression. L’action est <strong>irréversible</strong>.</li>
          <li>
            Si vous ne pouvez pas vous connecter, écrivez à{" "}
            <a href="mailto:support@wippapp.com">support@wippapp.com</a> depuis une adresse liée au
            compte ; nous traitons la demande sous <strong>7 jours</strong>.
          </li>
        </ol>

        <h2>Données effacées immédiatement</h2>
        <ul>
          <li>Profil (@username, nom d’affichage, bio, avatar)</li>
          <li>Mot de passe et sessions actives (web + appareils liés)</li>
          <li>Codes de liaison web↔app</li>
          <li>Messages que vous avez envoyés</li>
          <li>Appartenance aux conversations</li>
        </ul>

        <h2>Données pouvant être conservées temporairement</h2>
        <ul>
          <li>
            <strong>Journaux techniques / sécurité</strong> (IP, horodatages d’erreurs) : jusqu’à{" "}
            <strong>30 jours</strong>, puis suppression automatique — nécessaires pour la sécurité
            et le diagnostic.
          </li>
          <li>
            <strong>Facturation / obligations légales</strong> : uniquement si une transaction
            payante existe un jour ; conservation selon la durée légale applicable (aujourd’hui :
            aucune facturation in-app active).
          </li>
          <li>
            Messages reçus par d’autres utilisateurs restent dans <em>leur</em> boîte jusqu’à ce
            qu’ils les suppriment eux-mêmes (comme un e-mail déjà envoyé).
          </li>
        </ul>

        <h2>Délai</h2>
        <p>
          Via ce formulaire : suppression <strong>immédiate</strong> du compte et des données
          listées ci-dessus. Via e-mail support : sous <strong>7 jours</strong>.
        </p>

        <h2>Formulaire de suppression</h2>
        {done ? (
          <div className="site-store-box">
            <h2>Compte supprimé</h2>
            <p>
              Votre compte <code>@{username.replace(/^@/, "")}</code> a été supprimé. Vous pouvez
              créer un nouveau compte plus tard avec un autre @username.
            </p>
            <p>
              <Link to="/site">Retour au site</Link>
            </p>
          </div>
        ) : (
          <form className="delete-form" onSubmit={(e) => void onDelete(e)}>
            <label>
              @username
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="votre_pseudo"
                required
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className="connect-error">{error}</p> : null}
            <button type="submit" className="connect-cta" disabled={busy}>
              {busy ? "Suppression…" : "Supprimer définitivement mon compte"}
            </button>
            <p className="site-meta">
              En cliquant, vous confirmez vouloir effacer votre compte Wipp de façon permanente.
            </p>
          </form>
        )}

        <p>
          Politique de confidentialité : <Link to="/privacy">/privacy</Link> · Support :{" "}
          <a href="mailto:support@wippapp.com">support@wippapp.com</a>
        </p>
      </article>
    </SiteShell>
  );
}
