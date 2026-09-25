import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Colors from "@/constants/Colors";
import {
  answerCall,
  hangupCall,
  inviteCall,
  listIncomingCalls,
  type CallInvite,
} from "@/lib/calls-api";
import { endIncomingCallNative } from "@/lib/call-native";
import { bootstrapCallAlerts } from "@/lib/push";
import type { IncomingCallPayload } from "@/lib/call-native";
import { getStoredToken } from "@/lib/session";

const c = Colors.dark;

export default function CallsScreen() {
  const [peer, setPeer] = useState("lea");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<CallInvite | IncomingCallPayload | null>(null);
  const [status, setStatus] = useState("Prêt");
  const [authed, setAuthed] = useState(false);

  const refreshIncoming = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const { invites } = await listIncomingCalls();
      if (invites[0]) setIncoming(invites[0]);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void (async () => {
      cleanup = await bootstrapCallAlerts((payload) => {
        setIncoming(payload);
        setStatus(`Appel de ${payload.fromDisplayName}`);
      });
      await refreshIncoming();
    })();
    const id = setInterval(() => void refreshIncoming(), 3000);
    return () => {
      cleanup?.();
      clearInterval(id);
    };
  }, [refreshIncoming]);

  async function start(kind: "audio" | "video") {
    setError(null);
    setBusy(true);
    try {
      const { invite } = await inviteCall(peer.trim().replace(/^@/, ""), kind);
      setStatus(`Appel ${kind} → @${invite.callee.username}…`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l’appel");
    } finally {
      setBusy(false);
    }
  }

  async function onAccept() {
    if (!incoming || !("id" in incoming || "callId" in incoming)) return;
    const callId = "id" in incoming ? incoming.id : incoming.callId;
    setBusy(true);
    try {
      await answerCall(callId, true);
      setStatus("Appel accepté — rejoins la room LiveKit");
      setIncoming(null);
      endIncomingCallNative(callId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’accepter");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!incoming) return;
    const callId = "id" in incoming ? incoming.id : incoming.callId;
    setBusy(true);
    try {
      await answerCall(callId, false).catch(() => hangupCall(callId));
      endIncomingCallNative(callId);
      setIncoming(null);
      setStatus("Appel refusé");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const fromName =
    incoming && "caller" in incoming
      ? incoming.caller.displayName
      : incoming && "fromDisplayName" in incoming
        ? incoming.fromDisplayName
        : null;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Appels</Text>
      <View style={styles.filters}>
        <Text style={styles.chipOn}>Tous</Text>
        <Text style={styles.chip}>Manqués</Text>
      </View>
      <Text style={styles.meta}>{authed ? status : "Connecte-toi pour recevoir des appels."}</Text>

      {incoming && fromName ? (
        <View style={styles.incoming}>
          <Text style={styles.incomingTitle}>Appel entrant</Text>
          <Text style={styles.incomingName}>{fromName}</Text>
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.reject]} onPress={() => void onReject()} disabled={busy}>
              <Text style={styles.btnText}>Refuser</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.accept]} onPress={() => void onAccept()} disabled={busy}>
              <Text style={styles.btnTextDark}>Accepter</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Appeler @username</Text>
          <TextInput
            value={peer}
            onChangeText={setPeer}
            autoCapitalize="none"
            placeholder="lea"
            placeholderTextColor={c.textMuted}
            style={styles.input}
          />
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.audio]} onPress={() => void start("audio")} disabled={busy || !authed}>
              {busy ? <ActivityIndicator color="#0b1220" /> : <Text style={styles.btnTextDark}>Audio</Text>}
            </Pressable>
            <Pressable style={[styles.btn, styles.video]} onPress={() => void start("video")} disabled={busy || !authed}>
              <Text style={styles.btnTextDark}>Vidéo</Text>
            </Pressable>
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, padding: 24, gap: 12 },
  title: { color: c.text, fontSize: 28, fontWeight: "700" },
  filters: { flexDirection: "row", gap: 8 },
  chipOn: { backgroundColor: "#ffd84d", color: "#1a1400", overflow: "hidden", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, fontWeight: "700" },
  chip: { backgroundColor: "#121722", color: "#f4f6fb", overflow: "hidden", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  meta: { color: "#ffd84d", fontSize: 13 },
  label: { color: c.text, fontSize: 13, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.text,
    backgroundColor: "#0f172a",
  },
  row: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  audio: { backgroundColor: "#ffd84d" },
  video: { backgroundColor: "#38bdf8" },
  accept: { backgroundColor: "#22c55e" },
  reject: { backgroundColor: "#ef4444" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnTextDark: { color: "#0b1220", fontWeight: "700" },
  incoming: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#111827",
    gap: 8,
  },
  incomingTitle: { color: c.textMuted, fontSize: 12, textTransform: "uppercase" },
  incomingName: { color: c.text, fontSize: 22, fontWeight: "700" },
  error: { color: "#f87171", fontSize: 13 },
});
