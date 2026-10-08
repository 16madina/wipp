import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";

const APP_GROUP = "group.com.wipp.app";
const saved = new Set<string>();

/** Same name the notification extension looks for (NotificationService.swift, WippPhoto.fileName). */
export function notifPhotoName(path: string) {
  return `${path.replace(/[^A-Za-z0-9]/g, "_").slice(-120)}.img`;
}

/**
 * Keeps a copy of a profile / group photo in the App Group, so the iOS notification can show it
 * (the server never sends the picture). Paths change when the photo changes, so a file is never stale.
 */
export function keepPhotoForNotifications(path: string, signedUrl: string) {
  if (Platform.OS !== "ios" || saved.has(path) || !signedUrl.startsWith("https://")) return;
  saved.add(path);
  void (async () => {
    try {
      const root = Paths.appleSharedContainers?.[APP_GROUP];
      if (!root) return;
      const dir = new Directory(root, "wpic");
      if (!dir.exists) dir.create({ intermediates: true });
      const file = new File(dir, notifPhotoName(path));
      if (file.exists) return;
      await File.downloadFileAsync(signedUrl, file);
    } catch {
      saved.delete(path);
    }
  })();
}
