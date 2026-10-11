import { getShareExtensionKey } from "expo-share-intent";

/**
 * The share extension opens WIPP with « wipp://dataUrl=wippShareKey#media ». That is not a page: without
 * this, the router looks for a screen of that name and shows a blank one. Send it to the app's only page;
 * ShareIntentProvider reads the shared content from the same link.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return path.includes(`dataUrl=${getShareExtensionKey({ scheme: "wipp" })}`) ? "/" : path;
  } catch {
    return "/";
  }
}
