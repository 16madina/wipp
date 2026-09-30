import { useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Btn } from "./ui";
import { colors } from "../theme";
import { openWippLink } from "../lib/deep-links";

export function LiveScanner({
  onFallback,
  initialError,
}: {
  onFallback?: (to: "search" | "my-qr") => void;
  initialError?: string;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [live, setLive] = useState(false);
  const [fail, setFail] = useState<string | null>(initialError ?? null);
  const busy = useRef(false);

  async function start() {
    setFail(null);
    const next = permission?.granted ? permission : await requestPermission();
    if (!next?.granted) {
      setFail("Caméra non autorisée");
      return;
    }
    setLive(true);
  }

  async function onScan({ data }: { data: string }) {
    if (busy.current) return;
    busy.current = true;
    setLive(false);
    try {
      const dest = await openWippLink(data, "replace");
      if (!dest.ok) setFail(dest.error);
    } catch {
      setFail("Impossible de vérifier le QR");
    } finally {
      busy.current = false;
    }
  }

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 8, borderRadius: 16, backgroundColor: "rgba(247,249,252,0.08)", padding: 12, borderWidth: 1, borderColor: "rgba(247,249,252,0.1)" }}>
      {live && Platform.OS !== "web" ? (
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 280, aspectRatio: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" }}>
          <CameraView
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onScan}
            style={{ flex: 1 }}
          />
          <View pointerEvents="none" style={{ position: "absolute", top: 24, right: 24, bottom: 24, left: 24, borderRadius: 16, borderWidth: 2, borderColor: "rgba(255,216,77,0.8)" }} />
          <View pointerEvents="none" style={{ position: "absolute", left: 32, right: 32, top: "50%", height: 2, backgroundColor: "rgba(255,216,77,0.8)" }} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center" }}>
            <Btn label="Fermer" variant="secondary" onPress={() => setLive(false)} style={{ height: 36, paddingHorizontal: 16 }} />
          </View>
        </View>
      ) : fail ? (
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.paper }}>{fail}</Text>
          <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Btn label="Rechercher par @username" variant="secondary" onPress={() => onFallback?.("search")} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn label="Afficher mon QR" variant="secondary" onPress={() => onFallback?.("my-qr")} />
            </View>
          </View>
          <Btn label="Réessayer" onPress={() => void start()} style={{ marginTop: 8, alignSelf: "stretch" }} />
        </View>
      ) : (
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.paper }}>Autoriser la caméra</Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: "rgba(247,249,252,0.6)", textAlign: "center" }}>
            WIPP utilise la caméra pour scanner les QR codes.
          </Text>
          <Btn label="Continuer" onPress={() => void start()} style={{ marginTop: 8, alignSelf: "stretch" }} />
        </View>
      )}
    </View>
  );
}
