import { Share } from "react-native";
import { isShareSafe } from "./share-safe";

export { isPublicWippUrl, isShareSafe } from "./share-safe";

export async function shareWippPublic(message: string, url?: string) {
  const combined = url ? `${message} ${url}` : message;
  if (!isShareSafe(combined)) {
    if (__DEV__) console.warn("[wipp] share blocked: payload looks sensitive");
    return { blocked: true as const };
  }
  await Share.share(url ? { message, url } : { message });
  return { blocked: false as const };
}
