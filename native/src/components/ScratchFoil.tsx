import { useRef, useState } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { colors } from "../theme";

const COLS = 18;
const ROWS = 14;
const BRUSH = 26;
const CLEAR_AT = 0.46;

/** Lottery-style scratch: the finger erases the foil and uncovers what is underneath. */
export function ScratchFoil({
  source,
  width,
  height,
  onCleared,
  onReady,
}: {
  source: number | { uri: string };
  width: number;
  height: number;
  onCleared: () => void;
  /** The foil image is loaded: only now may the hidden message be drawn underneath. */
  onReady?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const cells = useRef(new Uint8Array(COLS * ROWS));
  const [gone, setGone] = useState<boolean[]>(() => Array(COLS * ROWS).fill(false));
  const [hint, setHint] = useState(true);
  const cleared = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  const cellW = width / COLS;
  const cellH = height / ROWS;

  function dab(x: number, y: number) {
    const r2 = BRUSH * BRUSH;
    let hit = false;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col;
        if (cells.current[i]) continue;
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const dx = cx - x;
        const dy = cy - y;
        if (dx * dx + dy * dy <= r2) {
          cells.current[i] = 1;
          hit = true;
        }
      }
    }
    if (!hit) return;
    if (hint) setHint(false);
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setGone(Array.from(cells.current, (v) => v === 1));
      if (cleared.current) return;
      let n = 0;
      for (let i = 0; i < cells.current.length; i++) n += cells.current[i] ?? 0;
      if (n / cells.current.length >= CLEAR_AT) {
        cleared.current = true;
        onCleared();
      }
    });
  }

  function stroke(x: number, y: number) {
    const prev = last.current;
    if (!prev) {
      dab(x, y);
    } else {
      const dx = x - prev.x;
      const dy = y - prev.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 8));
      for (let s = 1; s <= steps; s++) dab(prev.x + (dx * s) / steps, prev.y + (dy * s) / steps);
    }
    last.current = { x, y };
  }

  return (
    <View
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Keep the finger on the card: the chat list must not scroll while scratching.
      onStartShouldSetResponderCapture={() => true}
      onMoveShouldSetResponderCapture={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => stroke(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      onResponderMove={(e) => stroke(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      onResponderRelease={() => {
        last.current = null;
      }}
    >
      {/* Loads the foil once; until then the whole card stays covered by an opaque layer. */}
      <Image
        source={source}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        onLoad={() => {
          setReady(true);
          onReady?.();
        }}
      />
      {!ready ? <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.surpriseInk }} /> : null}
      {gone.map((scratched, i) => {
        if (scratched) return null;
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: col * cellW,
              top: row * cellH,
              width: cellW + 1,
              height: cellH + 1,
              overflow: "hidden",
            }}
          >
            <Image
              source={source}
              style={{ position: "absolute", width, height, left: -col * cellW, top: -row * cellH }}
              contentFit="cover"
            />
          </View>
        );
      })}
      {hint ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(8,6,4,0.42)" }}>
            <Text style={{ color: colors.surprisePaper, fontFamily: "Inter_700Bold", fontSize: 14 }}>Gratte avec le doigt</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
