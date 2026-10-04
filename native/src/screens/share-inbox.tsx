import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useShareIntentContext } from "expo-share-intent";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Avatar } from "../components/Avatar";
import { Btn, GlassHeader, Header, Press, ScreenRoot } from "../components/ui";
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
        style={{ width: "100%", height: 220, borderRadius: 12 }}
        contentFit="cover"
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

export function ShareInboxScreen() {
  const pop = useWippStore((s) => s.pop);
  const chats = useWippStore((s) => s.chats);
  const users = useWippStore((s) => s.users);
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<ShareDraft[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
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

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return chats
      .filter(
        (chat) => chat.id.startsWith("srv:") && !isChatSealed(chat) && !isPrivateChat(chat.id),
      )
      .filter((chat) => !needle || titleOf(chat, users).toLowerCase().includes(needle))
      .sort((a, b) => b.lastAt - a.lastAt);
  }, [chats, q, users]);

  function cancel() {
    resetShareIntent(true);
    pop();
  }

  function send() {
    if (!drafts?.length || !chatId || sending) return;
    setSending(true);
    const sendMessage = useWippStore.getState().sendMessage;
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
        startUpload({
          chatId,
          messageId: id,
          blobUrl: draft.uri,
          kind: draft.kind,
          mime: draft.mime,
          name: draft.name,
        });
      }
    }
    resetShareIntent(true);
    useWippStore.getState().replace({ name: "conversation", chatId });
  }

  const selected = rows.find((chat) => chat.id === chatId);

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Envoyer sur WIPP" onBack={cancel} />
      </GlassHeader>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{ borderRadius: 16, backgroundColor: colors.navy, padding: 12, minHeight: 80 }}
        >
          {drafts ? (
            drafts.length > 1 ? (
              <Grid drafts={drafts} />
            ) : (
              <Preview draft={drafts[0]} />
            )
          ) : (
            <Text style={{ color: colors.muted }}>{error || "Lecture…"}</Text>
          )}
          {drafts && drafts.length > 1 ? (
            <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>
              {drafts.length} éléments
              {skipped
                ? ` · ${skipped} ignoré${skipped > 1 ? "s" : ""} (format non pris en charge, trop lourd ou plus de 10)`
                : ""}
            </Text>
          ) : skipped ? (
            <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>
              {skipped} élément{skipped > 1 ? "s" : ""} ignoré{skipped > 1 ? "s" : ""}
            </Text>
          ) : null}
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher une conversation"
          placeholderTextColor={colors.muted}
          style={{
            marginTop: 16,
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.navy,
            color: colors.fg,
            paddingHorizontal: 14,
          }}
        />
        {rows.length === 0 ? (
          <Text style={{ marginTop: 20, color: colors.muted }}>
            Aucune conversation pour ce contenu.
          </Text>
        ) : (
          rows.map((chat) => {
            const peer = chat.type === "group" ? undefined : chatPeer(chat, users);
            const on = chat.id === chatId;
            return (
              <Press
                key={chat.id}
                onPress={() => setChatId(chat.id)}
                style={{
                  marginTop: 8,
                  minHeight: 56,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: on ? colors.accent : colors.navy,
                }}
              >
                <Avatar user={peer ?? { displayName: titleOf(chat, users) }} size={36} />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: on ? colors.accentFg : colors.fg,
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  {titleOf(chat, users)}
                </Text>
              </Press>
            );
          })
        )}
        {error && drafts ? (
          <Text style={{ marginTop: 12, color: colors.danger }}>{error}</Text>
        ) : null}
        <Btn label="Annuler" variant="secondary" onPress={cancel} style={{ marginTop: 20 }} />
        <Btn
          label={
            sending
              ? "Envoi…"
              : selected
                ? `Envoyer${drafts && drafts.length > 1 ? ` (${drafts.length})` : ""} à ${titleOf(selected, users)}`
                : "Choisir une conversation"
          }
          disabled={!drafts?.length || !chatId || sending}
          onPress={send}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </ScreenRoot>
  );
}
