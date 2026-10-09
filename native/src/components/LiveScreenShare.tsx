/**
 * WIPP 1.1 — partage d'écran du host (étape D, iPhone d'abord).
 * iOS: the system « Démarrer la diffusion » sheet (ReplayKit, WippBroadcast extension) captures the whole
 * screen, even in Keynote or Safari; WIPP publishes it as a separate LiveKit screen-share track.
 * Viewers: the shared screen is the main area, the host's camera (and the other speakers) as thumbnails.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { findNodeHandle, NativeModules, Platform, Pressable, ScrollView, StatusBar, Text, View, useWindowDimensions } from "react-native";
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

/** Real size of the frames received (after iOS rotation), reported by the video view itself. */
export function useFrameSize() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onDimensionsChange = (e: { nativeEvent: { width: number; height: number } }) => {
    const { width, height } = e.nativeEvent;
    if (width > 0 && height > 0) setSize((cur) => (cur && cur.width === width && cur.height === height ? cur : { width, height }));
  };
  return { size, onDimensionsChange };
}

/** Largest rect of the source's shape that fits in the box (no stretching, no cropping). */
function fit(box: { width: number; height: number }, src: { width: number; height: number } | null) {
  if (!src) return { width: box.width, height: box.height };
  const r = src.width / src.height;
  return box.width / box.height > r ? { width: Math.round(box.height * r), height: box.height } : { width: box.width, height: Math.round(box.width / r) };
}

/**
 * The received screen, sized EXACTLY to the source shape (so the zoom works on the picture itself, not on
 * black bars), zoomable with two fingers up to ×4, double-tap-free.
 */
function ZoomableScreen({
  url,
  box,
  frame,
  onDimensionsChange,
  rotate = false,
}: {
  url: string;
  box: { width: number; height: number };
  frame: { width: number; height: number } | null;
  onDimensionsChange: (e: { nativeEvent: { width: number; height: number } }) => void;
  rotate?: boolean;
}) {
  // Rotated (landscape slides on a portrait phone, full screen): fit in the swapped box, then turn 90°.
  const inner = rotate ? fit({ width: box.height, height: box.width }, frame) : fit(box, frame);
  const shown = rotate ? { width: inner.height, height: inner.width } : inner;
  return (
    <ScrollView
      style={{ width: box.width, height: box.height }}
      contentContainerStyle={{ width: box.width, height: box.height, alignItems: "center", justifyContent: "center" }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      bouncesZoom
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: shown.width, height: shown.height, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: inner.width, height: inner.height, transform: rotate ? [{ rotate: "90deg" }] : [] }}>
          <RTCView
            streamURL={url}
            style={{ width: inner.width, height: inner.height }}
            objectFit="contain"
            zOrder={0}
            {...({ onDimensionsChange } as object)}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function Quality({ size, bottom = 8 }: { size: { width: number; height: number } | null; bottom?: number }) {
  if (!size) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 8, bottom, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.55)" }}>
      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>
        {size.width} × {size.height}
      </Text>
    </View>
  );
}

/**
 * The shared screen takes the whole stage at the source's own shape:
 * - portrait source (iPhone): full height, the people sit in the free side margin, never on the picture;
 * - landscape source (slides, iPad, site in landscape): full width, centred, people in a row under it;
 * when there is no free margin they shrink to small floating bubbles in a corner.
 */
export function ScreenStage({
  screen,
  tiles,
  width,
  stageH,
  topSafe,
  frame,
  onDimensionsChange,
  onFullscreen,
}: {
  screen: ScreenShare;
  tiles: StageTile[];
  width: number;
  stageH: number;
  topSafe: number;
  frame: { width: number; height: number } | null;
  onDimensionsChange: (e: { nativeEvent: { width: number; height: number } }) => void;
  onFullscreen?: () => void;
}) {
  const people = [...tiles].sort((a, b) => Number(b.organizer) - Number(a.organizer)).slice(0, 5);
  const top = topSafe + 46;
  const areaH = stageH - top;
  const box = { width, height: areaH };
  const pic = fit(box, frame);
  const landscape = Boolean(frame && frame.width > frame.height);
  const sideFree = (width - pic.width) / 2;
  const belowFree = areaH - pic.height;
  // Thumbnails: as large as the free margin allows (44–64 pt wide), small bubbles otherwise.
  const side = !landscape && sideFree >= 52;
  const below = landscape && belowFree >= 70;
  const thumbW = side ? Math.min(64, sideFree - 10) : below ? Math.min(64, (belowFree - 12) * 0.75) : 40;
  const thumbH = side || below ? Math.round(thumbW * 1.33) : 40;
  const peopleStyle = side
    ? { right: Math.max(4, (sideFree - thumbW) / 2), top: 0, bottom: 0, justifyContent: "center" as const, flexDirection: "column" as const }
    : below
      ? { left: 0, right: 0, bottom: 6, justifyContent: "center" as const, flexDirection: "row" as const }
      : { right: 8, bottom: 8, flexDirection: "column" as const };
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
            <View style={below ? { width, height: areaH - thumbH - 12, alignItems: "center", justifyContent: "center" } : { flex: 1 }}>
              <ZoomableScreen
                url={screen.url}
                box={below ? { width, height: areaH - thumbH - 12 } : box}
                frame={frame}
                onDimensionsChange={onDimensionsChange}
              />
            </View>
            <Quality size={frame} />
            {onFullscreen ? (
              <Press
                accessibilityLabel="Plein écran"
                onPress={onFullscreen}
                hitSlop={8}
                style={{ position: "absolute", top: 6, right: 8, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(212,160,23,0.6)" }}
              >
                <Maximize2 size={13} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{landscape ? "Plein écran paysage" : "Plein écran"}</Text>
              </Press>
            ) : null}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.6)" }}>Chargement du partage…</Text>
          </View>
        )}
        <View pointerEvents="none" style={{ position: "absolute", gap: 6, ...peopleStyle }}>
          {people.map((t) => (
            <View
              key={t.identity}
              style={{ width: thumbW, height: thumbH, borderRadius: side || below ? 10 : thumbW / 2, overflow: "hidden", backgroundColor: "#111727", borderWidth: t.speaking ? 2 : 1, borderColor: t.speaking ? GOLD : "rgba(212,160,23,0.45)", opacity: side || below ? 1 : 0.9 }}
            >
              {t.url ? (
                <RTCView streamURL={t.url} style={{ flex: 1 }} objectFit="cover" mirror={t.mirror} zOrder={1} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Avatar user={{ displayName: t.name, avatar: t.avatar }} size={side || below ? 28 : 22} />
                </View>
              )}
              {side || below ? (
                <View style={{ position: "absolute", left: 2, right: 2, bottom: 2, paddingHorizontal: 3, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.6)" }}>
                  <Text numberOfLines={1} style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_600SemiBold" }}>
                    {t.organizer ? "HOST" : t.name}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Viewer « Plein écran »: truly immersive — the status bar is hidden, the picture fills the phone, landscape
 * slides are turned sideways (hold the phone horizontally), zoomable. One tap shows / hides the controls.
 */
export function ScreenFullscreen({
  screen,
  frame,
  onDimensionsChange,
  onClose,
}: {
  screen: ScreenShare;
  frame: { width: number; height: number } | null;
  onDimensionsChange: (e: { nativeEvent: { width: number; height: number } }) => void;
  onClose: () => void;
}) {
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [chrome, setChrome] = useState(true);
  const landscape = Boolean(frame && frame.width > frame.height && win.height > win.width);
  useEffect(() => {
    const t = setTimeout(() => setChrome(false), 3000);
    return () => clearTimeout(t);
  }, [chrome]);
  if (!screen.url) return null;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width: win.width, height: win.height, backgroundColor: "#000", zIndex: 50 }}>
      <StatusBar hidden />
      <Pressable onPress={() => setChrome((v) => !v)} style={{ flex: 1 }}>
        <ZoomableScreen url={screen.url} box={{ width: win.width, height: win.height }} frame={frame} onDimensionsChange={onDimensionsChange} rotate={landscape} />
      </Pressable>
      {chrome ? (
        <>
          <Press
            accessibilityLabel="Revenir à la conférence"
            onPress={onClose}
            hitSlop={10}
            style={{ position: "absolute", top: insets.top + 8, right: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.65)", borderWidth: 1, borderColor: "rgba(212,160,23,0.7)" }}
          >
            <X size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Revenir à la conférence</Text>
          </Press>
          <Text pointerEvents="none" style={{ position: "absolute", bottom: insets.bottom + 10, alignSelf: "center", color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
            {landscape ? "Tourne ton téléphone · pince pour zoomer" : "Pince avec deux doigts pour zoomer"}
          </Text>
          <Quality size={frame} bottom={insets.bottom + 8} />
        </>
      ) : null}
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
