/**
 * WIPP 1.1 — partage d'écran du host (étape D, iPhone d'abord).
 * iOS: the system « Démarrer la diffusion » sheet (ReplayKit, WippBroadcast extension) captures the whole
 * screen, even in Keynote or Safari; WIPP publishes it as a separate LiveKit screen-share track.
 * Viewers: the shared screen is the main area, the host's camera (and the other speakers) as thumbnails.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";
import { findNodeHandle, NativeModules, Platform, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Maximize2, MonitorUp, X } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import type { StageTile } from "./LiveStage";

const GOLD = "#d4a017";
const native = Platform.OS === "web" ? null : (require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc"));
const RTCView = native ? native.RTCView : View;
const PickerView = native ? native.ScreenCapturePickerView : null;

export type ScreenShare = { url: string | null; identity: string; local: boolean; width?: number; height?: number };

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

/** The received video, zoomable with two fingers (iOS), never stretched. */
function ZoomableScreen({ url, style }: { url: string; style: object }) {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={{ flexGrow: 1 }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      bouncesZoom
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <RTCView streamURL={url} style={{ flex: 1 }} objectFit="contain" zOrder={0} />
    </ScrollView>
  );
}

function Quality({ screen }: { screen: ScreenShare }) {
  if (!screen.width || !screen.height) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 8, bottom: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.55)" }}>
      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>
        {screen.width} × {screen.height}
      </Text>
    </View>
  );
}

/**
 * The shared screen uses the WHOLE stage (full width, from under the top bar to the bottom of the stage);
 * the people on stage float as a small column on the side (over the empty margins of a portrait screen).
 */
export function ScreenStage({
  screen,
  tiles,
  width,
  stageH,
  topSafe,
  onFullscreen,
}: {
  screen: ScreenShare;
  tiles: StageTile[];
  width: number;
  stageH: number;
  topSafe: number;
  onFullscreen?: () => void;
}) {
  const people = [...tiles].sort((a, b) => Number(b.organizer) - Number(a.organizer)).slice(0, 5);
  const top = topSafe + 46;
  const areaH = stageH - top;
  const thumbW = 58;
  const thumbH = 78;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height: stageH, backgroundColor: "#000" }}>
      <View style={{ position: "absolute", top, left: 0, width, height: areaH }}>
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
          <>
            <ZoomableScreen url={screen.url} style={{ flex: 1 }} />
            <Quality screen={screen} />
            {onFullscreen ? (
              <Press
                accessibilityLabel="Plein écran"
                onPress={onFullscreen}
                hitSlop={8}
                style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(212,160,23,0.6)" }}
              >
                <Maximize2 size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Plein écran</Text>
              </Press>
            ) : null}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.6)" }}>Chargement du partage…</Text>
          </View>
        )}
        {/* People on stage: small floating column on the right, over the side margins. */}
        <View pointerEvents="none" style={{ position: "absolute", right: 6, bottom: 8, gap: 6 }}>
          {people.map((t) => (
            <View key={t.identity} style={{ width: thumbW, height: thumbH, borderRadius: 10, overflow: "hidden", backgroundColor: "#111727", borderWidth: t.speaking ? 2 : 1, borderColor: t.speaking ? GOLD : "rgba(212,160,23,0.45)" }}>
              {t.url ? (
                <RTCView streamURL={t.url} style={{ flex: 1 }} objectFit="cover" mirror={t.mirror} zOrder={1} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Avatar user={{ displayName: t.name, avatar: t.avatar }} size={28} />
                </View>
              )}
              <View style={{ position: "absolute", left: 2, right: 2, bottom: 2, paddingHorizontal: 3, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.6)" }}>
                <Text numberOfLines={1} style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_600SemiBold" }}>
                  {t.organizer ? "HOST" : t.name}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Viewer « Plein écran »: the shared screen on the whole phone, zoomable; one tap to go back. */
export function ScreenFullscreen({ screen, onClose }: { screen: ScreenShare; onClose: () => void }) {
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!screen.url) return null;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width: win.width, height: win.height, backgroundColor: "#000", zIndex: 50 }}>
      <ZoomableScreen url={screen.url} style={{ flex: 1 }} />
      <Quality screen={screen} />
      <Press
        accessibilityLabel="Revenir à la conférence"
        onPress={onClose}
        hitSlop={10}
        style={{ position: "absolute", top: insets.top + 8, right: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.65)", borderWidth: 1, borderColor: "rgba(212,160,23,0.7)" }}
      >
        <X size={16} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Revenir à la conférence</Text>
      </Press>
      <Text pointerEvents="none" style={{ position: "absolute", bottom: insets.bottom + 10, alignSelf: "center", color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
        Pince avec deux doigts pour zoomer
      </Text>
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
