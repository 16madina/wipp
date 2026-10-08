import Svg, { Circle, Path } from "react-native-svg";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { wippSrc } from "../lib/assets";
import type { MeProfile, User } from "../lib/types";
import { Users } from "lucide-react-native";
import { colors, whiteA } from "../theme";
import { keepPhotoForNotifications } from "../lib/notif-photos";

const signedAvatar = new Map<string, string>();

function useAvatarSource(path?: string) {
  const direct = wippSrc(path);
  const storage = Boolean(path && !direct && /^(business|listings|profiles|shops|events|groups)\//.test(path));
  const [uri, setUri] = useState<string | null>(path && signedAvatar.get(path) ? signedAvatar.get(path)! : null);
  const [unresolved, setUnresolved] = useState(false);
  useEffect(() => {
    if (!storage || !path) return;
    const cached = signedAvatar.get(path);
    if (cached) {
      keepPhotoForNotifications(path, cached);
      setUri(cached);
      setUnresolved(false);
      return;
    }
    let live = true;
    setUnresolved(false);
    void import("../lib/lot7/api")
      // Group photos live in the private bucket (members only): signed URL; the others are public.
      .then(({ signPublicMedia, signPrivateMedia }) => (path.startsWith("groups/") ? signPrivateMedia(path) : signPublicMedia(path)))
      .then((url) => {
        signedAvatar.set(path, url);
        keepPhotoForNotifications(path, url);
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

/** Ring around a story avatar, cut in one piece per story item (small gaps between pieces). */
function SegmentRing({ size, segments }: { size: number; segments: boolean[] }) {
  const stroke = 2.5;
  const r = size / 2 - stroke / 2;
  const c = size / 2;
  const n = Math.min(segments.length, 30);
  const gap = n > 1 ? Math.min(10, 40 / n) : 0;
  const sweep = 360 / n - gap;
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${c + r * Math.cos(rad)} ${c + r * Math.sin(rad)}`;
  };
  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      {n === 1 ? (
        <Circle cx={c} cy={c} r={r} stroke={segments[0] ? whiteA(0.28) : colors.accent} strokeWidth={stroke} fill="none" />
      ) : (
        segments.slice(0, n).map((seen, i) => {
          const from = i * (360 / n) + gap / 2;
          const to = from + sweep;
          return <Path key={i} d={`M ${point(from)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${point(to)}`} stroke={seen ? whiteA(0.28) : colors.accent} strokeWidth={stroke} strokeLinecap="round" fill="none" />;
        })
      )}
    </Svg>
  );
}

export function Avatar({
  user,
  size = 48,
  ring,
  segments,
  square,
}: {
  user?: User | MeProfile | { displayName?: string; avatar?: string; firstName?: string };
  size?: number;
  ring?: "accent" | "muted" | "none";
  /** Story items (true = seen): the ring is split in as many pieces, gold when new, grey when seen. */
  segments?: boolean[];
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
  if (ringOn && segments && segments.length && !square && !unresolved) {
    const inner = size - 8;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <SegmentRing size={size} segments={segments} />
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: "hidden", backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
          {src ? (
            <Image source={src} style={{ width: inner, height: inner }} contentFit="cover" />
          ) : (
            <Text style={{ color: colors.accent, fontSize: inner * 0.38, fontFamily: "Inter_600SemiBold" }}>{initial}</Text>
          )}
        </View>
      </View>
    );
  }
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

/** Initials of a group name: "Famille Diallo" → "FD", "Voisins" → "VO". */
export function groupInitials(name?: string) {
  const words = (name ?? "").trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (!words.length) return "";
  const first = (w: string) => (w.match(/[\p{L}\p{N}]/u)?.[0] ?? "").toUpperCase();
  if (words.length === 1) return Array.from(words[0].replace(/[^\p{L}\p{N}]/gu, "")).slice(0, 2).join("").toUpperCase();
  return first(words[0]) + first(words[1]);
}

/**
 * A group's picture: only the photo the group chose. Without one, the initials of its name —
 * never a member's photo (that would look like the group's picture).
 */
export function GroupAvatar({ name, size = 48, fallback }: { name?: string; size?: number; fallback?: string }) {
  const src = wippSrc(fallback);
  if (src || fallback?.startsWith("groups/")) return <Avatar user={{ displayName: name ?? "G", avatar: fallback }} size={size} />;
  const initials = groupInitials(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
      {initials ? (
        <Text style={{ color: colors.accent, fontSize: size * (initials.length > 1 ? 0.34 : 0.4), fontFamily: "Inter_600SemiBold" }}>{initials}</Text>
      ) : (
        <Users size={size * 0.42} color={colors.accent} />
      )}
    </View>
  );
}
