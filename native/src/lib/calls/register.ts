import { Platform } from "react-native";
import { registerGlobals } from "@livekit/react-native";

if (Platform.OS !== "web") {
  // Must run before any LiveKit room is created. No API secret is read here.
  registerGlobals();
}
