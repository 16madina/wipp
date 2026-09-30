import * as Haptics from "expo-haptics";

export function haptic(kind: "tap" | "select" | "success" | "connect" | "warn" | "error" = "tap") {
  if (kind === "success" || kind === "connect") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  if (kind === "warn") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  if (kind === "error") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return;
  }
  void Haptics.impactAsync(
    kind === "select" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
  );
}
