import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { wippSrc } from "../lib/assets";
import { stickerById } from "../lib/stickers";
import { isWippPopId } from "../lib/wippmoji";
import { parseWippmojiId, WippSticker } from "./WippSticker";

const POP_MS = 6000;
const MOVE_MS = 650;

export function WippMomentOverlay({
  stickerId,
  playKey,
  onDone,
}: {
  stickerId: string | null;
  playKey: number;
  onDone: () => void;
}) {
  const pop = isWippPopId(stickerId);
  const row = stickerId && !pop ? stickerById(stickerId) : undefined;
  const poster = row ? wippSrc(row.src) : undefined;
  const anim = row?.anim ? wippSrc(row.anim) : undefined;
  const [fade, setFade] = useState(false);
  const [usePoster, setUsePoster] = useState(false);
  const img = useRef<Image>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const { width, height } = useWindowDimensions();
  const info = pop && stickerId ? parseWippmojiId(stickerId) : null;
  const total = Math.max(2500, POP_MS - (info?.start ?? 0) * 1000);
  const move = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pop) return;
    setFade(false);
    // 0 → 1: comes in from its side; 1 → 2: stays in the middle; 2 → 3: goes out (WIPP moves the clip, Grok does not).
    move.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(move, { toValue: 1, duration: MOVE_MS, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(move, { toValue: 2, duration: Math.max(500, total - 2 * MOVE_MS), easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(move, { toValue: 3, duration: MOVE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start(() => done.current());
    return () => anim.stop();
  }, [stickerId, playKey, pop, total, move]);

  useEffect(() => {
    if (!row?.playMs) return;
    setFade(false);
    setUsePoster(false);
    const ms = row.playMs;
    const kick = setTimeout(() => {
      if (Platform.OS !== "web") void img.current?.startAnimating();
    }, 16);
    const fadeAt = setTimeout(() => setFade(true), ms);
    const end = setTimeout(() => done.current(), ms + 420);
    return () => {
      clearTimeout(kick);
      clearTimeout(fadeAt);
      clearTimeout(end);
    };
  }, [stickerId, playKey, row?.playMs]);

  if (pop && stickerId) {
    // A WippPop: the user's own animated character, big over the chat, moved across the screen.
    const side = (k?: string) => {
      const far = { left: [-width, 0], right: [width, 0], top: [0, -height], bottom: [0, height] } as Record<string, number[]>;
      return far[k ?? ""] ?? [0, 0];
    };
    const [ix, iy] = side(info?.enter);
    const [ox, oy] = side(info?.exit);
    const translateX = move.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [ix, 0, 0, ox] });
    const translateY = move.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [iy, 0, 0, oy] });
    const scale = move.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [info?.enter === "zoom" ? 0.2 : 1, 1, 1, info?.exit === "zoom" ? 0.2 : 1] });
    const opacity = move.interpolate({
      inputRange: [0, 0.4, 1, 2, 2.6, 3],
      outputRange: [info?.enter === "zoom" || info?.enter === "none" || !info?.enter ? 0 : 1, 1, 1, 1, 1, info?.exit === "zoom" || info?.exit === "none" || !info?.exit ? 0 : 1],
    });
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.layer, { justifyContent: "center" }]}>
        <Animated.View key={`${stickerId}-${playKey}`} style={{ width: "100%", aspectRatio: 1, opacity, transform: [{ translateX }, { translateY }, { scale }] }}>
          <WippSticker id={stickerId} size={400} fill />
        </Animated.View>
      </View>
    );
  }
  if (!stickerId || !row?.playMs) return null;
  const src = usePoster ? poster : (anim ?? poster);
  if (!src) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.layer, { opacity: fade ? 0 : 1 }]}>
      <Image
        ref={img}
        key={`${stickerId}-${playKey}`}
        source={typeof src === "number" ? src : { uri: src.uri, isAnimated: true }}
        placeholder={poster}
        style={styles.anim}
        contentFit="contain"
        autoplay
        useAppleWebpCodec={false}
        allowDownscaling={false}
        cachePolicy="memory-disk"
        recyclingKey={`${stickerId}-${playKey}`}
        onDisplay={() => {
          if (Platform.OS !== "web") void img.current?.startAnimating();
        }}
        onError={() => {
          if (anim && !usePoster) setUsePoster(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 80,
    elevation: 80,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  anim: {
    width: "100%",
    height: "92%",
  },
});
