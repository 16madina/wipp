import { Platform } from "react-native";

if (Platform.OS !== "web") {
  const { registerGlobals } = require("@livekit/react-native") as typeof import("@livekit/react-native");
  // Must run before any LiveKit room is created. No API secret is read here.
  registerGlobals();
}
