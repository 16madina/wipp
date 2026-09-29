import { useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Animated, Modal, StyleSheet, View } from "react-native";
import { wippSrc } from "../lib/assets";
import {
  findAnimation,
  SURPRISE_ANIMATION_MS,
  type SurpriseAnimationItem,
} from "../lib/surprise";

function enterOffset(enter: SurpriseAnimationItem["enter"]) {
  if (enter === "left") return { x: -280, y: 40 };
  if (enter === "right") return { x: 280, y: 40 };
  if (enter === "pop") return { x: 0, y: 0 };
  return { x: 0, y: 520 };
}

export function SurpriseAnimOverlay({
  animationId,
  playKey = 0,
  onDone,
}: {
  animationId: string | null;
  playKey?: number;
  onDone: () => void;
}) {
  const item = findAnimation(animationId);
  const src = item ? wippSrc(item.anim ?? item.art) : undefined;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(520)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.72)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!item || !src) return;
    const hold = Math.max(1400, item.durationMs ?? SURPRISE_ANIMATION_MS);
    const from = enterOffset(item.enter);
    opacity.setValue(0);
    translateX.setValue(from.x);
    translateY.setValue(from.y);
    scale.setValue(item.enter === "pop" ? 0.2 : 0.86);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 68 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7, tension: 62 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 72 }),
    ]).start();
    const fadeAt = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 420, useNativeDriver: true }).start();
    }, hold);
    const end = setTimeout(() => done.current(), hold + 460);
    return () => {
      clearTimeout(fadeAt);
      clearTimeout(end);
    };
  }, [item?.id, playKey, opacity, translateX, translateY, scale, src]);

  if (!item || !src) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View pointerEvents="none" style={styles.layer}>
        <Animated.View
          style={[
            styles.stage,
            {
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            },
          ]}
        >
          <Image source={src} style={styles.anim} contentFit="contain" autoplay allowDownscaling={false} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  stage: {
    width: "100%",
    height: "88%",
  },
  anim: {
    width: "100%",
    height: "100%",
  },
});
