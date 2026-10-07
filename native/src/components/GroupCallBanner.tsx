import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Phone, Video } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import { colors } from "../theme";
import { useWippStore } from "../lib/store";
import { useCallSession } from "../lib/calls/session";
import type { ActiveGroupCall } from "../lib/calls/livekit-client";

/** « Appel en cours · Rejoindre » at the top of a group conversation while a group call is live. */
export function GroupCallBanner({ chatId }: { chatId: string }) {
  const [call, setCall] = useState<ActiveGroupCall | null>(null);
  const users = useWippStore((s) => s.users);
  const liveCallId = useCallSession((s) => s.session?.callId);

  useEffect(() => {
    let live = true;
    const tick = () =>
      void import("../lib/calls/livekit-client")
        .then(({ activeGroupCall }) => activeGroupCall(chatId))
        .then((res) => live && setCall(res.call))
        .catch(() => undefined);
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [chatId]);

  if (!call) return null;
  const inThisCall = liveCallId === call.id;
  const faces = call.participantIds.slice(0, 4).map((id) => users[`srvuser:${id}`]);
  const Icon = call.kind === "video" ? Video : Phone;
  return (
    <View style={{ marginHorizontal: 12, marginTop: 8, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={colors.accentFg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{call.kind === "video" ? "Appel vidéo en cours" : "Appel audio en cours"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          {faces.map((u, i) => (
            <View key={i} style={{ marginLeft: i ? -6 : 0, borderRadius: 12, borderWidth: 1.5, borderColor: colors.surface }}>
              <Avatar user={u ?? { displayName: "?" }} size={20} />
            </View>
          ))}
          <Text style={{ marginLeft: 6, color: colors.muted, fontSize: 12 }}>
            {call.participantIds.length} participant{call.participantIds.length > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
      <Press
        onPress={() => {
          if (inThisCall) {
            useCallSession.getState().patch({ pip: false });
            return;
          }
          void import("../lib/calls/session").then(({ joinGroupCall }) => joinGroupCall({ callId: call.id, chatId, kind: call.kind }));
        }}
        style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.accent }}
      >
        <Text style={{ color: colors.accentFg, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{inThisCall ? "Retour à l’appel" : "Rejoindre"}</Text>
      </Press>
    </View>
  );
}
