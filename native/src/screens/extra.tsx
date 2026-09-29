import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Check, Clock, Delete, Users } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { QrCard } from "../components/QrCard";
import { Btn, Chip, GlassHeader, Header, PendingNote, Press, ScreenRoot } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { isStoryLive } from "../lib/types";
import { tempQr } from "../lib/qr-payload";
import { issueTemp } from "../lib/qr-remote";
import { useT, useWippStore } from "../lib/store";
import { colors } from "../theme";

export function StoriesScreen({ userId }: { userId: string }) {
  const pop = useWippStore((s) => s.pop);
  const viewStory = useWippStore((s) => s.viewStory);
  const user = useWippStore((s) => (userId === "me" ? s.me : s.users[userId]));
  const allStories = useWippStore((s) => s.stories);
  const stories = allStories.filter((s) => s.userId === userId && isStoryLive(s));
  const [i, setI] = useState(0);
  useEffect(() => {
    viewStory(userId);
  }, [userId, viewStory]);
  const story = stories[i];
  const src = wippSrc(story?.imageUrl);
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {src ? <Image source={src} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" /> : null}
      {story?.type === "text" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: story.bg ?? colors.navy }}>
          <Text style={{ fontSize: 28, color: colors.paper, textAlign: "center", paddingHorizontal: 24 }}>{story.text}</Text>
        </View>
      ) : null}
      <View style={{ position: "absolute", top: 54, left: 12, right: 12, flexDirection: "row", gap: 4 }}>
        {stories.map((_, idx) => (
          <View key={idx} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: idx <= i ? colors.accent : "rgba(255,255,255,0.35)" }} />
        ))}
      </View>
      <Press onPress={pop} style={{ position: "absolute", top: 64, left: 8, padding: 8 }}>
        <Text style={{ color: "#fff", fontSize: 18 }}>✕</Text>
      </Press>
      <View style={{ position: "absolute", top: 70, left: 48, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Avatar user={user} size={32} />
        <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{user?.displayName}</Text>
      </View>
      <Press onPress={() => setI((n) => Math.min(stories.length - 1, n + 1))} style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "50%" }} />
      <Press onPress={() => setI((n) => Math.max(0, n - 1))} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "50%" }} />
    </View>
  );
}

export function NewStoryScreen() {
  const pop = useWippStore((s) => s.pop);
  const [text, setText] = useState("");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Nouvelle story" onBack={pop} />
      </GlassHeader>
      <PendingNote label="Stories locales / seed" />
      <View style={{ padding: 16, gap: 12 }}>
        <TextInput value={text} onChangeText={setText} placeholder="Écris quelque chose…" placeholderTextColor={colors.muted} multiline style={{ minHeight: 120, borderRadius: 12, backgroundColor: colors.surface2, color: colors.fg, padding: 12 }} />
        <Btn label="Publier" onPress={pop} />
      </View>
    </ScreenRoot>
  );
}

export function NewGroupFlow() {
  const pop = useWippStore((s) => s.pop);
  const usersById = useWippStore((s) => s.users);
  const users = Object.values(usersById).filter((u) => u.connected);
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Nouveau groupe" onBack={pop} />
      </GlassHeader>
      <PendingNote label="Groupes encore partiellement locaux / démo" />
      <View style={{ padding: 16 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Nom du groupe" placeholderTextColor={colors.muted} style={{ height: 48, borderRadius: 8, backgroundColor: colors.surface2, color: colors.fg, paddingHorizontal: 12 }} />
      </View>
      <ScrollView>
        {users.map((u) => {
          const on = picked.includes(u.id);
          return (
            <Press key={u.id} onPress={() => setPicked((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Avatar user={u} size={44} />
              <Text style={{ flex: 1, color: colors.fg }}>{u.displayName}</Text>
              {on ? <Check size={18} color={colors.accent} /> : null}
            </Press>
          );
        })}
      </ScrollView>
      <View style={{ padding: 16 }}>
        <Btn label="Créer" onPress={() => useWippStore.getState().createGroup(name, picked)} />
      </View>
    </ScreenRoot>
  );
}

export function GroupInfoFull({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWippStore((s) => s.users);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={chat?.name ?? "Groupe"} onBack={pop} />
      </GlassHeader>
      <ScrollView>
        <Text style={{ padding: 16, color: colors.muted }}>{chat?.description ?? `${chat?.participantIds.length ?? 0} membres`}</Text>
        {chat?.participantIds.map((id) => (
          <Press key={id} onPress={() => id !== "me" && push({ name: "found-profile", userId: id })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
            <Avatar user={id === "me" ? useWippStore.getState().me : users[id]} size={40} />
            <Text style={{ color: colors.fg }}>{id === "me" ? "Toi" : users[id]?.displayName}</Text>
          </Press>
        ))}
        <Btn label="QR du groupe" onPress={() => push({ name: "group-qr", chatId })} style={{ margin: 16 }} />
      </ScrollView>
    </ScreenRoot>
  );
}

export function GroupQrScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const value = `https://wippapp.com/g/${chat?.inviteToken ?? chatId}`;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="QR groupe" onBack={pop} />
      </GlassHeader>
      <View style={{ alignItems: "center", padding: 24 }}>
        <QrCard value={value} size={220} />
        <Text style={{ marginTop: 12, color: colors.muted }}>{chat?.name}</Text>
      </View>
    </ScreenRoot>
  );
}

export function GroupInviteScreen({ token }: { token: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const chat = useWippStore((s) => s.chats.find((c) => c.inviteToken === token || c.id === token));
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Invitation" onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 24, alignItems: "center" }}>
        <Users size={40} color={colors.accent} />
        <Text style={{ marginTop: 12, fontSize: 20, color: colors.fg }}>{chat?.name ?? "Groupe WIPP"}</Text>
        <Btn label="Rejoindre" onPress={() => chat && push({ name: "conversation", chatId: chat.id })} style={{ marginTop: 20, alignSelf: "stretch" }} />
      </View>
    </ScreenRoot>
  );
}

function countdown(expiresAt: number, now: number) {
  const s = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function LiveCodeScreen() {
  const t = useT();
  const pop = useWippStore((s) => s.pop);
  const ensureMyCode = useWippStore((s) => s.ensureMyCode);
  const regenerateMyCode = useWippStore((s) => s.regenerateMyCode);
  const ensurePeerCode = useWippStore((s) => s.ensurePeerCode);
  const redeemCode = useWippStore((s) => s.redeemCode);
  const simulateCodeEntered = useWippStore((s) => s.simulateCodeEntered);
  const setCodeChatTtl = useWippStore((s) => s.setCodeChatTtl);
  const codeChatTtl = useWippStore((s) => s.codeChatTtl);
  const codes = useWippStore((s) => s.codes);
  const [tab, setTab] = useState<"mine" | "enter">("mine");
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    ensureMyCode();
    ensurePeerCode("lea");
  }, [ensureMyCode, ensurePeerCode]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const mine = codes.find((c) => c.ownerId === "me");
  const lea = codes.find((c) => c.ownerId === "lea" && c.expiresAt > now);
  const live = Boolean(mine && mine.expiresAt > now);
  const remain = mine ? countdown(mine.expiresAt, now) : "0:00";

  function redeemDigits(next: string) {
    const res = redeemCode(next);
    if (!res.ok) {
      setError(res.reason === "expired" ? t("codeExpired") : res.reason === "own" ? t("codeOwn") : t("codeNotFound"));
      setDigits("");
    }
  }

  function press(d: string) {
    setError(null);
    setDigits((prev) => {
      const next = (prev + d).slice(0, 6);
      if (next.length === 6) setTimeout(() => redeemDigits(next), 0);
      return next;
    });
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={t("liveCode")} onBack={pop} />
      </GlassHeader>
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Chip label={t("myCode")} active={tab === "mine"} onPress={() => setTab("mine")} />
        <Chip label={t("enterCode")} active={tab === "enter"} onPress={() => setTab("enter")} />
      </View>
      {tab === "mine" ? (
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingHorizontal: 24, paddingBottom: 32 }}>
          <Text style={{ textAlign: "center", fontSize: 13, lineHeight: 20, color: colors.muted }}>{t("codeHint")}</Text>
          <View style={{ marginTop: 20, flexDirection: "row", gap: 8 }}>
            {(mine?.code ?? "------").split("").map((d, i) => (
              <View
                key={i}
                style={{
                  height: 48,
                  width: 36,
                  marginLeft: i === 3 ? 8 : 0,
                  borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: live ? 1 : 0.3,
                }}
              >
                <Text style={{ fontSize: 24, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{live ? d : "·"}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Clock size={16} color={colors.accent} />
            <Text style={{ fontSize: 14, color: colors.accent }}>{live ? `${t("codeExpires")} ${remain}` : t("codeExpired")}</Text>
          </View>
          <Text style={{ marginTop: 20, fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.6, color: "rgba(247,249,252,0.5)", textTransform: "uppercase" }}>
            {t("chatTtl")}
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {(
              [
                [15 * 60_000, "ttl15"],
                [60 * 60_000, "ttl1h"],
                [24 * 60 * 60_000, "ttl24h"],
              ] as const
            ).map(([ms, key]) => (
              <Press
                key={key}
                onPress={() => setCodeChatTtl(ms)}
                style={{
                  height: 36,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                  backgroundColor: codeChatTtl === ms ? colors.accent : "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: codeChatTtl === ms ? colors.accentFg : colors.fg }}>{t(key)}</Text>
              </Press>
            ))}
          </View>
          <Text style={{ marginTop: 12, maxWidth: 280, textAlign: "center", fontSize: 12, lineHeight: 18, color: "rgba(247,249,252,0.5)" }}>{t("codeVsPerm")}</Text>
          <Btn label={t("regenerate")} onPress={() => regenerateMyCode()} style={{ marginTop: 16, alignSelf: "stretch" }} />
          <Btn label={t("simulateEntered")} variant="ghost" onPress={() => simulateCodeEntered("ines")} style={{ marginTop: 4, alignSelf: "stretch" }} />
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={{
                  height: 48,
                  width: 36,
                  marginLeft: i === 3 ? 8 : 0,
                  borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{digits[i] ?? ""}</Text>
              </View>
            ))}
          </View>
          {error ? <Text style={{ marginBottom: 8, textAlign: "center", fontSize: 13, color: colors.danger }}>{error}</Text> : null}
          {lea ? (
            <Press
              onPress={() => {
                setError(null);
                setDigits(lea.code);
                redeemDigits(lea.code);
              }}
              style={{ marginBottom: 12, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <Text style={{ textAlign: "center", fontSize: 13, color: "rgba(247,249,252,0.8)" }}>{t("demoCodeLea")}</Text>
            </Press>
          ) : null}
          <View style={{ marginTop: "auto", paddingBottom: 32, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) =>
              k === "" ? (
                <View key="sp" style={{ width: "31%", height: 56 }} />
              ) : (
                <Press
                  key={k}
                  accessibilityLabel={k === "del" ? t("back") : k}
                  onPress={() => {
                    if (k === "del") {
                      setDigits((d) => d.slice(0, -1));
                      setError(null);
                    } else press(k);
                  }}
                  style={{
                    width: "31%",
                    height: 56,
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {k === "del" ? <Delete size={24} color={colors.fg} /> : <Text style={{ fontSize: 22, fontFamily: "Inter_500Medium", color: colors.fg }}>{k}</Text>}
                </Press>
              ),
            )}
          </View>
        </View>
      )}
    </ScreenRoot>
  );
}

export function OneTimeQrScreen() {
  const pop = useWippStore((s) => s.pop);
  const [temp, setTemp] = useState<{ token: string; expiresAt: number } | null>(null);
  const [expired, setExpired] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  async function issue() {
    setExpired(false);
    try {
      const r = await issueTemp();
      if ("error" in r) setErr(r.error === "no_session" ? "Connecte-toi avec un vrai compte." : "QR temporaire indisponible.");
      else {
        setErr(null);
        setTemp(r);
        setNow(Date.now());
      }
    } catch {
      setErr("QR temporaire indisponible.");
    }
  }
  useEffect(() => {
    void issue();
  }, []);
  useEffect(() => {
    if (!temp) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= temp.expiresAt) {
        setTemp(null);
        setExpired(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [temp]);
  const left = temp ? Math.max(0, Math.ceil((temp.expiresAt - now) / 1000)) : 0;
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="QR unique" onBack={pop} />
      </GlassHeader>
      <View style={{ alignItems: "center", padding: 24 }}>
        {expired ? (
          <>
            <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold" }}>QR expiré</Text>
            <Btn label="Générer un nouveau QR" onPress={() => void issue()} style={{ marginTop: 16, alignSelf: "stretch" }} />
          </>
        ) : temp ? (
          <>
            <QrCard value={tempQr(temp.token)} size={200} />
            <Text style={{ marginTop: 12, color: colors.accent }}>
              Expire dans {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>{err ?? "Génération…"}</Text>
        )}
      </View>
    </ScreenRoot>
  );
}

export function IntroduceScreen({ toUserId }: { toUserId: string }) {
  const pop = useWippStore((s) => s.pop);
  const user = useWippStore((s) => s.users[toUserId]);
  const [note, setNote] = useState("");
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Présenter" onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: colors.fg }}>Présenter {user?.displayName}</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor={colors.muted} style={{ height: 80, borderRadius: 8, backgroundColor: colors.surface2, color: colors.fg, padding: 12 }} />
        <Btn label="Envoyer" onPress={pop} />
      </View>
    </ScreenRoot>
  );
}

export function IntroDetailScreen({ introId }: { introId: string }) {
  const pop = useWippStore((s) => s.pop);
  const intro = useWippStore((s) => s.intros.find((i) => i.id === introId));
  const from = useWippStore((s) => (intro ? s.users[intro.introducerId] : undefined));
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Présentation" onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.fg }}>{intro?.note}</Text>
        <Text style={{ marginTop: 8, color: colors.muted }}>Par {from?.displayName}</Text>
        <Btn label="Accepter" onPress={pop} style={{ marginTop: 20 }} />
      </View>
    </ScreenRoot>
  );
}
