import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { colors } from "../theme";

/**
 * WIPP Touch hero: two phones that drift together while searching, a gold ripple from the
 * meeting point on each detected bump, and the phones settle side by side once matched.
 */
export function TouchStage({ mode, pulseKey, size = 220 }: { mode: "search" | "match" | "done"; pulseKey: number; size?: number }) {
  const drift = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const settle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mode !== "search") {
      Animated.timing(settle, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
      return;
    }
    settle.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [mode, drift, settle]);

  useEffect(() => {
    if (!pulseKey) return;
    ripple.setValue(0);
    Animated.timing(ripple, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [pulseKey, ripple]);

  const phoneW = size * 0.24;
  const phoneH = phoneW * 1.9;
  const gap = size * 0.2;
  const left = {
    transform: [
      { translateX: Animated.add(drift.interpolate({ inputRange: [0, 1], outputRange: [-gap, -gap * 0.35] }), settle.interpolate({ inputRange: [0, 1], outputRange: [0, gap * 0.3] })) },
      { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "-4deg"] }) },
    ],
  };
  const right = {
    transform: [
      { translateX: Animated.add(drift.interpolate({ inputRange: [0, 1], outputRange: [gap, gap * 0.35] }), settle.interpolate({ inputRange: [0, 1], outputRange: [0, -gap * 0.3] })) },
      { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ["12deg", "4deg"] }) },
    ],
  };
  const ring = (delay: number) => ({
    opacity: ripple.interpolate({ inputRange: [0, 0.1 + delay, 1], outputRange: [0, 0.9, 0] }),
    transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6 + delay] }) }],
  });
  const phone = (style: object, lit: boolean) => (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: phoneW,
          height: phoneH,
          borderRadius: phoneW * 0.22,
          borderWidth: 2,
          borderColor: lit ? colors.accent : "rgba(255,255,255,0.55)",
          backgroundColor: "rgba(255,255,255,0.04)",
          alignItems: "center",
          paddingTop: 6,
        },
        style,
      ]}
    >
      <View style={{ width: phoneW * 0.3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" }} />
    </Animated.View>
  );
  return (
    <View style={{ width: size, height: size * 0.75, alignItems: "center", justifyContent: "center" }}>
      {[0, 0.35].map((d) => (
        <Animated.View
          key={d}
          pointerEvents="none"
          style={[
            { position: "absolute", width: size * 0.6, height: size * 0.6, borderRadius: size, borderWidth: 2, borderColor: colors.accent },
            ring(d),
          ]}
        />
      ))}
      {phone(left, mode !== "search")}
      {phone(right, mode !== "search")}
    </View>
  );
}
