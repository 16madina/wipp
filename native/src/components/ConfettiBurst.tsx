import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import { CONFETTI_MS } from "../lib/surprise";

const COLORS = ["#F5C94F", "#FF6E98", "#5AC8FA", "#7DDB6B", "#B98CFF", "#FF9F45", "#FFFFFF"];
const PIECES = 90;

/** Full-screen confetti rain, drawn by the app (no file to download). Touches go through it. */
export function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const fall = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 140,
        // Each piece starts a little later and higher than the previous ones, so the rain lasts.
        start: Math.random() * 0.45,
        size: 6 + Math.random() * 7,
        long: Math.random() > 0.5,
        turns: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4),
        color: COLORS[i % COLORS.length]!,
      })),
    [width],
  );

  useEffect(() => {
    fall.setValue(0);
    const run = Animated.timing(fall, { toValue: 1, duration: CONFETTI_MS, easing: Easing.linear, useNativeDriver: true });
    run.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => run.stop();
  }, [fall]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 30, overflow: "hidden" }]}>
      {pieces.map((p, i) => {
        const end = Math.min(1, p.start + 0.55);
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: -24,
              width: p.size,
              height: p.long ? p.size * 1.9 : p.size,
              borderRadius: p.long ? 2 : p.size / 2,
              backgroundColor: p.color,
              opacity: fall.interpolate({ inputRange: [0, p.start, end - 0.08, end, 1], outputRange: [0, 1, 1, 0, 0] }),
              transform: [
                { translateY: fall.interpolate({ inputRange: [0, p.start, end, 1], outputRange: [0, 0, height + 48, height + 48] }) },
                { translateX: fall.interpolate({ inputRange: [0, p.start, end, 1], outputRange: [0, 0, p.drift, p.drift] }) },
                { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.turns * 360}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
