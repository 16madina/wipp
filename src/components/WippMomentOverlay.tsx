import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { wippSrc } from "../lib/assets";
import { stickerById } from "../lib/stickers";

export function WippMomentOverlay({
  stickerId,
  playKey,
  onDone,
}: {
  stickerId: string | null;
  playKey: number;
  onDone: () => void;
}) {
  const row = stickerId ? stickerById(stickerId) : undefined;
  const poster = row ? wippSrc(row.src) : undefined;
  const anim = row?.anim ? wippSrc(row.anim) : undefined;
  const [fade, setFade] = useState(false);
  const img = useRef<Image>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!row?.playMs) return;
    setFade(false);
    const ms = row.playMs;
    const kick = setTimeout(() => {
      void img.current?.startAnimating();
    }, 16);
    const fadeAt = setTimeout(() => setFade(true), ms);
    const end = setTimeout(() => done.current(), ms + 420);
    return () => {
      clearTimeout(kick);
      clearTimeout(fadeAt);
      clearTimeout(end);
    };
  }, [stickerId, playKey, row?.playMs]);

  if (!stickerId || !row?.playMs) return null;
  const src = anim ?? poster;
  if (!src) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.layer, { opacity: fade ? 0 : 1 }]}>
      <Image
        ref={img}
        key={`${stickerId}-${playKey}`}
        source={src}
        placeholder={poster}
        style={styles.anim}
        contentFit="contain"
        autoplay
        allowDownscaling={false}
        cachePolicy="memory-disk"
        recyclingKey={`${stickerId}-${playKey}`}
        onDisplay={() => {
          void img.current?.startAnimating();
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
