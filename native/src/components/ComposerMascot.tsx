import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { Image } from "expo-image";
import { composerMascot } from "../lib/assets";

/**
 * The little WIPP guy on the sticker button. Every few seconds he hops and sways on his feet, as if calling you
 * to send a sticker. One small image moved by the native driver: it costs almost nothing (unlike animated stickers).
 * Still while the sticker tray is open, and when the iPhone asks for less motion.
 */
export function ComposerMascot({ size, active }: { size: number; active: boolean }) {
  const hop = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => live && setReduceMotion(value));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    hop.setValue(0);
    sway.setValue(0);
    if (active || reduceMotion) return;
    const smooth = Easing.inOut(Easing.quad);
    const step = (value: Animated.Value, toValue: number, duration: number, easing = smooth) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.parallel([
          Animated.sequence([step(hop, 1, 170, Easing.out(Easing.quad)), step(hop, 0, 260, Easing.bounce)]),
          Animated.sequence([step(sway, -1, 150), step(sway, 1, 200), step(sway, -0.5, 170), step(sway, 0, 150)]),
        ]),
        Animated.delay(3200),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, hop, sway]);

  const translateY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.12] });
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-10deg", "10deg"] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        // Sways around his feet (bottom centre), not around his belly.
        transform: [{ translateY }, { translateY: size / 2 }, { rotate }, { translateY: -size / 2 }, { scale: active ? 1.08 : 1 }],
      }}
    >
      <Image source={composerMascot} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}
