/**
 * WIPP 1.1 — partage d'écran du host (étape D, iPhone d'abord).
 * iOS: the system « Démarrer la diffusion » sheet (ReplayKit, WippBroadcast extension) captures the whole
 * screen, even in Keynote or Safari; WIPP publishes it as a separate LiveKit screen-share track.
 * Viewers: the shared screen is the main area, the host's camera (and the other speakers) as thumbnails.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, findNodeHandle, NativeModules, PanResponder, Platform, Pressable, ScrollView, StatusBar, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MonitorUp, X } from "lucide-react-native";
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
  onTap,
  pip = false,
}: {
  url: string;
  box: { width: number; height: number };
  frame: { width: number; height: number } | null;
  onDimensionsChange: (e: { nativeEvent: { width: number; height: number } }) => void;
  rotate?: boolean;
  /** One tap on the picture (pinch and drag still zoom / move it). */
  onTap?: () => void;
  /** iPhone: keeps playing in a floating window when WIPP goes to the background. */
  pip?: boolean;
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
      <Pressable onPress={onTap} disabled={!onTap} style={{ width: box.width, height: box.height, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: shown.width, height: shown.height, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: inner.width, height: inner.height, transform: rotate ? [{ rotate: "90deg" }] : [] }}>
          <RTCView
            streamURL={url}
            style={{ width: inner.width, height: inner.height }}
            objectFit="contain"
            zOrder={0}
            {...({ onDimensionsChange } as object)}
            {...(pip ? ({ iosPIP: { enabled: true, startAutomatically: true, stopAutomatically: true, preferredSize: { width: 9, height: 16 } } } as object) : {})}
          />
        </View>
        </View>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Floating people while a screen is shared: a discreet column on the side, never a reserved strip.
 * Drag it anywhere; it snaps to the nearest corner so it never ends up in the middle of the slides.
 */
function FloatingPeople({
  people,
  area,
  thumbW,
  home,
  row,
  padTop = 6,
  padBottom = 6,
}: {
  people: StageTile[];
  area: { width: number; height: number };
  thumbW: number;
  /** Where they sit by default (a free margin); dragging then snaps to the corners. */
  home: { x: number; y: number };
  row: boolean;
  /** Keep clear of the floating top bar / bottom controls when snapping to a corner. */
  padTop?: number;
  padBottom?: number;
}) {
  const W = thumbW;
  const H = Math.round(W * 1.33);
  const gw = row ? people.length * (W + 6) - 6 : W;
  const gh = row ? H : people.length * (H + 6) - 6;
  const spots = (corner: number) =>
    corner < 0 ? home : { x: corner % 2 === 0 ? area.width - gw - 6 : 6, y: corner < 2 ? Math.max(padTop, area.height - gh - padBottom) : padTop };
  const corner = useRef(-1);
  const pos = useRef(new Animated.ValueXY(home)).current;
  const start = useRef({ x: 0, y: 0 });
  const live = useRef({ spots, gw, gh, area });
  live.current = { spots, gw, gh, area };
  useEffect(() => {
    pos.setValue(spots(corner.current));
  }, [area.width, area.height, people.length, home.x, home.y, W, row]);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        start.current = { x: (pos.x as unknown as { _value: number })._value, y: (pos.y as unknown as { _value: number })._value };
      },
      onPanResponderMove: (_e, g) => pos.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy }),
      onPanResponderRelease: (_e, g) => {
        const l = live.current;
        const x = start.current.x + g.dx + l.gw / 2;
        const y = start.current.y + g.dy + l.gh / 2;
        corner.current = (x > l.area.width / 2 ? 0 : 1) + (y > l.area.height / 2 ? 0 : 2);
        Animated.spring(pos, { toValue: l.spots(corner.current), useNativeDriver: false, friction: 7 }).start();
      },
    }),
  ).current;
  if (!people.length) return null;
  return (
    <Animated.View {...pan.panHandlers} style={{ position: "absolute", left: 0, top: 0, gap: 6, flexDirection: row ? "row" : "column", transform: pos.getTranslateTransform() }}>
      {people.map((t) => (
        <View key={t.identity} style={{ width: W, height: H, borderRadius: 10, overflow: "hidden", backgroundColor: "#111727", borderWidth: t.speaking ? 2 : 1, borderColor: t.speaking ? GOLD : "rgba(212,160,23,0.5)" }}>
          {t.url ? (
            <RTCView streamURL={t.url} style={{ flex: 1 }} objectFit="cover" mirror={t.mirror} zOrder={1} />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Avatar user={{ displayName: t.name, avatar: t.avatar }} size={Math.min(30, W - 18)} />
            </View>
          )}
          <View style={{ position: "absolute", left: 2, right: 2, bottom: 2, paddingHorizontal: 3, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.6)" }}>
            <Text numberOfLines={1} style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_600SemiBold" }}>
              {t.organizer ? "HOST" : t.name}
            </Text>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

/**
 * The shared screen IS the stage, on a discreet night-blue background:
 * - portrait source (iPhone): the whole height from the top bar to the comment field; the people sit at the
 *   top of the right margin, sized to fit it, never on the picture;
 * - landscape source (slides): full width at the top; the people in a row just under it.
 * Never stretched or cropped. The people can be dragged anywhere (they snap to a corner).
 * Host: he keeps a normal view — his own camera big, a « Les spectateurs voient ton écran » card.
 */
export function ScreenStage({
  screen,
  tiles,
  width,
  stageH,
  topSafe,
  frame,
  onDimensionsChange,
  immersive = false,
  bottomPad = 0,
  onTap,
}: {
  screen: ScreenShare;
  tiles: StageTile[];
  width: number;
  stageH: number;
  topSafe: number;
  frame: { width: number; height: number } | null;
  onDimensionsChange: (e: { nativeEvent: { width: number; height: number } }) => void;
  /** Viewer, portrait source: the picture fills the whole phone, everything else floats over it. */
  immersive?: boolean;
  /** Height of the floating bottom controls (the people never snap under them). */
  bottomPad?: number;
  onTap?: () => void;
}) {
  const sorted = [...tiles].sort((a, b) => Number(b.organizer) - Number(a.organizer)).slice(0, 5);
  const top = immersive ? 0 : topSafe + 48;
  const area = { width, height: stageH - top };
  const landscape = Boolean(!screen.local && frame && frame.width > frame.height);
  const me = screen.local ? sorted.find((t) => t.local) : undefined;
  const floating = me ? sorted.filter((t) => t !== me) : sorted;
  // Landscape: the picture sits at the top (its own height); portrait: it uses the whole area.
  const box = landscape && frame ? { width, height: Math.min(area.height, Math.round((width * frame.height) / frame.width)) } : area;
  const pic = screen.local ? area : fit(box, frame);
  const margin = (width - pic.width) / 2;
  // Up to 5 people must fit in the margin column: shrink the thumbnails if needed.
  const fitCol = (area.height - 12) / Math.max(1, floating.length) / 1.33 - 6;
  const thumbW = landscape ? 56 : immersive ? (floating.length <= 2 ? 62 : floating.length === 3 ? 54 : 46) : Math.round(Math.max(40, Math.min(66, margin >= 46 ? margin - 8 : 60, fitCol)));
  const home = landscape
    ? { x: 8, y: box.height + 8 }
    : immersive
      ? { x: width - thumbW - 8, y: topSafe + 54 }
      : { x: margin >= 46 ? width - margin + (margin - thumbW) / 2 : width - thumbW - 6, y: 6 };
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height: stageH, backgroundColor: "#070b16" }}>
      <LinearGradient pointerEvents="none" colors={["#0d1630", "#0a1022", "#070b16"]} style={{ position: "absolute", top: 0, left: 0, width, height: stageH }} />
      <View style={{ position: "absolute", top, left: 0, width: area.width, height: area.height }}>
        {screen.local ? (
          // The host never watches his own screen (endless mirror): his camera stays big, like before sharing.
          <View style={{ flex: 1, backgroundColor: "#111727" }}>
            {me?.url ? (
              <RTCView streamURL={me.url} style={{ flex: 1 }} objectFit="cover" mirror zOrder={0} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Avatar user={{ displayName: me?.name ?? "WIPP", avatar: me?.avatar ?? undefined }} size={84} />
              </View>
            )}
            <View pointerEvents="none" style={{ position: "absolute", left: 10, top: 44, right: 90, flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(212,160,23,0.5)" }}>
              <MonitorUp size={18} color={GOLD} />
              <Text style={{ flex: 1, color: "#fff", fontSize: 12, lineHeight: 16 }}>
                <Text style={{ fontFamily: "Inter_700Bold" }}>Les spectateurs voient ton écran.</Text> Ouvre ta présentation, un site ou une app.
              </Text>
            </View>
          </View>
        ) : screen.url ? (
          <>
            <ZoomableScreen url={screen.url} box={box} frame={frame} onDimensionsChange={onDimensionsChange} onTap={onTap} pip />
          </>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.6)" }}>Chargement du partage…</Text>
          </View>
        )}
        <FloatingPeople people={floating} area={area} thumbW={thumbW} home={home} row={landscape} padTop={immersive ? topSafe + 54 : 6} padBottom={immersive ? bottomPad + 8 : 6} />
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
      <ZoomableScreen url={screen.url} box={{ width: win.width, height: win.height }} frame={frame} onDimensionsChange={onDimensionsChange} rotate={landscape} onTap={() => setChrome((v) => !v)} />
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

/**
 * « Réduire »: the live as a small floating window inside WIPP (sound and video go on while the person
 * reads messages). Drag it anywhere; tap = back to the live; ✕ = leave the live.
 * iPhone: it also follows outside WIPP (picture in picture) when the app goes to the background.
 */
export function MiniLive({ url, mirror, label, onOpen, onClose }: { url: string | null; mirror?: boolean; label: string; onOpen: () => void; onClose: () => void }) {
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const W = 112;
  const H = 168;
  const pos = useRef(new Animated.ValueXY({ x: win.width - W - 12, y: win.height - H - insets.bottom - 110 })).current;
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        moved.current = false;
        start.current = { x: (pos.x as unknown as { _value: number })._value, y: (pos.y as unknown as { _value: number })._value };
      },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dx) + Math.abs(g.dy) > 6) moved.current = true;
        pos.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy });
      },
      onPanResponderRelease: (_e, g) => {
        if (!moved.current) {
          onOpen();
          return;
        }
        const x = start.current.x + g.dx + W / 2 > win.width / 2 ? win.width - W - 12 : 12;
        const y = Math.max(insets.top + 8, Math.min(win.height - H - insets.bottom - 90, start.current.y + g.dy));
        Animated.spring(pos, { toValue: { x, y }, useNativeDriver: false, friction: 7 }).start();
      },
    }),
  ).current;
  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityLabel="Revenir au direct"
      style={{ position: "absolute", left: 0, top: 0, width: W, height: H, borderRadius: 16, overflow: "hidden", backgroundColor: "#0b1020", borderWidth: 1.5, borderColor: GOLD, transform: pos.getTranslateTransform(), shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10, elevation: 12 }}
    >
      {url ? (
        <RTCView streamURL={url} style={{ flex: 1 }} objectFit="cover" mirror={mirror} zOrder={2} {...({ iosPIP: { enabled: true, startAutomatically: true, stopAutomatically: true, preferredSize: { width: 9, height: 16 } } } as object)} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <MonitorUp size={22} color={GOLD} />
        </View>
      )}
      <View pointerEvents="none" style={{ position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "#e5383b" }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" }} />
        <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" }}>{label}</Text>
      </View>
      <Pressable accessibilityLabel="Quitter le direct" onPress={onClose} hitSlop={8} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <X size={14} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}
