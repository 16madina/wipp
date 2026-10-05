import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Press } from "./ui";
import { colors } from "../theme";
import { answerKeepContact, remainingLabel, requestKeepContact, sendRequest } from "../lib/connections";
import { useWippStore } from "../lib/store";
import type { Chat, User } from "../lib/types";

/**
 * Connection state at the top of a 1-to-1 conversation (NOT disappearing messages):
 * ⏳ ephemeral contact + "Garder ce contact", the peer's request to keep it, or the end of the connection.
 * The chat history is always kept.
 */
export function ConnectionBanner({ chat, peer }: { chat: Chat; peer?: User }) {
  const conn = chat.connection;
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!conn?.expiresAt) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [conn?.expiresAt]);
  if (!conn || chat.type !== "dm" || !peer) return null;

  const first = peer.displayName.split(" ")[0] || `@${peer.username}`;
  const expired = conn.status !== "active" || (conn.expiresAt != null && conn.expiresAt <= Date.now());
  const refresh = () => void useWippStore.getState().syncServerInbox();
  const run = (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    void fn()
      .then(() => {
        if (done) Alert.alert("WIPP", done);
        refresh();
      })
      .catch((err) => Alert.alert("WIPP", (err as Error)?.message || "Action impossible"))
      .finally(() => setBusy(false));
  };

  const box = { marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.hair, gap: 8 } as const;
  const btn = (primary: boolean) =>
    ({ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: primary ? colors.accent : "rgba(255,255,255,0.08)", opacity: busy ? 0.6 : 1 }) as const;

  if (expired) {
    if (conn.type !== "ephemeral") return null;
    return (
      <View style={box}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Connexion éphémère terminée</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Vous n’êtes plus contacts. L’historique reste visible.</Text>
        <Press disabled={busy} onPress={() => run(() => sendRequest(peer.username, "request"), "Demande de connexion envoyée.")} style={{ ...btn(true), alignSelf: "flex-start" }}>
          <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Se reconnecter</Text>
        </Press>
      </View>
    );
  }

  if (conn.upgradeRequestedByPeer) {
    return (
      <View style={box}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{first} souhaite conserver votre connexion</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Passer en contact permanent ?</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Press disabled={busy} onPress={() => run(() => answerKeepContact(peer.id, true), "Vous êtes maintenant contacts permanents.")} style={btn(true)}>
            <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Accepter</Text>
          </Press>
          <Press disabled={busy} onPress={() => run(() => answerKeepContact(peer.id, false))} style={btn(false)}>
            <Text style={{ color: colors.fg, fontSize: 13 }}>Refuser</Text>
          </Press>
        </View>
      </View>
    );
  }

  if (conn.type !== "ephemeral" || !conn.expiresAt) return null;
  return (
    <View style={{ ...box, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ flex: 1, color: colors.fg, fontSize: 13 }}>
        ⏳ Contact éphémère · expire dans {remainingLabel(conn.expiresAt)}
      </Text>
      {conn.upgradeRequestedByMe ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>Demande envoyée</Text>
      ) : (
        <Press disabled={busy} onPress={() => run(() => requestKeepContact(peer.id), `${first} doit accepter pour garder le contact.`)} style={btn(true)}>
          <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Garder ce contact</Text>
        </Press>
      )}
    </View>
  );
}
