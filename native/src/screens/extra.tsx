import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Check, Clock, Delete, Eye, MoreHorizontal, Smile, Users } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { WippSticker } from "../components/WippSticker";
import { QrCard } from "../components/QrCard";
import { Btn, Chip, GlassHeader, Header, PendingNote, Press, ScreenRoot } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { formatClock } from "../lib/format";
import { isStoryLive } from "../lib/types";
import { tempQr } from "../lib/qr-payload";
import { issueTemp } from "../lib/qr-remote";
import { popProtect, pushProtect } from "../lib/screen-protection";
import { orderedOtherStoryUsers } from "../lib/story-status";
import { QUICK_WIPPMOJI_IDS, isStoryWippmoji, storyWippmojis } from "../lib/story-reply";
import { stickerById } from "../lib/stickers";
import { useT, useWippStore } from "../lib/store";
import { colors } from "../theme";

export { NewStoryScreen } from "./story-composer";

function replyFailure(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (/bloqu|écrire|indisponible|introuvable/i.test(message)) return message;
  return "Message impossible.";
}

export function StoriesScreen({ userId }: { userId: string }) {
  const pop = useWippStore((s) => s.pop);
  const serverConnected = useWippStore((s) => s.serverConnected);
  const blockedIds = useWippStore((s) => s.blockedIds);
  const users = useWippStore((s) => s.users);
  const me = useWippStore((s) => s.me);
  const allStories = useWippStore((s) => s.stories);
  const playbackOrder = useRef<string[] | null>(null);
  const groups = useMemo(() => {
    const live = allStories.filter((story) => isStoryLive(story) && (!serverConnected || story.id.startsWith("sty_")) && (story.userId === "me" || !blockedIds.includes(story.userId)));
    if (!playbackOrder.current && live.length) {
      const ids = orderedOtherStoryUsers(live);
      if (live.some((story) => story.userId === "me")) ids.unshift("me");
      playbackOrder.current = ids;
    }
    const ids = playbackOrder.current ?? [];
    return ids
      .map((id) => ({
        id,
        items: live.filter((story) => story.userId === id).sort((a, b) => a.createdAt - b.createdAt),
      }))
      .filter((group) => group.items.length > 0);
  }, [allStories, serverConnected, blockedIds]);
  const startAt = Math.max(0, groups.findIndex((group) => group.id === userId));
  const [cursor, setCursor] = useState({ u: startAt, i: 0 });
  const [ratio, setRatio] = useState(0);
  const [reply, setReply] = useState("");
  const [composing, setComposing] = useState(false);
  const [tray, setTray] = useState<"quick" | "all" | null>(null);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewers, setViewers] = useState<{ displayName: string; username: string; viewedAt: string }[]>([]);
  const [burst, setBurst] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const closed = useRef(false);
  const group = groups[cursor.u];
  const story = group?.items[cursor.i];
  const user = group?.id === "me" ? me : group ? users[group.id] : undefined;
  const hold = composing || tray !== null || viewsOpen;
  const mine = group?.id === "me";

  function closeViewer() {
    if (closed.current) return;
    closed.current = true;
    pop();
  }

  function move(dir: 1 | -1) {
    const currentGroup = groups[cursor.u];
    if (!currentGroup) return;
    const nextItem = cursor.i + dir;
    if (nextItem >= 0 && nextItem < currentGroup.items.length) {
      setCursor({ u: cursor.u, i: nextItem });
      return;
    }
    const nextUser = cursor.u + dir;
    if (nextUser < 0 || nextUser >= groups.length) {
      if (dir > 0) closeViewer();
      return;
    }
    setCursor({ u: nextUser, i: dir > 0 ? 0 : groups[nextUser].items.length - 1 });
  }

  useEffect(() => {
    pushProtect("story");
    return () => popProtect("story");
  }, []);
  const postedViews = useRef(new Set<string>());
  useEffect(() => {
    if (!story || story.viewed || !story.id.startsWith("sty_") || postedViews.current.has(story.id)) return;
    const id = story.id;
    postedViews.current.add(id);
    void import("../lib/lot7/api").then(async ({ forgetViewedStory, markStoryView, rememberViewedStory }) => {
      useWippStore.setState((state) => ({
        stories: state.stories.map((item) => (item.id === id ? { ...item, viewed: true } : item)),
      }));
      try {
        const result = await markStoryView(id);
        if (result === "ok" || result === "owner") {
          if (result === "ok") rememberViewedStory(id);
          return;
        }
      } catch {
        /* The item stays unviewed when the server rejects the view. */
      }
      forgetViewedStory(id);
      useWippStore.setState((state) => ({
        stories: state.stories.map((item) => (item.id === id ? { ...item, viewed: false } : item)),
      }));
    });
  }, [story?.id, story?.viewed]);
  useEffect(() => {
    if (!story?.mediaPath) return;
    const id = story.id;
    let cancel = false;
    void import("../lib/lot7/api").then(async ({ hydrateStoryMedia }) => {
      const current = useWippStore.getState().stories.find((item) => item.id === id);
      if (!current) return;
      try {
        const next = await hydrateStoryMedia(current);
        if (cancel || next.imageUrl === current.imageUrl && next.videoUrl === current.videoUrl) return;
        useWippStore.setState((state) => ({
          stories: state.stories.map((item) => (item.id === id ? next : item)),
        }));
      } catch {
        /* The path stays. The next open tries the signature again. */
      }
    });
    return () => {
      cancel = true;
    };
  }, [story?.id, story?.mediaPath, story?.imageUrl, story?.videoUrl]);
  useEffect(() => {
    if (!groups.length) closeViewer();
  }, [groups.length]);
  useEffect(() => {
    if (!story || story.type === "video" || hold) return;
    setRatio(0);
    const started = Date.now();
    const tick = setInterval(() => setRatio(Math.min(1, (Date.now() - started) / 5000)), 50);
    const timer = setTimeout(() => move(1), 5000);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [story?.id, hold]);
  useEffect(() => {
    setViewsOpen(false);
    setTray(null);
    setComposing(false);
    setReply("");
    if (!story || story.userId !== "me" || !story.id.startsWith("sty_")) {
      setViewers([]);
      return;
    }
    let cancel = false;
    const id = story.id;
    void import("../lib/lot7/api").then(async ({ fetchStoryViewers }) => {
      const rows = await fetchStoryViewers(id);
      if (cancel) return;
      setViewers(rows);
      useWippStore.setState((state) => ({
        stories: state.stories.map((item) => (item.id === id ? { ...item, viewCount: rows.length } : item)),
      }));
    }).catch(() => {
      if (!cancel) setViewers([]);
    });
    return () => {
      cancel = true;
    };
  }, [story?.id, story?.userId]);

  function dismissComposer() {
    Keyboard.dismiss();
    setComposing(false);
    setTray(null);
  }

  function onSide(dir: 1 | -1) {
    if (hold) {
      dismissComposer();
      return;
    }
    move(dir);
  }

  function askDelete() {
    if (!story || !mine) return;
    Alert.alert("Supprimer cette story ?", undefined, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void confirmDelete(story.id) },
    ]);
  }

  async function confirmDelete(id: string) {
    const { deleteServerStory } = await import("../lib/lot7/api");
    const result = await deleteServerStory(id);
    if (result !== "ok") {
      Alert.alert("WIPP", "Suppression impossible.");
      return;
    }
    const mineLeft = (group?.items ?? []).filter((item) => item.id !== id);
    useWippStore.setState((state) => ({ stories: state.stories.filter((item) => item.id !== id) }));
    if (!mineLeft.length) {
      closeViewer();
      return;
    }
    setCursor((current) => ({ u: current.u, i: Math.min(current.i, mineLeft.length - 1) }));
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !story || mine || sending) return;
    setSending(true);
    try {
      const { ensureStoryChat, storyCite } = await import("../lib/story-reply");
      const chatId = await ensureStoryChat(story.userId);
      useWippStore.getState().sendMessage(chatId, { type: "text", text, storyRef: storyCite(story, "reply") });
      setReply("");
      dismissComposer();
    } catch (err) {
      Alert.alert("WIPP", replyFailure(err));
    } finally {
      setSending(false);
    }
  }

  async function sendMoji(id: string) {
    if (!story || mine || sending || !isStoryWippmoji(id)) return;
    const sticker = stickerById(id);
    if (!sticker) return;
    setBurst(id);
    setTimeout(() => setBurst((current) => (current === id ? null : current)), 700);
    setSending(true);
    try {
      const { ensureStoryChat, storyCite } = await import("../lib/story-reply");
      const chatId = await ensureStoryChat(story.userId);
      useWippStore.getState().sendMessage(chatId, {
        type: "sticker",
        text: sticker.labelFr,
        stickerId: sticker.id,
        storyRef: storyCite(story, "reaction"),
      });
      setTray(null);
    } catch (err) {
      setBurst(null);
      Alert.alert("WIPP", replyFailure(err));
    } finally {
      setSending(false);
    }
  }

  if (!story || !group) return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  const src = story.imageUrl?.startsWith("http") ? { uri: story.imageUrl } : wippSrc(story.imageUrl);
  const viewCount = viewers.length || story.viewCount || 0;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.navy }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {story.type === "video" && story.videoUrl ? (
        <StoryPlayback key={story.id} uri={story.videoUrl} paused={hold} onEnd={() => { if (!hold) move(1); }} onProgress={setRatio} />
      ) : null}
      {story.type !== "video" && src ? (
        <Image
          source={src}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          contentFit="contain"
          onError={() => {
            const id = story.id;
            void import("../lib/lot7/api").then(async ({ hydrateStoryMedia }) => {
              const current = useWippStore.getState().stories.find((item) => item.id === id);
              if (!current?.mediaPath) return;
              try {
                const next = await hydrateStoryMedia({ ...current, mediaSignedAt: 0 }, true);
                useWippStore.setState((state) => ({
                  stories: state.stories.map((item) => (item.id === id ? next : item)),
                }));
              } catch {
                /* Keep the story. Signing can be retried on the next open. */
              }
            });
          }}
        />
      ) : null}
      {story.overlay?.text ? <PlacedOverlay overlay={story.overlay} /> : null}
      {story.type !== "text" && story.text ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 24, right: 24, bottom: 108, zIndex: 3 }}>
          <Text style={{ color: "#fff", textAlign: "center", fontFamily: "Inter_500Medium", fontSize: 16, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 }}>
            {story.text}
          </Text>
        </View>
      ) : null}
      {story.type === "text" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: story.bg ?? colors.navy }}>
          <Text style={{ fontSize: 28, color: colors.paper, textAlign: "center", paddingHorizontal: 24 }}>{story.text}</Text>
        </View>
      ) : null}
      <View style={{ position: "absolute", top: 54, left: 12, right: 12, flexDirection: "row", gap: 4, zIndex: 3 }}>
        {group.items.map((item, idx) => (
          <View key={item.id} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" }}>
            <View style={{ width: idx < cursor.i ? "100%" : idx === cursor.i ? `${Math.round(ratio * 100)}%` : "0%", height: "100%", backgroundColor: colors.accent }} />
          </View>
        ))}
      </View>
      <Press onPress={pop} style={{ position: "absolute", top: 64, left: 8, padding: 8, zIndex: 4 }}>
        <Text style={{ color: "#fff", fontSize: 18 }}>✕</Text>
      </Press>
      <View style={{ position: "absolute", top: 70, left: 48, right: 56, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 3 }}>
        <Avatar user={user} size={32} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{user?.displayName}</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>{formatClock(story.createdAt)}</Text>
        </View>
      </View>
      {mine && story.id.startsWith("sty_") ? (
        <Press
          accessibilityLabel="Options de la story"
          onPress={() => {
            Alert.alert("Story", undefined, [
              { text: "Supprimer la story", style: "destructive", onPress: askDelete },
              { text: "Annuler", style: "cancel" },
            ]);
          }}
          style={{ position: "absolute", top: 68, right: 8, padding: 8, zIndex: 4 }}
        >
          <MoreHorizontal size={22} color="#fff" />
        </Press>
      ) : null}
      <Press accessibilityLabel="Story suivante" onPress={() => onSide(1)} style={{ position: "absolute", top: 120, bottom: 120, right: 0, width: "50%", zIndex: 2 }} />
      <Press accessibilityLabel="Story précédente" onPress={() => onSide(-1)} style={{ position: "absolute", top: 120, bottom: 120, left: 0, width: "50%", zIndex: 2 }} />
      {burst ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "38%", alignItems: "center", zIndex: 6 }}>
          <WippSticker id={burst} size={120} />
        </View>
      ) : null}
      <View style={{ position: "absolute", left: 12, right: 12, bottom: 28, zIndex: 5, gap: 8 }}>
        {tray && !mine ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {(tray === "all" ? storyWippmojis() : QUICK_WIPPMOJI_IDS.map((id) => stickerById(id)).filter((item) => item != null)).map((sticker) => (
              <Press key={sticker.id} accessibilityLabel={sticker.labelFr} onPress={() => void sendMoji(sticker.id)} style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
                <WippSticker id={sticker.id} size={44} />
              </Press>
            ))}
            {tray === "quick" ? (
              <Press accessibilityLabel="Plus de Wippmojis" onPress={() => setTray("all")} style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" }}>
                <Text style={{ color: "#fff", fontSize: 12 }}>Plus</Text>
              </Press>
            ) : null}
          </ScrollView>
        ) : null}
        {mine && story.id.startsWith("sty_") ? (
          <Press accessibilityLabel="Vues" onPress={() => setViewsOpen(true)} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Eye size={18} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{viewCount}</Text>
          </Press>
        ) : null}
        {!mine ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              onFocus={() => { setComposing(true); setTray(null); }}
              onBlur={() => setComposing(false)}
              placeholder="Répondre à la story…"
              placeholderTextColor="rgba(255,255,255,0.55)"
              returnKeyType="send"
              onSubmitEditing={() => void sendReply()}
              style={{ flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", color: "#fff", paddingHorizontal: 16 }}
            />
            <Press accessibilityLabel="Wippmoji" onPress={() => { Keyboard.dismiss(); setComposing(false); setTray((current) => (current ? null : "quick")); }} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
              <Smile size={22} color={colors.accent} />
            </Press>
          </View>
        ) : null}
      </View>
      {viewsOpen && mine ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, zIndex: 8, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <Press onPress={() => setViewsOpen(false)} style={{ flex: 1 }} />
          <View style={{ maxHeight: "62%", backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 }}>
            <Text style={{ padding: 16, color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 18 }}>Vues</Text>
            <ScrollView>
              {viewers.length === 0 ? <Text style={{ paddingHorizontal: 16, color: colors.muted }}>Aucune vue</Text> : null}
              {viewers.map((viewer) => (
                <View key={`${viewer.username}-${viewer.viewedAt}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Avatar user={{ displayName: viewer.displayName, firstName: viewer.displayName }} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{viewer.displayName}</Text>
                    {Number.isFinite(Date.parse(viewer.viewedAt)) ? <Text style={{ color: colors.muted, fontSize: 12 }}>{formatClock(Date.parse(viewer.viewedAt))}</Text> : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function PlacedOverlay({ overlay }: { overlay: { text: string; x: number; y: number; scale: number } }) {
  const [canvas, setCanvas] = useState({ w: 1, h: 1 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 3 }} onLayout={(event) => setCanvas({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })}>
      <Text
        onLayout={(event) => setSize({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })}
        style={{
          position: "absolute",
          left: overlay.x * canvas.w - size.w / 2,
          top: overlay.y * canvas.h - size.h / 2,
          maxWidth: canvas.w * 0.8,
          color: "#fff",
          textAlign: "center",
          fontFamily: "Inter_700Bold",
          fontSize: 32,
          transform: [{ scale: overlay.scale }],
          textShadowColor: "rgba(0,0,0,0.7)",
          textShadowRadius: 8,
        }}
      >
        {overlay.text}
      </Text>
    </View>
  );
}

function StoryPlayback({ uri, paused, onEnd, onProgress }: { uri: string; paused: boolean; onEnd: () => void; onProgress: (ratio: number) => void }) {
  const player = useVideoPlayer(uri, (clip) => {
    clip.loop = false;
    clip.timeUpdateEventInterval = 0.1;
    clip.play();
  });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  useEffect(() => {
    const end = player.addListener("playToEnd", onEnd);
    const tick = player.addListener("timeUpdate", ({ currentTime }) => {
      const total = player.duration || 0;
      if (total > 0) onProgress(Math.min(1, currentTime / total));
    });
    return () => {
      end.remove();
      tick.remove();
    };
  }, [player, onEnd, onProgress]);
  return <VideoView player={player} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="contain" nativeControls={false} />;
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
      <View style={{ padding: 16 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Nom du groupe" placeholderTextColor={colors.muted} returnKeyType="done" blurOnSubmit onSubmitEditing={() => Keyboard.dismiss()} style={{ height: 48, borderRadius: 8, backgroundColor: colors.surface2, color: colors.fg, paddingHorizontal: 12 }} />
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
        {chat?.id.startsWith("srv:") && (chat.adminIds ?? []).includes("me") ? (
          <View style={{ paddingHorizontal: 16 }}>
            {chat.participantIds.filter((id) => id !== "me").map((id) => (
              <View key={id} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <Btn label="Admin" onPress={() => void import("../lib/lot7/api").then(({ setGroupAdmin }) => setGroupAdmin(chat.id.slice(4), id, !(chat.adminIds ?? []).includes(id)).then(() => useWippStore.getState().syncServerInbox()))} />
                <Btn label="Retirer" onPress={() => void import("../lib/lot7/api").then(({ removeGroupMember }) => removeGroupMember(chat.id.slice(4), id).then(() => useWippStore.getState().syncServerInbox()))} />
              </View>
            ))}
          </View>
        ) : null}
        <Btn label="QR du groupe" onPress={() => push({ name: "group-qr", chatId })} style={{ margin: 16 }} />
        {chat?.id.startsWith("srv:") ? (
          <Btn
            label="Quitter le groupe"
            onPress={() => {
              void import("../lib/lot7/api").then(async ({ leaveServerGroup }) => {
                await leaveServerGroup(chat.id.slice(4));
                useWippStore.setState((s) => ({ chats: s.chats.filter((c) => c.id !== chat.id) }));
                pop();
              });
            }}
            style={{ marginHorizontal: 16 }}
          />
        ) : null}
      </ScrollView>
    </ScreenRoot>
  );
}

export function GroupQrScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const [token, setToken] = useState(chat?.inviteToken ?? "");
  useEffect(() => {
    if (token || !chatId.startsWith("srv:")) return;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let raw = "";
    for (const b of bytes) raw += String.fromCharCode(b);
    const next = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    void import("../lib/lot7/api").then(async ({ createGroupInvite }) => {
      const status = await createGroupInvite(chatId.slice(4), next);
      if (status === "ok") {
        setToken(next);
        useWippStore.setState((s) => ({
          chats: s.chats.map((c) => (c.id === chatId ? { ...c, inviteToken: next } : c)),
        }));
      }
    }).catch(() => {});
  }, [chatId, token]);
  const value = `https://wippapp.com/g/${token || chat?.inviteToken || ""}`;
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
        <Btn
          label="Rejoindre"
          onPress={() => {
            void import("../lib/lot7/api").then(async ({ joinGroupInvite }) => {
              const res = await joinGroupInvite(token);
              if (res.chat_id) {
                await useWippStore.getState().syncServerInbox();
                push({ name: "conversation", chatId: `srv:${res.chat_id}` });
              }
            });
          }}
          style={{ marginTop: 20, alignSelf: "stretch" }}
        />
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
          {__DEV__ ? <Btn label={t("simulateEntered")} variant="ghost" onPress={() => simulateCodeEntered("ines")} style={{ marginTop: 4, alignSelf: "stretch" }} /> : null}
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
        <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor={colors.muted} returnKeyType="done" blurOnSubmit onSubmitEditing={() => Keyboard.dismiss()} style={{ height: 80, borderRadius: 8, backgroundColor: colors.surface2, color: colors.fg, padding: 12 }} />
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
