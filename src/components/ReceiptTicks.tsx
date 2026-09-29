import { Text, View } from "react-native";
import type { Message } from "../lib/types";
import { colors } from "../theme";

export function ReceiptTicks({ status }: { status: Message["status"] }) {
  if (status === "failed") {
    return (
      <Text style={{ fontSize: 11, color: colors.danger, marginLeft: 4 }}>!</Text>
    );
  }
  const color = status === "read" ? colors.accent : colors.muted;
  const pair = status === "delivered" || status === "read";
  return (
    <View style={{ marginLeft: 4, flexDirection: "row", alignItems: "center" }}>
      <Text style={{ fontSize: 11, color, letterSpacing: -2 }}>{pair ? "✓✓" : status === "sending" ? "…" : "✓"}</Text>
    </View>
  );
}
