import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Colors from "@/constants/Colors";
import { acceptTouchCode, rejectTouchCode, resolveTouchCode } from "@/lib/touch-api";

const c = Colors.dark;

/**
 * Deep link screen for wipp://t/CODE and https://wippapp.com/t/CODE
 * Validates token then shows Accept / Refuse — no PII in the URL itself.
 */
export default function TouchInviteDeepLink() {
  const router = useRouter();
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const [phase, setPhase] = useState<"loading" | "ready" | "done" | "error">("loading");
  const [fromName, setFromName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { invite } = await resolveTouchCode(code, { source: "nfc" });
        if (cancelled) return;
        setFromName(invite.sender.firstName || invite.sender.displayName);
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setError(e instanceof Error ? e.message : "Invitation invalide");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onAccept() {
    setBusy(true);
    try {
      await acceptTouchCode(code);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Acceptation impossible");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    setBusy(true);
    try {
      await rejectTouchCode(code);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refus impossible");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>WIPP TOUCH</Text>
      <Text style={styles.title}>Invitation</Text>
      {phase === "loading" ? <ActivityIndicator color={c.accent} /> : null}
      {phase === "ready" ? (
        <>
          <Text style={styles.body}>{fromName} souhaite partager son WIPP avec toi</Text>
          <Pressable style={styles.cta} onPress={() => void onAccept()} disabled={busy}>
            {busy ? <ActivityIndicator color="#0b1220" /> : <Text style={styles.ctaText}>Accepter</Text>}
          </Pressable>
          <Pressable onPress={() => void onReject()} disabled={busy}>
            <Text style={styles.cancel}>Refuser</Text>
          </Pressable>
        </>
      ) : null}
      {phase === "done" ? (
        <>
          <Text style={styles.body}>Connecté avec {fromName}</Text>
          <Pressable style={styles.cta} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.ctaText}>OK</Text>
          </Pressable>
        </>
      ) : null}
      {phase === "error" ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, padding: 24, gap: 12, justifyContent: "center" },
  kicker: { color: c.accent, letterSpacing: 2, fontSize: 11, fontWeight: "700" },
  title: { color: c.text, fontSize: 26, fontWeight: "700" },
  body: { color: c.textMuted, fontSize: 15, lineHeight: 22 },
  cta: {
    marginTop: 12,
    height: 52,
    borderRadius: 14,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#0b1220", fontWeight: "700", fontSize: 16 },
  cancel: { color: c.textMuted, textAlign: "center", marginTop: 16 },
  err: { color: "#f87171", fontSize: 14 },
});
