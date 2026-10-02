import { Platform } from "react-native";

type NativeTrim = {
  materialize: (assetId: string) => Promise<{ uri: string; duration: number; ext?: string; bytes?: number }>;
  trim: (uri: string, start: number, end: number) => Promise<{ uri: string; duration: number; ext?: string; bytes?: number }>;
};

function native(): NativeTrim | null {
  if (Platform.OS !== "ios") return null;
  try {
    const { requireNativeModule } = require("expo-modules-core") as {
      requireNativeModule: (name: string) => NativeTrim;
    };
    return requireNativeModule("WippVideoTrim");
  } catch {
    return null;
  }
}

export function isVideoTrimAvailable() {
  return native() != null;
}

/** Copies a Photos video into the app cache so playback and export use a real file. */
export async function materializeLibraryVideo(assetId: string) {
  const mod = native();
  if (!mod) throw new Error("video_prepare_unavailable");
  return mod.materialize(assetId);
}

/** Writes a new file containing only [start, end] seconds. */
export async function trimVideoSegment(uri: string, start: number, end: number) {
  const mod = native();
  if (!mod) throw new Error("video_trim_unavailable");
  if (!(end > start) || end - start > 60.25) throw new Error("video_trim_range");
  return mod.trim(uri, start, end);
}
