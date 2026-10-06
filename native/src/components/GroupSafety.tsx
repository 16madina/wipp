import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ShieldAlert } from "lucide-react-native";
import { Press } from "./ui";
import { colors } from "../theme";
import { useWippStore } from "../lib/store";
import type { GroupSafety } from "../lib/lot7/api";

export const GROUP_REPORT_REASONS = ["Spam ou arnaque", "Harcèlement", "Contenu inapproprié", "Je ne connais pas ce groupe", "Autre"] as const;

const okKey = (serverId: string) => `wipp.groupSafeOk.${serverId.replace(/[^A-Za-z0-9._-]/g, "")}`;

async function wasDismissed(serverId: string) {
  try {
    return (await SecureStore.getItemAsync(okKey(serverId))) === "1";
  } catch {
    return false;
  }
}

async function dismiss(serverId: string) {
  try {
    await SecureStore.setItemAsync(okKey(serverId), "1");
  } catch {
    /* web / no keychain: the banner just comes back next time */
  }
}

/**
 * Ask for a reason, then report the group (id + reason only — never messages).
 * With `leave`, the group is also left and closed on this phone.
 */
export function reportGroupFlow(chatId: string, serverId: string, name: string | undefined, leave: boolean) {
  Alert.alert(
    leave ? "Signaler et quitter" : "Signaler le groupe",
    `${leave ? `Tu vas quitter « ${name ?? "ce groupe"} ». ` : ""}Seuls le groupe et la raison sont envoyés à la modération, jamais les messages.`,
    [
      ...GROUP_REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () => {
          void import("../lib/lot7/api")
            .then(({ reportGroup }) => reportGroup(serverId, reason, leave))
            .then(
              () => {
                if (leave) {
                  void dismiss(serverId);
                  useWippStore.setState((s) => ({ chats: s.chats.filter((c) => c.id !== chatId) }));
                  useWippStore.getState().goTab("chats");
                  Alert.alert("Signalement", "Groupe signalé. Tu as quitté le groupe.");
                } else {
                  Alert.alert("Signalement", "Groupe signalé. Merci, la modération va vérifier.");
                }
              },
              () => Alert.alert("Signalement", "Signalement impossible pour le moment."),
            );
        },
      })),
      { text: "Annuler", style: "cancel" as const },
    ],
  );
}

/**
 * WhatsApp-style safety banner: shown when someone added me to the group, until I tap « Rester »
 * (or report and leave). Stronger wording when that person is not one of my contacts.
 */
export function GroupSafetyBanner({ chatId, serverId, name }: { chatId: string; serverId: string; name?: string }) {
  const [info, setInfo] = useState<GroupSafety | null>(null);

  useEffect(() => {
    let live = true;
    setInfo(null);
    void (async () => {
      if (await wasDismissed(serverId)) return;
      const { groupSafety } = await import("../lib/lot7/api");
      const res = await groupSafety(serverId).catch(() => null);
      if (live && res) setInfo(res);
    })();
    return () => {
      live = false;
    };
  }, [serverId]);

  if (!info) return null;
  const who = info.username ? `@${info.username}` : info.displayName || "Quelqu’un";
  return (
    <View style={{ marginHorizontal: 12, marginTop: 8, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: info.isContact ? colors.hair : colors.danger, padding: 14 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <ShieldAlert size={20} color={info.isContact ? colors.accent : colors.danger} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{who} t’a ajouté à ce groupe</Text>
          <Text style={{ marginTop: 3, color: colors.muted, fontSize: 12.5, lineHeight: 17 }}>
            {info.isContact
              ? "Tu ne veux pas faire partie de ce groupe ? Tu peux le signaler et le quitter."
              : "Cette personne n’est pas dans tes contacts. Si ce groupe ne te dit rien, signale-le et quitte-le."}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Press
          onPress={() => reportGroupFlow(chatId, serverId, name, true)}
          style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.danger }}
        >
          <Text style={{ color: colors.danger, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Signaler et quitter</Text>
        </Press>
        <Press
          onPress={() => {
            void dismiss(serverId);
            setInfo(null);
          }}
          style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: colors.accent }}
        >
          <Text style={{ color: colors.accentFg, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Rester</Text>
        </Press>
      </View>
    </View>
  );
}
