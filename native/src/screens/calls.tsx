import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Mic, MicOff, Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Video, VideoOff } from "lucide-react-native";
import { Avatar, GroupAvatar } from "../components/Avatar";
import { Chip, Empty, GlassHeader, Header, Press, ScreenRoot, SearchField, Btn } from "../components/ui";
import { QrCard } from "../components/QrCard";
import { asEpochMs, formatChatTime, formatDuration } from "../lib/format";
import { useT, useWippStore } from "../lib/store";
import { profileQr } from "../lib/qr-payload";
import { colors, layout } from "../theme";

export function CallsScreen() {
  const t = useT();
  const lang = useWippStore((s) => s.language);
  const serverConnected = useWippStore((s) => (s.serverConnected || Boolean(s.serverProfileId)));
  const allCalls = useWippStore((s) => s.calls);
  const calls = useMemo(
    () => (serverConnected ? allCalls.filter((c) => c.id.startsWith("call_") || c.id.startsWith("gcall_") || c.id.startsWith("srvcall:")) : allCalls),
    [serverConnected, allCalls],
  );
  const users = useWippStore((s) => s.users);
  const push = useWippStore((s) => s.push);
  const markCallsSeen = useWippStore((s) => s.markCallsSeen);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const chats = useWippStore((s) => s.chats);
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);
  useEffect(() => {
    markCallsSeen();
  }, [markCallsSeen]);
  useEffect(() => {
    if (!serverConnected) return;
    void import("../lib/proximity/wipp-session").then(async ({ wippApi }) => {
      try {
        const data = await wippApi<{
          calls: {
            id: string;
            peerId: string;
            direction: "in" | "out";
            kind: "audio" | "video";
            missed: boolean;
            declined?: boolean;
            status?: string;
            at: string | number;
            duration?: number | string | null;
            group?: boolean;
            chatId?: string | null;
            peerName?: string | null;
            peerUsername?: string | null;
            peerAvatar?: string | null;
          }[];
        }>("calls/history");
        useWippStore.setState({
          calls: (data.calls ?? []).map((c) => ({
            id: c.id.startsWith("call_") || c.id.startsWith("gcall_") ? c.id : `srvcall:${c.id}`,
            userId: c.group && c.chatId ? `srv:${c.chatId}` : `srvuser:${c.peerId}`,
            kind: c.kind,
            direction: c.direction,
            // Like WhatsApp: an incoming call I refused also counts as « manqué ».
            missed: Boolean(c.missed || (c.direction === "in" && c.declined)),
            at: asEpochMs(c.at) ?? Date.now(),
            duration: Number.isFinite(Number(c.duration)) ? Number(c.duration) : undefined,
            group: c.group,
            chatId: c.chatId ?? undefined,
            outcome: c.declined ? "declined" as const : c.status === "busy" ? "busy" as const : c.missed ? "noAnswer" as const : undefined,
            peer: { name: c.peerName ?? undefined, username: c.peerUsername ?? undefined, avatar: c.peerAvatar ?? undefined },
          })),
        });
      } catch {
        /* history stays empty until the call API is deployed */
      }
    });
  }, [serverConnected]);
  const needle = q.trim().replace(/^@/, "").toLowerCase();
  const list = (filter === "missed" ? calls.filter((c) => c.missed) : calls).filter((c) => {
    if (!needle) return true;
    const u = users[c.userId];
    return [u?.displayName, u?.username, c.peer?.name, c.peer?.username].some((v) => v?.toLowerCase().includes(needle));
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
          const groupChat = c.group ? chats.find((x) => x.id === c.userId) : undefined;
          const name = c.group
            ? groupChat?.name || c.peer?.name || "Groupe"
            : u?.displayName || c.peer?.name || (c.peer?.username ? `@${c.peer.username}` : "WIPP");
          const face = u ?? { displayName: name, avatar: c.peer?.avatar };
          const Icon = c.missed ? PhoneMissed : c.direction === "in" ? PhoneIncoming : PhoneOutgoing;
          return (
            <Press
              key={c.id}
              onPress={() => push({ name: "active-call", userId: c.userId, kind: c.kind, dir: "out", group: c.group, chatId: c.chatId })}
              style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}
            >
              {c.group ? <GroupAvatar name={name} size={48} fallback={groupChat?.avatar ?? c.peer?.avatar} /> : <Avatar user={face} size={48} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: c.missed ? colors.danger : colors.fg }}>{name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon size={14} color={c.missed ? colors.danger : colors.muted} />
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    {c.group ? "Groupe · " : ""}
                    {c.outcome === "declined" ? "Refusé · " : c.missed ? "Manqué · " : ""}
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
          <View style={{ backgroundColor: colors.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingBottom: 32 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.fg, marginBottom: 12 }}>{t("newCall")}</Text>
            {Object.values(users).filter((u) => u?.connected).map((u) => (
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

export function ActiveCallScreen({
  userId,
  kind,
  dir,
  callId,
  chatId,
  group,
}: {
  userId: string;
  kind: "audio" | "video";
  dir?: "in" | "out";
  callId?: string;
  chatId?: string;
  group?: boolean;
}) {
  useEffect(() => {
    void import("../lib/calls/session").then(({ openCall }) => openCall({ userId, kind, dir, callId, chatId, group }));
  }, [userId, kind, dir, callId, chatId, group]);
  return <View style={{ flex: 1, backgroundColor: colors.navy }} />;
}

const LINK_HOURS: { h: number; label: string }[] = [
  { h: 1, label: "1 heure" },
  { h: 24, label: "24 heures" },
  { h: 168, label: "7 jours" },
];

function untilLabel(ms: number) {
  const left = Math.max(0, ms - Date.now());
  const h = Math.round(left / 3_600_000);
  if (h < 1) return "moins d’une heure";
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} jours`;
}

/** Créer un lien d’appel : audio / vidéo, durée, puis partager ; liste des liens actifs (annulables). */
export function CallLinkScreen() {
  const pop = useWippStore((s) => s.pop);
  const [kind, setKind] = useState<"audio" | "video">("audio");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ token: string; url: string; kind: "audio" | "video"; expiresAt: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<import("../lib/calls/livekit-client").CallLink[]>([]);

  const refresh = () =>
    void import("../lib/calls/livekit-client")
      .then(({ listCallLinks }) => listCallLinks())
      .then((r) => setLinks(r.links))
      .catch(() => undefined);
  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const { createCallLink } = await import("../lib/calls/livekit-client");
      const { link } = await createCallLink(kind, hours);
      setCreated(link);
      setCopied(false);
      refresh();
    } catch (err) {
      Alert.alert("Lien d’appel", err instanceof Error ? err.message : "Impossible de créer le lien.");
    } finally {
      setBusy(false);
    }
  };

  const chip = (on: boolean, label: string, onPress: () => void) => (
    <Press key={label} onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? colors.accent : colors.surface2, borderWidth: 1, borderColor: on ? colors.accent : colors.hair }}>
      <Text style={{ color: on ? colors.accentFg : colors.fg, fontSize: 13, fontFamily: on ? "Inter_600SemiBold" : undefined }}>{label}</Text>
    </Press>
  );

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Lien d’appel" onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {created ? (
          <View style={{ alignItems: "center" }}>
            <QrCard value={created.url} size={200} />
            <Text selectable style={{ marginTop: 14, color: colors.fg, fontSize: 13, textAlign: "center" }}>{created.url}</Text>
            <Text style={{ marginTop: 4, color: colors.muted, fontSize: 12 }}>
              {created.kind === "video" ? "Appel vidéo" : "Appel audio"} · expire dans {untilLabel(created.expiresAt)}
            </Text>
            <View style={{ alignSelf: "stretch", gap: 10, marginTop: 18 }}>
              <Btn
                label={copied ? "Lien copié ✓" : "Copier le lien"}
                onPress={() => void import("expo-clipboard").then((C) => C.setStringAsync(created.url)).then(() => setCopied(true))}
              />
              <Btn
                label="Partager le lien"
                variant="secondary"
                onPress={() => void import("../lib/share-public").then(({ shareWippPublic }) => shareWippPublic(`Rejoins mon appel WIPP : ${created.url}`))}
              />
              <Btn
                label="Rejoindre l’appel maintenant"
                variant="secondary"
                onPress={() => {
                  void import("../lib/calls/session").then(({ joinCallByLink }) => joinCallByLink(created.token, "Lien d’appel"));
                }}
              />
              <Btn label="Créer un autre lien" variant="ghost" onPress={() => setCreated(null)} />
            </View>
          </View>
        ) : (
          <View>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
              Partage ce lien : toute personne qui a WIPP peut rejoindre l’appel. Plusieurs personnes peuvent le rejoindre en même temps.
            </Text>
            <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>Type d’appel</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
              {chip(kind === "audio", "Audio", () => setKind("audio"))}
              {chip(kind === "video", "Vidéo", () => setKind("video"))}
            </View>
            <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>Le lien expire après</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 22 }}>{LINK_HOURS.map((o) => chip(hours === o.h, o.label, () => setHours(o.h)))}</View>
            <Btn label={busy ? "Création…" : "Créer le lien"} disabled={busy} onPress={() => void create()} />
          </View>
        )}

        {links.length ? (
          <View style={{ marginTop: 28 }}>
            <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>Mes liens actifs</Text>
            {links.map((l) => (
              <View key={l.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
                {l.kind === "video" ? <Video size={18} color={colors.accent} /> : <Phone size={18} color={colors.accent} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontSize: 14 }}>{l.kind === "video" ? "Appel vidéo" : "Appel audio"}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Expire dans {untilLabel(l.expiresAt)}
                    {l.participants ? ` · ${l.participants} dans l’appel` : ""}
                  </Text>
                </View>
                <Press
                  onPress={async () => {
                                  Alert.alert("Annuler le lien", "Le lien ne fonctionnera plus et l’appel en cours sera terminé.", [
                      { text: "Garder", style: "cancel" },
                      {
                        text: "Annuler le lien",
                        style: "destructive",
                        onPress: () =>
                          void import("../lib/calls/livekit-client")
                            .then(({ revokeCallLink }) => revokeCallLink(l.id))
                            .then(refresh)
                            .catch(() => undefined),
                      },
                    ]);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.danger }}
                >
                  <Text style={{ color: colors.danger, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Annuler</Text>
                </Press>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenRoot>
  );
}

/** Opened from a wippapp.com/c/<code> link: who is calling, then « Rejoindre l’appel ». */
export function CallJoinScreen({ token }: { token: string }) {
  const pop = useWippStore((s) => s.pop);
  const [peek, setPeek] = useState<import("../lib/calls/livekit-client").CallLinkPeek | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void import("../lib/calls/livekit-client")
      .then(({ peekCallLink }) => peekCallLink(token))
      .then(setPeek)
      .catch(() => setError("Impossible de vérifier le lien."));
  }, [token]);
  const ok = peek?.status === "ok" ? peek : null;
  const name = ok?.owner?.displayName || (ok?.owner?.username ? `@${ok.owner.username}` : "WIPP");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Lien d’appel" onBack={pop} />
      </GlassHeader>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
        {!peek && !error ? <Text style={{ color: colors.muted }}>Vérification du lien…</Text> : null}
        {ok ? (
          <>
            <Avatar user={{ displayName: name, avatar: ok.owner?.avatarUrl ?? undefined }} size={96} />
            <Text style={{ marginTop: 16, color: colors.fg, fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
              {ok.kind === "video" ? "Appel vidéo" : "Appel audio"} de {name}
            </Text>
            {ok.owner?.username ? <Text style={{ marginTop: 2, color: colors.muted }}>@{ok.owner.username}</Text> : null}
            <Text style={{ marginTop: 10, color: colors.muted, fontSize: 13 }}>
              {ok.participants ? `${ok.participants} personne${ok.participants > 1 ? "s" : ""} dans l’appel` : "Personne n’est encore dans l’appel"}
            </Text>
            <View style={{ alignSelf: "stretch", marginTop: 24 }}>
              <Btn
                label={busy ? "Connexion…" : "Rejoindre l’appel"}
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  void import("../lib/calls/session")
                    .then(({ joinCallByLink }) => joinCallByLink(token, `Appel de ${name}`))
                    .then(() => pop())
                    .catch((err) => {
                      setBusy(false);
                      setError(err instanceof Error ? err.message : "Impossible de rejoindre l’appel.");
                    });
                }}
              />
            </View>
          </>
        ) : null}
        {peek && peek.status !== "ok" ? (
          <Text style={{ color: colors.danger, textAlign: "center" }}>
            {peek.status === "expired" ? "Ce lien d’appel a expiré." : peek.status === "revoked" ? "Ce lien d’appel a été annulé." : "Lien d’appel invalide."}
          </Text>
        ) : null}
        {error ? <Text style={{ marginTop: 12, color: colors.danger, textAlign: "center" }}>{error}</Text> : null}
      </View>
    </ScreenRoot>
  );
}
