/**
 * iPhone « swipe from the left edge to go back »: the screen follows the finger, the previous one shows
 * underneath, and letting go past a third of the screen (or with a quick flick) goes back.
 * WIPP manages its own screen stack (no navigation library), so this rebuilds the native gesture.
 */
import { useState, type ReactNode } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

/** Screens with their own gestures, or where going back by accident would hurt (call, camera, sign-in…). */
export const NO_SWIPE_BACK = new Set([
  "active-call",
  "call-join",
  "new-story",
  "stories",
  "scanner",
  "event-live",
  "wgo-touch",
  "touch-incoming",
  "live-code",
  "one-time-qr",
]);

export function EdgeSwipeBack({
  enabled,
  onBack,
  under,
  children,
}: {
  enabled: boolean;
  onBack: () => void;
  /** The previous screen, drawn underneath while the finger moves. */
  under: ReactNode;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const [dragging, setDragging] = useState(false);

  const finish = () => {
    onBack();
    // The previous screen is now the top one: put the layer back in place for the next screen.
    requestAnimationFrame(() => {
      x.value = 0;
      setDragging(false);
    });
  };

  const pan = Gesture.Pan()
    .enabled(enabled && Platform.OS === "ios")
    // Only from the left edge, and only a sideways move (vertical scrolling keeps working).
    .hitSlop({ left: 0, width: 26 })
    .activeOffsetX(12)
    .failOffsetY([-14, 14])
    .onStart(() => {
      runOnJS(setDragging)(true);
    })
    .onUpdate((e) => {
      x.value = Math.max(0, e.translationX);
    })
    .onEnd((e) => {
      const go = x.value > width * 0.33 || e.velocityX > 700;
      if (go) {
        x.value = withTiming(width, { duration: 180, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) runOnJS(finish)();
        });
      } else {
        x.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) runOnJS(setDragging)(false);
        });
      }
    });

  const top = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    shadowOpacity: x.value > 0 ? 0.35 : 0,
  }));
  // Previous screen moves a little too, like iOS (parallax), and is slightly dimmed.
  const below = useAnimatedStyle(() => ({
    transform: [{ translateX: (x.value - width) * 0.3 }],
    opacity: 0.6 + 0.4 * (x.value / Math.max(width, 1)),
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {dragging ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, below]}>
          {under}
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1, shadowColor: "#000", shadowRadius: 12, shadowOffset: { width: -4, height: 0 } }, top]}>
          <View style={{ flex: 1 }}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
