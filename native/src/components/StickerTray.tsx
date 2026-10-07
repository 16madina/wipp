import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { AccessibilityInfo, Animated, FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { Clapperboard, Clock, Drama, Gift, Search, SendHorizontal, Smile, User, X } from "lucide-react-native";
import { useDeviceLayout } from "../lib/device-layout";
import { haptic } from "../lib/haptics";
import { stickerRemoteUri } from "../lib/sticker-cdn";
import { stickersInPack, wippieStickers, type StickerDef } from "../lib/stickers";
import { colors } from "../theme";
import { Press } from "./ui";
import { WippSticker } from "./WippSticker";

type Tab = "recent" | "moji" | "wippie" | "emo" | "pop" | "moment";
type Wippie = "tous" | "femme" | "homme" | "comique";

/** Bottom bar, left to right. `label` = search placeholder, `short` = name under the icon. */
const TABS = [
  { id: "recent", label: "Récents", short: "Récents", icon: Clock },
  { id: "moji", label: "Wippmoji", short: "Wippmoji", icon: Smile },
  { id: "wippie", label: "Wippie", short: "Wippie", icon: User },
  { id: "emo", label: "EMO", short: "EMO", icon: Drama },
  { id: "pop", label: "WIPP Moments", short: "Moments", icon: Clapperboard },
  { id: "moment", label: "Surprises", short: "Surprises", icon: Gift },
] as const satisfies readonly { id: Tab; label: string; short: string; icon: unknown }[];

/** Height of the bottom bar (icon + name), without its padding. */
const BAR_H = 48;

function prefetchMoments() {
  const urls = stickersInPack("ani")
    .map((s) => (s.anim ? stickerRemoteUri(s.anim) : undefined))
    .filter((u): u is string => Boolean(u));
  void (async () => {
    for (let i = 0; i < urls.length; i += 4) {
      // Disk only: keeping 42 decoded animations in memory was enough to get WIPP killed.
      await Image.prefetch(urls.slice(i, i + 4), "disk");
    }
  })();
}

/** Has a real animation (WebP / video): previewed before sending instead of animating in the grid. */
function isMoving(s: StickerDef) {
  return Boolean(s.anim) || /\.(webp|gif)(\?|$)/i.test(s.src);
}

/** One sticker playing, big, over the grid: « Envoyer » or touch it to send, outside / × to close. */
function StickerPreview({ sticker, size, onSend, onClose }: { sticker: StickerDef; size: number; onSend: () => void; onClose: () => void }) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: BAR_H + 8, zIndex: 5 }}>
      <Press onPress={onClose} accessibilityLabel="Fermer l’aperçu" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }} />
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 12 }}>
        <View style={{ width: Math.min(300, size + 120), borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 14, alignItems: "center" }}>
          <Press onPress={onClose} accessibilityLabel="Fermer" style={{ position: "absolute", top: 6, right: 6, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <X size={18} color={colors.muted} />
          </Press>
          <Press onPress={onSend} accessibilityLabel={`Envoyer ${sticker.labelFr}`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            {/* key: switching sticker restarts the animation from the start */}
            <WippSticker key={sticker.id} id={sticker.id} size={size} />
          </Press>
          <Text numberOfLines={1} style={{ marginTop: 6, color: colors.fg, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{sticker.labelFr}</Text>
          <Press onPress={onSend} style={{ marginTop: 10, alignSelf: "stretch", height: 42, borderRadius: 999, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
            <SendHorizontal size={18} color={colors.accentFg} />
            <Text style={{ color: colors.accentFg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Envoyer</Text>
          </Press>
        </View>
      </View>
    </View>
  );
}

export function StickerTray({
  onPick,
  onSurprise,
}: {
  onPick: (sticker: StickerDef) => void;
  onSurprise: () => void;
}) {
  const { tablet, contentWidth, height } = useDeviceLayout();
  const [tab, setTab] = useState<Tab>("moji");
  const [wippie, setWippie] = useState<Wippie>("tous");
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const [closing, setClosing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** Sticker being previewed (animated, alone) before sending. */
  const [preview, setPreview] = useState<StickerDef | null>(null);
  const slideY = useRef(new Animated.Value(0)).current;
  const moji = stickersInPack("moji");
  const moments = stickersInPack("ani");
  const emo = stickersInPack("emo");
  const wippies = wippieStickers(wippie);
  const recents = [...moji.slice(0, 8), ...wippies.slice(0, 8)];
  const query = q.trim().toLowerCase();
  const shown = query
    ? [...moji, ...wippieStickers("tous"), ...emo, ...moments].filter(
        (s) => s.labelFr.toLowerCase().includes(query) || s.labelEn.toLowerCase().includes(query),
      )
    : tab === "recent"
      ? recents
      : tab === "moji"
        ? moji
        : tab === "wippie"
          ? wippies
          : tab === "emo"
            ? emo
            : tab === "pop"
              ? moments
              : [];
  const title = TABS.find((item) => item.id === tab)?.label ?? "Stickers";
  // EMO and Moments are full scenes: 3 big cells per row.
  const scenes = !query && (tab === "pop" || tab === "emo");
  const minCell = scenes ? 104 : !query && tab === "moji" ? 64 : 80;
  const cols = Math.max(scenes ? 3 : !query && tab === "moji" ? 5 : 4, Math.floor((contentWidth - 24) / minCell));
  const stickerSize = scenes ? 84 : tab === "moji" ? 52 : 68;
  const trayH = Math.min(tablet ? 420 : 360, Math.round(height * 0.42));

  useEffect(() => {
    if (tab === "pop") prefetchMoments();
  }, [tab]);


  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  function dismiss(after: () => void) {
    if (closing) return;
    setClosing(true);
    if (reduceMotion) {
      after();
      return;
    }
    Animated.timing(slideY, { toValue: trayH, duration: 170, useNativeDriver: true }).start(after);
  }

  function pick(s: StickerDef) {
    haptic("select");
    setPreview(null);
    dismiss(() => onPick(s));
  }

  /**
   * The grid shows first images only (dozens of animations at once froze the iPhone).
   * Touch = see it move, big, alone; touch again (or « Envoyer ») = send.
   */
  function tapSticker(s: StickerDef) {
    if (!isMoving(s)) {
      pick(s);
      return;
    }
    if (preview?.id === s.id) {
      pick(s);
      return;
    }
    haptic("select");
    setPreview(s);
  }

  function goto(next: Tab) {
    setQ("");
    setPreview(null);
    setTab(next);
  }

  return (
    <Animated.View
      style={{
        height: trayH,
        backgroundColor: colors.tray,
        borderTopWidth: 1,
        borderTopColor: colors.hair,
        paddingHorizontal: 12,
        paddingTop: 8,
        transform: [{ translateY: slideY }],
      }}
    >
      <View style={{ alignItems: "center", paddingBottom: 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.hair }} />
      </View>
      {search ? (
        <TextInput
          value={q}
          onChangeText={setQ}
          autoFocus
          onBlur={() => {
            if (!q.trim()) setSearch(false);
          }}
          placeholder={`Rechercher dans ${title}`}
          placeholderTextColor={colors.muted}
          style={{ height: 36, borderRadius: 10, backgroundColor: colors.surface2, paddingHorizontal: 12, color: colors.fg, marginBottom: 8, fontSize: 15 }}
        />
      ) : (
        <Press
          onPress={() => setSearch(true)}
          accessibilityLabel="Rechercher"
          style={{ height: 36, borderRadius: 10, backgroundColor: colors.surface2, paddingHorizontal: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Search size={16} color={colors.muted} />
          <Text style={{ fontSize: 15, color: colors.muted }}>{`Rechercher dans ${title}`}</Text>
        </Press>
      )}
      {tab === "wippie" && !query ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0, flexShrink: 0, height: 36 }}
          contentContainerStyle={{ gap: 6, alignItems: "center", paddingBottom: 6 }}
        >
          {(["tous", "femme", "homme", "comique"] as const).map((id) => (
            <Press
              key={id}
              onPress={() => setWippie(id)}
              style={{
                height: 28,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: wippie === id ? colors.accent : colors.navy,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: wippie === id ? colors.accentFg : colors.muted }}>
                {id === "tous" ? "Tous" : id === "femme" ? "Elle" : id === "homme" ? "Lui" : "Comique"}
              </Text>
            </Press>
          ))}
        </ScrollView>
      ) : null}
      {tab === "moment" && !query ? (
        <ScrollView style={{ flex: 1 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 8 }}>
          <Press
            onPress={() => {
              haptic("select");
              dismiss(onSurprise);
            }}
            style={{ width: "100%", borderRadius: 16, backgroundColor: colors.navy, padding: 12, borderWidth: 1, borderColor: colors.accent }}
          >
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.accent }}>Carte à gratter</Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: colors.muted }}>Gratte pour découvrir la surprise.</Text>
          </Press>
          {(
            [
              { name: "Cadeau", hint: "Un message à dévoiler" },
              { name: "Confettis", hint: "Une surprise qui éclate" },
              { name: "Compte à rebours", hint: "Une surprise à attendre" },
              { name: "Secret", hint: "Un message à débloquer" },
            ] as const
          ).map((item) => (
            <Press
              key={item.name}
              onPress={() => {
                haptic("select");
                dismiss(onSurprise);
              }}
              style={{ width: "48%", borderRadius: 16, backgroundColor: colors.navy, padding: 12, borderWidth: 1, borderColor: colors.hair }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.fg }}>{item.name}</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{item.hint}</Text>
            </Press>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          key={`${tab}-${cols}-${query}`}
          data={shown}
          numColumns={cols}
          style={{ flex: 1, minHeight: 0 }}
          keyExtractor={(s) => s.id}
          initialNumToRender={cols * 5}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          columnWrapperStyle={cols > 1 ? { gap: 4 } : undefined}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item: s }) => (
            <Press
              onPress={() => tapSticker(s)}
              onLongPress={() => setPreview(s)}
              accessibilityLabel={s.labelFr}
              style={{
                flex: 1,
                aspectRatio: 1,
                margin: 2,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderWidth: 2,
                borderColor: preview?.id === s.id ? colors.accent : "transparent",
              }}
            >
              <WippSticker id={s.id} size={stickerSize} fill={scenes} still />
            </Press>
          )}
        />
      )}
      {preview ? (
        <StickerPreview
          sticker={preview}
          size={Math.max(110, Math.min(170, trayH - 170))}
          onSend={() => pick(preview)}
          onClose={() => setPreview(null)}
        />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: colors.hair, marginHorizontal: -12, paddingHorizontal: 2, paddingTop: 4, paddingBottom: 4 }}>
        {TABS.map((item) => {
          const on = tab === item.id && !query;
          const tint = on ? colors.accent : colors.muted;
          return (
            <Press
              key={item.id}
              accessibilityLabel={item.label}
              onPress={() => goto(item.id)}
              style={{
                flex: 1,
                height: BAR_H,
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
            >
              <item.icon size={21} color={tint} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ fontSize: 10.5, color: tint, fontFamily: on ? "Inter_600SemiBold" : "Inter_500Medium", textAlign: "center" }}
              >
                {item.short}
              </Text>
            </Press>
          );
        })}
      </View>
    </Animated.View>
  );
}
