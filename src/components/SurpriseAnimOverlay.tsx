import { useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Animated, Text, View } from "react-native";
import { wippSrc } from "../lib/assets";
import { findAnimation, SURPRISE_ANIMATION_MS } from "../lib/surprise";

/** Plays in the message, like a moji: no plate, no full-screen cover. */
export function SurpriseAnimOverlay({
  animationId,
  playKey = 0,
  message,
  onDone,
}: {
  animationId: string | null;
  playKey?: number;
  message?: string;
  onDone: () => void;
}) {
  const item = findAnimation(animationId);
  const src = item ? wippSrc(item.anim ?? item.art) : undefined;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const caption = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!item || !src) return;
    const hold = Math.max(1400, item.durationMs ?? SURPRISE_ANIMATION_MS);
    opacity.setValue(0);
    caption.setValue(0);
    scale.setValue(0.82);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
    ]).start();
    const write = setTimeout(() => {
      Animated.timing(caption, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    }, 280);
    const fadeAt = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }).start();
    }, hold);
    const end = setTimeout(() => done.current(), hold + 360);
    return () => {
      clearTimeout(write);
      clearTimeout(fadeAt);
      clearTimeout(end);
    };
  }, [item?.id, playKey, opacity, caption, scale, src]);

  if (!item || !src) return null;

  return (
    <View pointerEvents="none" style={{ marginTop: 8, width: "100%", alignItems: "center", backgroundColor: "transparent" }}>
      <Animated.View style={{ width: 200, height: 280, backgroundColor: "transparent", opacity, transform: [{ scale }] }}>
        <Image
          source={src}
          style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
          contentFit="contain"
          autoplay
          allowDownscaling={false}
        />
      </Animated.View>
      {message ? (
        <Animated.Text
          style={{
            marginTop: 2,
            color: "#fffaf0",
            fontFamily: "GreatVibes_400Regular",
            fontSize: 28,
            lineHeight: 34,
            textAlign: "center",
            opacity: caption,
          }}
        >
          {message}
        </Animated.Text>
      ) : null}
    </View>
  );
}
