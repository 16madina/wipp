import { StoryLayersView } from "../components/StoryLayers";
import { layersOf, type StoryOverlay } from "../lib/story-overlay";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Camera, Check, ChevronRight, Clock, Delete, Eye, LayoutGrid, MoreHorizontal, Pencil, Search, Smile, Users, X } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { WippSticker } from "../components/WippSticker";
import { QrCard } from "../components/QrCard";
import { Btn, Chip, GlassHeader, Header, PendingNote, Press, ScreenRoot } from "../components/ui";
import { wippSrc } from "../lib/assets";
import { formatClock } from "../lib/format";
import { isStoryLive } from "../lib/types";
import { tempQr } from "../lib/qr-payload";
import { GROUP_FR, issueTemp } from "../lib/qr-remote";
import { popProtect, pushProtect } from "../lib/screen-protection";
import { hideStoryLocal, isStoryHidden } from "../lib/story-hide";
import { orderedOtherStoryUsers } from "../lib/story-status";
import { REPORT_REASONS, submitContentReport } from "../lib/safety";
import { QUICK_WIPPMOJI_IDS, isStoryWippmoji, storyWippmojis } from "../lib/story-reply";
import { stickerById } from "../lib/stickers";
import { useT, useWippStore } from "../lib/store";
import { colors, fgA, palettes, whiteA } from "../theme";
import { errorText } from "../lib/error-fr";
import { shareWippPublic } from "../lib/share-public";
import { GROUP_DISAPPEAR, GroupPermissionsEditor, GroupVisibilityPicker } from "../components/GroupPermissions";
import { Sheet } from "../components/card-editor-parts";
import { DEFAULT_GROUP_SETTINGS, type GroupSettings } from "../lib/types";

export { NewStoryScreen } from "./story-composer";

function replyFailure(err: unknown) {
  const message = errorText(err, "");
  if (/bloqu|écrire|indisponible|introuvable/i.test(message)) return message;
  return "Message impossible.";
}

export function StoriesScreen({ userId }: { userId: string }) {
  // Lecteur de stories : toujours sombre (texte sur photo / vidéo).
  const colors = palettes.dark;
  const pop = useWippStore((s) => s.pop);
  const serverConnected = useWippStore((s) => (s.serverConnected || Boolean(s.serverProfileId)));
  const blockedIds = useWippStore((s) => s.blockedIds);
  const users = useWippStore((s) => s.users);
  const me = useWippStore((s) => s.me);
  const allStories = useWippStore((s) => s.stories);
  const playbackOrder = useRef<string[] | null>(null);
  const groups = useMemo(() => {
    const live = allStories.filter((story) => isStoryLive(story) && !isStoryHidden(story.id) && (!serverConnected || story.id.startsWith("sty_")) && (story.userId === "me" || !blockedIds.includes(story.userId)));
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
  // Image stories wait for their picture before the 5 s timer starts.
  const [loadedId, setLoadedId] = useState<string | null>(null);
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
    const needsImage = story.type !== "text" && Boolean(story.imageUrl || story.mediaPath);
    if (needsImage && loadedId !== story.id) {
      // Never stay stuck on a picture that fails to load: start anyway after 8 s.
      const id = story.id;
      const fallback = setTimeout(() => setLoadedId(id), 8000);
      return () => clearTimeout(fallback);
    }
    const started = Date.now();
    const tick = setInterval(() => setRatio(Math.min(1, (Date.now() - started) / 5000)), 50);
    const timer = setTimeout(() => move(1), 5000);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [story?.id, hold, loadedId]);
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
          key={story.id}
          source={src}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          contentFit="contain"
          onLoad={() => setLoadedId(story.id)}
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
      {story.overlay ? <PlacedOverlay overlay={story.overlay} /> : null}
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
      {story.id.startsWith("sty_") ? (
        <Press
          accessibilityLabel="Options de la story"
          onPress={() => {
            if (mine) {
              Alert.alert("Story", undefined, [
                { text: "Supprimer la story", style: "destructive", onPress: askDelete },
                { text: "Annuler", style: "cancel" },
              ]);
              return;
            }
            Alert.alert("Story", undefined, [
              {
                text: "Signaler la story",
                onPress: () => {
                  Alert.alert("Signaler la story", undefined, [
                    ...REPORT_REASONS.map((reason) => ({
                      text: reason,
                      onPress: () => {
                        // The reported story disappears for me right away, even before the server answers.
                        hideStoryLocal(story.id);
                        move(1);
                        void submitContentReport({
                          contentType: "story" as const,
                          contentId: story.id,
                          targetProfileId: group.id,
                          reason,
                        }).then(
                          () =>
                            Alert.alert("Signalement envoyé", "Merci. L’équipe WIPP va l’examiner. Cette story ne s’affichera plus pour toi.\n\nVeux-tu aussi bloquer cette personne ?", [
                              { text: "Non", style: "cancel" },
                              {
                                text: "Bloquer",
                                style: "destructive",
                                onPress: () => {
                                  useWippStore.getState().blockUser(group.id);
                                  closeViewer();
                                },
                              },
                            ]),
                          (err) => Alert.alert("Signalement", errorText(err, "Signalement impossible.")),
                        );
                      },
                    })),
                    { text: "Annuler", style: "cancel" as const },
                  ]);
                },
              },
              {
                text: "Masquer cette story",
                onPress: () => {
                  hideStoryLocal(story.id);
                  move(1);
                },
              },
              {
                text: "Bloquer cet utilisateur",
                style: "destructive" as const,
                onPress: () => {
                  Alert.alert("Bloquer", "Bloquer cet utilisateur ?", [
                    { text: "Annuler", style: "cancel" },
                    {
                      text: "Bloquer",
                      style: "destructive",
                      onPress: () => {
                        useWippStore.getState().blockUser(group.id);
                        closeViewer();
                      },
                    },
                  ]);
                },
              },
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
                <WippSticker id={sticker.id} size={44} still />
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

/** Texts and stickers placed on the story (old stories: one white text). */
function PlacedOverlay({ overlay }: { overlay: StoryOverlay }) {
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 3 }} onLayout={(event) => setCanvas({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })}>
      <StoryLayersView layers={layersOf(overlay)} canvas={canvas} />
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

const GROUP_STEPS = ["Infos", "Membres", "Autorisations", "Terminé"];
const GROUP_CATEGORIES = ["Famille", "Amis", "Travail", "École / Études", "Quartier", "Sport", "Association", "Business", "Loisirs", "Autre"];

function GroupStepper({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
      {GROUP_STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <View key={label} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? "transparent" : i <= step ? colors.accent : colors.hair }} />
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done || current ? colors.accent : colors.surface2,
                  borderWidth: 1,
                  borderColor: done || current ? colors.accent : colors.hair,
                }}
              >
                {done ? <Check size={16} color={colors.accentFg} strokeWidth={3} /> : <Text style={{ color: current ? colors.accentFg : colors.muted, fontFamily: "Inter_700Bold" }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === GROUP_STEPS.length - 1 ? "transparent" : i < step ? colors.accent : colors.hair }} />
            </View>
            <Text style={{ marginTop: 6, fontSize: 11, color: current ? colors.fg : colors.muted, fontFamily: current ? "Inter_600SemiBold" : undefined }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Créer un groupe — 4 steps: Infos (photo, name, description, category, visibility), Members, Permissions, Done. */
export function NewGroupFlow() {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const usersById = useWippStore((s) => s.users);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; mime?: string } | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [settings, setSettings] = useState<GroupSettings>({ ...DEFAULT_GROUP_SETTINGS });
  const [disappearMs, setDisappearMs] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const contacts = Object.values(usersById)
    .filter((u) => u?.connected && u.id.startsWith("srvuser:"))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const shown = contacts.filter((u) => {
    const n = q.trim().toLowerCase();
    return !n || u.displayName.toLowerCase().includes(n) || u.username.toLowerCase().includes(n);
  });

  async function pickPhoto() {
    try {
      const ImagePicker = await import("expo-image-picker");
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      const asset = res.canceled ? null : res.assets?.[0];
      if (asset?.uri) setPhoto({ uri: asset.uri, mime: asset.mimeType ?? undefined });
    } catch {
      Alert.alert("Photo du groupe", "Impossible d’ouvrir tes photos.");
    }
  }

  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true);
    let id: string | null = null;
    try {
      const api = await import("../lib/lot7/api");
      id = await api.createServerGroup(name.trim(), picked);
      const localId = id.startsWith("srv:") ? id : `srv:${id}`;
      try {
        const avatar = photo ? await api.uploadGroupPhoto(id, photo.uri, photo.mime || "image/jpeg") : null;
        if (avatar || description.trim()) await api.updateGroupInfo(id, { description: description.trim() || null, avatar }, { quiet: true });
        await api.setGroupSettings(id, { ...settings, disappearMs }, { quiet: true });
      } catch {
        Alert.alert("Groupe", "Le groupe est créé, mais une partie des réglages n’a pas pu être enregistrée. Tu peux les reprendre dans Infos du groupe.");
      }
      await useWippStore.getState().syncServerInbox();
      setCreated(localId);
      setStep(3);
    } catch (err) {
      Alert.alert("Groupe", errorText(err, "Création impossible pour le moment."));
    } finally {
      setBusy(false);
    }
  }

  const back = () => (step === 0 || step === 3 ? pop() : setStep(step - 1));
  const counter = (n: number, max: number) => <Text style={{ alignSelf: "flex-end", marginTop: 4, fontSize: 11, color: colors.muted }}>{n}/{max}</Text>;
  const label = (text: string, optional?: boolean) => (
    <Text style={{ marginTop: 18, marginBottom: 8, color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
      {text}
      {optional ? <Text style={{ color: colors.muted, fontFamily: "Inter_400Regular" }}> (optionnelle)</Text> : null}
    </Text>
  );
  const field = { borderRadius: 14, backgroundColor: colors.surface2, color: colors.fg, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, borderColor: colors.hair } as const;

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Créer un groupe" onBack={back} />
        <GroupStepper step={step} />
      </GlassHeader>

      {step === 0 ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Press
            accessibilityLabel={photo ? "Changer la photo du groupe" : "Ajouter une photo de groupe"}
            onPress={() =>
              photo
                ? Alert.alert("Photo du groupe", undefined, [
                    { text: "Changer la photo", onPress: () => void pickPhoto() },
                    { text: "Retirer la photo", style: "destructive", onPress: () => setPhoto(null) },
                    { text: "Annuler", style: "cancel" },
                  ])
                : void pickPhoto()
            }
            style={{ alignSelf: "center", marginTop: 4 }}
          >
            <View style={{ width: 124, height: 124, borderRadius: 62, borderWidth: 3, borderColor: colors.accent, padding: 5 }}>
              <View style={{ flex: 1, borderRadius: 60, overflow: "hidden", backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                {photo ? <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Camera size={32} color={colors.fg} />}
              </View>
            </View>
            <View style={{ position: "absolute", right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, alignItems: "center", justifyContent: "center" }}>
              <Pencil size={15} color={colors.accent} />
            </View>
          </Press>

          {label("Nom du groupe")}
          <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 50))} placeholder="Ex. Famille, Équipe, Masterclass…" placeholderTextColor={colors.muted} style={{ ...field, height: 50 }} />
          {counter(name.length, 50)}

          {label("Description", true)}
          <TextInput
            value={description}
            onChangeText={(v) => setDescription(v.slice(0, 200))}
            placeholder="Parlez de votre groupe…"
            placeholderTextColor={colors.muted}
            multiline
            style={{ ...field, minHeight: 92, paddingTop: 12, textAlignVertical: "top" }}
          />
          {counter(description.length, 200)}

          {label("Catégorie", true)}
          <Press onPress={() => setCategoryOpen(true)} style={{ ...field, height: 50, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LayoutGrid size={18} color={colors.fg} />
            <Text style={{ flex: 1, color: settings.category ? colors.fg : colors.muted, fontSize: 15 }}>{settings.category ?? "Choisir une catégorie"}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </Press>

          {label("Visibilité")}
          <GroupVisibilityPicker
            value={settings.visibility}
            onChange={(v) => setSettings((s) => ({ ...s, visibility: v, approveNewMembers: v === "private" ? true : s.approveNewMembers, membersCanInvite: v === "public" ? s.membersCanInvite : false }))}
          />
        </ScrollView>
      ) : null}

      {step === 1 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ ...field, height: 48, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999 }}>
              <Search size={18} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Rechercher des contacts…" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.fg, fontSize: 15 }} />
            </View>
          </View>
          {picked.length ? (
            <>
              <Text style={{ marginTop: 18, marginHorizontal: 16, color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
                Membres sélectionnés <Text style={{ color: colors.muted }}>({picked.length})</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 12 }}>
                {picked.map((id) => {
                  const u = usersById[id];
                  return (
                    <Press key={id} onPress={() => setPicked((p) => p.filter((x) => x !== id))} style={{ alignItems: "center", width: 64 }}>
                      <View>
                        <Avatar user={u} size={56} />
                        <View style={{ position: "absolute", top: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, alignItems: "center", justifyContent: "center" }}>
                          <X size={12} color={colors.fg} />
                        </View>
                      </View>
                      <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 12, color: colors.fg }}>{(u?.displayName ?? "").split(" ")[0]}</Text>
                    </Press>
                  );
                })}
              </ScrollView>
            </>
          ) : null}
          <Text style={{ marginTop: 18, marginBottom: 4, marginHorizontal: 16, color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Inviter des contacts</Text>
          {shown.length === 0 ? (
            <Text style={{ marginHorizontal: 16, marginTop: 8, color: colors.muted }}>{q ? "Aucun contact trouvé." : settings.visibility === "public" ? "Tu n’as pas encore de contacts WIPP. Tu pourras inviter avec le lien une fois le groupe créé." : "Tu n’as pas encore de contacts WIPP. Tu pourras ajouter des membres plus tard depuis les infos du groupe."}</Text>
          ) : (
            shown.map((u) => {
              const on = picked.includes(u.id);
              return (
                <Press key={u.id} onPress={() => setPicked((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Avatar user={u} size={48} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 16 }}>{u.displayName}</Text>
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>@{u.username}</Text>
                  </View>
                  <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? colors.accent : colors.muted, backgroundColor: on ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {on ? <Check size={15} color={colors.accentFg} strokeWidth={3} /> : null}
                  </View>
                </Press>
              );
            })
          )}
        </ScrollView>
      ) : null}

      {step === 2 ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
          <Text style={{ color: colors.fg, fontSize: 17, fontFamily: "Inter_700Bold" }}>Autorisations du groupe</Text>
          <Text style={{ marginTop: 4, marginBottom: 6, color: colors.muted, fontSize: 13 }}>Ce que les membres peuvent faire. Modifiable à tout moment dans Infos du groupe.</Text>
          <GroupPermissionsEditor value={settings} onChange={setSettings} disappearMs={disappearMs} onDisappear={setDisappearMs} />
        </ScrollView>
      ) : null}

      {step === 3 && created ? (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140, alignItems: "center" }}>
          <View style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: colors.accent, padding: 4, marginTop: 8 }}>
            <View style={{ flex: 1, borderRadius: 54, overflow: "hidden", backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
              {photo ? <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Users size={40} color={colors.accent} />}
            </View>
          </View>
          <Text style={{ marginTop: 16, fontSize: 22, fontFamily: "Inter_700Bold", color: colors.fg, textAlign: "center" }}>{name.trim()}</Text>
          <Text style={{ marginTop: 6, color: colors.success, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>✓ Groupe créé</Text>
          <Text style={{ marginTop: 8, color: colors.muted, fontSize: 13, textAlign: "center" }}>
            {settings.visibility === "public" ? "Public" : "Privé"} · {picked.length + 1} membre{picked.length ? "s" : ""}
            {settings.category ? ` · ${settings.category}` : ""}
            {disappearMs ? ` · messages éphémères (${GROUP_DISAPPEAR.find((o) => o.ms === disappearMs)?.label})` : ""}
          </Text>
          <Text style={{ marginTop: 6, color: colors.muted, fontSize: 12, textAlign: "center" }}>Messages chiffrés de bout en bout</Text>
        </ScrollView>
      ) : null}

      <View style={{ position: "absolute", left: 16, right: 16, bottom: 28, gap: 10 }}>
        {step === 0 ? <Btn label="Suivant →" disabled={!name.trim()} onPress={() => setStep(1)} /> : null}
        {step === 1 ? <Btn label={picked.length ? "Suivant →" : "Continuer sans membre →"} onPress={() => setStep(2)} /> : null}
        {step === 2 ? <Btn label={busy ? "Création…" : "Créer le groupe"} disabled={busy} onPress={() => void create()} /> : null}
        {step === 3 && created ? (
          <>
            <Btn
              label="Ouvrir le groupe"
              onPress={() =>
                useWippStore.setState((st) => ({
                  stack: [...st.stack.filter((sc) => sc.name !== "new-group" && sc.name !== "new-chat"), { name: "conversation", chatId: created }],
                }))
              }
            />
            {settings.visibility === "public" ? <Btn label="Partager un lien d’invitation" variant="secondary" onPress={() => push({ name: "group-qr", chatId: created })} /> : null}
          </>
        ) : null}
      </View>

      <Sheet open={categoryOpen} title="Catégorie" onClose={() => setCategoryOpen(false)}>
        {[null, ...GROUP_CATEGORIES].map((c) => {
          const on = settings.category === c;
          return (
            <Press
              key={c ?? "none"}
              onPress={() => {
                setSettings((s) => ({ ...s, category: c }));
                setCategoryOpen(false);
              }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13 }}
            >
              <Text style={{ flex: 1, fontSize: 15, color: on ? colors.accent : c ? colors.fg : colors.muted }}>{c ?? "Aucune catégorie"}</Text>
              {on ? <Check size={18} color={colors.accent} /> : null}
            </Press>
          );
        })}
      </Sheet>
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

/** Admins: add WIPP contacts to a group (the next message creates a new group key for them). */
export function GroupAddMembersScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWippStore((s) => s.users);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const members = new Set(chat?.participantIds ?? []);
  const contacts = Object.values(users)
    .filter((u) => u.connected && u.id.startsWith("srvuser:") && !members.has(u.id))
    .filter((u) => {
      const n = q.trim().toLowerCase();
      return !n || u.displayName.toLowerCase().includes(n) || u.username.toLowerCase().includes(n);
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  async function add() {
    if (!picked.length || busy) return;
    setBusy(true);
    const { addGroupMember } = await import("../lib/lot7/api");
    const problems: string[] = [];
    for (const id of picked) {
      try {
        const r = await addGroupMember(chatId.slice(4), id);
        const name = users[id]?.displayName ?? "Un contact";
        if (r === "not_contact") problems.push(`${name} n’est pas (ou plus) dans tes contacts.`);
        else if (r === "banned") problems.push(`${name} a été exclu de ce groupe.`);
      } catch (err) {
        problems.push(String((err as Error)?.message ?? "").includes("forbidden") ? "Seuls les admins peuvent ajouter des membres." : "Un ajout a échoué.");
        break;
      }
    }
    await useWippStore.getState().syncServerInbox();
    setBusy(false);
    if (problems.length) Alert.alert("Ajouter des membres", problems.join("\n"));
    pop();
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Ajouter des membres" onBack={pop} />
      </GlassHeader>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un contact"
          placeholderTextColor={colors.muted}
          style={{ height: 44, borderRadius: 12, backgroundColor: colors.surface2, color: colors.fg, paddingHorizontal: 14 }}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 4 }}>
        <Press onPress={() => push({ name: "group-qr", chatId })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Users size={20} color={colors.accent} />
          </View>
          <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_500Medium" }}>Inviter via un lien ou un QR</Text>
        </Press>
        {contacts.length === 0 ? (
          <Text style={{ marginTop: 16, color: colors.muted, textAlign: "center" }}>
            {q ? "Aucun contact trouvé." : "Tous tes contacts WIPP sont déjà dans ce groupe, ou tu n’as pas encore de contacts."}
          </Text>
        ) : (
          contacts.map((u) => {
            const on = picked.includes(u.id);
            return (
              <Press
                key={u.id}
                onPress={() => setPicked((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
              >
                <Avatar user={u} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_500Medium" }}>{u.displayName}</Text>
                  <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>@{u.username}</Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.accent : colors.hair, backgroundColor: on ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on ? <Check size={14} color={colors.accentFg} /> : null}
                </View>
              </Press>
            );
          })
        )}
      </ScrollView>
      {picked.length ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 28 }}>
          <Btn label={busy ? "Ajout…" : `Ajouter ${picked.length} membre${picked.length > 1 ? "s" : ""}`} disabled={busy} onPress={() => void add()} />
        </View>
      ) : null}
    </ScreenRoot>
  );
}

/** Admins: visibility + member permissions + disappearing messages, after creation. */
export function GroupSettingsScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const [settings, setSettings] = useState<GroupSettings>(chat?.groupSettings ?? { ...DEFAULT_GROUP_SETTINGS });
  const [disappearMs, setDisappearMs] = useState(chat?.disappearAfterMs ?? 0);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const { setGroupSettings } = await import("../lib/lot7/api");
      await setGroupSettings(chatId, { ...settings, disappearMs });
      await useWippStore.getState().syncServerInbox();
      pop();
    } catch (err) {
      Alert.alert("Autorisations", String((err as Error)?.message ?? "").includes("forbidden") ? "Seuls les admins peuvent modifier ces réglages." : "Enregistrement impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Autorisations du groupe" onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ marginBottom: 8, color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Visibilité</Text>
        <GroupVisibilityPicker
          value={settings.visibility}
          onChange={(v) => setSettings((s) => ({ ...s, visibility: v, membersCanInvite: v === "public" ? s.membersCanInvite : false }))}
        />
        {chat?.groupSettings?.visibility === "public" && settings.visibility === "private" ? (
          <Text style={{ marginTop: 8, color: colors.danger, fontSize: 12 }}>En passant en Privé, tous les liens d’invitation existants cesseront de fonctionner.</Text>
        ) : null}
        <Text style={{ marginTop: 22, marginBottom: 4, color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Ce que les membres peuvent faire</Text>
        <GroupPermissionsEditor value={settings} onChange={setSettings} disappearMs={disappearMs} onDisappear={setDisappearMs} />
      </ScrollView>
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 28 }}>
        <Btn label={busy ? "Enregistrement…" : "Enregistrer"} disabled={busy} onPress={() => void save()} />
      </View>
    </ScreenRoot>
  );
}

/** Admins: approve or decline people waiting to join (by link, or added by a member). */
export function GroupJoinRequestsScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const [items, setItems] = useState<import("../lib/lot7/api").GroupJoinRequest[] | null>(null);
  const load = () =>
    void import("../lib/lot7/api")
      .then(({ groupJoinRequests }) => groupJoinRequests(chatId))
      .then((r) => setItems(Array.isArray(r) ? r : []))
      .catch(() => setItems([]));
  useEffect(load, [chatId]);

  async function decide(profileId: string, approve: boolean) {
    try {
      const { decideGroupJoin } = await import("../lib/lot7/api");
      await decideGroupJoin(chatId, profileId, approve);
      setItems((list) => (list ?? []).filter((r) => r.profileId !== profileId));
      if (approve) void useWippStore.getState().syncServerInbox();
    } catch {
      Alert.alert("Demandes", "Action impossible pour le moment.");
    }
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Demandes d’adhésion" onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {items === null ? (
          <Text style={{ color: colors.muted }}>Chargement…</Text>
        ) : items.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>Aucune demande en attente.</Text>
        ) : (
          items.map((r) => (
            <View key={r.profileId} style={{ padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar user={{ displayName: r.displayName, avatar: r.avatarUrl ?? "" }} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{r.displayName}</Text>
                  <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>@{r.username}</Text>
                  <Text style={{ marginTop: 2, color: colors.muted, fontSize: 12 }}>
                    {r.via === "link" ? "Via le lien d’invitation" : `Ajouté par ${r.invitedBy ?? "un membre"}`}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Btn label="Approuver" onPress={() => void decide(r.profileId, true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Btn label="Refuser" variant="secondary" onPress={() => void decide(r.profileId, false)} />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenRoot>
  );
}

function newInviteToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Invitation link of a group: QR, copy, share, and (admins) reset so old links stop working. */
export function GroupQrScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const isAdmin = (chat?.adminIds ?? []).includes("me");
  const [token, setToken] = useState(chat?.inviteToken ?? "");
  const [state, setState] = useState<"ready" | "loading" | "forbidden" | "closed" | "error">(token ? "ready" : "loading");
  const [copied, setCopied] = useState(false);

  async function create(reset: boolean) {
    if (!chatId.startsWith("srv:")) return;
    setState("loading");
    try {
      const api = await import("../lib/lot7/api");
      if (reset) await api.resetGroupInvites(chatId);
      const next = newInviteToken();
      const status = await api.createGroupInvite(chatId.slice(4), next);
      if (status !== "ok") {
        setState(status === "closed" ? "closed" : "error");
        return;
      }
      setToken(next);
      setState("ready");
      setCopied(false);
      useWippStore.setState((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, inviteToken: next } : c)) }));
    } catch (err) {
      setState(String((err as Error)?.message ?? "").includes("forbidden") ? "forbidden" : "error");
    }
  }

  useEffect(() => {
    if (!token) void create(false);
  }, [chatId]);

  const link = token ? `https://wippapp.com/g/${token}` : "";
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Lien d’invitation" onBack={pop} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ alignItems: "center", padding: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.fg }}>{chat?.name}</Text>
        {state === "ready" && link ? (
          <>
            <View style={{ marginTop: 16 }}>
              <QrCard value={link} size={220} />
            </View>
            <Text selectable style={{ marginTop: 12, fontSize: 13, color: colors.muted, textAlign: "center" }}>{link.replace(/^https:\/\//, "").slice(0, 34)}…</Text>
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.muted, textAlign: "center", maxWidth: 300 }}>
              Toute personne qui a ce lien peut rejoindre le groupe (valable 7 jours, 50 utilisations).
            </Text>
            <View style={{ width: "100%", gap: 8, marginTop: 20 }}>
              <Btn
                label={copied ? "Lien copié ✓" : "Copier le lien"}
                onPress={() => {
                  void import("expo-clipboard").then((C) => C.setStringAsync(link)).then(() => setCopied(true));
                }}
              />
              <Btn label="Partager le lien" variant="secondary" onPress={() => void shareWippPublic(`Rejoins « ${chat?.name ?? "notre groupe"} » sur WIPP : ${link}`)} />
              {isAdmin ? (
                <Btn
                  label="Réinitialiser le lien"
                  variant="danger"
                  onPress={() =>
                    Alert.alert("Réinitialiser le lien", "L’ancien lien et l’ancien QR ne fonctionneront plus.", [
                      { text: "Annuler", style: "cancel" },
                      { text: "Réinitialiser", style: "destructive", onPress: () => void create(true) },
                    ])
                  }
                />
              ) : null}
            </View>
          </>
        ) : (
          <Text style={{ marginTop: 24, color: state === "loading" ? colors.muted : colors.danger, textAlign: "center", maxWidth: 300 }}>
            {state === "loading"
              ? "Création du lien…"
              : state === "forbidden"
                ? "Seuls les admins du groupe peuvent créer un lien d’invitation."
                : state === "closed"
                  ? "Les invitations par lien sont désactivées pour ce groupe."
                  : "Lien indisponible pour le moment."}
          </Text>
        )}
      </ScrollView>
    </ScreenRoot>
  );
}

export function GroupInviteScreen({ token }: { token: string }) {
  const pop = useWippStore((s) => s.pop);
  const replace = useWippStore((s) => s.replace);
  const [info, setInfo] = useState<{ status: string; name?: string; members?: number; chat_id?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    void import("../lib/lot7/api")
      .then(({ peekGroupInvite }) => peekGroupInvite(token))
      .then(setInfo)
      .catch(() => setInfo({ status: "error" }));
  }, [token]);

  async function join() {
    setBusy(true);
    try {
      const { joinGroupInvite } = await import("../lib/lot7/api");
      const res = await joinGroupInvite(token);
      if ((res.status === "joined" || res.status === "already_member") && res.chat_id) {
        await useWippStore.getState().syncServerInbox();
        replace({ name: "conversation", chatId: `srv:${res.chat_id}` });
        return;
      }
      setResult(res.status);
    } catch {
      setResult("error");
    } finally {
      setBusy(false);
    }
  }

  const usable = info?.status === "ok" || info?.status === "already_member";
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Invitation" onBack={pop} />
      </GlassHeader>
      <View style={{ padding: 24, alignItems: "center" }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Users size={40} color={colors.accent} />
        </View>
        <Text style={{ marginTop: 14, fontSize: 21, fontFamily: "Inter_700Bold", color: colors.fg, textAlign: "center" }}>{info?.name ?? (info ? "Groupe WIPP" : "…")}</Text>
        {info?.members ? <Text style={{ marginTop: 4, color: colors.muted }}>{info.members} membre{info.members > 1 ? "s" : ""}</Text> : null}
        {result ? (
          <Text style={{ marginTop: 18, color: result === "pending" ? colors.fg : colors.danger, textAlign: "center", lineHeight: 20 }}>
            {result === "pending" ? "✓ Demande envoyée. Un admin du groupe doit l’approuver ; tu verras le groupe dès qu’il aura accepté." : GROUP_FR[result] ?? GROUP_FR.error}
          </Text>
        ) : info && !usable ? (
          <Text style={{ marginTop: 18, color: colors.danger, textAlign: "center" }}>{GROUP_FR[info.status] ?? GROUP_FR.error}</Text>
        ) : null}
        {usable && !result ? (
          <Btn
            label={busy ? "…" : info?.status === "already_member" ? "Ouvrir le groupe" : "Rejoindre le groupe"}
            disabled={busy}
            onPress={() => void join()}
            style={{ marginTop: 22, alignSelf: "stretch" }}
          />
        ) : null}
        {result === "pending" ? <Btn label="Fermer" variant="secondary" onPress={pop} style={{ marginTop: 18, alignSelf: "stretch" }} /> : null}
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
                  backgroundColor: whiteA(0.1),
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
          <Text style={{ marginTop: 20, fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.6, color: fgA(0.5), textTransform: "uppercase" }}>
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
                  backgroundColor: codeChatTtl === ms ? colors.accent : whiteA(0.1),
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: codeChatTtl === ms ? colors.accentFg : colors.fg }}>{t(key)}</Text>
              </Press>
            ))}
          </View>
          <Text style={{ marginTop: 12, maxWidth: 280, textAlign: "center", fontSize: 12, lineHeight: 18, color: fgA(0.5) }}>{t("codeVsPerm")}</Text>
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
                  backgroundColor: whiteA(0.1),
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
              style={{ marginBottom: 12, borderRadius: 8, backgroundColor: whiteA(0.1), paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <Text style={{ textAlign: "center", fontSize: 13, color: fgA(0.8) }}>{t("demoCodeLea")}</Text>
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
                    backgroundColor: whiteA(0.1),
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
