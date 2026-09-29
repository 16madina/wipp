import { Image } from "expo-image";
import { Text, View } from "react-native";
import { wippSrc } from "../lib/assets";
import { stickerById, stickerLabel } from "../lib/stickers";
import { colors } from "../theme";

export function WippSticker({
  id,
  size = 48,
  loop = false,
  fill = false,
}: {
  id: string;
  size?: number;
  loop?: boolean;
  fill?: boolean;
}) {
  const row = stickerById(id);
  const poster = row ? wippSrc(row.src) : undefined;
  const anim = row?.anim ? wippSrc(row.anim) : undefined;
  const src = (loop && anim) || poster;
  const box = fill ? { width: "100%" as const, height: "100%" as const } : { width: size, height: size };
  if (src) {
    return <Image source={src} style={box} contentFit="contain" autoplay={Boolean(loop)} />;
  }
  return (
    <View style={{ ...box, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: Math.max(11, size / 6), color: colors.muted, textAlign: "center" }} numberOfLines={2}>
        {stickerLabel(id, "fr")}
      </Text>
    </View>
  );
}
