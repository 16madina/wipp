import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/Colors";
import {
  cancelTouchShare,
  createTouchShare,
  getTouchShareStatus,
  type TouchInvite,
} from "@/lib/touch-api";
import {
  canAdvertiseBle,
  ensureBlePermissions,
  startTouchAdvertise,
  stopTouchAdvertise,
} from "@/lib/touch-ble";

const c = Colors.dark;
const SEARCH_MS = 12_000;

export default function TouchShareScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<"ready" | "sharing" | "connected" | "fallback" | "error">("ready");
  const [invite, setInvite] = useState<TouchInvite | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inviteId = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      void stopTouchAdvertise();
      if (inviteId.current) void cancelTouchShare(inviteId.current).catch(() => undefined);
    };
  }, []);

  function later(ms: number, fn: () => void) {
    timers.current.push(setTimeout(fn, ms));
  }

  async function startShare() {
    setBusy(true);
    setHint(null);
    setPhase("sharing");
    try {
      const perms = await ensureBlePermissions();
      if (!perms.ok) {
        if (perms.reason === "bluetooth_off") {
          setHint("Active le Bluetooth pour utiliser WIPP Touch.");
        } else if (perms.reason === "bluetooth_permission") {
          setHint("Autorise le Bluetooth pour WIPP Touch.");
        } else if (perms.reason === "ble_native_missing") {
          setHint("Rebuild natif requis pour le Bluetooth (EAS).");
        }
      }

      const { invite: next } = await createTouchShare();
      inviteId.current = next.id;
      setInvite(next);

      if (!canAdvertiseBle()) {
        setHint("Rebuild natif EAS requis pour diffuser en BLE — le code / QR (même invitation) reste disponibles.");
      } else {
        const adv = await startTouchAdvertise(next.code);
        if (!adv.ok) {
          if (adv.reason === "bluetooth_off") setHint("Active le Bluetooth pour utiliser WIPP Touch.");
          else if (adv.reason === "bluetooth_permission") setHint("Autorise le Bluetooth pour WIPP Touch.");
          else if (adv.reason === "service_uuid_missing_in_adv") {
            setHint("L’annonce BLE n’inclut pas le service WIPP — fallback code / QR.");
          } else if (adv.reason === "advertise_failed") {
            setHint("Émission BLE impossible — le code / QR restent valides pour cette invitation.");
          }
        } else if (!adv.includesServiceUuid) {
          setHint("Annonce BLE sans Service UUID détecté — vérifie le build natif.");
        }
      }

      const poll = async () => {
        try {
          const { invite: cur } = await getTouchShareStatus(next.id);
          setInvite(cur);
          if (cur.status === "accepted") {
            await stopTouchAdvertise();
            setPhase("connected");
            return;
          }
          if (cur.status === "rejected" || cur.status === "expired" || cur.status === "cancelled") {
            await stopTouchAdvertise();
            setPhase("fallback");
            return;
          }
        } catch {
          /* keep */
        }
        later(1500, () => void poll());
      };
      void poll();
      later(SEARCH_MS, () => {
        setPhase((p) => (p === "sharing" ? "fallback" : p));
      });
    } catch (e) {
      setPhase("error");
      setHint(e instanceof Error ? e.message : "Impossible de démarrer le partage");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>WIPP Touch</Text>
      <Text style={styles.body}>
        Partage ton WIPP — rapproche ton téléphone. L’autre n’a pas besoin d’ouvrir Touch.
      </Text>

      {phase === "ready" ? (
        <Pressable style={styles.cta} onPress={() => void startShare()} disabled={busy}>
          {busy ? <ActivityIndicator color="#0b1220" /> : <Text style={styles.ctaText}>Partager mon WIPP</Text>}
        </Pressable>
      ) : null}

      {phase === "sharing" ? (
        <View style={styles.card}>
          <ActivityIndicator color={c.accent} />
          <Text style={styles.cardTitle}>Recherche…</Text>
          <Text style={styles.meta}>Rapproche ton téléphone</Text>
          {invite?.code ? <Text style={styles.code}>{invite.code}</Text> : null}
        </View>
      ) : null}

      {phase === "fallback" && invite ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Essaie autrement</Text>
          <Text style={styles.meta}>Même invitation — montre ce code ou le QR</Text>
          <Text style={styles.code}>{invite.code}</Text>
          <Text style={styles.qr}>{invite.qrPayload}</Text>
        </View>
      ) : null}

      {phase === "connected" && invite?.receiver ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connecté !</Text>
          <Text style={styles.meta}>{invite.receiver.displayName}</Text>
          <Pressable style={styles.cta} onPress={() => router.back()}>
            <Text style={styles.ctaText}>OK</Text>
          </Pressable>
        </View>
      ) : null}

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Pressable
        onPress={() => {
          void stopTouchAdvertise();
          router.back();
        }}
      >
        <Text style={styles.cancel}>Fermer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, padding: 24, gap: 14 },
  title: { color: c.text, fontSize: 24, fontWeight: "700" },
  body: { color: c.textMuted, fontSize: 14, lineHeight: 20 },
  cta: {
    marginTop: 12,
    height: 52,
    borderRadius: 14,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#0b1220", fontWeight: "700", fontSize: 16 },
  card: {
    marginTop: 8,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#111827",
    gap: 8,
    alignItems: "center",
  },
  cardTitle: { color: c.text, fontSize: 18, fontWeight: "700" },
  meta: { color: c.textMuted, fontSize: 13, textAlign: "center" },
  code: { color: c.accent, fontSize: 28, fontWeight: "700", letterSpacing: 4, marginTop: 8 },
  qr: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  hint: { color: c.accent, fontSize: 13, marginTop: 8 },
  cancel: { color: c.textMuted, textAlign: "center", marginTop: 20 },
});
