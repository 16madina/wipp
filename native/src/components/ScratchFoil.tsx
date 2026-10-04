import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Defs, Image as SvgImage, Mask, Path, Rect } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { setScratching } from "../lib/scratch-state";
import { colors } from "../theme";

const BRUSH = 44;
const CLEAR_AT = 0.5;
/** Coverage is estimated on a coarse grid; drawing itself is a continuous stroke. */
const GRID = 16;

type Src = number | { uri: string };

function uriOf(source: Src) {
  if (typeof source === "number") {
    // Bundled asset → resolve to a URI react-native-svg can draw.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Image: RNImage } = require("react-native") as typeof import("react-native");
    return RNImage.resolveAssetSource(source)?.uri ?? "";
  }
  return source.uri;
}

/**
 * Lottery-style scratch card: the finger drags a coin-like stroke that erases the foil
 * smoothly (SVG mask). While the finger is down, the chat list does not scroll.
 */
export function ScratchFoil({
  source,
  width,
  height,
  onCleared,
  onReady,
}: {
  source: Src;
  width: number;
  height: number;
  onCleared: () => void;
  onReady?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [path, setPath] = useState("");
  const [hint, setHint] = useState(true);
  const d = useRef("");
  const last = useRef<{ x: number; y: number } | null>(null);
  const hit = useRef(new Uint8Array(GRID * GRID));
  const done = useRef(false);
  const frame = useRef(0);
  const href = uriOf(source);

  const mark = useCallback(
    (x: number, y: number) => {
      const r = BRUSH / 2;
      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const cx = ((gx + 0.5) * width) / GRID;
          const cy = ((gy + 0.5) * height) / GRID;
          if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) hit.current[gy * GRID + gx] = 1;
        }
      }
    },
    [width, height],
  );

  const flush = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setPath(d.current);
      if (done.current) return;
      let n = 0;
      for (const v of hit.current) n += v;
      if (n / hit.current.length >= CLEAR_AT) {
        done.current = true;
        onCleared();
      }
    });
  }, [onCleared]);

  const move = useCallback(
    (x: number, y: number, start: boolean) => {
      const p = last.current;
      if (start || !p) d.current += ` M${x.toFixed(1)} ${y.toFixed(1)} l0.1 0`;
      else d.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      // Mark coverage along the segment so fast strokes count fully.
      if (p && !start) {
        const steps = Math.max(1, Math.ceil(Math.hypot(x - p.x, y - p.y) / 10));
        for (let s = 1; s <= steps; s++) mark(p.x + ((x - p.x) * s) / steps, p.y + ((y - p.y) * s) / steps);
      } else mark(x, y);
      last.current = { x, y };
      if (hint) setHint(false);
      flush();
    },
    [mark, flush, hint],
  );

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => {
      setScratching(true);
      move(e.x, e.y, true);
    })
    .onUpdate((e) => move(e.x, e.y, false))
    .onFinalize(() => {
      last.current = null;
      setScratching(false);
    });

  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
        {/* Preload first, then draw the SVG foil; an opaque cover stays until the foil is really drawn. */}
        <Image source={source} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} onLoad={() => setReady(true)} />
        {ready && href ? (
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              <Mask id="scratch" x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
                <Rect x="0" y="0" width={width} height={height} fill="#fff" />
                <Path d={path || "M0 0"} stroke="#000" strokeWidth={BRUSH} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Mask>
            </Defs>
            <SvgImage
              href={href}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid slice"
              mask="url(#scratch)"
              onLoad={() => {
                // Give the native view one frame to paint before uncovering anything.
                requestAnimationFrame(() => {
                  setDrawn(true);
                  onReady?.();
                });
              }}
            />
          </Svg>
        ) : null}
        {!drawn ? <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.surpriseInk }} /> : null}
        {hint && drawn ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(8,6,4,0.42)" }}>
              <Text style={{ color: colors.surprisePaper, fontFamily: "Inter_700Bold", fontSize: 14 }}>Gratte avec le doigt</Text>
            </View>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
