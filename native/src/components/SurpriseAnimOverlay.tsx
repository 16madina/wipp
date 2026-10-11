import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Volume2, VolumeX } from "lucide-react-native";
import { animSoundOn, setAnimSound, useAnimSound } from "../lib/anim-sound";
import { wippSrc } from "../lib/assets";
import { findAnimation, SURPRISE_ANIMATION_MS } from "../lib/surprise";

/**
 * Transparent artwork floats over the chat without intercepting touches.
 * Full-screen play (« centered »): the animation takes the WHOLE width of the screen and is never cropped,
 * so its text always stays readable; phones are taller than the 9:16 clips, the rest stays transparent.
 */
export function SurpriseAnimOverlay({
  animationId,
  playKey = 0,
  onDone,
  centered = false,
}: {
  animationId: string | null;
  playKey?: number;
  onDone: () => void;
  centered?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const item = findAnimation(animationId);
  const src = item ? wippSrc(reduceMotion ? item.art : item.anim ?? item.art) : undefined;
  const img = useRef<Image>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const done = useRef(onDone);
  const soundRef = useRef<() => void>(() => undefined);
  const soundOn = useAnimSound();
  // The countdown starts when the picture is really on screen (not while it downloads), and the fade-out
  // ends BEFORE the file loops — an animation must never be seen starting a second time.
  const [shown, setShown] = useState(0);
  done.current = onDone;

  useEffect(() => {
    if (!item || !src) return;
    const animated = Boolean(item.anim) && !reduceMotion;
    // Still loading: wait for onDisplay (4 s at most, then go on anyway).
    if (animated && shown !== playKey + 1) {
      const giveUp = setTimeout(() => setShown(playKey + 1), 4000);
      return () => clearTimeout(giveUp);
    }
    const length = Math.max(1400, item.durationMs ?? SURPRISE_ANIMATION_MS);
    const hold = reduceMotion ? 1400 : animated ? Math.max(1000, length - 480) : length;
    opacity.setValue(0);
    scale.setValue(reduceMotion ? 1 : 0.82);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    const fadeAt = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }).start();
    }, hold);
    const end = setTimeout(() => done.current(), hold + 360);
    // Soundtrack (remote .m4a), unless the user muted animation sounds.
    let sound: { stopAsync: () => Promise<unknown>; unloadAsync: () => Promise<unknown> } | null = null;
    let cancelled = false;
    const soundSrc = item.sound ? wippSrc(item.sound) : undefined;
    if (soundSrc && animSoundOn()) {
      void import("expo-av")
        .then(async ({ Audio }) => {
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: false }).catch(() => undefined);
          const { sound: s } = await Audio.Sound.createAsync(soundSrc as never, { shouldPlay: true, volume: 1 });
          if (cancelled) void s.unloadAsync();
          else sound = s;
        })
        .catch(() => undefined);
    }
    soundRef.current = () => {
      void sound?.stopAsync().catch(() => undefined);
    };
    return () => {
      cancelled = true;
      void sound?.stopAsync().catch(() => undefined);
      void sound?.unloadAsync().catch(() => undefined);
      clearTimeout(fadeAt);
      clearTimeout(end);
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, [item?.id, playKey, opacity, scale, src, reduceMotion, shown]);

  if (!item || !src) return null;
  // Only real animations go full screen; a still picture keeps its small frame.
  const full = centered && Boolean(item.anim) && !reduceMotion;

  return (
    <View pointerEvents="box-none" style={centered ? [StyleSheet.absoluteFillObject, { zIndex: 30, alignItems: "center", justifyContent: "center" }] : { marginTop: 8, width: "100%", alignItems: "center" }}>
      {item.sound && centered ? (
        <Pressable
          accessibilityLabel={soundOn ? "Couper le son des animations" : "Activer le son des animations"}
          onPress={() => {
            if (soundOn) soundRef.current();
            setAnimSound(!soundOn);
          }}
          style={{ position: "absolute", top: 60, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", zIndex: 2 }}
        >
          {soundOn ? <Volume2 size={20} color="#fff" /> : <VolumeX size={20} color="#fff" />}
        </Pressable>
      ) : null}
      <Animated.View pointerEvents="none" style={{ width: full ? "100%" : centered ? Math.min(width - 32, 360) : 200, height: full ? "100%" : centered ? Math.min(height * 0.72, 640) : 280, backgroundColor: "transparent", opacity, transform: [{ scale }] }}>
        <Image
          ref={img}
          key={`${item.id}:${playKey}`}
          source={typeof src === "number" ? src : { uri: src.uri, isAnimated: true }}
          style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
          contentFit="contain"
          autoplay={!reduceMotion}
          useAppleWebpCodec={false}
          allowDownscaling={false}
          cachePolicy="memory-disk"
          recyclingKey={`${item.id}:${playKey}`}
          onDisplay={() => {
            setShown(playKey + 1);
            if (Platform.OS !== "web" && !reduceMotion) void img.current?.startAnimating();
          }}
        />
      </Animated.View>
    </View>
  );
}
