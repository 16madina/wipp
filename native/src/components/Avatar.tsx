import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { wippSrc } from "../lib/assets";
import type { MeProfile, User } from "../lib/types";
import { Users } from "lucide-react-native";
import { colors, whiteA } from "../theme";

const signedAvatar = new Map<string, string>();

function useAvatarSource(path?: string) {
  const direct = wippSrc(path);
  const storage = Boolean(path && !direct && /^(business|listings|profiles|shops|events)\//.test(path));
  const [uri, setUri] = useState<string | null>(path && signedAvatar.get(path) ? signedAvatar.get(path)! : null);
  const [unresolved, setUnresolved] = useState(false);
  useEffect(() => {
    if (!storage || !path) return;
    const cached = signedAvatar.get(path);
    if (cached) {
      setUri(cached);
      setUnresolved(false);
      return;
    }
    let live = true;
    setUnresolved(false);
    void import("../lib/lot7/api")
      .then(({ signPublicMedia }) => signPublicMedia(path))
      .then((url) => {
        signedAvatar.set(path, url);
        if (live) setUri(url);
      })
      .catch(() => {
        if (live) setUnresolved(true);
      });
    return () => {
      live = false;
    };
  }, [path, storage]);
  if (direct) return { source: direct, unresolved: false };
  if (uri) return { source: { uri }, unresolved: false };
  return { source: undefined, unresolved: storage && unresolved };
}

export function Avatar({
  user,
  size = 48,
  ring,
  square,
}: {
  user?: User | MeProfile | { displayName?: string; avatar?: string; firstName?: string };
  size?: number;
  ring?: "accent" | "muted" | "none";
  /** Fill a rectangular frame (parent clips) instead of a circle. */
  square?: boolean;
}) {
  const { source: src, unresolved } = useAvatarSource(user?.avatar);
  const initial = (user && "firstName" in user && user.firstName
    ? user.firstName
    : user?.displayName ?? "?"
  )
    .slice(0, 1)
    .toUpperCase();
  const ringOn = ring === "accent" || ring === "muted";
  return (
    <View
      style={{
        width: size,
        height: square ? "100%" : size,
        borderRadius: square ? 0 : size / 2,
        overflow: "hidden",
        backgroundColor: colors.navy,
        borderWidth: ringOn || unresolved ? 2 : 0,
        borderColor: unresolved ? colors.danger : ring === "muted" ? whiteA(0.28) : colors.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        <Image source={src} style={{ width: size, height: square ? "100%" : size }} contentFit="cover" />
      ) : (
        <Text style={{ color: colors.accent, fontSize: size * 0.38, fontFamily: "Inter_600SemiBold" }}>
          {initial}
        </Text>
      )}
    </View>
  );
}

export function GroupAvatar({
  users,
  size = 48,
  fallback,
}: {
  users: (User | undefined)[];
  size?: number;
  fallback?: string;
}) {
  const src = wippSrc(fallback);
  if (src) return <Avatar user={{ displayName: "G", avatar: fallback }} size={size} />;
  const shown = users.filter(Boolean).slice(0, 2) as User[];
  // Same outer size as a person's avatar: one full circle, plus a small second face as a badge.
  const badge = Math.round(size * 0.42);
  return (
    <View style={{ width: size, height: size }}>
      {shown[0] ? (
        <Avatar user={shown[0]} size={size} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
          <Users size={size * 0.42} color={colors.accent} />
        </View>
      )}
      {shown[1] ? (
        <View style={{ position: "absolute", right: -2, bottom: -2, borderRadius: badge, borderWidth: 2, borderColor: colors.bg }}>
          <Avatar user={shown[1]} size={badge} />
        </View>
      ) : null}
    </View>
  );
}
