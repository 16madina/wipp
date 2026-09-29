import * as Haptics from "expo-haptics";

export function haptic(kind: "tap" | "select" | "success" | "connect" = "tap") {
  if (kind === "success" || kind === "connect") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  void Haptics.impactAsync(
    kind === "select" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
  );
}
