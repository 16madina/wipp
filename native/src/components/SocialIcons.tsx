import { LinearGradient } from "expo-linear-gradient";
import { Facebook, Ghost, Instagram, Youtube } from "lucide-react-native";
import { Linking, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SOCIAL_KINDS, SOCIAL_NAME, socialLink, type SocialKind, type Socials } from "../lib/profile-socials";
import { Press } from "./ui";

/** Round network button, in the network's own colours. */
export function SocialIcon({ kind, size = 30 }: { kind: SocialKind; size?: number }) {
  const round = { width: size, height: size, borderRadius: size / 2, alignItems: "center" as const, justifyContent: "center" as const };
  const glyph = Math.round(size * 0.54);
  if (kind === "instagram") {
    return (
      <LinearGradient colors={["#feda75", "#fa7e1e", "#d62976", "#962fbf"]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={round}>
        <Instagram size={glyph} color="#fff" />
      </LinearGradient>
    );
  }
  if (kind === "tiktok") {
    return (
      <View style={{ ...round, backgroundColor: "#000", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}>
        <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
          <Path fill="#fff" d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
        </Svg>
      </View>
    );
  }
  if (kind === "snapchat") {
    return (
      <View style={{ ...round, backgroundColor: "#FFFC00" }}>
        <Ghost size={glyph} color="#000" fill="#fff" />
      </View>
    );
  }
  if (kind === "youtube") {
    return (
      <View style={{ ...round, backgroundColor: "#ff0000" }}>
        <Youtube size={glyph} color="#fff" />
      </View>
    );
  }
  return (
    <View style={{ ...round, backgroundColor: "#1877f2" }}>
      <Facebook size={glyph} color="#fff" fill="#fff" />
    </View>
  );
}

/** The person's networks: touching one opens their page there. Draws nothing when there is none. */
export function SocialIcons({ socials, size = 30, style }: { socials?: Socials | null; size?: number; style?: object }) {
  const kinds = SOCIAL_KINDS.filter((kind) => socials?.[kind]);
  if (!kinds.length) return null;
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }, style]}>
      {kinds.map((kind) => (
        <Press key={kind} accessibilityLabel={`${SOCIAL_NAME[kind]} @${socials![kind]}`} onPress={() => void Linking.openURL(socialLink(kind, socials![kind]!)).catch(() => undefined)}>
          <SocialIcon kind={kind} size={size} />
        </Press>
      ))}
    </View>
  );
}
