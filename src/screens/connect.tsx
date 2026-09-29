import { useEffect, useState } from "react";
import { Share, Text, View, ScrollView } from "react-native";
import { Image } from "expo-image";
import { MapPin, QrCode, ScanLine, Search, Hash } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { WippMark, WippWordmark, TouchHero } from "../components/Logo";
import { QrCard } from "../components/QrCard";
import { Btn, Chip, Empty, GlassHeader, Header, PendingNote, Press, ScreenRoot, SearchField } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { profileQr } from "../lib/qr-payload";
import { APP_HOST } from "../lib/utils";
import { useDeviceLayout } from "../lib/device-layout";
import { useT, useWippStore } from "../lib/store";
import type { FoundVia, NearbyMode } from "../lib/types";
import { colors, layout } from "../theme";

export function ConnectScreen() {
  const t = useT();
  const push = useWippStore((s) => s.push);
  const { tile } = useDeviceLayout();
  const cardW = tile(2, 16, 12);
  const cards = [
    { name: "scanner" as const, icon: ScanLine, title: t("scan"), sub: t("scanSub") },
    { name: "my-qr" as const, icon: QrCode, title: t("myQr"), sub: t("myQrSub") },
    { name: "search-user" as const, icon: Search, title: t("searchCard"), sub: t("searchCardSub") },
    { name: "nearby" as const, icon: MapPin, title: t("nearby"), sub: t("nearbySub") },
  ];
  return (
    <ScreenRoot padBottom>
      <GlassHeader>
        <View style={{ height: layout.navBarHeight, justifyContent: "center", paddingHorizontal: 20 }}>
          <Text numberOfLines={1} style={{ fontSize: 24, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
            {t("connectTitle")}
          </Text>
        </View>
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Press
          onPress={() => push({ name: "wgo-touch" })}
          style={{
            marginHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 16,
            backgroundColor: colors.navy,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: "rgba(255,216,77,0.35)",
          }}
        >
          <WippMark size={52} invert />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{t("wgoTouch")}</Text>
            <Text style={{ fontSize: 12, color: "rgba(247,249,252,0.6)" }}>{t("wgoTouchSub")}</Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.accentFg }}>{t("touchLive")}</Text>
          </View>
        </Press>
        <View style={{ marginTop: 12, paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {cards.map((c) => (
            <Press
              key={c.name}
              onPress={() => push({ name: c.name })}
              style={{ width: cardW, minHeight: 108, borderRadius: 16, backgroundColor: colors.glassCard, padding: 14 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
                <c.icon size={20} color={colors.paper} />
              </View>
              <Text style={{ marginTop: 16, fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{c.title}</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{c.sub}</Text>
            </Press>
          ))}
        </View>
        <View style={{ marginTop: 12, paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Press
            onPress={() => push({ name: "live-code" })}
            style={{ width: cardW, minHeight: 100, borderRadius: 16, backgroundColor: colors.glassCard, padding: 14 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Hash size={20} color={colors.accentFg} />
            </View>
            <Text style={{ marginTop: 12, fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{t("liveCode")}</Text>
            <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{t("liveCodeSub")}</Text>
          </Press>
          <Press
            onPress={() => push({ name: "one-time-qr" })}
            style={{ width: cardW, minHeight: 100, borderRadius: 16, backgroundColor: colors.glassCard, padding: 14 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
              <QrCode size={20} color={colors.paper} />
            </View>
            <Text style={{ marginTop: 12, fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{t("oneTimeQr")}</Text>
            <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{t("oneTimeQrSub")}</Text>
          </Press>
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

export function MyQrScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const me = useWippStore((s) => s.me);
  const [copied, setCopied] = useState(false);
  const qrValue = profileQr(me.username);
  const link = qrValue.replace(/^https?:\/\//, "");
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <GlassHeader>
        <Header title={t("myQr")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ alignItems: "center", paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 }}>
        <WippWordmark size={22} color={colors.paper} />
        <View style={{ marginTop: 16 }}>
          <Avatar user={me} size={72} />
        </View>
        <Text style={{ marginTop: 12, fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{me.displayName}</Text>
        <Text style={{ fontSize: 14, color: "rgba(247,249,252,0.6)" }}>@{me.username}</Text>
        <View style={{ marginTop: 20 }}>
          <QrCard value={qrValue} size={220} />
        </View>
        <Text style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: "rgba(247,249,252,0.6)", maxWidth: 280 }}>
          Ce QR ne contient ni ton numéro, ni ton e-mail.
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: "rgba(247,249,252,0.4)" }}>{link}</Text>
        <View style={{ width: "100%", marginTop: 20 }}>
          <Btn
            label={copied ? t("copied") : "Partager mon WIPP"}
            onPress={() => {
              void Share.share({ message: `@${me.username} https://${APP_HOST}/@${me.username}` });
              setCopied(true);
            }}
          />
        </View>
        <View style={{ width: "100%", marginTop: 8, flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Btn label="Enregistrer" variant="secondary" onPress={() => {}} />
          </View>
          <View style={{ flex: 1 }}>
            <Btn label="QR temporaire" variant="secondary" onPress={() => {}} />
          </View>
        </View>
        <PendingNote label="QR temporaire serveur" />
        <View style={{ width: "100%", marginTop: 8 }}>
          <Btn label={t("wgoTouch")} variant="secondary" onPress={() => push({ name: "wgo-touch" })} />
        </View>
      </ScrollView>
    </View>
  );
}

export function ScannerScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const [q, setQ] = useState("");
  const users = useWippStore((s) => s.users);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("scan")} onBack={pop} />
      </GlassHeader>
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 240, height: 240, borderRadius: 16, borderWidth: 2, borderColor: colors.accent }} />
        <Text style={{ marginTop: 16, color: colors.paper }}>{t("scanSub")}</Text>
      </View>
      <PendingNote label="Caméra / décodeur QR natif — Phase 2" />
      {__DEV__ ? (
        <View style={{ padding: 16 }}>
          <SearchField value={q} onChangeText={setQ} placeholder="@username" />
          <Btn
            label="Ouvrir le profil"
            onPress={() => {
              const u = Object.values(users).find((x) => x.username === q.replace(/^@/, "").toLowerCase());
              if (u) push({ name: "found-profile", userId: u.id, via: "qr" });
            }}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}
    </ScreenRoot>
  );
}

export function SearchUserScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const users = useWippStore((s) => s.users);
  const [q, setQ] = useState("");
  const needle = q.replace(/^@/, "").toLowerCase();
  const localHits = Object.values(users).filter((u) => needle.length >= 2 && (u.username.includes(needle) || u.displayName.toLowerCase().includes(needle)));
  useEffect(() => {
    if (needle.length < 2) return;
    const tmr = setTimeout(() => {
      void import("../lib/messaging/client").then(async ({ searchUsers }) => {
        try {
          const found = await searchUsers(needle);
          useWippStore.setState((s) => {
            const next = { ...s.users };
            const keys = { ...s.peerPublicKeys };
            for (const p of found) {
              const id = `srvuser:${p.id}`;
              next[id] = {
                id,
                username: p.username,
                firstName: p.displayName.split(" ")[0] ?? p.displayName,
                lastName: p.displayName.split(" ").slice(1).join(" ") || "",
                displayName: p.displayName,
                avatar: p.avatarUrl || "",
                bio: p.bio || "",
                online: true,
                connected: true,
                city: "",
              };
              if (p.e2ePublicJwk) {
                keys[id] = p.e2ePublicJwk;
                keys[p.id] = p.e2ePublicJwk;
              }
            }
            return { users: next, peerPublicKeys: keys };
          });
        } catch {
          /* offline */
        }
      });
    }, 280);
    return () => clearTimeout(tmr);
  }, [needle]);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("searchCard")} onBack={pop} />
      </GlassHeader>
      <View style={{ paddingHorizontal: 16 }}>
        <SearchField value={q} onChangeText={setQ} placeholder="@username" />
      </View>
      <ScrollView>
        {localHits.map((u) => (
          <Press key={u.id} onPress={() => push({ name: "found-profile", userId: u.id, via: "username" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
            <Avatar user={u} size={48} />
            <View>
              <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{u.displayName}</Text>
              <Text style={{ color: colors.muted }}>@{u.username}</Text>
            </View>
          </Press>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function NearbyScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const users = useWippStore((s) => s.users);
  const nearby = useWippStore((s) => s.nearby);
  const setNearby = useWippStore((s) => s.setNearby);
  const connectWith = useWippStore((s) => s.connectWith);
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const push = useWippStore((s) => s.push);
  const visible = nearby !== 0;
  const found = visible ? Object.values(users).filter((u) => u.connected).slice(0, 6) : [];
  const modes: { v: NearbyMode; label: string }[] = [
    { v: 15, label: "15 min" },
    { v: 60, label: "60 min" },
    { v: -1, label: "Jusqu’à désactivation" },
    { v: 0, label: "Invisible" },
  ];
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Personnes à proximité" onBack={pop} />
      </GlassHeader>
      <PendingNote label="Découverte locale simulée — BLE natif Phase 2" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>Uniquement avec consentement. Jamais de distance ni de numéro.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {modes.map((m) => (
            <Chip key={String(m.v)} label={m.label} active={nearby === m.v} onPress={() => setNearby(m.v)} />
          ))}
        </View>
        {!visible ? <Empty title="Tu es invisible" body="Choisis une durée pour apparaître." /> : found.map((u) => (
          <View key={u.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Press onPress={() => push({ name: "found-profile", userId: u.id, via: "nearby" })} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar user={u} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{u.displayName}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>@{u.username}</Text>
              </View>
            </Press>
            <Btn
              label={u.connected ? t("message") : "WIPP"}
              onPress={() => {
                if (u.connected) openOrCreateDm(u.id);
                else {
                  connectWith(u.id);
                  push({ name: "found-profile", userId: u.id, via: "nearby" });
                }
              }}
              style={{ height: 36, paddingHorizontal: 12 }}
            />
          </View>
        ))}
      </ScrollView>
    </ScreenRoot>
  );
}

export function FoundProfileScreen({ userId, via }: { userId: string; via?: FoundVia }) {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const user = useWippStore((s) => s.users[userId]);
  const sent = useWippStore((s) => s.sentRequestIds.includes(userId));
  const connectWith = useWippStore((s) => s.connectWith);
  const openOrCreateDm = useWippStore((s) => s.openOrCreateDm);
  const src = wippSrc(user?.avatar);
  const viaLabel =
    via === "code"
      ? t("foundViaCode")
      : via === "qr"
        ? t("foundViaQr")
        : via === "intro"
          ? t("foundViaIntro")
          : via === "nearby"
            ? t("foundViaNearby")
            : via === "touch"
              ? t("foundViaTouch")
              : null;
  if (!user) {
    return (
      <ScreenRoot>
        <GlassHeader>
          <Header title="" onBack={pop} />
        </GlassHeader>
        <Empty title="Profil introuvable" />
      </ScreenRoot>
    );
  }
  const connected = user.connected;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("foundTitle")} onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ alignItems: "center", padding: 24 }}>
        {src ? <Image source={src} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <Avatar user={user} size={96} />}
        <Text style={{ marginTop: 12, fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{user.displayName}</Text>
        <Text style={{ color: colors.muted }}>@{user.username}</Text>
        {viaLabel ? <Text style={{ marginTop: 8, fontSize: 12, color: colors.accent }}>{viaLabel}</Text> : null}
        <Text style={{ marginTop: 12, textAlign: "center", color: colors.muted }}>{user.bio}</Text>
        <View style={{ width: "100%", marginTop: 24, gap: 8 }}>
          <Btn
            disabled={sent && !connected}
            label={connected ? t("message") : sent ? t("requestSent") : t("connectWith")}
            onPress={() => (connected ? openOrCreateDm(user.id) : connectWith(user.id))}
          />
          {!connected ? <Btn label={t("message")} variant="secondary" onPress={() => openOrCreateDm(user.id, true)} /> : null}
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

export function WgoTouchScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const me = useWippStore((s) => s.me);
  const [phase, setPhase] = useState<"idle" | "reaching" | "waiting">("idle");
  useEffect(() => {
    if (phase !== "reaching") return;
    const id = setTimeout(() => setPhase("waiting"), 1200);
    return () => clearTimeout(id);
  }, [phase]);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("wgoTouch")} onBack={pop} />
      </GlassHeader>
      <PendingNote label="BLE / NFC / choc — Phase 2. UI simulée comme le web." />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <TouchHero width={140} height={110} />
        <Text style={{ marginTop: 16, fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{t("wgoTouch")}</Text>
        <Text style={{ marginTop: 6, textAlign: "center", color: colors.muted }}>{t("wgoTouchSub")}</Text>
        <View style={{ marginTop: 24, flexDirection: "row", gap: 24 }}>
          <Avatar user={me} size={56} />
          <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.accent }}>?</Text>
          </View>
        </View>
        <View style={{ width: "100%", marginTop: 28, gap: 8 }}>
          <Btn label={phase === "idle" ? "Rapprocher les téléphones" : "En recherche…"} onPress={() => setPhase("reaching")} />
          <Btn label={t("scan")} variant="secondary" onPress={() => push({ name: "scanner" })} />
          <Btn label={t("myQr")} variant="secondary" onPress={() => push({ name: "my-qr" })} />
        </View>
      </View>
    </ScreenRoot>
  );
}

export function TouchIncomingScreen() {
  const pop = useWippStore((s) => s.pop);
  const users = useWippStore((s) => s.users);
  const demo = Object.values(users)[0];
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="WIPP Touch" onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 24, alignItems: "center" }}>
        <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 4, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>Démo</Text>
        </View>
        <Avatar user={demo} size={72} />
        <Text style={{ marginTop: 12, fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{demo?.displayName}</Text>
        <Text style={{ color: colors.muted }}>souhaite se connecter</Text>
        <View style={{ width: "100%", marginTop: 24, gap: 8 }}>
          <Btn label="Accepter" onPress={() => { if (demo) useWippStore.getState().openOrCreateDm(demo.id); }} />
          <Btn label="Refuser" variant="secondary" onPress={pop} />
        </View>
      </View>
    </ScreenRoot>
  );
}

export function QrProfileScreen({ handoffKey }: { handoffKey: string }) {
  const usersById = useWippStore((s) => s.users);
  const users = Object.values(usersById);
  const u = users.find((x) => x.username === handoffKey) ?? users[0];
  return <FoundProfileScreen userId={u?.id ?? "maya"} via="qr" />;
}

export function QrGroupScreen({ handoffKey }: { handoffKey: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Groupe" onBack={pop} />
      </GlassHeader>
      <PendingNote label={`Invitation ${handoffKey}`} />
      <Btn label="Ouvrir l’invitation" onPress={() => push({ name: "group-invite", token: handoffKey })} style={{ margin: 16 }} />
    </ScreenRoot>
  );
}
