import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { AccessibilityInfo, Animated, FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { Clock, Gift, Search, Smile, Sparkles, User } from "lucide-react-native";
import { useDeviceLayout } from "../lib/device-layout";
import { haptic } from "../lib/haptics";
import { stickerRemoteUri } from "../lib/sticker-cdn";
import { stickersInPack, wippieStickers, type StickerDef } from "../lib/stickers";
import { colors } from "../theme";
import { Press } from "./ui";
import { WippSticker } from "./WippSticker";

type Tab = "recent" | "moji" | "wippie" | "pop" | "moment";
type Wippie = "tous" | "femme" | "homme" | "comique" | "emo";

const TABS: { id: Tab; label: string }[] = [
  { id: "recent", label: "Récents" },
  { id: "moji", label: "Wippmoji" },
  { id: "wippie", label: "Wippie" },
  { id: "pop", label: "WIPP Moments" },
  { id: "moment", label: "Surprises" },
];

function prefetchMoments() {
  const urls = stickersInPack("ani")
    .map((s) => (s.anim ? stickerRemoteUri(s.anim) : undefined))
    .filter((u): u is string => Boolean(u));
  void (async () => {
    for (let i = 0; i < urls.length; i += 4) {
      await Image.prefetch(urls.slice(i, i + 4), "memory-disk");
    }
  })();
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
  const slideY = useRef(new Animated.Value(0)).current;
  const moji = stickersInPack("moji");
  const moments = stickersInPack("ani");
  const wippies = wippieStickers(wippie);
  const recents = [...moji.slice(0, 8), ...wippies.slice(0, 8)];
  const query = q.trim().toLowerCase();
  const shown = query
    ? [...moji, ...wippies, ...moments].filter(
        (s) => s.labelFr.toLowerCase().includes(query) || s.labelEn.toLowerCase().includes(query),
      )
    : tab === "recent"
      ? recents
      : tab === "moji"
        ? moji
        : tab === "wippie"
          ? wippies
          : tab === "pop"
            ? moments
            : [];
  const title = TABS.find((item) => item.id === tab)?.label ?? "Stickers";
  const minCell = !query && tab === "pop" ? 132 : !query && tab === "moji" ? 64 : 80;
  const cols = Math.max(!query && tab === "pop" ? 2 : !query && tab === "moji" ? 5 : 4, Math.floor((contentWidth - 24) / minCell));
  const stickerSize = tab === "pop" ? 88 : tab === "moji" ? 48 : 60;
  const trayH = Math.min(tablet ? 340 : 300, Math.round(height * 0.36));

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
    dismiss(() => onPick(s));
  }

  function goto(next: Tab) {
    setQ("");
    setTab(next);
  }

  return (
    <Animated.View
      style={{
        height: trayH,
        backgroundColor: "rgba(18,23,34,0.98)",
        borderTopWidth: 1,
        borderTopColor: colors.hair,
        paddingHorizontal: 12,
        paddingTop: 6,
        transform: [{ translateY: slideY }],
      }}
    >
      <View style={{ alignItems: "center", marginBottom: 6 }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.accent }}>{title}</Text>
        <Press onPress={() => setSearch((v) => !v)} style={{ position: "absolute", right: 0, top: -4, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Search size={20} color={colors.muted} />
        </Press>
      </View>
      {search ? (
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher"
          placeholderTextColor={colors.muted}
          style={{ height: 40, borderRadius: 12, backgroundColor: colors.surface2, paddingHorizontal: 12, color: colors.fg, marginBottom: 6 }}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
        {TABS.map((item) => {
          const on = tab === item.id && !query;
          return (
            <Press
              key={item.id}
              onPress={() => goto(item.id)}
              style={{
                minHeight: 28,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: on ? colors.accent : "rgba(11,18,32,0.5)",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: on ? colors.accentFg : colors.muted }}>{item.label}</Text>
            </Press>
          );
        })}
      </ScrollView>
      {tab === "wippie" && !query ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
          {(["tous", "femme", "homme", "comique", "emo"] as const).map((id) => (
            <Press
              key={id}
              onPress={() => setWippie(id)}
              style={{
                minHeight: 26,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: wippie === id ? colors.accent : colors.navy,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: wippie === id ? colors.accentFg : colors.muted }}>
                {id === "tous" ? "Tous" : id === "femme" ? "Elle" : id === "homme" ? "Lui" : id === "comique" ? "Comique" : "EMO"}
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
              onPress={() => pick(s)}
              style={{
                flex: 1,
                aspectRatio: 1,
                margin: 2,
                borderRadius: 14,
                backgroundColor: "rgba(11,18,32,0.5)",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <WippSticker id={s.id} size={stickerSize} fill={tab === "pop"} />
            </Press>
          )}
        />
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderRadius: 16, backgroundColor: "rgba(11,18,32,0.5)", paddingVertical: 4 }}>
        {(
          [
            { id: "recent" as const, label: "Récents", icon: Clock },
            { id: "moji" as const, label: "Wippmoji", icon: Smile },
            { id: "wippie" as const, label: "Wippie", icon: User },
            { id: "pop" as const, label: "WIPP Moments", icon: Sparkles },
            { id: "moment" as const, label: "Surprises", icon: Gift },
          ] as const
        ).map((item) => {
          const on = tab === item.id && !query;
          return (
            <Press
              key={item.id}
              accessibilityLabel={item.label}
              onPress={() => goto(item.id)}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: on ? colors.accent : "transparent",
                }}
              >
                <item.icon size={16} color={on ? colors.accentFg : colors.fg} />
              </View>
            </Press>
          );
        })}
      </View>
    </Animated.View>
  );
}
