import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { bootPoster, bootVideo } from "../lib/assets";
import { useT } from "../lib/store";
import { palettes } from "../theme";

/** Écran immersif (photo, vidéo, caméra ou appel) : toujours en couleurs sombres, quel que soit le thème. */
const colors = palettes.dark;

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const t = useT();
  const finished = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const player = useVideoPlayer(bootVideo, (p) => {
    p.loop = false;
    p.muted = false;
    p.volume = 1;
    p.audioMixingMode = "doNotMix";
    p.play();
  });

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    player.pause();
    onDone();
  };

  useEventListener(player, "playToEnd", finish);

  useEffect(() => {
    const failSafe = setTimeout(finish, 4800);
    const tapHint = setTimeout(() => {
      if (!finished.current && !player.playing) setNeedsTap(true);
    }, 500);
    return () => {
      clearTimeout(failSafe);
      clearTimeout(tapHint);
    };
  }, [player]);

  function unlockSound() {
    if (finished.current) return;
    setNeedsTap(false);
    player.muted = false;
    player.volume = 1;
    player.currentTime = 0;
    player.play();
  }

  return (
    <Pressable
      accessibilityLabel="Wipp"
      onPress={unlockSound}
      style={{ flex: 1, backgroundColor: colors.introBg, justifyContent: "flex-end", alignItems: "center" }}
    >
      <Image
        source={bootPoster}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        contentFit="cover"
      />
      <VideoView
        player={player}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      {needsTap ? (
        <View style={{ marginBottom: 64, borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: colors.accentFg, fontSize: 13, fontFamily: "Inter_500Medium" }}>{t("introTapSound")}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
