/**
 * WIPP 1.1 — partage d'écran du host (étape D, iPhone d'abord).
 * iOS: the system « Démarrer la diffusion » sheet (ReplayKit, WippBroadcast extension) captures the whole
 * screen, even in Keynote or Safari; WIPP publishes it as a separate LiveKit screen-share track.
 * Viewers: the shared screen is the main area, the host's camera (and the other speakers) as thumbnails.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";
import { findNodeHandle, NativeModules, Platform, Text, View } from "react-native";
import { MonitorUp, X } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import type { StageTile } from "./LiveStage";

const GOLD = "#d4a017";
const native = Platform.OS === "web" ? null : (require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc"));
const RTCView = native ? native.RTCView : View;
const PickerView = native ? native.ScreenCapturePickerView : null;

export type ScreenShare = { url: string | null; identity: string; local: boolean };

/** Hidden iOS system picker; `open()` shows « Démarrer la diffusion ». */
export const ScreenPicker = forwardRef<{ open: () => Promise<void> }>(function ScreenPicker(_props, ref) {
  const pickerRef = useRef(null);
  useImperativeHandle(ref, () => ({
    async open() {
      if (Platform.OS !== "ios") return;
      const tag = findNodeHandle(pickerRef.current);
      const manager = NativeModules.ScreenCapturePickerViewManager as { show?: (tag: number | null) => Promise<void> } | undefined;
      if (!tag || !manager?.show) throw new Error("Le partage d’écran n’est pas disponible sur cet appareil.");
      await manager.show(tag);
    },
  }));
  if (Platform.OS !== "ios" || !PickerView) return null;
  const Picker = PickerView as unknown as React.ComponentType<{ ref?: unknown; style?: object }>;
  return <Picker ref={pickerRef} style={{ position: "absolute", width: 1, height: 1, opacity: 0, left: -10, top: -10 }} />;
});

/** The shared screen as the main area of the stage, the people on stage as small thumbnails. */
export function ScreenStage({ screen, tiles, width, stageH, topSafe }: { screen: ScreenShare; tiles: StageTile[]; width: number; stageH: number; topSafe: number }) {
  // Host first, then the other speakers.
  const people = [...tiles].sort((a, b) => Number(b.organizer) - Number(a.organizer)).slice(0, 5);
  const thumbW = 72;
  const thumbH = 96;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height: stageH, backgroundColor: "#000" }}>
      <View style={{ position: "absolute", top: topSafe + 50, left: 0, right: 0, bottom: thumbH + 16 }}>
        {screen.local ? (
          // The host does not watch his own screen (it would mirror itself endlessly).
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <MonitorUp size={34} color={GOLD} />
            <Text style={{ marginTop: 10, color: "#fff", fontSize: 16, textAlign: "center", fontFamily: "Inter_700Bold" }}>Tu partages ton écran</Text>
            <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.65)", fontSize: 13, textAlign: "center", lineHeight: 18 }}>
              Ouvre ta présentation, un site ou une app : les spectateurs voient ce que tu montres.
            </Text>
          </View>
        ) : screen.url ? (
          <RTCView streamURL={screen.url} style={{ flex: 1 }} objectFit="contain" zOrder={0} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.6)" }}>Chargement du partage…</Text>
          </View>
        )}
      </View>
      <View style={{ position: "absolute", left: 10, right: 10, bottom: 8, height: thumbH, flexDirection: "row", gap: 6, justifyContent: "flex-end" }}>
        {people.map((t) => (
          <View key={t.identity} style={{ width: thumbW, height: thumbH, borderRadius: 12, overflow: "hidden", backgroundColor: "#111727", borderWidth: t.speaking ? 2 : 1, borderColor: t.speaking ? GOLD : "rgba(212,160,23,0.45)" }}>
            {t.url ? (
              <RTCView streamURL={t.url} style={{ flex: 1 }} objectFit="cover" mirror={t.mirror} zOrder={1} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Avatar user={{ displayName: t.name, avatar: t.avatar }} size={34} />
              </View>
            )}
            <View style={{ position: "absolute", left: 3, right: 3, bottom: 3, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.6)" }}>
              <Text numberOfLines={1} style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_600SemiBold" }}>
                {t.name}
                {t.organizer ? " · HOST" : ""}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Host only: permanent « Partage d'écran en cours » with « Arrêter ». */
export function SharingBanner({ top, onStop }: { top: number; onStop: () => void }) {
  return (
    <View style={{ position: "absolute", top, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 4, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(229,56,59,0.92)" }}>
      <MonitorUp size={14} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" }}>Partage d’écran en cours</Text>
      <Press accessibilityLabel="Arrêter le partage d’écran" onPress={onStop} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.35)" }}>
        <X size={13} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Arrêter</Text>
      </Press>
    </View>
  );
}
