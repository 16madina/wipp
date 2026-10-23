import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Platform, StyleSheet, View } from "react-native";
import { wippSrc } from "../lib/assets";
import { stickerById } from "../lib/stickers";
import { isWippPopId } from "../lib/wippmoji";
import { WippSticker } from "./WippSticker";

const POP_MS = 6000;

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

  useEffect(() => {
    if (!pop) return;
    setFade(false);
    const fadeAt = setTimeout(() => setFade(true), POP_MS);
    const end = setTimeout(() => done.current(), POP_MS + 420);
    return () => {
      clearTimeout(fadeAt);
      clearTimeout(end);
    };
  }, [stickerId, playKey, pop]);

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
    // A WippPop: the user's own animated character, big over the chat.
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.layer, { opacity: fade ? 0 : 1, justifyContent: "center" }]}>
        <View key={`${stickerId}-${playKey}`} style={{ width: "100%", aspectRatio: 1 }}>
          <WippSticker id={stickerId} size={400} fill />
        </View>
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
