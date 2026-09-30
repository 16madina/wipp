import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Modal, Platform, StyleSheet, View } from "react-native";
import { wippSrc } from "../lib/assets";
import { findAnimation, SURPRISE_ANIMATION_MS } from "../lib/surprise";

/** Full-screen surprise animation, like a WIPP Moment: no plate, no dim, no bubble sticker. */
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
  const img = useRef<Image>(null);
  const [fade, setFade] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!item || !src) return;
    setFade(false);
    const hold = Math.max(1400, item.durationMs ?? SURPRISE_ANIMATION_MS);
    const kick = setTimeout(() => {
      if (Platform.OS !== "web") void img.current?.startAnimating();
    }, 16);
    const fadeAt = setTimeout(() => setFade(true), hold);
    const end = setTimeout(() => done.current(), hold + 420);
    return () => {
      clearTimeout(kick);
      clearTimeout(fadeAt);
      clearTimeout(end);
    };
  }, [item?.id, playKey, src]);

  if (!item || !src) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent hardwareAccelerated>
      <View pointerEvents="none" style={[styles.layer, { opacity: fade ? 0 : 1 }]}>
        <Image
          ref={img}
          key={`${item.id}-${playKey}`}
          source={src}
          style={styles.anim}
          contentFit="contain"
          autoplay
          allowDownscaling={false}
          cachePolicy="memory-disk"
          recyclingKey={`${item.id}-${playKey}`}
          onDisplay={() => {
            if (Platform.OS !== "web") void img.current?.startAnimating();
          }}
        />
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
  anim: {
    width: "100%",
    height: "92%",
    backgroundColor: "transparent",
  },
});
