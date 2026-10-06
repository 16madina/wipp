import { Modal, ScrollView, Text, View } from "react-native";
import { colors } from "../theme";
import { Press } from "./ui";

export type MessageMenuAction = {
  key: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

const REACT_EMOJI = ["❤️", "😂", "😮", "😢", "🙏", "🔥"];

export function MessageMenu({
  open,
  actions,
  onClose,
  onReact,
}: {
  open: boolean;
  actions: MessageMenuAction[];
  onClose: () => void;
  onReact?: (emoji: string) => void;
}) {
  if (!open) return null;
  const primaryKeys = ["copy", "share", "reply"];
  const primary = primaryKeys.map((key) => actions.find((a) => a.key === key)).filter((a): a is MessageMenuAction => Boolean(a));
  const extra = actions.filter((a) => !primary.some((p) => p.key === a.key));
  const shown = [...primary, ...extra];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Press onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 }}>
        <Press onPress={() => undefined} style={{ maxWidth: 320, width: "100%", alignSelf: "center" }}>
          {onReact ? (
            <View
              style={{
                marginBottom: 8,
                height: 48,
                borderRadius: 999,
                backgroundColor: colors.menu,
                borderWidth: 1,
                borderColor: colors.hair,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-around",
                paddingHorizontal: 6,
              }}
            >
              {REACT_EMOJI.map((emoji) => (
                <Press
                  key={emoji}
                  onPress={() => {
                    onClose();
                    onReact(emoji);
                  }}
                  style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </Press>
              ))}
            </View>
          ) : null}
          <View style={{ borderRadius: 14, backgroundColor: colors.menu, borderWidth: 1, borderColor: colors.hair, overflow: "hidden", maxHeight: 340 }}>
            <ScrollView bounces={false}>
              {shown.map((action) => (
                <Press
                  key={action.key}
                  onPress={() => {
                    onClose();
                    action.onSelect();
                  }}
                  style={{ minHeight: 48, paddingHorizontal: 16, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.hair }}
                >
                  <Text style={{ fontSize: 15, color: action.danger ? colors.danger : colors.fg }}>{action.label}</Text>
                </Press>
              ))}
            </ScrollView>
          </View>
        </Press>
      </Press>
    </Modal>
  );
}
