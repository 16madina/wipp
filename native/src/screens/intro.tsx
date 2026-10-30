import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { bootPoster, bootVideo } from "../lib/assets";
import { palettes } from "../theme";
import { tr } from "../lib/tr";

/** Écran immersif (photo, vidéo, caméra ou appel) : toujours en couleurs sombres, quel que soit le thème. */
const colors = palettes.dark;

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const finished = useRef(false);
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
  // No « tap for sound » button: as soon as the video is ready, it plays with sound.
  useEventListener(player, "statusChange", ({ status }) => {
    if (status !== "readyToPlay" || finished.current || player.playing) return;
    player.muted = false;
    player.volume = 1;
    player.play();
  });

  useEffect(() => {
    const failSafe = setTimeout(finish, 4800);
    return () => clearTimeout(failSafe);
  }, [player]);

  return (
    <View
      accessibilityLabel={tr("Wipp")}
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
    </View>
  );
}
