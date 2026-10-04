import type { ReactNode } from "react";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { CornerUpLeft } from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { colors } from "../theme";

const THRESHOLD = 56;

export function SwipeableBubble({
  children,
  enabled,
  onReply,
}: {
  children: ReactNode;
  enabled: boolean;
  onReply: () => void;
}) {
  const tx = useSharedValue(0);
  const armed = useSharedValue(false);

  useEffect(() => {
    tx.value = 0;
    armed.value = false;
  }, [armed, tx]);

  if (!enabled) return <>{children}</>;

  const fireHaptic = () => haptic("select");
  const fireReply = () => onReply();

  const pan = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      const next = Math.max(0, Math.min(80, e.translationX));
      tx.value = next;
      if (next >= THRESHOLD && !armed.value) {
        armed.value = true;
        runOnJS(fireHaptic)();
      } else if (next < THRESHOLD * 0.7) {
        armed.value = false;
      }
    })
    .onEnd(() => {
      const go = armed.value;
      tx.value = withSpring(0, { damping: 18, stiffness: 220 });
      armed.value = false;
      if (go) runOnJS(fireReply)();
    });

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [8, THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(tx.value, [0, THRESHOLD], [0.6, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.row}>
        <Animated.View style={[styles.icon, iconStyle]}>
          <CornerUpLeft size={18} color={colors.accent} />
        </Animated.View>
        <Animated.View style={[{ flexShrink: 1 }, bubbleStyle]}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", maxWidth: "100%" },
  icon: { position: "absolute", left: 4, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
});
