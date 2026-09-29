import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Compass, Heart, MapPin, MessageCircle, Phone, QrCode, ScanLine, Search, User, Users, X } from "lucide-react-native";
import { useDeviceLayout } from "../lib/device-layout";
import { haptic } from "../lib/haptics";
import { isPrivateChat, useT, useWippStore } from "../lib/store";
import { colors, layout } from "../theme";
import { TouchHero, WippPhonesGlyph, WippWordmark } from "./Logo";
import { Press } from "./ui";

const TABS = [
  { name: "chats" as const, key: "tabChats" as const },
  { name: "calls" as const, key: "tabCalls" as const },
  { name: "explore" as const, key: "tabExplore" as const },
  { name: "me" as const, key: "tabMe" as const },
];

export function TabBar({ active }: { active: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { compact, height } = useDeviceLayout();
  const goTab = useWippStore((s) => s.goTab);
  const push = useWippStore((s) => s.push);
  const unread = useWippStore((s) =>
    s.chats.reduce((n, c) => n + (c.archived || c.isRequest || isPrivateChat(c.id) ? 0 : c.unread), 0),
  );
  const missed = useWippStore((s) => s.calls.filter((c) => c.missed && c.at > (s.callsSeenAt ?? 0)).length);
  const pending = useWippStore(
    (s) =>
      s.requests.filter((r) => r.status === "pending").length +
      (s.serverConnected ? 0 : s.intros.filter((i) => i.recipientId === "me" && i.status === "pending").length),
  );
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const sheetY = useRef(new Animated.Value(40)).current;
  const sheetOp = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const [pulse, setPulse] = useState(false);
  const sheetMargin = 8;
  const sheetPad = 12;
  const altGap = 8;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [halo]);

  useEffect(() => {
    if (open) {
      setShown(true);
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(sheetOp, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (shown) {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 48, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetOp, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setShown(false);
      });
    }
  }, [open, shown, sheetOp, sheetY]);

  function tapWipp() {
    haptic("select");
    setPulse(true);
    Animated.sequence([
      Animated.timing(pulseScale, { toValue: 1.1, duration: 160, useNativeDriver: true }),
      Animated.timing(pulseScale, { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start(() => setPulse(false));
    setOpen((v) => !v);
  }

  function go(name: "wgo-touch" | "scanner" | "my-qr" | "search-user" | "nearby") {
    haptic("select");
    setOpen(false);
    if (name === "nearby") {
      useWippStore.getState().setNearby(15);
    }
    setTimeout(() => push({ name }), 160);
  }

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  const alts = [
    { id: "scanner" as const, title: t("wippScanCard"), hint: t("wippScanCardHint"), Icon: ScanLine },
    { id: "my-qr" as const, title: t("wippMyQrCard"), hint: t("wippMyQrCardHint"), Icon: QrCode },
    { id: "search-user" as const, title: t("wippSearchCard"), hint: t("wippSearchCardHint"), Icon: Search },
    { id: "nearby" as const, title: t("wippNearbyCard"), hint: t("wippNearbyCardHint"), Icon: MapPin },
  ];
  const tabH = layout.tabBarHeight + insets.bottom;
  const sheetMax = Math.min(height * 0.72, height - tabH - 24);

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 20 }}>
      {shown ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            justifyContent: "flex-end",
            paddingBottom: Math.max(tabH - 8, 0),
            zIndex: 3,
          }}
        >
          <Animated.View
            pointerEvents={open ? "auto" : "none"}
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: sheetOp, backgroundColor: "rgba(5,7,12,0.55)" }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          </Animated.View>
          <Animated.View
            style={{
              marginHorizontal: sheetMargin,
              marginBottom: 4,
              maxHeight: sheetMax,
              backgroundColor: "#0c111a",
              borderRadius: 28,
              transform: [{ translateY: sheetY }],
              overflow: "hidden",
            }}
          >
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: sheetPad, paddingTop: 4, paddingBottom: 12 }}
            >
              <View style={{ alignSelf: "center", width: 42, height: 4, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.28)", marginTop: 6, marginBottom: 10 }} />
              <View style={{ marginRight: 28, marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <WippWordmark size={22} color={colors.accent} />
                  <Text style={{ fontSize: compact ? 18 : 20, fontFamily: "Inter_700Bold", color: colors.fg }}>Connect</Text>
                </View>
                <Text style={{ marginTop: 4, fontSize: 12.5, lineHeight: 17, color: "rgba(255,255,255,0.55)" }}>{t("wippConnectSub")}</Text>
                <Press
                  onPress={() => setOpen(false)}
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -28,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={16} color="rgba(255,255,255,0.72)" />
                </Press>
              </View>
              <Press
                onPress={() => go("wgo-touch")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: 112,
                  backgroundColor: "#10151f",
                  borderRadius: 18,
                  paddingVertical: 8,
                  paddingLeft: 4,
                  paddingRight: 8,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,216,77,0.72)",
                  marginBottom: 8,
                }}
              >
                <TouchHero width={compact ? 88 : 108} height={compact ? 76 : 92} />
                <View style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
                  <Text style={{ color: colors.accent, fontSize: 8, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.8, textTransform: "uppercase" }}>
                    {t("wippTouchBadge")}
                  </Text>
                  <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.3, textTransform: "uppercase", marginTop: 1 }}>
                    {t("wippTouchCard")}
                  </Text>
                  <Text style={{ color: colors.fg, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 }} numberOfLines={1}>
                    {t("wippTouchCardHint")}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 10.5, lineHeight: 14, marginTop: 2 }} numberOfLines={2}>
                    {t("wippTouchCardBody")}
                  </Text>
                </View>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={16} color={colors.accentFg} strokeWidth={2.4} />
                </View>
              </Press>
              <View style={{ marginTop: 8, gap: altGap }}>
                {[alts.slice(0, 2), alts.slice(2, 4)].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: "row", gap: altGap }}>
                    {row.map((c) => (
                      <Press
                        key={c.id}
                        onPress={() => go(c.id)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          minHeight: 76,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          borderRadius: 16,
                          backgroundColor: "#141a26",
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.07)",
                        }}
                      >
                        <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                          <c.Icon size={22} color={colors.accent} strokeWidth={1.8} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.fg, lineHeight: 16 }} numberOfLines={1}>
                            {c.title}
                          </Text>
                          <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.48)", lineHeight: 13, marginTop: 1 }} numberOfLines={2}>
                            {c.hint}
                          </Text>
                        </View>
                      </Press>
                    ))}
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginHorizontal: 2 }}>
                <Users size={16} color={colors.accent} />
                <Text style={{ fontSize: 11, lineHeight: 15, color: "rgba(255,255,255,0.62)", flex: 1, flexShrink: 1 }}>
                  {t("wippConnectFoot")} <Text style={{ fontFamily: "Inter_700Bold", color: colors.fg }}>{t("wippConnectFootEm")}</Text>
                </Text>
                <Heart size={16} color={colors.accent} />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}

      <View
        style={{
          marginTop: "auto",
          zIndex: 4,
          height: tabH,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          paddingHorizontal: compact ? 4 : 8,
          backgroundColor: "#121722",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-around",
        }}
      >
        {left.map((tab) => (
          <TabItem
            key={tab.name}
            name={tab.name}
            label={t(tab.key)}
            active={active === tab.name && !open}
            badge={tab.name === "chats" ? unread + pending : tab.name === "calls" ? missed : 0}
            onPress={() => {
              haptic("select");
              setOpen(false);
              goTab(tab.name);
            }}
          />
        ))}
        <Pressable onPress={tapWipp} accessibilityLabel={t("tabConnect")} style={{ alignItems: "center", marginTop: -46, width: 76, flexShrink: 0 }}>
          <View style={{ width: 76, height: 74, alignItems: "center", justifyContent: "center" }}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 74,
                height: 74,
                borderRadius: 37,
                backgroundColor: "rgba(255,216,77,0.32)",
                opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] }),
                transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
              }}
            />
            <Animated.View
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,
                backgroundColor: colors.navy,
                borderWidth: pulse ? 2 : 1.75,
                borderColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pulseScale }],
                shadowColor: colors.accent,
                shadowOpacity: 0.4,
                shadowRadius: pulse ? 16 : 10,
                elevation: 8,
              }}
            >
              <WippPhonesGlyph size={48} color={colors.accent} />
            </Animated.View>
          </View>
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 10.5, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.6, color: open ? colors.accent : colors.accent }}>
            {t("tabConnect")}
          </Text>
        </Pressable>
        {right.map((tab) => (
          <TabItem
            key={tab.name}
            name={tab.name}
            label={t(tab.key)}
            active={active === tab.name && !open}
            badge={0}
            onPress={() => {
              haptic("select");
              setOpen(false);
              goTab(tab.name);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function TabItem({
  name,
  label,
  active,
  badge,
  onPress,
}: {
  name: string;
  label: string;
  active: boolean;
  badge: number;
  onPress: () => void;
}) {
  const Icon = name === "chats" ? MessageCircle : name === "calls" ? Phone : name === "explore" ? Compass : User;
  const color = active ? colors.accent : colors.muted;
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
      onPress={onPress}
      accessibilityLabel={label}
      style={{ flex: 1, minWidth: 0, alignItems: "center", paddingBottom: 6 }}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: "center", maxWidth: "100%" }}>
        <View>
          <Icon size={22} color={color} strokeWidth={active ? 2.35 : 1.9} fill={active && (name === "chats" || name === "me") ? color : "none"} fillOpacity={0.18} />
          {badge > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -10,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.ink }}>{badge > 9 ? "9+" : badge}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 10.5, fontFamily: "Inter_600SemiBold", color, maxWidth: 72 }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
