import { Platform } from "react-native";

/**
 * WIPP Studio (paid Wippmoji / WippPop packs) is not in the iPhone app for now: Apple approves 1.0 without
 * in-app purchases, and the Studio comes back on iPhone with them in a later version. Packs already made
 * still show and can be sent. Fixed in the build on purpose (no server switch).
 */
export const STUDIO_AVAILABLE = Platform.OS !== "ios";
