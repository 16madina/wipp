import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Text, View } from "react-native";
import { Image } from "expo-image";
import { ScanLine } from "lucide-react-native";
import { Btn } from "./ui";
import { colors } from "../theme";
import { goToQrDestination, openWippLink } from "../lib/deep-links";
import { resolveWippQr } from "../lib/qr-resolver";

type Phase = { kind: "scanning" } | { kind: "error"; title: string; body: string };

const BOX = 260;
/** The scan animation stays at least this long, so the person sees that the photo is being read. */
const MIN_SCAN_MS = 1400;

/**
 * "Importer une photo" in the scanner: shows the chosen picture with a moving scan line while the
 * QR is read, then opens the profile — or explains clearly why it cannot (own QR, no QR, not WIPP).
 */
export function PhotoQrScan({ uri, onClose, onRetry }: { uri: string | null; onClose: () => void; onRetry: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!uri) return;
    setPhase({ kind: "scanning" });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(line, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    let off = false;
    const started = Date.now();
    const wait = () => new Promise((r) => setTimeout(r, Math.max(0, MIN_SCAN_MS - (Date.now() - started))));
    void (async () => {
      let next: Phase | null = null;
      try {
        const { scanFromURLAsync } = await import("expo-camera");
        const found = await scanFromURLAsync(uri, ["qr"]);
        const data = found.find((r) => r.data)?.data;
        if (!data) {
          next = { kind: "error", title: "Aucun code QR trouvé", body: "Choisis une photo où le code QR est bien visible et net." };
        } else if (/^wipp:\/\//i.test(data)) {
          await wait();
          if (off) return;
          onClose();
          await openWippLink(data, "push");
          return;
        } else {
          const dest = await resolveWippQr(data);
          if (dest.ok) {
            await wait();
            if (off) return;
            onClose();
            goToQrDestination(dest, "push");
            return;
          }
          next = /propre/i.test(dest.error)
            ? { kind: "error", title: "C’est ton propre code WIPP 🙂", body: "Partage-le pour que les autres te trouvent. Pour tester, importe le code d’une autre personne." }
            : { kind: "error", title: "Code non reconnu", body: dest.error };
        }
      } catch {
        next = { kind: "error", title: "Lecture impossible", body: "Cette image n’a pas pu être lue. Essaie avec une autre photo." };
      }
      await wait();
      if (!off && next) setPhase(next);
    })();
    return () => {
      off = true;
      loop.stop();
    };
  }, [uri]);

  const scanning = phase.kind === "scanning";
  return (
    <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.82)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: BOX, height: BOX, borderRadius: 20, overflow: "hidden", backgroundColor: "#000", borderWidth: 2, borderColor: scanning ? colors.accent : colors.hair }}>
          {uri ? <Image source={{ uri }} style={{ width: BOX, height: BOX, opacity: scanning ? 1 : 0.45 }} contentFit="contain" /> : null}
          {scanning ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
                shadowOpacity: 0.9,
                shadowRadius: 10,
                transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [8, BOX - 11] }) }],
              }}
            />
          ) : null}
        </View>
        {scanning ? (
          <View style={{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ScanLine size={18} color={colors.accent} />
            <Text style={{ color: "#f7f9fc", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Analyse du code QR…</Text>
          </View>
        ) : phase.kind === "error" ? (
          <View style={{ marginTop: 22, width: "100%", maxWidth: 340, alignItems: "center" }}>
            <Text style={{ color: "#f7f9fc", fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" }}>{phase.title}</Text>
            <Text style={{ marginTop: 8, color: "rgba(247,249,252,0.72)", fontSize: 14, lineHeight: 20, textAlign: "center" }}>{phase.body}</Text>
            <Btn label="Choisir une autre photo" onPress={onRetry} style={{ marginTop: 20, alignSelf: "stretch" }} />
            <Btn label="Fermer" variant="secondary" onPress={onClose} style={{ marginTop: 8, alignSelf: "stretch" }} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
