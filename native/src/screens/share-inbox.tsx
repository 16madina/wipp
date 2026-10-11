import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useShareIntentContext } from "expo-share-intent";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Plus, Search } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { Btn, GlassHeader, Header, Press, ScreenRoot } from "../components/ui";
import { whiteA } from "../theme";
import { draftsFromShare, type ShareDraft } from "../lib/share-inbox";
import { chatPeer, isChatSealed, isPrivateChat, useWippStore } from "../lib/store";
import { startUpload } from "../lib/messaging/send-media";
import { colors } from "../theme";
import { errorText } from "../lib/error-fr";

function titleOf(
  chat: ReturnType<typeof useWippStore.getState>["chats"][number],
  users: ReturnType<typeof useWippStore.getState>["users"],
) {
  if (chat.type === "group") return chat.name || "Groupe";
  return chatPeer(chat, users)?.displayName || "Conversation";
}

function Preview({ draft }: { draft: ShareDraft }) {
  if (draft.kind === "text") {
    return (
      <Text style={{ color: colors.fg, fontSize: 16, lineHeight: 22 }} numberOfLines={8}>
        {draft.text}
      </Text>
    );
  }
  if (draft.kind === "image") {
    return (
      <Image
        source={{ uri: draft.uri }}
        style={{ width: "100%", height: 180, borderRadius: 12 }}
        contentFit="cover"
        transition={150}
      />
    );
  }
  return <VideoPreview uri={draft.uri} />;
}

/** Several photos/videos: a grid of thumbnails (videos get a play badge). */
function Grid({ drafts }: { drafts: ShareDraft[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {drafts.map((d, i) =>
        d.kind === "text" ? null : (
          <View
            key={`${d.uri}-${i}`}
            style={{
              width: "31.5%",
              aspectRatio: 1,
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: "#000",
            }}
          >
            {d.kind === "image" ? (
              <Image
                source={{ uri: d.uri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 26 }}>▶</Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Vidéo</Text>
              </View>
            )}
          </View>
        ),
      )}
    </View>
  );
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.pause();
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 220, borderRadius: 12 }}
      nativeControls
      contentFit="contain"
    />
  );
}

/** How many conversations one share can go to at once. */
const MAX_TARGETS = 5;

export function ShareInboxScreen() {
  const pop = useWippStore((s) => s.pop);
  const chats = useWippStore((s) => s.chats);
  const users = useWippStore((s) => s.users);
  const me = useWippStore((s) => s.me);
  const insets = useSafeAreaInsets();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<ShareDraft[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let live = true;
    void draftsFromShare(shareIntent).then(
      (next) => {
        if (!live) return;
        setDrafts(next.drafts);
        setSkipped(next.skipped);
      },
      (err) => {
        if (live) setError(errorText(err, "Contenu impossible à lire."));
      },
    );
    return () => {
      live = false;
    };
  }, [shareIntent]);

  const all = useMemo(
    () =>
      chats
        .filter((chat) => chat.id.startsWith("srv:") && !isChatSealed(chat) && !isPrivateChat(chat.id))
        .sort((a, b) => b.lastAt - a.lastAt),
    [chats],
  );
  const recent = all.slice(0, 10);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((chat) => titleOf(chat, users).toLowerCase().includes(needle)) : all;
  }, [all, q, users]);

  function cancel() {
    resetShareIntent(true);
    pop();
  }

  function toggle(id: string) {
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= MAX_TARGETS ? list : [...list, id]));
  }

  function send() {
    if (!drafts?.length || !picked.length || sending) return;
    setSending(true);
    const sendMessage = useWippStore.getState().sendMessage;
    for (const chatId of picked) {
      // One message per photo/video, in the order they were shared.
      for (const draft of drafts) {
        if (draft.kind === "text") {
          sendMessage(chatId, { type: "text", text: draft.text });
        } else {
          const id = sendMessage(chatId, {
            type: draft.kind,
            text: "",
            imageUrl: draft.kind === "image" ? draft.uri : undefined,
            videoUrl: draft.kind === "video" ? draft.uri : undefined,
            mediaState: "preparing",
          });
          startUpload({ chatId, messageId: id, blobUrl: draft.uri, kind: draft.kind, mime: draft.mime, name: draft.name });
        }
      }
    }
    resetShareIntent(true);
    // One conversation: open it. Several: back to the list, where each one shows the new message.
    if (picked.length === 1) useWippStore.getState().replace({ name: "conversation", chatId: picked[0]! });
    else pop();
  }

  /** The story composer opens with the shared photo, video or text already in it. */
  function toStory() {
    const first = drafts?.[0];
    if (!first) return;
    const shared = first.kind === "text" ? { kind: "text" as const, text: first.text } : { kind: first.kind, uri: first.uri, mime: first.mime };
    resetShareIntent(true);
    useWippStore.getState().replace({ name: "new-story", shared });
  }

  const sendLabel = sending
    ? "Envoi…"
    : picked.length === 0
      ? "Choisis à qui envoyer"
      : picked.length === 1
        ? `Envoyer à ${titleOf(all.find((c) => c.id === picked[0])!, users)}`
        : `Envoyer à ${picked.length} conversations`;

  const sectionTitle = { marginTop: 22, marginBottom: 10, color: colors.muted, fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, textTransform: "uppercase" } as const;

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Partager sur WIPP" onBack={cancel} />
      </GlassHeader>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ borderRadius: 16, backgroundColor: colors.navy, padding: 10, minHeight: 72, justifyContent: "center", borderWidth: 1, borderColor: colors.hair }}>
          {drafts ? (
            drafts.length > 1 ? (
              <Grid drafts={drafts} />
            ) : drafts[0] ? (
              <Preview draft={drafts[0]} />
            ) : (
              <Text style={{ color: colors.muted }}>Rien à partager.</Text>
            )
          ) : error ? (
            <Text style={{ color: colors.danger }}>{error}</Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, justifyContent: "center" }}>
              <ActivityIndicator color={colors.accent} />
              <Text style={{ color: colors.muted }}>Préparation du contenu…</Text>
            </View>
          )}
          {drafts && (drafts.length > 1 || skipped) ? (
            <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>
              {drafts.length > 1 ? `${drafts.length} éléments` : ""}
              {skipped ? `${drafts.length > 1 ? " · " : ""}${skipped} ignoré${skipped > 1 ? "s" : ""} (format non pris en charge, trop lourd ou plus de 10)` : ""}
            </Text>
          ) : null}
        </View>

        {drafts?.length === 1 ? (
          <Press
            onPress={toStory}
            accessibilityLabel="Publier dans ma story"
            style={{ marginTop: 14, height: 68, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.accent }}
          >
            <View>
              <Avatar user={me} size={44} />
              <View style={{ position: "absolute", right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.navy }}>
                <Plus size={12} color={colors.accentFg} strokeWidth={3} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Ma story</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Visible 24 h par tes contacts</Text>
            </View>
            <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Publier</Text>
          </Press>
        ) : null}

        {recent.length ? (
          <>
            <Text style={sectionTitle}>Récents</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 8 }}>
              {recent.map((chat) => {
                const peer = chat.type === "group" ? undefined : chatPeer(chat, users);
                const on = picked.includes(chat.id);
                return (
                  <Press key={chat.id} onPress={() => toggle(chat.id)} accessibilityLabel={titleOf(chat, users)} style={{ width: 68, alignItems: "center" }}>
                    <View style={{ padding: 3, borderRadius: 34, borderWidth: 2, borderColor: on ? colors.accent : "transparent" }}>
                      <Avatar user={peer ?? { displayName: titleOf(chat, users) }} size={56} />
                      {on ? (
                        <View style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg }}>
                          <Check size={12} color={colors.accentFg} strokeWidth={3} />
                        </View>
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={{ marginTop: 6, maxWidth: 68, color: on ? colors.accent : colors.fg, fontSize: 12, fontFamily: on ? "Inter_600SemiBold" : "Inter_400Regular" }}>
                      {titleOf(chat, users)}
                    </Text>
                  </Press>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Text style={sectionTitle}>Toutes les conversations</Text>
        <View style={{ height: 46, borderRadius: 23, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.hair, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Search size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.fg, fontSize: 15 }} />
        </View>
        {rows.length === 0 ? (
          <Text style={{ marginTop: 20, color: colors.muted, textAlign: "center" }}>{q.trim() ? "Aucune conversation à ce nom." : "Aucune conversation pour l’instant."}</Text>
        ) : (
          <View style={{ marginTop: 10, borderRadius: 16, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.hair, overflow: "hidden" }}>
            {rows.map((chat, index) => {
              const peer = chat.type === "group" ? undefined : chatPeer(chat, users);
              const on = picked.includes(chat.id);
              return (
                <Press
                  key={chat.id}
                  onPress={() => toggle(chat.id)}
                  style={{ minHeight: 60, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: index ? 1 : 0, borderTopColor: colors.hair, backgroundColor: on ? whiteA(0.05) : "transparent" }}
                >
                  <Avatar user={peer ?? { displayName: titleOf(chat, users) }} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_500Medium" }}>
                      {titleOf(chat, users)}
                    </Text>
                    {chat.type === "group" ? <Text style={{ color: colors.muted, fontSize: 12 }}>Groupe</Text> : null}
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.accent : colors.muted, backgroundColor: on ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {on ? <Check size={14} color={colors.accentFg} strokeWidth={3} /> : null}
                  </View>
                </Press>
              );
            })}
          </View>
        )}
        {picked.length >= MAX_TARGETS ? <Text style={{ marginTop: 10, color: colors.muted, fontSize: 12, textAlign: "center" }}>{MAX_TARGETS} conversations au maximum à la fois.</Text> : null}
      </ScrollView>
      {/* The send button stays at the bottom, whatever the length of the list. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: colors.hair, backgroundColor: colors.bg }}>
        <Btn label={sendLabel} disabled={!drafts?.length || !picked.length || sending} onPress={send} />
      </View>
    </ScreenRoot>
  );
}
