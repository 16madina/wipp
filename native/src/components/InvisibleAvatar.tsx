import { View } from "react-native";
import { Image } from "expo-image";

export type InvisibleRing = "man" | "woman" | "other";

/** Ring colour of the Invisible avatar: blue (man), pink (woman), silver (not set / other). */
export const INVISIBLE_RING_COLOR: Record<InvisibleRing, string> = {
  man: "#2f8bff",
  woman: "#ff3d9a",
  other: "#c9ced8",
};

/** The WIPP Invisible visuals provided by the owner (hat + glasses + W in a glowing ring), one per ring colour. */
const ART: Record<InvisibleRing, number> = {
  man: require("../../assets/invisible/invisible-man.png"),
  woman: require("../../assets/invisible/invisible-woman.png"),
  other: require("../../assets/invisible/invisible-other.png"),
};

/**
 * Shown INSTEAD of the photo on a request sent from À proximité in Invisible mode.
 */
export function InvisibleAvatar({ size = 52, ring = "other" }: { size?: number; ring?: InvisibleRing | null }) {
  const key = ring ?? "other";
  return (
    <View
      accessibilityLabel="Utilisateur en mode Invisible"
      style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: "#05070c" }}
    >
      <Image source={ART[key]} style={{ width: size, height: size }} contentFit="cover" />
    </View>
  );
}
