import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Eye, Lock, MoreHorizontal, Pause, Phone, Play, Plus, Send, Smile, Store, Video, X } from "lucide-react-native";
import { Avatar, GroupAvatar } from "../components/Avatar";
import { MediaViewer } from "../components/MediaViewer";
import { MessageMenu } from "../components/MessageMenu";
import { ReceiptTicks } from "../components/ReceiptTicks";
import { ShareSurpriseSheet } from "../components/ShareSurpriseSheet";
import { StickerTray } from "../components/StickerTray";
import { SurpriseReveal } from "../components/SurpriseReveal";
import { SurpriseAnimOverlay } from "../components/SurpriseAnimOverlay";
import { SwipeableBubble } from "../components/SwipeableBubble";
import { VoiceHoldButton } from "../components/VoiceHoldButton";
import { mentionIdsInText } from "../lib/lot7/api";
import { WippMomentOverlay } from "../components/WippMomentOverlay";
import { WippSticker } from "../components/WippSticker";
import { GlassHeader, Header, IconBtn, Press, ScreenRoot } from "../components/ui";
import { composerSticker, wippSrc } from "../lib/assets";
import { useDeviceLayout } from "../lib/device-layout";
import { formatClock, formatLastSeen } from "../lib/format";
import { addLocalGif, gifProviderConfigured, GIF_INTEGRATION_PENDING, loadGifs, searchGifs, type LocalGif } from "../lib/gifs";
import { haptic } from "../lib/haptics";
import { isPrivateSessionUnlocked } from "../lib/private-vault";
import { shareWippPublic } from "../lib/share-public";
import { popProtect, pushProtect } from "../lib/screen-protection";
import { localBlobs, startAlbumUpload, startUpload } from "../lib/messaging/send-media";
import { EDIT_WINDOW_MS } from "../lib/messaging/plain";
import { isServerChatId, toServerChatId } from "../lib/messaging/sync";
import { chatPeer, isChatSealed, isPrivateChat, useT, useWippStore } from "../lib/store";
import { isSeedDemoChat } from "../lib/seed";
import { stickerById, stickerLabel, stickersInPack } from "../lib/stickers";
import type { Surprise } from "../lib/surprise";
import { storyRing } from "../lib/story-status";
import { isStoryLive, type MediaItem, type Message } from "../lib/types";
import { colors } from "../theme";

const QUICK_MOJI = stickersInPack("moji").filter((s) => s.src.endsWith(".webp"));
const NO_MESSAGES: Message[] = [];

function surpriseFromMessage(m: Message): Surprise {
  const kind = (["scratch", "countdown", "gift", "confetti"] as const).includes(m.scratchCardId as never)
    ? (m.scratchCardId as Surprise["surpriseType"])
    : "scratch";
  return {
    id: m.id,
    message: m.text ?? "",
    surpriseType: kind,
    designId: m.scratchDesign ?? "heart",
    animationId: m.effectId ?? null,
    surpriseOptions: m.duration ? { countdown: { seconds: m.duration } } : {},
    time: "",
    mine: m.fromId === "me",
  };
}

function VoiceBubble({ uri, duration, mine }: { uri?: string; duration?: number; mine: boolean }) {
  const sound = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [speed, setSpeed] = useState(1);
  useEffect(() => () => void sound.current?.unloadAsync(), []);
  async function toggle() {
    if (!uri) return;
    if (!sound.current) {
      const created = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, rate: speed, shouldCorrectPitch: true });
      sound.current = created.sound;
      created.sound.setOnPlaybackStatusUpdate((st) => {
        if (!st.isLoaded) return;
        setPlaying(st.isPlaying);
        setPos(st.positionMillis);
        if (st.didJustFinish) {
          setPlaying(false);
          setPos(0);
        }
      });
      setPlaying(true);
      return;
    }
    const st = await sound.current.getStatusAsync();
    if (st.isLoaded && st.isPlaying) await sound.current.pauseAsync();
    else await sound.current.playAsync();
  }
  async function cycleSpeed() {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (sound.current) await sound.current.setRateAsync(next, true);
  }
  const dur = (duration ?? 0) * (duration && duration > 20 ? 1 : 1000);
  const shown = Math.max(duration ?? 0, Math.round(pos / 1000));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 160 }}>
      <Press onPress={() => void toggle()}>{playing ? <Pause size={18} color={mine ? colors.bubbleMeFg : colors.fg} /> : <Play size={18} color={mine ? colors.bubbleMeFg : colors.fg} />}</Press>
      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)" }}>
        <View style={{ width: dur ? `${Math.min(100, (pos / dur) * 100)}%` : "0%", height: 4, backgroundColor: colors.accent }} />
      </View>
      <Press onPress={() => void cycleSpeed()}>
        <Text style={{ fontSize: 11, color: colors.muted }}>{speed}x</Text>
      </Press>
      <Text style={{ fontSize: 11, color: colors.muted }}>{shown}s</Text>
    </View>
  );
}

function StoryCiteCard({
  cite,
  mine,
  stories,
}: {
  cite: NonNullable<Message["storyRef"]>;
  mine: boolean;
  stories: { id: string; type: string; text?: string; bg?: string; imageUrl?: string; expiresAt?: number; createdAt: number; ttlMs?: number }[];
}) {
  const live = stories.find((story) => story.id === cite.id && isStoryLive(story));
  const caption = !live
    ? "Story expirée"
    : cite.mode === "reaction"
      ? mine
        ? "Réaction à la story"
        : "Réaction à votre story"
      : mine
        ? "Réponse à la story"
        : "Réponse à votre story";
  return (
    <View style={{ marginBottom: 6, width: 132, borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.16)" }}>
      {live?.type === "image" && live.imageUrl ? (
        <Image source={{ uri: live.imageUrl }} style={{ width: 132, height: 74 }} contentFit="cover" />
      ) : live?.type === "text" ? (
        <View style={{ minHeight: 56, padding: 8, backgroundColor: live.bg ?? colors.navy }}>
          <Text numberOfLines={3} style={{ color: "#fff", fontSize: 12 }}>{live.text || cite.preview}</Text>
        </View>
      ) : live?.type === "video" ? (
        <View style={{ height: 74, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          <Play size={18} color="#fff" />
        </View>
      ) : null}
      <Text style={{ fontSize: 11, color: colors.muted, paddingHorizontal: 8, paddingVertical: 4 }}>{caption}</Text>
    </View>
  );
}

export function ConversationScreen({ chatId }: { chatId: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { compact, icon, headerIcon, tablet } = useDeviceLayout();
  const composerIcon = tablet ? 48 : icon;
  const composerArt = Math.round(composerIcon * 0.78);
  const pop = useWippStore((s) => s.pop);
  const push = useWippStore((s) => s.push);
  const chat = useWippStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWippStore((s) => s.users);
  const rawMessages = useWippStore((s) => s.messages[chatId]) ?? NO_MESSAGES;
  const now = Date.now();
  const messages = rawMessages.filter((m) => !m.expiresAt || m.expiresAt > now);
  const sendMessage = useWippStore((s) => s.sendMessage);
  const sendText = useWippStore((s) => s.sendText);
  const markRead = useWippStore((s) => s.markRead);
  const typing = useWippStore((s) => Boolean(s.typing[chatId]));
  const shop = useWippStore((s) => (chat?.shopId ? s.shops.find((x) => x.id === chat.shopId) : undefined));
  const drafts = useWippStore((s) => s.drafts[chatId] ?? "");
  const stories = useWippStore((s) => s.stories);
  const [draft, setDraft] = useState(drafts);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStage, setShareStage] = useState<"share" | "compose">("share");
  const [emojiBar, setEmojiBar] = useState(false);
  const [stickerBar, setStickerBar] = useState(false);
  const [picked, setPicked] = useState<Message | null>(null);
  const [reply, setReply] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [viewOnceProtect, setViewOnceProtect] = useState(false);
  const [viewer, setViewer] = useState<{ items: MediaItem[]; start: number } | null>(null);
  const [momentPlay, setMomentPlay] = useState<{ id: string; n: number } | null>(null);
  const [surprisePlay, setSurprisePlay] = useState<{ id: string; n: number } | null>(null);
  const surpriseSequence = useRef(0);
  const [jumpId, setJumpId] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const seenMoment = useRef<string | null>(null);

  function playMoment(id: string) {
    if (!stickerById(id)?.playMs) return;
    setMomentPlay((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
  }

  useEffect(() => {
    markRead(chatId);
    useWippStore.getState().sealExpired();
    if (!isServerChatId(chatId)) return;
    const serverId = toServerChatId(chatId);
    let stop = () => {};
    void import("../lib/messaging/client").then(async (api) => {
      await api.postFocus(serverId, true);
    });
    void import("../lib/messaging/live-client").then(({ startMessageStream }) => {
      stop = startMessageStream((event) => {
        if (event.chatId !== serverId && event.kind !== "typing") return;
        void useWippStore.getState().applyLiveEvent(event);
      }, serverId);
    });
    const beat = setInterval(() => {
      void import("../lib/messaging/client").then((api) => api.postFocus(serverId, true));
    }, 12_000);
    return () => {
      stop();
      clearInterval(beat);
      void import("../lib/messaging/client").then((api) => {
        void api.postFocus(serverId, false);
        void api.postTyping(serverId, false);
      });
    };
  }, [chatId, markRead]);

  useEffect(() => {
    if (!isPrivateChat(chatId)) return;
    const release = pushProtect("private_chat");
    if (!isPrivateSessionUnlocked()) pop();
    return () => release();
  }, [chatId, pop]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === seenMoment.current) return;
    if (last.type !== "sticker" || !last.stickerId) return;
    if (Date.now() - last.createdAt > 2000) return;
    if (!stickerById(last.stickerId)?.playMs) return;
    seenMoment.current = last.id;
    setMomentPlay((prev) => ({ id: last.stickerId as string, n: (prev?.n ?? 0) + 1 }));
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { downloadCipherFile } = await import("../lib/messaging/media-upload");
      const { consumeServerAttachment } = await import("../lib/messaging/client");
      void consumeServerAttachment;
      for (const m of messages) {
        const stored = m.imageUrl || m.videoUrl || m.audioUrl || m.file?.url || "";
        if (stored.startsWith("groups/") || stored.startsWith("stories/")) {
          try {
            const { signPrivateMedia } = await import("../lib/lot7/api");
            const url = await signPrivateMedia(stored);
            if (cancelled) return;
            useWippStore.setState((s) => ({
              messages: {
                ...s.messages,
                [chatId]: (s.messages[chatId] ?? []).map((x) =>
                  x.id !== m.id
                    ? x
                    : {
                        ...x,
                        imageUrl: x.imageUrl?.startsWith("groups/") || x.imageUrl?.startsWith("stories/") ? url : x.imageUrl,
                        videoUrl: x.videoUrl?.startsWith("groups/") || x.videoUrl?.startsWith("stories/") ? url : x.videoUrl,
                        audioUrl: x.audioUrl?.startsWith("groups/") || x.audioUrl?.startsWith("stories/") ? url : x.audioUrl,
                        file: x.file?.url?.startsWith("groups/") || x.file?.url?.startsWith("stories/") ? { ...x.file, url } : x.file,
                      },
                ),
              },
            }));
          } catch {
            /* audience refused or offline */
          }
          continue;
        }
        if (m.viewOnce && m.fromId !== "me") continue;
        const pending = (m.album?.length
          ? m.album.filter((a) => a.attachmentId && a.mediaKey && a.mediaChunks?.length && !a.url)
          : []) as MediaItem[];
        if (
          !m.album?.length &&
          m.attachmentId &&
          m.mediaKey &&
          m.mediaChunks?.length &&
          !m.imageUrl &&
          !m.videoUrl &&
          !m.audioUrl &&
          !m.file?.url &&
          !localBlobs.get(m.attachmentId)
        ) {
          pending.push({
            type: m.type === "video" ? "video" : "image",
            url: "",
            attachmentId: m.attachmentId,
            mediaKey: m.mediaKey,
            mediaChunks: m.mediaChunks,
            mime: m.mediaMime,
          });
        }
        if (!pending.length) continue;
        try {
          const downloaded: MediaItem[] = [];
          for (const part of pending) {
            const uri =
              localBlobs.get(part.attachmentId!) ??
              (await downloadCipherFile({
                attachmentId: part.attachmentId!,
                fileKey: part.mediaKey!,
                chunks: part.mediaChunks!,
                mime: part.mime,
              }));
            if (cancelled) return;
            localBlobs.set(part.attachmentId!, uri);
            downloaded.push({ ...part, url: uri });
          }
          useWippStore.setState((s) => ({
            messages: {
              ...s.messages,
              [chatId]: (s.messages[chatId] ?? []).map((x) => {
                if (x.id !== m.id) return x;
                const first = downloaded[0];
                const album = x.album?.length
                  ? x.album.map((a) => downloaded.find((d) => d.attachmentId === a.attachmentId) ?? a)
                  : x.album;
                return {
                  ...x,
                  mediaState: "ready",
                  album,
                  imageUrl: x.type === "image" || x.type === "gif" ? (first?.url ?? x.imageUrl) : x.imageUrl,
                  videoUrl: x.type === "video" ? (first?.url ?? x.videoUrl) : x.videoUrl,
                  audioUrl: x.type === "voice" ? (first?.url ?? x.audioUrl) : x.audioUrl,
                  gifUrl: x.type === "gif" ? (first?.url ?? x.gifUrl) : x.gifUrl,
                  file: x.file && first?.url ? { ...x.file, url: first.url } : x.file,
                };
              }),
            },
          }));
        } catch {
          /* offline / not ready */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, messages]);

  if (!chat) {
    return (
      <ScreenRoot>
        <GlassHeader>
          <Header title="" onBack={pop} />
        </GlassHeader>
      </ScreenRoot>
    );
  }
  const peer = chatPeer(chat, users);
  const headerRing = chat.type !== "group" && peer ? storyRing(stories, peer.id) : "none";
  const sealed = isChatSealed(chat);
  // The owner of the shop talks to a client: show the client, not their own shop.
  const clientSide = Boolean(shop && shop.ownerId !== "me");
  const shopFace = shop && clientSide ? { displayName: shop.name, avatar: shop.logo || shop.image, online: true } : undefined;
  const title = chat.type === "group" ? chat.name : shop && clientSide ? shop.name : peer?.displayName;
  const subtitle = typing
    ? "écrit…"
    : chat.type === "group"
      ? `${chat.participantIds.length} personnes`
      : shop
        ? undefined
        : peer
          ? formatLastSeen(peer.lastSeen, peer.online, useWippStore.getState().language)
          : undefined;
  const canCall = (chat.type === "group" || Boolean(peer)) && !sealed;
  const chats = useWippStore
    .getState()
    .chats.filter(
      (c) =>
        !c.archived &&
        c.id !== chatId &&
        !isPrivateChat(c.id) &&
        (!useWippStore.getState().serverConnected || !isSeedDemoChat(c.id)),
    );

  function setDraftPersist(value: string) {
    setDraft(value);
    useWippStore.getState().setDraftFor(chatId, value);
    if (isServerChatId(chatId)) {
      void import("../lib/messaging/client").then((api) => api.postTyping(toServerChatId(chatId), value.trim().length > 0));
    }
  }

  function sendDraft() {
    const value = draft.trim();
    if (!value) return;
    if (editing) {
      useWippStore.getState().editMessage(chatId, editing.id, value);
      setEditing(null);
    } else {
      const members =
        chat?.type === "group"
          ? chat.participantIds.map((id) => ({
              id,
              username: id === "me" ? useWippStore.getState().me.username : users[id]?.username,
            }))
          : [];
      sendText(chatId, value, {
        replyTo: reply?.id,
        replyPreview: reply?.text?.slice(0, 80),
        mentions: mentionIdsInText(value, members),
      });
    }
    setDraftPersist("");
    setReply(null);
    setEmojiBar(false);
    setStickerBar(false);
  }

  function sendMediaFiles(assets: ImagePicker.ImagePickerAsset[], fromCamera: boolean) {
    const once = viewOnce || undefined;
    const media = assets.filter(
      (a) =>
        (a.type ?? "").startsWith("video") ||
        (a.mimeType ?? "").startsWith("video") ||
        (a.mimeType ?? "").startsWith("image") ||
        !a.mimeType,
    );
    if (!media.length) return;
    const caption = draft.trim() || "";
    if (media.length > 1) {
      const album: MediaItem[] = media.map((a) => ({
        type: (a.type ?? a.mimeType ?? "").includes("video") ? "video" : "image",
        url: a.uri,
        duration: a.duration ?? undefined,
        mime: a.mimeType ?? undefined,
      }));
      const first = album[0]!;
      const id = sendMessage(chatId, {
        type: first.type,
        imageUrl: first.type === "image" ? first.url : undefined,
        videoUrl: first.type === "video" ? first.url : undefined,
        album,
        text: caption,
        viewOnce: once,
        mediaState: "preparing",
      });
      startAlbumUpload({
        chatId,
        messageId: id,
        items: media.map((a, i) => ({
          blobUrl: a.uri,
          kind: album[i]!.type,
          mime: a.mimeType ?? undefined,
          durationMs: a.duration ? a.duration * 1000 : undefined,
        })),
        viewOnce: once,
        caption,
      });
    } else {
      const a = assets[0];
      if (!a) return;
      const video = (a.type ?? a.mimeType ?? "").includes("video");
      const id = sendMessage(chatId, {
        type: video ? "video" : "image",
        imageUrl: video ? undefined : a.uri,
        videoUrl: video ? a.uri : undefined,
        text: caption,
        viewOnce: once,
        mediaState: "preparing",
        duration: a.duration ? Math.round(a.duration) : undefined,
      });
      startUpload({
        chatId,
        messageId: id,
        blobUrl: a.uri,
        kind: video ? "video" : "image",
        mime: a.mimeType,
        viewOnce: once,
        durationMs: a.duration ? a.duration * 1000 : undefined,
        caption,
      });
    }
    setDraftPersist("");
    setViewOnce(false);
    void fromCamera;
  }

  async function pickGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (res.canceled) return;
    sendMediaFiles(res.assets, false);
  }

  async function pickCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.85, videoMaxDuration: 60 });
    if (res.canceled || !res.assets[0]) return;
    sendMediaFiles(res.assets, true);
  }

  async function pickDocument() {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    const file = res.assets[0];
    const id = sendMessage(chatId, {
      type: "file",
      text: "",
      file: { name: file.name, size: file.size ?? 0, mime: file.mimeType ?? "", url: file.uri },
      mediaState: "preparing",
    });
    startUpload({
      chatId,
      messageId: id,
      blobUrl: file.uri,
      kind: "file",
      name: file.name,
      mime: file.mimeType ?? undefined,
    });
  }

  async function openViewOnce(m: Message) {
    if (!m.attachmentId || !m.mediaKey || !m.mediaChunks?.length) return;
    pushProtect("view_once");
    setViewOnceProtect(true);
    try {
      const { downloadCipherFile } = await import("../lib/messaging/media-upload");
      const uri = await downloadCipherFile({
        attachmentId: m.attachmentId,
        fileKey: m.mediaKey,
        chunks: m.mediaChunks,
        mime: m.mediaMime,
      });
      setViewer({ items: [{ type: m.type === "video" ? "video" : "image", url: uri }], start: 0 });
      if (m.fromId !== "me") {
        const { consumeServerAttachment } = await import("../lib/messaging/client");
        await consumeServerAttachment(m.attachmentId);
        useWippStore.getState().burnViewOnce(chatId, m.id);
      }
    } catch {
      popProtect("view_once");
      setViewOnceProtect(false);
    }
  }

  function openShare(stage: "share" | "compose" = "share") {
    setEmojiBar(false);
    setStickerBar(false);
    setShareStage(stage);
    setShareOpen(true);
  }

  function jumpTo(id: string) {
    const i = messages.findIndex((m) => m.id === id);
    if (i < 0) return;
    setJumpId(id);
    listRef.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.4 });
    setTimeout(() => setJumpId(null), 1200);
  }

  const pinned = messages.filter((m) => m.pinned && !m.deletedForAll);

  function renderMessage({ item: m }: { item: Message }) {
    const mine = m.fromId === "me";
    const img = m.imageUrl ? (m.imageUrl.startsWith("/") ? wippSrc(m.imageUrl) : { uri: m.imageUrl }) : m.gifUrl ? { uri: m.gifUrl } : undefined;
    if (m.type === "system") {
      return (
        <Text style={{ marginBottom: 10, paddingHorizontal: 24, textAlign: "center", fontSize: 12, lineHeight: 17, color: colors.muted }}>
          {m.text}
        </Text>
      );
    }
    const album: MediaItem[] = m.album?.length
      ? m.album
      : m.type === "image" && m.imageUrl
        ? [{ type: "image", url: m.imageUrl }]
        : m.type === "video" && m.videoUrl
          ? [{ type: "video", url: m.videoUrl }]
          : [];
    return (
      <View style={{ marginBottom: 8, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: m.type === "scratch" ? "96%" : "82%", opacity: jumpId === m.id ? 0.7 : 1 }}>
        <SwipeableBubble enabled={!m.deletedForAll} onReply={() => setReply(m)}>
          <Press
            disabled={m.type === "scratch"}
            onPress={() => {
              if (m.status === "failed" && mine) {
                useWippStore.getState().retryMessage(chatId, m.id);
                return;
              }
              if (m.viewOnce && !m.viewed) {
                void openViewOnce(m);
                return;
              }
              if (m.type === "shop" && m.shopId) {
                const publicId = m.shopId.replace(/^business:/, "");
                push({ name: "business-card-view", publicId });
                return;
              }
              if (m.type === "sticker" && m.stickerId) {
                playMoment(m.stickerId);
                return;
              }
              if (album.length) {
                setViewer({ items: album, start: 0 });
                return;
              }
              if (m.type !== "scratch") setPicked(m);
            }}
            onLongPress={() => setPicked(m)}
          >
            <View
              style={{
                borderRadius: 16,
                paddingHorizontal: m.type === "scratch" || m.type === "sticker" ? 0 : 12,
                paddingVertical: m.type === "scratch" || m.type === "sticker" ? 0 : 8,
                backgroundColor: m.type === "scratch" || m.type === "sticker" ? "transparent" : mine ? colors.bubbleMe : colors.bubbleThem,
                borderWidth: jumpId === m.id ? 1 : 0,
                borderColor: colors.accent,
              }}
            >
              {m.forwarded ? <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>Transféré</Text> : null}
              {m.storyRef ? <StoryCiteCard cite={m.storyRef} mine={mine} stories={stories} /> : null}
              {m.replyTo ? (
                <Press onPress={() => jumpTo(m.replyTo!)} style={{ marginBottom: 6, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 8 }}>
                  <Text numberOfLines={2} style={{ fontSize: 12, color: colors.muted }}>
                    {m.replyPreview || "Message"}
                  </Text>
                </Press>
              ) : null}
              {m.viewOnce ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
                  <Eye size={16} color={colors.accent} />
                  <Text style={{ color: mine ? colors.bubbleMeFg : colors.fg }}>{m.viewed ? t("viewOnceOpened") : t("viewOnceOpen")}</Text>
                </View>
              ) : null}
              {!m.viewOnce && album.length > 1 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {album.slice(0, 4).map((a, i) =>
                    a.url ? (
                      <Image key={i} source={{ uri: a.url }} style={{ width: 72, height: 72, borderRadius: 8 }} contentFit="cover" />
                    ) : (
                      <View key={i} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: colors.surface }} />
                    ),
                  )}
                </View>
              ) : null}
              {!m.viewOnce && img && album.length <= 1 ? <Image source={img} style={{ width: 180, height: 180, maxWidth: "100%", borderRadius: 10, marginBottom: 6 }} contentFit="cover" /> : null}
              {m.type === "video" && m.videoUrl && !m.viewOnce && album.length <= 1 ? (
                <View style={{ width: 180, height: 120, borderRadius: 10, backgroundColor: "#000", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <Play size={28} color="#fff" />
                </View>
              ) : null}
              {m.type === "voice" ? <VoiceBubble uri={m.audioUrl} duration={m.duration} mine={mine} /> : null}
              {m.type === "file" && m.file ? (
                <View>
                  <Text style={{ color: mine ? colors.bubbleMeFg : colors.fg, fontFamily: "Inter_500Medium" }}>{m.file.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {m.file.mime || "Document"}
                    {m.file.size ? ` · ${Math.round(m.file.size / 1024)} Ko` : ""}
                    {m.mediaState === "uploading" ? ` · ${Math.round((m.progress ?? 0) * 100)}%` : ""}
                  </Text>
                </View>
              ) : null}
              {m.type === "scratch" ? <SurpriseReveal surprise={surpriseFromMessage(m)} onReveal={() => useWippStore.getState().markScratch(chatId, m.id)} onPlayAnimation={(id) => setSurprisePlay({ id, n: ++surpriseSequence.current })} /> : null}
              {m.type === "shop" ? (
                <View style={{ width: 220 }}>
                  {m.imageUrl ? <Image source={{ uri: m.imageUrl }} style={{ width: "100%", height: 110, borderRadius: 10, marginBottom: 8 }} contentFit="cover" /> : (
                    <View style={{ height: 72, borderRadius: 10, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <Store size={28} color={colors.accent} />
                    </View>
                  )}
                  <Text style={{ color: mine ? colors.bubbleMeFg : colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{m.text}</Text>
                  <Text style={{ marginTop: 2, color: colors.muted, fontSize: 12 }}>Carte professionnelle</Text>
                  <Text style={{ marginTop: 8, color: colors.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Ouvrir</Text>
                </View>
              ) : null}
              {m.type !== "scratch" && m.type !== "sticker" && m.type !== "voice" && m.type !== "shop" && m.text ? (
                <Text style={{ color: mine ? colors.bubbleMeFg : colors.fg, fontSize: 15, lineHeight: 20 }}>{m.deletedForAll ? "Message supprimé" : m.text}</Text>
              ) : null}
              {m.encFailed && !m.text ? <Text style={{ color: colors.muted }}>🔒 Message chiffré</Text> : null}
              {m.type === "sticker" && stickerById(m.stickerId)?.pack === "emo" ? (
                <Text style={{ fontSize: 13, color: colors.muted, paddingHorizontal: 4, paddingVertical: 6 }}>{stickerLabel(m.stickerId, "fr")}</Text>
              ) : m.type === "sticker" ? (
                <WippSticker id={m.stickerId ?? ""} size={96} />
              ) : null}
              {m.geo ? (
                <Text style={{ color: mine ? colors.bubbleMeFg : colors.fg }}>
                  📍 {m.geo.lat.toFixed(4)}, {m.geo.lon.toFixed(4)}
                </Text>
              ) : null}
              {m.mediaState === "uploading" || m.mediaState === "preparing" ? <ActivityIndicator color={colors.accent} style={{ marginTop: 6 }} /> : null}
              <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
                {m.editedAt ? <Text style={{ fontSize: 10, color: colors.muted, marginRight: 4 }}>modifié</Text> : null}
                <Text style={{ fontSize: 10, color: colors.muted }}>{formatClock(m.createdAt)}</Text>
                {mine ? <ReceiptTicks status={m.status} /> : null}
              </View>
            </View>
          </Press>
        </SwipeableBubble>
        {(m.reactions ?? []).length ? (
          <View style={{ flexDirection: "row", marginTop: 4, gap: 4, alignSelf: mine ? "flex-end" : "flex-start" }}>
            {(m.reactions ?? []).map((r, i) => (
              <Press key={`${r.userId}-${i}`} onPress={() => useWippStore.getState().addReaction(chatId, m.id, r.emoji)}>
                <Text style={{ fontSize: 12 }}>{r.emoji}</Text>
              </Press>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header
          title={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0, maxWidth: "100%" }}>
                {chat.type === "group" ? (
                  <Press onPress={() => push({ name: "chat-info", chatId })}>
                    <GroupAvatar users={chat.participantIds.filter((id) => id !== "me").map((id) => users[id])} size={32} fallback={chat.avatar} />
                  </Press>
                ) : (
                  <Press
                    accessibilityLabel={headerRing === "none" ? "Voir le profil" : "Voir la story"}
                    onPress={() => {
                      if (headerRing !== "none" && peer) push({ name: "stories", userId: peer.id });
                      else push({ name: "chat-info", chatId });
                    }}
                  >
                    <Avatar user={shop && shopFace ? shopFace : peer} size={32} ring={headerRing} />
                  </Press>
                )}
                <Press onPress={() => push({ name: "chat-info", chatId })} style={{ minWidth: 0, flexShrink: 1, flex: 1 }}>
                <View style={{ minWidth: 0, flexShrink: 1, flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: compact ? 15 : 16, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
                      {title}
                    </Text>
                    {shop ? (
                      <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.accent, fontFamily: "Inter_500Medium" }}>Professionnel</Text>
                      </View>
                    ) : null}
                    {!sealed ? <Lock size={12} color={colors.muted} /> : null}
                  </View>
                  {subtitle ? (
                    <Text numberOfLines={1} style={{ fontSize: 11, color: typing ? colors.accent : colors.muted }}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                </Press>
            </View>
          }
          onBack={pop}
          right={
            <View style={{ flexDirection: "row", flexShrink: 0 }}>
              {canCall ? (
                <IconBtn size={headerIcon} label={t("audioCall") ?? "Appel"} onPress={() => push({ name: "active-call", userId: chat.type === "group" ? chat.id : peer!.id, kind: "audio", dir: "out", group: chat.type === "group", chatId: chat.type === "group" ? chat.id : undefined })}>
                  <Phone size={20} color={colors.fg} />
                </IconBtn>
              ) : null}
              {canCall ? (
                <IconBtn size={headerIcon} label={t("videoCall") ?? "Caméra"} onPress={() => push({ name: "active-call", userId: chat.type === "group" ? chat.id : peer!.id, kind: "video", dir: "out", group: chat.type === "group", chatId: chat.type === "group" ? chat.id : undefined })}>
                  <Video size={20} color={colors.fg} />
                </IconBtn>
              ) : null}
              {!sealed && !compact ? (
                <IconBtn size={headerIcon} label="Plus" onPress={() => push({ name: "chat-info", chatId })}>
                  <MoreHorizontal size={20} color={colors.fg} />
                </IconBtn>
              ) : null}
            </View>
          }
        />
      </GlassHeader>
      {pinned.length ? (
        <Press onPress={() => jumpTo(pinned[0]!.id)} style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 10, backgroundColor: colors.glassCard, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 13 }}>
            Épinglé · {pinned[0]?.text || "Média"}
          </Text>
        </Press>
      ) : null}
      {!sealed && chat?.type !== "group" ? (
        <Press onPress={() => push({ name: "e2e-info", chatId })} style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 4, borderRadius: 12, backgroundColor: colors.glassCard, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", gap: 8 }}>
          <Lock size={14} color={colors.accent} />
          <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.muted }}>{t("e2eBanner")}</Text>
        </Press>
      ) : null}
      {!sealed && chat?.type === "group" ? (
        <Press onPress={() => push({ name: "e2e-info", chatId })} style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 4, borderRadius: 12, backgroundColor: colors.glassCard, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}>Groupe non chiffré de bout en bout</Text>
        </Press>
      ) : null}
      {shop ? (
        <View style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 14, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ color: "rgba(249,250,251,0.72)", fontSize: 13, lineHeight: 18 }}>
            {shop.ownerId === "me"
              ? `Un client vous écrit à propos de ${shop.name}.`
              : `Ce compte représente une activité professionnelle sur WIPP. Vous discutez avec ${shop.name}.`}
          </Text>
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onStartReached={() => void useWippStore.getState().loadOlderMessages(chatId)}
          onStartReachedThreshold={0.2}
        />
        {sealed ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Lock size={16} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t("sealedKeepsNone")}</Text>
          </View>
        ) : (
          <View style={{ paddingBottom: stickerBar ? 0 : Math.max(insets.bottom, 8) }}>
            {reply || editing ? (
              <View style={{ marginHorizontal: 12, marginBottom: 4, borderRadius: 12, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.accent }}>{editing ? "Modifier" : "Réponse"}</Text>
                  <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>
                    {(editing ?? reply)?.text}
                  </Text>
                </View>
                <Press onPress={() => { setReply(null); setEditing(null); }}>
                  <X size={16} color={colors.muted} />
                </Press>
              </View>
            ) : null}
            {emojiBar ? (
              <FlatList
                horizontal
                data={QUICK_MOJI}
                keyExtractor={(s) => s.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4 }}
                renderItem={({ item }) => (
                  <Press
                    onPress={() => sendMessage(chatId, { type: "sticker", text: item.labelFr, stickerId: item.id })}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                  >
                    <WippSticker id={item.id} size={40} />
                  </Press>
                )}
              />
            ) : null}
            {chat.type === "group" && /@[\w]*$/.test(draft) ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
                {chat.participantIds
                  .filter((id) => id !== "me" && users[id]?.username)
                  .filter((id) => {
                    const q = /@([\w]*)$/.exec(draft)?.[1]?.toLowerCase() ?? "";
                    return users[id].username.toLowerCase().startsWith(q);
                  })
                  .slice(0, 8)
                  .map((id) => (
                    <Press
                      key={id}
                      onPress={() => {
                        const next = draft.replace(/@[\w]*$/, `@${users[id].username} `);
                        setDraftPersist(next);
                      }}
                      style={{ paddingVertical: 8 }}
                    >
                      <Text style={{ color: colors.fg }}>@{users[id].username}</Text>
                    </Press>
                  ))}
              </ScrollView>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: compact ? 2 : 4, paddingHorizontal: compact ? 6 : 8, paddingTop: 6 }}>
              <Press
                accessibilityLabel="Plus"
                onPress={() => openShare("share")}
                onLongPress={() => openShare("compose")}
                style={{ width: composerIcon, height: composerIcon, flexShrink: 0, marginBottom: 4, borderRadius: composerIcon / 2, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}
              >
                <Plus size={tablet ? 24 : 20} color={colors.fg} />
              </Press>
              <Press
                accessibilityLabel={t("viewOnce")}
                onPress={() => setViewOnce((v) => !v)}
                style={{ width: composerIcon, height: composerIcon, flexShrink: 0, marginBottom: 4, alignItems: "center", justifyContent: "center" }}
              >
                <Eye size={tablet ? 22 : 18} color={viewOnce ? colors.accent : colors.muted} />
              </Press>
              <View style={{ flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "flex-end", borderRadius: 22, backgroundColor: colors.surface2 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraftPersist}
                  placeholder={t("writeMessage")}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={{ flex: 1, minWidth: 0, minHeight: 44, maxHeight: 112, paddingHorizontal: 14, paddingVertical: 10, color: colors.fg, fontSize: 15 }}
                />
                <Press
                  onPress={() => {
                    if (compact) {
                      Keyboard.dismiss();
                      setEmojiBar(false);
                      setStickerBar((v) => !v);
                    } else {
                      setStickerBar(false);
                      setEmojiBar((v) => !v);
                    }
                  }}
                  style={{ width: composerIcon, height: composerIcon, flexShrink: 0, marginRight: 4, marginBottom: 4, alignItems: "center", justifyContent: "center" }}
                >
                  {compact ? (
                    <Image source={composerSticker} style={{ width: composerArt, height: composerArt, opacity: stickerBar ? 1 : 0.92 }} contentFit="contain" />
                  ) : (
                    <Smile size={tablet ? 22 : 20} color={emojiBar ? colors.accent : colors.muted} />
                  )}
                </Press>
              </View>
              {!compact || tablet ? (
                <Press
                  accessibilityLabel="Stickers"
                  onPress={() => {
                    Keyboard.dismiss();
                    setEmojiBar(false);
                    setStickerBar((v) => !v);
                  }}
                  style={{ width: composerIcon, height: composerIcon, flexShrink: 0, marginBottom: 4, alignItems: "center", justifyContent: "center" }}
                >
                  <Image source={composerSticker} style={{ width: composerArt, height: composerArt, opacity: stickerBar ? 1 : 0.92 }} contentFit="contain" />
                </Press>
              ) : null}
              <Press
                accessibilityLabel={t("shareCamera") ?? "Caméra"}
                onPress={() => void pickCamera()}
                style={{ width: composerIcon, height: composerIcon, flexShrink: 0, marginBottom: 4, alignItems: "center", justifyContent: "center" }}
              >
                <Camera size={tablet ? 24 : 20} color={colors.fg} />
              </Press>
              {draft.trim() ? (
                <Press
                  onPress={sendDraft}
                  style={{ width: composerIcon, height: composerIcon, flexShrink: 0, marginBottom: 4, borderRadius: composerIcon / 2, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}
                >
                  <Send size={tablet ? 22 : 18} color={colors.accentFg} />
                </Press>
              ) : (
                <VoiceHoldButton
                  size={composerIcon}
                  onSend={(rec) => {
                    const id = sendMessage(chatId, {
                      type: "voice",
                      audioUrl: rec.uri,
                      duration: Math.round(rec.durationMs / 1000),
                      mediaState: "preparing",
                    });
                    startUpload({
                      chatId,
                      messageId: id,
                      blobUrl: rec.uri,
                      kind: "voice",
                      mime: "audio/m4a",
                      durationMs: rec.durationMs,
                    });
                  }}
                />
              )}
            </View>
            {stickerBar ? (
              <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
                <StickerTray
                  onPick={(s) => {
                    sendMessage(chatId, { type: "sticker", text: s.labelFr, stickerId: s.id });
                    setStickerBar(false);
                  }}
                  onSurprise={() => {
                    setStickerBar(false);
                    openShare("compose");
                  }}
                />
              </View>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
      <SurpriseAnimOverlay centered animationId={surprisePlay?.id ?? null} playKey={surprisePlay?.n ?? 0} onDone={() => setSurprisePlay(null)} />
      <WippMomentOverlay stickerId={momentPlay?.id ?? null} playKey={momentPlay?.n ?? 0} onDone={() => setMomentPlay(null)} />
      <ShareSurpriseSheet
        open={shareOpen}
        initialStage={shareStage}
        onClose={() => setShareOpen(false)}
        onShare={(label) => {
          if (label === "Galerie") void pickGallery();
          else if (label === "Caméra") void pickCamera();
          else if (label === "Document") void pickDocument();
          else if (label === "GIF") setGifOpen(true);
          else if (label === "Stickers") {
            setShareOpen(false);
            setStickerBar(true);
          }
          else if (label === "Contact" && peer) {
            sendText(chatId, `👤 ${peer.displayName} @${peer.username}`);
          }
        }}
        onSurprise={(surprise) =>
          sendMessage(chatId, {
            type: "scratch",
            text: surprise.message,
            scratchDesign: surprise.designId ?? "heart",
            scratchCardId: surprise.surpriseType,
            effectId: surprise.animationId ?? undefined,
            duration: surprise.surpriseOptions.countdown?.seconds,
          })
        }
        onStickers={() => {
          setShareOpen(false);
          setStickerBar(true);
        }}
      />
      <Modal visible={gifOpen} transparent animationType="slide" onRequestClose={() => setGifOpen(false)}>
        <Press onPress={() => setGifOpen(false)} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <Press onPress={() => undefined} style={{ backgroundColor: colors.surface, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>
              {gifProviderConfigured() ? "GIF" : GIF_INTEGRATION_PENDING}
            </Text>
            <GifSearch
              onPick={(gif) => {
                sendMessage(chatId, { type: "gif", gifUrl: gif.url, imageUrl: gif.url });
                setGifOpen(false);
              }}
            />
            <Btnish
              label="Importer un GIF local"
              onPress={async () => {
                const res = await DocumentPicker.getDocumentAsync({ type: "image/gif", copyToCacheDirectory: true });
                if (res.canceled || !res.assets?.[0]) return;
                const gif = addLocalGif(res.assets[0].uri);
                const id = sendMessage(chatId, { type: "gif", gifUrl: gif.url, imageUrl: gif.url, mediaState: "preparing" });
                startUpload({ chatId, messageId: id, blobUrl: gif.url, kind: "gif", mime: "image/gif" });
                setGifOpen(false);
              }}
            />
            <ScrollView horizontal style={{ marginTop: 12 }}>
              {loadGifs().map((g) => (
                <Press key={g.id} onPress={() => { sendMessage(chatId, { type: "gif", gifUrl: g.url, imageUrl: g.url }); setGifOpen(false); }}>
                  <Image source={{ uri: g.url }} style={{ width: 72, height: 72, marginRight: 8, borderRadius: 8 }} />
                </Press>
              ))}
            </ScrollView>
          </Press>
        </Press>
      </Modal>
      <Modal visible={Boolean(forwardMsg)} transparent animationType="fade" onRequestClose={() => setForwardMsg(null)}>
        <Press onPress={() => setForwardMsg(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "60%", backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", marginBottom: 12 }}>Transférer</Text>
            <FlatList
              data={chats}
              keyExtractor={(c) => c.id}
              renderItem={({ item: c }) => {
                const p = chatPeer(c, users);
                return (
                  <Press
                    onPress={() => {
                      if (!forwardMsg) return;
                      useWippStore.getState().forwardMessage(c.id, forwardMsg);
                      setForwardMsg(null);
                    }}
                    style={{ paddingVertical: 12 }}
                  >
                    <Text style={{ color: colors.fg }}>{c.name ?? p?.displayName ?? c.preview}</Text>
                  </Press>
                );
              }}
            />
          </View>
        </Press>
      </Modal>
      {viewer ? (
        <MediaViewer
          items={viewer.items}
          start={viewer.start}
          onClose={() => {
            setViewer(null);
            if (viewOnceProtect) {
              popProtect("view_once");
              setViewOnceProtect(false);
            }
          }}
        />
      ) : null}
      <MessageMenu
        open={Boolean(picked)}
        onClose={() => setPicked(null)}
        onReact={picked && !picked.deletedForAll ? (emoji) => useWippStore.getState().addReaction(chatId, picked.id, emoji) : undefined}
        actions={
          picked
            ? [
                ...(!picked.deletedForAll ? [{ key: "reply", label: "Répondre", onSelect: () => setReply(picked) }] : []),
                ...(!picked.deletedForAll && !picked.viewOnce && picked.type !== "system"
                  ? [{ key: "forward", label: "Transférer", onSelect: () => setForwardMsg(picked) }]
                  : []),
                ...(picked.text && picked.type === "text" && !picked.deletedForAll
                  ? [
                      {
                        key: "copy",
                        label: "Copier",
                        onSelect: () => {
                          if (picked.text) void Clipboard.setStringAsync(picked.text);
                        },
                      },
                      {
                        key: "share",
                        label: "Partager",
                        onSelect: () => {
                          if (picked.text) void shareWippPublic(picked.text);
                        },
                      },
                    ]
                  : []),
                {
                  key: "pin",
                  label: picked.pinned ? "Désépingler" : "Épingler",
                  onSelect: () => useWippStore.getState().pinMessage(chatId, picked.id, !picked.pinned),
                },
                { key: "delete", label: "Supprimer pour moi", danger: true, onSelect: () => useWippStore.getState().deleteMessage(chatId, picked.id) },
                ...(picked.fromId === "me" && picked.type === "text" && !picked.deletedForAll && Date.now() - picked.createdAt < EDIT_WINDOW_MS
                  ? [
                      {
                        key: "edit",
                        label: "Modifier",
                        onSelect: () => {
                          setEditing(picked);
                          setDraftPersist(picked.text ?? "");
                        },
                      },
                    ]
                  : []),
                ...(picked.fromId === "me" && !picked.deletedForAll
                  ? [{ key: "delete-all", label: "Supprimer pour tout le monde", danger: true, onSelect: () => useWippStore.getState().tombstoneMessage(chatId, picked.id) }]
                  : []),
                ...(picked.fromId !== "me"
                  ? [
                      {
                        key: "report",
                        label: "Signaler le message",
                        onSelect: () => {
                          Alert.alert(
                            "Signaler le message",
                            "Le contenu chiffré n’est pas copié. Seuls l’identifiant du message et la raison sont envoyés.",
                            [
                              ...["Contenu inapproprié", "Harcèlement", "Spam ou arnaque", "Autre"].map((reason) => ({
                                text: reason,
                                onPress: () => {
                                  void import("../lib/safety").then(({ submitContentReport }) =>
                                    submitContentReport({
                                      contentType: "message",
                                      contentId: picked.id,
                                      targetProfileId: picked.fromId,
                                      reason,
                                    }),
                                  ).then(
                                    () => Alert.alert("Signalement", "Signalement envoyé."),
                                    (err) => Alert.alert("Signalement", err instanceof Error ? err.message : "Signalement impossible."),
                                  );
                                },
                              })),
                              { text: "Annuler", style: "cancel" as const },
                            ],
                          );
                        },
                      },
                      {
                        key: "block",
                        label: "Bloquer cet utilisateur",
                        danger: true,
                        onSelect: () => {
                          Alert.alert("Bloquer", "Bloquer cet utilisateur ?", [
                            { text: "Annuler", style: "cancel" },
                            {
                              text: "Bloquer",
                              style: "destructive",
                              onPress: () => {
                                useWippStore.getState().blockUser(picked.fromId);
                                pop();
                              },
                            },
                          ]);
                        },
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </ScreenRoot>
  );
}

function Btnish({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ marginTop: 12, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
    </Press>
  );
}

function GifSearch({ onPick }: { onPick: (gif: LocalGif) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LocalGif[]>(() => loadGifs());
  const [note, setNote] = useState(gifProviderConfigured() ? "" : "Ajoute EXPO_PUBLIC_GIF_API_KEY pour Tenor. Aucune clé n’est dans l’application.");
  return (
    <View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Rechercher un GIF"
        placeholderTextColor={colors.muted}
        onSubmitEditing={() => {
          void searchGifs(q)
            .then((rows) => {
              setHits(rows.length ? rows : loadGifs());
              if (!gifProviderConfigured()) setNote("GIF PROVIDER CREDENTIAL = EXTERNAL BLOCKER");
            })
            .catch(() => setNote("Recherche GIF impossible."));
        }}
        style={{ marginTop: 8, height: 40, borderRadius: 8, backgroundColor: colors.surface2, color: colors.fg, paddingHorizontal: 10 }}
      />
      {note ? <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>{note}</Text> : null}
      <ScrollView horizontal style={{ marginTop: 12 }}>
        {hits.map((g) => (
          <Press key={g.id} onPress={() => onPick(g)}>
            <Image source={{ uri: g.url }} style={{ width: 72, height: 72, marginRight: 8, borderRadius: 8 }} />
          </Press>
        ))}
      </ScrollView>
    </View>
  );
}

export function E2eInfoScreen({ chatId }: { chatId: string }) {
  const pop = useWippStore((s) => s.pop);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Chiffrement de bout en bout" onBack={pop} />
      </GlassHeader>
      <Text style={{ padding: 16, color: colors.muted, lineHeight: 20 }}>
        {chatId.includes(":g_") || chatId.startsWith("g_")
          ? "Les groupes ne sont pas chiffrés de bout en bout. GROUP E2EE — PENDING. Les messages directs conservent leur chiffrement."
          : "Les conversations privées (DM) prises en charge par le système E2EE de WIPP sont chiffrées. WIPP ne conserve pas les clés privées de manière à lire ces messages."}
      </Text>
    </ScreenRoot>
  );
}
