import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Mic, MicOff, Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Video, VideoOff } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { Chip, Empty, GlassHeader, Header, PendingNote, Press, ScreenRoot, SearchField, Btn } from "../components/ui";
import { QrCard } from "../components/QrCard";
import { formatChatTime, formatDuration } from "../lib/format";
import { useT, useWippStore } from "../lib/store";
import { profileQr } from "../lib/qr-payload";
import { colors, layout } from "../theme";

export function CallsScreen() {
  const t = useT();
  const lang = useWippStore((s) => s.language);
  const calls = useWippStore((s) => s.calls);
  const users = useWippStore((s) => s.users);
  const push = useWippStore((s) => s.push);
  const markCallsSeen = useWippStore((s) => s.markCallsSeen);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);
  useEffect(() => {
    markCallsSeen();
  }, [markCallsSeen]);
  const needle = q.trim().replace(/^@/, "").toLowerCase();
  const list = (filter === "missed" ? calls.filter((c) => c.missed) : calls).filter((c) => {
    if (!needle) return true;
    const u = users[c.userId];
    return [u?.displayName, u?.username].some((v) => v?.toLowerCase().includes(needle));
  });
  return (
    <ScreenRoot padBottom>
      <GlassHeader>
        <View style={{ height: layout.navBarHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
            {t("callsTitle")}
          </Text>
          <Press onPress={() => push({ name: "call-link" })}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.muted }}>{t("createCallLink")}</Text>
          </Press>
          <Press onPress={() => setPicker(true)} style={{ height: 32, borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Phone size={16} color={colors.accentFg} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.accentFg }}>{t("newCall")}</Text>
          </Press>
        </View>
      </GlassHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 8 }}>
          <SearchField value={q} onChangeText={setQ} placeholder="Nom ou @username" />
        </View>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Chip label={t("all")} active={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label={t("missed")} active={filter === "missed"} onPress={() => setFilter("missed")} />
        </View>
        {list.length === 0 ? <Empty title={t("noResults")} /> : list.map((c) => {
          const u = users[c.userId];
          const Icon = c.missed ? PhoneMissed : c.direction === "in" ? PhoneIncoming : PhoneOutgoing;
          return (
            <Press
              key={c.id}
              onPress={() => push({ name: "active-call", userId: c.userId, kind: c.kind, dir: "out" })}
              style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}
            >
              <Avatar user={u} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: c.missed ? colors.danger : colors.fg }}>{u?.displayName}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon size={14} color={c.missed ? colors.danger : colors.muted} />
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    {c.kind === "video" ? t("videoCall") : t("audioCall")}
                    {c.duration ? ` · ${formatDuration(c.duration)}` : ""}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.muted }}>{formatChatTime(c.at, lang)}</Text>
            </Press>
          );
        })}
      </ScrollView>
      {picker ? (
        <Press onPress={() => setPicker(false)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#121722", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingBottom: 32 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.fg, marginBottom: 12 }}>{t("newCall")}</Text>
            {Object.values(users).filter((u) => u.connected).map((u) => (
              <Press key={u.id} onPress={() => { setPicker(false); push({ name: "active-call", userId: u.id, kind: "audio", dir: "out" }); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
                <Avatar user={u} size={40} />
                <Text style={{ color: colors.fg, fontSize: 15 }}>{u.displayName}</Text>
              </Press>
            ))}
          </View>
        </Press>
      ) : null}
    </ScreenRoot>
  );
}

export function ActiveCallScreen({ userId, kind, dir }: { userId: string; kind: "audio" | "video"; dir?: "in" | "out" }) {
  const pop = useWippStore((s) => s.pop);
  const user = useWippStore((s) => s.users[userId]);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(kind === "audio");
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSec((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "space-between", paddingVertical: 48 }}>
      <View style={{ alignItems: "center" }}>
        <Avatar user={user} size={96} />
        <Text style={{ marginTop: 16, fontSize: 24, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{user?.displayName}</Text>
        <Text style={{ marginTop: 6, color: "rgba(247,249,252,0.6)" }}>
          {kind === "video" ? "Appel vidéo" : "Appel audio"} · {dir === "in" ? "entrant" : "sortant"} · {formatDuration(sec)}
        </Text>
      </View>
      <PendingNote label="Média simulé — LiveKit / CallKit Phase 2" />
      <View style={{ flexDirection: "row", gap: 20, marginBottom: 24 }}>
        <Press onPress={() => setMuted((v) => !v)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          {muted ? <MicOff size={22} color={colors.fg} /> : <Mic size={22} color={colors.fg} />}
        </Press>
        <Press onPress={() => setCamOff((v) => !v)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          {camOff ? <VideoOff size={22} color={colors.fg} /> : <Video size={22} color={colors.fg} />}
        </Press>
        <Press onPress={pop} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" }}>
          <PhoneOff size={22} color="#fff" />
        </Press>
      </View>
    </View>
  );
}

export function CallLinkScreen() {
  const pop = useWippStore((s) => s.pop);
  const me = useWippStore((s) => s.me);
  const value = `${profileQr(me.username)}/call`;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Lien d’appel" onBack={pop} />
      </GlassHeader>
      <PendingNote label="Lien d’appel serveur" />
      <View style={{ alignItems: "center", padding: 24 }}>
        <QrCard value={value} size={200} />
        <Text style={{ marginTop: 16, color: colors.muted, textAlign: "center" }}>{value}</Text>
        <Btn label="Fermer" onPress={pop} style={{ marginTop: 20, alignSelf: "stretch" }} />
      </View>
    </ScreenRoot>
  );
}
