import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import { Sheet } from "./card-editor-parts";
import { colors } from "../theme";
import { formatFullStamp } from "../lib/format";
import type { Message, User } from "../lib/types";

const FACES = 3;
const FACE = 18;

/**
 * Group status of my own message, like WhatsApp: « reçu » when every other member received it,
 * « lu » when every other member read it. Sending / failed stay as they are.
 */
export function groupStatus(m: Message, otherMembers: number): Message["status"] {
  if (m.status === "sending" || m.status === "failed" || !m.seen || otherMembers <= 0) return m.status;
  const read = m.seen.filter((s) => s.readAt).length;
  const delivered = m.seen.filter((s) => s.deliveredAt || s.readAt).length;
  if (read >= otherMembers) return "read";
  if (delivered >= otherMembers) return "delivered";
  return "sent";
}

/** Small faces of the members who read my group message + an arrow; tap opens the full list. */
export function ReadByFaces({ m, users, memberIds }: { m: Message; users: Record<string, User>; memberIds: string[] }) {
  const [open, setOpen] = useState(false);
  const inGroup = new Set(memberIds);
  const seen = (m.seen ?? []).filter((s) => inGroup.has(s.userId) || users[s.userId]);
  const readers = seen.filter((s) => s.readAt).sort((a, b) => (a.readAt ?? 0) - (b.readAt ?? 0));
  if (!readers.length) return null;
  const receivedOnly = seen.filter((s) => !s.readAt && s.deliveredAt).sort((a, b) => (a.deliveredAt ?? 0) - (b.deliveredAt ?? 0));
  const waiting = memberIds.filter((id) => id !== "me" && !seen.some((s) => s.userId === id));
  const extra = readers.length - FACES;

  const row = (userId: string, when: number | undefined, key: string) => {
    const u = users[userId];
    return (
      <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
        <Avatar user={u ?? { displayName: "?" }} size={40} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{u?.displayName || (u?.username ? `@${u.username}` : "Membre")}</Text>
          {u?.username ? <Text style={{ color: colors.muted, fontSize: 12 }}>@{u.username}</Text> : null}
        </View>
        {when ? <Text style={{ color: colors.muted, fontSize: 12 }}>{formatFullStamp(when, "fr")}</Text> : null}
      </View>
    );
  };

  return (
    <>
      <Press
        onPress={() => setOpen(true)}
        accessibilityLabel={`Lu par ${readers.length} membre${readers.length > 1 ? "s" : ""}. Voir la liste`}
        style={{ flexDirection: "row", alignItems: "center", marginRight: 2, paddingVertical: 4, paddingLeft: 6 }}
      >
        <View style={{ flexDirection: "row" }}>
          {readers.slice(0, FACES).map((r, i) => (
            <View key={r.userId} style={{ marginLeft: i ? -5 : 0, borderRadius: FACE, borderWidth: 1.5, borderColor: colors.bg, zIndex: FACES - i }}>
              <Avatar user={users[r.userId] ?? { displayName: "?" }} size={FACE} />
            </View>
          ))}
        </View>
        {extra > 0 ? <Text style={{ marginLeft: 3, color: colors.muted, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>+{extra}</Text> : null}
        <ChevronRight size={12} color={colors.muted} style={{ marginLeft: 1 }} />
      </Press>
      <Sheet open={open} title="Infos du message" onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: 460 }}>
          <Text style={{ color: colors.accent, fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 }}>Lu par · {readers.length}</Text>
          {readers.map((r) => row(r.userId, r.readAt, `r-${r.userId}`))}
          {receivedOnly.length ? (
            <>
              <Text style={{ color: colors.muted, fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 14, marginBottom: 2 }}>Reçu par · {receivedOnly.length}</Text>
              {receivedOnly.map((r) => row(r.userId, r.deliveredAt, `d-${r.userId}`))}
            </>
          ) : null}
          {waiting.length ? (
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 14 }}>
              Pas encore reçu par {waiting.length} membre{waiting.length > 1 ? "s" : ""}.
            </Text>
          ) : null}
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 14, lineHeight: 15 }}>
            Une personne qui a désactivé les accusés de lecture apparaît seulement dans « Reçu par ».
          </Text>
        </ScrollView>
      </Sheet>
    </>
  );
}
